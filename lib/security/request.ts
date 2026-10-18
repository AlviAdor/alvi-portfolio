/*
 * Request helpers shared by route handlers, the Server Action and middleware.
 * Edge-compatible: Web Crypto + Headers only.
 */

/** Best-effort client IP. On Vercel/Cloudflare the edge overwrites these headers, so they can't be spoofed by the client. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

/**
 * Same-origin check for state-changing requests. Browsers always send `Origin`
 * on POST and `Sec-Fetch-Site` on modern engines; a cross-site form or fetch
 * fails here before any work is done.
 */
export function isSameOrigin(headers: Headers, requestUrl: string): boolean {
  const site = headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = headers.get("origin");
  if (!origin) return site === "same-origin" || site === "none";
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? new URL(requestUrl).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const encoder = new TextEncoder();

export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Rate-limit keys are SHA-256(salt ‖ ip), never the raw address, so the
 * limiter store never holds personal data.
 */
export async function anonymize(identifier: string): Promise<string> {
  const salt = process.env.FORM_TOKEN_SECRET ?? "aa-portfolio";
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${identifier}`));
  return toBase64Url(digest).slice(0, 22);
}
