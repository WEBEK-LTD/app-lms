import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { artifactLinks, fileLink, fileSignature, fileSignaturePayload, FILES_NOT_CONFIGURED, signFileUrl } from "@/lib/files";

/**
 * Known vector, also checked on the PHP side (files.yallapp.com.tr):
 *   hash_hmac('sha256', '/builds/abc/app-release.apk' . '?expires=' . 1700000000, 'test-secret')
 */
const VECTOR = {
  secret: "test-secret",
  path: "/builds/abc/app-release.apk",
  expires: 1_700_000_000,
  sig: "f1f395dfe32709151976d3aa9b403bb9fdb657ad4a88645891b248287a865fad",
};

const BASE = "https://files.yallapp.com.tr";
const SECRET = "files-signing-secret-0123456789abcdef";
// 15 minutes before the vector's expiry, so a link signed now expires at 1700000000.
const NOW = new Date((VECTOR.expires - 15 * 60) * 1000);

describe("signed download links for files.yallapp.com.tr", () => {
  afterEach(() => {
    delete process.env.FILES_BASE_URL;
    delete process.env.FILES_SIGNING_SECRET;
  });

  it(`signs "${VECTOR.path}?expires=${VECTOR.expires}" with "${VECTOR.secret}" as sig=${VECTOR.sig}`, () => {
    expect(fileSignaturePayload(VECTOR.path, VECTOR.expires)).toBe("/builds/abc/app-release.apk?expires=1700000000");
    expect(fileSignature(VECTOR.secret, VECTOR.path, VECTOR.expires)).toBe(VECTOR.sig);
    expect(createHmac("sha256", VECTOR.secret).update(`${VECTOR.path}?expires=${VECTOR.expires}`).digest("hex")).toBe(VECTOR.sig);
  });

  it("adds expires (now + 15 minutes) and then sig to links on FILES_BASE_URL", () => {
    expect(signFileUrl(`${BASE}${VECTOR.path}`, { baseUrl: BASE, secret: VECTOR.secret, now: NOW })).toBe(
      `${BASE}${VECTOR.path}?expires=${VECTOR.expires}&sig=${VECTOR.sig}`,
    );
  });

  it("drops any query string or fragment the stored URL had, since only the path is signed", () => {
    expect(signFileUrl(`${BASE}${VECTOR.path}?v=2#x`, { baseUrl: BASE, secret: VECTOR.secret, now: NOW })).toBe(
      `${BASE}${VECTOR.path}?expires=${VECTOR.expires}&sig=${VECTOR.sig}`,
    );
  });

  it("signs the path as the browser sends it (percent-encoded)", () => {
    const signed = new URL(signFileUrl(`${BASE}/builds/abc/my app.apk`, { baseUrl: BASE, secret: SECRET, now: NOW }));
    expect(signed.pathname).toBe("/builds/abc/my%20app.apk");
    expect(signed.searchParams.get("sig")).toBe(fileSignature(SECRET, "/builds/abc/my%20app.apk", VECTOR.expires));
  });

  it("leaves links on other origins as they are", () => {
    for (const url of ["https://example.com/builds/abc/app.apk", "https://files.yallapp.com.tr:8443/app.apk", "http://files.yallapp.com.tr/app.apk"]) {
      expect(signFileUrl(url, { baseUrl: BASE, secret: SECRET, now: NOW })).toBe(url);
    }
  });

  it("shows the links disabled while FILES_SIGNING_SECRET isn't set", () => {
    expect(fileLink(`${BASE}${VECTOR.path}`, NOW)).toEqual({ href: null, disabledReason: FILES_NOT_CONFIGURED });
    expect(FILES_NOT_CONFIGURED).toBe("Downloads aren't configured yet");
  });

  it("signs with the environment's secret and the default FILES_BASE_URL", () => {
    process.env.FILES_SIGNING_SECRET = SECRET;
    const link = fileLink(`${BASE}${VECTOR.path}`, NOW);
    expect(link.href).toBe(`${BASE}${VECTOR.path}?expires=${VECTOR.expires}&sig=${fileSignature(SECRET, VECTOR.path, VECTOR.expires)}`);
    expect(fileLink("https://elsewhere.test/app.apk", NOW)).toEqual({ href: "https://elsewhere.test/app.apk", disabledReason: null });
  });

  it("uses FILES_BASE_URL when it's set", () => {
    process.env.FILES_SIGNING_SECRET = SECRET;
    process.env.FILES_BASE_URL = "https://downloads.example.test/";
    expect(fileLink(`https://downloads.example.test${VECTOR.path}`, NOW).href).toMatch(/\?expires=1700000000&sig=[0-9a-f]{64}$/);
    expect(fileLink(`${BASE}${VECTOR.path}`, NOW).href).toBe(`${BASE}${VECTOR.path}`);
  });

  it("treats a too short secret as not configured", () => {
    process.env.FILES_SIGNING_SECRET = "short";
    expect(fileLink(`${BASE}${VECTOR.path}`, NOW).href).toBeNull();
  });

  it("labels each artifact, with the keystore as the Android upload key", () => {
    process.env.FILES_SIGNING_SECRET = SECRET;
    const links = artifactLinks(
      [
        { kind: "apk", url: `${BASE}/b/app.apk` },
        { kind: "keystore", url: `${BASE}/b/upload-key.zip` },
      ],
      NOW,
    );
    expect(links.map((link) => link.label)).toEqual(["Android APK", "Android upload key (keep it safe)"]);
    expect(links.every((link) => link.href?.includes("&sig="))).toBe(true);
  });
});
