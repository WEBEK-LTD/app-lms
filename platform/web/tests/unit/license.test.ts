import { describe, expect, it } from "vitest";
import { activateClient, regenerateLicenseKey, reinstateClient, revealLicenseKey, suspendClient } from "@/lib/admin/clients";
import { generateLicenseKey, hashLicenseKey, isWellFormedLicenseKey, normalizeLicenseKey } from "@/lib/license/key";
import {
  activateLicense,
  checkLicense,
  deactivateLicense,
  parseSiteInfo,
  type SiteInfo,
} from "@/lib/license/service";
import { accountState } from "@/lib/license/status";
import { KEY, NOW, days, licenseOf, setupClient } from "./helpers";

const KEY_SAMPLE = "YALL-7K2D-9QWE-4MNB";

function site(licenseKey: string, url = "https://academy.test", extra: Record<string, unknown> = {}): SiteInfo {
  const parsed = parseSiteInfo({ license_key: licenseKey, site_url: url, plugin_version: "0.1.0", wp_version: "6.8", lms: "tutor", ...extra });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.result));
  return parsed.value;
}

describe("license keys", () => {
  it("generates keys in the YALL-XXXX-XXXX-XXXX format without look-alike characters", () => {
    for (let i = 0; i < 200; i += 1) {
      const key = generateLicenseKey();
      expect(key).toMatch(/^YALL-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
      expect(isWellFormedLicenseKey(key)).toBe(true);
    }
  });

  it("normalises case and spacing before hashing", () => {
    expect(normalizeLicenseKey(" yall-7k2d-9qwe-4mnb ")).toBe("YALL-7K2D-9QWE-4MNB");
    expect(hashLicenseKey("yall-7k2d-9qwe-4mnb")).toBe(hashLicenseKey("YALL-7K2D-9QWE-4MNB"));
    expect(isWellFormedLicenseKey("YALL-0000-1111-IIII")).toBe(false);
  });

  it("stores the key encrypted and the client can always see it", async () => {
    const { store, client, licenseKey } = await setupClient();
    const license = await licenseOf(store, client.id);
    expect(license?.keyEncrypted).not.toContain(licenseKey);
    expect(license?.keyHash).toBe(hashLicenseKey(licenseKey!));
    expect(revealLicenseKey(license!, KEY)).toBe(licenseKey);
    expect(license?.keyLast4).toBe(licenseKey!.slice(-4));
  });
});

describe("activation by the super admin", () => {
  it("activates a pending client and renewing keeps the same key", async () => {
    const { store, client, licenseKey } = await setupClient({ activeUntil: days(30) });
    expect((await store.getClientById(client.id))?.status).toBe("active");
    const renewed = await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(400), paymentNote: "renewal" }, KEY, days(29));
    expect(renewed.created).toBe(false);
    expect(renewed.licenseKey).toBe(licenseKey);
    const license = await licenseOf(store, client.id);
    expect(license?.plan).toBe("pro");
    expect(license?.expiresAt.toISOString()).toBe(days(400).toISOString());
    expect((await store.getClientById(client.id))?.paymentNote).toContain("renewal");
  });

  it("reports pending, active, expired and suspended states", async () => {
    const { store, client } = await setupClient({ activate: false });
    let c = (await store.getClientById(client.id))!;
    expect(accountState(c, null, NOW)).toBe("pending");
    await activateClient(store, { clientId: client.id, plan: "starter", activeUntil: days(1), paymentNote: "" }, KEY, NOW);
    c = (await store.getClientById(client.id))!;
    const license = await licenseOf(store, client.id);
    expect(accountState(c, license, NOW)).toBe("active");
    expect(accountState(c, license, days(2))).toBe("expired");
    await suspendClient(store, client.id, NOW);
    c = (await store.getClientById(client.id))!;
    expect(accountState(c, license, NOW)).toBe("suspended");
    await reinstateClient(store, client.id, NOW);
    expect((await store.getClientById(client.id))?.status).toBe("active");
  });
});

describe("license API", () => {
  it("activates on one site and reports plan features", async () => {
    const { store, licenseKey } = await setupClient({ plan: "pro" });
    const result = await activateLicense(store, site(licenseKey!), NOW);
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body).toMatchObject({ status: "active", plan: "pro", message: null, checked_at: NOW.toISOString() });
    expect(result.body.features).toEqual(["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish", "chat", "loyalty", "store_billing"]);
    expect(result.body.limits).toEqual({ app_users: null, languages: null, sources: null });
    expect(result.body.expires_at).toBe(days(30).toISOString());
  });

  it("allows the same site again, written differently", async () => {
    const { store, licenseKey } = await setupClient();
    expect((await activateLicense(store, site(licenseKey!, "https://academy.test"), NOW)).status).toBe(200);
    expect((await activateLicense(store, site(licenseKey!, "http://www.ACADEMY.test/"), NOW)).status).toBe(200);
    const check = await checkLicense(store, site(licenseKey!, "academy.test"), NOW);
    expect(check.status === 200 && check.body.status).toBe("active");
  });

  it("refuses a second site with 409 until the first one is released", async () => {
    const { store, licenseKey } = await setupClient();
    await activateLicense(store, site(licenseKey!, "https://academy.test"), NOW);
    const conflict = await activateLicense(store, site(licenseKey!, "https://other.test"), NOW);
    expect(conflict.status).toBe(409);
    if (conflict.status === 409) expect(conflict.body.code).toBe("license_in_use");

    // Another site can't release it.
    expect((await deactivateLicense(store, { license_key: licenseKey, site_url: "https://other.test" })).status).toBe(204);
    expect((await activateLicense(store, site(licenseKey!, "https://other.test"), NOW)).status).toBe(409);

    // The bound site can.
    expect((await deactivateLicense(store, { license_key: licenseKey, site_url: "https://www.academy.test/" })).status).toBe(204);
    expect((await activateLicense(store, site(licenseKey!, "https://other.test"), NOW)).status).toBe(200);
  });

  it("treats a subdirectory install as a different site", async () => {
    const { store, licenseKey } = await setupClient();
    await activateLicense(store, site(licenseKey!, "https://academy.test/school"), NOW);
    expect((await activateLicense(store, site(licenseKey!, "https://academy.test"), NOW)).status).toBe(409);
  });

  it("returns 404 for unknown keys and 400 for bad input", async () => {
    const { store } = await setupClient();
    expect((await activateLicense(store, site("YALL-2345-6789-ABCD"), NOW)).status).toBe(404);
    expect((await checkLicense(store, site("YALL-2345-6789-ABCD"), NOW)).status).toBe(404);
    expect((await deactivateLicense(store, { license_key: "YALL-2345-6789-ABCD", site_url: "https://a.test" })).status).toBe(404);

    const cases: unknown[] = [
      null,
      [],
      {},
      { license_key: "nope", site_url: "https://a.test", plugin_version: "0.1.0" },
      { license_key: "YALL-2345-6789-ABCD", site_url: "ftp://a.test", plugin_version: "0.1.0" },
      { license_key: "YALL-2345-6789-ABCD", site_url: "https://a.test", plugin_version: "latest" },
      { license_key: "YALL-2345-6789-ABCD", site_url: "https://a.test", plugin_version: "0.1.0", wp_version: 6 },
    ];
    for (const body of cases) {
      const parsed = parseSiteInfo(body);
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.result.body.code).toBe("invalid_request");
    }
    expect((await deactivateLicense(store, { license_key: "YALL-2345-6789-ABCD" })).status).toBe(400);
  });

  it("reports expired licenses and doesn't bind new sites to them", async () => {
    const { store, licenseKey, license } = await setupClient({ activeUntil: days(10) });
    await activateLicense(store, site(licenseKey!), NOW);
    const later = days(11);
    const check = await checkLicense(store, site(licenseKey!), later);
    expect(check.status).toBe(200);
    if (check.status !== 200) return;
    expect(check.body).toMatchObject({ status: "expired", plan: "growth", features: [] });
    expect(check.body.message).toContain("Your Yallapp plan ended on");

    await store.deleteActivation(license!.id);
    const activation = await activateLicense(store, site(licenseKey!, "https://new.test"), later);
    expect(activation.status === 200 && activation.body.status).toBe("expired");
    expect(await store.getActivation(license!.id)).toBeNull();
  });

  it("treats the exact expiry moment as expired", async () => {
    const { store, licenseKey } = await setupClient({ activeUntil: days(1) });
    const check = await checkLicense(store, site(licenseKey!), days(1));
    expect(check.status === 200 && check.body.status).toBe("expired");
  });

  it("reports suspended licenses", async () => {
    const { store, client, licenseKey } = await setupClient();
    await activateLicense(store, site(licenseKey!), NOW);
    await suspendClient(store, client.id, NOW);
    const check = await checkLicense(store, site(licenseKey!), NOW);
    expect(check.status === 200 && check.body).toMatchObject({ status: "suspended", features: [] });
  });

  it("reports invalid when checked from a site the license isn't bound to", async () => {
    const { store, licenseKey } = await setupClient();
    const unbound = await checkLicense(store, site(licenseKey!), NOW);
    expect(unbound.status === 200 && unbound.body.status).toBe("invalid");
    await activateLicense(store, site(licenseKey!, "https://academy.test"), NOW);
    const elsewhere = await checkLicense(store, site(licenseKey!, "https://copy.test"), NOW);
    expect(elsewhere.status === 200 && elsewhere.body.status).toBe("invalid");
  });

  it("records the plugin version on each check", async () => {
    const { store, licenseKey, license } = await setupClient();
    await activateLicense(store, site(licenseKey!), NOW);
    await checkLicense(store, site(licenseKey!, "https://academy.test", { plugin_version: "0.3.1" }), days(1));
    const activation = await store.getActivation(license!.id);
    expect(activation).toMatchObject({ pluginVersion: "0.3.1", lms: "tutor", siteUrl: "academy.test" });
    expect(activation?.lastCheckedAt.toISOString()).toBe(days(1).toISOString());
    expect(activation?.activatedAt.toISOString()).toBe(NOW.toISOString());
  });

  it("30 reads the shop and booking plugins the site runs; plugins before 30 don't say", () => {
    expect(site(KEY_SAMPLE, undefined, { store: "woocommerce", bookings: "" })).toMatchObject({ lms: "tutor", store: "woocommerce", bookings: "" });
    expect(site(KEY_SAMPLE, undefined, { store: " woocommerce ", bookings: "amelia" })).toMatchObject({ store: "woocommerce", bookings: "amelia" });
    // Not reported (null) is not "none" ("").
    expect(site(KEY_SAMPLE)).toMatchObject({ store: null, bookings: null });
    expect(site(KEY_SAMPLE, undefined, { store: null })).toMatchObject({ store: null, bookings: null });
    const body = { license_key: KEY_SAMPLE, site_url: "https://academy.test", plugin_version: "0.5.0" };
    for (const [field, value] of [
      ["store", 1],
      ["store", true],
      ["bookings", ["amelia"]],
      ["bookings", { id: "amelia" }],
      ["store", "w".repeat(65)],
    ] as const) {
      const parsed = parseSiteInfo({ ...body, [field]: value });
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.result).toMatchObject({ status: 400, body: { code: "invalid_request", message: `${field} must be a string.` } });
    }
  });

  it("30 records what the site runs on activation and on each check", async () => {
    const { store, licenseKey, license } = await setupClient();
    await activateLicense(store, site(licenseKey!, "https://academy.test", { store: "", bookings: "" }), NOW);
    expect(await store.getActivation(license!.id)).toMatchObject({ lms: "tutor", store: "", bookings: "" });
    await checkLicense(store, site(licenseKey!, "https://academy.test", { store: "woocommerce", bookings: "latepoint" }), days(1));
    expect(await store.getActivation(license!.id)).toMatchObject({ lms: "tutor", store: "woocommerce", bookings: "latepoint" });
    // An older plugin on the same site: unknown again.
    await checkLicense(store, site(licenseKey!, "https://academy.test"), days(2));
    expect(await store.getActivation(license!.id)).toMatchObject({ store: null, bookings: null });
  });

  it("regenerating a key invalidates the old one and releases the site", async () => {
    const { store, client, licenseKey, license } = await setupClient();
    await activateLicense(store, site(licenseKey!), NOW);
    const newKey = await regenerateLicenseKey(store, client.id, KEY, NOW);
    expect(newKey).not.toBe(licenseKey);
    expect((await checkLicense(store, site(licenseKey!), NOW)).status).toBe(404);
    expect(await store.getActivation(license!.id)).toBeNull();
    expect((await activateLicense(store, site(newKey), NOW)).status).toBe(200);
  });
});
