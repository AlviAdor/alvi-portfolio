"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import DhakaClock from "@/components/ui/DhakaClock";
import SoundToggle from "@/components/ui/SoundToggle";
import type { Deployment } from "@/lib/deployment";
import { site } from "@/lib/site";

export default function Footer({ builtAt, deploy }: { builtAt: string; deploy: Deployment }) {
  const t = useTranslations("footer");
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
          <dd className="text-ink/80">{deploy.host}</dd>
          <dt className="text-faint uppercase">{t("env")}</dt>
          <dd className="text-ink/80">{deploy.env}</dd>
          <dt className="text-faint uppercase">{t("commit")}</dt>
          <dd className="text-ink/80">{deploy.commit ?? "local"}</dd>
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
