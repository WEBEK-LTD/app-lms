import { DEFAULT_ZONE, zoneOfPhone } from "../analytics/zone";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { Client, MarketDiscount, MarketDiscountKind, MarketTemplate, TemplateDesigner } from "../data/types";
import { DISCOUNT_MESSAGES, discountState, readDiscount, type DiscountForm, type DiscountState } from "./discounts";

/**
 * 106.12 A designer's discounts on their own templates (Designer area ›
 * Discounts): price drops, flash sales and coupon codes made, ended now or
 * deleted. An order keeps what it got (the code, the price before and what
 * came off), so deleting a discount changes no sale. Times are entered in
 * the designer's time zone (their WhatsApp number's country, else
 * Istanbul's) and kept as instants.
 */

/** The time zone a designer's discount times are entered and shown in. */
export function designerZone(client: Pick<Client, "whatsapp">): string {
  return zoneOfPhone(client.whatsapp) ?? DEFAULT_ZONE;
}

export type CreateDiscountResult = { ok: true; discount: MarketDiscount } | { ok: false; errors: Record<string, string> };

/** A new discount on one of the designer's templates, from the designer's form. */
export async function createDiscount(store: DataStore, designer: Pick<TemplateDesigner, "id">, template: MarketTemplate, form: DiscountForm, now: Date): Promise<CreateDiscountResult> {
  if (template.designerId !== designer.id) return { ok: false, errors: { form: DISCOUNT_MESSAGES.gone } };
  const read = readDiscount(form, template, now);
  if (!read.ok) return read;
  const discount: MarketDiscount = { id: newId(), templateId: template.id, designerId: designer.id, ...read.value, createdAt: now, updatedAt: now };
  const created = await store.createMarketDiscount(discount);
  if (!created) return { ok: false, errors: { code: DISCOUNT_MESSAGES.codeTaken } };
  return { ok: true, discount: created };
}

/** The designer's own discount, or null. */
async function own(store: DataStore, designer: Pick<TemplateDesigner, "id">, id: string): Promise<MarketDiscount | null> {
  const found = id ? await store.getMarketDiscount(id) : null;
  return found && found.designerId === designer.id ? found : null;
}

/** Ends a running (or scheduled) discount now. False when it isn't theirs or ended already. */
export async function endDiscount(store: DataStore, designer: Pick<TemplateDesigner, "id">, id: string, now: Date): Promise<boolean> {
  return (await own(store, designer, id)) ? store.endMarketDiscount(id, now) : false;
}

/** Deletes one of their discounts (the orders keep what they got). */
export async function deleteDiscount(store: DataStore, designer: Pick<TemplateDesigner, "id">, id: string): Promise<boolean> {
  return (await own(store, designer, id)) ? store.deleteMarketDiscount(id) : false;
}

export interface DiscountRow {
  discount: MarketDiscount;
  state: DiscountState;
  /** A coupon's uses: its paid orders. */
  uses: number;
}

/** A template's discounts by kind, the running and scheduled first, then the ended; each with its state and uses. */
export async function templateDiscounts(store: DataStore, template: Pick<MarketTemplate, "id">, now: Date): Promise<Record<MarketDiscountKind, DiscountRow[]>> {
  const discounts = await store.listMarketDiscounts({ templateIds: [template.id] });
  const uses = await store.countMarketDiscountUses(discounts.filter((d) => d.kind === "coupon").map((d) => d.id));
  const order: Record<DiscountState, number> = { live: 0, scheduled: 1, used_up: 2, ended: 3 };
  const rows = discounts
    .map((discount) => ({ discount, uses: uses[discount.id] ?? 0, state: discountState(discount, now, uses[discount.id] ?? 0) }))
    .sort((a, b) => order[a.state] - order[b.state] || b.discount.createdAt.getTime() - a.discount.createdAt.getTime());
  return { drop: rows.filter((r) => r.discount.kind === "drop"), flash: rows.filter((r) => r.discount.kind === "flash"), coupon: rows.filter((r) => r.discount.kind === "coupon") };
}
