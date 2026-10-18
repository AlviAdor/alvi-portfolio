"use client";

import { BadgeCheck, ExternalLink, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/ui/SectionHeading";
import TiltCard from "@/components/ui/TiltCard";
import { earnedCredentials, goalCredentials, type Credential } from "@/lib/credentials";

function Card({ c, goal }: { c: Credential; goal: boolean }) {
  const t = useTranslations("certs");
  const tr = useTranslations("roadmap");
  const tc = useTranslations("common");
  return (
    <TiltCard max={goal ? 5 : 9} className="h-full">
      <article
        className={`relative h-full overflow-hidden border p-6 ${goal ? "border-dashed border-line" : "border-line"}`}
        style={{ background: goal ? "rgba(255,255,255,0.02)" : `linear-gradient(135deg, rgba(255,255,255,0.03), ${c.accent}14)` }}
      >
        {/* holographic foil sweep (earned only) */}
        {!goal && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100"
            style={{ background: `linear-gradient(115deg, transparent 20%, ${c.accent}22 45%, #ffffff18 50%, ${c.accent}22 55%, transparent 80%)` }}
          />
        )}
        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: goal ? "#8A94A8" : c.accent }}>
            {goal ? <Target className="size-3.5" /> : <BadgeCheck className="size-3.5" />}
            {goal ? tr("goal") : tr("verified")}
          </span>
          <span className="font-mono text-[10px] text-faint">{c.period}</span>
        </div>
        <h3 className="relative mt-5 text-lg font-semibold tracking-tight">{t(`items.${c.id}.title`)}</h3>
        <p className="relative mt-1 font-mono text-[11px] text-mute">{c.issuer}</p>
        <p className="relative mt-4 text-sm leading-relaxed text-mute">{t(`items.${c.id}.blurb`)}</p>
        {c.href && !goal && (
          <a href={c.href} target="_blank" rel="noopener noreferrer" className="relative mt-5 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase hover:text-neon" style={{ color: c.accent }}>
            <ExternalLink className="size-3.5" /> {tc("verify")}
          </a>
        )}
      </article>
    </TiltCard>
  );
}

export default function Certifications() {
  const t = useTranslations("certs");
  return (
    <section id="certifications" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
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

      <p data-reveal className="eyebrow mb-5">
        {t("earned")}
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {earnedCredentials.map((c) => (
          <div key={c.id} data-reveal>
            <Card c={c} goal={false} />
          </div>
        ))}
      </div>

      <div data-reveal className="mt-12 flex items-center gap-4">
        <p className="eyebrow !text-ion-soft">{t("goals")}</p>
        <span className="h-px flex-1 bg-line" />
      </div>
      <p data-reveal className="mt-4 max-w-2xl text-sm text-mute">
        {t("goalNote")}
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {goalCredentials.map((c) => (
          <div key={c.id} data-reveal>
            <Card c={c} goal />
          </div>
        ))}
      </div>
    </section>
  );
}
