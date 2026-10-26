import "server-only";
import { cache } from "react";
import { currentPlanId } from "../billing/plan-change";
import { stabilityOf } from "../crashes/service";
import { getStore } from "../data";
import type { App } from "../data/types";
import { effectivePlans } from "../entitlements";
import { appUrl } from "../env";
import { INTEGRATION_ERROR_DAYS, integrationsOf } from "../integrations";
import { hasFeature } from "../plans";
import { readiness } from "../publishing/readiness";
import { problemsOf, type Problem } from "./problems";
import { usesPlugin } from "./label";

/** 93.3 The app's problems now, read once per page (the menu's count and the overview's list). */
export const appProblems = cache(async (app: App): Promise<Problem[]> => {
  const store = await getStore();
  const now = new Date();
  const license = await store.getLicenseForApp(app.clientId, app.id);
  const [activation, errors, builds, request, plans] = await Promise.all([
    license && usesPlugin(app) ? store.getActivation(license.id) : null,
    store.listAppErrors({ appId: app.id, since: new Date(now.getTime() - INTEGRATION_ERROR_DAYS * 86_400_000), limit: 100 }),
    store.listBuildsByApp(app.id, 10),
    app.publishingMode ? store.getPublishingRequest(app.id) : null,
    effectivePlans(store),
  ]);
  const plan = license ? currentPlanId(license, now) : null;
  const current = plan ? plans[plan] : null;
  const ready = builds.some((b) => b.status === "ready");
  return problemsOf({
    integrations: integrationsOf({ app, activation, errors }),
    latest: builds[0] ?? null,
    request,
    ready: app.publishingMode
      ? readiness({ app, listing: app.publishingMode === "managed" ? (request?.listing ?? null) : null, ios: hasFeature(current, "ios"), managed: app.publishingMode === "managed", platformUrl: appUrl() })
      : null,
    stability: ready ? await stabilityOf(store, app.id, now) : null,
    now,
  });
});
