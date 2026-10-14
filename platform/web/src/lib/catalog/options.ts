import { randomBytes } from "node:crypto";
import type { CatalogCurrency, CatalogOptionGroup, CatalogOrderLine } from "../data/types";
import { centsToDecimal, formatCents, parsePrice } from "./money";

/**
 * 26 A product's option groups (a dish's size, sauce or extras): what the
 * dashboard saves, what the app gets and how a cart line's choices are
 * checked and priced. The server always prices the options itself; the app
 * only sends the IDs it chose.
 */

export const OPTION_GROUPS_MAX = 10;
export const OPTIONS_PER_GROUP_MAX = 20;
const NAME_MAX = 60;
const ID_PATTERN = /^[a-z0-9_-]{1,32}$/;

export type ChosenOption = NonNullable<CatalogOrderLine["options"]>[number] & { id: string };

export type OptionCheck = { ok: true; chosen: ChosenOption[]; deltaCents: number } | { ok: false; problem: string };

/** The groups of a product, never null. */
export function optionGroupsOf(product: { optionGroups?: CatalogOptionGroup[] | null }): CatalogOptionGroup[] {
  return product.optionGroups ?? [];
}

/** How the app gets a product's groups (`ProductDetail.option_groups`). */
export function optionGroupsJson(groups: CatalogOptionGroup[], currency: CatalogCurrency) {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    min: g.min,
    max: g.max,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      price_delta: centsToDecimal(o.priceDeltaCents),
      price_delta_formatted: o.priceDeltaCents > 0 ? `+${formatCents(o.priceDeltaCents, currency)}` : null,
    })),
  }));
}

/**
 * Checks the options chosen for one cart line against the product's groups:
 * every ID known, none twice, and between `min` and `max` per group. Returns
 * the options as priced, in the groups' order, or the problem to show.
 */
export function checkOptions(groups: CatalogOptionGroup[], ids: string[]): OptionCheck {
  if (new Set(ids).size !== ids.length) return { ok: false, problem: "An option was chosen twice. Please choose the options again." };
  const known = new Map<string, { group: CatalogOptionGroup; option: CatalogOptionGroup["options"][number] }>();
  for (const group of groups) for (const option of group.options) known.set(option.id, { group, option });
  if (ids.some((id) => !known.has(id))) return { ok: false, problem: "The options of this item changed. Please choose them again." };
  const chosen: ChosenOption[] = [];
  let deltaCents = 0;
  for (const group of groups) {
    const picked = group.options.filter((o) => ids.includes(o.id));
    if (picked.length < group.min) {
      return { ok: false, problem: group.min === 1 ? `Choose a ${group.name.toLowerCase()}.` : `Choose at least ${group.min} for ${group.name}.` };
    }
    if (picked.length > group.max) return { ok: false, problem: `Choose up to ${group.max} for ${group.name}.` };
    for (const option of picked) {
      chosen.push({ id: option.id, group: group.name, name: option.name, priceDeltaCents: option.priceDeltaCents });
      deltaCents += option.priceDeltaCents;
    }
  }
  return { ok: true, chosen, deltaCents };
}

/** The option IDs of a cart line as the app sent them; null when they aren't a list of IDs. */
export function lineOptionIds(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 50) return null;
  const ids: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;
    ids.push(id);
  }
  return ids;
}

/** A new ID for a group or an option, unused in `taken`. */
function newOptionId(prefix: string, taken: Set<string>): string {
  for (;;) {
    const id = `${prefix}${randomBytes(4).toString("hex")}`;
    if (!taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
}

/** What the dashboard's options editor sends (one JSON field). */
interface GroupInput {
  id?: unknown;
  name?: unknown;
  min?: unknown;
  max?: unknown;
  options?: unknown;
}

interface OptionInput {
  id?: unknown;
  name?: unknown;
  price?: unknown;
}

/**
 * The options editor's groups, checked: names, prices, and `min` and `max`
 * that fit the group's options. IDs the editor sends back are kept (so a
 * customer's cart still matches after an edit); new groups and options get
 * new ones. An empty editor saves no groups.
 */
export function parseOptionGroups(json: string): { ok: true; value: CatalogOptionGroup[] } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = json.trim() === "" ? [] : JSON.parse(json);
  } catch {
    return { ok: false, error: "The options couldn't be read. Please try again." };
  }
  if (!Array.isArray(raw)) return { ok: false, error: "The options couldn't be read. Please try again." };
  const groups = (raw as GroupInput[]).filter((g) => typeof g === "object" && g !== null);
  if (groups.length > OPTION_GROUPS_MAX) return { ok: false, error: `A product can have up to ${OPTION_GROUPS_MAX} option groups.` };
  const taken = new Set<string>();
  for (const g of groups) {
    if (typeof g.id === "string" && ID_PATTERN.test(g.id)) taken.add(g.id);
    for (const o of Array.isArray(g.options) ? (g.options as OptionInput[]) : []) if (typeof o?.id === "string" && ID_PATTERN.test(o.id)) taken.add(o.id);
  }
  const used = new Set<string>();
  const keep = (id: unknown, prefix: string) => {
    if (typeof id === "string" && ID_PATTERN.test(id) && !used.has(id)) {
      used.add(id);
      return id;
    }
    const fresh = newOptionId(prefix, taken);
    used.add(fresh);
    return fresh;
  };
  const out: CatalogOptionGroup[] = [];
  for (const [i, g] of groups.entries()) {
    const label = `Option group ${i + 1}`;
    const name = typeof g.name === "string" ? g.name.trim() : "";
    if (!name || name.length > NAME_MAX) return { ok: false, error: `${label}: enter a name of up to ${NAME_MAX} characters, like "Size".` };
    // Rows left blank in the editor are dropped.
    const options = (Array.isArray(g.options) ? (g.options as OptionInput[]) : []).filter(
      (o) => typeof o === "object" && o !== null && (String(o.name ?? "").trim() !== "" || String(o.price ?? "").trim() !== ""),
    );
    if (options.length === 0) return { ok: false, error: `${name}: add at least one option.` };
    if (options.length > OPTIONS_PER_GROUP_MAX) return { ok: false, error: `${name}: use at most ${OPTIONS_PER_GROUP_MAX} options.` };
    const parsed: { rawId: unknown; name: string; priceDeltaCents: number }[] = [];
    for (const o of options) {
      const optionName = typeof o.name === "string" ? o.name.trim() : "";
      if (!optionName || optionName.length > NAME_MAX) return { ok: false, error: `${name}: every option needs a name of up to ${NAME_MAX} characters.` };
      const priceText = String(o.price ?? "").trim();
      const delta = priceText === "" ? 0 : parsePrice(priceText);
      if (delta === null) return { ok: false, error: `${name}: enter the extra price of “${optionName}” like 15 or 15.50, or leave it empty.` };
      parsed.push({ rawId: o.id, name: optionName, priceDeltaCents: delta });
    }
    const min = Number(g.min ?? 0);
    const max = Number(g.max ?? 1);
    if (!Number.isInteger(min) || min < 0 || min > parsed.length) return { ok: false, error: `${name}: "at least" can be 0 to ${parsed.length}.` };
    if (!Number.isInteger(max) || max < 1 || max > parsed.length) return { ok: false, error: `${name}: "at most" can be 1 to ${parsed.length}.` };
    if (max < min) return { ok: false, error: `${name}: "at most" can't be less than "at least".` };
    out.push({
      id: keep(g.id, "g"),
      name,
      min,
      max,
      options: parsed.map((o) => ({ id: keep(o.rawId, "o"), name: o.name, priceDeltaCents: o.priceDeltaCents })),
    });
  }
  return { ok: true, value: out };
}

/** "Large, Extra cheese": a line's options as one text, for the kitchen and emails. */
export function optionsText(line: Pick<CatalogOrderLine, "options">): string {
  return (line.options ?? []).map((o) => o.name).join(", ");
}
