"use client";

import { Check, Play, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { playCue } from "@/lib/audio";
import type { SecurityStatus } from "@/lib/types";

/** Security headers this page is expected to send (checked live via a self-fetch). */
const EXPECTED = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
] as const;

interface AuditResult {
  headers: { name: string; present: boolean; value: string }[];
  status: SecurityStatus | null;
  grade: string;
}

function grade(pass: number, total: number): string {
  const r = pass / total;
  return r === 1 ? "A+" : r >= 0.85 ? "A" : r >= 0.7 ? "B" : r >= 0.5 ? "C" : "D";
}

export default function HeadersLab() {
  const t = useTranslations("labs.headers");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    playCue("open");
    try {
      // self-fetch: the response carries the very headers this page was served with
      const res = await fetch(window.location.href, { method: "GET", headers: { "x-aa-audit": "1" } });
      const headers = EXPECTED.map((name) => {
        const value = res.headers.get(name) ?? "";
        return { name, present: value !== "", value };
      });
      let status: SecurityStatus | null = null;
      try {
        status = (await (await fetch("/api/status")).json()) as SecurityStatus;
      } catch {
        status = null;
      }
      const pass = headers.filter((h) => h.present).length;
      setResult({ headers, status, grade: grade(pass, headers.length) });
      playCue("success");
    } catch {
      playCue("error");
    } finally {
      setRunning(false);
    }
  };

  const postureRows: [string, boolean | string][] = result?.status
    ? [
        ["CSP nonce", result.status.csp === "nonce"],
        ["Rate limit", result.status.rateLimit],
        ["Bot check", result.status.turnstile],
        ["Form tokens", result.status.formTokens],
        ["Mail relay", result.status.relay],
        ["E2E channel", result.status.e2e],
      ]
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <p className="text-sm leading-relaxed text-mute">{t("intro")}</p>
        <button type="button" onClick={run} disabled={running} className="mt-6 inline-flex items-center gap-2 bg-neon px-5 py-3 font-mono text-xs tracking-[0.14em] text-obsidian uppercase hover:shadow-[0_0_40px_-6px_rgb(0_240_255/0.7)] disabled:opacity-60">
          <Play className="size-4" /> {running ? t("running") : t("run")}
        </button>

        {result && (
          <div className="mt-6 flex items-center gap-3 border border-line p-4">
            <ShieldCheck className="size-6 text-neon" />
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">{t("grade")}</p>
              <p className="text-3xl font-semibold tracking-tight text-neon">{result.grade}</p>
            </div>
          </div>
        )}
      </div>

      <div>
        {result ? (
          <>
            <ul className="divide-y divide-line border-y border-line font-mono text-[11px]">
              {result.headers.map((h) => (
                <li key={h.name} className="flex items-center justify-between gap-3 py-2.5">
                  <span className={h.present ? "text-ink" : "text-mute"}>{h.name}</span>
                  <span className={`flex items-center gap-1.5 ${h.present ? "text-signal" : "text-flare"}`}>
                    {h.present ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                    {h.present ? t("present") : t("missing")}
                  </span>
                </li>
              ))}
            </ul>
            {postureRows.length > 0 && (
              <>
                <p className="mt-5 font-mono text-[10px] tracking-[0.2em] text-faint uppercase">{t("postureTitle")}</p>
                <ul className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  {postureRows.map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between border border-line px-2 py-1.5">
                      <span className="text-mute">{k}</span>
                      <span className={v ? "text-signal" : "text-faint"}>{typeof v === "string" ? v : v ? "✓" : "—"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">{t("note")}</p>
              </>
            )}
          </>
        ) : (
          <div className="grid h-full min-h-40 place-items-center border border-dashed border-line font-mono text-[11px] text-faint">{t("run")} →</div>
        )}
      </div>
    </div>
  );
}
