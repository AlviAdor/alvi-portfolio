/*
 * Cloudflare Turnstile server-side verification (free, privacy-preserving
 * CAPTCHA alternative). Enforced only when both keys are configured.
 * Cloudflare's public test keys for local development:
 *   site 1x00000000000000000000AA  ·  secret 1x0000000000000000000000000000000AA (always passes)
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileEnabled = (): boolean => Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  action?: string;
  hostname?: string;
}

export async function verifyTurnstile(token: string | null | undefined, ip: string): Promise<{ ok: boolean; reason?: string }> {
  if (!turnstileEnabled()) return { ok: true, reason: "disabled" };
  if (!token || token.length > 2048) return { ok: false, reason: "missing-token" };
  try {
    const body = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY ?? "",
      response: token,
      remoteip: ip,
      idempotency_key: crypto.randomUUID(),
    });
    const res = await fetch(VERIFY_URL, { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as SiteverifyResponse;
    if (!data.success) return { ok: false, reason: data["error-codes"]?.join(",") ?? "rejected" };
    if (data.action && data.action !== "contact") return { ok: false, reason: "wrong-action" };
    return { ok: true };
  } catch (err) {
    console.error("[turnstile] verification failed", err);
    return { ok: false, reason: "unreachable" };
  }
}
