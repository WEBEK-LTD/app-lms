import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { KitEmpty, KitHeader, KitHero, KitPage, KitSection, KitStat, KitStatus, kit } from "@/components/studio-page";
import { KitInspectorFacts, KitInspectorHead, KitTable, KitTableRow } from "@/components/studio-page/table";
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
  const { t, k, lang, num } = await dashboardText();
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
  // "Studio plan 1 · 6 months": each part in its own direction, so a Latin name and an Arabic period read right to left in Arabic.
  const parts = (text: string) =>
    text.split(" · ").map((part, i) => (
      <span key={i}>
        {i ? " · " : null}
        <bdi>{part}</bdi>
      </span>
    ));
  const latest = paid[0] ?? null;
  const when = (p: (typeof paid)[number]) => formatDate(p.paidAt ?? p.createdAt, lang);
  const amount = (p: (typeof paid)[number]) => (
    <bdi dir="ltr" className="font-sans font-semibold whitespace-nowrap text-(--sp-ink) tabular-nums">
      {formatAmount(p.amountCents, p.currency)}
    </bdi>
  );
  // The total, when every invoice is in one currency.
  const sameCurrency = latest ? paid.filter((p) => p.currency === latest.currency) : [];
  const plansLink = (
    <Link href={licensePath(app)} className={kit.main}>
      <Icon name="workspace_premium" size={20} />
      {t("studio.seePlans")}
    </Link>
  );
  // 132.174 The console's look: See the plans as the main action, the figures as tiles (the latest invoice first), then every
  // invoice as a table (the date, what it paid for, the amount, its state, its receipt), its details in the inspector.
  return (
    <KitPage>
      <KitHeader icon="receipt_long" title={t("studio.invoicesTitle")} description={t("studio.invoicesIntro")} actions={latest ? plansLink : null} />
      {latest ? (
        <>
          <KitHero
            label={t("studio.invoicesTitle")}
            stats={
              <>
                <KitStat icon="receipt_long" label={t("studio.invoicesLatest")} value={<bdi dir="ltr" className="text-[0.6em] tracking-[-0.5px]">{formatAmount(latest.amountCents, latest.currency)}</bdi>} hint={when(latest)} />
                <KitStat icon="task_alt" tone="success" label={t("studio.invoicesPaidLabel")} value={num(paid.length)} href="#h-invoices" />
                {sameCurrency.length === paid.length ? (
                  <KitStat icon="payments" label={t("studio.invoicesTotal")} value={<bdi dir="ltr" className="text-[0.6em] tracking-[-0.5px]">{formatAmount(sameCurrency.reduce((sum, p) => sum + p.amountCents, 0), latest.currency)}</bdi>} />
                ) : null}
              </>
            }
          />
          <KitSection id="h-invoices" titleId="h-invoices-title" title={t("studio.invoicesCount", { count: paid.length })} flush>
            <KitTable
              data-invoices=""
              label={t("studio.invoicesTitle")}
              closeLabel={t("common.close")}
              name={t("studio.invoicesColDate")}
              columns={[
                { label: t("studio.invoicesColPlan"), width: "minmax(0,1.5fr)" },
                { label: t("studio.invoicesColAmount"), width: "130px" },
                { label: t("studio.invoicesColStatus"), width: "96px", wide: true },
              ]}
              end={{ label: t("studio.invoicesColReceipt"), width: "88px" }}
              search={{ label: t("studio.invoicesSearch"), noMatch: t("studio.invoicesNoMatch") }}
              groups={{ all: t("common.all"), items: projects.map((id) => ({ value: id, label: projectName(id) ?? "—" })) }}
            >
              {paid.map((p) => {
                const project = projectName(p.appId);
                const what = k(paymentWhat(p, planName(p.plan, effective)));
                const pdf = `/dashboard/license/receipts/${p.id}/pdf`;
                return (
                  <KitTableRow
                    key={p.id}
                    id={p.id}
                    data-invoice={p.id}
                    text={[receiptNumber(p), project, what, when(p)].filter(Boolean).join(" ")}
                    group={p.appId ?? undefined}
                    name={<span className="min-w-0 truncate">{when(p)}</span>}
                    // The page's words first: the line takes its direction from them, not from a project's Latin name.
                    line={
                      <>
                        {parts(what)} · {amount(p)}
                      </>
                    }
                    cells={[
                      <span key="w" className="flex min-w-0 flex-col">
                        <span className="truncate text-(--sp-ink)">{parts(what)}</span>
                        {projects.length > 1 && project ? <span className="truncate text-[12.5px] text-(--sp-muted)">{project}</span> : null}
                      </span>,
                      amount(p),
                      <KitStatus key="s" tone="success">
                        {t("studio.invoicesStatusPaid")}
                      </KitStatus>,
                    ]}
                    end={
                      <a href={pdf} download className={`${kit.row} kit-tr-top h-8 px-3`} aria-label={t("studio.invoicesPdfNamed", { number: receiptNumber(p) })}>
                        <Icon name="download" size={16} />
                        PDF
                      </a>
                    }
                    inspector={{
                      label: receiptNumber(p),
                      title: t("license.receipt"),
                      footer: (
                        <div className="flex gap-2">
                          <Link href={`/dashboard/license/receipts/${p.id}`} className={`${kit.main} flex-1`}>
                            <Icon name="receipt_long" size={18} />
                            {t("license.receipt")}
                          </Link>
                          <a href={pdf} download className={`${kit.quiet} h-[42px]`}>
                            <Icon name="download" size={18} />
                            PDF
                          </a>
                        </div>
                      ),
                    }}
                  >
                    <div className="flex flex-col gap-4" data-inspector-invoice={p.id}>
                      <KitInspectorHead
                        top={<KitStatus tone="success">{t("studio.invoicesStatusPaid")}</KitStatus>}
                        title={
                          <bdi dir="ltr" className="font-sans text-[26px] tracking-[-0.5px] tabular-nums">
                            {formatAmount(p.amountCents, p.currency)}
                          </bdi>
                        }
                        line={t("studio.invoicesPaid")}
                      />
                      <KitInspectorFacts
                        facts={[
                          [t("license.receipt"), <bdi key="n" dir="ltr">{receiptNumber(p)}</bdi>],
                          [t("studio.invoicesColDate"), when(p)],
                          [t("studio.invoicesColPlan"), parts(what)],
                          project ? [t("studio.invoicesProject"), <bdi key="p">{project}</bdi>] : null,
                          [t("studio.invoicesPaidBy"), p.method === "bank_transfer" ? t("studio.invoicesBank") : t("studio.invoicesCard")],
                        ]}
                      />
                    </div>
                  </KitTableRow>
                );
              })}
            </KitTable>
          </KitSection>
        </>
      ) : (
        <div className={kit.card}>
          <KitEmpty icon="receipt_long" title={t("studio.invoicesNone")} action={plansLink} />
        </div>
      )}
    </KitPage>
  );
}
