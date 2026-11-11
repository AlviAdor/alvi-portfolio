import { projects, type ProjectShot } from "./projects";

/*
 * The evidence reel between the hero and About: a fast-cut sequence, about
 * fifteen seconds long. Each beat cuts into the artefact behind one claim (a
 * scan, a training curve, a confusion matrix, a screen of the running build)
 * and stamps it with the single figure that claim rests on. Figures are read
 * off the artefact or its case study; the line under each one is translated
 * (messages → reel.claims.*).
 */

/** Where the artefact sits on a wide stage; on a narrow one it always takes the top band. */
export type ReelLayout = "right" | "left" | "top" | "tall";

/** The number a beat is built around, split so the digits can count up. */
export interface ReelFigure {
  prefix?: string;
  value: number;
  suffix?: string;
}

export const figureText = (figure: ReelFigure): string => `${figure.prefix ?? ""}${figure.value}${figure.suffix ?? ""}`;

interface Beat {
  /** Also the message key (reel.claims.<id>) for beats that carry a figure. */
  id: string;
  seconds: number;
}

export interface EvidenceBeat extends Beat {
  kind: "evidence";
  /** Case study the artefact comes from. */
  slug: string;
  title: string;
  shot: ProjectShot;
  layout: ReelLayout;
  fit: "cover" | "contain";
  /** Which part of the artefact stays in frame when it is cropped (0..1 across, 0..1 down). */
  focus: [number, number];
  /** The detail that proves the claim, in image coordinates (0..1). The cut punches in on it. */
  detail: [number, number];
  /** How far the frame stays pushed in on that detail once the cut has settled (1 = whole artefact). */
  rest: number;
  /** Lines quoted from the artefact, set as live text so they stay sharp at any pixel density. */
  readout?: string[];
  /** Light-background plot, redrawn dark so a cut never flashes white. */
  plot: boolean;
  figure: ReelFigure;
}

export interface LanguagesBeat extends Beat {
  kind: "languages";
  figure: ReelFigure;
}

export type ReelBeat = (Beat & { kind: "hook" }) | (Beat & { kind: "end" }) | EvidenceBeat | LanguagesBeat;

type EvidenceOptions = Pick<EvidenceBeat, "layout" | "fit" | "focus" | "detail" | "rest" | "plot" | "figure" | "readout">;

/** Resolves the artefact from lib/projects.ts, so a renamed screenshot fails the build instead of the reel. */
function evidence(id: string, slug: string, file: string, options: EvidenceOptions): EvidenceBeat {
  const project = projects.find((p) => p.slug === slug);
  const shot = project?.shots.find((s) => s.src.endsWith(`/${file}`));
  if (!project || !shot) throw new Error(`reel: "${file}" is not a shot of project "${slug}"`);
  return { id, kind: "evidence", seconds: 2, slug, title: project.title, shot, ...options };
}

export const reelBeats: ReelBeat[] = [
  { id: "hook", kind: "hook", seconds: 2.2 },
  // Nmap against an unknown host: three services answered (FTP, SSH, HTTP)
  evidence("scan", "security-assessment", "security-assessment-nmap.png", {
    layout: "right",
    fit: "cover",
    focus: [0.22, 0.42],
    detail: [0.25, 0.39],
    rest: 1.75,
    plot: false,
    figure: { value: 3 },
    readout: ["21/tcp  open  ftp", "22/tcp  open  ssh", "80/tcp  open  http"],
  }),
  // validation accuracy settles above 0.98 by the end of the 15 epochs
  evidence("train", "cnn-custom-dataset", "cnn-training-curves.png", {
    layout: "top",
    fit: "contain",
    focus: [0.5, 0.5],
    detail: [0.9, 0.16],
    rest: 1.02,
    plot: true,
    figure: { value: 98, suffix: "%+" },
  }),
  // off-diagonal cells of the confusion matrix: 3 + 3 + 4 + 1 + 1 + 10
  evidence("measure", "cnn-custom-dataset", "cnn-confusion-matrix.png", {
    layout: "left",
    fit: "contain",
    focus: [0.5, 0.5],
    detail: [0.47, 0.76],
    rest: 1.02,
    plot: true,
    figure: { value: 22 },
    readout: ["wild → dog   10", "dog → cat     4", "cat → dog     3"],
  }),
  evidence("encrypt", "secure-auth-demo", "secure-auth-register.png", {
    layout: "tall",
    fit: "cover",
    focus: [0.5, 0.04],
    detail: [0.17, 0.09],
    rest: 1.04,
    plot: false,
    figure: { prefix: "AES-", value: 256 },
  }),
  // the mode-select screen lists them: Classic, Speed, Zen, Rapid Fire, Gauntlet
  evidence("game", "dx-ball", "dxball-menu.png", {
    layout: "left",
    fit: "cover",
    focus: [0.5, 0.55],
    detail: [0.5, 0.565],
    rest: 1.2,
    plot: false,
    figure: { value: 5 },
  }),
  { id: "languages", kind: "languages", seconds: 2.3, figure: { value: 6 } },
  { id: "end", kind: "end", seconds: 1.6 },
];

export const evidenceBeats = reelBeats.filter((beat): beat is EvidenceBeat => beat.kind === "evidence");
