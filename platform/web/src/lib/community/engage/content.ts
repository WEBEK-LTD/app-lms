import type { ContentAdapter } from "../content-kinds";

/**
 * 233–234 Area C's kinds in the moderation table (lib/community/content-kinds.ts):
 * a challenge's entry, an event and a comment on an event (a live session's
 * chat). Hidden: out of every list until a moderator puts it back.
 */

export const challengeSubmissionContent: ContentAdapter = {
  async info(ctx, id) {
    const s = await ctx.store.engage.getSubmission(id);
    if (!s) return null;
    const words = [s.note, s.url].filter(Boolean).join(" · ") || "Entry";
    return { authorId: s.memberId, title: words.slice(0, 140), link: `/challenges/${s.challengeId}#entry-${s.id}` };
  },
  async setStatus(ctx, id, status) {
    await ctx.store.engage.updateSubmission(id, { status });
  },
};

export const eventCommentContent: ContentAdapter = {
  async info(ctx, id) {
    const c = await ctx.store.engage.getEventComment(id);
    return c ? { authorId: c.memberId, title: c.body.slice(0, 140), link: `/events/${c.eventId}` } : null;
  },
  async setStatus(ctx, id, status) {
    await ctx.store.engage.setEventCommentStatus(id, status);
  },
};

export const eventContent: ContentAdapter = {
  async info(ctx, id) {
    const e = await ctx.store.engage.getEvent(id);
    // Events are the staff's own: a report reaches the moderators, and hiding one cancels it.
    return e ? { authorId: e.createdBy, title: e.title, link: `/events/${e.id}` } : null;
  },
  async setStatus(ctx, id, status) {
    await ctx.store.engage.updateEvent(id, { status: status === "hidden" ? "cancelled" : "scheduled", updatedAt: ctx.now });
  },
};
