import { describe, expect, it } from "vitest";
import { statementsTotal, type VendorStatementRow } from "@/lib/market/owner-statements";
import { buildStatement } from "@/lib/market/statement";

const empty = (id: number, name: string): VendorStatementRow => ({
  vendor: { id, name, kind: "restaurant" },
  statement: buildStatement({ from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-12-01T00:00:00Z"), currency: "EGP", orders: [], adjustments: [] }),
});

describe("115.12 the owner's statements across places", () => {
  it("adds every place's month up, and an empty month is all zeros", () => {
    const a = empty(1, "Nile Grill");
    const b = empty(2, "Green Basket");
    a.statement.totals = { ...a.statement.totals, orders: 3, total: 90000, commission: 9000, courierCharges: 1500, ownerEarns: 10500, vendorEarns: 79500, net: 20000, paidOnline: 60000, paidCash: 30000 };
    b.statement.totals = { ...b.statement.totals, orders: 2, total: 40000, commission: 4000, ownerEarns: 4000, vendorEarns: 36000, net: -6000, paidCash: 40000 };
    expect(statementsTotal([a, b])).toEqual({ orders: 5, total: 130000, commission: 13000, courierCharges: 1500, ownerEarns: 14500, vendorEarns: 115500, paidOnline: 60000, paidCash: 70000, net: 14000 });
    expect(statementsTotal([])).toMatchObject({ orders: 0, total: 0, net: 0 });
  });
});
