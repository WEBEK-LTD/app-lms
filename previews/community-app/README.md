# Yallapp Community app (area D): screenshots beside the design

Made from `wip-community-app` at 8f7acb67d. Each phone is 390 × 844 at 2x.

- **Design:** `design/mobile.html` and `design/opening.html` (branch
  `wip-community-design`) rendered in Chromium at 2x, with the bezel cut off.
- **App:** `community/test/shots/app_shots_test.dart`, run with
  `YC_SHOTS_DIR=<dir> flutter test test/shots`. The real fonts are loaded
  (Inter, Readex Pro, IBM Plex Sans Arabic, Material Symbols Rounded), with
  soft shadows, photos and a 50-point status bar inset. The data is the
  app's demo data (`YC_DEMO=true`).

## `compare/`: design (left) beside app (right)

| Screen | File |
| --- | --- |
| Welcome | compare-welcome.jpg |
| Home | compare-home.jpg |
| Side menu | compare-menu.jpg |
| Opening 0.0s, 0.6s, 1.2s | compare-opening-*.jpg |

The fourth mobile phone (the dark question screen) belongs to area E.

## `app/`: every screen of area D

These cover welcome, sign-up, home, the menu, the + sheet, your own
profile, a member's profile and settings. Each is shown in light and dark,
and welcome, home and the menu also in Arabic (right to left) and Turkish.

## Where the app differs from the design, on purpose

1. **Welcome:** the brief adds "Continue with Google" between Apple and
   email.
   - The buttons and "Log in" keep the design's distances from the foot
     (70 and 30 points).
   - The words block and the challenge bubble move up by one button and
     its gap (64 points), so the bubble keeps the design's 31 points
     above "Build apps."
2. **Header:**
   - Phase 1 has no messages (the icon opens "Coming soon"), so no "3"
     shows on it.
   - The notifications count is the account's unread count (9 in the demo).
3. **Menu:**
   - "Your groups" says groups arrive in a coming update, since groups are
     phase 2.
   - The Q&A badge is area E's count of new questions, hidden at 0. The
     home and menu shots set it to the mockup's 12, so the badge and the
     tab bar's dot show.
4. **Home, phase 1 only:** the mockup's November challenge and "Build
   one like it" are later phases.
   - The featured slot shows the newest official tutorial ("Start
     tutorial"). It takes any kind of item, so phase 3's challenge, with
     its countdown, drops in.
   - A post's glass chip reads "Start tutorial" on a tutorial and the
     answers ("12 answers") on a question.
   - Official tutorials come from the Yallapp Team, shown with the logo.
5. **The design's own placeholders:** its HTML points at photos that
   aren't in the repo, so its collage phones and post photo are blank.
   The app shows its demo photos there.
6. **Status bar and emoji:** the status bar (9:41, signal) is the phone's
   own, not the app's. Emoji are drawn with Noto Color Emoji here, and
   with the phone's own emoji font on a device.

Everything else was matched in place by comparing these shots:

- Material Symbols *Rounded* icons
- the create button's conic gradient
- the member's own green avatar
- the story labels' alignment
- the featured card's line heights
- the menu's level track
- the welcome screen's distances
- the opening's three moments
