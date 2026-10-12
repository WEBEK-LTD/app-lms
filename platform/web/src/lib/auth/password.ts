import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id (the library default) with the OWASP baseline parameters:
 * 19 MiB of memory, 2 passes, 1 lane.
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string | null, password: string): Promise<boolean> {
  if (!passwordHash) {
    // Spend comparable time so missing accounts can't be told apart by timing.
    await hash(password, OPTIONS);
    return false;
  }
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
