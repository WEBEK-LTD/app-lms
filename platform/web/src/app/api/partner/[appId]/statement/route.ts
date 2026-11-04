import { cookies } from "next/headers";
import { getStore } from "@/lib/data";
import { panelCookie, panelStaff } from "@/lib/market/panel";
import { can, monthBounds, panelContext, vendorStatement } from "@/lib/market/panel-pages";
import { statementCsv, statementXlsx } from "@/lib/market/statement-export";
import { statementPdf } from "@/lib/market/statement-pdf";

/** 115.7 A vendor's statement for a month, as CSV, Excel or PDF, for its owner or manager signed in to the panel. */
export async function GET(request: Request, ctx: RouteContext<"/api/partner/[appId]/statement">) {
  const { appId } = await ctx.params;
  const url = new URL(request.url);
  const store = await getStore();
  const app = await store.getAppById(appId);
  if (!app || app.connector?.kind !== "restaurants") return new Response("Not found", { status: 404 });
  const staff = await panelStaff(store, app, (await cookies()).get(panelCookie(appId))?.value, new Date());
  if (!staff || !can(staff, "statements")) return new Response("Sign in again.", { status: 401 });
  const panel = await panelContext(store, app, staff);
  if (!panel) return new Response("Sign in again.", { status: 401 });
  const { from, to, month } = monthBounds(url.searchParams.get("month"), new Date());
  const statement = await vendorStatement(panel, from, to);
  const lang = (["en", "ar", "tr"] as const).find((l) => l === url.searchParams.get("lang")) ?? "en";
  const name = `statement-${panel.vendor.id}-${month}`;
  const format = url.searchParams.get("format");
  if (format === "xlsx") {
    return new Response(Buffer.from(statementXlsx(statement, lang, panel.timezone, panel.vendor.name)), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${name}.xlsx"` } });
  }
  if (format === "pdf") {
    const pdf = await statementPdf(statement, lang, panel.timezone, panel.vendor.name, app.appName ?? "");
    return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"` } });
  }
  return new Response(statementCsv(statement, lang, panel.timezone), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"` } });
}
