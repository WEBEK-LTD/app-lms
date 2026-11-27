import "server-only";
import { communityApi } from "@/lib/community/site-client";
import type { MemberRef } from "./data";
import { apiMember, type ApiMember } from "./source";

/**
 * 232–234 The website's reads and writes for the Community's phases 2 to 4
 * (posts, stories, showcase, messages, groups, academy, points, challenges,
 * pros, jobs and events), through the community API in-process
 * (docs/api/community.yaml). Shapes keep the API's own field names; only
 * members are turned into the site's MemberRef.
 */

export type Page<T> = { items: T[]; next: string | null };
export type Result = { ok: true; body?: unknown } | { ok: false; status: number; code: string; fields: Record<string, string> };

type Raw<T> = { items: T[]; next_cursor: string | null };

export type Media = { kind: "photo" | "video"; url: string; poster_url: string | null };
export type LinkPreview = { url: string; title: string; description: string | null; image_url: string | null; site_name: string | null };

export type Post = {
  id: string; author: MemberRef; body: string; media: Media[]; link_preview: LinkPreview | null; group_id: string | null;
  like_count: number; comment_count: number; liked: boolean; saved: boolean; status: "published" | "pending" | "removed"; share_url: string; created_at: string;
};
export type Comment = { id: string; author: MemberRef; body: string; parent_id: string | null; like_count: number; liked: boolean; replies: Comment[]; status: string; created_at: string };
export type ShowcaseSummary = { id: string; title: string; cover_url: string | null; author: MemberRef; made_with_yallapp: boolean; like_count: number };
export type FeedQuestion = { id: string; slug: string; title: string; excerpt?: string; answer_count?: number; author?: MemberRef };
export type FeedItem =
  | { kind: "post"; id: string; created_at: string; post: Post }
  | { kind: "question"; id: string; created_at: string; question: FeedQuestion }
  | { kind: "showcase"; id: string; created_at: string; showcase: ShowcaseSummary };
export type Story = { id: string; author: MemberRef; media: Media; view_count: number; seen: boolean; created_at: string; expires_at: string };
export type StoryRing = { member: MemberRef; stories: Story[]; all_seen: boolean };
export type ShowcaseItem = {
  id: string; title: string; description: string; app_type: string | null; pictures: string[]; app_store_url: string | null; play_store_url: string | null; website_url: string | null;
  author: MemberRef; made_with_yallapp: boolean; like_count: number; comment_count: number; liked: boolean; status: string; created_at: string;
};
export type Conversation = {
  id: string; kind: "direct" | "group" | "hire"; title: string | null; members: MemberRef[]; last_message: Message | null; unread: number; blocked: boolean; hire_request_id: string | null; updated_at: string;
};
export type Message = { id: string; conversation_id: string; author: MemberRef; body: string; photos: string[]; reply_to: { id: string; body: string; author: MemberRef } | null; deleted: boolean; created_at: string };
export type GroupRole = "owner" | "moderator" | "member";
export type Group = {
  id: string; slug: string; name: string; description: string; visibility: "public" | "private"; cover_url: string | null; owner: MemberRef;
  member_count: number; post_count: number; status: string; standing: { role: GroupRole | null; requested: boolean }; created_at: string;
};
export type GroupMember = { member: MemberRef; role: GroupRole; joined_at: string };
export type ProService = { title: string; description?: string; rate?: string };
export type ProProfile = {
  member: MemberRef; headline: string; about: string; services: ProService[]; skills: string[]; availability: "available" | "busy" | "unavailable";
  portfolio: ShowcaseSummary[]; rating: number | null; review_count: number; done_count: number;
};
export type Review = { rating: number; body: string; client?: MemberRef; created_at: string };
export type HireRequest = { id: string; client: MemberRef; pro: MemberRef; service: string | null; message: string; status: "pending" | "accepted" | "declined" | "done" | "cancelled"; conversation_id: string; review: Review | null; created_at: string };
export type JobType = "full_time" | "part_time" | "contract" | "freelance" | "internship";
export type Job = {
  id: string; poster: MemberRef; title: string; description: string; type: JobType; remote: boolean; location: string; skills: string[]; budget: string;
  status: "pending" | "open" | "closed" | "removed"; application_count: number; applied: boolean; created_at: string;
};
export type JobApplication = { id: string; job_id: string; job_title: string; applicant: MemberRef; message: string; links: string[]; status: "sent" | "shortlisted" | "declined" | "withdrawn"; created_at: string };
export type CourseSummary = { id: string; slug: string; title: string; summary: string; cover_url: string | null; level: "beginner" | "intermediate" | "advanced"; lesson_count: number; access: "open" | "locked"; progress: number | null; price?: string | null; free?: boolean; owned?: boolean };
export type Course = CourseSummary & {
  description: string;
  lessons: { id: string; title: string; kind: "video" | "article"; minutes: number; done: boolean }[];
  quizzes: { id: string; title: string; after_lesson_id: string | null; passed: boolean; questions?: { id: string; text: string; options: string[] }[] }[];
  certificate: Certificate | null;
};
export type Lesson = { id: string; course_id: string; title: string; kind: "video" | "article"; body: string; video_url: string | null; minutes: number; done: boolean };
export type Certificate = { code: string; member_name: string; course_title: string; issued_at: string; verify_url: string; pdf_url: string };
export type LeaderRow = { rank: number; member: MemberRef; points: number; level?: number; level_label?: string };
export type Challenge = {
  id: string; title: string; rules: string; cover_url: string | null; status: "upcoming" | "open" | "voting" | "closed"; starts_at: string; ends_at: string; voting_ends_at: string;
  reward_points: number; reward_badge: string | null; entry_count: number; entered: boolean; winners: ChallengeEntry[];
};
export type ChallengeEntry = { id: string; member: MemberRef; showcase: ShowcaseSummary | null; url: string | null; note: string; vote_count: number; voted: boolean; created_at: string };
export type EventKind = "online" | "in_person" | "live";
export type CmEvent = {
  id: string; title: string; description: string; kind: EventKind; starts_at: string; ends_at: string | null; time_zone: string; location: string | null; join_url: string | null;
  embed_url: string | null; replay_url: string | null; capacity: number | null; cover_url: string | null; going_count: number; going: boolean; live_now: boolean; status: "scheduled" | "cancelled";
};
export type MyTutorial = { id: string; slug?: string; title: string; status: string; kind: "article" | "video"; created_at: string };

/* Members anywhere in a body become the site's MemberRef. */
const MEMBER_KEYS = new Set(["author", "member", "owner", "poster", "applicant", "client", "pro"]);
function fix<T>(v: unknown): T {
  if (Array.isArray(v)) return v.map((x) => fix(x)) as T;
  if (!v || typeof v !== "object") return v as T;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (MEMBER_KEYS.has(k) && x && typeof x === "object" && "display_name" in x) out[k] = apiMember(x as ApiMember);
    else if (k === "members" && Array.isArray(x) && x.every((m) => m && typeof m === "object" && "display_name" in m)) out[k] = x.map((m) => apiMember(m as ApiMember));
    else out[k] = fix(x);
  }
  return out as T;
}

function qs(q: Record<string, string | number | boolean | undefined | null>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const t = s.toString();
  return t ? `?${t}` : "";
}

async function get<T>(path: string): Promise<T | null> {
  const r = await communityApi<unknown>("GET", path).catch(() => null);
  return r && r.status === 200 ? fix<T>(r.body) : null;
}

async function page<T>(path: string): Promise<Page<T>> {
  const r = await get<Raw<T>>(path);
  return r && Array.isArray(r.items) ? { items: r.items, next: r.next_cursor ?? null } : { items: [], next: null };
}

/** A write: ok with the body, or the API's error code and field errors. */
export async function send(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, input: { body?: unknown; form?: FormData } = {}): Promise<Result> {
  const r = await communityApi<{ error?: { code?: string; fields?: Record<string, string> } }>(method, path, input).catch(() => null);
  if (r && r.status >= 200 && r.status < 300) return { ok: true, body: fix(r.body) };
  const e = r?.body && typeof r.body === "object" ? r.body.error : undefined;
  return { ok: false, status: r?.status ?? 500, code: e?.code ?? "error", fields: e?.fields ?? {} };
}

const id = encodeURIComponent;

// Feed, posts and stories (232)
export const feed = (tab: "for_you" | "latest" | "following", cursor?: string) => page<FeedItem>(`/feed${qs({ tab, cursor, limit: 20 })}`);
export const post = (postId: string) => get<Post>(`/posts/${id(postId)}`);
export const postComments = (postId: string) => page<Comment>(`/posts/${id(postId)}/comments${qs({ limit: 50 })}`);
export const memberPosts = (handle: string, cursor?: string) => page<Post>(`/members/${id(`@${handle}`)}/posts${qs({ cursor, limit: 10 })}`);
export const savedPosts = () => page<Post>(`/me/saved${qs({ limit: 30 })}`);
export const stories = async () => (await get<{ items: StoryRing[] }>("/stories"))?.items ?? [];
export const storyViewers = (storyId: string) => page<{ member: MemberRef; viewed_at: string }>(`/stories/${id(storyId)}/viewers`);

// Showcase (232)
export const showcase = (q: { type?: string; sort?: string; member?: string; cursor?: string }) => page<ShowcaseSummary>(`/showcase${qs({ ...q, limit: 24 })}`);
export const showcaseItem = (itemId: string) => get<ShowcaseItem>(`/showcase/${id(itemId)}`);
export const showcaseComments = (itemId: string) => page<Comment>(`/showcase/${id(itemId)}/comments${qs({ limit: 50 })}`);

// Messages (232)
export const conversations = (cursor?: string) => page<Conversation>(`/messages/conversations${qs({ cursor, limit: 30 })}`);
export const conversation = (convId: string) => get<Conversation>(`/messages/conversations/${id(convId)}`);
export const messages = (convId: string, q: { after?: string; cursor?: string } = {}) => page<Message>(`/messages/conversations/${id(convId)}/messages${qs({ ...q, limit: 50 })}`);
export const unreadConversations = async () => (await get<{ conversations: number }>("/messages/unread"))?.conversations ?? 0;

// Groups (232)
export const groups = (q: { mine?: boolean; q?: string; cursor?: string }) => page<Group>(`/groups${qs({ ...q, limit: 24 })}`);
export const group = (slug: string) => get<Group>(`/groups/${id(slug)}`);
export const groupMembers = (slug: string) => page<GroupMember>(`/groups/${id(slug)}/members${qs({ limit: 60 })}`);
export const groupRequests = (slug: string) => page<{ member: MemberRef; created_at: string }>(`/groups/${id(slug)}/requests`);
export const groupFeed = (slug: string, cursor?: string) => page<FeedItem>(`/groups/${id(slug)}/feed${qs({ cursor, limit: 20 })}`);

// Academy, points, challenges and member tutorials (233)
export const courses = (level?: string) => page<CourseSummary>(`/academy/courses${qs({ level, limit: 30 })}`);
export const course = (slug: string) => get<Course>(`/academy/courses/${id(slug)}`);
export const lesson = (courseSlug: string, lessonId: string) => communityApi<Lesson>("GET", `/academy/courses/${id(courseSlug)}/lessons/${id(lessonId)}`).then((r) => ({ status: r.status, lesson: r.status === 200 ? (r.body as Lesson) : null })).catch(() => ({ status: 500, lesson: null }));
export const myCourses = () => page<CourseSummary>("/academy/mine");
export const certificates = () => page<Certificate>("/academy/certificates");
export const certificate = (code: string) => get<Certificate>(`/academy/certificates/${id(code)}`);
export const leaderboard = (period: "week" | "all", cursor?: string) => get<{ items: LeaderRow[]; me: LeaderRow | null; next_cursor: string | null }>(`/leaderboard${qs({ period, cursor, limit: 50 })}`);
export const myPoints = () => get<{ points: number; level: number; level_label: string; next_level_at: number | null; history: Raw<{ reason: string; points: number; created_at: string }> }>("/me/points");
export const pointsTable = () => get<{ actions: { action: string; points: number; daily_cap: number | null }[]; levels: { level: number; label: string; min_points: number }[] }>("/admin/points");
export const challenges = (status?: string) => page<Challenge>(`/challenges${qs({ status, limit: 20 })}`);
export const challenge = (chId: string) => get<Challenge>(`/challenges/${id(chId)}`);
export const challengeEntries = (chId: string) => page<ChallengeEntry>(`/challenges/${id(chId)}/entries${qs({ limit: 60 })}`);
export const myTutorials = () => page<MyTutorial>("/tutorials/mine");

// Pros, jobs and events (234)
export const pros = (q: { q?: string; skill?: string; available?: boolean; cursor?: string }) => page<ProProfile>(`/pros${qs({ ...q, limit: 24 })}`);
export const pro = (handle: string) => get<ProProfile>(`/pros/${id(`@${handle}`)}`);
export const proReviews = (handle: string) => page<Review>(`/pros/${id(`@${handle}`)}/reviews`);
export const myPro = () => get<ProProfile>("/me/pro");
export const hireRequests = (side: "sent" | "received") => page<HireRequest>(`/pros/requests${qs({ side })}`);
export const jobs = (q: { q?: string; type?: string; remote?: boolean; mine?: boolean; cursor?: string }) => page<Job>(`/jobs${qs({ ...q, limit: 24 })}`);
export const job = (jobId: string) => get<Job>(`/jobs/${id(jobId)}`);
export const jobApplications = (jobId: string) => page<JobApplication>(`/jobs/${id(jobId)}/applications`);
export const myApplications = () => page<JobApplication>("/me/job-applications");
export const events = (q: { when?: "upcoming" | "past"; kind?: string; cursor?: string }) => page<CmEvent>(`/events${qs({ ...q, limit: 24 })}`);
export const event = (evId: string) => get<CmEvent>(`/events/${id(evId)}`);
export const attendees = (evId: string) => page<{ member: MemberRef }>(`/events/${id(evId)}/attendees${qs({ limit: 60 })}`);
export const eventComments = (evId: string, after?: string) => page<Comment>(`/events/${id(evId)}/comments${qs({ after, limit: 100 })}`);
