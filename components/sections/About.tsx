"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import SectionHeading from "@/components/ui/SectionHeading";
import type { TerminalData } from "@/components/ui/Terminal";
import { projects } from "@/lib/projects";
import { fieldNotes, site, story } from "@/lib/site";

const CyberPortraitCanvas = dynamic(() => import("@/components/canvas/CyberPortraitCanvas"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full overflow-hidden bg-obsidian" style={{ aspectRatio: `${site.portrait.width} / ${site.portrait.height}` }}>
      <Image src={site.portrait.src} alt={site.portrait.alt} fill sizes="(min-width: 1024px) 420px, 90vw" className="object-cover" />
    </div>
  ),
});

export default function About({ data }: { data: TerminalData }) {
  const published = data.papers.filter((p) => p.status !== "in-progress").length;

  const stats: [string, string][] = [
    [String(published), published === 1 ? "paper on record" : "papers on record"],
    [String(site.researchInProgress), "research lines in progress"],
    [String(projects.length), "documented builds"],
  ];

  return (
    <section id="about" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
      <SectionHeading
        index="01 / 09"
        eyebrow="About & story"
        title={
          <>
            Two disciplines, <span className="text-mute">one obsession:</span> making intelligent systems that actually run.
          </>
        }
        lede={story.intro}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-20">
        <div data-reveal className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass p-2">
            <CyberPortraitCanvas className="w-full" />
          </div>
          <p className="mt-4 font-mono text-[11px] leading-relaxed text-faint">Hover or tap for a face scan. The background swap runs entirely in your browser.</p>
        </div>

        <div className="flex flex-col gap-12">
          <div className="grid gap-10 md:grid-cols-2">
            <article data-reveal>
              <p className="eyebrow">Security track</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">Systems built for hostile input</h3>
              <p className="mt-4 text-sm leading-relaxed text-mute">{story.engineering}</p>
            </article>
            <article data-reveal>
              <p className="eyebrow !text-ion-soft">AI track</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">Vision models under real constraints</h3>
              <p className="mt-4 text-sm leading-relaxed text-mute">{story.research}</p>
            </article>
          </div>

          <dl data-reveal className="grid grid-cols-3 border-y border-line">
            {stats.map(([v, k]) => (
              <div key={k} className="border-r border-line px-4 py-6 last:border-r-0">
                <dt className="sr-only">{k}</dt>
                <dd className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{v}</dd>
                <dd className="mt-2 font-mono text-[10px] tracking-[0.16em] text-faint uppercase">{k}</dd>
              </div>
            ))}
          </dl>

          {/* field notes, collapsed by default */}
          <div data-reveal>
            <p className="eyebrow">Field notes · what didn&apos;t work the first time</p>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {fieldNotes.map((n, i) => (
                <details key={n.title} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-baseline gap-4">
                      <span className="font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-medium tracking-tight transition-colors group-hover:text-neon">{n.title}</span>
                    </span>
                    <span aria-hidden className="font-mono text-neon transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-5 pl-9 text-sm leading-relaxed text-mute">{n.body}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
