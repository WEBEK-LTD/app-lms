import type { ProductSpec } from "../data/types";

/**
 * 211 A product's specifications (`CatalogProduct.specs`): the table on its
 * page in the app, the compare sheet (two or three products side by side),
 * the shop filtered by a spec (`spec_filter`) and Build your PC's checks.
 * The owner writes them one per line, "Label: value"; a label Yallapp knows
 * (in English, Arabic or Turkish: "RAM", "الذاكرة", "Bellek") gets its key,
 * which names it in the app's language wherever it shows and makes it
 * filterable and comparable. Any other label is kept as written.
 */

export const SPEC_LIMITS = { count: 40, label: 40, value: 120 } as const;

/**
 * The specs Yallapp knows, in the order a table lists them when the owner's
 * order mixes them (never reordered otherwise). The PC parts' (socket,
 * memory type, watts, PSU watts, form factor) are what Build your PC
 * checks; condition, grade and warranty are a phone's or a used device's.
 */
export const SPEC_KEYS = [
  "screen",
  "cpu",
  "gpu",
  "ram",
  "storage",
  "camera",
  "front_camera",
  "battery",
  "charging",
  "os",
  "refresh",
  "connectivity",
  "water",
  "weight",
  "socket",
  "memory_type",
  "watts",
  "psu_watts",
  "form_factor",
  "condition",
  "grade",
  "battery_health",
  "warranty",
] as const;
export type SpecKey = (typeof SPEC_KEYS)[number];

/** Each key's name in the app's three languages (the website's Arabic, MSA). */
export const SPEC_NAMES: Record<SpecKey, { en: string; ar: string; tr: string }> = {
  screen: { en: "Screen", ar: "الشاشة", tr: "Ekran" },
  cpu: { en: "Processor", ar: "المعالج", tr: "İşlemci" },
  gpu: { en: "Graphics", ar: "كرت الشاشة", tr: "Ekran kartı" },
  ram: { en: "Memory", ar: "الذاكرة", tr: "Bellek" },
  storage: { en: "Storage", ar: "السعة", tr: "Depolama" },
  camera: { en: "Main camera", ar: "الكاميرا الخلفية", tr: "Arka kamera" },
  front_camera: { en: "Front camera", ar: "الكاميرا الأمامية", tr: "Ön kamera" },
  battery: { en: "Battery", ar: "البطارية", tr: "Batarya" },
  charging: { en: "Charging", ar: "الشحن", tr: "Şarj" },
  os: { en: "System", ar: "النظام", tr: "İşletim sistemi" },
  refresh: { en: "Refresh rate", ar: "معدل التحديث", tr: "Yenileme hızı" },
  connectivity: { en: "Connectivity", ar: "الاتصال", tr: "Bağlantı" },
  water: { en: "Water resistance", ar: "مقاومة الماء", tr: "Suya dayanıklılık" },
  weight: { en: "Weight", ar: "الوزن", tr: "Ağırlık" },
  socket: { en: "Socket", ar: "المقبس", tr: "Soket" },
  memory_type: { en: "Memory type", ar: "نوع الذاكرة", tr: "Bellek türü" },
  watts: { en: "Power draw", ar: "استهلاك الطاقة", tr: "Güç tüketimi" },
  psu_watts: { en: "Power supply", ar: "قدرة المزوّد", tr: "Güç kaynağı" },
  form_factor: { en: "Form factor", ar: "المقاس", tr: "Form faktörü" },
  condition: { en: "Condition", ar: "الحالة", tr: "Durum" },
  grade: { en: "Grade", ar: "الدرجة", tr: "Sınıf" },
  battery_health: { en: "Battery health", ar: "صحة البطارية", tr: "Pil sağlığı" },
  warranty: { en: "Warranty", ar: "الضمان", tr: "Garanti" },
};

/** The words an owner may write for each key (lower case, any of the three languages), its own names included. */
const SYNONYMS: Partial<Record<SpecKey, readonly string[]>> = {
  screen: ["display", "شاشة", "ekran boyutu"],
  cpu: ["cpu", "chip", "chipset", "معالج", "شريحة", "işlemci", "çip"],
  gpu: ["gpu", "graphics card", "video card", "graphics", "الرسوميات", "كرت الشاشة", "بطاقة الرسوميات", "ekran kartı", "grafik"],
  ram: ["ram", "memory", "رام", "الذاكرة العشوائية", "ذاكرة", "bellek", "ram bellek"],
  storage: ["storage", "capacity", "ssd", "internal storage", "التخزين", "السعة", "سعة التخزين", "depolama", "kapasite", "dahili hafıza"],
  camera: ["camera", "rear camera", "main camera", "الكاميرا", "الكاميرا الخلفية", "kamera", "arka kamera"],
  battery: ["battery", "البطارية", "batarya", "pil"],
  os: ["os", "operating system", "system", "نظام التشغيل", "النظام", "işletim sistemi"],
  refresh: ["refresh", "refresh rate", "معدل التحديث", "yenileme hızı"],
  water: ["water resistance", "مقاومة الماء", "suya dayanıklılık"],
  memory_type: ["memory type", "ram type", "نوع الذاكرة", "bellek türü", "ram türü"],
  watts: ["power draw", "tdp", "power", "استهلاك الطاقة", "güç tüketimi"],
  psu_watts: ["power supply", "psu", "wattage", "قدرة المزود", "قدرة المزوّد", "güç kaynağı"],
  form_factor: ["form factor", "size", "المقاس", "form faktörü", "boyut"],
  condition: ["condition", "new or used", "الحالة", "durum"],
  grade: ["grade", "الدرجة", "sınıf"],
  battery_health: ["battery health", "صحة البطارية", "pil sağlığı"],
  warranty: ["warranty", "guarantee", "الضمان", "garanti"],
};

const norm = (s: string) => s.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");

const BY_WORD: ReadonlyMap<string, SpecKey> = new Map(
  SPEC_KEYS.flatMap((key) => [key.replaceAll("_", " "), SPEC_NAMES[key].en, SPEC_NAMES[key].ar, SPEC_NAMES[key].tr, ...(SYNONYMS[key] ?? [])].map((w) => [norm(w), key] as const)),
);

export function isSpecKey(v: unknown): v is SpecKey {
  return typeof v === "string" && (SPEC_KEYS as readonly string[]).includes(v);
}

/** The key a label the owner wrote stands for, or null. */
export function specKeyOf(label: string): SpecKey | null {
  return BY_WORD.get(norm(label)) ?? null;
}

/** A spec's name in a language: a known key's own name, else the owner's words. */
export function specLabel(spec: Pick<ProductSpec, "key" | "label">, lang: string | null | undefined): string {
  if (isSpecKey(spec.key)) {
    const names = SPEC_NAMES[spec.key];
    return lang === "ar" ? names.ar : lang === "tr" ? names.tr : lang === "en" ? names.en : spec.label;
  }
  return spec.label;
}

/** Saved specs as the app may show them, bounded, whatever was saved; null: none. */
export function specsOf(raw: unknown): ProductSpec[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ProductSpec[] = [];
  for (const s of raw.slice(0, SPEC_LIMITS.count)) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim().slice(0, SPEC_LIMITS.label) : "";
    const value = typeof o.value === "string" ? o.value.trim().slice(0, SPEC_LIMITS.value) : "";
    if (!label || !value) continue;
    out.push({ ...(isSpecKey(o.key) ? { key: o.key } : {}), label, value });
  }
  return out.length ? out : null;
}

/** The specs as the owner writes them: one per line, "Label: value". */
export function specsText(specs: readonly ProductSpec[] | null | undefined): string {
  return (specs ?? []).map((s) => `${s.label}: ${s.value}`).join("\n");
}

/** The owner's lines read back: a line without a colon, or with nothing on one side, is a mistake. */
export function parseSpecsText(text: string): { ok: true; specs: ProductSpec[] | null } | { ok: false; error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > SPEC_LIMITS.count) return { ok: false, error: "A product has at most 40 specifications." };
  const specs: ProductSpec[] = [];
  for (const line of lines) {
    const at = line.search(/[:：]/);
    const label = at > 0 ? line.slice(0, at).trim() : "";
    const value = at > 0 ? line.slice(at + 1).trim() : "";
    if (!label || !value) return { ok: false, error: "Write each specification on its own line as Label: value." };
    if (label.length > SPEC_LIMITS.label || value.length > SPEC_LIMITS.value) return { ok: false, error: "A specification's label is at most 40 characters and its value at most 120." };
    const key = specKeyOf(label);
    specs.push({ ...(key ? { key } : {}), label, value });
  }
  return { ok: true, specs: specs.length ? specs : null };
}

/** A spec as the app gets it: its key (when known), its name in the language asked for and its value. */
export function specJson(spec: ProductSpec, lang: string | null | undefined): { key: string | null; label: string; value: string } {
  return { key: isSpecKey(spec.key) ? spec.key : null, label: specLabel(spec, lang), value: spec.value };
}

/** The value of a product's spec by key; null without it. */
export function specValue(specs: readonly ProductSpec[] | null | undefined, key: SpecKey): string | null {
  return specs?.find((s) => s.key === key)?.value ?? null;
}

/** The first number in a value ("650 W" → 650, "DDR5 6000" → 5), for the PC builder's watts. */
export function specNumber(value: string | null | undefined): number | null {
  const m = value?.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Whether a value matches a filter's: the same words, case and spaces aside. */
export function sameSpecValue(a: string, b: string): boolean {
  return norm(a) === norm(b);
}

/**
 * The values a spec takes across products and how many have each (the
 * filter's chips), most common first then in reading order; at most 12.
 */
export function specFacets(products: readonly { specs?: ProductSpec[] | null }[], key: SpecKey, limit = 12): { value: string; count: number }[] {
  const counts = new Map<string, { value: string; count: number }>();
  for (const p of products) {
    const v = specValue(p.specs, key);
    if (!v) continue;
    const k = norm(v);
    const had = counts.get(k);
    if (had) had.count++;
    else counts.set(k, { value: v, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "en", { numeric: true })).slice(0, limit);
}
