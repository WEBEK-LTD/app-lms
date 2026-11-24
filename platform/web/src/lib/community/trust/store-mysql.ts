import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, inArray, isNull, max, type SQL } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  communityAuditLog,
  communityBadges,
  communityModerationItems,
  communityNotificationPrefs,
  communityNotifications,
  communityReports,
  communitySettings,
  communityVerificationRequests,
  communityViolations,
} from "../../db/community-schema";
import type { CommunityTargetType } from "../types";
import type { MemberBadge } from "./badges";
import type { NotificationKind, NotificationPrefs } from "./notifications";
import type { AuditAction, AuditEntry, Report, ReportReason, ReportStatus, VerificationRequest, VerificationStatus } from "./requests";
import type { CommunityNotification, ContentKind, ModerationItem, ModerationStatus, NewBadge, Page, TrustStore, Violation } from "./store";

/**
 * 231 Yallapp Community, area C: its records in MySQL, in the base's tables
 * (migration 0155). On the same database connection as the rest of the
 * Community (the base's store hands it over).
 */

// The base's tables and their types; drizzle reads the schema from them.
type Db = MySql2Database<Record<string, unknown>>;

/** The settings' row in community_settings. */
const SETTINGS_KEY = "trust";

/** One page from `rows` fetched one past the limit: the extra row says there is a next page. */
function paged<T>(rows: T[], offset: number, limit: number): Page<T> {
  return { items: rows.slice(0, limit), next: rows.length > limit ? offset + limit : null };
}

const badgeOf = (r: typeof communityBadges.$inferSelect): MemberBadge => ({
  id: r.id,
  memberId: r.memberId,
  badge: r.badge,
  source: r.source,
  reason: r.reason ?? null,
  grantedAt: r.grantedAt,
  grantedBy: r.grantedBy ?? null,
  expiresAt: r.expiresAt ?? null,
  revokedAt: r.revokedAt ?? null,
  revokedBy: r.revokedBy ?? null,
  revokeReason: r.revokeReason ?? null,
  details: r.details ?? null,
});

const verificationOf = (r: typeof communityVerificationRequests.$inferSelect): VerificationRequest => ({
  id: r.id,
  memberId: r.memberId,
  fullName: r.fullName,
  idProofKey: r.idProofKey,
  portfolioLinks: r.portfolioLinks,
  apps: r.apps,
  status: r.status,
  reason: r.reason ?? null,
  reviewedBy: r.reviewedBy ?? null,
  reviewedAt: r.reviewedAt ?? null,
  createdAt: r.createdAt,
});

const auditOf = (r: typeof communityAuditLog.$inferSelect): AuditEntry => ({
  id: r.id,
  actorId: r.actorId ?? null,
  action: r.action as AuditAction,
  memberId: r.memberId ?? null,
  targetType: r.targetType ?? null,
  targetId: r.targetId ?? null,
  reason: r.reason ?? null,
  details: r.details ?? null,
  createdAt: r.createdAt,
});

const moderationOf = (r: typeof communityModerationItems.$inferSelect): ModerationItem => ({
  id: r.id,
  targetType: r.targetType as ContentKind,
  targetId: r.targetId,
  authorId: r.authorId ?? null,
  cause: r.cause,
  status: r.status,
  note: r.note ?? null,
  handledBy: r.handledBy ?? null,
  handledAt: r.handledAt ?? null,
  createdAt: r.createdAt,
});

const reportOf = (r: typeof communityReports.$inferSelect): Report => ({
  id: r.id,
  reporterId: r.reporterId,
  targetType: r.targetType,
  targetId: r.targetId,
  reason: r.reason,
  note: r.note,
  status: r.status,
  handledBy: r.handledBy ?? null,
  handledAt: r.handledAt ?? null,
  createdAt: r.createdAt,
});

const notificationOf = (r: typeof communityNotifications.$inferSelect): CommunityNotification => ({
  id: r.id,
  memberId: r.memberId,
  kind: r.kind as NotificationKind,
  actorId: r.actorId ?? null,
  targetType: r.targetType ?? null,
  targetId: r.targetId ?? null,
  data: { link: "/", ...((r.data ?? {}) as Record<string, unknown>) } as CommunityNotification["data"],
  readAt: r.readAt ?? null,
  emailedAt: r.emailedAt ?? null,
  createdAt: r.createdAt,
});

/** A duplicate key (the base's unique indexes): the row is already there. */
function isDuplicate(error: unknown): boolean {
  const e = error as { code?: string; errno?: number; cause?: { code?: string; errno?: number } };
  return e?.code === "ER_DUP_ENTRY" || e?.errno === 1062 || e?.cause?.code === "ER_DUP_ENTRY" || e?.cause?.errno === 1062;
}

export class MysqlTrustStore implements TrustStore {
  constructor(private readonly db: Db) {}

  async listMemberBadges(memberId: string) {
    const rows = await this.db.select().from(communityBadges).where(eq(communityBadges.memberId, memberId)).orderBy(asc(communityBadges.grantedAt));
    return rows.map(badgeOf);
  }
  async addMemberBadge(input: NewBadge) {
    const row = { id: randomUUID(), memberId: input.memberId, badge: input.badge, source: input.source, details: input.details, grantedBy: input.grantedBy, reason: input.reason, expiresAt: input.expiresAt, grantedAt: input.grantedAt, revokedAt: null, revokedBy: null, revokeReason: null };
    await this.db.insert(communityBadges).values(row);
    return badgeOf(row);
  }
  async revokeMemberBadge(id: string, input: { at: Date; by: string | null; reason: string }) {
    const [res] = await this.db.update(communityBadges).set({ revokedAt: input.at, revokedBy: input.by, revokeReason: input.reason }).where(and(eq(communityBadges.id, id), isNull(communityBadges.revokedAt)));
    if (!res.affectedRows) return null;
    const [row] = await this.db.select().from(communityBadges).where(eq(communityBadges.id, id));
    return row ? badgeOf(row) : null;
  }
  async membersWithAutoBadges() {
    const rows = await this.db.selectDistinct({ memberId: communityBadges.memberId }).from(communityBadges).where(and(eq(communityBadges.source, "auto"), isNull(communityBadges.revokedAt)));
    return rows.map((r) => r.memberId);
  }

  async addVerification(input: Omit<VerificationRequest, "id" | "status" | "reason" | "reviewedBy" | "reviewedAt">) {
    const row = { id: randomUUID(), ...input, status: "pending" as const, reason: null, reviewedBy: null, reviewedAt: null };
    await this.db.insert(communityVerificationRequests).values(row);
    return verificationOf(row);
  }
  async getVerification(id: string) {
    const [row] = await this.db.select().from(communityVerificationRequests).where(eq(communityVerificationRequests.id, id));
    return row ? verificationOf(row) : null;
  }
  async latestVerification(memberId: string) {
    const [row] = await this.db.select().from(communityVerificationRequests).where(eq(communityVerificationRequests.memberId, memberId)).orderBy(desc(communityVerificationRequests.createdAt)).limit(1);
    return row ? verificationOf(row) : null;
  }
  async listVerifications(input: { status: VerificationStatus; offset: number; limit: number }) {
    const t = communityVerificationRequests;
    const order = input.status === "pending" ? [asc(t.createdAt), asc(t.id)] : [desc(t.reviewedAt), desc(t.createdAt)];
    const rows = await this.db.select().from(t).where(eq(t.status, input.status)).orderBy(...order).limit(input.limit + 1).offset(input.offset);
    return paged(rows.map(verificationOf), input.offset, input.limit);
  }
  async decideVerification(id: string, input: { status: "approved" | "rejected"; at: Date; by: string; reason: string | null }) {
    const t = communityVerificationRequests;
    const [res] = await this.db.update(t).set({ status: input.status, reviewedAt: input.at, reviewedBy: input.by, reason: input.reason }).where(and(eq(t.id, id), eq(t.status, "pending")));
    return res.affectedRows ? this.getVerification(id) : null;
  }

  async addAudit(input: Omit<AuditEntry, "id">) {
    const row = { id: randomUUID(), ...input };
    await this.db.insert(communityAuditLog).values(row);
    return auditOf(row);
  }
  async listAudit(input: { memberId?: string; action?: string; offset: number; limit: number }) {
    const t = communityAuditLog;
    const where: SQL[] = [];
    if (input.memberId) where.push(eq(t.memberId, input.memberId));
    if (input.action) where.push(eq(t.action, input.action));
    const rows = await this.db.select().from(t).where(where.length ? and(...where) : undefined).orderBy(desc(t.createdAt), desc(t.id)).limit(input.limit + 1).offset(input.offset);
    return paged(rows.map(auditOf), input.offset, input.limit);
  }

  async getSettingsDoc() {
    const [row] = await this.db.select().from(communitySettings).where(eq(communitySettings.key, SETTINGS_KEY));
    return row?.value ?? null;
  }
  async saveSettingsDoc(doc: unknown, input: { at: Date; by: string | null }) {
    await this.db.insert(communitySettings).values({ key: SETTINGS_KEY, value: doc, updatedBy: input.by, updatedAt: input.at }).onDuplicateKeyUpdate({ set: { value: doc, updatedBy: input.by, updatedAt: input.at } });
  }

  async addModeration(input: Omit<ModerationItem, "id" | "status" | "handledBy" | "handledAt">) {
    const t = communityModerationItems;
    const row = { id: randomUUID(), ...input, status: "open" as const, handledBy: null, handledAt: null };
    try {
      await this.db.insert(t).values(row);
      return moderationOf(row);
    } catch (error) {
      // Held for the same cause before (the base's unique index): open it again.
      if (!isDuplicate(error)) throw error;
      await this.db.update(t).set({ status: "open", note: input.note, authorId: input.authorId, handledBy: null, handledAt: null, createdAt: input.createdAt }).where(and(eq(t.targetType, input.targetType), eq(t.targetId, input.targetId), eq(t.cause, input.cause)));
      const [again] = await this.db.select().from(t).where(and(eq(t.targetType, input.targetType), eq(t.targetId, input.targetId), eq(t.cause, input.cause)));
      return moderationOf(again!);
    }
  }
  async getModeration(id: string) {
    const [row] = await this.db.select().from(communityModerationItems).where(eq(communityModerationItems.id, id));
    return row ? moderationOf(row) : null;
  }
  async openModeration(targetType: ContentKind, targetId: string) {
    const t = communityModerationItems;
    const [row] = await this.db.select().from(t).where(and(eq(t.targetType, targetType), eq(t.targetId, targetId), eq(t.status, "open"))).limit(1);
    return row ? moderationOf(row) : null;
  }
  async listModeration(input: { status: ModerationStatus; offset: number; limit: number }) {
    const t = communityModerationItems;
    const order = input.status === "open" ? [asc(t.createdAt), asc(t.id)] : [desc(t.handledAt), desc(t.createdAt)];
    const rows = await this.db.select().from(t).where(eq(t.status, input.status)).orderBy(...order).limit(input.limit + 1).offset(input.offset);
    return paged(rows.map(moderationOf), input.offset, input.limit);
  }
  async decideModeration(id: string, input: { status: "approved" | "removed"; at: Date; by: string; note: string | null }) {
    const t = communityModerationItems;
    const set = { status: input.status, handledAt: input.at, handledBy: input.by, ...(input.note !== null ? { note: input.note } : {}) };
    const [res] = await this.db.update(t).set(set).where(and(eq(t.id, id), eq(t.status, "open")));
    return res.affectedRows ? this.getModeration(id) : null;
  }

  async addViolation(input: Omit<Violation, "id">) {
    await this.db.insert(communityViolations).values({ id: randomUUID(), ...input });
  }
  async lastViolationAt(memberId: string) {
    const [row] = await this.db.select({ at: max(communityViolations.createdAt) }).from(communityViolations).where(eq(communityViolations.memberId, memberId));
    return row?.at ?? null;
  }

  async addReport(input: { reporterId: string; targetType: CommunityTargetType; targetId: string; reason: ReportReason; note: string; createdAt: Date }) {
    const row = { id: randomUUID(), ...input, status: "open" as const, handledBy: null, handledAt: null };
    try {
      await this.db.insert(communityReports).values(row);
    } catch (error) {
      if (isDuplicate(error)) return null;
      throw error;
    }
    return reportOf(row);
  }
  async getReport(id: string) {
    const [row] = await this.db.select().from(communityReports).where(eq(communityReports.id, id));
    return row ? reportOf(row) : null;
  }
  async countOpenReports(targetType: CommunityTargetType, targetId: string) {
    const t = communityReports;
    const [row] = await this.db.select({ n: count() }).from(t).where(and(eq(t.targetType, targetType), eq(t.targetId, targetId), eq(t.status, "open")));
    return Number(row?.n ?? 0);
  }
  async openReportsOn(targetType: CommunityTargetType, targetId: string) {
    const t = communityReports;
    const rows = await this.db.select().from(t).where(and(eq(t.targetType, targetType), eq(t.targetId, targetId), eq(t.status, "open"))).orderBy(asc(t.createdAt));
    return rows.map(reportOf);
  }
  async listReports(input: { status: ReportStatus; offset: number; limit: number }) {
    const t = communityReports;
    const order = input.status === "open" ? [asc(t.createdAt), asc(t.id)] : [desc(t.handledAt), desc(t.createdAt)];
    const rows = await this.db.select().from(t).where(eq(t.status, input.status)).orderBy(...order).limit(input.limit + 1).offset(input.offset);
    return paged(rows.map(reportOf), input.offset, input.limit);
  }
  async resolveReport(id: string, input: { status: "actioned" | "dismissed"; at: Date; by: string }) {
    const t = communityReports;
    const [res] = await this.db.update(t).set({ status: input.status, handledAt: input.at, handledBy: input.by }).where(and(eq(t.id, id), eq(t.status, "open")));
    return res.affectedRows ? this.getReport(id) : null;
  }

  async addNotification(input: Omit<CommunityNotification, "id" | "readAt" | "emailedAt">) {
    const row = { id: randomUUID(), memberId: input.memberId, kind: input.kind, actorId: input.actorId, targetType: input.targetType, targetId: input.targetId, data: input.data as unknown as Record<string, unknown>, readAt: null, emailedAt: null, createdAt: input.createdAt };
    await this.db.insert(communityNotifications).values(row);
    return notificationOf(row);
  }
  async markEmailed(id: string, at: Date) {
    await this.db.update(communityNotifications).set({ emailedAt: at }).where(eq(communityNotifications.id, id));
  }
  async listNotifications(memberId: string, input: { unreadOnly?: boolean; offset: number; limit: number }) {
    const t = communityNotifications;
    const where = input.unreadOnly ? and(eq(t.memberId, memberId), isNull(t.readAt)) : eq(t.memberId, memberId);
    const rows = await this.db.select().from(t).where(where).orderBy(desc(t.createdAt), desc(t.id)).limit(input.limit + 1).offset(input.offset);
    return paged(rows.map(notificationOf), input.offset, input.limit);
  }
  async unreadNotifications(memberId: string) {
    const t = communityNotifications;
    const [row] = await this.db.select({ n: count() }).from(t).where(and(eq(t.memberId, memberId), isNull(t.readAt)));
    return Number(row?.n ?? 0);
  }
  async markNotificationsRead(memberId: string, ids: string[] | "all", at: Date) {
    const t = communityNotifications;
    if (ids !== "all" && !ids.length) return 0;
    const where = ids === "all" ? and(eq(t.memberId, memberId), isNull(t.readAt)) : and(eq(t.memberId, memberId), isNull(t.readAt), inArray(t.id, ids));
    const [res] = await this.db.update(t).set({ readAt: at }).where(where);
    return res.affectedRows;
  }
  async getNotificationPrefs(memberId: string) {
    const [row] = await this.db.select().from(communityNotificationPrefs).where(eq(communityNotificationPrefs.memberId, memberId));
    return row ? (row.email as NotificationPrefs) : null;
  }
  async saveNotificationPrefs(memberId: string, prefs: NotificationPrefs, at: Date) {
    const email = prefs as Record<string, boolean>;
    await this.db.insert(communityNotificationPrefs).values({ memberId, email, updatedAt: at }).onDuplicateKeyUpdate({ set: { email, updatedAt: at } });
  }
}
