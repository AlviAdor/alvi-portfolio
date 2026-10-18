import { NextResponse } from "next/server";
import { submitContact } from "@/lib/contact";
import { issueFormToken } from "@/lib/security/form-token";
import { rateHeaders, rateLimit } from "@/lib/security/rate-limit";
import { clientIp, isSameOrigin } from "@/lib/security/request";

/*
 * JSON contact endpoint (Node runtime: DOMPurify needs jsdom).
 *   GET  → a fresh HMAC form token (rate-limited)
 *   POST → the full hardened pipeline in lib/contact.ts
 * The site's own form uses the Server Action; this exists for non-React clients.
 */
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!isSameOrigin(request.headers, request.url)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403, headers: noStore });
  const limit = await rateLimit("contact", clientIp(request.headers));
  if (!limit.success) return NextResponse.json({ ok: false, error: "rate-limited" }, { status: 429, headers: { ...noStore, ...rateHeaders(limit) } });
  return NextResponse.json({ ok: true, token: await issueFormToken() }, { headers: { ...noStore, ...rateHeaders(limit) } });
}

interface ContactRequestBody {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  message?: unknown;
  website?: unknown;
  formToken?: unknown;
  turnstileToken?: unknown;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers, request.url)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403, headers: noStore });
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 415, headers: noStore });
  }
  const raw = await request.text();
  if (raw.length > 16_000) return NextResponse.json({ ok: false, error: "invalid" }, { status: 413, headers: noStore });

  let body: ContactRequestBody;
  try {
    body = JSON.parse(raw) as ContactRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400, headers: noStore });
  }

  const result = await submitContact({
    fields: { name: body.name, email: body.email, company: body.company, message: body.message },
    website: body.website,
    formToken: body.formToken,
    turnstileToken: body.turnstileToken,
    ip: clientIp(request.headers),
  });

  const status = result.ok
    ? 200
    : ({ "rate-limited": 429, "bot-check": 403, "token-expired": 409, "token-invalid": 403, invalid: 422, "not-configured": 503, delivery: 502, forbidden: 403 } as const)[result.error];
  return NextResponse.json(result, { status, headers: noStore });
}
