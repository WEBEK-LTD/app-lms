import { formatCents } from "../catalog/money";
import type { LanguageCode, StudioEntry, StudioNode, StudioNodeType, StudioPricing } from "../pages/types";
import type { ElementPreset } from "./elements";

/**
 * 129.11–129.20 Studio's premium content, trust and commerce elements: what
 * each starts as when added (its first words in the editor's language, ready
 * to change), and what the canvas and the editor share about them. No price
 * is ever made up: a new plan's prices are empty, and the canvas shows the
 * owner where to fill them (the app shows none until they do).
 */

export type PremiumText =
  | "quote"
  | "quoteName"
  | "quoteRole"
  | "planBasic"
  | "planPro"
  | "planPremium"
  | "planFeatures"
  | "planButton"
  | "statCustomers"
  | "statOrders"
  | "statYears"
  | "progressDesign"
  | "progressBuild"
  | "progressLaunch"
  | "step"
  | "stepText"
  | "stepDate"
  | "tile"
  | "tileText"
  | "tileLink"
  | "name"
  | "role"
  | "badge"
  | "badgeSecond"
  | "contact"
  | "follow"
  | "ctaButton"
  | "glassTitle"
  | "glassText";

const WORDS_EN: Record<PremiumText, string> = {
  quote: "A short quote from one of your customers about what you did for them.",
  quoteName: "Customer name",
  quoteRole: "Their role or city",
  planBasic: "Basic",
  planPro: "Pro",
  planPremium: "Premium",
  planFeatures: "What this plan includes\nAnother thing it includes\nOne more",
  planButton: "Choose",
  statCustomers: "Customers",
  statOrders: "Orders",
  statYears: "Years",
  progressDesign: "Design",
  progressBuild: "Build",
  progressLaunch: "Launch",
  step: "Step",
  stepText: "What happens in this step.",
  stepDate: "Date",
  tile: "Feature",
  tileText: "A short line about it.",
  tileLink: "See more",
  name: "Name",
  role: "Role or place",
  badge: "New",
  badgeSecond: "Top rated",
  contact: "Contact",
  follow: "Follow",
  ctaButton: "Book now",
  glassTitle: "A card of frosted glass",
  glassText: "Put it over a photo: what is behind it blurs.",
};

/** The English first words, when the editor gives none. */
export function premiumWordEn(key: PremiumText): string {
  return WORDS_EN[key];
}

/** 129.11–129.20 A premium element as it starts (null for any other type). */
export function newPremiumNode(
  type: StudioNodeType,
  id: string,
  o: { brand: string; newId: () => string; words: (key: PremiumText) => string; button: string; preset?: ElementPreset },
): StudioNode | null {
  const w = o.words;
  const margin = { top: 8, end: 16, bottom: 8, start: 16 };
  if (o.preset === "glass_card") {
    return {
      id,
      type: "column",
      name: null,
      gap: 6,
      radius: 24,
      padding: { top: 18, end: 18, bottom: 18, start: 18 },
      margin,
      surface: { glass: 18, tint: 0.18, border: { from: "#FFFFFF", to: o.brand }, soft: 2 },
      children: [
        { id: o.newId(), type: "text", text: w("glassTitle"), font: { size: 18, weight: 800 } },
        { id: o.newId(), type: "text", text: w("glassText"), font: { size: 14 }, opacity: 0.85 },
      ],
    };
  }
  switch (type) {
    case "testimonials":
      return {
        id,
        type,
        gap: 12,
        margin: { top: 8, end: 0, bottom: 8, start: 0 },
        padding: { top: 0, end: 16, bottom: 0, start: 16 },
        radius: 22,
        entries: [1, 2, 3].map(() => ({ text: w("quote"), title: w("quoteName"), subtitle: w("quoteRole"), value: 5 })),
      };
    case "pricing":
      return {
        id,
        type,
        gap: 12,
        radius: 22,
        margin,
        pricing: { yearly: true },
        entries: [
          { title: w("planBasic"), text: w("planFeatures"), label: w("planButton"), price: null, price_yearly: null },
          { title: w("planPro"), text: w("planFeatures"), label: w("planButton"), price: null, price_yearly: null, highlight: true },
          { title: w("planPremium"), text: w("planFeatures"), label: w("planButton"), price: null, price_yearly: null },
        ],
      };
    case "stats":
      return {
        id,
        type,
        margin,
        stats: { dividers: true },
        entries: [
          { value: 100, suffix: "+", title: w("statCustomers"), icon: "groups" },
          { value: 50, suffix: "+", title: w("statOrders"), icon: "shopping_bag" },
          { value: 10, title: w("statYears"), icon: "event" },
        ],
      };
    case "progress":
      return {
        id,
        type,
        gap: 12,
        margin,
        entries: [
          { title: w("progressDesign"), value: 80 },
          { title: w("progressBuild"), value: 60 },
          { title: w("progressLaunch"), value: 35 },
        ],
      };
    case "timeline":
      return {
        id,
        type,
        margin,
        entries: [1, 2, 3].map((n) => ({ title: `${w("step")} ${n}`, subtitle: w("stepDate"), text: w("stepText"), ...(n === 2 ? { highlight: true } : {}) })),
      };
    case "bento":
      return {
        id,
        type,
        columns: 2,
        gap: 10,
        radius: 22,
        margin,
        entries: [
          { title: `${w("tile")} 1`, text: w("tileText"), icon: "bolt", size: "large", gradient: { from: o.brand, to: "#E8B04B", angle: 135 }, label: w("tileLink") },
          { title: `${w("tile")} 2`, icon: "workspace_premium", size: "small" },
          { title: `${w("tile")} 3`, icon: "favorite", size: "small" },
          { title: `${w("tile")} 4`, text: w("tileText"), icon: "local_shipping", size: "wide" },
        ],
      };
    case "profile_card":
      return {
        id,
        type,
        title: w("name"),
        text: w("role"),
        radius: 26,
        gap: 12,
        margin,
        padding: { top: 0, end: 16, bottom: 18, start: 16 },
        cross: "center",
        children: [
          {
            id: o.newId(),
            type: "row",
            gap: 6,
            align: "center",
            children: [
              { id: o.newId(), type: "badge_text", text: w("badge"), icon: "workspace_premium", badge: { style: "gradient" } },
              { id: o.newId(), type: "badge_text", text: w("badgeSecond"), icon: "star", badge: { style: "outline" } },
            ],
          },
          {
            id: o.newId(),
            type: "row",
            gap: 10,
            children: [
              { id: o.newId(), type: "button", text: w("contact"), width: "fill", height: 44, radius: 14, background: o.brand, color: "#FFFFFF", font: { weight: 800, size: 14 }, text_align: "center" },
              { id: o.newId(), type: "button", text: w("follow"), width: "fill", height: 44, radius: 14, background: "#FFFFFF", dark_background: "#1D1B2C", border_color: o.brand, border_width: 1.5, color: o.brand, font: { weight: 800, size: 14 }, text_align: "center" },
            ],
          },
        ],
      };
    case "badge_text":
      return { id, type, text: w("badge"), icon: "workspace_premium", badge: { style: "gradient" }, margin: { top: 4, end: 16, bottom: 4, start: 16 }, self_align: "start" };
    case "cta_bar":
      return { id, type, text: w("ctaButton") || o.button, cta: { style: "bar" }, pin: "bottom", icon: "arrow_forward" };
    default:
      return null;
  }
}

/** 129.11–129.20 An entry's text in the language being edited (the default one's when not translated). */
export function entryText(entry: StudioEntry, field: "title" | "subtitle" | "text" | "label" | "prefix" | "suffix", lang: LanguageCode, def: LanguageCode): string {
  if (lang !== def) {
    const t = entry.translations?.[lang]?.[field];
    if (typeof t === "string" && t) return t;
  }
  return entry[field] ?? "";
}

/** 129.12 A plan's price as the platform writes prices ("₺1,234.50"), without cents when whole; null while it isn't set. */
export function planPrice(cents: number | null | undefined, pricing: StudioPricing | null | undefined): string | null {
  if (cents === null || cents === undefined) return null;
  const text = formatCents(cents, pricing?.currency ?? "TRY");
  return cents % 100 === 0 ? text.replace(/\.00(?=\D*$)/, "") : text;
}

/** 129.13 A number as a stat shows it: grouped, with at most one decimal. */
export function statNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

/** 129.19 The two colours of a gradient badge or gradient words: the element's own, else the app's two brand colours. */
export function brandGradient(node: Pick<StudioNode, "gradient">, brand: string, accent: string | null | undefined): { from: string; to: string; angle: number } {
  return node.gradient ? { from: node.gradient.from, to: node.gradient.to, angle: node.gradient.angle ?? 90 } : { from: brand, to: accent ?? "#E8B04B", angle: 90 };
}
