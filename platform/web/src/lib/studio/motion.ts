import type { StudioMotion } from "../pages/types";

/**
 * 129.8 How an element comes in when it first shows (`StudioMotion.enter`),
 * as the app plays it (mobile/lib/modules/shared/pages/studio_page.dart
 * `_Moving`): fading in, rising, coming down, from the start or the end
 * side (mirrored in Arabic), or growing. Studio's canvas plays it once when
 * the element first comes into view, and again when its entrance changes;
 * never when the computer asks to reduce motion.
 */

export const ENTRANCE_EASING = "cubic-bezier(.2,.8,.2,1)";

/** Where the element starts from; null for none. */
export function entranceFrom(enter: StudioMotion["enter"], rtl: boolean): Keyframe | null {
  switch (enter) {
    case "fade":
      return { opacity: 0 };
    case "slide_up":
      return { opacity: 0, transform: "translateY(24px)" };
    case "slide_down":
      return { opacity: 0, transform: "translateY(-24px)" };
    case "slide_start":
      return { opacity: 0, transform: `translateX(${rtl ? 24 : -24}px)` };
    case "slide_end":
      return { opacity: 0, transform: `translateX(${rtl ? -24 : 24}px)` };
    case "zoom":
      return { opacity: 0, transform: "scale(0.85)" };
    default:
      return null;
  }
}

/** What marks an element whose entrance the canvas plays: its entrance, time and wait. */
export function entranceMark(motion: StudioMotion | null | undefined): string | undefined {
  if (!motion?.enter || motion.enter === "none") return undefined;
  return `${motion.enter}|${motion.duration_ms ?? 400}|${motion.delay_ms ?? 0}`;
}

/** Plays an entrance on an element of the canvas; null when it has none or the computer reduces motion. */
export function playEntrance(el: HTMLElement, motion: StudioMotion | null | undefined, rtl: boolean): Animation | null {
  const first = entranceFrom(motion?.enter, rtl);
  if (!first || typeof el.animate !== "function") return null;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  return el.animate([first, { opacity: 1, transform: "none" }], { duration: motion?.duration_ms ?? 400, delay: motion?.delay_ms ?? 0, easing: ENTRANCE_EASING, fill: "backwards" });
}

/** The entrance from its mark (`entranceMark`). */
export function markedMotion(mark: string): StudioMotion {
  const [enter, duration, delay] = mark.split("|");
  return { enter: enter as StudioMotion["enter"], duration_ms: Number(duration), delay_ms: Number(delay) };
}

/**
 * Plays each marked element's entrance once, the first time it comes into
 * view inside `root`, and again when its mark changes. Returns a stop.
 */
export function watchEntrances(root: HTMLElement, rtl: boolean): () => void {
  if (typeof IntersectionObserver === "undefined") return () => {};
  const played = new WeakMap<Element, string>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const mark = el.dataset.studioEnter;
        if (!mark || played.get(el) === mark) continue;
        played.set(el, mark);
        playEntrance(el, markedMotion(mark), rtl);
      }
    },
    { threshold: 0.15 },
  );
  const seen = new Set<Element>();
  const scan = () => {
    root.querySelectorAll<HTMLElement>("[data-studio-enter]").forEach((el) => {
      if (seen.has(el)) {
        // A changed entrance plays again once it is in view.
        if (played.has(el) && played.get(el) !== el.dataset.studioEnter) {
          observer.unobserve(el);
          observer.observe(el);
        }
        return;
      }
      seen.add(el);
      observer.observe(el);
    });
  };
  scan();
  const changes = new MutationObserver(scan);
  changes.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-studio-enter"] });
  return () => {
    changes.disconnect();
    observer.disconnect();
  };
}
