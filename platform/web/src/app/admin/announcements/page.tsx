import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn, formatDateTime } from "@/components/ui";
import { describeAudience, isLive } from "@/lib/announcements";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { Announcement } from "@/lib/data/types";
import { getPlans } from "@/lib/settings/platform";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

function schedule(a: Announcement, now: Date): { label: string; tone: "success" | "warn" | "neutral" } {
  if (isLive(a, now)) return { label: "Showing", tone: "success" };
  if (a.startsAt.getTime() > now.getTime()) return { label: "Scheduled", tone: "warn" };
  return { label: "Ended", tone: "neutral" };
}

/** News for clients, on their dashboard and by email. */
export default async function AnnouncementsPage({ searchParams }: PageProps<"/admin/announcements">) {
  await requireAdmin();
  const { done } = await searchParams;
  const store = await getStore();
  const [announcements, plans] = await Promise.all([store.listAnnouncements(), getPlans(store)]);
  const planNames = { starter: plans.starter.name, pro: plans.pro.name };
  const now = new Date();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-extrabold">Announcements</h1>
          <span className="text-[15px] text-muted">Shown on the clients&apos; dashboard until they close them, and emailed when you choose.</span>
        </div>
        <Link href="/admin/announcements/new" className={`${btn.primary} h-10`}>
          <Icon name="add" size={20} />
          New announcement
        </Link>
      </div>
      {done === "deleted" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Announcement deleted.
        </Notice>
      ) : null}
      <section aria-label="Announcements" className="overflow-x-auto rounded-2xl border border-line bg-white">
        {announcements.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No announcements yet.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Title</th>
                <th scope="col" className="px-4 py-3 font-semibold">Who</th>
                <th scope="col" className="px-4 py-3 font-semibold">When</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Email</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => {
                const status = schedule(a, now);
                return (
                  <tr key={a.id} className="border-t border-line-soft">
                    <th scope="row" className="px-4 py-3 text-left font-semibold">
                      <Link href={`/admin/announcements/${a.id}`}>{a.title}</Link>
                      {a.severity === "warning" ? (
                        <span className="ml-2">
                          <Badge tone="warn">Warning</Badge>
                        </span>
                      ) : null}
                    </th>
                    <td className="px-4 py-3">{describeAudience(a.audience, planNames)}</td>
                    <td className="px-4 py-3">
                      {formatDateTime(a.startsAt)}
                      {a.endsAt ? ` to ${formatDateTime(a.endsAt)}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{a.emailedAt ? `${a.emailedCount} sent` : "Not sent"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
