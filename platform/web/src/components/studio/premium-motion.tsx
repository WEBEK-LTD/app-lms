/**
 * 129.1–129.8 Studio's premium motion and media on the canvas, as the app
 * draws them (mobile/lib/modules/shared/pages/studio_motion.dart and the
 * files beside it): a slider's frosted pill and slow zoom, and the
 * keyframes the premium elements move with. Every animation stops when the
 * computer asks to reduce motion.
 */

/** The keyframes, once per canvas. */
export const PREMIUM_MOTION_CSS = `
@keyframes studio-ken-burns { from { transform: scale(1); } to { transform: scale(1.1); } }
[data-studio-ken-burns] [data-studio-cover] img, [data-studio-ken-burns] [data-studio-node] > img { animation: studio-ken-burns 8s ease-in-out infinite alternate; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  [data-studio-ken-burns] [data-studio-cover] img, [data-studio-ken-burns] [data-studio-node] > img { animation: none; }
}
`;

export function PremiumMotionStyles() {
  return <style data-studio-premium-motion="">{PREMIUM_MOTION_CSS}</style>;
}

/** 129.1 Where a slider is: its dots in a frosted pill over its slides' foot, the first one open. */
export function SliderPill({ count }: { count: number }) {
  return (
    <span data-studio-indicator="pill" aria-hidden="true" style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5, padding: "7px 10px", borderRadius: 999, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 3, background: i === 0 ? "#FFFFFF" : "rgba(255,255,255,0.55)" }} />
      ))}
    </span>
  );
}
