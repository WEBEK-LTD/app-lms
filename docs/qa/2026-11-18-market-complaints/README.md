# Marketplace complaints (115.50–115.55): what was built, next to the approved designs

The approved designs are `docs/design/2026-11-18-marketplace/png/` (branch
`wip-marketplace-designs`): 06a, 06b, 06c (card, wallet, coupon, declined),
11 and 12.

- `side-by-side/`: each approved PNG on the left and the build on the right,
  at the same width.
- The other PNGs are the build alone:
  - **App (06a–06c):** Flutter widget renders with the app's bundled fonts,
    390 × 844 at 2×, at text scale 1. They come from
    `mobile/test/widget/phase115_complaint_design_test.dart` with
    `--dart-define=YALLAPP_SHOTS_OUT=<folder> --dart-define=YALLAPP_SCALE=1`.
    The same test runs every screen at text scale 1.3 with no picture.
  - **Dashboard (11, 12):** Playwright on a production build, 1440 wide,
    light and dark, on Studio's demo Zad. They come from
    `platform/web/tests/e2e/market-complaints.spec.ts` with
    `COMPLAINTS_SHOTS=<folder>`.

## Where the build differs from the designs, and why

- **The app's colours are the client's branding.** The test uses Zad's green
  with the app's default second colour, so the amber accents and the night
  palette come out as the app's own. Studio's Zad theme gives the design's
  amber and night.
- **No product photos in the test data.** Lines and photos show the app's
  placeholders.
- **The card's last four digits ("Card •• 4242").** Orders don't keep them,
  so the card decision says "To: Card", or Apple Pay or Google Pay.
- **"Applied by itself at checkout"** is now "Enter it at checkout". A
  complaint's coupon is a code and the checkout doesn't apply codes by
  itself, so the approved line would not be true.
- **06b's typing dots are left out.** The ticket's thread has no "typing"
  signal.
- **11's "Edit" link on the ready replies is left out.** Ready replies are
  fixed in `lib/market/complaints.ts` and there's no editor for them.
- **Dashboard icons.**
  - The dashboard's icon font is a fixed subset (`components/icon-names.ts`).
    Adding glyphs means regenerating that shared file, so these use icons
    already in it:
    - "Take it" uses `how_to_reg`, not `person_add`;
    - the sort uses `list`, not `sort`;
    - Decide uses `task_alt`, not `gavel`;
    - the ready-reply cards use `chat`, not `chat_bubble`.
  - The app uses the design's Material Symbols Rounded icons.
- **Arabic agent wording.** The designs' "تولّت نور" and "نور ترد" are
  feminine verbs. The name can be anyone's, so the app uses gender-neutral
  forms: "شكواك الآن لدى نور من دعم زاد" and "الرد من نور".
- **The people in the dashboard shots.** "Support" and "Complaints" are the
  end-to-end tests' admin accounts. The tickets are the demo's and the
  spec's own.
