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

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
// Named imports rather than `import * as THREE` so the bundler can drop the
// rest of the library.
import { QuadraticBezierCurve3, Vector3 } from "three";

const AZURE = "#4b9ef8";
const EMBER = "#f76b44";
const SLATE = "#7f9cc4";

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

/** The account: a point cloud with a sparse wireframe hull behind it. */
function AccountGraph({ still }) {
  const group = useRef();
  const positions = useMemo(() => fibonacciSphere(NODES, 1.35), []);

  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x = Math.sin(Date.now() * 0.00012) * 0.12;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color={SLATE}
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>

      {/* Sparse hull: reads as the graph's structure without costing polys. */}
      <mesh>
        <icosahedronGeometry args={[1.34, 1]} />
        <meshBasicMaterial
          color={AZURE}
          wireframe
          transparent
          opacity={0.14}
        />
      </mesh>
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
      <mesh ref={head}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshBasicMaterial color={EMBER} toneMapped={false} />
      </mesh>
      {Array.from({ length: TRAIL }).map((_, i) => (
        <mesh key={i} ref={(el) => (trail.current[i] = el)}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshBasicMaterial
            color={EMBER}
            transparent
            opacity={0.5 - i * 0.08}
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
function DetectorRing({ radius, tilt, color, opacity, reactivity, progress, still, speed }) {
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
        ref={mat}
        color={color}
        transparent
        opacity={opacity}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function AccountScene() {
  const reduced = useReducedMotion();
  const progress = useRef(0);
  // Ceiling on pixel ratio, lowered automatically if the device struggles.
  const [dpr, setDpr] = useState(1.5);

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
          soft-edged scene like this the change is close to invisible. */}
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(1.5)}
      />
      <AdaptiveDpr pixelated />

      <AccountGraph still={reduced} />

      {/* Hardened: tighter orbit, reacts hard to the arrival. */}
      <DetectorRing
        radius={1.72}
        tilt={[1.32, 0.22, 0]}
        color={AZURE}
        opacity={0.32}
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
    </Canvas>
  );
}
