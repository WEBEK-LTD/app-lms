import type { LanguageCode } from "../pages/types";
import { DEMO_SLUGS, type DemoId } from "./constants";

/**
 * 128.9 The demos alive on /start: a short silent loop of each demo on its
 * card (public/loops/<slug>.webm and .mp4, recorded from the app preview by
 * scripts/demo-loops.sh), and the real demo app running in the phone on its
 * own page (the app preview, public/preview-app). Both start from the
 * demo's screenshot and only replace it once they are ready.
 */

/** Where a demo's loops are, made by scripts/demo-loops.sh. */
export const LOOP_DIR = "/loops";

/** The size the loops are recorded and encoded at (the screenshots' 360 × 780 phone, smaller). */
export const LOOP_SIZE = { width: 288, height: 624 } as const;

export interface DemoLoop {
  webm: string;
  mp4: string;
}

/** A demo's loop, by its /demo slug: the WebM first (smaller), the MP4 for Safari. */
export function demoLoop(id: DemoId): DemoLoop {
  const slug = DEMO_SLUGS[id];
  return { webm: `${LOOP_DIR}/${slug}.webm`, mp4: `${LOOP_DIR}/${slug}.mp4` };
}

/** The language the live demo opens in: the dashboard's, when the demo has it; else the demo's first. */
export function liveLanguage(languages: readonly LanguageCode[], lang: string): LanguageCode {
  return languages.find((l) => l === lang) ?? languages[0] ?? "en";
}
