import type { StudioNode, TabBarStyle } from "../../pages/types";
import type { StudioDemoId } from "../../demo/constants";
import type { SectionContext } from "../sections";
import { idOf, pad, type DemoInk } from "./parts";
import type { DemoDesign } from "./index";

/**
 * 130 The Signature looks (the owner, 13 November 2026): two premium looks,
 * A and B, for each Studio demo, each a real template of the demo's kind
 * (`<demo>_signature_<look>`, lib/studio/sections.ts) that makes the whole
 * app in that look: its home as the approved board, built only from
 * Studio's elements (every part editable; the live parts read the
 * person's own ride, taxis or trip in the app and show nothing without
 * them), its pages after the home, its tabs, its premium bar, its sign-in
 * screen and account menu. A demo's look A is the demo itself (the demo
 * app, its `demo_<demo>` template and "Like our demo"); /start offers both
 * (lib/demo/start.ts). Each demo registers its looks from its own file in
 * this folder.
 */

export const SIGNATURE_LOOKS = ["a", "b"] as const;
export type SignatureLook = (typeof SIGNATURE_LOOKS)[number];

/**
 * 130.20–130.29 The premium chrome a look's pages and system screens take,
 * by the names the premium chrome sets for every Studio project: a page
 * header's style, and the look of the account, settings, sign-in and the
 * app's other system screens. Kept with the look until the chrome is in
 * the app's contract; the integrator applies them to its pages.
 */
export type PremiumHeaderStyle = "large" | "glass" | "photo" | "brand" | "search";
export interface SignatureChrome {
  /** The header of every page after the home (the home draws its own over its cover). */
  header: PremiumHeaderStyle;
  /** The system screens' look (account, settings, notifications, sign-in and the rest). */
  screens: PremiumHeaderStyle;
}

/** A look's sign-in screen and account menu (lib/demo/screens.ts makes `studioScreens` of them). */
export interface SignatureScreens {
  style: "photo" | "card" | "minimal" | "premium";
  /** Under public/, served by the platform. */
  photo: string;
  title: Record<"en" | "ar" | "tr", string>;
  subtitle: Record<"en" | "ar" | "tr", string>;
  menu: "plain" | "card" | "cover" | "tiles" | "night" | "academy";
  /** `night`: the membership card's colour. */
  accent?: string;
}

export interface SignatureDesign extends DemoDesign {
  /** The look's premium bar: a floating pill, a dock or frosted glass, never the classic bar. */
  bar: TabBarStyle;
  screens: SignatureScreens;
  chrome: SignatureChrome;
}

export type SignatureLooks = Partial<Record<SignatureLook, SignatureDesign>>;

/** The template id of a demo's look: `<demo>_signature_<look>`. */
export function signatureTemplateId(demo: StudioDemoId, look: SignatureLook): string {
  return `${demo}_signature_${look}`;
}

// ——— What the looks are made of ———

/** A text in a look's ink by day and by night. */
export function inked(ctx: SectionContext, value: string, ink: { color: string; dark: string }, font: StudioNode["font"], extra: Partial<StudioNode> = {}): StudioNode {
  return { id: idOf(ctx)(), type: "text", text: value, color: ink.color, dark_color: ink.dark, font, ...extra };
}

/** An icon in a look's ink by day and by night. */
export function inkIcon(ctx: SectionContext, icon: string, size: number, ink: { color: string; dark: string }, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: idOf(ctx)(), type: "icon", icon, icon_size: size, color: ink.color, dark_color: ink.dark, ...extra };
}

/** Frosted glass over the map or a photo (129.18 `surface`): white by day, dark by night. */
export function glass(tint = 0.74, soft: 1 | 2 | 3 = 2): Pick<StudioNode, "surface"> {
  return { surface: { glass: 18, tint, soft } };
}

/** A round button: its icon (or a letter) on its own fill, opening `action`. */
export function roundOf(ctx: SectionContext, icon: string, action: StudioNode["action"], look: Partial<StudioNode> & { ink: { color: string; dark: string } }, size = 44): StudioNode {
  const { ink, ...rest } = look;
  return {
    id: idOf(ctx)(),
    type: "row",
    width: size,
    height: size,
    radius: size / 2,
    align: "center",
    cross: "center",
    action,
    // In a row, held in its middle (a fixed size sits at the row's top otherwise).
    self_align: "center",
    ...rest,
    children: [inkIcon(ctx, icon, 22, ink)],
  };
}

/** A row that takes the room left in its row. */
export function filler(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "row", width: "fill", height: 1, children: [] };
}

/** A look's colours as a page's ink (the pages after its home). */
export function inkOf(k: DemoInk): { ink: { color: string; dark: string }; muted: { color: string; dark: string } } {
  return { ink: { color: k.ink, dark: k.darkInk }, muted: { color: k.muted, dark: k.darkMuted } };
}

export { pad };
