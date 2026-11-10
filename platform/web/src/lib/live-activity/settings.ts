import type { DataStore } from "../data/store";
import { platformSetting } from "../settings/platform";
import { isLiveKind, LIVE_DEFAULTS, LIVE_KINDS, LIVE_LIMITS, LIVE_PAGES, type LiveActivitySetting, type LivePages } from "./types";

/** The card's settings as saved, with anything missing or out of range as the defaults (a setting saved by an older version). */
export function normalizeLiveSetting(value: Partial<LiveActivitySetting> | null | undefined): LiveActivitySetting {
  if (!value || typeof value !== "object") return { ...LIVE_DEFAULTS, kinds: [...LIVE_DEFAULTS.kinds] };
  const whole = (n: unknown, limits: { min: number; max: number }, fallback: number) =>
    typeof n === "number" && Number.isInteger(n) && n >= limits.min && n <= limits.max ? n : fallback;
  return {
    on: typeof value.on === "boolean" ? value.on : LIVE_DEFAULTS.on,
    kinds: Array.isArray(value.kinds) ? LIVE_KINDS.filter((k) => value.kinds!.includes(k)) : [...LIVE_DEFAULTS.kinds],
    pages: (LIVE_PAGES as readonly unknown[]).includes(value.pages) ? (value.pages as LivePages) : LIVE_DEFAULTS.pages,
    firstDelaySeconds: whole(value.firstDelaySeconds, LIVE_LIMITS.firstDelaySeconds, LIVE_DEFAULTS.firstDelaySeconds),
    gapSeconds: whole(value.gapSeconds, LIVE_LIMITS.gapSeconds, LIVE_DEFAULTS.gapSeconds),
    maxPerVisit: whole(value.maxPerVisit, LIVE_LIMITS.maxPerVisit, LIVE_DEFAULTS.maxPerVisit),
  };
}

/** The card's settings: the team's (Admin › Live activity), or the defaults (on, every kind, every marketing page). */
export async function liveSetting(store: DataStore, options: { fresh?: boolean } = {}): Promise<LiveActivitySetting> {
  return normalizeLiveSetting((await platformSetting(store, "liveActivity", options))?.value);
}

/** The settings form (Admin › Live activity), checked. */
export function readLiveSetting(input: Record<string, unknown>): { ok: true; setting: LiveActivitySetting } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const number = (name: keyof typeof LIVE_LIMITS, label: string): number => {
    const raw = String(input[name] ?? "").trim();
    const n = Number(raw);
    const { min, max } = LIVE_LIMITS[name];
    if (!raw || !Number.isInteger(n) || n < min || n > max) {
      errors[name] = `${label}: a whole number from ${min} to ${max}.`;
      return LIVE_DEFAULTS[name];
    }
    return n;
  };
  const kinds = Array.isArray(input.kinds) ? input.kinds : input.kinds === undefined ? [] : [input.kinds];
  const pages = String(input.pages ?? "");
  if (!(LIVE_PAGES as readonly string[]).includes(pages)) errors.pages = "Choose where the card shows.";
  const setting: LiveActivitySetting = {
    on: input.on === "on" || input.on === true,
    kinds: LIVE_KINDS.filter((k) => kinds.some((v) => isLiveKind(v) && v === k)),
    pages: (LIVE_PAGES as readonly string[]).includes(pages) ? (pages as LivePages) : LIVE_DEFAULTS.pages,
    firstDelaySeconds: number("firstDelaySeconds", "First card after"),
    gapSeconds: number("gapSeconds", "Pause between cards"),
    maxPerVisit: number("maxPerVisit", "Cards per visit"),
  };
  if (setting.on && !setting.kinds.length) errors.kinds = "Choose at least one kind of card, or switch the card off.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, setting };
}
