# New premium Studio shop types: what the owner decided (from the planning doc, Arabic original)

## Rules
- These types are for Yallapp Studio only. Do not merge them with the regular (non-Studio) apps.
- Each type gets 8 or more sections, and every section must be complete and work in BOTH the Studio editor and the real app (Flutter). Any missing element (slider, feature, …) is added before the type ships.
- Every element of these templates becomes a reusable element in the Studio editor library.
- **Liability notice:** the customer is fully responsible for their app. The dashboard shows a notice per type ONCE, and the customer presses "قرأت وموافق" (dashboard Arabic is Egyptian).
  - Wording per type (generic, because laws differ by country):
    - **Cosmetics:** products must be registered and genuine, with ingredients and expiry written correctly.
    - **Kids' toys & kids' clothes:** child-safety standards and age warnings; the app sells to parents, not to children.
    - **Electronics & furniture:** warranty and returns as consumer-protection law requires.
    - **Clothes and decor/crochet:** not in the doc's table. Use a short general notice that the owner is responsible for the products, prices, returns and the laws of their country.
- **Photos:** real CC0/public-domain photos, not drawings.
- **App icons:** premium; every template has a fitting icon.
- **Installments:** NOT active for furniture and electronics (mobiles, computers). Show "التقسيط قريبًا" (installments coming soon) only.
- **Header menu button:** next to the notifications icon in every template. It opens ALL the product categories the shop owner made, as sliders.
  - Each category is a horizontal row of cards. Each card has the category's name and its photo. The first card is "all of <category>", and the sub-categories slide in the same row.
  - It also has search on top, plus account/orders/wishlist/language/contact at the bottom.
  - It is also a Studio editor library element.
- **Approved visual style (owner, 23 Nov):** a real native phone-app look.
  - Small header, search pill, categories.
  - Compact rounded hero card carousel (about 210 px tall) with the next card peeking.
  - 9–12 tight sections, and a floating tab bar (Home, Shop, Cart, Orders, Account).
  - Light and dark.

## The baseline every type gets (most of it already works in the flower shops Leqaa / Kech Flora)
- **Two premium templates** per type, with really different looks, light and dark and real photos. Every screen is editable from Studio.
- **Screens:** home, categories, product page, cart, checkout, my orders with the live order journey, account, sign-in.
- **Selling:**
  - add-to-cart on the card
  - flash sales with a countdown
  - coupons
  - stories
  - seasonal banners
- **Payments:** card, Apple Pay and Google Pay, cash on delivery or bank transfer, and every currency.
- **After the order:** the live order journey, notifications and premium emails.
- **Languages:** Arabic, English and Turkish. The apps are published to Google Play and the App Store.
- **New, needed by most types:** wishlist, customer reviews with photos, and "notify me when back in stock". Check first whether any of these already exists.

## Sections (Studio's "new project" flow: section → type → template)
- **Fashion:** clothes · kids' clothes
- **Beauty & care:** cosmetics
- **Home & living:** furniture · home decor · crochet & handmade
- **Kids & toys:** toys (kids' clothes also appears here, without being duplicated)
- **Shopping & stores:** electronics (all-in-one) · mobiles · computers & gaming. These sit beside the existing general store, multi-vendor market and flowers & gifts.

## Per type (template A / template B / features; "(new)" = doesn't exist yet)
- **Clothes**
  - A: luxury boutique, big photos, black and white (design "LUJAIN").
  - B: streetwear (design "NOUN").
  - Features:
    - sizes and colours per product, with stock per size
    - filter by size, colour and price
    - size chart (new)
    - "complete the look" (new)
    - the exchange policy shown
- **Kids' clothes**
  - A: soft pastel. B: playful bright.
  - Features:
    - size by age (0–3 months up to 12 years)
    - boy/girl filter
    - newborn gifts with wrapping and a card
    - ready-made sets
- **Cosmetics**
  - A: luxury, pink and gold (design "Velours"). B: natural, green and beige.
  - Features:
    - shade swatches
    - filter by skin type and brand
    - ingredients and how to use
    - ready-made routine bundles
    - "know your skin type" quiz (new)
    - genuine product and expiry date
- **Furniture**
  - A: modern, white and wood (design "RUKN"). B: luxury (design "KANAF").
  - Features:
    - materials and colours
    - dimensions in cm
    - assembly and delivery date
    - installments: "coming soon" only
    - shop by room (bedroom, dining, living)
    - custom-made order (new)
- **Home decor**
  - A: decor magazine, wide photos (design "Sakan"). B: warm and calm, earth tones.
  - Features:
    - shop the look (a room photo with its products)
    - shop by style
    - gifts with wrapping and a card
    - seasons (Ramadan, Christmas)
- **Crochet & handmade**
  - A: warm handmade, beige and pink. B: colourful and playful.
  - Features:
    - custom order with specs and colour (new)
    - days to make
    - the maker's story
    - yarn and tools for sale
    - crochet courses (using the courses system)
- **Toys**
  - A: playful and colourful. B: calm educational (Montessori).
  - Features:
    - filter by age
    - type of toy (educational, outdoor, puzzles)
    - safety and materials
    - birthday gifts with a card
    - "gifts under a price"
- **Electronics** (all-in-one store)
  - Features:
    - specs in a table
    - compare 2 or 3 products (new)
    - warranty
    - colour and storage as options
    - installments: "coming soon" only
    - matching accessories
- **Mobiles** (its own type)
  - Features:
    - storage and colour options
    - new/used
    - local or international warranty
    - trade-in (new)
- **Computers & gaming** (its own type)
  - Features:
    - filter by CPU, RAM, storage and GPU
    - "build your PC" part by part (new)

## Design references (approved; build each template exactly like them)
`/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/designs/`:
- `pilot/`: the approved pilot homes.
- `v2/phase1/`: clothes A and B.
- `v2/phase2/`: decor and crochet.
- `v2/phase3a/`: furniture.
- `v2/phase3b/`: mobiles.
- `v2/kids/`, `v2/beauty/`, `v2/toys/`, `v2/electronics/`, `v2/computers/`.

Each folder has the JPGs (`<type>-<A|B>-<home|menu|listing|product>-<light|dark>.jpg`), `_src/` (the HTML/CSS that drew them, plus the photos used, in `_src/img`) and `CREDITS.md` (StockSnap CC0 photo credits).

Some folders may still be in progress. Use what exists, and check again later.

## Added by the owner (23 Nov): demo + story for every type
Every new type must also get, like the other Studio apps:
- a live demo listed on the Studio demo page (/demo/studio and the demo-first picker), both templates (A and B), light and dark;
- its own story page (like the existing Studio stories, e.g. Leqaa's story page from Phase 131 and the Signature story pages), with its screens re-shot from the real templates.
Study how the existing Studio demos and story pages are wired (git log for "demo", "story", 128, 130.49, 131) and follow the same path.
