import { z } from "zod";
import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore, SigningKeysPatch } from "../data/store";
import type { App, Build } from "../data/types";

/**
 * Signing and store keys handed to the build pipeline (docs/api/pipeline.yaml,
 * tag "Signing"). Nothing here is ever part of the build config.
 */

const password = z.string().min(16).max(128);

export const androidUploadKeySchema = z
  .object({
    keystore_base64: z.string().max(20_000),
    store_password: password,
    key_alias: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    key_password: password,
  })
  .strict();

export const iosDistributionSchema = z
  .object({
    p12_base64: z.string().max(20_000),
    password,
    certificate_id: z.string().max(64).optional(),
  })
  .strict();

export const signingKeysSchema = z
  .object({
    android_upload_key: androidUploadKeySchema.optional(),
    ios_distribution: iosDistributionSchema.optional(),
  })
  .strict()
  .refine((value) => value.android_upload_key !== undefined || value.ios_distribution !== undefined, "Send at least one key.");

export type AndroidUploadKey = z.infer<typeof androidUploadKeySchema>;
export type IosDistribution = z.infer<typeof iosDistributionSchema>;
export type SigningKeys = z.infer<typeof signingKeysSchema>;

export interface BuildSecrets {
  android_upload_key: AndroidUploadKey | null;
  ios_distribution: IosDistribution | null;
  google_play: { service_account_json: string } | null;
  app_store_connect: { issuer_id: string; key_id: string; private_key: string } | null;
}

/** Encryption contexts (AAD) per app and kind, so a value can't be moved to another column or app. */
export const keyContext = {
  googlePlay: (appId: string) => `app:${appId}:google-play`,
  appStore: (appId: string) => `app:${appId}:app-store`,
  androidUploadKey: (appId: string) => `app:${appId}:android-upload-key`,
  iosDistribution: (appId: string) => `app:${appId}:ios-distribution`,
};

/** Signing and store keys only go out while the build is running. */
export function isBuilding(build: Build): boolean {
  return build.status === "building";
}

/** Decrypts everything the pipeline needs for a build. Store keys are returned on every plan. */
export function buildSecrets(app: App, key: Buffer): BuildSecrets {
  return {
    android_upload_key: app.androidUploadKeyEncrypted
      ? (JSON.parse(decrypt(app.androidUploadKeyEncrypted, key, keyContext.androidUploadKey(app.id))) as AndroidUploadKey)
      : null,
    ios_distribution: app.iosDistributionEncrypted
      ? (JSON.parse(decrypt(app.iosDistributionEncrypted, key, keyContext.iosDistribution(app.id))) as IosDistribution)
      : null,
    google_play: app.googlePlayKeyEncrypted
      ? { service_account_json: decrypt(app.googlePlayKeyEncrypted, key, keyContext.googlePlay(app.id)) }
      : null,
    app_store_connect:
      app.ascPrivateKeyEncrypted && app.ascIssuerId && app.ascKeyId
        ? {
            issuer_id: app.ascIssuerId,
            key_id: app.ascKeyId,
            private_key: decrypt(app.ascPrivateKeyEncrypted, key, keyContext.appStore(app.id)),
          }
        : null,
  };
}

export type SaveSigningKeysResult = { ok: true } | { ok: false; code: "key_exists"; message: string };

const KIND_NAME = { androidUploadKeyEncrypted: "an Android upload key", iosDistributionEncrypted: "an iOS distribution certificate" } as const;

/**
 * Encrypts and saves the keys the pipeline created. A key that is already
 * saved is NEVER overwritten: a new Android upload key would stop the client
 * from updating their app on Google Play. If any key in the request exists,
 * nothing is saved and the result is `key_exists`.
 */
export async function saveSigningKeys(
  store: DataStore,
  app: App,
  keys: SigningKeys,
  key: Buffer,
  now: Date,
): Promise<SaveSigningKeysResult> {
  const patch: SigningKeysPatch = {};
  if (keys.android_upload_key) {
    patch.androidUploadKeyEncrypted = encrypt(JSON.stringify(keys.android_upload_key), key, keyContext.androidUploadKey(app.id));
  }
  if (keys.ios_distribution) {
    patch.iosDistributionEncrypted = encrypt(JSON.stringify(keys.ios_distribution), key, keyContext.iosDistribution(app.id));
  }
  const existing = (Object.keys(patch) as (keyof SigningKeysPatch)[]).filter((column) => app[column] !== null);
  // The store checks again in the same write, so two requests at once can't both save.
  if (existing.length === 0 && (await store.saveSigningKeys(app.id, patch, now))) return { ok: true };
  const current = (await store.getAppById(app.id)) ?? app;
  const taken = (Object.keys(patch) as (keyof SigningKeysPatch)[]).filter((column) => current[column] !== null);
  const names = (taken.length ? taken : existing).map((column) => KIND_NAME[column]);
  return {
    ok: false,
    code: "key_exists",
    message: `This app already has ${names.join(" and ") || "this key"}. Saved keys are never replaced.`,
  };
}
