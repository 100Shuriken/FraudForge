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
import {
  AdditiveBlending,
  Color,
  IcosahedronGeometry,
  QuadraticBezierCurve3,
  Vector3,
} from "three";

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

/**
 * The lattice vertices, deduplicated.
 *
 * These have to be the icosahedron's own vertices rather than an independently
 * generated point set: a fibonacci sphere is a different distribution, so its
 * points land in the middle of faces and the glow reads as speckle laid over
 * the mesh. Taking them from the geometry puts the light exactly where the
 * edges meet, which is what makes it look like a lit structure.
 */
function latticeVertices(radius, detail) {
  const geo = new IcosahedronGeometry(radius, detail);
  const src = geo.getAttribute("position").array;
  const seen = new Set();
  const out = [];
  for (let i = 0; i < src.length; i += 3) {
    const key = `${src[i].toFixed(4)}|${src[i + 1].toFixed(4)}|${src[i + 2].toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(src[i], src[i + 1], src[i + 2]);
  }
  geo.dispose();
  return new Float32Array(out);
}

/**
 * Background starfield.
 *
 * The reference has depth behind the graph — scattered points well outside it,
 * unrelated to the account. They sit in a group that does NOT travel, so the
 * graph moves against them and the parallax gives the scene a sense of space.
 */
const STARS = 260;

function Starfield({ still }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const a = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i += 1) {
      // A shell well outside the graph so stars never sit inside the lattice.
      const r = 6 + Math.random() * 9;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      a[i * 3] = r * Math.sin(ph) * Math.cos(th);
      a[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      a[i * 3 + 2] = r * Math.cos(ph) - 6;
    }
    return a;
  }, []);

  useFrame((_, delta) => {
    if (!still && ref.current) ref.current.rotation.y += delta * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        color="#c9d2e0"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
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
  const glowMesh = useRef();
  const edgeShader = useRef();

  const positions = useMemo(() => latticeVertices(1.34, 2), []);

  // One random phase per node, fixed for the lifetime of the scene so the
  // shimmer is stable rather than reshuffling every frame. Only a third of the
  // vertices are lit at any moment — lighting all of them at once flattens the
  // mesh into a solid dotted ball.
  const phases = useMemo(() => {
    const a = new Float32Array(positions.length / 3);
    for (let i = 0; i < a.length; i += 1) a[i] = Math.random();
    return a;
  }, [positions]);

  const edgeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHot: { value: new Color("#fff0c4") },
    }),
    []
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 34 },
      uColor: { value: new Color("#ffd28a") },
      uFlare: { value: 0 },
    }),
    []
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    if (edgeShader.current) {
      edgeShader.current.uniforms.uTime.value = still ? 1.1 : t;
    }

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
    if (glowMesh.current) glowMesh.current.rotation.y -= delta * 0.16;
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
              float raw = 0.5 + 0.5 * sin(uTime * 1.3 + phase * 6.2831853);
              float tw = pow(raw, 3.0);
              vT = tw + uFlare * 0.30;
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = uSize * (0.42 + vT * 0.95) / -mv.z;
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
              // Round core plus a faint cross, so the nodes at peak twinkle
              // read as stars on the lattice rather than as soft blobs.
              float core = smoothstep(0.25, 0.0, d);
              float cross = smoothstep(0.06, 0.0, abs(c.x) * abs(c.y)) * 0.45;
              float a = clamp(core + cross * core, 0.0, 1.0);
              // Hot nodes go white; quiet ones stay the warm lattice gold.
              vec3 hot = mix(uColor, vec3(1.0, 0.97, 0.88), clamp(vT - 0.55, 0.0, 1.0) * 1.6);
              vec3 col = mix(hot, vec3(1.0, 0.82, 0.42), clamp(uFlare * 0.45, 0.0, 1.0));
              gl_FragColor = vec4(col * (0.65 + vT * 0.85), a * (0.38 + vT * 0.55));
            }
          `}
        />
      </points>

      {/* The lattice. Detail 2 rather than 1, and drawn opaque rather than at
          0.16 — the faint sparse version read as a smudge behind the pulse
          instead of as a structure the attack is arriving at. */}
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.34, 2]} />
        <meshBasicMaterial
          color={SIGNAL}
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* A second copy at a hair larger radius, additively blended and lit by
          a travelling band. This is what produces the white-hot segments
          running over the mesh: the band sweeps in local Y and only the edges
          it crosses brighten. Cheaper and steadier than animating per-edge
          colours on the buffer. */}
      <mesh ref={glowMesh} scale={1.004}>
        <icosahedronGeometry args={[1.34, 2]} />
        <shaderMaterial
          ref={edgeShader}
          wireframe
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={edgeUniforms}
          vertexShader={`
            varying vec3 vPos;
            void main() {
              vPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            uniform vec3 uHot;
            varying vec3 vPos;
            void main() {
              // Two bands at different speeds, so highlights do not pulse in
              // lockstep and the mesh never looks like it is blinking.
              float b1 = smoothstep(0.34, 0.0, abs(vPos.y - sin(uTime * 0.55) * 1.35));
              float b2 = smoothstep(0.26, 0.0, abs(vPos.x - cos(uTime * 0.37) * 1.35));
              float band = max(b1, b2 * 0.8);
              gl_FragColor = vec4(uHot * band, band * 0.95);
            }
          `}
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
const TRAIL = 26;

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

  const haloUniforms = useMemo(
    () => ({
      uInner: { value: new Color(GOLD) },
      uOuter: { value: new Color(FLAME) },
    }),
    []
  );

  useFrame((_, delta) => {
    if (!head.current) return;

    if (still) {
      // Static frame: park the pulse mid-approach so the story still reads.
      curve.getPointAt(0.55, point);
      head.current.position.copy(point);
      trail.current.forEach((m, i) => {
        if (!m) return;
        curve.getPointAt(Math.max(0, 0.55 - (i + 1) * 0.009), point);
        const spread = ((i % 5) - 2) * 0.008 * (1 + i * 0.06);
        m.position.set(
          point.x + spread,
          point.y - spread * 0.7,
          point.z + spread * 0.5
        );
        m.scale.setScalar(Math.max(0.15, 1 - i / TRAIL));
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
      const tt = Math.max(0, t - (i + 1) * 0.009);
      curve.getPointAt(tt, point);
      // Scatter each ember off the exact path so the wake has width, and let
      // it drift wider the further back it sits.
      const spread = ((i % 5) - 2) * 0.008 * (1 + i * 0.06);
      m.position.set(
        point.x + spread,
        point.y - spread * 0.7,
        point.z + spread * 0.5
      );
      m.scale.setScalar(s * Math.max(0.15, 1 - i / TRAIL));
    });
  });

  return (
    <group>
      {/* Core plus an additively-blended halo. Additive blending is what makes
          overlapping bright geometry read as light rather than as paint, and
          it costs one extra draw call instead of a full-screen bloom pass. */}
      <mesh ref={head}>
        <sphereGeometry args={[0.115, 16, 16]} />
        <meshBasicMaterial
          color={GOLD}
          toneMapped={false}
          ref={(m) => m && m.color.multiplyScalar(EMIT_PULSE)}
        />
        {/* One billboarded quad with a radial falloff, not stacked spheres.
            Solid shells have a hard silhouette, so at this scale they read as
            concentric flat discs — a bullseye rather than a light source. */}
        <mesh>
          <planeGeometry args={[1.55, 1.55]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            uniforms={haloUniforms}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                // Billboard: strip rotation out of the model-view matrix so
                // the halo always faces the camera.
                vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                mv.xy += position.xy;
                gl_Position = projectionMatrix * mv;
              }
            `}
            fragmentShader={`
              uniform vec3 uInner;
              uniform vec3 uOuter;
              varying vec2 vUv;
              void main() {
                float d = length(vUv - 0.5) * 2.0;
                if (d > 1.0) discard;
                float core = pow(1.0 - d, 3.5);
                float wide = pow(1.0 - d, 1.4) * 0.35;
                vec3 col = mix(uOuter, uInner, clamp(core * 2.0, 0.0, 1.0));
                gl_FragColor = vec4(col, clamp(core + wide, 0.0, 1.0) * 0.85);
              }
            `}
          />
        </mesh>
      </mesh>
      {Array.from({ length: TRAIL }).map((_, i) => (
        <mesh key={i} ref={(el) => (trail.current[i] = el)}>
          {/* Sizes fall off along the trail and scatter slightly, so the wake
              reads as a spray of embers rather than a string of beads. */}
          <sphereGeometry args={[0.007 + (((i * 7) % 5) / 5) * 0.019, 6, 6]} />
          <meshBasicMaterial
            color={FLAME}
            transparent
            opacity={Math.max(0.08, 0.8 - i * 0.026)}
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
      <torusGeometry args={[radius, 0.011, 8, 128]} />
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
      5.35 + scroll.current * 1.15
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
      camera={{ position: [0, 0, 5.35], fov: 42 }}
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

      <Starfield still={reduced} />

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
        opacity={0.5}
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
        opacity={0.3}
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
