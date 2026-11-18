# KechFlora (Leqaa signature template, look B): QA report, 18 Nov 2026

The tester set up the app as an owner would, then tested it in the web preview (`/preview-app/`) on phone-sized screens. The KechFlora app is the flower-shop template's look B ("Botanical press").

## Set-up, as tested

- **Platform:** the e2e set-up from `platform/web/playwright.config.ts`.
  - `next build`, then `next start` on port 3210, with exactly the config's `webServer.env`: memory store, file blobs and the e2e secrets.
  - Fakes run locally: the day's rates (port 3288, with the same rate table as `world-currencies.spec.ts`), Stripe (`startFakeStripe`, port 3292) and the WhatsApp code webhook (port 3299).
  - No production system or real keys were used.
- **Commit under test:** `main` at `14b2dcf`. `mobile/tool/build_preview.sh --check` reports that the committed preview build is up to date.
- **Owner:** signed up at `/sign-up`.
  - A super admin activated the account on Studio plan 1 and pressed Admin › Settings › Currencies › Refresh now.
  - The owner went to `/start?for=studio`, chose Flower shop › Look B · Botanical press › Start with this app, and named the app **KechFlora**.
- **Shop set-up in the dashboard:**
  - Currency: **MAD**. Customers' currencies: on, with all currencies allowed (Phase 149).
  - The 13 template samples were removed with "Remove all samples".
  - **9 categories:** Bouquets, Roses, Plants & orchids, Gift add-ons, Love, Birthday, Sympathy, New baby, Congratulations.
  - **13 products** with photos from `public/flower-photos`. Three of them are add-on only: Safi Ceramic Vase, Atelier Gift Box and Loose Stems.
  - **Delivery:** delivery days on, cut-off 15:00, Africa/Casablanca, 14 days ahead. Slots 10–13 (capacity 10), 13–16, and 16–20 (+MAD 30).
  - **Gifts:** card message, starters, recipient, and "Send anonymously".
  - **Offers:** flash sale "Weekend roses" (−20% on 4 bouquets, 12 units) and coupon `KECH10` (10%, minimum MAD 200, shown in the app).
  - **Payments:** Stripe test keys, using the fake Stripe.
  - **Sign-in:** each method was switched on in turn under App sign-in. The default country code was set to 212, and a store review number was added.
- **Studio edits, then Publish:**
  - The headline "Who are the flowers for?" was changed to "Who are the flowers for today?".
  - "Kind words" quote 1 was changed to Nadia El Amrani / Marrakech.
  - The tap action on the "Love" chip was set to Opens: Bouquets.
  - The wordmark's width could not be set to Fill (see Notes).
- **App:** opened from the dashboard's Preview (`/studio/project/preview`, the "Preview your app" page) as `/preview-app/index.html?token=…`.
  - Viewports 360×800, 390×844 and 412×915, as touch devices.
  - Languages: `lang=en` and `lang=ar`, plus the in-app language switch.
  - Themes: `theme=light` and `theme=dark`.
  - Larger text: the root font size was set to 20px or 24px (1.25× / 1.5×), which Flutter web reads as the text scale. Chrome's own zoom can't be driven headless.
- **Screenshots:** taken at deviceScaleFactor 2, saved as JPEG in `shots/`. Only screenshots that show bugs are included.

**Severity:** a blocker stops a customer, a major is wrong or clearly broken for a customer, a minor is cosmetic or an edge case.

**Tag:** the known fix it most likely belongs to, or **NEW**.

---

## Bugs

### 1. "Kind words" in Arabic shows the template's placeholders, not the owner's edited testimonial — major · 156

- **Where:** Home, at the bottom. 390×844, Arabic, light and dark (also with the in-app switch to Arabic).
- **Steps:**
  1. In Studio (EN), edit Kind words quote 1, then Publish.
  2. Open the preview with `lang=ar`, or switch Settings › Language › العربية.
  3. Scroll to "كلمات طيبة".
- **Expected:** the owner's quote, name and city.
- **Actual:** "[رأي أحد العملاء فيك]", "[اسم العميل]", "[ما أرسله]" and an avatar showing "]". English shows the edit.
- **Screenshot:** `shots/01-kind-words-ar-placeholders.jpg` (EN on the left, AR on the right)
- **Likely cause:** the edit is saved for the editing language only, and the AR text keeps the template's bracket placeholders (`app-words`, `lqTestimonial*`). Nothing falls back to, or flags, the untranslated edit.

### 2. Template placeholder testimonial is published to customers in English too — major · NEW

- **Where:** Home › Kind words. 390×844, EN, light.
- **Steps:** publish the template with only quote 1 edited, then scroll to Kind words.
- **Expected:** a quote still holding its "[…]" placeholder is hidden in the app, or Publish warns about it.
- **Actual:** the second card shows "[Another customer's words]", "[Customer name]", "[What they sent]" and an avatar "[".
- **Screenshot:** `shots/02-kind-words-en-placeholder-card.jpg`
- **Also visible there:** the outer white container of Kind words runs edge to edge, so its rounded border is cut at both screen edges.

### 3. "Send today" shows Leqaa's Cairo cut-off, not KechFlora's — major · NEW

- **Where:** Home. All viewports, EN and AR.
- **Steps:** set the shop's same-day cut-off to 15:00 (Africa/Casablanca), then open Home.
- **Expected:** the shop's own cut-off and city, or the owner's words.
- **Actual:** "Order before 4 pm and it arrives today, anywhere in Cairo." In Arabic: "…في القاهرة".
  - The cart shows the real rule: "Order by 15:00 for delivery today".
- **Screenshot:** `shots/03-send-today-cairo-4pm.jpg`
- **Likely cause:** a project started from the demo gets the demo's fact `lqCutoff` (`platform/web/src/lib/studio/demo-templates.ts:300`), instead of the bracketed prompt (`app-words.ts:827`) or the shop's `same_day_cutoff`.

### 4. Home collections and "The edit" are the template's, and open the unfiltered shop — major · 157

- **Where:** Home › The edit (01 In season / 02 Roses / 03 Signature bouquets) and Collections (Roses / Tulips / Plants / Gift sets / Signature bouquets). 390×844, EN and AR.
- **Steps:**
  1. Remove the samples and create your own categories.
  2. Open Home and tap "Roses" under Collections, or the 01/02 tile of The edit.
- **Expected:** the tiles are the shop's categories, and each opens its own category.
- **Actual:**
  - The template's names and photos stay. "Tulips", "Gift sets", "In season" and "Signature bouquets" don't exist in this shop.
  - Every tile opens Bouquets with **All** selected, including "Roses", which exists.
- **Screenshot:** `shots/04-collections-template-unfiltered.jpg`
- **Likely cause:** every entry's action is the generic `shop` (`const shop = screen("search")` at `leqaa-signature.ts:104`, used at `leqaa-signature.ts:562` for the collection entries) rather than a category.

### 5. A story's "Open"/"افتح" doesn't open its occasion — major · 161

- **Where:** Bouquets › story rings (Love, Birthday, Sympathy, New baby, Congratulations). 390×844, EN and AR.
- **Steps:** tap the Love ring, then tap **Open**.
- **Expected:** the Love category (it exists, with 2 products).
- **Actual:** the stories close and Bouquets stays on **All**. This happens for all five stories, and for "افتح" in Arabic.
- **Screenshot:** `shots/05-story-open-unfiltered.jpg`
- **Likely cause:** every slide gets `action: shop` (`leqaa-signature.ts:234`, in `occasionStories`).
- **Stories (165):** the rings are the template's own slides and photos. This test did not edit stories in the dashboard.

### 6. "Build your bouquet › Start" on Home doesn't open the bouquet builder — major · 162

- **Where:** Home. 390×844, EN.
- **Steps:** scroll to "Build your bouquet" and tap **Start**.
- **Expected:** the "Our bouquet" page.
- **Actual:** the plain Bouquets list.
- **Screenshot:** `shots/06-build-your-bouquet-start.jpg`
- **Likely cause:** its button's action is `shop` (`leqaa-signature.ts:619`).

### 7. "Our bouquet" is the template's sample, without prices, and "Choose this bouquet" does nothing useful — major · 162

- **Where:** Bouquets › Our bouquet. 390×844, EN.
- **Steps:** open Our bouquet, pick Classic/Deluxe/Grand, then tap **Choose this bouquet**.
- **Expected:**
  - The shop's own bouquet.
  - Each size with its price.
  - "Choose" adds that bouquet and size to the cart, or opens its product.
- **Actual:**
  - "The signature bouquet · Blush Garden — Blush roses, lisianthus and eucalyptus". This sample was removed from the shop.
  - The sizes show no price.
  - "Choose this bouquet" returns to the unfiltered Bouquets list, and nothing is added.
- **Screenshot:** `shots/07-our-bouquet-template.jpg`
- **Likely cause:** the title comes from the demo fact `lqBouquetTitle` (`demo-templates.ts:301`), and the button is `heroButton(ctx, "lqChoose", shop, …)` (`leqaa-signature.ts:842`).

### 8. Look B is built with look A's burgundy as the main colour — major · NEW

- **Where:** all screens. All viewports, light and dark.
- **Steps:** at `/start/flowers`, choose Look B, then Start with this app, and create the app without touching the colour.
- **Expected:** look B's own main colour, the green `#2F5D50` (`LEQAA_B` `project.primary`).
- **Actual:** the app's `primary_color` is `#8E2445` (look A).
  - In burgundy: Add to cart, Checkout, the selected chips, empty-state circles, the Account header and avatar, and the journey dots.
  - Look B's green stays on the bar, the flash sale and the cards.
  - Admin › client also shows "Look #8E2445 · classic template".
- **Screenshot:** `shots/08-look-b-burgundy-primary.jpg`
- **Likely cause:**
  - The make form's default colour is always `brand.primaryColor` (`platform/web/src/app/start/[demo]/make/page.tsx:52`).
  - That colour then overrides the look's own primary through `extra.primaryColor: input.colour` (`platform/web/src/lib/demo/start.ts:121`), over `project?.primary` in `new-project.ts:67`.

### 9. "Log out" is hidden under the bottom bar, and Account doesn't scroll — major · 160 / 163

- **Where:** Account.
  - 360×800, EN: fully hidden.
  - 390×844, EN: half hidden.
  - 360×800, AR, root font 20px: fully hidden.
- **Steps:** sign in, open Account, and try to scroll to "Log out".
- **Expected:** "Log out" can be reached above the floating bar.
- **Actual:** the page doesn't scroll, and the last row is under the bar. Settings has no sign-out either.
  - Sign-out works when it's visible (390×844: confirm dialog, then back to the sign-in screen).
- **Screenshot:** `shots/09-log-out-under-bar.jpg`

### 10. The end of the product list sits under the bottom bar — minor · 158

- **Where:** Bouquets list, scrolled to the end. 390×844, EN.
- **Expected:** bottom padding above the floating bar.
- **Actual:** the last row's countdown and the card bottoms are under the bar.
- **Screenshot:** `shots/10-list-end-under-bar.jpg`
- **Also:** the countdown on cards reads "Ends in 2d 23 25 54", with no h/m/s separators (minor, NEW).

### 11. The sort sheet is drawn under the floating bottom bar — minor · 158

- **Where:** Bouquets › sort. 390×844 EN, and 360×800 AR at root font 20px.
- **Steps:** tap the sort button.
- **Expected:** the sheet sits above the bar, or the bar is dimmed behind the barrier.
- **Actual:**
  - The bar stays on top and isn't dimmed.
  - At 360 AR with larger text, the last option "الاسم" (Name) is half behind it.
  - Choosing an option does apply the sort ("Price: low to high" was checked).
- **Screenshot:** `shots/11-sort-sheet-under-bar.jpg`
- **Also:** "Top rated" is offered although reviews are off (`features.reviews: false`). Minor, NEW.

### 12. Larger text breaks Home — major · 163

- **Where:** Home. 412×915, EN, root font 24px (1.5×).
- **Actual:**
  - The owner's headline is cut: "Who are the flowers for to…".
  - The flash countdown is clipped at the edge ("29 S").
  - Prices break mid-number: "MAD 488.0" / "0".
  - "Pick a da…" is cut.
- **Screenshot:** `shots/12-large-text-home.jpg`

### 13. Larger text truncates labels across the app — minor · 163

- **Where:** Bouquets, Account and the bottom bar. 412×915, EN, 1.5×.
- **Actual:** truncated labels include "Find the right flow…", "Birth…", "Symp…", "New b…", "Cong…", "Notificatio…" and "Bouque…" in the bottom bar.
- **Screenshot:** `shots/13-large-text-labels.jpg`

### 14. Prices switch between the customer's currency and MAD from screen to screen — major · 161

- **Where:** 390×844, EN. The customer's region currency was USD, and later SAR was chosen in Settings › Currency.
- **Actual:**
  - Bouquets cards show **only** "≈ $75.76". The shop's MAD price isn't on the card.
  - The product page shows "≈ $36.36" with "MAD 360.00" under it, but its add-ons show only "+MAD 60.00".
  - Home's flash sale and "The price list" show only MAD.
  - "Your picks" shows only MAD even after SAR was chosen.
  - The cart, checkout summary, payment page and order show MAD with "≈ SAR … · you pay MAD …". That part is consistent and correct: MAD 462.00 ≈ SAR 175.00.
- **Expected:** one rule everywhere. Either always the shop's price with the ≈ in the customer's currency, or the same pairing as the product page.
- **Screenshot:** `shots/14-currency-mixed.jpg`

### 15. The "Added to cart" snackbar covers Checkout in the cart — minor · NEW

- **Where:** Product › Add to cart › View cart. 390×844, EN.
- **Actual:** the snackbar ("Added to cart · View cart") follows into the cart and sits over the Checkout button and the bar's message until it times out.
- **Screenshot:** `shots/15-snackbar-over-checkout.jpg`

### 16. The order's own page doesn't add up, and leaves out the gift details — major · NEW

- **Where:** Orders › Order #1047 (also opened from its notification). 390×844, EN.
- **Steps:** place a gift order (paid through the fake Stripe), then open it in the app.
- **Expected:** subtotal, coupon −48.00, delivery +30.00, total 462.00, plus the delivery day and slot, the recipient and the card message.
- **Actual:**
  - Atlas Rose Bouquet MAD 360.00 and Safi Ceramic Vase MAD 120.00, then **Total MAD 462.00**. There are no discount or fee lines, so the lines don't add up.
  - No day or slot (Wed 18 Nov, 16:00–20:00), no recipient and no card text.
  - The dashboard's order shows all of these correctly.
- **Screenshot:** `shots/16-order-detail-totals.jpg`

### 17. The live journey forgets the order once it's delivered — minor · NEW

- **Where:** Orders › "How your flowers travel". 390×844, EN.
- **Steps:** in the dashboard, mark the order preparing, then shipped (courier Hamid), then delivered.
- **Expected:** "Delivered" is reached, with the order number.
  - Preparing showed "Arranged" ✓.
  - Shipped showed "On its way", with "Call the courier" and a notification ✓.
- **Actual:** after "Mark delivered", the card falls back to the generic journey with step 1 "Order placed" highlighted and no order number.
  - The same generic card, with step 1 highlighted, is shown when there are no orders at all.
- **Screenshot:** `shots/17-journey-reset-after-delivery.jpg` (shipped on the left, delivered on the right)

### 18. The Orders tab opens as a page and the bottom bar disappears — minor · NEW

- **Where:** tap "Orders" in the bottom bar while signed in. 390×844, EN.
- **Actual:** Orders opens with a Back arrow and no bottom bar, unlike the other tabs.
- **Screenshot:** `shots/18-orders-tab-no-bar.jpg`

### 19. The gift checkout doesn't fill in a signed-in customer's details — minor · NEW

- **Where:** Send (cart) › 1 From. 390×844, EN, signed in as Yasmine Tazi, +212 600 000 001.
- **Actual:** "Your name", "Your phone" and "Your email" are empty and must be typed again. They aren't kept after reopening the app either.
- **Screenshot:** `shots/19-gift-sender-not-prefilled.jpg`

### 20. The payment page asks for name, phone, email, city and address again — minor · NEW

- **Where:** `/pay/<token>` from the gift checkout. Phone width, EN.
- **Steps:** create the checkout link with the sender and recipient, as the app sends them, then open it.
- **Actual:** Full name, Mobile number, Email, City and Address are all required again, although the order already has the sender and the recipient's address.
  - After that, Pay MAD 462.00, then "Pay with test card" on the fake Stripe, ends at "Thank you! Your order 1047 is placed and paid" ✓.
- **Screenshot:** `shots/20-pay-page-asks-again.jpg`

### 21. The preview's sign-in ignores the sign-in methods the owner chose — minor · 160

- **Where:** Sign-in in the preview, at any size.
- **Steps:**
  1. Under App sign-in, turn on only "Email address and password". Later, each of the other methods in turn.
  2. Open the preview.
- **Expected:** the owner sees the sign-in their customers will get.
- **Actual:**
  - It's always "Mobile number + Send code", with the note "This is a preview. Sign in with your app's store review number…".
  - With no review number set, the owner can't sign in at all.
  - Email or username sign-in and Forgot password can't be seen in the preview.
  - The design is deliberate (`mobile/lib/modules/shared/auth/sign_in_screen.dart:75-96`), but it hides the real screen.
- **Screenshot:** `shots/21-preview-sign-in-phone-only.jpg`
- **Also (dashboard):** a MAD/Morocco shop starts with the default country code **90** (Türkiye) under App sign-in › rules.

### 22. An add-on-only product can be opened and offered on its own — minor · NEW

- **Where:**
  - Orders › tap "Safi Ceramic Vase".
  - Your picks › Lately viewed lists Safi Ceramic Vase too.
  - 390×844, EN.
- **Expected:** a product set to "Sell only as an add-on" is never listed or bought alone.
- **Actual:** it opens a normal product page with **Add to cart**.
  - The server refuses it alone (`POST /store/cart` returns `addon_needs_item`), so the customer only finds out later. This test checked the API reply, not the app's message for it.
- **Screenshot:** `shots/22-addon-sold-alone.jpg`

### 23. In Arabic, the owner's edited headline is replaced by the template's — minor · 156

- **Where:** Home, after Settings › Language › العربية (or `lang=ar`). 390×844.
- **Actual:** "لمن هذه الزهور؟" is the template line. The owner changed the EN line to "…for today?", and nothing marks the AR text as out of date.
- **Screenshot:** `shots/23-ar-headline-not-edited.jpg`

### 24. Dark mode: the flash-sale countdown and badge have low contrast — minor · NEW

- **Where:** Product page. 390×844, EN, dark.
- **Actual:** pale text on green chips ("02 Days 22 Hours …"), and a pale "−20%" badge.
- **Screenshot:** `shots/24-dark-countdown-contrast.jpg`

### 25. Arabic: the add-on prices show the plus sign on the wrong side — minor · NEW

- **Where:** Cart › "أضف لمسة إضافية". 360×800, AR.
- **Actual:** "MAD 60.00+" (the "+" at the end of the amount in RTL).
- **Screenshot:** `shots/25-ar-addon-plus-sign.jpg`

---

## Tested and working

- **Install, build and run.** `npm ci` and `next build` passed, and the e2e server started from the config's env. The preview build matches the app sources.
- **Owner journey:**
  - Sign-up; `/start?for=studio` › Flower shop › Look B; naming the app.
  - Admin activation, and the rates refresh with the fake source.
  - Currency set to MAD; customers' currencies on.
  - Categories added, and products with photos (13).
  - Add-on products; flash sale (on now, "Only 12 left", later "11 left" after one sold); the KECH10 coupon.
  - Delivery days and slots with a slot fee and capacity; gifts and card options; Stripe keys.
  - Each sign-in method saved, and the rules saved.
- **Studio:** the text edit, the testimonial edit (EN) and the tap action reached the published app; Publish worked.
- **Home:**
  - The top row: search, wordmark and bag. The bag sits at the far edge in both directions: 12px from the right edge in EN, at the left edge in AR.
  - Occasion chips; the flash sale (prices −20%, countdown, units left); The edit carousel; the Send today day chips; From the atelier; The price list; the Build your bouquet card; the marquee (EN and AR); dark mode.
- **Bouquets:**
  - Category chips filter correctly: Bouquets 4, Roses 1, Plants 2, Love 2, Birthday 4, Sympathy 1, New baby 2, Congratulations 4, On sale. The add-on category is hidden.
  - Sort (Price low to high applies); search ("rose" finds Majorelle Blush and Atlas Rose Bouquet); the list scrolls to the last product.
- **Product page:** photos, flash-sale box, stock, quantity, "Add a little more" add-ons, description, "You may also like", Share and Cart buttons.
- **Cart and gift checkout:**
  - Quantity; add-ons as their own lines ("With Atlas Rose Bouquet").
  - From / For / When / Message steps with the stepper; Today with slots (16:00–20:00 +MAD 30.00); occasions and ready messages; Send anonymously.
  - Coupon KECH10 applied (−10%); totals; the "≈ SAR … · you pay MAD …" line with the rates' source.
  - In the preview, Checkout shows "Checkout and payments work in the installed app…" (by design). The same order then went through the API with the customer's session: payment page, fake Stripe, "Thank you! Your order 1047 is placed and paid".
- **Orders:**
  - The empty state, and the order list with its status.
  - The live journey through placed, arranged and on its way.
  - The notification "Order 1047 · Your order is on its way" opens the order with "Courier: Hamid · Call the courier".
  - Receipt download link shown.
- **Account and Settings:** profile; My orders; Notifications; Settings (Currency picker: MAD to SAR re-prices to ≈ SAR 284.09 for MAD 750 ✓; Language picker switches to Arabic RTL; Appearance; Change password; Devices; Delete account); Log out at 390 (confirm dialog, then back to sign-in).
- **Sign-in in the preview:**
  - The review number and code, then "Create your account" (name, email, password ×2), then signed in.
  - The country code defaults to +212 once it's set.
- **Your picks:** Lately viewed and Picked for you.
- **RTL:** mirrored layouts, the bottom bar order, the cart stepper, and the arrows ("ابدأ ←", "افتح").
- **Console:** no errors or page errors from the app across all runs. Only Chromium's WebGL "GPU stall" performance warnings were logged.

## Not tested, or not possible in the preview

- **Real payment inside the app:** the preview never takes payments (`mobile/lib/core/api/yallapp_api.dart:2604`). The payment was tested through the same API call instead, with the customer's session.
- **Sign-up and sign-in with email/password, username, or phone/password, and "Forgot password":** the preview signs in only the store review number by phone code (bug 21).
  - So where "Forgot password" leads was not tested.
  - Sign-out was tested.
- **Wishlist:** there is no save or heart action in this app (`features.wishlist: false`). "Your picks" is Lately viewed plus Picked for you.
- **Filter sheet with "Apply":** look B has only the sort sheet, which applies when an option is tapped. There is no filter sheet with an Apply button to scroll to the end of.
- **Map pin:** the shop delivers to every country at one flat price, so the gift checkout's address is a text field. Tapping its pin icon opened nothing; a map is only expected with "By distance" shipping, which wasn't set up.
- **Stories from the dashboard (165):** only the template's stories were tested.
- **The Studio "wordmark Width Fill" edit:** look B's home has no cover top row. Its petal header's "Logo" and "Icons" rows in Layers can't be selected, so no Width control exists for the wordmark. The Studio tester may want to confirm this.
- **Browser zoom 125–150%:** emulated with the root font size (Flutter web's text scale), not real Chrome zoom.

## Notes for the other testers (Studio and dashboard, outside this app)

- Clicking the **Layers** tile in Studio › Elements adds a "Layers" element (a 160px burgundy card) to the page. It doesn't open the Layers panel.
  - This test added 8 of them by accident, saw them as empty burgundy blocks at the bottom of the app, then removed them and published again before testing.
- The Studio editor logs `Failed to load resource: 503` four times on load (seen before and after activation).
- The Studio canvas showed "Your app has Leqaa's 0 products" in First steps.
- **Dashboard:**
  - "Remove all samples" removes the 13 products at once, with no confirmation.
  - Orders lists order 1047 as "1 item", but it has 2 lines (the bouquet and its add-on).
