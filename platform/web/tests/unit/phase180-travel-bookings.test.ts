import { describe, expect, it } from "vitest";
import type { DataStore } from "@/lib/data/store";
import type { App, HostedNotification, ListingInquiry } from "@/lib/data/types";
import { notifyInquiryReply, repliedTitle } from "@/lib/listings/notify";
import type { StudioNode } from "@/lib/pages/types";
import { shownWhen } from "@/lib/studio/signed-in";
import { addDisplayPrices, DISPLAY_CONNECTORS } from "@/lib/money/display";
import { ratesOf } from "@/lib/money/rates";
import { lowestPaid } from "@/lib/events/service";
import type { TicketType } from "@/lib/data/types";

/** 180 The travel and bookings templates' QA (docs/qa/2026-11-18-travel-bookings/NOTES.md). */
describe("180.4 the office's reply, in the app's language", () => {
  it("names the office in English, Arabic and Turkish", () => {
    expect(repliedTitle("en", "Nile Homes")).toBe("Nile Homes replied");
    expect(repliedTitle("ar", "Nile Homes")).toBe("ردّ Nile Homes على رسالتك");
    expect(repliedTitle("tr", "Nile Homes")).toBe("Nile Homes yanıt verdi");
  });

  it("the inbox and the push of an Arabic app say it in Arabic", async () => {
    const saved: { title: string }[] = [];
    const store = {
      getAppLayout: async () => ({ published: { languages: { default: "ar" } }, draft: null }),
      createHostedNotification: async (n: { title: string; body: string }) => {
        saved.push(n);
        return { id: 7, ...n } as unknown as HostedNotification;
      },
      listHostedPushDevices: async () => [],
    } as unknown as DataStore;
    const result = await notifyInquiryReply({
      store,
      app: { id: "app-1" } as App,
      inquiry: { id: 3, userId: 9, listingId: 2 } as ListingInquiry,
      listing: null,
      officeName: "بيوت النيل",
      text: "نعم.",
      account: null,
      now: new Date("2026-11-18T10:00:00Z"),
    });
    expect(result.notification.title).toBe("ردّ بيوت النيل على رسالتك");
    expect(saved[0]!.title).toBe("ردّ بيوت النيل على رسالتك");
  });
});

describe("180.11 Studio's canvas as a customer signed in or signed out sees the page", () => {
  const page: StudioNode = {
    id: "body",
    type: "column",
    children: [
      {
        id: "cover",
        type: "photo_hero",
        children: [
          { id: "question", type: "text", text: "Where does the next story begin?", visibility: "signed_out" },
          { id: "trip", type: "tracking", visibility: "signed_in" },
          { id: "brand", type: "text", text: "Safra" },
        ],
      },
      { id: "stays", type: "text", text: "Stays with us" },
    ],
  };
  const ids = (n: StudioNode): string[] => [n.id, ...(n.children ?? []).flatMap(ids)];

  it("signed out: the question, not the next trip", () => {
    expect(ids(shownWhen(page, false))).toEqual(["body", "cover", "question", "brand", "stays"]);
  });

  it("signed in: the next trip, not the question", () => {
    expect(ids(shownWhen(page, true))).toEqual(["body", "cover", "trip", "brand", "stays"]);
  });

  it("a page with nothing marked is left as it is", () => {
    const plain: StudioNode = { id: "body", type: "column", children: [{ id: "a", type: "text", text: "Hi" }] };
    expect(shownWhen(plain, false)).toBe(plain);
  });
});

describe("180.13 events, homes and campaigns in the customer's currency", () => {
  const rates = ratesOf({ rates: { USD: 1, EGP: 50, TRY: 40 }, date: "2026-11-18", fetchedAt: "2026-11-18T06:00:00.000Z", source: "ExchangeRate-API" }, null);
  const usd = { currency: "USD", rates };

  it("their apps get the conversion as the shop's do", () => {
    for (const kind of ["travel", "listings", "campaigns", "events", "bookings", "catalog"]) expect(DISPLAY_CONNECTORS.has(kind), kind).toBe(true);
  });

  it("an event's cheapest paid ticket as money, null when every ticket is free", () => {
    const type = (priceCents: number) => ({ priceCents }) as TicketType;
    expect(lowestPaid([type(0), type(25000), type(15000)], "EGP")).toEqual({ amount: "150.00", currency: "EGP", formatted: "E£150.00" });
    expect(lowestPaid([type(0)], "EGP")).toBeNull();
    const shown = addDisplayPrices({ price_label: "From E£150.00", price_from: lowestPaid([type(15000)], "EGP") }, usd);
    expect(shown.price_from!.display).toMatchObject({ currency: "USD", amount: "3.00", formatted: "$3.00" });
  });

  it("a home's price and a campaign's goal and what was raised", () => {
    const home = addDisplayPrices({ price: { amount: "4250000.00", currency: "EGP", formatted: "EGP 4,250,000", period: null, negotiable: false } }, usd);
    expect(home.price).toMatchObject({ display: { currency: "USD", amount: "85000.00" } });
    const campaign = addDisplayPrices({ goal: "50000.00", goal_formatted: "₺50,000.00", raised: "12000.00", raised_formatted: "₺12,000.00", currency: "TRY" }, usd);
    expect(campaign).toMatchObject({ display: { currency: "USD", goal: "1250.00", raised: "300.00", raised_formatted: "$300.00" } });
  });
});
