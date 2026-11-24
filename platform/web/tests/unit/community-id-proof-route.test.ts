import { describe, expect, it, vi } from "vitest";

/** 231 security: an ID proof is only ever a download, with its type fixed (nosniff) and no page able to run from it. */
const blobs = new Map<string, { data: Buffer; contentType: string }>();
vi.mock("@/lib/blobs", () => ({ getBlobStore: () => ({ get: async (key: string) => blobs.get(key) ?? null }) }));

const { GET } = await import("@/app/api/community/id-proof/route");
const { signFileLink } = await import("@/lib/community/trust/context");
const { signingSecret } = await import("@/lib/env");

const inSeconds = (ms: number) => Math.floor(ms / 1000);
function link(key: string, expires = inSeconds(Date.now() + 60_000), signature = signFileLink(signingSecret(), key, expires)): Request {
  return new Request(`https://yallapp.com.tr/api/community/id-proof?k=${encodeURIComponent(key)}&e=${expires}&s=${signature}`);
}

describe("231 the ID proof link", () => {
  it("serves the file as an attachment with nosniff and a sandbox, never cached", async () => {
    const key = "community/id-proof/m1/abc.pdf";
    blobs.set(key, { data: Buffer.from("%PDF-1.7 ..."), contentType: "application/pdf" });
    const r = await GET(link(key));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="id-proof.pdf"');
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("content-security-policy")).toContain("sandbox");
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses a link that is expired, forged or outside the ID proofs", async () => {
    const key = "community/id-proof/m1/abc.pdf";
    expect((await GET(link(key, inSeconds(Date.now() - 1000)))).status).toBe(403);
    expect((await GET(link(key, inSeconds(Date.now() + 60_000), "forged"))).status).toBe(403);
    expect((await GET(link("community/avatars/x.png"))).status).toBe(403);
    expect((await GET(link("community/id-proof/../avatars/x.png"))).status).toBe(403);
  });
});
