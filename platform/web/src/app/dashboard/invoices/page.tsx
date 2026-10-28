import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader, btn, formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { effectivePlans } from "@/lib/entitlements";
import { formatAmount } from "@/lib/billing/prices";
import { paymentWhat, receiptNumber } from "@/lib/billing/receipt";
import { planName } from "@/lib/plans";
import { plansIn } from "@/lib/marketing-lang";

export async function generateMetadata(): Promise<Metadata> {
  await requireClient("billing");
  return { title: (await dashboardText()).t("studio.invoicesTitle") };
}

/**
 * Every paid invoice of the account's projects in one list (a Studio
 * project's plan, storage packs, card or bank transfer), newest first, each
 * with its receipt and PDF. A Studio project sees Studio's, a regular app the
 * regular apps'; the account's own payments (before any app) go with both.
 */
export default async function InvoicesPage() {
  const { app, apps, client } = await requireClient("billing");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const studio = app?.section === "studio";
  const ours = new Map(apps.filter((a) => (a.section === "studio") === studio).map((a) => [a.id, a]));
  const effective = plansIn(lang, await effectivePlans(store));
  const paid = (await store.listPlanPayments({ clientId: client.id, limit: 200 })).filter((p) => p.status === "paid" && (p.appId === null || ours.has(p.appId)));
  return (
    <>
      <PageHeader title={t("studio.invoicesTitle")} description={t("studio.invoicesIntro")} />
      {paid.length ? (
        <section aria-label={t("studio.invoicesTitle")} className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-start text-muted">
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("studio.invoiceNumber")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("studio.invoiceProject")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("studio.invoiceFor")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("studio.invoiceAmount")}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t("studio.invoiceDate")}</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{t("license.receipt")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paid.map((p) => {
                const project = p.appId === null ? null : ours.get(p.appId)!;
                return (
                  <tr key={p.id} data-invoice={p.id} className="border-t border-line-soft">
                    <td className="px-4 py-3 font-semibold whitespace-nowrap" dir="ltr">{receiptNumber(p)}</td>
                    <td className="px-4 py-3">{project ? (appLabel(project) === "Untitled app" ? k("Untitled app") : appLabel(project)) : "—"}</td>
                    <td className="px-4 py-3">{k(paymentWhat(p, planName(p.plan, effective)))}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <bdi dir="ltr">{formatAmount(p.amountCents, p.currency)}</bdi>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.paidAt ?? p.createdAt, lang)}</td>
                    <td className="px-4 py-3">
                      <span className="flex justify-end gap-2">
                        <Link href={`/dashboard/license/receipts/${p.id}`} className={`${btn.secondary} h-9 px-3 text-sm`}>
                          <Icon name="receipt_long" size={18} />
                          {t("license.receipt")}
                        </Link>
                        <a href={`/dashboard/license/receipts/${p.id}/pdf`} download className={`${btn.secondary} h-9 px-3 text-sm`}>
                          <Icon name="download" size={18} />
                          PDF
                        </a>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="m-0 rounded-2xl border border-line bg-white p-6 text-[15px] text-muted">{t("studio.invoicesNone")}</p>
      )}
    </>
  );
}
