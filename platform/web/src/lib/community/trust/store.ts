import { randomUUID } from "node:crypto";
import type { CommunityTargetType } from "../types";
import type { BadgeDetails, CommunityBadge, MemberBadge } from "./badges";
import type { NotificationData, NotificationKind, NotificationPrefs } from "./notifications";
import type { AuditAction, AuditEntry, Report, ReportReason, ReportStatus, VerificationRequest, VerificationStatus } from "./requests";

/**
 * 231 Yallapp Community: where area C keeps its records, in the base's
 * tables (migration 0155): badges, verification requests, the audit log,
 * settings, the moderation queue, violations, notifications and their email
 * choices; reports are the base's table, decided here. One interface, a
 * memory store (tests, memory mode) and a MySQL store (./store-mysql.ts).
 */

/** Content that moderation knows about: what area B stores (and phase 2 adds). */
export type ContentKind = Exclude<CommunityTargetType, "member">;

export const MODERATION_CAUSES = ["first_posts", "spam_filter", "reports"] as const;
export type ModerationCause = (typeof MODERATION_CAUSES)[number];
export const MODERATION_STATUSES = ["open", "approved", "removed"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

/** A post waiting for a moderator: held by the gate (first posts, the filter) or by reports; and what was decided. */
export interface ModerationItem {
  id: string;
  targetType: ContentKind;
  targetId: string;
  authorId: string | null;
  cause: ModerationCause;
  status: ModerationStatus;
  /** Why it was held (the filter's reasons) while open; the moderator's note once decided. */
  note: string | null;
  handledBy: string | null;
  handledAt: Date | null;
  createdAt: Date;
}

/** A member's violation (content removed, a report actioned, a suspension): Blue needs none in its window. */
export interface Violation {
  id: string;
  memberId: string;
  kind: "content_removed" | "report_actioned" | "suspended";
  targetType: string | null;
  targetId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface CommunityNotification {
  id: string;
  memberId: string;
  kind: NotificationKind;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  /** The words' details and `link`: where it opens on the Community ("/q/12#a31"). */
  data: NotificationData & { link: string };
  readAt: Date | null;
  emailedAt: Date | null;
  createdAt: Date;
}

/** A page of a list, oldest-open-first or newest-first as each list says; `next` is the offset of the next page, null at the end. */
export interface Page<T> {
  items: T[];
  next: number | null;
}

export type NewBadge = Omit<MemberBadge, "id" | "revokedAt" | "revokedBy" | "revokeReason">;

export interface TrustStore {
  // Badges
  listMemberBadges(memberId: string): Promise<MemberBadge[]>;
  addMemberBadge(input: NewBadge): Promise<MemberBadge>;
  revokeMemberBadge(id: string, input: { at: Date; by: string | null; reason: string }): Promise<MemberBadge | null>;
  /** Members holding a badge given by the rules (the daily check goes over them, and over the active members A lists). */
  membersWithAutoBadges(): Promise<string[]>;

  // Verification
  addVerification(input: Omit<VerificationRequest, "id" | "status" | "reason" | "reviewedBy" | "reviewedAt">): Promise<VerificationRequest>;
  getVerification(id: string): Promise<VerificationRequest | null>;
  latestVerification(memberId: string): Promise<VerificationRequest | null>;
  listVerifications(input: { status: VerificationStatus; offset: number; limit: number }): Promise<Page<VerificationRequest>>;
  decideVerification(id: string, input: { status: "approved" | "rejected"; at: Date; by: string; reason: string | null }): Promise<VerificationRequest | null>;

  // The audit log (only added to, never changed)
  addAudit(input: Omit<AuditEntry, "id">): Promise<AuditEntry>;
  listAudit(input: { memberId?: string; action?: string; offset: number; limit: number }): Promise<Page<AuditEntry>>;

  // Settings (one document, key "trust")
  getSettingsDoc(): Promise<unknown>;
  saveSettingsDoc(doc: unknown, input: { at: Date; by: string | null }): Promise<void>;

  // Moderation
  addModeration(input: Omit<ModerationItem, "id" | "status" | "handledBy" | "handledAt">): Promise<ModerationItem>;
  getModeration(id: string): Promise<ModerationItem | null>;
  /** The open item for this post, if any. */
  openModeration(targetType: ContentKind, targetId: string): Promise<ModerationItem | null>;
  listModeration(input: { status: ModerationStatus; offset: number; limit: number }): Promise<Page<ModerationItem>>;
  decideModeration(id: string, input: { status: "approved" | "removed"; at: Date; by: string; note: string | null }): Promise<ModerationItem | null>;

  // Violations
  addViolation(input: Omit<Violation, "id">): Promise<void>;
  lastViolationAt(memberId: string): Promise<Date | null>;

  // Reports (the base's table)
  addReport(input: { reporterId: string; targetType: CommunityTargetType; targetId: string; reason: ReportReason; note: string; createdAt: Date }): Promise<Report | null>;
  getReport(id: string): Promise<Report | null>;
  countOpenReports(targetType: CommunityTargetType, targetId: string): Promise<number>;
  openReportsOn(targetType: CommunityTargetType, targetId: string): Promise<Report[]>;
  listReports(input: { status: ReportStatus; offset: number; limit: number }): Promise<Page<Report>>;
  resolveReport(id: string, input: { status: "actioned" | "dismissed"; at: Date; by: string }): Promise<Report | null>;

  // Notifications
  addNotification(input: Omit<CommunityNotification, "id" | "readAt" | "emailedAt">): Promise<CommunityNotification>;
  markEmailed(id: string, at: Date): Promise<void>;
  listNotifications(memberId: string, input: { unreadOnly?: boolean; offset: number; limit: number }): Promise<Page<CommunityNotification>>;
  unreadNotifications(memberId: string): Promise<number>;
  markNotificationsRead(memberId: string, ids: string[] | "all", at: Date): Promise<number>;
  getNotificationPrefs(memberId: string): Promise<NotificationPrefs | null>;
  saveNotificationPrefs(memberId: string, prefs: NotificationPrefs, at: Date): Promise<void>;
}

export type { CommunityBadge, BadgeDetails, AuditAction };

const pageOf = <T>(all: T[], offset: number, limit: number): Page<T> => ({ items: all.slice(offset, offset + limit), next: offset + limit < all.length ? offset + limit : null });
const byTime = <T>(time: (x: T) => Date) => (a: T, b: T) => time(a).getTime() - time(b).getTime();
const clone = <T>(x: T): T => structuredClone(x);

/** Area C's records in memory (tests, and the platform in memory mode). */
export class MemoryTrustStore implements TrustStore {
  private badges = new Map<string, MemberBadge>();
  private verifications = new Map<string, VerificationRequest>();
  private audit: AuditEntry[] = [];
  private settings: unknown = null;
  private moderation = new Map<string, ModerationItem>();
  private violations: Violation[] = [];
  private reports = new Map<string, Report>();
  private notifications = new Map<string, CommunityNotification>();
  private prefs = new Map<string, NotificationPrefs>();
  // Insertion order breaks ties between records made in the same millisecond.
  private order = new Map<string, number>();
  private seq = 0;

  private made<T extends { id: string }>(x: T): T {
    this.order.set(x.id, ++this.seq);
    return x;
  }
  private newestFirst = <T extends { id: string }>(time: (x: T) => Date) => (a: T, b: T) => time(b).getTime() - time(a).getTime() || this.order.get(b.id)! - this.order.get(a.id)!;
  private oldestFirst = <T extends { id: string }>(time: (x: T) => Date) => (a: T, b: T) => byTime(time)(a, b) || this.order.get(a.id)! - this.order.get(b.id)!;

  async listMemberBadges(memberId: string) {
    return [...this.badges.values()].filter((b) => b.memberId === memberId).sort(this.oldestFirst((b) => b.grantedAt)).map(clone);
  }
  async addMemberBadge(input: NewBadge) {
    const b: MemberBadge = this.made({ ...clone(input), id: randomUUID(), revokedAt: null, revokedBy: null, revokeReason: null });
    this.badges.set(b.id, b);
    return clone(b);
  }
  async revokeMemberBadge(id: string, input: { at: Date; by: string | null; reason: string }) {
    const b = this.badges.get(id);
    if (!b || b.revokedAt) return null;
    Object.assign(b, { revokedAt: input.at, revokedBy: input.by, revokeReason: input.reason });
    return clone(b);
  }
  async membersWithAutoBadges() {
    return [...new Set([...this.badges.values()].filter((b) => b.source === "auto" && !b.revokedAt).map((b) => b.memberId))];
  }

  async addVerification(input: Omit<VerificationRequest, "id" | "status" | "reason" | "reviewedBy" | "reviewedAt">) {
    const r: VerificationRequest = this.made({ ...clone(input), id: randomUUID(), status: "pending", reason: null, reviewedBy: null, reviewedAt: null });
    this.verifications.set(r.id, r);
    return clone(r);
  }
  async getVerification(id: string) {
    const r = this.verifications.get(id);
    return r ? clone(r) : null;
  }
  async latestVerification(memberId: string) {
    const r = [...this.verifications.values()].filter((x) => x.memberId === memberId).sort(this.newestFirst((x) => x.createdAt))[0];
    return r ? clone(r) : null;
  }
  async listVerifications(input: { status: VerificationStatus; offset: number; limit: number }) {
    const all = [...this.verifications.values()].filter((r) => r.status === input.status);
    // Oldest first while waiting (first come, first served); newest first once decided.
    all.sort(input.status === "pending" ? this.oldestFirst((r) => r.createdAt) : this.newestFirst((r) => r.reviewedAt ?? r.createdAt));
    return pageOf(all.map(clone), input.offset, input.limit);
  }
  async decideVerification(id: string, input: { status: "approved" | "rejected"; at: Date; by: string; reason: string | null }) {
    const r = this.verifications.get(id);
    if (!r || r.status !== "pending") return null;
    Object.assign(r, { status: input.status, reviewedAt: input.at, reviewedBy: input.by, reason: input.reason });
    return clone(r);
  }

  async addAudit(input: Omit<AuditEntry, "id">) {
    const e: AuditEntry = this.made({ ...clone(input), id: randomUUID() });
    this.audit.push(e);
    return clone(e);
  }
  async listAudit(input: { memberId?: string; action?: string; offset: number; limit: number }) {
    const all = this.audit.filter((e) => (!input.memberId || e.memberId === input.memberId) && (!input.action || e.action === input.action)).sort(this.newestFirst((e) => e.createdAt));
    return pageOf(all.map(clone), input.offset, input.limit);
  }

  async getSettingsDoc() {
    return clone(this.settings);
  }
  async saveSettingsDoc(doc: unknown) {
    this.settings = clone(doc);
  }

  async addModeration(input: Omit<ModerationItem, "id" | "status" | "handledBy" | "handledAt">) {
    const m: ModerationItem = this.made({ ...clone(input), id: randomUUID(), status: "open", handledBy: null, handledAt: null });
    this.moderation.set(m.id, m);
    return clone(m);
  }
  async getModeration(id: string) {
    const m = this.moderation.get(id);
    return m ? clone(m) : null;
  }
  async openModeration(targetType: ContentKind, targetId: string) {
    const m = [...this.moderation.values()].find((x) => x.targetType === targetType && x.targetId === targetId && x.status === "open");
    return m ? clone(m) : null;
  }
  async listModeration(input: { status: ModerationStatus; offset: number; limit: number }) {
    const all = [...this.moderation.values()].filter((m) => m.status === input.status);
    all.sort(input.status === "open" ? this.oldestFirst((m) => m.createdAt) : this.newestFirst((m) => m.handledAt ?? m.createdAt));
    return pageOf(all.map(clone), input.offset, input.limit);
  }
  async decideModeration(id: string, input: { status: "approved" | "removed"; at: Date; by: string; note: string | null }) {
    const m = this.moderation.get(id);
    if (!m || m.status !== "open") return null;
    Object.assign(m, { status: input.status, handledAt: input.at, handledBy: input.by, note: input.note ?? m.note });
    return clone(m);
  }

  async addViolation(input: Omit<Violation, "id">) {
    this.violations.push({ ...clone(input), id: randomUUID() });
  }
  async lastViolationAt(memberId: string) {
    const times = this.violations.filter((v) => v.memberId === memberId).map((v) => v.createdAt.getTime());
    return times.length ? new Date(Math.max(...times)) : null;
  }

  async addReport(input: { reporterId: string; targetType: CommunityTargetType; targetId: string; reason: ReportReason; note: string; createdAt: Date }) {
    // One per member and target, ever (the base's unique index).
    if ([...this.reports.values()].some((r) => r.reporterId === input.reporterId && r.targetType === input.targetType && r.targetId === input.targetId)) return null;
    const r: Report = this.made({ ...clone(input), id: randomUUID(), status: "open", handledBy: null, handledAt: null });
    this.reports.set(r.id, r);
    return clone(r);
  }
  async getReport(id: string) {
    const r = this.reports.get(id);
    return r ? clone(r) : null;
  }
  async countOpenReports(targetType: CommunityTargetType, targetId: string) {
    return [...this.reports.values()].filter((x) => x.targetType === targetType && x.targetId === targetId && x.status === "open").length;
  }
  async openReportsOn(targetType: CommunityTargetType, targetId: string) {
    return [...this.reports.values()].filter((x) => x.targetType === targetType && x.targetId === targetId && x.status === "open").sort(this.oldestFirst((x) => x.createdAt)).map(clone);
  }
  async listReports(input: { status: ReportStatus; offset: number; limit: number }) {
    const all = [...this.reports.values()].filter((r) => r.status === input.status);
    all.sort(input.status === "open" ? this.oldestFirst((r) => r.createdAt) : this.newestFirst((r) => r.handledAt ?? r.createdAt));
    return pageOf(all.map(clone), input.offset, input.limit);
  }
  async resolveReport(id: string, input: { status: "actioned" | "dismissed"; at: Date; by: string }) {
    const r = this.reports.get(id);
    if (!r || r.status !== "open") return null;
    Object.assign(r, { status: input.status, handledAt: input.at, handledBy: input.by });
    return clone(r);
  }

  async addNotification(input: Omit<CommunityNotification, "id" | "readAt" | "emailedAt">) {
    const n: CommunityNotification = this.made({ ...clone(input), id: randomUUID(), readAt: null, emailedAt: null });
    this.notifications.set(n.id, n);
    return clone(n);
  }
  async markEmailed(id: string, at: Date) {
    const n = this.notifications.get(id);
    if (n) n.emailedAt = at;
  }
  async listNotifications(memberId: string, input: { unreadOnly?: boolean; offset: number; limit: number }) {
    const all = [...this.notifications.values()].filter((n) => n.memberId === memberId && (!input.unreadOnly || !n.readAt)).sort(this.newestFirst((n) => n.createdAt));
    return pageOf(all.map(clone), input.offset, input.limit);
  }
  async unreadNotifications(memberId: string) {
    return [...this.notifications.values()].filter((n) => n.memberId === memberId && !n.readAt).length;
  }
  async markNotificationsRead(memberId: string, ids: string[] | "all", at: Date) {
    let n = 0;
    for (const x of this.notifications.values()) {
      if (x.memberId !== memberId || x.readAt || (ids !== "all" && !ids.includes(x.id))) continue;
      x.readAt = at;
      n++;
    }
    return n;
  }
  async getNotificationPrefs(memberId: string) {
    const p = this.prefs.get(memberId);
    return p ? clone(p) : null;
  }
  async saveNotificationPrefs(memberId: string, prefs: NotificationPrefs) {
    this.prefs.set(memberId, clone(prefs));
  }
}
