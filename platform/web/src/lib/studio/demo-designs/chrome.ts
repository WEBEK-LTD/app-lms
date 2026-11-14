import type { StudioHeader, StudioHeaderStyle } from "../../pages/types";
import type { StudioDemoId } from "../../demo/constants";
import type { SystemScreensLook } from "../premium-chrome";

/**
 * 130.23 The premium chrome a new project gets from each Studio demo (and
 * the demo apps): the premium header style of its pages after the home,
 * and the premium look of its system screens (the account, settings,
 * notifications, the lists, sign-in and the code screen, the empty and
 * loading states). Existing projects keep what they have: these are set
 * only where a demo's pages and screens are made (lib/studio/demo-designs,
 * lib/demo/screens.ts). A demo whose account has a designed top of its own
 * (the academies' student card, their gold sign-in and code screen) keeps
 * it (`classic`: the screen's own).
 */
export interface DemoChrome {
  /** The header style of the pages after the home that have a header; a page whose header has a style keeps it. */
  pages: StudioHeaderStyle;
  system: SystemScreensLook;
}

export const DEMO_CHROME: Record<StudioDemoId, DemoChrome> = {
  food: { pages: "large", system: { look: "photo" } },
  marketplace: { pages: "glass", system: { look: "glass" } },
  delivery: { pages: "large", system: { look: "brand" } },
  rides: { pages: "glass", system: { look: "glass" } },
  taxi: { pages: "brand", system: { look: "brand" } },
  school: { pages: "large", system: { look: "large" } },
  travel: { pages: "large", system: { look: "photo" } },
  instructors: { pages: "large", system: { look: "photo", screens: { account: "classic", sign_in: "classic", code: "classic" } } },
  premium_academy: { pages: "large", system: { look: "brand", screens: { account: "classic", sign_in: "classic", code: "classic" } } },
};

/** The demo's premium chrome; none for a project not made from a demo. */
export function demoChrome(demo: StudioDemoId | null | undefined): DemoChrome | null {
  return demo ? (DEMO_CHROME[demo] ?? null) : null;
}

/** A page's header after the demo's home in the demo's premium style, unless it has a style of its own. */
export function chromedHeader(header: StudioHeader | null | undefined, demo: StudioDemoId | null | undefined): StudioHeader | null | undefined {
  const chrome = demoChrome(demo);
  if (!header || !chrome || header.style) return header;
  // The header that lies over the page and the greeting are the home's: they keep their own look.
  if (header.type === "transparent" || header.type === "greeting") return header;
  return { ...header, style: chrome.pages };
}

/** The demo's system screens' look, with the photo of its sign-in for the `photo` look. */
export function demoSystemLook(demo: StudioDemoId, photo: string | null | undefined): SystemScreensLook {
  const system = structuredClone(DEMO_CHROME[demo].system);
  if (system.look === "photo" && photo) system.image_url = photo;
  return system;
}

/**
 * 130.23 Studio's whole designs (lib/studio/designs.ts DESIGN_THEMES) in
 * the premium chrome too: every page's header in a premium style and the
 * system screens in a premium look, applied with the design (the project's
 * sign-in, menu and other screens' looks stay). A demo's whole design is the
 * demo's (DEMO_CHROME).
 */
export const THEME_CHROME: Partial<Record<string, DemoChrome>> = {
  warm: { pages: "brand", system: { look: "photo" } },
  fresh: { pages: "large", system: { look: "large" } },
  evening: { pages: "search", system: { look: "glass" } },
  ocean: { pages: "glass", system: { look: "glass" } },
  classic: { pages: "large", system: { look: "large" } },
  rose: { pages: "brand", system: { look: "brand" } },
};
