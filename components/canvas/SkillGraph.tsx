"use client";

import { Html } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { playCue } from "@/lib/audio";
import { skillGroups, skillLinks, skills, type SkillGroup } from "@/lib/site";
import { useSceneStore } from "@/lib/store";
import { useRenderGate } from "./Scene3D";

const N = skills.length;
const indexOf = new Map(skills.map((s, i) => [s.id, i]));
const links: [number, number][] = skillLinks
  .map(([a, b]) => [indexOf.get(a), indexOf.get(b)] as const)
  .filter((l): l is readonly [number, number] => l[0] !== undefined && l[1] !== undefined)
  .map(([a, b]) => [a, b]);

const neighbours: Set<number>[] = skills.map(() => new Set<number>());
for (const [a, b] of links) {
  neighbours[a]?.add(b);
  neighbours[b]?.add(a);
}

/** Each discipline gets an anchor so related skills cluster together. */
const ANCHORS: Record<SkillGroup, THREE.Vector3> = {
  ai: new THREE.Vector3(-2.2, 0.9, 0.3),
  web: new THREE.Vector3(2.2, 0.8, -0.3),
  systems: new THREE.Vector3(0, -1.5, 0.4),
  security: new THREE.Vector3(1.4, -1.7, -0.8),
};

/** Keeps the graph a shallow slab so perspective never balloons a node. */
const DEPTH_LIMIT = 1.4;
/** World-space radius the graph is scaled to fill (camera z = 11, fov 50). */
const FIT_RADIUS = 4.4;

const nodeRadius = (w: number) => 0.07 + w * 0.035;

/* ── force simulation (velocity Verlet with alpha cooling, d3-style) ─────── */
class ForceSim {
  pos = new Float32Array(N * 3);
  vel = new Float32Array(N * 3);
  alpha = 1;

  constructor() {
    for (let i = 0; i < N; i++) {
      const a = ANCHORS[skills[i]!.group];
      this.pos[i * 3] = a.x + (Math.random() - 0.5) * 3;
      this.pos[i * 3 + 1] = a.y + (Math.random() - 0.5) * 3;
      this.pos[i * 3 + 2] = a.z + (Math.random() - 0.5) * 1.2;
    }
  }

  reheat(to = 0.6) {
    this.alpha = Math.max(this.alpha, to);
  }

  step(dt: number) {
    if (this.alpha < 0.002) return;
    const { pos, vel } = this;
    const k = this.alpha * dt * 60;

    // pairwise repulsion
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        const dx = pos[i * 3]! - pos[j * 3]!;
        const dy = pos[i * 3 + 1]! - pos[j * 3 + 1]!;
        const dz = pos[i * 3 + 2]! - pos[j * 3 + 2]!;
        const d2 = Math.max(dx * dx + dy * dy + dz * dz, 0.04);
        const f = (0.09 / d2) * k;
        vel[i * 3]! += dx * f; vel[i * 3 + 1]! += dy * f; vel[i * 3 + 2]! += dz * f;
        vel[j * 3]! -= dx * f; vel[j * 3 + 1]! -= dy * f; vel[j * 3 + 2]! -= dz * f;
      }

    // springs along links
    for (const [a, b] of links) {
      const dx = pos[b * 3]! - pos[a * 3]!;
      const dy = pos[b * 3 + 1]! - pos[a * 3 + 1]!;
      const dz = pos[b * 3 + 2]! - pos[a * 3 + 2]!;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-3;
      const f = ((d - 1.35) / d) * 0.035 * k;
      vel[a * 3]! += dx * f; vel[a * 3 + 1]! += dy * f; vel[a * 3 + 2]! += dz * f;
      vel[b * 3]! -= dx * f; vel[b * 3 + 1]! -= dy * f; vel[b * 3 + 2]! -= dz * f;
    }

    // group anchors + global centering, then integrate with damping
    for (let i = 0; i < N; i++) {
      const a = ANCHORS[skills[i]!.group];
      for (let c = 0; c < 3; c++) {
        const p = pos[i * 3 + c]!;
        const target = c === 0 ? a.x : c === 1 ? a.y : a.z;
        vel[i * 3 + c]! += ((target - p) * 0.012 - p * 0.004) * k;
        vel[i * 3 + c]! *= 0.86;
        pos[i * 3 + c]! += vel[i * 3 + c]!;
      }
      pos[i * 3 + 2] = THREE.MathUtils.clamp(pos[i * 3 + 2]!, -DEPTH_LIMIT, DEPTH_LIMIT);
    }

    // recentre on the centroid so rotation and auto-fit pivot around the graph itself
    for (let c = 0; c < 3; c++) {
      let mean = 0;
      for (let i = 0; i < N; i++) mean += pos[i * 3 + c]!;
      mean /= N;
      for (let i = 0; i < N; i++) pos[i * 3 + c] = pos[i * 3 + c]! - mean;
    }
    this.alpha *= 0.985;
  }
}

const HALO_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * 140.0 * uPixelRatio / -mv.z;
    vColor = aColor;
  }
`;
const HALO_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * 0.55);
    #include <colorspace_fragment>
  }
`;

interface GraphSceneProps {
  hovered: number | null;
  onHover: (i: number | null) => void;
}

interface SceneProps extends GraphSceneProps {
  /** DOM layer for labels; it exists before the canvas, so no label can mount without a parent. */
  labelLayer: RefObject<HTMLDivElement | null>;
}

function GraphScene({ hovered, onHover, labelLayer }: SceneProps) {
  const sim = useMemo(() => new ForceSim(), []);
  const root = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const labels = useRef<(THREE.Group | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pointer = useRef({ x: 0, y: 0 });

  const baseColors = useMemo(() => skills.map((s) => new THREE.Color(skillGroups[s.group].color)), []);

  const { sphere, nodeMat, lineGeo, lineMat, haloGeo, haloMat } = useMemo(() => {
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(links.length * 6), 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(links.length * 6), 3));
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    haloGeo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(skills.map((s) => nodeRadius(s.weight) * 5)), 1));
    haloGeo.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return {
      sphere: new THREE.IcosahedronGeometry(1, 2),
      nodeMat: new THREE.MeshBasicMaterial({ toneMapped: false }),
      lineGeo,
      lineMat: new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      haloGeo,
      haloMat: new THREE.ShaderMaterial({
        vertexShader: HALO_VERT,
        fragmentShader: HALO_FRAG,
        uniforms: { uPixelRatio: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    };
  }, []);

  useEffect(
    () => () => {
      sphere.dispose();
      nodeMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
    },
    [sphere, nodeMat, lineGeo, lineMat, haloGeo, haloMat],
  );

  // pointer tilt without capturing touch/scroll (no OrbitControls)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => sim.reheat(0.25), [hovered, sim]);

  const tmpColor = useMemo(() => new THREE.Color(), []);
  const dim = useMemo(() => new THREE.Color("#1c2333"), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    sim.step(dt);
    const t = state.clock.elapsedTime;
    const { pos } = sim;
    const m = mesh.current;
    if (!m) return;

    const focus = hovered;
    const isLit = (i: number) => focus === null || i === focus || (neighbours[focus]?.has(i) ?? false);

    const haloPos = haloGeo.getAttribute("position") as THREE.BufferAttribute;
    const haloCol = haloGeo.getAttribute("aColor") as THREE.BufferAttribute;

    for (let i = 0; i < N; i++) {
      const s = skills[i]!;
      // idle float so the graph never looks frozen after cooling
      const x = pos[i * 3]!;
      const y = pos[i * 3 + 1]! + Math.sin(t * 0.8 + i) * 0.04;
      const z = pos[i * 3 + 2]!;
      const scale = nodeRadius(s.weight) * (i === focus ? 1.6 : 1);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(baseColors[i]!);
      if (!isLit(i)) tmpColor.lerp(dim, 0.82);
      m.setColorAt(i, tmpColor);
      haloPos.setXYZ(i, x, y, z);
      haloCol.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
      labels.current[i]?.position.set(x, y + scale + 0.18, z);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    haloPos.needsUpdate = true;
    haloCol.needsUpdate = true;
    haloMat.uniforms.uPixelRatio!.value = state.gl.getPixelRatio();

    const lp = lineGeo.getAttribute("position") as THREE.BufferAttribute;
    const lc = lineGeo.getAttribute("color") as THREE.BufferAttribute;
    links.forEach(([a, b], li) => {
      lp.setXYZ(li * 2, pos[a * 3]!, pos[a * 3 + 1]! + Math.sin(t * 0.8 + a) * 0.04, pos[a * 3 + 2]!);
      lp.setXYZ(li * 2 + 1, pos[b * 3]!, pos[b * 3 + 1]! + Math.sin(t * 0.8 + b) * 0.04, pos[b * 3 + 2]!);
      const active = focus !== null && (a === focus || b === focus);
      const strength = focus === null ? 0.28 : active ? 1 : 0.05;
      const ca = baseColors[a]!;
      const cb = baseColors[b]!;
      lc.setXYZ(li * 2, ca.r * strength, ca.g * strength, ca.b * strength);
      lc.setXYZ(li * 2 + 1, cb.r * strength, cb.g * strength, cb.b * strength);
    });
    lp.needsUpdate = true;
    lc.needsUpdate = true;

    const g = root.current;
    if (g) {
      // auto-fit: scale the whole graph so its widest node stays inside the frame
      let extent = 0;
      for (let i = 0; i < N; i++) extent = Math.max(extent, Math.hypot(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!));
      const fit = Math.min(1.15, FIT_RADIUS / Math.max(extent, 1e-3));
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, fit, 3, dt));
      g.rotation.y += dt * (focus === null ? 0.12 : 0.03);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, pointer.current.y * 0.25, 2, dt);
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId !== hovered) {
      onHover(e.instanceId);
      playCue("hover");
    }
  };

  return (
    <group ref={root}>
      <instancedMesh
        ref={mesh}
        args={[sphere, nodeMat, N]}
        onPointerMove={over}
        onPointerOut={() => onHover(null)}
        frustumCulled={false}
      />
      <points geometry={haloGeo} material={haloMat} frustumCulled={false} />
      <lineSegments geometry={lineGeo} material={lineMat} frustumCulled={false} />
      {skills.map((s, i) => (
        <group key={s.id} ref={(el) => void (labels.current[i] = el)}>
          <Html center portal={labelLayer as RefObject<HTMLElement>} zIndexRange={[20, 0]} style={{ pointerEvents: "auto" }}>
            <button
              type="button"
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(i)}
              onBlur={() => onHover(null)}
              className={`font-mono text-[10px] tracking-wider whitespace-nowrap uppercase transition-all duration-300 ${
                hovered === null ? "text-ink/70" : hovered === i ? "scale-125 text-white text-glow" : neighbours[hovered]?.has(i) ? "text-ink" : "text-ink/15"
              }`}
            >
              {s.id}
            </button>
          </Html>
        </group>
      ))}
    </group>
  );
}

function FlatGraph({ hovered, onHover }: GraphSceneProps) {
  return (
    <div className="grid gap-8 p-6 sm:grid-cols-2">
      {(Object.keys(skillGroups) as SkillGroup[]).map((g) => (
        <div key={g}>
          <p className="mb-3 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: skillGroups[g].color }}>
            {skillGroups[g].label}
          </p>
          <ul className="flex flex-wrap gap-2">
            {skills.map((s, i) =>
              s.group !== g ? null : (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseEnter={() => onHover(i)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(i)}
                    onBlur={() => onHover(null)}
                    className={`border px-3 py-1.5 font-mono text-xs transition-colors ${
                      hovered === i ? "border-neon text-neon" : hovered !== null && neighbours[hovered]?.has(i) ? "border-ion text-ink" : "border-line text-mute"
                    }`}
                  >
                    {s.id}
                  </button>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Force-directed 3D skill matrix with a 2D chip fallback. */
export default function SkillGraph() {
  const quality = useSceneStore((s) => s.quality);
  const { ref, active } = useRenderGate<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const webgl = quality === "high" || quality === "medium";
  const current = hovered === null ? null : skills[hovered];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div ref={ref} className="glass noise relative h-[520px] overflow-hidden sm:h-[600px]" onPointerLeave={() => setHovered(null)}>
        <div ref={labelLayer} className="pointer-events-none absolute inset-0 z-10 [&_button]:pointer-events-auto" />
        {webgl ? (
          <Canvas
            dpr={[1, quality === "high" ? 2 : 1.5]}
            frameloop={active ? "always" : "never"}
            camera={{ position: [0, 0, 11], fov: 50 }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            onPointerMissed={() => setHovered(null)}
            style={{ cursor: hovered === null ? "grab" : "pointer" }}
          >
            <GraphScene hovered={hovered} onHover={setHovered} labelLayer={labelLayer} />
          </Canvas>
        ) : (
          <FlatGraph hovered={hovered} onHover={setHovered} />
        )}
        <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-4 font-mono text-[10px] tracking-[0.18em] uppercase">
          {(Object.keys(skillGroups) as SkillGroup[]).map((g) => (
            <span key={g} className="flex items-center gap-2 text-mute">
              <span className="size-1.5 rounded-full" style={{ background: skillGroups[g].color }} />
              {skillGroups[g].label}
            </span>
          ))}
        </div>
      </div>

      <aside aria-live="polite" className="glass flex flex-col justify-between p-6">
        {current ? (
          <div>
            <p className="eyebrow" style={{ color: skillGroups[current.group].color }}>
              {skillGroups[current.group].label}
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">{current.id}</h3>
            <div className="mt-5 flex gap-1" aria-label={`Depth ${current.weight} of 3`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={`h-1 flex-1 ${n <= current.weight ? "bg-neon" : "bg-line"}`} />
              ))}
            </div>
            <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-faint uppercase">Connected to</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...(neighbours[hovered ?? -1] ?? [])].map((j) => (
                <li key={j} className="border border-line px-2 py-1 font-mono text-[11px] text-ink/80">
                  {skills[j]?.id}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <p className="eyebrow">Node inspector</p>
            <p className="mt-3 text-sm leading-relaxed text-mute">
              Hover or tab through a node to trace how a skill connects across research and engineering. The graph is a live force simulation: the
              disciplines pull their skills into clusters and the shared links hold them together.
            </p>
          </div>
        )}
        <p className="mt-8 font-mono text-[10px] text-faint">
          {N} nodes · {links.length} edges
        </p>
      </aside>
    </div>
  );
}
