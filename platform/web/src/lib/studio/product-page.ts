import { STUDIO_PRODUCT_SCREEN, type StudioHeader, type StudioNode, type StudioPage, type StudioProductPart, type StudioProductType } from "../pages/types";
import { newNode, newNodeId } from "./elements";
import type { SectionContext, SectionWord } from "./sections";

/**
 * 228 A look's own product page, declared in a few lines: the product page's
 * elements (lib/pages/types.ts STUDIO_PRODUCT_TYPES) in the order the look
 * wants them, each in its look, with its colours, spacing and words, on a
 * Studio page drawn for the product screen (`StudioPage.screen` `product`).
 * The app draws it for every product the shop opens, bound to it; a look
 * that declares none keeps the app's own product screen.
 *
 *   pages: (ctx) => [productPageOf(ctx, { parts: [{ type: "product_gallery", look: "pager" }, …] })]
 *
 * 228.7 The look's own elements go between them as `{ element }` (a plan
 * card, a material strip, a frame holding `productPart(…)`s).
 */

/** The product page's address in a project (one per project). */
export const PRODUCT_PAGE_SLUG = "product";

export interface ProductPagePart {
  type: StudioProductType;
  /** One of its type's looks (STUDIO_PRODUCT_LOOKS); missing, the first. */
  look?: string;
  related?: StudioProductPart["related"];
  rows?: number;
  radius?: number;
  accent?: string;
  dark_accent?: string;
  /** Its title (Add to cart's words), in the template's words; missing, the app's own. */
  text?: SectionWord;
  /** Buy now's words, or the delivery element's own lines. */
  title?: SectionWord;
  /** Anything else of the element: its colours, font, spacing, `pin`. */
  node?: Partial<StudioNode>;
}

/** 228.7 One of the look's own elements between the product's (its plan card, its material strip, a frame around the photos). */
export interface ProductPageElement {
  element: StudioNode;
}

export interface ProductPageSpec {
  parts: readonly (ProductPagePart | ProductPageElement)[];
  /** Its header; missing, none (the photos reach under the status bar, the back button over them). */
  header?: StudioHeader | null;
  background?: string;
  dark_background?: string;
}

/** One product page element as the look declares it. */
export function productPart(ctx: Pick<SectionContext, "w" | "newId">, part: ProductPagePart): StudioNode {
  const newId = ctx.newId ?? newNodeId;
  const made = newNode(part.type, { source: "products", brand: "#000000", text: () => "", newId });
  const options: StudioProductPart = {
    ...(part.look ? { look: part.look } : {}),
    ...(part.related && part.related !== "related" ? { related: part.related } : {}),
    ...(part.rows ? { rows: part.rows } : {}),
    ...(part.radius !== undefined ? { radius: part.radius } : {}),
    ...(part.accent ? { accent: part.accent } : {}),
    ...(part.dark_accent ? { dark_accent: part.dark_accent } : {}),
  };
  return {
    ...made,
    ...(Object.keys(options).length ? { product_part: options } : {}),
    ...(part.text ? { text: ctx.w(part.text) } : {}),
    ...(part.title ? { title: ctx.w(part.title) } : {}),
    ...part.node,
  };
}

/** A look's product page. */
export function productPage(ctx: Pick<SectionContext, "w" | "newId">, spec: ProductPageSpec): StudioPage {
  const newId = ctx.newId ?? newNodeId;
  return {
    ...(spec.header ? { header: spec.header } : {}),
    ...(spec.background ? { background: spec.background } : {}),
    ...(spec.dark_background ? { dark_background: spec.dark_background } : {}),
    show_tabs: false,
    screen: STUDIO_PRODUCT_SCREEN,
    body: { id: newId(), type: "column", gap: 0, children: spec.parts.map((p) => ("element" in p ? p.element : productPart(ctx, p))) },
  };
}

/** The look's product page as one of its own pages (`DemoDesign.pages`). */
export function productPageOf(ctx: Pick<SectionContext, "w" | "newId">, spec: ProductPageSpec): { slug: string; title: SectionWord; studio: StudioPage } {
  return { slug: PRODUCT_PAGE_SLUG, title: "pProductPage" as SectionWord, studio: productPage(ctx, spec) };
}
