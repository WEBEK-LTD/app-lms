import { checkConnection } from "../admin/connection";
import { ownPaymentAccount } from "../catalog/settings";
import type { Activation, App, AppError, IntegrationCheck, IntegrationChecks, IntegrationKey } from "../data/types";
import type { DataStore } from "../data/store";
import { platformDefinition } from "../hosted/connectors/registry";
import { hmsCredentialsOf, serviceAccountOf } from "../hosted/notify";
import { checkFirebaseAccount, checkHmsCredentials } from "../hosted/push";
import { checkAccount, PROVIDER_NAME, type ProviderUrls } from "../payments/provider";

/**
 * 80.1 Dashboard › Integrations: every connection of an app in one place
 * (its website or platform, card payments, its own WhatsApp number and email
 * server, push, the stores), with its state, the last test and its recent
 * errors (`app_errors`, 78.4). What can be tested without sending anything
 * to anyone has a Test button; its result is kept (`apps.integration_checks`).
 * Messages are codes; the dashboard words them in each language
 * (i18n/dashboard/integrations.ts).
 */

export type IntegrationState = "connected" | "problem" | "not_set" | "waiting";

export interface Integration {
  key: IntegrationKey;
  state: IntegrationState;
  /** Why it is in that state (worded by the dashboard). */
  reason: string;
  /** What it is connected to: a site, a shop, a provider; null for nothing. */
  subject: string | null;
  /** The time that goes with the reason (the plugin's last check-in, the last failure), or null. */
  at: Date | null;
  /** Whether "Test" asks the other side now (without sending anything to anyone). */
  testable: boolean;
  /** Where it is set up. */
  href: string;
  lastCheck: IntegrationCheck | null;
  /** Its errors of the last 30 days, last seen first. */
  errors: AppError[];
}

export const INTEGRATION_ERROR_DAYS = 30;

/** Which connection an app error belongs to. */
export function integrationOfError(error: Pick<AppError, "source" | "code">): IntegrationKey | null {
  switch (error.source) {
    case "wordpress":
    case "platform":
    case "server":
    case "webhook":
      return "website";
    case "payment":
      return "payments";
    case "whatsapp":
      return "whatsapp";
    case "mail":
      return "mail";
    case "push":
      return "push";
    case "sign_in":
      return error.code.startsWith("email") ? "mail" : "whatsapp";
    default:
      return null;
  }
}

/** Whether the app can take card payments (where the dashboard asks for payment keys). */
export function takesPayments(app: App): boolean {
  const kind = app.connector?.kind;
  return Boolean(app.catalogSettings?.payment) || kind === "catalog" || kind === "courses" || kind === "events" || kind === "campaigns" || (kind === "bookings" && app.vertical === "fitness");
}

function paymentsHref(app: App): string {
  switch (app.connector?.kind) {
    case "courses":
      return "/dashboard/courses";
    case "events":
      return "/dashboard/events";
    case "campaigns":
      return "/dashboard/campaigns";
    case "bookings":
      return "/dashboard/memberships";
    default:
      return "/dashboard/catalog";
  }
}

function website(app: App, activation: Activation | null): Pick<Integration, "state" | "reason" | "subject" | "at" | "testable"> {
  const connector = app.connector;
  if (connector?.kind === "shopify") return { state: "connected", reason: "shopify", subject: connector.shopDomain, at: null, testable: true };
  if (connector?.kind === "platform") return { state: "connected", reason: "platform", subject: platformDefinition(connector.platform)?.name ?? connector.platform, at: null, testable: true };
  if (connector) return { state: "connected", reason: "own_content", subject: null, at: null, testable: false };
  if (app.backend === "setup_requested") return { state: "waiting", reason: "setup_requested", subject: null, at: null, testable: false };
  if (app.backend === "custom_api") {
    return app.apiBaseUrl ? { state: "connected", reason: "custom_api", subject: app.apiBaseUrl, at: null, testable: true } : { state: "not_set", reason: "no_api", subject: null, at: null, testable: false };
  }
  if (app.backend === "wordpress") {
    if (!app.siteUrl) return { state: "not_set", reason: "no_site", subject: null, at: null, testable: false };
    if (!activation) return { state: "waiting", reason: "plugin_not_active", subject: app.siteUrl, at: null, testable: true };
    return { state: "connected", reason: "plugin_seen", subject: activation.siteUrl, at: activation.lastCheckedAt, testable: true };
  }
  return { state: "not_set", reason: "no_site", subject: null, at: null, testable: false };
}

/** The app's connections, in the order the page shows them. */
export function integrationsOf(input: { app: App; activation: Activation | null; errors: AppError[] }): Integration[] {
  const { app } = input;
  const checks = app.integrationChecks ?? {};
  const settings = app.hostedSettings;
  const hosted = app.backend === "hosted";
  const rows: Omit<Integration, "lastCheck" | "errors">[] = [];

  rows.push({ key: "website", ...website(app, input.activation), href: "/dashboard/setup?step=website" });

  if (takesPayments(app)) {
    const payment = app.catalogSettings?.payment ?? null;
    if (!payment) rows.push({ key: "payments", state: "not_set", reason: "no_keys", subject: null, at: null, testable: false, href: paymentsHref(app) });
    else if (payment.provider === "yallapp")
      rows.push({ key: "payments", state: "connected", reason: "marketplace", subject: PROVIDER_NAME[payment.via ?? "iyzico"], at: null, testable: false, href: paymentsHref(app) });
    else
      rows.push({
        key: "payments",
        state: "connected",
        reason: payment.sandbox ? "own_keys_sandbox" : "own_keys",
        subject: PROVIDER_NAME[payment.provider],
        at: null,
        testable: true,
        href: paymentsHref(app),
      });
  }

  // The app's own WhatsApp number and email server for sign-in codes (Yallapp's otherwise): tested by sending, on App sign-in.
  if (hosted || settings?.whatsappSender) {
    const sender = settings?.whatsappSender ?? null;
    const failed = settings?.whatsappFailedAt ? new Date(settings.whatsappFailedAt) : null;
    rows.push({
      key: "whatsapp",
      state: !sender ? "connected" : failed ? "problem" : "connected",
      reason: !sender ? "yallapp_number" : failed ? "own_number_failed" : "own_number",
      subject: sender ? sender.instanceId : null,
      at: failed,
      testable: false,
      href: "/dashboard/app-sign-in",
    });
  }
  if (hosted || settings?.mailServer) {
    const server = settings?.mailServer ?? null;
    const failed = settings?.mailFailedAt ? new Date(settings.mailFailedAt) : null;
    rows.push({
      key: "mail",
      state: !server ? "connected" : failed ? "problem" : "connected",
      reason: !server ? "yallapp_mail" : failed ? "own_server_failed" : "own_server",
      subject: server ? server.host : null,
      at: failed,
      testable: false,
      href: "/dashboard/app-sign-in",
    });
  }

  if (hosted) {
    rows.push(
      app.firebaseServiceAccountEncrypted
        ? { key: "push", state: "connected", reason: "firebase", subject: null, at: null, testable: true, href: "/dashboard/notifications" }
        : { key: "push", state: "not_set", reason: "no_firebase", subject: null, at: null, testable: false, href: "/dashboard/notifications" },
    );
  }
  if (app.huaweiPushSecretEncrypted && app.huaweiAppId) {
    rows.push({ key: "huawei_push", state: "connected", reason: "huawei_push", subject: app.huaweiAppId, at: null, testable: true, href: "/dashboard/publishing/more-stores" });
  }

  // The stores' keys are checked when a build uploads with them.
  const store = (key: IntegrationKey, set: boolean, subject: string | null, href: string) =>
    rows.push({ key, state: set ? "connected" : "not_set", reason: set ? "store_key" : "no_store_key", subject: set ? subject : null, at: null, testable: false, href });
  store("google_play", Boolean(app.googlePlayKeyEncrypted), app.googlePlayClientEmail ?? null, "/dashboard/setup?step=publishing");
  store("app_store", Boolean(app.ascPrivateKeyEncrypted), app.ascKeyId ?? null, "/dashboard/setup?step=publishing");
  if (app.galaxyKeyEncrypted) store("galaxy", true, app.galaxyContentId ?? null, "/dashboard/publishing/more-stores");
  if (app.huaweiClientSecretEncrypted) store("appgallery", true, app.huaweiAppId ?? null, "/dashboard/publishing/more-stores");
  if (app.xiaomiPasswordEncrypted) store("xiaomi", true, app.xiaomiUserName ?? null, "/dashboard/publishing/more-stores");

  return rows.map((row) => {
    const lastCheck = checks[row.key] ?? null;
    const errors = input.errors.filter((e) => integrationOfError(e) === row.key).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
    // A failed last test makes a connected one a problem until it passes again.
    const state = row.state === "connected" && lastCheck && !lastCheck.ok && row.testable ? "problem" : row.state;
    return { ...row, state, lastCheck, errors };
  });
}

export interface TestDeps {
  store: DataStore;
  encryptionKey: Buffer;
  now: Date;
  fetcher?: typeof fetch;
  /** Payment providers' addresses in tests. */
  paymentUrls?: ProviderUrls;
}

const failure = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 300);

/** Asks the other side now, sending nothing to anyone. Null when this connection has no test. */
export async function testIntegration(key: IntegrationKey, app: App, deps: TestDeps): Promise<IntegrationCheck | null> {
  const at = deps.now.toISOString();
  const result = (ok: boolean, code: string, subject: string | null = null, problems: string[] = []): IntegrationCheck => ({ at, ok, code, subject, problems });
  switch (key) {
    case "website": {
      const shape = website(app, null);
      if (!shape.testable && app.backend !== "wordpress") return null;
      const status = await checkConnection(deps.store, app, deps.encryptionKey);
      return result(status.ok, status.ok ? "website_answers" : "website_fails", app.connector?.kind === "shopify" ? app.connector.shopDomain : (app.apiBaseUrl ?? app.siteUrl ?? shape.subject), status.ok ? [] : [status.message, ...status.problems]);
    }
    case "payments": {
      const account = ownPaymentAccount(app, deps.encryptionKey);
      if (!account) return app.catalogSettings?.payment && app.catalogSettings.payment.provider !== "yallapp" ? result(false, "payments_unreadable") : null;
      const accepted = await checkAccount(account, { fetcher: deps.fetcher, urls: deps.paymentUrls }).catch(() => null);
      const name = PROVIDER_NAME[account.provider];
      return accepted === true ? result(true, "payments_accepted", name) : accepted === false ? result(false, "payments_refused", name) : result(false, "payments_unreachable", name);
    }
    case "push": {
      if (!app.firebaseServiceAccountEncrypted) return null;
      const account = serviceAccountOf(app, deps.encryptionKey);
      if (!account) return result(false, "push_unreadable");
      try {
        await checkFirebaseAccount(account, { fetcher: deps.fetcher, now: deps.now });
        return result(true, "push_accepted", account.project_id);
      } catch (error) {
        return result(false, "push_refused", account.project_id, [failure(error)]);
      }
    }
    case "huawei_push": {
      const credentials = hmsCredentialsOf(app, deps.encryptionKey);
      if (!credentials) return app.huaweiPushSecretEncrypted ? result(false, "push_unreadable") : null;
      try {
        await checkHmsCredentials(credentials, { fetcher: deps.fetcher });
        return result(true, "huawei_accepted", credentials.app_id);
      } catch (error) {
        return result(false, "huawei_refused", credentials.app_id, [failure(error)]);
      }
    }
    default:
      return null;
  }
}

/** The app's checks with this one's result in it. */
export function withCheck(app: App, key: IntegrationKey, check: IntegrationCheck): IntegrationChecks {
  return { ...(app.integrationChecks ?? {}), [key]: check };
}
