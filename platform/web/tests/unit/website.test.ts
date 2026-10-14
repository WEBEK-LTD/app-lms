import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkApi, configProblems, isPrivateAddress } from "@/lib/app/api-check";
import { buildConfigFor, newApp, stepStatus, websiteReady } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import type { App } from "@/lib/data/types";
import { websiteSchema } from "@/lib/validation";
import { NOW, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;

function config(extra: Record<string, unknown> = {}) {
  return {
    site: { name: "Ada Shop", url: "https://shop.test" },
    branding: { primary_color: "#0E0D24" },
    features: { lms: null, push: false },
    auth: { signup_allowed: true, signup_fields: ["name"], default_country_code: "+90" },
    purchases: { enroll_button: false, free_enrollment: false },
    content: { block_screen_capture: false, watermark: "off", embed_fullscreen_button: false, embed_height: "auto" },
    app: { update_required: false, maintenance: false },
    ...extra,
  };
}

/** A fake API: path (without the base) to [status, body]. */
function fakeApi(routes: Record<string, [number, unknown]>) {
  const calls: string[] = [];
  const fetcher = async (url: string, init?: RequestInit) => {
    const path = url.replace("https://api.shop.test/v1", "").split("?")[0]!;
    calls.push(`${init?.method ?? "GET"} ${path}`);
    const [status, body] = routes[`${init?.method ?? "GET"} ${path}`] ?? [404, { code: "not_found", message: "Not found." }];
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  };
  return { fetcher, calls, resolve: async () => ["93.184.216.34"] };
}

describe("API check", () => {
  it("passes an API that serves the contract", async () => {
    const api = fakeApi({
      "GET /config": [200, config({ store: { currency: "TRY" } })],
      "GET /store/home": [200, { sections: [] }],
      "POST /auth/otp/request": [400, { code: "invalid_request", message: "Enter your phone number." }],
    });
    const result = await checkApi("https://api.shop.test/v1/", "store", api);
    expect(result.checks.map((c) => [c.id, c.ok])).toEqual([
      ["reachable", true],
      ["config", true],
      ["app_type", true],
      ["home", true],
      ["errors", true],
    ]);
    expect(result.ok).toBe(true);
    expect(api.calls).toEqual(["GET /config", "GET /store/home", "POST /auth/otp/request"]);
  });

  it("checks a Bookings API's settings and home", async () => {
    const api = fakeApi({
      "GET /config": [200, config({ store: { currency: "TRY" } })],
      "GET /bookings/home": [200, { sections: [] }],
      "POST /auth/otp/request": [400, { code: "invalid_request", message: "Enter your phone number." }],
    });
    const result = await checkApi("https://api.shop.test/v1", "booking", api);
    const type = result.checks.find((c) => c.id === "app_type")!;
    expect(type.ok).toBe(false);
    expect(type.detail).toBe("Add `bookings` to /config.");
    expect(result.checks.find((c) => c.id === "home")!.ok).toBe(true);
    expect(api.calls).toContain("GET /bookings/home");
  });

  it("lists what's missing", async () => {
    const api = fakeApi({
      "GET /config": [200, { site: { name: "Ada" } }],
      "GET /home": [500, "<html>"],
      "POST /auth/otp/request": [400, { error: "bad" }],
    });
    const result = await checkApi("https://api.shop.test/v1", "lms", api);
    expect(result.ok).toBe(false);
    const config = result.checks.find((c) => c.id === "config")!;
    expect(config.ok).toBe(false);
    expect(config.detail).toContain("site.url");
    expect(result.checks.find((c) => c.id === "app_type")!.ok).toBe(false);
    expect(result.checks.find((c) => c.id === "home")!.detail).toBe("HTTP 500, not JSON");
    expect(result.checks.find((c) => c.id === "errors")!.ok).toBe(false);
  });

  it("never calls private networks or plain http", async () => {
    const local = fakeApi({});
    const result = await checkApi("https://api.shop.test/v1", "lms", { ...local, resolve: async () => ["10.0.0.5"] });
    expect(result.ok).toBe(false);
    expect(local.calls).toEqual([]);
    expect((await checkApi("http://api.shop.test", "lms", local)).checks[0]!.ok).toBe(false);
    for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(configProblems("nope")).toEqual(["the response isn't a JSON object"]);
  });
});

describe("Website step", () => {
  it("validates each choice", () => {
    expect(websiteSchema.safeParse({ backend: "wordpress", siteUrl: "https://academy.test" }).success).toBe(true);
    expect(websiteSchema.safeParse({ backend: "custom_api", siteUrl: "https://shop.test", apiBaseUrl: "http://api.shop.test" }).success).toBe(false);
    expect(websiteSchema.safeParse({ backend: "custom_api", siteUrl: "https://shop.test", apiBaseUrl: "https://api.shop.test/v1" }).success).toBe(true);
    const request = websiteSchema.safeParse({ backend: "setup_requested", siteUrl: "https://shop.test" });
    expect(request.success && request.data.backend === "setup_requested" && request.data.setupNote).toBe("");
    expect(websiteSchema.safeParse({ backend: "other", siteUrl: "https://shop.test" }).success).toBe(false);
  });

  it("is done for WordPress and a custom API, not while our team sets up WordPress", async () => {
    const { client } = await setupClient();
    const base: App = { ...newApp(client.id, "https://shop.test", NOW, "store"), websiteDoneAt: NOW };
    expect(websiteReady(base)).toBe(true);
    expect(websiteReady({ ...base, backend: "custom_api" })).toBe(false);
    expect(websiteReady({ ...base, backend: "custom_api", apiBaseUrl: "https://api.shop.test/v1" })).toBe(true);
    expect(websiteReady({ ...base, backend: "setup_requested", setupRequestedAt: NOW })).toBe(false);
    expect(stepStatus({ ...base, backend: "setup_requested" }, "starter").website).toBe(false);
  });

  it("puts the custom API address in the build config", async () => {
    const { client } = await setupClient();
    const app: App = {
      ...newApp(client.id, "https://shop.test", NOW, "store"),
      appName: "Ada Shop",
      shortName: "Ada",
      androidPackage: "com.adashop.app",
      iosBundleId: "com.adashop.app",
      iconAssetId: "icon-1",
      backend: "custom_api",
      apiBaseUrl: "https://api.shop.test/v1",
    };
    const custom = buildConfigFor(app, { id: client.id }, { name: "1.0.0", code: 1 }, assetUrl);
    expect(custom.api_base_url).toBe("https://api.shop.test/v1");
    expect(validateBuildConfig(custom).ok).toBe(true);
    const wordpress = buildConfigFor({ ...app, backend: "wordpress" }, { id: client.id }, { name: "1.0.0", code: 1 }, assetUrl);
    expect("api_base_url" in wordpress).toBe(false);
  });

  it("lists set-up requests for the team", async () => {
    const { store, client } = await setupClient();
    const app = newApp(client.id, "https://shop.test", NOW, "store");
    await store.createApp(app);
    expect(await store.listSetupRequests()).toEqual([]);
    await store.updateApp(app.id, { backend: "setup_requested", setupRequestedAt: NOW, setupNote: "Shopify today" }, NOW);
    const [row] = await store.listSetupRequests();
    expect(row!.app.setupNote).toBe("Shopify today");
    expect(row!.client.id).toBe(client.id);
  });
});

describe("developer contract", () => {
  it("public/developers/openapi.yaml is an exact copy of docs/api/openapi.yaml", () => {
    const docs = readFileSync(path.resolve(__dirname, "../../../../docs/api/openapi.yaml"), "utf8");
    const copy = readFileSync(path.resolve(__dirname, "../../public/developers/openapi.yaml"), "utf8");
    expect(copy).toBe(docs);
  });
});
