import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => null }));

import { GET } from "@/app/api/studio-market/continue/route";
import { MARKET_NEXT_COOKIE } from "@/lib/studio-market/public";

const url = "http://localhost/api/studio-market/continue?to=preview&slug=peony-1&lang=ar";

describe("the Market's continue link", () => {
  it("a click remembers where to go after sign-up", async () => {
    const res = await GET(new Request(url));
    expect(res.status).toBe(303);
    expect(res.headers.get("set-cookie") ?? "").toContain(MARKET_NEXT_COOKIE);
  });

  it("a prefetch of it changes nothing, so another button's prefetch can't send sign-in elsewhere", async () => {
    for (const headers of [{ "next-router-prefetch": "1" }, { "sec-purpose": "prefetch" }, { purpose: "prefetch" }] as Record<string, string>[]) {
      const res = await GET(new Request(url, { headers }));
      expect(res.status).toBe(204);
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });
});
