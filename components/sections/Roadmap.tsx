"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, ExternalLink, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { playCue } from "@/lib/audio";
import { eduKindColor, eduLaneColor, eduLaneOrder, eduNodes, tagLabel, type EduNode } from "@/lib/education";
import { truncate } from "@/lib/text";

/*
 * Academic & merit roadmap as an interactive, translatable flowchart.
 * A Mermaid-style node graph is inherently a 2D timeline, so it's drawn as
 * crisp inline SVG (sharp at any zoom, fully keyboard-accessible, localisable)
 * rather than a second WebGL canvas — the 3D force graph lives in Skills.
 * Node position = (col → x, lane → y); edges are curved connectors.
 */

const VB = { w: 1120, h: 520 };
const COLS = 9;
const colX = (col: number) => 60 + (col / (COLS - 1)) * (VB.w - 120);
const laneY = (lane: string) => 70 + eduLaneOrder.indexOf(lane as never) * ((VB.h - 140) / (eduLaneOrder.length - 1));
const radius = (n: EduNode) => (n.kind === "education" ? 13 : n.kind === "credential" ? 12 : 10);

interface Placed extends EduNode {
  x: number;
  y: number;
}

export default function Roadmap() {
  const t = useTranslations("roadmap");
  const [active, setActive] = useState<string | null>(null);
  const titleId = useId();

  const placed = useMemo<Placed[]>(() => eduNodes.map((n) => ({ ...n, x: colX(n.col), y: laneY(n.lane) })), []);
  const byId = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);
  const edges = useMemo(
    () => placed.flatMap((n) => n.to.map((to) => ({ from: n, to: byId.get(to) })).filter((e): e is { from: Placed; to: Placed } => Boolean(e.to))),
    [placed, byId],
  );

  const current = active ? byId.get(active) : null;
  const neighbours = useMemo(() => {
    if (!active) return new Set<string>();
    const s = new Set<string>();
    for (const e of edges) {
      if (e.from.id === active) s.add(e.to.id);
      if (e.to.id === active) s.add(e.from.id);
    }
    return s;
  }, [active, edges]);

  const lit = (id: string) => !active || id === active || neighbours.has(id);

  return (
    <section id="roadmap" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
      <SectionHeading
        index={t("index")}
        eyebrow={t("eyebrow")}
        title={
          <>
            {t("title")} <span className="text-mute">{t("titleMuted")}</span>
          </>
        }
        lede={t("lede")}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div data-reveal className="glass noise relative overflow-hidden">
          {/* lane labels */}
          <div className="pointer-events-none absolute inset-0 hidden sm:block">
            {eduLaneOrder.map((lane) => (
              <span
                key={lane}
                className="absolute left-3 font-mono text-[10px] tracking-[0.18em] uppercase"
                style={{ top: `${(laneY(lane) / VB.h) * 100}%`, color: eduLaneColor[lane], transform: "translateY(-50%)" }}
              >
                {t(`lanes.${lane}`)}
              </span>
            ))}
          </div>

          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} role="group" aria-labelledby={titleId} className="w-full" style={{ minHeight: 320 }} onPointerLeave={() => setActive(null)}>
            <title id={titleId}>{t("eyebrow")}</title>
            <defs>
              <filter id="rm-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {edges.map((e, i) => {
              const midX = (e.from.x + e.to.x) / 2;
              const activeEdge = active !== null && (e.from.id === active || e.to.id === active);
              return (
                <path
                  key={i}
                  d={`M ${e.from.x} ${e.from.y} C ${midX} ${e.from.y}, ${midX} ${e.to.y}, ${e.to.x} ${e.to.y}`}
                  fill="none"
                  stroke={activeEdge ? eduLaneColor[e.to.lane] : "#2a3346"}
                  strokeWidth={activeEdge ? 2 : 1}
                  strokeDasharray={e.to.earned ? "0" : "4 4"}
                  opacity={active === null ? 0.5 : activeEdge ? 1 : 0.12}
                  className="transition-all duration-300"
                />
              );
            })}

            {placed.map((n) => {
              const on = lit(n.id);
              const color = eduKindColor[n.kind];
              return (
                <g
                  key={n.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`${t(`nodes.${n.id}.title`)} — ${tagLabel(n.tag, t)}`}
                  onPointerEnter={() => {
                    if (active !== n.id) {
                      setActive(n.id);
                      playCue("hover");
                    }
                  }}
                  onFocus={() => setActive(n.id)}
                  onBlur={() => setActive(null)}
                  onClick={() => n.href && window.open(n.href, "_blank", "noopener,noreferrer")}
                  className="cursor-pointer outline-none"
                  style={{ opacity: on ? 1 : 0.25, transition: "opacity 0.3s" }}
                >
                  <circle cx={n.x} cy={n.y} r={radius(n) + (n.id === active ? 5 : 0)} fill={color} opacity={n.earned ? 0.18 : 0.08} className="transition-all" />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={radius(n)}
                    fill={n.earned ? color : "#0B0F17"}
                    stroke={color}
                    strokeWidth={n.earned ? 0 : 1.5}
                    strokeDasharray={n.earned ? "0" : "3 2"}
                    filter={n.id === active ? "url(#rm-glow)" : undefined}
                  />
                  {!n.earned && <Target x={n.x - 5} y={n.y - 5} width={10} height={10} color="#0B0F17" />}
                  <text
                    x={n.x}
                    y={n.y + radius(n) + (n.col % 2 === 0 ? 15 : 27)}
                    textAnchor="middle"
                    className="fill-ink font-mono"
                    style={{ fontSize: 9.5, pointerEvents: "none", opacity: on ? 0.95 : 0.4 }}
                  >
                    {truncate(t(`nodes.${n.id}.title`), 15)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* legend */}
          <div className="flex flex-wrap gap-4 border-t border-line px-4 py-3 font-mono text-[10px] tracking-[0.16em] text-mute uppercase">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-signal" /> {t("legendEarned")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full border border-ion" /> {t("legendGoal")}
            </span>
          </div>
        </div>

        <aside aria-live="polite" className="glass flex flex-col p-6">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: eduLaneColor[current.lane] }}>
                  {current.earned ? <BadgeCheck className="size-3.5" /> : <Target className="size-3.5" />}
                  {current.earned ? t("verified") : t("goal")}
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{t(`nodes.${current.id}.title`)}</h3>
                <p className="mt-1 font-mono text-[11px] text-faint">{tagLabel(current.tag, t)}</p>
                <p className="mt-4 text-sm leading-relaxed text-mute">{t(`nodes.${current.id}.detail`)}</p>
                {current.to.length > 0 && (
                  <>
                    <p className="mt-5 font-mono text-[10px] tracking-[0.2em] text-faint uppercase">{t("leadsTo")}</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {current.to.map((id) => (
                        <li key={id} className="border border-line px-2 py-1 font-mono text-[11px] text-ink/80">
                          {t(`nodes.${id}.title`)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {current.href && (
                  <a href={current.href} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-neon uppercase hover:text-ink">
                    <ExternalLink className="size-3.5" /> {t("verified")}
                  </a>
                )}
              </motion.div>
            ) : (
              <motion.p key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm leading-relaxed text-mute">
                {t("inspectorPrompt")}
              </motion.p>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </section>
  );
}
