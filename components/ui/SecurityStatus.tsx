"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { SecurityStatus as Status } from "@/lib/types";

/** Compact live posture readout for the hero, backed by GET /api/status. */
export default function SecurityStatus() {
  const t = useTranslations("status");
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = () =>
      fetch("/api/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((s: Status) => alive && setStatus(s))
        .catch(() => alive && setFailed(true));
    run();
    const id = window.setInterval(run, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const rows: [string, boolean | string][] = status
    ? [
        [t("csp"), status.csp === "nonce"],
        [t("rateLimit"), status.rateLimit === "upstash" ? t("upstash") : t("memory")],
        [t("turnstile"), status.turnstile],
        [t("tokens"), status.formTokens],
        [t("headers"), true],
        [t("relay"), status.relay],
      ]
    : [];

  return (
    <div className="glass noise w-full max-w-xs p-4 font-mono">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.18em] text-faint uppercase">{t("title")}</span>
        <span className="flex items-center gap-1.5 text-[10px] uppercase">
          <span className={`size-1.5 rounded-full ${status ? "animate-pulse-dot bg-signal" : failed ? "bg-flare" : "bg-faint"}`} />
          <span className={status ? "text-signal" : "text-mute"}>{status ? t("live") : t("checking")}</span>
        </span>
      </div>
      <ul className="space-y-1.5 text-[11px]">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between gap-3">
            <span className="text-mute">{k}</span>
            <span className={typeof v === "string" ? "text-neon" : v ? "text-signal" : "text-faint"}>
              {typeof v === "string" ? v : v ? t("on") : t("off")}
            </span>
          </li>
        ))}
        {!status && !failed && <li className="text-faint">…</li>}
      </ul>
      {status?.region && <p className="mt-3 border-t border-line pt-2 text-[10px] text-faint">{t("region")}: {status.region}</p>}
    </div>
  );
}
