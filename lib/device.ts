import type { QualityTier } from "./store";

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|software|basic render|mesa offscreen/i;

/** Returns the unmasked GPU renderer string, or null when WebGL is unavailable. */
function probeWebGL(): { renderer: string; webgl2: boolean } | null {
  try {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    const gl = gl2 ?? canvas.getContext("webgl");
    if (!gl) return null;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { renderer, webgl2: gl2 !== null };
  } catch {
    return null;
  }
}

/** OS-level reduced-motion OR the site's own "Reduced motion" display toggle. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-reduce-motion");
}

/** Client-only. Decides how much GPU work the page is allowed to do. */
export function detectQualityTier(): QualityTier {
  if (typeof window === "undefined") return "fallback";

  const nav = navigator as NavigatorWithHints;
  const reducedMotion = prefersReducedMotion();
  const saveData = nav.connection?.saveData === true;
  if (reducedMotion || saveData) return "fallback";

  const gl = probeWebGL();
  if (!gl || SOFTWARE_RENDERERS.test(gl.renderer)) return "fallback";

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  // Low-power phones: few cores or little RAM on a touch device.
  if (coarse && (cores <= 4 || memory <= 2)) return "fallback";
  if (!gl.webgl2 || memory <= 2) return "fallback";
  if (coarse || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

export const tierBudget = {
  high: { particles: 14000, neurons: 220, maxDpr: 2 },
  medium: { particles: 6000, neurons: 110, maxDpr: 1.5 },
  fallback: { particles: 0, neurons: 0, maxDpr: 1 },
} as const satisfies Record<QualityTier, { particles: number; neurons: number; maxDpr: number }>;
