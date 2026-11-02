import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ItemRow, Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { EmptyState, PageHeader, Section, btn, formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { effectivePlans } from "@/lib/entitlements";
import { formatAmount } from "@/lib/billing/prices";
import { paymentWhat, receiptNumber } from "@/lib/billing/receipt";
import { planName } from "@/lib/plans";
import { plansIn } from "@/lib/marketing-lang";
import { licensePath } from "@/lib/studio/section";

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
  const projectName = (id: string | null) => {
    const project = id === null ? null : ours.get(id);
    return project ? (appLabel(project) === "Untitled app" ? k("Untitled app") : appLabel(project)) : null;
  };
  const projects = [...new Set(paid.map((p) => p.appId).filter((id): id is string => id !== null))];
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the invoices as a list with search and a chip per project. */}
      <PageHeader title={t("studio.invoicesTitle")} description={t("studio.invoicesIntro")} />
      {paid.length ? (
        <Section titleId="h-invoices" title={t("studio.invoicesCount", { count: paid.length })} flush>
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("studio.invoicesSearch")}
            noMatch={t("studio.invoicesNoMatch")}
            filters={projects.map((id) => ({ value: id, label: projectName(id) ?? "—" }))}
            items={paid.map((p, i) => {
              const project = projectName(p.appId);
              const what = k(paymentWhat(p, planName(p.plan, effective)));
              return {
                id: p.id,
                text: [receiptNumber(p), project, what].filter(Boolean).join(" "),
                group: p.appId ?? undefined,
                node: (
                  <ItemRow
                    data-invoice={p.id}
                    media={<Thumb icon="receipt_long" shape="square" tint={i} />}
                    title={<bdi dir="ltr">{receiptNumber(p)}</bdi>}
                    meta={[project ?? "—", what, formatDate(p.paidAt ?? p.createdAt, lang)].join(" · ")}
                    aside={
                      <bdi dir="ltr" className="text-[15px] font-extrabold whitespace-nowrap text-midnight tabular-nums">
                        {formatAmount(p.amountCents, p.currency)}
                      </bdi>
                    }
                    actions={
                      <>
                        <Link href={`/dashboard/license/receipts/${p.id}`} className={`${btn.secondary} h-9 px-3 text-sm`}>
                          <Icon name="receipt_long" size={18} />
                          {t("license.receipt")}
                        </Link>
                        <a href={`/dashboard/license/receipts/${p.id}/pdf`} download className={`${btn.secondary} h-9 px-3 text-sm`}>
                          <Icon name="download" size={18} />
                          PDF
                        </a>
                      </>
                    }
                  />
                ),
              };
            })}
          />
        </Section>
      ) : (
        <EmptyState
          icon="receipt_long"
          title={t("studio.invoicesNone")}
          action={
            <Link href={licensePath(app)} className={`${btn.secondary} h-10`}>
              <Icon name="workspace_premium" size={18} />
              {t("studio.seePlans")}
            </Link>
          }
        />
      )}
    </div>
  );
}
