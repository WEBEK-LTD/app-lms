/**
 * The "My own API" developer guide (/docs/my-own-api), in the Markdown of
 * lib/content/markdown.ts. The examples follow docs/api/openapi.yaml, the
 * public contract: change them with it. ~~~ fences are code blocks.
 */
export const DEVELOPER_GUIDE = `This guide is for the developer who connects a website that doesn't run on one of our supported platforms. Your app talks to one API, the **Yallapp API**. On WordPress our plugin serves it; here, your website serves the same endpoints, and the app works with them unchanged. You don't need to know anything else about Yallapp.

## Before you start

- A developer who can add endpoints to your website or backend
- An https address for the API, for example https://api.your-site.com/yallapp/v1, reachable from the public internet
- A way to sign your users in: a one-time code by SMS or WhatsApp to their phone, by email, or their email address and a password you already keep. Or [let Yallapp sign people in](#let-yallapp-sign-people-in)
- A Yallapp account with the app type chosen: Academy, Store or Bookings (Real estate apps run only on listings managed in Yallapp)

## What "your website serves the Yallapp API" means

You give us one **base URL**. The app adds a path to it for every call, exactly as described in the [API reference](/developers). For example, with the base URL \`https://api.your-site.com/yallapp/v1\`, the app's first call when it opens is:

~~~http
GET https://api.your-site.com/yallapp/v1/config?platform=android&app_version=1.0.0
Accept: application/json
Accept-Language: en
~~~

The rules that apply everywhere:

- JSON in and out, UTF-8. Dates and times in ISO 8601, in UTC (for example \`2026-10-14T09:30:00Z\`).
- Signed-in calls send \`Authorization: Bearer\` followed by the access token you issued.
- The app sends \`platform=android\` or \`platform=ios\` where the reference asks for it. Use it for the purchase rules: never offer paid digital content on iOS.
- \`Accept-Language\` carries the language the user picked (\`en\`, \`ar\` or \`tr\`). Answer with your texts in that language when you have them.
- Image and link addresses are full https URLs.

## Build the endpoints in this order

Start small and run the live check after each step (the last section of this guide).

1. \`GET /config\`: the app's settings. Every app needs it, signed out.
2. Sign-in: \`POST /auth/otp/verify\`, \`POST /auth/register\`, \`POST /auth/refresh\` and \`POST /auth/logout\`, with \`POST /auth/otp/request\` for phone sign-in, and \`POST /auth/email/request\` or \`POST /auth/password\` for email sign-in (see [the sign-in flow](#the-sign-in-flow-simply)). Or [let Yallapp sign people in](#let-yallapp-sign-people-in), and skip this step.
3. The account: \`GET\`, \`PATCH\` and \`DELETE /me\`, \`GET /me/devices\`, \`DELETE /me/devices/{device_id}\`, \`PUT /me/push-token\`, \`GET /me/notifications\` and \`POST /me/notifications/read\`. When Yallapp signs people in, only the last three.
4. Your app type's content, below.
5. Optional extras, below.

### Academy apps

Required: \`GET /home\`, \`GET /categories\`, \`GET /courses\`, \`GET /courses/{course_id}\`, \`GET /courses/{course_id}/curriculum\`, \`GET /me/courses\`, \`GET /lessons/{lesson_id}\`, \`POST /lessons/{lesson_id}/progress\` and \`POST /lessons/{lesson_id}/complete\`. In \`/config\`, \`features.lms\` must be set (the live check looks for it): use one of the values the reference lists for it.

Optional, each switched on in \`/config\` \`features\`: free enrollment (\`POST /courses/{course_id}/enroll\`), quizzes (\`/quizzes/...\` and \`GET /me/quiz-attempts\`), certificates (\`GET /me/certificates\`), wishlist (\`/me/wishlist\`), reviews (\`/courses/{course_id}/reviews\`), questions and answers (\`/courses/{course_id}/questions\`, \`/questions/...\`), orders (\`GET /me/orders\`) and Android checkout (\`POST /auth/checkout-link\`).

### Store apps

Required: \`GET /store/home\`, \`GET /store/categories\`, \`GET /store/products\`, \`GET /store/products/{product_id}\`, \`POST /store/cart\` and \`POST /store/checkout-link\`. \`/config\` must include \`store\`.

Optional: product reviews (\`GET /store/products/{product_id}/reviews\`, with \`store.reviews\` on) and the customer's orders (\`GET /me/orders\`, with \`features.orders\` on).

### Bookings apps

Required: \`GET /bookings/home\`, \`GET /bookings/categories\`, \`GET /bookings/services\`, \`GET /bookings/services/{service_id}\`, \`GET /bookings/availability\`, \`POST /bookings/appointments\`, \`GET /me/appointments\`, \`GET /me/appointments/{appointment_id}\` and \`POST /me/appointments/{appointment_id}/cancel\`. \`/config\` must include \`bookings\`.

### Optional for every app type

\`GET /pages\` and \`GET /pages/{slug}\` serve the app's bottom tabs and pages, in the shape the reference describes. The **Pages & look** editor in the Yallapp dashboard doesn't reach your own API: it publishes to apps that run on Yallapp and to WordPress sites through our plugin. So leave these out, and the app uses its built-in tabs and your home endpoint (when \`/pages\` answers 404), or serve tabs and pages your own system builds.

> Features you don't support: turn them off in \`/config\` and the app hides them. An endpoint the app doesn't need for your settings is never called.

## Start with GET /config

This is the smallest answer the app accepts for an Academy app. Store apps add \`store\`, Bookings apps add \`bookings\` (see the reference for their fields).

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
  "app": { "update_required": false, "maintenance": false }
}
~~~

- \`app.update_required\`: true makes the app ask people to update (compare the \`app_version\` the app sends).
- \`app.maintenance\`: true shows only \`app.maintenance_message\`.
- \`purchases.enroll_button\` must be false when \`platform=ios\`.

## The sign-in flow, simply

Your API decides how people sign in, and says so in \`/config\`, in \`auth\`:

- \`methods\`: \`["phone"]\`, \`["email"]\` or \`["phone", "email"]\`. Missing means \`["phone"]\`. With both, the app shows a **Phone / Email** switch.
- \`email_sign_in\`, required when \`methods\` has \`email\`: \`"code"\` (you email a 6-digit code: \`POST /auth/email/request\`) or \`"password"\` (the person types the password of their account with you: \`POST /auth/password\`).
- \`password_reset_url\`, with \`"password"\`: your page for a forgotten password. The app opens it from **Forgot your password?**.

Serve only the endpoints for what you offer: \`POST /auth/otp/request\` for phone, \`POST /auth/email/request\` for email with a code, \`POST /auth/password\` for email with a password.

~~~json
"auth": {
  "signup_allowed": true, "signup_fields": ["name"], "default_country_code": "+90",
  "methods": ["phone", "email"], "email_sign_in": "code"
}
~~~

### By phone, with a code

People sign in with their phone number and a code you send them. No passwords.

1. The app sends the number. You create a code, send it by SMS or WhatsApp, and answer with a \`request_id\`.
2. The person types the code. The app sends it with the \`request_id\` and a description of the device.
3. If the number has an account, you answer with two tokens and the user. If it doesn't, you answer with a \`signup_token\`, and the app asks for a name (and the other \`signup_fields\`) and calls \`/auth/register\`.
4. The app sends the **access token** on every signed-in call. It's short-lived (15 minutes is a good choice). When it expires, the app swaps the **refresh token** for new ones at \`/auth/refresh\`. Each refresh token works once.

Request a code:

~~~http
POST /auth/otp/request
Content-Type: application/json

{ "country_code": "+90", "phone": "5321234567" }
~~~

~~~json
{ "request_id": "c1f3a9", "code_length": 6, "resend_after_seconds": 60, "expires_in_seconds": 300 }
~~~

Verify it:

~~~http
POST /auth/otp/verify
Content-Type: application/json

{
  "request_id": "c1f3a9",
  "code": "481902",
  "device": { "id": "7d0c6c1e-5b0a-4c55-9a4e-2f4a6e0e6b11", "platform": "android", "name": "Pixel 8", "app_version": "1.0.0" }
}
~~~

An existing account:

~~~json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "r_6f2b0d...",
  "expires_in": 900,
  "user": { "id": 42, "name": "Sara Yilmaz", "phone": "+905321234567", "email": null, "city": null, "avatar_url": null }
}
~~~

A new number:

~~~json
{ "signup_required": true, "signup_token": "s_91ad...", "fields": ["name"] }
~~~

Refresh:

~~~http
POST /auth/refresh
Content-Type: application/json

{ "refresh_token": "r_6f2b0d..." }
~~~

~~~json
{ "access_token": "eyJhbGciOi...", "refresh_token": "r_a83c11...", "expires_in": 900 }
~~~

### By email

With \`"email_sign_in": "code"\`, the app sends the address and you email a 6-digit code, with the same rules and answer as a phone code. The person types it, and the app verifies it at \`POST /auth/otp/verify\` exactly as above. An address with no account gets a \`signup_token\`; \`/auth/register\` then asks the same details as a phone sign-up, without the email (you already have it).

~~~http
POST /auth/email/request
Content-Type: application/json

{ "email": "sara@example.com" }
~~~

~~~json
{ "request_id": "e7b210", "code_length": 6, "resend_after_seconds": 60, "expires_in_seconds": 300 }
~~~

With \`"email_sign_in": "password"\`, the app sends the address, the password and the device, and you answer with the same tokens and user as \`/auth/otp/verify\`. Only existing accounts sign in this way. Answer a wrong address and a wrong password with the same 400 \`invalid_credentials\`, so nobody can find out who has an account.

~~~http
POST /auth/password
Content-Type: application/json

{
  "email": "sara@example.com",
  "password": "…",
  "device": { "id": "7d0c6c1e-5b0a-4c55-9a4e-2f4a6e0e6b11", "platform": "ios", "name": "iPhone 16", "app_version": "1.0.0" }
}
~~~

Someone who signed up by email has no phone number: send \`"phone": null\` in their \`user\`. When you don't offer email sign-in, answer \`/auth/email/request\` and \`/auth/password\` with 403 \`method_not_allowed\` (or 404).

> Apple and Google reviewers must be able to sign in, and they can't receive your codes. Keep a test number, and a test email address when you offer email sign-in, that accept a fixed code with no message sent while your app is in review, and give them to the stores. When your app signs in by email only, the reviewers need the test email address: they can't use a number there. With \`"password"\`, give them a test account's email address and password.

## Let Yallapp sign people in

You can leave sign-in to Yallapp. In the dashboard, open **App sign-in** and choose **Yallapp signs people in**. The app's owner then chooses phone, email or both there, Yallapp sends the codes (from Yallapp's WhatsApp number and email address, or the owner's own), keeps the accounts, the store review number and the device limit, and deletes accounts when people ask. Your API serves the content and checks who is signed in.

How it works:

- The app sends sign-in, the account (\`GET\`, \`PATCH\` and \`DELETE /me\`) and the list of devices to Yallapp, and every other call to your API, with \`Authorization: Bearer\` and the access token Yallapp gave it.
- The access token is a JWT signed with **ES256** by a key pair of your app only. Only Yallapp holds the private key. The public keys are at your app's key set: **App sign-in › For your developer** shows its address, like \`https://yallapp.com.tr/api/app/{app_id}/.well-known/jwks.json\`.
- Access tokens last 15 minutes. When one expires, your API answers 401, and the app gets a new one from Yallapp and tries again.
- Serve none of the sign-in endpoints. Your \`/config\` doesn't need \`auth\` either: the app takes it from Yallapp.

The claims in each token:

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

- \`iss\`: always \`https://yallapp.com.tr\`. \`aud\`: your app's ID, shown on **App sign-in**, so a token of another app never works with yours.
- \`sub\`: the person's Yallapp user ID, as text. It never changes for that account.
- \`phone\` (E.164) and \`email\` come only when the person proved them with a code: \`phone\` for people who sign in by phone, \`email\` for people who sign in by email. An address typed at a phone sign-up is never in the token.
- \`name\`: as the person gave it. \`did\` is Yallapp's own; ignore it.

### Check the token in your API

On every signed-in call: take the token from the \`Authorization\` header, check its signature with the key named by its \`kid\` in the key set, and check \`iss\`, \`aud\` and \`exp\`. Answer 401 with \`{ "code": "invalid_token", "message": "…" }\` when anything is wrong or the token is missing. Cache the key set (we allow 5 minutes), and fetch it again when a token names a \`kid\` you don't have: the libraries below do both.

Node.js, with jose:

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

PHP, with firebase/php-jwt:

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

Python, with PyJWT:

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

### Your users and Yallapp's

Keep your own user for each Yallapp account, and find it by \`sub\`. The first time a \`sub\` comes:

- If your system already knows people, match the token's **proven** \`phone\` or \`email\` to the user you have with that number or address, and save the \`sub\` on them. Never match on anything else.
- Otherwise create a user with the \`sub\`, the \`name\` and what the token proves.

From then on, find them by \`sub\` only: people can change their name in the app, and \`sub\` stays the same. Each signed-in call works on that user's data: their courses, orders or appointments.

When someone deletes their account in the app, the app first calls your \`DELETE /me\` with their token, so you can delete what you keep about them (answer 204, or 404 when you keep nothing). Then Yallapp deletes their account, also when your API didn't answer, and sends your API a signed notice of it (below), so you can delete their data later even if that first call never reached you. Signing out, and removing a device in the app, end that device's sign-in at Yallapp: its tokens stop being renewed and stop working within 15 minutes.

### Account deletion notices

When a person deletes their account, Yallapp posts a notice to \`<your API address>/webhooks/yallapp\`. The body is a signed token (a Security Event Token), with \`Content-Type: application/secevent+jwt\`, signed with your app's key like its access tokens and checked with the same key set:

- \`typ\` (in the header): \`secevent+jwt\`. \`iss\`: \`https://yallapp.com.tr\`. \`aud\`: your app's ID followed by \`:events\`, so a notice never passes as an access token, and an access token never as a notice.
- \`sub\`: the person whose account was deleted. \`events\`: \`{ "account.deleted": {} }\`.
- \`jti\`: the notice's ID, also in the \`Yallapp-Delivery\` header. It stays the same when a notice is sent again: delete once, and answer 2xx to repeats.
- \`iat\` and \`exp\`: each try is signed again and works for 5 minutes.

Answer 2xx (202 or 204) once you have it. A 5xx, 408 or 429 answer, no answer within 10 seconds, or an API that can't be reached is tried again after 1, 5 and 30 minutes, then 2, 6, 12 and 24 hours. Any other answer (404 when you don't take notices yet) stops it. Notices aren't sent on through redirects. **App sign-in › For your developer** lists the notices of the last 30 days and how each went. The notice can arrive before or after your \`DELETE /me\`, or without it: delete the user by \`sub\` either way.

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

### Try it

**App sign-in › For your developer** has **Copy a test token**: an access token of your store review account, valid for 15 minutes, signed like the app's. Call a signed-in endpoint of your API with it, and without it:

~~~http
GET /me/courses
Authorization: Bearer eyJhbGciOiJFUzI1NiIs...
~~~

The live check does the same: with Yallapp signing people in, it checks that a signed-in call answers 401 without a token and 200 with a test token (when your app has a store review number or email address on **App sign-in**).

An app built before the owner chose Yallapp still sends sign-in to your API. The next build sends it to Yallapp. To switch the app people already have now, add this to your \`/config\`:

~~~json
"auth": { "provider": "yallapp", "base_url": "https://yallapp.com.tr/api/app/{app_id}" }
~~~

## Content, with an example

Lists are paged. The app sends \`page\` (from 1) and \`per_page\` (up to 50) and expects the page details next to the \`items\`:

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

A Store app's cart is priced by your API each time it changes. Nothing is saved:

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

Checkout (\`POST /store/checkout-link\`) answers with a link to your own checkout page, which the app opens. When the order is placed, send the customer to a page whose address contains \`order-received\` or \`thank_you\`, so the app knows the checkout is done.

## Errors

Every error is JSON with a stable \`code\` the app can act on and a \`message\` you can show to people, with the matching HTTP status:

~~~json
{ "code": "invalid_code", "message": "This code isn't right. Check it and try again." }
~~~

- 400 for a bad request (for example \`{}\` sent to \`/auth/otp/request\`)
- 401 when the access token is missing or expired: the app refreshes it and tries again
- 403 when something isn't allowed, for example \`device_limit_reached\` or \`purchase_not_allowed\`
- 404 when something doesn't exist
- 409 for a conflict, for example \`slot_taken\` or \`cart_changed\`
- 429 with \`retry_after_seconds\` when someone tries too often
- 503 with \`maintenance\` when you're down for maintenance

## Images and HTML

- Every image is a full https address. Use images at least as wide as a phone screen (about 1080 pixels for banners).
- Fields ending in \`_html\` and a lesson's \`html\` are HTML. Keep it simple: paragraphs, headings, lists, links, images, bold and italic. No scripts.
- Put each iframe of a lesson in the lesson's \`embeds\` list and leave a placeholder in its place in the HTML, as the reference describes. The app sizes it for the phone.
- When a lesson can't be shown natively, answer with \`render_mode: "webview"\` and a signed, expiring \`webview_url\` that the app opens instead.
- Prices are text you format yourself (\`formatted\`), plus the amount and currency.

## Test it with the live check

1. In your Yallapp dashboard, open **App setup** and the **Website** step.
2. Choose **My own API** and enter your base URL.
3. Select **Run the check**. We call your API the way the app does: \`/config\`, your app type's settings and your sign-in settings in it (\`auth.methods\` and \`auth.email_sign_in\`), your home endpoint, and the error shape of the sign-in endpoints you offer (\`POST /auth/otp/request\`, \`POST /auth/email/request\` or \`POST /auth/password\`) with an empty body. The dashboard's **App sign-in** page then shows how your API signs people in. When Yallapp signs people in, the check skips sign-in and checks your API's answers with and without a token instead.
4. Fix anything the check lists, run it again, then select **Save & continue**.

> The check is a quick start, not a full test. The [API reference](/developers) lists every field the app reads.

## Let the app preview reach your API

The **Preview your app** page of the dashboard runs your app in a web browser, on yallapp.com.tr. A browser lets it call your API only when your API allows requests from that address (cross-origin requests). Without that, the preview says it couldn't reach your app's content; the installed app isn't affected.

Answer requests that come with \`Origin: https://yallapp.com.tr\` with these headers, and answer the browser's \`OPTIONS\` requests with 204 and the same headers:

~~~http
Access-Control-Allow-Origin: https://yallapp.com.tr
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept-Language
Access-Control-Max-Age: 600
Vary: Origin
~~~

The preview never sends sign-in codes. To let your client try the signed-in screens there, support preview sign-in:

- When \`POST /auth/otp/request\` comes with \`"preview": true\`, send no code. Accept only your store review number (with its fixed code at \`/auth/otp/verify\`), and answer any other number with 403 and the code \`preview_review_number_only\`.
- Then set \`auth.preview_sign_in\` to \`true\` in \`/config\`. Without it, the preview says signing in works in the installed app.

## Checklist before you submit

- Every required endpoint for your app type answers over https, with JSON
- \`/config\` passes the live check and turns off what you don't support
- Sign-in works end to end for each method in \`auth.methods\`, including a new number (or email address), refresh and sign-out. When Yallapp signs people in: your API accepts a test token, and finds or creates the user by \`sub\`
- Signed-in calls answer 401 with an expired token, and refresh works once per refresh token
- Deleting the account (\`DELETE /me\`) works, as Apple and Google require. When Yallapp signs people in: your API takes the signed notice at \`/webhooks/yallapp\` and deletes the user by \`sub\`
- On iOS, no paid digital content offers a purchase
- A test number with a fixed code works for store reviewers, and a test email address too when you offer email sign-in
- The app preview reaches your API: requests from https://yallapp.com.tr are allowed
- Lists are paged and stay fast with \`per_page\` set to 50

---

The full reference, with every endpoint, field and error code, is on the [API reference](/developers) page; you can also download it as an [OpenAPI file](/developers/openapi.yaml). Your next build talks to your API; if you change the address later, the next build uses the new one.
`;
