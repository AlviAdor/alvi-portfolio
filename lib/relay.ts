/*
 * Edge-safe check for whether the Resend mail relay is really configured.
 * Kept out of lib/contact.ts (which pulls in jsdom via DOMPurify) so edge
 * routes like /api/status can import it. A placeholder such as the
 * .env.example value "re_xxxx…" does not count as configured.
 */
export function relayConfigured(): boolean {
  const key = process.env.RESEND_API_KEY ?? "";
  return /^re_[A-Za-z0-9_]{16,}$/.test(key) && !/^re_x+$/i.test(key);
}
