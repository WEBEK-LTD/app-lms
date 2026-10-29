import {
  accountTab,
  button,
  card,
  cards,
  contact,
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
  place,
  question,
  quickLinks,
  quote,
  screen,
  screenTab,
  slide,
  slider,
  stat,
  stats,
  team,
  testimonials,
  text,
  WEEK,
  WEEKDAYS_ONLY,
  type Design,
} from "./build";
import type { Action, Card, FaqEntry, LayoutBlock, Person, Quote } from "../types";
import { aboutPage, contactPage, otherPage, questionsPage, who } from "./pages";

// 104 Delivery and courier companies, 105.1 food delivery, 105.2 rides and 105.9 live taxis.
// 110.3 Each with How it works (three steps, where it works, its prices) and a page to join as a courier, driver or partner.

/** What a kind of transport app says the same way in each of its designs. */
interface Kit {
  steps: Card[];
  offer: { title: string; cards: Card[] };
  questions: FaqEntry[];
  quotes: Quote[];
  team: Person[];
  story: string;
  short: string;
  numbers: ReturnType<typeof stat>[];
  photos: string[];
  contactWords: string;
  join: { title: string; intro: string; perks: Card[]; formTitle: string; fields: ReturnType<typeof field>[]; button: string; done: string };
  joinLabel: string;
  opening: LayoutBlock;
}

const steps = (kit: Kit) => cards("how", "How it works", kit.steps, 3);

/** The pages of a transport app: how it works, joining, its story, how to reach it and questions. */
function kitPages(kit: Kit) {
  return [
    otherPage("how-it-works", "How it works", [
      text("how-intro", kit.short),
      steps(kit),
      place("Where we work", null, "coverage"),
      cards("offer", kit.offer.title, kit.offer.cards),
      faq("Safety and trust", kit.questions.slice(0, 4), "safety"),
    ]),
    otherPage("join", kit.join.title, [
      text("join-intro", kit.join.intro),
      cards("perks", null, kit.join.perks),
      form("join-form", kit.join.formTitle, kit.join.fields, kit.join.button, kit.join.done),
    ]),
    aboutPage({ story: kit.story, people: { title: "The team", list: kit.team }, numbers: kit.numbers, photos: { title: "On the way", files: kit.photos } }),
    contactPage(kit.contactWords, kit.opening),
    questionsPage("<p>What our customers ask us most.</p>", kit.questions),
  ];
}

const joinFields = (vehicle: string) => [
  field("name", "text", "Your name", true),
  field("phone", "phone", "Phone number", true),
  field("email", "email", "Email"),
  field("area", "text", "Your city or area", true),
  field("vehicle", "text", vehicle),
  field("message", "long_text", "Anything else we should know"),
];

const DELIVERY: Kit = {
  steps: [card("1. Book a pickup", "Tell us what you're sending and where."), card("2. We collect it", "A courier comes to your door, usually within 30 minutes."), card("3. Follow it", "See each step in My shipments until it's delivered.")],
  offer: {
    title: "Our services",
    cards: [
      card("Same day", "Across the city, delivered today.", "art-service-sameday.png", screen("send_parcel")),
      card("Express", "Picked up in 30 minutes, delivered within two hours.", "art-service-express.png", screen("send_parcel")),
      card("Documents", "Signed for, with a photo at delivery.", "art-service-documents.png", screen("send_parcel")),
      card("For businesses", "Daily pickups and one invoice a month.", "art-place-office.png", page("contact")),
    ],
  },
  questions: [
    question("How do I follow my parcel?", "Open My shipments: each stage shows with its time."),
    question("Is my parcel insured?", "Yes, up to the value you give when you book."),
    question("What can't I send?", "Cash, medicines, and anything dangerous or illegal. Ask us if you're not sure."),
    question("What if nobody is home?", "The courier calls you, then tries again or leaves it with a neighbour you name."),
    question("How do I pay for a delivery?", "By card in the app, or in cash to the courier."),
    question("Do you deliver for businesses?", "Yes. Shops and companies get their own pickup times and one invoice a month."),
  ],
  quotes: [
    quote("My parcel was picked up in 20 minutes and across town within the hour.", "Gül S.", "Customer"),
    quote("We send twenty orders a day with them and have never lost one.", "Hakan D.", "Shop owner"),
    quote("I follow every step in the app. No more calling to ask where it is.", "Lina A.", "Customer"),
  ],
  team: [who("tarek", "Operations"), who("nadia", "Customer service"), who("can", "Couriers' lead"), who("yusuf", "Business accounts")],
  story:
    "<p>{app} started with three couriers and a phone that never stopped ringing. Today our team picks up and delivers parcels across the city every day, for families, shops and offices. We answer quickly, keep our prices clear, and you can follow every parcel from your door to theirs. Our couriers are trained, insured and paid fairly, because the people who carry your things matter as much as the things themselves.</p>",
  short: "<p>Send a parcel in three steps, and follow it until it arrives.</p>",
  numbers: [stat("30 min", "To pick up"), stat("1,000+", "Parcels a month"), stat("7 days", "A week")],
  photos: ["art-service-sameday.png", "art-service-express.png", "art-service-documents.png", "art-banner-delivery.png", "art-place-office.png", "art-car-dark.png"],
  contactWords: "<p>A question about a parcel, a price or a business account? Send us a message: we answer within the hour in working hours.</p>",
  join: {
    title: "Become a courier",
    intro: "<p>Deliver with us on your own schedule. Bring a motorbike, a car or a bicycle, and we bring the parcels.</p>",
    perks: [card("Your own hours", "Mornings, evenings or weekends."), card("Paid every week", "Your earnings every Monday."), card("Insured", "You're covered on every delivery.")],
    formTitle: "Apply to deliver with us",
    fields: joinFields("What do you ride or drive?"),
    button: "Apply",
    done: "Thank you. We'll call you within a few days.",
  },
  joinLabel: "Become a courier",
  opening: hours("Working hours", days(WEEK, "08:00", "22:00")),
};

const FOOD: Kit = {
  steps: [card("1. Choose a restaurant", "See who's open near you and what they cook."), card("2. Order your food", "Pay by card or in cash at the door."), card("3. Follow it", "Watch your courier on the way to you.")],
  offer: {
    title: "What you can order",
    cards: [
      card("Burgers and grills", "From the city's favourite grills.", "art-dish-burger.png", screen("restaurants")),
      card("Home cooking", "Soups, stews and family recipes.", "art-dish-soup.png", screen("restaurants")),
      card("Breakfast", "Eggs, bread and tea, until noon.", "art-dish-breakfast.png", screen("restaurants")),
      card("Desserts", "Baklava, cakes and more.", "art-dish-baklava.png", screen("restaurants")),
    ],
  },
  questions: [
    question("How do I follow my order?", "Open My orders: each stage shows with its time."),
    question("What if something is wrong with my order?", "Send us a message from the order within an hour, and we'll put it right or refund it."),
    question("How is my food kept warm?", "Our couriers carry every order in insulated bags, straight from the kitchen to you."),
    question("Can I leave a note for the restaurant?", "Yes. Add a note when you order, for an allergy or how you like your food."),
    question("How much is delivery?", "You see the delivery price before you pay. It depends on how far the restaurant is."),
    question("Can my restaurant join?", "Yes. Fill in the form on our Partner with us page and we'll be in touch."),
  ],
  quotes: [
    quote("My favourite restaurant, at my door in half an hour, still hot.", "Youssef R.", "Customer"),
    quote("I follow my order on the map and I'm at the door when it arrives.", "Salma H.", "Customer"),
    quote("One dish was wrong once. They refunded it in minutes.", "Mert Y.", "Customer", 4),
  ],
  team: [who("emre", "Founder"), who("mariam", "Restaurants"), who("tarek", "Couriers"), who("zeynep", "Customer service")],
  story:
    "<p>{app} brings the city's kitchens to your door. We work with family restaurants, bakeries and cafés we've eaten at ourselves, and our own couriers carry your food in warm bags. You choose, we follow your order from the kitchen to your table, and if something goes wrong, a real person puts it right. Hungry? Open the app and see who's cooking near you.</p>",
  short: "<p>Food from the restaurants near you, in three steps.</p>",
  numbers: [stat("35 min", "To your door"), stat("40+", "Restaurants"), stat("7 days", "A week")],
  photos: ["art-banner-food.png", "art-dish-burger.png", "art-dish-wrap.png", "art-dish-soup.png", "art-dish-breakfast.png", "art-dish-baklava.png"],
  contactWords: "<p>A question about an order, or want your restaurant in the app? Send us a message: we answer within the hour.</p>",
  join: {
    title: "Partner with us",
    intro: "<p>Run a restaurant? Reach new customers without your own couriers. Ride a motorbike? Deliver with us on your own hours.</p>",
    perks: [card("More orders", "Customers across the city find your kitchen."), card("Our couriers", "We collect and deliver every order."), card("Paid every week", "For restaurants and couriers alike.")],
    formTitle: "Tell us about you",
    fields: joinFields("Your restaurant's name, or what you ride"),
    button: "Send",
    done: "Thank you. Our team will call you within a few days.",
  },
  joinLabel: "Partner with us",
  opening: hours("Delivery hours", days(WEEK, "11:00", "23:00")),
};

const RIDES: Kit = {
  steps: [card("1. Say where to", "Type where you're going and see the price."), card("2. A driver comes", "See your driver, the car and where they are."), card("3. Ride and pay", "In cash or by card when you arrive.")],
  offer: {
    title: "Ways to ride",
    cards: [
      card("Economy", "Everyday rides at the best price.", "art-car-teal.png", screen("ride")),
      card("Comfort", "Newer cars with more room.", "art-car-dark.png", screen("ride")),
      card("Taxi", "Licensed city taxis.", "art-car-yellow.png", screen("ride")),
    ],
  },
  questions: [
    question("Can I share my ride?", "Yes: share the ride's link with anyone, they see the driver, the car and where it is until you arrive."),
    question("Are your drivers checked?", "Yes. We check every driver's licence, car and record before their first ride."),
    question("Can I see my driver before they arrive?", "Yes. The app shows your driver's name, car and plate, and where they are on the map."),
    question("How do I pay?", "In cash to the driver, or by card when your ride ends."),
    question("I left something in the car. What do I do?", "Open My rides, choose the ride and send us a message. We'll contact the driver."),
    question("How is the price worked out?", "You see an estimate before you ask for a ride. It depends on the distance and the time of day."),
  ],
  quotes: [
    quote("I share my ride with my sister every night I work late. She sleeps better.", "Dina M.", "Rider"),
    quote("Clean car, kind driver, and the price I saw was the price I paid.", "Burak T.", "Rider"),
    quote("The driver arrived in four minutes at two in the morning.", "Ahmed F.", "Rider"),
  ],
  team: [who("karim", "Founder"), who("deniz", "Drivers' support"), who("omar", "Safety"), who("selin", "Customer service")],
  story:
    "<p>{app} was started by drivers who wanted a fairer way to work and riders who wanted a safer way home. We check every driver before their first ride, inspect every car, and every ride can be shared with someone you trust. You see the price before you go, and pay in cash or by card. Day or night, a ride is a few taps away.</p>",
  short: "<p>A ride in three steps, with a checked driver and the price before you go.</p>",
  numbers: [stat("5 min", "To your door"), stat("24/7", "Day and night"), stat("100+", "Drivers")],
  photos: ["art-car-teal.png", "art-car-dark.png", "art-car-yellow.png", "art-banner-rides.png", "art-article-bridge.png", "art-place-office.png"],
  contactWords: "<p>A question about a ride, a lost item or driving with us? Send us a message: we answer around the clock.</p>",
  join: {
    title: "Drive with us",
    intro: "<p>Drive when it suits you and keep more of what you earn. We need drivers with a clean licence and a car in good shape.</p>",
    perks: [card("Your own hours", "Drive mornings, nights or weekends."), card("Paid every week", "Your earnings every Monday."), card("Support on every ride", "A real person, day and night.")],
    formTitle: "Apply to drive",
    fields: joinFields("Your car's make, model and year"),
    button: "Apply",
    done: "Thank you. We'll call you to check your documents.",
  },
  joinLabel: "Drive with us",
  opening: hours("Customer service", days(WEEK, "08:00", "00:00"), "Rides are there day and night."),
};

const TAXI: Kit = {
  ...RIDES,
  steps: [card("1. See the taxis", "The free taxis near you, on the map."), card("2. Ask for one", "One tap, and the nearest one comes."), card("3. Ride and pay", "In cash or by card when you arrive.")],
  offer: {
    title: "Our taxis",
    cards: [
      card("City taxi", "Licensed taxis, day and night.", "art-car-yellow.png", screen("ride")),
      card("Large taxi", "Room for six, or for big bags.", "art-car-dark.png", screen("ride")),
      card("Airport", "To and from the airport, at a set price.", "art-car-teal.png", screen("ride")),
    ],
  },
  quotes: [
    quote("I watch the taxi on the map and walk out when it's at the corner.", "Merve A.", "Rider"),
    quote("Licensed drivers who know every shortcut.", "Hakan D.", "Rider"),
    quote("Paying by card at the end is so easy.", "Gül S.", "Rider"),
  ],
  story:
    "<p>{app} brings the city's taxis to your phone. See the free taxis around you on the map, ask for one in a tap and watch it come to you. Our drivers are licensed and know the city's streets by heart, and every ride can be shared with someone you trust. Pay in cash or by card, and rate your ride when you arrive: we read every rating.</p>",
  short: "<p>A taxi in three steps, and your driver on the map the whole way.</p>",
  numbers: [stat("3 min", "The nearest taxi"), stat("24/7", "Day and night"), stat("Live", "On the map")],
  photos: ["art-car-yellow.png", "art-car-dark.png", "art-car-teal.png", "art-banner-rides.png", "art-article-bridge.png", "art-article-tram.png"],
  join: { ...RIDES.join, title: "Drive a taxi with us", intro: "<p>Licensed taxi driver? Get more rides with less waiting: the app sends you riders close by.</p>", formTitle: "Apply to drive", fields: joinFields("Your taxi's licence number") },
  joinLabel: "Drive with us",
};

/** A home page's last blocks, the same in each design: what people say, questions and a way to join. */
const ending = (kit: Kit, join: Action, questions = kit.questions.slice(0, 4)): LayoutBlock[] => [
  testimonials("What customers say", kit.quotes),
  faq("Questions", questions),
  button("join", kit.joinLabel, join, "outlined", "groups"),
  contact(),
];

const deliveryTabs = [homeTab, screenTab("send", "Send", "local_shipping", "send_parcel"), screenTab("shipments", "My shipments", "package_2", "shipments"), accountTab];

export const DELIVERY_DESIGNS: Design[] = [
  {
    id: "delivery-city",
    kind: "delivery",
    name: "City courier",
    description: "Send a parcel in one tap, your services, how it works and your numbers.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#F4A261" },
    tabs: deliveryTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Send a parcel across the city", "A courier picks it up at your door", screen("send_parcel")),
              slide("Follow it all the way", "Every step in My shipments", screen("shipments")),
              slide("Deliveries for your shop", "Daily pickups, one invoice", page("contact")),
            ],
            false,
          ),
          list("services", "Our services", "delivery_services", "list", { seeAll: screen("send_parcel") }),
          steps(DELIVERY),
          stats([stat("30 min", "To pick up"), stat("1,000+", "Parcels a month"), stat("7 days", "A week")]),
          ...ending(DELIVERY, page("join")),
        ],
      },
      ...kitPages(DELIVERY),
    ],
  },
  {
    id: "delivery-express",
    kind: "delivery",
    name: "Express",
    description: "Speed first: a notice, quick links to send and follow, and your services.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#E63946" },
    tabs: deliveryTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("info", "Book before 4 pm for delivery today.", "Send now", screen("send_parcel")),
          slider([
            slide("Picked up in 30 minutes", "Delivered across town within two hours", screen("send_parcel")),
            slide("Documents signed for", "With a photo at delivery", screen("send_parcel")),
            slide("Ride with us", "Become a courier", page("join")),
          ]),
          quickLinks([
            link("local_shipping", "Send", screen("send_parcel")),
            link("package_2", "My shipments", screen("shipments")),
            link("help", "How it works", page("how-it-works")),
            link("person", "Account", screen("account")),
          ]),
          list("services", "Choose a service", "delivery_services", "carousel", { seeAll: screen("send_parcel") }),
          steps(DELIVERY),
          cards("offer", DELIVERY.offer.title, DELIVERY.offer.cards),
          ...ending(DELIVERY, page("join")),
        ],
      },
      ...kitPages(DELIVERY),
    ],
  },
  {
    id: "delivery-business",
    kind: "delivery",
    name: "Business deliveries",
    description: "For shops and companies: your services, working hours and a team to talk to.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Manrope", secondary_color: "#2A9D8F" },
    tabs: deliveryTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Deliveries for your business</h2><p>{app} picks up from your shop and delivers to your customers.</p>"),
          slider(
            [
              slide("Your shop's own couriers", "Daily pickups at a time you choose", screen("send_parcel")),
              slide("One invoice a month", "Every delivery listed", page("contact")),
              slide("Your customers can follow it", "Every step, from pickup to their door", screen("shipments")),
            ],
            false,
          ),
          button("send", "Send a parcel", screen("send_parcel")),
          list("services", "Services", "delivery_services", "list", { seeAll: screen("send_parcel") }),
          steps(DELIVERY),
          hours("Working hours", days(WEEKDAYS_ONLY, "09:00", "21:00")),
          team("Talk to us", DELIVERY.team),
          ...ending(DELIVERY, page("join"), [DELIVERY.questions[5]!, DELIVERY.questions[1]!, DELIVERY.questions[0]!, DELIVERY.questions[4]!]),
        ],
      },
      ...kitPages({ ...DELIVERY, opening: hours("Working hours", days(WEEKDAYS_ONLY, "09:00", "21:00")) }),
    ],
  },
];

const foodTabs = [homeTab, screenTab("restaurants", "Restaurants", "restaurant_menu", "restaurants"), screenTab("orders", "My orders", "receipt_long", "food_orders"), accountTab];

export const FOOD_DESIGNS: Design[] = [
  {
    id: "food-city",
    kind: "food",
    name: "City food",
    description: "Hungry in one tap: an offer, the restaurants near you and how fast food arrives.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#F4A261" },
    tabs: foodTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Your city's restaurants, delivered", "Order from any of them and follow your food", screen("restaurants")),
              slide("Still hot at your door", "Every order in a warm bag", screen("restaurants")),
              slide("Run a restaurant?", "Partner with us", page("join")),
            ],
            false,
          ),
          quickLinks([
            link("restaurant_menu", "Restaurants", screen("restaurants")),
            link("receipt_long", "My orders", screen("food_orders")),
            link("help", "How it works", page("how-it-works")),
            link("person", "Account", screen("account")),
          ]),
          list("restaurants", "Restaurants", "restaurants", "list", { seeAll: screen("restaurants") }),
          steps(FOOD),
          stats([stat("35 min", "To your door"), stat("40+", "Restaurants"), stat("7 days", "A week")]),
          ...ending(FOOD, page("join")),
        ],
      },
      ...kitPages(FOOD),
    ],
  },
  {
    id: "food-express",
    kind: "food",
    name: "Quick bites",
    description: "Speed first: a notice, quick links to order and follow, and the restaurants side by side.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#E63946" },
    tabs: foodTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("info", "Free delivery from new restaurants this week.", "Order now", screen("restaurants")),
          slider([
            slide("Hungry? Order in a minute", "The restaurants open near you", screen("restaurants")),
            slide("Lunch at your desk", "Delivered in half an hour", screen("restaurants")),
            slide("Follow your food", "Your courier on the map", screen("food_orders")),
          ]),
          quickLinks([
            link("restaurant_menu", "Restaurants", screen("restaurants")),
            link("receipt_long", "My orders", screen("food_orders")),
            link("notifications", "Updates", screen("notifications")),
            link("person", "Account", screen("account")),
          ]),
          list("restaurants", "Order from", "restaurants", "carousel", { seeAll: screen("restaurants") }),
          cards("offer", FOOD.offer.title, FOOD.offer.cards),
          steps(FOOD),
          ...ending(FOOD, page("join")),
        ],
      },
      ...kitPages(FOOD),
    ],
  },
  {
    id: "food-neighbourhood",
    kind: "food",
    name: "Neighbourhood kitchens",
    description: "Warm and local: a welcome, the restaurants, your delivery hours and a team to talk to.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Manrope", secondary_color: "#2A9D8F" },
    tabs: foodTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Your neighbourhood's kitchens</h2><p>{app} brings you food from the restaurants around you.</p>"),
          slider(
            [
              slide("Cooked around the corner", "Family kitchens near you", screen("restaurants")),
              slide("Soup, bread and home cooking", "Like your grandmother's", screen("restaurants")),
              slide("Help a local kitchen grow", "Order from the ones you love", screen("restaurants")),
            ],
            false,
          ),
          button("order", "Order food", screen("restaurants")),
          list("restaurants", "Restaurants", "restaurants", "list", { seeAll: screen("restaurants") }),
          steps(FOOD),
          hours("Delivery hours", days(WEEK, "11:00", "23:00")),
          team("Talk to us", FOOD.team),
          ...ending(FOOD, page("join")),
        ],
      },
      ...kitPages(FOOD),
    ],
  },
];

const ridesTabs = [homeTab, screenTab("ride", "Ride", "local_taxi", "ride"), screenTab("rides", "My rides", "receipt_long", "my_rides"), accountTab];

export const RIDES_DESIGNS: Design[] = [
  {
    id: "rides-city",
    kind: "rides",
    name: "City rides",
    description: "Where to? A big button to ask for a ride, your vehicle types and how fast a driver comes.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#F4D35E" },
    tabs: ridesTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Where to?", "A driver comes to you in minutes", screen("ride")),
              slide("Share your ride", "Someone you trust sees where you are", page("how-it-works")),
              slide("Drive with us", "On your own hours", page("join")),
            ],
            false,
          ),
          button("ride", "Ask for a ride", screen("ride")),
          list("vehicle_types", "Ride with us", "vehicle_types", "list", { seeAll: screen("ride") }),
          steps(RIDES),
          stats([stat("5 min", "To your door"), stat("24/7", "Day and night"), stat("100+", "Drivers")]),
          ...ending(RIDES, page("join")),
        ],
      },
      ...kitPages(RIDES),
    ],
  },
  {
    id: "rides-quick",
    kind: "rides",
    name: "Quick rides",
    description: "Speed first: a notice, quick links to ride and follow, and your vehicle types side by side.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#2EC4B6" },
    tabs: ridesTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("info", "Your first ride this week is 20% off.", "Ride now", screen("ride")),
          slider([
            slide("A ride in minutes", "Day and night", screen("ride")),
            slide("The price before you go", "No surprises at the end", screen("ride")),
            slide("Checked drivers", "Every licence, car and record", page("how-it-works")),
          ]),
          quickLinks([
            link("local_taxi", "Ride", screen("ride")),
            link("receipt_long", "My rides", screen("my_rides")),
            link("help", "How it works", page("how-it-works")),
            link("person", "Account", screen("account")),
          ]),
          list("vehicle_types", "Choose your ride", "vehicle_types", "carousel", { seeAll: screen("ride") }),
          cards("offer", RIDES.offer.title, RIDES.offer.cards),
          steps(RIDES),
          ...ending(RIDES, page("join")),
        ],
      },
      ...kitPages(RIDES),
    ],
  },
  {
    id: "rides-comfort",
    kind: "rides",
    name: "Comfort rides",
    description: "Calm and premium: a welcome, your cars, safety on every ride and a team to talk to.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Manrope", secondary_color: "#C9A227" },
    tabs: ridesTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Ride in comfort</h2><p>{app} takes you there with drivers you can trust.</p>"),
          slider(
            [
              slide("Newer cars, more room", "For the ride home or to the airport", screen("ride")),
              slide("Drivers you can trust", "Checked before their first ride", page("how-it-works")),
              slide("Off to the airport?", "Room for you and your bags", screen("ride")),
            ],
            false,
          ),
          button("ride", "Book a ride", screen("ride")),
          list("vehicle_types", "Our cars", "vehicle_types", "list", { seeAll: screen("ride") }),
          cards("offer", RIDES.offer.title, RIDES.offer.cards),
          team("Talk to us", RIDES.team),
          ...ending(RIDES, page("join"), [RIDES.questions[0]!, RIDES.questions[1]!, RIDES.questions[2]!, RIDES.questions[4]!]),
        ],
      },
      ...kitPages(RIDES),
    ],
  },
];

const taxiTabs = [homeTab, screenTab("ride", "Taxi", "local_taxi", "ride"), screenTab("rides", "My rides", "receipt_long", "my_rides"), accountTab];

export const TAXI_DESIGNS: Design[] = [
  {
    id: "taxi-live",
    kind: "taxi",
    name: "Live taxi",
    description: "Where to? The free taxis around you on the map, one tap to ask and your driver second by second.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#F5B400" },
    tabs: taxiTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Where to?", "The nearest taxi comes to you", screen("ride")),
              slide("Watch it come", "Your taxi on the map, second by second", screen("ride")),
              slide("Drive a taxi?", "Get riders close by", page("join")),
            ],
            false,
          ),
          button("ride", "Ask for a taxi", screen("ride")),
          list("vehicle_types", "Our taxis", "vehicle_types", "list", { seeAll: screen("ride") }),
          steps(TAXI),
          stats([stat("3 min", "The nearest taxi"), stat("24/7", "Day and night"), stat("Live", "On the map")]),
          ...ending(TAXI, page("join")),
        ],
      },
      ...kitPages(TAXI),
    ],
  },
  {
    id: "taxi-city",
    kind: "taxi",
    name: "City taxi",
    description: "A notice for today's offer, quick links to ask and follow, and your taxis side by side.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#FFD23F" },
    tabs: taxiTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("info", "Airport rides at a set price, every day.", "Ask now", screen("ride")),
          slider([
            slide("A licensed taxi, in minutes", "Day and night", screen("ride")),
            slide("Pay by card", "Or in cash, as you like", screen("ride")),
            slide("Share your ride", "Someone you trust sees where you are", page("how-it-works")),
          ]),
          quickLinks([
            link("local_taxi", "Taxi", screen("ride")),
            link("receipt_long", "My rides", screen("my_rides")),
            link("help", "How it works", page("how-it-works")),
            link("person", "Account", screen("account")),
          ]),
          list("vehicle_types", "Choose your taxi", "vehicle_types", "carousel", { seeAll: screen("ride") }),
          cards("offer", TAXI.offer.title, TAXI.offer.cards),
          steps(TAXI),
          ...ending(TAXI, page("join")),
        ],
      },
      ...kitPages(TAXI),
    ],
  },
  {
    id: "taxi-night",
    kind: "taxi",
    name: "Night taxi",
    description: "Dark and calm: a welcome, your taxis, safety on every ride and a team to talk to.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Manrope", secondary_color: "#F2C14E" },
    tabs: taxiTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>A taxi, whenever you need one</h2><p>{app} shows you the nearest taxi and its driver on the way.</p>"),
          slider(
            [
              slide("Home safe, at any hour", "A taxi in minutes, all night", screen("ride")),
              slide("Share your ride", "Someone you trust sees where you are", page("how-it-works")),
              slide("Licensed drivers", "Who know the city by heart", page("how-it-works")),
            ],
            false,
          ),
          button("ride", "Ask for a taxi", screen("ride")),
          list("vehicle_types", "Our taxis", "vehicle_types", "list", { seeAll: screen("ride") }),
          steps(TAXI),
          team("Talk to us", TAXI.team),
          ...ending(TAXI, page("join"), [TAXI.questions[0]!, TAXI.questions[1]!, TAXI.questions[2]!, TAXI.questions[4]!]),
        ],
      },
      ...kitPages(TAXI),
    ],
  },
];
