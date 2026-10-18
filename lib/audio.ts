"use client";

import { useSceneStore } from "./store";

/**
 * Procedural sci-fi micro-interaction sounds on the Web Audio API.
 * No audio files: every cue is synthesised from oscillators and a noise
 * buffer, so the whole engine costs ~2 KB. The AudioContext is created lazily
 * on the first cue after a user gesture, as browser autoplay policy requires.
 */

export type Cue = "hover" | "click" | "key" | "open" | "close" | "success" | "error";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function engine(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.35;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return master ? { ctx, master } : null;
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  const length = Math.floor(ac.sampleRate * 0.25);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noise = buffer;
  return buffer;
}

function tone(ac: AudioContext, out: AudioNode, opts: { type: OscillatorType; from: number; to: number; at: number; dur: number; gain: number }) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, opts.at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(opts.to, 1), opts.at + opts.dur);
  g.gain.setValueAtTime(0.0001, opts.at);
  g.gain.exponentialRampToValueAtTime(opts.gain, opts.at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, opts.at + opts.dur);
  osc.connect(g).connect(out);
  osc.start(opts.at);
  osc.stop(opts.at + opts.dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function tick(ac: AudioContext, out: AudioNode, at: number, gain: number, freq: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 6;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
  src.connect(bp).connect(g).connect(out);
  src.start(at);
  src.stop(at + 0.05);
  src.onended = () => {
    src.disconnect();
    bp.disconnect();
    g.disconnect();
  };
}

export function playCue(cue: Cue, force = false): void {
  if (!force && !useSceneStore.getState().soundEnabled) return;
  const e = engine();
  if (!e) return;
  const { ctx: ac, master: out } = e;
  const t = ac.currentTime;

  switch (cue) {
    case "hover":
      tone(ac, out, { type: "sine", from: 1800, to: 2400, at: t, dur: 0.05, gain: 0.05 });
      break;
    case "click":
      tone(ac, out, { type: "square", from: 520, to: 180, at: t, dur: 0.08, gain: 0.08 });
      tick(ac, out, t, 0.12, 3200);
      break;
    case "key":
      tick(ac, out, t, 0.08, 2200 + Math.random() * 1600);
      break;
    case "open":
      tone(ac, out, { type: "sawtooth", from: 180, to: 880, at: t, dur: 0.22, gain: 0.06 });
      tone(ac, out, { type: "sine", from: 880, to: 1320, at: t + 0.12, dur: 0.16, gain: 0.06 });
      break;
    case "close":
      tone(ac, out, { type: "sawtooth", from: 880, to: 160, at: t, dur: 0.2, gain: 0.05 });
      break;
    case "success":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(ac, out, { type: "triangle", from: f, to: f * 1.002, at: t + i * 0.085, dur: 0.32, gain: 0.09 }),
      );
      break;
    case "error":
      tone(ac, out, { type: "square", from: 220, to: 110, at: t, dur: 0.18, gain: 0.07 });
      tone(ac, out, { type: "square", from: 207, to: 98, at: t + 0.16, dur: 0.22, gain: 0.07 });
      break;
  }
}
