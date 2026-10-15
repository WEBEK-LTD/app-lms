import {
  accountTab,
  categories,
  contact,
  days,
  faq,
  homeTab,
  hours,
  link,
  list,
  notice,
  page,
  pageTab,
  question,
  quickLinks,
  screen,
  screenTab,
  search,
  slide,
  slider,
  stat,
  stats,
  testimonials,
  quote,
  text,
  WEEK,
  type Design,
} from "./build";

// 33 Store apps and restaurants (the store engine): products, the cart and orders.

const shopTab = screenTab("shop", "Shop", "storefront", "courses");
const cartTab = screenTab("cart", "Cart", "shopping_cart", "cart");
const ordersTab = screenTab("orders", "Orders", "receipt_long", "orders");

export const STORE_DESIGNS: Design[] = [
  {
    id: "store-fashion",
    kind: "store",
    name: "Fashion",
    description: "Clean and quiet: new styles first, categories as tiles and best sellers.",
    look: { template: "minimal", corners: "sharp", cards: "flat", font: "DM Sans", secondary_color: "#C2410C" },
    tabs: [homeTab, shopTab, cartTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([slide("The new season is here", "Fresh styles, every week", screen("courses")), slide("Made to last", "Pieces you'll wear again and again", screen("courses"))]),
          categories("Shop by category", "products", "tiles"),
          list("new-in", "New in", "products", "grid", { limit: 6, seeAll: screen("courses") }),
          notice("info", "Write your delivery and returns promise here.", "Shop now", screen("courses")),
          list("best-sellers", "Best sellers", "products", "carousel", { sort: "popular" }),
        ],
      },
    ],
  },
  {
    id: "store-grocery",
    kind: "store",
    name: "Grocery",
    description: "Search first, quick links, this week's picks, an Offers page and delivery hours.",
    look: { template: "classic", corners: "round", cards: "elevated", font: "Plus Jakarta Sans", secondary_color: "#16A34A" },
    tabs: [homeTab, shopTab, pageTab("offers", "Offers", "local_offer"), cartTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          search("products", "Search groceries"),
          notice("success", "Order before 2 pm for delivery today.", "Start shopping", screen("courses")),
          quickLinks([
            link("grocery", "All products", screen("courses")),
            link("percent", "Offers", page("offers")),
            link("shopping_cart", "Cart", screen("cart")),
            link("receipt_long", "My orders", screen("orders")),
          ]),
          categories("Aisles", "products"),
          list("fresh", "Fresh this week", "products", "grid", { featured: true, limit: 6 }),
          list("popular", "Popular", "products", "carousel", { sort: "popular", seeAll: screen("courses") }),
          hours("Delivery hours", days(WEEK, "08:00", "22:00")),
          contact(),
        ],
      },
      {
        slug: "offers",
        title: "Offers",
        show_title: true,
        blocks: [
          list("deals", "This week's deals", "products", "grid", { featured: true, limit: 10 }),
          list("low-prices", "Lowest prices", "products", "list", { sort: "price_asc", limit: 10 }),
        ],
      },
    ],
  },
  {
    id: "store-electronics",
    kind: "store",
    name: "Electronics",
    description: "Bold slides, featured products, your promises in numbers and common questions.",
    look: { template: "bold", corners: "soft", cards: "outlined", font: "Manrope", secondary_color: "#2563EB" },
    tabs: [homeTab, shopTab, cartTab, ordersTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          search("products", "Search phones, laptops and more"),
          slider([slide("The latest phones", "Compare and order in a few taps", screen("courses")), slide("Work and study", "Laptops, tablets and accessories", screen("courses"))]),
          categories("Categories", "products", "tiles"),
          list("featured", "Featured", "products", "grid", { featured: true, limit: 4 }),
          stats([stat("2 years", "Warranty"), stat("48 h", "Delivery"), stat("7 days", "Returns")]),
          list("new-arrivals", "New arrivals", "products", "carousel", { seeAll: screen("courses") }),
          faq("Questions", [
            question("Do products come with a warranty?", "Write how your warranty works here: how long it lasts and how to use it."),
            question("How do I follow my order?", "Open Orders to see where your order is."),
          ]),
          contact(),
        ],
      },
    ],
  },
];

const menuTab = screenTab("menu", "Menu", "restaurant_menu", "courses");

export const RESTAURANT_DESIGNS: Design[] = [
  {
    id: "restaurant-menu",
    kind: "restaurant",
    name: "Menu first",
    description: "A warm welcome, your menu's sections, favorites, opening hours and how to find you.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Manrope", secondary_color: "#E8795C" },
    tabs: [homeTab, menuTab, cartTab, ordersTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Welcome to {app}</h2><p>Order your favorites for pickup or delivery.</p>"),
          categories("Our menu", "products"),
          list("favorites", "Our favorites", "products", "grid", { featured: true, limit: 6 }),
          list("new-dishes", "Something new", "products", "carousel", { seeAll: screen("courses") }),
          hours("Opening hours", days(WEEK, "11:00", "23:00")),
          contact("Find us"),
        ],
      },
    ],
  },
  {
    id: "restaurant-delivery",
    kind: "restaurant",
    name: "Delivery",
    description: "Built for ordering: an offer bar, slides, quick links and what's popular now.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#F59E0B" },
    tabs: [homeTab, menuTab, cartTab, ordersTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("success", "Write your current offer here.", "Order now", screen("courses")),
          slider([slide("Hot and fresh to your door", "Order in a few taps", screen("courses")), slide("Order ahead", "Pick it up without waiting", screen("courses"))]),
          quickLinks(
            [
              link("restaurant_menu", "Menu", screen("courses")),
              link("shopping_cart", "Cart", screen("cart")),
              link("local_shipping", "My orders", screen("orders")),
              link("person", "Account", screen("account")),
            ],
            "row",
          ),
          list("popular", "Popular now", "products", "carousel", { sort: "popular", seeAll: screen("courses") }),
          categories("Hungry for", "products", "tiles"),
          list("deals", "Deals", "products", "grid", { featured: true, limit: 4 }),
          hours("Delivery hours", days(WEEK, "12:00", "01:00")),
        ],
      },
    ],
  },
  {
    id: "restaurant-cafe",
    kind: "restaurant",
    name: "Café",
    description: "Calm and simple: the menu as a list, what guests say, hours and directions.",
    look: { template: "minimal", corners: "round", cards: "flat", font: "DM Sans", secondary_color: "#8B5E3C" },
    tabs: [homeTab, menuTab, cartTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([slide("Good coffee, made slowly", "Order ahead and skip the line", screen("courses"))], false),
          search("products", "Search the menu"),
          categories("Menu", "products"),
          list("menu", "Coffee and more", "products", "list", { limit: 8, seeAll: screen("courses") }),
          testimonials("What guests say", [quote("Write what a regular says about your café.", "Guest's name", "Regular")]),
          hours("Opening hours", [...days(["mon", "tue", "wed", "thu", "fri"], "07:30", "19:00"), ...days(["sat", "sun"], "09:00", "18:00")]),
          contact("Visit us"),
        ],
      },
    ],
  },
];
