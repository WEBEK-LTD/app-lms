import { createHmac, timingSafeEqual } from "node:crypto";
import type { CommunityContext } from "../api/http";
import { contentTarget } from "../api/content-targets";
import type { CommunityMember, CommunityTargetType } from "../types";
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

/** What area C reads from area B's Q&A store, once B's store has it (each optional until then). */
interface QaBridge {
  memberStats?: (id: string) => Promise<{ acceptedAnswers: number; approvedTutorials: number; lastActiveAt?: Date | null }>;
  contentInfo?: (kind: ContentKind, id: string) => Promise<{ memberId?: string; authorId?: string; title: string; link: string } | null>;
  setContentStatus?: (kind: ContentKind, id: string, status: "published" | "hidden") => Promise<void>;
  recentTexts?: (memberId: string) => Promise<string[]>;
}

/** Private files (the Gold form's ID proof): kept out of the public files, opened by admins through a signed link. */
export interface PrivateFiles {
  put: (key: string, bytes: Uint8Array, contentType: string) => Promise<void>;
  get: (key: string) => Promise<{ data: Uint8Array; contentType: string } | null>;
}

/** Yallapp's blob store, loaded when first needed (server only). */
async function blobFiles(): Promise<PrivateFiles> {
  const { getBlobStore } = await import("../../blobs");
  const blobs = getBlobStore();
  return {
    put: (key, bytes, type) => blobs.put(key, Buffer.from(bytes), type),
    get: async (key) => {
      const got = await blobs.get(key);
      return got ? { data: new Uint8Array(got.data), contentType: got.contentType } : null;
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
  const qa = ctx.store.qa as unknown as QaBridge;
  const store = ctx.store.trust as TrustStore;
  // Given in tests (options, or the deps' `privateFiles`); Yallapp's blob store otherwise.
  const given = options.files ?? (ctx.deps as { privateFiles?: PrivateFiles }).privateFiles;
  const files = given ? Promise.resolve(given) : null;
  const filesOf = () => files ?? blobFiles();
  const secret = async () => options.secret ?? (ctx.deps as { fileSecret?: string }).fileSecret ?? (await import("../../env")).signingSecret();
  const member = async (id: string) => {
    const m = await base.getMember(id);
    return m ? trustMemberOf(m) : null;
  };
  const info = async (kind: ContentKind, id: string): Promise<ContentInfo | null> => {
    if (qa.contentInfo) {
      const got = await qa.contentInfo(kind, id);
      const authorId = got?.authorId ?? got?.memberId;
      return got && authorId ? { authorId, title: got.title, link: got.link } : null;
    }
    // Until B's store says more: who wrote it (A's content targets), with no title.
    const target = await contentTarget(ctx as CommunityContext, kind as Exclude<CommunityTargetType, "member">, id);
    return target?.authorId ? { authorId: target.authorId, title: "", link: "/" } : null;
  };
  return {
    store,
    now: () => ctx.now,
    member,
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
      const m = await base.getMember(id);
      const qaStats = qa.memberStats ? await qa.memberStats(id) : null;
      return { points: m?.points ?? 0, acceptedAnswers: qaStats?.acceptedAnswers ?? 0, approvedTutorials: qaStats?.approvedTutorials ?? 0, lastActiveAt: qaStats?.lastActiveAt ?? m?.lastActiveAt ?? null };
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
        await qa.setContentStatus?.(kind, id, status);
      },
      recentTexts: qa.recentTexts ? (id) => qa.recentTexts!(id) : undefined,
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
    // The Community's mailer sends the HTML too where it can (lib/mail.ts).
    sendMail: (mail) => ctx.deps.mail(mail as Parameters<typeof ctx.deps.mail>[0]),
    siteUrl: ctx.deps.siteUrl,
    logoUrl: null,
  };
}
