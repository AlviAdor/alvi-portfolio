/*
 * Credentials shown as holographic tilt cards. `earned` entries are real,
 * verifiable certificates on file. `goal` entries are stated targets, rendered
 * in a clearly separated "In preparation" rail — never styled as if already held.
 *
 * Titles/issuer/blurb live in messages/<locale>.json under `certs.items.<id>`;
 * only the issuer proper noun, date and verification link are kept here.
 */

export type CredentialStatus = "earned" | "goal";
export type CredentialTrack = "security" | "language" | "ai";

export interface Credential {
  id: string;
  status: CredentialStatus;
  track: CredentialTrack;
  issuer: string;
  /** Factual date or target window; not translated. */
  period: string;
  /** Verification/issuer link when one exists. */
  href?: string;
  /** Accent for the holographic foil. */
  accent: string;
}

export const credentials: Credential[] = [
  {
    id: "ethical-hacker",
    status: "earned",
    track: "security",
    issuer: "Cisco Networking Academy",
    period: "Oct 2026",
    href: "https://www.netacad.com/",
    accent: "#FF2E63",
  },
  {
    id: "ielts",
    status: "earned",
    track: "language",
    issuer: "British Council / IDP · Cambridge",
    period: "Jul 2021",
    accent: "#FBBF24",
  },
  {
    id: "goal-security-plus",
    status: "goal",
    track: "security",
    issuer: "CompTIA",
    period: "Target",
    accent: "#00F0FF",
  },
  {
    id: "goal-ceh",
    status: "goal",
    track: "security",
    issuer: "EC-Council",
    period: "Target",
    accent: "#6366F1",
  },
  {
    id: "goal-thm",
    status: "goal",
    track: "security",
    issuer: "TryHackMe",
    period: "Ongoing",
    accent: "#4ADE80",
  },
];

export const earnedCredentials = credentials.filter((c) => c.status === "earned");
export const goalCredentials = credentials.filter((c) => c.status === "goal");
