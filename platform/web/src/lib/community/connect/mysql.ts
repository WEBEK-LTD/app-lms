import { and, asc, count, desc, eq, gt, isNull, like, ne, or, sql, type SQL } from "drizzle-orm";
import {
  communityConversationMembers,
  communityConversations,
  communityGroupMembers,
  communityGroups,
  communityHireRequests,
  communityJobApplications,
  communityJobs,
  communityMessages,
  communityProReviews,
  communityPros,
} from "../../db/community-schema";
import { isDuplicate, type CommunityDb } from "../store/db";
import { YALLAPP_TENANT, type CommunityTenant } from "../types";
import type { ConnectStore } from "./store";
import type { Conversation, ConversationMember, Group, GroupMember, HireRequest, Job, JobApplication, Message, Pro, ProReview } from "./types";

/** `%` and `_` in a search typed by a member are letters, not wildcards. */
const likeText = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function untenanted<T extends { tenantId?: string }>(row: T): Omit<T, "tenantId"> {
  const rest = { ...row };
  delete rest.tenantId;
  return rest;
}

/**
 * 232–234 Area A's "connect" data on MySQL or MariaDB (migration 0160), one
 * tenant's: conversations, groups, pros, hire requests and jobs carry
 * `tenant_id`; their children hang off them.
 */
export class MysqlConnectStore implements ConnectStore {
  constructor(
    private readonly db: CommunityDb,
    readonly tenant: CommunityTenant = YALLAPP_TENANT,
  ) {}

  // ---------------------------------------------------------------- messages

  async createConversation(conversation: Conversation, members: ConversationMember[]) {
    await this.db.transaction(async (tx) => {
      await tx.insert(communityConversations).values({ ...conversation, tenantId: this.tenant });
      if (members.length) await tx.insert(communityConversationMembers).values(members);
    });
    return conversation;
  }
  async getConversation(id: string) {
    const t = communityConversations;
    const [row] = await this.db.select().from(t).where(and(eq(t.tenantId, this.tenant), eq(t.id, id))).limit(1);
    return row ? untenanted(row) : null;
  }
  async findDirect(directKey: string) {
    const t = communityConversations;
    const [row] = await this.db.select().from(t).where(and(eq(t.tenantId, this.tenant), eq(t.directKey, directKey))).limit(1);
    return row ? untenanted(row) : null;
  }
  async updateConversation(id: string, patch: Partial<Pick<Conversation, "title" | "updatedAt" | "lastMessageAt">>) {
    const t = communityConversations;
    if (Object.keys(patch).length) await this.db.update(t).set(patch).where(and(eq(t.tenantId, this.tenant), eq(t.id, id)));
  }
  async listConversationsOf(memberId: string, offset: number, limit: number) {
    const c = communityConversations;
    const m = communityConversationMembers;
    const rows = await this.db
      .select({ c })
      .from(m)
      .innerJoin(c, eq(c.id, m.conversationId))
      .where(and(eq(c.tenantId, this.tenant), eq(m.memberId, memberId), isNull(m.leftAt), isNull(m.hiddenAt)))
      .orderBy(desc(c.lastMessageAt), asc(c.id))
      .limit(limit + 1)
      .offset(offset);
    return rows.map((r) => untenanted(r.c));
  }
  async listConversationMembers(conversationId: string) {
    const m = communityConversationMembers;
    return this.db.select().from(m).where(eq(m.conversationId, conversationId)).orderBy(asc(m.joinedAt), asc(m.memberId));
  }
  async getConversationMember(conversationId: string, memberId: string) {
    const m = communityConversationMembers;
    const [row] = await this.db.select().from(m).where(and(eq(m.conversationId, conversationId), eq(m.memberId, memberId))).limit(1);
    return row ?? null;
  }
  async saveConversationMember(member: ConversationMember) {
    const { joinedAt, leftAt, hiddenAt, lastReadMessageId, lastReadAt, muted } = member;
    await this.db.insert(communityConversationMembers).values(member).onDuplicateKeyUpdate({ set: { joinedAt, leftAt, hiddenAt, lastReadMessageId, lastReadAt, muted } });
  }
  async addMessage(message: Message) {
    await this.db.transaction(async (tx) => {
      await tx.insert(communityMessages).values(message);
      await tx.update(communityConversations).set({ lastMessageAt: message.createdAt, updatedAt: message.createdAt }).where(eq(communityConversations.id, message.conversationId));
      await tx.update(communityConversationMembers).set({ hiddenAt: null }).where(eq(communityConversationMembers.conversationId, message.conversationId));
    });
  }
  async getMessage(id: string) {
    const [row] = await this.db.select().from(communityMessages).where(eq(communityMessages.id, id)).limit(1);
    return row ?? null;
  }
  async listMessages(conversationId: string, offset: number, limit: number) {
    const t = communityMessages;
    return this.db.select().from(t).where(eq(t.conversationId, conversationId)).orderBy(desc(t.createdAt), desc(t.id)).limit(limit + 1).offset(offset);
  }
  async listMessagesAfter(conversationId: string, after: Message, limit: number) {
    const t = communityMessages;
    return this.db
      .select()
      .from(t)
      .where(and(eq(t.conversationId, conversationId), or(gt(t.createdAt, after.createdAt), and(eq(t.createdAt, after.createdAt), gt(t.id, after.id)))))
      .orderBy(asc(t.createdAt), asc(t.id))
      .limit(limit + 1);
  }
  async deleteMessage(id: string, at: Date) {
    await this.db.update(communityMessages).set({ deletedAt: at, body: "", photos: [] }).where(eq(communityMessages.id, id));
  }
  async countUnread(conversationId: string, memberId: string, since: Date | null) {
    const t = communityMessages;
    const [row] = await this.db
      .select({ n: count() })
      .from(t)
      .where(and(eq(t.conversationId, conversationId), ne(t.authorId, memberId), isNull(t.deletedAt), since ? gt(t.createdAt, since) : undefined));
    return row?.n ?? 0;
  }
  async countUnreadConversations(memberId: string) {
    const m = communityConversationMembers;
    const msg = communityMessages;
    const c = communityConversations;
    const [row] = await this.db
      .select({ n: sql<number>`count(distinct ${m.conversationId})` })
      .from(m)
      .innerJoin(c, eq(c.id, m.conversationId))
      .innerJoin(msg, eq(msg.conversationId, m.conversationId))
      .where(
        and(
          eq(c.tenantId, this.tenant),
          eq(m.memberId, memberId),
          isNull(m.leftAt),
          isNull(m.hiddenAt),
          eq(m.muted, false),
          ne(msg.authorId, memberId),
          isNull(msg.deletedAt),
          or(isNull(m.lastReadAt), gt(msg.createdAt, m.lastReadAt)),
        ),
      );
    return Number(row?.n ?? 0);
  }

  // ---------------------------------------------------------------- groups

  async createGroup(group: Group, owner: GroupMember) {
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(communityGroups).values({ ...group, tenantId: this.tenant });
        await tx.insert(communityGroupMembers).values(owner);
      });
      return true;
    } catch (error) {
      if (isDuplicate(error)) return false;
      throw error;
    }
  }
  async getGroup(id: string) {
    const t = communityGroups;
    const [row] = await this.db.select().from(t).where(and(eq(t.tenantId, this.tenant), eq(t.id, id))).limit(1);
    return row ? untenanted(row) : null;
  }
  async getGroupBySlug(slug: string) {
    const t = communityGroups;
    const [row] = await this.db.select().from(t).where(and(eq(t.tenantId, this.tenant), eq(t.slug, slug))).limit(1);
    return row ? untenanted(row) : null;
  }
  async updateGroup(id: string, patch: Partial<Omit<Group, "id" | "createdAt">>) {
    const t = communityGroups;
    if (Object.keys(patch).length) await this.db.update(t).set(patch).where(and(eq(t.tenantId, this.tenant), eq(t.id, id)));
  }
  async deleteGroup(id: string) {
    const t = communityGroups;
    await this.db.delete(t).where(and(eq(t.tenantId, this.tenant), eq(t.id, id)));
  }
  async listGroups(input: { q?: string; memberId?: string; offset: number; limit: number }) {
    const g = communityGroups;
    const q = input.q?.trim() ?? "";
    const match = q ? or(like(g.name, likeText(q)), like(g.description, likeText(q))) : undefined;
    if (input.memberId) {
      const m = communityGroupMembers;
      const rows = await this.db
        .select({ g })
        .from(m)
        .innerJoin(g, eq(g.id, m.groupId))
        .where(and(eq(g.tenantId, this.tenant), eq(m.memberId, input.memberId), eq(m.status, "active"), ne(g.status, "removed"), match))
        .orderBy(desc(g.lastActiveAt), desc(g.memberCount), asc(g.id))
        .limit(input.limit + 1)
        .offset(input.offset);
      return rows.map((r) => untenanted(r.g));
    }
    const rows = await this.db
      .select()
      .from(g)
      .where(and(eq(g.tenantId, this.tenant), eq(g.status, "active"), match))
      .orderBy(desc(g.lastActiveAt), desc(g.memberCount), asc(g.id))
      .limit(input.limit + 1)
      .offset(input.offset);
    return rows.map(untenanted);
  }
  async getGroupMember(groupId: string, memberId: string) {
    const m = communityGroupMembers;
    const [row] = await this.db.select().from(m).where(and(eq(m.groupId, groupId), eq(m.memberId, memberId))).limit(1);
    return row ?? null;
  }
  async saveGroupMember(member: GroupMember) {
    await this.db.insert(communityGroupMembers).values(member).onDuplicateKeyUpdate({ set: { role: member.role, status: member.status, joinedAt: member.joinedAt } });
  }
  async removeGroupMember(groupId: string, memberId: string) {
    const m = communityGroupMembers;
    await this.db.delete(m).where(and(eq(m.groupId, groupId), eq(m.memberId, memberId)));
  }
  async listGroupMembers(groupId: string, input: { status: GroupMember["status"]; role?: GroupMember["role"]; offset: number; limit: number }) {
    const m = communityGroupMembers;
    const roleOrder = sql`case ${m.role} when 'owner' then 0 when 'moderator' then 1 else 2 end`;
    return this.db
      .select()
      .from(m)
      .where(and(eq(m.groupId, groupId), eq(m.status, input.status), input.role ? eq(m.role, input.role) : undefined))
      .orderBy(...(input.status === "active" ? [roleOrder] : []), asc(m.joinedAt), asc(m.memberId))
      .limit(input.limit + 1)
      .offset(input.offset);
  }
  async recountGroup(groupId: string) {
    const m = communityGroupMembers;
    const [row] = await this.db.select({ n: count() }).from(m).where(and(eq(m.groupId, groupId), eq(m.status, "active")));
    await this.db.update(communityGroups).set({ memberCount: row?.n ?? 0 }).where(eq(communityGroups.id, groupId));
  }

  // ---------------------------------------------------------------- pros

  async getPro(memberId: string) {
    const t = communityPros;
    const [row] = await this.db.select().from(t).where(and(eq(t.tenantId, this.tenant), eq(t.memberId, memberId))).limit(1);
    return row ? untenanted(row) : null;
  }
  async savePro(pro: Pro) {
    const { headline, about, services, skills, availability, showcaseIds, open, ratingSum, reviewCount, doneCount, updatedAt } = pro;
    await this.db
      .insert(communityPros)
      .values({ ...pro, tenantId: this.tenant })
      .onDuplicateKeyUpdate({ set: { headline, about, services, skills, availability, showcaseIds, open, ratingSum, reviewCount, doneCount, updatedAt } });
  }
  async listPros(input: { q?: string; skill?: string; available?: boolean; offset: number; limit: number }) {
    const p = communityPros;
    const q = input.q?.trim() ?? "";
    const skill = input.skill?.trim().toLowerCase() ?? "";
    const conditions: (SQL | undefined)[] = [eq(p.tenantId, this.tenant), eq(p.open, true)];
    if (q) conditions.push(or(like(p.headline, likeText(q)), like(p.about, likeText(q)), like(p.skills, likeText(q))));
    // Skills are kept as a JSON list: one exact name, any case.
    if (skill) conditions.push(sql`json_search(lower(${p.skills}), 'one', ${skill}) is not null`);
    if (input.available !== undefined) conditions.push(input.available ? eq(p.availability, "available") : ne(p.availability, "available"));
    const rows = await this.db
      .select()
      .from(p)
      .where(and(...conditions))
      .orderBy(sql`case when ${p.reviewCount} = 0 then 0 else ${p.ratingSum} / ${p.reviewCount} end desc`, desc(p.reviewCount), desc(p.updatedAt))
      .limit(input.limit + 1)
      .offset(input.offset);
    return rows.map(untenanted);
  }
  async createHire(request: HireRequest) {
    await this.db.insert(communityHireRequests).values({ ...request, tenantId: this.tenant });
  }
  async getHire(id: string) {
    const t = communityHireRequests;
    const [row] = await this.db.select().from(t).where(and(eq(t.tenantId, this.tenant), eq(t.id, id))).limit(1);
    return row ? untenanted(row) : null;
  }
  async updateHire(id: string, patch: Partial<Pick<HireRequest, "status" | "updatedAt">>) {
    const t = communityHireRequests;
    await this.db.update(t).set(patch).where(and(eq(t.tenantId, this.tenant), eq(t.id, id)));
  }
  async listHires(input: { clientId?: string; proId?: string; offset: number; limit: number }) {
    const t = communityHireRequests;
    const rows = await this.db
      .select()
      .from(t)
      .where(and(eq(t.tenantId, this.tenant), input.clientId ? eq(t.clientId, input.clientId) : undefined, input.proId ? eq(t.proId, input.proId) : undefined))
      .orderBy(desc(t.createdAt), asc(t.id))
      .limit(input.limit + 1)
      .offset(input.offset);
    return rows.map(untenanted);
  }
  async getReview(requestId: string) {
    const [row] = await this.db.select().from(communityProReviews).where(eq(communityProReviews.requestId, requestId)).limit(1);
    return row ?? null;
  }
  async saveReview(review: ProReview) {
    const { rating, text, status, updatedAt } = review;
    await this.db.insert(communityProReviews).values(review).onDuplicateKeyUpdate({ set: { rating, text, status, updatedAt } });
  }
  async listReviews(proId: string, offset: number, limit: number) {
    const t = communityProReviews;
    return this.db.select().from(t).where(and(eq(t.proId, proId), eq(t.status, "published"))).orderBy(desc(t.createdAt), asc(t.requestId)).limit(limit + 1).offset(offset);
  }
  async recountPro(memberId: string) {
    const r = communityProReviews;
    const h = communityHireRequests;
    const [reviews] = await this.db.select({ n: count(), sum: sql<number>`coalesce(sum(${r.rating}), 0)` }).from(r).where(and(eq(r.proId, memberId), eq(r.status, "published")));
    const [done] = await this.db.select({ n: count() }).from(h).where(and(eq(h.tenantId, this.tenant), eq(h.proId, memberId), eq(h.status, "done")));
    await this.db
      .update(communityPros)
      .set({ ratingSum: Number(reviews?.sum ?? 0), reviewCount: reviews?.n ?? 0, doneCount: done?.n ?? 0 })
      .where(and(eq(communityPros.tenantId, this.tenant), eq(communityPros.memberId, memberId)));
  }

  // ---------------------------------------------------------------- jobs

  async createJob(job: Job) {
    await this.db.insert(communityJobs).values({ ...job, tenantId: this.tenant });
  }
  async getJob(id: string) {
    const t = communityJobs;
    const [row] = await this.db.select().from(t).where(and(eq(t.tenantId, this.tenant), eq(t.id, id))).limit(1);
    return row ? untenanted(row) : null;
  }
  async updateJob(id: string, patch: Partial<Omit<Job, "id" | "posterId" | "createdAt">>) {
    const t = communityJobs;
    if (Object.keys(patch).length) await this.db.update(t).set(patch).where(and(eq(t.tenantId, this.tenant), eq(t.id, id)));
  }
  async deleteJob(id: string) {
    const t = communityJobs;
    await this.db.delete(t).where(and(eq(t.tenantId, this.tenant), eq(t.id, id)));
  }
  async listJobs(input: { q?: string; type?: Job["type"]; remote?: boolean; skill?: string; posterId?: string; offset: number; limit: number }) {
    const j = communityJobs;
    const q = input.q?.trim() ?? "";
    const skill = input.skill?.trim().toLowerCase() ?? "";
    const rows = await this.db
      .select()
      .from(j)
      .where(
        and(
          eq(j.tenantId, this.tenant),
          input.posterId ? and(eq(j.posterId, input.posterId), ne(j.status, "removed")) : eq(j.status, "open"),
          q ? or(like(j.title, likeText(q)), like(j.description, likeText(q))) : undefined,
          input.type ? eq(j.type, input.type) : undefined,
          input.remote === undefined ? undefined : eq(j.remote, input.remote),
          skill ? sql`json_search(lower(${j.skills}), 'one', ${skill}) is not null` : undefined,
        ),
      )
      .orderBy(desc(j.createdAt), asc(j.id))
      .limit(input.limit + 1)
      .offset(input.offset);
    return rows.map(untenanted);
  }
  async createApplication(application: JobApplication) {
    try {
      await this.db.insert(communityJobApplications).values(application);
      return true;
    } catch (error) {
      if (isDuplicate(error)) return false;
      throw error;
    }
  }
  async getApplication(id: string) {
    const [row] = await this.db.select().from(communityJobApplications).where(eq(communityJobApplications.id, id)).limit(1);
    return row ?? null;
  }
  async getApplicationOf(jobId: string, applicantId: string) {
    const t = communityJobApplications;
    const [row] = await this.db.select().from(t).where(and(eq(t.jobId, jobId), eq(t.applicantId, applicantId))).limit(1);
    return row ?? null;
  }
  async updateApplication(id: string, patch: Partial<Pick<JobApplication, "status" | "updatedAt">>) {
    await this.db.update(communityJobApplications).set(patch).where(eq(communityJobApplications.id, id));
  }
  async listApplications(input: { jobId?: string; applicantId?: string; offset: number; limit: number }) {
    const a = communityJobApplications;
    const j = communityJobs;
    // Only this tenant's jobs: an applicant's own list joins them.
    const rows = await this.db
      .select({ a })
      .from(a)
      .innerJoin(j, eq(j.id, a.jobId))
      .where(and(eq(j.tenantId, this.tenant), input.jobId ? eq(a.jobId, input.jobId) : undefined, input.applicantId ? eq(a.applicantId, input.applicantId) : undefined))
      .orderBy(desc(a.createdAt), asc(a.id))
      .limit(input.limit + 1)
      .offset(input.offset);
    return rows.map((r) => r.a);
  }
  async recountJob(jobId: string) {
    const a = communityJobApplications;
    const [row] = await this.db.select({ n: count() }).from(a).where(and(eq(a.jobId, jobId), ne(a.status, "withdrawn")));
    await this.db.update(communityJobs).set({ applicationCount: row?.n ?? 0 }).where(eq(communityJobs.id, jobId));
  }
}
