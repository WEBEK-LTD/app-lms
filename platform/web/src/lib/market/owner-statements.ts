import type { DataStore } from "../data/store";
import type { App, Restaurant } from "../data/types";
import { vendorStatement } from "./panel-pages";
import type { Statement } from "./statement";

/**
 * 115.12 Studio › Statements: every place's statement for a month, for the
 * app owner, from the same numbers each place sees on its panel.
 */

export interface VendorStatementRow {
  vendor: Pick<Restaurant, "id" | "name" | "kind">;
  statement: Statement;
}

export async function ownerStatements(store: DataStore, app: App, currency: string, from: Date, to: Date): Promise<VendorStatementRow[]> {
  const vendors = await store.listRestaurants(app.id);
  const rows: VendorStatementRow[] = [];
  for (const vendor of vendors) {
    if (vendor.sample) continue;
    rows.push({ vendor: { id: vendor.id, name: vendor.name, kind: vendor.kind }, statement: await vendorStatement({ store, app, vendor, currency }, from, to) });
  }
  return rows.sort((a, b) => b.statement.totals.total - a.statement.totals.total || a.vendor.name.localeCompare(b.vendor.name));
}

/** The month's totals across all places. */
export function statementsTotal(rows: VendorStatementRow[]) {
  const sum = (pick: (s: Statement["totals"]) => number) => rows.reduce((n, r) => n + pick(r.statement.totals), 0);
  return {
    orders: sum((t) => t.orders),
    total: sum((t) => t.total),
    commission: sum((t) => t.commission),
    courierCharges: sum((t) => t.courierCharges),
    ownerEarns: sum((t) => t.ownerEarns),
    vendorEarns: sum((t) => t.vendorEarns),
    paidOnline: sum((t) => t.paidOnline),
    paidCash: sum((t) => t.paidCash),
    net: sum((t) => t.net),
  };
}
