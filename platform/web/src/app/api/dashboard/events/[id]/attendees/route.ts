import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { attendeesCsv } from "@/lib/events/attendees";

/**
 * 28 GET /api/dashboard/events/<event>/attendees: the event's attendee list
 * as a CSV file, for the signed-in client's current app only.
 */
export async function GET(_: Request, { params }: RouteContext<"/api/dashboard/events/[id]/attendees">): Promise<Response> {
  const { id } = await params;
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  // 60 Only for whoever on the team may open the page it comes from.
  if (!contextCan(context, "events")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const app = context.app;
  const store = await getStore();
  const event = app && app.connector?.kind === "events" && /^\d{1,15}$/.test(id) ? await store.getEvent(app.id, Number(id)) : null;
  if (!app || !event) return new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const name = event.title.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).toLowerCase() || "event";
  // A byte order mark, so spreadsheets read names in any language correctly.
  return new Response(`\uFEFF${await attendeesCsv(store, app, event, (await dashboardText()).k)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="attendees-${name}.csv"`,
      "cache-control": "no-store",
    },
  });
}
