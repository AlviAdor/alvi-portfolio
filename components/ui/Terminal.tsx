"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SquareTerminal, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";
import { playCue } from "@/lib/audio";
import { scrollBus } from "@/lib/scroll";
import { credentials } from "@/lib/credentials";
import { eduNodes, tagLabel } from "@/lib/education";
import { projects } from "@/lib/projects";
import { securityPillars, site, skillGroups, skills, story, type SkillGroup } from "@/lib/site";
import { useSceneStore } from "@/lib/store";
import type { Paper, RepoSummary } from "@/lib/types";

export interface TerminalData {
  papers: Paper[];
  repos: RepoSummary[];
}

type Line = { id: number; kind: "in" | "out" | "err" | "sys"; body: ReactNode };

const COMMANDS: Record<string, string> = {
  help: "list available commands",
  about: "who I am, research + engineering",
  skills: "skill matrix grouped by discipline",
  papers: "publications & work in progress",
  "bib <n>": "print BibTeX for paper n",
  projects: "case studies + live GitHub repos",
  security: "how security is built in, four pillars",
  contact: "ways to reach me",
  "open <target>": "github | linkedin | researchgate | email | demo",
  hire: "jump to the contact form",
  sound: "toggle interface sound (on|off)",
  whoami: "identify the current session",
  clear: "clear the screen",
  exit: "close the terminal",
};
const NAMES = ["help", "about", "roadmap", "certs", "skills", "papers", "bib", "projects", "security-audit", "labs", "contact", "open", "langs", "hire", "sound", "whoami", "clear", "exit"];

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer" className="text-neon underline decoration-neon/30 underline-offset-4 hover:decoration-neon">
    {children}
  </a>
);

interface RunnerI18n {
  t: (key: string, values?: Record<string, string>) => string;
  tRoad: (key: string) => string;
  tCert: (key: string) => string;
  locale: Locale;
  switchLocale: (l: Locale) => void;
}

function useRunner(data: TerminalData, i18n: RunnerI18n, onExit?: () => void) {
  const idRef = useRef(0);
  const mk = (kind: Line["kind"], body: ReactNode): Line => ({ id: idRef.current++, kind, body });
  const boot = useMemo<ReactNode[]>(
    () => [
      <span key="b1" className="text-mute">{i18n.t("boot", { location: site.location })}</span>,
      <span key="b2">{i18n.t("hint")}</span>,
    ],
    [i18n],
  );
  const [lines, setLines] = useState<Line[]>(() => boot.map((b) => mk("sys", b)));

  const run = useCallback(
    (raw: string) => {
      const input = raw.trim();
      const [cmd = "", ...args] = input.split(/\s+/);
      const out: Line[] = [mk("in", input)];
      const say = (body: ReactNode, kind: Line["kind"] = "out") => out.push(mk(kind, body));

      switch (cmd.toLowerCase()) {
        case "":
          break;
        case "help": {
          const rows: [string, string][] = [
            ["help", i18n.t("cmd.help")],
            ["about", i18n.t("cmd.about")],
            ["roadmap", i18n.t("cmd.roadmap")],
            ["certs", i18n.t("cmd.certs")],
            ["skills", COMMANDS.skills!],
            ["papers", COMMANDS.papers!],
            ["bib <n>", COMMANDS["bib <n>"]!],
            ["projects", i18n.t("cmd.projects")],
            ["security-audit", i18n.t("cmd.security-audit")],
            ["labs", i18n.t("cmd.labs")],
            ["contact", i18n.t("cmd.contact")],
            ["open <target>", COMMANDS["open <target>"]!],
            ["langs", i18n.t("cmd.langs")],
            ["hire", i18n.t("cmd.hire")],
            ["sound", i18n.t("cmd.sound")],
            ["clear", i18n.t("cmd.clear")],
            ["exit", i18n.t("cmd.exit")],
          ];
          for (const [c, d] of rows)
            say(
              <span>
                <span className="inline-block w-40 text-neon">{c}</span>
                <span className="text-mute">{d}</span>
              </span>,
            );
          break;
        }
        case "about":
          say(<span className="text-ink">{site.name} ({site.handle}): {site.roles.join(" · ")}</span>);
          say(<span className="text-mute">{site.education}</span>);
          say(<span>&gt; {story.intro}</span>);
          say(<span>&gt; research: {story.research}</span>);
          say(<span>&gt; engineering: {story.engineering}</span>);
          break;
        case "skills":
          for (const g of Object.keys(skillGroups) as SkillGroup[])
            say(
              <span>
                <span className="inline-block w-36" style={{ color: skillGroups[g].color }}>
                  {skillGroups[g].label}
                </span>
                {skills
                  .filter((s) => s.group === g)
                  .map((s) => `${s.id}${"▪".repeat(s.weight)}`)
                  .join("  ")}
              </span>,
            );
          break;
        case "roadmap":
          eduNodes.forEach((n) =>
            say(
              <span>
                <span className="inline-block w-56" style={{ color: n.earned ? "#4ADE80" : "#6366F1" }}>
                  {i18n.tRoad(`nodes.${n.id}.title`)}
                </span>
                <span className="text-mute">{tagLabel(n.tag, i18n.tRoad)}</span>
              </span>,
            ),
          );
          say(<span className="text-mute">→ open #roadmap for the interactive graph</span>, "sys");
          break;
        case "certs":
          credentials.forEach((c) =>
            say(
              <span>
                <span className="inline-block w-56" style={{ color: c.status === "earned" ? "#4ADE80" : "#8A94A8" }}>
                  {i18n.tCert(`items.${c.id}.title`)}
                </span>
                <span className="text-mute">{c.issuer} · {c.status === "earned" ? i18n.tRoad("verified") : i18n.tRoad("goal")}</span>
              </span>,
            ),
          );
          break;
        case "security-audit": {
          say("fetching /api/status …", "sys");
          void fetch("/api/status", { cache: "no-store" })
            .then((r) => r.json())
            .then((st: { csp: string; rateLimit: string; turnstile: boolean; formTokens: boolean; relay: boolean; e2e: boolean; region: string | null }) => {
              const rows: [string, string][] = [
                ["CSP", st.csp === "nonce" ? "nonce + strict-dynamic" : st.csp],
                ["rate-limit", st.rateLimit],
                ["bot-check", st.turnstile ? "turnstile" : "off"],
                ["form-tokens", st.formTokens ? "HMAC single-use" : "off"],
                ["mail-relay", st.relay ? "ready" : "unconfigured"],
                ["e2e-channel", st.e2e ? "available" : "off"],
                ["edge-region", st.region ?? "local"],
              ];
              setLines((l) => [
                ...l,
                ...rows.map((r) => mk("out", (
                  <span>
                    <span className="inline-block w-36 text-neon">{r[0]}</span>
                    <span className="text-signal">{r[1]}</span>
                  </span>
                ))),
                mk("sys", "run the Headers lab for the full header audit."),
              ]);
            })
            .catch(() => setLines((l) => [...l, mk("err", "status endpoint unreachable.")]));
          break;
        }
        case "labs":
          say("opening hands-on labs…", "sys");
          onExit?.();
          window.setTimeout(() => scrollBus.to("#labs"), 250);
          break;
        case "langs": {
          const code = (args[0] ?? "").toLowerCase();
          if (!code) {
            routing.locales.forEach((l) =>
              say(
                <span>
                  <span className="inline-block w-20 text-neon">{l}</span>
                  <span className={l === i18n.locale ? "text-ink" : "text-mute"}>{localeNames[l]}{l === i18n.locale ? " ·" : ""}</span>
                </span>,
              ),
            );
            say(<span className="text-mute">usage: langs &lt;{routing.locales.join("|")}&gt;</span>);
          } else if ((routing.locales as readonly string[]).includes(code)) {
            say(`switching to ${localeNames[code as Locale]}…`, "sys");
            onExit?.();
            i18n.switchLocale(code as Locale);
          } else {
            say(`unknown locale: ${code}`, "err");
          }
          break;
        }
        case "papers":
          if (data.papers.length === 0) say("No records synced yet.", "err");
          data.papers.forEach((p, i) =>
            say(
              <span>
                <span className="text-neon">[{i + 1}]</span> {p.title}{" "}
                <span className="text-mute">
                  ({p.year ?? "n.d."} · {p.status.replace("-", " ")}
                  {p.citations !== null ? ` · ${p.citations} cites` : ""})
                </span>
                {p.doi && (
                  <>
                    {" "}
                    <A href={`https://doi.org/${p.doi}`}>doi:{p.doi}</A>
                  </>
                )}
              </span>,
            ),
          );
          if (data.papers.length) say(<span className="text-mute">bib &lt;n&gt; prints a citation.</span>);
          break;
        case "bib": {
          const n = Number(args[0]);
          const paper = Number.isInteger(n) ? data.papers[n - 1] : undefined;
          if (!paper) say(`usage: bib <1-${data.papers.length}>`, "err");
          else {
            say(<pre className="whitespace-pre-wrap text-ion-soft">{paper.bibtex}</pre>);
            void navigator.clipboard?.writeText(paper.bibtex).then(
              () => setLines((l) => [...l, mk("sys", "✓ copied to clipboard")]),
              () => undefined,
            );
          }
          break;
        }
        case "projects":
          say(<span className="text-mute">case studies</span>);
          projects.forEach((p) =>
            say(
              <span>
                <a href={`/projects/${p.slug}`} className="text-neon underline decoration-neon/30 underline-offset-4 hover:decoration-neon">
                  {p.title}
                </a>{" "}
                <span className="text-mute">[{p.stack.slice(0, 3).join(", ")}]</span> {p.summary}
              </span>,
            ),
          );
          say(<span className="text-mute">live on github · {data.repos.length} repos</span>);
          say(<A href={site.github.url}>→ github.com/{site.github.user}</A>);
          break;
        case "security":
          securityPillars.forEach((p) =>
            say(
              <span>
                <span className="inline-block w-36 text-neon">{p.title}</span>
                {p.tagline} <span className="text-mute">{p.controls.map((c) => c.title).join(" · ")}</span>
              </span>,
            ),
          );
          say(<span className="text-mute">proof: open /projects/secure-auth-demo</span>);
          break;
        case "contact":
          say(<span>email     <A href={`mailto:${site.email}`}>{site.email}</A></span>);
          say(<span>linkedin  <A href={site.linkedin}>{site.linkedin.replace("https://www.", "")}</A></span>);
          say(<span>github    <A href={site.github.url}>{site.github.url.replace("https://", "")}</A></span>);
          say(<span className="text-mute">type `hire` to open the contact form.</span>);
          break;
        case "open": {
          const targets: Record<string, string> = {
            github: site.github.url,
            linkedin: site.linkedin,
            researchgate: site.researchgate,
            email: `mailto:${site.email}`,
            ...(site.secureMessagingBase ? { demo: `${site.secureMessagingBase}login.php` } : {}),
          };
          const url = targets[(args[0] ?? "").toLowerCase()];
          if (!url) say(`usage: open <${Object.keys(targets).join("|")}>`, "err");
          else {
            window.open(url, url.startsWith("mailto:") ? "_self" : "_blank", "noopener,noreferrer");
            say(`opening ${args[0]}…`, "sys");
          }
          break;
        }
        case "hire":
          say("routing to secure contact channel…", "sys");
          onExit?.();
          window.setTimeout(() => scrollBus.to("#contact"), 250);
          break;
        case "sound": {
          const want = args[0] === "on" ? true : args[0] === "off" ? false : !useSceneStore.getState().soundEnabled;
          useSceneStore.getState().setSoundEnabled(want);
          if (want) playCue("success", true);
          say(`interface audio ${want ? "enabled" : "muted"}`, "sys");
          break;
        }
        case "whoami":
          say(`guest@${new URL(site.url).host}: visitor session, read-only. Recruiter mode unlocks with \`hire\`.`);
          break;
        case "sudo":
          say("nice try. permission denied: this incident will be reported to /dev/null", "err");
          break;
        case "clear":
          setLines([]);
          return;
        case "exit":
          onExit?.();
          break;
        default:
          say(`command not found: ${cmd}. Try \`help\`.`, "err");
          playCue("error");
      }
      setLines((l) => [...l, ...out]);
    },
    [data, i18n, onExit],
  );

  return { lines, run };
}

interface ShellProps {
  data: TerminalData;
  onExit?: () => void;
  autoFocus?: boolean;
  className?: string;
}

/** The terminal surface: output log + prompt. Used inline and inside the modal. */
export function TerminalShell({ data, onExit, autoFocus, className = "" }: ShellProps) {
  const t = useTranslations("terminal");
  const tRoad = useTranslations("roadmap");
  const tCert = useTranslations("certs");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const i18n = useMemo<RunnerI18n>(
    () => ({
      t: (key, values) => t(key, values),
      tRoad: (key) => tRoad(key),
      tCert: (key) => tCert(key),
      locale,
      switchLocale: (l) => router.replace(pathname, { locale: l }),
    }),
    [t, tRoad, tCert, locale, router, pathname],
  );
  const { lines, run } = useRunner(data, i18n, onExit);
  const [value, setValue] = useState("");
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (value.trim()) history.current.unshift(value);
      cursor.current = -1;
      run(value);
      setValue("");
      playCue("click");
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      cursor.current = Math.max(-1, Math.min(h.length - 1, cursor.current + (e.key === "ArrowUp" ? 1 : -1)));
      setValue(cursor.current === -1 ? "" : (h[cursor.current] ?? ""));
    } else if (e.key === "Tab") {
      e.preventDefault();
      const match = NAMES.filter((n) => n.startsWith(value.trim().toLowerCase()));
      if (match.length === 1 && match[0]) setValue(`${match[0]} `);
      else if (match.length > 1) run(`help`);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      run("clear");
    } else if (e.key.length === 1) {
      playCue("key");
    }
  };

  return (
    <div className={`flex min-h-0 flex-col font-mono text-[12.5px] leading-relaxed ${className}`} onClick={() => inputRef.current?.focus({ preventScroll: true })}>
      <div ref={logRef} data-lenis-prevent className="min-h-0 flex-1 space-y-1 overflow-y-auto p-5" role="log" aria-live="polite">
        {lines.map((l) => (
          <div key={l.id} className={l.kind === "err" ? "text-flare" : l.kind === "sys" ? "text-signal" : l.kind === "in" ? "text-ink" : "text-ink/80"}>
            {l.kind === "in" ? (
              <span>
                <span className="text-neon">guest@ador</span>
                <span className="text-faint">:~$</span> {l.body}
              </span>
            ) : (
              l.body
            )}
          </div>
        ))}
      </div>
      <label htmlFor={inputId} className="hairline-t flex items-center gap-2 px-5 py-3">
        <span className="text-neon">guest@ador</span>
        <span className="text-faint">:~$</span>
        <input
          ref={inputRef}
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label="Terminal command"
          className="min-w-0 flex-1 bg-transparent text-ink caret-neon outline-none"
        />
      </label>
    </div>
  );
}

/** Floating modal terminal. Opens from the nav, the About section, or the ` key. */
export default function TerminalModal({ data }: { data: TerminalData }) {
  const open = useSceneStore((s) => s.terminalOpen);
  const setOpen = useSceneStore((s) => s.setTerminalOpen);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const memoData = useMemo(() => data, [data]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (e.key === "`" && !typing) {
        e.preventDefault();
        setOpen(!useSceneStore.getState().terminalOpen);
      } else if (e.key === "Escape" && useSceneStore.getState().terminalOpen) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      scrollBus.stop();
      playCue("open");
    } else {
      scrollBus.start();
      restoreFocus.current?.focus?.({ preventScroll: true });
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="term"
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Close terminal" className="absolute inset-0 bg-abyss/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Interactive terminal"
            initial={{ y: 40, scale: 0.96, opacity: 0, filter: "blur(8px)" }}
            animate={{ y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 30, scale: 0.97, opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong noise relative flex h-[min(620px,82dvh)] w-full max-w-3xl flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-mute uppercase">
                <SquareTerminal className="size-4 text-neon" aria-hidden />
                ador-os · neural shell
              </div>
              <button type="button" onClick={close} className="p-1 text-mute transition-colors hover:text-neon" aria-label="Close terminal">
                <X className="size-4" />
              </button>
            </div>
            <TerminalShell data={memoData} onExit={close} autoFocus className="min-h-0 flex-1" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
