import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { MarketHeader } from "@/components/studio-market/header";
import { Notice, btn, formatDate } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { payoutAmount, payoutMonth, payoutNumber } from "@/lib/studio-market/payout-receipt";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("marketMoney.receipt") };
}
export const dynamic = "force-dynamic";

/**
 * 106.11 One payout's receipt in the designer area: the amount, the month,
 * the day the bank sent it, its reference and the account (masked), with the
 * receipt's PDF. Only the designer's own.
 */
export default async function PayoutReceiptPage({ params }: PageProps<"/designer/money/payouts/[id]">) {
  const context = await requireClient("billing");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const { id } = await params;
  const payout = /^[0-9a-f-]{36}$/i.test(id) ? await store.getDesignerPayout(id) : null;
  if (!payout || payout.designerId !== designer.id) notFound();
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-0.5 border-t border-line-soft py-3 first:border-t-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="m-0 text-[15px] font-semibold">{value}</dd>
    </div>
  );
  return (
    <>
      <MarketHeader
        eyebrow={t("studioMarket.designerArea")}
        title={t("marketMoney.receiptTitle", { number: payoutNumber(payout) })}
        lead={t("marketMoney.receiptLead", { month: payoutMonth(payout.period, lang) })}
        back={{ href: "/designer/money", label: t("marketMoney.title") }}
        actions={
          payout.status === "sent" ? (
            <a href={`/designer/money/payouts/${payout.id}/pdf`} className={`${btn.main} h-11`}>
              <Icon name="picture_as_pdf" size={20} />
              {t("marketMoney.receiptPdf")}
            </a>
          ) : null
        }
      />
      {payout.status === "processing" ? (
        <Notice tone="warn" icon="schedule" role="status">
          {t("marketMoney.receiptOnWay")}
        </Notice>
      ) : payout.status === "cancelled" ? (
        <Notice tone="neutral" icon="cancel" role="status">
          {t("marketMoney.receiptCancelled")}
        </Notice>
      ) : null}
      <section data-receipt={payout.status} className="mk-panel flex flex-col gap-2 px-5 py-5 sm:px-7">
        <dl className="m-0 flex flex-col">
          {row(
            t("marketMoney.receiptAmount"),
            <bdi dir="ltr" className="mk-kpi text-[24px]">
              {payoutAmount(payout.amountCents)}
            </bdi>,
          )}
          {row(t("marketMoney.colStatus"), payout.status === "sent" ? t("marketMoney.statusSent") : payout.status === "processing" ? t("marketMoney.statusProcessing") : t("marketMoney.statusCancelled"))}
          {payout.sentOn ? row(t("marketMoney.receiptSentOn"), formatDate(new Date(`${payout.sentOn}T00:00:00.000Z`), lang)) : null}
          {payout.bankReference ? row(t("marketMoney.receiptReference"), <bdi dir="ltr">{payout.bankReference}</bdi>) : null}
          {row(
            t("marketMoney.receiptTo"),
            <span>
              {payout.payeeName} · {payout.bankName} · <bdi dir="ltr">{payout.accountHint}</bdi>
            </span>,
          )}
          {row(t("marketMoney.swift"), <bdi dir="ltr">{payout.swift}</bdi>)}
          {row(t("marketMoney.receiptHow"), t("marketMoney.receiptHowValue"))}
        </dl>
        <p className="m-0 border-t border-line-soft pt-3 text-sm text-muted">{t("marketMoney.receiptShare")}</p>
      </section>
    </>
  );
}
