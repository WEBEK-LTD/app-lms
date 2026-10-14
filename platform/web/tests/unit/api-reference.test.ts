import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { buildApiReference } from "@/lib/api-reference";

const CONTRACT = path.resolve(__dirname, "../../../../docs/api/openapi.yaml");
const REFERENCE = path.resolve(__dirname, "../../src/content/api-reference.json");

describe("the API reference on /developers", () => {
  it("lists every endpoint of the contract", () => {
    const made = buildApiReference(parse(readFileSync(CONTRACT, "utf8")));
    const json = `${JSON.stringify(made, null, 2)}\n`;
    // After a contract change: UPDATE_API_REFERENCE=1 npx vitest run tests/unit/api-reference.test.ts
    if (process.env.UPDATE_API_REFERENCE === "1") writeFileSync(REFERENCE, json);
    expect(readFileSync(REFERENCE, "utf8"), "src/content/api-reference.json is out of date: see src/lib/api-reference.ts").toBe(json);

    const paths = made.tags.flatMap((t) => t.endpoints.map((e) => `${e.method} ${e.path}`));
    expect(paths).toContain("GET /config");
    expect(paths).toContain("POST /auth/otp/request");
    expect(paths).toContain("POST /bookings/appointments");
    expect(made.tags.flatMap((t) => t.endpoints).find((e) => e.path === "/config")?.access).toBe("public");
    expect(made.tags.flatMap((t) => t.endpoints).find((e) => e.path === "/me" && e.method === "GET")?.access).toBe("signed-in");
    expect(made.tags.flatMap((t) => t.endpoints).find((e) => e.path === "/courses" && e.method === "GET")?.access).toBe("optional");
  });
});
