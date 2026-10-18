"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";
import { detectQualityTier, prefersReducedMotion } from "@/lib/device";
import { scrollBus } from "@/lib/scroll";
import { useSceneStore } from "@/lib/store";

gsap.registerPlugin(ScrollTrigger);

/**
 * Client root of the experience:
 *  - decides the GPU quality tier (again whenever "Reduced motion" is toggled)
 *  - restores the sound preference
 *  - drives Lenis from GSAP's ticker so ScrollTrigger and Lenis share one clock
 *  - publishes scroll metrics + pointer to the Zustand store for the WebGL scenes
 *  - wires generic [data-reveal] scroll animations
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const reducedPref = useSceneStore((s) => s.reducedMotion);

  // one-time wiring: preferences, pointer, reveal animations
  useEffect(() => {
    const store = useSceneStore.getState();
    store.setReducedMotion(document.documentElement.hasAttribute("data-reduce-motion"));
    try {
      if (localStorage.getItem("aa:sound") === "1") useSceneStore.setState({ soundEnabled: true });
    } catch {
      /* storage blocked */
    }
    if (!document.documentElement.hasAttribute("data-intro")) store.setIntroDone();

    const onPointer = (e: PointerEvent) => {
      useSceneStore.getState().setPointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    /*
     * Reveal-on-scroll with a live, frame-throttled position check — not
     * ScrollTrigger (lazily loaded sections grow the page after mount and leave
     * pre-measured trigger positions stale) and not IntersectionObserver (it
     * only reports state *changes*, so an element a fast scroll jumps clean
     * over, below-the-fold → above-the-fold in one frame, is never reported).
     * Anything whose top has crossed 92% of the viewport is revealed, which
     * includes everything already scrolled past.
     */
    const reduced = prefersReducedMotion();
    const waiting = new Set<Element>();
    let ticking = false;
    const check = () => {
      ticking = false;
      const limit = window.innerHeight * 0.92;
      const batch: Element[] = [];
      for (const el of waiting) {
        if (el.getBoundingClientRect().top < limit) {
          batch.push(el);
          waiting.delete(el);
        }
      }
      // cap the batch's total stagger so a fast scroll never leaves a long hidden tail
      if (batch.length) gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: { amount: Math.min(0.5, batch.length * 0.08) }, overwrite: true });
      if (!waiting.size) stopWatching();
    };
    const onScrollReveal = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };
    const stopWatching = () => {
      window.removeEventListener("scroll", onScrollReveal);
      window.removeEventListener("resize", onScrollReveal);
    };
    if (!reduced) {
      const targets = document.querySelectorAll("[data-reveal]");
      gsap.set(targets, { autoAlpha: 0, y: 36 });
      targets.forEach((el) => waiting.add(el));
      window.addEventListener("scroll", onScrollReveal, { passive: true });
      window.addEventListener("resize", onScrollReveal, { passive: true });
      onScrollReveal();
    }

    // Remaining ScrollTriggers (hero scrub, commit matrix) re-measure whenever
    // the document height changes, debounced to one refresh per frame burst.
    let refreshTimer = 0;
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    void document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      stopWatching();
      ro.disconnect();
      window.clearTimeout(refreshTimer);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("load", refresh);
    };
  }, []);

  // quality tier + smooth scrolling, rebuilt when the reduced-motion preference changes
  useEffect(() => {
    const reduced = prefersReducedMotion();
    useSceneStore.getState().setQuality(detectQualityTier());
    if (reduced) gsap.set("[data-reveal]", { autoAlpha: 1, y: 0 });

    const hero = document.getElementById("hero");
    const publish = (velocity: number) => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const y = window.scrollY;
      const heroH = hero?.offsetHeight ?? window.innerHeight;
      useSceneStore.getState().setScroll({
        progress: Math.min(1, y / max),
        velocity,
        hero: Math.min(1, Math.max(0, y / heroH)),
      });
    };

    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;
    const onNativeScroll = () => {
      publish(0);
      ScrollTrigger.update();
    };

    if (!reduced) {
      lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.4, anchors: { offset: -24 } });
      lenis.on("scroll", (l: Lenis) => {
        publish(l.velocity);
        ScrollTrigger.update();
      });
      tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      // the greeting overlay holds the page still until it hands over
      if (document.documentElement.hasAttribute("data-intro")) lenis.stop();
    } else {
      window.addEventListener("scroll", onNativeScroll, { passive: true });
    }
    scrollBus.attach(lenis);
    publish(0);

    return () => {
      window.removeEventListener("scroll", onNativeScroll);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      scrollBus.attach(null);
    };
  }, [reducedPref]);

  return <>{children}</>;
}
