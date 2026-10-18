"use client";

import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityDay } from "@/lib/types";
import { prefersReducedMotion } from "@/lib/device";

interface CommitMatrixProps {
  days: ActivityDay[];
  weeks: number;
  total: number;
  source: "commits" | "events" | "none";
}

const LEVELS = ["bg-white/[0.04]", "bg-neon/20", "bg-neon/40", "bg-neon/70", "bg-neon shadow-[0_0_10px_rgb(0_240_255/0.8)]"];
const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function level(count: number, max: number): number {
  if (count === 0) return 0;
  const r = count / Math.max(1, max);
  return r > 0.75 ? 4 : r > 0.45 ? 3 : r > 0.2 ? 2 : 1;
}

/** Contribution heat-matrix (weeks × weekdays) with a scroll-triggered cascade. */
export default function CommitMatrix({ days, weeks, total, source }: CommitMatrixProps) {
  const grid = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<ActivityDay | null>(null);
  const max = useMemo(() => days.reduce((m, d) => Math.max(m, d.count), 0), [days]);
  const activeDays = useMemo(() => days.filter((d) => d.count > 0).length, [days]);
  const streak = useMemo(() => {
    let best = 0;
    let run = 0;
    for (const d of days) {
      run = d.count > 0 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  }, [days]);

  useEffect(() => {
    const el = grid.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // explicit fromTo + clearProps: the end state is deterministic and the
      // cells hand their transform back to CSS once the cascade finishes
      gsap.fromTo(
        el.children,
        { scale: 0, autoAlpha: 0 },
        {
          scale: 1,
          autoAlpha: 1,
          duration: 0.5,
          ease: "back.out(2)",
          stagger: { each: 0.004, grid: [7, weeks], axis: "x", from: "start" },
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [weeks]);

  return (
    <div className="glass noise p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Commit activity · last {weeks} weeks</p>
          <p className="mt-2 font-mono text-xs text-mute" aria-live="polite">
            {focus ? (
              <>
                <span className="text-ink">{focus.count}</span> {source === "events" ? "pushes" : "commits"} · {fmt.format(new Date(`${focus.date}T00:00:00Z`))}
              </>
            ) : source === "none" ? (
              "GitHub rate-limited; the matrix refreshes within the hour."
            ) : (
              <>Hover a cell to inspect a day.</>
            )}
          </p>
        </div>
        <dl className="flex gap-6 font-mono text-xs">
          {[
            [source === "events" ? "pushes" : "commits", total],
            ["active days", activeDays],
            ["best streak", streak],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10px] tracking-[0.18em] text-faint uppercase">{k}</dt>
              <dd className="mt-1 text-lg text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="overflow-x-auto pb-1" data-lenis-prevent-horizontal>
        <div
          ref={grid}
          role="grid"
          aria-label={`${total} ${source === "events" ? "pushes" : "commits"} over ${weeks} weeks`}
          className="grid w-max grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
          onMouseLeave={() => setFocus(null)}
        >
          {days.map((d) => (
            <span
              key={d.date}
              role="gridcell"
              tabIndex={-1}
              aria-label={`${d.date}: ${d.count}`}
              onMouseEnter={() => setFocus(d)}
              className={`block size-[11px] rounded-[2px] hover:ring-1 hover:ring-neon hover:ring-offset-1 hover:ring-offset-obsidian sm:size-[13px] ${LEVELS[level(d.count, max)]}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1.5 font-mono text-[10px] text-faint">
        less
        {LEVELS.map((c) => (
          <span key={c} className={`size-[10px] rounded-[2px] ${c}`} />
        ))}
        more
      </div>
    </div>
  );
}
