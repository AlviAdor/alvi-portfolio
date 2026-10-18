"use client";

import { Camera, CameraOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { playCue } from "@/lib/audio";
import { decide, emotionColor, exampleLogits, rank, type Emotion } from "@/lib/fer";

export default function FerLab() {
  const t = useTranslations("labs.fer");
  const [threshold, setThreshold] = useState(0.5);
  const [live, setLive] = useState(false);
  const [dist, setDist] = useState<Record<Emotion, number>>(exampleLogits);
  const [camState, setCamState] = useState<"off" | "starting" | "on" | "denied" | "noface">("off");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const ranked = rank(dist);
  const decision = decide(dist, threshold);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void import("@/lib/face").then((m) => m.disposeFace());
    setCamState("off");
    setDist(exampleLogits);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    setCamState("starting");
    playCue("open");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCamState("on");
      const { readFrame } = await import("@/lib/face");
      let last = 0;
      const loop = async (ts: number) => {
        if (!streamRef.current) return;
        if (ts - last > 120 && video.readyState >= 2) {
          last = ts;
          const reading = await readFrame(video, ts);
          if (reading?.found) {
            setDist(reading.dist);
            setCamState("on");
          } else if (reading) {
            setCamState("noface");
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setCamState("denied");
      setLive(false);
    }
  }, []);

  const toggleLive = (on: boolean) => {
    setLive(on);
    if (on) void start();
    else stop();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <p className="text-sm leading-relaxed text-mute">{t("intro")}</p>

        {/* distribution bars */}
        <ul className="mt-6 space-y-2" aria-label="emotion distribution">
          {ranked.map(({ emotion, prob }) => (
            <li key={emotion} className="grid grid-cols-[88px_1fr_44px] items-center gap-3">
              <span className="font-mono text-[11px] text-ink">{t(`emotions.${emotion}`)}</span>
              <span className="h-3 overflow-hidden rounded-[2px] bg-white/[0.04]">
                <span
                  className="block h-full rounded-[2px] transition-all duration-300"
                  style={{ width: `${Math.round(prob * 100)}%`, background: emotionColor[emotion], opacity: prob >= threshold ? 1 : 0.4 }}
                />
              </span>
              <span className="text-right font-mono text-[11px] text-mute tabular-nums">{(prob * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>

        {/* threshold line */}
        <label className="mt-6 block">
          <span className="flex justify-between font-mono text-[11px] text-mute">
            {t("threshold")} <span className="text-neon tabular-nums">{Math.round(threshold * 100)}%</span>
          </span>
          <input type="range" min={0.1} max={0.95} step={0.01} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-2 w-full accent-[#00F0FF]" aria-label={t("threshold")} />
        </label>
      </div>

      <div className="flex flex-col">
        <div className={`border p-5 ${decision.committed ? "border-neon/40 bg-neon/[0.04]" : "border-line"}`}>
          <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">{decision.committed ? t("committed") : t("abstains")}</p>
          <p className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight" style={{ color: decision.committed ? emotionColor[decision.top.emotion] : "#8A94A8" }}>
            {decision.committed ? t(`emotions.${decision.top.emotion}`) : "—"}
          </p>
          <p className="mt-2 font-mono text-[11px] text-mute">
            {t("margin")}: <span className="text-ink tabular-nums">{(decision.margin * 100).toFixed(0)}%</span>
          </p>
        </div>

        {/* live camera */}
        <div className="mt-4 border border-line p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">{t("liveTitle")}</p>
            <button
              type="button"
              role="switch"
              aria-checked={live}
              onClick={() => toggleLive(!live)}
              className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${live ? "border-neon text-neon" : "border-line text-mute hover:text-ink"}`}
            >
              {live ? <CameraOff className="size-3.5" /> : <Camera className="size-3.5" />}
              {live ? t("cameraStop") : t("liveOn")}
            </button>
          </div>
          <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[2px] bg-abyss">
            <video ref={videoRef} playsInline muted className={`h-full w-full -scale-x-100 object-cover ${camState === "on" || camState === "noface" ? "opacity-100" : "opacity-0"}`} />
            {camState !== "on" && camState !== "noface" && (
              <div className="absolute inset-0 grid place-items-center font-mono text-[11px] text-faint">{camState === "starting" ? "…" : camState === "denied" ? t("cameraDenied") : t("liveOff")}</div>
            )}
            {camState === "noface" && <div className="absolute inset-x-0 bottom-0 bg-abyss/70 py-1 text-center font-mono text-[10px] text-mute">{t("noFace")}</div>}
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">{t("liveNote")}</p>
        </div>
      </div>
    </div>
  );
}
