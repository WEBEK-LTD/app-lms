import {
  accountTab,
  button,
  card,
  cards,
  categories,
  contact,
  countdown,
  days,
  faq,
  field,
  form,
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
import { aboutPage, contactPage, otherPage, questionsPage, who } from "./pages";

// 33 Store apps and restaurants (the store engine): products, the cart and orders.
// 110.3 Shops with Offers and Delivery & returns pages; restaurants with their story and a Catering page.

const shopTab = screenTab("shop", "Shop", "storefront", "courses");
const cartTab = screenTab("cart", "Cart", "shopping_cart", "cart");
const ordersTab = screenTab("orders", "Orders", "receipt_long", "orders");

const DELIVERY_TIME = question("How long does delivery take?", "Orders placed before 2 pm leave the same day. Most arrive in one to three working days.");
const DELIVERY_PRICE = question("How much is delivery?", "Free above the amount shown in your cart. Below it, you see the price before you pay.");
const FOLLOW = question("How do I follow my order?", "Open Orders to see where your order is.");
const RETURN = question("Can I return something?", "Yes, within 14 days, unused and in its packaging. Open the order and send us a message, and we'll collect it.");
const MONEY_BACK = question("When do I get my money back?", "Within five working days of the return reaching us, to the card you paid with.");
const PAYING = question("How can I pay?", "By card in the app, or in cash when your order arrives where we offer it.");
const CHANGE = question("Can I change or cancel my order?", "Yes, until it leaves us. Send us a message with your order number.");
const AREA = question("Do you deliver to my area?", "Enter your address at checkout: you'll see at once whether we deliver there, and when.");
const WARRANTY = question("Do products come with a warranty?", "Yes. Every product has the maker's warranty, for at least two years. Keep your receipt from Orders.");

const STORE_QUESTIONS = [DELIVERY_TIME, DELIVERY_PRICE, FOLLOW, RETURN, MONEY_BACK, PAYING, CHANGE, AREA];

/** What the shop promises, on its home page and its Delivery & returns page. */
const promises = () =>
  cards("promises", "Our promises", [
    card("Fast delivery", "The same day when you order before 2 pm.", null, page("delivery")),
    card("Free returns", "Changed your mind? Send it back within 14 days.", null, page("delivery")),
    card("Safe payment", "Pay by card in the app, or in cash at the door."),
    card("Real people", "Questions? We answer every message within a day.", null, page("contact")),
  ]);

const offerCountdown = () => countdown("This week's offers end in", 7, "New offers start on Monday.", { label: "See the offers", action: page("offers") });

const STORE_CONTACT = "<p>A question about an order, a size or a product? Send us a message: a real person answers within a working day.</p>";
const CUSTOMER_SERVICE = hours("Customer service", days(WEEK, "09:00", "21:00"));

/** The pages every shop has besides its home page. */
function shopPages(about: Parameters<typeof aboutPage>[0]) {
  return [
    otherPage("offers", "Offers", [
      offerCountdown(),
      list("deals", "This week's deals", "products", "grid", { featured: true, limit: 10 }),
      list("low-prices", "Lowest prices", "products", "list", { sort: "price_asc", limit: 10 }),
      notice("info", "New offers every Monday. Turn on notifications to hear first.", "Notifications", screen("notifications")),
    ]),
    otherPage("delivery", "Delivery & returns", [
      text("delivery-intro", "<p>We pack every order with care and send it the same day when you order before 2 pm. Delivery is free above the amount shown in your cart.</p>"),
      promises(),
      faq("Delivery and returns", [DELIVERY_TIME, DELIVERY_PRICE, AREA, RETURN, MONEY_BACK, CHANGE], "delivery-questions"),
      button("ask", "Ask us a question", page("contact"), "outlined", "chat"),
    ]),
    aboutPage(about),
    contactPage(STORE_CONTACT, CUSTOMER_SERVICE),
    questionsPage("<p>Answers about orders, delivery, returns and payment. Can't find yours? Send us a message.</p>", STORE_QUESTIONS),
  ];
}

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
          slider([
            slide("The new season is here", "Fresh styles, every week", screen("courses")),
            slide("Made to last", "Pieces you'll wear again and again", screen("courses")),
            slide("Free returns for 14 days", "Try it at home, send it back if it isn't right", page("delivery")),
          ]),
          categories("Shop by category", "products", "tiles"),
          list("new-in", "New in", "products", "grid", { limit: 6, seeAll: screen("courses") }),
          promises(),
          offerCountdown(),
          list("best-sellers", "Best sellers", "products", "carousel", { sort: "popular" }),
          testimonials("What customers say", [
            quote("The dress fit perfectly and arrived the next day, wrapped like a gift.", "Ayşe K.", "Customer"),
            quote("I sent a shirt back for a bigger size. The new one came in two days, no questions.", "Mert Y.", "Customer"),
            quote("Good quality, and the styles change every week. I check the app every Friday.", "Salma H.", "Regular customer"),
          ]),
          faq("Questions", [DELIVERY_TIME, RETURN, PAYING, FOLLOW]),
          text("story", "<h3>About {app}</h3><p>We choose every piece ourselves, from makers we know, and only stock what we'd wear.</p>"),
          contact(),
        ],
      },
      ...shopPages({
        story:
          "<p>{app} began with a single rail of clothes in a small shop and a simple promise: pieces that look good and last. We still choose every item ourselves, from makers we know, and we only stock what we'd wear. New styles arrive every week, in small numbers, so check back often. Order in the app and we'll send it the same day when you order before 2 pm. If something isn't right, send it back: returns are free.</p>",
        people: { title: "The team", list: [who("selin", "Founder and buyer"), who("deniz", "Stylist"), who("can", "Orders and delivery"), who("zeynep", "Customer care")] },
        numbers: [stat("2,000+", "Happy customers"), stat("48 h", "Delivery"), stat("14 days", "Free returns")],
        photos: { title: "In the shop", files: ["art-place-shop.png", "art-item-dress.png", "art-item-shirt.png", "art-item-bag.png", "art-item-shoes.png", "art-item-watch.png"] },
      }),
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
          slider([
            slide("Fresh food, delivered today", "Order before 2 pm", screen("courses")),
            slide("This week's offers", "Lower prices on what you buy most", page("offers")),
            slide("Bread baked every morning", "In your basket by the evening", screen("courses")),
          ]),
          notice("success", "Order before 2 pm for delivery today.", "Start shopping", screen("courses")),
          quickLinks([
            link("grocery", "All products", screen("courses")),
            link("percent", "Offers", page("offers")),
            link("shopping_cart", "Cart", screen("cart")),
            link("receipt_long", "My orders", screen("orders")),
          ]),
          categories("Aisles", "products", "tiles"),
          list("fresh", "Fresh this week", "products", "grid", { featured: true, limit: 6 }),
          list("popular", "Popular", "products", "carousel", { sort: "popular", seeAll: screen("courses") }),
          promises(),
          testimonials("What customers say", [
            quote("The fruit is as fresh as the market's, and it's at my door by the evening.", "Huda M.", "Customer"),
            quote("I order every Saturday in five minutes. They even remember I like ripe bananas.", "Burak T.", "Regular customer"),
            quote("One yogurt was missing once. They brought it the same day and said sorry.", "Dina M.", "Customer", 4),
          ]),
          hours("Delivery hours", days(WEEK, "08:00", "22:00")),
          faq("Questions", [DELIVERY_TIME, AREA, PAYING, CHANGE]),
          contact(),
        ],
      },
      ...shopPages({
        story:
          "<p>{app} is the neighbourhood grocer, now on your phone. We buy fruit and vegetables from local farms every morning, bake bread on site and keep the shelves full of what families use every week. Order before 2 pm and our own team delivers the same day, in cool bags. Pay by card or in cash at the door. Not happy with something? Tell us, and we'll replace it on your next order or give your money back.</p>",
        people: { title: "The team", list: [who("yusuf", "Store manager"), who("mariam", "Fresh food"), who("tarek", "Delivery team"), who("nadia", "Customer care")] },
        numbers: [stat("Same day", "Delivery"), stat("300+", "Fresh products"), stat("4.9", "Average rating")],
        photos: { title: "Our shop", files: ["art-place-shop.png", "art-item-fruit.png", "art-item-veg.png", "art-item-bread.png", "art-product-coffee.png", "art-product-tea.png"] },
      }),
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
          slider([
            slide("The latest phones", "Compare and order in a few taps", screen("courses")),
            slide("Work and study", "Laptops, tablets and accessories", screen("courses")),
            slide("Two years of warranty", "On every phone and laptop", page("delivery")),
          ]),
          categories("Categories", "products", "tiles"),
          list("featured", "Featured", "products", "grid", { featured: true, limit: 4 }),
          stats([stat("2 years", "Warranty"), stat("48 h", "Delivery"), stat("7 days", "Returns")]),
          list("new-arrivals", "New arrivals", "products", "carousel", { seeAll: screen("courses") }),
          offerCountdown(),
          promises(),
          testimonials("What customers say", [
            quote("They helped me choose a laptop for my studies, and it arrived the next morning.", "Youssef R.", "Student"),
            quote("My phone screen had a fault on day three. They swapped it, no forms, no waiting.", "Gül S.", "Customer"),
            quote("Fair prices and a real warranty. I bought all our office laptops here.", "Hakan D.", "Business customer"),
          ]),
          faq("Questions", [WARRANTY, FOLLOW, RETURN, PAYING]),
          contact(),
        ],
      },
      ...shopPages({
        story:
          "<p>{app} has sold phones, laptops and accessories for over ten years. We only sell products with the maker's full warranty, and our team tests every returned item before it goes back on the shelf. Not sure which laptop suits you? Send us a message and a real person will help you choose. Order in the app, follow your order to your door, and if anything goes wrong in the first seven days, we replace it.</p>",
        people: { title: "The team", list: [who("emre", "Founder"), who("karim", "Technical support"), who("leyla", "Sales"), who("tarek", "Delivery")] },
        numbers: [stat("2 years", "Warranty"), stat("48 h", "Delivery"), stat("7 days", "Returns")],
        photos: { title: "Our shop", files: ["art-place-shop.png", "art-item-phone.png", "art-item-laptop.png", "art-item-headphones.png", "art-item-watch.png", "art-place-office.png"] },
        more: [faq("About our products", [WARRANTY, question("Are your products new?", "Yes, all of them, sealed in the maker's box. Tested returns are marked as such.")], "products")],
      }),
    ],
  },
];

const menuTab = screenTab("menu", "Menu", "restaurant_menu", "courses");

const RESTAURANT_QUESTIONS = [
  question("Do you deliver?", "Yes, within the area shown at checkout. You see the delivery time before you order."),
  question("Can I order ahead and pick up?", "Yes. Choose Pickup at checkout and pick a time: your order is ready when you arrive."),
  question("Do you have vegetarian dishes?", "Yes. Look for the dishes marked vegetarian on the menu, and ask us about any other."),
  question("I have an allergy. Can you help?", "Tell us in the order notes or call us before you order, and we'll tell you what's in each dish."),
  question("Can I book a table?", "Yes. Send us a message with the day, the time and how many you are, and we'll confirm."),
  question("Do you cater for events?", "Yes, from office lunches to family celebrations. See our Catering page and send us your request."),
  question("How can I pay?", "By card in the app, or in cash when your order arrives."),
];

const RESTAURANT_SPECIALS = [
  card("Grilled burger", "Our own beef, smoked cheese and house pickles.", "art-dish-burger.png", screen("courses")),
  card("Lentil soup", "Slow-cooked, with lemon and toasted bread.", "art-dish-soup.png", screen("courses")),
  card("Chicken wrap", "Grilled chicken, garlic sauce and fresh herbs.", "art-dish-wrap.png", screen("courses")),
  card("Baklava", "Made every morning, with pistachios.", "art-dish-baklava.png", screen("courses")),
];

const CAFE_SPECIALS = [
  card("Big breakfast", "Eggs, cheese, olives and warm bread, until noon.", "art-dish-breakfast.png", screen("courses")),
  card("Fresh simit", "Baked every morning, with sesame.", "art-dish-simit.png", screen("courses")),
  card("Caramel latte", "Our own roast, with oat milk if you like.", "art-drink-latte.png", screen("courses")),
  card("Baked cheesecake", "A slice of our best seller.", "art-dish-cheesecake.png", screen("courses")),
];

const PLACE_PHOTOS = ["art-place-cafe.png", "art-dish-breakfast.png", "art-drink-coffee.png", "art-dish-cheesecake.png", "art-place-hall.png", "art-drink-latte.png"];

const RESTAURANT_CONTACT = "<p>Book a table, ask about a dish or plan an event: call us, write, or send us a message here.</p>";

/** A restaurant's pages: its story, catering and private events, how to reach it and questions. */
function restaurantPages(story: string, opening: ReturnType<typeof hours>) {
  return [
    aboutPage({
      title: "Our story",
      story,
      people: { title: "Our kitchen", list: [who("karim", "Head chef"), who("leyla", "Owner"), who("omar", "Pastry chef"), who("zeynep", "Front of house")] },
      numbers: [stat("25", "Years of cooking"), stat("40+", "Dishes"), stat("4.8", "Average rating")],
      photos: { title: "The place", files: PLACE_PHOTOS },
    }),
    otherPage("catering", "Catering and events", [
      text("catering-intro", "<p>Office lunches, family celebrations or a private dinner for twenty: we cook it, bring it and set it up. Tell us about your event and we'll send you a menu and a price.</p>"),
      cards("occasions", "What we do", [
        card("Office lunches", "Trays for ten to a hundred people, delivered on time.", "art-dish-wrap.png"),
        card("Family celebrations", "Birthdays, engagements and big family meals.", "art-dish-baklava.png"),
        card("Private dinners", "The whole place for your guests, with a menu just for you.", "art-place-hall.png"),
        card("Coffee and cake", "Breakfasts and coffee breaks for meetings.", "art-drink-coffee.png"),
      ]),
      form(
        "catering-form",
        "Ask for a quote",
        [
          field("name", "text", "Your name", true),
          field("phone", "phone", "Phone number", true),
          field("email", "email", "Email"),
          field("date", "text", "Date of the event", true),
          field("guests", "number", "Number of guests", true),
          field("details", "long_text", "Tell us about the event"),
        ],
        "Send the request",
        "Thank you. We'll call you within a day to plan it together.",
      ),
    ]),
    contactPage(RESTAURANT_CONTACT, opening),
    questionsPage("<p>What our guests ask us most. Anything else? Call us or send a message.</p>", RESTAURANT_QUESTIONS),
  ];
}

const restaurantHours = hours("Opening hours", days(WEEK, "11:00", "23:00"));
const deliveryHours = hours("Delivery hours", days(WEEK, "12:00", "01:00"));
const cafeHours = hours("Opening hours", [...days(["mon", "tue", "wed", "thu", "fri"], "07:30", "19:00"), ...days(["sat", "sun"], "09:00", "18:00")]);

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
          slider([
            slide("Fresh from our kitchen", "Order for pickup or delivery", screen("courses")),
            slide("This week's specials", "Chosen by our head chef", screen("courses")),
            slide("Celebrate with us", "Catering and private dinners", page("catering")),
          ]),
          text("welcome", "<h2>Welcome to {app}</h2><p>Order your favorites for pickup or delivery.</p>"),
          categories("Our menu", "products"),
          cards("specials", "Chef's specials", RESTAURANT_SPECIALS),
          list("favorites", "Our favorites", "products", "grid", { featured: true, limit: 6 }),
          list("new-dishes", "Something new", "products", "carousel", { seeAll: screen("courses") }),
          testimonials("What guests say", [
            quote("The best lentil soup in the city, and they remember how I like my bread.", "Ahmed F.", "Regular guest"),
            quote("We booked a table for my mother's birthday. The staff made it a night to remember.", "Merve A.", "Guest"),
            quote("Delivery arrived hot and on time, packed better than anywhere I know.", "Burak T.", "Delivery customer"),
          ]),
          restaurantHours,
          faq("Questions", RESTAURANT_QUESTIONS.slice(0, 4)),
          button("story", "Read our story", page("about"), "outlined", "info"),
          contact("Find us"),
        ],
      },
      ...restaurantPages(
        "<p>{app} opened as a small kitchen with six tables and a menu written on the wall. There are more tables now, but we still cook the same way: fresh ingredients bought every morning, recipes from our families and nothing from a packet. Our head chef changes the specials every week, so there's always something new to try. Eat with us, pick up on your way home or order delivery: your food is made when you order it.</p>",
        restaurantHours,
      ),
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
          notice("success", "Free delivery on your first order this week.", "Order now", screen("courses")),
          slider([
            slide("Hot and fresh to your door", "Order in a few taps", screen("courses")),
            slide("Order ahead", "Pick it up without waiting", screen("courses")),
            slide("Feeding a crowd?", "Ask us about catering", page("catering")),
          ]),
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
          cards("specials", "Chef's specials", RESTAURANT_SPECIALS),
          list("deals", "Deals", "products", "grid", { featured: true, limit: 4 }),
          testimonials("What customers say", [
            quote("Thirty minutes from order to door, still hot. That's why I keep coming back.", "Hakan D.", "Customer"),
            quote("I follow the driver on the map and I'm at the door when he arrives.", "Salma H.", "Customer"),
            quote("The burger is the real thing, and the weekly offers help too.", "Youssef R.", "Regular customer"),
          ]),
          deliveryHours,
          faq("Questions", [RESTAURANT_QUESTIONS[0]!, RESTAURANT_QUESTIONS[1]!, RESTAURANT_QUESTIONS[3]!, RESTAURANT_QUESTIONS[6]!]),
          contact(),
        ],
      },
      ...restaurantPages(
        "<p>{app} cooks for people who are busy, hungry and short of time. Every order is made when it comes in and packed to stay hot until it reaches your door. We keep the menu short, so every dish is one we're proud of, and we follow each order until it arrives. Order in a few taps, follow your driver in the app, and tell us what you think: we read every review.</p>",
        deliveryHours,
      ),
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
          slider(
            [
              slide("Good coffee, made slowly", "Order ahead and skip the line", screen("courses")),
              slide("Breakfast until noon", "Eggs, simit and fresh bread", screen("courses")),
              slide("Cakes baked this morning", "Take a slice home", screen("courses")),
            ],
            false,
          ),
          search("products", "Search the menu"),
          categories("Menu", "products"),
          list("menu", "Coffee and more", "products", "list", { limit: 8, seeAll: screen("courses") }),
          cards("specials", "Today at the café", CAFE_SPECIALS),
          testimonials("What guests say", [
            quote("My morning flat white, ready when I walk in. I can't start the day without it.", "Gül S.", "Regular"),
            quote("Quiet, bright, and the cheesecake is the best I've had.", "Dina M.", "Guest"),
            quote("I work here one morning a week. Good coffee, good music, kind people.", "Mert Y.", "Regular"),
          ]),
          cafeHours,
          faq("Questions", [RESTAURANT_QUESTIONS[1]!, RESTAURANT_QUESTIONS[2]!, RESTAURANT_QUESTIONS[4]!, RESTAURANT_QUESTIONS[5]!]),
          text("story", "<h3>About {app}</h3><p>We roast our beans in small batches and bake our cakes every morning.</p>"),
          contact("Visit us"),
        ],
      },
      ...restaurantPages(
        "<p>{app} is a small café with big windows and a slow coffee machine. We roast our beans in small batches, bake our cakes every morning and serve breakfast until noon. Come in to read, meet a friend or work for an hour; order ahead in the app and your coffee is ready when you arrive. Our regulars know us by name, and we hope you will too.</p>",
        cafeHours,
      ),
    ],
  },
];
