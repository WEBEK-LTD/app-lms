import * as accounts from "../base/accounts";
import { getConfig } from "../base/config";
import { getLink, startLink, unlink } from "../base/linking";
import * as profile from "../base/profile";
import * as social from "../base/social";
import type { CommunityContext, CommunityResult, CommunityRoute, MemberContext } from "./http";

/** 231 Area A's routes (docs/api/community.yaml: Auth, Me, Members, Social, Reports, Config). */
const member = (handler: (ctx: MemberContext) => Promise<CommunityResult>) => (ctx: CommunityContext) => handler(ctx as MemberContext);

export const BASE_ROUTES: CommunityRoute[] = [
  // Auth
  { method: "POST", path: "/auth/email/sign-up", auth: "public", handler: accounts.signUp },
  { method: "POST", path: "/auth/email/log-in", auth: "public", handler: accounts.logIn },
  { method: "POST", path: "/auth/apple", auth: "public", handler: accounts.withApple },
  { method: "POST", path: "/auth/google", auth: "public", handler: accounts.withGoogle },
  { method: "POST", path: "/auth/refresh", auth: "public", handler: accounts.refresh },
  { method: "POST", path: "/auth/log-out", handler: member(accounts.logOut) },
  { method: "POST", path: "/auth/email/verify", auth: "public", handler: accounts.verifyEmail },
  { method: "POST", path: "/auth/email/verify/resend", handler: member(accounts.resendVerification) },
  { method: "POST", path: "/auth/password-reset", auth: "public", handler: accounts.requestPasswordReset },
  { method: "POST", path: "/auth/password-reset/confirm", auth: "public", handler: accounts.confirmPasswordReset },
  // Me
  { method: "GET", path: "/me", handler: member(profile.getMe) },
  { method: "PATCH", path: "/me", handler: member(profile.patchMe) },
  { method: "DELETE", path: "/me", handler: member(profile.deleteMe) },
  { method: "PUT", path: "/me/avatar", handler: member(profile.putAvatar) },
  { method: "DELETE", path: "/me/avatar", handler: member(profile.deleteAvatar) },
  { method: "PUT", path: "/me/password", handler: member(profile.putPassword) },
  { method: "GET", path: "/me/sessions", handler: member(profile.listSessions) },
  { method: "DELETE", path: "/me/sessions/:session_id", handler: member(profile.deleteSession) },
  { method: "GET", path: "/me/blocks", handler: member(social.listBlocks) },
  { method: "GET", path: "/me/friend-requests", handler: member(social.listFriendRequests) },
  { method: "POST", path: "/me/friend-requests/:request_id/accept", handler: member(social.acceptFriendRequest) },
  { method: "POST", path: "/me/friend-requests/:request_id/decline", handler: member(social.declineFriendRequest) },
  { method: "GET", path: "/me/yallapp-link", handler: member(getLink) },
  { method: "DELETE", path: "/me/yallapp-link", handler: member(unlink) },
  { method: "POST", path: "/me/yallapp-link/start", handler: member(startLink) },
  // Members
  { method: "GET", path: "/members/:member", auth: "public", handler: social.getProfile },
  { method: "GET", path: "/members/:member/followers", auth: "public", handler: social.listFollowers },
  { method: "GET", path: "/members/:member/following", auth: "public", handler: social.listFollowing },
  { method: "GET", path: "/members/:member/friends", auth: "public", handler: social.listFriends },
  { method: "GET", path: "/members/:member/apps", auth: "public", handler: social.listApps },
  // Social
  { method: "PUT", path: "/members/:member/follow", handler: member(social.follow) },
  { method: "DELETE", path: "/members/:member/follow", handler: member(social.unfollow) },
  { method: "PUT", path: "/members/:member/friend", handler: member(social.befriend) },
  { method: "DELETE", path: "/members/:member/friend", handler: member(social.unfriend) },
  { method: "PUT", path: "/members/:member/block", handler: member(social.block) },
  { method: "DELETE", path: "/members/:member/block", handler: member(social.unblock) },
  // Reports, config
  { method: "POST", path: "/reports", handler: social.report },
  { method: "GET", path: "/config", auth: "public", handler: getConfig },
];
