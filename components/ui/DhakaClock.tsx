"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

const dhaka = new Intl.DateTimeFormat("en-GB", { timeZone: site.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const utc = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
const hourIn = new Intl.DateTimeFormat("en-GB", { timeZone: site.timezone, hour: "numeric", hour12: false });

/** Live Dhaka + UTC clock with an "online / offline hours" hint. Renders after mount to avoid hydration drift. */
export default function DhakaClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const h = now ? Number(hourIn.format(now)) : 12;
  const awake = h >= 9 && h < 24;

  return (
    <div className="font-mono text-xs" aria-live="off">
      <p className="text-[10px] tracking-[0.18em] text-faint uppercase">Dhaka · UTC+6</p>
      <p className="mt-1 text-2xl tracking-tight text-ink tabular-nums">{now ? dhaka.format(now) : "--:--:--"}</p>
      <p className="mt-1 flex items-center gap-2 text-mute">
        <span className={`size-1.5 rounded-full ${awake ? "bg-signal" : "bg-faint"}`} />
        {awake ? "Working hours: replies within a day" : "Off hours: replies tomorrow"} · UTC {now ? utc.format(now) : "--:--"}
      </p>
    </div>
  );
}
