/**
 * 136 Google's APIs that Yallapp's Firebase uses. Local tests point all of
 * them at one fake server (GOOGLE_API_TEST_URL, lib/google/federation-env.ts),
 * each under its own path.
 */
export interface GoogleEndpoints {
  sts: string;
  iamCredentials: string;
  firebase: string;
  fcm: string;
  resourceManager: string;
  serviceUsage: string;
  apiKeys: string;
}

export const GOOGLE_ENDPOINTS: GoogleEndpoints = {
  sts: "https://sts.googleapis.com",
  iamCredentials: "https://iamcredentials.googleapis.com",
  firebase: "https://firebase.googleapis.com",
  fcm: "https://fcm.googleapis.com",
  resourceManager: "https://cloudresourcemanager.googleapis.com",
  serviceUsage: "https://serviceusage.googleapis.com",
  apiKeys: "https://apikeys.googleapis.com",
};

/** Every API on one test server: `<base>/sts`, `<base>/firebase`… */
export function endpointsAt(base: string): GoogleEndpoints {
  const root = base.replace(/\/+$/, "");
  return {
    sts: `${root}/sts`,
    iamCredentials: `${root}/iamcredentials`,
    firebase: `${root}/firebase`,
    fcm: `${root}/fcm`,
    resourceManager: `${root}/cloudresourcemanager`,
    serviceUsage: `${root}/serviceusage`,
    apiKeys: `${root}/apikeys`,
  };
}
