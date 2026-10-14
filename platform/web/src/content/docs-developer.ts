/**
 * The "My own API" developer guide (/docs/my-own-api), in the Markdown of
 * lib/content/markdown.ts. The examples follow docs/api/openapi.yaml, the
 * public contract: change them with it. ~~~ fences are code blocks.
 */
export const DEVELOPER_GUIDE = `This guide is for the developer who connects a website that doesn't run on one of our supported platforms. Your app talks to one API, the **Yallapp API**. On WordPress our plugin serves it; here, your website serves the same endpoints, and the app works with them unchanged. You don't need to know anything else about Yallapp.

## Before you start

- A developer who can add endpoints to your website or backend
- An https address for the API, for example https://api.your-site.com/yallapp/v1, reachable from the public internet
- A way to send a one-time code by SMS or WhatsApp to your users
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
2. Sign-in: \`POST /auth/otp/request\`, \`POST /auth/otp/verify\`, \`POST /auth/register\`, \`POST /auth/refresh\`, \`POST /auth/logout\`.
3. The account: \`GET\`, \`PATCH\` and \`DELETE /me\`, \`GET /me/devices\`, \`DELETE /me/devices/{device_id}\`, \`PUT /me/push-token\`, \`GET /me/notifications\` and \`POST /me/notifications/read\`.
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

\`GET /pages\` and \`GET /pages/{slug}\` serve the pages built in the Yallapp dashboard. You can leave them out: when \`/pages\` answers 404, the app uses its built-in tabs and your home endpoint.

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
  "auth": { "signup_allowed": true, "signup_fields": ["name"], "default_country_code": "+90" },
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

> Apple and Google reviewers must be able to sign in. Keep a test number that accepts a fixed code while your app is in review, and give both to the stores.

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
3. Select **Run the check**. We call your API the way the app does: \`/config\`, your app type's settings in it, your home endpoint, and the error shape of \`POST /auth/otp/request\` with an empty body.
4. Fix anything the check lists, run it again, then select **Save & continue**.

> The check is a quick start, not a full test. The [API reference](/developers) lists every field the app reads.

## Checklist before you submit

- Every required endpoint for your app type answers over https, with JSON
- \`/config\` passes the live check and turns off what you don't support
- Sign-in works end to end, including a new number, refresh and sign-out
- Signed-in calls answer 401 with an expired token, and refresh works once per refresh token
- Deleting the account (\`DELETE /me\`) works, as Apple and Google require
- On iOS, no paid digital content offers a purchase
- A test number with a fixed code works for store reviewers
- Lists are paged and stay fast with \`per_page\` set to 50

---

The full reference, with every endpoint, field and error code, is on the [API reference](/developers) page; you can also download it as an [OpenAPI file](/developers/openapi.yaml). Your next build talks to your API; if you change the address later, the next build uses the new one.
`;
