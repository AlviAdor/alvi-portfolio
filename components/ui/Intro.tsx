"use client";

import { useEffect, useRef, useState } from "react";
import { scrollBus } from "@/lib/scroll";
import { greetings, site } from "@/lib/site";
import { useSceneStore } from "@/lib/store";

const ACCENTS = ["#00F0FF", "#A5B4FC", "#6366F1", "#F472B6", "#E6EDF7"];
const STEP_MS = 230;
const HOLD_MS = 2600;

/**
 * First-visit greeting from the original portfolio, now multilingual in a
 * boot-sequence cadence. Shown once per browser session on the home page.
 * The pre-paint script in app/layout.tsx sets html[data-intro] only when it
 * should play, so returning visitors never see a flash of it.
 */
export default function Intro() {
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute("data-intro")) return;

    const finish = () => {
      if (done.current) return;
      done.current = true;
      setLeaving(true);
      try {
        sessionStorage.setItem("aa:intro", "1");
      } catch {
        /* storage blocked: it will simply play again next visit */
      }
      window.setTimeout(() => {
        root.removeAttribute("data-intro");
        useSceneStore.getState().setIntroDone();
        scrollBus.start();
      }, 650);
    };

    const cycle = window.setInterval(() => setI((n) => (n + 1) % greetings.length), STEP_MS);
    const hold = window.setTimeout(finish, HOLD_MS);
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && !["Escape", "Enter", " "].includes(e.key)) return;
      finish();
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.clearInterval(cycle);
      window.clearTimeout(hold);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`intro-overlay fixed inset-0 z-[80] place-items-center bg-abyss transition-[opacity,filter] duration-700 ${leaving ? "pointer-events-none opacity-0 blur-sm" : "opacity-100"}`}
    >
      <div className="text-center">
        <p className="font-mono text-[10px] tracking-[0.3em] text-faint uppercase">ador-os · boot</p>
        <p className="mt-6 min-h-[1.2em] text-5xl font-semibold tracking-tight transition-colors duration-200 sm:text-7xl" style={{ color: ACCENTS[i % ACCENTS.length] }}>
          {greetings[i]}
        </p>
        <p className="mt-6 font-mono text-[11px] tracking-[0.2em] text-mute uppercase">
          {site.handle} · {site.roles[0]}
        </p>
        <div className="mx-auto mt-10 h-px w-48 overflow-hidden bg-line">
          <div className="intro-progress h-full bg-neon" />
        </div>
        <p className="mt-6 font-mono text-[10px] text-faint">click or press esc to skip</p>
      </div>
    </div>
  );
}
