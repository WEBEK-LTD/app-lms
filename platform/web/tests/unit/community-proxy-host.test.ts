import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { communitySiteUrl } from "@/lib/community/deps";
import { config, isCommunityRequest, isPublicFile, proxy } from "@/proxy";

/**
 * 231 community.yallapp.com.tr through our reverse proxy
 * (deploy/apache-proxy-community.conf): Netlify sees its own host, so the
 * proxy names the visitor's in X-Yallapp-Host with the shared secret. The
 * header alone routes nothing and goes no further; with the secret the
 * request is the community's. Links never go to Netlify's address.
 */
const SECRET = "a-proxy-secret-of-at-least-32-characters";
const at = (path: string, headers: Record<string, string>) => new NextRequest(`https://yallapp.netlify.app${path}`, { headers: { host: "yallapp.netlify.app", ...headers } });
const rewrite = (r: Response) => r.headers.get("x-middleware-rewrite");

afterEach(() => vi.unstubAllEnvs());

describe("231 the community's host through our proxy", () => {
  it("believes X-Yallapp-Host only with the proxy's secret", () => {
    const h = (entries: Record<string, string>) => new Headers({ host: "yallapp.netlify.app", ...entries });
    expect(isCommunityRequest(h({ "x-yallapp-host": "community.yallapp.com.tr" }), SECRET)).toBe(false);
    expect(isCommunityRequest(h({ "x-yallapp-host": "community.yallapp.com.tr", "x-yallapp-proxy-secret": "wrong-secret-of-at-least-32-characters!!" }), SECRET)).toBe(false);
    expect(isCommunityRequest(h({ "x-yallapp-host": "community.yallapp.com.tr", "x-yallapp-proxy-secret": SECRET }), SECRET)).toBe(true);
    // The secret doesn't make any host the community's, and nothing works without a secret set.
    expect(isCommunityRequest(h({ "x-yallapp-host": "evil.test", "x-yallapp-proxy-secret": SECRET }), SECRET)).toBe(false);
    expect(isCommunityRequest(h({ "x-yallapp-host": "community.yallapp.com.tr", "x-yallapp-proxy-secret": "" }), undefined)).toBe(false);
    expect(isCommunityRequest(new Headers({ host: "community.yallapp.com.tr" }), undefined)).toBe(true);
  });

  it("a forged X-Yallapp-Host routes nothing and is dropped; the proxy's, with the secret, serves /community", async () => {
    vi.stubEnv("TRUSTED_PROXY_SECRET", SECRET);
    const forged = await proxy(at("/qa", { "x-yallapp-host": "community.yallapp.com.tr" }));
    expect(rewrite(forged)).toBeNull();
    expect(forged.headers.get("x-middleware-override-headers") ?? "").not.toContain("x-yallapp-host");
    expect(forged.headers.get("x-middleware-request-x-yallapp-host")).toBeNull();
    const trusted = await proxy(at("/qa?tab=new", { "x-yallapp-host": "community.yallapp.com.tr", "x-yallapp-proxy-secret": SECRET }));
    expect(new URL(rewrite(trusted)!).pathname).toBe("/community/qa");
    expect(new URL(rewrite(trusted)!).search).toBe("?tab=new");
    expect(new URL(rewrite(await proxy(at("/", { "x-yallapp-host": "community.yallapp.com.tr", "x-yallapp-proxy-secret": SECRET })))!).pathname).toBe("/community");
  });

  it("serves a member's profile with a dot in the username as a page, the public folder's files as files", async () => {
    vi.stubEnv("TRUSTED_PROXY_SECRET", SECRET);
    const proxied = { "x-yallapp-host": "community.yallapp.com.tr", "x-yallapp-proxy-secret": SECRET };
    // Usernames made from a name have dots ("mohamed.ali"): before, ".ali" passed for a file's extension and the profile was the main site's 404.
    expect(new URL(rewrite(await proxy(at("/u/mohamed.ali", proxied)))!).pathname).toBe("/community/u/mohamed.ali");
    expect(new URL(rewrite(await proxy(at("/u/nour.png", proxied)))!).pathname).toBe("/community/u/nour.png");
    expect(rewrite(await proxy(at("/brand/logo.svg", proxied)))).toBeNull();
    expect(rewrite(await proxy(at("/favicon-48x48.png", proxied)))).toBeNull();
    expect(new URL(rewrite(await proxy(at("/sitemap.xml", proxied)))!).pathname).toBe("/community/sitemap.xml");
    expect(isPublicFile("/community/site.webmanifest")).toBe(true);
    expect(isPublicFile("/qa/how-to.publish")).toBe(false);
  });

  it("sends the proxy's requests through the middleware (a header matcher), not the API or Next's files", () => {
    const byHeader = config.matcher.find((m) => "has" in m && (m.has as { type: string; key?: string }[]).some((h) => h.type === "header" && h.key === "x-yallapp-host"))!;
    const source = new RegExp(`^${byHeader.source}$`);
    for (const path of ["/", "/qa", "/u/mo"]) expect(source.test(path), path).toBe(true);
    for (const path of ["/api/community/v1/me", "/_next/static/a.js"]) expect(source.test(path), path).toBe(false);
  });

  it("never gives Netlify's address as the community's", () => {
    vi.stubEnv("COMMUNITY_SITE_URL", "https://yallapp.netlify.app");
    expect(communitySiteUrl()).toBe("https://community.yallapp.com.tr");
    vi.stubEnv("COMMUNITY_SITE_URL", "https://community.yallapp.com.tr/");
    expect(communitySiteUrl()).toBe("https://community.yallapp.com.tr");
    vi.stubEnv("COMMUNITY_SITE_URL", "");
    expect(communitySiteUrl()).toBe("https://community.yallapp.com.tr");
  });
});

describe("231 the community host's own addresses", () => {
  it("drops the internal /community prefix, keeping the query", async () => {
    const { hostPath } = await import("@/components/community/site/redirect");
    expect(hostPath("/community")).toBe("/");
    expect(hostPath("/community?x=1")).toBe("/?x=1");
    expect(hostPath("/community/sign-in?next=%2Fcommunity%2Fask")).toBe("/sign-in?next=%2Fcommunity%2Fask");
    expect(hostPath("/communityx")).toBe("/communityx");
    expect(hostPath("/questions")).toBe("/questions");
  });
});
