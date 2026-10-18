/*
 * Script-aware text helpers. Splitting or slicing a string by code unit
 * breaks scripts that shape several code points into one visual syllable
 * (Bengali/Devanagari vowel signs and conjuncts, Arabic joining, Thai marks):
 * the browser then draws dotted-circle placeholders. These helpers keep
 * grapheme clusters, and for complex scripts whole words, intact.
 */

/** Scripts whose glyphs are shaped across code points and must not be split per character. */
const COMPLEX_SCRIPT = /[֐-׿؀-ۿݐ-ݿऀ-෿฀-໿ༀ-࿿က-႟ក-៿]/;

export const needsWordSplit = (text: string): boolean => COMPLEX_SCRIPT.test(text);

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/** User-perceived characters (extended grapheme clusters). */
export function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

/** Truncate to at most `max` visible characters without cutting a cluster in half. */
export function truncate(text: string, max: number): string {
  const g = graphemes(text);
  return g.length > max ? `${g.slice(0, Math.max(1, max - 1)).join("")}…` : text;
}
