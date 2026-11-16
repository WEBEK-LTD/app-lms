import { Icon } from "@/components/icon";
import { ProgressBar } from "@/components/ui";
import { KitFold, KitStatus, kit } from "@/components/studio-page";
import { analyticsKeepText } from "@/components/plan-cards";
import type { DashKey } from "@/i18n/dashboard";
import { usageLevel, type UsageRow } from "@/lib/billing/usage";
import type { DashboardText } from "@/lib/dashboard-lang";
import { formatBytes } from "@/lib/media/quota";

const LABEL: Record<UsageRow["key"], DashKey> = {
  app_users: "license.usageAppUsers",
  languages: "license.usageLanguages",
  storage: "license.usageStorage",
  // 133
  pages: "license.usagePages",
};

export interface AccountAppRow {
  id: string;
  name: string;
  plan: string | null;
  until: string | null;
  price: string | null;
  current: boolean;
}

/** 94.1 What you pay for: this app's plan, its limits with what is used, what it includes, and the account's other apps. */
export function UsageSection({
  text,
  intro,
  rows,
  analyticsMonths,
  included,
  more,
  apps,
}: {
  text: DashboardText;
  intro: string;
  rows: UsageRow[];
  analyticsMonths: number | null | undefined;
  included: string[];
  more: { label: string; plan: string }[];
  apps: AccountAppRow[];
}) {
  const { t, num, lang } = text;
  const amount = (row: UsageRow, value: number) => (row.key === "storage" ? formatBytes(value) : num(value));
  // 132.134 The premium kit: one card, the limits as figures with their bars, what's included and the account's apps folded.
  return (
    <section aria-labelledby="h-usage" className={`${kit.card} flex min-w-0 flex-col gap-6 p-5 sm:p-8`}>
      <div className="flex flex-col gap-1">
        <h2 id="h-usage" className="m-0 text-[17px] font-bold text-(--sp-ink)">
          {t("license.usageTitle")}
        </h2>
        <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">{intro}</p>
      </div>
      {rows.length || analyticsMonths !== undefined ? (
        <ul className="m-0 grid list-none gap-x-8 gap-y-6 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
          {rows.map((row) => {
            const level = usageLevel(row);
            const label = t(LABEL[row.key]);
            return (
              <li key={row.key} data-usage-row={row.key} data-level={level} className="flex min-w-0 flex-col gap-2">
                <span className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-(--sp-muted)">
                  {label}
                  {level !== "ok" ? <KitStatus tone={level === "full" ? "danger" : "warn"}>{t(level === "full" ? "license.usageFull" : "license.usageNear")}</KitStatus> : null}
                </span>
                <span className="text-[19px] leading-snug font-bold text-(--sp-ink)">
                  <bdi>
                    {row.limit === null
                      ? t("license.usageNoLimit", { used: amount(row, row.used) })
                      : t("license.usageOf", { used: amount(row, row.used), limit: amount(row, row.limit) })}
                  </bdi>
                </span>
                {row.limit !== null ? <ProgressBar value={Math.min(row.used, row.limit)} max={Math.max(row.limit, 1)} label={label} tone={level === "full" ? "danger" : level === "near" ? "warn" : "accent"} /> : null}
              </li>
            );
          })}
          {analyticsMonths !== undefined ? (
            <li data-usage-row="analytics" className="flex min-w-0 flex-col gap-2">
              <span className="text-[13px] font-semibold text-(--sp-muted)">{t("license.usageAnalytics")}</span>
              <span className="text-[19px] leading-snug font-bold text-(--sp-ink)">{analyticsKeepText(lang, analyticsMonths)}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
      {included.length || more.length || apps.length > 1 ? (
        <div className="flex flex-col gap-2">
          {included.length ? (
            <KitFold icon="check_circle" summary={`${t("license.usageFeatures")} · ${num(included.length)}`}>
              <ul className="m-0 grid list-none gap-x-6 gap-y-2 p-0 text-[15px] [grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr))]">
                {included.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Icon name="check" size={18} className="text-success" />
                    {f}
                  </li>
                ))}
              </ul>
            </KitFold>
          ) : null}
          {more.length ? (
            <KitFold icon="lock" summary={`${t("license.usageMore")} · ${num(more.length)}`}>
              <ul className="m-0 grid list-none gap-x-6 gap-y-2 p-0 text-[15px] text-(--sp-muted) [grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr))]">
                {more.map((f) => (
                  <li key={f.label} className="flex items-center gap-2">
                    <Icon name="lock" size={18} className="text-(--sp-muted)" />
                    <span>
                      {f.label} <span className="text-[13px]">· {f.plan}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </KitFold>
          ) : null}
          {apps.length > 1 ? (
            <KitFold icon="apps" summary={<h3 className="m-0 text-sm font-semibold">{t("license.usageAppsTitle")}</h3>} data-account-apps={apps.length}>
              <p className="m-0 text-sm text-(--sp-muted)">{t("license.usageAppsIntro")}</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-start text-sm">
                  <thead>
                    <tr className="text-(--sp-muted)">
                      <th className="py-2 pe-3 text-start font-semibold">{t("license.usageColApp")}</th>
                      <th className="py-2 pe-3 text-start font-semibold">{t("license.usageColPlan")}</th>
                      <th className="py-2 pe-3 text-start font-semibold">{t("license.usageColUntil")}</th>
                      <th className="py-2 text-start font-semibold">{t("license.usageColPrice")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((a) => (
                      <tr key={a.id} data-account-app={a.id} className="border-t border-(--sp-line-soft)">
                        <td className="py-2.5 pe-3 font-semibold">
                          {a.name}
                          {a.current ? <span className="text-[13px] font-normal text-(--sp-muted)"> ({t("license.usageThisApp")})</span> : null}
                        </td>
                        <td className="py-2.5 pe-3">{a.plan ?? t("overview.noPlan")}</td>
                        <td className="py-2.5 pe-3">{a.until ?? "–"}</td>
                        <td className="py-2.5">
                          <bdi dir="ltr">{a.price ?? "–"}</bdi>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </KitFold>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
