import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { PageGroup, Stat, StatRow } from "@/components/page-kit";
import { Badge, PageHeader, btn, formatDate, formatDateTime } from "@/components/ui";
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

  const card = (row: Integration) => {
    const heading = t(`integrations.names.${row.key}`);
    const values = { subject: row.subject ?? "", date: row.at ? formatDateTime(row.at, lang) : "" };
    return (
      <section key={row.key} aria-labelledby={`h-${row.key}`} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-white p-5" data-integration={row.key} data-state={row.state}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${row.state === "connected" ? "bg-success-bg text-success" : row.state === "problem" ? "bg-danger-bg text-danger" : "bg-sand text-ink-3"}`}>
            <Icon name={KEY_ICON[row.key]} size={22} />
          </span>
          <div className="flex min-w-0 flex-[1_1_160px] flex-col items-start gap-1">
            <h2 id={`h-${row.key}`} className="m-0 text-base font-bold">
              {heading}
            </h2>
            <Badge tone={STATE_TONE[row.state]}>{t(`integrations.states.${row.state}`)}</Badge>
          </div>
          <Link href={row.href} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
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
            <h3 className="m-0 text-sm font-bold">{t("integrations.errorsTitle")}</h3>
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

  const count = (state: IntegrationState) => rows.filter((row) => row.state === state).length;
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, how many are connected, then each group's connections as cards. */}
      <PageHeader title={t("integrations.title")} description={t("integrations.description", { app: name })} />
      <StatRow label={t("integrations.title")}>
        <Stat icon="check_circle" tone="success" label={t("integrations.states.connected")} value={count("connected")} />
        <Stat icon="warning" tone={count("problem") ? "warn" : "neutral"} label={t("integrations.states.problem")} value={count("problem")} />
        <Stat icon="radio_button_unchecked" label={t("integrations.states.not_set")} value={count("not_set")} />
      </StatRow>
      {GROUPS.map((group) => {
        const items = rows.filter((row) => group.keys.includes(row.key));
        if (items.length === 0) return null;
        return (
          <PageGroup key={group.id} title={t(`integrations.groups.${group.id}`)}>
            <div className="grid gap-4 lg:grid-cols-2">{items.map(card)}</div>
          </PageGroup>
        );
      })}
    </div>
  );
}
