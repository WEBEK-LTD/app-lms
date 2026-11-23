import type { App, PcBuilderSettings, PcPart, ProductSpec, TechSettings, TradeInGrade, TradeInSettings } from "../data/types";
import { PC_PARTS, TRADE_IN_GRADES } from "../data/types";
import { specNumber, specValue } from "./specs";

/**
 * 211 An electronics, mobiles or computers shop's own parts, for every
 * store app whose products are kept in Yallapp (the hosted catalog), set in
 * Store › Delivery & offers › Electronics and kept in the app's
 * `catalogSettings.tech` (JSON, no migration):
 *
 * - matching accessories: a category whose products a product's page
 *   offers with it ("Goes with it");
 * - trade-in: the devices the shop takes, each storage's top price (like
 *   new) and the share of it each grade gets; the app estimates, and the
 *   customer's request lands in Store › Trade-in (`TradeInRequest`);
 * - Build your PC: a category for each part (processor, motherboard,
 *   memory…), the app checking each part against the others by their specs
 *   (`checkBuild`: the socket, the memory type, the power and the size).
 *
 * Read here, bounded, whatever was saved; a connected platform and
 * WordPress serve none (yet).
 */

export const TECH_LIMITS = { models: 40, storages: 6, name: 60, label: 20, steps: PC_PARTS.length } as const;

/** Each grade's share of the top price when the owner sets none. */
export const DEFAULT_GRADES: Record<TradeInGrade, number> = { like_new: 100, good: 85, fair: 65, broken: 30 };

export const TECH_FORM_ERRORS = {
  models: "Write each device on its own line: its name, then each storage and its price, separated by |, as iPhone 13 | 128 GB = 1200.",
  many: "Trade-in takes at most 40 devices, each with at most 6 storages.",
  grades: "Each grade gets 0 to 100 percent of the top price, the better grades at least as much as the worse.",
  category: "Choose one of the shop's categories.",
} as const;

const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null);
const cents = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= 100_000_000_00 ? v : null);
const id = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null);

function tradeInOf(raw: unknown): TradeInSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Partial<TradeInSettings>;
  const models = (Array.isArray(t.models) ? t.models : [])
    .slice(0, TECH_LIMITS.models)
    .map((m) => {
      const name = text(m?.name, TECH_LIMITS.name);
      const storages = (Array.isArray(m?.storages) ? m.storages : [])
        .slice(0, TECH_LIMITS.storages)
        .map((s) => ({ label: text(s?.label, TECH_LIMITS.label), cents: cents(s?.cents) }))
        .filter((s): s is { label: string; cents: number } => s.label !== null && s.cents !== null);
      return name && storages.length ? { name, storages } : null;
    })
    .filter((m): m is TradeInSettings["models"][number] => m !== null);
  if (!models.length) return null;
  const grades = { ...DEFAULT_GRADES };
  for (const g of TRADE_IN_GRADES) {
    const v = (t.grades as Record<string, unknown> | undefined)?.[g];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100) grades[g] = Math.round(v);
  }
  return { models, grades };
}

function pcBuilderOf(raw: unknown): PcBuilderSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const seen = new Set<PcPart>();
  const steps = (Array.isArray((raw as PcBuilderSettings).steps) ? (raw as PcBuilderSettings).steps : [])
    .map((s) => ({ part: s?.part, categoryId: id(s?.categoryId), required: s?.required !== false }))
    .filter((s): s is PcBuilderSettings["steps"][number] => (PC_PARTS as readonly string[]).includes(s.part as string) && s.categoryId !== null && !seen.has(s.part as PcPart) && (seen.add(s.part as PcPart), true));
  // At least a processor and a motherboard: a build is checked against them.
  return steps.length >= 2 ? { steps } : null;
}

/** The shop's tech parts; null for a shop without any (or not a store). */
export function techOf(app: Pick<App, "catalogSettings" | "appType" | "vertical">): TechSettings | null {
  if (app.appType !== "store" || app.vertical === "restaurant") return null;
  const t = app.catalogSettings?.tech;
  if (!t || typeof t !== "object") return null;
  const accessoriesCategoryId = id(t.accessoriesCategoryId);
  const tradeIn = tradeInOf(t.tradeIn);
  const pcBuilder = pcBuilderOf(t.pcBuilder);
  return accessoriesCategoryId || tradeIn || pcBuilder ? { accessoriesCategoryId, tradeIn, pcBuilder } : null;
}

/** What a device is worth: its storage's top price times its grade's share, to the unit (whole currency) below. */
export function tradeInEstimate(settings: TradeInSettings, model: string, storage: string, grade: TradeInGrade): number | null {
  const m = settings.models.find((x) => x.name === model);
  const s = m?.storages.find((x) => x.label === storage);
  if (!s || !(TRADE_IN_GRADES as readonly string[]).includes(grade)) return null;
  return Math.floor((s.cents * settings.grades[grade]) / 100 / 100) * 100;
}

/** `StoreConfig.trade_in`: the devices, their storages and top prices (cents), each grade's share. */
export function tradeInJson(settings: TradeInSettings | null): { models: { name: string; storages: { label: string; cents: number }[] }[]; grades: Record<TradeInGrade, number> } | null {
  return settings ? { models: settings.models.map((m) => ({ name: m.name, storages: m.storages.map((s) => ({ ...s })) })), grades: { ...settings.grades } } : null;
}

/** `StoreConfig.pc_builder`: each part's category, in order. */
export function pcBuilderJson(settings: PcBuilderSettings | null): { steps: { part: PcPart; category_id: number; required: boolean }[] } | null {
  return settings ? { steps: settings.steps.map((s) => ({ part: s.part, category_id: s.categoryId, required: s.required })) } : null;
}

// ——— Build your PC: whether the parts chosen go together ———

/** A board's or case's size, smallest 0 (Mini-ITX) to largest 3 (E-ATX); the largest named ("ATX / Micro-ATX" is ATX); null: none. */
export function formRank(value: string | null): number | null {
  if (!value) return null;
  let v = value.toLowerCase().replace(/[\s_]+/g, "-");
  let best: number | null = null;
  const take = (re: RegExp, rank: number) => {
    if (re.test(v)) {
      best = Math.max(best ?? -1, rank);
      v = v.replace(re, " ");
    }
  };
  take(/e-?atx/g, 3);
  take(/(micro-?atx|m-?atx)/g, 1);
  take(/mini-?itx|(^|[^a-z])itx/g, 0);
  take(/(^|[^a-z])atx/g, 2);
  return best;
}

const sockets = (v: string | null) => (v ? v.split(/[,/،]/).map((s) => s.trim().toLowerCase()).filter(Boolean) : []);

/** Why two chosen parts don't go together; the app says it under the part (its words, lib/studio/app-words.ts). */
export type BuildProblem = { part: PcPart; with: PcPart; reason: "socket" | "memory" | "power" | "size" | "cooler" };

/** The power a build needs: the processor's and graphics card's draw and 100 W for the rest, with a quarter more to spare, to 50 W above. */
export function buildWatts(chosen: Partial<Record<PcPart, readonly ProductSpec[] | null>>): number {
  const draw = (specNumber(specValue(chosen.cpu, "watts")) ?? 0) + (specNumber(specValue(chosen.gpu, "watts")) ?? 0) + 100;
  return Math.ceil((draw * 1.25) / 50) * 50;
}

/** The problems among the parts chosen so far (each part by its specs); none: they go together. */
export function checkBuild(chosen: Partial<Record<PcPart, readonly ProductSpec[] | null>>): BuildProblem[] {
  const out: BuildProblem[] = [];
  const v = (part: PcPart, key: Parameters<typeof specValue>[1]) => specValue(chosen[part], key);
  const cpuSocket = v("cpu", "socket");
  const boardSocket = v("board", "socket");
  if (cpuSocket && boardSocket && !sockets(boardSocket).includes(cpuSocket.trim().toLowerCase())) out.push({ part: "board", with: "cpu", reason: "socket" });
  const boardMemory = v("board", "memory_type");
  const ramMemory = v("ram", "memory_type");
  if (boardMemory && ramMemory && boardMemory.trim().toLowerCase() !== ramMemory.trim().toLowerCase()) out.push({ part: "ram", with: "board", reason: "memory" });
  const coolerSockets = sockets(v("cooler", "socket"));
  if (cpuSocket && coolerSockets.length && !coolerSockets.includes(cpuSocket.trim().toLowerCase())) out.push({ part: "cooler", with: "cpu", reason: "cooler" });
  const psu = specNumber(v("psu", "psu_watts"));
  if (psu !== null && (chosen.cpu || chosen.gpu) && psu < buildWatts(chosen)) out.push({ part: "psu", with: chosen.gpu ? "gpu" : "cpu", reason: "power" });
  const caseRank = formRank(v("case", "form_factor"));
  const boardRank = formRank(v("board", "form_factor"));
  if (caseRank !== null && boardRank !== null && boardRank > caseRank) out.push({ part: "case", with: "board", reason: "size" });
  return out;
}

// ——— The dashboard's form ———

/** The devices as the owner writes them: a line each, "Name | 128 GB = 1200 | 256 GB = 1400" (prices in the shop's currency). */
export function tradeInText(settings: TradeInSettings | null): string {
  return (settings?.models ?? []).map((m) => [m.name, ...m.storages.map((s) => `${s.label} = ${s.cents / 100}`)].join(" | ")).join("\n");
}

export function parseTradeInText(input: string): { ok: true; models: TradeInSettings["models"] } | { ok: false; error: string } {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > TECH_LIMITS.models) return { ok: false, error: TECH_FORM_ERRORS.many };
  const models: TradeInSettings["models"] = [];
  for (const line of lines) {
    const [name, ...rest] = line.split("|").map((x) => x.trim());
    if (!name || name.length > TECH_LIMITS.name || !rest.length) return { ok: false, error: TECH_FORM_ERRORS.models };
    if (rest.length > TECH_LIMITS.storages) return { ok: false, error: TECH_FORM_ERRORS.many };
    const storages: TradeInSettings["models"][number]["storages"] = [];
    for (const part of rest) {
      const [label, price] = part.split("=").map((x) => x.trim());
      const amount = Number((price ?? "").replace(/,/g, ""));
      if (!label || label.length > TECH_LIMITS.label || !Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) return { ok: false, error: TECH_FORM_ERRORS.models };
      storages.push({ label, cents: Math.round(amount * 100) });
    }
    models.push({ name, storages });
  }
  return { ok: true, models };
}

/** The grades read back: whole percents, 0 to 100, each at most the better grade's. */
export function parseGrades(values: Partial<Record<TradeInGrade, string | null | undefined>>): { ok: true; grades: Record<TradeInGrade, number> } | { ok: false; error: string } {
  const grades = { ...DEFAULT_GRADES };
  let last = 100;
  for (const g of TRADE_IN_GRADES) {
    const raw = values[g];
    if (raw === undefined || raw === null || raw.trim() === "") {
      grades[g] = Math.min(DEFAULT_GRADES[g], last);
    } else {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 100 || n > last) return { ok: false, error: TECH_FORM_ERRORS.grades };
      grades[g] = n;
    }
    last = grades[g];
  }
  return { ok: true, grades };
}
