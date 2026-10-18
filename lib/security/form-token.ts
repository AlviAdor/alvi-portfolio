import { claimOnce } from "./rate-limit";
import { fromBase64Url, toBase64Url } from "./request";

/*
 * HMAC-signed, single-use form tokens. The server issues
 *   base64url(issuedAt.nonce) . base64url(HMAC-SHA256(secret, issuedAt.nonce))
 * and on submit verifies the signature (constant-time, via subtle.verify), the
 * age window (humans need > 2.5 s, tokens die after 2 h) and that the nonce
 * hasn't been used before. That replaces the old client-reported "startedAt"
 * timestamp, which a bot could simply forge.
 */

const MIN_AGE_MS = 2_500;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const encoder = new TextEncoder();

export type TokenVerdict = "ok" | "missing" | "malformed" | "bad-signature" | "too-fast" | "expired" | "replayed" | "disabled";

/**
 * Enforced only when FORM_TOKEN_SECRET is set (≥ 32 chars). Without a shared
 * secret, serverless instances can't verify each other's tokens, so the check
 * is switched off rather than rejecting real visitors; /api/status reports it.
 */
export const formTokensEnabled = (): boolean => (process.env.FORM_TOKEN_SECRET?.length ?? 0) >= 32;

let keyPromise: Promise<CryptoKey> | null = null;
function key(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey("raw", encoder.encode(process.env.FORM_TOKEN_SECRET ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return keyPromise;
}

export async function issueFormToken(now = Date.now()): Promise<string | null> {
  if (!formTokensEnabled()) return null;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${now}.${nonce}`;
  const sig = await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload));
  return `${toBase64Url(encoder.encode(payload))}.${toBase64Url(sig)}`;
}

export async function verifyFormToken(token: string | null | undefined, now = Date.now()): Promise<TokenVerdict> {
  if (!formTokensEnabled()) return "disabled";
  if (!token) return "missing";
  const [p, s] = token.split(".");
  if (!p || !s || token.length > 200) return "malformed";
  let payloadBytes: Uint8Array<ArrayBuffer>;
  let sigBytes: Uint8Array<ArrayBuffer>;
  try {
    payloadBytes = fromBase64Url(p);
    sigBytes = fromBase64Url(s);
  } catch {
    return "malformed";
  }
  const valid = await crypto.subtle.verify("HMAC", await key(), sigBytes, payloadBytes);
  if (!valid) return "bad-signature";
  const [issued, nonce] = new TextDecoder().decode(payloadBytes).split(".");
  const issuedAt = Number(issued);
  if (!nonce || !Number.isFinite(issuedAt)) return "malformed";
  const age = now - issuedAt;
  if (age < MIN_AGE_MS) return "too-fast";
  if (age > MAX_AGE_MS) return "expired";
  if (!(await claimOnce(`tok:${nonce}`, Math.ceil(MAX_AGE_MS / 1000)))) return "replayed";
  return "ok";
}
