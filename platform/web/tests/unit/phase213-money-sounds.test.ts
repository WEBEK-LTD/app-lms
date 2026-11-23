import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { OWNER_RINGTONES, pushDelivery, pushSoundsJson, readPushSounds, defaultPushSounds } from "@/lib/owner/push-sounds";

/** 213 The money sounds: seven more order sounds beside the 17 of 1.0.4, everywhere the server and the contract list them. */

const MONEY = ["cha_ching", "coin_drop", "till_bell", "coin_chime", "sale_jingle", "piggy_bank", "receipt_printer"] as const;
const FIRST = ["chime", "counter_bell", "kitchen_ticket", "marimba", "harp", "digital", "rush_hour", "cash_drawer", "doorbell", "xylophone", "soft_pulse", "chirp", "sunrise", "arcade", "soft_drop", "pop", "knock"];

describe("213 the money sounds", () => {
  it("keeps the 17 of 1.0.4 as they were and adds the seven after them", () => {
    expect(OWNER_RINGTONES.slice(0, 17)).toEqual(FIRST);
    expect(OWNER_RINGTONES.slice(17)).toEqual(MONEY);
    expect(new Set(OWNER_RINGTONES).size).toBe(24);
    expect(pushSoundsJson(null).ringtones).toEqual(OWNER_RINGTONES);
  });

  it("is in the Owner API's contract", () => {
    const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/owner.yaml"), "utf8")) as { components: { schemas: { SoundChoice: { enum: string[] } } } };
    expect(contract.components.schemas.SoundChoice.enum).toEqual([...OWNER_RINGTONES, "default", "silent"]);
  });

  it("is saved for a phone and rings with its bundled file", () => {
    const read = readPushSounds({ sounds: { orders: "cha_ching", bookings: "sale_jingle" } }, null);
    expect(read).toMatchObject({ ok: true, value: { sounds: { orders: "cha_ching", bookings: "sale_jingle" } } });
    const sounds = read.ok ? read.value : defaultPushSounds();
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: sounds }, "new_market_order", new Date("2026-11-23T12:00:00Z"))).toMatchObject({ apnsSound: "yb_ring_cha_ching_long.caf", data: { yb_sound: "cha_ching", yb_ring: "1" } });
    expect(pushDelivery({ platform: "android", pushProvider: "fcm", pushSounds: sounds }, "new_booking", new Date("2026-11-23T12:00:00Z"))).toMatchObject({ dataOnly: true, data: { yb_sound: "sale_jingle" } });
    expect(readPushSounds({ sounds: { orders: "cash_register" } }, null)).toMatchObject({ ok: false, field: "sounds.orders" });
  });
});
