"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkApi, type ApiCheckResult } from "@/lib/app/api-check";
import { apiCheckSignIn } from "@/lib/hosted/test-token";
import { appTypeName, connectorFits, ENGINES, hostedOnly, isAppType, kindById, defaultKind, ownContentTitle, type OwnContentKind } from "@/lib/app/kinds";
import { isSetupComplete, managedPublishing, newApp, queueBuild, STEP_LABEL, type SetupStep } from "@/lib/app/setup";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature } from "@/lib/plans";
import { recordStaffChange } from "@/lib/admin/audit";
import { appTypeOn, getSwitches, noWebsiteFor, websiteOf, websiteOn } from "@/lib/switches";
import { startPipeline } from "@/lib/builds/dispatch";
import { assetUrl, ICON_MAX_BYTES, LOGO_MAX_BYTES } from "@/lib/assets";
import { chooseApp, getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { getBlobStore } from "@/lib/blobs";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { AppPatch } from "@/lib/data/store";
import { DEFAULT_BOOKING_SETUP, DEFAULT_CATALOG_SETTINGS, DEFAULT_COURSE_SETUP, DEFAULT_HOSTED_SETTINGS, type App, type AssetKind, type ConnectorConfig } from "@/lib/data/types";
import { appUrl, encryptionKey, sessionSecret, superAdminEmails } from "@/lib/env";
import { shopifyAdminToken, shopifyConnectorConfig, shopifyToken } from "@/lib/hosted/connectors";
import { oauthRedirectUri, partnerAppCredentials, signOAuthState } from "@/lib/hosted/connectors/partner-apps";
import { PlatformCheckError, platformConnectorConfig, platformValues } from "@/lib/hosted/connectors/platforms";
import { platformDefinition } from "@/lib/hosted/connectors/registry";
import { ShopifyConnector, ShopifyPermissionError } from "@/lib/hosted/connectors/shopify";
import { emailOffWarning, emailOnlyUsersAtRisk, platformKeepsEmail } from "@/lib/hosted/sign-in-methods";
import { sendTemplate } from "@/lib/email/send";
import { choosePublishingMode } from "@/lib/publishing/service";
import { recordApiCheck, resolveApiCheckNotices } from "@/lib/app/api-check-notice";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { isSvg, readPngInfo } from "@/lib/png";
import {
  checkGoogleServiceInfoPlist,
  checkGoogleServicesJson,
  checkScreenshot,
  FIREBASE_MAX_BYTES,
  SCREENSHOT_LIMITS,
  SCREENSHOT_MAX_BYTES,
  type ScreenshotKind,
} from "@/lib/store-files";
import { bumpPatch } from "@/lib/semver";
import { designById, designFits } from "@/lib/pages/designs";
import { saveDesignDraft } from "@/lib/pages/layout";
import { appStoreKeySchema, brandingSchema, googlePlayKeySchema, listingSchema, startBuildSchema, websiteSchema } from "@/lib/validation";

/** Active client with an app, or a redirect. Expired plans can still edit their setup but not build. */
async function requireActiveClient(): Promise<ClientContext> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

async function requireApp(): Promise<ClientContext & { app: App }> {
  const context = await requireActiveClient();
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

const STEP_ORDER: SetupStep[] = ["website", "branding", "listing", "publishing"];

function stepUrl(step: SetupStep): string {
  return `/dashboard/setup?step=${step}`;
}

/**
 * After a step is saved: go to the next step, or queue the first build when
 * setup is complete. 13.1 With automatic rebuilds in the app's plan, a change
 * after the first build queues a new build (unless one is already running).
 */
async function afterStep(context: ClientContext & { app: App }, step: SetupStep): Promise<never> {
  const store = await getStore();
  const app = (await store.getAppById(context.app.id))!;
  await recordStaffChange(context, `Saved the ${STEP_LABEL[step]} step of the app`, context.app, app);
  const now = new Date();
  const plans = await effectivePlans(store);
  const plan = context.license ? currentPlanId(context.license, now) : null;
  revalidatePath("/dashboard", "layout");
  if (isSetupComplete(app, plan, plans)) {
    const builds = await store.listBuildsByApp(app.id, 1);
    const last = builds[0];
    if (last && plan && hasFeature(plans[plan], "auto_rebuild") && context.state === "active" && last.status !== "queued" && last.status !== "building") {
      const rebuilt = await queueBuild(store, { client: context.client, app, license: context.license, versionName: bumpPatch(last.versionName) }, now, assetUrl);
      if (rebuilt.ok) {
        await startPipeline();
        redirect("/dashboard/builds?started=auto");
      }
    }
    if (builds.length === 0) {
      const result = await queueBuild(
        store,
        { client: context.client, app, license: context.license, versionName: "1.0.0" },
        new Date(),
        assetUrl,
      );
      if (result.ok) {
        await startPipeline();
        redirect("/dashboard/builds?started=1");
      }
    }
    if (step === "publishing") redirect("/dashboard/builds");
  }
  const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
  redirect(next ? stepUrl(next) : "/dashboard/setup");
}

/** The app switcher: the dashboard works on another of the client's apps from now on. */
export async function switchAppAction(formData: FormData): Promise<void> {
  const context = await requireActiveClient();
  const appId = String(formData.get("appId") ?? "");
  if (appId === "new") redirect("/dashboard/app-type?new=1");
  // Only one of this client's own apps can be chosen.
  const app = context.apps.find((a) => a.id === appId);
  if (app) await chooseApp(app.id);
  revalidatePath("/dashboard", "layout");
  // Pages every app has stay open; the others (products, bookings…) belong to one kind of app.
  const from = String(formData.get("from") ?? "");
  const stays = ["/dashboard/setup", "/dashboard/pages", "/dashboard/builds", "/dashboard/publishing", "/dashboard/license", "/dashboard/announcements"];
  redirect(stays.includes(from) ? from : "/dashboard");
}

/**
 * The app type step. For an account's first app, or with `new=1` ("Add an
 * app"), it creates the app, which starts the setup steps and waits for
 * activation (by the team, or its plan paid by card) on its own plan.
 */
export async function chooseAppTypeAction(formData: FormData): Promise<void> {
  const context = await requireActiveClient();
  const adding = formData.get("new") === "1";
  const current = adding ? null : context.app;
  const back = adding ? "/dashboard/app-type?new=1" : "/dashboard/app-type";
  // 20 The picker sends a kind (an engine with a vertical); a bare engine id means its default kind.
  const rawType = formData.get("appType");
  const kind = kindById(formData.get("kind")) ?? (isAppType(rawType) ? defaultKind(rawType) : null);
  if (!kind) redirect(back);
  const appType = kind.engine;
  const vertical = kind.vertical;
  const store = await getStore();
  // 11.5 Switches: a switched-off type can't be chosen (an app keeps its own). A new app has no plan yet.
  if (appType !== current?.appType && !appTypeOn(await getSwitches(store), appType, current ? (context.license?.plan ?? null) : null)) {
    redirect(`${back}${adding ? "&" : "?"}unavailable=1`);
  }
  const now = new Date();
  if (!current) {
    if (context.apps.length >= MAX_APPS_PER_CLIENT) redirect(`${back}${adding ? "&" : "?"}limit=1`);
    // The account's first app starts with the website given at sign-up; the next ones ask for theirs.
    const app = newApp(context.client.id, context.apps.length ? null : context.client.siteUrl, now, appType, vertical);
    await store.createApp(app);
    await chooseApp(app.id);
    await recordStaffChange(
      { ...context, app },
      context.apps.length ? `Added an app: ${kind.name}` : `Set the app type to ${kind.name}`,
      { appType: null },
      { appType, vertical },
    );
    revalidatePath("/dashboard", "layout");
    redirect(stepUrl("website"));
  }
  if (current.appType !== appType) {
    await recordStaffChange(context, `Set the app type to ${kind.name}`, { appType: current.appType, vertical: current.vertical ?? null }, { appType, vertical });
    // The next build includes the new module. Content made for the old type (a shop, bookings) needs the Website step again.
    // Real estate apps only run with listings managed in Yallapp.
    const fits = connectorFits(appType, current.connector, (platform) => platformDefinition(platform)?.appType ?? null);
    await store.updateApp(
      current.id,
      fits ? { appType, vertical, appTypeDoneAt: now } : { appType, vertical, appTypeDoneAt: now, backend: "wordpress", connector: null, websiteDoneAt: null },
      now,
    );
    // 31 The plugin reads the type from its license status: ask the site to check now.
    refreshSitesSoon([current.id]);
  } else if ((current.vertical ?? null) !== vertical) {
    // 20 The same engine for another kind of business: only the wording and defaults change.
    await recordStaffChange(context, `Set the app type to ${kind.name}`, { vertical: current.vertical ?? null }, { vertical });
    await store.updateApp(current.id, { vertical, appTypeDoneAt: now }, now);
    refreshSitesSoon([current.id]);
  }
  redirect(stepUrl("website"));
}

/** 20 The connector and starting settings of content managed in the dashboard. */
function ownContentSetup(kind: OwnContentKind, app: App): AppPatch {
  switch (kind) {
    case "courses":
      return { connector: { kind }, courseSetup: app.courseSetup ?? DEFAULT_COURSE_SETUP, catalogSettings: app.catalogSettings ?? DEFAULT_CATALOG_SETTINGS };
    case "bookings":
      return { connector: { kind }, bookingSetup: app.bookingSetup ?? DEFAULT_BOOKING_SETUP };
    case "catalog":
    // 28 Paid tickets use the shop's card payment settings, like paid courses.
    case "events":
    // 29 A charity's donations are paid into its own account (iyzico, Kashier or Fawaterk), kept with the shop's payment settings.
    case "campaigns":
      return { connector: { kind }, catalogSettings: app.catalogSettings ?? DEFAULT_CATALOG_SETTINGS };
    case "listings":
    case "articles":
      return { connector: { kind } };
  }
}

export interface WebsiteFormState extends FormState {
  /** 19 The API check run when the owner saved their own API, when it failed. */
  apiCheck?: ApiCheckResult;
}

export async function saveWebsiteAction(_: WebsiteFormState, formData: FormData): Promise<WebsiteFormState> {
  const context = await requireApp();
  const values = formValues(formData);
  const parsed = websiteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const store = await getStore();
  const now = new Date();
  const data = parsed.data;
  // 11.5 Switches: a switched-off website or platform can't be chosen; the app's current one can still be saved.
  const website = data.backend === "catalog" ? noWebsiteFor(context.app.appType) : data.backend === "platform" ? data.platform : data.backend;
  // 19 An app whose WordPress site our team sets up can always move to that site.
  const kept = (context.app.websiteDoneAt && website === websiteOf(context.app)) || (website === "wordpress" && context.app.backend === "setup_requested");
  if (!kept && !websiteOn(await getSwitches(store), website, context.license?.plan ?? null)) {
    return { message: "This choice isn't available. Choose another one, or message us on WhatsApp.", values: { backend: data.backend } };
  }
  // 19 A failed check of the app's own API no longer applies once it uses something else.
  if (data.backend !== "custom_api") await resolveApiCheckNotices(store, context.app.id, now);
  const engine = ENGINES[context.app.appType];
  if (hostedOnly(context.app.appType) && data.backend !== "catalog") {
    // Real estate apps have no website: listings are managed in the dashboard and served by the hosted API.
    return { errors: { backend: `${engine.name} apps run on Yallapp. Choose ${ownContentTitle(context.app.appType)}.` }, values };
  }
  if (data.backend === "catalog") {
    // 20 The engine's own content, managed in the dashboard (lib/app/kinds.ts).
    await store.updateApp(context.app.id, { siteUrl: null, backend: "hosted", ...ownContentSetup(engine.ownContent.kind, context.app), websiteDoneAt: now }, now);
    revalidatePath("/dashboard", "layout");
    return afterStep(context, "website");
  }
  // 19 A connected platform signs in by phone only: customers who signed up by email couldn't sign in any more.
  // 23 A news feed keeps email sign-in: nobody is at risk.
  const keepsEmail = data.backend === "platform" && platformKeepsEmail(data.platform);
  if ((data.backend === "shopify" || data.backend === "platform") && !keepsEmail && formData.get("confirmEmailOff") !== "on") {
    const atRisk = await emailOnlyUsersAtRisk(store, context.app);
    if (atRisk > 0) {
      const secrets = data.backend === "platform" ? (platformDefinition(data.platform)?.fields.filter((f) => f.secret).map((f) => `p_${f.name}`) ?? []) : [];
      return {
        errors: { confirmEmailOff: emailOffWarning(atRisk) + " Tick the box to switch anyway." },
        values: formValues(formData, ["storefrontToken", "adminToken", ...secrets]),
      };
    }
  }
  if (data.backend === "shopify") {
    const result = await connectShopify(context.app, data);
    if ("errors" in result) return { errors: result.errors, values: formValues(formData, ["storefrontToken", "adminToken"]) };
    await store.updateApp(
      context.app.id,
      { siteUrl: data.siteUrl, backend: "hosted", connector: result.connector, websiteDoneAt: now },
      now,
    );
    return afterStep(context, "website");
  }
  if (data.backend === "platform") {
    const result = await connectPlatform(context.app, data.platform, formData);
    if ("errors" in result) return { errors: result.errors, values: result.values };
    await store.updateApp(context.app.id, { backend: "hosted", connector: result.connector, websiteDoneAt: now }, now);
    revalidatePath("/dashboard", "layout");
    return afterStep(context, "website");
  }
  const patch: AppPatch = { siteUrl: data.siteUrl, backend: data.backend, connector: null, websiteDoneAt: now };
  if (data.backend === "custom_api") patch.apiBaseUrl = data.apiBaseUrl.replace(/\/+$/, "");
  if (data.backend === "setup_requested") {
    patch.setupNote = data.setupNote || null;
    if (context.app.backend !== "setup_requested") {
      patch.setupRequestedAt = now;
      await notifySetupRequest(context, data.siteUrl, data.setupNote);
    }
  }
  await store.updateApp(context.app.id, patch, now);
  if (data.backend === "setup_requested") {
    revalidatePath("/dashboard", "layout");
    return { message: "Thanks! Our team will message you on WhatsApp to set up your WordPress site." };
  }
  if (data.backend === "custom_api" && patch.apiBaseUrl) {
    // 19 Saved either way; a failing check is shown here and stays on the overview and Builds until it passes.
    const limited = await hitRateLimit(store, RATE_LIMITS.apiCheck, context.client.id);
    if (limited.allowed) {
      // 34 When Yallapp signs people in, the API checks tokens instead of serving sign-in.
      const saved = (await store.getAppById(context.app.id)) ?? context.app;
      const yallappSignIn = await apiCheckSignIn(store, saved, { encryptionKey: encryptionKey(), platformUrl: appUrl(), now: new Date() });
      const result = await checkApi(patch.apiBaseUrl, context.app.appType, { yallappSignIn });
      await recordApiCheck(store, context.app, result, new Date(), appUrl());
      await keepApiSignIn(context.app, patch.apiBaseUrl, result, new Date());
      if (!result.ok) {
        await recordStaffChange(context, "Saved the Website step of the app (the API check failed)", context.app, (await store.getAppById(context.app.id)) ?? context.app);
        revalidatePath("/dashboard", "layout");
        return {
          ok: true,
          message: "Saved. Your API didn't pass every check below: your app can't load its content until it does. Fix them, then save again.",
          values: formValues(formData),
          apiCheck: result,
        };
      }
    }
  }
  return afterStep(context, "website");
}

/**
 * Checks the shop with its Storefront access token (or the one saved before
 * for the same shop) and returns the connector to save.
 */
async function connectShopify(
  app: App,
  data: { shopDomain: string; storefrontToken: string; adminToken: string; removeAdminToken?: "on" },
): Promise<{ connector: ConnectorConfig } | { errors: Record<string, string> }> {
  if (!ENGINES[app.appType].websites.includes("shopify")) return { errors: { backend: "Shopify works with Store apps. Choose Store as your app type first." } };
  const key = encryptionKey();
  const sameShop = app.connector?.kind === "shopify" && app.connector.shopDomain === data.shopDomain;
  const saved = sameShop ? shopifyToken(app, key) : null;
  const token = data.storefrontToken || saved;
  const adminToken = data.removeAdminToken ? null : data.adminToken || (sameShop ? shopifyAdminToken(app, key) : null);
  if (!token) return { errors: { storefrontToken: "Paste your Storefront API access token." } };
  try {
    await new ShopifyConnector({ shopDomain: data.shopDomain, storefrontToken: token }).check();
  } catch (e) {
    // 19 A token without the products permission is named as such.
    return {
      errors: {
        storefrontToken:
          e instanceof ShopifyPermissionError
            ? e.message
            : "Shopify didn't accept this shop address and token. Check both, and that the token is a Storefront API access token for this shop.",
      },
    };
  }
  if (adminToken) {
    try {
      await new ShopifyConnector({ shopDomain: data.shopDomain, storefrontToken: token, adminToken }).checkAdmin();
    } catch (e) {
      // 19 A token without read_orders or read_customers is named as such.
      return {
        errors: {
          adminToken:
            e instanceof ShopifyPermissionError
              ? e.message
              : "Shopify didn't accept this Admin API token. Check that it's an Admin API access token for this shop, with the read_orders and read_customers permissions.",
        },
      };
    }
  }
  return { connector: shopifyConnectorConfig(app.id, data.shopDomain, token, key, adminToken) };
}

/**
 * Checks the keys of a platform (fields p_<name>; an empty secret keeps the
 * saved one) by asking the platform, and returns the connector to save.
 */
async function connectPlatform(
  app: App,
  platformId: string,
  formData: FormData,
): Promise<{ connector: ConnectorConfig } | { errors: Record<string, string>; values: Record<string, string> }> {
  const definition = platformDefinition(platformId);
  const secrets = definition?.fields.filter((f) => f.secret).map((f) => `p_${f.name}`) ?? [];
  const values = formValues(formData, secrets);
  if (!definition || definition.appType !== app.appType) {
    return { errors: { platform: "This platform doesn't work with this app type. Choose another one, or change the app type." }, values };
  }
  const key = encryptionKey();
  const saved = app.connector?.kind === "platform" && app.connector.platform === definition.id ? (platformValues(app, key) ?? {}) : {};
  const typed: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of definition.fields) {
    const raw = formData.get(`p_${field.name}`);
    let value = typeof raw === "string" ? raw.trim() : "";
    if (value.length > 2000) errors[`p_${field.name}`] = "This is too long.";
    if (!value && field.secret) value = saved[field.name] ?? "";
    if (!value && !field.optional) errors[`p_${field.name}`] = `Enter your ${field.label.charAt(0).toLowerCase()}${field.label.slice(1)}.`;
    typed[field.name] = value;
  }
  if (Object.keys(errors).length > 0) return { errors, values };
  const normalized = definition.normalize(typed);
  if ("errors" in normalized) {
    return { errors: Object.fromEntries(Object.entries(normalized.errors).map(([name, message]) => [`p_${name}`, message])), values };
  }
  // Values the platform keeps besides its fields (OAuth tokens) stay while the account is the same.
  const sameAccount = definition.fields.filter((f) => !f.secret).every((f) => (saved[f.name] ?? "") === normalized.values[f.name]);
  const kept = sameAccount ? Object.fromEntries(Object.entries(saved).filter(([name]) => !definition.fields.some((f) => f.name === name))) : {};
  const all = { ...kept, ...normalized.values };
  let renewed: Record<string, string> = {};
  try {
    await definition
      .create(all, {
        appId: app.id,
        store: await getStore(),
        fetcher: fetch,
        saveSecrets: async (secrets) => {
          renewed = { ...renewed, ...secrets };
        },
      })
      .check();
  } catch (e) {
    // 22 A reason the client can fix is said as the platform's connector words it;
    // 23 a platform can also say what's wrong itself (a feed that can't be read, for example).
    const message =
      e instanceof PlatformCheckError
        ? e.message
        : (definition.explain?.(e) ?? `${definition.name} didn't accept these details. Check each one, and that the access has the permissions the hints list.`);
    return { errors: { platform: message }, values };
  }
  return { connector: platformConnectorConfig(app.id, definition, { ...all, ...renewed }, key) };
}

/**
 * 25 "Connect with Salla" / "Connect with Zid" on the Website step: the same
 * checks as saving the step (the platform is offered, customers who signed up
 * by email agreed to), then the owner goes to the platform's approval page
 * with the app's ID signed as `state`; src/app/oauth/<platform> saves the
 * connection when they come back.
 */
export async function connectPlatformAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const platformId = String(formData.get("platform") ?? "");
  const definition = platformDefinition(platformId);
  const values = { platform: platformId, confirmEmailOff: formData.get("confirmEmailOff") === "on" ? "on" : "" };
  if (!definition?.oauth || definition.appType !== context.app.appType) {
    return { errors: { platform: "This platform doesn't work with this app type. Choose another one, or change the app type." }, values };
  }
  const store = await getStore();
  const kept = context.app.websiteDoneAt && definition.id === websiteOf(context.app);
  if (!kept && !websiteOn(await getSwitches(store), definition.id, context.license?.plan ?? null)) {
    return { errors: { platform: "This choice isn't available. Choose another one, or message us on WhatsApp." }, values };
  }
  if (values.confirmEmailOff !== "on") {
    const atRisk = await emailOnlyUsersAtRisk(store, context.app);
    if (atRisk > 0) return { errors: { confirmEmailOff: emailOffWarning(atRisk) + " Tick the box to switch anyway." }, values };
  }
  const credentials = await partnerAppCredentials(store, definition.oauth.settingKey, encryptionKey());
  if (!credentials) return { errors: { platform: `Connecting a ${definition.name} store isn't available yet. Choose another platform, or message us on WhatsApp.` }, values };
  const state = signOAuthState({ platform: definition.id, appId: context.app.id }, sessionSecret(), new Date());
  await recordStaffChange(context, `Started connecting a ${definition.name} store`);
  redirect(definition.oauth.authorizeUrl(credentials.clientId, oauthRedirectUri(appUrl(), definition.id), state));
}

/** 25 Disconnects a store connected with OAuth (Salla, Zid): its tokens are deleted and the Website step is open again. */
export async function disconnectPlatformAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const connector = context.app.connector;
  const definition = connector?.kind === "platform" ? platformDefinition(connector.platform) : null;
  if (!definition?.oauth || String(formData.get("platform") ?? "") !== definition.id) return { message: "Nothing to disconnect." };
  const store = await getStore();
  const now = new Date();
  await store.updateApp(context.app.id, { connector: null, websiteDoneAt: null }, now);
  await recordStaffChange(context, `Disconnected the ${definition.name} store`);
  revalidatePath("/dashboard", "layout");
  return {
    ok: true,
    message: `Your ${definition.name} store is disconnected, so your app shows no products. Connect a store again, or choose another option below. To remove Yallapp's access in ${definition.name} too, remove the Yallapp app from your ${definition.name} dashboard.`,
    values: { platform: definition.id },
  };
}

/** Tells the team a client wants their WordPress site set up for them. */
async function notifySetupRequest(context: ClientContext, siteUrl: string | null, note: string): Promise<void> {
  const values = {
    client_name: context.user.name,
    website: siteUrl ?? "None yet",
    whatsapp: context.client.whatsapp,
    email: context.user.email,
    app_type: context.app ? appTypeName(context.app) : ENGINES.lms.name,
    note_line: note ? `Note: ${note}\n` : "",
  };
  await Promise.all(superAdminEmails().map((to) => sendTemplate("setup_request", to, values)));
}

export interface ApiCheckState {
  result: ApiCheckResult | null;
  error?: string;
}

/** 19 Kept for App sign-in, which shows how the API signs people in. */
async function keepApiSignIn(app: App, address: string, result: ApiCheckResult, now: Date): Promise<void> {
  if (!result.signIn) return;
  const apiSignIn = { checkedAt: now.toISOString(), baseUrl: address.replace(/\/+$/, ""), ...result.signIn };
  const current = (await (await getStore()).getAppById(app.id)) ?? app;
  await (await getStore()).updateApp(app.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(current.hostedSettings ?? {}), apiSignIn } }, now);
}

/** Runs the API check against the address in the Website form, without saving it. */
export async function checkApiAction(_: ApiCheckState, formData: FormData): Promise<ApiCheckState> {
  const context = await requireApp();
  const limited = await hitRateLimit(await getStore(), RATE_LIMITS.apiCheck, context.client.id);
  if (!limited.allowed) return { result: null, error: "Too many checks. Try again in a few minutes." };
  const address = String(formData.get("apiBaseUrl") ?? "").trim();
  if (!address) return { result: null, error: "Enter your API's address first." };
  // 34 When Yallapp signs people in, the API checks tokens instead of serving sign-in.
  const yallappSignIn = await apiCheckSignIn(await getStore(), context.app, { encryptionKey: encryptionKey(), platformUrl: appUrl(), now: new Date() });
  const result = await checkApi(address, context.app.appType, { yallappSignIn });
  await keepApiSignIn(context.app, address, result, new Date());
  // 19 A check of the saved address is the app's last check: it updates the notice on the overview and Builds.
  if (context.app.backend === "custom_api" && context.app.apiBaseUrl === address.replace(/\/+$/, "")) {
    await recordApiCheck(await getStore(), context.app, result, new Date(), appUrl());
    revalidatePath("/dashboard", "layout");
  }
  return { result };
}

export async function saveBrandingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const values = formValues(formData);
  const parsed = brandingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const store = await getStore();
  // Uploaded files must belong to this client.
  for (const [field, id, kind] of [
    ["iconAssetId", parsed.data.iconAssetId, "icon"],
    ["logoAssetId", parsed.data.logoAssetId, "logo"],
  ] as const) {
    if (!id) continue;
    const asset = await store.getAsset(id);
    if (!asset || asset.clientId !== context.client.id || asset.kind !== kind) {
      return { errors: { [field]: "Upload the file again." }, values };
    }
  }
  // 33 A ready-made design for the app's kind, or "" to keep the pages as they are.
  const designId = String(formData.get("design") ?? "");
  const design = designId ? designById(designId) : null;
  if (designId && (!design || !designFits(design, context.app))) return { errors: { design: "Choose one of the designs shown." }, values };
  const now = new Date();
  const patch: AppPatch = {
    appName: parsed.data.appName,
    shortName: parsed.data.shortName,
    primaryColor: parsed.data.primaryColor.toUpperCase(),
    splashColor: parsed.data.splashColor.toUpperCase(),
    template: parsed.data.template,
    font: parsed.data.font,
    iconAssetId: parsed.data.iconAssetId,
    logoAssetId: parsed.data.logoAssetId,
    brandingDoneAt: now,
  };
  await store.updateApp(context.app.id, patch, now);
  // A newly chosen design becomes the Pages & look draft, with this template and font; what's published stays.
  if (design && design.id !== context.app.design) {
    const saved = await saveDesignDraft(store, { ...context.app, ...patch }, design, now, { template: parsed.data.template, font: parsed.data.font });
    if (!saved.ok) return { errors: { design: "This design couldn't be applied to your app. Choose another one." }, values };
    revalidatePath("/dashboard/pages");
  }
  return afterStep(context, "branding");
}

export async function saveListingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const values = formValues(formData);
  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const store = await getStore();
  const screenshots = await readScreenshotIds(formData, context.client.id);
  if (!screenshots.ok) return { errors: screenshots.errors, values };
  const now = new Date();
  const patch: AppPatch = { ...parsed.data, ...screenshots.patch, listingDoneAt: now };
  // A Firebase file is made for one package name or bundle ID.
  if (parsed.data.androidPackage !== context.app.androidPackage) patch.firebaseAndroidAssetId = null;
  if (parsed.data.iosBundleId !== context.app.iosBundleId) patch.firebaseIosAssetId = null;
  await store.updateApp(context.app.id, patch, now);
  return afterStep(context, "listing");
}

const SCREENSHOT_ASSET: Record<ScreenshotKind, { kind: AssetKind; field: "playScreenshotIds" | "iosScreenshotIds"; store: string }> = {
  phone: { kind: "play_screenshot", field: "playScreenshotIds", store: "Google Play" },
  iphone: { kind: "ios_screenshot", field: "iosScreenshotIds", store: "the App Store" },
};

/** The screenshots kept in the form, in order. Each must be this client's upload of the right kind. */
async function readScreenshotIds(
  formData: FormData,
  clientId: string,
): Promise<{ ok: true; patch: Pick<AppPatch, "phoneScreenshotIds" | "iphoneScreenshotIds"> } | { ok: false; errors: Record<string, string> }> {
  const store = await getStore();
  const errors: Record<string, string> = {};
  const lists: Record<ScreenshotKind, string[]> = { phone: [], iphone: [] };
  for (const kind of ["phone", "iphone"] as const) {
    const { kind: assetKind, field, store: storeName } = SCREENSHOT_ASSET[kind];
    const ids = [...new Set(formData.getAll(field).map(String).filter(Boolean))];
    const { min, max } = SCREENSHOT_LIMITS[kind];
    if (ids.length > max) errors[field] = `${storeName} takes up to ${max} screenshots.`;
    else if (ids.length > 0 && ids.length < min) errors[field] = `${storeName} needs at least ${min} screenshots.`;
    for (const id of ids) {
      const asset = await store.getAsset(id);
      if (!asset || asset.clientId !== clientId || asset.kind !== assetKind) {
        errors[field] = "A screenshot couldn't be found. Upload it again.";
        break;
      }
    }
    lists[kind] = ids;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, patch: { phoneScreenshotIds: lists.phone, iphoneScreenshotIds: lists.iphone } };
}

async function saveAsset(clientId: string, kind: AssetKind, data: Buffer, contentType: string, extension: string): Promise<string> {
  const id = newId();
  const blobKey = `assets/${clientId}/${id}.${extension}`;
  await getBlobStore().put(blobKey, data, contentType);
  const store = await getStore();
  await store.createAsset({ id, clientId, kind, blobKey, contentType, size: data.length, createdAt: new Date() });
  return id;
}

/** Firebase config files for push notifications. Optional, on every plan. */
async function readFirebaseFiles(formData: FormData, app: App, clientId: string): Promise<{ patch: AppPatch; errors: Record<string, string> }> {
  const patch: AppPatch = {};
  const errors: Record<string, string> = {};
  const android = await fileText(formData.get("firebaseAndroidFile"), FIREBASE_MAX_BYTES);
  if (android !== null) {
    const error = android === "" ? "This file is too large for google-services.json." : checkGoogleServicesJson(android, app.androidPackage ?? "");
    if (error) errors.firebaseAndroidFile = error;
    else patch.firebaseAndroidAssetId = await saveAsset(clientId, "firebase_android", Buffer.from(android), "application/json", "json");
  }
  const ios = await fileText(formData.get("firebaseIosFile"), FIREBASE_MAX_BYTES);
  if (ios !== null) {
    const error = ios === "" ? "This file is too large for GoogleService-Info.plist." : checkGoogleServiceInfoPlist(ios, app.iosBundleId ?? "");
    if (error) errors.firebaseIosFile = error;
    else patch.firebaseIosAssetId = await saveAsset(clientId, "firebase_ios", Buffer.from(ios), "application/xml", "plist");
  }
  return { patch, errors };
}

async function fileText(value: FormDataEntryValue | null, maxBytes: number): Promise<string | null> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  if (value.size > maxBytes) return "";
  return (await value.text()).trim();
}

/**
 * Reads the App Store Connect key fields. Empty fields keep what was saved
 * before; nothing is returned when none were filled in.
 */
async function readAppStoreKey(
  formData: FormData,
  app: App,
  key: Buffer,
): Promise<{ patch: AppPatch; errors: Record<string, string>; values: Record<string, string> }> {
  const issuerId = String(formData.get("ascIssuerId") ?? "").trim();
  const keyId = String(formData.get("ascKeyId") ?? "").trim().toUpperCase();
  const p8 = await fileText(formData.get("ascPrivateKeyFile"), 10_000);
  const values = { ascIssuerId: issuerId, ascKeyId: keyId };
  const errors: Record<string, string> = {};
  const patch: AppPatch = {};
  if (!issuerId && !keyId && p8 === null) return { patch, errors, values };
  // Without a new file, the saved key stays and only the IDs are checked.
  const schema = p8 === null && app.ascPrivateKeyEncrypted ? appStoreKeySchema.omit({ privateKey: true }) : appStoreKeySchema;
  const parsed = schema.safeParse({
    issuerId: issuerId || app.ascIssuerId || "",
    keyId: keyId || app.ascKeyId || "",
    privateKey: p8 ?? "",
  });
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    if (fields.issuerId) errors.ascIssuerId = fields.issuerId;
    if (fields.keyId) errors.ascKeyId = fields.keyId;
    if (fields.privateKey) errors.ascPrivateKeyFile = p8 === null ? "Upload your .p8 key file." : fields.privateKey;
  } else {
    patch.ascIssuerId = parsed.data.issuerId.toLowerCase();
    patch.ascKeyId = parsed.data.keyId;
    if (p8 !== null) patch.ascPrivateKeyEncrypted = encrypt(p8, key, keyContext.appStore(app.id));
  }
  return { patch, errors, values };
}

/**
 * Pro: stores the Google Play service account JSON and the App Store Connect
 * key, encrypted, and needs at least one of them. Starter: the App Store
 * Connect key is optional and only signs the iOS app (they publish
 * themselves with the guides); the Google Play key is Pro only. Fields left
 * empty keep what was saved before.
 */
export async function savePublishingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const store = await getStore();
  const now = new Date();
  const app = context.app;
  const key = encryptionKey();
  const appStore = await readAppStoreKey(formData, app, key);
  const firebase = await readFirebaseFiles(formData, app, context.client.id);
  const errors: Record<string, string> = { ...appStore.errors, ...firebase.errors };
  const patch: AppPatch = { ...appStore.patch, ...firebase.patch };
  const values = appStore.values;

  // 13.1 Store keys for uploading are only asked when we publish for the client.
  const plans = await effectivePlans(store);
  if (!managedPublishing(context.license ? currentPlanId(context.license, now) : null, plans)) {
    if (Object.keys(errors).length > 0) return { errors, values };
    await store.updateApp(app.id, { ...patch, publishingDoneAt: now }, now);
    return afterStep(context, "publishing");
  }
  // 19 Who publishes: "managed" (our team, through invitations) or "self" (with the store keys).
  const mode = formData.get("publishingMode");
  const chosen = mode === "managed" || mode === "self" ? mode : null;

  const playJson = (await fileText(formData.get("googlePlayFile"), 20_000)) ?? null;
  if (playJson !== null) {
    const parsed = googlePlayKeySchema.safeParse(playJson);
    if (!parsed.success) errors.googlePlayFile = parsed.error.issues[0]?.message ?? "This file can't be used.";
    else {
      patch.googlePlayKeyEncrypted = encrypt(parsed.data.json, key, keyContext.googlePlay(app.id));
      patch.googlePlayClientEmail = parsed.data.clientEmail;
    }
  }

  if (Object.keys(errors).length > 0) return { errors, values: { ...values, ...(chosen ? { publishingMode: chosen } : {}) } };
  const hasPlay = Boolean(patch.googlePlayKeyEncrypted ?? app.googlePlayKeyEncrypted);
  const hasAppStore = Boolean((patch.ascPrivateKeyEncrypted ?? app.ascPrivateKeyEncrypted) && (patch.ascKeyId ?? app.ascKeyId));
  // When our team publishes the app for them (14.1), we work through their invitations: no key needed.
  if (!hasPlay && !hasAppStore && (chosen ?? app.publishingMode) !== "managed") {
    return { message: "Add your Google Play key, your App Store Connect key, or both. Or choose “Publish it for me”.", values: { ...values, publishingMode: "self" } };
  }
  await store.updateApp(app.id, { ...patch, publishingDoneAt: now }, now);
  // 19 "Publish it for me" or "I'll publish it myself", chosen here: the same as on the Publishing page.
  if (chosen && chosen !== app.publishingMode) {
    await choosePublishingMode(store, { ...context, app: (await store.getAppById(app.id)) ?? app }, chosen, now);
  }
  return afterStep(context, "publishing");
}

export async function removeStoreKeyAction(formData: FormData): Promise<void> {
  const context = await requireApp();
  const store = await getStore();
  const now = new Date();
  if (formData.get("store") === "google-play") {
    await store.updateApp(context.app.id, { googlePlayKeyEncrypted: null, googlePlayClientEmail: null }, now);
  } else if (formData.get("store") === "app-store") {
    await store.updateApp(context.app.id, { ascPrivateKeyEncrypted: null, ascIssuerId: null, ascKeyId: null }, now);
  } else if (formData.get("store") === "firebase-android") {
    await store.updateApp(context.app.id, { firebaseAndroidAssetId: null }, now);
  } else if (formData.get("store") === "firebase-ios") {
    await store.updateApp(context.app.id, { firebaseIosAssetId: null }, now);
  }
  await recordStaffChange(context, `Removed a saved key or file (${String(formData.get("store") ?? "")})`);
  revalidatePath("/dashboard", "layout");
  redirect(stepUrl("publishing"));
}

export interface UploadResult {
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

/**
 * Uploads an app icon (PNG, 1024 × 1024, no transparency), a logo (PNG or SVG)
 * or a store screenshot (PNG or JPEG, sizes the store accepts).
 */
export async function uploadAssetAction(formData: FormData): Promise<UploadResult> {
  const context = await requireActiveClient();
  const kind = formData.get("kind") as AssetKind | null;
  const file = formData.get("file");
  if (!kind || !["icon", "logo", "play_screenshot", "ios_screenshot"].includes(kind) || !file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (kind === "play_screenshot" || kind === "ios_screenshot") {
    if (file.size > SCREENSHOT_MAX_BYTES) return { ok: false, error: `The file is too large. The limit is ${SCREENSHOT_MAX_BYTES / 1024 / 1024} MB.` };
    const data = Buffer.from(await file.arrayBuffer());
    const checked = checkScreenshot(data, kind === "play_screenshot" ? "phone" : "iphone");
    if (!checked.ok) return { ok: false, error: checked.error };
    const id = await saveAsset(context.client.id, kind, data, checked.contentType, checked.contentType === "image/png" ? "png" : "jpg");
    return { ok: true, id, url: `/api/v1/assets/${id}` };
  }
  const max = kind === "icon" ? ICON_MAX_BYTES : LOGO_MAX_BYTES;
  if (file.size > max) return { ok: false, error: `The file is too large. The limit is ${max / 1024 / 1024} MB.` };
  const data = Buffer.from(await file.arrayBuffer());
  const png = readPngInfo(data);
  let contentType: string;
  if (kind === "icon") {
    if (!png) return { ok: false, error: "The icon must be a PNG file." };
    if (png.width !== 1024 || png.height !== 1024) return { ok: false, error: `The icon must be 1024 × 1024 pixels. This one is ${png.width} × ${png.height}.` };
    if (png.hasTransparency) return { ok: false, error: "The icon can't have transparency. Export it with a solid background." };
    contentType = "image/png";
  } else if (png) {
    contentType = "image/png";
  } else if (isSvg(data)) {
    contentType = "image/svg+xml";
  } else {
    return { ok: false, error: "The logo must be a PNG or SVG file." };
  }
  const id = await saveAsset(context.client.id, kind, data, contentType, contentType === "image/png" ? "png" : "svg");
  return { ok: true, id, url: `/api/v1/assets/${id}` };
}

/** Queues a build of the current app, or says in plain words why it can't. */
async function startBuild(
  context: ClientContext & { app: App },
  versionName: string,
): Promise<{ ok: true; number: number; versionName: string } | { ok: false; message: string; versionTooLow: boolean }> {
  const store = await getStore();
  const result = await queueBuild(store, { client: context.client, app: context.app, license: context.license, versionName }, new Date(), assetUrl);
  if (!result.ok) {
    const messages = {
      setup_incomplete: "Finish every step of the app setup first.",
      license_inactive:
        context.state === "pending"
          ? "This app isn't activated yet. Pay its plan on the License & plugin page, or message us on WhatsApp."
          : context.state === "suspended"
            ? "This account is suspended, so new builds can't start. Message us on WhatsApp."
            : "This app's plan has ended. Renew it on the License & plugin page, then start a new build.",
      build_running: "A build is already in progress. You can start a new one when it finishes.",
      version_too_low: "Use the same or a higher app version than your last build.",
      invalid_config: "Some app details aren't valid. Check the app setup and try again.",
    } as const;
    return { ok: false, message: messages[result.reason], versionTooLow: result.reason === "version_too_low" };
  }
  await startPipeline();
  await recordStaffChange(context, `Started build #${result.build.number} (${result.build.versionName})`);
  revalidatePath("/dashboard", "layout");
  return { ok: true, number: result.build.number, versionName: result.build.versionName };
}

export async function startBuildAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const values = formValues(formData);
  const parsed = startBuildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const result = await startBuild(context, parsed.data.versionName);
  if (!result.ok) return { message: result.message, errors: result.versionTooLow ? { versionName: result.message } : undefined, values };
  return { ok: true, message: `Build #${result.number} is queued.`, values: { versionName: bumpPatch(result.versionName) } };
}

/**
 * "Try again" on a build that didn't finish: the same app version again
 * (nothing of it was published), then back to the page, which says so.
 */
export async function retryBuildAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const parsed = startBuildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "This build can't be started again. Use Start new build." };
  const result = await startBuild(context, parsed.data.versionName);
  if (!result.ok) return { message: result.message };
  redirect(`/dashboard/builds?queued=${result.number}`);
}

/** Releases the license from its website so it can be activated on another one. */
export async function releaseSiteAction(): Promise<void> {
  const context = await requireActiveClient();
  if (context.license) {
    const store = await getStore();
    await store.deleteActivation(context.license.id);
    await recordStaffChange(context, "Released the license from its website");
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/license?released=1");
}
