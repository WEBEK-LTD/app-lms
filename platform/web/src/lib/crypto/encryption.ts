import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for secrets at rest (license keys, store API keys).
 *
 * Format: `v1.<iv>.<tag>.<ciphertext>`, each part base64url. The optional
 * `context` is bound as additional authenticated data, so a value encrypted
 * for one column or record can't be moved to another one and still decrypt.
 */

const VERSION = "v1";
const IV_BYTES = 12;

export function encrypt(plaintext: string | Buffer, key: Buffer, context = ""): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const data = Buffer.concat([cipher.update(typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptToBuffer(payload: string, key: Buffer, context = ""): Buffer {
  assertKey(key);
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported encrypted value");
  }
  const [, ivPart, tagPart, dataPart] = parts as [string, string, string, string];
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== 16) throw new Error("Malformed encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);
}

export function decrypt(payload: string, key: Buffer, context = ""): string {
  return decryptToBuffer(payload, key, context).toString("utf8");
}

function assertKey(key: Buffer): void {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
}
