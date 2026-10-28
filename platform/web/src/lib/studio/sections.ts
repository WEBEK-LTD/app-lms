import type { ItemSource, StudioNode, StudioPage } from "../pages/types";
import { newNodeId } from "./elements";

/**
 * 103R Ready sections (dropped onto a page whole) and page templates (a
 * whole page to start from), in the editor's left panel. Their texts are
 * the owner's to change; `w` gives them in the language being edited.
 */

export type SectionWord =
  | "heroTitle"
  | "heroText"
  | "heroButton"
  | "offerKicker"
  | "offerTitle"
  | "cta"
  | "featureFast"
  | "featureFastText"
  | "featureSafe"
  | "featureSafeText"
  | "featureSupport"
  | "featureSupportText"
  | "reviewText"
  | "reviewName"
  | "contactTitle"
  | "contactText"
  | "formTitle"
  | "formName"
  | "formPhone"
  | "formMessage"
  | "statsOne"
  | "statsTwo"
  | "statsThree"
  | "listTitle";

export interface SectionContext {
  brand: string;
  /** The app's main list, for products, courses, services and the rest. */
  source: ItemSource | null;
  w: (word: SectionWord) => string;
  newId?: () => string;
}

export interface SectionInfo {
  id: string;
  icon: string;
  make: (ctx: SectionContext) => StudioNode;
}

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

function text(ctx: SectionContext, value: string, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: (ctx.newId ?? newNodeId)(), type: "text", text: value, ...extra };
}

export const SECTIONS: readonly SectionInfo[] = [
  {
    id: "hero",
    icon: "web_asset",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      name: ctx.w("heroTitle"),
      gap: 10,
      padding: pad(22, 18),
      margin: pad(12, 10),
      radius: 18,
      background: ctx.brand,
      color: "#FFFFFF",
      children: [
        text(ctx, ctx.w("heroTitle"), { font: { size: 24, weight: 800, line_height: 1.25 } }),
        text(ctx, ctx.w("heroText"), { font: { size: 14 }, opacity: 0.9 }),
        { id: (ctx.newId ?? newNodeId)(), type: "button", text: ctx.w("heroButton"), width: "hug", height: 42, radius: 12, background: "#FFFFFF", color: ctx.brand, font: { weight: 800, size: 14 }, padding: pad(0, 18), action: null },
      ],
    }),
  },
  {
    id: "offer",
    icon: "view_carousel",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "stack",
      name: ctx.w("offerKicker"),
      height: 150,
      radius: 18,
      margin: pad(12, 10),
      background: "#E8B04B",
      children: [
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "column",
          align: "end",
          padding: pad(14, 14),
          color: "#14361F",
          children: [text(ctx, ctx.w("offerKicker"), { font: { size: 12, weight: 700 } }), text(ctx, ctx.w("offerTitle"), { font: { size: 20, weight: 800, line_height: 1.3 } })],
        },
      ],
    }),
  },
  {
    id: "categories",
    icon: "label",
    make: (ctx) => ({ id: (ctx.newId ?? newNodeId)(), type: "categories", source: ctx.source ?? undefined, padding: pad(8, 10) }),
  },
  {
    id: "products",
    icon: "grid_view",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      name: ctx.w("listTitle"),
      gap: 8,
      padding: pad(6, 10),
      children: [
        text(ctx, ctx.w("listTitle"), { font: { size: 17, weight: 800 } }),
        { id: (ctx.newId ?? newNodeId)(), type: "items", source: ctx.source ?? undefined, layout: "grid", columns: 2, gap: 10, query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] } },
      ],
    }),
  },
  {
    id: "cta",
    icon: "smart_button",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "button",
      text: ctx.w("cta"),
      width: "fill",
      height: 46,
      radius: 14,
      background: ctx.brand,
      color: "#FFFFFF",
      font: { weight: 800, size: 15 },
      text_align: "center",
      icon: "arrow_back",
      margin: pad(10, 18),
      shadow: "medium",
      motion: { press: "shrink" },
    }),
  },
  {
    id: "features",
    icon: "view_column",
    make: (ctx) => {
      const feature = (icon: string, title: SectionWord, body: SectionWord): StudioNode => ({
        id: (ctx.newId ?? newNodeId)(),
        type: "column",
        width: "fill",
        gap: 4,
        padding: pad(12, 10),
        radius: 14,
        background: "#FFFFFF",
        dark_background: "#22203A",
        shadow: "light",
        cross: "center",
        text_align: "center",
        children: [
          { id: (ctx.newId ?? newNodeId)(), type: "icon", icon, icon_size: 26, color: ctx.brand },
          text(ctx, ctx.w(title), { font: { size: 13, weight: 800 }, text_align: "center" }),
          text(ctx, ctx.w(body), { font: { size: 11 }, opacity: 0.75, text_align: "center" }),
        ],
      });
      return {
        id: (ctx.newId ?? newNodeId)(),
        type: "row",
        gap: 8,
        padding: pad(8, 10),
        children: [feature("bolt", "featureFast", "featureFastText"), feature("verified_user", "featureSafe", "featureSafeText"), feature("support_agent", "featureSupport", "featureSupportText")],
      };
    },
  },
  {
    id: "stats",
    icon: "monitoring",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "row",
      align: "around",
      padding: pad(14, 10),
      margin: pad(8, 10),
      radius: 16,
      background: "#0E0D24",
      color: "#F4EFE6",
      children: (["statsOne", "statsTwo", "statsThree"] as const).map((w) => text(ctx, ctx.w(w), { font: { size: 13, weight: 700 }, text_align: "center" })),
    }),
  },
  {
    id: "review",
    icon: "star",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      gap: 6,
      padding: pad(14, 14),
      margin: pad(8, 10),
      radius: 16,
      background: "#FFFFFF",
      dark_background: "#22203A",
      shadow: "light",
      children: [
        { id: (ctx.newId ?? newNodeId)(), type: "ratings", rating: 5, text: "" },
        text(ctx, ctx.w("reviewText"), { font: { size: 14, italic: true } }),
        text(ctx, ctx.w("reviewName"), { font: { size: 12, weight: 700 }, opacity: 0.75 }),
      ],
    }),
  },
  {
    id: "contact",
    icon: "map",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      gap: 8,
      padding: pad(8, 10),
      children: [
        text(ctx, ctx.w("contactTitle"), { font: { size: 17, weight: 800 } }),
        text(ctx, ctx.w("contactText"), { font: { size: 13 }, opacity: 0.8 }),
        { id: (ctx.newId ?? newNodeId)(), type: "map", map: { lat: 30.0444, lng: 31.2357 }, height: 170, radius: 14 },
      ],
    }),
  },
  {
    id: "form",
    icon: "list_alt",
    make: (ctx) => ({
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      gap: 8,
      padding: pad(8, 14),
      children: [
        text(ctx, ctx.w("formTitle"), { font: { size: 17, weight: 800 } }),
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "form",
          form: {
            send_to: "email",
            submit_label: null,
            success_text: null,
            fields: [
              { id: "name", kind: "text", label: ctx.w("formName"), required: true, options: null },
              { id: "phone", kind: "phone", label: ctx.w("formPhone"), required: true, options: null },
              { id: "message", kind: "long_text", label: ctx.w("formMessage"), required: false, options: null },
            ],
          },
        },
      ],
    }),
  },
  {
    id: "search",
    icon: "search",
    make: (ctx) => ({ id: (ctx.newId ?? newNodeId)(), type: "search", text: "", radius: 12, margin: pad(8, 10), background: "#FFFFFF", dark_background: "#22203A" }),
  },
];

export interface TemplateInfo {
  id: string;
  icon: string;
  make: (ctx: SectionContext) => StudioPage;
}

function pageOf(ctx: SectionContext, sections: string[], header: StudioPage["header"]): StudioPage {
  return {
    header,
    body: { id: (ctx.newId ?? newNodeId)(), type: "column", gap: 4, padding: { bottom: 16 }, children: sections.map((id) => SECTIONS.find((s) => s.id === id)!.make(ctx)) },
  };
}

export const TEMPLATES: readonly TemplateInfo[] = [
  { id: "shop", icon: "storefront", make: (ctx) => pageOf(ctx, ["offer", "categories", "products", "cta"], { type: "logo_actions", buttons: ["menu", "notifications", "cart", "account"] }) },
  { id: "services", icon: "event_available", make: (ctx) => pageOf(ctx, ["hero", "features", "products", "review"], { type: "logo_center", buttons: ["menu", "notifications"] }) },
  { id: "brand", icon: "auto_awesome", make: (ctx) => pageOf(ctx, ["hero", "stats", "features", "review", "contact"], { type: "transparent", buttons: ["menu", "account"] }) },
  { id: "contact", icon: "call", make: (ctx) => pageOf(ctx, ["contact", "form"], { type: "title_search", buttons: [] }) },
  { id: "blank", icon: "note_add", make: (ctx) => ({ header: { type: "logo_actions", buttons: ["notifications", "account"] }, body: { id: (ctx.newId ?? newNodeId)(), type: "column", gap: 8, children: [] } }) },
];
