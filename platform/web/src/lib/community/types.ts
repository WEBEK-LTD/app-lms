/**
 * 231 Yallapp Community: the shared types of the community's data, used by
 * the schema (lib/db/community-schema.ts), the stores and the API
 * (/api/community/v1, docs/api/community.yaml). Area A (base) owns this
 * file; areas B (Q&A and tutorials) and C (trust: badges, moderation,
 * notifications) add their own types in their own files and import these.
 */

/** The languages of the community: English first, Arabic (MSA, RTL) and Turkish when the member picks them. */
export const COMMUNITY_LANGUAGES = ["en", "ar", "tr"] as const;
export type CommunityLanguage = (typeof COMMUNITY_LANGUAGES)[number];

export const COMMUNITY_THEMES = ["system", "light", "dark"] as const;
export type CommunityTheme = (typeof COMMUNITY_THEMES)[number];

/** member: anyone; team: Yallapp's team (official answers, "Yallapp Team"); admin: runs the community. */
export type CommunityRole = "member" | "team" | "admin";
export type CommunityMemberStatus = "active" | "suspended" | "deleted";

/** How a member signs in: email and password, Sign in with Apple, Google. */
export type CommunityAuthProvider = "email" | "apple" | "google";

export interface CommunityMember {
  id: string;
  /** Lower case; null for an Apple account that hid its email and was never given one. */
  email: string | null;
  emailVerified: boolean;
  passwordHash: string | null;
  /** Shown everywhere ("Mohamed Ali"). */
  displayName: string;
  /** Unique, lower case, 3–30 of a–z, 0–9, "_" and "."; the profile's address (/u/{username}). */
  username: string;
  bio: string;
  skills: string[];
  avatarUrl: string | null;
  /** A short line under the name ("Expert", "Flutter developer"). */
  headline: string;
  links: CommunityProfileLink[];
  language: CommunityLanguage;
  theme: CommunityTheme;
  role: CommunityRole;
  status: CommunityMemberStatus;
  points: number;
  /** Posts and questions of theirs approved so far: the first 2 are reviewed (moderation, area C). */
  approvedPosts: number;
  /** The Yallapp account linked (users.id); null when none. */
  yallappUserId: string | null;
  linkedAt: Date | null;
  /**
   * How it was linked: "link", the full flow confirmed on yallapp.com.tr (the
   * only one that lets a Yallapp admin run the community, lib/community/staff.ts);
   * "signin", joined or signed in with "Continue with Yallapp"; "suggested",
   * the one-tap link offered for the same verified email. Null when not linked.
   */
  yallappLinkVia: CommunityYallappLinkVia | null;
  /** When the member said no to the one-tap link; it isn't offered again. */
  linkSuggestionDismissedAt: Date | null;
  /** Bumped to sign every device out (password change, suspension). */
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface CommunityProfileLink {
  label: string;
  url: string;
}

/** A member's Apple or Google identity (the token's `sub`). */
export interface CommunityIdentity {
  memberId: string;
  provider: Exclude<CommunityAuthProvider, "email">;
  subject: string;
  email: string | null;
  createdAt: Date;
}

/** One signed-in device: a refresh token (kept as a hash) and the access token it last gave. */
export interface CommunitySession {
  id: string;
  memberId: string;
  /** "iPhone", "Chrome on macOS"; what the client sent. */
  name: string;
  platform: "ios" | "android" | "web";
  refreshHash: string;
  refreshExpiresAt: Date;
  accessHash: string;
  accessExpiresAt: Date;
  sessionVersion: number;
  createdAt: Date;
  lastSeenAt: Date;
}

export type CommunityEmailTokenPurpose = "verify_email" | "reset_password";

export interface CommunityEmailToken {
  tokenHash: string;
  memberId: string;
  purpose: CommunityEmailTokenPurpose;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CommunityFollow {
  followerId: string;
  followeeId: string;
  createdAt: Date;
}

export type CommunityFriendshipStatus = "pending" | "accepted";

/** A friend request (pending) or a friendship (accepted), one per pair of members. */
export interface CommunityFriendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: CommunityFriendshipStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

export interface CommunityBlock {
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

export type CommunityYallappLinkVia = "link" | "signin" | "suggested";

/**
 * "Continue with Yallapp": a sign-in asked for by the app or the site (its
 * PKCE challenge, where to send the code and the client's state), approved
 * on yallapp.com.tr by a signed-in Yallapp user, then its one-time code
 * exchanged once. Secrets are kept only as their SHA-256.
 */
export interface CommunityYallappSignin {
  requestHash: string;
  redirectUri: string;
  /** BASE64URL(SHA-256(code_verifier)). */
  codeChallenge: string;
  clientState: string;
  yallappUserId: string | null;
  codeHash: string | null;
  expiresAt: Date;
  approvedAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
}

/** Linking a Yallapp account: the member asks in the community, confirms signed in on yallapp.com.tr. */
export interface CommunityLinkRequest {
  stateHash: string;
  memberId: string;
  expiresAt: Date;
  confirmedAt: Date | null;
  createdAt: Date;
}

/** What can be reported, liked, voted on or moderated. */
export type CommunityTargetType =
  | "member"
  | "question"
  | "answer"
  | "reply"
  | "tutorial"
  | "comment"
  // 232–235: what phases 2 to 5 add, reported and moderated as in phase 1 (lib/community/content-kinds.ts).
  | "post"
  | "post_comment"
  | "story"
  | "showcase"
  | "showcase_comment"
  | "conversation"
  | "group"
  | "job"
  | "pro"
  | "pro_review"
  | "event"
  | "event_comment"
  | "challenge_submission";

export type CommunityReportReason = "spam" | "harassment" | "hate" | "inappropriate" | "misinformation" | "impersonation" | "other";
export type CommunityReportStatus = "open" | "actioned" | "dismissed";

export interface CommunityReport {
  id: string;
  reporterId: string;
  targetType: CommunityTargetType;
  targetId: string;
  reason: CommunityReportReason;
  note: string;
  status: CommunityReportStatus;
  handledBy: string | null;
  handledAt: Date | null;
  createdAt: Date;
}

/** A member's app made with Yallapp, read from the linked Yallapp account (never claimed by hand). */
export interface CommunityLinkedApp {
  appId: string;
  name: string;
  iconUrl: string | null;
  /** The app's pages on the stores, when published. */
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  /** Made from a Studio Market template (counts toward the Gold badge like any other app). */
  fromTemplate: boolean;
  /** On a paid plan now (the Green badge). */
  paidPlan: boolean;
}
