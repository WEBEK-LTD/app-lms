import { communityApi } from "@/lib/community/site-client";

/** 234 Add to calendar: the API's .ics file for an event, served from the site's own address. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await communityApi<unknown>("GET", `/events/${encodeURIComponent(id)}/ics`);
  if (r.status !== 200 || typeof r.body !== "string") return new Response("Not found", { status: 404 });
  return new Response(r.body, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="event-${id.replace(/[^\w-]/g, "")}.ics"` } });
}
