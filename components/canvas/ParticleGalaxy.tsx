"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSceneStore } from "@/lib/store";

interface ParticleGalaxyProps {
  /** Dust particles in the spiral arms. */
  count: number;
  /** Larger "neuron" nodes that are wired together with signal lines. */
  neurons: number;
}

const SCRATCH_RED = new THREE.Color("#FF2E63");
const SCRATCH_RED2 = new THREE.Color("#FF5C38");

const RADIUS = 7.5;
const ARMS = 3;
const SPIN = 0.9;

/* Shared by the point cloud and the synapse lines so both deform identically. */
const DISPLACE = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uPointer;
  uniform vec3 uImpulseOrigin;
  uniform float uImpulse;
  uniform float uImpulseAge;

  vec3 displaceLocal(vec3 p, vec4 seed) {
    float r = length(p.xz);
    // differential rotation: the core turns faster than the rim
    float ang = uTime * (0.035 + 0.22 / (1.0 + r * 0.9));
    float s = sin(ang), c = cos(ang);
    p.xz = mat2(c, -s, s, c) * p.xz;
    // slow breathing turbulence
    float ph = seed.z * 6.2831853;
    p += 0.07 * vec3(sin(uTime * 0.7 + ph + p.y * 2.0), cos(uTime * 0.5 + ph), sin(uTime * 0.6 + p.x));
    // scroll disperses the galaxy outward and vertically
    p *= 1.0 + uScroll * 0.55;
    p.y += uScroll * (seed.z - 0.5) * 3.0 * seed.x;
    return p;
  }

  // returns world position; writes the interaction energy into 'energy'
  vec3 interact(vec3 world, out float energy) {
    vec3 d = world - uPointer;
    float dist = length(d);
    float push = smoothstep(2.4, 0.0, dist);
    world += (d / max(dist, 1e-3)) * push * 0.85;

    vec3 di = world - uImpulseOrigin;
    float dd = length(di);
    float ring = uImpulseAge * 7.0;
    float wave = exp(-pow((dd - ring) * 1.5, 2.0)) * uImpulse;
    world += (di / max(dd, 1e-3)) * wave * 0.9;

    energy = clamp(push * 0.7 + wave * 1.4, 0.0, 1.5);
    return world;
  }
`;

const POINTS_VERT = /* glsl */ `
  ${DISPLACE}
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorHot;
  attribute vec4 aSeed; // x: brightness, y: size, z: phase, w: colour mix
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 local = displaceLocal(position, aSeed);
    float energy;
    vec3 world = interact((modelMatrix * vec4(local, 1.0)).xyz, energy);
    vec4 mv = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 0.75 + 0.25 * sin(uTime * (1.5 + aSeed.x * 3.0) + aSeed.z * 40.0);
    gl_PointSize = uSize * aSeed.y * (1.0 + energy * 1.6) * uPixelRatio / max(-mv.z, 0.5);

    vColor = mix(mix(uColorA, uColorB, aSeed.w), uColorHot, clamp(energy, 0.0, 1.0));
    vAlpha = (0.25 + 0.75 * aSeed.x) * twinkle * (1.0 - uScroll * 0.65);
  }
`;

const POINTS_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, core * core * vAlpha);
    #include <colorspace_fragment>
  }
`;

const LINES_VERT = /* glsl */ `
  ${DISPLACE}
  attribute vec4 aSeed;
  attribute float aT;
  attribute float aLine;
  varying float vT;
  varying float vLine;
  varying float vEnergy;

  void main() {
    vec3 local = displaceLocal(position, aSeed);
    float energy;
    vec3 world = interact((modelMatrix * vec4(local, 1.0)).xyz, energy);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
    vT = aT;
    vLine = aLine;
    vEnergy = energy;
  }
`;

const LINES_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vT;
  varying float vLine;
  varying float vEnergy;
  void main() {
    // a signal packet travelling along each synapse at its own phase
    float travel = fract(uTime * (0.18 + vLine * 0.22) + vLine * 13.7);
    float pulse = smoothstep(0.1, 0.0, abs(vT - travel));
    float alpha = (0.05 + pulse * 0.55 + vEnergy * 0.25) * (1.0 - uScroll * 0.8);
    gl_FragColor = vec4(mix(uColorB, uColorA, pulse), alpha);
    #include <colorspace_fragment>
  }
`;

function gaussian(): number {
  // Box–Muller, clipped to keep the disc thin
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.max(-2.5, Math.min(2.5, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
}

function galaxyPoint(maxRadius: number): THREE.Vector3 {
  const r = Math.pow(Math.random(), 1.7) * maxRadius;
  const arm = Math.floor(Math.random() * ARMS);
  const angle = (arm / ARMS) * Math.PI * 2 + r * SPIN;
  const scatter = 0.25 + r * 0.12;
  return new THREE.Vector3(
    Math.cos(angle) * r + gaussian() * scatter * 0.6,
    gaussian() * 0.22 * (1.2 - r / maxRadius),
    Math.sin(angle) * r + gaussian() * scatter * 0.6,
  );
}

interface GalaxyBuffers {
  points: THREE.BufferGeometry;
  lines: THREE.BufferGeometry;
}

function buildBuffers(count: number, neuronCount: number): GalaxyBuffers {
  const total = count + neuronCount;
  const positions = new Float32Array(total * 3);
  const seeds = new Float32Array(total * 4);

  for (let i = 0; i < count; i++) {
    const p = galaxyPoint(RADIUS);
    positions.set([p.x, p.y, p.z], i * 3);
    const r = Math.hypot(p.x, p.z) / RADIUS;
    seeds.set([Math.random(), 0.6 + Math.random() * 1.2, Math.random(), Math.min(1, r * 1.3 + Math.random() * 0.25)], i * 4);
  }

  const neurons: { p: THREE.Vector3; seed: [number, number, number, number] }[] = [];
  for (let n = 0; n < neuronCount; n++) {
    const p = galaxyPoint(RADIUS * 0.62);
    p.y *= 2.2;
    const seed: [number, number, number, number] = [0.85 + Math.random() * 0.15, 3.2 + Math.random() * 2.6, Math.random(), 0.05];
    neurons.push({ p, seed });
    const i = count + n;
    positions.set([p.x, p.y, p.z], i * 3);
    seeds.set(seed, i * 4);
  }

  const points = new THREE.BufferGeometry();
  points.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  points.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  points.computeBoundingSphere();

  // wire each neuron to its nearest neighbours (O(n²), n ≤ ~220)
  const MAX_LINKS = 3;
  const MAX_DIST = 1.9;
  const seen = new Set<string>();
  const segs: [number, number][] = [];
  for (let a = 0; a < neurons.length; a++) {
    const na = neurons[a];
    if (!na) continue;
    const nearest = neurons
      .map((nb, b) => ({ b, d: b === a ? Infinity : na.p.distanceTo(nb.p) }))
      .filter((x) => x.d < MAX_DIST)
      .sort((x, y) => x.d - y.d)
      .slice(0, MAX_LINKS);
    for (const { b } of nearest) {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      segs.push([a, b]);
    }
  }

  const lp = new Float32Array(segs.length * 6);
  const ls = new Float32Array(segs.length * 8);
  const lt = new Float32Array(segs.length * 2);
  const ll = new Float32Array(segs.length * 2);
  segs.forEach(([a, b], i) => {
    const na = neurons[a];
    const nb = neurons[b];
    if (!na || !nb) return;
    lp.set([na.p.x, na.p.y, na.p.z, nb.p.x, nb.p.y, nb.p.z], i * 6);
    ls.set([...na.seed, ...nb.seed], i * 8);
    lt.set([0, 1], i * 2);
    const id = Math.random();
    ll.set([id, id], i * 2);
  });

  const lines = new THREE.BufferGeometry();
  lines.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  lines.setAttribute("aSeed", new THREE.BufferAttribute(ls, 4));
  lines.setAttribute("aT", new THREE.BufferAttribute(lt, 1));
  lines.setAttribute("aLine", new THREE.BufferAttribute(ll, 1));
  lines.computeBoundingSphere();

  return { points, lines };
}

export default function ParticleGalaxy({ count, neurons }: ParticleGalaxyProps) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const buffers = useMemo(() => buildBuffers(count, neurons), [count, neurons]);

  // one uniform object shared by both materials → one write per frame
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uPointer: { value: new THREE.Vector3(999, 999, 999) },
      uImpulseOrigin: { value: new THREE.Vector3() },
      uImpulse: { value: 0 },
      uImpulseAge: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 26 },
      uColorA: { value: new THREE.Color("#00F0FF") },
      uColorB: { value: new THREE.Color("#6366F1") },
      uColorHot: { value: new THREE.Color("#E0FDFF") },
      uMode: { value: 0 },
    }),
    [],
  );

  const materials = useMemo(() => {
    const common = { uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
    return {
      points: new THREE.ShaderMaterial({ ...common, vertexShader: POINTS_VERT, fragmentShader: POINTS_FRAG }),
      lines: new THREE.ShaderMaterial({ ...common, vertexShader: LINES_VERT, fragmentShader: LINES_FRAG }),
    };
  }, [uniforms]);

  useEffect(
    () => () => {
      buffers.points.dispose();
      buffers.lines.dispose();
    },
    [buffers],
  );
  useEffect(
    () => () => {
      materials.points.dispose();
      materials.lines.dispose();
    },
    [materials],
  );

  // scratch objects reused every frame (no per-frame allocation)
  const scratch = useMemo(
    () => ({
      ray: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      ndc: new THREE.Vector2(),
      hit: new THREE.Vector3(),
      lastImpulse: 0,
      scroll: 0,
    }),
    [],
  );

  useFrame((state, delta) => {
    const { pointer, scroll, impulse, heroMode } = useSceneStore.getState();
    const dt = Math.min(delta, 1 / 20);
    uniforms.uTime.value += dt;
    uniforms.uPixelRatio.value = state.gl.getPixelRatio();

    // mode: 0 neural (cyan/indigo), 1 defense (red/cyan threat matrix)
    const targetMode = heroMode === "defense" ? 1 : 0;
    uniforms.uMode.value = THREE.MathUtils.damp(uniforms.uMode.value, targetMode, 4, dt);
    const m = uniforms.uMode.value;
    uniforms.uColorA.value.set("#00F0FF").lerp(SCRATCH_RED, m * 0.85);
    uniforms.uColorB.value.set("#6366F1").lerp(SCRATCH_RED2, m);

    // scroll → uniforms, eased so Lenis' own smoothing isn't doubled into jitter
    scratch.scroll = THREE.MathUtils.damp(scratch.scroll, scroll.hero, 6, dt);
    uniforms.uScroll.value = scratch.scroll;

    // pointer → world point on the z = 0 plane
    scratch.ndc.set(pointer.x, pointer.y);
    scratch.ray.setFromCamera(scratch.ndc, camera);
    if (pointer.active && scratch.ray.ray.intersectPlane(scratch.plane, scratch.hit)) {
      uniforms.uPointer.value.lerp(scratch.hit, 1 - Math.exp(-10 * dt));
    }

    // click impulse → shockwave origin + decaying amplitude
    if (impulse.at !== scratch.lastImpulse) {
      scratch.lastImpulse = impulse.at;
      scratch.ndc.set(impulse.x, impulse.y);
      scratch.ray.setFromCamera(scratch.ndc, camera);
      if (scratch.ray.ray.intersectPlane(scratch.plane, scratch.hit)) uniforms.uImpulseOrigin.value.copy(scratch.hit);
    }
    const age = impulse.at > 0 ? (performance.now() - impulse.at) / 1000 : 99;
    uniforms.uImpulseAge.value = age;
    uniforms.uImpulse.value = age < 4 ? Math.exp(-age * 1.1) : 0;

    // parallax + scroll tilt
    const g = group.current;
    if (g) {
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -1.05 + pointer.y * 0.12 + scratch.scroll * 0.5, 3, dt);
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, 0.35 - pointer.x * 0.1, 3, dt);
      g.position.x = THREE.MathUtils.damp(g.position.x, state.size.width < 768 ? 0 : 1.6, 4, dt);
      g.position.y = -scratch.scroll * 2.4;
    }
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.6, 2.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pointer.y * 0.35, 2.5, dt);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={group} rotation={[-1.05, 0, 0.35]}>
      <points geometry={buffers.points} material={materials.points} frustumCulled={false} />
      <lineSegments geometry={buffers.lines} material={materials.lines} frustumCulled={false} />
    </group>
  );
}
