"use client";

import { Volume2, VolumeX } from "lucide-react";
import { playCue } from "@/lib/audio";
import { useSceneStore } from "@/lib/store";

export default function SoundToggle({ withLabel = false }: { withLabel?: boolean }) {
  const enabled = useSceneStore((s) => s.soundEnabled);
  const setEnabled = useSceneStore((s) => s.setSoundEnabled);

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Mute interface sounds" : "Enable interface sounds"}
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        if (next) playCue("success", true);
      }}
      className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-mute uppercase transition-colors hover:text-neon"
    >
      {enabled ? <Volume2 className="size-4 text-neon" /> : <VolumeX className="size-4" />}
      {withLabel && <span>{enabled ? "Sound on" : "Sound off"}</span>}
      {/* live equaliser bars while enabled */}
      <span aria-hidden className="flex h-3 items-end gap-[2px]">
        {[0.6, 1, 0.4, 0.8].map((h, i) => (
          <span
            key={i}
            className={`w-[2px] bg-current transition-all ${enabled ? "animate-pulse" : ""}`}
            style={{ height: enabled ? `${h * 100}%` : "20%", animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </button>
  );
}
