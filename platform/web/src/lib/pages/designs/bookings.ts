import {
  accountTab,
  button,
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

// 33 Bookings, clinics and gyms (the booking engine): services, appointments, classes and memberships.

const bookTab = screenTab("book", "Book", "calendar_month", "services");
const appointmentsTab = screenTab("appointments", "Appointments", "event", "appointments");

export const BOOKINGS_DESIGNS: Design[] = [
  {
    id: "bookings-salon",
    kind: "bookings",
    name: "Salon",
    description: "Slides, a big Book button, your services and team, reviews and opening hours.",
    look: { template: "classic", corners: "round", cards: "elevated", font: "Plus Jakarta Sans", secondary_color: "#DB2777" },
    tabs: [homeTab, bookTab, appointmentsTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([slide("Look and feel your best", "Book your next visit in a few taps", screen("services")), slide("New here?", "See our services and prices", screen("services"))]),
          button("book", "Book an appointment", screen("services"), "filled", "calendar_month"),
          list("services", "Our services", "services", "list", { seeAll: screen("services") }),
          team("Our team", [person("Team member's name", "Stylist"), person("Team member's name", "Colorist")]),
          testimonials("What clients say", [quote("Write what a client says about their visit.", "Client's name")]),
          hours("Opening hours", [...days(WEEKDAYS_ONLY, "10:00", "20:00"), ...days(["sat"], "10:00", "18:00")]),
          contact(),
        ],
      },
    ],
  },
  {
    id: "bookings-wellness",
    kind: "bookings",
    name: "Wellness studio",
    description: "Quiet and light: quick links, services as a grid, questions and hours.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "DM Sans", secondary_color: "#0EA5E9" },
    tabs: [homeTab, bookTab, appointmentsTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Take a moment for yourself</h2><p>Book a treatment at {app} whenever it suits you.</p>"),
          quickLinks([
            link("calendar_month", "Book", screen("services")),
            link("event_available", "Appointments", screen("appointments")),
            link("notifications", "Updates", screen("notifications")),
            link("person", "Account", screen("account")),
          ]),
          list("services", "Treatments", "services", "grid", { limit: 6, seeAll: screen("services") }),
          faq("Questions", [
            question("Can I change my appointment?", "Yes. Open Appointments and choose the appointment to change or cancel it."),
            question("What should I bring?", "Write what guests need to know before their visit here."),
          ]),
          hours("Opening hours", days(["tue", "wed", "thu", "fri", "sat"], "09:00", "19:00")),
          contact(),
        ],
      },
    ],
  },
  {
    id: "bookings-consulting",
    kind: "bookings",
    name: "Consulting",
    description: "You first: a short story, your sessions, what clients say and your contact details.",
    look: { template: "bold", corners: "sharp", cards: "outlined", font: "Manrope", secondary_color: "#1F4E5F" },
    tabs: [homeTab, screenTab("book", "Sessions", "calendar_month", "services"), appointmentsTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([slide("Advice you can act on", "Book a session at a time that suits you", screen("services"))], false),
          team("About me", [person("Your name", "Consultant", "Write a few words about your experience and the people you help.")], "list"),
          list("sessions", "Sessions", "services", "list", { seeAll: screen("services") }),
          testimonials("Clients", [quote("Write what a client says about working with you.", "Client's name", "Client")]),
          faq("Questions", [question("How do sessions work?", "Write how a session works here: where it happens and how long it takes.")]),
          contact(),
        ],
      },
    ],
  },
];

const visitTab = screenTab("book", "Book a visit", "stethoscope", "services");
const visitsTab = screenTab("appointments", "Visits", "event", "appointments");

export const CLINIC_DESIGNS: Design[] = [
  {
    id: "clinic-family",
    kind: "clinic",
    name: "Family clinic",
    description: "A notice for patients, a Book button, your services and doctors, hours and directions.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#14B8A6" },
    tabs: [homeTab, visitTab, visitsTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("info", "Bring your ID and your insurance card to your visit."),
          button("book", "Book a visit", screen("services"), "filled", "stethoscope"),
          list("services", "Our services", "services", "list", { seeAll: screen("services") }),
          team("Our doctors", [person("Doctor's name", "Family doctor"), person("Doctor's name", "Pediatrician")]),
          hours("Opening hours", [...days(WEEKDAYS_ONLY, "08:00", "18:00"), ...days(["sat"], "09:00", "13:00")], "For an emergency, call your local emergency number."),
          faq("Questions", [question("How do I prepare for my visit?", "Fill in the questions when you book, and come ten minutes early.")]),
          contact(),
        ],
      },
    ],
  },
  {
    id: "clinic-dental",
    kind: "clinic",
    name: "Dental clinic",
    description: "Friendly slides, quick links, treatments as a grid, reviews and hours.",
    look: { template: "minimal", corners: "round", cards: "flat", font: "DM Sans", secondary_color: "#38BDF8" },
    tabs: [homeTab, visitTab, visitsTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([slide("A smile you'll love", "Check-ups, cleaning and more", screen("services")), slide("Book online", "Pick a time that suits you", screen("services"))]),
          quickLinks([
            link("stethoscope", "Book a visit", screen("services")),
            link("event_available", "My visits", screen("appointments")),
            link("notifications", "Reminders", screen("notifications")),
            link("person", "Account", screen("account")),
          ]),
          list("treatments", "Treatments", "services", "grid", { limit: 6, seeAll: screen("services") }),
          testimonials("What patients say", [quote("Write what a patient says about their visit.", "Patient's name")]),
          hours("Opening hours", days(["sat", "sun", "mon", "tue", "wed", "thu"], "10:00", "21:00")),
          contact(),
        ],
      },
    ],
  },
  {
    id: "clinic-therapy",
    kind: "clinic",
    name: "Therapy practice",
    description: "Calm words first, your therapist, sessions and answers to the usual questions.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Lexend", secondary_color: "#7C9A82" },
    tabs: [homeTab, screenTab("book", "Book a session", "calendar_month", "services"), screenTab("appointments", "Sessions", "event", "appointments"), accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Someone to talk to</h2><p>Book a session with {app}, in person or online.</p>"),
          button("book", "Book a session", screen("services")),
          team("Your therapist", [person("Your name", "Therapist", "Write about your training and the people you work with.")], "list"),
          list("sessions", "Sessions", "services", "list"),
          faq("Questions", [
            question("Is what I share private?", "Write how you keep your clients' information private here."),
            question("Can I cancel a session?", "Yes. Open Sessions and choose the session to cancel it."),
          ]),
          contact(),
        ],
      },
    ],
  },
];

const classesTab = screenTab("classes", "Classes", "fitness_center", "classes");
const membershipTab = screenTab("membership", "Membership", "card_membership", "memberships");
const myBookingsTab = screenTab("appointments", "My bookings", "event", "appointments");

export const FITNESS_DESIGNS: Design[] = [
  {
    id: "fitness-gym",
    kind: "fitness",
    name: "Gym",
    description: "Strong and bold: slides, quick links, a challenge countdown, coaches and gym hours.",
    look: { template: "bold", corners: "sharp", cards: "elevated", font: "Outfit", secondary_color: "#EF4444" },
    tabs: [homeTab, classesTab, membershipTab, myBookingsTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([slide("Stronger every week", "Book your spot in a class", screen("classes")), slide("Train with a coach", "Personal sessions that fit your goals", screen("services"))]),
          quickLinks([
            link("schedule", "Timetable", screen("classes")),
            link("card_membership", "Membership", screen("memberships")),
            link("event_available", "My bookings", screen("appointments")),
            link("person", "Account", screen("account")),
          ]),
          countdown("The next challenge starts in", 14, null, { label: "See the classes", action: screen("classes") }),
          list("training", "Personal training", "services", "list", { seeAll: screen("services") }),
          team("Our coaches", [person("Coach's name", "Strength coach"), person("Coach's name", "Group classes")]),
          hours("Gym hours", [...days(WEEKDAYS_ONLY, "06:00", "23:00"), ...days(["sat", "sun"], "08:00", "20:00")]),
          contact(),
        ],
      },
    ],
  },
  {
    id: "fitness-yoga",
    kind: "fitness",
    name: "Yoga studio",
    description: "Soft and simple: this week's classes, your teachers, questions and hours.",
    look: { template: "minimal", corners: "round", cards: "flat", font: "DM Sans", secondary_color: "#A3B18A" },
    tabs: [homeTab, classesTab, membershipTab, myBookingsTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Breathe, move, rest</h2><p>Classes for every level at {app}.</p>"),
          button("classes", "See this week's classes", screen("classes"), "filled", "schedule"),
          quickLinks(
            [
              link("card_membership", "Membership", screen("memberships")),
              link("event_available", "My bookings", screen("appointments")),
              link("notifications", "Updates", screen("notifications")),
            ],
            "row",
          ),
          list("private", "Private sessions", "services", "list", { limit: 4, seeAll: screen("services") }),
          team("Teachers", [person("Teacher's name", "Yoga teacher"), person("Teacher's name", "Pilates teacher")]),
          testimonials("From our students", [quote("Write what a student says about your classes.", "Student's name")]),
          faq("Questions", [question("I'm new. Which class should I take?", "Write which class beginners should start with here.")]),
          hours("Studio hours", days(["mon", "tue", "wed", "thu", "fri", "sat"], "07:00", "21:00")),
          contact(),
        ],
      },
    ],
  },
  {
    id: "fitness-coach",
    kind: "fitness",
    name: "Personal coach",
    description: "You and your results: your story, numbers, sessions and plans.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Manrope", secondary_color: "#F97316" },
    tabs: [homeTab, screenTab("book", "Sessions", "calendar_month", "services"), membershipTab, myBookingsTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([slide("Reach your goal with a plan", "Training and advice made for you", screen("services"))], false),
          team("Your coach", [person("Your name", "Personal trainer", "Write about your training and how you work with clients.")], "list"),
          stats([stat("1:1", "Coaching"), stat("12 weeks", "Programs")]),
          list("sessions", "Sessions", "services", "list", { seeAll: screen("services") }),
          button("plans", "See membership plans", screen("memberships"), "outlined", "card_membership"),
          testimonials("Results", [quote("Write what a client says about training with you.", "Client's name")]),
          contact(),
        ],
      },
    ],
  },
];
