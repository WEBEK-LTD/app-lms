import "server-only";
import { getBlobStore } from "../blobs";
import { getStore } from "../data";
import { appUrl } from "../env";
import { sendMail } from "../mail";
import type { CommunityDeps } from "./api/http";
import { appleVerifier, googleVerifier } from "./auth/id-tokens";
import { getCommunityStore } from "./store/server";
import { YALLAPP_TENANT, type CommunityTenant } from "./types";

/**
 * 231 What the Community API needs in production: the community's store,
 * Yallapp's store, the site's addresses, the Apple and Google verifiers
 * (from COMMUNITY_APPLE_AUDIENCES and COMMUNITY_GOOGLE_CLIENT_IDS; none when
 * unset), Yallapp's mailer, and the blob store for profile pictures.
 */

/** The community's website (COMMUNITY_SITE_URL), https://community.yallapp.com.tr by default. */
export function communitySiteUrl(): string {
  const url = (process.env.COMMUNITY_SITE_URL?.trim() || "").replace(/\/+$/, "");
  // Never Netlify's own address: links and emails go to the host visitors use (through our proxy).
  return url && !/\.netlify\.app$/i.test(new URL(url).hostname) ? url : COMMUNITY_SITE;
}

export const COMMUNITY_SITE = "https://community.yallapp.com.tr";

/** Public files of the community (profile pictures) are served under this path on Yallapp's host. */
export const COMMUNITY_FILES_PATH = "/api/community/files";
/** Only these keys are ever public. */
export const PUBLIC_COMMUNITY_PREFIX = "community/avatars/";

/** 232–235 `tenant`: a client app's id for its own community (/api/app/{app_id}/community/v1); Yallapp Community by default. */
export async function communityDeps(input: { ip: string; now?: Date; tenant?: CommunityTenant }): Promise<CommunityDeps> {
  const tenant = input.tenant ?? YALLAPP_TENANT;
  const [store, platform] = await Promise.all([getCommunityStore(tenant), getStore()]);
  const yallappUrl = appUrl();
  return {
    tenant,
    store,
    platform,
    now: input.now ?? new Date(),
    ip: input.ip,
    siteUrl: communitySiteUrl(),
    yallappUrl,
    apple: appleVerifier(),
    google: googleVerifier(),
    mail: (mail) => sendMail(mail, { fromName: "Yallapp Community" }),
    upload: async (key, bytes, contentType) => {
      await getBlobStore().put(key, Buffer.from(bytes), contentType);
      return `${yallappUrl}${COMMUNITY_FILES_PATH}/${key.slice(PUBLIC_COMMUNITY_PREFIX.length)}`;
    },
  };
}
