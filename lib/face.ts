"use client";

import type { Emotion } from "./fer";
import { emotions, softmax } from "./fer";

/*
 * Optional live mode for the FER lab. Uses MediaPipe's FaceLandmarker (model
 * self-hosted in /public/models, WASM pinned to the installed version) to read
 * ARKit-style blendshapes from a camera frame, entirely on-device. A small
 * heuristic maps a handful of blendshapes to the seven FER classes so a visitor
 * can see how a confidence threshold behaves on their own expression. Nothing
 * is uploaded: frames never leave the browser.
 */

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_PATH = "/models/face_landmarker.task";

type Landmarker = import("@mediapipe/tasks-vision").FaceLandmarker;
let landmarkerPromise: Promise<Landmarker | null> | null = null;

async function getLandmarker(): Promise<Landmarker | null> {
  landmarkerPromise ??= (async () => {
    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      });
    } catch (err) {
      console.warn("[face] landmarker unavailable", err);
      return null;
    }
  })();
  return landmarkerPromise;
}

const sum = (b: Map<string, number>, ...keys: string[]) => keys.reduce((a, k) => a + (b.get(k) ?? 0), 0);

/** Heuristic blendshape → emotion mapping. Not a trained classifier; a teaching toy. */
function toDistribution(blend: Map<string, number>): Record<Emotion, number> {
  const raw: Record<Emotion, number> = {
    happy: sum(blend, "mouthSmileLeft", "mouthSmileRight") * 3,
    surprise: (sum(blend, "jawOpen") + sum(blend, "eyeWideLeft", "eyeWideRight") + sum(blend, "browInnerUp")) * 1.4,
    sad: (sum(blend, "mouthFrownLeft", "mouthFrownRight") + sum(blend, "browInnerUp") * 0.5) * 2,
    anger: (sum(blend, "browDownLeft", "browDownRight") + sum(blend, "mouthPressLeft", "mouthPressRight")) * 1.6,
    fear: (sum(blend, "eyeWideLeft", "eyeWideRight") + sum(blend, "mouthStretchLeft", "mouthStretchRight")) * 1.3,
    disgust: (sum(blend, "noseSneerLeft", "noseSneerRight") + sum(blend, "mouthUpperUpLeft", "mouthUpperUpRight")) * 1.6,
    neutral: 0.6,
  };
  const probs = softmax(
    emotions.map((e) => raw[e]),
    0.6,
  );
  return Object.fromEntries(emotions.map((e, i) => [e, probs[i]!])) as Record<Emotion, number>;
}

export interface FaceReading {
  found: boolean;
  dist: Record<Emotion, number>;
}

export async function readFrame(video: HTMLVideoElement, timestampMs: number): Promise<FaceReading | null> {
  const lm = await getLandmarker();
  if (!lm) return null;
  const result = lm.detectForVideo(video, timestampMs);
  const shapes = result.faceBlendshapes?.[0]?.categories;
  if (!shapes || shapes.length === 0) return { found: false, dist: {} as Record<Emotion, number> };
  const blend = new Map(shapes.map((c) => [c.categoryName, c.score]));
  return { found: true, dist: toDistribution(blend) };
}

export function disposeFace(): void {
  void landmarkerPromise?.then((lm) => lm?.close());
  landmarkerPromise = null;
}
