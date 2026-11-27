import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { safeNext } from "@/lib/apps/move-link";
import { COMMUNITY_ROUTES, matchRoute } from "@/lib/community/api/service";
import { allWords, languageFromHeader, t } from "@/lib/community/i18n";
import { communityPath, config as proxyConfig, isCommunityHost } from "@/proxy";

/**
 * 231 Guards for Yallapp Community's base: every word in Arabic and
 * Turkish too; every route is in the contract with the same method; fixed
 * paths win over `:name` ones; the community's host is served by
 * src/app/community/ (its API and Next's files keep their paths); and the
 * sign-in comes back only to a real link page.
 */
const contract = parse(readFileSync(new URL("../../../../docs/api/community.yaml", import.meta.url), "utf8")) as { paths: Record<string, Record<string, unknown>> };

describe("231 community guards", () => {
  it("has every word in Arabic and Turkish, with the same {placeholders}", () => {
    const { en, ar, tr } = allWords();
    const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, word] of Object.entries(en)) {
      for (const [lang, words] of [["ar", ar], ["tr", tr]] as const) {
        expect(words[key], `${lang} ${key}`).toBeTruthy();
        expect(holes(words[key] ?? ""), `${lang} ${key}`).toEqual(holes(word));
      }
    }
    expect(t("tr", "badge.gold")).toBe("Profesyonel Geliştirici");
    expect(t("ar", "link.done", { name: "x" })).toContain("Yallapp");
  });

  it("reads the language from Accept-Language: en, ar, tr, else English", () => {
    expect(languageFromHeader("ar-EG,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(languageFromHeader("de-DE,tr;q=0.7,en;q=0.5")).toBe("tr");
    expect(languageFromHeader("fr-FR")).toBe("en");
    expect(languageFromHeader(null)).toBe("en");
  });

  it("documents every route with its method in docs/api/community.yaml", () => {
    const toContract = (path: string) => path.replace(/:(\w+)/g, "{$1}");
    const missing = COMMUNITY_ROUTES.filter((r) => !contract.paths[toContract(r.path)]?.[r.method.toLowerCase()]).map((r) => `${r.method} ${r.path}`);
    expect(missing).toEqual([]);
    // Area A's paths in the contract all have a route.
    const mine = Object.entries(contract.paths).filter(([p]) => /^\/(auth|me|members|reports|config)(\/|$)/.test(p));
    const routes = new Set(COMMUNITY_ROUTES.map((r) => `${r.method.toLowerCase()} ${toContract(r.path)}`));
    const unbuilt = mine.flatMap(([p, ops]) => Object.keys(ops).filter((m) => ["get", "post", "put", "patch", "delete"].includes(m) && !(ops[m] as { "x-building"?: boolean })["x-building"] && !routes.has(`${m} ${p}`)).map((m) => `${m} ${p}`));
    expect(unbuilt).toEqual([]);
  });

  it("matches fixed parts before :name ones, and tells a wrong method from a wrong path", () => {
    const found = matchRoute("POST", ["auth", "email", "verify", "resend"]);
    expect(found && found !== "method" ? found.route.path : null).toBe("/auth/email/verify/resend");
    expect(matchRoute("PATCH", ["config"])).toBe("method");
    expect(matchRoute("GET", ["nowhere"])).toBeNull();
  });

  it("serves the community's host from src/app/community/, its API and Next's files as they are", () => {
    expect(isCommunityHost("community.yallapp.com.tr")).toBe(true);
    expect(isCommunityHost("community.localhost:3000")).toBe(true);
    expect(isCommunityHost("yallapp.com.tr")).toBe(false);
    expect(communityPath("/")).toBe("/community");
    expect(communityPath("/qa/123")).toBe("/community/qa/123");
    expect(communityPath("/community/qa")).toBe("/community/qa");
    const host = proxyConfig.matcher.find((m) => "has" in m)!;
    const source = new RegExp(`^${host.source}$`);
    for (const path of ["/", "/qa", "/u/mohamed", "/tutorials/getting-started"]) expect(source.test(path), path).toBe(true);
    for (const path of ["/api/community/v1/me", "/_next/static/x.js", "/favicon.ico"]) expect(source.test(path), path).toBe(false);
    const hostValue = new RegExp(`^${(host as { has: { value: string }[] }).has[0]!.value}$`);
    expect(hostValue.test("community.yallapp.com.tr")).toBe(true);
    expect(hostValue.test("yallapp.com.tr")).toBe(false);
  });

  it("comes back after the Yallapp sign-in only to the link page", () => {
    expect(safeNext("/link-community?state=abcdefghijklmnopqrstuvwxyz012345&return=app")).not.toBeNull();
    expect(safeNext("/link-community?state=short&return=app")).toBeNull();
    expect(safeNext("/link-community?state=abcdefghijklmnopqrstuvwxyz012345&return=https://evil.test")).toBeNull();
    expect(safeNext("https://evil.test/link-community?state=abcdefghijklmnopqrstuvwxyz012345&return=web")).toBeNull();
  });
});
