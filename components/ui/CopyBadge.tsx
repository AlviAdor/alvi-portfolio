"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { playCue } from "@/lib/audio";

interface CopyBadgeProps {
  label: string;
  value: string;
  icon: ReactNode;
  href?: string;
}

/** Contact chip: the main area opens the link, the side button copies the value. */
export default function CopyBadge({ label, value, icon, href }: CopyBadgeProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      playCue("success");
    } catch {
      playCue("error");
    }
  };

  return (
    <div className="glass group flex items-stretch transition-colors hover:border-neon/40">
      <a
        href={href ?? "#"}
        target={href && !href.startsWith("mailto:") ? "_blank" : undefined}
        rel="noopener noreferrer"
        onMouseEnter={() => playCue("hover")}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
      >
        <span className="text-neon">{icon}</span>
        <span className="min-w-0">
          <span className="block font-mono text-[10px] tracking-[0.18em] text-faint uppercase">{label}</span>
          <span className="block truncate font-mono text-xs text-ink">{value}</span>
        </span>
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className="flex w-11 shrink-0 items-center justify-center border-l border-line text-mute transition-colors hover:text-neon"
      >
        {copied ? <Check className="size-4 text-signal" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
