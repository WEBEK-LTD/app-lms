import { describe, expect, it } from "vitest";
import { isHttpUrl, normalizeSiteUrl, sameSite } from "@/lib/license/site-url";

describe("normalizeSiteUrl", () => {
  it.each([
    ["https://academy.com", "academy.com"],
    ["http://academy.com/", "academy.com"],
    ["https://WWW.Academy.com", "academy.com"],
    ["academy.com", "academy.com"],
    ["https://academy.com:443/", "academy.com"],
    ["http://academy.com:80", "academy.com"],
    ["https://academy.com:8443", "academy.com:8443"],
    ["https://academy.com/learn/", "academy.com/learn"],
    ["https://academy.com/Learn//", "academy.com/learn"],
    ["https://academy.com/index.php", "academy.com"],
    ["https://academy.com/?utm=1#top", "academy.com"],
    ["https://user:pass@academy.com", "academy.com"],
    ["https://academy.com.", "academy.com"],
    ["  https://academy.com  ", "academy.com"],
    ["https://bücher.de", "xn--bcher-kva.de"],
    ["http://localhost:8080/wp", "localhost:8080/wp"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeSiteUrl(input)).toBe(expected);
  });

  it.each(["", "   ", "ftp://academy.com", "javascript:alert(1)", "https://", "https://a..b", "mailto:x@y.z"])(
    "rejects %j",
    (input) => {
      expect(normalizeSiteUrl(input)).toBeNull();
    },
  );

  it("keeps subdirectory installs apart", () => {
    expect(sameSite("https://academy.com", "https://academy.com/school")).toBe(false);
    expect(sameSite("http://www.academy.com/school/", "https://academy.com/school")).toBe(true);
  });

  it("checks absolute http(s) URLs for forms", () => {
    expect(isHttpUrl("https://academy.com")).toBe(true);
    expect(isHttpUrl("http://academy.com")).toBe(true);
    expect(isHttpUrl("http://academy.com", true)).toBe(false);
    expect(isHttpUrl("academy.com")).toBe(false);
  });
});
