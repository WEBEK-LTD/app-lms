import type { StudioDemoId } from "../../demo/constants";
import type { Action, StudioFont, StudioHeader, StudioNode, StudioSides, TabBarStyle } from "../../pages/types";
import type { TemplateProject } from "../academy";
import { ACCOUNT_ITEMS, type AccountHeader, type SignInStyle, type StudioScreens } from "../screens";
import type { SectionContext, SectionWord } from "../sections";
import type { DemoDesign } from "./index";
import { idOf, photo } from "./parts";

/**
 * 130 The Signature looks (the owner, 13 November 2026): two premium
 * looks, A and B, for each of the nine Studio demos, each a whole project
 * template of the demo's kind (`<demo>_signature_<a|b>`): its home as the
 * approved board, every page after it in the same look (its tabs' pages,
 * the screens they open), its bar (a floating pill, a dock or glass), its
 * sign-in and account menu, built only from Studio elements so every part
 * is editable in Studio's editor; the live parts read the person's own
 * order, shipment, ride, child, course or trip in the app and hide without
 * one. Each look's own file holds it (sofra-signature.ts and the others);
 * this one the shape they share and the helpers they draw with.
 */

export const SIGNATURE_LOOKS = ["a", "b"] as const;
export type SignatureLook = (typeof SIGNATURE_LOOKS)[number];

/** The Studio template id of a demo's look: `food_signature_a`. */
export function signatureTemplateId(demo: StudioDemoId, look: SignatureLook): string {
  return `${demo}_signature_${look}`;
}

/**
 * 130.20–130.29 The premium page headers (the premium chrome's `style` of a
 * header): a large title collapsing on scroll, a frosted bar, a photo
 * cover, the brand centred with round glass buttons, a title with a search
 * pill. The looks name theirs now; an app that doesn't know `style` draws
 * the header's `type` as before.
 */
export type PremiumHeaderStyle = "large" | "glass" | "photo" | "brand" | "search";
export type PremiumHeader = StudioHeader & { style?: PremiumHeaderStyle };

/**
 * The look's chrome: the premium header of every page after its home, and
 * the premium system screens' look (account, settings, notifications,
 * language, orders, sign-in and code) the board asks for, in the premium
 * chrome's names (130.20–130.29), wired by the project's system screens.
 */
export interface SignatureChrome {
  header: PremiumHeaderStyle;
  /** The system screens' look: the hero of the account and sign-in (`photo` a photo hero, `brand` the brand's colours), as the board draws its top. */
  screens: "photo" | "brand";
}

/** A Studio demo's look: its design (home, pages, tabs, bar) and the whole project it makes. */
export interface SignatureDesign extends DemoDesign {
  demo: StudioDemoId;
  /** Which of the demo's two looks. */
  variant: SignatureLook;
  /** The board's direction ("Editorial menu"), Studio's word. */
  name: SectionWord;
  project: TemplateProject;
  chrome: SignatureChrome;
}

/** A look's colours by day and by night, as its board's two themes have them. */
export interface SignatureInk {
  page: string;
  darkPage: string;
  surface: string;
  darkSurface: string;
  ink: string;
  darkInk: string;
  muted: string;
  darkMuted: string;
  line: string;
  darkLine: string;
  /** The board's accent for words and small marks, and for fills (the bar's open tab, a button). */
  accent: string;
  darkAccent: string;
  fill: string;
  darkFill: string;
  /** Words on a fill. */
  onFill: string;
  darkOnFill: string;
}

export const sides = (top: number, end: number, bottom: number, start: number): StudioSides => ({ top, end, bottom, start });

/** A text in the look's ink by day and by night (`muted` for the quieter one). */
export function inked(ctx: SectionContext, k: SignatureInk, text: string, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  const { muted, accent, ...rest } = extra;
  const [day, night] = accent ? [k.accent, k.darkAccent] : muted ? [k.muted, k.darkMuted] : [k.ink, k.darkInk];
  return { id: idOf(ctx)(), type: "text", text, font, color: day, dark_color: night, ...rest };
}

/** A section's title (in the look's display font) with a quieter word or a link at its end. */
export function signatureHead(ctx: SectionContext, k: SignatureInk, title: string, font: StudioFont, end: { text: string; action?: Action | null; muted?: boolean } | null, padding: StudioSides = sides(20, 16, 10, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: title,
    cross: "end",
    gap: 12,
    padding,
    children: [
      inked(ctx, k, title, font, { width: "fill" }),
      ...(end ? [inked(ctx, k, end.text, { size: 13, weight: 700 }, end.muted ? { muted: true } : { accent: true, ...(end.action ? { action: end.action } : {}) })] : []),
    ],
  };
}

/** A round frosted button over a photo: a white disc at a sixth of its strength, a thin white ring, a white icon. */
export function glassDisc(ctx: SectionContext, icon: string, action: Action, size = 44): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    width: size,
    height: size,
    radius: size / 2,
    align: "center",
    cross: "center",
    overlay: { color: "#FFFFFF", opacity: 0.16 },
    border_color: "#FFFFFF",
    border_width: 1,
    surface: { glass: 14, tint: 0.16 },
    action,
    children: [{ id: id(), type: "icon", icon, icon_size: 22, color: "#FFFFFF" }],
  };
}

/** A round button on the page: the look's surface with its line, the icon in its ink. */
export function surfaceDisc(ctx: SectionContext, k: SignatureInk, icon: string, action: Action, size = 44): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    width: size,
    height: size,
    radius: size / 2,
    align: "center",
    cross: "center",
    background: k.surface,
    dark_background: k.darkSurface,
    border_color: k.line,
    dark_border_color: k.darkLine,
    border_width: 1,
    shadow: "light",
    action,
    children: [{ id: id(), type: "icon", icon, icon_size: 22, color: k.ink, dark_color: k.darkInk }],
  };
}

/** One of Yallapp's photos, or (without the platform's address at hand) none. */
export const sigPhoto = (ctx: SectionContext, path: string): string | null => photo(ctx, path);

/** A photo of Yallapp's as an image, or (without the platform's address at hand) a shape in the look's line colour for the owner's own photo. */
export function sigImage(ctx: SectionContext, k: SignatureInk, path: string, look: Partial<StudioNode>): StudioNode {
  const url = sigPhoto(ctx, path);
  return url
    ? { id: idOf(ctx)(), type: "image", image_url: url, fit: "cover", ...look }
    : { id: idOf(ctx)(), type: "column", background: k.line, dark_background: k.darkLine, ...look, children: [] };
}

/** A look's bar, in the look's colours by day and by night. */
export function signatureBar(k: SignatureInk, bar: Omit<TabBarStyle, "background" | "dark_background" | "active" | "dark_active" | "inactive" | "dark_inactive"> & Partial<TabBarStyle>): TabBarStyle {
  return { background: k.page, dark_background: k.darkPage, active: k.fill, dark_active: k.darkFill, inactive: k.muted, dark_inactive: k.darkMuted, ...bar };
}

/** The header of a look's pages after the home, in its colours, drawn in the look's premium header. */
export function signatureHeader(k: SignatureInk, style: PremiumHeaderStyle): Pick<PremiumHeader, "background" | "color" | "dark_background" | "dark_color" | "style"> {
  return { background: k.page, color: k.ink, dark_background: k.darkPage, dark_color: k.darkInk, style };
}

/** The sign-in screen and the account menu of a look: the welcome over the look's photo, the menu's top as the board's. */
export function signatureScreens(options: {
  style: SignInStyle;
  photo: string;
  title: Record<"en" | "ar" | "tr", string>;
  subtitle: Record<"en" | "ar" | "tr", string>;
  menu: AccountHeader;
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
