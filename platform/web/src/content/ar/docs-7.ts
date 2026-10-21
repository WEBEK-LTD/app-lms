import type { DocTranslation } from "../translation-types";

/**
 * 55 The developer guide (src/content/docs-developer.ts) in Arabic. The code
 * blocks stay as they are, and the headings that other pages link to keep
 * their English anchors.
 */
export const AR_DOCS_7: Record<string, DocTranslation> = {
  "my-own-api": {
    title: "اربط واجهتك البرمجية الخاصة",
    description: "للمطوّرين: قدّم واجهة Yallapp البرمجية من موقعك الخاص، نقطة نهاية تلو الأخرى، مع أمثلة وقائمة تحقّق.",
    body: `هذا الدليل للمطوّر الذي يربط موقعًا لا يعمل على إحدى المنصات التي ندعمها. يتحدث تطبيقك إلى واجهة برمجية واحدة، هي **واجهة Yallapp البرمجية**. على WordPress تقدّمها إضافتنا؛ وهنا يقدّم موقعك نقاط النهاية نفسها، ويعمل التطبيق معها دون تغيير. ولا تحتاج إلى معرفة أي شيء آخر عن Yallapp.

## قبل أن تبدأ

- مطوّر يستطيع إضافة نقاط نهاية إلى موقعك أو خادمك الخلفي
- عنوان https للواجهة البرمجية، مثل https://api.your-site.com/yallapp/v1، يمكن الوصول إليه من الإنترنت العام
- طريقة لتسجيل دخول مستخدميك: رمز لمرة واحدة عبر الرسائل النصية أو WhatsApp إلى هواتفهم، أو بالبريد الإلكتروني، أو بريدهم الإلكتروني وكلمة مرور تحتفظ بها أصلًا. أو [دع Yallapp يتولى تسجيل الدخول](#let-yallapp-sign-people-in)
- حساب Yallapp مع اختيار نوع التطبيق: أكاديمية أو متجر أو حجوزات (تطبيقات العقارات لا تعمل إلا على العقارات المُدارة في Yallapp)

## ما معنى «يقدّم موقعك واجهة Yallapp البرمجية»

تعطينا **عنوانًا أساسيًا** واحدًا. يضيف التطبيق إليه مسارًا لكل طلب، تمامًا كما هو موضح في [مرجع الواجهة البرمجية](/developers). فمع العنوان الأساسي \`https://api.your-site.com/yallapp/v1\` مثلًا، يكون أول طلب يرسله التطبيق عند فتحه:

~~~http
GET https://api.your-site.com/yallapp/v1/config?platform=android&app_version=1.0.0
Accept: application/json
Accept-Language: en
~~~

القواعد التي تسري في كل مكان:

- JSON في الطلب والرد، بترميز UTF-8. والتواريخ والأوقات بصيغة ISO 8601، بتوقيت UTC (مثل \`2026-10-14T09:30:00Z\`).
- ترسل الطلبات التي تتطلب تسجيل الدخول \`Authorization: Bearer\` متبوعًا برمز الوصول الذي أصدرته.
- يرسل التطبيق \`platform=android\` أو \`platform=ios\` حيث يطلب المرجع ذلك. استخدمه لقواعد الشراء: لا تعرض أبدًا محتوى رقميًا مدفوعًا على iOS.
- يحمل \`Accept-Language\` اللغة التي اختارها المستخدم (\`en\` أو \`ar\` أو \`tr\`). وأجب بنصوصك بتلك اللغة إن كانت لديك.
- عناوين الصور والروابط عناوين https كاملة.

## ابنِ نقاط النهاية بهذا الترتيب

ابدأ صغيرًا وشغّل الفحص المباشر بعد كل خطوة (القسم الأخير من هذا الدليل).

1. \`GET /config\`: إعدادات التطبيق. يحتاجها كل تطبيق، دون تسجيل دخول.
2. تسجيل الدخول: \`POST /auth/otp/verify\` و\`POST /auth/register\` و\`POST /auth/refresh\` و\`POST /auth/logout\`، مع \`POST /auth/otp/request\` لتسجيل الدخول بالهاتف، و\`POST /auth/email/request\` أو \`POST /auth/password\` لتسجيل الدخول بالبريد الإلكتروني (اطّلع على [مسار تسجيل الدخول](#the-sign-in-flow-simply)). أو [دع Yallapp يتولى تسجيل الدخول](#let-yallapp-sign-people-in)، وتخطَّ هذه الخطوة.
3. الحساب: \`GET\` و\`PATCH\` و\`DELETE /me\`، و\`GET /me/devices\`، و\`DELETE /me/devices/{device_id}\`، و\`PUT /me/push-token\`، و\`GET /me/notifications\` و\`POST /me/notifications/read\`. وحين يتولى Yallapp تسجيل الدخول، الثلاث الأخيرة فقط.
4. محتوى نوع تطبيقك، أدناه.
5. الإضافات الاختيارية، أدناه.

### تطبيقات الأكاديميات

المطلوب: \`GET /home\` و\`GET /categories\` و\`GET /courses\` و\`GET /courses/{course_id}\` و\`GET /courses/{course_id}/curriculum\` و\`GET /me/courses\` و\`GET /lessons/{lesson_id}\` و\`POST /lessons/{lesson_id}/progress\` و\`POST /lessons/{lesson_id}/complete\`. وفي \`/config\`، يجب ضبط \`features.lms\` (يبحث عنها الفحص المباشر): استخدم إحدى القيم التي يسردها المرجع لها.

اختياري، ويُفعّل كلٌّ منها في \`features\` في \`/config\`: التسجيل المجاني (\`POST /courses/{course_id}/enroll\`)، والاختبارات (\`/quizzes/...\` و\`GET /me/quiz-attempts\`)، والشهادات (\`GET /me/certificates\`)، وقائمة الأمنيات (\`/me/wishlist\`)، والتقييمات (\`/courses/{course_id}/reviews\`)، والأسئلة والأجوبة (\`/courses/{course_id}/questions\` و\`/questions/...\`)، والطلبات (\`GET /me/orders\`)، والدفع على Android (\`POST /auth/checkout-link\`).

### تطبيقات المتاجر

المطلوب: \`GET /store/home\` و\`GET /store/categories\` و\`GET /store/products\` و\`GET /store/products/{product_id}\` و\`POST /store/cart\` و\`POST /store/checkout-link\`. ويجب أن يتضمن \`/config\` الحقل \`store\`.

اختياري: تقييمات المنتجات (\`GET /store/products/{product_id}/reviews\`، مع تفعيل \`store.reviews\`) وطلبات العميل (\`GET /me/orders\`، مع تفعيل \`features.orders\`).

### تطبيقات الحجوزات

المطلوب: \`GET /bookings/home\` و\`GET /bookings/categories\` و\`GET /bookings/services\` و\`GET /bookings/services/{service_id}\` و\`GET /bookings/availability\` و\`POST /bookings/appointments\` و\`GET /me/appointments\` و\`GET /me/appointments/{appointment_id}\` و\`POST /me/appointments/{appointment_id}/cancel\`. ويجب أن يتضمن \`/config\` الحقل \`bookings\`.

### اختياري لكل أنواع التطبيقات

يقدّم \`GET /pages\` و\`GET /pages/{slug}\` التبويبات السفلية للتطبيق وصفحاته، بالشكل الذي يصفه المرجع. ولا يصل محرر **الصفحات والمظهر** في لوحة تحكم Yallapp إلى واجهتك البرمجية الخاصة: فهو ينشر إلى التطبيقات التي تعمل على Yallapp وإلى مواقع WordPress عبر إضافتنا. لذا اتركهما، فيستخدم التطبيق تبويباته المدمجة ونقطة نهاية الصفحة الرئيسية لديك (حين يجيب \`/pages\` بـ 404)، أو قدّم تبويبات وصفحات يبنيها نظامك.

> الميزات التي لا تدعمها: أوقفها في \`/config\` فيخفيها التطبيق. ولا يُستدعى أبدًا أي نقطة نهاية لا يحتاجها التطبيق بحسب إعداداتك.

## ابدأ بـ GET /config

هذا أصغر رد يقبله التطبيق لتطبيق أكاديمية. وتضيف تطبيقات المتاجر \`store\`، وتطبيقات الحجوزات \`bookings\` (اطّلع على المرجع لحقولها).

~~~json
{
  "site": { "name": "Ada Academy", "url": "https://ada-academy.com" },
  "branding": { "primary_color": "#0E0D24", "logo_url": null },
  "features": {
    "lms": "yallapp", "lms_version": "1.0", "pro": false,
    "certificates": false, "quizzes": false, "wishlist": false,
    "reviews": false, "qna": false, "push": true
  },
  "auth": { "signup_allowed": true, "signup_fields": ["name"], "default_country_code": "+90", "methods": ["phone"] },
  "purchases": { "enroll_button": false, "free_enrollment": true },
  "content": {
    "block_screen_capture": true, "watermark": "phone",
    "embed_fullscreen_button": true, "embed_height": "auto"
  },
  "app": { "update_required": false, "maintenance": false, "screen_protection": "content" }
}
~~~

- \`app.update_required\`: القيمة true تجعل التطبيق يطلب من الناس التحديث (قارن \`app_version\` الذي يرسله التطبيق).
- \`app.maintenance\`: القيمة true لا تعرض إلا \`app.maintenance_message\`.
- \`app.screen_protection\`: القيمة \`off\` أو \`content\` (الدروس والاختبارات ومرفقاتها) أو \`app\` (كل الشاشات) تمنع لقطات الشاشة وتسجيلها في التطبيق.
- \`app.hide_video_branding\`: القيمة true تعرض فيديوهات YouTube وVimeo وBunny Stream خلف أزرار التطبيق الخاصة مع إخفاء العلامة التجارية للموقع (على مسؤولية المالك: قد يخالف ذلك شروط YouTube). اتركها أو اجعلها false لعرض مشغّل كل موقع كما هو.
- يجب أن تكون \`purchases.enroll_button\` بقيمة false حين يكون \`platform=ios\`.

## مسار تسجيل الدخول ببساطة {#the-sign-in-flow-simply}

تقرر واجهتك البرمجية كيف يسجّل الناس الدخول، وتذكر ذلك في \`/config\`، في \`auth\`:

- \`methods\`: \`["phone"]\` أو \`["email"]\` أو \`["phone", "email"]\`. وغيابها يعني \`["phone"]\`. ومع الاثنين، يعرض التطبيق مفتاح تبديل **هاتف / بريد إلكتروني**.
- \`email_sign_in\`، وهي مطلوبة حين تتضمن \`methods\` القيمة \`email\`: \`"code"\` (ترسل رمزًا من 6 أرقام بالبريد الإلكتروني: \`POST /auth/email/request\`) أو \`"password"\` (يكتب الشخص كلمة مرور حسابه لديك: \`POST /auth/password\`).
- \`password_reset_url\`، مع \`"password"\`: صفحتك لكلمة المرور المنسية. ويفتحها التطبيق من **نسيت كلمة المرور؟**.

قدّم فقط نقاط النهاية لما تتيحه: \`POST /auth/otp/request\` للهاتف، و\`POST /auth/email/request\` للبريد الإلكتروني مع رمز، و\`POST /auth/password\` للبريد الإلكتروني مع كلمة مرور.

~~~json
"auth": {
  "signup_allowed": true, "signup_fields": ["name"], "default_country_code": "+90",
  "methods": ["phone", "email"], "email_sign_in": "code"
}
~~~

### بالهاتف، مع رمز

يسجّل الناس الدخول برقم هاتفهم ورمز ترسله إليهم. دون كلمات مرور.

1. يرسل التطبيق الرقم. تنشئ أنت رمزًا، وترسله عبر الرسائل النصية أو WhatsApp، وتجيب بـ \`request_id\`.
2. يكتب الشخص الرمز. يرسله التطبيق مع \`request_id\` ووصف للجهاز.
3. إن كان للرقم حساب، تجيب برمزين والمستخدم. وإن لم يكن، تجيب بـ \`signup_token\`، فيطلب التطبيق اسمًا (وبقية \`signup_fields\`) ويستدعي \`/auth/register\`.
4. يرسل التطبيق **رمز الوصول** مع كل طلب يتطلب تسجيل الدخول. وهو قصير العمر (15 دقيقة خيار جيد). وحين تنتهي صلاحيته، يستبدل التطبيق **رمز التحديث** برمزين جديدين عبر \`/auth/refresh\`. ويعمل كل رمز تحديث مرة واحدة.

اطلب رمزًا:

~~~http
POST /auth/otp/request
Content-Type: application/json

{ "country_code": "+90", "phone": "5321234567" }
~~~

~~~json
{ "request_id": "c1f3a9", "code_length": 6, "resend_after_seconds": 60, "expires_in_seconds": 300 }
~~~

تحقّق منه:

~~~http
POST /auth/otp/verify
Content-Type: application/json

{
  "request_id": "c1f3a9",
  "code": "481902",
  "device": { "id": "7d0c6c1e-5b0a-4c55-9a4e-2f4a6e0e6b11", "platform": "android", "name": "Pixel 8", "app_version": "1.0.0" }
}
~~~

حساب موجود:

~~~json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "r_6f2b0d...",
  "expires_in": 900,
  "user": { "id": 42, "name": "Sara Yilmaz", "phone": "+905321234567", "email": null, "city": null, "avatar_url": null }
}
~~~

رقم جديد:

~~~json
{ "signup_required": true, "signup_token": "s_91ad...", "fields": ["name"] }
~~~

التحديث:

~~~http
POST /auth/refresh
Content-Type: application/json

{ "refresh_token": "r_6f2b0d..." }
~~~

~~~json
{ "access_token": "eyJhbGciOi...", "refresh_token": "r_a83c11...", "expires_in": 900 }
~~~

### بالبريد الإلكتروني

مع \`"email_sign_in": "code"\`، يرسل التطبيق العنوان وترسل أنت رمزًا من 6 أرقام بالبريد الإلكتروني، بالقواعد والرد نفسيهما كرمز الهاتف. يكتبه الشخص، ويتحقق منه التطبيق عبر \`POST /auth/otp/verify\` تمامًا كما سبق. ويحصل العنوان الذي ليس له حساب على \`signup_token\`؛ ثم يطلب \`/auth/register\` البيانات نفسها كالتسجيل بالهاتف، دون البريد الإلكتروني (فهو لديك أصلًا).

~~~http
POST /auth/email/request
Content-Type: application/json

{ "email": "sara@example.com" }
~~~

~~~json
{ "request_id": "e7b210", "code_length": 6, "resend_after_seconds": 60, "expires_in_seconds": 300 }
~~~

ومع \`"email_sign_in": "password"\`، يرسل التطبيق العنوان وكلمة المرور والجهاز، وتجيب أنت بالرمزين والمستخدم كما في \`/auth/otp/verify\`. ولا تسجّل الدخول بهذه الطريقة إلا الحسابات الموجودة. وأجب عن العنوان الخاطئ وكلمة المرور الخاطئة بالرد نفسه 400 \`invalid_credentials\`، كي لا يستطيع أحد معرفة من لديه حساب.

~~~http
POST /auth/password
Content-Type: application/json

{
  "email": "sara@example.com",
  "password": "…",
  "device": { "id": "7d0c6c1e-5b0a-4c55-9a4e-2f4a6e0e6b11", "platform": "ios", "name": "iPhone 16", "app_version": "1.0.0" }
}
~~~

من سجّل بالبريد الإلكتروني ليس له رقم هاتف: أرسل \`"phone": null\` في \`user\` الخاص به. وحين لا تتيح تسجيل الدخول بالبريد الإلكتروني، أجب عن \`/auth/email/request\` و\`/auth/password\` بـ 403 \`method_not_allowed\` (أو 404).

> يجب أن يتمكن مراجعو Apple وGoogle من تسجيل الدخول، ولا يمكنهم تلقي رموزك. احتفظ برقم اختبار، وبريد إلكتروني للاختبار حين تتيح تسجيل الدخول بالبريد، يقبلان رمزًا ثابتًا دون إرسال أي رسالة أثناء مراجعة تطبيقك، وأعطهما للمتاجر. وحين يسجّل تطبيقك الدخول بالبريد الإلكتروني فقط، يحتاج المراجعون إلى بريد الاختبار: فلا يمكنهم استخدام رقم هناك. ومع \`"password"\`، أعطهم البريد الإلكتروني وكلمة المرور لحساب اختبار.

## دع Yallapp يتولى تسجيل الدخول {#let-yallapp-sign-people-in}

يمكنك ترك تسجيل الدخول لـ Yallapp. في لوحة التحكم، افتح **تسجيل الدخول إلى التطبيق** واختر **Yallapp يتولى تسجيل الدخول**. يختار مالك التطبيق حينها هناك الهاتف أو البريد الإلكتروني أو كليهما، ويرسل Yallapp الرموز (من رقم WhatsApp وعنوان البريد الإلكتروني الخاصين بـ Yallapp، أو الخاصين بالمالك)، ويحتفظ بالحسابات ورقم مراجعة المتاجر وحد الأجهزة، ويحذف الحسابات حين يطلب الناس ذلك. وتقدّم واجهتك البرمجية المحتوى وتتحقق ممّن سجّل الدخول.

كيف يعمل ذلك:

- يرسل التطبيق تسجيل الدخول والحساب (\`GET\` و\`PATCH\` و\`DELETE /me\`) وقائمة الأجهزة إلى Yallapp، وكل طلب آخر إلى واجهتك البرمجية، مع \`Authorization: Bearer\` ورمز الوصول الذي أعطاه إياه Yallapp.
- رمز الوصول هو JWT موقّع بـ **ES256** بزوج مفاتيح خاص بتطبيقك وحده. ولا يملك المفتاح الخاص إلا Yallapp. والمفاتيح العامة موجودة في مجموعة مفاتيح تطبيقك: يعرض **تسجيل الدخول إلى التطبيق › لمطوّرك** عنوانها، مثل \`https://yallapp.com.tr/api/app/{app_id}/.well-known/jwks.json\`.
- تدوم رموز الوصول 15 دقيقة. وحين تنتهي صلاحية أحدها، تجيب واجهتك البرمجية بـ 401، فيحصل التطبيق على رمز جديد من Yallapp ويعيد المحاولة.
- لا تقدّم أيًّا من نقاط نهاية تسجيل الدخول. ولا يحتاج \`/config\` لديك إلى \`auth\` أيضًا: فالتطبيق يأخذها من Yallapp.

الحقول (claims) في كل رمز:

~~~json
{
  "iss": "https://yallapp.com.tr",
  "aud": "your app's ID",
  "sub": "1042",
  "phone": "+905321234567",
  "name": "Sara Yilmaz",
  "iat": 1792141800,
  "exp": 1792142700
}
~~~

- \`iss\`: دائمًا \`https://yallapp.com.tr\`. و\`aud\`: معرّف تطبيقك، الظاهر في **تسجيل الدخول إلى التطبيق**، فلا يعمل رمز تطبيق آخر مع تطبيقك أبدًا.
- \`sub\`: معرّف المستخدم في Yallapp، كنص. ولا يتغيّر أبدًا لذلك الحساب.
- لا يأتي \`phone\` (بصيغة E.164) و\`email\` إلا حين يثبتهما الشخص برمز: \`phone\` لمن يسجّلون الدخول بالهاتف، و\`email\` لمن يسجّلون الدخول بالبريد الإلكتروني. والعنوان المكتوب عند التسجيل بالهاتف لا يكون في الرمز أبدًا.
- \`name\`: كما أعطاه الشخص. أما \`did\` فخاص بـ Yallapp؛ تجاهله.

### تحقّق من الرمز في واجهتك البرمجية

في كل طلب يتطلب تسجيل الدخول: خذ الرمز من ترويسة \`Authorization\`، وتحقّق من توقيعه بالمفتاح الذي يسمّيه \`kid\` الخاص به في مجموعة المفاتيح، وتحقّق من \`iss\` و\`aud\` و\`exp\`. وأجب بـ 401 مع \`{ "code": "invalid_token", "message": "…" }\` حين يكون أي شيء خاطئًا أو يكون الرمز مفقودًا. احفظ مجموعة المفاتيح مؤقتًا (نسمح بـ 5 دقائق)، واجلبها مجددًا حين يسمّي رمز \`kid\` ليس لديك: المكتبات أدناه تفعل الأمرين.

Node.js، مع jose:

~~~js
import { createRemoteJWKSet, jwtVerify } from "jose";

const APP_ID = "your app's ID";
const keys = createRemoteJWKSet(new URL("https://yallapp.com.tr/api/app/" + APP_ID + "/.well-known/jwks.json"));

export async function signedIn(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: "https://yallapp.com.tr",
      audience: APP_ID,
      algorithms: ["ES256"],
    });
    return payload; // payload.sub, payload.phone, payload.email, payload.name
  } catch {
    return null; // answer 401
  }
}
~~~

PHP، مع firebase/php-jwt:

~~~php
use Firebase\\JWT\\JWK;
use Firebase\\JWT\\JWT;

const APP_ID = 'your app\\'s ID';

function signed_in(): ?object {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = preg_replace('/^Bearer\\s+/', '', $header);
    // Cache this answer for 5 minutes in your own cache (or use CachedKeySet).
    $jwks = json_decode(file_get_contents('https://yallapp.com.tr/api/app/' . APP_ID . '/.well-known/jwks.json'), true);
    try {
        $claims = JWT::decode($token, JWK::parseKeySet($jwks)); // checks the signature and exp
    } catch (Exception $e) {
        return null; // answer 401
    }
    if ($claims->iss !== 'https://yallapp.com.tr' || $claims->aud !== APP_ID) {
        return null;
    }
    return $claims; // $claims->sub, $claims->phone ?? null, $claims->email ?? null
}
~~~

Python، مع PyJWT:

~~~python
import jwt

APP_ID = "your app's ID"
keys = jwt.PyJWKClient("https://yallapp.com.tr/api/app/" + APP_ID + "/.well-known/jwks.json", lifespan=300)

def signed_in(authorization: str):
    token = authorization.removeprefix("Bearer ")
    try:
        key = keys.get_signing_key_from_jwt(token)
        return jwt.decode(token, key, algorithms=["ES256"], audience=APP_ID, issuer="https://yallapp.com.tr")
    except jwt.PyJWTError:
        return None  # answer 401
~~~

### مستخدموك ومستخدمو Yallapp

احتفظ بمستخدم خاص بك لكل حساب في Yallapp، واعثر عليه عبر \`sub\`. في أول مرة يأتي فيها \`sub\`:

- إن كان نظامك يعرف الناس أصلًا، فطابق \`phone\` أو \`email\` **المُثبَت** في الرمز مع المستخدم الذي لديك بذلك الرقم أو العنوان، واحفظ \`sub\` عليه. ولا تطابق أبدًا على أي شيء آخر.
- وإلا فأنشئ مستخدمًا بـ \`sub\` و\`name\` وما يثبته الرمز.

ومن ثم، اعثر عليهم عبر \`sub\` فقط: فقد يغيّر الناس أسماءهم في التطبيق، ويبقى \`sub\` كما هو. ويعمل كل طلب يتطلب تسجيل الدخول على بيانات ذلك المستخدم: دوراته أو طلباته أو مواعيده.

حين يحذف أحدهم حسابه في التطبيق، يستدعي التطبيق أولًا \`DELETE /me\` لديك برمزه، لتحذف ما تحتفظ به عنه (أجب بـ 204، أو 404 حين لا تحتفظ بشيء). ثم يحذف Yallapp حسابه، حتى لو لم تُجب واجهتك البرمجية، ويرسل إلى واجهتك البرمجية إشعارًا موقّعًا بذلك (أدناه)، لتحذف بياناته لاحقًا حتى لو لم يصلك ذلك الطلب الأول أبدًا. وتسجيل الخروج، وإزالة جهاز في التطبيق، ينهيان تسجيل دخول ذلك الجهاز لدى Yallapp: فتتوقف رموزه عن التجديد وعن العمل خلال 15 دقيقة.

### إشعارات حذف الحساب {#account-deletion-notices}

حين يحذف شخص حسابه، يرسل Yallapp إشعارًا إلى \`<your API address>/webhooks/yallapp\`. والمحتوى رمز موقّع (Security Event Token)، مع \`Content-Type: application/secevent+jwt\`، موقّع بمفتاح تطبيقك مثل رموز الوصول، ويُتحقق منه بمجموعة المفاتيح نفسها:

- \`typ\` (في الترويسة): \`secevent+jwt\`. و\`iss\`: \`https://yallapp.com.tr\`. و\`aud\`: معرّف تطبيقك متبوعًا بـ \`:events\`، فلا يُقبل الإشعار أبدًا كرمز وصول، ولا رمز الوصول كإشعار.
- \`sub\`: الشخص الذي حُذف حسابه. و\`events\`: \`{ "account.deleted": {} }\`.
- \`jti\`: معرّف الإشعار، وهو أيضًا في ترويسة \`Yallapp-Delivery\`. ويبقى كما هو حين يُرسل الإشعار مجددًا: احذف مرة واحدة، وأجب بـ 2xx عن التكرارات.
- \`iat\` و\`exp\`: تُوقَّع كل محاولة من جديد وتعمل 5 دقائق.

أجب بـ 2xx (202 أو 204) حين تستلمه. أما الرد بـ 5xx أو 408 أو 429، أو عدم الرد خلال 10 ثوانٍ، أو تعذّر الوصول إلى الواجهة البرمجية، فتُعاد المحاولة بعده بعد 1 و5 و30 دقيقة، ثم بعد 2 و6 و12 و24 ساعة. وأي رد آخر (404 حين لا تستقبل الإشعارات بعد) يوقفها. ولا تُمرَّر الإشعارات عبر عمليات إعادة التوجيه. ويسرد **تسجيل الدخول إلى التطبيق › لمطوّرك** إشعارات آخر 30 يومًا وما جرى لكلٍّ منها. وقد يصل الإشعار قبل \`DELETE /me\` لديك أو بعده، أو دونه: احذف المستخدم عبر \`sub\` في كل الأحوال.

~~~js
import { createRemoteJWKSet, jwtVerify } from "jose";

const APP_ID = "your app's ID";
const keys = createRemoteJWKSet(new URL("https://yallapp.com.tr/api/app/" + APP_ID + "/.well-known/jwks.json"));

// POST /webhooks/yallapp, with the raw body as text
export async function yallappNotice(body) {
  const { payload } = await jwtVerify(body, keys, {
    issuer: "https://yallapp.com.tr",
    audience: APP_ID + ":events",
    algorithms: ["ES256"],
    typ: "secevent+jwt",
  });
  if (payload.events?.["account.deleted"]) await deleteUserBySub(payload.sub);
  return 204;
}
~~~

### جرّبه

في **تسجيل الدخول إلى التطبيق › لمطوّرك** يوجد **نسخ رمز اختبار**: رمز وصول لحساب مراجعة المتاجر الخاص بك، صالح لمدة 15 دقيقة، وموقّع مثل رموز التطبيق. استدعِ به نقطة نهاية تتطلب تسجيل الدخول في واجهتك البرمجية، ودونه:

~~~http
GET /me/courses
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
~~~

ويفعل الفحص المباشر الشيء نفسه: حين يتولى Yallapp تسجيل الدخول، يتحقق من أن الطلب الذي يتطلب تسجيل الدخول يجيب بـ 401 دون رمز و200 مع رمز اختبار (حين يكون لتطبيقك رقم مراجعة متاجر أو بريد إلكتروني لها في **تسجيل الدخول إلى التطبيق**).

التطبيق الذي بُني قبل أن يختار المالك Yallapp لا يزال يرسل تسجيل الدخول إلى واجهتك البرمجية. والإصدار التالي يرسله إلى Yallapp. ولتحويل التطبيق الموجود لدى الناس الآن، أضف هذا إلى \`/config\` لديك:

~~~json
"auth": { "provider": "yallapp", "base_url": "https://yallapp.com.tr/api/app/{app_id}" }
~~~

## المحتوى، مع مثال

القوائم مقسّمة إلى صفحات. يرسل التطبيق \`page\` (بدءًا من 1) و\`per_page\` (حتى 50) ويتوقع تفاصيل الصفحة بجانب \`items\`:

~~~http
GET /courses?page=1&per_page=20
~~~

~~~json
{
  "page": 1, "per_page": 20, "total": 2, "total_pages": 1,
  "items": [
    {
      "id": 12, "title": "Python Programming Basics",
      "image_url": "https://ada-academy.com/images/python.jpg",
      "instructor": { "id": 3, "name": "Ada Lovelace", "avatar_url": null },
      "price": { "is_free": false, "amount": "450.00", "currency": "TRY", "formatted": "₺450" },
      "lesson_count": 24, "rating": 4.8, "rating_count": 112, "enrolled": false
    }
  ]
}
~~~

تحسب واجهتك البرمجية سعر سلة تطبيق المتجر في كل مرة تتغيّر فيها. ولا يُحفظ شيء:

~~~http
POST /store/cart?platform=android
Content-Type: application/json

{ "lines": [ { "product_id": 301, "quantity": 2 } ] }
~~~

~~~json
{
  "lines": [
    { "product_id": 301, "quantity": 2, "name": "Red roses - Large", "unit_price": "₺450.00", "line_total": "₺900.00", "available": true }
  ],
  "item_count": 2, "subtotal": "₺900.00", "subtotal_amount": "900.00", "currency": "TRY"
}
~~~

يجيب الدفع (\`POST /store/checkout-link\`) برابط إلى صفحة الدفع الخاصة بك، ويفتحها التطبيق. وحين يُقدَّم الطلب، أرسل العميل إلى صفحة يتضمن عنوانها \`order-received\` أو \`thank_you\`، ليعرف التطبيق أن الدفع انتهى.

## الأخطاء

كل خطأ JSON فيه \`code\` ثابت يمكن للتطبيق التصرف بناءً عليه و\`message\` يمكنك عرضها على الناس، مع حالة HTTP المطابقة:

~~~json
{ "code": "invalid_code", "message": "This code isn't right. Check it and try again." }
~~~

- 400 للطلب غير الصحيح (مثل \`{}\` مرسلًا إلى \`/auth/otp/request\`)
- 401 حين يكون رمز الوصول مفقودًا أو منتهي الصلاحية: يحدّثه التطبيق ويعيد المحاولة
- 403 حين لا يكون أمر ما مسموحًا، مثل \`device_limit_reached\` أو \`purchase_not_allowed\`
- 404 حين لا يكون الشيء موجودًا
- 409 للتعارض، مثل \`slot_taken\` أو \`cart_changed\`
- 429 مع \`retry_after_seconds\` حين يكثر أحدهم المحاولات
- 503 مع \`maintenance\` حين تكون متوقفًا للصيانة

## الصور وHTML

- كل صورة عنوان https كامل. استخدم صورًا لا يقل عرضها عن عرض شاشة الهاتف (نحو 1080 بكسل للافتات).
- الحقول المنتهية بـ \`_html\` و\`html\` الخاص بالدرس هي HTML. أبقِه بسيطًا: فقرات وعناوين وقوائم وروابط وصور وخط عريض ومائل. دون نصوص برمجية.
- ضع كل iframe في الدرس في قائمة \`embeds\` الخاصة به واترك عنصرًا نائبًا مكانه في HTML، كما يصف المرجع. ويضبط التطبيق مقاسه على الهاتف.
- حين لا يمكن عرض درس بشكل أصلي، أجب بـ \`render_mode: "webview"\` و\`webview_url\` موقّع ومحدود الصلاحية يفتحه التطبيق بدلًا من ذلك.
- الأسعار نص تنسّقه بنفسك (\`formatted\`)، إضافة إلى المبلغ والعملة.

## اختبره بالفحص المباشر

1. في لوحة تحكم Yallapp، افتح **إعداد التطبيق** وخطوة **الموقع الإلكتروني**.
2. اختر **واجهتي البرمجية الخاصة** وأدخل عنوانك الأساسي.
3. اختر **تشغيل الفحص**. نستدعي واجهتك البرمجية كما يفعل التطبيق: \`/config\`، وإعدادات نوع تطبيقك وإعدادات تسجيل الدخول فيها (\`auth.methods\` و\`auth.email_sign_in\`)، ونقطة نهاية الصفحة الرئيسية، وشكل الأخطاء في نقاط نهاية تسجيل الدخول التي تتيحها (\`POST /auth/otp/request\` أو \`POST /auth/email/request\` أو \`POST /auth/password\`) مع محتوى فارغ. ثم تعرض صفحة **تسجيل الدخول إلى التطبيق** في لوحة التحكم كيف تسجّل واجهتك البرمجية دخول الناس. وحين يتولى Yallapp تسجيل الدخول، يتخطى الفحص تسجيل الدخول ويتحقق بدلًا من ذلك من ردود واجهتك البرمجية مع رمز ودونه.
4. أصلح كل ما يسرده الفحص، وشغّله مجددًا، ثم اختر **حفظ ومتابعة**.

> الفحص بداية سريعة، لا اختبار كامل. ويسرد [مرجع الواجهة البرمجية](/developers) كل حقل يقرؤه التطبيق.

## دع معاينة التطبيق تصل إلى واجهتك البرمجية {#let-the-app-preview-reach-your-api}

تشغّل صفحة **معاينة تطبيقك** في لوحة التحكم تطبيقك في متصفح ويب، على yallapp.com.tr. ولا يسمح المتصفح لها باستدعاء واجهتك البرمجية إلا حين تسمح واجهتك البرمجية بالطلبات من ذلك العنوان (الطلبات عبر المصادر). ودون ذلك، تقول المعاينة إنها لم تستطع الوصول إلى محتوى تطبيقك؛ ولا يتأثر التطبيق المثبّت.

أجب عن الطلبات التي تأتي مع \`Origin: https://yallapp.com.tr\` بهذه الترويسات، وأجب عن طلبات \`OPTIONS\` من المتصفح بـ 204 والترويسات نفسها:

~~~http
Access-Control-Allow-Origin: https://yallapp.com.tr
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept-Language
Access-Control-Max-Age: 600
Vary: Origin
~~~

لا ترسل المعاينة رموز تسجيل الدخول أبدًا. وليتمكن عميلك من تجربة الشاشات التي تتطلب تسجيل الدخول هناك، ادعم تسجيل الدخول في المعاينة:

- حين يأتي \`POST /auth/otp/request\` مع \`"preview": true\`، لا ترسل أي رمز. اقبل فقط رقم مراجعة المتاجر الخاص بك (مع رمزه الثابت في \`/auth/otp/verify\`)، وأجب عن أي رقم آخر بـ 403 والرمز \`preview_review_number_only\`.
- ثم اضبط \`auth.preview_sign_in\` على \`true\` في \`/config\`. ودون ذلك، تقول المعاينة إن تسجيل الدخول يعمل في التطبيق المثبّت.

## قائمة التحقق قبل الإرسال

- كل نقطة نهاية مطلوبة لنوع تطبيقك تجيب عبر https، بـ JSON
- يجتاز \`/config\` الفحص المباشر ويوقف ما لا تدعمه
- يعمل تسجيل الدخول من البداية إلى النهاية لكل طريقة في \`auth.methods\`، بما في ذلك رقم جديد (أو بريد إلكتروني جديد)، والتحديث، وتسجيل الخروج. وحين يتولى Yallapp تسجيل الدخول: تقبل واجهتك البرمجية رمز اختبار، وتعثر على المستخدم أو تنشئه عبر \`sub\`
- تجيب الطلبات التي تتطلب تسجيل الدخول بـ 401 مع رمز منتهي الصلاحية، ويعمل التحديث مرة واحدة لكل رمز تحديث
- يعمل حذف الحساب (\`DELETE /me\`)، كما تشترط Apple وGoogle. وحين يتولى Yallapp تسجيل الدخول: تستقبل واجهتك البرمجية الإشعار الموقّع في \`/webhooks/yallapp\` وتحذف المستخدم عبر \`sub\`
- على iOS، لا يعرض أي محتوى رقمي مدفوع خيار شراء
- يعمل رقم اختبار برمز ثابت لمراجعي المتاجر، وبريد إلكتروني للاختبار أيضًا حين تتيح تسجيل الدخول بالبريد
- تصل معاينة التطبيق إلى واجهتك البرمجية: الطلبات من https://yallapp.com.tr مسموح بها
- القوائم مقسّمة إلى صفحات وتبقى سريعة مع ضبط \`per_page\` على 50

---

المرجع الكامل، بكل نقطة نهاية وحقل ورمز خطأ، موجود في صفحة [مرجع الواجهة البرمجية](/developers)؛ ويمكنك أيضًا تنزيله [كملف OpenAPI](/developers/openapi.yaml). يتحدث إصدارك التالي إلى واجهتك البرمجية؛ وإن غيّرت العنوان لاحقًا، يستخدم الإصدار التالي العنوان الجديد.
`,
  },
};
