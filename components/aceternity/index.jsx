"use client";

/**
 * Aceternity UI components, ported to JSX and recoloured to the fire palette.
 *
 * Ported rather than installed because the registry ships TSX and this is a
 * JavaScript project. Upstream APIs are preserved so these stay easy to diff
 * against ui.aceternity.com.
 *
 * Every one of them respects prefers-reduced-motion, which upstream mostly
 * does not, and every one is chrome — none of them ever encodes a measurement.
 */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useTransform,
  useScroll,
  useSpring,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════════════
   Spotlight — two slow conic sweeps of light across a section.

   Upstream uses `w-screen h-screen` and `z-40`, which escapes any container
   and sits above content. Both are wrong inside a bounded hero, so this port
   is contained to its parent and sits behind.
   ══════════════════════════════════════════════════════════════════════════ */
export function Spotlight({
  gradientFirst = "radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(32, 94%, 60%, 0.10) 0, hsla(24, 90%, 48%, 0.03) 50%, transparent 80%)",
  gradientSecond = "radial-gradient(50% 50% at 50% 50%, hsla(32, 94%, 60%, 0.07) 0, hsla(24, 90%, 48%, 0.02) 80%, transparent 100%)",
  gradientThird = "radial-gradient(50% 50% at 50% 50%, hsla(51, 100%, 50%, 0.05) 0, hsla(32, 94%, 60%, 0.02) 80%, transparent 100%)",
  translateY = -320,
  width = 520,
  height = 1200,
  smallWidth = 220,
  duration = 9,
  xOffset = 80,
}) {
  const reduced = useReducedMotion();
  const sweep = reduced ? {} : { x: [0, xOffset, 0] };
  const sweepBack = reduced ? {} : { x: [0, -xOffset, 0] };
  const transition = {
    duration,
    repeat: Infinity,
    repeatType: "reverse",
    ease: "easeInOut",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4 }}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <motion.div
        animate={sweep}
        transition={transition}
        className="pointer-events-none absolute inset-0"
      >
        <div style={{ transform: `translateY(${translateY}px) rotate(-45deg)`, background: gradientFirst, width, height }} className="absolute top-0 left-0" />
        <div style={{ transform: "rotate(-45deg) translate(5%, -50%)", background: gradientSecond, width: smallWidth, height }} className="absolute top-0 left-0 origin-top-left" />
        <div style={{ transform: "rotate(-45deg) translate(-180%, -70%)", background: gradientThird, width: smallWidth, height }} className="absolute top-0 left-0 origin-top-left" />
      </motion.div>

      <motion.div
        animate={sweepBack}
        transition={transition}
        className="pointer-events-none absolute inset-0"
      >
        <div style={{ transform: `translateY(${translateY}px) rotate(45deg)`, background: gradientFirst, width, height }} className="absolute top-0 right-0" />
        <div style={{ transform: "rotate(45deg) translate(-5%, -50%)", background: gradientSecond, width: smallWidth, height }} className="absolute top-0 right-0 origin-top-right" />
        <div style={{ transform: "rotate(45deg) translate(180%, -70%)", background: gradientThird, width: smallWidth, height }} className="absolute top-0 right-0 origin-top-right" />
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CardSpotlight — a warm radial that tracks the cursor across a card.

   Upstream mounts a <CanvasRevealEffect> (a WebGL canvas) inside every card
   on hover. Identify renders 28 cards and browsers cap concurrent WebGL
   contexts around 16, so that version is not usable here. The cursor-tracked
   radial is the part that actually reads, and it costs nothing: two motion
   values and a CSS gradient, no canvas, no per-card context.
   ══════════════════════════════════════════════════════════════════════════ */
export function CardSpotlight({ children, radius = 320, className, ...props }) {
  const reduced = useReducedMotion();
  const mouseX = useMotionValue(-radius);
  const mouseY = useMotionValue(-radius);

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, rgba(247,147,26,0.12), transparent 72%)`;

  function onMouseMove({ currentTarget, clientX, clientY }) {
    if (reduced) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn("group/spotlight relative", className)}
      onMouseMove={onMouseMove}
      {...props}
    >
      {!reduced ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-px z-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
          style={{ background }}
        />
      ) : null}
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TracingBeam — a beam that fills as the reader scrolls a sequence.

   Used on /method for the closed loop, where it is doing real work: the loop
   is an ordered process, and the beam draws the reader through it in order.
   Recoloured flame → signal → gold, and it collapses to a static rule under
   reduced motion.
   ══════════════════════════════════════════════════════════════════════════ */
export function TracingBeam({ children, className }) {
  const ref = useRef(null);
  const contentRef = useRef(null);
  const reduced = useReducedMotion();
  const [svgHeight, setSvgHeight] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end start"],
  });

  useEffect(() => {
    if (!contentRef.current) return;
    const measure = () => setSvgHeight(contentRef.current.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  const spring = { stiffness: 500, damping: 90 };
  const y1 = useSpring(useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]), spring);
  const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]), spring);

  return (
    <motion.div ref={ref} className={cn("relative w-full", className)}>
      <div className="absolute top-3 -left-4 hidden md:block" aria-hidden>
        <span className="ml-[23px] grid h-4 w-4 place-items-center rounded-full border border-signal/40">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
        </span>
        <svg viewBox={`0 0 20 ${svgHeight}`} width="20" height={svgHeight} className="ml-4 block">
          {/* The rail: always visible, so the sequence reads even before scroll
              and for anyone who never scrolls it into view. */}
          <path
            d={`M 1 0 V ${svgHeight}`}
            fill="none"
            stroke="var(--color-edge)"
            strokeWidth="1.25"
          />
          {!reduced ? (
            <>
              <motion.path
                d={`M 1 0 V ${svgHeight}`}
                fill="none"
                stroke="url(#ff-beam)"
                strokeWidth="1.75"
              />
              <defs>
                <motion.linearGradient id="ff-beam" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y1} y2={y2}>
                  <stop stopColor="var(--color-flame)" stopOpacity="0" />
                  <stop stopColor="var(--color-flame)" />
                  <stop offset="0.4" stopColor="var(--color-signal)" />
                  <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0" />
                </motion.linearGradient>
              </defs>
            </>
          ) : null}
        </svg>
      </div>
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}
