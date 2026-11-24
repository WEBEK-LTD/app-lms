import { describe, expect, it } from "vitest";
import { MAX_JSON, readCommunityBody } from "@/lib/community/api/body";

/**
 * 231 The Community API's body: a request with no body is fine without a
 * Content-Length (Next gives a DELETE an empty stream even when nothing was
 * sent); a body sent in chunks with no size is refused; JSON says so; the
 * size is capped before and after reading.
 */
const URL = "https://community.yallapp.test/api/community/v1/members/x/follow";
const emptyStream = () => new ReadableStream({ start: (c) => c.close() });
const chunks = (text: string) =>
  new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode(text));
      c.close();
    },
  });
const request = (method: string, init: { body?: BodyInit | null; headers?: Record<string, string> } = {}) => new Request(URL, { method, body: init.body ?? null, headers: init.headers, duplex: "half" } as RequestInit);

describe("231 the Community API's request body", () => {
  it("takes a bodiless DELETE or POST with no Content-Length, as browsers, curl and the apps send them", async () => {
    expect(await readCommunityBody(request("DELETE"))).toEqual({ ok: true, body: undefined, form: null });
    // Next hands the route an empty stream for a bodiless DELETE.
    expect(await readCommunityBody(request("DELETE", { body: emptyStream() }))).toEqual({ ok: true, body: undefined, form: null });
    expect(await readCommunityBody(request("POST", { body: emptyStream() }))).toEqual({ ok: true, body: undefined, form: null });
    expect(await readCommunityBody(request("GET"))).toEqual({ ok: true, body: undefined, form: null });
  });

  it("reads JSON with its type, and a DELETE's JSON body too", async () => {
    const r = await readCommunityBody(request("DELETE", { body: '{"password":"x"}', headers: { "content-type": "application/json", "content-length": "16" } }));
    expect(r).toEqual({ ok: true, body: { password: "x" }, form: null });
  });

  it("refuses a body in chunks with no size, a body that isn't JSON, and too much", async () => {
    expect(await readCommunityBody(request("POST", { body: chunks("{}"), headers: { "content-type": "application/json", "transfer-encoding": "chunked" } }))).toMatchObject({ ok: false, status: 411 });
    expect(await readCommunityBody(request("POST", { body: '{"a":1}', headers: { "content-type": "text/plain", "content-length": "7" } }))).toMatchObject({ ok: false, status: 415 });
    expect(await readCommunityBody(request("POST", { body: "a=1", headers: { "content-type": "application/x-www-form-urlencoded", "content-length": "3" } }))).toMatchObject({ ok: false, status: 415 });
    expect(await readCommunityBody(request("POST", { body: "{}", headers: { "content-type": "application/json", "content-length": String(MAX_JSON + 1) } }))).toMatchObject({ ok: false, status: 413 });
    // A body longer than it said (no header to trust): measured after reading.
    expect(await readCommunityBody(request("POST", { body: chunks(`"${"x".repeat(MAX_JSON)}"`), headers: { "content-type": "application/json" } }))).toMatchObject({ ok: false, status: 413 });
    expect(await readCommunityBody(request("POST", { body: "{nope", headers: { "content-type": "application/json", "content-length": "5" } }))).toMatchObject({ ok: false, status: 400 });
  });

  it("reads a multipart form (a picture), up to its cap", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", { type: "image/png" }));
    const built = new Request(URL, { method: "PUT", body: form });
    const r = await readCommunityBody(built);
    expect(r.ok && r.form?.get("file")).toBeInstanceOf(File);
  });
});
