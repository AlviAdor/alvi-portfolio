"use client";

/**
 * One-shot person segmentation of the portrait, run in the browser with
 * MediaPipe's selfie segmenter (≈250 KB model, self-hosted in /public/models).
 * The result is a single-channel mask: 255 = person, 0 = background. The
 * portrait shader uses it to swap the backdrop for a flat colour while every
 * pixel of the subject (face, body, clothing) stays untouched.
 */

/** Must match the installed @mediapipe/tasks-vision version. */
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_PATH = "/models/selfie_segmenter.tflite";

export interface SegmentationMask {
  /** Row 0 is the BOTTOM of the image (WebGL texture orientation). */
  data: Uint8Array;
  width: number;
  height: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const cache = new Map<string, Promise<SegmentationMask | null>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

function meanIn(data: Uint8Array, width: number, height: number, box: Box): number {
  const x0 = Math.floor(box.x * width);
  const x1 = Math.ceil((box.x + box.w) * width);
  const y0 = Math.floor(box.y * height);
  const y1 = Math.ceil((box.y + box.h) * height);
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 2)
    for (let x = x0; x < x1; x += 2) {
      sum += data[y * width + x] ?? 0;
      n++;
    }
  return n ? sum / n : 0;
}

async function run(src: string, faceBox: Box): Promise<SegmentationMask | null> {
  const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const segmenter = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
    runningMode: "IMAGE",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });

  try {
    const img = await loadImage(src);
    const result = segmenter.segment(img);
    try {
      const mask = result.confidenceMasks?.[0];
      if (!mask) return null;
      const { width, height } = mask;
      const conf = mask.getAsFloat32Array();
      const data = new Uint8Array(width * height);
      // flip rows: MediaPipe is top-down, WebGL textures are bottom-up
      for (let y = 0; y < height; y++) {
        const src0 = y * width;
        const dst0 = (height - 1 - y) * width;
        for (let x = 0; x < width; x++) data[dst0 + x] = Math.round(Math.min(1, Math.max(0, conf[src0 + x] ?? 0)) * 255);
      }
      // Some model versions emit background confidence instead of person.
      // The face must be "person", the top corners must not – invert if reversed.
      const face = meanIn(data, width, height, faceBox);
      const corners =
        (meanIn(data, width, height, { x: 0, y: 0.88, w: 0.1, h: 0.1 }) + meanIn(data, width, height, { x: 0.9, y: 0.88, w: 0.1, h: 0.1 })) / 2;
      if (face < corners) for (let i = 0; i < data.length; i++) data[i] = 255 - (data[i] ?? 0);
      return { data, width, height };
    } finally {
      result.close();
    }
  } finally {
    segmenter.close();
  }
}

/** Memoised per image: StrictMode remounts and revisits reuse the first result. */
export function segmentPortrait(src: string, faceBox: Box): Promise<SegmentationMask | null> {
  let pending = cache.get(src);
  if (!pending) {
    pending = run(src, faceBox).catch((err: unknown) => {
      console.warn("[portrait] segmentation unavailable:", err);
      return null;
    });
    cache.set(src, pending);
  }
  return pending;
}
