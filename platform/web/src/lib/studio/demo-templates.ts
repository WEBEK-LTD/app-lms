import type { LayoutBlock, StudioNode, StudioPage } from "../pages/types";
import type { StudioDemoId } from "../demo/constants";
import { STUDIO_DEMO_HOMES } from "../demo/studio-homes";
import { newNodeId } from "./elements";
import type { SectionContext, TemplateInfo } from "./sections";

/**
 * Templates = demos, for Yallapp Studio. Each Studio demo's first page as a
 * Studio template, the one shown first and recommended when a project of
 * its kind starts. The demo's own first page is this template made with
 * the demo's name (lib/demo/setup.ts), so the two are the same page; the
 * old templates stay after it. tests/unit/studio-demo-templates.test.ts
 * fails when they drift apart.
 */

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

function idOf(ctx: SectionContext): string {
  return (ctx.newId ?? newNodeId)();
}

function text(ctx: SectionContext, value: string, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: idOf(ctx), type: "text", text: value, ...extra };
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e] ?? e)
    .trim();
}

/** A picture of Yallapp's (`picture:<file>`) at the platform's address; another address as it is. */
function pictureOf(ctx: SectionContext, address: string | null | undefined): string | null {
  if (!address) return null;
  return address.startsWith("picture:") ? (ctx.picture?.(address.slice("picture:".length)) ?? null) : address;
}

/** A heading's words: "Welcome to {app}" in the language being edited, any other with the app's name. */
function heading(ctx: SectionContext, words: string): string {
  return words === "Welcome to {app}" ? ctx.w("heroTitle") : words.replaceAll("{app}", ctx.app ?? "");
}

/** A list's title, with "See all" opening the rest when the block had it. */
function titled(ctx: SectionContext, block: LayoutBlock, body: StudioNode): StudioNode {
  const title = block.title ? text(ctx, block.title, { font: { size: 18, weight: 800 } }) : null;
  const more: StudioNode | null =
    block.see_all && title
      ? { id: idOf(ctx), type: "button", text: ctx.w("seeAll"), width: "hug", height: 32, radius: 10, padding: pad(0, 10), background: "#FFFFFF", color: ctx.brand, font: { size: 13, weight: 700 }, action: block.see_all }
      : null;
  const top: StudioNode[] = title ? [more ? { id: idOf(ctx), type: "row", align: "between", cross: "center", gap: 8, children: [title, more] } : title] : [];
  return { id: idOf(ctx), type: "column", ...(block.title ? { name: block.title } : {}), gap: 10, padding: pad(8, 12), visibility: block.visibility, children: [...top, body] };
}

/**
 * One block of a regular page as Studio elements, drawn like the block: a
 * banner as a picture with its words at the bottom, a text as its heading
 * and paragraphs, a list with its title. A block Studio has no element for
 * (the courses being followed) is left out.
 */
export function studioNodeOf(ctx: SectionContext, block: LayoutBlock): StudioNode | null {
  switch (block.type) {
    case "banner": {
      const url = pictureOf(ctx, block.image_url);
      return {
        id: idOf(ctx),
        type: "column",
        name: block.heading ?? null,
        min_height: 190,
        align: "end",
        gap: 6,
        padding: pad(18, 18),
        margin: pad(12, 12),
        radius: 18,
        background: ctx.brand,
        ...(url ? { image_background_url: url, overlay: { color: "#000000", opacity: 0.35 } } : {}),
        color: "#FFFFFF",
        visibility: block.visibility,
        children: [
          ...(block.heading ? [text(ctx, block.heading, { font: { size: 24, weight: 800, line_height: 1.2 } })] : []),
          ...(block.subheading ? [text(ctx, block.subheading, { font: { size: 14 }, opacity: 0.9 })] : []),
        ],
      };
    }
    case "text": {
      const parts = [...(block.html ?? "").matchAll(/<(h[1-6]|p)>([\s\S]*?)<\/\1>/g)];
      const children = parts.map(([, tag, inner]) =>
        tag!.startsWith("h") ? text(ctx, heading(ctx, plain(inner!)), { font: { size: 20, weight: 800, line_height: 1.25 } }) : text(ctx, plain(inner!), { font: { size: 15, line_height: 1.5 } }),
      );
      if (!children.length) return null;
      return { id: idOf(ctx), type: "column", gap: 6, padding: pad(8, 16), visibility: block.visibility, children };
    }
    case "search":
      return { id: idOf(ctx), type: "search", text: block.placeholder ?? "", radius: 12, margin: pad(8, 12), background: "#FFFFFF", dark_background: "#22203A", visibility: block.visibility };
    case "items":
      return titled(ctx, block, {
        id: idOf(ctx),
        type: "items",
        source: block.source ?? ctx.source ?? undefined,
        layout: block.layout ?? "list",
        ...(block.layout === "grid" ? { columns: 2 } : {}),
        gap: 10,
        query: structuredClone(block.query ?? { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] }),
      });
    case "categories":
      return titled(ctx, block, { id: idOf(ctx), type: "categories", source: block.source ?? ctx.source ?? undefined, style: block.style === "tiles" ? "tiles" : "chips" });
    default:
      return null;
  }
}

/** A regular page's blocks as a Studio page. */
export function studioPageOf(ctx: SectionContext, blocks: readonly LayoutBlock[], header: StudioPage["header"]): StudioPage {
  return {
    header,
    body: { id: idOf(ctx), type: "column", gap: 4, padding: { bottom: 16 }, children: blocks.map((b) => studioNodeOf(ctx, b)).filter((n): n is StudioNode => n !== null) },
  };
}

/** The demo's first page as blocks: its banner, "Welcome to {app}" and its sentence, then its lists. */
export function studioDemoBlocks(id: StudioDemoId): LayoutBlock[] {
  const home = STUDIO_DEMO_HOMES[id];
  return [
    { id: "demo-banner", type: "banner", visibility: "everyone", title: null, image_url: `picture:${home.file}`, heading: home.heading, subheading: home.subheading, action: null },
    { id: "welcome", type: "text", visibility: "everyone", title: null, html: `<h2>Welcome to {app}</h2><p>${escapeHtml(home.welcome)}</p>` },
    ...home.lists,
  ];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

const DEMO_HEADER: StudioPage["header"] = { type: "logo_actions", buttons: ["menu", "notifications", "account"] };

const DEMO_ICONS: Record<StudioDemoId, string> = {
  delivery: "local_shipping",
  food: "delivery_dining",
  marketplace: "storefront",
  rides: "local_taxi",
  taxi: "map",
  school: "school",
  instructors: "groups",
};

/** The Studio template id of a demo: `demo_<demo>`. */
export function demoTemplateId(id: StudioDemoId): string {
  return `demo_${id}`;
}

/** The demo's first page in Studio; the demo itself adds how to sign in to it after the banner (`afterBanner`). */
export function demoStudioPage(id: StudioDemoId, ctx: SectionContext, afterBanner: readonly LayoutBlock[] = []): StudioPage {
  const [banner, ...rest] = studioDemoBlocks(id);
  return studioPageOf(ctx, [banner!, ...afterBanner, ...rest], DEMO_HEADER);
}

/** Each Studio demo's first page as a template. */
export const DEMO_TEMPLATES: readonly TemplateInfo[] = (Object.keys(DEMO_ICONS) as StudioDemoId[]).map((id) => ({
  id: demoTemplateId(id),
  icon: DEMO_ICONS[id],
  demo: id,
  recommended: true,
  make: (ctx: SectionContext) => demoStudioPage(id, ctx),
}));

const DEMO_VERTICALS: readonly string[] = ["taxi", "instructors", "marketplace"];
const DEMO_TYPES: readonly string[] = ["delivery", "food", "rides", "school"];

/** The Studio demo of a project's kind: its vertical's, else its type's; none for a kind without one. */
export function studioDemoOf(kind: { type: string; vertical?: string | null } | null): StudioDemoId | null {
  if (!kind) return null;
  if (kind.vertical) return DEMO_VERTICALS.includes(kind.vertical) ? (kind.vertical as StudioDemoId) : null;
  return DEMO_TYPES.includes(kind.type) ? (kind.type as StudioDemoId) : null;
}
