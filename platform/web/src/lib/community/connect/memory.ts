import type { ConnectStore } from "./store";
import type { Conversation, ConversationMember, Group, GroupMember, HireRequest, Job, JobApplication, Message, Pro, ProReview } from "./types";

const ROLE_ORDER = { owner: 0, moderator: 1, member: 2 } as const;
const after = (a: Message, b: Message) => a.createdAt.getTime() > b.createdAt.getTime() || (a.createdAt.getTime() === b.createdAt.getTime() && a.id > b.id);
const byTimeAsc = (a: Message, b: Message) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const has = (text: string, q: string) => text.toLowerCase().includes(q.toLowerCase());
const page = <T>(rows: T[], offset: number, limit: number) => rows.slice(offset, offset + limit + 1);

/** 232–234 Area A's "connect" data in memory (tests, local runs); one tenant's per instance. */
export class MemoryConnectStore implements ConnectStore {
  private conversations = new Map<string, Conversation>();
  private chatMembers = new Map<string, ConversationMember>();
  private messages = new Map<string, Message>();
  private groups = new Map<string, Group>();
  private groupMembers = new Map<string, GroupMember>();
  private pros = new Map<string, Pro>();
  private hires = new Map<string, HireRequest>();
  private reviews = new Map<string, ProReview>();
  private jobs = new Map<string, Job>();
  private applications = new Map<string, JobApplication>();

  // ---------------------------------------------------------------- messages

  async createConversation(conversation: Conversation, members: ConversationMember[]) {
    this.conversations.set(conversation.id, { ...conversation });
    for (const m of members) this.chatMembers.set(`${m.conversationId}:${m.memberId}`, { ...m });
    return conversation;
  }
  async getConversation(id: string) {
    const c = this.conversations.get(id);
    return c ? { ...c } : null;
  }
  async findDirect(directKey: string) {
    const c = [...this.conversations.values()].find((x) => x.directKey === directKey);
    return c ? { ...c } : null;
  }
  async updateConversation(id: string, patch: Partial<Pick<Conversation, "title" | "updatedAt" | "lastMessageAt">>) {
    const c = this.conversations.get(id);
    if (c) Object.assign(c, patch);
  }
  async listConversationsOf(memberId: string, offset: number, limit: number) {
    const mine = [...this.chatMembers.values()].filter((m) => m.memberId === memberId && !m.leftAt && !m.hiddenAt).map((m) => this.conversations.get(m.conversationId)!);
    mine.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime() || (a.id < b.id ? -1 : 1));
    return page(mine, offset, limit).map((c) => ({ ...c }));
  }
  async listConversationMembers(conversationId: string) {
    return [...this.chatMembers.values()].filter((m) => m.conversationId === conversationId).sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime()).map((m) => ({ ...m }));
  }
  async getConversationMember(conversationId: string, memberId: string) {
    const m = this.chatMembers.get(`${conversationId}:${memberId}`);
    return m ? { ...m } : null;
  }
  async saveConversationMember(member: ConversationMember) {
    this.chatMembers.set(`${member.conversationId}:${member.memberId}`, { ...member });
  }
  async addMessage(message: Message) {
    this.messages.set(message.id, { ...message, photos: [...message.photos] });
    const c = this.conversations.get(message.conversationId);
    if (c) Object.assign(c, { lastMessageAt: message.createdAt, updatedAt: message.createdAt });
    for (const m of this.chatMembers.values()) if (m.conversationId === message.conversationId && m.hiddenAt) m.hiddenAt = null;
  }
  async getMessage(id: string) {
    const m = this.messages.get(id);
    return m ? { ...m } : null;
  }
  private messagesOf(conversationId: string) {
    return [...this.messages.values()].filter((m) => m.conversationId === conversationId).sort(byTimeAsc);
  }
  async listMessages(conversationId: string, offset: number, limit: number) {
    return page(this.messagesOf(conversationId).reverse(), offset, limit).map((m) => ({ ...m }));
  }
  async listMessagesAfter(conversationId: string, since: Message, limit: number) {
    return this.messagesOf(conversationId).filter((m) => after(m, since)).slice(0, limit + 1).map((m) => ({ ...m }));
  }
  async deleteMessage(id: string, at: Date) {
    const m = this.messages.get(id);
    if (m) Object.assign(m, { deletedAt: at, body: "", photos: [] });
  }
  async countUnread(conversationId: string, memberId: string, since: Date | null) {
    return this.messagesOf(conversationId).filter((m) => m.authorId !== memberId && !m.deletedAt && (!since || m.createdAt.getTime() > since.getTime())).length;
  }
  async countUnreadConversations(memberId: string) {
    let n = 0;
    for (const m of this.chatMembers.values()) {
      if (m.memberId !== memberId || m.leftAt || m.hiddenAt || m.muted) continue;
      if ((await this.countUnread(m.conversationId, memberId, m.lastReadAt)) > 0) n += 1;
    }
    return n;
  }

  // ---------------------------------------------------------------- groups

  async createGroup(group: Group, owner: GroupMember) {
    if ([...this.groups.values()].some((g) => g.slug === group.slug)) return false;
    this.groups.set(group.id, { ...group });
    this.groupMembers.set(`${owner.groupId}:${owner.memberId}`, { ...owner });
    return true;
  }
  async getGroup(id: string) {
    const g = this.groups.get(id);
    return g ? { ...g } : null;
  }
  async getGroupBySlug(slug: string) {
    const g = [...this.groups.values()].find((x) => x.slug === slug);
    return g ? { ...g } : null;
  }
  async updateGroup(id: string, patch: Partial<Omit<Group, "id" | "createdAt">>) {
    const g = this.groups.get(id);
    if (g) Object.assign(g, patch);
  }
  async deleteGroup(id: string) {
    this.groups.delete(id);
    for (const [k, m] of this.groupMembers) if (m.groupId === id) this.groupMembers.delete(k);
  }
  async listGroups(input: { q?: string; memberId?: string; offset: number; limit: number }) {
    const q = input.q?.trim() ?? "";
    let rows = [...this.groups.values()];
    if (input.memberId) {
      const mine = new Set([...this.groupMembers.values()].filter((m) => m.memberId === input.memberId && m.status === "active").map((m) => m.groupId));
      rows = rows.filter((g) => mine.has(g.id) && g.status !== "removed");
    } else rows = rows.filter((g) => g.status === "active");
    if (q) rows = rows.filter((g) => has(g.name, q) || has(g.description, q));
    rows.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime() || b.memberCount - a.memberCount || (a.id < b.id ? -1 : 1));
    return page(rows, input.offset, input.limit).map((g) => ({ ...g }));
  }
  async getGroupMember(groupId: string, memberId: string) {
    const m = this.groupMembers.get(`${groupId}:${memberId}`);
    return m ? { ...m } : null;
  }
  async saveGroupMember(member: GroupMember) {
    this.groupMembers.set(`${member.groupId}:${member.memberId}`, { ...member });
  }
  async removeGroupMember(groupId: string, memberId: string) {
    this.groupMembers.delete(`${groupId}:${memberId}`);
  }
  async listGroupMembers(groupId: string, input: { status: GroupMember["status"]; role?: GroupMember["role"]; offset: number; limit: number }) {
    const rows = [...this.groupMembers.values()]
      .filter((m) => m.groupId === groupId && m.status === input.status && (!input.role || m.role === input.role))
      .sort((a, b) => (input.status === "active" ? ROLE_ORDER[a.role] - ROLE_ORDER[b.role] : 0) || a.joinedAt.getTime() - b.joinedAt.getTime() || (a.memberId < b.memberId ? -1 : 1));
    return page(rows, input.offset, input.limit).map((m) => ({ ...m }));
  }
  async recountGroup(groupId: string) {
    const g = this.groups.get(groupId);
    if (g) g.memberCount = [...this.groupMembers.values()].filter((m) => m.groupId === groupId && m.status === "active").length;
  }

  // ---------------------------------------------------------------- pros

  async getPro(memberId: string) {
    const p = this.pros.get(memberId);
    return p ? structuredClone(p) : null;
  }
  async savePro(pro: Pro) {
    this.pros.set(pro.memberId, structuredClone(pro));
  }
  async listPros(input: { q?: string; skill?: string; available?: boolean; offset: number; limit: number }) {
    const q = input.q?.trim() ?? "";
    const skill = input.skill?.trim().toLowerCase() ?? "";
    const rows = [...this.pros.values()]
      .filter((p) => p.open)
      .filter((p) => !q || has(p.headline, q) || has(p.about, q) || p.skills.some((s) => has(s, q)))
      .filter((p) => !skill || p.skills.some((s) => s.toLowerCase() === skill))
      .filter((p) => input.available === undefined || (p.availability === "available") === input.available)
      .sort((a, b) => avg(b) - avg(a) || b.reviewCount - a.reviewCount || b.updatedAt.getTime() - a.updatedAt.getTime());
    return page(rows, input.offset, input.limit).map((p) => structuredClone(p));
  }
  async createHire(request: HireRequest) {
    this.hires.set(request.id, { ...request });
  }
  async getHire(id: string) {
    const h = this.hires.get(id);
    return h ? { ...h } : null;
  }
  async updateHire(id: string, patch: Partial<Pick<HireRequest, "status" | "updatedAt">>) {
    const h = this.hires.get(id);
    if (h) Object.assign(h, patch);
  }
  async listHires(input: { clientId?: string; proId?: string; offset: number; limit: number }) {
    const rows = [...this.hires.values()]
      .filter((h) => (!input.clientId || h.clientId === input.clientId) && (!input.proId || h.proId === input.proId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? -1 : 1));
    return page(rows, input.offset, input.limit).map((h) => ({ ...h }));
  }
  async getReview(requestId: string) {
    const r = this.reviews.get(requestId);
    return r ? { ...r } : null;
  }
  async saveReview(review: ProReview) {
    this.reviews.set(review.requestId, { ...review });
  }
  async listReviews(proId: string, offset: number, limit: number) {
    const rows = [...this.reviews.values()].filter((r) => r.proId === proId && r.status === "published").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return page(rows, offset, limit).map((r) => ({ ...r }));
  }
  async recountPro(memberId: string) {
    const p = this.pros.get(memberId);
    if (!p) return;
    const reviews = [...this.reviews.values()].filter((r) => r.proId === memberId && r.status === "published");
    p.ratingSum = reviews.reduce((n, r) => n + r.rating, 0);
    p.reviewCount = reviews.length;
    p.doneCount = [...this.hires.values()].filter((h) => h.proId === memberId && h.status === "done").length;
  }

  // ---------------------------------------------------------------- jobs

  async createJob(job: Job) {
    this.jobs.set(job.id, structuredClone(job));
  }
  async getJob(id: string) {
    const j = this.jobs.get(id);
    return j ? structuredClone(j) : null;
  }
  async updateJob(id: string, patch: Partial<Omit<Job, "id" | "posterId" | "createdAt">>) {
    const j = this.jobs.get(id);
    if (j) Object.assign(j, structuredClone(patch));
  }
  async deleteJob(id: string) {
    this.jobs.delete(id);
    for (const [k, a] of this.applications) if (a.jobId === id) this.applications.delete(k);
  }
  async listJobs(input: { q?: string; type?: Job["type"]; remote?: boolean; skill?: string; posterId?: string; offset: number; limit: number }) {
    const q = input.q?.trim() ?? "";
    const skill = input.skill?.trim().toLowerCase() ?? "";
    const rows = [...this.jobs.values()]
      .filter((j) => (input.posterId ? j.posterId === input.posterId && j.status !== "removed" : j.status === "open"))
      .filter((j) => !q || has(j.title, q) || has(j.description, q))
      .filter((j) => !input.type || j.type === input.type)
      .filter((j) => input.remote === undefined || j.remote === input.remote)
      .filter((j) => !skill || j.skills.some((s) => s.toLowerCase() === skill))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? -1 : 1));
    return page(rows, input.offset, input.limit).map((j) => structuredClone(j));
  }
  async createApplication(application: JobApplication) {
    if ([...this.applications.values()].some((a) => a.jobId === application.jobId && a.applicantId === application.applicantId)) return false;
    this.applications.set(application.id, structuredClone(application));
    return true;
  }
  async getApplication(id: string) {
    const a = this.applications.get(id);
    return a ? structuredClone(a) : null;
  }
  async getApplicationOf(jobId: string, applicantId: string) {
    const a = [...this.applications.values()].find((x) => x.jobId === jobId && x.applicantId === applicantId);
    return a ? structuredClone(a) : null;
  }
  async updateApplication(id: string, patch: Partial<Pick<JobApplication, "status" | "updatedAt">>) {
    const a = this.applications.get(id);
    if (a) Object.assign(a, patch);
  }
  async listApplications(input: { jobId?: string; applicantId?: string; offset: number; limit: number }) {
    const rows = [...this.applications.values()]
      .filter((a) => (!input.jobId || a.jobId === input.jobId) && (!input.applicantId || a.applicantId === input.applicantId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? -1 : 1));
    return page(rows, input.offset, input.limit).map((a) => structuredClone(a));
  }
  async recountJob(jobId: string) {
    const j = this.jobs.get(jobId);
    if (j) j.applicationCount = [...this.applications.values()].filter((a) => a.jobId === jobId && a.status !== "withdrawn").length;
  }
}

function avg(p: Pro): number {
  return p.reviewCount ? p.ratingSum / p.reviewCount : 0;
}
