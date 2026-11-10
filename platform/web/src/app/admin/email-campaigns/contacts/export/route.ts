import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { contactsCsv } from "@/lib/mailing/contacts";

/**
 * 114 GET /admin/email-campaigns/contacts/export: the contacts as a CSV file
 * (the list's search and tag, when given), with whether each gets campaigns.
 * Only for the team members who write campaigns (marketing.edit); in the audit log.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const admin = await requireAdmin("marketing.edit");
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.slice(0, 100).trim().toLowerCase() || "";
  const tag = url.searchParams.get("tag")?.slice(0, 40) || "";
  const store = await getStore();
  const contacts = (await store.allMailContacts()).filter((c) => (!q || c.email.includes(q) || c.name.toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q)) && (!tag || c.tags.includes(tag)));
  const suppressed = new Map<string, NonNullable<Awaited<ReturnType<typeof store.getMailSuppression>>>["reason"]>();
  for (const email of await store.listMailSuppressed(contacts.map((c) => c.email))) {
    const found = await store.getMailSuppression(email);
    if (found) suppressed.set(email, found.reason);
  }
  const byEmail = new Map(contacts.map((c) => [c.email, c]));
  const csv = contactsCsv(contacts, (email) => suppressed.get(email) ?? (byEmail.get(email)?.unsubscribedAt ? "unsubscribed" : "subscribed"));
  await recordAudit({ actor: admin, action: "mail.contact_export", target: { type: "mail_contact", id: null }, summary: `Exported ${contacts.length} contacts as CSV${tag ? ` (tag “${tag}”)` : ""}${q ? ` (search “${q}”)` : ""}` });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="yallapp-contacts-${day}.csv"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
