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
| Pushes | Yallapp Courier's own Firebase project (`COURIER_PUSH_FIREBASE_SERVICE_ACCOUNT` on the platform); its Android and iOS apps' files go in the build config's `firebase` at release time, never in the repository |
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

## Still open (for the owner)

- **Publishing**, together with the owner, from Yallapp's own Google Play and
  Apple accounts: the store entries, Yallapp Courier's Firebase project and
  its app files in the build config, signing, the first upload.
- ~~Deleting the account in the app~~: done. **Account › Delete my Yallapp
  Courier account** (also under the list of companies, for someone no
  company has added yet) asks first, then deletes it (Courier API
  `DELETE /me`): every phone is signed out and every company session ends.
  The companies keep their own couriers' lists and shipments; the person
  asks a company to remove them there.
- **Store screenshots and the feature graphic** (Yallapp's brand files are in
  `brand/stores/`).
