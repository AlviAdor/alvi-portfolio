import { defineRouting } from "next-intl/routing";

export const locales = ["en", "es", "fr", "de", "ja", "bn"] as const;
export type Locale = (typeof locales)[number];

/** Native names, shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  ja: "日本語",
  bn: "বাংলা",
};

/** BCP-47 tags for Intl formatting and <html lang>. */
export const localeTags: Record<Locale, string> = { en: "en", es: "es", fr: "fr", de: "de", ja: "ja", bn: "bn-BD" };

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  // English keeps clean URLs (/, /projects/…); others are prefixed (/de, /ja/projects/…)
  localePrefix: "as-needed",
});
