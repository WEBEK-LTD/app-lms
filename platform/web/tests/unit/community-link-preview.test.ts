import { describe, expect, it } from "vitest";
import { previewFromHtml } from "@/lib/community/social/service";

describe("232 a link preview's words from a page's tags", () => {
  it("decodes each entity once, so an escaped entity stays as written", () => {
    const html = `<html><head><meta property="og:title" content="Tom &amp; Jerry &amp;lt;3 &quot;cafe&quot;"><meta property="og:site_name" content="A &#39;shop&#39;"></head></html>`;
    const p = previewFromHtml("https://example.com/", html);
    expect(p?.title).toBe('Tom & Jerry &lt;3 "cafe"');
    expect(p?.siteName).toBe("A 'shop'");
  });
});
