# Customer ↔ courier contact (Phase 184), 18 November 2026

Designs for the owner's approval before any screen is built: the three ways a
customer and their order's courier reach each other (chat, an in-app call over
the internet, a masked phone call), Yallapp Courier's side, and the
dashboard's Settings › Calls. Nothing here is product code.

## The look

- The customer's screens use the marketplace's kit as it is
  (`kit/kit.css`, `kit/kit.js`, `kit/dash.css`, copied unchanged from
  `docs/design/2026-11-18-marketplace` on `wip-marketplace-designs`): Zad's
  look A, its order and tracking screen (05b) and its support chat (06b).
  `kit/contact.css` adds the contact buttons, the chat and the call screens.
- Yallapp Courier's screens use Yallapp's own look, the courier build's
  branding (`mobile/build/yallapp-courier.json`: midnight `#0E0D24`, ivory,
  Bricolage Grotesque), with the company's name and logo at the top
  (`kit/courier.css`).
- The dashboard uses Yallapp's dashboard tokens and fonts (`kit/dash.css`)
  and the sidebar of the marketplace's screens 11 and 12 (`kit/dash-side.js`).
- Icons: Material Symbols Rounded only. The map is drawn by hand in SVG, with
  no map tiles. No photos.
- Arabic: the app's screens in Modern Standard Arabic, the dashboard's new
  words in Egyptian Arabic as the brief asks. The existing nav items keep
  their current wording.
- Names are Zad's demo: Mona the customer, Karim the courier, Samir the
  picker, order #4821. The owner's Twilio number, `+1 415 555 0142`, is a
  reserved fictional number.

## The screens

| # | Screen | Variants |
|---|---|---|
| 1 | The order on its way: the courier's card with the contact buttons (Chat with its unread count, App call, Phone call) and "Karim never sees your number" | `all` (the three ways on), `chat` (only chat on), `after` (delivered: chat only, until 2 hours after) |
| 2 | The order's chat: quick replies, a shared location, "read" ticks, "Read by Karim", the call buttons at the top | `open`, `closed` (the window has ended: read-only, support one tap away) |
| 3 | An in-app call | `calling`, `connected` (speaker, mute, chat, end), `failed` ("couldn't connect" with Chat and Try again) |
| 4 | An incoming in-app call with the app closed | `android` (the full-screen call notification over the lock screen), `iphone` (CallKit's own screen: the app gives only the name and role) |
| 5 | A masked phone call (the click-to-call bridge): "We're calling your phone now", the owner's number it comes from, then connecting to Karim | `ringing`, `error` (a plain message, Chat and App call offered) |
| 6 | Yallapp Courier, a market job: the customer's first name, the three ways, no number | `job`, `push` (a chat push on the job) |
| 7 | Yallapp Courier, the chat with the customer: the courier's quick replies ("I'm at the door", "I'm downstairs", "Call me", "5 minutes away") and the location button | |
| 8 | Dashboard › Settings › Calls: the three switches, the TURN choice for app calls, the Twilio fields, Test the connection | `setup` (nothing set: phone calls can't be switched on yet), `saved` (masked, test passed, the last 30 days), `error` (wrong number and low balance, phone calls paused) |
| 9 | Dashboard, an order: support reads the customer and courier chat (read only) and the order's calls | |

PNGs are in `png/` (76 of them), named
`<screen>[-<variant>]-<en|ar>-<light|dark>.png`. Phones are 390×844 and the
dashboard 1440×1024, both at deviceScaleFactor 2. To render them again, run
`node docs/design/2026-11-18-contact/render.mjs [screen-prefix…]`.

## Decisions these screens assume (for the owner to confirm)

1. **One chat per order, two people.** Only the order's customer and its
   courier write. The store and its staff never see it, and support reads it
   from the order (read only, screen 9). It opens when a courier is assigned
   and closes 2 hours after delivery. After that it stays readable to both,
   with "Contact support" in place of the composer.
2. **What each side sees.** First names only: the customer sees "Karim · your
   courier" and the courier sees "Mona". Neither side ever sees a number,
   including in the dashboard's call log.
3. **Quick replies.** The customer's are "Leave it at the door", "Call me" and
   "Share location". The courier's are "I'm at the door", "I'm downstairs",
   "Call me" and "5 minutes away". Quick replies are sent as codes, so each
   side reads them in its own language.
4. **Calls only while the order is on its way.** Both call buttons disappear
   at delivery, a cancellation or a failed delivery. Chat stays until the
   window ends.
5. **The masked call rings the caller first.** It rings the number on the
   caller's account (the customer's sign-in number and the courier's number
   in Couriers). Without a phone number on the account, the Phone call button
   isn't shown.
6. **A failed phone call pauses phone calls.** An account or balance error
   from Twilio switches phone calls off for the app. Customers and couriers
   then see chat, and the dashboard says why (screen 8, `error`). They come
   back on when the test passes again.
7. **Calls aren't recorded,** and chats are kept with the order's other data.
8. **The default ways.** Chat is on by default. App calls and phone calls are
   off until the owner switches them on, and phone calls need a passing
   Twilio test first.
