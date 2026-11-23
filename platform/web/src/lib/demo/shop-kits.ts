import type { ShopTypeDemo } from "./constants";
import type { ShopKit } from "./shop-kit";
import { DECOR_KIT } from "./kits/decor";
import { CROCHET_KIT } from "./kits/crochet";
import { FURNITURE_KIT } from "./kits/furniture";

/**
 * 210 The shop types whose demo is a kit (lib/demo/shop-kit.ts), by demo:
 * home decor (Sakan), crochet and handmade (Ghurza), furniture (Rukn). A
 * later type adds its kit here.
 */
export const SHOP_KITS: Partial<Record<ShopTypeDemo, ShopKit>> = {
  decor: DECOR_KIT,
  crochet: CROCHET_KIT,
  furniture: FURNITURE_KIT,
};

/** A demo's kit; null for every other demo (Lujain keeps its own files). */
export function kitOf(id: string | null | undefined): ShopKit | null {
  return id && Object.hasOwn(SHOP_KITS, id) ? (SHOP_KITS[id as ShopTypeDemo] ?? null) : null;
}

export const KIT_DEMOS = Object.keys(SHOP_KITS) as ShopTypeDemo[];
