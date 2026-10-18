"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { playCue } from "@/lib/audio";
import { method, securityPillars } from "@/lib/site";

export default function Security() {
  const [active, setActive] = useState(0);
  const pillar = securityPillars[active] ?? securityPillars[0]!;

  return (
    <section id="security" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
      <SectionHeading
        index="07 / 09"
        eyebrow="Security by design"
        title={
          <>
            Security is part of the design, <span className="text-mute">from the first form field to the final stored record.</span>
          </>
        }
        lede="Cybersecurity is my major. Every claim below is implemented in the Secure Auth Demo, and this site's own headers can be audited live in the Labs."
      />

      {/* Plan → Build → Audit → Maintain */}
      <ol data-reveal className="mb-12 grid border-y border-line sm:grid-cols-2 lg:grid-cols-4">
        {method.map((m, i) => (
          <li key={m.step} className="border-line px-5 py-6 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:last:border-r-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
              {String(i + 1).padStart(2, "0")} · <span className="text-neon">{m.step}</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-mute">{m.body}</p>
          </li>
        ))}
      </ol>

      <div data-reveal className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div role="tablist" aria-label="Security pillars" aria-orientation="vertical" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {securityPillars.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              id={`tab-${p.id}`}
              aria-selected={i === active}
              aria-controls={`panel-${p.id}`}
              onClick={() => {
                setActive(i);
                playCue("click");
              }}
              onMouseEnter={() => playCue("hover")}
              className={`group relative shrink-0 border px-5 py-4 text-left transition-colors lg:w-full ${
                i === active ? "border-neon/50 bg-neon/[0.05]" : "border-line hover:border-white/20"
              }`}
            >
              <span className="block font-mono text-[10px] tracking-[0.2em] text-faint">{p.index}</span>
              <span className={`mt-1 block text-lg font-semibold tracking-tight ${i === active ? "text-neon" : "text-ink"}`}>{p.title}</span>
              {i === active && <motion.span layoutId="pillar-bar" className="absolute top-0 bottom-0 left-0 w-[2px] bg-neon" />}
            </button>
          ))}
        </div>

        <div className="glass-strong noise relative min-h-[460px] overflow-hidden p-7 sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pillar.id}
              id={`panel-${pillar.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${pillar.id}`}
              initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="eyebrow">Deep dive · {pillar.title}</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{pillar.tagline}</h3>
              <p className="mt-5 max-w-3xl text-sm leading-relaxed text-mute sm:text-base">{pillar.statement}</p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {pillar.controls.map((c) => (
                  <div key={c.title} className="border border-line bg-abyss/40 p-5">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-neon uppercase">{c.label}</p>
                    <p className="mt-2 font-semibold">{c.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-mute">{c.body}</p>
                  </div>
                ))}
              </div>

              <blockquote className="mt-8 border-l-2 border-ion pl-5 text-base text-ink/85 italic">{pillar.conviction}</blockquote>

              <Link href="/projects/secure-auth-demo" className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-neon uppercase hover:text-ink">
                See it running in the Secure Auth Demo <ArrowUpRight className="size-3.5" />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </section>
  );
}
