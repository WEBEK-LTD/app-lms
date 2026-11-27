import { randomUUID } from "node:crypto";

/**
 * 232–235 Yallapp Community, area C's records for phases 2 to 5: push
 * devices, the points ledger, challenges, events and live sessions, and
 * the academy's course orders. One interface, in memory (tests and local
 * runs) and on MySQL (store-mysql.ts, migration 0179), one suite for both.
 * Every record is in a community, its tenant: "yallapp" for Yallapp
 * Community itself, a client app's id for its own community (phase 5).
 */

export const YALLAPP_TENANT = "yallapp";

export interface Page<T> {
  items: T[];
  /** The next page's offset; null at the end. */
  next: number | null;
}

// ——— Push ———

export type PushPlatform = "android" | "ios";

export interface PushDevice {
  token: string;
  tenantId: string;
  memberId: string;
  platform: PushPlatform;
  createdAt: Date;
  lastSeenAt: Date;
}

// ——— Points ———

export interface PointEntry {
  id: string;
  tenantId: string;
  memberId: string;
  reason: string;
  points: number;
  ref: string;
  createdAt: Date;
}

export interface BoardRow {
  memberId: string;
  points: number;
}

// ——— Challenges ———

export interface Challenge {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  prizes: string;
  coverUrl: string | null;
  startsAt: Date;
  submitUntil: Date;
  voteUntil: Date;
  status: "published" | "cancelled";
  winnersAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Where a challenge is by its dates: before it, taking entries, taking votes, or over (or cancelled). */
export type ChallengeStage = "upcoming" | "open" | "voting" | "closed";

export function challengeStage(c: Pick<Challenge, "startsAt" | "submitUntil" | "voteUntil" | "status">, now: Date): ChallengeStage {
  const t = now.getTime();
  if (c.status === "cancelled" || t >= c.voteUntil.getTime()) return "closed";
  if (t < c.startsAt.getTime()) return "upcoming";
  if (t < c.submitUntil.getTime()) return "open";
  return "voting";
}

export interface ChallengeReward {
  points: number;
  badge: boolean;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  memberId: string;
  showcaseId: string | null;
  url: string | null;
  title: string;
  note: string;
  votes: number;
  place: number | null;
  reward: ChallengeReward | null;
  status: "published" | "pending" | "hidden";
  createdAt: Date;
}

// ——— Events ———

export type EventKind = "online" | "in_person" | "live";

export interface CommunityEvent {
  id: string;
  tenantId: string;
  groupId: string | null;
  kind: EventKind;
  title: string;
  body: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  location: string | null;
  joinUrl: string | null;
  embedUrl: string | null;
  replayUrl: string | null;
  coverUrl: string | null;
  status: "scheduled" | "cancelled";
  rsvpCount: number;
  remindedDayAt: Date | null;
  remindedHourAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventComment {
  id: string;
  eventId: string;
  memberId: string;
  body: string;
  status: "published" | "pending" | "hidden";
  createdAt: Date;
}

// ——— Course orders ———

export interface CourseOrder {
  id: string;
  tenantId: string;
  memberId: string;
  courseId: string;
  amountCents: number;
  currency: string;
  provider: string;
  providerRef: string | null;
  tokenHash: string;
  status: "pending" | "paid" | "failed";
  createdAt: Date;
  paidAt: Date | null;
}

export interface EngageStore {
  // Push
  saveDevice(d: Omit<PushDevice, "createdAt" | "lastSeenAt">, at: Date): Promise<void>;
  removeDevice(token: string, memberId: string): Promise<void>;
  removeTokens(tokens: readonly string[]): Promise<void>;
  devicesOf(memberIds: readonly string[]): Promise<PushDevice[]>;

  // Points
  /** False when this member already has this reason for this ref. */
  addPoints(e: Omit<PointEntry, "id">): Promise<boolean>;
  /** Removes that entry; its points (0 when there was none). */
  takePoints(memberId: string, reason: string, ref: string): Promise<number>;
  /** Points gained (positive entries only) for a reason since a time: the daily cap's count. */
  gainedSince(memberId: string, reason: string, since: Date): Promise<number>;
  /** Today's gains by reason. */
  gainsByReason(memberId: string, since: Date): Promise<Record<string, number>>;
  /** The board: members by points since a time (null: all time), most first, ties by who got there first. */
  board(tenantId: string, since: Date | null, offset: number, limit: number): Promise<BoardRow[]>;
  memberTotal(tenantId: string, memberId: string, since: Date | null): Promise<number>;
  /** How many members are ahead of this total. */
  aheadOf(tenantId: string, points: number, since: Date | null): Promise<number>;

  // Challenges
  addChallenge(c: Omit<Challenge, "id">): Promise<Challenge>;
  getChallenge(id: string): Promise<Challenge | null>;
  updateChallenge(id: string, patch: Partial<Omit<Challenge, "id" | "tenantId" | "createdAt" | "createdBy">>): Promise<Challenge | null>;
  deleteChallenge(id: string): Promise<void>;
  listChallenges(input: { tenantId: string; stage?: ChallengeStage; now: Date; offset: number; limit: number }): Promise<Page<Challenge>>;
  /** Null when the member already has an entry in it. */
  addSubmission(s: Omit<ChallengeSubmission, "id" | "votes" | "place" | "reward">): Promise<ChallengeSubmission | null>;
  getSubmission(id: string): Promise<ChallengeSubmission | null>;
  listSubmissions(input: { challengeId: string; sort: "top" | "new"; offset: number; limit: number; withHidden?: boolean }): Promise<Page<ChallengeSubmission>>;
  countSubmissions(challengeId: string): Promise<number>;
  updateSubmission(id: string, patch: Partial<Pick<ChallengeSubmission, "status" | "place" | "reward">>): Promise<ChallengeSubmission | null>;
  /** A vote; false when the member had voted already. Keeps the entry's count. */
  addVote(submissionId: string, memberId: string, at: Date): Promise<boolean>;
  removeVote(submissionId: string, memberId: string): Promise<boolean>;
  votedOf(submissionIds: readonly string[], memberId: string): Promise<Set<string>>;

  // Events
  addEvent(e: Omit<CommunityEvent, "id" | "rsvpCount" | "remindedDayAt" | "remindedHourAt">): Promise<CommunityEvent>;
  getEvent(id: string): Promise<CommunityEvent | null>;
  updateEvent(id: string, patch: Partial<Omit<CommunityEvent, "id" | "tenantId" | "createdAt" | "createdBy" | "rsvpCount">>): Promise<CommunityEvent | null>;
  deleteEvent(id: string): Promise<void>;
  /** Upcoming (not yet over, soonest first) or past (latest first); cancelled ones are listed too. */
  listEvents(input: { tenantId: string; when: "upcoming" | "past"; kind?: EventKind; groupId?: string; now: Date; offset: number; limit: number }): Promise<Page<CommunityEvent>>;
  /** Scheduled events starting between the two times and not yet reminded for that reminder. */
  eventsToRemind(which: "day" | "hour", from: Date, to: Date): Promise<CommunityEvent[]>;
  addRsvp(eventId: string, memberId: string, at: Date): Promise<boolean>;
  removeRsvp(eventId: string, memberId: string): Promise<boolean>;
  rsvpOf(eventIds: readonly string[], memberId: string): Promise<Set<string>>;
  attendees(eventId: string, offset: number, limit: number): Promise<Page<string>>;
  addEventComment(c: Omit<EventComment, "id">): Promise<EventComment>;
  getEventComment(id: string): Promise<EventComment | null>;
  /** Published comments, oldest first; after a comment's id: only newer ones (polling). */
  listEventComments(eventId: string, input: { after?: string | null; limit: number }): Promise<EventComment[]>;
  setEventCommentStatus(id: string, status: EventComment["status"]): Promise<void>;

  // Course orders
  addOrder(o: Omit<CourseOrder, "id">): Promise<CourseOrder>;
  getOrder(id: string): Promise<CourseOrder | null>;
  getOrderByToken(tokenHash: string): Promise<CourseOrder | null>;
  /** Marks a pending order paid or failed; null when it wasn't pending (settled once). */
  settleOrder(id: string, input: { status: "paid" | "failed"; at: Date; providerRef?: string | null }): Promise<CourseOrder | null>;
  setOrderRef(id: string, providerRef: string): Promise<void>;
}

const clone = <T>(v: T): T => structuredClone(v);
const pageOf = <T>(all: T[], offset: number, limit: number): Page<T> => ({ items: all.slice(offset, offset + limit), next: offset + limit < all.length ? offset + limit : null });

export class MemoryEngageStore implements EngageStore {
  private devices = new Map<string, PushDevice>();
  private points: PointEntry[] = [];
  private challenges = new Map<string, Challenge>();
  private submissions = new Map<string, ChallengeSubmission>();
  private votes = new Set<string>();
  private events = new Map<string, CommunityEvent>();
  private rsvps = new Map<string, Date>();
  private comments: EventComment[] = [];
  private orders = new Map<string, CourseOrder>();

  // Push
  async saveDevice(d: Omit<PushDevice, "createdAt" | "lastSeenAt">, at: Date) {
    const had = this.devices.get(d.token);
    this.devices.set(d.token, { ...d, createdAt: had && had.memberId === d.memberId ? had.createdAt : at, lastSeenAt: at });
  }
  async removeDevice(token: string, memberId: string) {
    if (this.devices.get(token)?.memberId === memberId) this.devices.delete(token);
  }
  async removeTokens(tokens: readonly string[]) {
    for (const t of tokens) this.devices.delete(t);
  }
  async devicesOf(memberIds: readonly string[]) {
    const ids = new Set(memberIds);
    return [...this.devices.values()].filter((d) => ids.has(d.memberId)).map(clone);
  }

  // Points
  async addPoints(e: Omit<PointEntry, "id">) {
    if (this.points.some((p) => p.memberId === e.memberId && p.reason === e.reason && p.ref === e.ref)) return false;
    this.points.push({ ...clone(e), id: randomUUID() });
    return true;
  }
  async takePoints(memberId: string, reason: string, ref: string) {
    const i = this.points.findIndex((p) => p.memberId === memberId && p.reason === reason && p.ref === ref);
    if (i < 0) return 0;
    const [gone] = this.points.splice(i, 1);
    return gone!.points;
  }
  async gainedSince(memberId: string, reason: string, since: Date) {
    return this.points.filter((p) => p.memberId === memberId && p.reason === reason && p.points > 0 && p.createdAt >= since).reduce((n, p) => n + p.points, 0);
  }
  async gainsByReason(memberId: string, since: Date) {
    const out: Record<string, number> = {};
    for (const p of this.points) if (p.memberId === memberId && p.points > 0 && p.createdAt >= since) out[p.reason] = (out[p.reason] ?? 0) + p.points;
    return out;
  }
  private totals(tenantId: string, since: Date | null) {
    const sums = new Map<string, { points: number; first: number }>();
    for (const p of this.points) {
      if (p.tenantId !== tenantId || (since && p.createdAt < since)) continue;
      const s = sums.get(p.memberId) ?? { points: 0, first: p.createdAt.getTime() };
      s.points += p.points;
      s.first = Math.min(s.first, p.createdAt.getTime());
      sums.set(p.memberId, s);
    }
    return [...sums.entries()]
      .filter(([, s]) => s.points > 0)
      .sort((a, b) => b[1].points - a[1].points || a[1].first - b[1].first || a[0].localeCompare(b[0]))
      .map(([memberId, s]) => ({ memberId, points: s.points }));
  }
  async board(tenantId: string, since: Date | null, offset: number, limit: number) {
    return this.totals(tenantId, since).slice(offset, offset + limit);
  }
  async memberTotal(tenantId: string, memberId: string, since: Date | null) {
    return this.points.filter((p) => p.tenantId === tenantId && p.memberId === memberId && (!since || p.createdAt >= since)).reduce((n, p) => n + p.points, 0);
  }
  async aheadOf(tenantId: string, points: number, since: Date | null) {
    return this.totals(tenantId, since).filter((r) => r.points > points).length;
  }

  // Challenges
  async addChallenge(c: Omit<Challenge, "id">) {
    const made = { ...clone(c), id: randomUUID() };
    this.challenges.set(made.id, made);
    return clone(made);
  }
  async getChallenge(id: string) {
    const c = this.challenges.get(id);
    return c ? clone(c) : null;
  }
  async updateChallenge(id: string, patch: Partial<Omit<Challenge, "id" | "tenantId" | "createdAt" | "createdBy">>) {
    const c = this.challenges.get(id);
    if (!c) return null;
    Object.assign(c, clone(patch));
    return clone(c);
  }
  async deleteChallenge(id: string) {
    this.challenges.delete(id);
    for (const s of [...this.submissions.values()]) if (s.challengeId === id) this.submissions.delete(s.id);
  }
  async listChallenges(input: { tenantId: string; stage?: ChallengeStage; now: Date; offset: number; limit: number }) {
    const all = [...this.challenges.values()]
      .filter((c) => c.tenantId === input.tenantId && (!input.stage || challengeStage(c, input.now) === input.stage))
      .sort((a, b) => (input.stage === "closed" ? b.voteUntil.getTime() - a.voteUntil.getTime() : a.startsAt.getTime() - b.startsAt.getTime()) || a.id.localeCompare(b.id));
    return pageOf(all.map(clone), input.offset, input.limit);
  }
  async addSubmission(s: Omit<ChallengeSubmission, "id" | "votes" | "place" | "reward">) {
    if ([...this.submissions.values()].some((x) => x.challengeId === s.challengeId && x.memberId === s.memberId)) return null;
    const made: ChallengeSubmission = { ...clone(s), id: randomUUID(), votes: 0, place: null, reward: null };
    this.submissions.set(made.id, made);
    return clone(made);
  }
  async getSubmission(id: string) {
    const s = this.submissions.get(id);
    return s ? clone(s) : null;
  }
  async listSubmissions(input: { challengeId: string; sort: "top" | "new"; offset: number; limit: number; withHidden?: boolean }) {
    const all = [...this.submissions.values()]
      .filter((s) => s.challengeId === input.challengeId && (input.withHidden || s.status === "published"))
      .sort((a, b) => (input.sort === "top" ? b.votes - a.votes || a.createdAt.getTime() - b.createdAt.getTime() : b.createdAt.getTime() - a.createdAt.getTime()) || a.id.localeCompare(b.id));
    return pageOf(all.map(clone), input.offset, input.limit);
  }
  async countSubmissions(challengeId: string) {
    return [...this.submissions.values()].filter((s) => s.challengeId === challengeId && s.status === "published").length;
  }
  async updateSubmission(id: string, patch: Partial<Pick<ChallengeSubmission, "status" | "place" | "reward">>) {
    const s = this.submissions.get(id);
    if (!s) return null;
    Object.assign(s, clone(patch));
    return clone(s);
  }
  async addVote(submissionId: string, memberId: string) {
    const key = `${submissionId}:${memberId}`;
    const s = this.submissions.get(submissionId);
    if (!s || this.votes.has(key)) return false;
    this.votes.add(key);
    s.votes++;
    return true;
  }
  async removeVote(submissionId: string, memberId: string) {
    const key = `${submissionId}:${memberId}`;
    if (!this.votes.delete(key)) return false;
    const s = this.submissions.get(submissionId);
    if (s) s.votes = Math.max(0, s.votes - 1);
    return true;
  }
  async votedOf(submissionIds: readonly string[], memberId: string) {
    return new Set(submissionIds.filter((id) => this.votes.has(`${id}:${memberId}`)));
  }

  // Events
  async addEvent(e: Omit<CommunityEvent, "id" | "rsvpCount" | "remindedDayAt" | "remindedHourAt">) {
    const made: CommunityEvent = { ...clone(e), id: randomUUID(), rsvpCount: 0, remindedDayAt: null, remindedHourAt: null };
    this.events.set(made.id, made);
    return clone(made);
  }
  async getEvent(id: string) {
    const e = this.events.get(id);
    return e ? clone(e) : null;
  }
  async updateEvent(id: string, patch: Partial<Omit<CommunityEvent, "id" | "tenantId" | "createdAt" | "createdBy" | "rsvpCount">>) {
    const e = this.events.get(id);
    if (!e) return null;
    Object.assign(e, clone(patch));
    return clone(e);
  }
  async deleteEvent(id: string) {
    this.events.delete(id);
    for (const key of [...this.rsvps.keys()]) if (key.startsWith(`${id}:`)) this.rsvps.delete(key);
    this.comments = this.comments.filter((c) => c.eventId !== id);
  }
  async listEvents(input: { tenantId: string; when: "upcoming" | "past"; kind?: EventKind; groupId?: string; now: Date; offset: number; limit: number }) {
    const t = input.now.getTime();
    const all = [...this.events.values()]
      .filter((e) => e.tenantId === input.tenantId && (input.when === "upcoming" ? e.endsAt.getTime() > t : e.endsAt.getTime() <= t) && (!input.kind || e.kind === input.kind) && (!input.groupId || e.groupId === input.groupId))
      .sort((a, b) => (input.when === "upcoming" ? a.startsAt.getTime() - b.startsAt.getTime() : b.startsAt.getTime() - a.startsAt.getTime()) || a.id.localeCompare(b.id));
    return pageOf(all.map(clone), input.offset, input.limit);
  }
  async eventsToRemind(which: "day" | "hour", from: Date, to: Date) {
    return [...this.events.values()]
      .filter((e) => e.status === "scheduled" && e.startsAt >= from && e.startsAt < to && (which === "day" ? !e.remindedDayAt : !e.remindedHourAt))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map(clone);
  }
  async addRsvp(eventId: string, memberId: string, at: Date) {
    const key = `${eventId}:${memberId}`;
    const e = this.events.get(eventId);
    if (!e || this.rsvps.has(key)) return false;
    this.rsvps.set(key, at);
    e.rsvpCount++;
    return true;
  }
  async removeRsvp(eventId: string, memberId: string) {
    if (!this.rsvps.delete(`${eventId}:${memberId}`)) return false;
    const e = this.events.get(eventId);
    if (e) e.rsvpCount = Math.max(0, e.rsvpCount - 1);
    return true;
  }
  async rsvpOf(eventIds: readonly string[], memberId: string) {
    return new Set(eventIds.filter((id) => this.rsvps.has(`${id}:${memberId}`)));
  }
  async attendees(eventId: string, offset: number, limit: number) {
    const all = [...this.rsvps.entries()]
      .filter(([key]) => key.startsWith(`${eventId}:`))
      .sort((a, b) => a[1].getTime() - b[1].getTime() || a[0].localeCompare(b[0]))
      .map(([key]) => key.slice(eventId.length + 1));
    return pageOf(all, offset, limit);
  }
  async addEventComment(c: Omit<EventComment, "id">) {
    const made = { ...clone(c), id: randomUUID() };
    this.comments.push(made);
    return clone(made);
  }
  async getEventComment(id: string) {
    const c = this.comments.find((x) => x.id === id);
    return c ? clone(c) : null;
  }
  async listEventComments(eventId: string, input: { after?: string | null; limit: number }) {
    const mine = this.comments.filter((c) => c.eventId === eventId);
    const after = input.after ? mine.find((c) => c.id === input.after) : null;
    return mine
      .filter((c) => c.status === "published" && (!after || c.createdAt > after.createdAt || (c.createdAt.getTime() === after.createdAt.getTime() && c.id > after.id)))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
      .slice(0, input.limit)
      .map(clone);
  }
  async setEventCommentStatus(id: string, status: EventComment["status"]) {
    const c = this.comments.find((x) => x.id === id);
    if (c) c.status = status;
  }

  // Course orders
  async addOrder(o: Omit<CourseOrder, "id">) {
    const made = { ...clone(o), id: randomUUID() };
    this.orders.set(made.id, made);
    return clone(made);
  }
  async getOrder(id: string) {
    const o = this.orders.get(id);
    return o ? clone(o) : null;
  }
  async getOrderByToken(tokenHash: string) {
    const o = [...this.orders.values()].find((x) => x.tokenHash === tokenHash);
    return o ? clone(o) : null;
  }
  async settleOrder(id: string, input: { status: "paid" | "failed"; at: Date; providerRef?: string | null }) {
    const o = this.orders.get(id);
    if (!o || o.status !== "pending") return null;
    o.status = input.status;
    if (input.status === "paid") o.paidAt = input.at;
    if (input.providerRef) o.providerRef = input.providerRef;
    return clone(o);
  }
  async setOrderRef(id: string, providerRef: string) {
    const o = this.orders.get(id);
    if (o) o.providerRef = providerRef;
  }
}
