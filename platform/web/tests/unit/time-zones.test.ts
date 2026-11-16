import { describe, expect, it } from "vitest";
import { dashboardMessages } from "@/i18n/dashboard";
import { parseFulfilmentForm } from "@/lib/catalog/fulfilment";
import { parseDeliverySettings } from "@/lib/delivery/forms";
import { parseRideSettings } from "@/lib/rides/forms";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { allTimeZones, isIanaZone, matchesZone, SERVED_ZONES, utcOffsetText, zoneCity, zoneOffsetMinutes, zoneOption, zoneOptions } from "@/lib/time/zones";

/** 136 Every time zone, in every app: lib/time/zones.ts and the forms that use it. */

const JANUARY = new Date("2026-01-15T12:00:00Z");
const JULY = new Date("2026-07-15T12:00:00Z");

describe("136 the list of time zones", () => {
  it("has every IANA zone the runtime knows, and UTC", () => {
    const all = allTimeZones(JANUARY);
    const runtime = Intl.supportedValuesOf("timeZone");
    expect(all.length).toBe(new Set([...runtime, "UTC"]).size);
    for (const zone of runtime) expect(all).toContain(zone);
    expect(all).toContain("UTC");
    expect(all).toContain("Pacific/Kiritimati");
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(400);
  });

  it("puts the zones Yallapp serves first, in their order, then the rest by offset, then name", () => {
    const all = allTimeZones(JANUARY);
    expect(all.slice(0, SERVED_ZONES.length)).toEqual([
      "Europe/Istanbul",
      "Africa/Cairo",
      "Asia/Riyadh",
      "Asia/Dubai",
      "Asia/Kuwait",
      "Asia/Qatar",
      "Asia/Bahrain",
      "Asia/Muscat",
      "Asia/Amman",
      "Asia/Baghdad",
      "Asia/Beirut",
      "Africa/Casablanca",
      "Europe/London",
    ]);
    const rest = all.slice(SERVED_ZONES.length);
    expect(rest.some((z) => (SERVED_ZONES as readonly string[]).includes(z))).toBe(false);
    for (let i = 1; i < rest.length; i++) {
      const a = zoneOffsetMinutes(rest[i - 1]!, JANUARY);
      const b = zoneOffsetMinutes(rest[i]!, JANUARY);
      expect(a < b || (a === b && rest[i - 1]! < rest[i]!), `${rest[i - 1]} before ${rest[i]}`).toBe(true);
    }
    expect(zoneOffsetMinutes(rest[0]!, JANUARY)).toBeLessThanOrEqual(-11 * 60);
    expect(rest.at(-1)).toBe("Pacific/Kiritimati");
  });

  it("labels each zone with its offset now, its city and its name in the language", () => {
    expect(utcOffsetText(180)).toBe("UTC+03:00");
    expect(utcOffsetText(-330)).toBe("UTC-05:30");
    expect(utcOffsetText(0)).toBe("UTC+00:00");
    expect(zoneCity("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
    expect(zoneOption("Europe/Istanbul", "en-US", JANUARY).label).toMatch(/^UTC\+03:00 · Istanbul · .+/);
    expect(zoneOption("Asia/Kathmandu", "en-US", JANUARY).label).toMatch(/^UTC\+05:45 · Kathmandu/);
    expect(zoneOption("UTC", "en-US", JANUARY).label).toBe("UTC+00:00 · UTC");
    // Summer time: London's offset is the one of the day.
    expect(zoneOption("Europe/London", "en-US", JANUARY).label).toMatch(/^UTC\+00:00 · London/);
    expect(zoneOption("Europe/London", "en-US", JULY).label).toMatch(/^UTC\+01:00 · London/);
    // The zone's name in the dashboard's language, where Intl has one.
    const ar = zoneOption("Africa/Cairo", "ar-EG-u-nu-latn", JANUARY);
    expect(ar.label).toMatch(/^UTC\+02:00 · Cairo · /);
    expect(ar.region).toMatch(/[؀-ۿ]/);
    expect(zoneOption("Africa/Cairo", "tr-TR", JANUARY).region).not.toBe(zoneOption("Africa/Cairo", "en-US", JANUARY).region);
    for (const o of zoneOptions("en-US", null, JANUARY)) expect(o.label).toMatch(/^UTC[+-]\d{2}:\d{2} · /);
  });

  it("keeps the saved zone in the list even when the runtime's list doesn't have it", () => {
    const options = zoneOptions("en-US", "Asia/Kolkata", JANUARY);
    const kolkata = options.find((o) => o.value === "Asia/Kolkata");
    expect(kolkata?.label).toMatch(/^UTC\+05:30 · Kolkata/);
    expect(options.filter((o) => o.served).map((o) => o.value)).toEqual([...SERVED_ZONES]);
    expect(zoneOptions("en-US", "Europe/Istanbul", JANUARY).length).toBe(allTimeZones(JANUARY).length);
  });

  it("finds a zone by city, zone, region or offset", () => {
    const istanbul = zoneOption("Europe/Istanbul", "en-US", JANUARY);
    expect(matchesZone(istanbul, "istan")).toBe(true);
    expect(matchesZone(istanbul, "europe/ist")).toBe(true);
    expect(matchesZone(istanbul, "+3")).toBe(true);
    expect(matchesZone(istanbul, "UTC+03:00")).toBe(true);
    expect(matchesZone(istanbul, "+4")).toBe(false);
    expect(matchesZone(zoneOption("America/Argentina/Buenos_Aires", "en-US", JANUARY), "buenos aires")).toBe(true);
    expect(matchesZone(zoneOption("America/St_Johns", "en-US", JANUARY), "-3:30")).toBe(true);
    expect(matchesZone(istanbul, "")).toBe(true);
  });

  it("accepts any IANA zone and refuses junk", () => {
    for (const zone of allTimeZones()) expect(isIanaZone(zone), zone).toBe(true);
    for (const zone of ["UTC", "Asia/Kolkata", "Europe/Kyiv", "Asia/Calcutta", "America/Indiana/Knox", "Etc/GMT+3", "Pacific/Kiritimati"]) expect(isIanaZone(zone), zone).toBe(true);
    for (const junk of ["", "Mars/Base", "Europe/Atlantis", "europe istanbul", "+03:00", "<script>", "Europe/Istanbul; DROP", "x".repeat(65), null, 3, undefined]) expect(isIanaZone(junk), String(junk)).toBe(false);
  });
});

describe("136 the forms take any zone", () => {
  const food = { cuisines: "Grill", foodCourierJob: "accepted" };
  it("food delivery: any IANA zone, not only the old short list", () => {
    for (const timezone of ["Asia/Tokyo", "America/Sao_Paulo", "UTC", "Asia/Muscat"]) {
      const parsed = parseDeliverySettings({ ...DELIVERY_FORM, ...food, timezone }, DEFAULT_DELIVERY_SETTINGS, true);
      expect(parsed.ok ? parsed.value.timezone : parsed.errors, timezone).toBe(timezone);
    }
    expect(parseDeliverySettings({ ...DELIVERY_FORM, ...food, timezone: "Mars/Base" }, DEFAULT_DELIVERY_SETTINGS, true)).toMatchObject({ ok: false, errors: { timezone: expect.any(String) } });
  });

  it("Delivery & offers' fulfilment: UTC and any zone", () => {
    for (const timezone of ["UTC", "Pacific/Auckland", "Africa/Casablanca"]) {
      const parsed = parseFulfilmentForm({ ...FULFILMENT_FORM, timezone }, "TRY");
      expect(parsed.ok ? parsed.value.timezone : parsed.errors, timezone).toBe(timezone);
    }
    const bad = parseFulfilmentForm({ ...FULFILMENT_FORM, timezone: "Nowhere" }, "TRY");
    expect(bad.ok ? null : Object.keys(bad.errors)).toEqual(["timezone"]);
  });

  it("ride settings: any IANA zone", () => {
    const errorsOf = (timezone: string) => {
      const parsed = parseRideSettings({ currency: "EGP", cash: "on", fareMode: "upfront", timezone }, DEFAULT_DELIVERY_SETTINGS, "+20");
      return parsed.ok ? {} : parsed.errors;
    };
    for (const zone of ["Asia/Tokyo", "America/Mexico_City", "UTC", "Africa/Cairo"]) expect(errorsOf(zone).timezone, zone).toBeUndefined();
    expect(errorsOf("Mars/Base").timezone).toBe("Choose your time zone.");
  });

  it("the picker's words are in English, Arabic and Turkish", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const z = dashboardMessages(lang).zones;
      expect(z.label.length && z.search.length && z.usual.length && z.all.length).toBeTruthy();
      expect(z.none).toContain("{query}");
    }
    expect(dashboardMessages("ar").zones.label).toBe("المنطقة الزمنية");
    expect(dashboardMessages("tr").zones.label).toBe("Saat dilimi");
  });
});

const DELIVERY_FORM: Record<string, string> = { currency: "EGP", pricing: "zone", zones: "Maadi, 45", cash: "on", tracking: "live", assignment: "open" };
const FULFILMENT_FORM: Record<string, string> = {
  pickup: "on",
  delivery: "on",
  deliveryFee: "30",
  minOrder: "150",
  prepMinutes: "25",
  asap: "on",
  scheduled: "on",
  slotStep: "15",
  maxDaysAhead: "2",
  deliveryAreas: "Kadıköy",
  pickupAddress: "Moda Cd. 1",
  open1: "on",
  start1: "09:00",
  end1: "22:00",
};
