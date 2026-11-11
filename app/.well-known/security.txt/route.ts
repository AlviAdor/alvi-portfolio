import { site } from "@/lib/site";

/*
 * security.txt (RFC 9116): where to report a vulnerability in this site.
 * Rendered once at build time, so `Expires` is always the last deploy plus
 * eleven months: a file that has gone stale means the site has too.
 */
export const dynamic = "force-static";

const VALID_FOR_MS = 335 * 24 * 60 * 60 * 1000;

export function GET() {
  const expires = new Date(Date.now() + VALID_FOR_MS).toISOString();
  const body = [
    `Contact: mailto:${site.email}`,
    `Contact: ${site.github.url}/alvi-portfolio/security/advisories/new`,
    `Expires: ${expires}`,
    "Preferred-Languages: en, bn",
    `Canonical: ${new URL("/.well-known/security.txt", site.url).toString()}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
