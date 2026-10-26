import { Icon } from "@/components/icon";
import { Badge, ProgressBar } from "@/components/ui";
import { analyticsKeepText } from "@/components/plan-cards";
import type { DashKey } from "@/i18n/dashboard";
import { usageLevel, type UsageRow } from "@/lib/billing/usage";
import type { DashboardText } from "@/lib/dashboard-lang";
import { formatBytes } from "@/lib/media/quota";

const LABEL: Record<UsageRow["key"], DashKey> = {
  app_users: "license.usageAppUsers",
  languages: "license.usageLanguages",
  storage: "license.usageStorage",
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
  return (
    <section aria-labelledby="h-usage" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="h-usage" className="m-0 text-lg font-bold">
          {t("license.usageTitle")}
        </h2>
        <p className="m-0 text-sm text-muted">{intro}</p>
      </div>
      <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        {rows.map((row) => {
          const level = usageLevel(row);
          const label = t(LABEL[row.key]);
          return (
            <li key={row.key} data-usage-row={row.key} data-level={level} className="flex flex-col gap-1.5 rounded-xl border border-line p-4">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-muted">
                {label}
                {level !== "ok" ? <Badge tone={level === "full" ? "danger" : "warn"}>{t(level === "full" ? "license.usageFull" : "license.usageNear")}</Badge> : null}
              </span>
              <span className="text-[17px] font-bold">
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
          <li data-usage-row="analytics" className="flex flex-col gap-1.5 rounded-xl border border-line p-4">
            <span className="text-sm font-semibold text-muted">{t("license.usageAnalytics")}</span>
            <span className="text-[17px] font-bold">{analyticsKeepText(lang, analyticsMonths)}</span>
          </li>
        ) : null}
      </ul>
      {included.length ? (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
          <span className="text-sm font-semibold text-muted">{t("license.usageFeatures")}</span>
          <ul className="m-0 grid list-none gap-x-6 gap-y-1.5 p-0 text-[15px] [grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr))]">
            {included.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Icon name="check" size={18} className="text-success" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {more.length ? (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
          <span className="text-sm font-semibold text-muted">{t("license.usageMore")}</span>
          <ul className="m-0 grid list-none gap-x-6 gap-y-1.5 p-0 text-[15px] text-ink-4 [grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr))]">
            {more.map((f) => (
              <li key={f.label} className="flex items-center gap-2">
                <Icon name="lock" size={18} className="text-faint" />
                <span>
                  {f.label} <span className="text-[13px] text-muted">· {f.plan}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {apps.length > 1 ? (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-4" data-account-apps={apps.length}>
          <h3 className="m-0 text-[15px] font-bold">{t("license.usageAppsTitle")}</h3>
          <p className="m-0 text-sm text-muted">{t("license.usageAppsIntro")}</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-2 pe-3 text-start font-semibold">{t("license.usageColApp")}</th>
                  <th className="py-2 pe-3 text-start font-semibold">{t("license.usageColPlan")}</th>
                  <th className="py-2 pe-3 text-start font-semibold">{t("license.usageColUntil")}</th>
                  <th className="py-2 text-start font-semibold">{t("license.usageColPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} data-account-app={a.id} className="border-t border-line-soft">
                    <td className="py-2 pe-3 font-semibold">
                      {a.name}
                      {a.current ? <span className="text-[13px] font-normal text-muted"> ({t("license.usageThisApp")})</span> : null}
                    </td>
                    <td className="py-2 pe-3">{a.plan ?? t("license.usageNone")}</td>
                    <td className="py-2 pe-3">{a.until ?? "–"}</td>
                    <td className="py-2">
                      <bdi dir="ltr">{a.price ?? "–"}</bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
