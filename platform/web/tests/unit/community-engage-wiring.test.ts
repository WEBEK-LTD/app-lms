import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 232–233 How area C's phase 2–5 work reaches Yallapp's own services: the
 * Community app's pushes through Yallapp's keyless Firebase sender (no key,
 * only to the Community app), and a course's payment through the same
 * gateway routes as Yallapp's other payments, back to the Community's site.
 */

vi.mock("server-only", () => ({}));
const sent: { account: unknown; tokens: unknown; message: unknown }[] = [];
vi.mock("@/lib/hosted/push", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendPush: async (account: unknown, tokens: string[], message: unknown) => {
    sent.push({ account, tokens, message });
    return { sent: tokens.length, invalidTokens: tokens.filter((t) => t.startsWith("dead")) };
  },
}));

const FIREBASE = {
  GOOGLE_WIF_PROVIDER: "projects/123456/locations/global/workloadIdentityPools/yallapp-platform/providers/platform",
  GOOGLE_PUSH_SERVICE_ACCOUNT: "yallapp-push-sender@yallapp-host.iam.gserviceaccount.com",
  GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT: "yallapp-firebase-apps@yallapp-host.iam.gserviceaccount.com",
};

afterEach(() => {
  vi.unstubAllEnvs();
  sent.length = 0;
});

describe("232 the Community app's pushes", () => {
  it("go nowhere until Yallapp's keyless Firebase and the app's project are both set", async () => {
    const { communityPusher } = await import("@/lib/community/deps");
    expect(communityPusher()).toBeNull();
    for (const [k, v] of Object.entries(FIREBASE)) vi.stubEnv(k, v);
    expect(communityPusher()).toBeNull();
    vi.stubEnv("COMMUNITY_FIREBASE_PROJECT_ID", "Not A Project!");
    expect(communityPusher()).toBeNull();
  });

  it("go through the keyless sender (no private key) for the app's project, and only to the Community app", async () => {
    for (const [k, v] of Object.entries(FIREBASE)) vi.stubEnv(k, v);
    vi.stubEnv("COMMUNITY_FIREBASE_PROJECT_ID", "yallapp-community");
    const { communityPusher } = await import("@/lib/community/deps");
    const push = communityPusher()!;
    const result = await push(
      [
        { token: "live-token", platform: "android" },
        { token: "dead-token", platform: "ios" },
      ],
      { title: "Yallapp Community", body: "Ali started following you.", data: { kind: "follow", link: "/u/ali" } },
    );
    expect(result).toEqual({ sent: 2, invalidTokens: ["dead-token"] });
    expect(sent[0]).toEqual({
      account: { project_id: "yallapp-community", client_email: FIREBASE.GOOGLE_PUSH_SERVICE_ACCOUNT, private_key: "", federated: true },
      tokens: ["live-token", "dead-token"],
      message: { title: "Yallapp Community", body: "Ali started following you.", data: { kind: "follow", link: "/u/ali" }, restrictedPackage: "tr.com.yallapp.community" },
    });
  });
});

describe("233 a course's payment through Yallapp's gateway routes", () => {
  it("has its own kind: the gateway returns to /api/pay/<gateway>/course/<token> (iyzico: /api/pay/course/<token>)", async () => {
    const { callbackUrls, PAYMENT_KINDS } = await import("@/lib/payments/routes");
    expect(PAYMENT_KINDS).toContain("course");
    expect(callbackUrls("https://yallapp.com.tr", "course", "kashier", "tok")).toEqual({ returnUrl: "https://yallapp.com.tr/api/pay/kashier/course/tok", webhookUrl: "https://yallapp.com.tr/api/pay/kashier/course/tok" });
    expect(callbackUrls("https://yallapp.com.tr", "course", "iyzico", "tok")).toEqual({ returnUrl: "https://yallapp.com.tr/api/pay/course/tok", webhookUrl: null });
  });

  it("sends the buyer back to the Community's own site, and everything else to Yallapp's", async () => {
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    const { settledLocation } = await import("@/lib/payments/routes");
    expect(settledLocation("https://community.yallapp.com.tr/academy/studio?checkout=done")).toBe("https://community.yallapp.com.tr/academy/studio?checkout=done");
    expect(settledLocation("/studio/market/mine?done=paidApplied")).toMatch(/\/studio\/market\/mine\?done=paidApplied$/);
    expect(settledLocation("/studio/market/mine")).not.toMatch(/^https:\/\/community\./);
  });
});
