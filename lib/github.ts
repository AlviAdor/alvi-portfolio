import { hiddenRepos, projectNotes, site } from "./site";
import type { ActivityDay, GitHubCommitPayload, GitHubData, GitHubEventPayload, GitHubRepoPayload, RepoSummary } from "./types";

/*
 * Edge-compatible: only `fetch`, `Date` and plain objects. Shared by the
 * /api/github route handler and the server-rendered page so both hit the
 * same Next.js data cache entry.
 */

const API = "https://api.github.com";
const WEEKS = 26;
const MAX_ACTIVITY_REPOS = 12;
const REVALIDATE_SECONDS = 3600;

class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${site.github.user}-portfolio`,
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: headers(),
    next: { revalidate: REVALIDATE_SECONDS, tags: ["github"] },
  });
  if (!res.ok) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reason = res.status === 403 && remaining === "0" ? "rate limit exhausted" : res.statusText;
    throw new GitHubError(res.status, `GitHub ${path} → ${res.status} ${reason}`);
  }
  return (await res.json()) as T;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** `WEEKS` full weeks ending with the current one, Sunday-first, all UTC. */
function emptyCalendar(now: Date): ActivityDay[] {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - end.getUTCDay() - (WEEKS - 1) * 7);
  const days: ActivityDay[] = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    days.push({ date: isoDay(d), count: 0 });
  }
  return days;
}

function normaliseRepo(r: GitHubRepoPayload): RepoSummary {
  const note = projectNotes[r.name];
  return {
    id: r.id,
    name: r.name,
    url: r.html_url,
    description: note?.blurb ?? r.description ?? "",
    homepage: r.homepage || null,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    topics: note?.stack ?? r.topics ?? (r.language ? [r.language] : []),
    pushedAt: r.pushed_at,
  };
}

function rankRepos(a: RepoSummary, b: RepoSummary): number {
  const fa = projectNotes[a.name]?.featured ? 1 : 0;
  const fb = projectNotes[b.name]?.featured ? 1 : 0;
  if (fa !== fb) return fb - fa;
  if (a.stars !== b.stars) return b.stars - a.stars;
  return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "");
}

/** Static cards built from `projectNotes`, used when GitHub is unreachable. */
function curatedRepos(): RepoSummary[] {
  return Object.entries(projectNotes)
    .map(([name, note], i) => ({
      id: -(i + 1),
      name,
      url: `${site.github.url}/${name}`,
      description: note.blurb,
      homepage: null,
      language: note.stack[0] ?? null,
      stars: 0,
      forks: 0,
      topics: note.stack,
      pushedAt: null,
    }))
    .sort(rankRepos);
}

async function commitActivity(repos: GitHubRepoPayload[], calendar: ActivityDay[]): Promise<number> {
  const first = calendar[0];
  if (!first) return 0;
  const since = `${first.date}T00:00:00Z`;
  const active = repos
    .filter((r) => r.pushed_at && r.pushed_at >= since)
    .sort((a, b) => (b.pushed_at ?? "").localeCompare(a.pushed_at ?? ""))
    .slice(0, MAX_ACTIVITY_REPOS);

  const index = new Map(calendar.map((d, i) => [d.date, i]));
  const results = await Promise.allSettled(
    active.map((r) =>
      gh<GitHubCommitPayload[]>(
        `/repos/${encodeURIComponent(site.github.user)}/${encodeURIComponent(r.name)}/commits?author=${encodeURIComponent(site.github.user)}&since=${since}&per_page=100`,
      ),
    ),
  );

  let total = 0;
  let succeeded = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    succeeded++;
    for (const c of result.value) {
      const date = c.commit.author?.date;
      if (!date) continue;
      const i = index.get(date.slice(0, 10));
      const day = i === undefined ? undefined : calendar[i];
      if (day) {
        day.count++;
        total++;
      }
    }
  }
  if (active.length > 0 && succeeded === 0) throw new GitHubError(503, "commit history unavailable");
  return total;
}

async function eventActivity(calendar: ActivityDay[]): Promise<number> {
  const events = await gh<GitHubEventPayload[]>(`/users/${encodeURIComponent(site.github.user)}/events/public?per_page=100`);
  const index = new Map(calendar.map((d, i) => [d.date, i]));
  let total = 0;
  for (const e of events) {
    if (e.type !== "PushEvent") continue;
    const i = index.get(e.created_at.slice(0, 10));
    const day = i === undefined ? undefined : calendar[i];
    if (day) {
      day.count++;
      total++;
    }
  }
  return total;
}

export async function getGitHubData(): Promise<GitHubData> {
  const now = new Date();
  const base = {
    user: site.github.user,
    profileUrl: site.github.url,
    weeks: WEEKS,
    fetchedAt: now.toISOString(),
  };

  let rawRepos: GitHubRepoPayload[];
  try {
    rawRepos = await gh<GitHubRepoPayload[]>(`/users/${encodeURIComponent(site.github.user)}/repos?per_page=100&sort=pushed&type=owner`);
  } catch (err) {
    return {
      ...base,
      repos: curatedRepos(),
      activity: emptyCalendar(now),
      totalCommits: 0,
      activitySource: "none",
      error: err instanceof Error ? err.message : "GitHub unavailable",
    };
  }

  const visible = rawRepos.filter((r) => !r.fork && !r.archived && !hiddenRepos.has(r.name));
  const repos = visible.map(normaliseRepo).sort(rankRepos);

  let calendar = emptyCalendar(now);
  let totalCommits = 0;
  let activitySource: GitHubData["activitySource"] = "commits";
  try {
    totalCommits = await commitActivity(rawRepos, calendar);
  } catch {
    calendar = emptyCalendar(now);
    try {
      totalCommits = await eventActivity(calendar);
      activitySource = "events";
    } catch {
      activitySource = "none";
    }
  }

  return { ...base, repos, activity: calendar, totalCommits, activitySource, error: null };
}
