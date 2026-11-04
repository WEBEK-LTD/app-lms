import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { Badge, btn, EmptyState, PageHeader, Section } from "@/components/ui";
import { createJoinFormAction } from "@/app/actions/joining";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { MarketApplicationStatus } from "@/lib/data/types";
import { isFood } from "../../shipments/parts";
import { APPLICATION_TONES, NotMarket } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.joining") };
}

/** 115.12 Studio › Joining: the forms places fill in to join, and the applications waiting for an answer. */
export default async function JoiningPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { app } = await requireClient("orders");
  const { t } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.joining")} t={t} />;
  const status = (await searchParams).status;
  const statuses: MarketApplicationStatus[] = status === "done" ? ["accepted", "rejected"] : ["new", "more_info"];
  const store = await getStore();
  const [forms, applications] = await Promise.all([store.listMarketApplicationForms(app.id), store.listMarketApplications(app.id, { statuses, limit: 100, offset: 0 })]);
  const formName = new Map(forms.map((f) => [f.id, f.title]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("market.joining")} description={t("market.joiningIntro")} />

      <Section titleId="h-apps" title={t("market.applications")} actions={<Badge tone="neutral">{applications.total}</Badge>} flush>
        <div className="flex gap-2 border-b border-line-soft px-5 py-3 sm:px-6">
          {(["waiting", "done"] as const).map((s) => (
            <Link key={s} href={s === "waiting" ? "?" : "?status=done"} className={`rounded-full px-3 py-1 text-[13px] font-bold no-underline ${(status === "done") === (s === "done") ? "bg-midnight text-white" : "bg-sand text-ink-3"}`}>
              {t(s === "waiting" ? "market.appsWaiting" : "market.appsDone")}
            </Link>
          ))}
        </div>
        {applications.items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="storefront" title={t("market.noApplications")} />
          </div>
        ) : (
          <ItemList>
            {applications.items.map((a, i) => (
              <ItemRow
                key={a.id}
                href={`/dashboard/market/joining/applications/${a.id}`}
                media={<Thumb icon="storefront" shape="square" tint={i} />}
                title={a.businessName}
                meta={[t(`market.vk_${a.kind}` as DashKey), a.email, formName.get(a.formId) ?? ""].filter(Boolean).join(" · ")}
                aside={<Badge tone={APPLICATION_TONES[a.status]}>{t(`market.as_${a.status}` as DashKey)}</Badge>}
              />
            ))}
          </ItemList>
        )}
      </Section>

      <Section titleId="h-forms" title={t("market.joinForms")} description={t("market.joinFormsIntro")} actions={<Badge tone="neutral">{forms.length}</Badge>} flush>
        {forms.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="assignment" title={t("market.noForms")} />
          </div>
        ) : (
          <ItemList>
            {forms.map((f, i) => (
              <ItemRow
                key={f.id}
                href={`/dashboard/market/joining/${f.id}`}
                media={<Thumb icon="assignment" shape="square" tint={i} />}
                title={f.title}
                meta={t("market.questionsCount", { count: f.fields.length })}
                aside={<Badge tone={f.open ? "success" : "neutral"}>{t(f.open ? "market.formOpen" : "market.formClosed")}</Badge>}
              />
            ))}
          </ItemList>
        )}
        <form action={createJoinFormAction} className="flex flex-wrap items-end gap-3 border-t border-line-soft p-5 sm:p-6">
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-[13px] font-semibold text-ink-3">
            {t("market.formTitle")}
            <input name="title" required maxLength={120} className="input w-full" />
          </label>
          <button type="submit" className={`${btn.primary} h-10 px-4 text-sm`}>
            <Icon name="add" size={18} />
            {t("market.newForm")}
          </button>
        </form>
      </Section>
    </div>
  );
}
