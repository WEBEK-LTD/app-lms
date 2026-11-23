import { createLocalJWKSet, decodeJwt, jwtVerify } from "jose";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { endpointsAt } from "@/lib/google/endpoints";
import { EXCHANGE_RETRY_DELAYS_MS, exchangeForAccessToken, FederationError, MESSAGING_SCOPE, transientExchangeError, WIF_SUBJECTS, type Federation } from "@/lib/google/federation";
import { GoogleApiError, googleProblem } from "@/lib/google/http";
import {
  ensurePlatformKey,
  forgetPublishedJwks,
  JWKS_MEMORY_SECONDS,
  OIDC_CACHE_CONTROL,
  oidcIssuer,
  platformJwks,
  publishedPlatformJwks,
  rotatePlatformKey,
  signPlatformJwt,
} from "@/lib/google/platform-keys";
import { FakeGoogle } from "./fake-google";
import { KEY, NOW } from "./helpers";

/**
 * 216 Google's token service unable to reach the platform's issuer for a
 * moment: the exchange is tried again (a passing failure only, a fresh
 * assertion each time), and `/oidc/jwks.json` is kept a minute in memory.
 */

const PROVIDER = "projects/123456789012/locations/global/workloadIdentityPools/yallapp-platform/providers/platform";
const PUSH = "yallapp-push-sender@yallapp-firebase.iam.gserviceaccount.com";
const ISSUER_DOWN = { error: "invalid_grant", error_description: "Error connecting to the given credential's issuer." };

const problem = (status: number, body: unknown) => {
  const p = googleProblem(status, body);
  return new GoogleApiError(p.message, status, p.code);
};

function setup() {
  const store = new MemoryStore();
  const federation: Federation = {
    provider: PROVIDER,
    issuer: oidcIssuer("https://yallapp.com.tr"),
    endpoints: endpointsAt("https://google.test"),
    sign: async (claims) => signPlatformJwt(await ensurePlatformKey(store, "gcp-wif", KEY, NOW), KEY, claims),
  };
  const google = new FakeGoogle({
    provider: PROVIDER,
    accounts: { "push-sender": PUSH },
    verify: async (jwt) => (await jwtVerify(jwt, createLocalJWKSet(platformJwks(await store.listPlatformSigningKeys("gcp-wif"), NOW)), { issuer: "https://yallapp.com.tr/oidc", currentDate: NOW })).payload,
  });
  /** The token service answers `failures` first (a thrown error is the network failing), then as the fake does. */
  const flaky = (failures: (Response | Error)[]) => {
    const assertions: string[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/sts/v1/token")) {
        assertions.push(new URLSearchParams(String(init?.body)).get("subject_token") ?? "");
        const next = failures.shift();
        if (next instanceof Error) throw next;
        if (next) return next;
      }
      return google.fetch(url, init);
    }) as unknown as typeof fetch;
    return { fetcher, assertions };
  };
  const slept: number[] = [];
  const sleep = async (ms: number) => void slept.push(ms);
  const exchange = (fetcher: typeof fetch) => exchangeForAccessToken(federation, { serviceAccount: PUSH, subject: WIF_SUBJECTS.push, scopes: [MESSAGING_SCOPE], fetcher, now: NOW, sleep });
  return { store, google, flaky, slept, exchange };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("216 which failures of the token exchange are tried again", () => {
  it("tries again when Google or the issuer can't be reached, or Google is busy", () => {
    expect(transientExchangeError(new GoogleApiError("Google couldn't be reached: The operation was aborted due to timeout", 0, null))).toBe(true);
    expect(transientExchangeError(problem(429, { error: { status: "RESOURCE_EXHAUSTED", message: "Quota" } }))).toBe(true);
    expect(transientExchangeError(problem(500, null))).toBe(true);
    expect(transientExchangeError(problem(503, { error: { status: "UNAVAILABLE", message: "Try again" } }))).toBe(true);
    // The production alert's words, and other wordings of the same thing, in any case.
    expect(transientExchangeError(problem(400, ISSUER_DOWN))).toBe(true);
    expect(transientExchangeError(problem(400, { error: "invalid_grant", error_description: "ERROR CONNECTING TO THE GIVEN CREDENTIAL'S ISSUER." }))).toBe(true);
    expect(transientExchangeError(problem(400, { error: "invalid_grant", error_description: "Unable to reach the issuer at https://yallapp.com.tr/oidc" }))).toBe(true);
    expect(transientExchangeError(problem(400, { error: "invalid_grant", error_description: "Could not connect to the credential's issuer" }))).toBe(true);
  });

  it("never tries a refusal again", () => {
    expect(transientExchangeError(problem(400, { error: "invalid_grant", error_description: "The audience in ID Token [x] does not match the expected audience." }))).toBe(false);
    expect(transientExchangeError(problem(400, { error: "invalid_grant", error_description: "Invalid JWT signature." }))).toBe(false);
    expect(transientExchangeError(problem(400, { error: "invalid_grant", error_description: "The given credential is rejected by the attribute condition." }))).toBe(false);
    expect(transientExchangeError(problem(400, { error: "invalid_request", error_description: "Error connecting to the given credential's issuer." }))).toBe(false);
    expect(transientExchangeError(problem(401, { error: "unauthorized_client", error_description: "x" }))).toBe(false);
    expect(transientExchangeError(problem(403, { error: { status: "PERMISSION_DENIED", message: "The caller does not have permission" } }))).toBe(false);
    expect(transientExchangeError(new Error("Error connecting to the given credential's issuer"))).toBe(false);
  });
});

describe("216 the token exchange tried again", () => {
  it("gets the token after the issuer was out of reach once, with a new assertion", async () => {
    const s = setup();
    const { fetcher, assertions } = s.flaky([json(400, ISSUER_DOWN)]);
    const token = await s.exchange(fetcher);
    expect(token.token).toBe(`ya29.${PUSH}`);
    expect(s.slept).toEqual([EXCHANGE_RETRY_DELAYS_MS[0]]);
    expect(assertions).toHaveLength(2);
    expect(assertions[0]).not.toBe(assertions[1]);
    expect(decodeJwt(assertions[0]!).jti).not.toBe(decodeJwt(assertions[1]!).jti);
  });

  it("gets through a timeout and a 503, waiting about 1 s then 3 s", async () => {
    const s = setup();
    const { fetcher, assertions } = s.flaky([new Error("The operation was aborted due to timeout"), json(503, { error: { status: "UNAVAILABLE", message: "busy" } })]);
    expect((await s.exchange(fetcher)).token).toBe(`ya29.${PUSH}`);
    expect(s.slept).toEqual([1_000, 3_000]);
    expect(new Set(assertions.map((a) => decodeJwt(a).jti)).size).toBe(3);
  });

  it("stops after three tries, with Google's words", async () => {
    const s = setup();
    const { fetcher, assertions } = s.flaky([json(400, ISSUER_DOWN), json(400, ISSUER_DOWN), json(400, ISSUER_DOWN), json(400, ISSUER_DOWN)]);
    const failed = s.exchange(fetcher);
    await expect(failed).rejects.toBeInstanceOf(FederationError);
    await expect(failed).rejects.toMatchObject({
      step: "exchange",
      message: "Google's token service didn't accept the platform's assertion: invalid_grant: Error connecting to the given credential's issuer. (HTTP 400)",
    });
    expect(assertions).toHaveLength(3);
    expect(s.slept).toEqual([1_000, 3_000]);
  });

  it("doesn't try a refusal again", async () => {
    const s = setup();
    const { fetcher, assertions } = s.flaky([json(400, { error: "invalid_grant", error_description: "The audience in ID Token does not match the expected audience." })]);
    await expect(s.exchange(fetcher)).rejects.toMatchObject({ step: "exchange", message: expect.stringContaining("expected audience") });
    expect(assertions).toHaveLength(1);
    expect(s.slept).toEqual([]);
  });

  it("doesn't try the impersonation again", async () => {
    const s = setup();
    const { fetcher } = s.flaky([]);
    const other = exchangeForAccessToken(
      {
        provider: PROVIDER,
        issuer: oidcIssuer("https://yallapp.com.tr"),
        endpoints: endpointsAt("https://google.test"),
        sign: async (claims) => signPlatformJwt(await ensurePlatformKey(s.store, "gcp-wif", KEY, NOW), KEY, claims),
      },
      { serviceAccount: "someone-else@x.iam.gserviceaccount.com", subject: WIF_SUBJECTS.push, scopes: [MESSAGING_SCOPE], fetcher, now: NOW, sleep: async (ms) => void s.slept.push(ms) },
    );
    await expect(other).rejects.toMatchObject({ step: "impersonate" });
    expect(s.slept).toEqual([]);
  });
});

describe("216 /oidc/jwks.json kept a minute", () => {
  afterEach(() => forgetPublishedJwks());
  const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

  it("makes the first key when there is none, then reads no database for a minute", async () => {
    forgetPublishedJwks();
    const store = new MemoryStore();
    let loads = 0;
    const load = async () => {
      loads++;
      return store;
    };
    const first = await publishedPlatformJwks(load, () => KEY, NOW);
    expect(first.keys).toHaveLength(1);
    expect((await store.listPlatformSigningKeys("gcp-wif")).length).toBe(1);
    expect(await publishedPlatformJwks(load, () => KEY, later(JWKS_MEMORY_SECONDS - 1))).toEqual(first);
    expect(loads).toBe(1);
    // After a minute: read again.
    await publishedPlatformJwks(load, () => KEY, later(JWKS_MEMORY_SECONDS));
    expect(loads).toBe(2);
  });

  it("forgets it when a key is rotated, so the new key is published at once", async () => {
    forgetPublishedJwks();
    const store = new MemoryStore();
    const load = async () => store;
    const first = await publishedPlatformJwks(load, () => KEY, NOW);
    const next = await rotatePlatformKey(store, "gcp-wif", KEY, later(5));
    const after = await publishedPlatformJwks(load, () => KEY, later(6));
    expect(after.keys.map((k) => k.kid)).toEqual([next.kid, first.keys[0]!.kid]);
  });

  it("says caches may serve it stale while they fetch it again", () => {
    expect(OIDC_CACHE_CONTROL).toBe("public, max-age=300, stale-while-revalidate=3600");
  });
});
