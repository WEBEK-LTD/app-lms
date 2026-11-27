/**
 * 232–234 Area A's second part, "connect": messages (232.4), groups
 * (232.5), pros (234.1) and jobs (234.2). Each record belongs to one
 * tenant's community (the store is that tenant's). Times are UTC; ids are
 * UUIDs.
 */

// ---------------------------------------------------------------- messages

export type ConversationKind = "direct" | "group" | "hire";

export interface Conversation {
  id: string;
  kind: ConversationKind;
  /** A group chat's own title; null: clients show the others' names. */
  title: string | null;
  createdBy: string;
  /** A one-to-one conversation's two member ids, sorted and joined: at most one per pair. */
  directKey: string | null;
  hireRequestId: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMember {
  conversationId: string;
  memberId: string;
  joinedAt: Date;
  /** Left a group chat: no longer in it. */
  leftAt: Date | null;
  /** Hid a one-to-one conversation: back on its next message. */
  hiddenAt: Date | null;
  lastReadMessageId: string | null;
  lastReadAt: Date | null;
  muted: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  photos: string[];
  replyToId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
}

/** At most this many people in a group chat, its creator included. */
export const MAX_CHAT_MEMBERS = 10;

// ---------------------------------------------------------------- groups

export type GroupRole = "owner" | "moderator" | "member";
export type GroupVisibility = "public" | "private";
export type GroupStatus = "active" | "pending" | "removed";

export interface Group {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: GroupVisibility;
  coverUrl: string | null;
  ownerId: string;
  status: GroupStatus;
  memberCount: number;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface GroupMember {
  groupId: string;
  memberId: string;
  role: GroupRole;
  /** `requested`: asked to join a private group, waiting for its moderators. */
  status: "active" | "requested";
  joinedAt: Date;
}

// ---------------------------------------------------------------- pros

export type ProAvailability = "available" | "busy" | "unavailable";

export interface ProService {
  title: string;
  description: string;
  rate: string;
}

export interface Pro {
  memberId: string;
  headline: string;
  about: string;
  services: ProService[];
  skills: string[];
  availability: ProAvailability;
  showcaseIds: string[];
  /** Closed by its member: hidden, its reviews kept for when it opens again. */
  open: boolean;
  ratingSum: number;
  reviewCount: number;
  doneCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type HireStatus = "pending" | "accepted" | "declined" | "done" | "cancelled";

export interface HireRequest {
  id: string;
  clientId: string;
  proId: string;
  service: string | null;
  message: string;
  status: HireStatus;
  conversationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProReview {
  /** One per hire request. */
  requestId: string;
  proId: string;
  authorId: string;
  rating: number;
  text: string;
  status: "published" | "hidden";
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------- jobs

export type JobType = "full_time" | "part_time" | "contract" | "freelance" | "internship";
export type JobStatus = "pending" | "open" | "closed" | "removed";

export interface Job {
  id: string;
  posterId: string;
  title: string;
  description: string;
  type: JobType;
  remote: boolean;
  location: string;
  skills: string[];
  budget: string;
  status: JobStatus;
  applicationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type JobApplicationStatus = "sent" | "shortlisted" | "declined" | "withdrawn";

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  message: string;
  links: string[];
  status: JobApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}
