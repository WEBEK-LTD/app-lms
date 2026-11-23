import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, EmptyState, PageHeader, Section, btn } from "@/components/ui";
import { setTradeInStatusAction } from "@/app/actions/selling";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { TRADE_IN_STATUSES, type CatalogCurrency, type TradeInStatus } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { techOf } from "@/lib/selling/tech";
import { CatalogTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("tech.requests") };
}

const PER_PAGE = 30;
const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
const TONE: Record<TradeInStatus, "info" | "success" | "neutral" | "warn"> = { new: "info", contacted: "warn", done: "success", declined: "neutral" };

/**
 * 211 Store › Trade-in: the old devices customers want to trade in from the
 * app (the trade-in element, lib/hosted/trade-in.ts), newest first, each
 * with its storage, condition, the estimate the app showed and how to reach
 * the customer; the owner moves each on (contacted, done, declined).
 */
export default async function TradeInPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const { t, date } = await dashboardText();
  const params = await searchParams;
  const status: TradeInStatus | undefined = params.status === "new" ? "new" : undefined;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const store = await getStore();
  const [{ items, total }, fresh] = await Promise.all([store.listTradeInRequests({ appId: app.id, status, offset: (page - 1) * PER_PAGE, limit: PER_PAGE }), store.countNewTradeInRequests(app.id)]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const on = techOf(app)?.tradeIn != null;
  const tab = (active: boolean) =>
    `inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] no-underline ${active ? "border-midnight bg-midnight font-bold text-ivory hover:text-ivory" : "border-line bg-white text-midnight hover:border-line-strong hover:text-midnight"}`;
  const href = (s: TradeInStatus | undefined, p = 1) => `/dashboard/catalog/trade-in?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("tech.requests")} description={t("tech.requestsText")} />
      <CatalogTabs app={app} />
      <Section
        titleId="h-trade-in"
        title={t("tech.requests")}
        actions={
          <nav aria-label={t("tech.requests")} className="flex flex-wrap gap-2">
            <Link href={href("new")} aria-current={status === "new" ? "page" : undefined} className={tab(status === "new")}>
              {t("tech.filterNew")} {fresh > 0 ? `(${fresh})` : ""}
            </Link>
            <Link href={href(undefined)} aria-current={!status ? "page" : undefined} className={tab(!status)}>
              {t("tech.filterAll")}
            </Link>
          </nav>
        }
        flush
      >
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="currency_exchange" title={on ? t("tech.requestsEmpty") : t("tech.requestsOff")} />
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-trade-in-list="">
            {items.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 border-b border-line-soft px-5 py-4 sm:px-6" data-trade-in={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">
                    {r.model} · <span dir="ltr">{r.storage}</span>
                  </span>
                  <Badge tone={TONE[r.status]}>{t(`tech.status_${r.status}`)}</Badge>
                </div>
                <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">{t("tech.condition")}</dt>
                    <dd className="m-0 font-semibold">{t(`tech.grade_${r.grade}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("tech.estimate")}</dt>
                    <dd className="m-0 font-semibold" dir="ltr">
                      {formatCents(r.estimateCents, r.currency as CatalogCurrency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("tech.customer")}</dt>
                    <dd className="m-0 font-semibold">
                      {r.name} ·{" "}
                      <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`} dir="ltr">
                        {r.phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("listings.utc", { time: date(r.createdAt, WHEN) })}</dt>
                  </div>
                </dl>
                {r.note ? (
                  <p className="m-0 text-sm">
                    <span className="text-muted">{t("tech.note")}: </span>
                    {r.note}
                  </p>
                ) : null}
                <form action={setTradeInStatusAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <span className="text-[13px] text-muted">{t("tech.markAs")}</span>
                  {TRADE_IN_STATUSES.filter((s) => s !== r.status).map((s) => (
                    <button key={s} type="submit" name="status" value={s} className={`${btn.secondary} h-8 px-3 text-[13px]`}>
                      {t(`tech.status_${s}`)}
                    </button>
                  ))}
                </form>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 ? (
          <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-sm sm:px-6">
            {page > 1 ? (
              <Link href={href(status, page - 1)} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                {t("listings.newer")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted">{t("common.page", { page, pages })}</span>
            {page < pages ? (
              <Link href={href(status, page + 1)} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
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
