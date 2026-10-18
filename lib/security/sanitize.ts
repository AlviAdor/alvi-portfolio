import DOMPurify from "isomorphic-dompurify";

/*
 * Input sanitization pipeline (Node runtime only: DOMPurify runs on jsdom).
 *   1. Unicode NFKC normalisation (folds look-alike characters)
 *   2. DOMPurify with no allowed tags: markup is removed and only its text kept
 *   3. control characters stripped (newlines/tabs kept only where allowed)
 * The result is plain text; it is still HTML-escaped again wherever it is rendered.
 */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩]/g;

export function sanitizeText(input: unknown, { multiline = false }: { multiline?: boolean } = {}): string {
  if (typeof input !== "string") return "";
  const normalised = input.normalize("NFKC");
  const fragment = DOMPurify.sanitize(normalised, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true, RETURN_DOM_FRAGMENT: true });
  let text = (fragment.textContent ?? "").replace(CONTROL, "");
  // single-line fields can never carry header-injection line breaks
  text = multiline ? text.replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n") : text.replace(/[\r\n\t]+/g, " ");
  return text.trim();
}

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
