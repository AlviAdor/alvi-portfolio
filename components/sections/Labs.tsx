"use client";

import { Cpu, ShieldHalf, Terminal } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { playCue } from "@/lib/audio";

const FirewallLab = dynamic(() => import("@/components/labs/FirewallLab"), { ssr: false, loading: () => <LabSkeleton /> });
const FerLab = dynamic(() => import("@/components/labs/FerLab"), { ssr: false, loading: () => <LabSkeleton /> });
const HeadersLab = dynamic(() => import("@/components/labs/HeadersLab"), { ssr: false, loading: () => <LabSkeleton /> });

function LabSkeleton() {
  return <div className="h-64 animate-pulse rounded bg-white/[0.02]" />;
}

type Tab = "firewall" | "fer" | "headers";
const TABS: { id: Tab; icon: ReactNode }[] = [
  { id: "firewall", icon: <ShieldHalf className="size-4" /> },
  { id: "fer", icon: <Cpu className="size-4" /> },
  { id: "headers", icon: <Terminal className="size-4" /> },
];

export default function Labs() {
  const t = useTranslations("labs");
  const [tab, setTab] = useState<Tab>("firewall");

  return (
    <section id="labs" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
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

      <div data-reveal className="glass-strong noise overflow-hidden">
        <div role="tablist" aria-label={t("eyebrow")} className="flex flex-wrap gap-1 border-b border-line p-2">
          {TABS.map(({ id, icon }) => (
            <button
              key={id}
              role="tab"
              id={`labtab-${id}`}
              aria-selected={tab === id}
              aria-controls={`labpanel-${id}`}
              onClick={() => {
                setTab(id);
                playCue("click");
              }}
              onMouseEnter={() => playCue("hover")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors ${
                tab === id ? "bg-neon/10 text-neon" : "text-mute hover:text-ink"
              }`}
            >
              {icon}
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>

        <div id={`labpanel-${tab}`} role="tabpanel" aria-labelledby={`labtab-${tab}`} className="p-6 sm:p-9">
          <h3 className="mb-6 text-2xl font-semibold tracking-tight">{t(`${tab}.title`)}</h3>
          {tab === "firewall" && <FirewallLab />}
          {tab === "fer" && <FerLab />}
          {tab === "headers" && <HeadersLab />}
        </div>
      </div>
    </section>
  );
}
