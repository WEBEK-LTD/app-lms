import "server-only";
import { getBlobStore } from "../blobs";
import { getStore } from "../data";
import { appUrl, communityFirebaseProject, encryptionKey, paymentApiUrls, yallappFirebaseEnv } from "../env";
import { confirmCheckout, startCheckout } from "../payments/provider";
import { callbackUrls } from "../payments/routes";
import { yallappBilling, yallappPlanAccount } from "../settings/platform";
import type { DataStore } from "../data/store";
import type { CourseCheckoutGateway } from "./engage/checkout";
import { sendPush } from "../hosted/push";
import { COMMUNITY_APP_ID, type CommunityPusher } from "./engage/push";
import { sendMail } from "../mail";
import type { CommunityDeps } from "./api/http";
import { appleVerifier, googleVerifier } from "./auth/id-tokens";
import { getCommunityStore } from "./store/server";

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

/**
 * 232 Push for the Community app: Yallapp's keyless Firebase sender (Workload
 * Identity Federation; no key exists) for the app's project. Null until both
 * are set up on this server.
 */
export function communityPusher(): CommunityPusher | null {
  const env = yallappFirebaseEnv();
  const project = communityFirebaseProject();
  if (!env || !project) return null;
  const account = { project_id: project, client_email: env.pushAccount, private_key: "", federated: true };
  return async (targets, message) => {
    const result = await sendPush(
      account,
      targets.map((t) => t.token),
      { title: message.title, body: message.body, data: message.data, restrictedPackage: COMMUNITY_APP_ID },
    );
    return { sent: result.sent, invalidTokens: result.invalidTokens };
  };
}

/**
 * 233 Yallapp's own website checkout, as Studio Market's templates use it:
 * the account for the gateway the team chose for Yallapp's payments, and
 * the pound-to-dollar rate for gateways that charge pounds.
 */
export function courseCheckoutGateway(platform: DataStore): () => Promise<CourseCheckoutGateway> {
  return async () => {
    const [account, billing] = await Promise.all([yallappPlanAccount(platform, encryptionKey()), yallappBilling(platform, { fresh: true })]);
    const urls = paymentApiUrls();
    return {
      account,
      egpPerUsd: billing.egpPerUsd,
      start: (a, request, options) => startCheckout(a, request, { urls, ...options }),
      confirm: (a, expected, options) => confirmCheckout(a, expected, { urls, ...options }),
      callbackUrls: (provider, token) => callbackUrls(appUrl(), "course", provider, token),
    };
  };
}

export async function communityDeps(input: { ip: string; now?: Date }): Promise<CommunityDeps> {
  const [store, platform] = await Promise.all([getCommunityStore(), getStore()]);
  const yallappUrl = appUrl();
  return {
    store,
    platform,
    now: input.now ?? new Date(),
    ip: input.ip,
    siteUrl: communitySiteUrl(),
    yallappUrl,
    apple: appleVerifier(),
    google: googleVerifier(),
    mail: (mail) => sendMail(mail, { fromName: "Yallapp Community" }),
    push: communityPusher(),
    courseCheckout: courseCheckoutGateway(platform),
    upload: async (key, bytes, contentType) => {
      await getBlobStore().put(key, Buffer.from(bytes), contentType);
      return `${yallappUrl}${COMMUNITY_FILES_PATH}/${key.slice(PUBLIC_COMMUNITY_PREFIX.length)}`;
    },
  };
}
