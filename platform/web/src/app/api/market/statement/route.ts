import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { monthBounds, vendorStatement } from "@/lib/market/panel-pages";
import { marketCurrency, marketTimezone } from "@/lib/market/settings";
import { statementCsv, statementXlsx } from "@/lib/market/statement-export";
import { statementPdf } from "@/lib/market/statement-pdf";

/** 115.12 A place's statement for a month, as CSV, Excel or PDF, for the app owner's team (Studio › Statements). */
export async function GET(request: Request) {
  const context = await clientFor("orders");
  if (!context || !mayUseDashboard(context) || !context.app || context.app.connector?.kind !== "restaurants") return new Response("Sign in again.", { status: 401 });
  const app = context.app;
  const url = new URL(request.url);
  const vendorId = Number(url.searchParams.get("vendor"));
  const store = await getStore();
  const vendor = Number.isInteger(vendorId) && vendorId > 0 ? await store.getRestaurant(app.id, vendorId) : null;
  if (!vendor) return new Response("Not found", { status: 404 });
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const currency = marketCurrency(settings);
  const timezone = marketTimezone(settings);
  const { from, to, month } = monthBounds(url.searchParams.get("month"), new Date());
  const statement = await vendorStatement({ store, app, vendor, currency }, from, to);
  const lang = (["en", "ar", "tr"] as const).find((l) => l === url.searchParams.get("lang")) ?? "en";
  const name = `statement-${vendor.id}-${month}`;
  const format = url.searchParams.get("format");
  if (format === "xlsx") {
    return new Response(Buffer.from(statementXlsx(statement, lang, timezone, vendor.name)), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${name}.xlsx"` } });
  }
  if (format === "pdf") {
    const pdf = await statementPdf(statement, lang, timezone, vendor.name, app.appName ?? "");
    return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"` } });
  }
  return new Response(statementCsv(statement, lang, timezone), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"` } });
}
