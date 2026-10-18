/* ──────────────────────────────────────────────────────────────────────────
 * Upstream payloads. Only the fields this site reads are declared; anything
 * else GitHub / DataCite / OpenAlex return is ignored.
 * ────────────────────────────────────────────────────────────────────────── */

/** GET /users/{user}/repos item. */
export interface GitHubRepoPayload {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  fork: boolean;
  archived: boolean;
  pushed_at: string | null;
  updated_at: string;
}

/** GET /repos/{owner}/{repo}/commits item. */
export interface GitHubCommitPayload {
  sha: string;
  commit: {
    author: { name: string; email: string; date: string } | null;
    message: string;
  };
}

/** GET /users/{user}/events/public item (PushEvent no longer carries commit counts). */
export interface GitHubEventPayload {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
}

/** DataCite REST API: GET /dois?query=… */
export interface DataCiteResponse {
  data: DataCiteRecord[];
  meta: { total: number };
}

export interface DataCiteRecord {
  id: string;
  attributes: {
    doi: string;
    url: string | null;
    publicationYear: number | null;
    published?: string | null;
    created?: string | null;
    titles: { title: string }[];
    creators: { name: string }[];
    publisher?: string | { name: string } | null;
    descriptions?: { description: string; descriptionType?: string }[];
    types?: { resourceTypeGeneral?: string; bibtex?: string };
  };
  relationships?: { client?: { data?: { id: string } } };
}

/** OpenAlex: GET /works?filter=author.id:… */
export interface OpenAlexResponse {
  results: OpenAlexWork[];
}

export interface OpenAlexWork {
  id: string;
  doi: string | null;
  title: string | null;
  publication_year: number | null;
  publication_date: string | null;
  cited_by_count: number;
  authorships: { author: { display_name: string } }[];
  primary_location: {
    landing_page_url: string | null;
    pdf_url: string | null;
    source: { display_name: string } | null;
  } | null;
  best_oa_location: { pdf_url: string | null; landing_page_url: string | null } | null;
  open_access: { is_oa: boolean; oa_url: string | null } | null;
  abstract_inverted_index: Record<string, number[]> | null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Normalised shapes served by /api/* and consumed by the UI.
 * ────────────────────────────────────────────────────────────────────────── */

export interface RepoSummary {
  id: number;
  name: string;
  url: string;
  description: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  pushedAt: string | null;
}

export interface ActivityDay {
  /** ISO date, YYYY-MM-DD (UTC). */
  date: string;
  count: number;
}

export interface GitHubData {
  user: string;
  profileUrl: string;
  repos: RepoSummary[];
  /** Exactly `weeks * 7` days, oldest first, starting on a Sunday. */
  activity: ActivityDay[];
  weeks: number;
  totalCommits: number;
  /** "commits" when per-repo commit history was read, "events" when it fell back to push events. */
  activitySource: "commits" | "events" | "none";
  fetchedAt: string;
  error: string | null;
}

export type PaperStatus = "published" | "preprint" | "in-progress";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  status: PaperStatus;
  summary: string;
  tags: string[];
  doi: string | null;
  url: string | null;
  pdfUrl: string | null;
  citations: number | null;
  bibtex: string;
  /** Where the record came from, for the "synced via" label. */
  source: "datacite" | "openalex" | "curated";
}

export interface ResearchData {
  papers: Paper[];
  fetchedAt: string;
  sources: { datacite: boolean; openalex: boolean };
  error: string | null;
}

export interface ContactPayload {
  name: string;
  email: string;
  company?: string;
  message: string;
}

/** Machine-readable failure reasons; the UI maps them to localized messages. */
export type ContactError = "rate-limited" | "bot-check" | "token-expired" | "token-invalid" | "invalid" | "not-configured" | "delivery" | "forbidden";

export type ContactResult =
  | { ok: true; id: string | null; nextToken?: string }
  | { ok: false; error: ContactError; fieldErrors?: Partial<Record<keyof ContactPayload, string>>; nextToken?: string };

/** Discriminated state for the `useActionState` contact form. */
export type ContactFormState = { status: "idle" } | ({ status: "done" } & ContactResult);

/** Public, secret-free summary of the deployment's security posture (GET /api/status). */
export interface SecurityStatus {
  csp: "nonce";
  rateLimit: "upstash" | "memory";
  turnstile: boolean;
  formTokens: boolean;
  relay: boolean;
  e2e: boolean;
  region: string | null;
  checkedAt: string;
}
