"use client";

import gsap from "gsap";
import { ArrowDownRight, ArrowUpRight, BrainCircuit, ShieldHalf } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import MagneticButton from "@/components/ui/MagneticButton";
import SecurityStatus from "@/components/ui/SecurityStatus";
import { prefersReducedMotion } from "@/lib/device";
import { scrollBus } from "@/lib/scroll";
import { graphemes, needsWordSplit } from "@/lib/text";
import { useSceneStore, type HeroMode } from "@/lib/store";

const Scene3D = dynamic(() => import("@/components/canvas/Scene3D"), {
  ssr: false,
  loading: () => <div aria-hidden className="css-galaxy absolute inset-0 opacity-90" />,
});

/*
 * Headline reveal. Latin/CJK animate per grapheme cluster; complex scripts
 * (e.g. Bengali) animate per word, because splitting a syllable across spans
 * breaks its shaping (vowel signs and conjuncts render as dotted circles).
 */
function SplitLine({ text }: { text: string }) {
  const words = text.split(" ");
  const perWord = needsWordSplit(text);
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <span className="sr-only">{text}</span>
      <span aria-hidden className="block">
        {words.map((word, w) => (
          <span key={w} className="inline-block whitespace-nowrap">
            {perWord ? (
              <span data-char className="inline-block will-change-transform">
                {word}
              </span>
            ) : (
              graphemes(word).map((ch, i) => (
                <span key={i} data-char className="inline-block will-change-transform">
                  {ch}
                </span>
              ))
            )}
            {w < words.length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function Hero() {
  const t = useTranslations("hero");
  const root = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const heroMode = useSceneStore((s) => s.heroMode);
  const setHeroMode = useSceneStore((s) => s.setHeroMode);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    let unsubscribe: (() => void) | undefined;
    const ctx = gsap.context(() => {
      if (reduced) return;
      const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
      tl.from("[data-char]", { yPercent: 115, rotate: 6, duration: 1.2, stagger: 0.016 })
        .from("[data-hero-fade]", { autoAlpha: 0, y: 24, duration: 1, stagger: 0.07 }, "-=0.9")
        .from("[data-hero-line]", { scaleX: 0, transformOrigin: "left", duration: 1.4 }, "-=1");
      if (useSceneStore.getState().introDone) tl.play();
      else
        unsubscribe = useSceneStore.subscribe((st) => {
          if (st.introDone) {
            tl.play();
            unsubscribe?.();
          }
        });

      gsap.to(content.current, {
        yPercent: -18,
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom 20%", scrub: true },
      });
    }, el);
    return () => {
      unsubscribe?.();
      ctx.revert();
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("a,button,input,textarea,select")) return;
    useSceneStore.getState().fireImpulse((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  };

  const modes: { id: HeroMode; icon: typeof BrainCircuit; label: string; desc: string }[] = [
    { id: "neural", icon: BrainCircuit, label: t("modeNeural"), desc: t("modeNeuralDesc") },
    { id: "defense", icon: ShieldHalf, label: t("modeDefense"), desc: t("modeDefenseDesc") },
  ];

  return (
    <section id="hero" ref={root} onPointerDown={onPointerDown} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <Scene3D />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_60%,rgb(11_15_23/0.88),transparent_62%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-obsidian" />

      <div ref={content} className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-5 pt-28 pb-16 sm:px-8 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col justify-center">
          <div data-hero-fade className="mb-8 inline-flex w-fit items-center gap-3 border border-signal/30 bg-signal/[0.06] px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] text-signal">
            <span className="size-2 animate-pulse-dot rounded-full bg-signal" />
            {t("badge")}
          </div>

          <p data-hero-fade className="eyebrow mb-6">
            {t("kicker")}
          </p>

          <h1 className="max-w-4xl text-mega font-semibold">
            <SplitLine text={t("titleA")} />
            <span className="block text-neon">
              <SplitLine text={t("titleB")} />
            </span>
          </h1>

          <div data-hero-line className="mt-10 h-px w-full max-w-xl bg-gradient-to-r from-neon/60 to-transparent" />

          <p data-hero-fade className="mt-8 max-w-xl text-base leading-relaxed text-pretty text-mute sm:text-lg">
            {t("sub")}
          </p>

          <div data-hero-fade className="mt-10 flex flex-wrap gap-4">
            <MagneticButton onClick={() => scrollBus.to("#contact")}>
              {t("ctaPrimary")} <ArrowUpRight className="size-4" aria-hidden />
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => scrollBus.to("#research")}>
              {t("ctaResearch")} <ArrowDownRight className="size-4" aria-hidden />
            </MagneticButton>
          </div>

          {/* mode toggle */}
          <div data-hero-fade role="group" aria-label="Scene mode" className="mt-8 inline-flex w-fit gap-1 border border-line p-1">
            {modes.map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                type="button"
                aria-pressed={heroMode === id}
                title={desc}
                onClick={() => setHeroMode(id)}
                className={`inline-flex items-center gap-2 px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${heroMode === id ? "bg-neon/10 text-neon" : "text-mute hover:text-ink"}`}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div data-hero-fade className="hidden lg:block">
          <SecurityStatus />
        </div>
      </div>

    </section>
  );
}
