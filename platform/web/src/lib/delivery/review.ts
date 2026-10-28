import type { DataStore } from "../data/store";
import type { App, Courier, DeliverySettings, HostedUser, Shipment } from "../data/types";
import { courierAppNameOf } from "./courier-app";
import { stage } from "./service";

/**
 * 104.7 The store reviewers try both sides of a delivery app with the app's
 * fixed review number (or email) and code from App sign-in: as a customer
 * they send parcels; as a courier ("App Review", made the first time they
 * open the courier screens) they get jobs. The review account's parcels go
 * to the review courier only, and the company's couriers never see them.
 * In the courier app, a reviewer who has no job gets a sample one, so the
 * app can be reviewed without the customers' app.
 */

export const REVIEW_COURIER_NAME = "App Review";

type ReviewApp = Pick<App, "hostedSettings">;

/** The review number or email, when App sign-in has a review code. */
function reviewWho(app: ReviewApp): { phone: string | null; email: string | null } | null {
  const settings = app.hostedSettings;
  if (!settings?.reviewCode || (!settings.reviewPhone && !settings.reviewEmail)) return null;
  return { phone: settings.reviewPhone ?? null, email: settings.reviewEmail?.toLowerCase() ?? null };
}

/** Whether the signed-in person is the store review account. */
export function isReviewUser(app: ReviewApp, user: Pick<HostedUser, "phone" | "email"> | null): boolean {
  const who = reviewWho(app);
  if (!who || !user) return false;
  return user.phone ? user.phone === who.phone : Boolean(user.email && user.email.toLowerCase() === who.email);
}

/** Whether the courier is the reviewers' (their number or email is the review account's). */
export function isReviewCourier(app: ReviewApp, courier: Pick<Courier, "phone" | "email">): boolean {
  const who = reviewWho(app);
  if (!who) return false;
  return courier.phone ? courier.phone === who.phone : Boolean(courier.email && courier.email.toLowerCase() === who.email);
}

/** The review account's customer ID, once the reviewers signed in; null before. */
export async function reviewUserId(store: DataStore, app: Pick<App, "id" | "hostedSettings">): Promise<number | null> {
  const who = reviewWho(app);
  if (!who) return null;
  const user = who.phone ? await store.getHostedUserByPhone(app.id, who.phone) : null;
  if (user) return user.id;
  const byEmail = who.email ? await store.getHostedEmailUser(app.id, who.email) : null;
  return byEmail?.id ?? null;
}

/** Whether a courier may have this shipment: the review courier the review account's only, the others never those. */
export function courierMayHave(app: ReviewApp, courier: Pick<Courier, "phone" | "email">, shipment: Pick<Shipment, "userId">, reviewId: number | null): boolean {
  const review = shipment.userId !== null && shipment.userId === reviewId;
  return isReviewCourier(app, courier) ? review : !review;
}

/** The review courier, made the first time the reviewers open the courier screens. */
export async function reviewCourierFor(store: DataStore, app: App, user: HostedUser, now: Date): Promise<Courier | null> {
  if (!isReviewUser(app, user)) return null;
  const who = user.phone ? { phone: user.phone, email: null } : { phone: null, email: user.email?.toLowerCase() ?? null };
  const found = await store.findCourier(app.id, who);
  if (found) return found;
  const made = await store.createCourier({ appId: app.id, name: REVIEW_COURIER_NAME, phone: who.phone, email: who.email, vehicle: null, active: true }, now);
  return made.ok ? made.courier : store.findCourier(app.id, who);
}

/** A sample job for the review courier: given to them, from the review account, already paid. */
export async function createSampleJob(store: DataStore, app: App, settings: DeliverySettings, courier: Courier, user: HostedUser, now: Date): Promise<Shipment> {
  return store.createShipment({
    appId: app.id,
    userId: user.id,
    senderName: "App Review (sample)",
    senderPhone: user.phone,
    serviceId: null,
    serviceName: null,
    pickup: { address: "Sample pickup, 1 Example Street", details: "Sample job for the store review", lat: null, lng: null },
    dropoff: { address: "Sample drop-off, 2 Example Street", details: null, lat: null, lng: null },
    zoneId: null,
    zoneName: null,
    distanceKm: null,
    packageSize: "small",
    packageDescription: "Documents",
    recipientName: "Sample recipient",
    recipientPhone: user.phone ?? courier.phone ?? "+10000000000",
    notes: null,
    priceCents: 0,
    currency: settings.currency,
    paymentMethod: "card",
    paymentStatus: "paid",
    orderId: null,
    status: "assigned",
    courierId: courier.id,
    courierName: courier.name,
    timeline: [stage("pending", now, "customer"), stage("assigned", now, "company")],
    lang: null,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * The notes for the stores' reviewers (Google Play › App access, App Store ›
 * App Review Information), in English as the reviewers read them: the
 * customers' app, and the courier app when the company has one. 105.1.6 In
 * a food delivery app the same account also works for the company's first
 * restaurant, on its own orders only.
 */
export function reviewNotes(
  app: Pick<App, "appName" | "hostedSettings" | "appType">,
  settings: Pick<DeliverySettings, "courierApp" | "courierAppName" | "assignment">,
): { customer: string; courier: string | null } | null {
  const who = reviewWho(app);
  if (!who) return null;
  const login = who.phone ? `the phone number ${who.phone}` : `the email ${who.email}`;
  const code = app.hostedSettings!.reviewCode!;
  const company = (app.appName ?? "").trim() || "the company";
  const signIn = `Sign in with ${login} and the code ${code} (no message is sent to it).`;
  const food = app.appType === "food";
  const what = food ? "order" : "parcel";
  const courierSteps = `Turn on duty, open the job, then move it on: Picked up, On the way, Delivered (the position is shared only while ${food ? "an order" : "a parcel"} is on the way, and only while the screen is open).`;
  const customer = [
    food ? `${company} delivers food from many restaurants. ${signIn}` : `${company} delivers parcels. ${signIn}`,
    food
      ? "Open a restaurant, add a dish to the cart, check out with an address (type it or set it on the map) and pay in cash. My orders shows its stages."
      : "Tap Send, choose a pickup and a drop-off (type an address or set it on the map), add the recipient and the parcel, pay in cash and send. My shipments shows its stages.",
    food
      ? "The same account is also staff of the first restaurant in the list: the Restaurant tab shows this account's orders only. Accept one with the time it needs, then mark it Ready. Setting the restaurant busy is shown but not kept, and real customers' orders never reach this account."
      : null,
    settings.courierApp === "same"
      ? `The same account is also a test courier: Account › Courier mode shows the courier's screens with the ${what}s this account ${food ? "ordered" : "sent"}. ${courierSteps}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  const courier =
    settings.courierApp === "bundle"
      ? [
          `${courierAppNameOf(app, settings)} is for ${company}'s couriers only; customers use the ${company} app. ${signIn}`,
          `This account is a test courier. A sample job is waiting in My jobs (another appears once it is done). ${courierSteps}`,
        ].join("\n\n")
      : null;
  return { customer, courier };
}
