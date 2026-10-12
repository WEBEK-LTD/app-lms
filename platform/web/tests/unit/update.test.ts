import { describe, expect, it } from "vitest";
import { verifySignedUrl, signUrl } from "@/lib/crypto/signed-url";
import type { PluginRelease } from "@/lib/data/types";
import {
  activateLicense,
  changelogToHtml,
  latestRelease,
  parseSiteInfo,
  parseUpdateQuery,
  pluginUpdate,
} from "@/lib/license/service";
import { suspendClient } from "@/lib/admin/clients";
import { compareVersions } from "@/lib/semver";
import { NOW, days, setupClient } from "./helpers";

const SECRET = "signing-secret-for-tests-0123456789abcdef";

function release(version: string, published = true, createdAt = NOW): PluginRelease {
  return {
    id: `rel-${version}`,
    version,
    changelog: `- Release ${version}\n- Fixes <script>`,
    requiresWp: "6.0",
    requiresPhp: "7.4",
    testedWp: "6.8",
    blobKey: `plugin/${version}.zip`,
    size: 1000,
    sha256: "0".repeat(64),
    published,
    createdAt,
  };
}

const downloadUrl = (r: PluginRelease) =>
  signUrl("https://yallapp.com.tr", "/api/v1/plugin/download", { release: r.id }, SECRET, 3600, NOW);

async function activeSite(options: Parameters<typeof setupClient>[0] = {}) {
  const ctx = await setupClient(options);
  const parsed = parseSiteInfo({ license_key: ctx.licenseKey, site_url: "https://academy.test", plugin_version: "0.1.0" });
  if (!parsed.ok) throw new Error("bad site");
  await activateLicense(ctx.store, parsed.value, NOW);
  return ctx;
}

function query(licenseKey: string, version: string, site = "https://academy.test") {
  const parsed = parseUpdateQuery(new URLSearchParams({ license_key: licenseKey, site_url: site, version }));
  if (!parsed.ok) throw new Error("bad query");
  return parsed.value;
}

describe("plugin update endpoint", () => {
  it("returns the newer release with a signed, expiring download link", async () => {
    const { store, licenseKey } = await activeSite();
    await store.createRelease(release("0.1.0"));
    await store.createRelease(release("0.2.0"));
    const result = await pluginUpdate(store, query(licenseKey!, "0.1.0"), NOW, downloadUrl);
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body).toMatchObject({ version: "0.2.0", requires: "6.0", requires_php: "7.4", tested: "6.8" });
    expect(result.body.changelog_html).toBe("<ul><li>Release 0.2.0</li><li>Fixes &lt;script&gt;</li></ul>");
    const url = new URL(result.body.download_url);
    expect(verifySignedUrl(url, SECRET, NOW)).toBe("valid");
    expect(verifySignedUrl(url, SECRET, days(1))).toBe("expired");
  });

  it("returns 204 when the site is up to date", async () => {
    const { store, licenseKey } = await activeSite();
    await store.createRelease(release("0.2.0"));
    expect((await pluginUpdate(store, query(licenseKey!, "0.2.0"), NOW, downloadUrl)).status).toBe(204);
    expect((await pluginUpdate(store, query(licenseKey!, "0.3.0"), NOW, downloadUrl)).status).toBe(204);
  });

  it("ignores unpublished releases and compares versions numerically", async () => {
    const { store, licenseKey } = await activeSite();
    await store.createRelease(release("0.9.0"));
    await store.createRelease(release("0.10.0", true, days(-5)));
    await store.createRelease(release("0.11.0", false));
    const result = await pluginUpdate(store, query(licenseKey!, "0.9.0"), NOW, downloadUrl);
    expect(result.status === 200 && result.body.version).toBe("0.10.0");
    expect(latestRelease([release("1.0.0", false)])).toBeNull();
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
  });

  it("returns 204 when the license is unknown, expired, suspended or bound elsewhere", async () => {
    const { store, client, licenseKey } = await activeSite({ activeUntil: days(5) });
    await store.createRelease(release("0.2.0"));
    expect((await pluginUpdate(store, query("YALL-2345-6789-ABCD", "0.1.0"), NOW, downloadUrl)).status).toBe(204);
    expect((await pluginUpdate(store, query(licenseKey!, "0.1.0", "https://other.test"), NOW, downloadUrl)).status).toBe(204);
    expect((await pluginUpdate(store, query(licenseKey!, "0.1.0"), days(6), downloadUrl)).status).toBe(204);
    await suspendClient(store, client.id, NOW);
    expect((await pluginUpdate(store, query(licenseKey!, "0.1.0"), NOW, downloadUrl)).status).toBe(204);
  });

  it("returns 204 when the license was never activated on a site", async () => {
    const { store, licenseKey } = await setupClient();
    await store.createRelease(release("0.2.0"));
    expect((await pluginUpdate(store, query(licenseKey!, "0.1.0"), NOW, downloadUrl)).status).toBe(204);
  });

  it("rejects missing or malformed parameters with 400", () => {
    const cases = [
      {},
      { license_key: "YALL-2345-6789-ABCD", site_url: "https://a.test" },
      { license_key: "bad", site_url: "https://a.test", version: "0.1.0" },
      { license_key: "YALL-2345-6789-ABCD", site_url: "nope://", version: "0.1.0" },
      { license_key: "YALL-2345-6789-ABCD", site_url: "https://a.test", version: "new" },
    ];
    for (const params of cases) {
      const parsed = parseUpdateQuery(new URLSearchParams(params as Record<string, string>));
      expect(parsed.ok).toBe(false);
    }
  });
});

describe("signed download links", () => {
  it("rejects tampered parameters and signatures", () => {
    const signed = new URL(signUrl("https://yallapp.com.tr", "/api/v1/plugin/download", { release: "a" }, SECRET, 600, NOW));
    const swapped = new URL(signed);
    swapped.searchParams.set("release", "b");
    expect(verifySignedUrl(swapped, SECRET, NOW)).toBe("invalid");
    const extended = new URL(signed);
    extended.searchParams.set("expires", String(Number(signed.searchParams.get("expires")) + 3600));
    expect(verifySignedUrl(extended, SECRET, NOW)).toBe("invalid");
    expect(verifySignedUrl(signed, "another-secret-another-secret-123456", NOW)).toBe("invalid");
    const moved = new URL(signed.toString().replace("/plugin/download", "/plugin/other"));
    expect(verifySignedUrl(moved, SECRET, NOW)).toBe("invalid");
  });
});

describe("changelog rendering", () => {
  it("escapes HTML and keeps paragraphs", () => {
    expect(changelogToHtml("Big release & more\n\n- One\n* Two\nThanks")).toBe(
      "<p>Big release &amp; more</p><ul><li>One</li><li>Two</li></ul><p>Thanks</p>",
    );
  });
});
