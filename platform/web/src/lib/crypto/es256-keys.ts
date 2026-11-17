import { calculateJwkThumbprint, exportJWK, exportPKCS8, generateKeyPair, type JWK } from "jose";
import { encrypt } from "./encryption";

/**
 * ES256 key pairs that sign JWTs and are published as a JSON Web Key Set:
 * 34 an own API app's sign-in keys (lib/hosted/app-auth.ts) and 136 the
 * platform's own OpenID Connect issuer keys (lib/google/platform-keys.ts).
 * The private key (PKCS#8) is encrypted with ENCRYPTION_KEY and a context of
 * its own, and dropped when the key is retired; the public key stays
 * published for a while after that, so tokens it signed and key sets cached
 * elsewhere keep working until they expire.
 */

export const ES256 = "ES256";

/** The parts of a stored key the key set needs. */
export interface PublishableKey {
  kid: string;
  alg: string;
  publicJwk: { kty: string; crv: string; x: string; y: string };
  privateKeyEncrypted: string | null;
  retiredAt: Date | null;
}

/** A new key pair: its thumbprint (the `kid`), its public JWK and its private key encrypted with `context`. */
export async function newEs256Key(encryptionKey: Buffer, context: string): Promise<Pick<PublishableKey, "kid" | "publicJwk" | "privateKeyEncrypted">> {
  const { publicKey, privateKey } = await generateKeyPair(ES256, { extractable: true });
  const jwk = await exportJWK(publicKey);
  const publicJwk = { kty: jwk.kty!, crv: jwk.crv!, x: jwk.x!, y: jwk.y! };
  return {
    kid: await calculateJwkThumbprint(publicJwk),
    publicJwk,
    privateKeyEncrypted: encrypt(await exportPKCS8(privateKey), encryptionKey, context),
  };
}

/** The key that signs now: the newest one not retired. */
export function currentKey<K extends PublishableKey>(keys: readonly K[]): K | null {
  return keys.find((k) => k.retiredAt === null && k.privateKeyEncrypted) ?? null;
}

/** The keys to publish: those signing now and those retired less than `retiredSeconds` ago. */
export function keysToPublish<K extends PublishableKey>(keys: readonly K[], now: Date, retiredSeconds: number): K[] {
  return keys.filter((k) => k.retiredAt === null || now.getTime() - k.retiredAt.getTime() < retiredSeconds * 1000);
}

/** The JSON Web Key Set (RFC 7517) of the published keys, in the order given. Public parts only. */
export function keySetOf(keys: readonly PublishableKey[], now: Date, retiredSeconds: number): { keys: JWK[] } {
  return {
    keys: keysToPublish(keys, now, retiredSeconds).map((k) => ({ kty: k.publicJwk.kty, crv: k.publicJwk.crv, x: k.publicJwk.x, y: k.publicJwk.y, kid: k.kid, alg: k.alg, use: "sig" })),
  };
}
