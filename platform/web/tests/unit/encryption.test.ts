import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, decryptToBuffer, encrypt } from "@/lib/crypto/encryption";

const key = randomBytes(32);

describe("AES-256-GCM encryption", () => {
  it("round-trips text and binary data", () => {
    const secret = '{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\nabc"}';
    const sealed = encrypt(secret, key, "app:1:play");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("service_account");
    expect(decrypt(sealed, key, "app:1:play")).toBe(secret);

    const binary = randomBytes(1000);
    expect(decryptToBuffer(encrypt(binary, key), key).equals(binary)).toBe(true);
    expect(decrypt(encrypt("", key), key)).toBe("");
  });

  it("uses a fresh IV every time", () => {
    expect(encrypt("same", key)).not.toBe(encrypt("same", key));
  });

  it("fails with the wrong key or context", () => {
    const sealed = encrypt("secret", key, "license-key:a");
    expect(() => decrypt(sealed, randomBytes(32), "license-key:a")).toThrow();
    expect(() => decrypt(sealed, key, "license-key:b")).toThrow();
  });

  it("detects tampering", () => {
    const sealed = encrypt("secret value", key);
    const parts = sealed.split(".");
    const data = Buffer.from(parts[3]!, "base64url");
    data[0] = data[0]! ^ 1;
    parts[3] = data.toString("base64url");
    expect(() => decrypt(parts.join("."), key)).toThrow();
    expect(() => decrypt("v2.a.b.c", key)).toThrow();
    expect(() => decrypt("garbage", key)).toThrow();
  });

  it("requires a 32-byte key", () => {
    expect(() => encrypt("x", randomBytes(16))).toThrow();
  });
});
