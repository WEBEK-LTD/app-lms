import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { KitEmpty, KitHeader, KitHero, KitPage, KitStat, KitStatus, kit } from "@/components/studio-page";
import { factsOf } from "@/components/studio-page/facts";
import { KitInspectorBody, KitInspectorFacts, KitInspectorHead } from "@/components/studio-page/parts";
import { KitTable } from "@/components/studio-page/table";
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
          <KitTable
            data-invoices=""
            label={t("studio.invoicesTitle")}
            title={t("studio.invoicesCount", { count: paid.length })}
            titleId="h-invoices"
            columns={[
              { label: t("studio.invoicesColDate"), width: "minmax(0,1fr)" },
              { label: t("studio.invoicesColPlan"), width: "minmax(0,1.5fr)", phone: "sub" },
              { label: t("studio.invoicesColAmount"), width: "130px" },
              { label: t("studio.invoicesColStatus"), width: "96px", wide: true },
              { label: t("studio.invoicesColReceipt"), width: "88px", phone: "end" },
            ]}
            search={paid.length >= 6 ? t("studio.invoicesSearch") : undefined}
            noMatch={t("studio.invoicesNoMatch")}
            groups={projects.length > 1 ? { label: t("studio.invoicesProject"), all: t("common.all"), items: projects.map((id) => ({ id, label: projectName(id) ?? "—" })) } : undefined}
            rows={paid.map((p) => {
              const project = projectName(p.appId);
              const what = k(paymentWhat(p, planName(p.plan, effective)));
              const pdf = `/dashboard/license/receipts/${p.id}/pdf`;
              return {
                id: p.id,
                name: `${when(p)} · ${receiptNumber(p)}`,
                data: { "data-invoice": p.id },
                text: [receiptNumber(p), project, what, when(p)].filter(Boolean).join(" "),
                group: p.appId ?? undefined,
                cells: [
                  <span key="date" className="min-w-0 truncate text-[14.5px] font-bold">
                    {when(p)}
                  </span>,
                  // On a phone, the amount with it under the date; the page's words first, so it reads right to left in Arabic.
                  <span key="what" className="flex min-w-0 flex-col">
                    <span className="truncate text-(--sp-ink) @max-[560px]/kit-page:text-(--sp-muted)">
                      {parts(what)}
                      <span className="@min-[561px]/kit-page:hidden"> · {amount(p)}</span>
                    </span>
                    {projects.length > 1 && project ? <span className="truncate text-[12.5px] text-(--sp-muted)">{project}</span> : null}
                  </span>,
                  amount(p),
                  <KitStatus key="s" tone="success">
                    {t("studio.invoicesStatusPaid")}
                  </KitStatus>,
                  <a key="pdf" href={pdf} download className={`${kit.row} kit-tr-top h-8 px-3`} aria-label={t("studio.invoicesPdfNamed", { number: receiptNumber(p) })}>
                    <Icon name="download" size={16} />
                    PDF
                  </a>,
                ],
                inspector: {
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
                  body: (
                    <KitInspectorBody data-inspector-invoice={p.id}>
                      <KitInspectorHead
                        badges={<KitStatus tone="success">{t("studio.invoicesStatusPaid")}</KitStatus>}
                        title={
                          <span dir="ltr" className="font-sans text-[26px] tracking-[-0.5px] tabular-nums">
                            {formatAmount(p.amountCents, p.currency)}
                          </span>
                        }
                        line={t("studio.invoicesPaid")}
                      />
                      <KitInspectorFacts
                        facts={factsOf([
                          [t("license.receipt"), <bdi key="n" dir="ltr">{receiptNumber(p)}</bdi>],
                          [t("studio.invoicesColDate"), when(p)],
                          [t("studio.invoicesColPlan"), parts(what)],
                          project ? [t("studio.invoicesProject"), <bdi key="p">{project}</bdi>] : null,
                          [t("studio.invoicesPaidBy"), p.method === "bank_transfer" ? t("studio.invoicesBank") : t("studio.invoicesCard")],
                        ])}
                      />
                    </KitInspectorBody>
                  ),
                },
              };
            })}
          />
        </>
      ) : (
        <div className={kit.card}>
          <KitEmpty icon="receipt_long" title={t("studio.invoicesNone")} action={plansLink} />
        </div>
      )}
    </KitPage>
  );
}
