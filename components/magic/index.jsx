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

/* ══════════════════════════════════════════════════════════════════════════
   Marquee — infinite smooth horizontal scroll for live attack feeds.
   ══════════════════════════════════════════════════════════════════════════ */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = true,
  children,
  vertical = false,
  repeat = 4,
  ...props
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        className={cn(
          "flex overflow-x-auto gap-4 p-2 [scrollbar-width:none]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        {
          "flex-row": !vertical,
          "flex-col": vertical,
        },
        className
      )}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
              "animate-marquee flex-row": !vertical,
              "animate-marquee-vertical flex-col": vertical,
              "group-hover:[animation-play-state:paused]": pauseOnHover,
              "[animation-direction:reverse]": reverse,
            })}
          >
            {children}
          </div>
        ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ShimmerButton — radiant high-contrast call-to-action button.
   ══════════════════════════════════════════════════════════════════════════ */
export function ShimmerButton({
  shimmerColor = "#ffffff",
  shimmerSize = "0.08em",
  shimmerDuration = "3s",
  borderRadius = "8px",
  background = "rgba(247, 147, 26, 0.95)",
  className,
  children,
  ...props
}) {
  return (
    <button
      style={{
        "--spread": "90deg",
        "--shimmer-color": shimmerColor,
        "--radius": borderRadius,
        "--speed": shimmerDuration,
        "--cut": shimmerSize,
        "--bg": background,
      }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-5 py-2.5 text-white [background:var(--bg)] [border-radius:var(--radius)] transition-transform duration-200 active:scale-95",
        className
      )}
      {...props}
    >
      {/* spark container */}
      <div className="pointer-events-none absolute -inset-px -z-30 block [border-radius:var(--radius)]">
        <div className="absolute inset-0 aspect-square h-full w-full [animation:shimmer-slide_var(--speed)_ease-in-out_infinite_alternate] [background:radial-gradient(circle,var(--shimmer-color)_10%,transparent_60%)]" />
      </div>
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AnimatedGridPattern — subtle glowing grid cells.
   ══════════════════════════════════════════════════════════════════════════ */
export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 30,
  className,
  maxOpacity = 0.5,
  duration = 4,
  ...props
}) {
  const [squares, setSquares] = useState([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    const list = Array.from({ length: numSquares }).map((_, i) => ({
      id: i,
      pos: [Math.floor(Math.random() * 20), Math.floor(Math.random() * 12)],
      delay: Math.random() * 2,
    }));
    setSquares(list);
  }, [numSquares]);

  if (reduced) return null;

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-signal/5 stroke-white/5",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id="animated-grid-pattern"
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#animated-grid-pattern)" />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [sqX, sqY], id, delay }) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, maxOpacity, 0] }}
            transition={{
              duration,
              repeat: Infinity,
              delay,
              ease: "easeInOut",
            }}
            key={id}
            width={width - 1}
            height={height - 1}
            x={sqX * width + 1}
            y={sqY * height + 1}
            fill="rgba(247, 147, 26, 0.15)"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}

