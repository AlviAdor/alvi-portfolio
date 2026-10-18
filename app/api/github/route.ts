import { NextResponse } from "next/server";
import { getGitHubData } from "@/lib/github";
import { rateHeaders, rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

export const runtime = "edge";

export async function GET(request: Request) {
  const limit = await rateLimit("api", clientIp(request.headers));
  if (!limit.success) return NextResponse.json({ error: "rate-limited" }, { status: 429, headers: rateHeaders(limit) });
  const data = await getGitHubData();
  return NextResponse.json(data, {
    status: data.error ? 502 : 200,
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", ...rateHeaders(limit) },
  });
}
