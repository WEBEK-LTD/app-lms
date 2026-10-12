import { randomInt } from "node:crypto";
import { sha256Hex } from "../crypto/tokens";

/**
 * License keys look like `YALL-7K2D-9QWE-4MNB`: 12 random characters from an
 * alphabet without look-alikes (no 0/O, 1/I/L), about 59 bits of entropy.
 */
export const KEY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const KEY_PATTERN = /^YALL-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

export function generateLicenseKey(): string {
  const groups: string[] = [];
  for (let g = 0; g < 3; g += 1) {
    let group = "";
    for (let i = 0; i < 4; i += 1) group += KEY_ALPHABET[randomInt(KEY_ALPHABET.length)];
    groups.push(group);
  }
  return `YALL-${groups.join("-")}`;
}

/** Uppercases and trims, and turns spaces or underscores into dashes. */
export function normalizeLicenseKey(input: string): string {
  return input.trim().toUpperCase().replace(/[\s_]+/g, "-");
}

export function isWellFormedLicenseKey(input: string): boolean {
  return KEY_PATTERN.test(normalizeLicenseKey(input));
}

export function hashLicenseKey(key: string): string {
  return sha256Hex(`yallapp-license:${normalizeLicenseKey(key)}`);
}

export function maskLicenseKey(last4: string): string {
  return `YALL-••••-••••-${last4}`;
}
