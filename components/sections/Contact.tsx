"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Lock, LockOpen, LoaderCircle, Mail, Microscope, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { getFormToken, sendContact } from "@/app/actions/contact";
import { GithubIcon, LinkedinIcon } from "@/components/ui/BrandIcons";
import CopyBadge from "@/components/ui/CopyBadge";
import DhakaClock from "@/components/ui/DhakaClock";
import SectionHeading from "@/components/ui/SectionHeading";
import Turnstile, { turnstileConfigured } from "@/components/ui/Turnstile";
import { playCue } from "@/lib/audio";
import { SecureBridge, secureChannelEnabled } from "@/lib/secure-channel";
import { site } from "@/lib/site";
import type { ContactFormState, ContactPayload } from "@/lib/types";

const INITIAL: ContactFormState = { status: "idle" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type E2E = { status: "idle" | "sending" | "delivered" } | { status: "fellback"; reason: string };

export default function Contact() {
  const t = useTranslations("contact");
  const [state, action, pending] = useActionState(sendContact, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [e2eAvailable, setE2eAvailable] = useState(false);
  const [e2eOn, setE2eOn] = useState(true);
  const [e2e, setE2e] = useState<E2E>({ status: "idle" });
  const [clientErrors, setClientErrors] = useState<Partial<Record<keyof ContactPayload, string>>>({});

  const refreshToken = () => void getFormToken().then(setToken);
  useEffect(() => {
    refreshToken();
    setE2eAvailable(secureChannelEnabled());
  }, []);

  // refresh the single-use token after each server round-trip
  useEffect(() => {
    if (state.status === "done") {
      if (state.nextToken) setToken(state.nextToken);
      else refreshToken();
      playCue(state.ok ? "success" : "error");
      if (state.ok) formRef.current?.reset();
    }
  }, [state]);

  const err = (f: keyof ContactPayload) => clientErrors[f] ?? (state.status === "done" && !state.ok ? mapFieldError(state.fieldErrors?.[f]) : undefined);
  function mapFieldError(key?: string): string | undefined {
    return key ? t(`errors.${key}`) : undefined;
  }

  const clientValidate = (name: string, email: string, message: string): Partial<Record<keyof ContactPayload, string>> => {
    const e: Partial<Record<keyof ContactPayload, string>> = {};
    if (name.length < 2 || name.length > 80) e.name = t("errors.name.short");
    if (!EMAIL.test(email) || email.length > 160) e.email = t("errors.email.invalid");
    if (message.length < 20) e.message = t("errors.message.short");
    else if (message.length > 4000) e.message = t("errors.message.long");
    return e;
  };

  const busy = pending || e2e.status === "sending";
  const encrypting = e2eAvailable && e2eOn;
  const turnstilePending = turnstileConfigured() && !turnstileToken;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    setClientErrors({});
    if (!encrypting) return; // standard path → Server Action handles submit
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const errors = clientValidate(name, email, message);
    if (Object.keys(errors).length) {
      setClientErrors(errors);
      playCue("error");
      return;
    }
    const bridge = new SecureBridge();
    bridge.open();
    setE2e({ status: "sending" });
    void bridge.send(name, email, data.get("company") ? `${message}\n\n— ${String(data.get("company"))}` : message).then((result) => {
      bridge.close();
      if (result.ok) {
        setE2e({ status: "delivered" });
        playCue("success");
        form.reset();
        return;
      }
      setE2e({ status: "fellback", reason: result.error ?? "" });
      startTransition(() => action(data));
    });
  };

  const fieldProps = (name: keyof ContactPayload) => ({
    id: `contact-${name}`,
    name,
    "aria-invalid": err(name) ? true : undefined,
    "aria-describedby": err(name) ? `contact-${name}-error` : undefined,
    className: "field",
    disabled: busy,
  });

  const FieldError = ({ f }: { f: keyof ContactPayload }) =>
    err(f) ? (
      <p id={`contact-${f}-error`} className="mt-2 font-mono text-[11px] text-flare">
        {err(f)}
      </p>
    ) : null;

  const outcome =
    e2e.status === "delivered"
      ? { key: "e2e", ok: true, text: t("okE2e") }
      : state.status === "done"
        ? {
            key: state.ok ? "ok" : state.error,
            ok: state.ok,
            text: state.ok ? (e2e.status === "fellback" ? t("okFallback") : t("okStd")) : t(`errors.${state.error}`),
          }
        : null;

  return (
    <section id="contact" className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
      <SectionHeading
        index={t("index")}
        eyebrow={t("eyebrow")}
        title={
          <>
            {t("title")} <span className="text-mute">{t("titleMuted")}</span>
          </>
        }
        lede={t("lede")}
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <form ref={formRef} action={action} onSubmit={onSubmit} noValidate data-reveal className="glass-strong noise relative p-6 sm:p-9">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
            <span>{encrypting ? t("channelE2e") : t("channelStd")}</span>
            <span className={busy ? "text-neon" : "text-signal"}>{busy ? (e2e.status === "sending" ? t("encrypting") : t("transmitting")) : t("ready")}</span>
          </div>

          {e2eAvailable && (
            <button
              type="button"
              role="switch"
              aria-checked={e2eOn}
              onClick={() => {
                setE2eOn((v) => !v);
                playCue("click");
              }}
              className={`mb-8 flex w-full items-start gap-4 border px-4 py-3 text-left transition-colors ${e2eOn ? "border-neon/40 bg-neon/[0.04]" : "border-line"}`}
            >
              {e2eOn ? <Lock className="mt-0.5 size-4 shrink-0 text-neon" aria-hidden /> : <LockOpen className="mt-0.5 size-4 shrink-0 text-mute" aria-hidden />}
              <span>
                <span className="block font-mono text-[11px] tracking-[0.14em] text-ink uppercase">
                  {t("e2eTitle")} · {e2eOn ? t("e2eOn") : t("e2eOff")}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-mute">{t("e2eDesc")}</span>
              </span>
            </button>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="mb-2 block font-mono text-[11px] tracking-[0.14em] text-mute uppercase">
                {t("name")}
              </label>
              <input {...fieldProps("name")} autoComplete="name" required placeholder={t("namePh")} />
              <FieldError f="name" />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-2 block font-mono text-[11px] tracking-[0.14em] text-mute uppercase">
                {t("email")}
              </label>
              <input {...fieldProps("email")} type="email" autoComplete="email" required placeholder={t("emailPh")} />
              <FieldError f="email" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-company" className="mb-2 block font-mono text-[11px] tracking-[0.14em] text-mute uppercase">
                {t("company")} <span className="text-faint normal-case">{t("optional")}</span>
              </label>
              <input {...fieldProps("company")} autoComplete="organization" placeholder={t("companyPh")} />
              <FieldError f="company" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-message" className="mb-2 block font-mono text-[11px] tracking-[0.14em] text-mute uppercase">
                {t("message")}
              </label>
              <textarea {...fieldProps("message")} rows={6} required placeholder={t("messagePh")} className="field resize-y" />
              <FieldError f="message" />
            </div>
          </div>

          {/* anti-spam honeypot + HMAC form token + Turnstile */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <input type="hidden" name="formToken" value={token ?? ""} readOnly />
          <Turnstile onToken={setTurnstileToken} />

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <button
              type="submit"
              disabled={busy || turnstilePending}
              onMouseEnter={() => playCue("hover")}
              className="inline-flex items-center gap-3 bg-neon px-7 py-3.5 font-mono text-xs font-medium tracking-[0.14em] text-obsidian uppercase transition-shadow hover:shadow-[0_0_40px_-6px_rgb(0_240_255/0.7)] disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : encrypting ? <Lock className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
              {busy ? (e2e.status === "sending" ? t("encrypting") : t("sending")) : encrypting ? t("sendE2e") : t("sendStd")}
            </button>

            {turnstilePending && <span className="font-mono text-[11px] text-mute">{t("botPending")}</span>}

            <AnimatePresence mode="wait">
              {outcome && (
                <motion.p key={outcome.key} role="status" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={`font-mono text-xs ${outcome.ok ? "text-signal" : "text-flare"}`}>
                  {outcome.ok ? "✓ " : ""}
                  {outcome.text}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </form>

        <aside className="flex flex-col gap-4">
          <div data-reveal className="glass p-6">
            <DhakaClock />
          </div>
          <div data-reveal className="flex flex-col gap-3">
            <CopyBadge label="Email" value={site.email} href={`mailto:${site.email}`} icon={<Mail className="size-4" />} />
            <CopyBadge label="GitHub" value={site.github.url.replace("https://", "")} href={site.github.url} icon={<GithubIcon className="size-4" />} />
            <CopyBadge label="LinkedIn" value={site.linkedin.replace("https://www.", "")} href={site.linkedin} icon={<LinkedinIcon className="size-4" />} />
            <CopyBadge label="ResearchGate" value={site.name} href={site.researchgate} icon={<Microscope className="size-4" />} />
          </div>
          <a data-reveal href={`mailto:${site.email}?subject=${encodeURIComponent("Opportunity for Alvi")}`} className="group flex items-center justify-between border border-line px-6 py-5 transition-colors hover:border-neon">
            <span>
              <span className="block font-mono text-[10px] tracking-[0.18em] text-faint uppercase">{t("preferEmail")}</span>
              <span className="mt-1 block text-lg font-medium">{t("writeDirectly")}</span>
            </span>
            <ArrowUpRight className="size-5 text-mute transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-neon" />
          </a>
        </aside>
      </div>
    </section>
  );
}
