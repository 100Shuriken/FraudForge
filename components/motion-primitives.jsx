"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Scroll reveal. MOTION_INTENSITY 5 means content enters as you reach it and
 * controls respond to the pointer, but nothing pins or hijacks the scroll.
 *
 * Motivation (Section 5, "motion must be motivated"): sequence. The page makes
 * an argument in order, and revealing each step as it arrives keeps the reader
 * on the current claim instead of scanning ahead.
 */
export function Reveal({ children, delay = 0, y = 20, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered list reveal. Same motivation, applied to sibling items. */
export function RevealGroup({ children, className, stagger = 0.07 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: reduce ? 0 : stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 18 },
        shown: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hover lift for the two primary cards. Feedback motivation: the card is a
 * link target, so it should acknowledge the pointer.
 */
export function Lift({ children, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
