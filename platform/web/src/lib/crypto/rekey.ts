import { decryptToBuffer, encrypt, keyIdOf } from "./encryption";

/**
 * 79.2 Moving encrypted values to the current key. A value is found in a
 * database cell either as the whole cell or as a string inside the cell's
 * JSON. It is opened with the key its ID names (or, from before 79.2, each
 * key in turn) and the context it was sealed with, then sealed again with the
 * current key and the same context. The context isn't stored with the value,
 * so it is found among the contexts the platform uses (lib/jobs/rekey.ts),
 * built from the cell's row; AES-GCM refuses a wrong one, so a value is never
 * sealed under a context it didn't have.
 */

const V1 = String.raw`v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]*`;
const V2 = String.raw`v2\.[A-Za-z0-9_-]{8}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]*`;

/** An encrypted value: the whole text, or a JSON string (between quotes). */
const VALUE = new RegExp(`(?<=^|")(?:${V1}|${V2})(?=$|")`, "g");

/** The encrypted values in a text. */
export function encryptedValuesIn(text: string): string[] {
  return text.match(VALUE) ?? [];
}

/** Whether a text holds a value that isn't on the key `currentKeyId`. */
export function needsRekey(text: string, currentKeyId: string): boolean {
  return encryptedValuesIn(text).some((value) => keyIdOf(value) !== currentKeyId);
}

export interface RekeyedText {
  text: string;
  /** Values sealed again with the current key. */
  moved: number;
  /** Values no key or context opened (left as they were). */
  failed: number;
}

/** Seals every value of the text that isn't on `key` again with it; `contexts` are tried in turn. */
export function rekeyText(text: string, key: Buffer, contexts: string[], currentKeyId: string): RekeyedText {
  let moved = 0;
  let failed = 0;
  const out = text.replace(VALUE, (value) => {
    if (keyIdOf(value) === currentKeyId) return value;
    for (const context of contexts) {
      let plain: Buffer;
      try {
        plain = decryptToBuffer(value, key, context);
      } catch {
        continue;
      }
      moved++;
      return encrypt(plain, key, context);
    }
    failed++;
    return value;
  });
  return { text: out, moved, failed };
}

/** Strings of a row that may be part of a context: its IDs and keys (short strings), JSON included. */
export function candidatesIn(values: unknown[]): string[] {
  const found = new Set<string>();
  const add = (value: unknown, depth: number): void => {
    if (depth > 6 || value === null || value === undefined) return;
    if (typeof value === "string") {
      if (value.length > 0 && value.length <= 100 && !value.startsWith("v1.") && !value.startsWith("v2.")) found.add(value);
      const trimmed = value.trimStart();
      if (value.length > 100 && (trimmed.startsWith("{") || trimmed.startsWith("["))) {
        try {
          add(JSON.parse(value), depth + 1);
        } catch {
          // Not JSON.
        }
      }
      return;
    }
    if (typeof value === "number") {
      found.add(String(value));
      return;
    }
    if (value instanceof Date || Buffer.isBuffer(value)) return;
    if (value instanceof Map) {
      for (const [k, v] of value) {
        add(k, depth + 1);
        add(v, depth + 1);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) add(v, depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        add(k, depth + 1);
        add(v, depth + 1);
      }
    }
  };
  for (const value of values) add(value, 0);
  return [...found];
}
