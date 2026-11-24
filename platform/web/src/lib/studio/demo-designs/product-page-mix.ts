import { STUDIO_PRODUCT_TYPES, type StudioNode } from "../../pages/types";
import { productPageOf, productPart, type ProductPagePart, type ProductPageSpec } from "../product-page";
import type { SectionContext } from "../sections";

/**
 * 228.7 A look's product page with its own elements between the product
 * page's (lib/studio/product-page.ts): a hairline, the mascot's word, a
 * ruler of ages. Each item is a product page element as `productPageOf`
 * takes it, or a node of the look's as it is.
 */
export type ProductPageItem = ProductPagePart | StudioNode;

const isPart = (item: ProductPageItem): item is ProductPagePart => (STUDIO_PRODUCT_TYPES as readonly string[]).includes(item.type) && !("id" in item);

export function mixedProductPage(ctx: Pick<SectionContext, "w" | "newId">, spec: Omit<ProductPageSpec, "parts">, items: readonly ProductPageItem[]): ReturnType<typeof productPageOf> {
  const page = productPageOf(ctx, { ...spec, parts: [] });
  page.studio.body.children = items.map((item) => (isPart(item) ? productPart(ctx, item) : item));
  return page;
}
