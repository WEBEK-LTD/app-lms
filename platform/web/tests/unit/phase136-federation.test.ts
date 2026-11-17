import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { decrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import { endpointsAt } from "@/lib/google/endpoints";
import { ASSERTION_SECONDS, assertionAudience, exchangeForAccessToken, federatedAccessToken, FederationError, forgetFederatedTokens, MESSAGING_SCOPE, WIF_SUBJECTS, type Federation } from "@/lib/google/federation";
import { googleProblem } from "@/lib/google/http";
import {
  ensurePlatformKey,
  oidcIssuer,
  openIdConfiguration,
  platformJwks,
  platformKeyContext,
  RETIRED_PLATFORM_KEY_SECONDS,
  rotatePlatformKey,
  signPlatformJwt,
} from "@/lib/google/platform-keys";
import { FakeGoogle } from "./fake-google";
import { KEY, NOW } from "./helpers";

/**
 * 136 The platform as its own OpenID Connect issuer, and keyless access to
 * Google through Workload Identity Federation: the discovery document and
 * key set Google reads, the 5-minute ES256 assertion, and the exchange for a
 * service account's token through a fake STS and IAM credentials API.
 */

const PROVIDER = "projects/123456789012/locations/global/workloadIdentityPools/yallapp-platform/providers/platform";
const PUSH = "yallapp-push-sender@yallapp-firebase.iam.gserviceaccount.com";
const APPS = "yallapp-firebase-apps@yallapp-firebase.iam.gserviceaccount.com";
const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

async function federationOf(store: MemoryStore, now: () => Date = () => NOW): Promise<Federation> {
  return {
    provider: PROVIDER,
    issuer: oidcIssuer("https://yallapp.com.tr/"),
    endpoints: endpointsAt("https://google.test"),
    sign: async (claims) => signPlatformJwt(await ensurePlatformKey(store, "gcp-wif", KEY, now()), KEY, claims),
  };
}

function fakeFor(store: MemoryStore, now: () => Date = () => NOW) {
  return new FakeGoogle({
    provider: PROVIDER,
    accounts: { "push-sender": PUSH, "firebase-apps": APPS },
    verify: async (jwt) => {
      const keys = platformJwks(await store.listPlatformSigningKeys("gcp-wif"), now());
      const { payload } = await jwtVerify(jwt, createLocalJWKSet(keys), { issuer: "https://yallapp.com.tr/oidc", algorithms: ["ES256"], currentDate: now() });
      return payload;
    },
  });
}

describe("136 the platform as an OpenID Connect issuer", () => {
  it("publishes the discovery document Google reads", () => {
    expect(openIdConfiguration("https://yallapp.com.tr")).toEqual({
      issuer: "https://yallapp.com.tr/oidc",
      jwks_uri: "https://yallapp.com.tr/oidc/jwks.json",
      id_token_signing_alg_values_supported: ["ES256"],
      response_types_supported: ["id_token"],
      subject_types_supported: ["public"],
      claims_supported: ["iss", "sub", "aud", "iat", "exp", "jti"],
    });
  });

  it("makes one ES256 key, encrypted, and publishes its public part only", async () => {
    const store = new MemoryStore();
    const key = await ensurePlatformKey(store, "gcp-wif", KEY, NOW);
    expect((await ensurePlatformKey(store, "gcp-wif", KEY, NOW)).kid).toBe(key.kid);
    expect(key).toMatchObject({ purpose: "gcp-wif", alg: "ES256", retiredAt: null });
    // The private key is PKCS#8 sealed with ENCRYPTION_KEY under its own context, never in the key set.
    expect(key.privateKeyEncrypted).not.toContain("PRIVATE KEY");
    expect(decrypt(key.privateKeyEncrypted!, KEY, platformKeyContext("gcp-wif"))).toContain("BEGIN PRIVATE KEY");
    expect(() => decrypt(key.privateKeyEncrypted!, KEY, "app-auth-key:x")).toThrow();
    const set = platformJwks(await store.listPlatformSigningKeys("gcp-wif"), NOW);
    expect(set.keys).toEqual([{ kty: "EC", crv: "P-256", x: key.publicJwk.x, y: key.publicJwk.y, kid: key.kid, alg: "ES256", use: "sig" }]);
    expect(JSON.stringify(set)).not.toMatch(/"d"/);
  });

  it("signs a 5-minute assertion Google's checks accept, with its kid", async () => {
    const store = new MemoryStore();
    const key = await ensurePlatformKey(store, "gcp-wif", KEY, NOW);
    const iat = Math.floor(NOW.getTime() / 1000);
    const jwt = await signPlatformJwt(key, KEY, { iss: "https://yallapp.com.tr/oidc", sub: "push-sender", aud: assertionAudience(PROVIDER), iat, exp: iat + ASSERTION_SECONDS, jti: "j1" });
    expect(decodeProtectedHeader(jwt)).toEqual({ alg: "ES256", typ: "JWT", kid: key.kid });
    const { payload } = await jwtVerify(jwt, createLocalJWKSet(platformJwks([key], NOW)), { issuer: "https://yallapp.com.tr/oidc", audience: `https://iam.googleapis.com/${PROVIDER}`, currentDate: NOW });
    expect(payload).toMatchObject({ sub: "push-sender", iat, exp: iat + 300, jti: "j1" });
    // Past its five minutes it no longer verifies.
    await expect(jwtVerify(jwt, createLocalJWKSet(platformJwks([key], NOW)), { currentDate: later(301) })).rejects.toThrow();
  });

  it("rotates: the old key stops signing, stays published two days, then goes", async () => {
    const store = new MemoryStore();
    const first = await ensurePlatformKey(store, "gcp-wif", KEY, NOW);
    const second = await rotatePlatformKey(store, "gcp-wif", KEY, later(60));
    const keys = await store.listPlatformSigningKeys("gcp-wif");
    expect(keys.map((k) => k.kid)).toEqual([second.kid, first.kid]);
    expect(keys[1]).toMatchObject({ privateKeyEncrypted: null, retiredAt: later(60) });
    expect(platformJwks(keys, later(60 + RETIRED_PLATFORM_KEY_SECONDS - 1)).keys.map((k) => k.kid)).toEqual([second.kid, first.kid]);
    expect(platformJwks(keys, later(60 + RETIRED_PLATFORM_KEY_SECONDS + 1)).keys.map((k) => k.kid)).toEqual([second.kid]);
    expect(RETIRED_PLATFORM_KEY_SECONDS).toBe(2 * 86_400);
    await rotatePlatformKey(store, "gcp-wif", KEY, later(60 + RETIRED_PLATFORM_KEY_SECONDS + 10));
    expect((await store.listPlatformSigningKeys("gcp-wif")).map((k) => k.kid)).not.toContain(first.kid);
  });
});

describe("136 Workload Identity Federation (a fake STS and IAM credentials)", () => {
  it("exchanges the platform's assertion for the service account's token, no key anywhere", async () => {
    const store = new MemoryStore();
    const google = fakeFor(store);
    const token = await exchangeForAccessToken(await federationOf(store), { serviceAccount: PUSH, subject: WIF_SUBJECTS.push, scopes: [MESSAGING_SCOPE], fetcher: google.fetch, now: NOW });
    expect(token.token).toBe(`ya29.${PUSH}`);
    const [sts, iam] = google.calls;
    expect(sts).toMatchObject({ method: "POST", path: "/sts/v1/token" });
    expect(sts!.body).toMatchObject({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: `//iam.googleapis.com/${PROVIDER}`,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    });
    expect(iam).toMatchObject({ path: `/iamcredentials/v1/projects/-/serviceAccounts/${PUSH}:generateAccessToken`, authorization: "Bearer sts.push-sender", body: { scope: [MESSAGING_SCOPE], lifetime: "3600s" } });
    // What Google saw: the issuer, the subject, the provider as audience, five minutes.
    expect(google.assertions[0]).toMatchObject({ iss: "https://yallapp.com.tr/oidc", sub: "push-sender", aud: `https://iam.googleapis.com/${PROVIDER}` });
    expect(google.assertions[0]!.exp! - google.assertions[0]!.iat!).toBe(300);
  });

  it("keeps a token until a minute before it ends, per account and scopes", async () => {
    forgetFederatedTokens();
    const store = new MemoryStore();
    const google = fakeFor(store, () => new Date());
    const federation = await federationOf(store, () => new Date());
    const ask = (account: string, subject: "push-sender" | "firebase-apps", now = new Date()) => federatedAccessToken(federation, { serviceAccount: account, subject, scopes: [MESSAGING_SCOPE], fetcher: google.fetch, now });
    await ask(PUSH, "push-sender");
    await ask(PUSH, "push-sender");
    expect(google.calls.filter((c) => c.path === "/sts/v1/token")).toHaveLength(1);
    await ask(APPS, "firebase-apps");
    expect(google.calls.filter((c) => c.path === "/sts/v1/token")).toHaveLength(2);
    // Within the last minute of its hour: a new one.
    await ask(PUSH, "push-sender", new Date(Date.now() + 3600_000 - 30_000));
    expect(google.calls.filter((c) => c.path === "/sts/v1/token")).toHaveLength(3);
    forgetFederatedTokens();
  });

  it("says which step failed, in Google's words", async () => {
    const store = new MemoryStore();
    const google = fakeFor(store);
    const federation = await federationOf(store);
    // A subject the provider's attribute condition doesn't let in.
    const wrong = exchangeForAccessToken(federation, { serviceAccount: PUSH, subject: "nobody" as "push-sender", scopes: [MESSAGING_SCOPE], fetcher: google.fetch, now: NOW });
    await expect(wrong).rejects.toBeInstanceOf(FederationError);
    await expect(wrong).rejects.toMatchObject({ step: "exchange", message: expect.stringContaining("attribute condition refuses this subject") });
    // The push sender may not become the apps account.
    const other = exchangeForAccessToken(federation, { serviceAccount: APPS, subject: "push-sender", scopes: [MESSAGING_SCOPE], fetcher: google.fetch, now: NOW });
    await expect(other).rejects.toMatchObject({ step: "impersonate", message: expect.stringContaining("PERMISSION_DENIED") });
    // A key set without the signing key (another issuer's): Google can't verify it.
    const stranger = new MemoryStore();
    const unknown = exchangeForAccessToken(await federationOf(stranger), { serviceAccount: PUSH, subject: "push-sender", scopes: [MESSAGING_SCOPE], fetcher: google.fetch, now: NOW });
    await expect(unknown).rejects.toMatchObject({ step: "exchange", message: expect.stringContaining("can't be verified") });
  });

  it("reads Google's two error shapes", () => {
    expect(googleProblem(403, { error: { code: 403, status: "PERMISSION_DENIED", message: "The caller does not have permission" } })).toEqual({ code: "PERMISSION_DENIED", message: "PERMISSION_DENIED: The caller does not have permission (HTTP 403)" });
    expect(googleProblem(400, { error: "invalid_grant", error_description: "Bad assertion" })).toEqual({ code: "invalid_grant", message: "invalid_grant: Bad assertion (HTTP 400)" });
    expect(googleProblem(502, null)).toEqual({ code: null, message: "HTTP 502" });
  });
});
