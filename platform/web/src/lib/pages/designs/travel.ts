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
  type Design,
} from "./build";
import { aboutPage, contactPage, otherPage, questionsPage, who } from "./pages";

// 126 Travel companies: hotels, flights or both. The app's own screens do the
// searching and booking (Stays, Flights, Trips); these pages say who the
// company is, its packages (Umrah, holidays, groups) and answer questions.

const travelTabs = [
  { ...homeTab, label: "Explore", icon: "travel_explore" },
  screenTab("stays", "Stays", "bed", "stays"),
  screenTab("flights", "Flights", "flight", "flights"),
  screenTab("trips", "Trips", "luggage", "trips"),
  accountTab,
];

const PAY = question("How do I pay?", "By card on our secure payment page when you book, or at the hotel when the room offers it.");
const CANCEL = question("Can I cancel or change my booking?", "Yes, from Trips in the app. Rooms with free cancellation are refunded in full until the date shown; flights follow their fare's rules.");
const PASS = question("Where is my boarding pass?", "In Trips, from 48 hours before the flight. It stays on your phone, so you can show it without a connection.");
const BAGS = question("How many bags can I take?", "It depends on the fare you choose: each fare shows its cabin bag and checked bags before you book.");
const TOGETHER = question("Is a stay and a flight cheaper together?", "Yes. Book both as one trip and the price shown is lower than booking them apart.");
const PRICE = question("Can you tell me when a price drops?", "Yes. Turn on a price alert for a route in Flights and we'll tell you on your phone.");
const UMRAH = question("Do you arrange Umrah trips?", "Yes: flights, hotels near the Haram and transfers, for families and groups. Ask us on the Packages page.");
const GROUPS = question("Do you book for groups?", "Yes, for ten people or more. Send us your dates and we'll prepare an offer.");

const QUOTES = [
  quote("The flight, the hotel and the transfer in one booking. Nothing to worry about.", "Hana M.", "Family trip"),
  quote("I showed my boarding pass at the gate without any signal. Simple and quick.", "Karim S.", "Business traveller"),
  quote("Our Umrah group was looked after from the first call to the flight home.", "Fatma Y.", "Umrah group"),
];

const NUMBERS = [stat("40+", "Hotels"), stat("12", "Routes"), stat("20", "Years")];

const STAFF = [who("mariam", "Travel adviser"), who("tarek", "Flights and groups"), who("leyla", "Hotels"), who("yusuf", "Umrah trips")];

const STORY =
  "<p>{app} has planned trips for twenty years. We started with a small office and a few hotels we knew well, and today we fly our own charter seats and work with hotels we have visited ourselves. We keep things simple: a fair price shown in full, a person to talk to when plans change, and the whole trip in one place. Whether it's a weekend away, a family holiday or Umrah, we'd love to plan yours.</p>";

const PHOTOS = [
  ["art-article-harbour.png", "By the sea"],
  ["art-article-bridge.png", "City breaks"],
  ["art-room-bedroom.png", "Rooms we know"],
  ["art-dish-breakfast.png", "Breakfast included"],
  ["art-article-market.png", "Old towns"],
  ["art-article-tram.png", "Getting around"],
  ["art-room-living.png", "Suites"],
  ["art-place-office.png", "Our office"],
] as [string, string][];

const ALERTS = () => notice("info", "Watch a route and we'll tell you when its price drops.", "Price alerts", screen("price_alerts"), "alerts");

const travelPages = () => [
  otherPage("packages", "Packages", [
    text("packages-intro", "<p>Besides single stays and flights, we put whole trips together: flights, hotels and transfers, for families, friends and groups.</p>"),
    cards("package-kinds", "What we arrange", [
      card("Umrah", "Flights, a hotel near the Haram and every transfer."),
      card("Family holidays", "Rooms for everyone and flights at family times."),
      card("Honeymoons", "Quiet hotels, sea views and a few surprises."),
      card("Groups", "Ten people or more, one offer and one contact."),
    ]),
    faq("Package questions", [UMRAH, GROUPS, TOGETHER, PAY], "package-questions"),
    form(
      "package-form",
      "Ask us for a trip",
      [
        field("name", "text", "Your name", true),
        field("phone", "phone", "Phone number", true),
        field("email", "email", "Email"),
        field("where", "text", "Where to?"),
        field("people", "number", "How many travellers?", true),
        field("message", "long_text", "Your dates and wishes"),
      ],
      "Send",
      "Thank you. A travel adviser will call you within a working day.",
    ),
  ]),
  aboutPage({ story: STORY, people: { title: "Our advisers", list: STAFF }, numbers: NUMBERS, photos: { title: "Where we go", files: PHOTOS } }),
  contactPage(
    "<p>Our advisers answer every day. Call us, write, or send a message here and we'll answer the same day.</p>",
    hours("Advisers", days(WEEK, "09:00", "21:00")),
  ),
  questionsPage("<p>What travellers ask us most.</p>", [PAY, CANCEL, PASS, BAGS, TOGETHER, PRICE, UMRAH]),
];

export const TRAVEL_DESIGNS: Design[] = [
  {
    id: "travel-explore",
    kind: "travel",
    name: "Explore",
    description: "A big welcome, stays and flights a tap away, the featured hotels and what travellers say.",
    look: { template: "classic", corners: "round", cards: "outlined", font: "Manrope", secondary_color: "#C9A063" },
    tabs: travelTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Where does the next story begin?", "Stays, flights, or both as one trip at one price", screen("stays")),
              slide("Fly with us", "Choose your fare and your seat", screen("flights")),
              slide("Umrah and holidays", "Whole trips, planned with you", page("packages")),
            ],
            false,
          ),
          quickLinks([
            link("bed", "Stays", screen("stays")),
            link("flight", "Flights", screen("flights")),
            link("luggage", "My trips", screen("trips")),
            link("notifications", "Price alerts", screen("price_alerts")),
          ]),
          list("hotels", "Featured stays", "hotels", "carousel", { featured: true, seeAll: screen("stays") }),
          ALERTS(),
          stats(NUMBERS),
          testimonials("What travellers say", QUOTES),
          faq("Questions", [PAY, CANCEL, PASS, TOGETHER]),
          button("packages", "Plan a whole trip with us", page("packages"), "outlined", "luggage"),
          contact(),
        ],
      },
      ...travelPages(),
    ],
  },
  {
    id: "travel-escape",
    kind: "travel",
    name: "Escape",
    description: "Holiday mood: the stays first, a button to the flights, the packages and our advisers.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#FF6B3D" },
    tabs: travelTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Stay somewhere unforgettable", "Rooms by the sea, in the old town and on the caldera", screen("stays")),
              slide("The whole sky, one search", "Return fares with your bags shown", screen("flights")),
              slide("Together for less", "A stay and a flight as one trip", screen("stays")),
            ],
            false,
          ),
          list("hotels", "Stays we love", "hotels", "carousel", { seeAll: screen("stays") }),
          button("flights", "Search flights", screen("flights"), "filled", "flight"),
          cards("ways", "Ways to travel", [card("Stay + Flight", "One booking, one price."), card("Umrah", "Flights, hotel and transfers.", null, page("packages"))]),
          team("Your advisers", STAFF),
          testimonials("What travellers say", QUOTES),
          faq("Questions", [TOGETHER, BAGS, CANCEL, UMRAH]),
          contact(),
        ],
      },
      ...travelPages(),
    ],
  },
  {
    id: "travel-calm",
    kind: "travel",
    name: "Calm journeys",
    description: "Quiet and clear: a short welcome, the hotels, your trips and the questions travellers ask.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Plus Jakarta Sans", secondary_color: "#1F6F8B" },
    tabs: travelTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Welcome</h2><p>{app} brings its hotels and flights to your phone, and keeps your whole trip in one place.</p>"),
          slider(
            [
              slide("Rooms we know", "Hotels our advisers have stayed in", screen("stays")),
              slide("Your trip, in one place", "The flight, the stay and the boarding pass", screen("trips")),
              slide("Plan it with us", "Umrah, holidays and groups", page("packages")),
            ],
            false,
          ),
          button("stays", "Find a stay", screen("stays")),
          list("hotels", "Our hotels", "hotels", "list", { seeAll: screen("stays") }),
          ALERTS(),
          stats(NUMBERS),
          testimonials("What travellers say", QUOTES),
          faq("Questions", [PAY, PASS, BAGS, GROUPS]),
          contact(),
        ],
      },
      ...travelPages(),
    ],
  },
];
