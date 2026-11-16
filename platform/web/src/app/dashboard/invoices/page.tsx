import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { FilterList } from "@/components/page-kit-client";
import { KitEmpty, KitHeader, KitHero, KitNext, KitPage, KitRow, KitSection, KitThumb, kit } from "@/components/studio-page";
import { formatDate } from "@/components/ui";
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
  const latest = paid[0] ?? null;
  const amount = (p: (typeof paid)[number]) => (
    <bdi dir="ltr" className="text-[15px] font-extrabold whitespace-nowrap text-(--sp-ink) tabular-nums">
      {formatAmount(p.amountCents, p.currency)}
    </bdi>
  );
  // 132.144 The premium kit: the latest invoice in one hero card with its receipt and PDF, then every invoice as a row (it opens its receipt; its PDF at the end).
  return (
    <KitPage>
      <KitHeader icon="receipt_long" title={t("studio.invoicesTitle")} description={t("studio.invoicesIntro")} />
      {latest ? (
        <>
          <KitHero
            titleId="h-latest-invoice"
            heading={t("studio.invoicesLatest")}
            title={<bdi dir="ltr">{receiptNumber(latest)}</bdi>}
            description={[formatDate(latest.paidAt ?? latest.createdAt, lang), projectName(latest.appId) ?? "—", k(paymentWhat(latest, planName(latest.plan, effective)))].join(" · ")}
            aside={
              <bdi dir="ltr" className="text-[30px] leading-none font-bold tracking-[-0.6px] text-(--sp-ink) tabular-nums">
                {formatAmount(latest.amountCents, latest.currency)}
              </bdi>
            }
            next={
              <KitNext
                icon="task_alt"
                tone="success"
                action={
                  <>
                    <Link href={`/dashboard/license/receipts/${latest.id}`} className={kit.quiet}>
                      <Icon name="receipt_long" size={18} />
                      {t("license.receipt")}
                    </Link>
                    <a href={`/dashboard/license/receipts/${latest.id}/pdf`} download className={kit.quiet}>
                      <Icon name="download" size={18} />
                      PDF
                    </a>
                  </>
                }
              >
                {t("studio.invoicesPaid")}
              </KitNext>
            }
          />
          <KitSection titleId="h-invoices" title={t("studio.invoicesCount", { count: paid.length })} flush>
            <FilterList
              allLabel={t("common.all")}
              searchLabel={t("studio.invoicesSearch")}
              noMatch={t("studio.invoicesNoMatch")}
              filters={projects.map((id) => ({ value: id, label: projectName(id) ?? "—" }))}
              items={paid.map((p) => {
                const project = projectName(p.appId);
                const what = k(paymentWhat(p, planName(p.plan, effective)));
                return {
                  id: p.id,
                  text: [receiptNumber(p), project, what].filter(Boolean).join(" "),
                  group: p.appId ?? undefined,
                  node: (
                    <KitRow
                      data-invoice={p.id}
                      href={`/dashboard/license/receipts/${p.id}`}
                      media={<KitThumb icon="receipt_long" size={40} />}
                      title={<bdi dir="ltr">{receiptNumber(p)}</bdi>}
                      // The date first: the row's line takes its direction from it, not from a project's Latin name.
                      meta={[formatDate(p.paidAt ?? p.createdAt, lang), project ?? "—", what].join(" · ")}
                      aside={amount(p)}
                      actions={
                        <a href={`/dashboard/license/receipts/${p.id}/pdf`} download className={kit.row}>
                          <Icon name="download" size={16} />
                          PDF
                        </a>
                      }
                    />
                  ),
                };
              })}
            />
          </KitSection>
        </>
      ) : (
        <div className={kit.card}>
          <KitEmpty
            icon="receipt_long"
            title={t("studio.invoicesNone")}
            action={
              <Link href={licensePath(app)} className={kit.quiet}>
                <Icon name="workspace_premium" size={18} />
                {t("studio.seePlans")}
              </Link>
            }
          />
        </div>
      )}
    </KitPage>
  );
}
