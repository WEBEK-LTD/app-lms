import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { changeDiscountAction } from "@/app/actions/designer-discounts";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { ConfirmSubmit } from "@/components/studio-market/confirm";
import { MarketHeader } from "@/components/studio-market/header";
import { WasPrice } from "@/components/studio-market/parts";
import { MarketPhones } from "@/components/studio-market/phone";
import { Notice } from "@/components/ui";
import { formatDate as formatIn, formatList } from "@/i18n";
import { requireClient } from "@/lib/auth/session";
import type { MarketDiscountKind } from "@/lib/data/types";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { designerZone, templateDiscounts, type DiscountRow } from "@/lib/studio-market/designer-discounts";
import { bestAutomatic, type DiscountState } from "@/lib/studio-market/discounts";
import { formatUsd, ltr, offeredPlans } from "@/lib/studio-market/plans";
import { templateText } from "@/lib/studio-market/templates";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { en } from "@/i18n/dashboard/market-discounts";
import { CopyCode, NewDiscount, type DiscountPlan } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("marketDiscounts.title") };
}
export const dynamic = "force-dynamic";

/**
 * 106.12 One template's discounts (Designer area › Discounts › the
 * template): its plans' prices now, then its price drops, flash sales and
 * coupon codes, each listed with what it takes off, its plans, its times in
 * the designer's time zone, a code's uses (paid orders) and its status,
 * ended now or deleted; and a new one of each.
 */
export default async function TemplateDiscountsPage({ params, searchParams }: PageProps<"/designer/discounts/[id]">) {
  const context = await requireClient("billing");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const template = await store.getMarketTemplate((await params).id);
  if (!template || template.designerId !== designer.id) notFound();
  const plans = offeredPlans(template);
  if (!plans.length) redirect("/designer/discounts");
  const query = await searchParams;
  const zone = designerZone(context.client);
  const rows = await templateDiscounts(store, template, now);
  const title = templateText(template, lang).title;
  const usd = (cents: number) => ltr(formatUsd(cents), lang);
  const planName = (period: string) => t(`studioMarket.plan_${period as (typeof plans)[number]["period"]}`);
  const when = (date: Date) => ltr(formatIn(lang, date, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone }), lang);
  const running = [...rows.drop, ...rows.flash].filter((r) => r.state === "live").map((r) => r.discount);
  const notice = (key: unknown) => (typeof key === "string" && key in en.known ? t(`marketDiscounts.known.${key as keyof typeof en.known}`) : null);
  const done = notice(query.done);
  const failed = notice(query.error);

  const state: Record<DiscountState, [string, IconName, string]> = {
    live: ["bg-success-bg text-success", "check_circle", t("marketDiscounts.stateLive")],
    scheduled: ["bg-warn-bg text-warn", "schedule", t("marketDiscounts.stateScheduled")],
    used_up: ["bg-line-soft text-muted", "block", t("marketDiscounts.stateUsedUp")],
    ended: ["bg-line-soft text-muted", "event_busy", t("marketDiscounts.stateEnded")],
  };
  const th = "border-b border-[var(--mk-hair2)] bg-[var(--mk-mat)] px-3.5 py-2.5 text-start text-[13px] font-semibold text-muted";
  const td = "border-t border-line-soft px-3.5 py-3 align-middle";
  const forPlans: DiscountPlan[] = plans.map((p) => ({ period: p.period, name: planName(p.period), cents: p.cents }));

  const table = (kind: MarketDiscountKind, list: DiscountRow[]) =>
    list.length ? (
      <div className="overflow-x-auto rounded-[14px] border border-[var(--mk-hair)]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={th}>{t("marketDiscounts.colOff")}</th>
              {kind === "coupon" ? <th className={th}>{t("marketDiscounts.colCode")}</th> : null}
              <th className={th}>{t("marketDiscounts.colPlans")}</th>
              <th className={th}>{t("marketDiscounts.colWhen")}</th>
              {kind === "coupon" ? <th className={th}>{t("marketDiscounts.colUses")}</th> : null}
              <th className={th}>{t("marketDiscounts.colState")}</th>
              <th className={th}>
                <span className="sr-only">{t("marketDiscounts.endNow")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ discount: d, state: s, uses }) => {
              const [tone, icon, label] = state[s];
              const from = d.startsAt && d.startsAt.getTime() > d.createdAt.getTime() ? when(d.startsAt) : null;
              return (
                <tr key={d.id} data-discount={d.id} data-code={d.code ?? undefined} data-state={s}>
                  <td className={`${td} font-bold`}>{d.offType === "percent" ? t("marketDiscounts.percentOff", { percent: d.offValue }) : t("marketDiscounts.amountOff", { amount: usd(d.offValue) })}</td>
                  {kind === "coupon" ? (
                    <td className={td}>
                      <span className="flex flex-wrap items-center gap-2">
                        <code dir="ltr" className="rounded-md bg-line-soft px-2 py-0.5 text-[13px] font-bold tracking-[0.04em]">
                          {d.code}
                        </code>
                        <CopyCode code={d.code ?? ""} />
                      </span>
                    </td>
                  ) : null}
                  <td className={td}>{d.plans === null ? t("marketDiscounts.everyPlan") : formatList(lang, d.plans.map(planName))}</td>
                  <td className={`${td} text-[13px]`}>
                    {from && d.endsAt
                      ? t("marketDiscounts.fromTo", { from, to: when(d.endsAt) })
                      : from
                        ? t("marketDiscounts.fromOnly", { from })
                        : d.endsAt
                          ? d.startsAt
                            ? t("marketDiscounts.fromTo", { from: when(d.startsAt), to: when(d.endsAt) })
                            : t("marketDiscounts.untilOnly", { to: when(d.endsAt) })
                          : t("marketDiscounts.always")}
                  </td>
                  {kind === "coupon" ? (
                    <td className={`${td} tabular-nums`}>{d.usageLimit === null ? t("marketDiscounts.usesNoLimit", { used: uses }) : t("marketDiscounts.usesOf", { used: uses, limit: d.usageLimit })}</td>
                  ) : null}
                  <td className={td}>
                    <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold whitespace-nowrap ${tone}`}>
                      <Icon name={icon} size={15} filled />
                      {label}
                    </span>
                  </td>
                  <td className={`${td} text-end`}>
                    <span className="flex justify-end gap-1.5">
                      {s !== "ended" ? (
                        <form action={changeDiscountAction}>
                          <input type="hidden" name="template" value={template.id} />
                          <input type="hidden" name="discount" value={d.id} />
                          <input type="hidden" name="do" value="end" />
                          <ConfirmSubmit confirm={t("marketDiscounts.endConfirm")} className="mk-btn mk-btn-ghost h-[30px] rounded-lg px-2.5 text-[13px]">
                            {t("marketDiscounts.endNow")}
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                      <form action={changeDiscountAction}>
                        <input type="hidden" name="template" value={template.id} />
                        <input type="hidden" name="discount" value={d.id} />
                        <input type="hidden" name="do" value="delete" />
                        <ConfirmSubmit confirm={t("marketDiscounts.deleteConfirm")} className="mk-btn mk-btn-ghost h-[30px] rounded-lg px-2.5 text-[13px] text-danger">
                          <Icon name="delete" size={16} />
                          {t("marketDiscounts.deleteIt")}
                        </ConfirmSubmit>
                      </form>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="m-0 text-sm text-muted">{t("marketDiscounts.none")}</p>
    );

  const section = (kind: MarketDiscountKind, icon: IconName, heading: string, text: string) => (
    <section id={kind} aria-labelledby={`h-${kind}`} className="mk-panel flex scroll-mt-6 flex-col gap-4 px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="mk-tile flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--mk-accent)]">
          <Icon name={icon} size={22} filled={kind === "flash"} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`h-${kind}`} className="m-0 text-lg leading-snug font-bold">
            {heading}
          </h2>
          <p className="m-0 text-sm leading-relaxed text-muted">{text}</p>
        </div>
      </div>
      {table(kind, rows[kind])}
      <NewDiscount templateId={template.id} kind={kind} plans={forPlans} zone={zone} />
    </section>
  );

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      <MarketHeader back={{ href: "/designer/discounts", label: t("marketDiscounts.backAll") }} eyebrow={t("marketDiscounts.title")} title={<bdi>{title}</bdi>} lead={t("marketDiscounts.lead")} />
      {done ? (
        <Notice tone="success" icon="check_circle" role="status">
          {done}
        </Notice>
      ) : null}
      {failed ? (
        <Notice tone="danger" icon="error" role="alert">
          {failed}
        </Notice>
      ) : null}
      <section aria-labelledby="h-now" className="mk-panel flex flex-col gap-3 px-5 py-4 sm:px-6">
        <h2 id="h-now" className="m-0 text-[15px] font-bold">
          {t("marketDiscounts.pricesNow")}
        </h2>
        <ul className="m-0 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
          {plans.map((p) => {
            const deal = bestAutomatic(p, running, now);
            return (
              <li key={p.period} data-price-now={p.period} className="flex items-baseline gap-2 text-sm">
                <span className="text-muted">{planName(p.period)}</span>
                <b className="text-[17px]">{usd(deal?.cents ?? p.cents)}</b>
                {deal ? <WasPrice text={usd(p.cents)} /> : null}
                {deal?.discount.kind === "flash" ? <Icon name="bolt" size={16} filled className="text-[var(--mk-accent)]" /> : null}
              </li>
            );
          })}
        </ul>
        <span className="flex items-start gap-1.5 text-[13px] text-muted">
          <Icon name="info" size={16} />
          <span>{t("marketDiscounts.noStack")}</span>
        </span>
      </section>
      {section("drop", "sell", t("marketDiscounts.dropsTitle"), t("marketDiscounts.dropsText"))}
      {section("flash", "bolt", t("marketDiscounts.flashTitle2"), t("marketDiscounts.flashText"))}
      {section("coupon", "confirmation_number", t("marketDiscounts.couponsTitle"), t("marketDiscounts.couponsText"))}
    </MarketPhones>
  );
}
