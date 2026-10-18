"use client";

import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";
import { playCue } from "@/lib/audio";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    playCue("click");
    startTransition(() => router.replace(pathname, { locale: next }));
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors ${open ? "text-neon" : "text-mute hover:text-ink"} ${pending ? "opacity-60" : ""}`}
      >
        <Globe className="size-4" />
        {compact ? locale.toUpperCase() : localeNames[locale]}
      </button>
      {open && (
        <ul role="listbox" aria-label="Language" className="absolute right-0 z-50 mt-2 w-40 border border-line bg-panel py-1 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]">
          {routing.locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => choose(l)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left font-mono text-xs transition-colors hover:bg-white/[0.04] ${l === locale ? "text-neon" : "text-ink"}`}
              >
                {localeNames[l]}
                <span className="text-faint">{l.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
