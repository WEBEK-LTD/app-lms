import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { activateLicense, checkLicense, parseSiteBrand, parseSiteInfo } from "@/lib/license/service";
import { NOW, setupClient } from "./helpers";

/** 81.2 What a WordPress site looks like, as its plugin reports it with the license check. */

const BRAND = {
  name: "  Cedar   Academy ",
  tagline: "Learn design online",
  logo_url: "https://academy.test/wp-content/uploads/cedar-logo.png",
  icon_url: "https://academy.test/wp-content/uploads/cropped-cedar-512x512.png",
  colors: ["#1F7A5C", "#f2a33a", "#1f7a5c", "red", "#12345"],
  menus: [
    {
      location: "primary",
      items: [
        { title: "Courses", url: "https://academy.test/courses/", children: [{ title: "Design", url: "https://academy.test/courses/design/" }, { title: "Bad", url: "javascript:x" }] },
        { title: "", url: "https://academy.test/empty/" },
        { title: "About", url: "https://academy.test/about/" },
      ],
    },
    { location: "footer", items: [] },
  ],
};

async function academy() {
  const { store, licenseKey, client } = await setupClient({ plan: "pro" });
  const app: App = { ...newApp(client.id, "https://academy.test", NOW, "lms"), appName: "Ada Academy" };
  await store.createApp(app);
  return { store: store as MemoryStore, app, licenseKey: licenseKey! };
}

function site(licenseKey: string, extra: Record<string, unknown> = {}) {
  const parsed = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.10", ...extra });
  if (!parsed.ok) throw new Error("site");
  return parsed.value;
}

describe("81.2 SiteInfo.brand", () => {
  it("keeps what fits the contract and leaves out the rest, never failing the check", () => {
    expect(parseSiteBrand(BRAND)).toEqual({
      name: "Cedar Academy",
      tagline: "Learn design online",
      logoUrl: "https://academy.test/wp-content/uploads/cedar-logo.png",
      iconUrl: "https://academy.test/wp-content/uploads/cropped-cedar-512x512.png",
      colors: ["#1f7a5c", "#f2a33a"],
      menus: [
        {
          location: "primary",
          items: [
            { title: "Courses", url: "https://academy.test/courses/", children: [{ title: "Design", url: "https://academy.test/courses/design/" }] },
            { title: "About", url: "https://academy.test/about/", children: [] },
          ],
        },
      ],
    });
    expect(parseSiteBrand(undefined)).toBeNull();
    expect(parseSiteBrand(["x"])).toBeNull();
    expect(parseSiteBrand({ logo_url: "ftp://x.test/a.png", colors: "red", menus: "no" })).toEqual({ name: "", tagline: "", logoUrl: null, iconUrl: null, colors: [], menus: [] });
    expect(parseSiteBrand({ menus: Array.from({ length: 5 }, (_, i) => ({ location: `m${i}`, items: [{ title: "A", url: "https://a.test/" }] })) })?.menus).toHaveLength(3);
    expect(parseSiteInfo({ license_key: "YALL-7K2D-9QWE-4MNB", site_url: "https://academy.test", plugin_version: "0.4.10", brand: "nope" })).toMatchObject({ ok: true, value: { brand: null } });
  });

  it("is kept on the app with each activation and check, only when it changed", async () => {
    const { store, app, licenseKey } = await academy();
    expect((await activateLicense(store, site(licenseKey, { brand: BRAND }), NOW)).status).toBe(200);
    const saved = (await store.getAppById(app.id))!;
    expect(saved.hostedSettings?.siteBrand).toMatchObject({ name: "Cedar Academy", colors: ["#1f7a5c", "#f2a33a"] });
    const later = new Date(NOW.getTime() + 60_000);
    await checkLicense(store, site(licenseKey, { brand: BRAND }), later);
    // Nothing changed: the app wasn't written again.
    expect((await store.getAppById(app.id))!.updatedAt).toEqual(saved.updatedAt);
    await checkLicense(store, site(licenseKey, { brand: { ...BRAND, name: "Cedar School" } }), later);
    expect((await store.getAppById(app.id))!.hostedSettings?.siteBrand?.name).toBe("Cedar School");
    // An older plugin says nothing: what was reported stays.
    await checkLicense(store, site(licenseKey), later);
    expect((await store.getAppById(app.id))!.hostedSettings?.siteBrand?.name).toBe("Cedar School");
  });
});
