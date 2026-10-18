"use client";

import { useEffect, useRef } from "react";

/*
 * Cloudflare Turnstile (explicit render). Shows nothing unless
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the form works locally without it
 * (the server treats the bot check as disabled). The solved token is written
 * into a hidden input named `cf-turnstile-response` (read by the Server Action)
 * and surfaced via onToken for the client-side encrypted path.
 */

interface TurnstileAPI {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileAPI;
    __cfTurnstileReady?: boolean;
    __cfTurnstileQueue?: (() => void)[];
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__cfTurnstileOnload";

function ensureScript(): void {
  if (typeof window === "undefined" || window.__cfTurnstileReady !== undefined) return;
  window.__cfTurnstileReady = false;
  window.__cfTurnstileQueue = [];
  (window as unknown as { __cfTurnstileOnload: () => void }).__cfTurnstileOnload = () => {
    window.__cfTurnstileReady = true;
    window.__cfTurnstileQueue?.forEach((fn) => fn());
    window.__cfTurnstileQueue = [];
  };
  const s = document.createElement("script");
  s.src = SCRIPT;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

export default function Turnstile({ onToken }: { onToken?: (token: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    ensureScript();
    const render = () => {
      if (!ref.current || widgetId.current !== null || !window.turnstile) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        action: "contact",
        theme: "dark",
        "response-field-name": "cf-turnstile-response",
        callback: (token: string) => onToken?.(token),
        "expired-callback": () => onToken?.(null),
        "error-callback": () => onToken?.(null),
      });
    };
    if (window.__cfTurnstileReady) render();
    else window.__cfTurnstileQueue?.push(render);
    const id = widgetId.current;
    return () => {
      try {
        if (id) window.turnstile?.remove(id);
      } catch {
        /* ignore */
      }
      widgetId.current = null;
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={ref} className="mt-6" />;
}

export const turnstileConfigured = (): boolean => Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
