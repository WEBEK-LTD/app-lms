import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet, type JWK } from "jose";
import { handleCommunity } from "@/lib/community/api/service";
import type { CommunityDeps } from "@/lib/community/api/http";
import { jwtVerifier } from "@/lib/community/auth/id-tokens";
import { memoryMailer } from "@/lib/community/mail";
import { memoryCommunityStore } from "@/lib/community/store/memory";
import { MemoryStore } from "@/lib/data/memory";

/**
 * 231 The community's tests: a whole community in memory (its store and
 * Yallapp's), fake Apple and Google keys, a mailer that keeps what it sent,
 * uploads kept in a map, and `api()` to call /api/community/v1 as a member.
 * Areas B and C use it too.
 */
export const NOW = new Date("2026-11-25T09:00:00.000Z");

export interface TestCommunity {
  deps: CommunityDeps;
  mail: ReturnType<typeof memoryMailer>;
  uploads: Map<string, { bytes: Uint8Array; contentType: string }>;
  /** Signs an Apple or Google ID token with the test keys. */
  idToken(provider: "apple" | "google", claims: Record<string, unknown>): Promise<string>;
  /** Moves the clock. */
  at(now: Date): void;
}

export const APPLE_AUDIENCE = "tr.com.yallapp.community";
export const GOOGLE_AUDIENCE = "community-web.apps.googleusercontent.com";

export async function testCommunity(options: { providers?: boolean } = {}): Promise<TestCommunity> {
  const mail = memoryMailer();
  const uploads = new Map<string, { bytes: Uint8Array; contentType: string }>();
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: "test", alg: "RS256" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const providers = options.providers ?? true;
  const deps: CommunityDeps = {
    store: memoryCommunityStore(),
    platform: new MemoryStore(),
    now: NOW,
    ip: "203.0.113.7",
    siteUrl: "https://community.yallapp.test",
    yallappUrl: "https://yallapp.test",
    apple: providers ? jwtVerifier(keys, "https://appleid.apple.com", [APPLE_AUDIENCE]) : null,
    google: providers ? jwtVerifier(keys, ["https://accounts.google.com"], [GOOGLE_AUDIENCE]) : null,
    mail,
    upload: async (key, bytes, contentType) => {
      uploads.set(key, { bytes, contentType });
      return `https://yallapp.test/api/community/files/${key.split("/").pop()}`;
    },
  };
  return {
    deps,
    mail,
    uploads,
    async idToken(provider, claims) {
      return new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setIssuer(provider === "apple" ? "https://appleid.apple.com" : "https://accounts.google.com")
        .setAudience(provider === "apple" ? APPLE_AUDIENCE : GOOGLE_AUDIENCE)
        .setIssuedAt(Math.floor(deps.now.getTime() / 1000) - 10)
        .setExpirationTime(Math.floor(deps.now.getTime() / 1000) + 600)
        .sign(privateKey);
    },
    at(now) {
      deps.now = now;
    },
  };
}

export interface ApiAnswer<T = Record<string, unknown>> {
  status: number;
  body: T;
}

/** Calls the Community API: `api(c, "POST", "/qa/questions", { token, body })`. */
export async function api<T = Record<string, unknown>>(
  community: TestCommunity,
  method: string,
  pathAndQuery: string,
  input: { token?: string | null; body?: unknown; form?: FormData; lang?: string } = {},
): Promise<ApiAnswer<T>> {
  const url = new URL(pathAndQuery, "https://community.yallapp.test");
  const result = await handleCommunity(community.deps, {
    method,
    path: url.pathname.split("/").filter(Boolean),
    query: url.searchParams,
    body: input.body,
    form: input.form ?? null,
    token: input.token ?? null,
    acceptLanguage: input.lang ?? null,
  });
  return { status: result.status, body: (result.body ?? {}) as T };
}

/** A new member signed up with email: their token and member. */
export async function joinWithEmail(
  community: TestCommunity,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<{ token: string; refresh: string; id: string; username: string; email: string }> {
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@members.test`;
  const r = await api<{ access_token: string; refresh_token: string; member: { id: string; username: string } }>(community, "POST", "/auth/email/sign-up", {
    body: { email, password: "correct horse battery", display_name: name, ...extra },
  });
  if (r.status !== 201) throw new Error(`sign-up failed: ${r.status} ${JSON.stringify(r.body)}`);
  return { token: r.body.access_token, refresh: r.body.refresh_token, id: r.body.member.id, username: r.body.member.username, email };
}

/**
 * 231 Makes the member one of those who run the community: their linked
 * Yallapp account is on Yallapp's admin team with `role` (owner or admin:
 * a Community admin; support: "Yallapp Team" only), as lib/community/staff.ts
 * asks on every request.
 */
export async function makeYallappStaff(community: TestCommunity, memberId: string, role: "owner" | "admin" | "support" = "admin"): Promise<void> {
  const platform = community.deps.platform;
  const user = await platform.createUser({ email: `staff-${memberId}@yallapp.test`, name: "Yallapp staff", passwordHash: null, now: community.deps.now });
  await platform.saveAdminMember({ userId: user.id, role, addedBy: "owner@yallapp.test", addedAt: community.deps.now, updatedAt: community.deps.now });
  await community.deps.store.base.updateMember(memberId, { yallappUserId: user.id, linkedAt: community.deps.now });
}
