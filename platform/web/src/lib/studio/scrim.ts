import type { StudioScrim } from "../pages/types";

/**
 * 128 A shade over a picture so the words on it read (`StudioScrim`): its
 * colour darker at the two ends of its direction and clear in between, as
 * a photo hero with its title at the foot or a photo tile with its caption
 * needs. Drawn the same on Studio's canvas (CSS) and in the app
 * (mobile/lib/modules/shared/pages/studio_scrim.dart).
 */

/** The shades a new one starts with: darker at the foot, a little at the top, for words over a photo. */
export const SCRIM_DEFAULT: StudioScrim = { color: "#000000", from: 0.35, middle: 0.05, at: 40, to: 0.7 };

/** Its stops along its direction: how dark (0 to 1) at which point (0 to 100). */
export function scrimStops(scrim: StudioScrim): { at: number; opacity: number }[] {
  return [{ at: 0, opacity: scrim.from }, ...(scrim.middle !== undefined ? [{ at: scrim.at ?? 50, opacity: scrim.middle }] : []), { at: 100, opacity: scrim.to }];
}

/** Its CSS gradient; across (90) it runs from the start, so right to left in Arabic. */
export function scrimCss(scrim: StudioScrim, rtl = false): string {
  const n = parseInt(scrim.color.slice(1), 16);
  const rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  const angle = scrim.angle ?? 180;
  const deg = rtl ? (360 - angle) % 360 : angle;
  return `linear-gradient(${deg}deg, ${scrimStops(scrim)
    .map((s) => `rgba(${rgb}, ${s.opacity}) ${s.at}%`)
    .join(", ")})`;
}
