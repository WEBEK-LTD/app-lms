import type { AppError, AuditEntry, Build, ClientMilestone, MilestoneKind, OwnerNotice, PlanPayment, PublishingEvent } from "../data/types";
import { auditActionLabel } from "./audit-actions";
import { APP_ERROR_SOURCE_LABEL } from "../watch/app-errors";
import { formatCents } from "../catalog/money";

/**
 * 78.4 A client's timeline (Admin › Clients): builds, errors, notices to the
 * owner, payments, milestones, store statuses and the team's changes in one
 * list, newest first. A pure function over what the page reads.
 */

export type TimelineKind = "build" | "error" | "notice" | "payment" | "milestone" | "publishing" | "audit";

export interface TimelineItem {
  at: Date;
  kind: TimelineKind;
  title: string;
  detail: string | null;
  /** The app it is about, by name; null for the account. */
  app: string | null;
  tone: "neutral" | "good" | "bad";
}

const MILESTONE_LABEL: Record<MilestoneKind, string> = {
  signed_up: "Signed up",
  step_app_type: "App type chosen",
  step_website: "Website step done",
  step_branding: "Branding step done",
  step_listing: "Store listing step done",
  step_publishing: "Publishing step done",
  setup_done: "Setup done",
  first_build: "First build",
  build_ready: "First build that worked",
  store_upload: "First upload to a store",
  store_live: "Live in a store for the first time",
  paid: "First payment",
  renewed: "Renewed",
};

export interface TimelineInput {
  appNames: Map<string, string>;
  builds: Build[];
  errors: AppError[];
  notices: OwnerNotice[];
  payments: PlanPayment[];
  milestones: ClientMilestone[];
  publishing: { appId: string; events: PublishingEvent[] }[];
  audit: AuditEntry[];
}

export function buildTimeline(input: TimelineInput, limit = 60): TimelineItem[] {
  const name = (appId: string | null | undefined) => (appId ? (input.appNames.get(appId) ?? "A deleted app") : null);
  const items: TimelineItem[] = [];
  for (const b of input.builds) {
    items.push({ at: b.createdAt, kind: "build", title: `Build #${b.number} queued`, detail: `Version ${b.versionName}`, app: name(b.appId), tone: "neutral" });
    if (b.finishedAt && (b.status === "ready" || b.status === "failed")) {
      items.push({
        at: b.finishedAt,
        kind: "build",
        title: b.status === "ready" ? `Build #${b.number} ready` : `Build #${b.number} didn't finish`,
        detail: b.status === "failed" ? b.message : null,
        app: name(b.appId),
        tone: b.status === "ready" ? "good" : "bad",
      });
    }
  }
  for (const e of input.errors) {
    items.push({
      at: e.lastAt,
      kind: "error",
      title: `${APP_ERROR_SOURCE_LABEL[e.source]}: ${e.code}`,
      detail: `${e.message}${e.count > 1 ? ` (${e.count} times since ${e.firstAt.toISOString().slice(0, 10)})` : ""}`,
      app: name(e.appId),
      tone: "bad",
    });
  }
  for (const n of input.notices) items.push({ at: n.createdAt, kind: "notice", title: `Owner told: ${n.title}`, detail: null, app: name(n.appId), tone: n.tone === "warn" ? "bad" : "neutral" });
  for (const p of input.payments) {
    if (p.status !== "paid" || !p.paidAt) continue;
    items.push({
      at: p.paidAt,
      kind: "payment",
      title: (p.purpose ?? "plan") === "storage" ? "Storage paid" : `Plan paid: ${p.plan}, ${p.months === 12 ? "a year" : "a month"}`,
      detail: formatCents(p.amountCents, p.currency),
      app: name(p.appId),
      tone: "good",
    });
  }
  for (const m of input.milestones) {
    // Builds and payments show on their own; the milestones add what they don't.
    if (m.kind === "first_build" || m.kind === "build_ready" || m.kind === "paid" || m.kind === "renewed") continue;
    items.push({ at: m.at, kind: "milestone", title: MILESTONE_LABEL[m.kind], detail: null, app: name(m.appId), tone: "good" });
  }
  for (const { appId, events } of input.publishing) {
    for (const e of events) {
      if (e.store === "mode") continue;
      items.push({ at: e.at, kind: "publishing", title: `${e.store}: ${e.status.replace(/_/g, " ")}`, detail: e.note, app: name(appId), tone: e.status === "live" ? "good" : e.status === "rejected" ? "bad" : "neutral" });
    }
  }
  for (const a of input.audit) items.push({ at: a.at, kind: "audit", title: auditActionLabel(a.action), detail: `${a.summary} (by ${a.actorEmail})`, app: null, tone: "neutral" });
  return items.sort((x, y) => y.at.getTime() - x.at.getTime()).slice(0, limit);
}
