import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { MarketHeader } from "@/components/studio-market/header";
import { Notice, btn, formatDate } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { DesignerPayout, DesignerPayoutDetails, PayoutDetailsStatus } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { encryptionKey } from "@/lib/env";
import { designerMoney, PAYOUT_MIN_CENTS, payoutPeriod } from "@/lib/studio-market/money";
import { detailsView } from "@/lib/studio-market/payout-details";
import { payoutMonth } from "@/lib/studio-market/payout-receipt";
import { formatUsd, ltr } from "@/lib/studio-market/plans";
import { templateText } from "@/lib/studio-market/templates";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("marketMoney.title") };
}
export const dynamic = "force-dynamic";

/**
 * 106.11 The designer's earnings, in the designer area: the balance
 * available, pending (payouts on their way) and paid out; where their next
 * payout is (their checks, USD 250, this month's); each sale with its split
 * (the sale, Yallapp's 25%, their 75%); and their payouts with receipts.
 */
export default async function DesignerMoneyPage({ searchParams }: PageProps<"/designer/money">) {
  const context = await requireClient("billing");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const params = await searchParams;
  const [{ money, sales, payouts }, details] = await Promise.all([designerMoney(store, designer.id, now), store.getDesignerPayoutDetails(designer.id)]);
  const templates = new Map((await store.listMarketTemplates({ ids: [...new Set(sales.map((s) => s.templateId))] })).map((x) => [x.id, x]));
  const usd = (cents: number) => <bdi dir="ltr">{formatUsd(cents)}</bdi>;
  const onWay = payouts.find((p) => p.status === "processing") ?? null;
  const thisMonth = payouts.find((p) => p.period === payoutPeriod(now) && p.status !== "cancelled") ?? null;

  const tiles: [string, string, number, string, IconName][] = [
    ["available", t("marketMoney.available"), money.availableCents, t("marketMoney.availableHint"), "payments"],
    ["pending", t("marketMoney.pending"), money.pendingCents, t("marketMoney.pendingHint"), "schedule"],
    ["paid", t("marketMoney.paid"), money.paidCents, t("marketMoney.paidHint"), "task_alt"],
    ["earned", t("marketMoney.earned"), money.earnedCents, t("marketMoney.earnedHint", { count: money.sales }), "trending_up"],
  ];

  const checks: Record<PayoutDetailsStatus | "none", [string, IconName, string]> = {
    approved: ["bg-success-bg text-success", "verified_user", t("marketMoney.checksApproved")],
    submitted: ["bg-warn-bg text-warn", "hourglass_top", t("marketMoney.checksSubmitted")],
    changes_requested: ["bg-danger-bg text-danger", "edit_note", t("marketMoney.checksFix")],
    none: ["bg-line-soft text-muted", "badge", t("marketMoney.checksNone")],
  };
  const checksState = details?.status ?? "none";

  /** An amount inside a sentence, kept left to right in Arabic ("$300", not "300$"). */
  const amount = (cents: number) => ltr(formatUsd(cents), lang);
  /** What happens next with their money, in one line. */
  const nextLine = (d: DesignerPayoutDetails | null) => {
    if (onWay) return t("marketMoney.stateOnWay", { amount: amount(onWay.amountCents), bank: onWay.bankName, account: ltr(onWay.accountHint, lang) });
    if (!d) return t("marketMoney.stateNone");
    if (d.status === "submitted") return t("marketMoney.stateSubmitted");
    if (d.status === "changes_requested") return t("marketMoney.stateFix");
    if (money.availableCents < PAYOUT_MIN_CENTS) return t("marketMoney.stateBelow", { amount: amount(money.availableCents), left: amount(PAYOUT_MIN_CENTS - money.availableCents) });
    if (!thisMonth) return t("marketMoney.stateDue", { amount: amount(money.availableCents), bank: d.bankName, account: ltr(detailsView(d, encryptionKey(), false).account, lang) });
    return t("marketMoney.stateNextMonth", { amount: amount(money.availableCents) });
  };

  const th = "border-b border-[var(--mk-hair2)] bg-[var(--mk-mat)] px-4 py-3 text-start text-[13px] font-semibold whitespace-nowrap text-muted";
  const status: Record<DesignerPayout["status"], [string, string]> = {
    processing: ["bg-warn-bg text-warn", t("marketMoney.statusProcessing")],
    sent: ["bg-success-bg text-success", t("marketMoney.statusSent")],
    cancelled: ["bg-line-soft text-muted", t("marketMoney.statusCancelled")],
  };

  return (
    <>
      <MarketHeader eyebrow={t("studioMarket.designerArea")} title={t("marketMoney.title")} lead={t("marketMoney.intro")} />
      {params.details === "sent" ? (
        <Notice tone="success" icon="send" role="status">
          {t("marketMoney.sentNotice")}
        </Notice>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {tiles.map(([key, label, cents, hint, icon]) => (
          <div key={key} data-money={key} className="mk-panel flex flex-col gap-1.5 px-[18px] py-4">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <Icon name={icon} size={18} />
              {label}
            </span>
            <span className="mk-kpi text-[28px]" data-cents={cents}>
              {usd(cents)}
            </span>
            <span className="text-xs text-muted">{hint}</span>
          </div>
        ))}
      </div>

      <section aria-labelledby="payouts-next" className="mk-panel flex flex-col gap-3.5 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="payouts-next" className="m-0 text-lg font-bold">
            {t("marketMoney.payoutsTitle")}
          </h2>
          <span data-checks={checksState} className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold whitespace-nowrap ${checks[checksState][0]}`}>
            <Icon name={checks[checksState][1]} size={15} filled />
            {checks[checksState][2]}
          </span>
        </div>
        <p className="m-0 text-sm text-muted">{t("marketMoney.payoutsRule")}</p>
        <p data-next-payout className="m-0 text-[15px] font-semibold text-ink-2">
          {nextLine(details)}
        </p>
        {details?.status === "changes_requested" && details.reviewNote ? (
          <p className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-sm whitespace-pre-line text-ink-2" dir="auto">
            {details.reviewNote}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2.5">
          <Link href="/designer/money/details" className={!details ? `${btn.main} h-11` : details.status === "changes_requested" ? `${btn.primary} h-11` : `${btn.secondary} h-11`}>
            <Icon name={!details ? "add" : details.status === "changes_requested" ? "edit" : "verified_user"} size={20} />
            {!details ? t("marketMoney.addDetails") : details.status === "changes_requested" ? t("marketMoney.fixDetails") : t("marketMoney.seeDetails")}
          </Link>
        </div>
      </section>

      <section aria-labelledby="sales-title" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="sales-title" className="m-0 text-lg font-bold">
            {t("marketMoney.salesTitle")}
          </h2>
          <span className="text-sm text-muted">{t("marketMoney.salesHint")}</span>
        </div>
        {sales.length ? (
          <div className="mk-panel overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>{t("marketMoney.colWhen")}</th>
                  <th className={th}>{t("marketMoney.colTemplate")}</th>
                  <th className={th}>{t("marketMoney.colPlan")}</th>
                  <th className={`${th} text-end`}>{t("marketMoney.colSale")}</th>
                  <th className={`${th} text-end`}>{t("marketMoney.colYallapp")}</th>
                  <th className={`${th} text-end`}>{t("marketMoney.colYou")}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s, i) => {
                  const template = templates.get(s.templateId);
                  const line = i ? "border-t border-line-soft" : "";
                  return (
                    <tr key={s.id} data-sale={s.id}>
                      <td className={`px-4 py-3 whitespace-nowrap ${line}`}>{formatDate(s.earnedAt, lang)}</td>
                      <td className={`px-4 py-3 ${line}`}>
                        <b dir="auto">{template ? templateText(template, lang).title : t("marketMoney.templateGone")}</b>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${line}`}>
                        {t(`studioMarket.plan_${s.plan}`)}
                        <span className="block text-xs text-muted">{s.kind === "renew" ? t("marketMoney.renewal") : t("marketMoney.purchase")}</span>
                      </td>
                      <td className={`px-4 py-3 text-end tabular-nums ${line}`}>{usd(s.grossCents)}</td>
                      <td className={`px-4 py-3 text-end text-muted tabular-nums ${line}`}>{usd(s.yallappCents)}</td>
                      <td className={`px-4 py-3 text-end font-bold tabular-nums ${line}`} data-you={s.designerCents}>
                        {usd(s.designerCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mk-panel m-0 px-5 py-8 text-center text-sm text-muted">{t("marketMoney.salesEmpty")}</p>
        )}
      </section>

      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <h2 id="history-title" className="m-0 text-lg font-bold">
          {t("marketMoney.historyTitle")}
        </h2>
        {payouts.length ? (
          <div className="mk-panel overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>{t("marketMoney.colMonth")}</th>
                  <th className={`${th} text-end`}>{t("marketMoney.colAmount")}</th>
                  <th className={th}>{t("marketMoney.colStatus")}</th>
                  <th className={th}>{t("marketMoney.colSentOn")}</th>
                  <th className={th}>{t("marketMoney.colReference")}</th>
                  <th className={th}>
                    <span className="sr-only">{t("marketMoney.receipt")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => {
                  const line = i ? "border-t border-line-soft" : "";
                  return (
                    <tr key={p.id} data-payout={p.id}>
                      <td className={`px-4 py-3 whitespace-nowrap ${line}`}>{payoutMonth(p.period, lang)}</td>
                      <td className={`px-4 py-3 text-end font-bold tabular-nums ${line}`}>{usd(p.amountCents)}</td>
                      <td className={`px-4 py-3 ${line}`}>
                        <span className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-bold whitespace-nowrap ${status[p.status][0]}`}>{status[p.status][1]}</span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${line}`}>{p.sentOn ? formatDate(new Date(`${p.sentOn}T00:00:00.000Z`), lang) : "—"}</td>
                      <td className={`px-4 py-3 ${line}`}>
                        <bdi dir="ltr">{p.bankReference ?? "—"}</bdi>
                      </td>
                      <td className={`px-4 py-3 text-end ${line}`}>
                        {p.status === "cancelled" ? null : (
                          <Link href={`/designer/money/payouts/${p.id}`} className={`${btn.secondary} h-[30px] gap-[5px] rounded-lg px-2.5 text-[13px]`}>
                            <Icon name="receipt_long" size={16} />
                            {t("marketMoney.receipt")}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mk-panel m-0 px-5 py-8 text-center text-sm text-muted">{t("marketMoney.historyEmpty")}</p>
        )}
      </section>
    </>
  );
}
