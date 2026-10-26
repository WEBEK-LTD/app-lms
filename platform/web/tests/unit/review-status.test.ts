import { generateKeyPairSync, verify } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { getStore } from "@/lib/data";
import { REJECTION_REASONS, type PublishingTrack } from "@/lib/data/types";
import { dashboardTextFor } from "@/lib/dashboard-words";
import { appleToken, fromAppleState, nextAppleTrack, readAppleState, REJECTION_LINK, REVIEW_CHECK_MINUTES, syncReviewStatuses } from "@/lib/publishing/review";
import { newPublishingRequest, trackChangeProblems } from "@/lib/publishing/steps";
import { NOW } from "./helpers";

const KEY = Buffer.alloc(32, 7);
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const credentials = { keyId: "2X9R4HXF34", issuerId: "57246542-96fe-1a63-e053-0824d011072a", privateKey: PEM };
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

/** App Store Connect, answering with the app and its versions. */
function apple(versions: { state: string; created: string; version?: string }[] | "no_app" | 401) {
  const calls: string[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push(String(url));
    expect(String((init?.headers as Record<string, string>).authorization)).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    if (versions === 401) return new Response("{}", { status: 401 });
    if (String(url).includes("/apps?")) return Response.json({ data: versions === "no_app" ? [] : [{ id: "6450000001" }] });
    return Response.json({
      data: (versions as { state: string; created: string; version?: string }[]).map((v, i) => ({
        id: `v${i}`,
        attributes: { appVersionState: v.state, createdDate: v.created, versionString: v.version ?? "1.0" },
      })),
    });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const track = (status: PublishingTrack["status"], extra: Partial<PublishingTrack> = {}): PublishingTrack => ({ status, note: null, storeUrl: null, updatedAt: null, ...extra });

describe("88.3 review status from the App Store", () => {
  it("maps App Store Connect's states to the Publishing statuses, with the reason when Apple's state says it", () => {
    expect(fromAppleState("WAITING_FOR_REVIEW")).toEqual({ status: "submitted" });
    expect(fromAppleState("IN_REVIEW")).toEqual({ status: "in_review" });
    expect(fromAppleState("PENDING_DEVELOPER_RELEASE")).toEqual({ status: "in_review" });
    expect(fromAppleState("READY_FOR_DISTRIBUTION")).toEqual({ status: "live" });
    expect(fromAppleState("READY_FOR_SALE")).toEqual({ status: "live" });
    expect(fromAppleState("METADATA_REJECTED")).toEqual({ status: "rejected", rejection: "metadata" });
    expect(fromAppleState("INVALID_BINARY")).toEqual({ status: "rejected", rejection: "binary" });
    expect(fromAppleState("PREPARE_FOR_SUBMISSION")).toBeNull();
    expect(fromAppleState("SOMETHING_NEW")).toBeNull();
  });

  it("signs App Store Connect's token with the client's key (ES256, 15 minutes)", () => {
    const token = appleToken(credentials, NOW);
    const [header, payload, signature] = token.split(".");
    expect(JSON.parse(Buffer.from(header!, "base64url").toString())).toEqual({ alg: "ES256", kid: "2X9R4HXF34", typ: "JWT" });
    const claims = JSON.parse(Buffer.from(payload!, "base64url").toString());
    expect(claims).toMatchObject({ iss: credentials.issuerId, aud: "appstoreconnect-v1" });
    expect(claims.exp - claims.iat).toBe(900);
    expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature!, "base64url"))).toBe(true);
  });

  it("reads the newest version's state, and says when there's no app or the key is refused", async () => {
    const { fetcher, calls } = apple([
      { state: "READY_FOR_DISTRIBUTION", created: "2026-09-01T10:00:00Z", version: "1.0" },
      { state: "IN_REVIEW", created: "2026-10-20T10:00:00Z", version: "1.1" },
    ]);
    expect(await readAppleState(fetcher, credentials, "com.ada.app", NOW)).toEqual({ ok: true, state: "IN_REVIEW", version: "1.1" });
    expect(calls[0]).toBe("https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=com.ada.app&limit=1");
    expect(calls[1]).toBe("https://api.appstoreconnect.apple.com/v1/apps/6450000001/appStoreVersions?filter[platform]=IOS&limit=10");
    expect(await readAppleState(apple("no_app").fetcher, credentials, "com.ada.app", NOW)).toEqual({ ok: false, reason: "no_app" });
    expect(await readAppleState(apple(401).fetcher, credentials, "com.ada.app", NOW)).toEqual({ ok: false, reason: "refused" });
    expect(await readAppleState(apple([]).fetcher, credentials, "com.ada.app", NOW)).toEqual({ ok: false, reason: "no_version" });
  });

  it("moves the track along, keeps the team's reason and the store's state", () => {
    expect(nextAppleTrack(track("submitted"), { state: "IN_REVIEW" }, NOW)).toMatchObject({ status: "in_review", storeState: "IN_REVIEW", checkedAt: NOW, updatedAt: NOW, rejection: null });
    expect(nextAppleTrack(track("in_review"), { state: "REJECTED" }, NOW)).toMatchObject({ status: "rejected", rejection: "other" });
    expect(nextAppleTrack(track("in_review"), { state: "METADATA_REJECTED" }, NOW)).toMatchObject({ status: "rejected", rejection: "metadata" });
    // The team chose a reason: the same rejected state keeps it.
    expect(nextAppleTrack(track("rejected", { rejection: "sign_in" }), { state: "REJECTED" }, NOW)).toMatchObject({ status: "rejected", rejection: "sign_in", updatedAt: null });
    // Sent again after a rejection.
    expect(nextAppleTrack(track("rejected", { rejection: "sign_in" }), { state: "WAITING_FOR_REVIEW" }, NOW)).toMatchObject({ status: "submitted", rejection: null });
    // A version being prepared changes nothing but what was read.
    expect(nextAppleTrack(track("submitted"), { state: "PREPARE_FOR_SUBMISSION" }, NOW)).toMatchObject({ status: "submitted", storeState: "PREPARE_FOR_SUBMISSION", updatedAt: null });
  });

  it("checks the iPhone versions in review every half hour, records a new status and emails the client the reason", async () => {
    const dir = path.join(tmpdir(), `yallapp-review-mail-${Date.now()}`);
    process.env.YALLAPP_MAIL_DIR = dir;
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    try {
      const store = await getStore();
      const email = `review-${Date.now()}@academy.test`;
      const { client } = await registerClient(store, { name: "Ada", email, whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
      const base = newApp(client.id, "https://a.test", NOW);
      const app = {
        ...base,
        appName: "Ada Academy",
        iosBundleId: "com.ada.app",
        ascKeyId: credentials.keyId,
        ascIssuerId: credentials.issuerId,
        ascPrivateKeyEncrypted: encrypt(PEM, KEY, keyContext.appStore(base.id)),
      };
      await store.createApp(app);
      const request = newPublishingRequest(app, "managed", NOW);
      await store.savePublishingRequest({ ...request, ios: track("in_review") });

      const rejected = apple([{ state: "METADATA_REJECTED", created: "2026-10-20T10:00:00Z" }]);
      const first = await syncReviewStatuses({ store, key: KEY, now: NOW, fetcher: rejected.fetcher });
      expect(first).toMatchObject({ changed: 1 });
      const saved = await store.getPublishingRequest(app.id);
      expect(saved!.ios).toMatchObject({ status: "rejected", rejection: "metadata", storeState: "METADATA_REJECTED", checkedAt: NOW });
      expect((await store.listPublishingEvents(app.id))[0]).toMatchObject({ store: "ios", status: "rejected", actorEmail: "App Store Connect" });
      const [file] = await readdir(dir);
      const mail = JSON.parse(await readFile(path.join(dir, file!), "utf8")) as Record<string, string>;
      expect(mail.to).toBe(email);
      expect(mail.text).toContain("Why: The store page doesn't match the app");
      expect(mail.text).toContain("What to do: Update the texts and screenshots on the Store listing step");

      // Not again within half an hour; then again, with nothing new.
      const again = apple([{ state: "METADATA_REJECTED", created: "2026-10-20T10:00:00Z" }]);
      await syncReviewStatuses({ store, key: KEY, now: minutes(REVIEW_CHECK_MINUTES - 1), fetcher: again.fetcher });
      expect(again.calls.filter((url) => url.includes("bundleId]=com.ada.app"))).toHaveLength(0);
      await syncReviewStatuses({ store, key: KEY, now: minutes(REVIEW_CHECK_MINUTES + 1), fetcher: again.fetcher });
      expect(again.calls.filter((url) => url.includes("bundleId]=com.ada.app"))).toHaveLength(1);
      expect((await store.listPublishingEvents(app.id)).filter((e) => e.store === "ios")).toHaveLength(1);

      // Store unreachable: counted, and asked again later.
      const down = (async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch;
      const failed = await syncReviewStatuses({ store, key: KEY, now: minutes(2 * REVIEW_CHECK_MINUTES + 2), fetcher: down });
      expect(failed.failed).toBeGreaterThanOrEqual(1);
      expect((await store.getPublishingRequest(app.id))!.ios).toMatchObject({ status: "rejected", checkedAt: minutes(2 * REVIEW_CHECK_MINUTES + 2) });
    } finally {
      delete process.env.YALLAPP_MAIL_DIR;
      vi.unstubAllEnvs();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("lets the team give a reason instead of a note, and only one from the list", () => {
    expect(trackChangeProblems("ios", { status: "rejected", note: "", storeUrl: "", rejection: "sign_in" })).toEqual({});
    expect(trackChangeProblems("ios", { status: "rejected", note: "", storeUrl: "" })).toHaveProperty("note");
    expect(trackChangeProblems("android", { status: "rejected", note: "x", storeUrl: "", rejection: "nonsense" })).toEqual({ rejection: "Choose a reason from the list." });
  });

  it("explains every reason in English, Arabic and Turkish, with a fix and, where there is one, a link", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const { t } = dashboardTextFor(lang);
      for (const reason of REJECTION_REASONS) {
        expect(t(`publishing.reject.${reason}`)).not.toMatch(/^publishing\./);
        expect(t(`publishing.reject.${reason}Fix`)).not.toMatch(/^publishing\./);
      }
    }
    for (const reason of REJECTION_REASONS) {
      const link = REJECTION_LINK[reason];
      if (link) expect(link.startsWith("/dashboard/")).toBe(true);
    }
    expect(REJECTION_LINK.sign_in).toBe("/dashboard/app-sign-in");
  });
});
