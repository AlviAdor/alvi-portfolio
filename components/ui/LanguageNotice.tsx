"use client";

import { Info, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** Honest disclosure: non-English locales translate the UI chrome; long-form narrative stays English. */
export default function LanguageNotice() {
  const locale = useLocale();
  const t = useTranslations("language");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (locale === "en") return;
    try {
      if (sessionStorage.getItem(`aa:langnotice:${locale}`) === "1") return;
    } catch {
      /* ignore */
    }
    setShow(true);
  }, [locale]);

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <div className="glass-strong flex max-w-2xl items-start gap-3 px-4 py-3 font-mono text-[11px] leading-relaxed text-mute">
        <Info className="mt-0.5 size-4 shrink-0 text-neon" aria-hidden />
        <p className="flex-1">{t("notice")}</p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            setShow(false);
            try {
              sessionStorage.setItem(`aa:langnotice:${locale}`, "1");
            } catch {
              /* ignore */
            }
          }}
          className="shrink-0 text-faint hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
