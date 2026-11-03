# Yallapp Courier in the stores (104.8.5)

Yallapp Courier is Yallapp's own courier app for every delivery company that
picks it in **Delivery settings › Where couriers work**. A courier signs in
once with the mobile number or email the company added, picks the company
(one company opens at once), and works on that company's courier screens:
on and off duty, their jobs, the jobs waiting, each job's steps, the cash to
collect, calls and directions. Several companies: **Account › Switch
company**. Signing out ends every company's session on the phone.

It goes to Google Play and the App Store under **Yallapp's own** accounts,
never a company's, as Yallapp Business does (LAUNCH-CHECKLIST.md › 7l).
**Not published yet**: it is published together with the owner.

| | |
|---|---|
| Name | Yallapp Courier |
| Android applicationId, iOS bundle ID | `tr.com.yallapp.courier` |
| Build config | [`mobile/config/yallapp-courier.json`](../../mobile/config/yallapp-courier.json) (`role` courier, `courier_hub` true, the Courier API as `api_base_url`, no `app_id`) |
| Debug APK in CI | Mobile workflow › Flutter app › artifact `yallapp-courier-debug-apk` |
| API | The Courier API, [`docs/api/courier.yaml`](../api/courier.yaml); each company's courier screens on that company's hosted API |
| Pushes | Yallapp Business's Firebase project, where Yallapp Courier's apps are added: the platform sends with Yallapp Business's key (`OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT`, no new key; `COURIER_PUSH_FIREBASE_SERVICE_ACCOUNT` only for a project of its own). The apps' files are Actions variables the release workflow writes to the runner, never in the repository |
| Store listing | [`mobile/store/courier`](../../mobile/store/courier) (checked by `build/scripts/business_store.py --app courier check` and build/tests); screenshots drawn by `mobile/test/store` |
| Release | Actions › **Yallapp Courier release** ([`courier-release.yml`](../../.github/workflows/courier-release.yml)), below |
| Icon and colours | Yallapp's: the app's own launcher icon (the "y." mark), Midnight and Ivory |
| Languages | English, Arabic (right to left), Turkish |
| Category | Business (Google Play: Business; App Store: Business) |
| Price | Free, no in-app purchases, no ads |

## Store listing

Google Play limits: title 30, short description 80, full description 4000
characters. App Store: name 30, subtitle 30, description 4000.

### English

**Title:** Yallapp Courier

**Subtitle (App Store):** Deliver for your companies

**Short description:** Deliver for every company that added you, with one app and one sign-in.

**Full description:**

Yallapp Courier is the app for couriers of the delivery companies that work
with Yallapp. Your company adds your mobile number or email to its couriers;
you sign in with a code and start delivering.

- One sign-in for every company you deliver for. Pick one and its jobs open;
  switch company from Account at any time.
- Go on and off duty. Off duty, you're not offered new jobs.
- Your jobs, the jobs waiting for a courier and the ones you've done.
- Each job's steps: picked up, on the way, delivered, or couldn't deliver
  with a reason. Give a job back when you can't take it.
- The cash to collect, shown on the job.
- Call the sender or the receiver, and get directions in your maps app.
- While a parcel is on the way and the job is open on your screen, its
  customer sees where it is. Nothing is shared when the app is closed.
- Notifications for new jobs and changes to yours, opening the right
  company's job.

No company yet? Ask the company you deliver for to add your number or email
to its couriers, then sign in again.

### Arabic

**Title:** Yallapp Courier

**Subtitle (App Store):** وصّل لشركاتك

**Short description:** وصّل لكل شركة أضافتك، بتطبيق واحد وتسجيل دخول واحد.

**Full description:**

‏Yallapp Courier هو تطبيق المناديب في شركات التوصيل التي تعمل مع Yallapp.
تضيف شركتك رقم جوالك أو بريدك الإلكتروني إلى مناديبها، فتسجّل الدخول برمز
وتبدأ التوصيل.

- تسجيل دخول واحد لكل الشركات التي توصّل لها. اختر شركة فتُفتح مهامها،
  وبدّل الشركة من «الحساب» متى شئت.
- كن في الخدمة أو خارجها. خارج الخدمة لا تُعرض عليك مهام جديدة.
- مهامك، والمهام التي تنتظر مندوبًا، وما أنجزته منها.
- خطوات كل مهمة: الاستلام، في الطريق، التسليم، أو تعذّر التسليم مع ذكر
  السبب. وأعد المهمة إن لم تستطع القيام بها.
- المبلغ النقدي المطلوب تحصيله، ظاهرًا في المهمة.
- اتصل بالمرسل أو المستلم، واحصل على الاتجاهات في تطبيق الخرائط.
- أثناء الطريق، ومع فتح المهمة على شاشتك، يرى العميل موقع طرده. لا يُشارَك
  شيء والتطبيق مغلق.
- إشعارات بالمهام الجديدة وبالتغييرات على مهامك، تفتح مهمة الشركة الصحيحة.

لا توجد شركة بعد؟ اطلب من الشركة التي توصّل لها إضافة رقمك أو بريدك
الإلكتروني إلى مناديبها، ثم سجّل الدخول مرة أخرى.

### Turkish

**Title:** Yallapp Courier

**Subtitle (App Store):** Şirketleriniz için teslimat

**Short description:** Sizi ekleyen her şirket için tek uygulama ve tek girişle teslimat yapın.

**Full description:**

Yallapp Courier, Yallapp ile çalışan teslimat şirketlerinin kuryeleri için
uygulamadır. Şirketiniz cep telefonu numaranızı veya e-postanızı kuryelerine
ekler; bir kodla giriş yapar ve teslimata başlarsınız.

- Teslimat yaptığınız tüm şirketler için tek giriş. Birini seçin, işleri
  açılsın; şirketi istediğiniz zaman Hesap'tan değiştirin.
- Görevde olun ya da görev dışı kalın. Görev dışındayken size yeni iş
  önerilmez.
- İşleriniz, kurye bekleyen işler ve tamamladıklarınız.
- Her işin adımları: teslim alındı, yolda, teslim edildi ya da nedeniyle
  teslim edilemedi. Alamayacağınız işi geri verin.
- Tahsil edilecek nakit, işin üzerinde.
- Göndereni veya alıcıyı arayın, harita uygulamanızda yol tarifi alın.
- Gönderi yoldayken ve iş ekranınızda açıkken müşterisi nerede olduğunu
  görür. Uygulama kapalıyken hiçbir şey paylaşılmaz.
- Yeni işler ve işlerinizdeki değişiklikler için bildirimler; doğru şirketin
  işini açar.

Henüz şirket yok mu? Teslimat yaptığınız şirketten numaranızı veya
e-postanızı kuryelerine eklemesini isteyin, sonra yeniden giriş yapın.

## Notes for the reviewers (both stores, in English)

Paste into App Store Connect › App Review Information › Notes, and Play
Console › App content › App access › "All or some functionality is
restricted". The review number (or email) and its code are in **Admin ›
Settings › Yallapp Courier**; type them into the stores' sign-in fields at
submission, never into this file.

> Yallapp Courier is the courier app for the delivery companies that use
> Yallapp. A company adds a courier's mobile number or email; the courier
> signs in with a one-time code and works on that company's deliveries.
>
> To review: on the sign-in screen, enter the review mobile number (or
> choose Email and enter the review email) given in the sign-in fields, tap
> Send code, and enter the code given there. No message is sent to that
> number. You'll see a demo delivery company with a sample job: open it from
> My jobs, follow its steps (Picked up, On the way, Delivered), call or get
> directions. It reaches no real customer or courier.
>
> Account › Switch company goes back to the list of companies; Account ›
> Log out signs out of the app and every company on the phone. Account ›
> Delete my Yallapp Courier account deletes the account (also under the
> list of companies): every phone is signed out and every company session
> ends.
>
> Location: the app asks for the location only while a parcel is on the way
> and its job is open on the screen, so the customer can see where it is. It
> never uses the location in the background.
>
> Notifications: new jobs and changes to the courier's jobs.
>
> There are no payments, purchases or ads in the app. Couriers see the cash
> to collect from the receiver, which they collect by hand.

### Data safety (Google Play) and App Privacy (App Store)

- Collected: phone number or email (sign-in, linked to the person), precise
  location (only while a parcel is on the way and its job is open; shared
  with that company's customer for that parcel), a device ID and push token
  (notifications). Nothing is sold or used for ads or tracking.
- Encrypted in transit; the courier can sign out, or delete the account in
  the app (Account › Delete my Yallapp Courier account), at any time.
- Privacy policy: Yallapp's privacy page on the website.

## Releasing (104.8.6)

The workflow **Yallapp Courier release** builds Yallapp Courier from
`mobile/` with `mobile/config/yallapp-courier.json`, signs it, and uploads it
to a Google Play testing track and to TestFlight with the listing, the
screenshots (English, Arabic, Turkish; phones and tablets) and App Review's
details. It never publishes: production on Google Play and "Add for Review"
on the App Store stay a click in the consoles. It signs in to Google Play and
App Store Connect as Yallapp Business's release does (LAUNCH-CHECKLIST.md ›
7l): the same accounts, the same `YB_*` sign-in secrets and variables. The
run's summary lists what is set or missing.

Where it says "add a secret" or "add a variable": GitHub › this repository ›
Settings › Secrets and variables › Actions › **Secrets** or **Variables** ›
New repository secret / variable.

### Firebase (pushes)

- Yallapp Courier's apps are in **Yallapp Business's Firebase project**, so
  the platform sends couriers' pushes with the key it already has
  (`OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT`): nothing to add in Netlify.
- Variable `YC_FIREBASE_GOOGLE_SERVICES`: the whole `google-services.json`
  of the project (Project settings › Your apps › the Android app
  `tr.com.yallapp.courier` › download), pasted as it is. It may list
  Yallapp Business too: the workflow takes the `tr.com.yallapp.courier` app
  and refuses a file without it.
- Variable `YC_FIREBASE_SERVICE_INFO`: the whole `GoogleService-Info.plist`
  of the iOS app `tr.com.yallapp.courier`, once it is added in Firebase.
  Until then the iOS app is built **without notifications** and the run says
  so. In Firebase › Project settings › Cloud Messaging › the iOS app ›
  APNs Authentication Key: the same .p8 as Yallapp Business's (one per Apple
  team), with its Key ID and the Team ID.
- These are not secrets (they ship inside the app); never commit them.

### Google Play

- [ ] Play Console › Create app: **Yallapp Courier**, English (United
      States), App, Free.
- [ ] The upload key is made by the first run. Add the repository secret
      `YC_SECRETS_TOKEN` (a fine-grained token for this repository only, with
      Repository permissions › **Secrets: Read and write**, 7 days; made as in
      7l). `YB_SECRETS_TOKEN` works too when it is still there. The run
      saves the key as `YC_ANDROID_UPLOAD_KEYSTORE`,
      `YC_ANDROID_KEYSTORE_PASSWORD`, `YC_ANDROID_KEY_ALIAS` and
      `YC_ANDROID_KEY_PASSWORD`; then delete the token secret and the token.
- [ ] Run the workflow with **android**. The App Bundle is on the
      **Yallapp Courier test build** pre-release as `yallapp-courier.aab`.
- [ ] **First upload by hand**: Play Console › Yallapp Courier › Test and
      release › Testing › Internal testing › Create new release › upload
      `yallapp-courier.aab` › Save and publish.
- [ ] Let the release service account upload it. In Play Console › Users and
      permissions › the service account
      (`yallapp-play-release@yallapp-business.iam.gserviceaccount.com`) ›
      App permissions › add **Yallapp Courier** with the same three rights as
      Yallapp Business. And let this workflow sign in as it: Google Cloud
      console › project **yallapp-business** › Cloud Shell:

      ```sh
      gcloud iam workload-identity-pools providers update-oidc github --project yallapp-business \
        --location global --workload-identity-pool github-actions \
        --attribute-condition "assertion.repository == 'WEBEK-LTD/app-lms' && assertion.ref == 'refs/heads/main' && (assertion.workflow_ref.startsWith('WEBEK-LTD/app-lms/.github/workflows/business-release.yml@') || assertion.workflow_ref.startsWith('WEBEK-LTD/app-lms/.github/workflows/courier-release.yml@'))"
      ```

      Then Run workflow with **play_check** to try it: it uploads nothing.

### App Store

- [ ] Run the workflow with **ios**: it registers the App ID
      `tr.com.yallapp.courier` with push notifications and stops, saying the
      app doesn't exist yet.
- [ ] App Store Connect › Apps › + › New App: iOS, name **Yallapp Courier**,
      English (U.S.), bundle ID **tr.com.yallapp.courier**, SKU
      `yallapp-courier`, Full Access. Run the workflow again.
- [ ] App Review's sign-in: secrets `YC_APP_REVIEW_DEMO_USER` (the review
      number or email from Admin › Settings › Yallapp Courier) and
      `YC_APP_REVIEW_DEMO_PASSWORD` (its code). The contact Apple calls is
      Yallapp Business's (`YB_APP_REVIEW_FIRST_NAME`, `_LAST_NAME`,
      `_PHONE`, `_EMAIL`) unless `YC_APP_REVIEW_*` variables say otherwise.
      The notes are `mobile/store/courier/ios/review_notes.txt`.
- [ ] Google Play › App content › App access: the same review number (or
      email) and code, with the notes above.

### Run it

- [ ] Actions › **Yallapp Courier release** › Run workflow: stores (both,
      android, ios), the Google Play track (internal by default) and the
      version (empty = `version_name` in `yallapp-courier.json`; once a
      version is live on the App Store, type the next one). The build number
      is the run's (plus `YC_BUILD_NUMBER_OFFSET` if set), so it always goes
      up.

### Publish

- [ ] The questionnaires (Data safety, App Privacy, content rating, target
      audience 18+), from "Data safety" above; the age rating is sent from
      `mobile/store/courier/ios/age_rating.json`.
- [ ] Google Play: promote the internal release to Production. App Store:
      the version (its build is chosen) › Add for Review › Submit.
- [ ] Then the store links in Admin › Settings › Yallapp Courier.

## Still open (for the owner)

- **Publishing**, together with the owner, from Yallapp's own Google Play and
  Apple accounts: the steps in **Releasing** above.
- ~~Deleting the account in the app~~: done. **Account › Delete my Yallapp
  Courier account** (also under the list of companies, for someone no
  company has added yet) asks first, then deletes it (Courier API
  `DELETE /me`): every phone is signed out and every company session ends.
  The companies keep their own couriers' lists and shipments; the person
  asks a company to remove them there.
- ~~Store screenshots and the feature graphic~~: drawn by the workflow
  (`mobile/test/store`), with the icon and feature graphic from
  `brand/stores/`.
