"use client";

import { Plus, RotateCcw, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { playCue } from "@/lib/audio";
import { defaultRules, protocols, scorePolicy, type Action, type Direction, type FirewallRule } from "@/lib/labs";

let seq = 100;

export default function FirewallLab() {
  const t = useTranslations("labs.firewall");
  const [rules, setRules] = useState<FirewallRule[]>(defaultRules);
  const score = useMemo(() => scorePolicy(rules), [rules]);

  const update = (id: string, patch: Partial<FirewallRule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => {
    setRules((rs) => rs.filter((r) => r.id !== id));
    playCue("click");
  };
  // first-match semantics: a rule appended after a catch-all deny could never fire,
  // so new rules go just above a trailing "deny any any" if the policy ends with one
  const add = () => {
    setRules((rs) => {
      const fresh: FirewallRule = { id: `r${++seq}`, action: "allow", direction: "in", protocol: "TCP", port: 443 };
      const last = rs[rs.length - 1];
      const catchAll = last && last.action === "deny" && last.protocol === "any" && last.port === null;
      return catchAll ? [...rs.slice(0, -1), fresh, last] : [...rs, fresh];
    });
    playCue("click");
  };
  const reset = () => {
    setRules(defaultRules);
    playCue("click");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <p className="text-sm leading-relaxed text-mute">{t("intro")}</p>

        <div className="mt-6 overflow-hidden border border-line">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b border-line bg-white/[0.02] px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
            <span>{t("ruleColumns.action")}</span>
            <span>{t("ruleColumns.direction")}</span>
            <span>{t("ruleColumns.protocol")}</span>
            <span>{t("ruleColumns.port")}</span>
            <span />
          </div>
          {rules.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2 border-b border-line px-3 py-2 font-mono text-xs last:border-b-0">
              <select aria-label={`${t("ruleColumns.action")} ${i + 1}`} value={r.action} onChange={(e) => update(r.id, { action: e.target.value as Action })} className={`bg-transparent outline-none ${r.action === "allow" ? "text-signal" : "text-flare"}`}>
                <option value="allow" className="bg-panel text-signal">{t("allow")}</option>
                <option value="deny" className="bg-panel text-flare">{t("deny")}</option>
              </select>
              <select aria-label={`${t("ruleColumns.direction")} ${i + 1}`} value={r.direction} onChange={(e) => update(r.id, { direction: e.target.value as Direction | "any" })} className="bg-transparent text-ink outline-none">
                <option value="any" className="bg-panel">{t("any")}</option>
                <option value="in" className="bg-panel">{t("in")}</option>
                <option value="out" className="bg-panel">{t("out")}</option>
              </select>
              <select aria-label={`${t("ruleColumns.protocol")} ${i + 1}`} value={r.protocol} onChange={(e) => update(r.id, { protocol: e.target.value as FirewallRule["protocol"] })} className="bg-transparent text-ink outline-none">
                <option value="any" className="bg-panel">{t("any")}</option>
                {protocols.map((p) => (
                  <option key={p} value={p} className="bg-panel">{p}</option>
                ))}
              </select>
              <input
                aria-label={`${t("ruleColumns.port")} ${i + 1}`}
                value={r.port ?? ""}
                placeholder={t("any")}
                inputMode="numeric"
                onChange={(e) => {
                  const v = e.target.value.trim();
                  update(r.id, { port: v === "" ? null : Math.max(0, Math.min(65535, Number(v) || 0)) });
                }}
                className="w-full bg-transparent text-ink outline-none placeholder:text-faint"
              />
              <button type="button" onClick={() => remove(r.id)} aria-label="Remove rule" className="text-faint hover:text-flare">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={add} className="inline-flex items-center gap-2 border border-line px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-ink uppercase hover:border-neon hover:text-neon">
            <Plus className="size-3.5" /> {t("addRule")}
          </button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 border border-line px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-mute uppercase hover:text-ink">
            <RotateCcw className="size-3.5" /> {t("reset")}
          </button>
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">{t("trafficTitle")}</p>
        <ul className="mt-3 space-y-1.5">
          {score.verdicts.map((v) => (
            <li
              key={v.packet.id}
              className={`flex items-center justify-between gap-3 border px-3 py-2 font-mono text-xs ${
                v.action === "allow" ? (v.aligned ? "border-signal/30 bg-signal/[0.04]" : "border-flare/50 bg-flare/[0.06]") : "border-line bg-white/[0.01]"
              }`}
            >
              <span className="min-w-0">
                <span className="text-ink">{t(`packets.${v.packet.descKey}`)}</span>
                <span className="ml-2 text-faint">
                  {v.packet.protocol} :{v.packet.dstPort || "—"}
                </span>
              </span>
              <span className={`shrink-0 ${v.action === "allow" ? "text-signal" : "text-mute"}`}>
                {v.action === "allow" ? t("allowed") : t("denied")}
                <span className="ml-1 text-faint">· {v.ruleIndex === -1 ? t("byDefault") : `${t("byRule")} ${v.ruleIndex + 1}`}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className={`mt-4 flex items-start gap-3 border p-4 ${score.overExposed > 0 ? "border-flare/50" : "border-signal/40"}`}>
          {score.overExposed > 0 ? <ShieldAlert className="mt-0.5 size-4 shrink-0 text-flare" /> : <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" />}
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">{t("scoreTitle")}</p>
            <p className="mt-1 text-sm text-ink">
              <span className="text-lg font-semibold">{score.correct}</span> {t("aligned", { total: score.total })}
            </p>
            {score.overExposed > 0 ? (
              <p className="mt-1 text-xs text-flare">
                {score.overExposed} {t("exposed")} — {t("exposedHint")}
              </p>
            ) : (
              <p className="mt-1 text-xs text-signal">{t("clean")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
