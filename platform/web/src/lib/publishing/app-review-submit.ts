import { decrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import type { App, AppReviewReason, AppReviewState, Build, BuildRelease } from "../data/types";
import { keyContext } from "../builds/signing";
import { appReviewSecret, type AppReviewSecret } from "./app-review-secret";
import { appleToken, type AppleCredentials } from "./review";

/**
 * 138 Every iPhone build that reached TestFlight is sent to App Review by the
 * platform, with no step by hand and no runner minutes spent waiting for
 * Apple: the frequent job (lib/jobs/frequent.ts) looks at the builds whose
 * `app_review` stage is pending and, with the client's App Store Connect key
 * (encrypted per app, lib/builds/signing.ts):
 *
 * 1. waits until Apple has processed the build (checked every
 *    APP_REVIEW_CHECK_MINUTES, for up to PROCESSING_GIVE_UP_HOURS);
 * 2. answers export compliance (`usesNonExemptEncryption: false`) where the
 *    build has no answer yet;
 * 3. takes the version being prepared (made, or given the build's version
 *    string, when needed), released automatically once approved, with
 *    Apple's phased release when the owner asked for it (`iosPhased`), What's
 *    New for an update and the reviewers' sign-in where they're missing;
 * 4. attaches the build and sends the version in a review submission.
 *
 * Each step looks first, so running it again (or twice at once) does
 * nothing more. Its state is kept on the build (`release.appReview`): the
 * Builds page shows "Sent to App Review", or why not in plain words. What
 * Apple's API can't do (App Privacy on the first version, the age rating,
 * an agreement) stops it as `blocked`, and the app's publishing account and
 * the team are emailed once per build and reason. Keys and passwords are
 * never logged.
 */

export const APP_REVIEW_CHECK_MINUTES = 10;
/** Waiting for an earlier version still in review is checked less often. */
export const IN_REVIEW_CHECK_MINUTES = 30;
/** Something someone has to do in App Store Connect: looked at again each hour, so a fix is picked up. */
export const BLOCKED_CHECK_MINUTES = 60;
/** Apple usually processes a build in minutes; after this long it's a problem to look at. */
export const PROCESSING_GIVE_UP_HOURS = 24;
/** Builds older than this aren't sent any more. */
export const APP_REVIEW_MAX_DAYS = 14;
/** Builds looked at per run, so the frequent job stays short. */
export const APP_REVIEW_PER_RUN = 5;

const ASC = "https://api.appstoreconnect.apple.com/v1";
const MINUTE = 60_000;

/** The states of a version App Store Connect still lets us change. */
const EDITABLE = ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY", "READY_FOR_REVIEW"];
/** Sent and not finished: no other version can go until Apple is done. */
const IN_FLIGHT = ["WAITING_FOR_REVIEW", "IN_REVIEW", "WAITING_FOR_EXPORT_COMPLIANCE", "PENDING_APPLE_RELEASE", "PENDING_DEVELOPER_RELEASE", "ACCEPTED", "PROCESSING_FOR_DISTRIBUTION"];
/** A version that went out: the app has had a release, so this one is an update. */
const RELEASED = ["READY_FOR_DISTRIBUTION", "READY_FOR_SALE", "REPLACED_WITH_NEW_VERSION", "REMOVED_FROM_SALE", "DEVELOPER_REMOVED_FROM_SALE"];

/** What's New for an update, when the version has none (the store's languages by their first part). */
export const WHATS_NEW: Record<string, string> = {
  en: "Improvements and fixes.",
  ar: "تحسينات وإصلاحات.",
  tr: "İyileştirmeler ve düzeltmeler.",
};

/** What the Builds page says (a `known` text in the dashboard's languages). */
export const APP_REVIEW_TEXT: Record<AppReviewReason, string> = {
  processing: "Apple is still processing the build. It's sent to App Review as soon as Apple is done.",
  in_review: "An earlier version is still with App Review. This one is sent once Apple has finished with it.",
  app_privacy: "App Store Connect needs the App Privacy answers before the app's first version can be reviewed (your app › App Privacy). Apple doesn't let us fill them in for you; our publishing team has been told.",
  age_rating: "App Store Connect needs the age rating answers (your app › App Information › Age Rating). Our publishing team has been told.",
  export_compliance: "App Store Connect needs the export compliance answer for this build (TestFlight › the build › Manage). Our publishing team has been told.",
  screenshots: "App Store Connect is missing screenshots for this version. Add them in App setup › Store listing, then start a new build.",
  whats_new: "App Store Connect needs What's New for this version. Our publishing team has been told.",
  content_rights: "App Store Connect needs the content rights answer (your app › App Information). Our publishing team has been told.",
  agreement: "Apple asks the account holder to accept an agreement in App Store Connect (Business) first.",
  no_app: "App Store Connect has no app with this bundle ID yet: create it there first (see the App Store guide).",
  binary: "Apple couldn't process this build. Start a new build; if it happens again, our team looks into it.",
  key: "App Store Connect didn't accept your App Store Connect key. Add it again on the Publishing step.",
  other: "App Store Connect needs something before this version can be sent to App Review. Our publishing team has been told.",
};

/** "Sent to App Review": the Builds page, with the date. */
export const APP_REVIEW_SENT = "Sent to App Review on {date}. Apple reviews it next, and it's released by itself once approved.";
export const APP_REVIEW_SENT_PHASED = "Sent to App Review on {date}. Apple reviews it next; once approved, it's released to more people each day over seven days.";

/** The reasons the team is emailed about: someone has to do something. */
const TELL_TEAM: readonly AppReviewReason[] = ["app_privacy", "age_rating", "export_compliance", "whats_new", "content_rights", "agreement", "no_app", "binary", "other", "processing"];

interface Json {
  data?: unknown;
  errors?: { status?: string; code?: string; title?: string; detail?: string; meta?: { associatedErrors?: Record<string, { code?: string; detail?: string; title?: string }[]> } }[];
}

type Resource = { id: string; type?: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: { id: string } | null }> };

/** A call App Store Connect turned down, with Apple's words (never a key). */
export class AppleRefusal extends Error {
  constructor(
    readonly status: number,
    readonly words: string,
  ) {
    super(`App Store Connect answered ${status}`);
  }
}

/** Apple's error texts in one line, for the reason and, for `other`, the Builds page. */
export function appleWords(body: Json | null): string {
  const out: string[] = [];
  for (const error of body?.errors ?? []) {
    for (const part of [error.title, error.detail, error.code]) if (part) out.push(part);
    for (const list of Object.values(error.meta?.associatedErrors ?? {})) for (const e of list) for (const part of [e.title, e.detail, e.code]) if (part) out.push(part);
  }
  return [...new Set(out)].join(" · ").slice(0, 600);
}

/** The reason Apple's words mean, in the order a person would fix them. */
export function reasonOf(status: number, words: string): AppReviewReason {
  if (status === 401 || status === 403) return "key";
  if (/privacy practices|app privacy|data ?usage|privacy nutrition/i.test(words)) return "app_privacy";
  if (/age ?rating|ageRatingDeclaration/i.test(words)) return "age_rating";
  if (/encryption|export compliance/i.test(words)) return "export_compliance";
  if (/content ?rights/i.test(words)) return "content_rights";
  if (/agreement|paid apps|contract/i.test(words)) return "agreement";
  if (/screenshot/i.test(words)) return "screenshots";
  if (/whats ?new|what's new/i.test(words)) return "whats_new";
  return "other";
}

/** Apple's words without anything that looks like a key or a token. */
function plain(words: string): string {
  return words.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, "").replace(/\b[A-Za-z0-9_-]{40,}\b/g, "…").slice(0, 400);
}

/** App Store Connect with one client's key. */
export class AppleApi {
  private token: string;
  constructor(
    private readonly fetcher: typeof fetch,
    credentials: AppleCredentials,
    now: Date,
  ) {
    this.token = appleToken(credentials, now);
  }

  async call(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<Json | null> {
    let response: Response;
    try {
      response = await this.fetcher(`${ASC}${path}`, {
        method,
        headers: { authorization: `Bearer ${this.token}`, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new AppleRefusal(0, "unreachable");
    }
    const json = (await response.json().catch(() => null)) as Json | null;
    if (!response.ok) throw new AppleRefusal(response.status, appleWords(json));
    return json;
  }

  async list(path: string): Promise<Resource[]> {
    const data = (await this.call("GET", path))?.data;
    return Array.isArray(data) ? (data as Resource[]) : [];
  }

  async one(path: string): Promise<Resource | null> {
    try {
      const data = (await this.call("GET", path))?.data;
      return data && !Array.isArray(data) ? (data as Resource) : null;
    } catch (error) {
      if (error instanceof AppleRefusal && error.status === 404) return null;
      throw error;
    }
  }
}

const enc = encodeURIComponent;

export interface SubmitInput {
  bundleId: string;
  versionName: string;
  versionCode: number;
  phased: boolean;
  /** The reviewers' sign-in, set where App Review Information has none. */
  review: AppReviewSecret | null;
  /** Where the previous run stopped. */
  state: AppReviewState | null;
}

export type SubmitOutcome =
  | { state: "submitted"; versionId: string; submissionId: string | null }
  | { state: "waiting"; reason: "processing" | "in_review"; versionId?: string | null }
  | { state: "blocked"; reason: AppReviewReason; detail?: string | null; versionId?: string | null };

function attr(resource: Resource | null | undefined, name: string): unknown {
  return resource?.attributes?.[name];
}

function versionState(version: Resource): string {
  return String(attr(version, "appVersionState") ?? attr(version, "appStoreState") ?? "");
}

/** The reviewers' sign-in in App Review Information's names, as the pipeline's app_review.py writes it. */
export function reviewAttributes(review: AppReviewSecret): Record<string, unknown> {
  const signIn =
    review.kind === "code"
      ? `Sign in with ${review.demo_user} and the code ${review.demo_password}; no message is sent.`
      : `Sign in with the account ${review.demo_user} and the password in the demo account fields.`;
  const notes = [signIn, (review.notes ?? "").trim()].filter(Boolean).join("\n\n").slice(0, 4000);
  return {
    demoAccountRequired: true,
    demoAccountName: review.demo_user,
    demoAccountPassword: review.demo_password,
    notes,
    ...(review.contact.first_name ? { contactFirstName: review.contact.first_name } : {}),
    ...(review.contact.last_name ? { contactLastName: review.contact.last_name } : {}),
    ...(review.contact.phone ? { contactPhone: review.contact.phone } : {}),
    ...(review.contact.email ? { contactEmail: review.contact.email } : {}),
  };
}

/** One pass for one build: as far as Apple lets it go now. */
export async function submitForReview(api: AppleApi, input: SubmitInput): Promise<SubmitOutcome> {
  const app = (await api.list(`/apps?filter[bundleId]=${enc(input.bundleId)}&limit=1`))[0];
  if (!app) return { state: "blocked", reason: "no_app" };

  // 1. The build, once Apple has processed it.
  const builds = await api.list(
    `/builds?filter[app]=${enc(app.id)}&filter[version]=${enc(String(input.versionCode))}&filter[preReleaseVersion.version]=${enc(input.versionName)}&filter[preReleaseVersion.platform]=IOS&limit=5`,
  );
  const build = builds[0];
  if (!build) return { state: "waiting", reason: "processing" };
  const processing = String(attr(build, "processingState") ?? "");
  if (processing === "PROCESSING" || processing === "") return { state: "waiting", reason: "processing" };
  if (processing !== "VALID") return { state: "blocked", reason: "binary" };

  // 2. Export compliance: the app only uses the encryption iOS itself provides.
  if (attr(build, "usesNonExemptEncryption") === null || attr(build, "usesNonExemptEncryption") === undefined) {
    try {
      await api.call("PATCH", `/builds/${enc(build.id)}`, { data: { type: "builds", id: build.id, attributes: { usesNonExemptEncryption: false } } });
    } catch (error) {
      if (!(error instanceof AppleRefusal) || error.status === 401 || error.status === 403) throw error;
      // Apple wants it answered another way (a document for this app): someone has to look.
      return { state: "blocked", reason: "export_compliance", detail: plain(error.words) };
    }
  }

  // 3. The version being prepared: this build's version string, released once approved.
  const versions = await api.list(`/apps/${enc(app.id)}/appStoreVersions?filter[platform]=IOS&limit=20`);
  const mine = versions.find((v) => attr(v, "versionString") === input.versionName);
  if (mine && IN_FLIGHT.includes(versionState(mine))) {
    // Already sent (by an earlier run, or by hand): with this build it's done.
    const attached = await api.one(`/appStoreVersions/${enc(mine.id)}/build`);
    if (attached?.id === build.id) return { state: "submitted", versionId: mine.id, submissionId: input.state?.submissionId ?? null };
  }
  const editable = (mine && EDITABLE.includes(versionState(mine)) ? mine : null) ?? versions.find((v) => EDITABLE.includes(versionState(v))) ?? null;
  if (!editable && versions.some((v) => IN_FLIGHT.includes(versionState(v)))) return { state: "waiting", reason: "in_review" };
  const update = versions.some((v) => RELEASED.includes(versionState(v)));
  let version: Resource;
  if (editable) {
    version = editable;
    if (attr(editable, "versionString") !== input.versionName || attr(editable, "releaseType") !== "AFTER_APPROVAL") {
      await api.call("PATCH", `/appStoreVersions/${enc(editable.id)}`, {
        data: { type: "appStoreVersions", id: editable.id, attributes: { versionString: input.versionName, releaseType: "AFTER_APPROVAL" } },
      });
    }
  } else {
    const made = await api.call("POST", "/appStoreVersions", {
      data: { type: "appStoreVersions", attributes: { platform: "IOS", versionString: input.versionName, releaseType: "AFTER_APPROVAL" }, relationships: { app: { data: { type: "apps", id: app.id } } } },
    });
    version = made?.data as Resource;
    if (!version?.id) return { state: "blocked", reason: "other" };
  }

  // Phased release, as the owner chose.
  const phase = await api.one(`/appStoreVersions/${enc(version.id)}/appStoreVersionPhasedRelease`);
  if (input.phased && !phase) {
    await api.call("POST", "/appStoreVersionPhasedReleases", {
      data: { type: "appStoreVersionPhasedReleases", attributes: { phasedReleaseState: "INACTIVE" }, relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } } },
    });
  } else if (!input.phased && phase && attr(phase, "phasedReleaseState") === "INACTIVE") {
    await api.call("DELETE", `/appStoreVersionPhasedReleases/${enc(phase.id)}`);
  }

  // What's New, for an update, where a language has none.
  if (update) {
    for (const localization of await api.list(`/appStoreVersions/${enc(version.id)}/appStoreVersionLocalizations?limit=50`)) {
      if (String(attr(localization, "whatsNew") ?? "").trim()) continue;
      const locale = String(attr(localization, "locale") ?? "en").slice(0, 2).toLowerCase();
      await api.call("PATCH", `/appStoreVersionLocalizations/${enc(localization.id)}`, {
        data: { type: "appStoreVersionLocalizations", id: localization.id, attributes: { whatsNew: WHATS_NEW[locale] ?? WHATS_NEW.en } },
      });
    }
  }

  // The reviewers' sign-in, where App Review Information has none (the build's own lane sets it too).
  if (input.review) {
    const detail = await api.one(`/appStoreVersions/${enc(version.id)}/appStoreReviewDetail`);
    if (!detail) {
      await api.call("POST", "/appStoreReviewDetails", {
        data: { type: "appStoreReviewDetails", attributes: reviewAttributes(input.review), relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } } },
      });
    } else if (!String(attr(detail, "demoAccountName") ?? "").trim()) {
      await api.call("PATCH", `/appStoreReviewDetails/${enc(detail.id)}`, { data: { type: "appStoreReviewDetails", id: detail.id, attributes: reviewAttributes(input.review) } });
    }
  }

  // 4. The build on the version, and the version in a review submission.
  const attached = await api.one(`/appStoreVersions/${enc(version.id)}/build`);
  if (attached?.id !== build.id) {
    await api.call("PATCH", `/appStoreVersions/${enc(version.id)}/relationships/build`, { data: { type: "builds", id: build.id } });
  }
  const open = await api.list(`/reviewSubmissions?filter[app]=${enc(app.id)}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES&limit=5`);
  let submission = open[0] ?? null;
  if (!submission) {
    const made = await api.call("POST", "/reviewSubmissions", {
      data: { type: "reviewSubmissions", attributes: { platform: "IOS" }, relationships: { app: { data: { type: "apps", id: app.id } } } },
    });
    submission = (made?.data as Resource) ?? null;
    if (!submission?.id) return { state: "blocked", reason: "other", versionId: version.id };
  }
  const items = await api.list(`/reviewSubmissions/${enc(submission.id)}/items?include=appStoreVersion&limit=20`);
  if (!items.some((item) => item.relationships?.appStoreVersion?.data?.id === version.id)) {
    await api.call("POST", "/reviewSubmissionItems", {
      data: {
        type: "reviewSubmissionItems",
        relationships: { reviewSubmission: { data: { type: "reviewSubmissions", id: submission.id } }, appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } },
      },
    });
  }
  await api.call("PATCH", `/reviewSubmissions/${enc(submission.id)}`, { data: { type: "reviewSubmissions", id: submission.id, attributes: { submitted: true } } });
  return { state: "submitted", versionId: version.id, submissionId: submission.id };
}

/** A refusal as an outcome: the key, or what App Store Connect still needs. */
export function outcomeOfRefusal(error: AppleRefusal): SubmitOutcome {
  if (error.status === 0 || error.status >= 500 || error.status === 429) return { state: "waiting", reason: "processing" };
  const reason = reasonOf(error.status, error.words);
  return { state: "blocked", reason, detail: reason === "other" ? plain(error.words) : null };
}

function credentialsOf(app: App, key: Buffer): AppleCredentials | null {
  if (!app.ascKeyId || !app.ascIssuerId || !app.ascPrivateKeyEncrypted) return null;
  try {
    return { keyId: app.ascKeyId, issuerId: app.ascIssuerId, privateKey: decrypt(app.ascPrivateKeyEncrypted, key, keyContext.appStore(app.id)) };
  } catch {
    return null;
  }
}

/** Whether a build waits for the job now (its stage pending, not looked at too recently). */
export function dueForReview(build: Pick<Build, "status" | "stages" | "release" | "finishedAt" | "autoPublish">, now: Date): boolean {
  if (build.status !== "ready" || build.stages.app_review !== "pending" || !build.autoPublish) return false;
  const state = build.release?.appReview;
  if (!state || state.state === "submitted") return true;
  const every = state.state === "blocked" ? BLOCKED_CHECK_MINUTES : state.reason === "in_review" ? IN_REVIEW_CHECK_MINUTES : APP_REVIEW_CHECK_MINUTES;
  return now.getTime() - Date.parse(state.checkedAt) >= every * MINUTE;
}

export interface AppReviewDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  fetcher?: typeof fetch;
  /** Tells the app's publishing account and the team (lib/publishing/service.ts `notifyPublishingWork`); best effort. */
  tell?: (app: App, event: string) => Promise<unknown>;
  /** When a version is sent: the publishing request's App Store status follows (lib/publishing/service.ts). */
  sent?: (app: App, build: Build, now: Date) => Promise<unknown>;
}

export interface AppReviewReport {
  looked: number;
  submitted: number;
  waiting: number;
  blocked: number;
  skipped: number;
}

/** The release JSON with a new App Review state. */
function withState(release: BuildRelease | null | undefined, state: AppReviewState): BuildRelease {
  return { ...(release ?? { androidRollout: null, iosPhased: false }), appReview: state };
}

/** The frequent job's step: a few due builds each run, newest first; an older build of the same app (and variant) is left for the newest. */
export async function runAppReviewSubmissions(deps: AppReviewDeps): Promise<AppReviewReport> {
  const { store, now } = deps;
  const report: AppReviewReport = { looked: 0, submitted: 0, waiting: 0, blocked: 0, skipped: 0 };
  const ready = await store.listBuilds({ status: "ready", limit: 200, newestFirst: true });
  const newest = new Set<string>();
  for (const build of ready) {
    if (build.stages.app_review !== "pending") continue;
    const which = `${build.appId}:${build.variant ?? "app"}`;
    const old = newest.has(which) || !build.finishedAt || now.getTime() - build.finishedAt.getTime() > APP_REVIEW_MAX_DAYS * 86_400_000;
    newest.add(which);
    // Only the newest build goes; one that never reached TestFlight can't.
    if (old || build.stages.upload_testflight !== "done") {
      await store.updateBuild(build.id, { stages: { ...build.stages, app_review: "skipped" } }, now);
      report.skipped += 1;
      continue;
    }
    if (!dueForReview(build, now) || report.looked >= APP_REVIEW_PER_RUN) continue;
    const app = await store.getAppById(build.appId);
    const credentials = app ? credentialsOf(app, deps.key) : null;
    const bundleId = String((build.config as unknown as { ios_bundle_id?: string }).ios_bundle_id ?? "");
    report.looked += 1;
    const previous = build.release?.appReview ?? null;
    const base = { checkedAt: now.toISOString(), since: previous?.since ?? now.toISOString(), versionId: previous?.versionId ?? null, submissionId: previous?.submissionId ?? null, emailed: previous?.emailed ?? null };
    let outcome: SubmitOutcome;
    let api: AppleApi | null = null;
    try {
      api = app && credentials && bundleId ? new AppleApi(deps.fetcher ?? fetch, credentials, now) : null;
    } catch {
      // A key Node can't sign with: the client adds it again.
      api = null;
    }
    if (!app || !api) outcome = { state: "blocked", reason: "key" };
    else {
      try {
        const review = await reviewSecretOf(store, app, deps.key);
        outcome = await submitForReview(api, {
          bundleId,
          versionName: build.versionName,
          versionCode: build.versionCode,
          phased: Boolean(build.release?.iosPhased),
          review,
          state: previous,
        });
      } catch (error) {
        if (!(error instanceof AppleRefusal)) {
          console.error("[app review]", build.id, error instanceof Error ? error.name : "error");
          outcome = { state: "waiting", reason: "processing" };
        } else outcome = outcomeOfRefusal(error);
      }
    }
    // Apple taking more than a day to process it is a problem to look at.
    if (outcome.state === "waiting" && outcome.reason === "processing" && now.getTime() - Date.parse(base.since) > PROCESSING_GIVE_UP_HOURS * 3_600_000) {
      outcome = { state: "blocked", reason: "processing" };
    }
    if (outcome.state === "submitted") {
      const state: AppReviewState = { ...base, state: "submitted", reason: null, detail: null, submittedAt: now.toISOString(), versionId: outcome.versionId, submissionId: outcome.submissionId };
      await store.updateBuild(build.id, { stages: { ...build.stages, app_review: "done" }, release: withState(build.release, state) }, now);
      report.submitted += 1;
      if (app && deps.sent) await deps.sent(app, build, now).catch(() => undefined);
      continue;
    }
    const state: AppReviewState = {
      ...base,
      state: outcome.state,
      reason: outcome.reason,
      detail: outcome.state === "blocked" ? (outcome.detail ?? null) : null,
      versionId: outcome.versionId ?? base.versionId,
    };
    // Blocked: the stage stays pending, so a fix in App Store Connect is picked up later (checked like a wait); the team is told once.
    const tell = outcome.state === "blocked" && TELL_TEAM.includes(outcome.reason) && base.emailed !== outcome.reason;
    if (tell) state.emailed = outcome.reason;
    await store.updateBuild(build.id, { release: withState(build.release, state) }, now);
    if (outcome.state === "blocked") report.blocked += 1;
    else report.waiting += 1;
    if (tell && app && deps.tell) {
      const words = outcome.reason === "other" && state.detail ? `${APP_REVIEW_TEXT.other} Apple says: ${state.detail}` : APP_REVIEW_TEXT[outcome.reason];
      await deps.tell(app, `has an iPhone version (${build.versionName}) that can't go to App Review yet: ${words}`).catch(() => undefined);
    }
  }
  return report;
}

/** The reviewers' sign-in for App Review Information, as the build's keys carry it. */
async function reviewSecretOf(store: DataStore, app: App, key: Buffer): Promise<AppReviewSecret | null> {
  const [publishing, client] = await Promise.all([store.getPublishingRequest(app.id), store.getClientById(app.clientId)]);
  const user = client ? await store.getUserById(client.userId) : null;
  try {
    return appReviewSecret(app, key, { listingNotes: publishing?.listing.reviewNotes ?? null, client, user });
  } catch {
    return null;
  }
}
