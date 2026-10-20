import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { donationsCsv } from "@/lib/donations/forms";
import { appUrl } from "@/lib/env";

/** The most rows in one export. */
const EXPORT_MAX = 50_000;

/**
 * 29 GET /api/dashboard/donations: the Donations page's "Export CSV" for the
 * signed-in client's current app, with the page's filters (`campaign`,
 * `status=all` for unpaid ones too).
 */
export async function GET(request: Request): Promise<Response> {
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  // 60 Only for whoever on the team may open the page it comes from.
  if (!contextCan(context, "donations")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const app = context.app;
  if (!app || app.connector?.kind !== "campaigns") return new Response("Donations are for Charity & donations apps.", { status: 404 });
  const query = new URL(request.url).searchParams;
  const campaign = query.get("campaign");
  const { items } = await (await getStore()).listDonations({
    appId: app.id,
    campaignId: campaign && /^\d{1,15}$/.test(campaign) ? Number(campaign) : undefined,
    statuses: query.get("status") === "all" ? undefined : ["paid"],
    offset: 0,
    limit: EXPORT_MAX,
  });
  const day = new Date().toISOString().slice(0, 10);
  // 62 Column names and words in the downloader's dashboard language.
  return new Response(donationsCsv(items, (await dashboardText()).k), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="donations-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
