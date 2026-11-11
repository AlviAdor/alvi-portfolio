"use client";

import gsap from "gsap";
import { ArrowDownRight, ArrowUpRight, Pause, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Link } from "@/i18n/navigation";
import { localeNames, localeTags, locales } from "@/i18n/routing";
import { playCue } from "@/lib/audio";
import { prefersReducedMotion } from "@/lib/device";
import { evidenceBeats, figureText, reelBeats, type EvidenceBeat, type ReelFigure, type ReelLayout } from "@/lib/reel";
import { scrollBus } from "@/lib/scroll";
import { site } from "@/lib/site";
import { useSceneStore } from "@/lib/store";

/*
 * Evidence reel: a ~15 s fast-cut sequence between the hero and About. Each
 * beat punches in on a real artefact (scan, plot, running build) and stamps it
 * with the one figure the claim rests on.
 *
 * One GSAP timeline owns the whole edit, so play, pause, replay and jumping to
 * a beat are all seeks on the same clock. It plays while the stage is on
 * screen and pauses when it leaves or the tab is hidden. With reduced motion
 * (OS setting or the site's own toggle) no timeline is built: the stage shows
 * one beat at a time, stepped by hand. That static mode is also what the
 * server renders, so the content is there before any script runs.
 */

const STARTS = reelBeats.reduce<number[]>((acc, beat, i) => [...acc, i === 0 ? 0 : (acc[i - 1] ?? 0) + (reelBeats[i - 1]?.seconds ?? 0)], []);
/** A moment inside the opening beat with its lines fully in, shown until the reel first plays. */
const POSTER_AT = 1.4;

/* Artefact placement. Phones: a band across the top. From md up: per-beat. */
const PLATE: Record<ReelLayout, string> = {
  right: "inset-x-0 top-0 h-[56%] md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-[62%]",
  left: "inset-x-0 top-0 h-[56%] md:inset-y-0 md:right-auto md:left-0 md:h-auto md:w-[62%]",
  top: "inset-x-0 top-0 h-[50%] md:h-[58%]",
  tall: "inset-x-0 top-0 h-[56%] md:inset-y-0 md:right-[7%] md:left-auto md:h-auto md:w-[34%]",
};
const COPY: Record<ReelLayout, string> = {
  right: "md:right-auto md:max-w-[46%]",
  left: "md:left-auto md:max-w-[46%] md:text-right",
  top: "md:max-w-[78%]",
  tall: "md:right-auto md:max-w-[56%]",
};
/* The side each plate is uncovered from, so consecutive cuts wipe in opposite directions. */
const WIPE_FROM: Record<ReelLayout, string> = {
  right: "inset(0% 0% 0% 100%)",
  left: "inset(0% 100% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  tall: "inset(100% 0% 0% 0%)",
};
/* Lines quoted from the artefact take the free corner above the figure (wide stage only). */
const READOUT: Record<ReelLayout, string> = {
  right: "left-[4.4cqw]",
  left: "right-[4.4cqw] text-right",
  top: "left-[4.4cqw]",
  tall: "left-[4.4cqw]",
};
const COPY_BASE = "absolute inset-x-0 bottom-0 p-[6cqw] md:p-[4.4cqw]";
const KICKER = "font-mono text-[clamp(0.62rem,1.05cqw,0.72rem)] tracking-[0.22em] text-neon uppercase";

/** Display line split per word, each behind its own mask (word-level keeps Bengali shaping intact). */
function Slam({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={`block ${className}`}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="reel-mask">
            <span data-word className="inline-block will-change-transform">
              {word}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

/** The figure a beat is built around; the digits count up when the beat cuts in. */
function Figure({ figure }: { figure: ReelFigure }) {
  return (
    <p className="reel-figure" data-long={figureText(figure).length > 4 ? "" : undefined}>
      <span className="reel-mask">
        <span data-word className="inline-block will-change-transform">
          {figure.prefix}
          {figure.prefix ? figure.value : <span data-count={figure.value}>{figure.value}</span>}
          {figure.suffix}
        </span>
      </span>
    </p>
  );
}

/** Contact strip of every artefact in the reel; opens and closes the edit. */
function Strip({ eager }: { eager: boolean }) {
  return (
    <ul className="absolute inset-x-[6cqw] top-[6cqw] grid grid-cols-5 gap-[1.6cqw] md:inset-x-[4.4cqw] md:top-[4.4cqw] md:gap-[1.2cqw]">
      {evidenceBeats.map((evidence) => (
        <li key={evidence.id} data-thumb className="relative aspect-square overflow-hidden bg-panel md:aspect-[5/4]">
          <Image
            src={evidence.shot.src}
            alt=""
            fill
            sizes="(min-width: 768px) 240px, 20vw"
            loading={eager ? "eager" : "lazy"}
            draggable={false}
            className={`object-cover ${evidence.plot ? "reel-plot" : ""}`}
            style={{ objectPosition: `${evidence.detail[0] * 100}% ${evidence.detail[1] * 100}%` }}
          />
        </li>
      ))}
    </ul>
  );
}

function Artefact({ beat, eager }: { beat: EvidenceBeat; eager: boolean }) {
  const { shot } = beat;
  const vars = {
    "--ar": (shot.width / shot.height).toFixed(4),
    "--fx": beat.focus[0],
    "--fy": beat.focus[1],
    "--ox": `${beat.detail[0] * 100}%`,
    "--oy": `${beat.detail[1] * 100}%`,
    "--rest": beat.rest,
  } as CSSProperties;
  return (
    <div data-plate className={`absolute overflow-hidden ${PLATE[beat.layout]}`}>
      <div className={`reel-plate absolute ${beat.plot ? "inset-[3.5cqw]" : "inset-0"}`}>
        <div data-zoom data-fit={beat.fit} className="reel-canvas" style={vars}>
          <Image
            src={shot.src}
            alt=""
            fill
            sizes="(min-width: 768px) 1600px, 100vw"
            loading={eager ? "eager" : "lazy"}
            draggable={false}
            className={beat.plot ? "reel-plot" : undefined}
          />
          <span data-ring className="reel-ring" style={{ left: `${beat.detail[0] * 100}%`, top: `${beat.detail[1] * 100}%` }} />
        </div>
      </div>
      <div className="reel-scrim absolute inset-0" data-side={beat.layout} />
    </div>
  );
}

export default function Reel() {
  const t = useTranslations("reel");
  const tc = useTranslations("common");
  const reducedPref = useSceneStore((s) => s.reducedMotion);

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const sync = useRef<() => void>(() => {});
  const flags = useRef({ visible: false, inView: false, userPaused: false, userPlay: false, ready: false, started: false });
  const shown = useRef(0);

  const [still, setStill] = useState(true);
  const [eager, setEager] = useState(false);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);

  // fetch the artefacts shortly before the stage scrolls in, never in competition with the hero
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let idle = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        idle = window.setTimeout(() => setEager(true), 600);
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    const el = root.current;
    const stageEl = stage.current;
    if (!el || !stageEl) return;
    if (prefersReducedMotion()) {
      setStill(true);
      return;
    }
    setStill(false);

    const f = flags.current;
    Object.assign(f, { userPaused: false, userPlay: false, started: false });
    let forceReady = 0;

    const ctx = gsap.context(() => {
      const shots = gsap.utils.toArray<HTMLElement>("[data-shot]");
      const fills = gsap.utils.toArray<HTMLElement>("[data-fill]");
      const cam = el.querySelector<HTMLElement>("[data-cam]");
      const sweep = el.querySelector<HTMLElement>("[data-sweep]");

      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "expo.out" },
        onUpdate: () => {
          const time = tl.time();
          let index = 0;
          for (let i = 0; i < STARTS.length; i++) if (time >= (STARTS[i] ?? 0) - 0.001) index = i;
          if (index !== shown.current) {
            shown.current = index;
            setActive(index);
          }
        },
        onComplete: () => {
          setEnded(true);
          setPlaying(false);
        },
      });

      reelBeats.forEach((beat, i) => {
        const shot = shots[i];
        const fill = fills[i];
        const at = STARTS[i] ?? 0;
        if (!shot) return;

        tl.addLabel(`beat-${i}`, at);
        tl.set(shot, { autoAlpha: 1 }, at);
        tl.call(() => playCue("key"), undefined, at);
        // every cut lands with a small camera kick and a light sweep, never a full-frame flash
        if (cam) tl.fromTo(cam, { scale: 1.045 }, { scale: 1, duration: 0.55 }, at);
        if (sweep) {
          tl.fromTo(sweep, { xPercent: -100, autoAlpha: 1 }, { xPercent: 0, duration: 0.45, ease: "power3.out" }, at);
          tl.to(sweep, { autoAlpha: 0, duration: 0.18, ease: "none" }, at + 0.4);
        }

        const plate = shot.querySelector<HTMLElement>("[data-plate]");
        const zoom = shot.querySelector<HTMLElement>("[data-zoom]");
        const ring = shot.querySelector<HTMLElement>("[data-ring]");
        if (beat.kind === "evidence" && plate && zoom) {
          // start on the detail, snap back to the whole artefact, then keep drifting in
          tl.fromTo(plate, { clipPath: WIPE_FROM[beat.layout] }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.42, ease: "power4.out" }, at);
          tl.fromTo(zoom, { scale: beat.rest * 2.3 }, { scale: beat.rest, duration: 0.7 }, at);
          tl.to(zoom, { scale: beat.rest * 1.07, duration: beat.seconds - 0.7, ease: "none" }, at + 0.7);
          if (ring) tl.fromTo(ring, { autoAlpha: 0, scale: 2.4 / beat.rest }, { autoAlpha: 1, scale: 1 / beat.rest, duration: 0.5, ease: "back.out(2)" }, at + 0.34);
        }

        const words = shot.querySelectorAll("[data-word]");
        if (words.length) tl.fromTo(words, { yPercent: 118 }, { yPercent: 0, duration: 0.6, stagger: 0.045 }, at + 0.05);
        const thumbs = shot.querySelectorAll("[data-thumb]");
        if (thumbs.length) tl.fromTo(thumbs, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, at + 0.35);
        shot.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
          const value = Number(node.dataset.count);
          tl.fromTo(node, { textContent: 0 }, { textContent: value, duration: 0.55, ease: "power3.out", snap: { textContent: 1 } }, at + 0.05);
        });
        const meta = shot.querySelectorAll("[data-meta]");
        if (meta.length) tl.fromTo(meta, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06 }, at + 0.26);

        if (beat.kind === "languages") {
          // the six endonyms hard-cut through; the last one holds
          const names = shot.querySelectorAll<HTMLElement>("[data-lang]");
          const step = (beat.seconds - 0.75) / names.length;
          names.forEach((name, n) => {
            const on = at + 0.2 + n * step;
            tl.set(name, { autoAlpha: 1 }, on);
            tl.fromTo(name, { scale: 1.14 }, { scale: 1, duration: Math.min(0.3, step) }, on);
            if (n < names.length - 1) tl.set(name, { autoAlpha: 0 }, on + step);
          });
        }

        if (fill) tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: beat.seconds, ease: "none" }, at);
        if (i < reelBeats.length - 1) tl.set(shot, { autoAlpha: 0 }, at + beat.seconds);
      });

      timeline.current = tl;
      tl.seek(POSTER_AT, true);
    }, el);

    const tl = timeline.current;
    if (!tl) return () => ctx.revert();

    sync.current = () => {
      const want = f.ready && !document.hidden && !f.userPaused && tl.progress() < 1 && (f.inView || (f.userPlay && f.visible));
      if (want) {
        if (!f.started) {
          f.started = true;
          tl.seek(0, true);
        }
        tl.play();
      } else {
        tl.pause();
        // images still on their way: don't hold the reel hostage to a slow network
        if (f.inView && !f.ready && !forceReady) {
          forceReady = window.setTimeout(() => {
            f.ready = true;
            sync.current();
          }, 4000);
        }
      }
      setPlaying(want);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        f.visible = entry.isIntersecting;
        f.inView = entry.intersectionRatio >= 0.5;
        if (!f.visible) f.userPlay = false;
        sync.current();
      },
      { threshold: [0, 0.5] },
    );
    io.observe(stageEl);
    const onVisibility = () => sync.current();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(forceReady);
      sync.current = () => {};
      timeline.current = null;
      ctx.revert();
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
        node.textContent = node.dataset.count ?? "";
      });
      setPlaying(false);
      setEnded(false);
    };
  }, [reducedPref]);

  // the first play waits until every artefact is decoded, so no cut ever lands on an empty plate
  useEffect(() => {
    const stageEl = stage.current;
    if (!eager || !stageEl) return;
    let cancelled = false;
    const pending = Array.from(stageEl.querySelectorAll("img")).map((img) =>
      img.complete
        ? img.decode().catch(() => undefined)
        : new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          }),
    );
    void Promise.all(pending).then(() => {
      if (cancelled) return;
      flags.current.ready = true;
      sync.current();
    });
    return () => {
      cancelled = true;
    };
  }, [eager]);

  const toggle = useCallback(() => {
    const tl = timeline.current;
    if (!tl) return;
    const f = flags.current;
    if (tl.progress() >= 1) {
      setEnded(false);
      f.started = true;
      tl.seek(0, true);
      Object.assign(f, { userPaused: false, userPlay: true });
    } else if (tl.paused()) Object.assign(f, { userPaused: false, userPlay: true, ready: true });
    else Object.assign(f, { userPaused: true, userPlay: false });
    playCue("click");
    sync.current();
  }, []);

  const jump = useCallback((index: number) => {
    const target = Math.max(0, Math.min(reelBeats.length - 1, index));
    const tl = timeline.current;
    playCue("click");
    if (!tl) {
      setActive(target);
      return;
    }
    const start = STARTS[target] ?? 0;
    const running = !tl.paused();
    flags.current.started = true;
    setEnded(false);
    // while paused, land a little way into the beat so its figure and line are fully in
    tl.seek(running ? start : start + Math.min(1.2, (reelBeats[target]?.seconds ?? 2) * 0.7), true);
    shown.current = target;
    setActive(target);
  }, []);

  const hold = useCallback(() => {
    const tl = timeline.current;
    if (!tl || tl.paused()) return;
    Object.assign(flags.current, { userPaused: true, userPlay: false });
    sync.current();
  }, []);

  const total = reelBeats.length;
  const current = reelBeats[active] ?? reelBeats[0];
  const titleOf = (i: number): string => {
    const beat = reelBeats[i];
    if (!beat) return "";
    if (beat.kind === "hook") return t("hookA");
    if (beat.kind === "end") return t("endA");
    return `${figureText(beat.figure)} ${t(`claims.${beat.id}`)}`;
  };
  const toBuilds = (e: MouseEvent) => {
    e.preventDefault();
    playCue("click");
    scrollBus.to("#builds");
  };
  const control =
    "inline-flex shrink-0 items-center gap-2 border border-line px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-ink uppercase transition-colors hover:border-neon hover:text-neon";
  const link = "inline-flex w-fit max-w-full items-center gap-2 font-mono text-[11px] tracking-[0.14em] whitespace-nowrap text-ink uppercase transition-colors hover:text-neon";

  return (
    <section id="reel" aria-labelledby="reel-title" className="relative mx-auto max-w-7xl px-5 pt-4 sm:px-8 md:pt-8">
      <div data-reveal className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
        <h2 id="reel-title" className="eyebrow">
          {t("label")}
        </h2>
        {current?.kind === "evidence" ? (
          <Link href={`/projects/${current.slug}`} aria-label={t("openCase", { title: current.title })} onFocus={hold} className={link}>
            {current.title} <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <a href="#builds" onClick={toBuilds} onFocus={hold} className={link}>
            {t("cta")} <ArrowDownRight className="size-3.5" aria-hidden />
          </a>
        )}
      </div>

      <div data-reveal ref={root} data-reel-still={still ? "" : undefined}>
        {/* The moving picture is decorative: the same facts are in the list below it for assistive tech. */}
        <div ref={stage} aria-hidden onClick={toggle} className="@container relative aspect-[4/5] cursor-pointer overflow-hidden border border-line bg-abyss select-none md:aspect-[16/9]">
          <div className="blueprint absolute inset-0 opacity-50" />
          <div data-cam className="absolute inset-0 will-change-transform">
            {reelBeats.map((beat, i) => (
              <div key={beat.id} data-shot data-active={active === i} className="reel-shot absolute inset-0">
                {beat.kind === "hook" && (
                  <>
                    <Strip eager={eager} />
                    <div className={`${COPY_BASE} flex flex-col justify-end`}>
                      <p className="reel-claim">
                        <Slam text={t("hookA")} />
                        <Slam text={t("hookB")} className="text-neon" />
                      </p>
                    </div>
                  </>
                )}

                {beat.kind === "evidence" && (
                  <>
                    <Artefact beat={beat} eager={eager} />
                    {beat.readout && (
                      <pre data-meta className={`reel-readout absolute top-[4.4cqw] hidden md:block ${READOUT[beat.layout]}`}>
                        {beat.readout.join("\n")}
                      </pre>
                    )}
                    <div className={`${COPY_BASE} ${COPY[beat.layout]}`}>
                      <p data-meta className={KICKER}>
                        {beat.title}
                      </p>
                      <Figure figure={beat.figure} />
                      <p data-meta className="reel-line">
                        {t(`claims.${beat.id}`)}
                      </p>
                    </div>
                  </>
                )}

                {beat.kind === "languages" && (
                  <>
                    <div className={`absolute flex items-center justify-center md:justify-end md:pr-[4.4cqw] ${PLATE.right}`}>
                      <p className="reel-langs">
                        {locales.map((locale) => (
                          <span key={locale} data-lang lang={localeTags[locale]}>
                            {localeNames[locale]}
                          </span>
                        ))}
                      </p>
                    </div>
                    <div className={`${COPY_BASE} ${COPY.right}`}>
                      <p data-meta className={KICKER}>
                        {locales.join(" · ")}
                      </p>
                      <Figure figure={beat.figure} />
                      <p data-meta className="reel-line">
                        {t(`claims.${beat.id}`)}
                      </p>
                    </div>
                  </>
                )}

                {beat.kind === "end" && (
                  <>
                    <Strip eager={eager} />
                    <div className={`${COPY_BASE} flex flex-col justify-end`}>
                      <p className="reel-claim">
                        <Slam text={t("endA")} />
                        <Slam text={t("endB")} className="text-neon" />
                      </p>
                      <p data-meta className="mt-[3.2cqw] flex items-center gap-3 font-mono text-[clamp(0.62rem,1.15cqw,0.78rem)] tracking-[0.2em] text-ink uppercase">
                        <span className="grid size-[2.6em] place-items-center border border-neon/50 text-neon">AA</span>
                        {site.handle}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div data-sweep className="reel-sweep" />
          <div className="hud-corners pointer-events-none absolute inset-2 opacity-70 sm:inset-3" />
        </div>

        <div className="mt-1 flex items-center gap-3 sm:gap-4">
          {still ? (
            <>
              <button type="button" onClick={() => jump(active - 1)} disabled={active === 0} className={`${control} disabled:opacity-40`}>
                {tc("previous")}
              </button>
              <button type="button" onClick={() => jump(active + 1)} disabled={active === total - 1} className={`${control} disabled:opacity-40`}>
                {tc("next")}
              </button>
            </>
          ) : (
            <button type="button" onClick={toggle} className={control}>
              {ended ? <RotateCcw className="size-3.5" aria-hidden /> : playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              {ended ? t("replay") : playing ? t("pause") : t("play")}
            </button>
          )}
          <ol className="flex flex-1 items-center gap-1.5">
            {reelBeats.map((beat, i) => (
              <li key={beat.id} style={{ flexGrow: beat.seconds }} className="basis-0" data-state={i < active ? "done" : i === active ? "active" : "todo"}>
                <button type="button" onClick={() => jump(i)} aria-label={t("shot", { n: i + 1, total, title: titleOf(i) })} aria-current={active === i ? "step" : undefined} className="group block w-full py-4">
                  <span className="relative block h-0.5 overflow-hidden bg-white/12 transition-colors group-hover:bg-white/30">
                    <span data-fill className="reel-fill absolute inset-0 origin-left bg-neon" />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <ol className="sr-only">
          {reelBeats.map((beat, i) => (
            <li key={beat.id}>
              {titleOf(i)}
              {beat.kind === "hook" ? ` ${t("hookB")}` : beat.kind === "end" ? ` ${t("endB")}` : beat.kind === "evidence" ? ` (${beat.title})` : ""}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
