import { centsToDecimal, parsePrice } from "../catalog/money";
import type { Dish, DishChoiceGroup, MenuSection, OpeningPeriod, RestaurantMenu, ShipmentPlace } from "../data/types";
import { coordinatesIn } from "../delivery/locate";
import { DELIVERY_LIMITS } from "../delivery/settings";
import { minutesOf } from "../bookings/time";

/**
 * 105.1 The dashboard's restaurant forms, checked: a restaurant, its hours,
 * a dish with its choices; and the menu's changes. Messages are English;
 * the dashboard translates them (`food.known`).
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export const FOOD_LIMITS = {
  restaurants: 300,
  restaurantName: 80,
  description: 500,
  sections: 40,
  sectionName: 60,
  dishes: 400,
  dishName: 80,
  groups: 8,
  choices: 30,
  staff: 30,
  maxPrepMinutes: 180,
  /** 50%: the company's share of an order's subtotal, at most. */
  maxCommissionBp: 5000,
} as const;

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

function money(form: Record<string, string>, name: string, errors: Record<string, string>, required: boolean): number {
  const text = str(form, name);
  if (!text) {
    if (required) errors[name] = "Enter a price.";
    return 0;
  }
  const cents = parsePrice(text);
  if (cents === null || cents > DELIVERY_LIMITS.maxCents) {
    errors[name] = "Enter a price, like 45 or 45.50.";
    return 0;
  }
  return cents;
}

export interface RestaurantForm {
  name: string;
  description: string | null;
  phone: string | null;
  address: ShipmentPlace;
  cuisines: string[];
  prepMinutes: number;
  minOrderCents: number;
  maxKm: number | null;
  commissionBp: number;
}

/** A restaurant's details; the phone is checked by the caller (it knows the app's country). */
export function parseRestaurantForm(form: Record<string, string>, cuisineIds: string[], phone: (text: string) => string | null): Parsed<RestaurantForm> {
  const errors: Record<string, string> = {};
  const name = oneLine(str(form, "name"));
  if (!name) errors.name = "Enter the restaurant's name.";
  else if (name.length > FOOD_LIMITS.restaurantName) errors.name = `Keep the name under ${FOOD_LIMITS.restaurantName} characters.`;
  const description = str(form, "description");
  if (description.length > FOOD_LIMITS.description) errors.description = `Keep it under ${FOOD_LIMITS.description} characters.`;
  const phoneText = str(form, "phone");
  const e164 = phoneText ? phone(phoneText) : null;
  if (phoneText && !e164) errors.phone = "Enter a valid phone number, or leave it empty.";
  const address = oneLine(str(form, "address"));
  if (address.length < 3 || address.length > 300) errors.address = "Enter the restaurant's address.";
  const mapText = str(form, "map");
  const at = mapText ? coordinatesIn(mapText) : null;
  if (!mapText) errors.map = "Paste the restaurant's place from Google Maps, or its coordinates like 30.0444, 31.2357.";
  else if (!at) errors.map = "We couldn't find a place in this. Paste the link from the address bar of Google Maps, or coordinates like 30.0444, 31.2357.";
  const details = oneLine(str(form, "details"));
  const prep = Number(str(form, "prepMinutes"));
  if (!Number.isInteger(prep) || prep < 5 || prep > FOOD_LIMITS.maxPrepMinutes) errors.prepMinutes = `Enter the minutes from 5 to ${FOOD_LIMITS.maxPrepMinutes}.`;
  const minOrderCents = money(form, "minOrder", errors, false);
  let maxKm: number | null = null;
  const maxText = str(form, "maxKm");
  if (maxText) {
    const n = Number(maxText.replaceAll(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > DELIVERY_LIMITS.maxKm) errors.maxKm = `Enter a distance from 1 to ${DELIVERY_LIMITS.maxKm} km, or leave it empty.`;
    else maxKm = Math.round(n * 10) / 10;
  }
  const percent = Number(str(form, "commission").replaceAll(",", ".").replaceAll("%", "") || "0");
  const commissionBp = Math.round(percent * 100);
  if (!Number.isFinite(percent) || percent < 0 || commissionBp > FOOD_LIMITS.maxCommissionBp) errors.commission = "Enter your share from 0 to 50%.";
  const cuisines = cuisineIds.filter((id) => form[`cuisine-${id}`] === "on");
  if (Object.keys(errors).length || !at) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      description: description || null,
      phone: e164,
      address: { address, details: details ? details.slice(0, 200) : null, lat: Math.round(at.lat * 1e6) / 1e6, lng: Math.round(at.lng * 1e6) / 1e6 },
      cuisines,
      prepMinutes: prep,
      minOrderCents,
      maxKm,
      commissionBp,
    },
  };
}

export const WEEK_DAYS: OpeningPeriod["day"][] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** The opening hours: up to two periods a day (`<day>-opens`, `<day>-closes`, `<day>-opens2`, `<day>-closes2`); empty is closed. */
export function parseHoursForm(form: Record<string, string>): Parsed<OpeningPeriod[]> {
  const errors: Record<string, string> = {};
  const hours: OpeningPeriod[] = [];
  for (const day of WEEK_DAYS) {
    for (const n of ["", "2"]) {
      const opens = str(form, `${day}-opens${n}`);
      const closes = str(form, `${day}-closes${n}`);
      if (!opens && !closes) continue;
      if (minutesOf(opens) === null || minutesOf(closes) === null || opens === closes) {
        errors[`${day}-opens${n}`] = "Enter when it opens and when it closes, like 10:00 and 23:30.";
        continue;
      }
      hours.push({ day, opens, closes });
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: hours };
}

/** A dish's choice groups as the form's text area holds them: "Size (1-1): Regular, Large +15". */
export function choicesText(groups: DishChoiceGroup[]): string {
  return groups
    .map((g) => {
      const choices = g.choices.map((c) => `${c.name}${c.extraCents > 0 ? ` +${centsToDecimal(c.extraCents)}` : ""}${c.available ? "" : " (sold out)"}`);
      return `${g.name} (${g.min}-${g.max}): ${choices.join(", ")}`;
    })
    .join("\n");
}

/**
 * The choice groups of the text area, one a line: its name, how many to
 * choose ("(1-1)" one is required, "(0-2)" up to two; "(0-1)" when left
 * out), then its choices, each with what it adds ("+15") and "(sold out)".
 * Groups and choices keep their IDs by name; new ones take the menu's next.
 */
export function parseChoices(text: string, saved: DishChoiceGroup[], nextId: number): { groups: DishChoiceGroup[]; nextId: number } | { error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > FOOD_LIMITS.groups) return { error: `Add up to ${FOOD_LIMITS.groups} groups of choices.` };
  const groups: DishChoiceGroup[] = [];
  let next = nextId;
  for (const line of lines) {
    const group = readGroupLine(line.replace(/،/g, ","));
    if (!group) return { error: `Write each group on its own line as its name, how many to choose and its choices, like "Size (1-1): Regular, Large +15". Check: ${line.slice(0, 60)}` };
    const { name, min, max } = group;
    const known = saved.find((g) => g.name.toLowerCase() === name.toLowerCase());
    const choices: DishChoiceGroup["choices"] = [];
    for (const raw of group.choices.split(",").map((c) => c.trim()).filter(Boolean)) {
      const { body, soldOut } = withoutSoldOut(raw);
      const plus = body.lastIndexOf("+");
      const amount = plus >= 0 ? body.slice(plus + 1).trim() : "";
      const priced = plus >= 0 && /^[\d.,]+$/.test(amount);
      const choiceName = oneLine(priced ? body.slice(0, plus) : body);
      const extraCents = priced ? parsePrice(amount) : 0;
      if (!choiceName || choiceName.length > 60 || extraCents === null || extraCents > DELIVERY_LIMITS.maxCents) return { error: `Check the choice "${raw.slice(0, 40)}" of ${name}: a name, then + and what it adds, like "Large +15".` };
      if (choices.some((c) => c.name.toLowerCase() === choiceName.toLowerCase())) return { error: `"${choiceName}" is there twice in ${name}.` };
      const id = known?.choices.find((c) => c.name.toLowerCase() === choiceName.toLowerCase())?.id ?? next++;
      choices.push({ id, name: choiceName, extraCents, available: !soldOut });
    }
    if (choices.length === 0 || choices.length > FOOD_LIMITS.choices) return { error: `Give ${name} from 1 to ${FOOD_LIMITS.choices} choices.` };
    if (max < 1 || min > max || max > choices.length) return { error: `${name}: choose how many from 0 to ${choices.length}, the first number not over the second, like (1-1) or (0-2).` };
    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) return { error: `"${name}" is there twice.` };
    groups.push({ id: known?.id ?? next++, name, min, max, choices });
  }
  return { groups, nextId: next };
}

const SOLD_OUT = ["(sold out)", "(نفد)", "(tükendi)"];

/** A choice's text without its "(sold out)" mark, and whether it had one. */
function withoutSoldOut(raw: string): { body: string; soldOut: boolean } {
  const lower = raw.toLowerCase();
  const mark = SOLD_OUT.find((m) => lower.endsWith(m));
  return mark ? { body: raw.slice(0, raw.length - mark.length).trim(), soldOut: true } : { body: raw, soldOut: false };
}

/** "Size (1-1): Regular, Large +15" as its name, how many to choose (0 to 1 when left out) and its choices' text. */
function readGroupLine(line: string): { name: string; min: number; max: number; choices: string } | null {
  const colon = line.indexOf(":");
  if (colon <= 0) return null;
  let head = line.slice(0, colon).trim();
  const choices = line.slice(colon + 1).trim();
  let min = 0;
  let max = 1;
  if (head.endsWith(")")) {
    const open = head.lastIndexOf("(");
    const range = open >= 0 ? head.slice(open + 1, -1).split("-").map((n) => n.trim()) : [];
    if (range.length !== 2 || !range.every((n) => /^\d{1,2}$/.test(n))) return null;
    min = Number(range[0]);
    max = Number(range[1]);
    head = head.slice(0, open).trim();
  }
  const name = oneLine(head);
  if (!name || name.length > 60 || name.includes("(") || !choices) return null;
  return { name, min, max, choices };
}

export interface DishForm {
  name: string;
  description: string | null;
  priceCents: number;
  available: boolean;
  popular: boolean;
  choices: string;
}

export function parseDishForm(form: Record<string, string>): Parsed<DishForm> {
  const errors: Record<string, string> = {};
  const name = oneLine(str(form, "name"));
  if (!name) errors.name = "Enter the dish's name.";
  else if (name.length > FOOD_LIMITS.dishName) errors.name = `Keep the name under ${FOOD_LIMITS.dishName} characters.`;
  const description = str(form, "description");
  if (description.length > FOOD_LIMITS.description) errors.description = `Keep it under ${FOOD_LIMITS.description} characters.`;
  const priceCents = money(form, "price", errors, true);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, description: description || null, priceCents, available: form.available === "on", popular: form.popular === "on", choices: str(form, "choices") } };
}

// The menu's changes: each returns the new menu, or why it can't.

type MenuChange = { ok: true; menu: RestaurantMenu } | { ok: false; error: string };

const copy = (menu: RestaurantMenu): RestaurantMenu => structuredClone(menu);
const dishCount = (menu: RestaurantMenu) => menu.sections.reduce((n, s) => n + s.dishes.length, 0);

export function addSection(menu: RestaurantMenu, name: string): MenuChange {
  const clean = oneLine(name);
  if (!clean || clean.length > FOOD_LIMITS.sectionName) return { ok: false, error: `Name the section in up to ${FOOD_LIMITS.sectionName} characters, like Mains or Drinks.` };
  if (menu.sections.length >= FOOD_LIMITS.sections) return { ok: false, error: `A menu can have up to ${FOOD_LIMITS.sections} sections.` };
  const next = copy(menu);
  next.sections.push({ id: next.nextId++, name: clean, dishes: [] });
  return { ok: true, menu: next };
}

export function renameSection(menu: RestaurantMenu, id: number, name: string): MenuChange {
  const clean = oneLine(name);
  if (!clean || clean.length > FOOD_LIMITS.sectionName) return { ok: false, error: `Name the section in up to ${FOOD_LIMITS.sectionName} characters, like Mains or Drinks.` };
  const next = copy(menu);
  const section = next.sections.find((s) => s.id === id);
  if (!section) return { ok: false, error: "This section doesn't exist anymore." };
  section.name = clean;
  return { ok: true, menu: next };
}

export function removeSection(menu: RestaurantMenu, id: number): RestaurantMenu {
  const next = copy(menu);
  next.sections = next.sections.filter((s) => s.id !== id);
  return next;
}

/** Moves a section, or a dish within its section, one place up or down. */
export function moveInMenu(menu: RestaurantMenu, what: { section: number; dish?: number }, step: -1 | 1): RestaurantMenu {
  const next = copy(menu);
  const swap = <T>(list: T[], i: number) => {
    const j = i + step;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
  };
  const at = next.sections.findIndex((s) => s.id === what.section);
  if (what.dish === undefined) swap(next.sections, at);
  else if (at >= 0) swap(next.sections[at]!.dishes, next.sections[at]!.dishes.findIndex((d) => d.id === what.dish));
  return next;
}

/** Adds a dish to a section, or saves one (`dishId`), with its choices from the text area. */
export function saveDish(menu: RestaurantMenu, sectionId: number, dishId: number | null, form: DishForm, imageAssetId: string | null | undefined): MenuChange {
  const next = copy(menu);
  const section: MenuSection | undefined = next.sections.find((s) => s.id === sectionId);
  if (!section) return { ok: false, error: "This section doesn't exist anymore." };
  const existing = dishId === null ? null : (section.dishes.find((d) => d.id === dishId) ?? null);
  if (dishId !== null && !existing) return { ok: false, error: "This dish doesn't exist anymore." };
  if (!existing && dishCount(menu) >= FOOD_LIMITS.dishes) return { ok: false, error: `A menu can have up to ${FOOD_LIMITS.dishes} dishes.` };
  const parsed = parseChoices(form.choices, existing?.choiceGroups ?? [], next.nextId);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  next.nextId = parsed.nextId;
  const dish: Dish = {
    id: existing?.id ?? next.nextId++,
    name: form.name,
    description: form.description,
    imageAssetId: imageAssetId === undefined ? (existing?.imageAssetId ?? null) : imageAssetId,
    priceCents: form.priceCents,
    available: form.available,
    popular: form.popular,
    choiceGroups: parsed.groups,
  };
  if (existing) section.dishes = section.dishes.map((d) => (d.id === dish.id ? dish : d));
  else section.dishes.push(dish);
  return { ok: true, menu: next };
}

export function removeDish(menu: RestaurantMenu, dishId: number): RestaurantMenu {
  const next = copy(menu);
  for (const section of next.sections) section.dishes = section.dishes.filter((d) => d.id !== dishId);
  return next;
}

/** Sold out or back, from the dish's list. */
export function setDishAvailable(menu: RestaurantMenu, dishId: number, available: boolean): RestaurantMenu {
  const next = copy(menu);
  for (const section of next.sections) for (const dish of section.dishes) if (dish.id === dishId) dish.available = available;
  return next;
}
