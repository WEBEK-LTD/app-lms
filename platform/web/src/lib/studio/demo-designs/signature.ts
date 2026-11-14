import type { StudioHeaderStyle, StudioNode, TabBarStyle } from "../../pages/types";
import type { StudioDemoId } from "../../demo/constants";
import { DEMO_BRANDS } from "../../demo/content";
import type { TemplateProject } from "../academy";
import type { SystemLook, SystemScreensLook } from "../premium-chrome";
import { ACCOUNT_ITEMS, type AccountHeader, type SignInStyle, type StudioScreens } from "../screens";
import type { SectionContext } from "../sections";
import { idOf, pad, type DemoInk } from "./parts";
import type { DemoDesign } from "./index";

/**
 * 130 The Signature looks (the owner, 13 November 2026): two premium looks,
 * A and B, for each of the nine Studio demos, each a real template of the
 * demo's kind (`<demo>_signature_<look>`, lib/studio/sections.ts TEMPLATES)
 * that makes the whole app in that look: its home as the approved board,
 * built only from Studio's elements (every part editable; the live parts
 * read the person's own order, shipment, ride, child, course or trip in the
 * app and show nothing without them), every page after the home in the
 * look (`over`, `look`, `pages`), its tabs, its premium bar, its sign-in
 * screen and account menu, its colours and font (`project`) and its
 * premium chrome (`chrome`: the header of every page, the system screens'
 * look). A demo's look A is the demo itself: the demo app, its
 * `demo_<demo>` template, "Like our demo" and Admin › Demo apps all make
 * it; /start offers both (lib/demo/start.ts). Each demo's looks are in its
 * own file of this folder (sofra-signature.ts and the others); ONE list,
 * `SIGNATURE_DESIGNS` in ./index.ts, registers them all.
 */

export const SIGNATURE_LOOKS = ["a", "b"] as const;
export type SignatureLook = (typeof SIGNATURE_LOOKS)[number];

/** The template id of a demo's look: `<demo>_signature_<look>`. */
export function signatureTemplateId(demo: StudioDemoId, look: SignatureLook): string {
  return `${demo}_signature_${look}`;
}

/**
 * 130.20–130.29 The premium chrome of a look, by the board: the header
 * style of every page after its home (`StudioHeader.style`), the home's own
 * when it has a header that doesn't lie over its cover, and the look of the
 * app's system screens (`Config.screens.system`: the account, settings,
 * notifications, the language, editing the profile, help, the lists,
 * sign-in and the code screen, the empty and loading states). The `photo`
 * look takes the sign-in's photo.
 */
export interface SignatureChrome {
  header: StudioHeaderStyle;
  /** The home's header, when it has one not lying over its cover; missing, `header`. */
  home?: StudioHeaderStyle;
  system: SystemLook;
}

/**
 * The rest of the whole project a look makes (lib/studio/academy.ts
 * TemplateProject) besides its bar (`bar`) and tabs (`tabs`), which are the
 * design's so the demo app and every project draw them the same.
 */
export interface SignatureProject {
  /** The main colour a project starts in; missing, the demo's. */
  primary?: string;
  /** Its second colour and font; missing, the demo's. */
  appearance?: TemplateProject["appearance"];
  /** Its sign-in screen and account menu (and the courses' looks); `platform` Yallapp's address, for its pictures. */
  screens: (platform: string) => StudioScreens;
  bare_tab_pages?: boolean;
  page_header?: TemplateProject["page_header"];
  /** Tabs only a project with the owner's website gets (the academy's Blog), after `tabs`. */
  siteTabs?: TemplateProject["tabs"];
}

/** A Studio demo's look: its design (home, pages after it, tabs, bar) and the whole project it makes. */
export interface SignatureDesign extends DemoDesign {
  demo: StudioDemoId;
  /** Which of the demo's two looks. */
  variant: SignatureLook;
  /** The look's premium bar: a floating pill, a dock or frosted glass, never the classic bar. */
  bar: TabBarStyle;
  project: SignatureProject;
  chrome: SignatureChrome;
}

/** The look's project as a template's (lib/studio/start.ts, lib/studio/new-project.ts). */
export function signatureProject(d: SignatureDesign): TemplateProject {
  return {
    primary: d.project.primary ?? DEMO_BRANDS[d.demo].primaryColor,
    tab_bar: d.bar,
    appearance: d.project.appearance ?? {},
    tabs: d.project.siteTabs ?? ((tabs) => structuredClone([...tabs])),
    screens: (platform) => signatureScreensOf(d, platform),
    ...(d.project.bare_tab_pages ? { bare_tab_pages: true } : {}),
    ...(d.project.page_header ? { page_header: d.project.page_header } : {}),
  };
}

/** The look's system screens' look, the `photo` look on its sign-in's photo. */
export function signatureSystem(d: SignatureDesign, photo: string | null | undefined): SystemScreensLook {
  return { look: d.chrome.system, ...(d.chrome.system === "photo" && photo ? { image_url: photo } : {}) };
}

/** A project's `hostedSettings.studioScreens` in the look: its sign-in, account menu and premium system screens. */
export function signatureScreensOf(d: SignatureDesign, platform: string): StudioScreens {
  const screens = d.project.screens(platform);
  return { ...screens, system: signatureSystem(d, screens.sign_in?.image_url) };
}

/** A look's sign-in screen and account menu: the welcome over the look's photo, the menu's top as the board's. */
export function signatureScreens(options: {
  style: SignInStyle;
  /** Under public/, served by the platform. */
  photo: string;
  title: Record<"en" | "ar" | "tr", string>;
  subtitle: Record<"en" | "ar" | "tr", string>;
  menu: AccountHeader;
  /** `night`: the membership card's colour. */
  accent?: string;
  /** The account menu's entries first, in this order; the others the app knows after them, as it orders them. */
  first?: readonly (typeof ACCOUNT_ITEMS)[number][];
}): (platform: string) => StudioScreens {
  return (platform) => ({
    sign_in: { style: options.style, image_url: `${platform.replace(/\/+$/, "")}${options.photo}`, title: { ...options.title }, subtitle: { ...options.subtitle }, show_logo: true },
    account_menu: {
      header: options.menu,
      ...(options.accent ? { accent: options.accent } : {}),
      items: (options.first ?? []).map((key) => ({ key, hidden: false, label: {}, icon: null })),
    },
  });
}

// ——— What the looks are made of (Masar's, Lamha's and Safra's; ./food-signature-parts.ts the food looks') ———

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
