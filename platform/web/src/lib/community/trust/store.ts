import type { CommunityBadge, MemberBadge } from "./badges";
import type { HoldReason } from "./moderation";
import type { NotificationData, NotificationKind, NotificationPrefs } from "./notifications";
import type { AuditAction, AuditEntry, Report, ReportReason, ReportStatus, ReportTarget, VerificationRequest, VerificationStatus } from "./requests";

/**
 * 231 Yallapp Community: where area C keeps its records. One interface, a
 * memory store (tests, memory mode) and a MySQL store (migration 0155+).
 */

/** Content that moderation knows about: what area B stores (and phase 2 adds). */
export type ContentKind = "question" | "answer" | "reply" | "tutorial" | "comment";

export const MODERATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

/** A post waiting in the moderation queue (held by the gate or hidden by reports), and what the admin decided. */
export interface ModerationItem {
  id: number;
  kind: ContentKind;
  contentId: number;
  memberId: number;
  reasons: HoldReason[];
  /** The post's text when it was held, so the queue can show it without asking B. */
  excerpt: string;
  status: ModerationStatus;
  createdAt: Date;
  decidedAt: Date | null;
  decidedBy: number | null;
  /** Told to the member when it is rejected. */
  reason: string | null;
}

/** What moderation remembers about a member: posts that appeared (the first ones are reviewed), their last few texts (duplicates) and their last violation (Blue). */
export interface MemberTrustState {
  memberId: number;
  publishedPosts: number;
  recentTexts: string[];
  lastViolationAt: Date | null;
}

export interface CommunityNotification {
  id: number;
  memberId: number;
  kind: NotificationKind;
  actorId: number | null;
  data: NotificationData;
  /** Where it opens, a path on the Community ("/q/12#a31"). */
  link: string;
  readAt: Date | null;
  emailedAt: Date | null;
  createdAt: Date;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface TrustStore {
  // Badges
  listMemberBadges(memberId: number): Promise<MemberBadge[]>;
  getMemberBadge(id: number): Promise<MemberBadge | null>;
  addMemberBadge(input: Omit<MemberBadge, "id" | "revokedAt" | "revokedBy" | "revokeReason">): Promise<MemberBadge>;
  revokeMemberBadge(id: number, input: { at: Date; by: number | null; reason: string }): Promise<MemberBadge | null>;
  /** Members holding a badge given by the automatic rules (the daily check goes over them too). */
  membersWithAutoBadges(): Promise<number[]>;

  // Verification
  addVerification(input: Omit<VerificationRequest, "id" | "status" | "decidedAt" | "decidedBy" | "reason">): Promise<VerificationRequest>;
  getVerification(id: number): Promise<VerificationRequest | null>;
  latestVerification(memberId: number): Promise<VerificationRequest | null>;
  listVerifications(input: { status?: VerificationStatus; offset: number; limit: number }): Promise<Page<VerificationRequest>>;
  decideVerification(id: number, input: { status: "approved" | "rejected"; at: Date; by: number; reason: string | null }): Promise<VerificationRequest | null>;

  // The audit log (only added to, never changed)
  addAudit(input: Omit<AuditEntry, "id">): Promise<AuditEntry>;
  listAudit(input: { memberId?: number; action?: AuditAction; offset: number; limit: number }): Promise<Page<AuditEntry>>;

  // Settings (one document)
  getSettingsDoc(): Promise<unknown>;
  saveSettingsDoc(doc: unknown, at: Date): Promise<void>;

  // Moderation
  memberTrust(memberId: number): Promise<MemberTrustState>;
  saveMemberTrust(state: MemberTrustState): Promise<void>;
  addModeration(input: Omit<ModerationItem, "id" | "status" | "decidedAt" | "decidedBy" | "reason">): Promise<ModerationItem>;
  getModeration(id: number): Promise<ModerationItem | null>;
  findModeration(kind: ContentKind, contentId: number): Promise<ModerationItem | null>;
  listModeration(input: { status?: ModerationStatus; offset: number; limit: number }): Promise<Page<ModerationItem>>;
  decideModeration(id: number, input: { status: "approved" | "rejected"; at: Date; by: number; reason: string | null }): Promise<ModerationItem | null>;

  // Reports
  addReport(input: Omit<Report, "id" | "status" | "resolvedAt" | "resolvedBy" | "note">): Promise<Report>;
  getReport(id: number): Promise<Report | null>;
  /** The open report from this member on this target, if any (one each). */
  openReportBy(reporterId: number, target: ReportTarget, targetId: number): Promise<Report | null>;
  countOpenReports(target: ReportTarget, targetId: number): Promise<number>;
  listReports(input: { status?: ReportStatus; offset: number; limit: number }): Promise<Page<Report>>;
  resolveReport(id: number, input: { status: "upheld" | "dismissed"; at: Date; by: number; note: string | null }): Promise<Report | null>;
  /** The other open reports on the same target, resolved with it. */
  openReportsOn(target: ReportTarget, targetId: number): Promise<Report[]>;

  // Notifications
  addNotification(input: Omit<CommunityNotification, "id" | "readAt" | "emailedAt">): Promise<CommunityNotification>;
  markEmailed(id: number, at: Date): Promise<void>;
  listNotifications(memberId: number, input: { unreadOnly?: boolean; offset: number; limit: number }): Promise<Page<CommunityNotification>>;
  unreadNotifications(memberId: number): Promise<number>;
  markNotificationsRead(memberId: number, ids: number[] | "all", at: Date): Promise<number>;
  getNotificationPrefs(memberId: number): Promise<NotificationPrefs | null>;
  saveNotificationPrefs(memberId: number, prefs: NotificationPrefs): Promise<void>;
}

/** The reasons a report can give, re-exported for the API's contract. */
export type { ReportReason, CommunityBadge };

const page = <T>(all: T[], offset: number, limit: number): Page<T> => ({ items: all.slice(offset, offset + limit), total: all.length });
const newestFirst = <T extends { id: number }>(a: T, b: T) => b.id - a.id;
const clone = <T>(x: T): T => structuredClone(x);

/** Area C's records in memory (tests, and the platform in memory mode). */
export class MemoryTrustStore implements TrustStore {
  private seq = 0;
  private badges = new Map<number, MemberBadge>();
  private verifications = new Map<number, VerificationRequest>();
  private audit: AuditEntry[] = [];
  private settings: unknown = null;
  private trust = new Map<number, MemberTrustState>();
  private moderation = new Map<number, ModerationItem>();
  private reports = new Map<number, Report>();
  private notifications = new Map<number, CommunityNotification>();
  private prefs = new Map<number, NotificationPrefs>();

  private id() {
    return ++this.seq;
  }

  async listMemberBadges(memberId: number) {
    return [...this.badges.values()].filter((b) => b.memberId === memberId).sort((a, b) => a.id - b.id).map(clone);
  }
  async getMemberBadge(id: number) {
    const b = this.badges.get(id);
    return b ? clone(b) : null;
  }
  async addMemberBadge(input: Omit<MemberBadge, "id" | "revokedAt" | "revokedBy" | "revokeReason">) {
    const b: MemberBadge = { ...clone(input), id: this.id(), revokedAt: null, revokedBy: null, revokeReason: null };
    this.badges.set(b.id, b);
    return clone(b);
  }
  async revokeMemberBadge(id: number, input: { at: Date; by: number | null; reason: string }) {
    const b = this.badges.get(id);
    if (!b || b.revokedAt) return null;
    Object.assign(b, { revokedAt: input.at, revokedBy: input.by, revokeReason: input.reason });
    return clone(b);
  }
  async membersWithAutoBadges() {
    return [...new Set([...this.badges.values()].filter((b) => b.source === "auto" && !b.revokedAt).map((b) => b.memberId))];
  }

  async addVerification(input: Omit<VerificationRequest, "id" | "status" | "decidedAt" | "decidedBy" | "reason">) {
    const r: VerificationRequest = { ...clone(input), id: this.id(), status: "pending", decidedAt: null, decidedBy: null, reason: null };
    this.verifications.set(r.id, r);
    return clone(r);
  }
  async getVerification(id: number) {
    const r = this.verifications.get(id);
    return r ? clone(r) : null;
  }
  async latestVerification(memberId: number) {
    const r = [...this.verifications.values()].filter((x) => x.memberId === memberId).sort(newestFirst)[0];
    return r ? clone(r) : null;
  }
  async listVerifications(input: { status?: VerificationStatus; offset: number; limit: number }) {
    const all = [...this.verifications.values()].filter((r) => !input.status || r.status === input.status);
    // The oldest first while waiting (first come, first served), the newest first otherwise.
    all.sort((a, b) => (input.status === "pending" ? a.id - b.id : b.id - a.id));
    return page(all.map(clone), input.offset, input.limit);
  }
  async decideVerification(id: number, input: { status: "approved" | "rejected"; at: Date; by: number; reason: string | null }) {
    const r = this.verifications.get(id);
    if (!r || r.status !== "pending") return null;
    Object.assign(r, { status: input.status, decidedAt: input.at, decidedBy: input.by, reason: input.reason });
    return clone(r);
  }

  async addAudit(input: Omit<AuditEntry, "id">) {
    const e: AuditEntry = { ...clone(input), id: this.id() };
    this.audit.push(e);
    return clone(e);
  }
  async listAudit(input: { memberId?: number; action?: AuditAction; offset: number; limit: number }) {
    const all = this.audit.filter((e) => (input.memberId === undefined || e.memberId === input.memberId) && (!input.action || e.action === input.action)).sort(newestFirst);
    return page(all.map(clone), input.offset, input.limit);
  }

  async getSettingsDoc() {
    return clone(this.settings);
  }
  async saveSettingsDoc(doc: unknown) {
    this.settings = clone(doc);
  }

  async memberTrust(memberId: number) {
    return clone(this.trust.get(memberId) ?? { memberId, publishedPosts: 0, recentTexts: [], lastViolationAt: null });
  }
  async saveMemberTrust(state: MemberTrustState) {
    this.trust.set(state.memberId, clone(state));
  }
  async addModeration(input: Omit<ModerationItem, "id" | "status" | "decidedAt" | "decidedBy" | "reason">) {
    const m: ModerationItem = { ...clone(input), id: this.id(), status: "pending", decidedAt: null, decidedBy: null, reason: null };
    this.moderation.set(m.id, m);
    return clone(m);
  }
  async getModeration(id: number) {
    const m = this.moderation.get(id);
    return m ? clone(m) : null;
  }
  async findModeration(kind: ContentKind, contentId: number) {
    const m = [...this.moderation.values()].filter((x) => x.kind === kind && x.contentId === contentId).sort(newestFirst)[0];
    return m ? clone(m) : null;
  }
  async listModeration(input: { status?: ModerationStatus; offset: number; limit: number }) {
    const all = [...this.moderation.values()].filter((m) => !input.status || m.status === input.status);
    all.sort((a, b) => (input.status === "pending" ? a.id - b.id : b.id - a.id));
    return page(all.map(clone), input.offset, input.limit);
  }
  async decideModeration(id: number, input: { status: "approved" | "rejected"; at: Date; by: number; reason: string | null }) {
    const m = this.moderation.get(id);
    if (!m || m.status !== "pending") return null;
    Object.assign(m, { status: input.status, decidedAt: input.at, decidedBy: input.by, reason: input.reason });
    return clone(m);
  }

  async addReport(input: Omit<Report, "id" | "status" | "resolvedAt" | "resolvedBy" | "note">) {
    const r: Report = { ...clone(input), id: this.id(), status: "open", resolvedAt: null, resolvedBy: null, note: null };
    this.reports.set(r.id, r);
    return clone(r);
  }
  async getReport(id: number) {
    const r = this.reports.get(id);
    return r ? clone(r) : null;
  }
  async openReportBy(reporterId: number, target: ReportTarget, targetId: number) {
    const r = [...this.reports.values()].find((x) => x.reporterId === reporterId && x.target === target && x.targetId === targetId && x.status === "open");
    return r ? clone(r) : null;
  }
  async countOpenReports(target: ReportTarget, targetId: number) {
    return [...this.reports.values()].filter((x) => x.target === target && x.targetId === targetId && x.status === "open").length;
  }
  async listReports(input: { status?: ReportStatus; offset: number; limit: number }) {
    const all = [...this.reports.values()].filter((r) => !input.status || r.status === input.status);
    all.sort((a, b) => (input.status === "open" ? a.id - b.id : b.id - a.id));
    return page(all.map(clone), input.offset, input.limit);
  }
  async resolveReport(id: number, input: { status: "upheld" | "dismissed"; at: Date; by: number; note: string | null }) {
    const r = this.reports.get(id);
    if (!r || r.status !== "open") return null;
    Object.assign(r, { status: input.status, resolvedAt: input.at, resolvedBy: input.by, note: input.note });
    return clone(r);
  }
  async openReportsOn(target: ReportTarget, targetId: number) {
    return [...this.reports.values()].filter((x) => x.target === target && x.targetId === targetId && x.status === "open").map(clone);
  }

  async addNotification(input: Omit<CommunityNotification, "id" | "readAt" | "emailedAt">) {
    const n: CommunityNotification = { ...clone(input), id: this.id(), readAt: null, emailedAt: null };
    this.notifications.set(n.id, n);
    return clone(n);
  }
  async markEmailed(id: number, at: Date) {
    const n = this.notifications.get(id);
    if (n) n.emailedAt = at;
  }
  async listNotifications(memberId: number, input: { unreadOnly?: boolean; offset: number; limit: number }) {
    const all = [...this.notifications.values()].filter((n) => n.memberId === memberId && (!input.unreadOnly || !n.readAt)).sort(newestFirst);
    return page(all.map(clone), input.offset, input.limit);
  }
  async unreadNotifications(memberId: number) {
    return [...this.notifications.values()].filter((n) => n.memberId === memberId && !n.readAt).length;
  }
  async markNotificationsRead(memberId: number, ids: number[] | "all", at: Date) {
    let n = 0;
    for (const x of this.notifications.values()) {
      if (x.memberId !== memberId || x.readAt || (ids !== "all" && !ids.includes(x.id))) continue;
      x.readAt = at;
      n++;
    }
    return n;
  }
  async getNotificationPrefs(memberId: number) {
    const p = this.prefs.get(memberId);
    return p ? clone(p) : null;
  }
  async saveNotificationPrefs(memberId: number, prefs: NotificationPrefs) {
    this.prefs.set(memberId, clone(prefs));
  }
}
