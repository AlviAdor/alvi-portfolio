import { NextResponse } from "next/server";
import { relayConfigured } from "@/lib/relay";
import { formTokensEnabled } from "@/lib/security/form-token";
import { rateHeaders, rateLimit, upstashConfigured } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { turnstileEnabled } from "@/lib/security/turnstile";
import type { SecurityStatus } from "@/lib/types";

/** Public, secret-free security posture for the hero's live status panel and the terminal's `security-audit`. */
export const runtime = "edge";

export async function GET(request: Request) {
  const limit = await rateLimit("api", clientIp(request.headers));
  if (!limit.success) return NextResponse.json({ error: "rate-limited" }, { status: 429, headers: rateHeaders(limit) });
  const status: SecurityStatus = {
    csp: "nonce",
    rateLimit: upstashConfigured() ? "upstash" : "memory",
    turnstile: turnstileEnabled(),
    formTokens: formTokensEnabled(),
    relay: relayConfigured(),
    e2e: Boolean(process.env.NEXT_PUBLIC_SECURE_MESSAGING_BASE),
    region: process.env.VERCEL_REGION ?? null,
    checkedAt: new Date().toISOString(),
  };
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store", ...rateHeaders(limit) } });
}
