import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalPrivateKey } from "@/lib/builds/signing";
import { rewrapPem } from "@/lib/crypto/pem";
import { appStoreKeySchema } from "@/lib/validation";

/**
 * App Store Connect keys reach fastlane as OpenSSL writes them: an iOS build stopped with
 * "invalid curve name" when Ruby couldn't read the saved key.
 */
const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const body = pem.split("\n").filter((line) => line && !line.startsWith("-----"));

const shapes: [string, string][] = [
  ["as Apple gives it", pem],
  ["with Windows line endings", pem.replace(/\n/g, "\r\n")],
  ["with a byte order mark", `﻿${pem}`],
  ["on one line", pem.replace(/\n/g, " ")],
  ["indented", pem.split("\n").map((line) => `  ${line}`).join("\n")],
  ["with notes around it", `Key for Apple\n${pem}\nDownloaded once.\n`],
];

describe("App Store Connect keys", () => {
  it.each(shapes)("%s: sent as PKCS#8 PEM with 64-character lines", (_, shape) => {
    expect(canonicalPrivateKey(shape)).toBe(pem);
    expect(appStoreKeySchema.shape.privateKey.safeParse(shape).success).toBe(true);
  });

  it("rewraps the base64 body", () => {
    expect(rewrapPem(pem.replace(/\n/g, ""))).toBe(`-----BEGIN PRIVATE KEY-----\n${body.join("\n")}\n-----END PRIVATE KEY-----\n`);
  });

  it("keeps what isn't a key, so the build can say so", () => {
    expect(canonicalPrivateKey("not a key")).toBe("not a key");
    expect(rewrapPem("plain text")).toBe("plain text");
  });

  it("still refuses keys that aren't P-256", () => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    expect(appStoreKeySchema.shape.privateKey.safeParse(rsa).success).toBe(false);
  });
});
