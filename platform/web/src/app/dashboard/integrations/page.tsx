import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { IconName } from "@/components/icon-names";
import { formatDate, formatDateTime } from "@/components/ui";
import { KitFold, KitGroup, KitHeader, KitHero, KitNext, KitPage, KitSettingRow, KitSettings, KitStat, KitStatus, kit } from "@/components/studio-page";
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

const STATE_TONE: Record<IntegrationState, "success" | "danger" | "neutral"> = {
  connected: "success",
  problem: "danger",
  not_set: "neutral",
  waiting: "neutral",
};

/** Each connection's picture on its card. */
const KEY_ICON: Record<IntegrationKey, IconName> = {
  website: "web",
  payments: "credit_card",
  whatsapp: "chat",
  mail: "mail",
  push: "notifications",
  huawei_push: "notifications",
  google_play: "android",
  app_store: "phone_iphone",
  galaxy: "storefront",
  appgallery: "storefront",
  xiaomi: "storefront",
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

  const action = (row: Integration) =>
    row.state === "not_set" ? t("integrations.setUp") : row.testable ? t("integrations.change") : row.key === "whatsapp" || row.key === "mail" ? t("integrations.sendTest") : t("integrations.change");
  const reason = (row: Integration) => t(`integrations.reasons.${row.reason}` as never, { subject: row.subject ?? "", date: row.at ? formatDateTime(row.at, lang) : "" });
  const tracksErrors = (row: Integration) => row.key === "website" || row.key === "payments" || row.key === "whatsapp" || row.key === "mail" || row.key === "push";

  // 132.139 Each connection as a row: its name and state, why in one line, its one action; its last test, the test itself and its errors folded under it.
  const item = (row: Integration) => {
    const heading = t(`integrations.names.${row.key}`);
    const folded = row.testable || tracksErrors(row);
    const summary = row.testable ? (
      <>
        {row.lastCheck ? t("integrations.lastTest", { date: formatDateTime(new Date(row.lastCheck.at), lang) }) : t("integrations.neverTested")}
        {row.lastCheck ? (
          <>
            {" · "}
            <span className={row.lastCheck.ok ? "text-success" : "text-danger"}>{row.lastCheck.ok ? t("integrations.worked") : t("integrations.failed")}</span>
          </>
        ) : null}
        {row.errors.length ? ` · ${t("integrations.errorCount", { count: row.errors.length })}` : ""}
      </>
    ) : row.errors.length ? (
      `${t("integrations.errorsTitle")} · ${num(row.errors.length)}`
    ) : (
      t("integrations.noErrors")
    );
    return (
      <KitSettingRow
        key={row.key}
        titleId={`h-${row.key}`}
        icon={KEY_ICON[row.key]}
        title={heading}
        status={<KitStatus tone={STATE_TONE[row.state]}>{t(`integrations.states.${row.state}`)}</KitStatus>}
        description={<span dir="auto">{reason(row)}</span>}
        action={
          <Link href={row.href} className={kit.row}>
            {action(row)}
          </Link>
        }
        data-integration={row.key}
        data-state={row.state}
      >
        {folded ? (
          <KitFold summary={summary} icon={row.testable ? "fact_check" : "history"} data-integration-details="">
            {row.testable ? (
              <div className="flex flex-col gap-2">
                {row.lastCheck ? (
                  <p className="m-0 text-sm" data-last-check={row.lastCheck.ok ? "ok" : "failed"}>
                    <span className={row.lastCheck.ok ? "text-success" : "text-danger"}>{t(`integrations.checks.${row.lastCheck.code}` as never, { subject: row.lastCheck.subject ?? "" })}</span>
                  </p>
                ) : null}
                {row.lastCheck && row.lastCheck.problems.length > 0 ? (
                  <ul className="m-0 flex list-disc flex-col gap-0.5 ps-5 text-sm text-(--sp-muted)" dir="auto">
                    {row.lastCheck.problems.map((problem, i) => (
                      <li key={i}>{k(problem)}</li>
                    ))}
                  </ul>
                ) : null}
                <TestIntegrationForm integration={row.key} />
                <p className="m-0 text-xs text-(--sp-muted)">{t("integrations.testHint")}</p>
              </div>
            ) : null}
            {tracksErrors(row) ? (
              <div className={`flex flex-col gap-1.5 ${row.testable ? "border-t border-(--sp-line) pt-4" : ""}`}>
                <h4 className="m-0 text-sm font-bold">{t("integrations.errorsTitle")}</h4>
                {row.errors.length === 0 ? (
                  <p className="m-0 text-sm text-(--sp-muted)">{t("integrations.noErrors")}</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0" data-integration-errors="">
                    {row.errors.slice(0, 5).map((error) => (
                      <li key={error.id} className="flex flex-col gap-0.5">
                        <span className="text-sm break-words" dir="ltr">
                          {error.message}
                        </span>
                        <span className="text-xs text-(--sp-muted)">{t("integrations.errorLine", { count: num(error.count), date: formatDate(error.lastAt, lang) })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </KitFold>
        ) : null}
      </KitSettingRow>
    );
  };

  const count = (state: IntegrationState) => rows.filter((row) => row.state === state).length;
  const problem = rows.find((row) => row.state === "problem");
  // 132.160 The console's look: the connected ones as the dark tile with their share as its bar, what needs attention and what isn't set beside it (the first that needs attention as the next step), then each group's connections as settings rows.
  return (
    <KitPage>
      <KitHeader icon="hub" title={t("integrations.title")} description={t("integrations.description", { app: name })} />
      <KitHero
        label={t("integrations.title")}
        stats={
          <>
            <KitStat icon="check_circle" tone="success" label={t("integrations.states.connected")} value={num(count("connected"))} hint={t("integrations.ofAll", { count: rows.length })} progress={rows.length ? count("connected") / rows.length : 0} />
            <KitStat icon="warning" tone={count("problem") ? "warn" : "neutral"} label={t("integrations.states.problem")} value={num(count("problem"))} />
            <KitStat icon="radio_button_unchecked" label={t("integrations.states.not_set")} value={num(count("not_set"))} />
          </>
        }
        next={
          problem ? (
            <KitNext
              icon="warning"
              tone="warn"
              action={
                <Link href={problem.href} className={kit.quiet}>
                  {action(problem)}
                </Link>
              }
            >
              <strong className="font-semibold">{t(`integrations.names.${problem.key}`)}</strong> · {reason(problem)}
            </KitNext>
          ) : undefined
        }
      />
      {GROUPS.map((group) => {
        const items = rows.filter((row) => group.keys.includes(row.key));
        if (items.length === 0) return null;
        return (
          <KitGroup key={group.id} title={<span id={`h-group-${group.id}`}>{t(`integrations.groups.${group.id}`)}</span>}>
            <KitSettings label={t(`integrations.groups.${group.id}`)}>{items.map(item)}</KitSettings>
          </KitGroup>
        );
      })}
    </KitPage>
  );
}
