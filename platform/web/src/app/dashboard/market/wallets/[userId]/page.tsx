import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { changeWalletAction } from "@/app/actions/market-wallet";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import type { DashKey } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { WalletEntry } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { formatMinor } from "@/lib/market/currency";
import { marketCurrency, marketTimezone } from "@/lib/market/settings";
import { entryDetails } from "@/lib/market/wallet";
import { isFood } from "../../../shipments/parts";
import { NotMarket } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.wallets") };
}

const field = "input w-full";
const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-3";

const KIND_ICONS: Record<WalletEntry["kind"], string> = { refund: "undo", credit: "redeem", payment: "shopping_bag", expired: "history", taken_back: "cancel" };

/** 115.63 One customer's wallet: the balance, where each amount came from and went, and the owner's credit or take-back with its reason. */
export default async function WalletPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ error?: string; done?: string }> }) {
  const { app } = await requireClient("orders");
  const { t, k, lang } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.wallets")} t={t} />;
  const userId = Number((await params).userId);
  const store = await getStore();
  const customer = Number.isInteger(userId) && userId > 0 ? await store.getHostedUser(app.id, userId) : null;
  if (!customer) notFound();
  const { error, done } = await searchParams;
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const currency = marketCurrency(settings);
  const zone = marketTimezone(settings);
  const [balance, entries] = await Promise.all([store.walletBalance(app.id, userId), store.listWalletEntries(app.id, userId, { limit: 100, offset: 0 })]);
  const details = await entryDetails(store, app.id, entries.items);
  const money = (minor: number) => formatMinor(minor, currency, lang);
  const name = customer.name || customer.phone || `#${userId}`;
  const when = (at: Date) => formatDate(lang, at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });

  const form = (direction: "credit" | "take_back") => (
    <form action={changeWalletAction} className="flex flex-col gap-3">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="key" value={randomUUID()} />
      <h3 className="m-0 flex items-center gap-2 text-base font-bold">
        <Icon name={direction === "credit" ? "add" : "undo"} size={20} className="text-muted" />
        {t(direction === "credit" ? "market.addCredit" : "market.takeBack")}
      </h3>
      <label className={label}>
        {t("market.walletAmount")} ({currency})
        <input name="amount" required inputMode="decimal" dir="ltr" className={field} />
      </label>
      <label className={label}>
        {t("market.walletReason")}
        <input name="reason" required maxLength={140} className={field} />
        <span className="text-[12px] font-normal text-ink-4">{t("market.walletReasonHint")}</span>
      </label>
      <button type="submit" className={`${direction === "credit" ? btn.primary : btn.secondary} h-10 self-start px-4 text-sm`}>
        {t(direction === "credit" ? "market.addCredit" : "market.takeBack")}
      </button>
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/market/wallets" className="flex items-center gap-1 self-start text-sm font-semibold text-ink-3 no-underline">
        <Icon name="arrow_back" size={18} className="rtl:-scale-x-100" />
        {t("market.allWallets")}
      </Link>
      <PageHeader title={t("market.walletOf", { name })} description={[customer.phone, customer.email].filter(Boolean).join(" · ") || undefined} />
      {error ? (
        <Notice tone="danger" icon="error">
          {k(error)}
        </Notice>
      ) : done ? (
        <Notice tone="success" icon="check_circle">
          {t(done === "take_back" ? "market.creditTaken" : "market.creditAdded")}
        </Notice>
      ) : null}
      <Section titleId="h-balance" title={t("market.walletBalance")}>
        <p className="m-0 text-[32px] leading-none font-extrabold tabular-nums">
          <bdi>{money(balance)}</bdi>
        </p>
        <div className="mt-5 grid gap-6 border-t border-line-soft pt-5 md:grid-cols-2">
          {form("credit")}
          {form("take_back")}
        </div>
        <p className="mt-5 mb-0 text-[13px] text-ink-4">{t("market.walletNoCashOut")}</p>
      </Section>
      <Section titleId="h-entries" title={t("market.walletEntries", { count: entries.total })} flush>
        {entries.items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="payments" title={t("market.walletNoEntries")} />
          </div>
        ) : (
          <ItemList>
            {entries.items.map((e, i) => {
              const d = details.get(e.id);
              const where = [d?.complaintReference ? t("market.walletComplaint", { ref: d.complaintReference }) : null, d?.vendorName, d?.orderReference, d?.restPaidBy ? t("market.walletRest", { how: t(`market.rest_${d.restPaidBy}` as DashKey) }) : null].filter(Boolean);
              return (
                <ItemRow
                  key={e.id}
                  media={<Thumb icon={KIND_ICONS[e.kind] as "undo"} shape="square" tint={i} />}
                  title={k(e.label)}
                  badges={<Badge tone={e.amount >= 0 ? "success" : "neutral"}>{t(`market.wk_${e.kind}` as DashKey)}</Badge>}
                  meta={where.length ? where.join(" · ") : undefined}
                  extra={<span>{when(e.createdAt)}</span>}
                  aside={
                    <span className={`text-[15px] font-bold whitespace-nowrap tabular-nums ${e.amount >= 0 ? "text-success" : ""}`}>
                      <bdi>
                        {e.amount >= 0 ? "+" : "−"}
                        {money(Math.abs(e.amount))}
                      </bdi>
                    </span>
                  }
                />
              );
            })}
          </ItemList>
        )}
      </Section>
    </div>
  );
}
