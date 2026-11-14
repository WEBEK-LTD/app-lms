import type { StudioHeader, StudioHeaderStyle } from "../../pages/types";
import type { SystemScreensLook } from "../premium-chrome";

/**
 * 130.23 The premium chrome a new project gets from each Studio demo (and
 * the demo apps): the premium header style of its pages after the home,
 * and the premium look of its system screens (the account, settings,
 * notifications, the lists, sign-in and the code screen, the empty and
 * loading states). Existing projects keep what they have: these are set
 * only where a demo's pages and screens are made (lib/studio/demo-designs,
 * lib/demo/screens.ts). 130 Each demo's is its look A's (./signature.ts
 * `chrome`; ./index.ts `demoChrome`), each look's its own.
 */
export interface DemoChrome {
  /** The header style of the pages after the home that have a header; a page whose header has a style keeps it. */
  pages: StudioHeaderStyle;
  system: SystemScreensLook;
}

/** A page's header in the premium `style`, unless it has a style of its own or lies over the page (the home's cover, the greeting). */
export function chromedHeader(header: StudioHeader | null | undefined, style: StudioHeaderStyle | null | undefined): StudioHeader | null | undefined {
  if (!header || !style || header.style) return header;
  // The header that lies over the page and the greeting are the home's: they keep their own look.
  if (header.type === "transparent" || header.type === "greeting") return header;
  return { ...header, style };
}

/**
 * 130.23 Studio's whole designs (lib/studio/designs.ts DESIGN_THEMES) in
 * the premium chrome too: every page's header in a premium style and the
 * system screens in a premium look, applied with the design (the project's
 * sign-in, menu and other screens' looks stay). A demo's whole design is the
 * demo's (its look A's).
 */
export const THEME_CHROME: Partial<Record<string, DemoChrome>> = {
  warm: { pages: "brand", system: { look: "photo" } },
  fresh: { pages: "large", system: { look: "large" } },
  evening: { pages: "search", system: { look: "glass" } },
  ocean: { pages: "glass", system: { look: "glass" } },
  classic: { pages: "large", system: { look: "large" } },
  rose: { pages: "brand", system: { look: "brand" } },
};
