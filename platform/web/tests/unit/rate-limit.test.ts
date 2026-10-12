import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { hitRateLimit, type RateLimitRule } from "@/lib/rate-limit";
import { ipFromHeaders } from "@/lib/http";

const rule: RateLimitRule = { name: "test", limit: 3, windowSeconds: 60 };

describe("rate limiting", () => {
  it("allows up to the limit in a window, then blocks with a retry time", async () => {
    const store = new MemoryStore();
    const start = new Date("2026-10-12T10:00:05Z");
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await hitRateLimit(store, rule, "1.2.3.4", start));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]).toMatchObject({ hits: 4, limit: 3, retryAfter: 55 });
  });

  it("starts a new count in the next window", async () => {
    const store = new MemoryStore();
    const start = new Date("2026-10-12T10:00:00Z");
    for (let i = 0; i < 5; i += 1) await hitRateLimit(store, rule, "1.2.3.4", start);
    const next = await hitRateLimit(store, rule, "1.2.3.4", new Date("2026-10-12T10:01:00Z"));
    expect(next).toMatchObject({ allowed: true, hits: 1 });
  });

  it("counts each subject and rule separately", async () => {
    const store = new MemoryStore();
    const now = new Date("2026-10-12T10:00:00Z");
    for (let i = 0; i < 3; i += 1) await hitRateLimit(store, rule, "1.2.3.4", now);
    expect((await hitRateLimit(store, rule, "5.6.7.8", now)).allowed).toBe(true);
    expect((await hitRateLimit(store, { ...rule, name: "other" }, "1.2.3.4", now)).allowed).toBe(true);
    expect((await hitRateLimit(store, rule, "1.2.3.4", now)).allowed).toBe(false);
  });

  it("reads the client IP from Netlify's header first", () => {
    expect(ipFromHeaders(new Headers({ "x-nf-client-connection-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
    expect(ipFromHeaders(new Headers({ "x-forwarded-for": "1.1.1.1, 10.0.0.1" }))).toBe("1.1.1.1");
    expect(ipFromHeaders(new Headers())).toBe("unknown");
  });

  it("trusts the client IP from our proxy only with the shared secret", () => {
    const secret = "s".repeat(40);
    const fromProxy = new Headers({
      "x-nf-client-connection-ip": "95.217.96.219",
      "x-yallapp-proxy-secret": secret,
      "x-yallapp-client-ip": "41.33.1.2",
    });
    expect(ipFromHeaders(fromProxy, secret)).toBe("41.33.1.2");
    expect(ipFromHeaders(fromProxy, undefined)).toBe("95.217.96.219");
    const forged = new Headers({ "x-nf-client-connection-ip": "9.9.9.9", "x-yallapp-proxy-secret": "wrong", "x-yallapp-client-ip": "1.2.3.4" });
    expect(ipFromHeaders(forged, secret)).toBe("9.9.9.9");
    const junk = new Headers({ "x-nf-client-connection-ip": "9.9.9.9", "x-yallapp-proxy-secret": secret, "x-yallapp-client-ip": "<script>" });
    expect(ipFromHeaders(junk, secret)).toBe("9.9.9.9");
  });
});
