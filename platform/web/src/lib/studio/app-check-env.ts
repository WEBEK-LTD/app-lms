import { assetUrl } from "../assets";
import { hostedDownloadsOn } from "../courses/downloads";
import { hmacSha256 } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { appPlanFrom, effectivePlans } from "../entitlements";
import { appUrl, encryptionKey, signingSecret } from "../env";
import { connectorFor } from "../hosted/connectors";
import { pickableContent } from "../hosted/pages/pickable";
import { handleHosted } from "../hosted/service";
import { appIsActive } from "../license/status";
import { foodRoutesOn, marketplaceOn } from "../market/plan";
import { draftLayout, loadLayout } from "../pages/layout";
import { hasFeature } from "../plans";
import { storeBillingOn } from "../store-billing/access";
import { isTaxiApp, taxiOn } from "../taxi/settings";
import { getDashT, type DashKey } from "@/i18n/dashboard";
import { getStore } from "../data";
import { emailLangOf } from "../email/send";
import { localeInfo } from "../i18n/locales";
import { sendMail } from "../mail";
import { raiseAlert, type TeamMail } from "../watch/alerts";
import { teamMail } from "../watch/env";
import { appCheckable, runAppCheck, type AppCheckReport, type CheckServe } from "./app-check";
import { tellAppCheck, type AppCheckAlertDeps, type OwnerCheckMail } from "./app-check-alerts";
import { fixHref } from "./app-check-links";
import { isStudioProject } from "./section";

/**
 * 182 The app check as the platform runs it: the hosted API of this app,
 * read-only (GET only, no sign-in, nothing sent), as the app preview reads
 * it, with the draft (on Publish) or what's published (before a build).
 */

async function serveFor(store: DataStore, app: App, draft: boolean, now: Date): Promise<CheckServe> {
  const [client, license] = await Promise.all([store.getClientById(app.clientId), store.getLicenseForApp(app.clientId, app.id)]);
  const plan = await appPlanFrom(store, await effectivePlans(store), license, now);
  const ctx = {
    store,
    app,
    active: appIsActive(license, client, now),
    suspended: client?.status === "suspended",
    plan,
    now,
    ip: "0.0.0.0",
    ownerCountry: client?.country ?? null,
    // Read as the owner's preview: the pages whether or not the plan is active yet, the draft when asked.
    preview: { draft },
    secret: hmacSha256(signingSecret(), "hosted-api"),
    sender: null,
    push: false,
    assetUrl,
    platformUrl: appUrl(),
    connector: connectorFor(app, encryptionKey(), {
      store,
      assetUrl,
      platformUrl: appUrl(),
      cardPayments: hasFeature(plan, "card_payments"),
      storeBilling: storeBillingOn(app, plan),
      loyalty: hasFeature(plan, "loyalty"),
      delivery: hasFeature(plan, "delivery") || app.demo === true,
      food: foodRoutesOn(app, plan),
      marketplace: marketplaceOn(app, plan),
      rides: isTaxiApp(app) ? taxiOn(app, plan) : hasFeature(plan, "rides") || app.demo === true,
      travel: hasFeature(plan, "travel") || app.demo === true,
      downloads: hostedDownloadsOn(app, plan),
      signingSecret: signingSecret(),
    }),
  };
  return (path, lang) =>
    handleHosted(ctx, {
      method: "GET",
      path,
      query: new URLSearchParams({ platform: "android" }),
      body: undefined,
      token: null,
      headers: new Headers({ "accept-language": lang }),
    });
}

/** Checks the app: its draft (`draft: true`, on Publish) or what it publishes now. */
export async function checkApp(store: DataStore, app: App, options: { draft: boolean }, now: Date = new Date()): Promise<AppCheckReport> {
  const record = await loadLayout(store, app, now);
  const layout = options.draft || !record.published ? (options.draft ? await draftLayout(store, app, now) : record.draft) : record.published;
  return runAppCheck(
    {
      serve: await serveFor(store, app, options.draft || !record.published, now),
      pickable: () => pickableContent(app, { store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, now),
    },
    { app, layout },
    now,
  );
}

/**
 * Emails the owner what the app check found, in their dashboard's language:
 * each problem's sentence, where it is, and a Fix link to it in Studio. Sent
 * once per set of errors (lib/studio/app-check-alerts.ts).
 */
export const ownerCheckMail: OwnerCheckMail = async (app, problems) => {
  const store = await getStore();
  const client = await store.getClientById(app.clientId);
  const owner = client ? await store.getUserById(client.userId) : null;
  if (!owner) return;
  const lang = emailLangOf(owner);
  const t = getDashT(lang);
  const name = app.appName?.trim() || t("emails.yourAppName");
  const lines = problems.slice(0, 20).map((p) => {
    const where = p.page ? t("appCheck.emailWhere", { page: p.page, language: localeInfo(p.lang ?? "")?.nativeName ?? p.lang ?? "" }) : t("appCheck.onTabs");
    return `• ${t(`appCheck.${p.rule}` as DashKey, p.values)}\n  ${where}\n  ${t("appCheck.fix")}: ${appUrl()}${fixHref(p)}`;
  });
  const text = [t("appCheck.emailIntro", { app: name }), "", ...lines, "", t("appCheck.emailOutro")].join("\n");
  await sendMail({ to: owner.email, subject: t("appCheck.emailSubject", { app: name }).slice(0, 150), text });
};

/** The team's and the owner's alerts of the app check, as the platform sends them. */
export function appCheckAlertDeps(store: DataStore, now: Date): AppCheckAlertDeps {
  return { store, now, mail: teamMail, ownerMail: ownerCheckMail };
}

/**
 * 182 An automatic build (87.4, 138) is never stopped by the app check: what
 * it finds tells the team and, once per set of errors, the owner. Never throws.
 */
export async function checkBeforeAutomaticBuild(store: DataStore, app: App, now: Date): Promise<void> {
  try {
    if (!isStudioProject(app) || !appCheckable(app)) return;
    const report = await checkAppOrNull(store, app, { draft: false }, now);
    if (report) await tellAppCheck(appCheckAlertDeps(store, now), app, report, "app");
  } catch (error) {
    console.error("[app-check] automatic build", error instanceof Error ? error.message : String(error));
  }
}

/** How long Publish or a build waits for the check before going ahead without it. */
export const CHECK_TIMEOUT_MS = 25_000;

/**
 * The check, failing open: when the checker itself throws or takes longer
 * than CHECK_TIMEOUT_MS, Publish and the build go ahead (null) and the team
 * gets an alert with the error. A bug in the checker never stops an owner.
 */
export async function checkAppOrNull(
  store: DataStore,
  app: App,
  options: { draft: boolean },
  now: Date = new Date(),
  /** Tests: the check run, how long it may take, and the team's email. */
  run: { check?: typeof checkApp; timeoutMs?: number; mail?: TeamMail | null } = {},
): Promise<AppCheckReport | null> {
  const timeoutMs = run.timeoutMs ?? CHECK_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (run.check ?? checkApp)(store, app, options, now),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`The check took longer than ${Math.round(timeoutMs / 1000)} s.`)), timeoutMs);
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[app-check] app ${app.id}: ${message.slice(0, 300)}`);
    await raiseAlert(
      store,
      { kind: "app_check", key: `app_check_failed:${app.id}`, title: `${app.appName?.trim() || app.id}: the app check couldn't run, so it let the owner go ahead`, detail: `${options.draft ? "On Publish" : "Before a build"}: ${message}`, link: `/admin/app-check?app=${app.id}` },
      now,
      run.mail === undefined ? teamMail : run.mail,
    );
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
