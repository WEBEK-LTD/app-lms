import type { DataStore } from "../data/store";
import type { App, Courier, CourierAccount, HostedUser } from "../data/types";
import { withDemoChecked } from "../demo/apps";
import { isReviewCourier, REVIEW_COURIER_NAME, reviewCourierFor, reviewUserId } from "../delivery/review";
import { COURIER_ACTIVE } from "../delivery/service";
import { deliverySettingsOf } from "../delivery/settings";
import { effectivePlans, planOfLicense } from "../entitlements";
import { appIsActive } from "../license/status";
import type { PlanInfo } from "../plans";
import { deliveryOnPlan, onYallappCourier } from "./access";
import { courierHubSetting, hubReviewCompany, isHubReview } from "./review";

/**
 * 104.8.2 The companies a Yallapp Courier account works for: the delivery
 * projects on Yallapp Courier (Delivery settings › where couriers work), on
 * an active plan with `delivery`, where a courier (active or paused) has the
 * account's number or email. Every other company is never listed, and its
 * session is never opened. The stores' reviewers have Studio's demo
 * delivery company only.
 */

export interface HubCompany {
  app: App;
  courier: Courier;
  plan: PlanInfo | null;
  /** The person's account at the company, for the reviewers (made with their courier); otherwise found or made when the session opens. */
  user: HostedUser | null;
}

const who = (account: Pick<CourierAccount, "phone" | "email">) => ({ phone: account.phone, email: account.phone ? null : account.email });

/** The account's companies, in the order the companies added them. */
export async function hubCompaniesOf(store: DataStore, account: Pick<CourierAccount, "phone" | "email">, now: Date): Promise<HubCompany[]> {
  if (isHubReview(await courierHubSetting(store), who(account))) {
    const review = await reviewCompany(store, now);
    return review ? [review] : [];
  }
  const couriers = (await store.listCouriersByContact(who(account))).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id);
  const plans = await effectivePlans(store);
  const companies: HubCompany[] = [];
  for (const courier of couriers) {
    if (companies.some((c) => c.app.id === courier.appId)) continue;
    const found = await store.getAppById(courier.appId);
    if (!found || found.appType !== "delivery") continue;
    if (!onYallappCourier(found, deliverySettingsOf(await store.getDeliverySettings(found.id)))) continue;
    const [client, license] = await Promise.all([store.getClientById(found.clientId), store.getLicenseForApp(found.clientId, found.id)]);
    if (!appIsActive(license, client, now)) continue;
    const app = await withDemoChecked(store, found);
    const plan = planOfLicense(plans, license, now);
    if (!deliveryOnPlan(app, plan)) continue;
    companies.push({ app, courier, plan, user: null });
  }
  return companies;
}

/** The reviewers' company: its own store review account, a courier there with a sample job (104.7). */
async function reviewCompany(store: DataStore, now: Date): Promise<HubCompany | null> {
  const app = await hubReviewCompany(store);
  const settings = app?.hostedSettings;
  if (!app || !settings) return null;
  const contact = settings.reviewPhone ? { phone: settings.reviewPhone, email: null } : { phone: null, email: settings.reviewEmail?.toLowerCase() ?? null };
  const user = await companyUser(store, app, contact, REVIEW_COURIER_NAME, now);
  const courier = user ? await reviewCourierFor(store, app, user, now) : null;
  return user && courier ? { app, courier, plan: null, user } : null;
}

/** The person's account at the company with this number or email, made when they have none (named as the company's courier). */
export async function companyUser(store: DataStore, app: Pick<App, "id">, contact: { phone: string | null; email: string | null }, name: string, now: Date): Promise<HostedUser | null> {
  const find = () => (contact.phone ? store.getHostedUserByPhone(app.id, contact.phone) : contact.email ? store.getHostedEmailUser(app.id, contact.email) : Promise.resolve(null));
  const found = await find();
  if (found) return found;
  const made = await store.createHostedUser({ appId: app.id, phone: contact.phone, name, email: contact.phone ? null : contact.email, city: null, now });
  // Made a moment before by another request: that one.
  return made ?? find();
}

/** The jobs waiting for the courier: those given to them still to do and, when couriers take jobs and they are on duty, the ones waiting for a courier. */
export async function jobsWaiting(store: DataStore, app: App, courier: Courier): Promise<number> {
  if (!courier.active) return 0;
  const mine = await store.listShipments({ appId: app.id, courierId: courier.id, statuses: COURIER_ACTIVE, order: "oldest", offset: 0, limit: 1 });
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  if (settings.assignment !== "open" || !courier.onDuty) return mine.total;
  // 104.7 The review account's parcels are the review courier's only.
  const reviewId = await reviewUserId(store, app);
  const whose = isReviewCourier(app, courier) ? (reviewId === null ? null : { userId: reviewId }) : reviewId === null ? {} : { notUserId: reviewId };
  if (!whose) return mine.total;
  const open = await store.listShipments({ appId: app.id, ...whose, statuses: ["pending"], unassigned: true, order: "oldest", offset: 0, limit: 1 });
  return mine.total + open.total;
}

/** `Company` in docs/api/courier.yaml. */
export async function companyJson(store: DataStore, company: HubCompany, urls: { platformUrl: string; assetUrl: (assetId: string) => string }) {
  const { app, courier } = company;
  const logo = app.logoAssetId ?? app.iconAssetId;
  return {
    app_id: app.id,
    name: app.appName?.trim() || "",
    logo_url: logo ? urls.assetUrl(logo) : null,
    primary_color: app.primaryColor,
    api_base_url: `${urls.platformUrl}/api/app/${app.id}`,
    on_duty: courier.active && courier.onDuty,
    jobs_waiting: await jobsWaiting(store, app, courier),
    paused: !courier.active,
  };
}
