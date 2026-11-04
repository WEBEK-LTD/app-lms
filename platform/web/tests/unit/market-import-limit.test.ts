import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IMPORT_MAX_BYTES } from "@/lib/market/panel-pages";
import { PANEL_WORDS } from "@/lib/market/panel-words";

describe("115.7 the panel's catalog import says the limit it really has", () => {
  it("stays under what a server action carries on Netlify", () => {
    const config = readFileSync("next.config.ts", "utf8");
    const limit = /bodySizeLimit:\s*"(\d+)mb"/.exec(config);
    expect(limit).not.toBeNull();
    // The form adds its own bytes around the file.
    expect(IMPORT_MAX_BYTES).toBeLessThan(Number(limit![1]) * 1024 * 1024);
    expect(IMPORT_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it("tells the place the same limit in every language, and the action refuses bigger files with it", () => {
    for (const lang of ["en", "ar", "tr"] as const) expect(PANEL_WORDS[lang].importText).toContain("5");
    const action = readFileSync("src/app/partner/[appId]/actions.ts", "utf8");
    expect(action).toContain("file.size > IMPORT_MAX_BYTES");
    expect(action).not.toContain("30 MB");
  });
});
