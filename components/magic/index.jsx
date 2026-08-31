"use client";

/**
 * The three sanctioned motion moments, and nothing else.
 *
 * Ported to JSX from the Magic UI registry (magicui.design) because this is a
 * JavaScript project. APIs are kept identical to upstream so they stay easy to
 * diff. All three animate transform/opacity only, all three respect
 * prefers-reduced-motion, and the budget that governs them is DESIGN.md §9.
 */

import { useEffect, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

/* -- Moment 1 + 3: headline figures count up once, on entry. --------------- */
export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  decimalPlaces = 0,
  suffix = "",
  prefix = "",
  className,
  ...props
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(startValue);
  const spring = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const inView = useInView(ref, { once: true, margin: "0px" });

  const format = (n) =>
    prefix +
    Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(n.toFixed(decimalPlaces))) +
    suffix;

  useEffect(() => {
    // Reduced motion still gets the number, just without the travel.
    if (reduced) {
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    if (!inView) return;
    const t = setTimeout(() => motionValue.set(value), delay * 1000);
    return () => clearTimeout(t);
  }, [motionValue, inView, delay, value, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduced) return;
    return spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = format(latest);
    });
  }, [spring, decimalPlaces, prefix, suffix, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span ref={ref} className={cn("tabular-nums", className)} {...props}>
      {format(reduced ? value : startValue)}
    </span>
  );
}

/* -- Moment 2: the ranked sweep cascades in worst-first. ------------------- */
export function BlurFade({
  children,
  className,
  duration = 0.32,
  delay = 0,
  offset = 6,
  blur = "5px",
  inView = false,
  inViewMargin = "-40px",
  ...props
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const show = reduced || (!inView || inViewResult);

  const variants = {
    hidden: { y: offset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: 0, opacity: 1, filter: "blur(0px)" },
  };

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={show ? "visible" : "hidden"}
        exit="hidden"
        variants={variants}
        transition={{ delay: 0.04 + delay, duration, ease: "easeOut" }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* -- Moment 3: one card, once, when three rounds of training land. --------- */
export function BorderBeam({
  className,
  size = 120,
  duration = 7,
  colorFrom = "var(--color-signal)",
  colorTo = "var(--color-caught)",
  borderWidth = 1,
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{ borderWidth: `${borderWidth}px` }}
    >
      <motion.div
        className={cn(
          "absolute aspect-square bg-gradient-to-l from-(--beam-from) via-(--beam-to) to-transparent",
          className
        )}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          "--beam-from": colorFrom,
          "--beam-to": colorTo,
        }}
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ repeat: Infinity, ease: "linear", duration }}
      />
    </div>
  );
}
