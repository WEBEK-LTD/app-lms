import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for secrets at rest (license keys, store API keys).
 *
 * Format: `v2.<key id>.<iv>.<tag>.<ciphertext>`, each part base64url. The
 * optional `context` is bound as additional authenticated data, so a value
 * encrypted for one column or record can't be moved to another one and still
 * decrypt. 79.2 The key ID (`keyId`) names the key that opens the value, so a
 * new key can take over while values sealed with an old one still open
 * (`withOldKeys`) until the rekey job (lib/jobs/rekey.ts) has moved them.
 * Values written before 79.2 (`v1.<iv>.<tag>.<ciphertext>`, no key ID) are
 * tried with each key.
 */

const VERSION = "v2";
const IV_BYTES = 12;

const ids = new WeakMap<Buffer, string>();
const rings = new WeakMap<Buffer, Buffer[]>();

/** 79.2 A key's ID: 8 base64url characters of SHA-256 over it. Not secret, and it says nothing about the key. */
export function keyId(key: Buffer): string {
  let id = ids.get(key);
  if (!id) {
    id = createHash("sha256").update("yallapp-key-id:").update(key).digest().subarray(0, 6).toString("base64url");
    ids.set(key, id);
  }
  return id;
}

/** 79.2 Attaches the previous keys to the current one: `decrypt` with `current` also opens values sealed with them. */
export function withOldKeys(current: Buffer, old: Buffer[]): Buffer {
  assertKey(current);
  for (const key of old) assertKey(key);
  rings.set(
    current,
    old.filter((key) => keyId(key) !== keyId(current)),
  );
  return current;
}

/** 79.2 The previous keys attached to this one (none for a plain key). */
export function oldKeysOf(key: Buffer): Buffer[] {
  return rings.get(key) ?? [];
}

/** 79.2 The ID of the key an encrypted value names, or null for a value of before 79.2 (or not a value). */
export function keyIdOf(payload: string): string | null {
  const parts = payload.split(".");
  return parts.length === 5 && parts[0] === VERSION ? parts[1]! : null;
}

export function encrypt(plaintext: string | Buffer, key: Buffer, context = ""): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const data = Buffer.concat([cipher.update(typeof plaintext === "string" ? Buffer.from(plaintext, "utf8") : plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, keyId(key), iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptToBuffer(payload: string, key: Buffer, context = ""): Buffer {
  assertKey(key);
  const parts = payload.split(".");
  if (parts.length === 5 && parts[0] === VERSION) {
    const id = parts[1]!;
    const match = [key, ...oldKeysOf(key)].find((k) => keyId(k) === id);
    if (!match) throw new Error(`Encrypted with a key that isn't set (key ID ${id})`);
    return open(match, parts[2]!, parts[3]!, parts[4]!, context);
  }
  if (parts.length === 4 && parts[0] === "v1") {
    // Before 79.2: no key ID, so each key is tried.
    let failure: unknown = null;
    for (const k of [key, ...oldKeysOf(key)]) {
      try {
        return open(k, parts[1]!, parts[2]!, parts[3]!, context);
      } catch (error) {
        failure = error;
      }
    }
    throw failure;
  }
  throw new Error("Unsupported encrypted value");
}

export function decrypt(payload: string, key: Buffer, context = ""): string {
  return decryptToBuffer(payload, key, context).toString("utf8");
}

function open(key: Buffer, ivPart: string, tagPart: string, dataPart: string, context: string): Buffer {
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== 16) throw new Error("Malformed encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);
}

function assertKey(key: Buffer): void {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
}
