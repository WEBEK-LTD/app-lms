import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar } from "@/components/page-kit-b";
import type { DashKey } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { MarketClubMember } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { memberState, type MemberState } from "@/lib/market/club";
import { formatMinor } from "@/lib/market/currency";
import { marketCurrency, marketTimezone } from "@/lib/market/settings";
import { isFood } from "../../shipments/parts";
import { NotMarket } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.clubMembers") };
}

const FILTERS = ["all", "active", "renewed", "ending", "ended", "waiting"] as const;
type Filter = (typeof FILTERS)[number];
const TONES: Record<MemberState, "success" | "info" | "warn" | "neutral"> = { active: "success", renewed: "info", ending: "warn", ended: "neutral", waiting: "neutral" };

/** 115.63 Studio › Club members: each member's plan, the end of their paid period, and whether they renewed or ended (D6: by reminder and payment link). The plans and prices stay on Offers & club. */
export default async function ClubMembersPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { app } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.clubMembers")} t={t} />;
  const show = (FILTERS as readonly string[]).includes((await searchParams).show ?? "") ? ((await searchParams).show as Filter) : "all";
  const store = await getStore();
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const currency = marketCurrency(settings);
  const zone = marketTimezone(settings);
  const now = new Date();
  const members: MarketClubMember[] = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const { items } = await store.listMarketClubMembers(app.id, { limit: 500, offset });
    members.push(...items);
    if (items.length < 500) break;
  }
  const plans = new Map((await store.listMarketClubPlans(app.id)).map((p) => [p.id, p]));
  const states = new Map(members.map((m) => [m.id, memberState(m, now)]));
  const shown = members.filter((m) => show === "all" || states.get(m.id) === show);
  const people = new Map((await Promise.all(shown.slice(0, 300).map((m) => store.getHostedUser(app.id, m.userId)))).filter((u) => u !== null).map((u) => [u.id, u]));
  const date = (at: Date) => formatDate(lang, at, { day: "numeric", month: "short", year: "numeric", timeZone: zone });
  const count = (f: Filter) => (f === "all" ? members.length : members.filter((m) => states.get(m.id) === f).length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("market.clubMembers")} description={t("market.clubMembersIntro")} />
      <Section
        titleId="h-members"
        title={t(`market.ms_${show}` as DashKey)}
        actions={
          <span className="flex items-center gap-3">
            <Link href="/dashboard/market/offers" className="flex items-center gap-1 text-sm font-semibold text-ink-3 no-underline">
              <Icon name="sell" size={18} />
              {t("market.plansAndPrices")}
            </Link>
            <Badge tone="neutral">{shown.length}</Badge>
          </span>
        }
        flush
      >
        <ListBar>
          <FilterLinks label={t("market.clubMembers")} items={FILTERS.map((f) => ({ href: `?show=${f}`, label: t(`market.ms_${f}` as DashKey), current: f === show, count: count(f) }))} />
        </ListBar>
        {shown.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="card_membership" title={t("market.noMembers")}>
              {t("market.noMembersText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {shown.slice(0, 300).map((m, i) => {
              const state = states.get(m.id)!;
              const plan = m.planId ? plans.get(m.planId) : undefined;
              const who = people.get(m.userId);
              return (
                <ItemRow
                  key={m.id}
                  href={`/dashboard/market/wallets/${m.userId}`}
                  media={<Thumb icon="card_membership" shape="square" tint={i} />}
                  title={who?.name || who?.phone || `#${m.userId}`}
                  badges={plan ? <Badge tone="info">{plan.name}</Badge> : null}
                  meta={[plan ? t(plan.period === "year" ? "market.perYear" : "market.perMonth", { price: formatMinor(plan.price, plan.currency, lang) }) : null, m.paidUntil ? t(state === "ended" ? "market.memberEnded" : "market.memberUntil", { date: date(m.paidUntil) }) : null].filter(Boolean).join(" · ")}
                  extra={
                    <>
                      {m.startedAt ? <span>{t("market.memberSince", { date: date(m.startedAt) })}</span> : null}
                      <span>{t("market.memberPeriods", { count: m.periods ?? 0 })}</span>
                      {(m.paidTotal ?? 0) > 0 ? <span>{t("market.memberPaid", { amount: formatMinor(m.paidTotal ?? 0, plan?.currency ?? currency, lang) })}</span> : null}
                      {m.lastPaidAt ? <span>{t("market.memberLastPaid", { date: date(m.lastPaidAt) })}</span> : null}
                    </>
                  }
                  aside={<Badge tone={TONES[state]}>{t(`market.ms_${state}` as DashKey)}</Badge>}
                />
              );
            })}
          </ItemList>
        )}
      </Section>
    </div>
  );
}
