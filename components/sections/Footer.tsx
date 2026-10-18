"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import DhakaClock from "@/components/ui/DhakaClock";
import SoundToggle from "@/components/ui/SoundToggle";
import { site } from "@/lib/site";

function deployment() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL) {
    return { host: "Vercel Edge Network", sha: process.env.VERCEL_GIT_COMMIT_SHA, env: process.env.VERCEL_ENV ?? "production" };
  }
  if (process.env.CF_PAGES || process.env.WORKERS_CI) {
    return { host: "Cloudflare", sha: process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA, env: process.env.CF_PAGES_BRANCH ?? "production" };
  }
  return { host: "Self-hosted Node", sha: undefined, env: process.env.NODE_ENV };
}

export default function Footer({ builtAt }: { builtAt: string }) {
  const t = useTranslations("footer");
  const d = deployment();
  const year = new Date(builtAt).getUTCFullYear();

  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{site.handle}</p>
          <p className="mt-2 max-w-sm text-sm text-mute">
            {t("roles")}. {t("based", { location: site.location })}
          </p>
          <div className="mt-6">
            <SoundToggle withLabel />
          </div>
        </div>

        <DhakaClock />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-[11px]">
          <dt className="text-faint uppercase">{t("host")}</dt>
          <dd className="text-ink/80">{d.host}</dd>
          <dt className="text-faint uppercase">{t("env")}</dt>
          <dd className="text-ink/80">{d.env}</dd>
          <dt className="text-faint uppercase">{t("commit")}</dt>
          <dd className="text-ink/80">{d.sha ? d.sha.slice(0, 7) : "local"}</dd>
          <dt className="text-faint uppercase">{t("rendered")}</dt>
          <dd className="text-ink/80">
            <time dateTime={builtAt}>{builtAt.slice(0, 16).replace("T", " ")} UTC</time>
          </dd>
          <dt className="text-faint uppercase">{t("stack")}</dt>
          <dd className="text-ink/80">Next.js 15 · R3F · next-intl</dd>
          <dt className="text-faint uppercase">{t("secured")}</dt>
          <dd className="flex items-center gap-1.5 text-signal">
            <ShieldCheck className="size-3.5" /> CSP · HSTS · Turnstile
          </dd>
        </dl>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 font-mono text-[10px] tracking-[0.16em] text-faint uppercase sm:px-8">
          <span>
            © {year} {site.name}. {t("rights")}
          </span>
          <span>{t("terminalHint")}</span>
        </div>
      </div>
    </footer>
  );
}
