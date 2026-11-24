import { isCommunityAdmin } from "../staff";
import { createHmac, timingSafeEqual } from "node:crypto";
import { adminRoleOf } from "../../admin/team";
import type { CommunityContext } from "../api/http";
import { withQa } from "../qa/hooks";
import { contentInfo, memberStats, recentTexts, setContentStatus, type QaContentKind } from "../qa/service";
import type { CommunityMember } from "../types";
import { linkedApps, yallappAccountName } from "../yallapp";
import type { ContentInfo, LinkedAccount, TrustDeps, TrustMember } from "./service";
import type { ContentKind, TrustStore } from "./store";

/**
 * 231 Area C's service (./service.ts) inside the Community API: its deps
 * made from a request's context. The member is area A's, the linked
 * Yallapp account is read from Yallapp's own store, posts and their numbers
 * are area B's (through its Q&A store), private files go to Yallapp's blob
 * store, and email goes out through the Community's mailer.
 */

/** Area B's kind for what area C calls a post: a reply to an answer is a "comment" here, a "reply" there. */
const qaKind = (kind: ContentKind): QaContentKind | null => (kind === "comment" || kind === "reply" ? "reply" : kind === "question" || kind === "answer" || kind === "tutorial" ? kind : null);

/** Private files (the Gold form's ID proof): kept out of the public files, opened by admins through a signed link (`CommunityDeps.privateFiles`). */
export interface PrivateFiles {
  put: (key: string, bytes: Uint8Array, contentType: string) => Promise<void>;
  get: (key: string) => Promise<{ bytes: Uint8Array; contentType: string } | null>;
}

/** Yallapp's blob store, loaded when first needed (server only). */
async function blobFiles(): Promise<PrivateFiles> {
  const { getBlobStore } = await import("../../blobs");
  const blobs = getBlobStore();
  return {
    put: (key, bytes, type) => blobs.put(key, Buffer.from(bytes), type),
    get: async (key) => {
      const got = await blobs.get(key);
      return got ? { bytes: new Uint8Array(got.data), contentType: got.contentType } : null;
    },
  };
}

/** The path that serves an ID proof through a signed, short-lived link. */
export const ID_PROOF_PATH = "/api/community/id-proof";

/** The signature on a private file's link: the key and its expiry, with Yallapp's signing secret. */
export function signFileLink(secret: string, key: string, expires: number): string {
  return createHmac("sha256", secret).update(`community-file:${key}:${expires}`).digest("base64url");
}

/** Whether a private file's link is genuine and not expired. */
export function fileLinkValid(secret: string, key: string, expires: number, signature: string, now: Date): boolean {
  if (!Number.isFinite(expires) || expires * 1000 < now.getTime()) return false;
  const want = Buffer.from(signFileLink(secret, key, expires));
  const got = Buffer.from(signature);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function trustMemberOf(m: CommunityMember): TrustMember {
  return {
    id: m.id,
    displayName: m.displayName,
    role: m.role,
    status: m.status,
    language: m.language,
    // Only to an address the member proved is theirs.
    email: m.email && m.emailVerified ? m.email : null,
    createdAt: m.createdAt,
    approvedPosts: m.approvedPosts,
  };
}

/** Area C's deps for this request. `files` and `secret` are given in tests; Yallapp's blob store and signing secret otherwise. */
export function trustDepsOf(ctx: Pick<CommunityContext, "deps" | "store" | "now">, options: { files?: PrivateFiles; secret?: string } = {}): TrustDeps {
  const base = ctx.store.base;
  const store = ctx.store.trust as TrustStore;
  // Area B's functions read its store from the call's scope.
  const inQa = <T,>(fn: () => Promise<T>) => withQa(ctx.store.qa, {}, fn);
  // Given in tests (options, or the deps' `privateFiles`); Yallapp's blob store otherwise.
  const given = options.files ?? ctx.deps.privateFiles;
  const files = given ? Promise.resolve(given) : null;
  const filesOf = () => files ?? blobFiles();
  const secret = async () => options.secret ?? ctx.deps.fileSecret ?? (await import("../../env")).signingSecret();
  const member = async (id: string) => {
    const m = await base.getMember(id);
    if (!m) return null;
    // 231 An admin is a member whose linked Yallapp account is an owner or admin of Yallapp's admin,
    // asked now (lib/community/staff.ts); the stored role "admin" makes no one an admin.
    const admin = await isCommunityAdmin(ctx, ctx.deps.platform, m);
    return trustMemberOf({ ...m, role: admin ? "admin" : m.role === "admin" ? "member" : m.role });
  };
  const info = async (kind: ContentKind, id: string): Promise<ContentInfo | null> => {
    const k = qaKind(kind);
    const got = k ? await inQa(() => contentInfo(k, id)) : null;
    return got ? { authorId: got.memberId, title: got.title || got.text.slice(0, 140), link: got.link } : null;
  };
  return {
    store,
    now: () => ctx.now,
    member,
    platformAdmin: async (id) => {
      const m = await base.getMember(id);
      if (!m?.yallappUserId) return false;
      const user = await ctx.deps.platform.getUserById(m.yallappUserId);
      if (!user) return false;
      // The same check as Yallapp's own admin (src/app/admin): SUPER_ADMIN_EMAILS, else the team's role; owners and admins only.
      const role = await adminRoleOf(ctx.deps.platform, user);
      return role === "owner" || role === "admin";
    },
    countApprovedPost: async (id) => {
      const m = await base.getMember(id);
      if (m) await base.updateMember(id, { approvedPosts: m.approvedPosts + 1 });
    },
    setMemberStatus: async (id, status) => {
      const m = await base.getMember(id);
      if (!m) return;
      await base.updateMember(id, { status, sessionVersion: m.sessionVersion + 1, updatedAt: ctx.now });
      if (status === "suspended") await base.deleteSessions(id);
    },
    stats: async (id) => {
      const [m, qa] = await Promise.all([base.getMember(id), inQa(() => memberStats(id))]);
      const qaActive = qa.lastActiveAt ? new Date(qa.lastActiveAt) : null;
      const lastActiveAt = [qaActive, m?.lastActiveAt ?? null].filter((d): d is Date => d !== null).sort((x, y) => y.getTime() - x.getTime())[0] ?? null;
      return { points: m?.points ?? 0, acceptedAnswers: qa.acceptedAnswers, approvedTutorials: qa.approvedTutorials, lastActiveAt };
    },
    linked: async (id): Promise<LinkedAccount | null> => {
      const m = await base.getMember(id);
      if (!m?.yallappUserId) return null;
      const apps = await linkedApps(ctx.deps.platform, m.yallappUserId, ctx.now);
      const paid = apps.find((a) => a.paidPlan);
      const appUrl = paid ? (paid.appStoreUrl ?? paid.playStoreUrl ?? undefined) : undefined;
      const companyName = paid ? ((await yallappAccountName(ctx.deps.platform, m.yallappUserId)) ?? paid.name) : undefined;
      return { apps, business: paid ? { companyName, ...(appUrl ? { appUrl } : {}), appId: paid.appId } : null };
    },
    content: {
      info,
      setStatus: async (kind, id, status) => {
        const k = qaKind(kind);
        if (k) await inQa(() => setContentStatus(k, id, status, ctx.now));
      },
      recentTexts: (id) => inQa(() => recentTexts(id, 5)),
    },
    files: {
      put: async (key, bytes, type) => (await filesOf()).put(key, bytes, type),
      link: async (key, seconds) => {
        const expires = Math.floor(ctx.now.getTime() / 1000) + seconds;
        const url = new URL(ID_PROOF_PATH, ctx.deps.yallappUrl);
        url.searchParams.set("k", key);
        url.searchParams.set("e", String(expires));
        url.searchParams.set("s", signFileLink(await secret(), key, expires));
        return url.toString();
      },
    },
    sendMail: (mail) => ctx.deps.mail(mail),
    siteUrl: ctx.deps.siteUrl,
    logoUrl: null,
  };
}
