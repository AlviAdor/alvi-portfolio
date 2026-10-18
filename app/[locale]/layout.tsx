import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans_Bengali, Noto_Sans_JP, Space_Grotesk } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { localeTags, routing, type Locale } from "@/i18n/routing";
import { site } from "@/lib/site";
import "../globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
// Script fallbacks: Space Grotesk has no Japanese or Bengali glyphs. Not preloaded;
// the browser only fetches the unicode-range slices a page actually uses.
const notoJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-noto-jp", display: "swap", preload: false });
const notoBn = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "600"], variable: "--font-noto-bn", display: "swap", preload: false });

const description =
  "Md. Faizal Alvi Sarker (Alvi Ador): cybersecurity & DevSecOps engineer and AI / computer-vision researcher. Hardened, multilingual, interactive portfolio.";

// headers() provides the per-request CSP nonce, so these pages render per request.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const languages = Object.fromEntries(routing.locales.map((l) => [localeTags[l], l === routing.defaultLocale ? "/" : `/${l}`]));
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.handle}: Cybersecurity × AI Research`, template: `%s · ${site.handle}` },
    description,
    applicationName: site.handle,
    authors: [{ name: site.name, url: site.url }],
    creator: site.name,
    keywords: ["Alvi Ador", "Md. Faizal Alvi Sarker", "cybersecurity", "DevSecOps", "computer vision", "facial emotion recognition", "EfficientNet", "Next.js", "WebGL", "AIUB", "Dhaka"],
    alternates: { canonical: locale === routing.defaultLocale ? "/" : `/${locale}`, languages },
    openGraph: {
      type: "profile",
      locale: localeTags[locale as Locale] ?? "en",
      url: site.url,
      siteName: site.handle,
      title: `${site.handle}: Cybersecurity × AI Research`,
      description,
      images: [{ url: site.portrait.src, width: site.portrait.width, height: site.portrait.height, alt: site.portrait.alt }],
    },
    twitter: { card: "summary_large_image", title: site.handle, description, images: [site.portrait.src] },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0B0F17",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/*
 * Pre-paint: applies saved display preferences and decides whether the
 * once-per-session greeting plays. `home` matches "/" or a bare locale prefix
 * (e.g. "/de") so the intro only plays on the landing page in any language.
 * Carries the CSP nonce set by middleware so it passes strict-dynamic CSP.
 */
const PREPAINT = `try{var e=document.documentElement,d=JSON.parse(localStorage.getItem("aa:display")||"{}");if(d.readable)e.setAttribute("data-readable","");if(d.contrast)e.setAttribute("data-contrast","");if(d.reduceMotion)e.setAttribute("data-reduce-motion","");if(d.scale)e.style.setProperty("--text-scale",String(d.scale));var p=location.pathname.replace(/\\/$/,"")||"/";var home=p==="/"||/^\\/(es|fr|de|ja|bn)$/.test(p);if(home&&!sessionStorage.getItem("aa:intro")&&!d.reduceMotion&&!matchMedia("(prefers-reduced-motion: reduce)").matches)e.setAttribute("data-intro","")}catch(_){}`;

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang={localeTags[locale]} dir="ltr" className={`${grotesk.variable} ${mono.variable} ${notoJp.variable} ${notoBn.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      </head>
      <body>
        <a href="#about" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-neon focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:text-obsidian">
          Skip to content
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
