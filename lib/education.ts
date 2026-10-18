/*
 * Merit roadmap data for EducationFlowchart. Facts only; the human-readable
 * title/subtitle/detail for each node live in messages/<locale>.json under
 * `roadmap.nodes.<id>` so the graph is fully translatable.
 *
 * Sources: CV (SSC/HSC/AIUB), the Cisco Networking Academy "Ethical Hacker"
 * certificate on file (03 Oct 2026), the IELTS Academic TRF (17 Jul 2021,
 * overall 7.0 / CEFR C1), and the ResearchGate/DataCite record for the FER paper.
 */

export type EduKind = "education" | "credential" | "language" | "research" | "goal";
export type EduLane = "education" | "security" | "ai" | "goals";

export interface EduNode {
  id: string;
  kind: EduKind;
  lane: EduLane;
  /** Column on the time axis, 0 (earliest) … 6 (now / near future). */
  col: number;
  /**
   * Short tag shown with the node. Literal facts (years, scores, "Cisco · 2026")
   * are shown as-is; words are stored as "t:<key>" and translated from
   * messages `roadmap.tags.<key>`.
   */
  tag: string;
  /** Earned/verified vs. a stated goal. Goals are always rendered as aspirations, never credentials. */
  earned: boolean;
  /** Outgoing edges to other node ids. */
  to: string[];
  /** External verification/evidence link, when one exists. */
  href?: string;
}

export const eduNodes: EduNode[] = [
  { id: "ssc", kind: "education", lane: "education", col: 0, tag: "2018 · GPA 5.00", earned: true, to: ["hsc"] },
  { id: "hsc", kind: "education", lane: "education", col: 1, tag: "2020 · GPA 5.00", earned: true, to: ["aiub"] },
  { id: "ielts", kind: "language", lane: "education", col: 2, tag: "2021 · 7.0 / C1", earned: true, to: ["aiub"] },
  { id: "aiub", kind: "education", lane: "education", col: 3, tag: "t:finalYear", earned: true, to: ["major-sec", "minor-ml"] },

  { id: "major-sec", kind: "education", lane: "security", col: 4, tag: "t:major", earned: true, to: ["ethical-hacker", "assessment", "secure-auth"] },
  { id: "ethical-hacker", kind: "credential", lane: "security", col: 7, tag: "Cisco · 2026", earned: true, to: ["goal-security-plus"], href: "https://www.netacad.com/" },
  { id: "assessment", kind: "research", lane: "security", col: 5, tag: "t:labWriteup", earned: true, to: ["goal-thm"] },
  { id: "secure-auth", kind: "research", lane: "security", col: 6, tag: "t:e2eApp", earned: true, to: ["goal-thm"] },

  { id: "minor-ml", kind: "education", lane: "ai", col: 4, tag: "t:minor", earned: true, to: ["cnn", "fer-paper"] },
  { id: "cnn", kind: "research", lane: "ai", col: 5, tag: "98%+", earned: true, to: ["fer-paper", "oct"] },
  { id: "fer-paper", kind: "research", lane: "ai", col: 6, tag: "2026 · RG", earned: true, to: ["oct"], href: "https://doi.org/10.13140/RG.2.2.33309.88804" },
  { id: "oct", kind: "research", lane: "ai", col: 7, tag: "t:inProgress", earned: false, to: [] },

  { id: "goal-security-plus", kind: "goal", lane: "goals", col: 7, tag: "t:inPreparation", earned: false, to: ["goal-ceh"] },
  { id: "goal-ceh", kind: "goal", lane: "goals", col: 8, tag: "t:planned", earned: false, to: [] },
  { id: "goal-thm", kind: "goal", lane: "goals", col: 6, tag: "t:ongoing", earned: false, to: ["goal-security-plus"] },
];

export const eduLaneOrder: EduLane[] = ["education", "security", "ai", "goals"];

export const eduLaneColor: Record<EduLane, string> = {
  education: "#A5B4FC",
  security: "#FF2E63",
  ai: "#00F0FF",
  goals: "#6366F1",
};

export const eduKindColor: Record<EduKind, string> = {
  education: "#A5B4FC",
  credential: "#4ADE80",
  language: "#FBBF24",
  research: "#00F0FF",
  goal: "#6366F1",
};

/** Resolve a node tag: "t:key" → translated word, anything else → the literal fact. */
export function tagLabel(tag: string, t: (key: string) => string): string {
  return tag.startsWith("t:") ? t(`tags.${tag.slice(2)}`) : tag;
}
