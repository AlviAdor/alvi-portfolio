"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playCue } from "@/lib/audio";
import { useSceneStore } from "@/lib/store";

/*
 * Display preferences from the original portfolio: readable font, reduced
 * motion, high contrast and text size. Stored in localStorage only (no cookies,
 * so no consent banner is needed) and applied before first paint by the inline
 * script in app/layout.tsx.
 */

export interface DisplayPrefs {
  readable: boolean;
  reduceMotion: boolean;
  contrast: boolean;
  scale: number;
}

export const DISPLAY_KEY = "aa:display";
const DEFAULTS: DisplayPrefs = { readable: false, reduceMotion: false, contrast: false, scale: 1 };

function apply(p: DisplayPrefs) {
  const root = document.documentElement;
  root.toggleAttribute("data-readable", p.readable);
  root.toggleAttribute("data-reduce-motion", p.reduceMotion);
  root.toggleAttribute("data-contrast", p.contrast);
  root.style.setProperty("--text-scale", String(p.scale));
}

function load(): DisplayPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(DISPLAY_KEY) ?? "{}") as Partial<DisplayPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

export default function DisplayPanel() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULTS);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => setPrefs(load()), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const update = (patch: Partial<DisplayPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    apply(next);
    try {
      localStorage.setItem(DISPLAY_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: applies for this page view only */
    }
    if (patch.reduceMotion !== undefined) useSceneStore.getState().setReducedMotion(patch.reduceMotion);
    playCue("click");
  };

  const toggles: [keyof Omit<DisplayPrefs, "scale">, string, string][] = [
    ["readable", "Readable font", "System sans-serif, no letter-spacing"],
    ["reduceMotion", "Reduced motion", "Stops smooth scroll, WebGL and animation"],
    ["contrast", "High contrast", "Brighter text and borders, no grain"],
  ];

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="display-panel"
        aria-label="Display settings"
        onClick={() => setOpen((o) => !o)}
        className={`grid size-8 place-items-center border transition-colors ${open ? "border-neon text-neon" : "border-line text-mute hover:text-ink"}`}
      >
        <SlidersHorizontal className="size-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            id="display-panel"
            role="dialog"
            aria-label="Display settings"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute top-11 right-0 w-72 border border-line bg-panel p-5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-neon uppercase">Display</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close display settings" className="text-mute hover:text-ink">
                <X className="size-3.5" />
              </button>
            </div>
            <ul className="space-y-3">
              {toggles.map(([key, label, hint]) => (
                <li key={key}>
                  <button type="button" role="switch" aria-checked={prefs[key]} onClick={() => update({ [key]: !prefs[key] })} className="flex w-full items-center justify-between gap-4 text-left">
                    <span>
                      <span className="block text-sm text-ink">{label}</span>
                      <span className="block font-mono text-[10px] text-faint">{hint}</span>
                    </span>
                    <span className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${prefs[key] ? "border-neon bg-neon/20" : "border-line bg-white/[0.03]"}`}>
                      <span className={`absolute top-0.5 size-3.5 rounded-full transition-all ${prefs[key] ? "left-[18px] bg-neon" : "left-0.5 bg-mute"}`} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <label className="mt-5 block">
              <span className="flex justify-between text-sm text-ink">
                Text size <span className="font-mono text-xs text-mute">{Math.round(prefs.scale * 100)}%</span>
              </span>
              <input
                type="range"
                min={0.9}
                max={1.3}
                step={0.05}
                value={prefs.scale}
                onChange={(e) => update({ scale: Number(e.target.value) })}
                className="mt-2 w-full accent-[#00F0FF]"
              />
            </label>
            <button type="button" onClick={() => update(DEFAULTS)} className="mt-4 font-mono text-[10px] tracking-[0.18em] text-mute uppercase hover:text-neon">
              Reset
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
