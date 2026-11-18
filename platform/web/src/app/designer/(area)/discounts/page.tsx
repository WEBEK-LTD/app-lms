import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { MarketHeader } from "@/components/studio-market/header";
import { MarketPhones, PageThumb } from "@/components/studio-market/phone";
import { EmptyState, btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import type { MarketTemplateStatus } from "@/lib/data/types";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { sellerTemplates } from "@/lib/studio-market/catalog";
import { discountState } from "@/lib/studio-market/discounts";
import { formatUsd, ltr, offeredPlans } from "@/lib/studio-market/plans";
import { sampleEntries } from "@/lib/studio/sample-entries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("marketDiscounts.title") };
}
export const dynamic = "force-dynamic";

/**
 * 106.12 Designer area › Discounts: the designer's templates with paid
 * plans, each with its plans' prices and the discounts running now or to
 * come, and Manage discounts (its price drops, flash sales and coupon
 * codes). Free templates have nothing to lower.
 */
export default async function DesignerDiscountsPage() {
  const context = await requireClient("billing");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const rows = await sellerTemplates(store, designer, lang);
  const paid = rows.filter((r) => offeredPlans(r.template).length > 0);
  const discounts = await store.listMarketDiscounts({ designerId: designer.id, notEndedAt: now });
  const status: Record<MarketTemplateStatus, [string, IconName, string]> = {
    published: ["bg-success-bg text-success", "check_circle", t("studioMarket.statusPublished")],
    in_review: ["bg-warn-bg text-warn", "pending", t("studioMarket.statusReview")],
    changes_requested: ["bg-danger-bg text-danger", "edit_note", t("studioMarket.statusChanges")],
    draft: ["bg-line-soft text-muted", "edit", t("studioMarket.statusDraft")],
  };
  const th = "border-b border-[var(--mk-hair2)] bg-[var(--mk-mat)] px-4 py-3 text-start text-[13px] font-semibold text-muted";

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      <MarketHeader eyebrow={t("studioMarket.designerArea")} title={t("marketDiscounts.title")} lead={t("marketDiscounts.lead")} />
      {paid.length ? (
        <section className="mk-panel overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${th} ps-6`}>{t("marketDiscounts.colTemplate")}</th>
                <th className={th}>{t("marketDiscounts.colPlans")}</th>
                <th className={th}>{t("marketDiscounts.colRunning")}</th>
                <th className={`${th} pe-6`}>
                  <span className="sr-only">{t("marketDiscounts.manage")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paid.map((r, i) => {
                const own = discounts.filter((d) => d.templateId === r.template.id);
                const states = own.map((d) => discountState(d, now));
                const running = states.filter((s) => s === "live").length;
                const coming = states.filter((s) => s === "scheduled").length;
                const flash = own.some((d, j) => d.kind === "flash" && states[j] === "live");
                const line = i ? "border-t border-line-soft" : "";
                const [tone, icon, label] = status[r.template.status];
                return (
                  <tr key={r.template.id} data-template={r.template.id}>
                    <td className={`py-3.5 ps-6 pe-4 align-middle ${line}`}>
                      <span className="flex items-center gap-3">
                        <span className="h-[54px] w-10 flex-none overflow-hidden rounded-[9px] border border-line">{r.cover ? <PageThumb view={r.cover} width={40} height={54} /> : null}</span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <b dir="auto" className="text-[15px]">
                            {r.title}
                          </b>
                          <span className={`inline-flex items-center gap-1 self-start rounded-xl px-2 py-0.5 text-xs font-bold whitespace-nowrap ${tone}`}>
                            <Icon name={icon} size={14} filled />
                            {label}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 align-middle ${line}`}>
                      <span className="flex flex-col gap-0.5 text-[13px]">
                        {offeredPlans(r.template).map((p) => (
                          <span key={p.period}>
                            {t(`studioMarket.plan_${p.period}`)} · <b>{ltr(formatUsd(p.cents), lang)}</b>
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 align-middle ${line}`}>
                      <span className="flex flex-col gap-0.5 text-[13px]">
                        <span className={`flex items-center gap-1.5 font-semibold ${running ? "text-[var(--mk-accent)]" : "text-muted"}`}>
                          {flash ? <Icon name="bolt" size={16} filled /> : null}
                          {t("marketDiscounts.runningCount", { count: running })}
                        </span>
                        {coming ? <span className="text-muted">{t("marketDiscounts.comingCount", { count: coming })}</span> : null}
                      </span>
                    </td>
                    <td className={`py-3.5 ps-4 pe-6 text-end align-middle ${line}`}>
                      <Link href={`/designer/discounts/${r.template.id}`} className={`${btn.secondary} h-[32px] gap-[5px] rounded-lg px-3 text-[13px]`}>
                        <Icon name="sell" size={16} />
                        {t("marketDiscounts.manage")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <EmptyState icon="sell" title={t("marketDiscounts.title")}>
          {t("marketDiscounts.noPaid")}
        </EmptyState>
      )}
      {paid.length && rows.length > paid.length ? <p className="m-0 text-[13px] text-muted">{t("marketDiscounts.freeSkipped", { count: rows.length - paid.length })}</p> : null}
    </MarketPhones>
  );
}
