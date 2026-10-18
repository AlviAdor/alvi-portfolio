"use client";

import { create } from "zustand";

/**
 * Rendering budget, decided once on the client.
 * - high:     desktop-class GPU, full particle count, dpr up to 2
 * - medium:   mobile / integrated GPU, reduced counts, dpr up to 1.5
 * - fallback: no WebGL, software renderer, reduced motion or low-power device → CSS only
 */
export type QualityTier = "high" | "medium" | "fallback";

/** Hero visualisation mode: neural-network explorer vs. threat-defense matrix. */
export type HeroMode = "neural" | "defense";

export interface ScrollMetrics {
  /** Whole-page progress, 0..1. */
  progress: number;
  /** Lenis velocity in px/frame, signed. */
  velocity: number;
  /** 0 while the hero fills the viewport, 1 once it has fully scrolled away. */
  hero: number;
}

export interface Impulse {
  /** Pointer position in normalised device coordinates (-1..1). */
  x: number;
  y: number;
  /** performance.now() at the moment of the click; 0 = none yet. */
  at: number;
}

interface SceneState {
  quality: QualityTier | null;
  scroll: ScrollMetrics;
  /** Pointer in normalised device coordinates; `active` flips true on first move. */
  pointer: { x: number; y: number; active: boolean };
  impulse: Impulse;
  soundEnabled: boolean;
  terminalOpen: boolean;
  heroMode: HeroMode;
  /** True once the first-visit greeting has finished (or was never shown). */
  introDone: boolean;
  /** User's "Reduced motion" display preference (OS setting is checked separately). */
  reducedMotion: boolean;
  setQuality: (quality: QualityTier) => void;
  setScroll: (scroll: ScrollMetrics) => void;
  setPointer: (x: number, y: number) => void;
  fireImpulse: (x: number, y: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  setHeroMode: (mode: HeroMode) => void;
  setIntroDone: () => void;
  setReducedMotion: (on: boolean) => void;
}

/**
 * High-frequency fields (scroll, pointer, impulse) are written every frame
 * and read inside `useFrame` through `useSceneStore.getState()`, so they never
 * trigger React renders. Only `quality`, `soundEnabled` and `terminalOpen`
 * are consumed through selectors.
 */
export const useSceneStore = create<SceneState>()((set) => ({
  quality: null,
  scroll: { progress: 0, velocity: 0, hero: 0 },
  pointer: { x: 0, y: 0, active: false },
  impulse: { x: 0, y: 0, at: 0 },
  soundEnabled: false,
  terminalOpen: false,
  heroMode: "neural",
  introDone: false,
  reducedMotion: false,
  setQuality: (quality) => set({ quality }),
  setScroll: (scroll) => set({ scroll }),
  setPointer: (x, y) => set({ pointer: { x, y, active: true } }),
  fireImpulse: (x, y) => set({ impulse: { x, y, at: performance.now() } }),
  setSoundEnabled: (soundEnabled) => {
    try {
      localStorage.setItem("aa:sound", soundEnabled ? "1" : "0");
    } catch {
      /* storage unavailable (private mode) – the preference just won't persist */
    }
    set({ soundEnabled });
  },
  setTerminalOpen: (terminalOpen) => set({ terminalOpen }),
  setHeroMode: (heroMode) => set({ heroMode }),
  setIntroDone: () => set({ introDone: true }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
