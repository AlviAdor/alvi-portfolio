"use client";

import type Lenis from "lenis";

/**
 * Module-level handle to the single Lenis instance so any component can
 * scroll, pause or resume without prop-drilling. Falls back to native
 * scrolling when Lenis is disabled (reduced motion).
 */
let lenis: Lenis | null = null;

export const scrollBus = {
  attach(instance: Lenis | null) {
    lenis = instance;
  },
  to(target: string | HTMLElement | number, offset = -24) {
    if (lenis) {
      lenis.scrollTo(target, { offset, duration: 1.4 });
      return;
    }
    const el = typeof target === "string" ? document.querySelector(target) : typeof target === "number" ? null : target;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  },
  stop() {
    lenis?.stop();
  },
  start() {
    lenis?.start();
  },
};
