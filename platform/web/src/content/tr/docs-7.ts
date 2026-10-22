import type { DocTranslation } from "../translation-types";

/**
 * 55 The developer guide (src/content/docs-developer.ts) in Turkish. The code
 * blocks stay as they are, and the headings that other pages link to keep
 * their English anchors.
 */
export const TR_DOCS_7: Record<string, DocTranslation> = {
  "my-own-api": {
    title: "Kendi API'nizi bağlayın",
    description: "Geliştiriciler için: Yallapp API'sini kendi web sitenizden, uç nokta uç nokta, örnekler ve bir kontrol listesiyle sunun.",
    body: `Bu rehber, desteklediğimiz platformlardan birinde çalışmayan bir web sitesini bağlayan geliştirici içindir. Uygulamanız tek bir API ile, **Yallapp API**'si ile konuşur. WordPress'te bunu eklentimiz sunar; burada aynı uç noktaları web siteniz sunar ve uygulama bunlarla değişmeden çalışır. Yallapp hakkında başka bir şey bilmeniz gerekmez.

## Başlamadan önce

- Web sitenize veya arka ucunuza uç nokta ekleyebilen bir geliştirici
- API için genel internetten erişilebilen bir https adresi, örneğin https://api.your-site.com/yallapp/v1
- Kullanıcılarınızın giriş yapma yolu: telefonlarına SMS veya WhatsApp ile ya da e-postayla gönderilen tek kullanımlık bir kod veya zaten sakladığınız e-posta adresleri ve şifreleri. Ya da [girişi Yallapp'e bırakın](#let-yallapp-sign-people-in)
- Uygulama türü seçilmiş bir Yallapp hesabı: Akademi, Mağaza veya Randevu (Emlak uygulamaları yalnızca Yallapp'te yönetilen ilanlarla çalışır)

## "Web siteniz Yallapp API'sini sunar" ne demek

Bize tek bir **temel URL** verirsiniz. Uygulama her çağrı için buna, tam olarak [API başvurusunda](/developers) anlatıldığı gibi bir yol ekler. Örneğin \`https://api.your-site.com/yallapp/v1\` temel URL'siyle, uygulamanın açılırken yaptığı ilk çağrı şudur:

~~~http
GET https://api.your-site.com/yallapp/v1/config?platform=android&app_version=1.0.0
Accept: application/json
Accept-Language: en
~~~

Her yerde geçerli kurallar:

- Giriş ve çıkışta JSON, UTF-8. Tarihler ve saatler ISO 8601 biçiminde, UTC olarak (örneğin \`2026-10-14T09:30:00Z\`).
- Giriş gerektiren çağrılar \`Authorization: Bearer\` ve ardından sizin verdiğiniz erişim belirtecini gönderir.
- Uygulama, başvurunun istediği yerlerde \`platform=android\` veya \`platform=ios\` gönderir. Bunu satın alma kuralları için kullanın: iOS'ta asla ücretli dijital içerik sunmayın.
- \`Accept-Language\`, kullanıcının seçtiği dili taşır (\`en\`, \`ar\` veya \`tr\`). Elinizde varsa metinlerinizi o dilde yanıtlayın.
- Görsel ve bağlantı adresleri tam https URL'leridir.

## Uç noktaları bu sırayla oluşturun

Küçük başlayın ve her adımdan sonra canlı kontrolü çalıştırın (bu rehberin son bölümü).

1. \`GET /config\`: uygulamanın ayarları. Her uygulamanın buna, giriş yapılmadan, ihtiyacı vardır.
2. Giriş: \`POST /auth/otp/verify\`, \`POST /auth/register\`, \`POST /auth/refresh\` ve \`POST /auth/logout\`; telefonla giriş için \`POST /auth/otp/request\`, e-postayla giriş için \`POST /auth/email/request\` veya \`POST /auth/password\` ile birlikte ([giriş akışına](#the-sign-in-flow-simply) bakın). Ya da [girişi Yallapp'e bırakın](#let-yallapp-sign-people-in) ve bu adımı atlayın.
3. Hesap: \`GET\`, \`PATCH\` ve \`DELETE /me\`, \`GET /me/devices\`, \`DELETE /me/devices/{device_id}\`, \`PUT /me/push-token\`, \`GET /me/notifications\` ve \`POST /me/notifications/read\`. Girişi Yallapp yaptığında yalnızca son üçü.
4. Uygulama türünüzün içeriği, aşağıda.
5. İsteğe bağlı ekler, aşağıda.

### Akademi uygulamaları

Gerekli: \`GET /home\`, \`GET /categories\`, \`GET /courses\`, \`GET /courses/{course_id}\`, \`GET /courses/{course_id}/curriculum\`, \`GET /me/courses\`, \`GET /lessons/{lesson_id}\`, \`POST /lessons/{lesson_id}/progress\` ve \`POST /lessons/{lesson_id}/complete\`. \`/config\` içinde \`features.lms\` ayarlanmış olmalıdır (canlı kontrol buna bakar): başvurunun bunun için listelediği değerlerden birini kullanın.

İsteğe bağlı, her biri \`/config\` içindeki \`features\` ile açılır: ücretsiz kayıt (\`POST /courses/{course_id}/enroll\`), sınavlar (\`/quizzes/...\` ve \`GET /me/quiz-attempts\`), sertifikalar (\`GET /me/certificates\`), istek listesi (\`/me/wishlist\`), değerlendirmeler (\`/courses/{course_id}/reviews\`), soru ve cevaplar (\`/courses/{course_id}/questions\`, \`/questions/...\`), siparişler (\`GET /me/orders\`) ve Android'de ödeme (\`POST /auth/checkout-link\`).

### Mağaza uygulamaları

Gerekli: \`GET /store/home\`, \`GET /store/categories\`, \`GET /store/products\`, \`GET /store/products/{product_id}\`, \`POST /store/cart\` ve \`POST /store/checkout-link\`. \`/config\`, \`store\` içermelidir.

İsteğe bağlı: ürün değerlendirmeleri (\`store.reviews\` açıkken \`GET /store/products/{product_id}/reviews\`) ve müşterinin siparişleri (\`features.orders\` açıkken \`GET /me/orders\`).

### Randevu uygulamaları

Gerekli: \`GET /bookings/home\`, \`GET /bookings/categories\`, \`GET /bookings/services\`, \`GET /bookings/services/{service_id}\`, \`GET /bookings/availability\`, \`POST /bookings/appointments\`, \`GET /me/appointments\`, \`GET /me/appointments/{appointment_id}\` ve \`POST /me/appointments/{appointment_id}/cancel\`. \`/config\`, \`bookings\` içermelidir.

### Her uygulama türü için isteğe bağlı

\`GET /pages\` ve \`GET /pages/{slug}\`, uygulamanın alt sekmelerini ve sayfalarını başvuruda anlatılan biçimde sunar. Yallapp panelindeki **Sayfalar ve görünüm** düzenleyicisi kendi API'nize ulaşmaz: Yallapp'te çalışan uygulamalara ve eklentimiz aracılığıyla WordPress sitelerine yayınlar. Bu yüzden bunları dışarıda bırakın; uygulama yerleşik sekmelerini ve ana sayfa uç noktanızı kullanır (\`/pages\` 404 yanıtı verdiğinde) ya da kendi sisteminizin oluşturduğu sekmeleri ve sayfaları sunun.

> Desteklemediğiniz özellikler: bunları \`/config\` içinde kapatın, uygulama onları gizler. Ayarlarınız için uygulamanın ihtiyaç duymadığı bir uç nokta asla çağrılmaz.

## GET /config ile başlayın

Bu, uygulamanın bir Akademi uygulaması için kabul ettiği en küçük yanıttır. Mağaza uygulamaları \`store\`, Randevu uygulamaları \`bookings\` ekler (alanları için başvuruya bakın).

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

- \`app.update_required\`: true, uygulamanın kullanıcılardan güncelleme istemesini sağlar (uygulamanın gönderdiği \`app_version\` ile karşılaştırın).
- \`app.maintenance\`: true yalnızca \`app.maintenance_message\`'ı gösterir.
- \`app.screen_protection\`: \`off\`, \`content\` (dersler, sınavlar ve ekleri) veya \`app\` (her ekran), uygulamada ekran görüntüsü ve ekran kaydını engeller.
- \`app.hide_video_branding\`: true, YouTube, Vimeo ve Bunny Stream videolarını sitenin markası görünmeden uygulamanın kendi kontrollerinin arkasında oynatır (riski uygulama sahibine aittir: YouTube'un şartlarını ihlal edebilir). Her sitenin normal oynatıcısı için göndermeyin veya false gönderin.
- \`platform=ios\` olduğunda \`purchases.enroll_button\` false olmalıdır.

## Giriş akışı, basitçe {#the-sign-in-flow-simply}

İnsanların nasıl giriş yapacağına API'niz karar verir ve bunu \`/config\` içinde, \`auth\` altında söyler:

- \`methods\`: \`["phone"]\`, \`["email"]\` veya \`["phone", "email"]\`. Yoksa \`["phone"]\` anlamına gelir. İkisi birlikteyse uygulama bir **Telefon / E-posta** anahtarı gösterir.
- \`email_sign_in\`, \`methods\` içinde \`email\` olduğunda zorunludur: \`"code"\` (6 haneli bir kodu e-postayla gönderirsiniz: \`POST /auth/email/request\`) veya \`"password"\` (kişi sizdeki hesabının şifresini yazar: \`POST /auth/password\`).
- \`password_reset_url\`, \`"password"\` ile: unutulan şifre için sayfanız. Uygulama bunu **Şifrenizi mi unuttunuz?**'dan açar.

Yalnızca sunduklarınızın uç noktalarını sunun: telefon için \`POST /auth/otp/request\`, kodla e-posta için \`POST /auth/email/request\`, şifreyle e-posta için \`POST /auth/password\`.

~~~json
"auth": {
  "signup_allowed": true, "signup_fields": ["name"], "default_country_code": "+90",
  "methods": ["phone", "email"], "email_sign_in": "code"
}
~~~

### Telefonla, kodla

İnsanlar telefon numaraları ve sizin gönderdiğiniz bir kodla giriş yapar. Şifre yoktur.

1. Uygulama numarayı gönderir. Bir kod oluşturur, SMS veya WhatsApp ile gönderir ve bir \`request_id\` ile yanıt verirsiniz.
2. Kişi kodu yazar. Uygulama kodu \`request_id\` ve cihazın bir açıklamasıyla gönderir.
3. Numaranın bir hesabı varsa iki belirteç ve kullanıcıyla yanıt verirsiniz. Yoksa bir \`signup_token\` ile yanıt verirsiniz; uygulama bir ad (ve diğer \`signup_fields\`) ister ve \`/auth/register\`'ı çağırır.
4. Uygulama, giriş gerektiren her çağrıda **erişim belirtecini** gönderir. Kısa ömürlüdür (15 dakika iyi bir seçimdir). Süresi dolduğunda uygulama \`/auth/refresh\` üzerinden **yenileme belirtecini** yenileriyle değiştirir. Her yenileme belirteci bir kez çalışır.

Kod isteyin:

~~~http
POST /auth/otp/request
Content-Type: application/json

{ "country_code": "+90", "phone": "5321234567" }
~~~

~~~json
{ "request_id": "c1f3a9", "code_length": 6, "resend_after_seconds": 60, "expires_in_seconds": 300 }
~~~

Doğrulayın:

~~~http
POST /auth/otp/verify
Content-Type: application/json

{
  "request_id": "c1f3a9",
  "code": "481902",
  "device": { "id": "7d0c6c1e-5b0a-4c55-9a4e-2f4a6e0e6b11", "platform": "android", "name": "Pixel 8", "app_version": "1.0.0" }
}
~~~

Mevcut bir hesap:

~~~json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "r_6f2b0d...",
  "expires_in": 900,
  "user": { "id": 42, "name": "Sara Yilmaz", "phone": "+905321234567", "email": null, "city": null, "avatar_url": null }
}
~~~

Yeni bir numara:

~~~json
{ "signup_required": true, "signup_token": "s_91ad...", "fields": ["name"] }
~~~

Yenileme:

~~~http
POST /auth/refresh
Content-Type: application/json

{ "refresh_token": "r_6f2b0d..." }
~~~

~~~json
{ "access_token": "eyJhbGciOi...", "refresh_token": "r_a83c11...", "expires_in": 900 }
~~~

### E-postayla

\`"email_sign_in": "code"\` ile uygulama adresi gönderir, siz de telefon koduyla aynı kurallar ve yanıtla 6 haneli bir kodu e-postayla gönderirsiniz. Kişi kodu yazar ve uygulama kodu tam yukarıdaki gibi \`POST /auth/otp/verify\` üzerinden doğrular. Hesabı olmayan bir adres bir \`signup_token\` alır; \`/auth/register\` ardından telefonla kayıttaki bilgilerin aynısını, e-posta olmadan (zaten elinizde) ister.

~~~http
POST /auth/email/request
Content-Type: application/json

{ "email": "sara@example.com" }
~~~

~~~json
{ "request_id": "e7b210", "code_length": 6, "resend_after_seconds": 60, "expires_in_seconds": 300 }
~~~

\`"email_sign_in": "password"\` ile uygulama adresi, şifreyi ve cihazı gönderir; siz de \`/auth/otp/verify\` ile aynı belirteçler ve kullanıcıyla yanıt verirsiniz. Bu yolla yalnızca mevcut hesaplar giriş yapar. Yanlış adresi ve yanlış şifreyi aynı 400 \`invalid_credentials\` ile yanıtlayın; böylece kimse kimin hesabı olduğunu öğrenemez.

~~~http
POST /auth/password
Content-Type: application/json

{
  "email": "sara@example.com",
  "password": "…",
  "device": { "id": "7d0c6c1e-5b0a-4c55-9a4e-2f4a6e0e6b11", "platform": "ios", "name": "iPhone 16", "app_version": "1.0.0" }
}
~~~

E-postayla kaydolan birinin telefon numarası yoktur: \`user\` içinde \`"phone": null\` gönderin. E-postayla giriş sunmadığınızda \`/auth/email/request\` ve \`/auth/password\`'ü 403 \`method_not_allowed\` (veya 404) ile yanıtlayın.

> Apple ve Google inceleyicilerinin giriş yapabilmesi gerekir ve kodlarınızı alamazlar. Uygulamanız incelemedeyken mesaj gönderilmeden sabit bir kodu kabul eden bir test numarası ve e-postayla giriş sunuyorsanız bir test e-posta adresi tutun ve bunları mağazalara verin. Uygulamanız yalnızca e-postayla giriş yapıyorsa inceleyicilerin test e-posta adresine ihtiyacı vardır: orada numara kullanamazlar. \`"password"\` ile onlara bir test hesabının e-posta adresini ve şifresini verin.

## Girişi Yallapp'e bırakın {#let-yallapp-sign-people-in}

Girişi Yallapp'e bırakabilirsiniz. Panelde **Uygulamaya giriş**'i açın ve **Girişi Yallapp yapar**'ı seçin. Uygulamanın sahibi bu durumda orada telefonu, e-postayı veya ikisini seçer; Yallapp kodları gönderir (Yallapp'in WhatsApp numarasından ve e-posta adresinden ya da sahibinin kendisininkinden), hesapları, mağaza inceleme numarasını ve cihaz sınırını tutar ve insanlar istediğinde hesapları siler. API'niz içeriği sunar ve kimin giriş yaptığını kontrol eder.

Nasıl çalışır:

- Uygulama girişi, hesabı (\`GET\`, \`PATCH\` ve \`DELETE /me\`) ve cihaz listesini Yallapp'e, diğer her çağrıyı ise Yallapp'in verdiği erişim belirteciyle \`Authorization: Bearer\` olarak API'nize gönderir.
- Erişim belirteci, yalnızca uygulamanıza ait bir anahtar çiftiyle **ES256** ile imzalanmış bir JWT'dir. Özel anahtar yalnızca Yallapp'tedir. Genel anahtarlar uygulamanızın anahtar kümesindedir: **Uygulamaya giriş › Geliştiriciniz için** adresini gösterir, örneğin \`https://yallapp.com.tr/api/app/{app_id}/.well-known/jwks.json\`.
- Erişim belirteçleri 15 dakika geçerlidir. Biri dolduğunda API'niz 401 yanıtı verir; uygulama Yallapp'ten yenisini alır ve yeniden dener.
- Giriş uç noktalarının hiçbirini sunmayın. \`/config\`'inizin de \`auth\`'a ihtiyacı yoktur: uygulama bunu Yallapp'ten alır.

Her belirteçteki bilgiler (claims):

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

- \`iss\`: her zaman \`https://yallapp.com.tr\`. \`aud\`: **Uygulamaya giriş**'te gösterilen uygulama kimliğiniz; böylece başka bir uygulamanın belirteci sizinkiyle asla çalışmaz.
- \`sub\`: kişinin Yallapp kullanıcı kimliği, metin olarak. O hesap için asla değişmez.
- \`phone\` (E.164) ve \`email\` yalnızca kişi bunları bir kodla kanıtladığında gelir: telefonla giriş yapanlar için \`phone\`, e-postayla giriş yapanlar için \`email\`. Telefonla kayıtta yazılan bir adres asla belirteçte yer almaz.
- \`name\`: kişinin verdiği haliyle. \`did\` Yallapp'e aittir; yok sayın.

### Belirteci API'nizde kontrol edin

Giriş gerektiren her çağrıda: belirteci \`Authorization\` başlığından alın, imzasını anahtar kümesinde \`kid\`'inin adlandırdığı anahtarla kontrol edin ve \`iss\`, \`aud\` ile \`exp\`'i kontrol edin. Herhangi bir şey yanlışsa veya belirteç yoksa \`{ "code": "invalid_token", "message": "…" }\` ile 401 yanıtı verin. Anahtar kümesini önbelleğe alın (5 dakikaya izin veriyoruz) ve bir belirteç sizde olmayan bir \`kid\` adlandırdığında yeniden getirin: aşağıdaki kütüphaneler ikisini de yapar.

Node.js, jose ile:

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

PHP, firebase/php-jwt ile:

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

Python, PyJWT ile:

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

### Sizin kullanıcılarınız ve Yallapp'inkiler

Her Yallapp hesabı için kendi kullanıcınızı tutun ve onu \`sub\` ile bulun. Bir \`sub\` ilk kez geldiğinde:

- Sisteminiz insanları zaten tanıyorsa, belirtecin **kanıtlanmış** \`phone\` veya \`email\` değerini o numara veya adrese sahip kullanıcınızla eşleştirin ve \`sub\`'ı o kullanıcıya kaydedin. Asla başka bir şeye göre eşleştirmeyin.
- Aksi halde \`sub\`, \`name\` ve belirtecin kanıtladıklarıyla bir kullanıcı oluşturun.

Bundan sonra onları yalnızca \`sub\` ile bulun: insanlar uygulamada adlarını değiştirebilir, \`sub\` ise aynı kalır. Giriş gerektiren her çağrı o kullanıcının verileri üzerinde çalışır: kursları, siparişleri veya randevuları.

Biri uygulamada hesabını sildiğinde uygulama önce onun belirteciyle \`DELETE /me\` uç noktanızı çağırır; böylece onun hakkında tuttuklarınızı silebilirsiniz (204 ile, hiçbir şey tutmuyorsanız 404 ile yanıt verin). Ardından Yallapp, API'niz yanıt vermemiş olsa bile hesabını siler ve API'nize bunun imzalı bir bildirimini gönderir (aşağıda); böylece ilk çağrı size hiç ulaşmamış olsa bile verilerini daha sonra silebilirsiniz. Çıkış yapmak ve uygulamada bir cihazı kaldırmak, o cihazın Yallapp'teki oturumunu sonlandırır: belirteçleri yenilenmez ve 15 dakika içinde çalışmayı bırakır.

### Hesap silme bildirimleri {#account-deletion-notices}

Bir kişi hesabını sildiğinde Yallapp \`<your API address>/webhooks/yallapp\` adresine bir bildirim gönderir. Gövde, \`Content-Type: application/secevent+jwt\` ile imzalı bir belirteçtir (Security Event Token); erişim belirteçleri gibi uygulamanızın anahtarıyla imzalanır ve aynı anahtar kümesiyle kontrol edilir:

- \`typ\` (başlıkta): \`secevent+jwt\`. \`iss\`: \`https://yallapp.com.tr\`. \`aud\`: uygulama kimliğiniz ve ardından \`:events\`; böylece bir bildirim asla erişim belirteci yerine, bir erişim belirteci de asla bildirim yerine geçmez.
- \`sub\`: hesabı silinen kişi. \`events\`: \`{ "account.deleted": {} }\`.
- \`jti\`: bildirimin kimliği; \`Yallapp-Delivery\` başlığında da yer alır. Bir bildirim yeniden gönderildiğinde aynı kalır: bir kez silin ve tekrarlara 2xx ile yanıt verin.
- \`iat\` ve \`exp\`: her deneme yeniden imzalanır ve 5 dakika geçerlidir.

Aldığınızda 2xx (202 veya 204) ile yanıt verin. 5xx, 408 veya 429 yanıtı, 10 saniye içinde yanıt gelmemesi ya da API'ye ulaşılamaması durumunda 1, 5 ve 30 dakika, ardından 2, 6, 12 ve 24 saat sonra yeniden denenir. Başka herhangi bir yanıt (henüz bildirim almıyorsanız 404) denemeyi durdurur. Bildirimler yönlendirmeler üzerinden iletilmez. **Uygulamaya giriş › Geliştiriciniz için**, son 30 günün bildirimlerini ve her birinin nasıl sonuçlandığını listeler; **Yeniden gönder**, başarısız bir bildirimi aynı \`jti\` ile baştan başlatır (bu yüzden tekrar da 2xx ile yanıtlanır). Bildirim, \`DELETE /me\` çağrınızdan önce veya sonra ya da o olmadan gelebilir: her durumda kullanıcıyı \`sub\` ile silin.

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

### Deneyin

**Uygulamaya giriş › Geliştiriciniz için**'de **Test belirteci kopyala** bulunur: mağaza inceleme hesabınızın, 15 dakika geçerli ve uygulamanınkiler gibi imzalanmış bir erişim belirteci. API'nizin giriş gerektiren bir uç noktasını bununla ve bu olmadan çağırın:

~~~http
GET /me/courses
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
~~~

Canlı kontrol de aynısını yapar: girişi Yallapp yaptığında, giriş gerektiren bir çağrının belirteç olmadan 401, test belirteciyle 200 yanıtı verdiğini kontrol eder (uygulamanızın **Uygulamaya giriş**'te bir mağaza inceleme numarası veya e-posta adresi olduğunda).

Sahibi Yallapp'i seçmeden önce derlenen bir uygulama girişi hâlâ API'nize gönderir. Bir sonraki derleme onu Yallapp'e gönderir. İnsanların elindeki uygulamayı şimdi geçirmek için \`/config\`'inize şunu ekleyin:

~~~json
"auth": { "provider": "yallapp", "base_url": "https://yallapp.com.tr/api/app/{app_id}" }
~~~

## İçerik, bir örnekle

Listeler sayfalıdır. Uygulama \`page\` (1'den başlayarak) ve \`per_page\` (en fazla 50) gönderir ve sayfa bilgilerini \`items\`'ın yanında bekler:

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

Bir Mağaza uygulamasının sepeti her değiştiğinde API'niz tarafından fiyatlandırılır. Hiçbir şey kaydedilmez:

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

Ödeme (\`POST /store/checkout-link\`), uygulamanın açtığı kendi ödeme sayfanızın bağlantısıyla yanıt verir. Sipariş verildiğinde müşteriyi adresi \`order-received\` veya \`thank_you\` içeren bir sayfaya yönlendirin; böylece uygulama ödemenin bittiğini anlar.

## Hatalar

Her hata, uygulamanın buna göre davranabileceği sabit bir \`code\` ve insanlara gösterebileceğiniz bir \`message\` içeren, uygun HTTP durumuyla birlikte bir JSON'dur:

~~~json
{ "code": "invalid_code", "message": "This code isn't right. Check it and try again." }
~~~

- Hatalı bir istek için 400 (örneğin \`/auth/otp/request\`'e gönderilen \`{}\`)
- Erişim belirteci yoksa veya süresi dolmuşsa 401: uygulama onu yeniler ve yeniden dener
- Bir şeye izin verilmediğinde 403, örneğin \`device_limit_reached\` veya \`purchase_not_allowed\`
- Bir şey yoksa 404
- Bir çakışma için 409, örneğin \`slot_taken\` veya \`cart_changed\`
- Biri çok sık denediğinde \`retry_after_seconds\` ile 429
- Bakım için kapalıyken \`maintenance\` ile 503

## Görseller ve HTML

- Her görsel tam bir https adresidir. En az bir telefon ekranı genişliğinde görseller kullanın (afişler için yaklaşık 1080 piksel).
- \`_html\` ile biten alanlar ve bir dersin \`html\`'i HTML'dir. Basit tutun: paragraflar, başlıklar, listeler, bağlantılar, görseller, kalın ve italik. Betik yok.
- Bir dersteki her iframe'i dersin \`embeds\` listesine koyun ve HTML'de yerine, başvuruda anlatıldığı gibi bir yer tutucu bırakın. Uygulama onu telefona göre boyutlandırır.
- Bir ders yerel olarak gösterilemiyorsa \`render_mode: "webview"\` ve uygulamanın bunun yerine açacağı imzalı, süreli bir \`webview_url\` ile yanıt verin.
- Fiyatlar, kendiniz biçimlendirdiğiniz metin (\`formatted\`) artı tutar ve para birimidir.

## Canlı kontrolle test edin

1. Yallapp panelinizde **Uygulama kurulumu**'nu ve **Web sitesi** adımını açın.
2. **Kendi API'm**'ı seçin ve temel URL'nizi girin.
3. **Kontrolü çalıştır**'ı seçin. API'nizi uygulamanın çağırdığı gibi çağırırız: \`/config\`, içindeki uygulama türü ayarlarınız ve giriş ayarlarınız (\`auth.methods\` ve \`auth.email_sign_in\`), ana sayfa uç noktanız ve sunduğunuz giriş uç noktalarının (\`POST /auth/otp/request\`, \`POST /auth/email/request\` veya \`POST /auth/password\`) boş gövdeyle hata biçimi. Panelin **Uygulamaya giriş** sayfası ardından API'nizin insanları nasıl giriş yaptırdığını gösterir. Girişi Yallapp yaptığında kontrol girişi atlar ve bunun yerine API'nizin belirteçli ve belirteçsiz yanıtlarını kontrol eder.
4. Kontrolün listelediği her şeyi düzeltin, yeniden çalıştırın, ardından **Kaydet ve devam et**'i seçin.

> Kontrol hızlı bir başlangıçtır, tam bir test değildir. [API başvurusu](/developers), uygulamanın okuduğu her alanı listeler.

## Uygulama önizlemesinin API'nize ulaşmasını sağlayın {#let-the-app-preview-reach-your-api}

Panelin **Uygulamanızı önizleyin** sayfası uygulamanızı bir web tarayıcısında, yallapp.com.tr üzerinde çalıştırır. Tarayıcı, API'nizi çağırmasına yalnızca API'niz o adresten gelen isteklere izin verdiğinde (çapraz kaynak istekleri) izin verir. Bu olmadan önizleme, uygulamanızın içeriğine ulaşamadığını söyler; yüklü uygulama etkilenmez.

\`Origin: https://yallapp.com.tr\` ile gelen isteklere bu başlıklarla yanıt verin ve tarayıcının \`OPTIONS\` isteklerine 204 ve aynı başlıklarla yanıt verin:

~~~http
Access-Control-Allow-Origin: https://yallapp.com.tr
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept-Language
Access-Control-Max-Age: 600
Vary: Origin
~~~

Önizleme asla giriş kodu göndermez. Müşterinizin orada giriş gerektiren ekranları deneyebilmesi için önizleme girişini destekleyin:

- \`POST /auth/otp/request\`, \`"preview": true\` ile geldiğinde kod göndermeyin. Yalnızca mağaza inceleme numaranızı kabul edin (\`/auth/otp/verify\`'da sabit koduyla) ve diğer her numarayı 403 ve \`preview_review_number_only\` koduyla yanıtlayın.
- Ardından \`/config\` içinde \`auth.preview_sign_in\`'i \`true\` yapın. Bu olmadan önizleme, girişin yüklü uygulamada çalıştığını söyler.

## Göndermeden önce kontrol listesi

- Uygulama türünüz için gerekli her uç nokta https üzerinden, JSON ile yanıt veriyor
- \`/config\` canlı kontrolü geçiyor ve desteklemedikleriniz kapalı
- Giriş, \`auth.methods\` içindeki her yöntem için baştan sona çalışıyor; yeni bir numara (veya e-posta adresi), yenileme ve çıkış dahil. Girişi Yallapp yaptığında: API'niz bir test belirtecini kabul ediyor ve kullanıcıyı \`sub\` ile buluyor ya da oluşturuyor
- Giriş gerektiren çağrılar süresi dolmuş bir belirteçle 401 yanıtı veriyor ve yenileme her yenileme belirteci için bir kez çalışıyor
- Apple ve Google'ın istediği gibi hesap silme (\`DELETE /me\`) çalışıyor. Girişi Yallapp yaptığında: API'niz \`/webhooks/yallapp\` adresindeki imzalı bildirimi alıyor ve kullanıcıyı \`sub\` ile siliyor
- iOS'ta hiçbir ücretli dijital içerik satın alma sunmuyor
- Mağaza inceleyicileri için sabit kodlu bir test numarası ve e-postayla giriş sunuyorsanız bir test e-posta adresi de çalışıyor
- Uygulama önizlemesi API'nize ulaşıyor: https://yallapp.com.tr adresinden gelen isteklere izin veriliyor
- Listeler sayfalı ve \`per_page\` 50 olduğunda da hızlı

---

Her uç nokta, alan ve hata koduyla tam başvuru [API başvurusu](/developers) sayfasındadır; bunu bir [OpenAPI dosyası](/developers/openapi.yaml) olarak da indirebilirsiniz. Bir sonraki derlemeniz API'nizle konuşur; adresi daha sonra değiştirirseniz bir sonraki derleme yenisini kullanır.
`,
  },
};
