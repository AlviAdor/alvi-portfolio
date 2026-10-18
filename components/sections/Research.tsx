"use client";

import { Check, Copy, Download, ExternalLink, FileText, Quote } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import TiltCard from "@/components/ui/TiltCard";
import { playCue } from "@/lib/audio";
import { site } from "@/lib/site";
import type { Paper, ResearchData } from "@/lib/types";

const STATUS: Record<Paper["status"], { label: string; cls: string }> = {
  published: { label: "Published", cls: "border-signal/40 text-signal" },
  preprint: { label: "Preprint", cls: "border-neon/40 text-neon" },
  "in-progress": { label: "In progress", cls: "border-ion/50 text-ion-soft" },
};

const isMe = (author: string) => /alvi\s+sarker/i.test(author.replace(/[.]/g, ""));

function PaperCard({ paper, index }: { paper: Paper; index: number }) {
  const [showBib, setShowBib] = useState(false);
  const [copied, setCopied] = useState(false);
  const status = STATUS[paper.status];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(paper.bibtex);
      setCopied(true);
      playCue("success");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setShowBib(true);
    }
  };

  return (
    <TiltCard max={4} className="h-full">
      <article className="glass noise flex h-full flex-col p-7 sm:p-9">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.18em] uppercase">
          <span className="text-faint">R-{String(index + 1).padStart(2, "0")}</span>
          <span className={`border px-2 py-1 ${status.cls}`}>{status.label}</span>
          <span className="text-mute">{paper.year ?? "n.d."}</span>
          {paper.citations !== null && <span className="text-mute">· {paper.citations} citations</span>}
        </div>

        <h3 className="mt-6 text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">{paper.title}</h3>
        <p className="mt-3 text-sm text-mute">
          {paper.authors.map((a, i) => (
            <span key={a}>
              <span className={isMe(a) ? "text-ink underline decoration-neon/60 underline-offset-4" : ""}>{a}</span>
              {i < paper.authors.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
        <p className="mt-1 font-mono text-xs text-faint">{paper.venue}</p>

        {paper.summary && <p className="mt-5 text-sm leading-relaxed text-ink/75">{paper.summary}</p>}

        {paper.tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {paper.tags.map((t) => (
              <li key={t} className="border border-line px-2 py-1 font-mono text-[10px] text-mute">
                {t}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-7 font-mono text-[11px] tracking-[0.12em] uppercase">
          {paper.pdfUrl && (
            <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-neon hover:text-ink">
              <FileText className="size-3.5" /> PDF
            </a>
          )}
          {paper.url && (
            <a href={paper.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-ink hover:text-neon">
              <ExternalLink className="size-3.5" /> {paper.url.includes("researchgate") ? "ResearchGate" : "Full record"}
            </a>
          )}
          {paper.doi && (
            <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="text-mute normal-case hover:text-neon">
              doi:{paper.doi}
            </a>
          )}
          <span className="ml-auto flex items-center gap-4">
            <button type="button" onClick={() => setShowBib((v) => !v)} aria-expanded={showBib} className="inline-flex items-center gap-2 text-mute hover:text-neon">
              <Quote className="size-3.5" /> BibTeX
            </button>
            <button type="button" onClick={copy} aria-label="Copy BibTeX" className="text-mute hover:text-neon">
              {copied ? <Check className="size-3.5 text-signal" /> : <Copy className="size-3.5" />}
            </button>
          </span>
        </div>

        <AnimatePresence initial={false}>
          {showBib && (
            <motion.pre
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              data-lenis-prevent
              className="mt-5 overflow-auto border border-line bg-abyss/60 p-4 font-mono text-[11px] leading-relaxed whitespace-pre text-ion-soft"
            >
              {paper.bibtex}
            </motion.pre>
          )}
        </AnimatePresence>
      </article>
    </TiltCard>
  );
}

export default function Research({ data }: { data: ResearchData }) {
  const synced = new Date(data.fetchedAt);
  const via = [data.sources.datacite && "DataCite (ResearchGate DOIs)", data.sources.openalex && "OpenAlex"].filter(Boolean).join(" + ");

  return (
    <section id="research" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
      <SectionHeading
        index="04 / 09"
        eyebrow="Research breakthroughs"
        title={
          <>
            Lightweight models, <span className="text-mute">honest evaluation.</span>
          </>
        }
        lede="Efficient facial-emotion recognition, medical imaging and network-security ML. Records sync automatically from the DOI registry that ResearchGate publishes to, with citation counts and open-access PDFs from OpenAlex."
        aside={
          <div className="flex flex-col items-start gap-3 font-mono text-[11px] md:items-end">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/research?format=bib" className="inline-flex items-center gap-2 border border-line px-4 py-2.5 tracking-[0.14em] text-ink uppercase transition-colors hover:border-neon hover:text-neon">
              <Download className="size-3.5" /> All citations (.bib)
            </a>
            <a href={site.researchgate} target="_blank" rel="noopener noreferrer" className="tracking-[0.14em] text-mute uppercase hover:text-neon">
              ResearchGate profile ↗
            </a>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {data.papers.map((p, i) => (
          <div key={p.id} data-reveal className={i === 0 ? "lg:col-span-2" : ""}>
            <PaperCard paper={p} index={i} />
          </div>
        ))}
      </div>

      <p className="mt-8 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
        <span className={`size-1.5 rounded-full ${data.error ? "bg-flare" : "bg-signal"}`} />
        {data.error ?? `Synced via ${via || "curated records"}`} ·{" "}
        <time dateTime={data.fetchedAt}>{synced.toISOString().slice(0, 16).replace("T", " ")} UTC</time>
      </p>
    </section>
  );
}
