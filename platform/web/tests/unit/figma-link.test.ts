import { describe, expect, it } from "vitest";
import { figmaFileKey, figmaTokenLooksRight, readFigmaFile, renderFigmaFrames } from "@/lib/figma/api";
import { suggestLook } from "@/lib/figma/tokens";
import { solidPng } from "../e2e/png";

/** 97.4 A Figma file read from its link with a personal access token, against a fake Figma API. */

const TOKEN = "figd_0123456789abcdefghijklmnop";
const KEY = "AbCdEf0123456789xyz";

/** Figma's API as its documentation describes it, for one file. */
function fakeFigma(options: { status?: number; retryAfter?: string; variables?: boolean; bigPicture?: boolean } = {}) {
  const calls: { url: string }[] = [];
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  const fetcher = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push({ url: url.toString() });
    if (url.hostname === "images.figma.test") {
      const scale = Number(url.searchParams.get("scale"));
      const size = options.bigPicture && scale > 1 ? 6 * 1024 * 1024 : 0;
      return new Response(size ? new Uint8Array(size) : new Uint8Array(solidPng(8, 8, [31, 78, 95])), { headers: { "content-type": "image/png" } });
    }
    if (options.status) return json({ status: options.status, err: "nope" }, options.status, options.retryAfter ? { "retry-after": options.retryAfter } : {});
    if (url.pathname === `/v1/files/${KEY}`) {
      return json({
        name: "Harbour app",
        document: {
          children: [
            {
              type: "CANVAS",
              name: "Brand",
              children: [
                { id: "1:2", type: "FRAME", name: "Home", absoluteBoundingBox: { width: 390, height: 844 }, cornerRadius: 0 },
                { id: "1:3", type: "COMPONENT", name: "Logo / Full", absoluteBoundingBox: { width: 240, height: 64 } },
                { id: "1:4", type: "RECTANGLE", name: "Not a frame" },
                { id: "1:5", type: "FRAME", name: "Card", cornerRadius: 16 },
              ],
            },
          ],
        },
        styles: {
          "10:1": { key: "a", name: "Brand/Primary", styleType: "FILL" },
          "10:2": { key: "b", name: "Brand/Accent", styleType: "FILL" },
          "10:3": { key: "c", name: "Body", styleType: "TEXT" },
          "10:4": { key: "d", name: "Shadow", styleType: "EFFECT" },
        },
      });
    }
    if (url.pathname === `/v1/files/${KEY}/nodes`) {
      expect(url.searchParams.get("ids")).toBe("10:1,10:2,10:3");
      return json({
        nodes: {
          "10:1": { document: { id: "10:1", fills: [{ type: "SOLID", color: { r: 0.1216, g: 0.3059, b: 0.3725, a: 1 } }] } },
          "10:2": { document: { id: "10:2", fills: [{ type: "SOLID", visible: false, color: { r: 0, g: 0, b: 0, a: 1 } }, { type: "SOLID", color: { r: 1, g: 0.353, b: 0.122, a: 1 } }] } },
          "10:3": { document: { id: "10:3", style: { fontFamily: "Tajawal", fontWeight: 400 } } },
        },
      });
    }
    if (url.pathname === `/v1/files/${KEY}/variables/local`) {
      if (!options.variables) return json({ status: 403, error: true, message: "Limited by Figma plan" }, 403);
      return json({
        meta: {
          variableCollections: { c1: { defaultModeId: "m1" } },
          variables: {
            v1: { name: "surface/sand", resolvedType: "COLOR", variableCollectionId: "c1", valuesByMode: { m1: { r: 0.96, g: 0.93, b: 0.87, a: 1 } } },
            v2: { name: "radius/card", resolvedType: "FLOAT", variableCollectionId: "c1", valuesByMode: { m1: { type: "VARIABLE_ALIAS", id: "v3" } } },
            v3: { name: "space/16", resolvedType: "FLOAT", variableCollectionId: "c1", valuesByMode: { m1: 20 } },
          },
        },
      });
    }
    if (url.pathname === `/v1/images/${KEY}`) {
      const ids = url.searchParams.get("ids")!.split(",");
      return json({ err: null, images: Object.fromEntries(ids.map((id) => [id, id === "1:5" ? null : `https://images.figma.test/${encodeURIComponent(id)}.png?scale=${url.searchParams.get("scale")}`])) });
    }
    return json({ status: 404, err: "Not found" }, 404);
  }) as typeof fetch;
  // The token, as each call to the API sent it.
  const tokens: (string | null)[] = [];
  const recording = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    tokens.push(headers.get("x-figma-token"));
    return fetcher(input, init);
  }) as typeof fetch;
  return { deps: { fetcher: recording, apiUrl: "https://api.figma.test" }, calls, tokens };
}

describe("a Figma link and token", () => {
  it("names the file in a design, file, prototype or branch link", () => {
    expect(figmaFileKey(`https://www.figma.com/design/${KEY}/Harbour-app?node-id=0-1`)).toBe(KEY);
    expect(figmaFileKey(`https://figma.com/file/${KEY}`)).toBe(KEY);
    expect(figmaFileKey(`https://www.figma.com/proto/${KEY}/Harbour`)).toBe(KEY);
    expect(figmaFileKey(`https://www.figma.com/design/${KEY}/branch/BrAnCh01234567/Harbour`)).toBe("BrAnCh01234567");
    expect(figmaFileKey(`https://www.figma.com/board/${KEY}/Ideas`)).toBeNull();
    expect(figmaFileKey(`http://www.figma.com/design/${KEY}`)).toBeNull();
    expect(figmaFileKey(`https://figma.com.evil.test/design/${KEY}`)).toBeNull();
    expect(figmaFileKey("not a link")).toBeNull();
    expect(figmaTokenLooksRight(TOKEN)).toBe(true);
    expect(figmaTokenLooksRight("figd_ short")).toBe(false);
  });

  it("reads the color and text styles, the frames with their pictures, and sends the token to Figma's API only", async () => {
    const figma = fakeFigma();
    const read = await readFigmaFile(KEY, TOKEN, figma.deps);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.value.name).toBe("Harbour app");
    expect(read.value.tokens).toEqual({
      colors: [
        { name: "Brand/Primary", hex: "#1F4E5F" },
        { name: "Brand/Accent", hex: "#FF5A1F" },
      ],
      fonts: [{ name: "Body", family: "Tajawal" }],
      radii: [16],
    });
    expect(suggestLook(read.value.tokens)).toEqual({ primary: "#1F4E5F", secondary: "#FF5A1F", font: "Tajawal", corners: "round" });
    // Frames only, logos first, with Figma's small pictures (none for one it couldn't draw).
    expect(read.value.frames.map((f) => [f.id, f.name, f.page])).toEqual([
      ["1:3", "Logo / Full", "Brand"],
      ["1:2", "Home", "Brand"],
      ["1:5", "Card", "Brand"],
    ]);
    expect(read.value.frames[0]).toMatchObject({ width: 240, height: 64, thumbnail: "https://images.figma.test/1%3A3.png?scale=0.25" });
    expect(read.value.frames[2]!.thumbnail).toBeNull();
    // The token went with every call to the API, in its header, never in a link.
    expect(figma.tokens).toEqual([TOKEN, TOKEN, TOKEN, TOKEN]);
    expect(figma.calls.every((c) => !c.url.includes(TOKEN))).toBe(true);
  });

  it("adds the file's variables when Figma lets the token read them", async () => {
    const read = await readFigmaFile(KEY, TOKEN, fakeFigma({ variables: true }).deps);
    expect(read.ok && read.value.tokens).toMatchObject({
      colors: [{ hex: "#1F4E5F" }, { hex: "#FF5A1F" }, { name: "surface/sand", hex: "#F5EDDE" }],
      radii: [20, 16],
    });
  });

  it("says what Figma refused", async () => {
    expect(await readFigmaFile(KEY, TOKEN, fakeFigma({ status: 403 }).deps)).toEqual({ ok: false, error: "token" });
    expect(await readFigmaFile(KEY, TOKEN, fakeFigma({ status: 404 }).deps)).toEqual({ ok: false, error: "not_found" });
    expect(await readFigmaFile(KEY, TOKEN, fakeFigma({ status: 429, retryAfter: "90" }).deps)).toEqual({ ok: false, error: "limit", retryAfterSeconds: 90 });
    expect(await readFigmaFile(KEY, TOKEN, fakeFigma({ status: 500 }).deps)).toEqual({ ok: false, error: "unreachable" });
    const down = { apiUrl: "https://api.figma.test", fetcher: (async () => Promise.reject(new TypeError("fetch failed"))) as typeof fetch };
    expect(await readFigmaFile(KEY, TOKEN, down)).toEqual({ ok: false, error: "unreachable" });
  });

  it("brings the frames chosen as pictures, at the frame's own size when twice is too large", async () => {
    const figma = fakeFigma();
    const rendered = await renderFigmaFrames(KEY, TOKEN, ["1:3", "1:5"], figma.deps);
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    expect(rendered.images.get("1:3")?.subarray(1, 4).toString()).toBe("PNG");
    expect(rendered.images.get("1:5")).toBeNull();
    // The pictures themselves are fetched without the token.
    expect(figma.tokens).toEqual([TOKEN, null]);

    const big = fakeFigma({ bigPicture: true });
    const again = await renderFigmaFrames(KEY, TOKEN, ["1:3"], big.deps);
    expect(again.ok && again.images.get("1:3")?.subarray(1, 4).toString()).toBe("PNG");
    expect(big.calls.filter((c) => c.url.includes("/v1/images/")).map((c) => new URL(c.url).searchParams.get("scale"))).toEqual(["2", "1"]);
  });
});
