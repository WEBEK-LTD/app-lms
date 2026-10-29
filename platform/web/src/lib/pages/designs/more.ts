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
  gallery,
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
  search,
  slide,
  slider,
  stat,
  stats,
  team,
  testimonials,
  text,
  WEEKDAYS_ONLY,
  type Design,
} from "./build";
import { aboutPage, contactPage, otherPage, questionsPage, who } from "./pages";

// 33 Real estate, news, events and charity apps: one engine and one kind each.
// 110.3 With their Areas and Valuation, Visit and Hire, Our work and Volunteer pages.

const listingsTabs = [
  homeTab,
  screenTab("search", "Search", "search", "search"),
  screenTab("favorites", "Favorites", "favorite", "favorites"),
  screenTab("messages", "Messages", "chat", "messages"),
  accountTab,
];

const AREAS = [
  card("City centre", "Flats close to everything, from studios to penthouses.", "art-home-zamalek.png", screen("search")),
  card("Garden suburbs", "Family houses with gardens and quiet streets.", "art-home-maadi.png", screen("search")),
  card("New town", "New buildings, parks and good schools.", "art-home-newcairo.png", screen("search")),
  card("Riverside", "Homes with a view, close to the water.", "art-home-zayed.png", screen("search")),
  card("Old town", "Character homes on historic streets.", "art-home-heliopolis.png", screen("search")),
  card("Leafy hills", "Villas and townhouses among the trees.", "art-home-garden-city.png", screen("search")),
];

const REAL_ESTATE_QUESTIONS = [
  question("How do I book a viewing?", "Open a home and send us a message with the days that suit you."),
  question("Can I save homes to look at later?", "Yes. Tap the heart on any home: your saved homes are under Favorites."),
  question("Do you charge buyers a fee?", "Our fee is on each home before you book a viewing. Looking costs nothing."),
  question("Is a home in the app still available?", "We take homes off the app as soon as they're sold or let. Send us a message to be sure."),
  question("Can you help me sell or let my home?", "Yes. Ask for a free valuation and an agent visits within a week."),
  question("What do I need to rent a home?", "Usually your ID, proof of income and a deposit. Your agent tells you exactly what's needed."),
  question("Can I hear about new homes first?", "Yes. Turn on notifications and we tell you when new homes are listed."),
];

const HOMES_PHOTOS = ["art-home-zamalek.png", "art-home-maadi.png", "art-home-newcairo.png", "art-room-living.png", "art-room-kitchen.png", "art-room-bedroom.png", "art-home-heliopolis.png", "art-home-garden-city.png"];

const REAL_ESTATE_CONTACT = "<p>Looking to buy, rent or sell? Send us a message and the right agent will call you back the same day.</p>";

/** A real estate agency's pages: its areas, a valuation, its story, how to reach it and questions. */
function realEstatePages(story: string, people: { title: string; list: ReturnType<typeof who>[] }) {
  return [
    otherPage("areas", "Areas", [
      text("areas-intro", "<p>We know every street in the areas we work in. Choose one to see its homes.</p>"),
      cards("areas", null, AREAS),
      list("new-listings", "Just listed", "listings", "list", { limit: 5, seeAll: screen("search") }),
    ]),
    otherPage("valuation", "Valuation", [
      text("valuation-intro", "<p>Thinking of selling or letting your home? Ask for a free valuation: an agent visits, looks at recent sales nearby and tells you what your home is worth.</p>"),
      cards("valuation-steps", "How it works", [
        card("1. Tell us about it", "Fill in the form below: it takes a minute."),
        card("2. We visit", "An agent comes at a time that suits you."),
        card("3. You get a price", "A fair price in writing, with no obligation."),
        card("4. We sell or let it", "If you like, we take it from there."),
      ]),
      form(
        "sell",
        "Sell or let with us",
        [
          field("name", "text", "Your name", true),
          field("phone", "phone", "Phone number", true),
          field("email", "email", "Email"),
          field("address", "text", "The home's address", true),
          field("rooms", "number", "Number of bedrooms"),
          field("details", "long_text", "Anything else we should know"),
        ],
        "Ask for a valuation",
        "Thank you. An agent will call you within a working day.",
      ),
    ]),
    aboutPage({ story, people, numbers: [stat("500+", "Homes sold"), stat("15", "Years"), stat("4.9", "Client rating")], photos: { title: "Homes we've sold", files: HOMES_PHOTOS } }),
    contactPage(REAL_ESTATE_CONTACT, hours("Office hours", [...days(WEEKDAYS_ONLY, "09:00", "18:00"), ...days(["sat"], "10:00", "15:00")])),
    questionsPage("<p>What buyers, tenants and owners ask us most.</p>", REAL_ESTATE_QUESTIONS),
  ];
}

const AGENTS = [who("omar", "Sales"), who("nadia", "Rentals"), who("can", "Valuations"), who("zeynep", "Office manager")];
const LUXURY_ADVISERS = [who("karim", "Partner"), who("leyla", "Private sales"), who("emre", "Interiors"), who("mariam", "Client care")];

export const REAL_ESTATE_DESIGNS: Design[] = [
  {
    id: "real-estate-agency",
    kind: "real_estate",
    name: "Agency",
    description: "Search first, slides, new and top listings, your agents and how to reach the office.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#C9A24B" },
    tabs: listingsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          search("listings", "Search properties"),
          slider([
            slide("Find your next home", "Homes for sale and for rent", screen("search")),
            slide("Selling your home?", "Ask for a free valuation", page("valuation")),
            slide("Know the area", "Our guide to every neighbourhood", page("areas")),
          ]),
          cards("areas", "Areas", AREAS.slice(0, 4)),
          list("featured", "Featured homes", "listings", "carousel", { featured: true, seeAll: screen("search") }),
          list("new-listings", "New listings", "listings", "list", { limit: 5, seeAll: screen("search") }),
          list("top", "Top properties", "listings", "carousel", { sort: "price_desc" }),
          team("Our agents", AGENTS),
          stats([stat("500+", "Homes sold"), stat("15", "Years"), stat("4.9", "Client rating")]),
          testimonials("What clients say", [
            quote("Nadia found us a flat near my daughter's school in a week, and the paperwork was easy.", "Huda M.", "Tenant"),
            quote("We sold our house in a month, at the price they told us to ask.", "Hakan D.", "Seller"),
            quote("Honest about every home, even the ones that weren't right for us.", "Lina A.", "Buyer"),
          ]),
          faq("Questions", REAL_ESTATE_QUESTIONS.slice(0, 5)),
          button("valuation", "Sell with us", page("valuation"), "outlined", "home_work"),
          contact("Visit the office"),
        ],
      },
      ...realEstatePages(
        "<p>{app} has helped families find homes in this city for fifteen years. Our agents live in the areas they sell, so they can tell you which streets are quiet, where the good schools are and what a fair price looks like. One of us has visited every home in the app, with real photos and honest descriptions. Looking to buy, rent or sell? Send us a message and the right agent will call you back the same day.</p>",
        { title: "Our agents", list: AGENTS },
      ),
    ],
  },
  {
    id: "real-estate-rentals",
    kind: "real_estate",
    name: "Rentals",
    description: "Quick links, the newest rentals as a grid, lowest rents, questions and office hours.",
    look: { template: "minimal", corners: "round", cards: "flat", font: "DM Sans", secondary_color: "#2A9D8F" },
    tabs: listingsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          search("listings", "Where do you want to live?"),
          slider([
            slide("Your next home is here", "Checked homes, clear monthly prices", screen("search")),
            slide("Book viewings in a few taps", "Choose the days that suit you", screen("search")),
            slide("Own a flat?", "We find good tenants and look after it", page("valuation")),
          ]),
          quickLinks([
            link("search", "Search", screen("search")),
            link("home_work", "All homes", screen("courses")),
            link("favorite", "Favorites", screen("favorites")),
            link("chat", "Messages", screen("messages")),
          ]),
          list("just-listed", "Just listed", "listings", "grid", { limit: 6, seeAll: screen("search") }),
          list("lowest-rent", "Lowest prices", "listings", "list", { sort: "price_asc", limit: 5 }),
          cards("areas", "Popular areas", AREAS.slice(0, 4)),
          testimonials("What tenants say", [
            quote("I booked three viewings on Saturday from my phone and signed on Monday.", "Youssef R.", "Tenant"),
            quote("The rent in the app was the rent I paid. No surprises.", "Gül S.", "Tenant"),
            quote("They found good tenants for my flat and handle every repair.", "Mert Y.", "Owner"),
          ]),
          faq("Questions", [REAL_ESTATE_QUESTIONS[0]!, REAL_ESTATE_QUESTIONS[5]!, REAL_ESTATE_QUESTIONS[1]!, REAL_ESTATE_QUESTIONS[6]!]),
          hours("Office hours", [...days(WEEKDAYS_ONLY, "09:00", "18:00"), ...days(["sat"], "10:00", "15:00")]),
          contact(),
        ],
      },
      ...realEstatePages(
        "<p>{app} makes renting simple. We check every home before it goes in the app, show the full monthly price with no surprises and answer your questions the same day. Book viewings in a few taps, save the homes you like and hear when something new comes up in your area. For owners, we find good tenants, collect the rent and look after repairs, so your home is in safe hands.</p>",
        { title: "Our agents", list: AGENTS },
      ),
    ],
  },
  {
    id: "real-estate-luxury",
    kind: "real_estate",
    name: "Luxury homes",
    description: "Bold and dark-edged: signature properties, your story and your advisers.",
    look: { template: "bold", corners: "sharp", cards: "elevated", font: "Manrope", secondary_color: "#B08D57" },
    tabs: listingsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Homes with a view", "A private selection of properties", screen("search")),
              slide("Villas with gardens", "Shown in person by an adviser", screen("search")),
              slide("Selling quietly?", "A private valuation, in confidence", page("valuation")),
            ],
            false,
          ),
          list("signature", "Signature properties", "listings", "carousel", { sort: "price_desc", seeAll: screen("search") }),
          text("about", "<h3>About {app}</h3><p>A small number of exceptional homes, shown in person and sold in confidence.</p>"),
          cards("areas", "Where we work", AREAS.slice(2, 6)),
          list("featured", "Featured", "listings", "list", { featured: true, limit: 4 }),
          team("Your advisers", LUXURY_ADVISERS),
          stats([stat("150+", "Homes sold"), stat("20", "Years"), stat("4.9", "Client rating")]),
          testimonials("Clients", [
            quote("They understood what we were looking for before we did.", "Salma H.", "Buyer"),
            quote("Discreet, patient and very well connected. Our villa sold privately in weeks.", "A client", "Seller"),
            quote("Every viewing was in person, with an adviser who knew the house inside out.", "Ahmed F.", "Buyer"),
          ]),
          faq("Questions", [REAL_ESTATE_QUESTIONS[0]!, REAL_ESTATE_QUESTIONS[2]!, REAL_ESTATE_QUESTIONS[4]!, REAL_ESTATE_QUESTIONS[6]!]),
          button("valuation", "Ask for a private valuation", page("valuation"), "outlined", "home_work"),
          contact("Talk to us"),
        ],
      },
      ...realEstatePages(
        "<p>{app} represents a small number of exceptional homes: villas with gardens, apartments with views and houses with a story. We work quietly, show each property in person and keep our clients' plans private. Our advisers know the market, the buildings and the people who build them. Whether you are buying, selling or simply looking, we take the time to understand what you want.</p>",
        { title: "Your advisers", list: LUXURY_ADVISERS },
      ),
    ],
  },
];

const newsTabs = [homeTab, screenTab("articles", "Latest", "newspaper", "articles"), screenTab("saved", "Saved", "bookmark", "bookmarks"), accountTab];

const NEWS_QUESTIONS = [
  question("How do I get breaking news?", "Turn on notifications. We only send the stories that matter, a few times a day at most."),
  question("Can I save a story to read later?", "Yes. Tap the bookmark on any story: you'll find it under Saved."),
  question("Is the news free to read?", "Yes. Every story in the app is free to read."),
  question("How do I send you a story or a tip?", "Send us a message here. We read every tip and keep your name private if you ask."),
  question("What if a story has a mistake?", "Tell us which story and what's wrong. We fix mistakes quickly and say so at the end of the story."),
  question("How do I get the newsletter?", "Leave your email in the newsletter form. One email every morning, and you can stop it any time."),
];

const newsletter = (title = "The morning newsletter") => form("newsletter", title, [field("email", "email", "Email", true)], "Sign up", "Thank you. Your first newsletter arrives tomorrow morning.");

const NEWS_PHOTOS = ["art-article-harbour.png", "art-article-market.png", "art-article-tram.png", "art-article-stadium.png", "art-article-books.png", "art-article-bridge.png"];

const NEWS_CONTACT = "<p>A tip, a correction or a question for the newsroom? Send us a message: we read everything.</p>";

function newsPages(about: { title: string; story: string; people: { title: string; list: ReturnType<typeof who>[] }; numbers: ReturnType<typeof stat>[] }) {
  return [
    aboutPage({ title: about.title, story: about.story, people: about.people, numbers: about.numbers, photos: { title: "From our photographers", files: NEWS_PHOTOS } }),
    contactPage(NEWS_CONTACT, null),
    questionsPage("<p>About reading, saving and sending us news.</p>", NEWS_QUESTIONS),
  ];
}

export const NEWS_DESIGNS: Design[] = [
  {
    id: "news-daily",
    kind: "news",
    name: "Daily news",
    description: "Top stories first, sections as chips and the latest news as a list.",
    look: { template: "classic", corners: "sharp", cards: "flat", font: "Manrope", secondary_color: "#DC2626" },
    tabs: newsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("info", "Turn on notifications to get breaking news.", "Notifications", screen("notifications")),
          search("articles", "Search the news"),
          slider([
            slide("The news as it happens", "Turn on notifications for breaking news", screen("notifications")),
            slide("Your city, every day", "Traffic, prices, schools and sport", screen("articles")),
            slide("Save it for later", "Read your saved stories offline", screen("bookmarks")),
          ]),
          list("top-stories", "Top stories", "articles", "carousel", { featured: true, limit: 5 }),
          categories("Sections", "articles"),
          list("latest", "Latest", "articles", "list", { seeAll: screen("articles") }),
          list("most-read", "Most read", "articles", "list", { sort: "popular", limit: 5 }),
          newsletter(),
          testimonials("What readers say", [
            quote("The first thing I read every morning. Short, clear and first with the news.", "Ahmed F.", "Reader"),
            quote("The notifications are just right: only what really matters.", "Gül S.", "Reader"),
            quote("I sent a tip about our street's water problem. They had a story the next day.", "Burak T.", "Reader"),
          ]),
          faq("Questions", NEWS_QUESTIONS.slice(0, 4)),
          contact(),
        ],
      },
      ...newsPages({
        title: "About the newsroom",
        story:
          "<p>{app} has reported on this city for twenty-five years, first on paper and now on your phone. Our newsroom works around the clock: journalists and photographers who check every fact before we publish. We cover the news that changes your day, from traffic and prices to schools and sport, and we explain it plainly. Read for free, save stories for later and turn on notifications for the news that can't wait.</p>",
        people: { title: "The newsroom", list: [who("tarek", "Editor"), who("nadia", "News editor"), who("emre", "Sports"), who("zeynep", "Photos")] },
        numbers: [stat("25", "Years"), stat("40", "Journalists"), stat("120", "Stories a week")],
      }),
    ],
  },
  {
    id: "news-magazine",
    kind: "news",
    name: "Magazine",
    description: "Cover stories, sections as tiles, the most read and the newest in a grid.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "DM Sans", secondary_color: "#A855F7" },
    tabs: newsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([
            slide("Stories worth your time", "New long reads every week", screen("articles")),
            slide("The people of our city", "Interviews and photo essays", screen("articles")),
            slide("Read it on the weekend", "Save stories with one tap", screen("bookmarks")),
          ]),
          list("cover", "Cover stories", "articles", "carousel", { featured: true, limit: 5 }),
          categories("Sections", "articles", "tiles"),
          list("most-read", "Most read", "articles", "list", { sort: "popular", limit: 5 }),
          list("new", "New", "articles", "grid", { limit: 4, seeAll: screen("articles") }),
          text("about", "<h3>About {app}</h3><p>Long stories, interviews and photos about culture, food, travel and the people of our city.</p>"),
          newsletter("The weekend letter"),
          testimonials("What readers say", [
            quote("Long stories I actually finish. My weekend coffee ritual.", "Dina M.", "Reader"),
            quote("The photo essays are beautiful, like a gallery in my pocket.", "Mert Y.", "Reader"),
            quote("I found my favourite restaurant through one of their food stories.", "Salma H.", "Reader"),
          ]),
          faq("Questions", [NEWS_QUESTIONS[1]!, NEWS_QUESTIONS[2]!, NEWS_QUESTIONS[5]!, NEWS_QUESTIONS[3]!]),
          contact(),
        ],
      },
      ...newsPages({
        title: "About the magazine",
        story:
          "<p>{app} is a magazine for people who like to read slowly. Every week we publish long stories, interviews and photo essays about culture, food, travel and the people who make our city interesting. Our writers take their time, our photographers walk the streets, and our editors choose a few stories rather than many. Save your favourites to read on the weekend, and tell us what you'd like us to write about next.</p>",
        people: { title: "The team", list: [who("leyla", "Editor"), who("deniz", "Culture"), who("can", "Photography"), who("selin", "Features")] },
        numbers: [stat("10", "Years"), stat("12", "Writers"), stat("8", "Long reads a week")],
      }),
    ],
  },
  {
    id: "news-blog",
    kind: "news",
    name: "Blog",
    description: "Personal: a hello, the latest posts, topics and a few words about you.",
    look: { template: "minimal", corners: "round", cards: "outlined", font: "Lexend", secondary_color: "#10B981" },
    tabs: newsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Welcome to {app}</h2><p>New posts every week. Save the ones you like to read later.</p>"),
          slider(
            [
              slide("Food, books and small trips", "A new post every week", screen("articles")),
              slide("Recipes that work", "Tried at home first", screen("articles")),
              slide("Never miss a post", "Turn on notifications", screen("notifications")),
            ],
            false,
          ),
          list("latest", "Latest posts", "articles", "list", { seeAll: screen("articles") }),
          categories("Topics", "articles"),
          team("About the author", [who("leyla", "Writer", "I write about food, books and small trips, and the people I meet on the way.")], "list"),
          list("popular", "Most read", "articles", "carousel", { sort: "popular", limit: 5 }),
          newsletter("New posts by email"),
          testimonials("What readers say", [
            quote("Every recipe I've tried from here has worked the first time.", "Merve A.", "Reader"),
            quote("Reading Leyla feels like getting a letter from a friend.", "Lina A.", "Reader"),
            quote("Her travel notes planned our whole weekend away.", "Hakan D.", "Reader"),
          ]),
          faq("Questions", [NEWS_QUESTIONS[1]!, NEWS_QUESTIONS[2]!, NEWS_QUESTIONS[5]!, NEWS_QUESTIONS[3]!]),
          contact(),
        ],
      },
      ...newsPages({
        title: "About",
        story:
          "<p>I'm Leyla, and {app} is where I write about the things I love: food, books, small trips and the people I meet along the way. I started it as notes for friends, and now readers in many cities follow along. There's a new post every week, sometimes with friends who write or take photos too. If a post makes you want to try a recipe or visit a place, tell me: those messages are my favourite part.</p>",
        people: { title: "Who writes here", list: [who("leyla", "Writer"), who("omar", "Guest writer"), who("mariam", "Photos"), who("can", "Guest writer")] },
        numbers: [stat("6", "Years"), stat("300+", "Posts"), stat("50", "Recipes")],
      }),
    ],
  },
];

const eventsTabs = [homeTab, screenTab("events", "Events", "event", "events"), screenTab("tickets", "My tickets", "confirmation_number", "tickets"), accountTab];

const PRINT = question("Do I need to print my ticket?", "No. Your tickets are in My tickets; show the QR code at the entrance.");
const REFUND = question("Can I get my money back?", "If an event is cancelled or moved, yes, all of it. Otherwise you can pass your ticket to a friend.");
const FRIEND = question("Can I give my ticket to a friend?", "Yes. Send us a message with your friend's name before the event.");
const DOORS = question("What time do the doors open?", "An hour before the event starts, unless the event page says otherwise.");
const AGE = question("Is there an age limit?", "Most events are for everyone. When there's an age limit, it's on the event page.");
const FOOD = question("Can I bring food and drinks?", "Please don't bring your own. Our café and bar are open before and after every event.");
const ACCESS = question("Is the venue accessible?", "Yes: step-free entrances, lifts and accessible toilets. Tell us if you need a hand.");
const TICKET_QUESTIONS = [PRINT, REFUND, FRIEND, DOORS, AGE, FOOD, ACCESS];

const VENUE_PHOTOS = ["art-place-stage.png", "art-event-jazz.png", "art-event-film.png", "art-event-talk.png", "art-event-photo.png", "art-place-hall.png", "art-event-ceramics.png"];

const EVENTS_CONTACT = "<p>Questions about tickets, an event or hiring the venue? Send us a message, or visit the box office.</p>";

/** An events business's pages: how to visit, hiring its spaces, its story, how to reach it and questions. */
function eventsPages(parts: { story: string; people: { title: string; list: ReturnType<typeof who>[] }; opening: ReturnType<typeof hours>; spaces: ReturnType<typeof card>[]; hireTitle: string }) {
  return [
    otherPage("visit", "Visit", [
      text("visit-intro", "<p>Everything you need for your visit: where we are, when the box office is open and how to get here.</p>"),
      place("Find the venue"),
      parts.opening,
      cards("getting-here", "Getting here", [
        card("By metro", "Two minutes' walk from the nearest station."),
        card("By car", "Parking next door; it fills up an hour before big shows."),
        card("By taxi", "Ask for the main entrance on the square."),
        card("Step-free", "Lifts and accessible seats on every floor."),
      ]),
      faq("Good to know", [DOORS, AGE, ACCESS, FOOD], "good-to-know"),
    ]),
    otherPage("hire", parts.hireTitle, [
      text("hire-intro", "<p>Weddings, conferences, launches and parties: our spaces, our team and our kitchen are yours for the day. Tell us about your event and we'll send you a plan and a price.</p>"),
      cards("spaces", "Our spaces", parts.spaces),
      form(
        "hire-form",
        "Ask about your event",
        [
          field("name", "text", "Your name", true),
          field("phone", "phone", "Phone number", true),
          field("email", "email", "Email"),
          field("date", "text", "Date of the event", true),
          field("guests", "number", "Number of guests", true),
          field("details", "long_text", "Tell us about the event"),
        ],
        "Send the request",
        "Thank you. Our events team will call you within a working day.",
      ),
    ]),
    aboutPage({ story: parts.story, people: parts.people, numbers: [stat("300+", "Events a year"), stat("600", "Seats"), stat("20", "Years")], photos: { title: "Inside the venue", files: VENUE_PHOTOS } }),
    contactPage(EVENTS_CONTACT, parts.opening),
    questionsPage("<p>About tickets, the doors and your visit.</p>", TICKET_QUESTIONS),
  ];
}

const WORKSHOP_HOSTS = [who("zeynep", "Ceramics"), who("can", "Photography"), who("leyla", "Painting"), who("emre", "Woodwork")];

const VENUE_SPACES = [
  card("Main hall", "Up to 600 people, for concerts and conferences.", "art-place-stage.png"),
  card("Studio", "For 80 people: talks, workshops and screenings.", "art-event-talk.png"),
  card("Garden", "Summer parties and receptions for 200.", "art-place-hall.png"),
  card("Meeting rooms", "Small rooms for 10 to 20 people.", "art-place-office.png"),
];

export const EVENTS_DESIGNS: Design[] = [
  {
    id: "events-venue",
    kind: "events",
    name: "Venue",
    description: "What's on, a countdown to your next big night and box office hours.",
    look: { template: "bold", corners: "soft", cards: "elevated", font: "Outfit", secondary_color: "#F59E0B" },
    tabs: eventsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([
            slide("What's on this month", "Concerts, shows and more", screen("events")),
            slide("Your tickets on your phone", "Show the QR code at the door", screen("tickets")),
            slide("Make it your venue", "Hire our spaces for your event", page("hire")),
          ]),
          search("events", "Search events"),
          list("upcoming", "Coming up", "events", "carousel", { limit: 4, seeAll: screen("events") }),
          countdown("Our next big night is in", 21, null, { label: "Get tickets", action: screen("events") }),
          quickLinks([
            link("event", "Events", screen("events")),
            link("confirmation_number", "My tickets", screen("tickets")),
            link("directions", "Visit", page("visit")),
            link("event_available", "Hire the venue", page("hire")),
          ]),
          list("all-events", "All upcoming events", "events", "list", { limit: 8, seeAll: screen("events") }),
          testimonials("What guests say", [
            quote("Our favourite night out. The sound in the main hall is wonderful.", "Lina A.", "Regular"),
            quote("Tickets on my phone, a code at the door, no queue.", "Mert Y.", "Guest"),
            quote("Free films on Wednesdays. We haven't missed one in months.", "Gül S.", "Regular"),
          ]),
          faq("Tickets", [PRINT, REFUND, DOORS, ACCESS]),
          hours("Box office", days(["wed", "thu", "fri", "sat"], "16:00", "22:00")),
          contact("Find the venue"),
        ],
      },
      ...eventsPages({
        story:
          "<p>{app} has been the city's stage for twenty years: concerts, theatre, films and talks, almost every night of the year. We have a main hall with six hundred seats, a small studio for new work and a café that stays open late. Our programme mixes big names with local artists, and many evenings are free. Buy your tickets in the app, show the code at the door and come early for a coffee.</p>",
        people: { title: "The team", list: [who("karim", "Programme director"), who("selin", "Box office"), who("omar", "Technical manager"), who("deniz", "Events and hire")] },
        opening: hours("Box office", days(["wed", "thu", "fri", "sat"], "16:00", "22:00")),
        spaces: VENUE_SPACES,
        hireTitle: "Hire the venue",
      }),
    ],
  },
  {
    id: "events-festival",
    kind: "events",
    name: "Festival",
    description: "A big countdown, quick links, the line-up and answers for festival-goers.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Bricolage Grotesque", secondary_color: "#EC4899" },
    tabs: eventsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          countdown("The festival starts in", 60, "The festival is on. See you there!"),
          slider([
            slide("Three days of music", "Two stages, forty artists", screen("events")),
            slide("Bring the family", "Workshops and a kids' stage every day", screen("events")),
            slide("Your tickets in the app", "Show the QR code at the gate", screen("tickets")),
          ]),
          button("tickets", "Get your tickets", screen("events"), "filled", "confirmation_number"),
          quickLinks(
            [
              link("event", "Events", screen("events")),
              link("confirmation_number", "My tickets", screen("tickets")),
              link("directions", "Getting here", page("visit")),
              link("person", "Account", screen("account")),
            ],
            "row",
          ),
          list("line-up", "Line-up", "events", "grid", { limit: 6, seeAll: screen("events") }),
          stats([stat("3", "Days"), stat("40", "Artists"), stat("2", "Stages")]),
          testimonials("What festival-goers say", [
            quote("Three days of music, and the kids loved the workshops.", "Hakan D.", "Festival-goer"),
            quote("Everything was in the app: the times, the map and our tickets.", "Salma H.", "Festival-goer"),
            quote("The best line-up in years, and the food stalls were great.", "Youssef R.", "Festival-goer"),
          ]),
          faq("Good to know", [PRINT, FOOD, AGE, REFUND]),
          contact(),
        ],
      },
      ...eventsPages({
        story:
          "<p>{app} began as a weekend of music in a park with a few hundred friends. Now it's three days of concerts, food and workshops for the whole family, run by a small team and hundreds of volunteers. We keep tickets fair, the site clean and the line-up full of surprises. Everything you need is in the app: your tickets, the timetable and the news on the day.</p>",
        people: { title: "The festival team", list: [who("deniz", "Festival director"), who("can", "Line-up"), who("mariam", "Volunteers"), who("tarek", "Site manager")] },
        opening: hours("Gates open", days(["fri", "sat", "sun"], "12:00", "23:00")),
        spaces: VENUE_SPACES,
        hireTitle: "Hire the site",
      }),
    ],
  },
  {
    id: "events-workshops",
    kind: "events",
    name: "Workshops",
    description: "Calm and clear: upcoming workshops, your hosts, reviews and questions.",
    look: { template: "minimal", corners: "soft", cards: "outlined", font: "DM Sans", secondary_color: "#6366F1" },
    tabs: eventsTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Learn something with your hands</h2><p>Small groups and friendly hosts at {app}.</p>"),
          slider(
            [
              slide("Make it yourself", "Ceramics, photography, painting and wood", screen("events")),
              slide("Everything included", "Materials, tea and a friendly host", screen("events")),
              slide("A gift they'll love", "Book a place for someone else", screen("events")),
            ],
            false,
          ),
          list("upcoming", "Upcoming workshops", "events", "list", { seeAll: screen("events") }),
          team("Your hosts", WORKSHOP_HOSTS),
          stats([stat("8", "People per group"), stat("4", "Crafts"), stat("4.9", "Average rating")]),
          testimonials("What people say", [
            quote("I made my first bowl in two hours, and it's on my table every day.", "Dina M.", "Guest"),
            quote("A small group, a patient host and all the clay we wanted.", "Burak T.", "Guest"),
            quote("A perfect birthday present for my mother. She has booked again.", "Merve A.", "Guest"),
          ]),
          faq("Questions", [question("What should I bring?", "Nothing: every material is included. Wear clothes you don't mind getting dusty."), REFUND, FRIEND, ACCESS]),
          button("hire", "Private workshops for groups", page("hire"), "outlined", "groups"),
          contact(),
        ],
      },
      ...eventsPages({
        story:
          "<p>{app} is a small studio where people learn to make things with their hands: pots, photographs, paintings and furniture. Our hosts are working artists who love to teach, and our groups are small, so everyone gets help. Every material is included, and you take home what you make. Book a place in the app, come in comfortable clothes and leave the rest to us.</p>",
        people: { title: "Your hosts", list: WORKSHOP_HOSTS },
        opening: hours("Studio hours", [...days(["tue", "wed", "thu", "fri"], "11:00", "21:00"), ...days(["sat", "sun"], "10:00", "18:00")]),
        spaces: [
          card("Team days", "A workshop for your team, with lunch.", "art-event-ceramics.png"),
          card("Birthdays", "A private class for you and your friends.", "art-event-photo.png"),
          card("The whole studio", "For up to 30 people, evenings and weekends.", "art-place-hall.png"),
        ],
        hireTitle: "Private workshops",
      }),
    ],
  },
];

const charityTabs = [homeTab, screenTab("campaigns", "Campaigns", "volunteer_activism", "campaigns"), screenTab("donations", "My donations", "receipt_long", "my_donations"), accountTab];

const CHARITY_QUESTIONS = [
  question("Will I get a receipt?", "Yes. Every donation has a receipt in My donations."),
  question("How is my gift used?", "Most of every gift goes straight to the families we help. Where your money goes shows the details."),
  question("Can I give every month?", "Yes. Choose Monthly when you give, and stop or change it whenever you like."),
  question("Is it safe to give in the app?", "Yes. You pay on a secure payment page, and we never see your card number."),
  question("Can I give in someone's name?", "Yes. Write their name in the note when you give, and we'll send them a card."),
  question("How can I volunteer?", "Fill in the form on our Volunteer page and we'll call you to find the right role."),
  question("Can my company help?", "Yes. Companies sponsor campaigns, give food or send teams to volunteer. Send us a message."),
];

const whereMoneyGoes = () =>
  cards("money", "Where your money goes", [
    card("Food parcels", "Most of every gift buys food for families in need.", "art-campaign-parcels.png", screen("campaigns")),
    card("Hot meals", "Lunches for children and older neighbours.", "art-campaign-lunch.png", screen("campaigns")),
    card("Volunteers", "Training and transport for our volunteers.", "art-campaign-volunteers.png", page("volunteer")),
    card("Running costs", "A small part keeps the lights on and the vans running.", null, page("work")),
  ]);

const CHARITY_TEAM = [who("mariam", "Director"), who("yusuf", "Volunteer coordinator"), who("nadia", "Campaigns"), who("tarek", "Warehouse")];

const CHARITY_CONTACT = "<p>Questions about a gift, a receipt or volunteering? Send us a message: someone from the team answers within a working day.</p>";

/** A charity's pages: its work, volunteering, its story, how to reach it and questions. */
function charityPages(story: string) {
  return [
    otherPage("work", "Our work", [
      text("work-intro", "<p>Every week our volunteers pack food parcels, cook hot lunches and visit neighbours who live alone. Here's what your gifts make possible.</p>"),
      stats([stat("100+", "Families helped"), stat("20", "Volunteers"), stat("5", "Years")]),
      whereMoneyGoes(),
      list("campaigns", "Campaigns now", "campaigns", "list", { seeAll: screen("campaigns") }),
      gallery("partners", "Our partners", ["art-emblem-1.png", "art-emblem-2.png", "art-emblem-3.png", "art-emblem-4.png"], 2),
    ]),
    otherPage("volunteer", "Volunteer", [
      text("volunteer-intro", "<p>Give an hour or a whole Saturday: every pair of hands helps. Tell us when you're free and what you'd like to do, and we'll call you.</p>"),
      cards("roles", "Ways to help", [
        card("Pack parcels", "Saturday mornings at the warehouse, two hours.", "art-campaign-parcels.png"),
        card("Deliver", "Drive or cycle parcels to families.", "art-campaign-volunteers.png"),
        card("Cook", "Help in the kitchen for our hot lunches.", "art-campaign-lunch.png"),
        card("Visit", "An hour a week with an older neighbour.", null),
      ]),
      form(
        "volunteer-form",
        "Join our volunteers",
        [
          field("name", "text", "Your name", true),
          field("phone", "phone", "Phone number", true),
          field("email", "email", "Email"),
          field("when", "text", "When are you free?"),
          field("how", "long_text", "How would you like to help?"),
        ],
        "Send",
        "Thank you for offering your time. We'll call you this week.",
      ),
    ]),
    aboutPage({
      story,
      people: { title: "Our team", list: CHARITY_TEAM },
      numbers: [stat("100+", "Families helped"), stat("20", "Volunteers"), stat("5", "Years")],
      photos: { title: "Our work in pictures", files: ["art-campaign-parcels.png", "art-campaign-volunteers.png", "art-campaign-lunch.png", "art-place-hall.png", "art-item-fruit.png", "art-item-bread.png"] },
    }),
    contactPage(CHARITY_CONTACT, hours("Office hours", days(WEEKDAYS_ONLY, "09:00", "17:00"))),
    questionsPage("<p>About giving, receipts and volunteering.</p>", CHARITY_QUESTIONS),
  ];
}

export const CHARITY_DESIGNS: Design[] = [
  {
    id: "charity-classic",
    kind: "charity",
    name: "Charity",
    description: "A clear call to give, featured campaigns, your impact in numbers and your story.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#E9C46A" },
    tabs: charityTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Every gift makes a difference", "Choose a campaign to support", screen("campaigns")),
              slide("Give every month", "A small gift that adds up", screen("campaigns")),
              slide("Give your time", "Join our volunteers", page("volunteer")),
            ],
            false,
          ),
          list("featured", "Featured", "campaigns", "carousel", { featured: true, limit: 5 }),
          stats([stat("100+", "Families helped"), stat("20", "Volunteers"), stat("5", "Years")]),
          whereMoneyGoes(),
          list("campaigns", "Our campaigns", "campaigns", "list", { seeAll: screen("campaigns") }),
          text("about", "<h3>Our story</h3><p>{app} started in a neighbour's kitchen with ten food parcels. Today hundreds of families get help every week.</p>"),
          testimonials("From our supporters", [
            quote("I give a little every month, and they show me exactly what it buys.", "Ahmed F.", "Monthly supporter"),
            quote("Volunteering on Saturdays is the best part of my week.", "Ece B.", "Volunteer"),
            quote("When my husband lost his job, the parcels got us through the winter.", "A neighbour", "Helped by the food bank"),
          ]),
          faq("Questions", CHARITY_QUESTIONS.slice(0, 4)),
          button("volunteer", "Volunteer with us", page("volunteer"), "outlined", "groups"),
          contact(),
        ],
      },
      ...charityPages(
        "<p>{app} started in a neighbour's kitchen, with ten food parcels and a list of families who needed a hand. Today hundreds of volunteers pack and deliver food every week, cook hot lunches for children and visit older neighbours who live alone. We buy food in bulk to make every gift go further, and we tell you exactly where it goes. Give once, give monthly or give your time: every bit helps a family through the week.</p>",
      ),
    ],
  },
  {
    id: "charity-appeal",
    kind: "charity",
    name: "Urgent appeal",
    description: "An appeal bar and countdown on top, the campaigns, supporters' words and receipts.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#E76F51" },
    tabs: charityTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("warning", "Winter appeal: help 500 families stay warm this year.", "Give now", screen("campaigns")),
          countdown("The appeal closes in", 30, "Thank you. The appeal has closed."),
          slider([
            slide("Food and blankets, this week", "Your gift reaches a family within days", screen("campaigns")),
            slide("Every gift is reported", "See what your gift did when the appeal closes", page("work")),
            slide("Can't give money?", "Give your time instead", page("volunteer")),
          ]),
          list("featured", "Give today", "campaigns", "carousel", { featured: true, limit: 5, seeAll: screen("campaigns") }),
          whereMoneyGoes(),
          stats([stat("500", "Families this winter"), stat("3 days", "To reach a family")]),
          testimonials("From our supporters", [
            quote("I saw the appeal in the morning, and my gift was on its way by the evening.", "Gül S.", "Supporter"),
            quote("They report back on every appeal. I know my money was used well.", "Hakan D.", "Monthly supporter"),
            quote("Our family got blankets and food the day after the flood.", "A mother", "Helped by the appeal"),
          ]),
          faq("Questions", [CHARITY_QUESTIONS[0]!, CHARITY_QUESTIONS[1]!, CHARITY_QUESTIONS[2]!, CHARITY_QUESTIONS[3]!]),
          contact(),
        ],
      },
      ...charityPages(
        "<p>{app} helps families through their hardest weeks: after a fire, a flood, an illness or a winter without work. When an appeal opens, our volunteers are already packing food, blankets and school bags, and your gift reaches a family within days. We report on every appeal when it closes, so you can see what your gift did. Thank you for standing with your neighbours.</p>",
      ),
    ],
  },
  {
    id: "charity-community",
    kind: "charity",
    name: "Community",
    description: "Warm and local: quick links, your campaigns, volunteers and numbers.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Lexend", secondary_color: "#84A98C" },
    tabs: charityTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Neighbours helping neighbours</h2><p>Support {app}'s work in our community.</p>"),
          slider(
            [
              slide("Our food bank", "Open to every family who needs it", screen("campaigns")),
              slide("The homework club", "Help with school, every weekday", page("work")),
              slide("Saturday visits", "An hour with a neighbour who lives alone", page("volunteer")),
            ],
            false,
          ),
          quickLinks([
            link("volunteer_activism", "Campaigns", screen("campaigns")),
            link("receipt_long", "My donations", screen("my_donations")),
            link("groups", "Volunteer", page("volunteer")),
            link("person", "Account", screen("account")),
          ]),
          list("campaigns", "Campaigns", "campaigns", "list", { seeAll: screen("campaigns") }),
          team("Our volunteers", [who("yusuf", "Coordinator"), who("ece", "Volunteer"), who("omar", "Volunteer"), who("mariam", "Homework club")]),
          stats([stat("12", "Projects"), stat("300", "Neighbours")]),
          whereMoneyGoes(),
          testimonials("From our neighbours", [
            quote("Our homework club changed my son's year at school.", "Merve A.", "Parent"),
            quote("I bring a bag of food every Friday. It's become a habit.", "Burak T.", "Neighbour"),
            quote("The Saturday visits are the only time some of our neighbours see anyone.", "Ece B.", "Volunteer"),
          ]),
          faq("Questions", [CHARITY_QUESTIONS[5]!, CHARITY_QUESTIONS[2]!, CHARITY_QUESTIONS[0]!, CHARITY_QUESTIONS[6]!]),
          contact(),
        ],
      },
      ...charityPages(
        "<p>{app} is run by neighbours, for neighbours. We started with a shared table in a community hall, and now run a food bank, a homework club and visits to older people who live alone. Everything is done by volunteers, and every gift stays in our area. Give a little each month, bring food to the hall or join us on a Saturday: there's a place for everyone.</p>",
      ),
    ],
  },
];
