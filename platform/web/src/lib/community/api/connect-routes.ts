import * as groups from "../connect/groups";
import * as jobs from "../connect/jobs";
import * as messages from "../connect/messages";
import * as pros from "../connect/pros";
import type { CommunityContext, CommunityResult, CommunityRoute, MemberContext } from "./http";

/** 232–234 Area A's phase 2–4 routes (docs/api/community.yaml: Messages, Groups, Pros, Jobs). */
const member = (handler: (ctx: MemberContext) => Promise<CommunityResult>) => (ctx: CommunityContext) => handler(ctx as MemberContext);

export const CONNECT_ROUTES: CommunityRoute[] = [
  // Messages (232.4)
  { method: "GET", path: "/messages/conversations", handler: member(messages.listConversations) },
  { method: "POST", path: "/messages/conversations", handler: member(messages.startConversation) },
  { method: "GET", path: "/messages/unread", handler: member(messages.unreadCount) },
  { method: "GET", path: "/messages/conversations/:conversation_id", handler: member(messages.getConversation) },
  { method: "PATCH", path: "/messages/conversations/:conversation_id", handler: member(messages.updateConversation) },
  { method: "POST", path: "/messages/conversations/:conversation_id/members", handler: member(messages.addPeople) },
  { method: "DELETE", path: "/messages/conversations/:conversation_id/members/me", handler: member(messages.leaveConversation) },
  { method: "GET", path: "/messages/conversations/:conversation_id/messages", handler: member(messages.listMessages) },
  { method: "POST", path: "/messages/conversations/:conversation_id/messages", handler: member(messages.postMessage) },
  { method: "DELETE", path: "/messages/conversations/:conversation_id/messages/:message_id", handler: member(messages.deleteMessage) },
  { method: "POST", path: "/messages/conversations/:conversation_id/read", handler: member(messages.markRead) },
  { method: "POST", path: "/messages/conversations/:conversation_id/report", handler: member(messages.reportConversation) },

  // Groups (232.5); a group's feed is area B's (its posts and questions, with connect/groups.ts readableGroup).
  { method: "GET", path: "/groups", auth: "public", handler: groups.listGroups },
  { method: "POST", path: "/groups", handler: member(groups.createGroup) },
  { method: "GET", path: "/groups/:group", auth: "public", handler: groups.getGroup },
  { method: "PATCH", path: "/groups/:group", handler: member(groups.updateGroup) },
  { method: "DELETE", path: "/groups/:group", handler: member(groups.deleteGroup) },
  { method: "PUT", path: "/groups/:group/cover", handler: member(groups.setCover) },
  { method: "DELETE", path: "/groups/:group/cover", handler: member(groups.removeCover) },
  { method: "PUT", path: "/groups/:group/membership", handler: member(groups.join) },
  { method: "DELETE", path: "/groups/:group/membership", handler: member(groups.leave) },
  { method: "GET", path: "/groups/:group/members", auth: "public", handler: groups.listMembers },
  { method: "PATCH", path: "/groups/:group/members/:member", handler: member(groups.setRole) },
  { method: "DELETE", path: "/groups/:group/members/:member", handler: member(groups.removeMember) },
  { method: "GET", path: "/groups/:group/requests", handler: member(groups.listRequests) },
  { method: "POST", path: "/groups/:group/requests/:member/accept", handler: member(groups.acceptRequest) },
  { method: "POST", path: "/groups/:group/requests/:member/decline", handler: member(groups.declineRequest) },

  // Pros (234.1)
  { method: "GET", path: "/pros", auth: "public", handler: pros.listPros },
  { method: "GET", path: "/pros/requests", handler: member(pros.listHires) },
  { method: "PATCH", path: "/pros/requests/:request_id", handler: member(pros.moveHire) },
  { method: "PUT", path: "/pros/requests/:request_id/review", handler: member(pros.review) },
  { method: "GET", path: "/pros/:member", auth: "public", handler: pros.getPro },
  { method: "GET", path: "/pros/:member/reviews", auth: "public", handler: pros.listReviews },
  { method: "POST", path: "/pros/:member/hire", handler: member(pros.hire) },
  { method: "GET", path: "/me/pro", handler: member(pros.myPro) },
  { method: "PUT", path: "/me/pro", handler: member(pros.savePro) },
  { method: "DELETE", path: "/me/pro", handler: member(pros.closePro) },

  // Jobs (234.2)
  { method: "GET", path: "/jobs", auth: "public", handler: jobs.listJobs },
  { method: "POST", path: "/jobs", handler: member(jobs.postJob) },
  { method: "GET", path: "/jobs/:job_id", auth: "public", handler: jobs.getJob },
  { method: "PATCH", path: "/jobs/:job_id", handler: member(jobs.updateJob) },
  { method: "DELETE", path: "/jobs/:job_id", handler: member(jobs.deleteJob) },
  { method: "GET", path: "/jobs/:job_id/applications", handler: member(jobs.listApplicants) },
  { method: "POST", path: "/jobs/:job_id/applications", handler: member(jobs.apply) },
  { method: "PATCH", path: "/jobs/:job_id/applications/:application_id", handler: member(jobs.moveApplication) },
  { method: "GET", path: "/me/job-applications", handler: member(jobs.myApplications) },
];
