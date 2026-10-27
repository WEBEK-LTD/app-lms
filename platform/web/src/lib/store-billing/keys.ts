import { keyContext } from "../builds/signing";
import { decrypt } from "../crypto/encryption";
import type { App } from "../data/types";

/** 100.2 The app's store keys from the Publishing step, read; a key that can't be read is `unreadable`. */

export function googleKey(app: Pick<App, "id" | "googlePlayKeyEncrypted">, key: Buffer): string {
  try {
    return decrypt(app.googlePlayKeyEncrypted ?? "", key, keyContext.googlePlay(app.id));
  } catch {
    throw { code: "unreadable" };
  }
}

export function appleCredentials(app: Pick<App, "id" | "ascKeyId" | "ascIssuerId" | "ascPrivateKeyEncrypted">, key: Buffer) {
  try {
    return { keyId: app.ascKeyId ?? "", issuerId: app.ascIssuerId ?? "", privateKey: decrypt(app.ascPrivateKeyEncrypted ?? "", key, keyContext.appStore(app.id)) };
  } catch {
    throw { code: "unreadable" };
  }
}
