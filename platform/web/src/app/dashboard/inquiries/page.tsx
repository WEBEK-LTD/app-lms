import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { ListingInquiryStatus } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("listings.inquiries") };
}

const PER_PAGE = 30;

const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };

/** Messages from the app about the office's listings, latest first. */
export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { app } = await requireClient();
  const { t, date } = await dashboardText();
  const when = (at: Date) => t("listings.utc", { time: date(at, WHEN) });
  if (!app || app.connector?.kind !== "listings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("listings.inquiries")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("listings.inquiriesNotHere")}</p>
      </div>
    );
  }
  const params = await searchParams;
  const status: ListingInquiryStatus = params.status === "closed" ? "closed" : "open";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const store = await getStore();
  const [{ items, total }, unread, listings] = await Promise.all([
    store.listListingInquiries({ appId: app.id, status, offset: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    store.countUnreadListingInquiries(app.id),
    store.listListings(app.id),
  ]);
  const titles = new Map(listings.map((l) => [l.id, l.title]));
  const users = new Map(
    (await Promise.all([...new Set(items.map((i) => i.userId))].map((id) => store.getHostedUser(app.id, id)))).filter((u) => u !== null).map((u) => [u.id, u]),
  );
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("listings.inquiries")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {t("listings.inquiriesIntro")} {unread > 0 ? t("listings.unread", { count: unread }) : t("listings.caughtUp")}
        </p>
      </div>

      <nav aria-label={t("listings.inquiryStatus")} className="flex gap-2">
        {(["open", "closed"] as const).map((s) => (
          <Link
            key={s}
            href={`/dashboard/inquiries?status=${s}`}
            aria-current={status === s ? "page" : undefined}
            className={`rounded-[10px] px-3.5 py-2 text-[15px] no-underline ${status === s ? "bg-midnight font-bold text-white hover:text-white" : "border border-line bg-white text-midnight hover:text-midnight"}`}
          >
            {s === "open" ? t("listings.open") : t("listings.closed")}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="h-inquiries" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-inquiries" className="m-0 text-lg font-bold">
          {status === "open" ? t("listings.openCount", { count: total }) : t("listings.closedCount", { count: total })}
        </h2>
        {items.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{status === "open" ? t("listings.noOpen") : t("listings.noClosed")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {items.map((row) => (
              <li key={row.id} className="border-t border-line-soft first:border-t-0">
                <Link href={`/dashboard/inquiries/${row.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`truncate text-[15px] ${row.unreadByOffice > 0 ? "font-extrabold" : "font-bold"}`}>
                      {users.get(row.userId)?.name ?? t("listings.appUser")} · {titles.get(row.listingId) ?? t("listings.listingRemoved")}
                    </span>
                    <span className="truncate text-[13px] text-muted">
                      {row.lastMessage ? (row.lastMessage.from === "office" ? t("listings.youWrote", { text: row.lastMessage.text }) : row.lastMessage.text) : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] text-muted">{when(row.updatedAt)}</span>
                  {row.unreadByOffice > 0 ? <Badge tone="info">{t("listings.newCount", { count: row.unreadByOffice })}</Badge> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 ? (
          <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3 pt-2 text-sm">
            {page > 1 ? <Link href={`/dashboard/inquiries?status=${status}&page=${page - 1}`}>{t("listings.newer")}</Link> : <span />}
            <span className="text-muted">{t("common.page", { page, pages })}</span>
            {page < pages ? <Link href={`/dashboard/inquiries?status=${status}&page=${page + 1}`}>{t("listings.older")}</Link> : <span />}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
