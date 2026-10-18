import { Resend } from "resend";
import { z } from "zod";
import { issueFormToken, verifyFormToken } from "./security/form-token";
import { rateLimit } from "./security/rate-limit";
import { escapeHtml, sanitizeText } from "./security/sanitize";
import { relayConfigured } from "./relay";
import { verifyTurnstile } from "./security/turnstile";
import { site } from "./site";
import type { ContactError, ContactPayload, ContactResult } from "./types";

/*
 * Hardened contact pipeline, shared by the Server Action and POST /api/contact:
 *
 *   rate limit (10/min/IP) → Turnstile → HMAC single-use form token
 *   → DOMPurify sanitisation → Zod strict schema → honeypot
 *   → send quota (3 emails / 10 min / IP) → Resend
 *
 * The same-origin check happens before this in the route handler; Server
 * Actions get it from Next.js itself. Every failure returns a fresh form token
 * so the visitor can fix a field and resubmit (tokens are single-use).
 */

export const contactSchema = z
  .object({
    name: z.string().min(2, "name.short").max(80, "name.long"),
    email: z.email("email.invalid").max(160, "email.invalid"),
    company: z.string().max(120, "company.long").optional(),
    message: z.string().min(20, "message.short").max(4000, "message.long"),
  })
  .strict();

export interface ContactSubmission {
  fields: Record<keyof ContactPayload, unknown>;
  website: unknown;
  formToken: unknown;
  turnstileToken: unknown;
  ip: string;
}

/** Field errors are message keys (`contact.errors.*`) so the client can show them in any locale. */
export async function submitContact(input: ContactSubmission): Promise<ContactResult> {
  const fresh = async () => (await issueFormToken()) ?? undefined;
  const fail = async (error: ContactError, fieldErrors?: Partial<Record<keyof ContactPayload, string>>): Promise<ContactResult> => ({
    ok: false,
    error,
    fieldErrors,
    nextToken: await fresh(),
  });

  const limit = await rateLimit("contact", input.ip);
  if (!limit.success) return fail("rate-limited");

  const human = await verifyTurnstile(typeof input.turnstileToken === "string" ? input.turnstileToken : null, input.ip);
  if (!human.ok) return fail("bot-check");

  const verdict = await verifyFormToken(typeof input.formToken === "string" ? input.formToken : null);
  if (verdict !== "ok" && verdict !== "disabled") return fail(verdict === "expired" ? "token-expired" : "token-invalid");

  const cleaned = {
    name: sanitizeText(input.fields.name),
    email: sanitizeText(input.fields.email).toLowerCase(),
    company: sanitizeText(input.fields.company) || undefined,
    message: sanitizeText(input.fields.message, { multiline: true }),
  };
  const parsed = contactSchema.safeParse(cleaned);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ContactPayload, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in fieldErrors)) fieldErrors[field as keyof ContactPayload] = issue.message;
    }
    return fail("invalid", fieldErrors);
  }

  // Bots fill every field. Pretend success so they don't adapt.
  if (typeof input.website === "string" && input.website.trim() !== "") return { ok: true, id: null };

  // checked before the send quota, so a misconfigured relay never burns a visitor's allowance
  if (!relayConfigured()) {
    console.error("[contact] RESEND_API_KEY is missing or still the .env.example placeholder");
    return fail("not-configured");
  }

  const quota = await rateLimit("send", input.ip);
  if (!quota.success) return fail("rate-limited");

  const apiKey = process.env.RESEND_API_KEY ?? "";
  const { name, email, company, message } = parsed.data;
  const to = process.env.CONTACT_TO_EMAIL || site.email;
  const from = process.env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";
  const subject = `Portfolio: ${name}${company ? ` (${company})` : ""}`;
  const text = `${message}\n\n— ${name} <${email}>${company ? `\n${company}` : ""}`;
  const html = `<div style="font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.6;color:#0B0F17">
<p style="margin:0 0 12px"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;${company ? ` · ${escapeHtml(company)}` : ""}</p>
<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(message)}</pre>
</div>`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      { from, to: [to], replyTo: email, subject, text, html },
      { idempotencyKey: `contact-${crypto.randomUUID()}` },
    );
    if (error) {
      console.error("[contact] Resend error", error);
      return fail("delivery");
    }
    return { ok: true, id: data?.id ?? null, nextToken: await fresh() };
  } catch (err) {
    console.error("[contact] send threw", err);
    return fail("delivery");
  }
}
