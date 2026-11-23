import type { IconName } from "../../components/icon-names";
import { CLOTHES_DEMO, MOBILES_DEMO, type StudioDemoId } from "../demo/constants";

/**
 * 208 Yallapp Studio's premium shop types (the owner's planning doc, 23
 * November 2026): Studio-only kinds of shop, each a store (the store engine,
 * no vertical) with two premium templates of its own (its Signature looks A
 * and B, lib/studio/demo-designs), grouped in sections on /start?for=studio
 * and on Studio's new project (section, then type, then template). ONE list:
 * a type is offered once its demo (its looks, products and photos) exists
 * (`demo`); until then it shows as coming soon, never selectable. A later
 * type plugs in by adding its demo (lib/demo/constants.ts SHOP_TYPE_DEMOS),
 * its two looks (lib/studio/demo-designs/<type>-signature.ts, registered in
 * ./demo-designs/index.ts) and its `demo` here.
 *
 * Each type has the liability notice the dashboard shows its owner once
 * (`liability`, lib/studio/liability.ts), and the types whose shops sell on
 * installments elsewhere (furniture, electronics, mobiles, computers) show
 * "Installments coming soon" only (`installmentsSoon`).
 */

export const SHOP_SECTIONS = ["fashion", "beauty", "home", "kids", "shopping"] as const;
export type ShopSection = (typeof SHOP_SECTIONS)[number];

export const SHOP_TYPE_IDS = ["clothes", "kids_clothes", "cosmetics", "furniture", "decor", "crochet", "toys", "electronics", "mobiles", "computers"] as const;
export type ShopTypeId = (typeof SHOP_TYPE_IDS)[number];

/** Which notice the owner reads and accepts (lib/studio/liability.ts): generic, because laws differ by country. */
export const LIABILITY_KINDS = ["general", "cosmetics", "kids", "warranty"] as const;
export type LiabilityKind = (typeof LIABILITY_KINDS)[number];

export interface ShopType {
  id: ShopTypeId;
  /** The sections it is listed in, the first its own (kids' clothes is in Fashion and in Kids & toys, the same type). */
  sections: readonly ShopSection[];
  icon: IconName;
  /** Its Studio demo (its looks, products and photos); missing: coming soon. */
  demo?: StudioDemoId;
  liability: LiabilityKind;
  /** "Installments coming soon" on its looks and its product pages; never active. */
  installmentsSoon?: boolean;
}

export const SHOP_TYPES: readonly ShopType[] = [
  { id: "clothes", sections: ["fashion"], icon: "checkroom", demo: CLOTHES_DEMO, liability: "general" },
  { id: "kids_clothes", sections: ["fashion", "kids"], icon: "child_care", liability: "kids" },
  { id: "cosmetics", sections: ["beauty"], icon: "spa", liability: "cosmetics" },
  { id: "furniture", sections: ["home"], icon: "chair", liability: "warranty", installmentsSoon: true },
  { id: "decor", sections: ["home"], icon: "living", liability: "general" },
  { id: "crochet", sections: ["home"], icon: "palette", liability: "general" },
  { id: "toys", sections: ["kids"], icon: "toys", liability: "kids" },
  { id: "electronics", sections: ["shopping"], icon: "devices", liability: "warranty", installmentsSoon: true },
  { id: "mobiles", sections: ["shopping"], icon: "smartphone", demo: MOBILES_DEMO, liability: "warranty", installmentsSoon: true },
  { id: "computers", sections: ["shopping"], icon: "computer", liability: "warranty", installmentsSoon: true },
];

/**
 * Studio's shops already offered that sit in a section beside the new types
 * (Shopping & stores: the flower shop and the multi-vendor market), by their
 * demo; listed after the section's types.
 */
export const SECTION_DEMOS: Partial<Record<ShopSection, readonly StudioDemoId[]>> = {
  shopping: ["flowers", "marketplace"],
};

export function shopTypeById(id: string | null | undefined): ShopType | null {
  return SHOP_TYPES.find((t) => t.id === id) ?? null;
}

/** Whether the type can be chosen now (its demo is made). */
export function shopTypeReady(t: ShopType): boolean {
  return t.demo !== undefined;
}

/** A section's types, each once, the ready ones first (in the list's order). */
export function shopTypesIn(section: ShopSection): ShopType[] {
  const own = SHOP_TYPES.filter((t) => t.sections.includes(section));
  return [...own.filter(shopTypeReady), ...own.filter((t) => !shopTypeReady(t))];
}

/** The type a Studio demo is the demo of; null for the other demos. */
export function shopTypeOfDemo(demo: StudioDemoId | null | undefined): ShopType | null {
  return demo ? (SHOP_TYPES.find((t) => t.demo === demo) ?? null) : null;
}

/** The template a type's look starts from (`<demo>_signature_<look>`); null while it is coming soon. */
export function shopTypeTemplate(t: ShopType, look: "a" | "b" = "a"): string | null {
  return t.demo ? `${t.demo}_signature_${look}` : null;
}

/**
 * The type a project is, by the template it started from (`App.design`, a
 * type's look) or its demo's; null for every other project.
 */
export function shopTypeOfDesign(design: string | null | undefined): ShopType | null {
  if (!design) return null;
  return SHOP_TYPES.find((t) => t.demo && (design === `${t.demo}_signature_a` || design === `${t.demo}_signature_b`)) ?? null;
}
