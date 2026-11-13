import { describe, expect, it } from "vitest";
import { pluginZipVersion } from "@/lib/license/plugin-zip";
import { zip } from "../e2e/zip";

/** 124.17 Admin › Releases takes a plugin's version from its zip, never only from what was typed. */
describe("124.17 a plugin zip's own version", () => {
  const header = (version: string) => `<?php\n/**\n * Plugin Name:       Yallapp\n * Plugin URI:        https://example.test\n * Version:           ${version}\n * Requires PHP:      7.4\n */\n`;

  it("reads the Version line of yallapp/yallapp.php", () => {
    expect(pluginZipVersion(zip({ "yallapp/yallapp.php": header("0.4.38"), "yallapp/readme.txt": "Stable tag: 0.4.38" }))).toBe("0.4.38");
  });

  it("is null for a zip that isn't the Yallapp plugin, or not a zip at all", () => {
    expect(pluginZipVersion(zip({ "tutor/tutor.php": header("4.1.1") }))).toBeNull();
    expect(pluginZipVersion(zip({ "yallapp/yallapp.php": "<?php // no header" }))).toBeNull();
    expect(pluginZipVersion(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]))).toBeNull();
    expect(pluginZipVersion(new Uint8Array(0))).toBeNull();
  });
});
