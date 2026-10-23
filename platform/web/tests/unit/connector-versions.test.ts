import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { platformDefinitions } from "@/lib/hosted/connectors/registry";
import { connectorOfApp, CONNECTOR_VERSIONS } from "@/lib/hosted/connectors/versions";
import { parseVersion } from "@/lib/semver";

/** 83.4 Every connector has a version, and docs/CONNECTORS.md lists the same ones. */
describe("83.4 connector versions", () => {
  it("every connector, the platforms included, has a version and the API it reads", () => {
    for (const [id, info] of Object.entries(CONNECTOR_VERSIONS)) {
      expect(parseVersion(info.version), id).not.toBeNull();
      expect(info.name && info.api, id).toBeTruthy();
    }
    for (const platform of platformDefinitions()) expect(CONNECTOR_VERSIONS, platform.id).toHaveProperty(platform.id);
  });

  it("knows the app's connector", () => {
    expect(connectorOfApp({ connector: { kind: "catalog" } })).toMatchObject({ id: "catalog", version: "1.0.0", api: "Yallapp" });
    expect(connectorOfApp({ connector: { kind: "platform", platform: "ikas", settings: {}, secretsEncrypted: "x" } })).toMatchObject({ id: "ikas", name: "ikas" });
    expect(connectorOfApp({ connector: null })).toBeNull();
    expect(connectorOfApp({ connector: { kind: "platform", platform: "unknown", settings: {}, secretsEncrypted: "x" } })).toBeNull();
  });

  it("docs/CONNECTORS.md lists each connector with its version", () => {
    const docs = readFileSync(path.resolve(__dirname, "../../../../docs/CONNECTORS.md"), "utf8");
    for (const [id, info] of Object.entries(CONNECTOR_VERSIONS)) {
      expect(docs, id).toMatch(new RegExp(`^\\| \`${id}\` \\| ${info.name.replace(/[.()]/g, "\\$&")} \\| ${info.version.replace(/\./g, "\\.")} \\|`, "m"));
    }
  });
});

describe("83.4 the adapters a WordPress site uses", () => {
  it("reads SiteInfo.adapters: the known kinds with a version", async () => {
    const { parseSiteAdapters } = await import("@/lib/license/service");
    expect(parseSiteAdapters({ lms: "1.0.0", store: "1.2.3", bookings: "two", other: "1.0.0" })).toEqual({ lms: "1.0.0", store: "1.2.3" });
    expect(parseSiteAdapters(undefined)).toBeNull();
    expect(parseSiteAdapters(["1.0.0"])).toBeNull();
  });
});
