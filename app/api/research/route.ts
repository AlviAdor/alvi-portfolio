import { NextResponse } from "next/server";
import { getResearchData } from "@/lib/research";
import { rateHeaders, rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

export const runtime = "edge";

export async function GET(request: Request) {
  const limit = await rateLimit("api", clientIp(request.headers));
  if (!limit.success) return NextResponse.json({ error: "rate-limited" }, { status: 429, headers: rateHeaders(limit) });
  const data = await getResearchData();
  const cache = { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400", ...rateHeaders(limit) };

  // /api/research?format=bib → every citation as one downloadable .bib file
  if (new URL(request.url).searchParams.get("format") === "bib") {
    return new NextResponse(data.papers.map((p) => p.bibtex).join("\n\n") + "\n", {
      headers: { "Content-Type": "application/x-bibtex; charset=utf-8", "Content-Disposition": 'attachment; filename="alvi-ador.bib"', ...cache },
    });
  }
  return NextResponse.json(data, { headers: cache });
}
