import type { OwnerDevice, OwnerPushKind, OwnerPushSounds } from "../data/types";

/**
 * 206 Yallapp Business's ringtones: which sound each kind of push plays on a
 * phone, whether an order rings on until it is opened, and the quiet hours.
 * The phone chooses (Settings › Ringtones, `PUT /me/push-sounds`); the
 * server only words the push for it:
 *
 * - Android: a phone that saved its sounds gets each push as data only
 *   (`yb_title`, `yb_body`, `yb_group`, `yb_sound`, `yb_ring`) and shows it
 *   itself, on the chosen sound's notification channel, ringing on until it
 *   is opened when `yb_ring` is "1" (the app's own receiver). A phone that
 *   never saved them (an older app) gets the push as before.
 * - iOS: the sound bundled in the app (`yb_ring_<id>.caf`, or the 25-second
 *   `yb_ring_<id>_long.caf` for a push that rings on), "default", or none.
 *   Orders are time-sensitive (a phone without that capability shows them as
 *   usual). In the quiet hours everything but orders arrives without a sound.
 *
 * The ids are the sounds made by business/tool/ringtones.py.
 */

export const OWNER_RINGTONES = [
  "chime",
  "counter_bell",
  "kitchen_ticket",
  "marimba",
  "harp",
  "digital",
  "rush_hour",
  "cash_drawer",
  "doorbell",
  "xylophone",
  "soft_pulse",
  "chirp",
  "sunrise",
  "arcade",
  "soft_drop",
  "pop",
  "knock",
] as const;
export type OwnerRingtone = (typeof OWNER_RINGTONES)[number];
/** A ringtone, the phone's own notification sound, or none. */
export type OwnerSoundChoice = OwnerRingtone | "default" | "silent";

/** 206 The groups a sound is chosen for. */
export const OWNER_SOUND_GROUPS = ["orders", "bookings", "cancelled", "messages", "other"] as const;
export type OwnerSoundGroup = (typeof OWNER_SOUND_GROUPS)[number];
/** The groups that may ring on until opened. */
export const OWNER_RING_GROUPS: readonly OwnerSoundGroup[] = ["orders", "bookings"];

/** Which group each kind of push is in. */
export const OWNER_SOUND_GROUP_OF: Record<OwnerPushKind, OwnerSoundGroup> = {
  new_order: "orders",
  new_food_order: "orders",
  new_market_order: "orders",
  shipment_waiting: "orders",
  new_booking: "bookings",
  order_cancelled: "cancelled",
  new_message: "messages",
  new_chat_message: "messages",
  new_review: "messages",
  new_complaint: "messages",
  payment_received: "other",
  build_finished: "other",
  yallapp_updates: "other",
  account_notices: "other",
  prime_alert: "other",
  morning_brief: "other",
};

/** What a phone hears when it chose nothing for a group. */
export const OWNER_SOUND_DEFAULTS: Record<OwnerSoundGroup, OwnerSoundChoice> = {
  orders: "counter_bell",
  bookings: "doorbell",
  cancelled: "knock",
  messages: "pop",
  other: "default",
};

export const OWNER_RING_MINUTES = [1, 2, 3, 5, 10] as const;

/** The settings of a phone that saved none (only for reading back: such a phone gets pushes as before). */
export function defaultPushSounds(): OwnerPushSounds {
  return { sounds: {}, ring: ["orders"], ringMinutes: 3, vibrate: true, alarmVolume: false, quiet: null, timeZone: null };
}

const isChoice = (value: unknown): value is OwnerSoundChoice => value === "default" || value === "silent" || (OWNER_RINGTONES as readonly string[]).includes(value as string);
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Reads `PUT /me/push-sounds`'s body onto the saved settings; an error names the field that's wrong. */
export function readPushSounds(body: Record<string, unknown>, saved: OwnerPushSounds | null): { ok: true; value: OwnerPushSounds } | { ok: false; field: string; error: string } {
  const next: OwnerPushSounds = { ...defaultPushSounds(), ...(saved ?? {}), sounds: { ...(saved?.sounds ?? {}) } };
  if (body.sounds !== undefined) {
    if (!body.sounds || typeof body.sounds !== "object" || Array.isArray(body.sounds)) return { ok: false, field: "sounds", error: "Send a sound for each group." };
    for (const [group, choice] of Object.entries(body.sounds as Record<string, unknown>)) {
      if (!(OWNER_SOUND_GROUPS as readonly string[]).includes(group)) return { ok: false, field: `sounds.${group}`, error: "Unknown group." };
      if (!isChoice(choice)) return { ok: false, field: `sounds.${group}`, error: "Unknown sound." };
      next.sounds[group as OwnerSoundGroup] = choice;
    }
  }
  if (body.ring !== undefined) {
    if (!Array.isArray(body.ring) || body.ring.some((g) => !OWNER_RING_GROUPS.includes(g as OwnerSoundGroup))) return { ok: false, field: "ring", error: "Only orders and bookings can ring until opened." };
    next.ring = [...new Set(body.ring as OwnerSoundGroup[])];
  }
  if (body.ring_minutes !== undefined) {
    if (!(OWNER_RING_MINUTES as readonly unknown[]).includes(body.ring_minutes)) return { ok: false, field: "ring_minutes", error: `Choose ${OWNER_RING_MINUTES.join(", ")} minutes.` };
    next.ringMinutes = body.ring_minutes as number;
  }
  for (const [key, field] of [
    ["vibrate", "vibrate"],
    ["alarm_volume", "alarmVolume"],
  ] as const) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "boolean") return { ok: false, field: key, error: "Send true or false." };
    next[field] = body[key] as boolean;
  }
  if (body.quiet !== undefined) {
    if (body.quiet === null) next.quiet = null;
    else {
      const q = body.quiet as Record<string, unknown>;
      if (!q || typeof q !== "object" || typeof q.from !== "string" || typeof q.to !== "string" || !HHMM.test(q.from) || !HHMM.test(q.to) || q.from === q.to) {
        return { ok: false, field: "quiet", error: "Send the quiet hours as from and to, HH:MM, or null." };
      }
      next.quiet = { from: q.from, to: q.to };
    }
  }
  if (body.time_zone !== undefined) {
    if (body.time_zone !== null && (typeof body.time_zone !== "string" || body.time_zone.length > 64 || !validTimeZone(body.time_zone))) return { ok: false, field: "time_zone", error: "Unknown time zone." };
    next.timeZone = (body.time_zone as string | null) ?? null;
  }
  return { ok: true, value: next };
}

export function pushSoundsJson(saved: OwnerPushSounds | null) {
  const s = saved ?? defaultPushSounds();
  return {
    saved: saved !== null,
    sounds: Object.fromEntries(OWNER_SOUND_GROUPS.map((g) => [g, s.sounds[g] ?? OWNER_SOUND_DEFAULTS[g]])),
    ring: s.ring,
    ring_minutes: s.ringMinutes,
    vibrate: s.vibrate,
    alarm_volume: s.alarmVolume,
    quiet: s.quiet,
    time_zone: s.timeZone,
    ringtones: OWNER_RINGTONES,
  };
}

/** Minutes since midnight of `now` in the zone (UTC when it has none). */
function minutesOfDay(now: Date, timeZone: string | null): number {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timeZone ?? "UTC" }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** Whether `now` is in the quiet hours (they may run past midnight). */
export function inQuietHours(sounds: Pick<OwnerPushSounds, "quiet" | "timeZone">, now: Date): boolean {
  if (!sounds.quiet) return false;
  const at = minutesOfDay(now, sounds.timeZone);
  const minutes = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const from = minutes(sounds.quiet.from);
  const to = minutes(sounds.quiet.to);
  return from < to ? at >= from && at < to : at >= from || at < to;
}

/** How one push goes to one phone: as before (null), or with its sounds. */
export interface PushDelivery {
  /** Android: data only, the app shows it. */
  dataOnly: boolean;
  /** iOS: the sound file, "default", or null for none. */
  apnsSound: string | null;
  timeSensitive: boolean;
  /** Added to the push's data. */
  data: Record<string, string>;
}

export function pushDelivery(device: Pick<OwnerDevice, "platform" | "pushProvider" | "pushSounds">, kind: OwnerPushKind, now: Date): PushDelivery | null {
  const saved = device.pushSounds ?? null;
  if (!saved) return null;
  const group = OWNER_SOUND_GROUP_OF[kind];
  const quiet = group !== "orders" && inQuietHours(saved, now);
  const savedChoice = saved.sounds[group];
  const choice: OwnerSoundChoice = quiet ? "silent" : isChoice(savedChoice) ? savedChoice : OWNER_SOUND_DEFAULTS[group];
  const ring = !quiet && choice !== "silent" && saved.ring.includes(group);
  const data = {
    yb_group: group,
    yb_sound: choice,
    yb_ring: ring ? "1" : "0",
    yb_ring_minutes: String(saved.ringMinutes),
  };
  if (device.platform === "android") {
    // Huawei's Push Kit can't carry data only to the app's receiver: as before.
    return device.pushProvider === "hms" ? null : { dataOnly: true, apnsSound: null, timeSensitive: false, data };
  }
  const apnsSound = choice === "silent" ? null : choice === "default" ? "default" : `yb_ring_${choice}${ring ? "_long" : ""}.caf`;
  return { dataOnly: false, apnsSound, timeSensitive: group === "orders" || group === "bookings", data };
}
