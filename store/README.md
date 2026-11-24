# Yallapp Community: store screenshot sets (draft)

Draft screenshots for the App Store and Google Play. Nothing is uploaded;
the owner approves first.

They come from the demo build (`YC_DEMO=true`, sample members and content)
of `wip-community-app` merged with area E's `wip-community-app-features`,
so the Q&A and Learn screens are E's real screens. Each is drawn by
`community/test/shots/store_shots_test.dart` with the bundled fonts, full
bleed. The status bar and home indicator are left to the phone: the shots
have the bars' space but no fake bar drawn in it.

| Set | Size | Phone |
| --- | --- | --- |
| `iphone-6.9/` | 1320 × 2868 | 6.9" iPhone: 440 × 956 points at 3x, 62-point status bar |
| `android-phone/` | 1080 × 1920 | 411 × 731 dp at 2.625, 24 dp status bar |

The six screens, in order:

1. Welcome
2. Home
3. A question with its official, accepted answer
4. Learn
5. The member's profile with their badges
6. The side menu

No screen shows a price, a buy button or a payment link.
