import type { ReactNode } from "react";

/*
 * Pass-through root. The real document shell (<html>/<body>, fonts, providers,
 * CSP nonce) lives in app/[locale]/layout.tsx so that <html lang> and the
 * message provider are locale-aware. This split is the next-intl App Router
 * pattern that also allows a global (locale-less) not-found page.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
