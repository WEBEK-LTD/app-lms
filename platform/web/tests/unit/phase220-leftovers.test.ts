import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bundleChoices } from "@/app/dashboard/courses/bundles/parts";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { newApp } from "@/lib/app/setup";
import { formatCents } from "@/lib/catalog/money";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import type { Courier, CourseSetup, DeliverySettings, HostedUser, VehicleTypeInput } from "@/lib/data/types";
import { raisedLine } from "@/lib/donations/page-items";
import { itemWords } from "@/lib/hosted/pages/item-words";
import { refundedLine } from "@/lib/refunds/service";
import { fareCents } from "@/lib/rides/fares";
import { carText } from "@/lib/rides/notify";
import { createSampleRide } from "@/lib/rides/review";
import { SAMPLE_CAR, SAMPLE_DROPOFF, SAMPLE_FALLBACK_CENTS, SAMPLE_KM, SAMPLE_MINUTES, SAMPLE_NOTE, SAMPLE_PICKUP, SAMPLE_RIDER_NAME, sampleWords } from "@/lib/rides/sample";
import { EMPTY_DRIVER } from "@/lib/rides/settings";
import { NOW, setupClient } from "./helpers";

/**
 * 220 The code items earlier phases left open. 175.11: every amount on the
 * dashboard's pages is written in the dashboard's language (`formatCents`
 * with `lang`, as the shop's pages since 175.10), and the shared helpers
 * those pages use (refunds, campaigns, bundles, the drivers' cars) too.
 * 178.13: the store review driver's sample ride has a real fare and its
 * words are the dashboard's, and it stays out of the drivers' statements.
 */
const strip = (text: string) => text.replace(/[\u200e\u200f\u061c\u2066-\u2069]/g, "").replace(/\u00a0/g, " ");
const DASHBOARD = join(__dirname, "../../src/app/dashboard");

/** Each `formatCents(` call in [source] with how many arguments it has at its own depth. */
function formatCentsCalls(source: string): { args: number; text: string }[] {
  const calls: { args: number; text: string }[] = [];
  const needle = "formatCents(";
  for (let at = source.indexOf(needle); at >= 0; at = source.indexOf(needle, at + 1)) {
    let depth = 0;
    let commas = 0;
    let k = at + needle.length;
    for (; k < source.length; k++) {
      const c = source[k]!;
      if (c === '"' || c === "'" || c === "`") {
        for (k++; k < source.length && source[k] !== c; k++) if (source[k] === "\\") k++;
      } else if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") {
        if (depth === 0) break;
        depth--;
      } else if (c === "," && depth === 0) commas++;
    }
    calls.push({ args: commas + 1, text: source.slice(at, k + 1) });
  }
  return calls;
}

describe("175.11 amounts in the dashboard's language", () => {
  it("every dashboard page passes the language to formatCents", () => {
    const files = (readdirSync(DASHBOARD, { recursive: true }) as string[]).filter((f) => /\.tsx?$/.test(f));
    const pages = files.filter((f) => readFileSync(join(DASHBOARD, f), "utf8").includes("formatCents("));
    // The pages with amounts: courses, school fees and salaries, rides, deliveries, events, donations, bookings, travel…
    expect(pages.length).toBeGreaterThan(30);
    const english = pages.flatMap((f) =>
      formatCentsCalls(readFileSync(join(DASHBOARD, f), "utf8"))
        .filter((c) => c.args < 3)
        .map((c) => `${f}: ${c.text}`),
    );
    expect(english).toEqual([]);
  });

  it("the pages' amount helpers write Arabic and Turkish amounts", () => {
    // The page's currency where the language puts it, with the dashboard's Latin digits.
    expect(strip(formatCents(1234_50, "EGP", "ar"))).toBe("1,234.50 E£");
    expect(strip(formatCents(1234_50, "EGP", "tr"))).toBe("E£1.234,50");
    expect(strip(formatCents(1234_50, "MAD", "ar"))).toBe("1,234.50 د.م.");
    expect(strip(formatCents(1234_50, "EGP", "en"))).toBe("E£1,234.50");

    // Refunds (Orders, Donations): the amounts the dashboard's, the words translated by `k`.
    const ar = knownTranslator("ar");
    const tr = knownTranslator("tr");
    expect(strip(refundedLine(150_00, 450_00, "MAD", "ar")!)).toBe("Refunded 150 د.م. of 450 د.م.");
    expect(strip(ar(refundedLine(150_00, 450_00, "MAD", "ar")!))).not.toMatch(/Refunded|MAD/);
    expect(strip(tr(refundedLine(150_00, 150_00, "MAD", "tr")!))).toBe("MAD 150 iade edildi");
    expect(strip(refundedLine(150_00, 450_00, "MAD")!)).toBe("Refunded MAD 150 of MAD 450");

    // Campaigns: raised of the goal.
    const campaign = { raisedCents: 12_450_00, goalCents: 50_000_00 };
    expect(strip(raisedLine(campaign, "MAD", itemWords("tr"), "tr"))).toBe("MAD 12.450 toplandı · Hedef MAD 50.000");
    expect(strip(raisedLine(campaign, "MAD", itemWords("ar"), "ar"))).toBe("12,450 د.م. من 50,000 د.م.");
    expect(strip(raisedLine(campaign, "MAD"))).toBe("MAD 12,450 of MAD 50,000");

    // Bundles: the courses' prices.
    const setup = { currency: "MAD", courses: [{ id: 1, title: "Darija", priceCents: 300_00, active: true, teacherStage: null }] } as unknown as CourseSetup;
    expect(strip(bundleChoices(setup, "مجاني", "ar")[0]!.price)).toBe("300 د.م.");
    expect(strip(bundleChoices(setup, "Ücretsiz", "tr")[0]!.price)).toBe("MAD 300");
  });
});

describe("178.13 the review driver's sample ride", () => {
  const economy = (appId: string, patch: Partial<VehicleTypeInput> = {}): VehicleTypeInput => ({
    appId,
    name: "Economy",
    description: null,
    icon: "directions_car",
    imageAssetId: null,
    seats: 4,
    baseCents: 15_00,
    perKmCents: 6_00,
    perMinuteCents: 1_00,
    minCents: 25_00,
    waitPerMinuteCents: 2_00,
    position: 1,
    active: true,
    ...patch,
  });
  const SETTINGS: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", cash: true, card: true, timezone: "Africa/Cairo" };
  const user = { id: 7, phone: "+201000000000", email: null } as unknown as HostedUser;

  async function world(patch: Partial<VehicleTypeInput> | null) {
    const { store } = (await setupClient()) as { store: MemoryStore };
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app = { ...newApp(client.id, null, NOW, "rides"), backend: "hosted" as const, connector: { kind: "rides" as const } };
    await store.createApp(app);
    const typeId = patch === null ? null : (await store.createVehicleType(economy(app.id, patch), NOW)).id;
    const driver = { id: 3, name: "App Review", driver: { ...EMPTY_DRIVER, vehicleTypeId: typeId, carModel: SAMPLE_CAR, plate: "REVIEW" } } as unknown as Courier;
    return { store, app, driver };
  }

  it("is priced at the driver's type's fares for its 3 km and 10 minutes, not E£0.00", async () => {
    const { store, app, driver } = await world({});
    const ride = await createSampleRide(store, app, SETTINGS, driver, user, NOW);
    const expected = fareCents({ baseCents: 15_00, perKmCents: 6_00, perMinuteCents: 1_00, minCents: 25_00, waitPerMinuteCents: 2_00 }, SAMPLE_KM, SAMPLE_MINUTES);
    expect(expected).toBe(43_00);
    expect(ride.quotedCents).toBe(expected);
    expect(ride.fares.perKmCents).toBe(6_00);
    expect(ride.currency).toBe("EGP");
  });

  it("without fares (no type, or a type at zero), one set price of 50", async () => {
    for (const patch of [null, { baseCents: 0, perKmCents: 0, perMinuteCents: 0, minCents: 0 }]) {
      const { store, app, driver } = await world(patch);
      const ride = await createSampleRide(store, app, SETTINGS, driver, user, NOW);
      expect(ride.quotedCents).toBe(SAMPLE_FALLBACK_CENTS);
      expect(fareCents(ride.fares, SAMPLE_KM, SAMPLE_MINUTES)).toBe(SAMPLE_FALLBACK_CENTS);
      expect(strip(formatCents(ride.quotedCents, "EGP", "ar"))).not.toBe("0.00 ج.م.");
    }
  });

  it("stays out of the drivers' statements", async () => {
    const { store, app, driver } = await world({});
    const sample = await createSampleRide(store, app, SETTINGS, driver, user, NOW);
    const input: Omit<typeof sample, "id"> & { id?: number } = { ...sample };
    delete input.id;
    const real = await store.createRide({ ...input, riderName: "Omar", shareToken: "real-ride-token" });
    for (const r of [sample, real]) await store.updateRide(app.id, r.id, { status: "completed", finalCents: 43_00, driverId: driver.id, driverName: "App Review" });
    const rows = await store.rideStatement(app.id, new Date(NOW.getTime() - 86_400_000), new Date(NOW.getTime() + 86_400_000));
    expect(rows.map((r) => [r.rides, r.faresCents])).toEqual([[1, 43_00]]);
  });

  it("its words are the dashboard's in Arabic and Turkish, the owner's own as written", () => {
    for (const lang of ["ar", "tr"] as const) {
      const k = knownTranslator(lang);
      for (const english of [SAMPLE_RIDER_NAME, SAMPLE_CAR, SAMPLE_PICKUP, SAMPLE_DROPOFF, SAMPLE_NOTE]) {
        const shown = sampleWords(english, k);
        expect(shown, `${lang}: ${english}`).not.toBe(english);
        expect(shown).not.toMatch(/Sample|Example|Review/);
      }
      expect(sampleWords("Tahrir Square, Cairo", k)).toBe("Tahrir Square, Cairo");
      expect(sampleWords(null, k)).toBeNull();
      const driver = { driver: { ...EMPTY_DRIVER, carModel: SAMPLE_CAR, plate: "REVIEW" } } as unknown as Courier;
      expect(carText(driver, k)).toBe(`${getDashT(lang)("rides.known.sampleCar")} · REVIEW`);
    }
    expect(sampleWords(SAMPLE_CAR, knownTranslator("ar"))).toBe("عربية للتجربة");
    expect(sampleWords(SAMPLE_CAR, knownTranslator("tr"))).toBe("Örnek araç");
    // The phones and English keep the sample's own words.
    expect(carText({ driver: { ...EMPTY_DRIVER, carModel: SAMPLE_CAR, plate: "REVIEW" } } as unknown as Courier)).toBe("Sample car · REVIEW");
  });
});
