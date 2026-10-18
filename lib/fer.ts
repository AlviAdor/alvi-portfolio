/*
 * Confidence-threshold explorer for the facial-emotion-recognition lab.
 *
 * A fixed, representative softmax output over the seven standard FER classes
 * (no camera, no model run by default — just the published class set and one
 * example distribution). The learner drags a confidence threshold and sees how
 * a cost-sensitive system decides between committing to a label and abstaining,
 * which is exactly the trade-off the FER paper is about. An optional live mode
 * (lib/face.ts) can replace the fixed example with the viewer's own camera,
 * strictly on an explicit click.
 */

export type Emotion = "neutral" | "happy" | "sad" | "surprise" | "fear" | "disgust" | "anger";

export const emotions: Emotion[] = ["neutral", "happy", "sad", "surprise", "fear", "disgust", "anger"];

export const emotionColor: Record<Emotion, string> = {
  neutral: "#8A94A8",
  happy: "#4ADE80",
  sad: "#60A5FA",
  surprise: "#FBBF24",
  fear: "#A78BFA",
  disgust: "#34D399",
  anger: "#FF2E63",
};

/** A fixed, ambiguous-on-purpose example distribution (sums to ~1). */
export const exampleLogits: Record<Emotion, number> = {
  neutral: 0.08,
  happy: 0.57,
  sad: 0.06,
  surprise: 0.14,
  fear: 0.05,
  disgust: 0.03,
  anger: 0.07,
};

export interface Ranked {
  emotion: Emotion;
  prob: number;
}

export function rank(dist: Record<Emotion, number>): Ranked[] {
  return emotions.map((emotion) => ({ emotion, prob: dist[emotion] })).sort((a, b) => b.prob - a.prob);
}

export interface Decision {
  top: Ranked;
  /** Commit to the top label, or abstain because it's below the threshold. */
  committed: boolean;
  /** Margin between the top two classes — how confident the call is. */
  margin: number;
}

export function decide(dist: Record<Emotion, number>, threshold: number): Decision {
  const ranked = rank(dist);
  const top = ranked[0]!;
  const second = ranked[1]?.prob ?? 0;
  return { top, committed: top.prob >= threshold, margin: top.prob - second };
}

/** Softmax with a temperature knob, so the live/face path can reuse it. */
export function softmax(scores: number[], temperature = 1): number[] {
  const t = Math.max(temperature, 1e-3);
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / t));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}
