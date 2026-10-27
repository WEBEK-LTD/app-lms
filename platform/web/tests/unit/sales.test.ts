import { describe, expect, it } from "vitest";
import { salesShows } from "@/lib/analytics/sales";
import { MemoryStore } from "@/lib/data/memory";
import { salesStoreSuite } from "./sales-store-suite";

describe("86.1 sales over a range", () => {
  salesStoreSuite(() => new MemoryStore());

  it("shows only what the app has", () => {
    const shows = (kind: string, backend: "hosted" | "wordpress" = "hosted") => salesShows({ connector: { kind } as never, backend, vertical: null, catalogSettings: null } as never);
    expect(shows("catalog")).toEqual({ orders: true, refunds: true, enrolments: false, bookings: false, tickets: false, donations: false, inApp: false });
    expect(shows("events")).toMatchObject({ orders: true, tickets: true, bookings: false });
    expect(shows("campaigns")).toEqual({ orders: false, refunds: true, enrolments: false, bookings: false, tickets: false, donations: true, inApp: false });
    // Articles and listings sell nothing: no Sales section.
    expect(Object.values(shows("articles")).some(Boolean)).toBe(false);
    expect(Object.values(shows("listings")).some(Boolean)).toBe(false);
  });
});
