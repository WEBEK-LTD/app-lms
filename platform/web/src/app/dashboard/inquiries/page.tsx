import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader, Section, btn } from "@/components/ui";
import { ItemRow, Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
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
  const { app } = await requireClient("messages");
  const { t, date } = await dashboardText();
  const when = (at: Date) => t("listings.utc", { time: date(at, WHEN) });
  if (!app || app.connector?.kind !== "listings") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("listings.inquiries")} description={t("listings.inquiriesNotHere")} />
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

  const tab = (active: boolean) =>
    `inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] no-underline ${active ? "border-midnight bg-midnight font-bold text-ivory hover:text-ivory" : "border-line bg-white text-midnight hover:border-line-strong hover:text-midnight"}`;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the conversations with search and filters, open or closed. */}
      <PageHeader title={t("listings.inquiries")} description={`${t("listings.inquiriesIntro")} ${unread > 0 ? t("listings.unread", { count: unread }) : t("listings.caughtUp")}`} />

      <Section
        titleId="h-inquiries"
        title={status === "open" ? t("listings.openCount", { count: total }) : t("listings.closedCount", { count: total })}
        actions={
          <nav aria-label={t("listings.inquiryStatus")} className="flex flex-wrap gap-2">
            {(["open", "closed"] as const).map((s) => (
              <Link key={s} href={`/dashboard/inquiries?status=${s}`} aria-current={status === s ? "page" : undefined} className={tab(status === s)}>
                {s === "open" ? t("listings.open") : t("listings.closed")}
              </Link>
            ))}
          </nav>
        }
        flush
      >
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="forum" title={status === "open" ? t("listings.noOpen") : t("listings.noClosed")} />
          </div>
        ) : (
          <FilterList
            allLabel={t("listings.filterAll")}
            searchLabel={t("listings.inquiriesSearch")}
            noMatch={t("listings.inquiriesNoMatch")}
            filters={[
              { value: "new", label: t("listings.filterNew") },
              { value: "read", label: t("listings.filterRead") },
            ]}
            items={items.map((row, i) => {
              const name = users.get(row.userId)?.name ?? t("listings.appUser");
              const title = titles.get(row.listingId) ?? t("listings.listingRemoved");
              return {
                id: row.id,
                text: [name, title, row.lastMessage?.text].filter(Boolean).join(" "),
                group: row.unreadByOffice > 0 ? "new" : "read",
                node: (
                  <ItemRow
                    href={`/dashboard/inquiries/${row.id}`}
                    media={<Thumb icon="person" shape="round" tint={i} />}
                    title={
                      <span className={row.unreadByOffice > 0 ? "font-extrabold" : undefined}>
                        {name} · {title}
                      </span>
                    }
                    meta={row.lastMessage ? (row.lastMessage.from === "office" ? t("listings.youWrote", { text: row.lastMessage.text }) : row.lastMessage.text) : undefined}
                    aside={
                      <>
                        <span className="text-[13px] text-muted">{when(row.updatedAt)}</span>
                        {row.unreadByOffice > 0 ? <Badge tone="info">{t("listings.newCount", { count: row.unreadByOffice })}</Badge> : null}
                      </>
                    }
                  />
                ),
              };
            })}
          />
        )}
        {pages > 1 ? (
          <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-sm sm:px-6">
            {page > 1 ? (
              <Link href={`/dashboard/inquiries?status=${status}&page=${page - 1}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                {t("listings.newer")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted">{t("common.page", { page, pages })}</span>
            {page < pages ? (
              <Link href={`/dashboard/inquiries?status=${status}&page=${page + 1}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                {t("listings.older")}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Section>
    </div>
  );
}
