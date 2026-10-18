"use client";

import { SquareTerminal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type MouseEvent } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { playCue } from "@/lib/audio";
import { scrollBus } from "@/lib/scroll";
import { site } from "@/lib/site";
import { useSceneStore } from "@/lib/store";
import DisplayPanel from "./DisplayPanel";
import LanguageSwitcher from "./LanguageSwitcher";

const LINKS = [
  ["about", "#about"],
  ["labs", "#labs"],
  ["research", "#research"],
  ["builds", "#builds"],
  ["security", "#security"],
  ["contact", "#contact"],
] as const;

export default function Nav() {
  const t = useTranslations("nav");
  const setTerminalOpen = useSceneStore((s) => s.setTerminalOpen);
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    if (!onHome) return () => window.removeEventListener("scroll", onScroll);
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`)), {
      rootMargin: "-45% 0px -50% 0px",
    });
    LINKS.forEach(([, href]) => {
      const el = document.querySelector(href);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, [onHome]);

  const go = (href: string) => (e: MouseEvent) => {
    playCue("click");
    if (!onHome) return;
    e.preventDefault();
    scrollBus.to(href);
  };

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${scrolled ? "border-b border-line bg-obsidian/92 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.9)]" : "border-b border-transparent"}`}>
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          onClick={(e) => {
            if (!onHome) return;
            e.preventDefault();
            scrollBus.to(0);
          }}
          className="flex items-center gap-3 font-mono text-xs tracking-[0.2em] uppercase"
        >
          <span className="grid size-8 place-items-center border border-neon/50 text-neon">AA</span>
          <span className="hidden text-ink xl:inline">{site.handle}</span>
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {LINKS.map(([key, href]) => (
            <li key={href}>
              <a
                href={onHome ? href : `/${href}`}
                onClick={go(href)}
                onMouseEnter={() => playCue("hover")}
                className={`relative font-mono text-[11px] tracking-[0.16em] uppercase transition-colors ${active === href ? "text-neon" : "text-mute hover:text-ink"}`}
              >
                {t(key)}
                <span className={`absolute -bottom-1.5 left-0 h-px bg-neon transition-all duration-500 ${active === href ? "w-full" : "w-0"}`} />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher compact />
          <DisplayPanel />
          <button
            type="button"
            onClick={() => setTerminalOpen(true)}
            className="flex h-8 items-center gap-2 border border-line px-3 font-mono text-[11px] tracking-[0.14em] text-ink uppercase transition-colors hover:border-neon hover:text-neon"
          >
            <SquareTerminal className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{t("terminal")}</span>
            <kbd className="hidden text-faint xl:inline">`</kbd>
          </button>
        </div>
      </nav>
    </header>
  );
}
