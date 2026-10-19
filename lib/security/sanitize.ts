import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

/*
 * Input sanitization pipeline (Node runtime only: DOMPurify needs a DOM).
 *   1. Unicode NFKC normalisation (folds look-alike characters)
 *   2. DOMPurify with no allowed tags: markup is removed and only its text kept
 *   3. control, zero-width and bidi-override characters stripped
 * The result is plain text; it is still HTML-escaped again wherever it is rendered.
 *
 * jsdom is pinned to 26.x on purpose: from 27 on its dependency chain includes an
 * ESM-only package loaded via require(), which Vercel's function runtime rejects
 * (ERR_REQUIRE_ESM), crashing every request to /api/contact. CI guards this by
 * smoke-testing the build with require(ESM) disabled. jsdom is only DOMPurify's
 * parser here: scripts never run (jsdom's default runScripts is off).
 */
const purify = createDOMPurify(new JSDOM("").window as unknown as Parameters<typeof createDOMPurify>[0]);

// C0/C1 controls (except \t \n \r), zero-width marks, and bidi embeddings/overrides/isolates
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

export function sanitizeText(input: unknown, { multiline = false }: { multiline?: boolean } = {}): string {
  if (typeof input !== "string") return "";
  const normalised = input.normalize("NFKC");
  const fragment = purify.sanitize(normalised, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true, RETURN_DOM_FRAGMENT: true });
  let text = (fragment.textContent ?? "").replace(CONTROL, "");
  // single-line fields can never carry header-injection line breaks
  text = multiline ? text.replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n") : text.replace(/[\r\n\t]+/g, " ");
  return text.trim();
}

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
