"use client";

/**
 * Cockpit ambient scene — "an account under attack, scored by two detectors".
 *
 * Abstract and geometric, never literal. Every shape maps to something the
 * product actually models:
 *
 *   node sphere    the account and its transaction graph
 *   ember pulse    the red team's attack travelling toward it
 *   two rings      the hardened and legacy detectors watching
 *
 * COLOUR: this is chrome, so it uses chrome colours only — azure for the blue
 * team, ember for the red team, muted slate for the account itself. The
 * caught/review/evaded trio is reserved for data and never appears here. See
 * the scope rule in DESIGN.md §2.
 *
 * Geometry is generated procedurally: no .glb, no .gltf, no asset pipeline.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useReducedMotion } from "motion/react";
// Named imports rather than `import * as THREE` so the bundler can drop the
// rest of the library.
import { AdditiveBlending, Color, QuadraticBezierCurve3, Vector3 } from "three";

const SIGNAL = "#f7931a";  /* Bitcoin orange — the hardened detector */
const FLAME  = "#ea580c";  /* burnt orange   — the red team's attack */
const GOLD   = "#ffd600";  /* digital gold   — value under threat   */
const SLATE  = "#7f9cc4";  /* the account graph itself              */

/* Bloom keys off luminance, so anything meant to glow has to clear the
   threshold. These multipliers push the emitters into HDR; the wireframe and
   point cloud stay below it deliberately, so structure reads as structure and
   only the light sources bloom. */
const EMIT_PULSE = 1.55;
const EMIT_RING = 1.25;

/* Budget. Kept deliberately small — this is ambient, not a hero render. */
const NODES = 190;

/** Even point distribution on a sphere. Deterministic, so it never flickers. */
function fibonacciSphere(count, radius) {
  const pts = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts[i * 3] = Math.cos(theta) * r * radius;
    pts[i * 3 + 1] = y * radius;
    pts[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return pts;
}

/**
 * Travel.
 *
 * Spinning in place was the problem: the graph changed pose but never changed
 * where it was, so the eye read it as a still object with a texture on it.
 * This moves the whole graph between waypoints on a loop — it eases out of
 * one position, crosses, and settles into the next, then holds for a beat
 * before moving on.
 *
 * smoothstep on the leg parameter is what makes it read as deliberate travel
 * rather than a constant slide: it accelerates away and decelerates in.
 */
/* Biased to the right of the frame on purpose. Travel is only worth having if
   the copy stays readable, and the earlier path swung far enough left that the
   wireframe crossed the hero paragraph. Lateral movement is now bounded and
   the range it gives up is taken back on depth (z), which changes apparent
   size and reads as travel just as clearly. */
const WAYPOINTS = [
  new Vector3(0.34, 0.02, 0.0),
  new Vector3(0.02, 0.24, 0.5),
  new Vector3(0.52, -0.2, -0.35),
  new Vector3(0.18, -0.22, 0.3),
  new Vector3(0.6, 0.26, -0.1),
];

const LEG_SECONDS = 4.2;   // time crossing between two waypoints
const DWELL_SECONDS = 1.4; // time held at each

function Travelling({ still, children }) {
  const group = useRef();
  const from = useMemo(() => new Vector3(), []);
  const to = useMemo(() => new Vector3(), []);

  useFrame((state) => {
    if (!group.current) return;

    if (still) {
      group.current.position.copy(WAYPOINTS[1]);
      return;
    }

    const cycle = LEG_SECONDS + DWELL_SECONDS;
    const t = state.clock.elapsedTime;
    const leg = Math.floor(t / cycle);
    const within = (t % cycle) / LEG_SECONDS; // >1 during the dwell

    from.copy(WAYPOINTS[leg % WAYPOINTS.length]);
    to.copy(WAYPOINTS[(leg + 1) % WAYPOINTS.length]);

    const raw = Math.min(1, within);
    const eased = raw * raw * (3 - 2 * raw); // smoothstep

    group.current.position.lerpVectors(from, to, eased);
  });

  return <group ref={group}>{children}</group>;
}

/**
 * The account graph.
 *
 * The first version rotated a uniformly-distributed sphere, which is close to
 * invisible: an even point cloud on a symmetric hull looks the same at every
 * angle, so rotation alone reads as a still image. Four things now carry the
 * motion, and all of them change the silhouette or the brightness rather than
 * just the orientation:
 *
 *   compound spin  three axes at unrelated rates, so the wireframe never
 *                  repeats a pose the eye has just seen
 *   breathing      the whole graph expands and contracts slightly
 *   twinkle        each node has its own phase, so the cloud shimmers — this
 *                  is what makes it read as a live network rather than dots
 *   traffic        packets run the surface, and the graph flares when the
 *                  attack lands
 */
function AccountGraph({ still, progress }) {
  const group = useRef();
  const shader = useRef();
  const inner = useRef();

  const positions = useMemo(() => fibonacciSphere(NODES, 1.35), []);

  // One random phase per node, fixed for the lifetime of the scene so the
  // shimmer is stable rather than reshuffling every frame.
  const phases = useMemo(() => {
    const a = new Float32Array(NODES);
    for (let i = 0; i < NODES; i += 1) a[i] = Math.random();
    return a;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 21 },
      uColor: { value: new Color("#9aa8bd") },
      uFlare: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    if (shader.current) {
      shader.current.uniforms.uTime.value = still ? 2.4 : t;
      // The graph flares as the attack arrives, then settles.
      const p = Math.min(progress.current, 1);
      const arrival = p > 0.8 ? (p - 0.8) / 0.2 : 0;
      shader.current.uniforms.uFlare.value = still ? 0.25 : arrival * arrival;
    }

    if (still) return;

    // Three unrelated rates: the pose never repeats within a viewing.
    group.current.rotation.y += delta * 0.34;
    group.current.rotation.x = Math.sin(t * 0.31) * 0.26;
    group.current.rotation.z = Math.cos(t * 0.19) * 0.14;

    // Breathing, plus a sharper pulse when the attack lands.
    const p = Math.min(progress.current, 1);
    const arrival = p > 0.86 ? (p - 0.86) / 0.14 : 0;
    const breathe = 1 + Math.sin(t * 0.85) * 0.035 + arrival * arrival * 0.06;
    group.current.scale.setScalar(breathe);

    // The hull counter-rotates a little, so the two layers separate visually
    // instead of moving as one solid object.
    if (inner.current) inner.current.rotation.y -= delta * 0.16;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
        </bufferGeometry>
        {/* A shader rather than pointsMaterial, because per-node twinkle is the
            whole effect and pointsMaterial can only size every point alike. */}
        <shaderMaterial
          ref={shader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexShader={`
            attribute float phase;
            uniform float uTime;
            uniform float uSize;
            uniform float uFlare;
            varying float vT;
            void main() {
              float tw = 0.5 + 0.5 * sin(uTime * 1.7 + phase * 6.2831853);
              vT = tw + uFlare * 0.30;
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = uSize * (0.50 + vT * 0.55) / -mv.z;
              gl_Position = projectionMatrix * mv;
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            uniform float uFlare;
            varying float vT;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              float d = dot(c, c);
              if (d > 0.25) discard;
              float a = smoothstep(0.25, 0.0, d);
              vec3 col = mix(uColor, vec3(1.0, 0.74, 0.34), clamp(uFlare * 0.45, 0.0, 1.0));
              gl_FragColor = vec4(col * (0.55 + vT * 0.45), a * (0.26 + vT * 0.40));
            }
          `}
        />
      </points>

      {/* Sparse hull: reads as the graph's structure without costing polys. */}
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.34, 1]} />
        <meshBasicMaterial
          color={SIGNAL}
          wireframe
          transparent
          opacity={0.16}
        />
      </mesh>
    </group>
  );
}

/**
 * Packets moving over the account's surface.
 *
 * Ordinary traffic, so it is deliberately quiet: small, slate-coloured, and
 * on its own orbit. It exists to give the graph internal movement that does
 * not depend on the attack cycle, so the scene is never completely still
 * between approaches.
 */
const PACKETS = 5;

function Traffic({ still }) {
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: PACKETS }, () => ({
        radius: 1.45 + Math.random() * 0.22,
        speed: 0.25 + Math.random() * 0.35,
        tilt: Math.random() * Math.PI,
        phase: Math.random() * Math.PI * 2,
      })),
    []
  );

  useFrame((state) => {
    const t = still ? 1.2 : state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      const a = s.phase + t * s.speed;
      const x = Math.cos(a) * s.radius;
      const z = Math.sin(a) * s.radius;
      m.position.set(
        x,
        Math.sin(a * 1.3 + s.tilt) * s.radius * 0.42,
        z * Math.cos(s.tilt)
      );
    });
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshBasicMaterial
            color={SLATE}
            transparent
            opacity={0.85}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The red team's approach.
 *
 * One ember head on a curved path toward the account, with a short trail. The
 * curve arcs rather than running straight, because the planner's whole premise
 * is that an attack approaches obliquely — it probes the softest surface rather
 * than charging the front door.
 *
 * `progress` is shared upward so the detector rings can react to the arrival
 * instead of animating on an unrelated timer.
 */
const TRAIL = 5;

function AttackPulse({ progress, still }) {
  const head = useRef();
  const trail = useRef([]);

  // A fixed arc. Built once — allocating a curve per frame would be the single
  // most expensive thing in this scene.
  const curve = useMemo(
    () =>
      // Kept inside the camera frustum. At fov 42 / z 4.6 the visible
      // half-width at the origin plane is ~3.1 and half-height ~1.8, so an
      // earlier start of (4.2, 2.0) spent most of the approach off-screen.
      new QuadraticBezierCurve3(
        new Vector3(2.55, 1.42, -0.6),
        new Vector3(1.75, 1.05, 1.9),
        new Vector3(0, 0, 0)
      ),
    []
  );

  const point = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    if (!head.current) return;

    if (still) {
      // Static frame: park the pulse mid-approach so the story still reads.
      curve.getPointAt(0.55, point);
      head.current.position.copy(point);
      trail.current.forEach((m, i) => {
        if (!m) return;
        curve.getPointAt(Math.max(0, 0.55 - (i + 1) * 0.032), point);
        m.position.copy(point);
      });
      return;
    }

    // 0 → 1 over ~4.4s, then a beat of nothing before the next approach.
    progress.current = (progress.current + delta * 0.26) % 1.1;
    const t = Math.min(progress.current, 1);

    curve.getPointAt(t, point);
    head.current.position.copy(point);

    // Shrink into the surface on arrival rather than clipping through it.
    const s = t > 0.93 ? Math.max(0, 1 - (t - 0.93) / 0.07) : 1;
    head.current.scale.setScalar(s);

    trail.current.forEach((m, i) => {
      if (!m) return;
      const tt = Math.max(0, t - (i + 1) * 0.032);
      curve.getPointAt(tt, point);
      m.position.copy(point);
      m.scale.setScalar(s * (1 - (i + 1) / (TRAIL + 1)));
    });
  });

  return (
    <group>
      {/* Core plus an additively-blended halo. Additive blending is what makes
          overlapping bright geometry read as light rather than as paint, and
          it costs one extra draw call instead of a full-screen bloom pass. */}
      <mesh ref={head}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshBasicMaterial
          color={GOLD}
          toneMapped={false}
          ref={(m) => m && m.color.multiplyScalar(EMIT_PULSE)}
        />
        <mesh scale={2.6}>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshBasicMaterial
            color={FLAME}
            transparent
            opacity={0.45}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh scale={5.2}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <meshBasicMaterial
            color={FLAME}
            transparent
            opacity={0.16}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </mesh>
      {Array.from({ length: TRAIL }).map((_, i) => (
        <mesh key={i} ref={(el) => (trail.current[i] = el)}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshBasicMaterial
            color={FLAME}
            transparent
            opacity={0.5 - i * 0.08}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The two detectors, as rings around the account.
 *
 * The hardened scorer reacts to the arrival — it brightens and flexes. The
 * legacy ring barely moves, because that is the product's actual finding:
 * flat static thresholds do not fire on a sequence tuned to sit under them.
 * The asymmetry is the argument, so it is built into the motion rather than
 * decorating it.
 */
function DetectorRing({ radius, tilt, color, opacity, reactivity, progress, still, speed, emissive = false }) {
  const ring = useRef();
  const mat = useRef();

  useFrame((_, delta) => {
    if (!ring.current || !mat.current) return;

    // How close the attack is to landing, 0..1, sharply weighted to the end.
    const t = Math.min(progress.current, 1);
    const arrival = t > 0.72 ? (t - 0.72) / 0.28 : 0;
    const react = still ? 0.35 : arrival * arrival * reactivity;

    mat.current.opacity = opacity + react * 0.55;
    ring.current.scale.setScalar(1 + react * 0.055);

    if (!still) ring.current.rotation.z += delta * speed;
  });

  return (
    <mesh ref={ring} rotation={tilt}>
      {/* Low segment counts: this is a hairline ring, nobody can see the
          tessellation, and it keeps the whole scene under ~5k triangles. */}
      <torusGeometry args={[radius, 0.007, 6, 96]} />
      <meshBasicMaterial
        ref={(m) => {
          mat.current = m;
          if (m && emissive) m.color.multiplyScalar(EMIT_RING);
        }}
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Camera rig.
 *
 * Two inputs, both cheap, both lerped so nothing snaps:
 *
 *   pointer  the scene leans a few degrees toward the cursor, which is what
 *            makes a static render read as an object in a room rather than a
 *            picture of one.
 *   scroll   the camera pulls back and drops as the hero leaves the viewport,
 *            so the object recedes rather than sliding away flatly.
 *
 * Both are damped toward a target every frame instead of being written
 * directly, so a fast flick of the mouse does not jolt the scene.
 */
function CameraRig({ still }) {
  const { camera, pointer } = useThree();
  const scroll = useRef(0);
  const target = useMemo(() => new Vector3(), []);

  useEffect(() => {
    if (still) return;
    const onScroll = () => {
      // 0 at the top, 1 once the hero is a viewport away.
      scroll.current = Math.min(1, window.scrollY / 620);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [still]);

  useFrame((_, delta) => {
    if (still) return;
    const k = 1 - Math.pow(0.0015, delta); // frame-rate independent damping

    target.set(
      pointer.x * 0.42,
      pointer.y * 0.3 - scroll.current * 0.55,
      4.6 + scroll.current * 1.15
    );
    camera.position.lerp(target, k);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function AccountScene() {
  const reduced = useReducedMotion();
  const progress = useRef(0);
  // Ceiling on pixel ratio, lowered automatically if the device struggles.
  const [dpr, setDpr] = useState(1.5);

  // Degradation is a ONE-WAY latch, and it has to be.
  //
  // Tying bloom to `dpr` directly produced a feedback loop: dpr drops, bloom
  // switches off, the frame rate recovers, PerformanceMonitor reads that as
  // headroom and raises dpr, bloom returns, the frame rate craters again.
  // Measured on software GL the canvas oscillated 780px <-> 520px
  // indefinitely at 14/61/14/57 fps. Once a device has told us it cannot
  // afford the composer, we believe it and stop asking.
  const [degraded, setDegraded] = useState(false);

  return (
    <Canvas
      // Ambient decoration: never take pointer events from the hero controls.
      style={{ pointerEvents: "none" }}
      // Cap the pixel ratio. The scene is soft-edged, so 1.5 is indistinguishable
      // from 2 here and costs meaningfully less on high-DPI displays.
      dpr={dpr}
      // Reduced motion renders exactly one frame and then stops entirely,
      // rather than animating slower. Zero ongoing cost.
      frameloop={reduced ? "demand" : "always"}
      camera={{ position: [0, 0, 4.6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      // If WebGL is unavailable the hero simply has no scene behind it.
      fallback={null}
    >
      {/* Degrade resolution before dropping frames. If sustained FPS falls the
          pixel ratio steps down; if there is headroom it steps back up. On a
          soft-edged scene like this the change is close to invisible.
          (drei's <AdaptiveDpr> was tried here and removed: it only acts "on
          regress", and nothing in this scene calls regress() — there are no
          camera controls — so it was inert.) */}
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          setDegraded(true);
        }}
        // Resolution may climb back; the composer may not. Re-enabling it is
        // what created the oscillation.
        onIncline={() => setDpr((d) => (degraded ? d : 1.5))}
      />

      <CameraRig still={reduced} />

      <Travelling still={reduced}>
        <AccountGraph still={reduced} progress={progress} />
        <Traffic still={reduced} />
      </Travelling>

      {/* Detector rings sit outside the travelling group deliberately: they
          watch a fixed region while the account moves through it. */}
      {/* Hardened: tighter orbit, reacts hard to the arrival. */}
      <DetectorRing
        radius={1.72}
        tilt={[1.32, 0.22, 0]}
        color={SIGNAL}
        opacity={0.32}
        emissive
        reactivity={1}
        speed={0.18}
        progress={progress}
        still={reduced}
      />
      {/* Legacy: wider, dimmer, and almost inert when the attack lands. */}
      <DetectorRing
        radius={2.05}
        tilt={[1.5, -0.36, 0.5]}
        color={SLATE}
        opacity={0.16}
        reactivity={0.12}
        speed={-0.1}
        progress={progress}
        still={reduced}
      />

      <AttackPulse progress={progress} still={reduced} />

      {/* Real bloom rather than faked halos. mipmapBlur gives a wide, soft
          falloff at a fraction of the cost of a large gaussian kernel, and the
          luminance threshold is set just under the emitter multipliers so the
          wireframe and point cloud never bloom — only the light sources do.

          Dropped permanently once the device reports it cannot keep up: the
          composer is the first thing worth losing, and the scene still reads
          without it. Latched rather than reactive — see the note on `degraded`
          above for the oscillation this avoids. */}
      {!degraded ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={0.5}
            luminanceThreshold={1.0}
            luminanceSmoothing={0.22}
            mipmapBlur
            radius={0.5}
          />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
