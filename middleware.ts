import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

/*
 * Edge middleware, runs on every page request:
 *   1. mints a per-request CSP nonce (crypto-random, 128 bits)
 *   2. hands it to Next.js via the request's Content-Security-Policy header,
 *      so every framework <script> is stamped with it automatically
 *   3. runs next-intl locale negotiation / rewriting
 *   4. sends the same CSP on the response
 *
 * 'strict-dynamic' lets nonce-trusted scripts load their own children (Next's
 * chunks, MediaPipe's WASM loader, Turnstile), while any injected inline or
 * third-party script without the nonce is refused.
 */

const intl = createMiddleware(routing);

function contentSecurityPolicy(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https:${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com",
    "font-src 'self'",
    `connect-src 'self' https://cdn.jsdelivr.net https://challenges.cloudflare.com${dev ? " ws: wss:" : ""}`,
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export default function middleware(request: NextRequest) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const response = intl(new NextRequest(request, { headers }));
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // pages only: skip API routes, Next internals and any file with an extension
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
