import { DEMO_GUIDES } from "@/lib/demo/content";
import { DEMO_SLUGS, demoTypeOfSlug, isStudioDemo, type DemoId, type StudioDemoId } from "@/lib/demo/constants";
import { APP_SCREENS, type AppScreen } from "@/lib/marketing";
import { SIGNATURE_LOOKS, type SignatureLook } from "@/lib/studio/demo-designs/signature";

/**
 * 130.49 A Studio demo's Signature looks on the website, by day and by
 * night, in Studio's order (223 C, D, A, B: the main look, the demo itself,
 * first), each `public/screens/<demo's address>-sig-<look>-home(-dark).png`,
 * as the app draws them (lib/demo/picker.ts LOOK_SHOTS). Look A by day
 * without a picture of its own is the demo's own home screen (DEMO_GUIDES).
 */

export type LookShotKey = SignatureLook | `${SignatureLook}-dark`;
export const LOOK_SHOT_KEYS: readonly LookShotKey[] = SIGNATURE_LOOKS.flatMap((look) => [look, `${look}-dark` as const]);

const SCREENS: ReadonlySet<string> = new Set(APP_SCREENS);

/** A look's picture of the demo's home, when the site ships it. */
export function lookScreen(id: StudioDemoId, key: LookShotKey): AppScreen | null {
  const [look, dark] = key.split("-");
  const name = `${DEMO_SLUGS[id]}-sig-${look}-home${dark ? "-dark" : ""}`;
  if (SCREENS.has(name)) return name as AppScreen;
  return key === "a" ? (DEMO_GUIDES[id].screens[0] ?? null) : null;
}

/** 223 The looks' pictures after the demo's own home by day (its main look's, the first one shipped): what the demo's page shows beside it. */
export function otherLookKeys(id: StudioDemoId): LookShotKey[] {
  return LOOK_SHOT_KEYS.filter((key) => lookScreen(id, key)).slice(1);
}

/** The Studio demo of a demo's address (a solution's `demoSlug`), if it is one. */
export function studioDemoOfSlug(slug: string): StudioDemoId | null {
  const id: DemoId | null = demoTypeOfSlug(slug);
  return id && isStudioDemo(id) ? id : null;
}
