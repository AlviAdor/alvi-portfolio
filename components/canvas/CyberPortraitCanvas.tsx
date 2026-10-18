"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import * as THREE from "three";
import { playCue } from "@/lib/audio";
import { segmentPortrait, type SegmentationMask } from "@/lib/segmentation";
import { site } from "@/lib/site";
import { useSceneStore } from "@/lib/store";
import { useRenderGate } from "./Scene3D";

const { portrait } = site;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0); // clip-space quad, camera-independent
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uMask;
  uniform float uHasMask;
  uniform float uTime;
  uniform float uHover;
  uniform float uScan;
  uniform vec2 uPointer;
  uniform vec2 uTexel;
  uniform vec4 uFace;
  uniform vec3 uBg;
  uniform vec3 uNeon;
  uniform vec3 uIon;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float maskAt(vec2 uv) { return texture2D(uMask, clamp(uv, 0.0, 1.0)).r; }

  void main() {
    vec2 uv = vUv;
    float h = uHover;

    // ── RGB split: subtle constant shift, plus rare slice glitches ────────
    float slice = step(0.975, hash(vec2(floor(uv.y * 48.0), floor(uTime * 10.0))));
    float split = h * (0.0018 + slice * 0.009);
    vec3 orig = texture2D(uMap, uv).rgb;
    vec3 rgb = vec3(
      texture2D(uMap, uv + vec2(split, 0.0)).r,
      orig.g,
      texture2D(uMap, uv - vec2(split, 0.0)).b
    );

    // ── background replacement (subject pixels pass through untouched) ───
    float m = maskAt(uv);
    vec2 t2 = uTexel * 2.0;
    float soft = (maskAt(uv + vec2(t2.x, 0.0)) + maskAt(uv - vec2(t2.x, 0.0)) + maskAt(uv + vec2(0.0, t2.y)) + maskAt(uv - vec2(0.0, t2.y))) * 0.25;
    float person = smoothstep(0.3, 0.7, mix(m, soft, 0.5));
    vec2 t8 = uTexel * 9.0;
    float halo = (maskAt(uv + vec2(t8.x, 0.0)) + maskAt(uv - vec2(t8.x, 0.0)) + maskAt(uv + vec2(0.0, t8.y)) + maskAt(uv - vec2(0.0, t8.y))) * 0.25;
    float rim = clamp(halo * 1.8, 0.0, 1.0) * (1.0 - person);

    vec3 subject = mix(orig, rgb, 0.65);
    vec3 backdrop = uBg + uNeon * rim * 0.22;
    vec3 swapped = mix(backdrop, subject, person);
    vec3 col = mix(mix(orig, rgb, h), swapped, h * uHasMask);

    // ── facial scanner ────────────────────────────────────────────────────
    vec2 fp = (uv - uFace.xy) / uFace.zw;
    float inX = step(0.0, fp.x) * step(fp.x, 1.0);
    float inFace = inX * step(0.0, fp.y) * step(fp.y, 1.0);
    float scanY = 1.0 - uScan;
    float beam = exp(-pow((fp.y - scanY) * 90.0, 2.0)) * inX;
    float trail = smoothstep(0.35, 0.0, fp.y - scanY) * step(scanY, fp.y) * inFace;
    vec2 cell = abs(fract(fp * vec2(14.0, 14.0)) - 0.5);
    float grid = (1.0 - smoothstep(0.0, 0.04, min(cell.x, cell.y))) * trail;
    col += (uNeon * (beam * 0.85 + trail * 0.06 + grid * 0.12)) * h;

    // pointer reticle
    vec2 pd = (uv - uPointer) * vec2(1.0, ${(portrait.height / portrait.width).toFixed(4)});
    float r = length(pd);
    float ring = smoothstep(0.004, 0.0, abs(r - 0.045)) + smoothstep(0.003, 0.0, abs(r - 0.012));
    col += uIon * ring * 0.6 * h;

    // CRT lines + vignette
    col *= 1.0 - 0.05 * h * step(1.5, mod(gl_FragCoord.y, 3.0));
    vec2 vq = uv - 0.5;
    col *= 1.0 - dot(vq, vq) * 0.35;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

interface QuadProps {
  texture: THREE.Texture;
  mask: SegmentationMask | null;
  hover: RefObject<{ target: number; pointer: THREE.Vector2 }>;
}

function PortraitQuad({ texture, mask, hover }: QuadProps) {
  const maskTexture = useMemo(() => {
    if (!mask) {
      const blank = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType);
      blank.needsUpdate = true;
      return blank;
    }
    const tex = new THREE.DataTexture(mask.data, mask.width, mask.height, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [mask]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uMap: { value: texture },
          uMask: { value: null },
          uHasMask: { value: 0 },
          uTime: { value: 0 },
          uHover: { value: 0 },
          uScan: { value: 0 },
          uPointer: { value: new THREE.Vector2(0.5, 0.75) },
          uTexel: { value: new THREE.Vector2(1, 1) },
          uFace: { value: new THREE.Vector4(portrait.faceBox.x, portrait.faceBox.y, portrait.faceBox.w, portrait.faceBox.h) },
          uBg: { value: new THREE.Color("#0B0F17") },
          uNeon: { value: new THREE.Color("#00F0FF") },
          uIon: { value: new THREE.Color("#6366F1") },
        },
      }),
    [texture],
  );

  useEffect(() => {
    material.uniforms.uMask!.value = maskTexture;
    material.uniforms.uTexel!.value.set(1 / (mask?.width ?? 1), 1 / (mask?.height ?? 1));
  }, [material, maskTexture, mask]);

  useEffect(() => () => maskTexture.dispose(), [maskTexture]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const u = material.uniforms;
    const state = hover.current;
    if (!state) return;
    u.uTime!.value += dt;
    u.uHover!.value = THREE.MathUtils.damp(u.uHover!.value as number, state.target, 7, dt);
    u.uHasMask!.value = THREE.MathUtils.damp(u.uHasMask!.value as number, mask ? 1 : 0, 3, dt);
    (u.uPointer!.value as THREE.Vector2).lerp(state.pointer, 1 - Math.exp(-14 * dt));
    // the scan beam sweeps the face top→bottom while hovered
    u.uScan!.value = state.target > 0 ? ((u.uScan!.value as number) + dt * 0.55) % 1 : 0;
  });

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

type MaskStatus = "idle" | "segmenting" | "ready" | "unavailable";

/**
 * The portrait rendered through a WebGL shader. Hover (or focus, or tap)
 * triggers the facial scanner, a subtle RGB split and a background swap to
 * flat obsidian driven by an in-browser person mask. Before the texture is
 * ready, and on fallback-tier devices, the optimised <Image> is shown instead.
 */
export default function CyberPortraitCanvas({ className = "" }: { className?: string }) {
  const quality = useSceneStore((s) => s.quality);
  const { ref, active } = useRenderGate<HTMLDivElement>();
  const hover = useRef({ target: 0, pointer: new THREE.Vector2(0.5, 0.75) });
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [mask, setMask] = useState<SegmentationMask | null>(null);
  const [maskStatus, setMaskStatus] = useState<MaskStatus>("idle");
  const webgl = quality === "high" || quality === "medium";

  // texture: loaded once WebGL is confirmed, disposed on unmount
  useEffect(() => {
    if (!webgl) return;
    let disposed = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(portrait.src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      if (disposed) {
        tex.dispose();
        return;
      }
      loaded = tex;
      setTexture(tex);
    });
    return () => {
      disposed = true;
      loaded?.dispose();
      setTexture(null);
    };
  }, [webgl]);

  // segmentation: deferred until the portrait first scrolls into view, then idle time.
  // segmentPortrait() is memoised, so a cancelled run simply resumes from cache.
  const maskSettled = useRef(false);
  useEffect(() => {
    if (!webgl || !active || maskSettled.current) return;
    let alive = true;
    setMaskStatus("segmenting");
    const start = () =>
      segmentPortrait(portrait.src, portrait.faceBox).then((m) => {
        if (!alive) return;
        maskSettled.current = true;
        setMask(m);
        setMaskStatus(m ? "ready" : "unavailable");
      });
    const useIdle = typeof window.requestIdleCallback === "function";
    const handle = useIdle ? window.requestIdleCallback(start, { timeout: 2500 }) : window.setTimeout(start, 600);
    return () => {
      alive = false;
      if (useIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [webgl, active]);

  const engage = (on: boolean) => {
    if (hover.current.target === (on ? 1 : 0)) return;
    hover.current.target = on ? 1 : 0;
    setHovered(on);
    if (on) playCue("open");
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    hover.current.pointer.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height);
  };

  const fb = portrait.faceBox;
  const statusLabel: Record<MaskStatus, string> = {
    idle: "BG MASK · STANDBY",
    segmenting: "BG MASK · SEGMENTING",
    ready: "BG MASK · LOCKED",
    unavailable: "BG MASK · OFFLINE",
  };

  return (
    <div
      ref={ref}
      role="img"
      aria-label={portrait.alt}
      tabIndex={0}
      onPointerEnter={(e) => e.pointerType === "mouse" && engage(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && engage(false)}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => e.pointerType !== "mouse" && engage(!hovered)}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && engage(true)}
      onBlur={() => engage(false)}
      className={`group relative isolate overflow-hidden bg-obsidian select-none ${className}`}
      style={{ aspectRatio: `${portrait.width} / ${portrait.height}` }}
    >
      <Image
        src={portrait.src}
        alt=""
        fill
        priority={false}
        sizes="(min-width: 1024px) 420px, 90vw"
        className={`object-cover transition-opacity duration-700 ${texture ? "opacity-0" : "opacity-100"}`}
      />

      {webgl && texture && (
        <Canvas
          frameloop={active ? "always" : "never"}
          dpr={[1, 2]}
          gl={{ antialias: false, alpha: false, depth: false, stencil: false }}
          style={{ position: "absolute", inset: 0 }}
          aria-hidden
        >
          <PortraitQuad texture={texture} mask={mask} hover={hover} />
        </Canvas>
      )}

      {/* CSS scanner for the non-WebGL path */}
      {!webgl && (
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus:opacity-100">
          <div className="absolute inset-0 bg-obsidian/30 mix-blend-multiply" />
          <div className="absolute inset-x-0 top-0 h-[10%] animate-scanline bg-gradient-to-b from-transparent via-neon/40 to-transparent" />
        </div>
      )}

      {/* HUD overlay */}
      <div aria-hidden className="pointer-events-none absolute inset-0 font-mono text-[10px] tracking-[0.18em] text-neon uppercase">
        <div className="hud-corners absolute inset-3 opacity-60" />
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="face"
              initial={{ opacity: 0, scale: 1.15 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.08 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="hud-corners absolute"
              style={{
                left: `${fb.x * 100}%`,
                top: `${(1 - fb.y - fb.h) * 100}%`,
                width: `${fb.w * 100}%`,
                height: `${fb.h * 100}%`,
              }}
            >
              <span className="absolute -top-5 left-0 whitespace-nowrap text-glow">FACE LOCK</span>
              <span className="absolute -bottom-5 left-0 whitespace-nowrap text-ink/70">ID · ALVI_ADOR</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute bottom-5 left-5 flex flex-col gap-1">
          <span className="text-ink/60">SUBJECT 01 · {site.location.split(",")[0]}</span>
          <span className={maskStatus === "ready" ? "text-signal" : "text-mute"}>{webgl ? statusLabel[maskStatus] : "VISUAL MODE · 2D"}</span>
        </div>
        <span className="absolute top-5 right-5 text-mute">{hovered ? "SCANNING" : "HOVER TO SCAN"}</span>
      </div>
    </div>
  );
}
