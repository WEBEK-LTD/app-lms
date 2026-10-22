import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader, formatDate, formatDateTime } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { IntegrationKey } from "@/lib/data/types";
import { INTEGRATION_ERROR_DAYS, integrationsOf, type Integration, type IntegrationState } from "@/lib/integrations";
import { TestIntegrationForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("integrations.title") };
}

const GROUPS: { id: "content" | "payments" | "messages" | "push" | "stores"; keys: IntegrationKey[] }[] = [
  { id: "content", keys: ["website"] },
  { id: "payments", keys: ["payments"] },
  { id: "messages", keys: ["whatsapp", "mail"] },
  { id: "push", keys: ["push", "huawei_push"] },
  { id: "stores", keys: ["google_play", "app_store", "galaxy", "appgallery", "xiaomi"] },
];

const STATE_ICON: Record<IntegrationState, "check_circle" | "warning" | "radio_button_unchecked" | "pending"> = {
  connected: "check_circle",
  problem: "warning",
  not_set: "radio_button_unchecked",
  waiting: "pending",
};

const STATE_TONE: Record<IntegrationState, string> = {
  connected: "text-success",
  problem: "text-danger",
  not_set: "text-muted",
  waiting: "text-muted",
};

/**
 * 80.1 Everything the app is connected to (lib/integrations): its website or
 * platform, card payments, who sends its sign-in codes, push and the stores,
 * each with its state, its last test (Test asks it now, sending nothing to
 * anyone) and its errors of the last 30 days.
 */
export default async function IntegrationsPage() {
  const { app } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const now = new Date();
  const license = await store.getLicenseForApp(app.clientId, app.id);
  const activation = license ? await store.getActivation(license.id) : null;
  const errors = await store.listAppErrors({ appId: app.id, since: new Date(now.getTime() - INTEGRATION_ERROR_DAYS * 86_400_000), limit: 100 });
  const rows = integrationsOf({ app, activation, errors });
  const { t, k, num, lang } = await dashboardText();
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);

  const card = (row: Integration) => {
    const heading = t(`integrations.names.${row.key}`);
    const values = { subject: row.subject ?? "", date: row.at ? formatDateTime(row.at, lang) : "" };
    return (
      <section key={row.key} aria-labelledby={`h-${row.key}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5" data-integration={row.key} data-state={row.state}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 id={`h-${row.key}`} className="m-0 text-base font-bold">
              {heading}
            </h3>
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${STATE_TONE[row.state]}`}>
              <Icon name={STATE_ICON[row.state]} size={18} />
              {t(`integrations.states.${row.state}`)}
            </span>
          </div>
          <Link href={row.href} className="text-sm font-semibold text-midnight underline underline-offset-2">
            {row.state === "not_set" ? t("integrations.setUp") : row.testable ? t("integrations.change") : row.key === "whatsapp" || row.key === "mail" ? t("integrations.sendTest") : t("integrations.change")}
          </Link>
        </div>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4" dir="auto">
          {t(`integrations.reasons.${row.reason}` as never, values)}
        </p>
        {row.testable ? (
          <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
            <p className="m-0 text-sm text-muted">
              {row.lastCheck ? t("integrations.lastTest", { date: formatDateTime(new Date(row.lastCheck.at), lang) }) : t("integrations.neverTested")}
              {row.lastCheck ? " · " : " "}
              {row.lastCheck ? (
                <span className={row.lastCheck.ok ? "text-success" : "text-danger"} data-last-check={row.lastCheck.ok ? "ok" : "failed"}>
                  {t(`integrations.checks.${row.lastCheck.code}` as never, { subject: row.lastCheck.subject ?? "" })}
                </span>
              ) : null}
            </p>
            {row.lastCheck && row.lastCheck.problems.length > 0 ? (
              <ul className="m-0 flex list-disc flex-col gap-0.5 ps-5 text-sm text-ink-4" dir="auto">
                {row.lastCheck.problems.map((problem, i) => (
                  <li key={i}>{k(problem)}</li>
                ))}
              </ul>
            ) : null}
            <TestIntegrationForm integration={row.key} />
            <p className="m-0 text-xs text-muted">{t("integrations.testHint")}</p>
          </div>
        ) : null}
        {row.key === "website" || row.key === "payments" || row.key === "whatsapp" || row.key === "mail" || row.key === "push" ? (
          <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
            <h4 className="m-0 text-sm font-bold">{t("integrations.errorsTitle")}</h4>
            {row.errors.length === 0 ? (
              <p className="m-0 text-sm text-muted">{t("integrations.noErrors")}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0" data-integration-errors="">
                {row.errors.slice(0, 5).map((error) => (
                  <li key={error.id} className="flex flex-col gap-0.5">
                    <span className="text-sm break-words" dir="ltr">
                      {error.message}
                    </span>
                    <span className="text-xs text-muted">{t("integrations.errorLine", { count: num(error.count), date: formatDate(error.lastAt, lang) })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    );
  };

  return (
    <>
      <PageHeader title={t("integrations.title")} description={t("integrations.description", { app: name })} />
      {GROUPS.map((group) => {
        const items = rows.filter((row) => group.keys.includes(row.key));
        if (items.length === 0) return null;
        return (
          <section key={group.id} aria-labelledby={`h-group-${group.id}`} className="flex flex-col gap-3">
            <h2 id={`h-group-${group.id}`} className="m-0 text-lg font-bold">
              {t(`integrations.groups.${group.id}`)}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">{items.map(card)}</div>
          </section>
        );
      })}
    </>
  );
}
