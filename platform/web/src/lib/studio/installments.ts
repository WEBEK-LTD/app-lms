import type { StudioNode } from "../pages/types";
import { newNodeId } from "./elements";
import type { SectionContext, SectionInfo } from "./sections";
import { shopTypeById, type ShopTypeId } from "./shop-types";

/**
 * 208 "Installments coming soon" (the owner: installments are NOT active for
 * furniture, electronics, mobiles and computers; show "التقسيط قريبًا"
 * only). A tag, never a way to pay: it opens nothing and promises no date.
 * The types that show it say so in lib/studio/shop-types.ts
 * (`installmentsSoon`); their looks put this element where the design has
 * it (under a price, on a product's card), and any store may drop it from
 * the editor's ready sections. Its words are the app's (MSA in Arabic).
 */

/** Whether a type shows the tag (and never takes installments). */
export function showsInstallmentsSoon(type: ShopTypeId): boolean {
  return shopTypeById(type)?.installmentsSoon === true;
}

/** The tag: a soft pill with a clock and "Installments coming soon", in the look's colours. */
export function installmentsTag(ctx: SectionContext, look: { color: string; dark_color: string; background: string; dark_background: string } = { color: "#5F5B55", dark_color: "#B6B0A6", background: "#EEEAE3", dark_background: "#23221F" }): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "row",
    name: ctx.w("installmentsSoon"),
    width: "hug",
    radius: 15,
    gap: 6,
    cross: "center",
    self_align: "start",
    // 211 Its own height: a narrow card (a services tile) wraps its words to a second line rather than cut them.
    padding: { top: 7, end: 12, bottom: 7, start: 10 },
    background: look.background,
    dark_background: look.dark_background,
    children: [
      { id: id(), type: "icon", icon: "schedule", icon_size: 16, color: look.color, dark_color: look.dark_color },
      { id: id(), type: "text", text: ctx.w("installmentsSoon"), max_lines: 2, font: { size: 12.5, weight: 700, line_height: 1.2 }, color: look.color, dark_color: look.dark_color },
    ],
  };
}

/** The tag as one of the editor's ready sections, for any store. */
export const INSTALLMENTS_SECTION: SectionInfo = {
  id: "installments_soon",
  icon: "schedule",
  isNew: true,
  fits: { types: ["store"] },
  make: (ctx) => ({ ...installmentsTag(ctx), margin: { top: 8, end: 16, bottom: 8, start: 16 } }),
};
