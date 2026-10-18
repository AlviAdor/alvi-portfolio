"use client";

import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WebGLRenderer } from "three";
import { tierBudget } from "@/lib/device";
import { useSceneStore } from "@/lib/store";
import ParticleGalaxy from "./ParticleGalaxy";

const MIN_DPR = 0.75;

/** Pauses the render loop while the element is off-screen or the tab is hidden. */
export function useRenderGate<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? false), { rootMargin: "120px" });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return { ref, active: onScreen && tabVisible };
}

/** Pure-CSS stand-in used during SSR, before tier detection, and on low-power devices. */
function GalaxyFallback() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="css-galaxy absolute inset-0 opacity-90" />
      <div className="absolute top-1/2 left-[62%] size-[46vmin] -translate-1/2 rounded-full bg-[radial-gradient(circle,rgb(0_240_255/0.18),transparent_65%)] blur-2xl" />
    </div>
  );
}

/**
 * Root R3F canvas for the hero. Adaptive resolution: starts at
 * min(tier max, devicePixelRatio) and lets drei's PerformanceMonitor walk the
 * DPR down (or back up) to hold ~60 fps. If the GPU still can't cope, or the
 * context is lost, the whole experience drops to the CSS fallback.
 */
export default function Scene3D() {
  const quality = useSceneStore((s) => s.quality);
  const setQuality = useSceneStore((s) => s.setQuality);
  const { ref, active } = useRenderGate<HTMLDivElement>();
  const [dpr, setDpr] = useState(1);
  const maxDpr = useRef(1);

  useEffect(() => {
    if (!quality || quality === "fallback") return;
    maxDpr.current = Math.min(tierBudget[quality].maxDpr, window.devicePixelRatio || 1);
    setDpr(maxDpr.current);
  }, [quality]);

  const onCreated = useCallback(
    ({ gl }: { gl: WebGLRenderer }) => {
      gl.setClearColor(0x000000, 0);
      gl.domElement.addEventListener(
        "webglcontextlost",
        (e) => {
          e.preventDefault();
          setQuality("fallback");
        },
        { once: true },
      );
    },
    [setQuality],
  );

  if (!quality || quality === "fallback") {
    return (
      <div ref={ref} className="absolute inset-0">
        <GalaxyFallback />
      </div>
    );
  }

  const budget = tierBudget[quality];

  return (
    <div ref={ref} aria-hidden className="absolute inset-0">
      <Canvas
        dpr={dpr}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 9], fov: 55, near: 0.1, far: 60 }}
        gl={{ antialias: false, alpha: true, stencil: false, depth: false, powerPreference: "high-performance" }}
        onCreated={onCreated}
        style={{ position: "absolute", inset: 0 }}
      >
        <PerformanceMonitor
          flipflops={4}
          bounds={(refreshRate) => (refreshRate > 90 ? [55, 90] : [45, 58])}
          onChange={({ factor }) => setDpr(Math.round((MIN_DPR + factor * (maxDpr.current - MIN_DPR)) * 100) / 100)}
          onFallback={() => setQuality("fallback")}
        >
          <ParticleGalaxy count={budget.particles} neurons={budget.neurons} />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
