/*
 * Where this build is running, shown in the footer. Resolved on the server
 * and passed down as a prop: these variables do not exist in the browser
 * bundle, so a client component reading them renders one thing on the server
 * and another after hydration.
 */
export interface Deployment {
  host: string;
  env: string;
  /** Short commit hash, or null when the platform does not expose one. */
  commit: string | null;
}

export function deployment(): Deployment {
  const short = (sha: string | undefined) => (sha ? sha.slice(0, 7) : null);
  if (process.env.VERCEL) {
    return { host: "Vercel Edge Network", env: process.env.VERCEL_ENV ?? "production", commit: short(process.env.VERCEL_GIT_COMMIT_SHA) };
  }
  if (process.env.CF_PAGES || process.env.WORKERS_CI) {
    return { host: "Cloudflare", env: process.env.CF_PAGES_BRANCH ?? "production", commit: short(process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA) };
  }
  return { host: "Self-hosted Node", env: process.env.NODE_ENV, commit: null };
}
