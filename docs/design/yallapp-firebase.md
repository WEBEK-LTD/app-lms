# Automatic push notifications ("Yallapp Firebase"): design

Repo state read: `main` at `1e8437bd`. Date: 16 Nov 2026. No code here, design only.

## Summary

- **New option, "Yallapp sets up notifications"** (default for new apps). "Use my own Firebase" stays exactly as it is today, and existing apps keep their mode.
- **Firebase projects:** Yallapp owns a small pool of Firebase projects (`yallapp-push-01`, `-02`, …). The platform registers each client's Android and iOS apps there through the Firebase Management API, including the courier, driver, vendor and staff variants. It saves the returned `google-services.json` and `GoogleService-Info.plist` as ordinary assets. A pool is needed because Firebase caps a project at 30 apps.
- **Keyless access:** the platform acts as its own OIDC issuer. It publishes a JWKS and signs short-lived ES256 assertions with a key stored encrypted in the database. It exchanges them through Workload Identity Federation (WIF) for a service account's access token. No service account JSON key exists anywhere. Netlify offers no OIDC token to functions. GitHub OIDC only works inside workflow runs, so it isn't needed here.
- **Sending:** `sendPush` and `serviceAccountOf` stay the single choke point. In Yallapp mode they get the token through WIF, so every existing push path works unchanged. WordPress sites send through a new platform relay, `POST /push/send`, authenticated with the license key.
- **iPhone:** I found no public API to upload an APNs key to Firebase, and the App Store Connect API cannot create APNs keys. Recommendation: the client uploads their `.p8` once to Yallapp, the platform checks it against Apple, and Yallapp's team uploads it in the Firebase console. iPhones that already installed the app then start receiving pushes with no new build. Direct APNs (option b) is kept as a later option.
- **Pipeline:** no change. It already downloads `firebase.android_config_url` and `ios_config_url` from the platform.
- **Contracts:** the app contract (`openapi.yaml`) and `build-config.schema.json` don't change. `platform.yaml` gains the relay endpoint and a license flag (Phase 3).

## 1. What exists today

| Piece | Where |
|---|---|
| Config file upload (setup step "listing", text "Push notifications (optional) …") | `platform/web/src/app/dashboard/setup/steps.tsx:1499-1531` (`FirebaseFields`), strings in `src/i18n/dashboard/setup.ts:208-215`; saved by `readFirebaseFiles` in `src/app/actions/dashboard.ts:752-768` as assets `firebase_android` / `firebase_ios` (`apps.firebase_android_asset_id`, `firebase_ios_asset_id`) |
| Files cleared on package / bundle change | `src/app/actions/dashboard.ts:697-698` |
| Service account upload (Notifications page) | `saveServiceAccountAction` in `src/app/actions/notifications.ts:53-77` → `apps.firebaseServiceAccountEncrypted` (context `app:firebase-service-account:<id>`) |
| Sending (FCM HTTP v1, RS256 JWT grant with the client's key; HMS) | `src/lib/hosted/push.ts` (`sendPush`, `googleAccessToken`, `checkFirebaseAccount`) |
| Credentials per app | `serviceAccountOf` in `src/lib/hosted/notify.ts:20-28` (68 call sites in 32 files) |
| "Is push on?" checks reading the key column directly | `dashboard/articles/article-page.tsx:38`, `dashboard/campaigns/campaign-page.tsx:126`, `lib/hosted/connectors/articles.ts:53`, `connectors/donations.ts:53`, `lib/integrations/index.ts:151,208`, `lib/delivery/flow.ts:38` |
| Build config `firebase` | `buildConfigFor` in `src/lib/app/setup.ts:207-209` (`assetUrl` = `${appUrl()}/api/v1/assets/<id>`, `src/lib/assets.ts:7`); variants: `lib/delivery/courier-app.ts` (Android when the file lists `.courier`/`.driver`, iPhone from `DeliverySettings.courierFirebaseIosAssetId`), `lib/market/vendor-app.ts`, `lib/school/staff-app.ts` (Android only, "no iPhone Firebase file yet") |
| Preflight | `src/lib/builds/preflight.ts:72-82` |
| Publishing checklist "Firebase by the client or by us" | `src/lib/publishing/steps.ts:92-101`, `dashboard/publishing/forms.tsx` |
| Yallapp's own apps | Yallapp Business: `OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT`. Yallapp Courier: `COURIER_PUSH_…` (`src/lib/env.ts:449-467`). That key was made by lifting `iam.disableServiceAccountKeyCreation` for a moment (LAUNCH-CHECKLIST 7k). An existing WIF pool `github-actions` in `yallapp-business` lets the release workflow sign in to Google Play (ROADMAP 65.12, LAUNCH-CHECKLIST 7l) |
| Plugin | `wp-plugin/yallapp/includes/push/class-push-service.php` (`send_batch` :470, `access_token` :563 with the site's `firebase_service_account` setting), HMS in `class-hms-sender.php` |

## 2. Keyless Google access: the options

| Option | Verdict |
|---|---|
| **Netlify OIDC tokens for functions** | **Not available.** I found no Netlify docs or changelog entry for it, only an unanswered community question. Vercel has this feature (`x-vercel-oidc-token`); Netlify doesn't. |
| **WIF from GitHub Actions OIDC** | It works, and is already used for Play in `yallapp-business`. But a token only exists inside a workflow run, so it can't serve pushes sent at any minute from Netlify. Minting tokens on a schedule and pushing them to the platform is rejected: Actions cron is late or skipped, a failed run stops all pushes, and a live access token ends up on the platform anyway. This design doesn't need it, because the platform registers the apps and the pipeline only downloads files. |
| **WIF with the platform as its own OIDC issuer** | **Recommended.** Details below. |
| Cloud Run relay with an attached service account | Keyless inside Google, but it needs billing (Blaze), it's another service to run, and it still has to authenticate the platform (the same signed JWT, checked by our own code). Fallback only. |
| The owner's Google OAuth refresh token | A long-lived credential tied to one person; for an app that isn't verified, refresh tokens expire after 7 days in testing. Rejected. |

**Why the platform as issuer is sound**

- **Supported by Google.** WIF OIDC providers accept tokens signed with **RS256 or ES256**, so the existing ES256 code in `lib/hosted/app-auth.ts` (jose) fits. Google reads keys from `<issuer>/.well-known/openid-configuration`. You can instead upload a JWKS with `--jwk-json-path` (up to 8 keys, no `x5c`/`x5t`), which is a fallback if Google can't reach the site.
- **Same root of trust as today.** Anyone with the database and `ENCRYPTION_KEY` can already send pushes with every client's stored service account key. So there is no new trust; the key Google never issued is simply gone.
- **Better control than a JSON key:**
  - assertions last 5 minutes and are bound to one audience;
  - an attribute condition allows only the expected `sub` values;
  - disabling the provider is a kill switch that takes effect at once;
  - we rotate keys ourselves;
  - it works under the org's Secure by Default policy that blocks key creation.
- **Weak spots:**
  - Google must be able to fetch the JWKS from the platform. Cached access tokens last an hour, and the upload fallback exists.
  - How long Google caches a JWKS isn't documented as far as I could check. A retired key stays published for 2 days, longer than the 1 day `app-auth.ts` uses.

**The token flow** (new `src/lib/google/federation.ts`):
1. **Sign an assertion.** ES256 with the platform key, `kid` in the header. Claims:
   - `iss = https://yallapp.com.tr/oidc`
   - `sub = push-sender` or `firebase-apps`
   - `aud = https://iam.googleapis.com/projects/<N>/locations/global/workloadIdentityPools/yallapp-platform/providers/platform` (the provider's default allowed audience)
   - `iat`, `exp = iat + 300`, `jti`
2. **Exchange it.** `POST https://sts.googleapis.com/v1/token` with:
   - `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`
   - `audience=//iam.googleapis.com/<provider>`
   - `subject_token_type=urn:ietf:params:oauth:token-type:jwt`
   - `requested_token_type=urn:ietf:params:oauth:token-type:access_token`
   - `scope=https://www.googleapis.com/auth/cloud-platform`
3. **Get the service account's token.** `POST https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/<SA>:generateAccessToken` with `{"scope":["https://www.googleapis.com/auth/firebase.messaging"],"lifetime":"3600s"}` (the `cloud-platform` scope for app registration).
4. **Cache it** in the existing `accessTokens` map in `push.ts`, until a minute before it expires.

**New files:**
- Routes `src/app/api/oidc/openid-configuration/route.ts` and `src/app/api/oidc/jwks/route.ts`, with rewrites in `next.config` next to the `assetlinks` ones (`/oidc/.well-known/openid-configuration`, `/oidc/jwks.json`).
- The discovery document: `issuer`, `jwks_uri`, `id_token_signing_alg_values_supported: ["ES256"]`, `response_types_supported: ["id_token"]`, `subject_types_supported: ["public"]`.

## 3. Question 1: one Yallapp Firebase project, or several?

**Registration is possible through the API.** Firebase Management API v1beta1:
- `projects.androidApps.create` (`packageName`, `displayName`, `apiKeyId`) and `projects.iosApps.create` (`bundleId`, optional `teamId`). Both return a long-running operation: poll `operations.get`.
- `projects.{androidApps,iosApps}.getConfig` returns `configFilename` and a base64 `configFileContents`.
- `projects.searchApps` / `list` make retries safe (find by package or bundle first).
- `projects.androidApps.remove` / `iosApps.remove` free a place when an app is deleted.
- FCM needs no SHA fingerprints.

**Limits:**
- **30 apps per Firebase project.** The Firebase FAQ says performance degrades past that (mostly Analytics), and a higher limit can be requested, but only on Blaze. Each client uses up to 6 apps (customer, plus courier or driver, vendor or staff, on Android and iOS), so a project holds about 5 to 15 clients.
- FCM's send quota is shared by everyone in a project. The documented default is high (about 600k messages a minute, from memory: the Firebase pages were blocked here).
- Whether removed apps still count toward the 30 during their 30-day undelete window is unverified. Remove with `immediate: true` and check once.

**Separate projects per client: not needed.** They are possible and give isolation and an easy hand-over, but they cost more:
- A service account can only create projects under an organization or folder (`resourcemanager.projects.create`, `roles/resourcemanager.projectCreator`). Yallapp has an org, so this is possible.
- Billing is not needed for creating a project or for FCM on Spark.
- Project-creation quota applies (exact numbers unverified; an increase can be requested).
- Each project then needs its own APIs enabled.

**Decision:** shared pool projects now. The data model (`app → firebase_project_id`) allows creating per-client projects or pool projects automatically later (Phase 4).

**Project hygiene:**
- Spark plan, **no Google Analytics, no Auth, Firestore or RTDB**, nothing but FCM and Installations.
- One API key per project, restricted to `firebaseinstallations.googleapis.com` and `fcmregistrations.googleapis.com`, passed as `apiKeyId` at create time. The key ships inside every client's app, so it must not open anything else. Check the restriction with the first test app.
- Each client's `google-services.json` is rebuilt to hold only that client's packages (filter `client[]` by package name), whatever `getConfig` returns. A new asset is saved only when the content changes. Otherwise `buildChanges` (`lib/builds/auto.ts`) would start automatic builds.

## 4. Question 2: sending

### Platform (hosted and connected apps)
- `serviceAccountOf(app, key)` (`lib/hosted/notify.ts`) returns, in Yallapp mode, `{ project_id: app.firebaseProjectId, client_email: GOOGLE_PUSH_SERVICE_ACCOUNT, private_key: "", federated: true, hms }`. In `push.ts`, `accessToken()` takes the WIF path when `federated` is set.
  - All 68 call sites stay unchanged, because they only pass the account along.
  - `checkFirebaseAccount` (the Integrations test) works too.
- A new `pushConfigured(app)` replaces the 7 direct `firebaseServiceAccountEncrypted !== null` checks listed in section 1.
- In a shared project, set `android.restricted_package_name` per device role (main package or `.courier`/`.driver`/`.vendor`/`.staff`). FCM then refuses delivery to another app's token, which is defence in depth.
- While the iPhone key isn't in Firebase, skip `platform = 'ios'` devices (`hosted_devices.platform`) so the stats stay clean.
- `taxi/live.ts` (RTDB plus custom tokens signed with `private_key`) stays "own Firebase only": `liveDatabase` returns null when `federated`. It could later use `iamcredentials … :signJwt`, which needs `roles/iam.serviceAccountTokenCreator`.
- Switching an app from Yallapp mode to own Firebase: old installs keep tokens of Yallapp's project. On `SENDER_ID_MISMATCH`, retry with the other credential (Phase 4 adds the token's project to the device).

### WordPress plugin: relay through the platform
- **Platform:** `POST /api/v1/push/send` (in `platform.yaml`), with `SiteInfo` (license key and site URL, like `/sign-in-codes/send`).
  - Body: `{ tokens: [≤200 {token}], notification: {title, body, image?}, data }`. Answer: `{ sent, invalid_tokens }`.
  - Checks: an active license on this site, the app in Yallapp mode, the plan has push.
  - Limits: 60 requests a minute and 20,000 tokens an hour per license.
  - Concurrency about 20, inside the function's time limit. `restricted_package_name` is the app's package.
  - Nothing is stored; only counts are kept.
- **Plugin:**
  - `Push_Service::is_configured()` is also true when the license status says `push: "yallapp"`.
  - `send_batch()` sends the FCM tokens through `License_Client::send_push()` instead of `access_token()`, then forgets the invalid ones as today.
  - HMS stays local.
  - The settings page (`class-settings-page.php:455,1346,1431`) shows "Notifications: through Yallapp" instead of the service account upload.
  - `readme.txt` › External services gets the new data flow. New plugin version.
- **Privacy text:** `platform.yaml` currently says no student data reaches the platform. Add: "push tokens and notification texts pass through when the app uses Yallapp's Firebase; neither is stored". Update the privacy page as well, since Firebase becomes Yallapp's subprocessor for these apps.
- **Own API apps (`custom_api`)** keep "Use my own Firebase" until a relay for them exists (Phase 4).

### Every code path that sends pushes today
- **Platform:** everything goes through `sendPush` in `src/lib/hosted/push.ts`.
  - Client apps, with `serviceAccountOf`:
    - `lib/hosted/` `send-notification.ts`, `notify.ts`, `scheduled-notifications.ts`, `campaigns.ts`, `auto-notifications.ts`, `order-watch.ts`
    - `lib/chat/push.ts`, `lib/events/notify.ts`, `lib/courses/community.ts`, `lib/delivery/notify.ts`, `lib/delivery/flow.ts`
    - `lib/catalog/` `kitchen.ts`, `shipping.ts`, `order-status.ts`, `stage-refunds.ts`, `returns.ts`
    - `lib/school/reminders.ts`, `lib/school/library.ts`, `lib/bookings/freeze.ts`, `lib/jobs/frequent.ts`
    - `lib/owner/` `sales.ts`, `studio.ts`, `insights.ts`, `community.ts`, `members.ts`, `ratings.ts`, `library.ts`
    - the action files listed by `grep serviceAccountOf src/app/actions`
  - Yallapp Business: `lib/owner/push.ts`. Yallapp Courier: courier-hub pushes with `COURIER_PUSH_…`.
  - Not FCM, but Google: `lib/taxi/live.ts`.
- **Plugin:** `Push_Service::send_batch`. It is reached from `on_status_change` (lessons, announcements, posts), `notify_followers`, `campaign` / `send_campaign_batch` (`rest/class-campaigns-controller.php:53`), `rest/class-chat-controller.php:143` (Yallapp's `/chat/notify`), `commerce/class-order-updates.php:216`, `commerce/class-order-returns.php:231`, and the LMS enrolled / answered listeners. Huawei goes through `Hms_Sender`.

## 5. Question 3: iPhone

**Findings:**
- **No public Firebase API uploads an APNs key.** It is console only: Project settings › Cloud Messaging › Apple app configuration, **per iOS app**. The only trace I found is an open request for one (`firebase-admin-node#2204`). The console's internal endpoint isn't a public API and must not be relied on.
- **The client's App Store Connect API key cannot make APNs keys.** The API's provisioning resources have no keys endpoint, and `CertificateType` has no push certificate (Apple developer forum threads; eas-cli marks creating a push key as unsupported with an API key). `fastlane pem` needs an Apple ID password, which Yallapp never stores.
- **Who can create an APNs key on the Apple Developer site is unverified.** Third-party guides say Account Holder or Admin; Apple's roles page couldn't be read here. Test once whether the team's App Manager invite with "Access to Certificates, Identifiers & Profiles" can create one.
- **One key serves all the team's apps.** An APNs key belongs to one Apple team and works for all its bundle IDs (main and variants), and a client may reuse a key it already has.

| Option | Work | Verdict |
|---|---|---|
| (a) Client uploads the `.p8` (with Key ID and Team ID) to Yallapp; the team uploads it in the Firebase console | Platform: encrypted field and check. Team: about 1 minute per iOS app. No app or contract change | **Recommended now** |
| (b) Platform sends iPhone pushes directly with APNs over HTTP/2 using the client's key | The app registers APNs tokens (`provider: apns` in `openapi.yaml`). The plugin, `PushProvider` and a new HTTP/2 sender all change. The app needs a new build, and old plugins store `apns` as `fcm` (`class-devices.php:222`) | Later, only if the manual queue becomes a burden. Large |
| (c) Browser automation of the Firebase console | Needs a stored Google session, breaks easily | Rejected |

**Why (a):**
- Phase 1 builds already carry Yallapp's plist and register FCM tokens on iPhones.
- As soon as the key is in Firebase, **existing installs start receiving pushes with no new build**. This is expected behaviour; verify it on the first client.
- Collecting the `.p8` is needed for (b) as well, so nothing is wasted.

**The platform's part of (a):**
- The client uploads the `.p8` with its Key ID and Team ID (prefilled from `appleTeamId`) under "iPhone notifications" on the setup step.
- It is encrypted with context `app:<id>:apns-key`.
- The platform checks it with Apple: one HTTP/2 request to `api.push.apple.com/3/device/<64 zeros>` with `apns-topic` set to the bundle ID.
  - `BadDeviceToken` means the key works.
  - `InvalidProviderToken` or `TopicDisallowed` means it doesn't; say why.
  - Verify this probe once by hand.
- Then it goes into **Admin › iPhone keys to add**. Each row shows:
  - the app, its bundle IDs (main and variants) and its project;
  - a direct console link (`console.firebase.google.com/project/<project>/settings/cloudmessaging`);
  - "Download .p8" (staff only, recorded with `recordStaffChange`);
  - "Done", which sets `apns_configured_at`.
- Later sends that fail with `THIRD_PARTY_AUTH_ERROR` raise a team alert (`lib/watch`).

## 6. Question 4: the build pipeline

**Today:**
- `.github/workflows/build-apps.yml` runs `build/scripts/android.sh:57` and `ios.sh:68`, which run `dart run tool/apply_config.dart config.json`.
- `mobile/tool/apply_config.dart:62-85` downloads `firebase.android_config_url` and `ios_config_url` (platform asset URLs) into `android/app/google-services.json` and `ios/Runner/GoogleService-Info.plist` (git-ignored). It parses them into `lib/generated/build_config.g.dart`.
- `build/fastlane/Fastfile:200` turns on the App ID's Push capability when `ios_config_url` is set.
- Yallapp Business and Yallapp Courier read theirs from Actions variables (`build/scripts/business_store.py`).

**Yallapp Firebase:** the platform stores the files it gets from `getConfig` as the same asset kinds, in the same fields:
- `firebaseAndroidAssetId`: one file listing the main package plus `.courier`, `.driver`, `.vendor` and `.staff`. The existing checks (`firebaseListsCourierApp`, `firebaseListsVendorApp`, `firebaseListsStaffApp` in `lib/app/setup.ts:407-425`) then just work.
- `firebaseIosAssetId`.
- `DeliverySettings.courierFirebaseIosAssetId`.

So the build config URLs look exactly as they do today: **no change to the pipeline, `apply_config.dart`, the schema or fastlane, and no GitHub OIDC.**

**Small platform-side adjustments:**
- Preflight (`lib/builds/preflight.ts:72-82`) and the queueing code make sure registration has finished. If not, they trigger it, or warn "notifications are being set up".
- `lib/builds/failures.ts` and `build/scripts/diagnose.py` (`firebase_android` / `firebase_ios`) say "we set it up again" in Yallapp mode, and the platform registers the app again.

## 7. Question 5: data and contract changes

**Migration `0138_yallapp_firebase.sql`** (after `0137_connected_pay.sql`), with types in `src/lib/data/types.ts`, schema in `src/lib/db/schema.ts`, and both stores:
- **`platform_signing_keys`**: `kid` PK, `purpose` (`gcp-wif`), `alg` (`ES256`), `public_jwk`, `private_key_encrypted` (context `platform-signing-key:<purpose>`), `created_at`, `retired_at`. It mirrors `app_auth_keys`; `newAuthKey`, `jwksOf` and `rotateAuthKey` become generic.
- **`firebase_projects`**: `project_id` PK, `project_number`, `api_key_id`, `max_apps` (default 28), `status` (`open`, `full` or `closed`), timestamps.
- **`apps.push_setup`** (`null` = own Firebase, as today; `yallapp`) and **`apps.firebase_project_id`**.
  - Existing rows stay `null`.
  - New apps get `yallapp`.
  - Existing apps with no Firebase file and no key are offered the switch, never switched by themselves.
- **`app_firebase_apps`**:
  - `app_id` (FK, cascade), `variant` (customer, courier, driver, vendor or staff), `platform` (android or ios)
  - `firebase_project_id`, `identifier` (package or bundle ID), `firebase_app_id`, `operation` (the operation being created)
  - `status` (pending, ready, failed or removing), `error`, `apns_configured_at` (Phase 2), timestamps
  - unique on (`app_id`, `variant`, `platform`)
- **Phase 2:** `apps.apns_key_id`, `apps.apns_team_id`, `apps.apns_key_encrypted`.
- **Phase 4 (optional):** `hosted_devices.push_project`, for moving between modes.

**Settings (not secret, Netlify env):** `GOOGLE_WIF_PROVIDER`, `GOOGLE_PUSH_SERVICE_ACCOUNT`, `GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT`. Add them to `.env.example` and `src/lib/env.ts`. The pool projects are kept in the table and edited in Admin.

**Contracts (`docs/api/*.yaml`):**
- `openapi.yaml` (the app contract): **no change** in Phases 1 to 3. Option (b) would add `apns` to `provider`; Phase 4 may add an optional `firebase_project` to `PUT /me/push-token`.
- `platform.yaml`: **Phase 3**. New `POST /push/send`, a `push: own | yallapp` field in `LicenseStatus`, and the privacy text.
- `owner.yaml`: description only. The `push` flag currently says "a Firebase key is saved"; it becomes "push is set up".
- `pipeline.yaml`, `courier.yaml`, `build-config.schema.json`: no change.

**Not committed, ever:** the Firebase files live only as platform assets and in the runner's git-ignored paths. The gcloud steps below create no secret at all.

## 8. Phased plan (one developer, working days)

**Phase 1: Android fully automatic, iOS file automatic (hosted and connected apps).** M to L, about 10 to 12 days.
- Keyless base (2 days): `platform_signing_keys`, the `/oidc` routes, `federation.ts`, an Admin "Check" button.
- Management API client (2 days): create Android and iOS apps, poll the operation, `getConfig`, look up apps by package or bundle, remove.
- Registering apps (2 to 3 days):
  - choose a pool project that has room for the client's possible apps;
  - register the variants, build the filtered `google-services.json`, save assets only when they change;
  - register again when the package changes (`dashboard.ts:697`);
  - retry from the frequent job (`lib/jobs/frequent.ts`) when a call fails;
  - remove the Firebase apps when the client app is deleted; give copies (`lib/apps/copy.ts`) a fresh registration.
- Sending (1 to 1.5 days): `serviceAccountOf` and `push.ts` branch on Yallapp mode, `pushConfigured`, `restricted_package_name`, the Integrations page.
- Interface (2 days):
  - `FirebaseFields`: "Yallapp sets up notifications (recommended)" or "Use my own Firebase" (today's fields);
  - the Notifications page hides the key upload in Yallapp mode;
  - the publishing checklist marks the Firebase step done;
  - preflight and failure texts; en, ar and tr.
- Admin "Yallapp Firebase projects" with capacity, and an alert when nearly full (1 day). Docs: ARCHITECTURE, ROADMAP, LAUNCH-CHECKLIST, the guide in `content/docs.ts`, `.env.example` (1 day).
- Offered to WordPress apps only once Phase 3 ships.

**Phase 2: iPhone pushes, option (a).** S, 3 to 4 days.
- The APNs key upload and the HTTP/2 check with Apple.
- The Admin queue with "Done", skipping iPhones until done, the `THIRD_PARTY_AUTH_ERROR` alert, docs.

**Phase 3: WordPress relay.** M, 5 to 6 days, plus the time for sites to update the plugin.
- Platform endpoint, license flag, limits, concurrency, contract.
- Plugin branch, settings page, readme, tests, release.

**Phase 4: optional, later.**
- Yallapp Business and Courier pushes keyless, then delete the `yallapp-owner-push` key (S, 1 day).
- iPhone files for the vendor and staff apps (S, 1 to 2 days).
- Moving between modes with the token's project (S to M, 2 days).
- The platform creating pool projects, or per-client projects, under a folder (M, 3 to 5 days).
- A relay for own API apps (S to M, 3 days).
- Taxi live in Yallapp's project with `signJwt` (M).
- Direct APNs, option (b) (L, 2 to 3 weeks).

## 9. The owner's one-time steps

1. **Deploy Phase 1.** Then check that this prints a JSON document whose `issuer` is `https://yallapp.com.tr/oidc`:
   `curl -s https://yallapp.com.tr/oidc/.well-known/openid-configuration`
2. **Create the project.** In Cloud Shell, signed in as Yallapp's organization admin. The project ID must be unique worldwide; pick another if it's taken.
   ```bash
   ORG_ID=$(gcloud organizations list --format='value(name)' --limit=1)
   P=yallapp-push-01
   gcloud projects create "$P" --organization="$ORG_ID" --name="Yallapp Push 01"
   N=$(gcloud projects describe "$P" --format='value(projectNumber)')
   gcloud services enable firebase.googleapis.com fcm.googleapis.com fcmregistrations.googleapis.com \
     firebaseinstallations.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
     sts.googleapis.com apikeys.googleapis.com --project="$P"
   ```
3. **Add Firebase.** Spark plan, no billing, no Analytics. The Firebase console works too: Add project › choose `yallapp-push-01` › Analytics off.
   ```bash
   curl -sS -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "x-goog-user-project: $P" -H "Content-Type: application/json" -d '{}' \
     "https://firebase.googleapis.com/v1beta1/projects/$P:addFirebase"
   ```
4. **Create the push-only API key** that ships inside the apps, and note its `uid`:
   ```bash
   gcloud services api-keys create --project="$P" --display-name="Yallapp apps (push only)" \
     --api-target=service=firebaseinstallations.googleapis.com \
     --api-target=service=fcmregistrations.googleapis.com
   gcloud services api-keys list --project="$P" --format='value(uid,displayName)'
   ```
5. **Create two service accounts, with no keys:**
   ```bash
   gcloud iam service-accounts create yallapp-push-sender --project="$P" --display-name="Yallapp push sender"
   gcloud iam service-accounts create yallapp-firebase-apps --project="$P" --display-name="Yallapp Firebase apps"
   SENDER=yallapp-push-sender@$P.iam.gserviceaccount.com
   APPS=yallapp-firebase-apps@$P.iam.gserviceaccount.com
   gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$SENDER" \
     --role=roles/firebasecloudmessaging.admin --condition=None
   gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$APPS" \
     --role=roles/firebase.admin --condition=None
   gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$APPS" \
     --role=roles/serviceusage.apiKeysViewer --condition=None
   ```
6. **Set up WIF with the platform as issuer:**
   ```bash
   gcloud iam workload-identity-pools create yallapp-platform --project="$P" --location=global \
     --display-name="Yallapp platform"
   gcloud iam workload-identity-pools providers create-oidc platform --project="$P" --location=global \
     --workload-identity-pool=yallapp-platform --display-name="yallapp.com.tr" \
     --issuer-uri="https://yallapp.com.tr/oidc" \
     --attribute-mapping="google.subject=assertion.sub" \
     --attribute-condition="assertion.sub == 'push-sender' || assertion.sub == 'firebase-apps'"
   POOL=projects/$N/locations/global/workloadIdentityPools/yallapp-platform
   gcloud iam service-accounts add-iam-policy-binding "$SENDER" --project="$P" \
     --role=roles/iam.workloadIdentityUser --member="principal://iam.googleapis.com/$POOL/subject/push-sender"
   gcloud iam service-accounts add-iam-policy-binding "$APPS" --project="$P" \
     --role=roles/iam.workloadIdentityUser --member="principal://iam.googleapis.com/$POOL/subject/firebase-apps"
   echo "GOOGLE_WIF_PROVIDER=$POOL/providers/platform"
   echo "GOOGLE_PUSH_SERVICE_ACCOUNT=$SENDER"
   echo "GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT=$APPS"
   ```
   If the organization limits which identity providers are allowed, add `https://yallapp.com.tr/oidc` to that list. Check with `gcloud org-policies describe iam.workloadIdentityPoolProviders --organization="$ORG_ID"`; "not found" means no limit.
7. **Add the variables in Netlify** (Site configuration › Environment variables). Add the three printed lines; they aren't secret. Redeploy.
8. **Register the project in Admin** › Settings › Yallapp Firebase projects. Add `yallapp-push-01` with its number and the key `uid` from step 4, then press **Check**. The check signs in through WIF and reads the project.
9. **Only when Admin says the projects are nearly full:** repeat steps 2 to 4 with `P=yallapp-push-02`. Don't create a pool or new accounts; give the same two accounts roles there:
   ```bash
   gcloud projects add-iam-policy-binding yallapp-push-02 --member="serviceAccount:$SENDER" \
     --role=roles/firebasecloudmessaging.admin --condition=None
   gcloud projects add-iam-policy-binding yallapp-push-02 --member="serviceAccount:$APPS" \
     --role=roles/firebase.admin --condition=None
   gcloud projects add-iam-policy-binding yallapp-push-02 --member="serviceAccount:$APPS" \
     --role=roles/serviceusage.apiKeysViewer --condition=None
   ```
10. **From Phase 2 on:** no Google Cloud work. The team uploads each client's APNs key under Firebase console › `yallapp-push-0X` › Project settings › Cloud Messaging › the iOS app › APNs Authentication Key, then clicks **Done** in Admin.

## 10. Risks, and what is unverified

- **Pages I couldn't read.** `firebase.google.com`, `docs.cloud.google.com` and `developer.apple.com` couldn't be fetched from this session: the hosts weren't allowed, so these facts come from web search excerpts. Confirmed that way: the 30-app limit; RS256 and ES256 support; `--jwk-json-path`; that Netlify documents no OIDC token; that there is no API to upload APNs keys; that the App Store Connect API has no keys endpoint.
- **Unverified:**
  - whether `getConfig` returns one client or all of them (the design filters either way);
  - the exact FCM quotas;
  - whether removed apps count toward the 30;
  - the minimum roles (whether `roles/firebase.admin` is enough for `getConfig` to return the key string, hence the API Keys Viewer role);
  - the API key restriction being enough for token registration;
  - which Apple roles can create APNs keys;
  - the APNs probe answers;
  - iPhones receiving pushes with no rebuild once the key is uploaded.
- **Data:** a shared project means Yallapp, through Google, holds the FCM tokens and installation IDs of every Yallapp-mode app. Update the privacy page and the client terms.
- **Blast radius:**
  - A misused shared API key affects every client in that project, which is why it is restricted.
  - A WordPress site could only push to tokens it already has; `restricted_package_name` limits Android, and iPhone delivery has no such filter.

## Sources

- Firebase FAQ, 30 apps per project: https://firebase.google.com/support/faq
- WIF with other providers (RS256/ES256, `--jwk-json-path`): https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-providers
- Netlify community, the question with no answer: https://answers.netlify.com/t/netlify-functions-oidc-workload-identity-for-google-cloud-wif/170276
- Vercel OIDC, for contrast: https://vercel.com/changelog/openid-connect-federation-now-generally-available
- Firebase Management `getConfig`: https://firebase.google.com/docs/reference/firebase-management/rest/v1beta1/projects.androidApps/getConfig
- FCM `restricted_package_name`: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages
- FCM error codes: https://firebase.google.com/docs/cloud-messaging/error-codes
- Request for an APNs upload API: https://github.com/firebase/firebase-admin-node/issues/2204
- Apple forums on App Store Connect API keys and certificate types: https://developer.apple.com/forums/thread/125026 and https://developer.apple.com/forums/thread/725182
- eas-cli on push keys: https://cdn.jsdelivr.net/npm/eas-cli@18.13.0/build/credentials/ios/appstore/pushKey.d.ts
- Project creation by service accounts: https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects
