import {
  accountTab,
  button,
  categories,
  contact,
  countdown,
  days,
  faq,
  homeTab,
  hours,
  link,
  list,
  notice,
  person,
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

// 33 Real estate, news, events and charity apps: one engine and one kind each. 104 Delivery apps too.

const listingsTabs = [
  homeTab,
  screenTab("search", "Search", "search", "search"),
  screenTab("favorites", "Favorites", "favorite", "favorites"),
  screenTab("messages", "Messages", "chat", "messages"),
  accountTab,
];

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
          slider([slide("Find your next home", "Homes for sale and for rent", screen("search")), slide("Selling your home?", "Send us a message and we'll call you", screen("messages"))]),
          list("new-listings", "New listings", "listings", "list", { limit: 5, seeAll: screen("search") }),
          list("top", "Top properties", "listings", "carousel", { sort: "price_desc" }),
          team("Our agents", [person("Agent's name", "Sales"), person("Agent's name", "Rentals")]),
          contact("Visit the office"),
        ],
      },
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
          quickLinks([
            link("search", "Search", screen("search")),
            link("home_work", "All homes", screen("courses")),
            link("favorite", "Favorites", screen("favorites")),
            link("chat", "Messages", screen("messages")),
          ]),
          list("just-listed", "Just listed", "listings", "grid", { limit: 6, seeAll: screen("search") }),
          list("lowest-rent", "Lowest prices", "listings", "list", { sort: "price_asc", limit: 5 }),
          faq("Questions", [question("How do I book a viewing?", "Open a home and send us a message with the days that suit you.")]),
          hours("Office hours", [...days(WEEKDAYS_ONLY, "09:00", "18:00"), ...days(["sat"], "10:00", "15:00")]),
          contact(),
        ],
      },
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
          slider([slide("Homes with a view", "A private selection of properties", screen("search"))], false),
          list("signature", "Signature properties", "listings", "carousel", { sort: "price_desc", seeAll: screen("search") }),
          text("about", "<h3>About {app}</h3><p>Write about your agency and the homes you specialise in.</p>"),
          team("Your advisers", [person("Adviser's name", "Partner")]),
          testimonials("Clients", [quote("Write what a client says about buying with you.", "Client's name")]),
          contact("Talk to us"),
        ],
      },
    ],
  },
];

const newsTabs = [homeTab, screenTab("articles", "Latest", "newspaper", "articles"), screenTab("saved", "Saved", "bookmark", "bookmarks"), accountTab];

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
          list("top-stories", "Top stories", "articles", "carousel", { featured: true, limit: 5 }),
          categories("Sections", "articles"),
          list("latest", "Latest", "articles", "list", { seeAll: screen("articles") }),
        ],
      },
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
          list("cover", "Cover stories", "articles", "carousel", { featured: true, limit: 5 }),
          categories("Sections", "articles", "tiles"),
          list("most-read", "Most read", "articles", "list", { sort: "popular", limit: 5 }),
          list("new", "New", "articles", "grid", { limit: 4, seeAll: screen("articles") }),
          text("about", "<h3>About {app}</h3><p>Write what your magazine is about and who writes it.</p>"),
        ],
      },
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
          list("latest", "Latest posts", "articles", "list", { seeAll: screen("articles") }),
          categories("Topics", "articles"),
          team("About the author", [person("Your name", "Writer", "Write a few words about yourself and what you write about.")], "list"),
          contact(),
        ],
      },
    ],
  },
];

const eventsTabs = [homeTab, screenTab("events", "Events", "event", "events"), screenTab("tickets", "My tickets", "confirmation_number", "tickets"), accountTab];

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
          slider([slide("What's on this month", "Concerts, shows and more", screen("events")), slide("Your tickets on your phone", "Show the QR code at the door", screen("tickets"))]),
          search("events", "Search events"),
          list("upcoming", "Coming up", "events", "carousel", { seeAll: screen("events") }),
          countdown("Our next big night is in", 21, null, { label: "Get tickets", action: screen("events") }),
          hours("Box office", days(["wed", "thu", "fri", "sat"], "16:00", "22:00")),
          contact("Find the venue"),
        ],
      },
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
          button("tickets", "Get your tickets", screen("events"), "filled", "confirmation_number"),
          quickLinks(
            [
              link("event", "Events", screen("events")),
              link("confirmation_number", "My tickets", screen("tickets")),
              link("notifications", "News", screen("notifications")),
              link("person", "Account", screen("account")),
            ],
            "row",
          ),
          list("line-up", "Line-up", "events", "grid", { limit: 6, seeAll: screen("events") }),
          faq("Good to know", [
            question("Do I need to print my ticket?", "No. Your tickets are in My tickets; show the QR code at the entrance."),
            question("Can I bring food and drinks?", "Write your festival's rules here."),
          ]),
          contact(),
        ],
      },
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
          list("upcoming", "Upcoming workshops", "events", "list", { seeAll: screen("events") }),
          team("Your hosts", [person("Host's name", "Workshop host")]),
          testimonials("What people say", [quote("Write what someone who joined a workshop says.", "Guest's name")]),
          faq("Questions", [question("What should I bring?", "Write what people need for your workshops here.")]),
          contact(),
        ],
      },
    ],
  },
];

const charityTabs = [homeTab, screenTab("campaigns", "Campaigns", "volunteer_activism", "campaigns"), screenTab("donations", "My donations", "receipt_long", "my_donations"), accountTab];

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
          slider([slide("Every gift makes a difference", "Choose a campaign to support", screen("campaigns"))], false),
          list("featured", "Featured", "campaigns", "carousel", { featured: true, limit: 5 }),
          stats([stat("100+", "Families helped"), stat("20", "Volunteers"), stat("5", "Years")]),
          list("campaigns", "Our campaigns", "campaigns", "list", { seeAll: screen("campaigns") }),
          text("about", "<h3>Where your gift goes</h3><p>Write how {app} uses donations and who they help.</p>"),
          contact(),
        ],
      },
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
          notice("warning", "Write your appeal here, in one short sentence.", "Give now", screen("campaigns")),
          countdown("The appeal closes in", 30, "Thank you. The appeal has closed."),
          list("featured", "Give today", "campaigns", "carousel", { featured: true, limit: 5, seeAll: screen("campaigns") }),
          testimonials("From our supporters", [quote("Write why a supporter gives to your charity.", "Supporter's name", "Monthly supporter")]),
          faq("Questions", [question("Will I get a receipt?", "Yes. Every donation has a receipt in My donations.")]),
          contact(),
        ],
      },
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
          quickLinks([
            link("volunteer_activism", "Campaigns", screen("campaigns")),
            link("receipt_long", "My donations", screen("my_donations")),
            link("notifications", "Updates", screen("notifications")),
            link("person", "Account", screen("account")),
          ]),
          list("campaigns", "Campaigns", "campaigns", "list", { seeAll: screen("campaigns") }),
          team("Our volunteers", [person("Volunteer's name", "Coordinator"), person("Volunteer's name", "Volunteer")]),
          stats([stat("12", "Projects"), stat("300", "Neighbours")]),
          contact(),
        ],
      },
    ],
  },
];

const deliveryTabs = [homeTab, screenTab("send", "Send", "local_shipping", "send_parcel"), screenTab("shipments", "My shipments", "package_2", "shipments"), accountTab];

/** 104 Delivery and courier companies. */
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
          slider([slide("Send a parcel across the city", "A courier picks it up at your door", screen("send_parcel"))], false),
          list("services", "Our services", "delivery_services", "list", { seeAll: screen("send_parcel") }),
          stats([stat("30 min", "To pick up"), stat("1,000+", "Parcels a month"), stat("7 days", "A week")]),
          faq("Questions", [question("How do I follow my parcel?", "Open My shipments: each stage shows with its time.")]),
          contact(),
        ],
      },
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
          notice("info", "Write your delivery hours or today's offer here.", "Send now", screen("send_parcel")),
          quickLinks([
            link("local_shipping", "Send", screen("send_parcel")),
            link("package_2", "My shipments", screen("shipments")),
            link("notifications", "Updates", screen("notifications")),
            link("person", "Account", screen("account")),
          ]),
          list("services", "Choose a service", "delivery_services", "carousel", { seeAll: screen("send_parcel") }),
          testimonials("What customers say", [quote("Write what a customer says about your deliveries.", "Customer's name")]),
          contact(),
        ],
      },
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
          button("send", "Send a parcel", screen("send_parcel")),
          list("services", "Services", "delivery_services", "list", { seeAll: screen("send_parcel") }),
          hours("Working hours", days(WEEKDAYS_ONLY, "09:00", "21:00")),
          team("Talk to us", [person("Your name", "Customer service")]),
          contact(),
        ],
      },
    ],
  },
];
