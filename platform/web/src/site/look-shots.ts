import { DEMO_GUIDES } from "@/lib/demo/content";
import { DEMO_SLUGS, demoTypeOfSlug, isStudioDemo, type DemoId, type StudioDemoId } from "@/lib/demo/constants";
import { APP_SCREENS, type AppScreen } from "@/lib/marketing";

/**
 * 130.49 A Studio demo's two Signature looks on the website, by day and by
 * night: look A (the demo itself) and look B, each
 * `public/screens/<demo's address>-sig-<a|b>-home(-dark).png`, as the app
 * draws them (lib/demo/picker.ts LOOK_SHOTS). Look A by day is the demo's
 * own home screen (DEMO_GUIDES), the same picture.
 */

export type LookShotKey = "a" | "a-dark" | "b" | "b-dark";
export const LOOK_SHOT_KEYS: readonly LookShotKey[] = ["a", "a-dark", "b", "b-dark"];

const SCREENS: ReadonlySet<string> = new Set(APP_SCREENS);

/** A look's picture of the demo's home, when the site ships it. */
export function lookScreen(id: StudioDemoId, key: LookShotKey): AppScreen | null {
  if (key === "a") return DEMO_GUIDES[id].screens[0] ?? null;
  const [look, dark] = key.split("-");
  const name = `${DEMO_SLUGS[id]}-sig-${look}-home${dark ? "-dark" : ""}`;
  return SCREENS.has(name) ? (name as AppScreen) : null;
}

/** The Studio demo of a demo's address (a solution's `demoSlug`), if it is one. */
export function studioDemoOfSlug(slug: string): StudioDemoId | null {
  const id: DemoId | null = demoTypeOfSlug(slug);
  return id && isStudioDemo(id) ? id : null;
}
