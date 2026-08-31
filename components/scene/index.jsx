"use client";

/**
 * Lazy boundary for the Cockpit ambient scene.
 *
 * three + @react-three/fiber + drei are far too heavy to sit in the initial
 * bundle for a page whose job is to show fraud numbers, so the scene is
 * dynamically imported with `ssr: false` and nothing is fetched until after
 * the page is interactive. Until then — and forever, if WebGL is unavailable
 * or the import fails — the hero renders exactly as it did before.
 */

import dynamic from "next/dynamic";

const AccountScene = dynamic(() => import("./account-scene"), {
  ssr: false,
  loading: () => null,
});

export function CockpitScene() {
  return (
    <div
      aria-hidden
      // Right half of the hero, which was empty space before. Sits behind the
      // text and never over the controls: no pointer events, and the hero's
      // own content stacks above it.
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] max-w-[520px] lg:block"
      style={{
        // Fades into the panel on the left so it reads as part of the surface
        // rather than a pasted-on widget, and never competes with the headline.
        maskImage:
          "linear-gradient(to right, transparent 0%, #000 38%, #000 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, #000 38%, #000 100%)",
      }}
    >
      <AccountScene />
    </div>
  );
}
