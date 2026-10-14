import type { App, AppType, License, PublishingListing, PublishingRequest, PublishingStatus, PublishingStore, PublishingTrack } from "../data/types";

/**
 * 14.1 We publish for you: the client's checklist, the store statuses and
 * the rules around them. Pure functions, unit tested. The client never gives
 * us a Google or Apple password: they invite our team email to their own
 * accounts, and can remove that access whenever they like.
 */

/**
 * Whether this app may ask us to publish it.
 * TODO(plans): use the plan feature flag "managed publishing" (`managed_publishing`)
 * once the plans and limits work (roadmap Phase 13) adds it; until then every app may.
 */
export function canUseManagedPublishing(app: Pick<App, "id">, license: Pick<License, "plan"> | null): boolean {
  void app;
  void license;
  return true;
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

export const PUBLISHING_STEP_IDS = ["play_account", "play_invite", "apple_account", "apple_invite", "firebase"] as const;
export type PublishingStepId = (typeof PUBLISHING_STEP_IDS)[number];

/** Official Google, Apple and Firebase pages only. */
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
];

/** The step's text with the team email in it. */
export function stepText(step: PublishingStep, teamEmail: string): string {
  return step.text.replaceAll("{team_email}", teamEmail);
}

export const PUBLISHING_STORES: PublishingStore[] = ["android", "ios"];
export const STORE_NAME: Record<PublishingStore, string> = { android: "Google Play", ios: "the App Store" };
export const STORE_TITLE: Record<PublishingStore, string> = { android: "Google Play", ios: "App Store" };

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

/** What a status means for the client, in plain words. */
export function statusText(store: PublishingStore, status: PublishingStatus): string {
  const reviewer = store === "android" ? "Google" : "Apple";
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

/** A sensible first choice per app type; the client can change it. */
export const SUGGESTED_CATEGORIES: Record<AppType, { play: string; appStore: string }> = {
  lms: { play: "Education", appStore: "Education" },
  store: { play: "Shopping", appStore: "Shopping" },
  booking: { play: "Lifestyle", appStore: "Lifestyle" },
  real_estate: { play: "House & Home", appStore: "Lifestyle" },
};

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
  const steps = PUBLISHING_STEP_IDS.filter((id) => stepDone(request, id)).length;
  const listing = listingMissing(app, request.listing).length === 0 ? 1 : 0;
  const total = PUBLISHING_STEP_IDS.length + 1;
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
