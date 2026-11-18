import "server-only";
import type { IconName } from "@/components/icon-names";
import { KINDS, type KindInfo } from "@/lib/app/kinds";
import { demoKind, FLOWER_SHOP_DEMO, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { allSolutionsFor, kindNameFor, type LocalizedSolution } from "@/lib/marketing-lang";
import { STUDIO_ONLY_KINDS } from "@/lib/studio/section";
import type { Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";

/**
 * 154 The kinds of apps each product makes, as chips on the pricing page
 * (the app's and Studio's "in detail" cards), taken from the code, never
 * written by hand: every kind of lib/app/kinds.ts (Studio offers them all
 * on /studio/new, the app all but Studio's own, `STUDIO_ONLY_KINDS`), every
 * page under /solutions (a university is a school project of its own) and
 * every Studio demo (the flower shop is a store with its own page). A kind
 * added to the registry shows here by itself, in the site's own name for it
 * (its /solutions page's, else lib/app/kinds.ts's, translated by
 * src/content/{ar,tr}/marketing.ts `kindNames`);
 * tests/unit/pricing-studio.test.ts fails when one is left out or isn't
 * translated.
 */

export type Product = "regular" | "studio";

export interface KindChip {
  id: string;
  label: string;
  icon: IconName;
  /** Its page on the site, when it has one. */
  href: string | null;
  /** The kinds, /solutions pages and Studio demos the chip stands for. */
  covers: string[];
}

/** The most common kinds first, as many as the chips show before "+N more"; the rest follow in the registry's order. */
const FIRST: Record<Product, readonly string[]> = {
  regular: ["store", "academy", "restaurant", "bookings", "clinic", "fitness", "real_estate", "events"],
  studio: ["store", "restaurant", "food", "marketplace", "delivery", "rides", "academy", "school"],
};

/** How many chips show before the rest are folded under "+N more". */
export const KINDS_SHOWN = 8;

/** Studio demos that are a kind's own speciality, with their own name and page: Leqaa, the flower shop, is a store. */
const DEMO_CHIPS: Partial<Record<StudioDemoId, { name: string; icon: IconName; path: string }>> = {
  [FLOWER_SHOP_DEMO]: { name: "Flower shop", icon: "local_florist", path: "/yallapp-studio/flowers" },
};

/** The kinds a product makes, as chips: the common ones first. */
export function kindChips(lang: Lang, product: Product): KindChip[] {
  const solutions = allSolutionsFor(lang);
  const kinds = product === "studio" ? KINDS : KINDS.filter((kind) => !STUDIO_ONLY_KINDS.has(kind.id));
  const used = new Set<string>();
  const ownSolution = (kind: KindInfo): LocalizedSolution | undefined =>
    solutions.find((s) => s.kind === kind.id && s.id === kind.marketing.slug) ?? solutions.find((s) => s.kind === kind.id && !used.has(s.id));
  const page = (id: string) => localePath(lang, `/solutions/${id}`);
  const chips: KindChip[] = [];
  for (const kind of kinds) {
    const solution = ownSolution(kind);
    if (solution) used.add(solution.id);
    // Its Studio demos, unless one has a chip of its own (the premium academy is an academy).
    const demos = product === "studio" ? STUDIO_DEMO_TYPES.filter((demo) => !DEMO_CHIPS[demo] && demoKind(demo).id === kind.id) : [];
    chips.push({
      id: kind.id,
      label: solution?.name ?? kindNameFor(lang, kind.name),
      icon: solution?.icon ?? kind.marketing.icon,
      href: solution ? page(solution.id) : null,
      covers: [...new Set([kind.id, ...(solution ? [solution.id] : []), ...demos])],
    });
    // The kind's other pages (a school's: the university), right after it.
    for (const other of solutions.filter((s) => s.kind === kind.id && s !== solution)) {
      used.add(other.id);
      chips.push({ id: other.id, label: other.name, icon: other.icon, href: page(other.id), covers: [other.id] });
    }
    // Its Studio demos with a chip of their own (the store's: the flower shop).
    if (product === "studio") {
      for (const demo of STUDIO_DEMO_TYPES.filter((d) => DEMO_CHIPS[d] && demoKind(d).id === kind.id)) {
        const own = DEMO_CHIPS[demo]!;
        chips.push({ id: demo, label: kindNameFor(lang, own.name), icon: own.icon, href: localePath(lang, own.path), covers: [demo] });
      }
    }
  }
  const first = FIRST[product];
  const rank = (chip: KindChip) => (first.includes(chip.id) ? first.indexOf(chip.id) : first.length);
  return chips.map((chip, at) => ({ chip, at })).sort((a, b) => rank(a.chip) - rank(b.chip) || a.at - b.at).map((x) => x.chip);
}
