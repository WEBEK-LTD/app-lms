import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import nextConfig from "../../next.config";
import { PERMISSIONS_POLICY, PREVIEW_PERMISSIONS_POLICY } from "@/lib/csp";

/**
 * 178 QA of the rides and taxi templates: in the app preview a ride or taxi
 * app's "My location" never found the person ("Geolocation access has been
 * blocked because of a permissions policy"): /preview-app and the
 * dashboard's Preview page around it sent geolocation=(). The preview may
 * now ask for it for itself; every other page still may not.
 */

/** The headers Next.js sends for a path: every matching rule in order (as tests/unit/phase155-wallets.test.ts reads them). */
async function headersFor(p: string): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (const rule of await nextConfig.headers!()) {
    if (rule.has || rule.missing) continue;
    if (getPathMatch(rule.source, { strict: true })(p) === false) continue;
    for (const header of rule.headers) out.set(header.key.toLowerCase(), [...(out.get(header.key.toLowerCase()) ?? []), header.value]);
  }
  return out;
}

describe("178 the app preview may ask for the location, for itself only", () => {
  it("the policy: the location for the preview's own origin, nothing else changed", () => {
    expect(PREVIEW_PERMISSIONS_POLICY).toBe("camera=(), microphone=(), geolocation=(self), payment=()");
  });

  it("the preview and the Preview page send it, once; every other page keeps geolocation=()", async () => {
    for (const p of ["/preview-app/index.html", "/preview-app/main.dart.js", "/dashboard/preview", "/studio/project/preview"]) {
      expect((await headersFor(p)).get("permissions-policy"), p).toEqual([PREVIEW_PERMISSIONS_POLICY]);
    }
    for (const p of ["/", "/dashboard", "/dashboard/previews", "/dashboard/preview/x", "/studio/project", "/sign-in", "/api/app/x/config"]) {
      expect((await headersFor(p)).get("permissions-policy"), p).toEqual([PERMISSIONS_POLICY]);
    }
    // The preview is still framed by the platform only.
    expect((await headersFor("/preview-app/index.html")).get("x-frame-options")).toEqual(["SAMEORIGIN"]);
    expect((await headersFor("/dashboard/preview")).get("x-frame-options")).toEqual(["DENY"]);
  });

  it("the Preview page's frame is allowed to ask (an iframe needs allow=geolocation as well)", () => {
    const panel = readFileSync(path.resolve(__dirname, "../../src/app/dashboard/preview/panel.tsx"), "utf8");
    expect(panel).toMatch(/data-testid="app-preview"/);
    expect(panel).toMatch(/allow="geolocation"/);
  });
});
