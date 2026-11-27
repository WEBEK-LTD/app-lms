import type {
  Conversation,
  ConversationMember,
  Group,
  GroupMember,
  GroupRole,
  HireRequest,
  Job,
  JobApplication,
  JobType,
  Message,
  Pro,
  ProReview,
} from "./types";

/**
 * 232–234 Area A's "connect" data, one tenant's (memory: connect/memory.ts;
 * MySQL or MariaDB: connect/mysql.ts, migration 0160). Lists take an offset
 * and a limit and give up to `limit + 1` rows, so the caller knows there are
 * more.
 */
export interface ConnectStore {
  // ---------------------------------------------------------------- messages
  createConversation(conversation: Conversation, members: ConversationMember[]): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  /** The one-to-one conversation of a pair (Conversation.directKey). */
  findDirect(directKey: string): Promise<Conversation | null>;
  updateConversation(id: string, patch: Partial<Pick<Conversation, "title" | "updatedAt" | "lastMessageAt">>): Promise<void>;
  /** The member's conversations (in them, not hidden), latest message first. */
  listConversationsOf(memberId: string, offset: number, limit: number): Promise<Conversation[]>;
  /** Everyone who is or was in it (leftAt tells). */
  listConversationMembers(conversationId: string): Promise<ConversationMember[]>;
  getConversationMember(conversationId: string, memberId: string): Promise<ConversationMember | null>;
  saveConversationMember(member: ConversationMember): Promise<void>;
  /** Adds a message: the conversation's last message time moves, and a one-to-one conversation someone hid comes back. */
  addMessage(message: Message): Promise<void>;
  getMessage(id: string): Promise<Message | null>;
  /** Newest first. */
  listMessages(conversationId: string, offset: number, limit: number): Promise<Message[]>;
  /** Only those after `after` (by time, then id), oldest first: polling. */
  listMessagesAfter(conversationId: string, after: Message, limit: number): Promise<Message[]>;
  deleteMessage(id: string, at: Date): Promise<void>;
  /** Messages by others, not deleted, after `since` (all of them when null). */
  countUnread(conversationId: string, memberId: string, since: Date | null): Promise<number>;
  /** How many of the member's conversations have an unread message. */
  countUnreadConversations(memberId: string): Promise<number>;

  // ---------------------------------------------------------------- groups
  /** A new group and its owner; false when the slug is taken. */
  createGroup(group: Group, owner: GroupMember): Promise<boolean>;
  getGroup(id: string): Promise<Group | null>;
  getGroupBySlug(slug: string): Promise<Group | null>;
  updateGroup(id: string, patch: Partial<Omit<Group, "id" | "createdAt">>): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  /** Active groups (and, with `memberId`, the member's own of any status), most active first; `q` in the name or description. */
  listGroups(input: { q?: string; memberId?: string; offset: number; limit: number }): Promise<Group[]>;
  getGroupMember(groupId: string, memberId: string): Promise<GroupMember | null>;
  saveGroupMember(member: GroupMember): Promise<void>;
  removeGroupMember(groupId: string, memberId: string): Promise<void>;
  /** Owner, then moderators, then members (by when they joined); requests oldest first. */
  listGroupMembers(groupId: string, input: { status: GroupMember["status"]; role?: GroupRole; offset: number; limit: number }): Promise<GroupMember[]>;
  /** Counts its active members again (Group.memberCount). */
  recountGroup(groupId: string): Promise<void>;

  // ---------------------------------------------------------------- pros
  getPro(memberId: string): Promise<Pro | null>;
  savePro(pro: Pro): Promise<void>;
  /** Open profiles, best rated first; `q` in the headline, about or skills. */
  listPros(input: { q?: string; skill?: string; available?: boolean; offset: number; limit: number }): Promise<Pro[]>;
  createHire(request: HireRequest): Promise<void>;
  getHire(id: string): Promise<HireRequest | null>;
  updateHire(id: string, patch: Partial<Pick<HireRequest, "status" | "updatedAt">>): Promise<void>;
  /** Newest first, as the client or as the pro. */
  listHires(input: { clientId?: string; proId?: string; offset: number; limit: number }): Promise<HireRequest[]>;
  getReview(requestId: string): Promise<ProReview | null>;
  saveReview(review: ProReview): Promise<void>;
  /** Published ones, newest first. */
  listReviews(proId: string, offset: number, limit: number): Promise<ProReview[]>;
  /** The pro's rating, review count and done count again. */
  recountPro(memberId: string): Promise<void>;

  // ---------------------------------------------------------------- jobs
  createJob(job: Job): Promise<void>;
  getJob(id: string): Promise<Job | null>;
  updateJob(id: string, patch: Partial<Omit<Job, "id" | "posterId" | "createdAt">>): Promise<void>;
  deleteJob(id: string): Promise<void>;
  /** Open jobs newest first; with `posterId`, that member's of any status but removed. */
  listJobs(input: { q?: string; type?: JobType; remote?: boolean; skill?: string; posterId?: string; offset: number; limit: number }): Promise<Job[]>;
  /** False when the member already applied. */
  createApplication(application: JobApplication): Promise<boolean>;
  getApplication(id: string): Promise<JobApplication | null>;
  getApplicationOf(jobId: string, applicantId: string): Promise<JobApplication | null>;
  updateApplication(id: string, patch: Partial<Pick<JobApplication, "status" | "updatedAt">>): Promise<void>;
  /** Newest first: a job's, or a member's own. */
  listApplications(input: { jobId?: string; applicantId?: string; offset: number; limit: number }): Promise<JobApplication[]>;
  /** Counts its applications again (Job.applicationCount). */
  recountJob(jobId: string): Promise<void>;
}

/** A one-to-one conversation's key: the two ids, sorted. */
export const directKeyOf = (a: string, b: string): string => (a < b ? `${a}:${b}` : `${b}:${a}`);
