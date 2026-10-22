import type { DataStore } from "../data/store";
import type { App, Build, Client, ClientMilestone, License, MilestoneKind, PlanPayment, PublishingEvent, PublishingRequest, SignupSource } from "../data/types";
import { SETUP_STEPS, stepStatus, type SetupStep } from "../app/setup";
import { effectivePlans } from "../entitlements";
import { currentPlanId } from "../billing/plan-change";
import type { Plan, PlanInfo } from "../plans";
import { DEMO_ACCOUNT } from "../demo/constants";

/**
 * 78 The milestones on each client's way to a published, paid app: when each
 * setup step was first done and the setup finished, the first build and the
 * first that worked, the first upload to a store and the first time the app
 * was live, the first payment and each renewal. They are worked out from what
 * the data shows (so older accounts get theirs too) and kept, as the data
 * they come from changes: a step saved again, a build deleted with its app.
 *
 * Recorded where things happen (the steps, the builds, publishing, payments;
 * `noteMilestones`) and by the daily job for every account (`recordAllMilestones`).
 */

const STEP_KIND: Record<SetupStep, MilestoneKind> = {
  "app-type": "step_app_type",
  website: "step_website",
  branding: "step_branding",
  listing: "step_listing",
  publishing: "step_publishing",
};

const STEP_DONE_AT: Record<SetupStep, (app: App) => Date | null> = {
  "app-type": (app) => app.appTypeDoneAt,
  website: (app) => app.websiteDoneAt,
  branding: (app) => app.brandingDoneAt,
  listing: (app) => app.listingDoneAt,
  publishing: (app) => app.publishingDoneAt,
};

const UPLOAD_STAGES = ["upload_play", "upload_testflight", "upload_galaxy", "upload_appgallery", "upload_xiaomi"] as const;

export interface ClientFacts {
  client: Client;
  /** Deleted apps too: their milestones stay with the account. */
  apps: App[];
  licenses: License[];
  plans: Record<Plan, PlanInfo>;
  /** Each app's builds. */
  builds: Map<string, Build[]>;
  publishing: Map<string, { request: PublishingRequest | null; events: PublishingEvent[] }>;
  payments: PlanPayment[];
  now: Date;
}

function earliest(dates: (Date | null | undefined)[]): Date | null {
  let first: Date | null = null;
  for (const d of dates) if (d && (!first || d.getTime() < first.getTime())) first = d;
  return first;
}

/** Not later than now (a step's time is when it was last saved; the first time can only be earlier). */
function notAfter(at: Date | null, now: Date): Date {
  return at && at.getTime() < now.getTime() ? at : now;
}

/** Everything the data shows for one client (signed_up without its source: the sign-up records that). */
export function milestonesOf(facts: ClientFacts): ClientMilestone[] {
  const { client, now } = facts;
  const rows: ClientMilestone[] = [];
  const add = (kind: MilestoneKind, ref: string, appId: string | null, at: Date | null) => {
    if (at) rows.push({ clientId: client.id, kind, ref, appId, at, source: null });
  };
  add("signed_up", "", null, client.createdAt);

  for (const app of facts.apps) {
    const license = facts.licenses.find((l) => l.appId === app.id) ?? null;
    const status = stepStatus(app, license ? currentPlanId(license, now) : null, facts.plans);
    for (const step of SETUP_STEPS) if (status[step]) add(STEP_KIND[step], app.id, app.id, notAfter(STEP_DONE_AT[step](app), now));
    if (SETUP_STEPS.every((step) => status[step])) {
      // When the last of the steps was done.
      const times = SETUP_STEPS.map((step) => notAfter(STEP_DONE_AT[step](app), now).getTime());
      add("setup_done", app.id, app.id, new Date(Math.max(...times)));
    }

    const builds = facts.builds.get(app.id) ?? [];
    add("first_build", app.id, app.id, earliest(builds.map((b) => b.createdAt)));
    add("build_ready", app.id, app.id, earliest(builds.filter((b) => b.status === "ready").map((b) => b.finishedAt ?? b.updatedAt)));

    // Uploaded: a build that sent the app to a store, or the team submitting it (We publish for you).
    const publishing = facts.publishing.get(app.id);
    const events = (publishing?.events ?? []).filter((e) => e.store !== "mode");
    const uploadedByBuild = builds.filter((b) => UPLOAD_STAGES.some((stage) => b.stages[stage] === "done")).map((b) => b.finishedAt ?? b.updatedAt);
    const submitted = events.filter((e) => e.status === "submitted" || e.status === "in_review" || e.status === "live").map((e) => e.at);
    add("store_upload", app.id, app.id, earliest([...uploadedByBuild, ...submitted]));
    // Live: the team marked a store live (its event, or the track itself for a request older than its events).
    const request = publishing?.request ?? null;
    const tracks = request ? [request.android, request.ios, request.galaxy, request.huawei, request.xiaomi] : [];
    const liveTracks = tracks.filter((t) => t?.status === "live").map((t) => t!.updatedAt ?? request!.updatedAt);
    add("store_live", app.id, app.id, earliest([...events.filter((e) => e.status === "live").map((e) => e.at), ...liveTracks]));
  }

  // Paid: plans paid with money (a coupon that took the whole price, or storage packs alone, aren't).
  const paid = facts.payments
    .filter((p) => p.status === "paid" && p.paidAt && p.amountCents > 0 && (p.purpose ?? "plan") === "plan")
    .sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime());
  if (paid[0]) add("paid", "", paid[0].appId, paid[0].paidAt);
  // A renewal: a later payment of an app's plan (an account's second app's first payment isn't one).
  const seen = new Set<string>();
  for (const payment of paid) {
    const key = payment.appId ?? "";
    if (seen.has(key)) add("renewed", payment.id, payment.appId, payment.paidAt);
    seen.add(key);
  }
  return rows;
}

async function factsOf(store: DataStore, client: Client, plans: Record<Plan, PlanInfo>, now: Date): Promise<ClientFacts> {
  const [apps, licenses, payments] = await Promise.all([
    store.listAppsByClientIncludingDeleted(client.id),
    store.listLicensesByClient(client.id),
    store.listPlanPayments({ clientId: client.id, limit: 1000 }),
  ]);
  const builds = new Map<string, Build[]>();
  const publishing = new Map<string, { request: PublishingRequest | null; events: PublishingEvent[] }>();
  await Promise.all(
    apps.map(async (app) => {
      const [appBuilds, request, events] = await Promise.all([store.listBuildsByApp(app.id, 1000), store.getPublishingRequest(app.id), store.listPublishingEvents(app.id)]);
      builds.set(app.id, appBuilds);
      publishing.set(app.id, { request, events });
    }),
  );
  return { client, apps, licenses, plans, builds, publishing, payments, now };
}

/** The demo apps' account (lib/demo) isn't a client: it has no milestones. */
async function isDemoAccount(store: DataStore, client: Client): Promise<boolean> {
  const user = await store.getUserById(client.userId);
  return user?.email === DEMO_ACCOUNT.email;
}

/** Records the client's milestones not recorded yet. Returns how many were new. */
export async function recordMilestones(store: DataStore, clientId: string, now: Date, plans?: Record<Plan, PlanInfo>): Promise<number> {
  const client = await store.getClientById(clientId);
  if (!client || (await isDemoAccount(store, client))) return 0;
  const facts = await factsOf(store, client, plans ?? (await effectivePlans(store)), now);
  return store.addClientMilestones(milestonesOf(facts));
}

/** `recordMilestones` where something happened: it never fails what called it. */
export async function noteMilestones(store: DataStore, clientId: string, now: Date = new Date()): Promise<void> {
  try {
    await recordMilestones(store, clientId, now);
  } catch (error) {
    console.error("[milestones]", error instanceof Error ? error.message : String(error));
  }
}

/** The daily job: every account's milestones (and, the first time, those of the accounts from before Phase 78). */
export async function recordAllMilestones(store: DataStore, now: Date): Promise<{ clients: number; added: number }> {
  const rows = await store.listClients({ filter: "all", now });
  const plans = await effectivePlans(store);
  let added = 0;
  for (const row of rows) {
    if (row.user.email === DEMO_ACCOUNT.email) continue;
    added += await store.addClientMilestones(milestonesOf(await factsOf(store, row.client, plans, now)));
  }
  return { clients: rows.length, added };
}

/** The sign-up, with where it came from. */
export async function recordSignUp(store: DataStore, client: Client, source: SignupSource | null): Promise<void> {
  try {
    await store.addClientMilestones([{ clientId: client.id, kind: "signed_up", ref: "", appId: null, at: client.createdAt, source }]);
  } catch (error) {
    console.error("[milestones] sign-up", error instanceof Error ? error.message : String(error));
  }
}

