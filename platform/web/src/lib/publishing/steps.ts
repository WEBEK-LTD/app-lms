import { hasFeature, type PlanInfo } from "../plans";
import type { App, MoreStore, PublishingEvent, PublishingListing, PublishingRequest, PublishingStatus, PublishingStore, PublishingTrack } from "../data/types";

/**
 * 14.1 We publish for you: the client's checklist, the store statuses and
 * the rules around them. Pure functions, unit tested. The client never gives
 * us a Google or Apple password: they invite our team email to their own
 * accounts, and can remove that access whenever they like.
 */

/** Whether an app on this plan (as it is now, lib/entitlements.ts) may ask us to publish it: "We publish for you" (13.1). */
export function canUseManagedPublishing(plan: PlanInfo | null): boolean {
  return hasFeature(plan, "auto_publish");
}

export interface PublishingLink {
  label: string;
  href: string;
}

export interface PublishingStep {
  id: PublishingStepId;
  title: string;
  /** Plain words; `{team_email}` is replaced with the publishing team email. */
  text: string;
  links: PublishingLink[];
  store: PublishingStore | "both";
}

export const PUBLISHING_STEP_IDS = [
  "play_account",
  "play_invite",
  "apple_account",
  "apple_invite",
  "firebase",
  // 35, 36 Only when the client wants the app on that store too.
  "galaxy_account",
  "galaxy_invite",
  "huawei_account",
  "huawei_invite",
] as const;
export type PublishingStepId = (typeof PUBLISHING_STEP_IDS)[number];

/** Official Google, Apple, Firebase, Samsung and Huawei pages only. */
export const PUBLISHING_STEPS: PublishingStep[] = [
  {
    id: "play_account",
    store: "android",
    title: "Create your Google Play developer account",
    text:
      "Sign up for Google Play Console with your own Google account, in your name or your company's. Google charges a one-time registration fee, which you pay to Google directly, and checks your identity; that can take a few days.",
    links: [
      { label: "Google Play Console sign-up", href: "https://play.google.com/console/signup" },
      { label: "Google's guide to getting started", href: "https://support.google.com/googleplay/android-developer/answer/6112435" },
    ],
  },
  {
    id: "play_invite",
    store: "android",
    title: "Invite our team to Google Play Console",
    text:
      "In Play Console, open Users and permissions, choose Invite new users and enter {team_email}. Give it Admin (all permissions), or at least the permissions to create and release apps and manage the store listing (a release manager).",
    links: [{ label: "Google's guide to inviting users", href: "https://support.google.com/googleplay/android-developer/answer/9844686" }],
  },
  {
    id: "apple_account",
    store: "ios",
    title: "Join the Apple Developer Program",
    text:
      "Enroll with your Apple Account, as an organisation (your company) or as an individual. Apple charges a yearly membership fee, which you pay to Apple directly. An organisation needs a D-U-N-S number, a free company ID from Dun & Bradstreet: getting one can take a couple of weeks, so start early. As an individual, your own name shows on the App Store.",
    links: [
      { label: "Apple Developer Program enrolment", href: "https://developer.apple.com/programs/enroll/" },
      { label: "Apple's page on D-U-N-S numbers", href: "https://developer.apple.com/support/D-U-N-S/" },
    ],
  },
  {
    id: "apple_invite",
    store: "ios",
    title: "Invite our team to App Store Connect",
    text:
      "In App Store Connect, open Users and Access, add {team_email} with the App Manager role, and tick Access to Certificates, Identifiers & Profiles so we can sign your app.",
    links: [
      { label: "App Store Connect", href: "https://appstoreconnect.apple.com/" },
      { label: "Apple's guide to adding users", href: "https://developer.apple.com/help/app-store-connect/manage-your-team/add-and-edit-users" },
    ],
  },
  {
    id: "firebase",
    store: "both",
    title: "Create a Firebase project and add our team",
    text:
      "Push notifications go through your own Firebase project. In the Firebase console, create a project for your app, then open Project settings › Users and permissions and add {team_email} as an Editor. We add your Android and iOS apps and Apple's push key to it.",
    links: [
      { label: "Firebase console", href: "https://console.firebase.google.com/" },
      { label: "Firebase's guide to project members", href: "https://firebase.google.com/docs/projects/iam/overview" },
    ],
  },
  {
    id: "galaxy_account",
    store: "galaxy",
    title: "Create your Samsung Galaxy Store seller account",
    text:
      "Sign up for Galaxy Store Seller Portal with your own Samsung account, in your name or your company's. Samsung charges no registration fee. A company applies for commercial seller status in Seller Portal, with its company documents.",
    links: [
      { label: "Galaxy Store Seller Portal", href: "https://seller.samsungapps.com/" },
      { label: "Samsung's guide to Seller Portal", href: "https://developer.samsung.com/galaxy-store/learn-about-seller-portal.html" },
    ],
  },
  {
    id: "galaxy_invite",
    store: "galaxy",
    title: "Invite our team to Seller Portal",
    text:
      "In Seller Portal, open your account's manager accounts and invite {team_email} as a manager for applications. Samsung emails us the invitation, and we accept it with our own Samsung account.",
    links: [{ label: "Galaxy Store Seller Portal", href: "https://seller.samsungapps.com/" }],
  },
  {
    id: "huawei_account",
    store: "huawei",
    title: "Create your Huawei developer account",
    text:
      "Register on HUAWEI Developers with your own HUAWEI ID and complete the identity verification, as a company or as an individual. Huawei charges no registration fee; verification can take a few days.",
    links: [
      { label: "HUAWEI Developers", href: "https://developer.huawei.com/consumer/en/" },
      { label: "AppGallery Connect", href: "https://developer.huawei.com/consumer/en/service/josp/agc/index.html" },
    ],
  },
  {
    id: "huawei_invite",
    store: "huawei",
    title: "Invite our team to AppGallery Connect",
    text:
      "In AppGallery Connect, open Users and permissions › Team account › Member and add {team_email} with the App administrator and Operations roles. Huawei emails us the invitation.",
    links: [{ label: "AppGallery Connect", href: "https://developer.huawei.com/consumer/en/service/josp/agc/index.html" }],
  },
];

/** 35, 36 The steps for the stores a request covers: Google Play, the App Store, push, and the extra stores the client asked for. */
export function stepsFor(request: Pick<PublishingRequest, MoreStore>): PublishingStep[] {
  return PUBLISHING_STEPS.filter((step) => step.store === "android" || step.store === "ios" || step.store === "both" || Boolean(request[step.store]));
}

/** The step's text with the team email in it. */
export function stepText(step: PublishingStep, teamEmail: string): string {
  return step.text.replaceAll("{team_email}", teamEmail);
}

export const PUBLISHING_STORES: PublishingStore[] = ["android", "ios"];
/** 35, 36 Stores the client may add to "Publish it for me". */
export const MORE_STORES: MoreStore[] = ["galaxy", "huawei"];
export const STORE_NAME: Record<PublishingStore, string> = { android: "Google Play", ios: "the App Store", galaxy: "Galaxy Store", huawei: "AppGallery" };
export const STORE_TITLE: Record<PublishingStore, string> = { android: "Google Play", ios: "App Store", galaxy: "Samsung Galaxy Store", huawei: "Huawei AppGallery" };
/** Material Symbols for each store's card. */
export const STORE_ICON: Record<PublishingStore, "android" | "phone_iphone" | "storefront"> = { android: "android", ios: "phone_iphone", galaxy: "storefront", huawei: "storefront" };

export function isMoreStore(value: unknown): value is MoreStore {
  return value === "galaxy" || value === "huawei";
}

/** 35, 36 The stores a request covers: Google Play, the App Store and the extra stores the client asked for. */
export function requestStores(request: Pick<PublishingRequest, MoreStore>): PublishingStore[] {
  return [...PUBLISHING_STORES, ...MORE_STORES.filter((which) => Boolean(request[which]))];
}

/** One store's track (a fresh one for an extra store the request doesn't cover). */
export function trackOf(request: Pick<PublishingRequest, PublishingStore>, which: PublishingStore): PublishingTrack {
  return request[which] ?? { ...EMPTY_TRACK };
}

/**
 * 35, 36 The client picks the extra stores: a newly wanted store starts
 * waiting for them, a store they no longer want is dropped (its history stays).
 */
export function withMoreStores<T extends Pick<PublishingRequest, MoreStore>>(request: T, wanted: Iterable<string>): T {
  const set = new Set(wanted);
  const next = { ...request };
  for (const which of MORE_STORES) next[which] = set.has(which) ? (request[which] ?? { ...EMPTY_TRACK }) : null;
  return next;
}

export const PUBLISHING_STATUSES: PublishingStatus[] = ["waiting_client", "accounts_ready", "submitted", "in_review", "live", "rejected"];

/** As the admin shows them. */
export const PUBLISHING_STATUS_LABEL: Record<PublishingStatus, string> = {
  waiting_client: "Waiting for the client",
  accounts_ready: "Accounts ready",
  submitted: "Submitted",
  in_review: "In review",
  live: "Live",
  rejected: "Rejected",
};

/** As the client reads them. */
export const CLIENT_STATUS_LABEL: Record<PublishingStatus, string> = { ...PUBLISHING_STATUS_LABEL, waiting_client: "Waiting for you" };

export function isPublishingStatus(value: unknown): value is PublishingStatus {
  return typeof value === "string" && (PUBLISHING_STATUSES as string[]).includes(value);
}

/** Live on every store it covers: the request is no longer open for the team. */
export function isLiveEverywhere(request: Pick<PublishingRequest, PublishingStore>): boolean {
  return requestStores(request).every((which) => trackOf(request, which).status === "live");
}

/** Live on at least one store. */
export function isLiveSomewhere(request: Pick<PublishingRequest, PublishingStore>): boolean {
  return requestStores(request).some((which) => trackOf(request, which).status === "live");
}

/** 19 The requests the team still works on ("Publish it for me", not live everywhere): the admin's Publishing badge. */
export function openPublishingCount(requests: PublishingRequest[]): number {
  return requests.filter((r) => r.mode === "managed" && !isLiveEverywhere(r)).length;
}

/**
 * One line of the publishing history, for the team (admin) or the client:
 * a store's new status, or (19) the client choosing who publishes the app.
 */
export function publishingEventLabel(event: Pick<PublishingEvent, "store" | "status">, reader: "team" | "client"): string {
  if (event.store === "mode") {
    if (event.status === "managed") return reader === "team" ? "Asked us to publish the app" : "You asked us to publish your app";
    return reader === "team" ? "Will publish the app themselves" : "You chose to publish your app yourself";
  }
  const status = event.status as PublishingStatus;
  return `${STORE_TITLE[event.store]}: ${(reader === "team" ? PUBLISHING_STATUS_LABEL : CLIENT_STATUS_LABEL)[status] ?? status}`;
}

/** What a status means for the client, in plain words. */
export function statusText(store: PublishingStore, status: PublishingStatus): string {
  const reviewer = { android: "Google", ios: "Apple", galaxy: "Samsung", huawei: "Huawei" }[store];
  switch (status) {
    case "waiting_client":
      return `We start on ${STORE_NAME[store]} once you've ticked its steps below and we've accepted your invitation.`;
    case "accounts_ready":
      return `We have access to your ${STORE_TITLE[store]} account and are preparing your app and its listing.`;
    case "submitted":
      return `We sent your app to ${STORE_NAME[store]}. ${reviewer} reviews it next.`;
    case "in_review":
      return `${reviewer} is reviewing your app. This usually takes a few days.`;
    case "live":
      return `Your app is live on ${STORE_NAME[store]}.`;
    case "rejected":
      return `${reviewer} asked for changes before your app can go live. We fix what we can and tell you if we need anything from you.`;
  }
}

export function statusTone(status: PublishingStatus): "success" | "warn" | "danger" | "neutral" | "info" {
  return status === "live" ? "success" : status === "rejected" ? "danger" : status === "waiting_client" ? "warn" : "info";
}

/** Google Play's app categories. */
export const PLAY_CATEGORIES = [
  "Art & Design",
  "Auto & Vehicles",
  "Beauty",
  "Books & Reference",
  "Business",
  "Comics",
  "Communication",
  "Dating",
  "Education",
  "Entertainment",
  "Events",
  "Finance",
  "Food & Drink",
  "Health & Fitness",
  "House & Home",
  "Lifestyle",
  "Maps & Navigation",
  "Medical",
  "Music & Audio",
  "News & Magazines",
  "Parenting",
  "Personalization",
  "Photography",
  "Productivity",
  "Shopping",
  "Social",
  "Sports",
  "Tools",
  "Travel & Local",
  "Video Players & Editors",
  "Weather",
] as const;

/** The App Store's categories (without games). */
export const APP_STORE_CATEGORIES = [
  "Books",
  "Business",
  "Education",
  "Entertainment",
  "Finance",
  "Food & Drink",
  "Graphics & Design",
  "Health & Fitness",
  "Lifestyle",
  "Medical",
  "Music",
  "Navigation",
  "News",
  "Photo & Video",
  "Productivity",
  "Reference",
  "Shopping",
  "Social Networking",
  "Sports",
  "Travel",
  "Utilities",
  "Weather",
] as const;

const EMPTY_TRACK: PublishingTrack = { status: "waiting_client", note: null, storeUrl: null, updatedAt: null };

export const EMPTY_LISTING: PublishingListing = { playCategory: null, appStoreCategory: null, contentRatingNotes: null, reviewNotes: null };

/** A new request for the app, with nothing ticked yet. */
export function newPublishingRequest(app: Pick<App, "id" | "clientId">, mode: PublishingRequest["mode"], now: Date): PublishingRequest {
  return {
    appId: app.id,
    clientId: app.clientId,
    mode,
    firebaseBy: "client",
    checklist: {},
    listing: { ...EMPTY_LISTING },
    android: { ...EMPTY_TRACK },
    ios: { ...EMPTY_TRACK },
    galaxy: null,
    huawei: null,
    teamNotes: null,
    requestedAt: mode === "managed" ? now : null,
    readyAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Whether a step is done: ticked by the client, or the Firebase project our team creates. */
export function stepDone(request: Pick<PublishingRequest, "checklist" | "firebaseBy">, id: PublishingStepId): boolean {
  if (id === "firebase" && request.firebaseBy === "team") return true;
  return Boolean(request.checklist[id]);
}

/** The store listing details still missing, in the words the page uses. Screenshots are optional: we take them when there are none. */
export function listingMissing(
  app: Pick<App, "storeTitle" | "shortDescription" | "fullDescription" | "supportEmail" | "privacyUrl">,
  listing: PublishingListing,
): string[] {
  const missing: string[] = [];
  if (!app.storeTitle) missing.push("App name on the stores");
  if (!app.shortDescription) missing.push("Short description");
  if (!app.fullDescription) missing.push("Full description");
  if (!app.supportEmail) missing.push("Support email");
  if (!app.privacyUrl) missing.push("Privacy policy URL");
  if (!listing.playCategory) missing.push("Google Play category");
  if (!listing.appStoreCategory) missing.push("App Store category");
  if (!listing.contentRatingNotes?.trim()) missing.push("Content rating notes");
  return missing;
}

/** How far the client is: steps done (with the listing as one more step). */
export function checklistProgress(request: PublishingRequest, app: Parameters<typeof listingMissing>[0]): { done: number; total: number; complete: boolean } {
  // 35, 36 Only the steps of the stores this request covers.
  const ids = stepsFor(request).map((step) => step.id);
  const steps = ids.filter((id) => stepDone(request, id)).length;
  const listing = listingMissing(app, request.listing).length === 0 ? 1 : 0;
  const total = ids.length + 1;
  return { done: steps + listing, total, complete: steps + listing === total };
}

/**
 * The client's ticks: each ticked step keeps the time it was first ticked;
 * unticking removes it. Unknown names are ignored.
 */
export function applyChecklist(previous: PublishingRequest["checklist"], ticked: Iterable<string>, now: Date): PublishingRequest["checklist"] {
  const set = new Set(ticked);
  const next: PublishingRequest["checklist"] = {};
  for (const id of PUBLISHING_STEP_IDS) if (set.has(id)) next[id] = previous[id] ?? now.toISOString();
  return next;
}

/** Store links the team may save once an app is live: the store's own pages only. */
export function storeUrlProblem(store: PublishingStore, value: string): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Paste the full link to the app's store page.";
  }
  if (url.protocol !== "https:") return "Paste the full link to the app's store page.";
  if (store === "android" && url.hostname !== "play.google.com") return "A Google Play link starts with https://play.google.com/.";
  if (store === "ios" && url.hostname !== "apps.apple.com") return "An App Store link starts with https://apps.apple.com/.";
  if (store === "galaxy" && url.hostname !== "galaxystore.samsung.com") return "A Galaxy Store link starts with https://galaxystore.samsung.com/.";
  if (store === "huawei" && url.hostname !== "appgallery.huawei.com") return "An AppGallery link starts with https://appgallery.huawei.com/.";
  return null;
}

/** A status change by the team: what's wrong with it, or null. */
export function trackChangeProblems(store: PublishingStore, input: { status: string; note: string; storeUrl: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isPublishingStatus(input.status)) errors.status = "Choose a status.";
  if (input.status === "rejected" && !input.note.trim()) errors.note = "Say why it was rejected and what happens next: the client reads this.";
  if (input.note.length > 2000) errors.note = "Keep the note under 2,000 characters.";
  const urlProblem = storeUrlProblem(store, input.storeUrl);
  if (urlProblem) errors.storeUrl = urlProblem;
  if (input.status === "live" && !input.storeUrl) errors.storeUrl = "Add the link to the app's store page.";
  return errors;
}
