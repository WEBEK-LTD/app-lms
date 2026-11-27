import { createHmac, timingSafeEqual } from "node:crypto";
import { isCommunityAdmin } from "../staff";
import type { CommunityContext } from "../api/http";
import { withQaFor } from "../api/qa-hooks";
import { pushToMember } from "../engage/push";
import { CONTENT_KINDS } from "../content-kinds";
import { contentInfo, memberStats, recentTexts, setContentStatus, type QaContentKind } from "../qa/service";
import { YALLAPP_TENANT, type CommunityMember } from "../types";
import { linkedApps, yallappAccountName } from "../yallapp";
import type { ContentInfo, LinkedAccount, TrustDeps, TrustMember } from "./service";
import type { ContentKind, TrustStore } from "./store";
import { connectContentInfo, isConnectKind, setConnectStatus } from "../connect/content";

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
  delete?: (key: string) => Promise<void>;
}

/** Yallapp's blob store, loaded when first needed (server only). */
async function blobFiles(): Promise<PrivateFiles> {
  const { getBlobStore } = await import("../../blobs");
  const blobs = getBlobStore();
  return {
    put: (key, bytes, type) => blobs.put(key, Buffer.from(bytes), type),
    delete: (key) => blobs.delete(key),
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
export function trustDepsOf(ctx: Pick<CommunityContext, "deps" | "store" | "now"> & Partial<CommunityContext>, options: { files?: PrivateFiles; secret?: string } = {}): TrustDeps {
  const base = ctx.store.base;
  const store = ctx.store.trust as TrustStore;
  // Area B's functions read its store from the call's scope.
  const inQa = <T,>(fn: () => Promise<T>) => withQaFor(ctx, fn);
  // Given in tests (options, or the deps' `privateFiles`); Yallapp's blob store otherwise.
  const given = options.files ?? ctx.deps.privateFiles;
  const files = given ? Promise.resolve(given) : null;
  const filesOf = () => files ?? blobFiles();
  const secret = async () => options.secret ?? ctx.deps.fileSecret ?? (await import("../../env")).signingSecret();
  const member = async (id: string) => {
    const m = await base.getMember(id);
    return m ? trustMemberOf(m) : null;
  };
  const info = async (kind: ContentKind, id: string): Promise<ContentInfo | null> => {
    // 232–235 The kinds phases 2 to 5 add, from their areas' table.
    const adapter = CONTENT_KINDS[kind];
    if (adapter) {
      const got = await adapter.info(ctx, id);
      return got ? { authorId: got.authorId ?? "", title: got.title.slice(0, 140), link: got.link } : null;
    }
    // 232–234 Area A's groups, jobs, reviews and reported conversations.
    if (isConnectKind(kind)) {
      const got = await connectContentInfo(ctx.store, kind, id);
      return got ? { authorId: got.authorId, title: got.title, link: got.link } : null;
    }
    const k = qaKind(kind);
    const got = k ? await inQa(() => contentInfo(k, id)) : null;
    if (!got) return null;
    // A moderator judges an answer or a reply by its own words, not by its question's title.
    const own = kind === "question" || kind === "tutorial" ? got.title || got.text : got.text || got.title;
    return { authorId: got.memberId, title: own.slice(0, 140), link: got.link };
  };
  return {
    store,
    now: () => ctx.now,
    member,
    blockedEitherWay: (id) => base.blockedEitherWay(id),
    platformAdmin: async (id) => {
      // 232–235 A client app's community is run by the client, from their dashboard (CommunityRequest.tenantAdmin, set in-process only).
      if (ctx.store.tenant !== YALLAPP_TENANT) return ctx.req?.tenantAdmin === true && ctx.member?.id === id;
      const m = await base.getMember(id);
      // A's check (lib/community/staff.ts): an active member whose linked Yallapp account is an owner or admin of Yallapp's admin, asked now.
      return m ? isCommunityAdmin(ctx.req ?? ctx, ctx.deps.platform, m) : false;
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
        const adapter = CONTENT_KINDS[kind];
        if (adapter) return adapter.setStatus(ctx, id, status);
        if (isConnectKind(kind)) return setConnectStatus(ctx.store, kind, id, status, ctx.now);
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
      delete: async (key) => {
        const f = await filesOf();
        if (!f.delete) throw new Error("These private files can't be deleted.");
        await f.delete(key);
      },
    },
    // 232 Through the engage store's devices (lib/community/engage/push.ts).
    push: ctx.deps.push ? (memberId, message) => pushToMember(ctx, memberId, message).then(() => undefined) : undefined,
    sendMail: (mail) => ctx.deps.mail(mail),
    siteUrl: ctx.deps.siteUrl,
    logoUrl: null,
  };
}
