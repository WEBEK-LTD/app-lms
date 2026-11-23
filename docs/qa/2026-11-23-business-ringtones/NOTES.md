# QA 2026-11-23: Yallapp Business 1.0.4, ringtones (Phase 206)

Branch `wip-business-1-0-4`. The pictures are drawn by the widget tests on
the demo's data with the app's own fonts, 400 × 860 logical pixels at 2x:

    cd business
    YB_SHOTS_DIR=<dir> flutter test test/widget/phase206_shots_test.dart

The test framework draws shadows as solid black outlines (Flutter's
`debugDisableShadows` in tests): the black frame round the ringing card is
its shadow on a phone.

| Picture | What it shows |
|---|---|
| `ringtones-en-light.png`, `ringtones-en-dark.png` | Settings › Ringtones: the help and Test ring on top, then Sounds (New orders: Counter bell; New bookings: Doorbell; Cancelled orders: Knock; Messages and reviews: Pop; Everything else: Phone's sound), each with what it covers; Ringing starts below |
| `ringtones-ar-light.png`, `ringtones-ar-dark.png` | The same in Arabic, right to left: the back arrow and the chevrons turned round, the icons on the right |
| `ringtones-orders-*.png` | A group's sounds (New orders): Yallapp's seventeen ringtones each with Play, the chosen one checked and marked Chosen; Phone's sound and Silent under Other further down |
| `ringing-*.png` | A new order while the app is open: the card over Today with the push's title and body, Silence and Open, in the accent's border; the ring goes on until one of them (or the minutes chosen) |
| `order-ship-button-en-light.png` | An order with something to ship: the Shipping section with Mark as shipped |
| `order-ship-sheet-en-light.png` | The sheet: Carrier, Tracking number or waybill, Tracking link, Mark as shipped; the customer is emailed |

Not seen here: a real notification on a phone (Android's ringing notification
with Silence, iOS's bundled sound). Those need a device with a build that has
Yallapp Business's Firebase options; see the checks in docs/ROADMAP.md
Phase 206.
