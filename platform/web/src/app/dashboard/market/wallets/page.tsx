import type { Metadata } from "next";
import { Badge, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { ListBar, ListSearch, Pager } from "@/components/page-kit-b";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { WalletSummary } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { formatMinor } from "@/lib/market/currency";
import { marketCurrency, marketTimezone } from "@/lib/market/settings";
import { isFood } from "../../shipments/parts";
import { NotMarket } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.wallets") };
}

const PER_PAGE = 30;

/** 115.63 Studio › Wallets: each customer's balance, latest first; a search finds a customer to give credit to. */
export default async function WalletsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { app } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.wallets")} t={t} />;
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const store = await getStore();
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const currency = marketCurrency(settings);
  const zone = marketTimezone(settings);
  // A search: the app's customers by phone, name or email, with or without a wallet yet.
  const found = q ? await store.listHostedUsers({ appId: app.id, query: q, offset: 0, limit: 50 }) : null;
  const wallets = await store.listWallets(app.id, { userIds: found ? found.items.map((u) => u.id) : undefined, limit: PER_PAGE, offset: (page - 1) * PER_PAGE });
  const people = new Map((found?.items ?? (await Promise.all(wallets.items.map((w) => store.getHostedUser(app.id, w.userId)))).filter((u) => u !== null)).map((u) => [u.id, u]));
  const rows: (WalletSummary | { userId: number; balance: 0; entries: 0; lastAt: null })[] = [...wallets.items];
  // Found customers without a wallet yet can be given credit too.
  if (found) for (const u of found.items) if (!rows.some((r) => r.userId === u.id)) rows.push({ userId: u.id, balance: 0, entries: 0, lastAt: null });
  const pages = Math.max(1, Math.ceil(wallets.total / PER_PAGE));
  const link = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("market.wallets")} description={t("market.walletsIntro")} />
      <Section titleId="h-wallets" title={t("market.wallets")} actions={<Badge tone="neutral">{wallets.total}</Badge>} flush>
        <ListBar>
          <ListSearch id="w-q" value={q} label={t("market.walletSearch")} placeholder={t("market.walletSearch")} button={t("market.walletFind")} />
        </ListBar>
        {q && found && found.items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <Notice tone="info" icon="search">
              {t("market.walletCustomerMissing")}
            </Notice>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="payments" title={t("market.noWallets")}>
              {t("market.noWalletsText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {rows.map((w, i) => {
              const who = people.get(w.userId);
              return (
                <ItemRow
                  key={w.userId}
                  href={`/dashboard/market/wallets/${w.userId}`}
                  media={<Thumb icon="payments" shape="square" tint={i} />}
                  title={who?.name || who?.phone || `#${w.userId}`}
                  meta={[who?.phone, who?.email].filter(Boolean).join(" · ") || undefined}
                  extra={
                    <>
                      <span>{t("market.walletEntries", { count: w.entries })}</span>
                      {w.lastAt ? <span>{t("market.walletLast", { date: formatDate(lang, w.lastAt, { day: "numeric", month: "short", year: "numeric", timeZone: zone }) })}</span> : null}
                    </>
                  }
                  aside={
                    <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">
                      <bdi>{formatMinor(w.balance, currency, lang)}</bdi>
                    </span>
                  }
                />
              );
            })}
          </ItemList>
        )}
        {pages > 1 ? (
          <Pager label={t("orders.pages")} page={page} pages={pages} newer={link(page - 1)} older={link(page + 1)} newerLabel={t("food.newer")} olderLabel={t("food.older")} pageLabel={t("common.page", { page, pages })} />
        ) : null}
      </Section>
      <p className="m-0 text-[13px] text-ink-4">{t("market.walletNoCashOut")}</p>
    </div>
  );
}
