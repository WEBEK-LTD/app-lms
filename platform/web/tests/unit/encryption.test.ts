import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createCipheriv } from "node:crypto";
import { decrypt, decryptToBuffer, encrypt, keyId, keyIdOf, oldKeysOf, withOldKeys } from "@/lib/crypto/encryption";

const key = randomBytes(32);

describe("AES-256-GCM encryption", () => {
  it("round-trips text and binary data", () => {
    const secret = '{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\nabc"}';
    const sealed = encrypt(secret, key, "app:1:play");
    expect(sealed.startsWith(`v2.${keyId(key)}.`)).toBe(true);
    expect(keyIdOf(sealed)).toBe(keyId(key));
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
    const data = Buffer.from(parts[4]!, "base64url");
    data[0] = data[0]! ^ 1;
    parts[4] = data.toString("base64url");
    expect(() => decrypt(parts.join("."), key)).toThrow();
    expect(() => decrypt("v2.a.b.c", key)).toThrow();
    expect(() => decrypt("garbage", key)).toThrow();
  });

  it("requires a 32-byte key", () => {
    expect(() => encrypt("x", randomBytes(16))).toThrow();
  });

  it("79.2 names its key: a value of an old key opens while that key is attached", () => {
    const oldKey = randomBytes(32);
    const newKey = randomBytes(32);
    expect(keyId(oldKey)).toMatch(/^[A-Za-z0-9_-]{8}$/);
    expect(keyId(oldKey)).not.toBe(keyId(newKey));
    const sealed = encrypt("store key", oldKey, "app:1:google-play");
    expect(() => decrypt(sealed, newKey, "app:1:google-play")).toThrow(`Encrypted with a key that isn't set (key ID ${keyId(oldKey)})`);
    const ring = withOldKeys(randomBytes(32), [oldKey]);
    expect(oldKeysOf(ring)).toEqual([oldKey]);
    expect(decrypt(sealed, ring, "app:1:google-play")).toBe("store key");
    expect(() => decrypt(sealed, ring, "app:2:google-play")).toThrow();
    // New values always go to the current key.
    expect(keyIdOf(encrypt("x", ring))).toBe(keyId(ring));
    // The current key among the old ones is ignored.
    expect(oldKeysOf(withOldKeys(newKey, [newKey, oldKey]))).toEqual([oldKey]);
  });

  it("79.2 still opens values of before 79.2 (no key ID), with the current key or an old one", () => {
    const v1 = (plain: string, k: Buffer, context: string) => {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", k, iv);
      cipher.setAAD(Buffer.from(context));
      const data = Buffer.concat([cipher.update(plain), cipher.final()]);
      return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
    };
    const oldKey = randomBytes(32);
    expect(decrypt(v1("license", key, "license-key:a"), key, "license-key:a")).toBe("license");
    expect(keyIdOf(v1("license", key, ""))).toBeNull();
    const ring = withOldKeys(randomBytes(32), [oldKey]);
    expect(decrypt(v1("license", oldKey, "license-key:a"), ring, "license-key:a")).toBe("license");
    expect(() => decrypt(v1("license", randomBytes(32), "license-key:a"), ring, "license-key:a")).toThrow();
  });
});
