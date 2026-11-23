# Phase 215: the Pharaonic theme, from the real app

Six screens of Yallapp Business in the Pharaonic theme, drawn from the app
itself (the demo's fake API, the app's real fonts) at 390 × 844, 2x:

- `sign-in-ar-dark.jpg`: the welcome
- `today-ar-dark.jpg`: Today with the cornice and the shop in a cartouche
- `order-ar-dark.jpg`: an order, its number in a cartouche
- `kitchen-empty-ar-dark.jpg`: the refined empty state
- `appearance-ar-dark.jpg`: the theme choice (the default first)
- `today-en-light.jpg`: Today on papyrus, with the new-order card

Remake them all (en, ar, tr, light and dark):

    YB_PHARAONIC_DIR=/tmp/pharaonic flutter test test/golden/pharaonic_screens_test.dart

The approved design: `design-refs/business-pharaonic` on the
`wip-design-business-pharaonic` branch.
