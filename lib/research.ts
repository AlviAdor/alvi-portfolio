import { curatedResearch, site } from "./site";
import type { DataCiteRecord, DataCiteResponse, OpenAlexResponse, OpenAlexWork, Paper, ResearchData } from "./types";

/*
 * "ResearchGate sync", done legitimately. ResearchGate has no public API or
 * RSS feed, and its terms forbid scraping (it also sits behind bot
 * protection). But every DOI that ResearchGate mints (prefix 10.13140) is
 * registered with DataCite under the client id `rg.rg`. So:
 *
 *   1. DataCite  – every ResearchGate DOI whose creator list contains the author
 *   2. OpenAlex  – citation counts, open-access PDF links, abstracts
 *   3. doi.org   – canonical BibTeX through DOI content negotiation
 *   4. curated   – summaries/tags + work in progress that has no DOI yet
 *
 * Edge-compatible: fetch + plain objects only.
 */

const REVALIDATE_SECONDS = 60 * 60 * 6;
const DATACITE = "https://api.datacite.org/dois";
const OPENALEX = "https://api.openalex.org/works";

const normDoi = (doi: string | null | undefined) =>
  doi ? doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase() : null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": `${site.github.user}-portfolio` },
    next: { revalidate: REVALIDATE_SECONDS, tags: ["research"] },
  });
  if (!res.ok) throw new Error(`${new URL(url).host} → ${res.status}`);
  return (await res.json()) as T;
}

async function fetchDataCite(): Promise<DataCiteRecord[]> {
  const params = new URLSearchParams({
    query: `creators.name:"${site.researchgateCreatorName}"`,
    "client-id": "rg.rg",
    "page[size]": "50",
  });
  const body = await getJson<DataCiteResponse>(`${DATACITE}?${params.toString()}`);
  return body.data;
}

async function fetchOpenAlex(): Promise<OpenAlexWork[]> {
  const params = new URLSearchParams({ filter: `author.id:${site.openalexAuthorId}`, per_page: "50" });
  const mailto = process.env.OPENALEX_MAILTO;
  if (mailto) params.set("mailto", mailto);
  const body = await getJson<OpenAlexResponse>(`${OPENALEX}?${params.toString()}`);
  return body.results;
}

async function fetchBibtex(doi: string): Promise<string | null> {
  try {
    const res = await fetch(`https://doi.org/${doi}`, {
      headers: { Accept: "application/x-bibtex; charset=utf-8" },
      redirect: "follow",
      next: { revalidate: 60 * 60 * 24 * 7, tags: ["research"] },
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.startsWith("@") ? text : null;
  } catch {
    return null;
  }
}

function citeKey(p: Pick<Paper, "authors" | "year" | "title">): string {
  const last = (p.authors[0] ?? "anon").split(/\s+/).pop() ?? "anon";
  const word = p.title.split(/\s+/).find((w) => w.length > 3) ?? "work";
  return `${last}${p.year ?? "nd"}${word}`.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

const escapeBib = (s: string) => s.replace(/[{}]/g, "");

/** Local BibTeX for records without a resolvable DOI (e.g. work in progress). */
function buildBibtex(p: Pick<Paper, "authors" | "year" | "title" | "venue" | "doi" | "url" | "status">): string {
  const type = p.status === "in-progress" ? "unpublished" : "misc";
  const fields: [string, string | null][] = [
    ["title", `{${escapeBib(p.title)}}`],
    ["author", `{${p.authors.map(escapeBib).join(" and ")}}`],
    ["year", p.year ? String(p.year) : null],
    [p.status === "in-progress" ? "note" : "howpublished", `{${escapeBib(p.venue)}}`],
    ["doi", p.doi ? `{${p.doi}}` : null],
    ["url", p.url ? `{${p.url}}` : null],
  ];
  const body = fields
    .filter((f): f is [string, string] => f[1] !== null)
    .map(([k, v]) => `  ${k} = ${v}`)
    .join(",\n");
  return `@${type}{${citeKey(p)},\n${body}\n}`;
}

/** Re-key doi.org's BibTeX (which uses the DOI URL as the key) to a readable key. */
function rekey(bibtex: string, p: Pick<Paper, "authors" | "year" | "title">): string {
  return bibtex.replace(/^@(\w+)\{[^,]*,/, (_m, type: string) => `@${type}{${citeKey(p)},`);
}

function abstractFrom(index: Record<string, number[]> | null): string | null {
  if (!index) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) for (const pos of positions) words[pos] = word;
  const text = words.filter(Boolean).join(" ").trim();
  return text.length > 40 ? text : null;
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s);

export async function getResearchData(): Promise<ResearchData> {
  const [dc, oa] = await Promise.allSettled([fetchDataCite(), fetchOpenAlex()]);
  const datacite = dc.status === "fulfilled" ? dc.value : [];
  const openalex = oa.status === "fulfilled" ? oa.value : [];

  const byDoi = new Map<string, Paper>();
  const papers: Paper[] = [];

  // 1. curated entries are the editorial baseline
  for (const c of curatedResearch) {
    const paper: Paper = { ...c, citations: null, bibtex: "", source: "curated" };
    papers.push(paper);
    const key = normDoi(c.doi);
    if (key) byDoi.set(key, paper);
  }

  // 2. DataCite – adds any ResearchGate DOI not curated yet
  for (const rec of datacite) {
    const a = rec.attributes;
    const key = normDoi(a.doi);
    if (!key) continue;
    const existing = byDoi.get(key);
    if (existing) {
      existing.source = "datacite";
      existing.url = existing.url ?? a.url;
      continue;
    }
    const description = a.descriptions?.find((d) => d.descriptionType === "Abstract")?.description;
    const paper: Paper = {
      id: key,
      title: a.titles[0]?.title ?? "Untitled",
      authors: a.creators.map((c) => c.name),
      year: a.publicationYear,
      venue: "ResearchGate",
      status: "preprint",
      summary: description ? truncate(description, 420) : "",
      tags: [],
      doi: a.doi.toUpperCase().startsWith("10.") ? a.doi : key,
      url: a.url,
      pdfUrl: null,
      citations: null,
      bibtex: "",
      source: "datacite",
    };
    papers.push(paper);
    byDoi.set(key, paper);
  }

  // 3. OpenAlex – enrich with citations / OA PDF, add anything else indexed
  for (const w of openalex) {
    const key = normDoi(w.doi);
    const pdf = w.best_oa_location?.pdf_url ?? w.primary_location?.pdf_url ?? null;
    const existing = key ? byDoi.get(key) : undefined;
    if (existing) {
      existing.citations = w.cited_by_count;
      existing.pdfUrl = existing.pdfUrl ?? pdf;
      if (!existing.summary) existing.summary = truncate(abstractFrom(w.abstract_inverted_index) ?? "", 420);
      continue;
    }
    if (!w.title) continue;
    const paper: Paper = {
      id: key ?? w.id,
      title: w.title,
      authors: w.authorships.map((x) => x.author.display_name),
      year: w.publication_year,
      venue: w.primary_location?.source?.display_name ?? "Indexed by OpenAlex",
      status: w.primary_location?.source ? "published" : "preprint",
      summary: truncate(abstractFrom(w.abstract_inverted_index) ?? "", 420),
      tags: [],
      doi: key,
      url: w.primary_location?.landing_page_url ?? w.open_access?.oa_url ?? (key ? `https://doi.org/${key}` : null),
      pdfUrl: pdf,
      citations: w.cited_by_count,
      bibtex: "",
      source: "openalex",
    };
    papers.push(paper);
    if (key) byDoi.set(key, paper);
  }

  // 4. BibTeX: canonical from doi.org when there is a DOI, generated otherwise
  await Promise.all(
    papers.map(async (p) => {
      const remote = p.doi ? await fetchBibtex(p.doi) : null;
      p.bibtex = remote ? rekey(remote, p) : buildBibtex(p);
    }),
  );

  const order: Record<Paper["status"], number> = { published: 0, preprint: 1, "in-progress": 2 };
  papers.sort((a, b) => order[a.status] - order[b.status] || (b.year ?? 0) - (a.year ?? 0));

  const failures = [dc, oa].filter((r) => r.status === "rejected").length;
  return {
    papers,
    fetchedAt: new Date().toISOString(),
    sources: { datacite: dc.status === "fulfilled", openalex: oa.status === "fulfilled" },
    error: failures === 2 ? "Live sync unavailable — showing curated records." : null,
  };
}
