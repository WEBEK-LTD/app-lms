import {
  accountTab,
  button,
  card,
  cards,
  contact,
  countdown,
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
import { aboutPage, contactPage, otherPage, questionsPage, who } from "./pages";

// 33 Bookings, clinics and gyms (the booking engine): services, appointments, classes and memberships.
// 110.3 Each with its Prices (or Plans and Timetable, Our doctors and Patient info) pages.

const bookTab = screenTab("book", "Book", "calendar_month", "services");
const appointmentsTab = screenTab("appointments", "Appointments", "event", "appointments");

// What every business that takes bookings answers: its booking rules.
const HOW_TO_BOOK = question("How do I book?", "Tap Book, choose a service, a day and a time. You get a confirmation at once and a reminder the day before.");
const CHANGE = question("Can I change my appointment?", "Yes. Open Appointments and choose the appointment to change or cancel it.");
const LATE_CANCEL = question("What if I cancel late?", "Cancel or move your visit up to 24 hours before at no cost. Later than that, we may charge half the price.");
const LATE = question("What if I'm late?", "We keep your time for 15 minutes. After that we may need to shorten the visit or move it.");
const PAY = question("How do I pay?", "In the app when you book, or at the end of your visit, by card or in cash.");
const GIFT = question("Do you sell gift cards?", "Yes. Ask for one at the desk or send us a message, and we'll send it by email.");
const CHOOSE = question("Can I choose who I see?", "Yes. Pick a team member when you book, or choose anyone for the first free time.");
const BRING = question("What should I bring?", "Nothing at all. Come as you are: we have everything you need.");
const BOOKING_RULES = [HOW_TO_BOOK, CHANGE, LATE_CANCEL, LATE, PAY, GIFT, CHOOSE, BRING];

const BOOKINGS_CONTACT = "<p>A question about a service or your booking? Call us, write, or send us a message here: we answer the same day.</p>";

/** A Prices page: a few words, the packages, the services by price, questions about paying and a Book button. */
function pricesPage(intro: string, packages: ReturnType<typeof cards>, action = screen("services")) {
  return otherPage("prices", "Prices", [
    text("prices-intro", intro),
    packages,
    list("by-price", "Every service", "services", "list", { sort: "price_asc", limit: 20 }),
    faq("Paying", [PAY, LATE_CANCEL, GIFT], "paying"),
    button("book", "Book now", action, "filled", "calendar_month"),
  ]);
}

const SALON_TEAM = [who("selin", "Stylist"), who("deniz", "Colorist"), who("mariam", "Nail artist"), who("leyla", "Skin care")];
const SALON_PACKAGES = () =>
  cards("packages", "Packages", [
    card("Cut and colour", "A new colour, a cut and styling, in one visit.", "art-service-colour.png", screen("services")),
    card("Monthly care", "A blow-dry every week and a trim each month.", "art-service-cut.png", screen("services")),
    card("Pamper day", "Facial, manicure and a relaxing massage.", "art-service-facial.png", screen("services")),
    card("Bridal", "Hair, make-up and nails for the big day, with a trial.", "art-service-nails.png", page("contact")),
  ]);

const WELLNESS_TEAM = [who("mariam", "Massage therapist"), who("leyla", "Skin care"), who("zeynep", "Yoga and breathing"), who("selin", "Reception")];
const WELLNESS_PACKAGES = () =>
  cards("packages", "Packages", [
    card("First visit", "A treatment of your choice and a short talk about what you need.", "art-service-massage.png", screen("services")),
    card("Five massages", "Book them when you like, within three months.", "art-service-massage.png", screen("services")),
    card("Glow facial", "Cleansing, a mask and a face massage.", "art-service-facial.png", screen("services")),
    card("Calm morning", "Yoga, a massage and herbal tea.", "art-class-yoga.png", screen("services")),
  ]);

const CONSULTING_PACKAGES = () =>
  cards("packages", "Ways to work together", [
    card("First call", "Thirty minutes to talk about your business, free.", null, screen("services")),
    card("Single session", "One hour on one question, with notes after.", null, screen("services")),
    card("Four-session plan", "A month of weekly sessions with a plan at the end.", null, screen("services")),
    card("Team workshop", "Half a day with your team, at your office or online.", null, page("contact")),
  ]);

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
          slider([
            slide("Look and feel your best", "Book your next visit in a few taps", screen("services")),
            slide("New here?", "See our services and prices", page("prices")),
            slide("Getting married?", "Ask us about our bridal package", page("contact")),
          ]),
          button("book", "Book an appointment", screen("services"), "filled", "calendar_month"),
          list("services", "Our services", "services", "list", { seeAll: screen("services") }),
          SALON_PACKAGES(),
          team("Our team", SALON_TEAM),
          stats([stat("12", "Years"), stat("8,000+", "Happy clients"), stat("4.9", "Average rating")]),
          testimonials("What clients say", [
            quote("Deniz found the colour I'd been trying to describe for years. I won't go anywhere else.", "Ayşe K.", "Client"),
            quote("Booking takes a minute and they remind me the day before. So easy.", "Merve A.", "Regular client"),
            quote("My bridal hair lasted all night, through all the dancing.", "Salma H.", "Bride"),
          ]),
          hours("Opening hours", [...days(WEEKDAYS_ONLY, "10:00", "20:00"), ...days(["sat"], "10:00", "18:00")]),
          faq("Questions", [HOW_TO_BOOK, CHANGE, LATE_CANCEL, GIFT]),
          contact(),
        ],
      },
      pricesPage("<p>Prices start from the amount on each service and depend on your hair's length. Not sure? Book a free ten-minute chat first.</p>", SALON_PACKAGES()),
      aboutPage({
        story:
          "<p>{app} opened with two chairs and one rule: listen first. Before we pick up the scissors we talk about your hair, your time in the mornings and what you'd love to change. Our stylists train every season, we use products that are kind to your hair, and we keep our prices clear. Book in the app, choose who you see and get a reminder the day before. We'll have the tea ready.</p>",
        people: { title: "Our team", list: SALON_TEAM },
        numbers: [stat("12", "Years"), stat("8,000+", "Happy clients"), stat("4.9", "Average rating")],
        photos: { title: "Before and after", files: [["art-hair-before.png", "Before"], ["art-hair-after.png", "After"], "art-service-cut.png", "art-service-colour.png", "art-service-nails.png", "art-service-facial.png", "art-place-salon.png"] },
      }),
      contactPage(BOOKINGS_CONTACT, hours("Opening hours", [...days(WEEKDAYS_ONLY, "10:00", "20:00"), ...days(["sat"], "10:00", "18:00")])),
      questionsPage("<p>How booking works with us, and what to expect on the day.</p>", BOOKING_RULES),
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
          slider(
            [
              slide("An hour just for you", "Massage, facials and quiet", screen("services")),
              slide("Your first visit", "Tell us what you need, we'll do the rest", page("prices")),
              slide("Give someone a calm day", "Gift cards, sent by email", page("contact")),
            ],
            false,
          ),
          quickLinks([
            link("calendar_month", "Book", screen("services")),
            link("event_available", "Appointments", screen("appointments")),
            link("sell", "Prices", page("prices")),
            link("person", "Account", screen("account")),
          ]),
          list("services", "Treatments", "services", "grid", { limit: 6, seeAll: screen("services") }),
          WELLNESS_PACKAGES(),
          team("Our therapists", WELLNESS_TEAM),
          testimonials("What guests say", [
            quote("The calmest hour of my month. I leave lighter every time.", "Dina M.", "Guest"),
            quote("Mariam found the knot in my shoulder in two minutes. Nobody else ever did.", "Hakan D.", "Regular guest"),
            quote("I gave my mother a gift card. She has booked three more since.", "Gül S.", "Guest"),
          ]),
          faq("Questions", [CHANGE, BRING, LATE, GIFT]),
          hours("Opening hours", days(["tue", "wed", "thu", "fri", "sat"], "09:00", "19:00")),
          contact(),
        ],
      },
      pricesPage("<p>Every treatment's price is on its page before you book. Packages save you a little and can be shared with family.</p>", WELLNESS_PACKAGES()),
      aboutPage({
        story:
          "<p>{app} is a small, quiet studio for people who need an hour off. We keep the lights low, the phones away and the treatment rooms warm. Our therapists are trained in massage, skin care and breathing, and each first visit starts with a short talk about how you feel and what you need. We use simple, natural oils and we never rush. Book in the app when it suits you, and leave the rest to us.</p>",
        people: { title: "Our therapists", list: WELLNESS_TEAM },
        numbers: [stat("9", "Years"), stat("5", "Treatment rooms"), stat("4.9", "Average rating")],
        photos: { title: "Our studio", files: ["art-place-studio.png", "art-service-massage.png", "art-service-facial.png", "art-class-yoga.png", "art-service-nails.png", "art-place-salon.png"] },
      }),
      contactPage(BOOKINGS_CONTACT, hours("Opening hours", days(["tue", "wed", "thu", "fri", "sat"], "09:00", "19:00"))),
      questionsPage("<p>How booking works with us, and what to expect on the day.</p>", BOOKING_RULES),
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
          slider(
            [
              slide("Advice you can act on", "Book a session at a time that suits you", screen("services")),
              slide("Your first call is free", "Thirty minutes to talk about your business", screen("services")),
              slide("Workshops for teams", "At your office or online", page("contact")),
            ],
            false,
          ),
          team("About me", [who("tarek", "Consultant", "Fifteen years helping small businesses plan, price and grow, from family shops to fast-growing startups.")], "list"),
          list("sessions", "Sessions", "services", "list", { seeAll: screen("services") }),
          CONSULTING_PACKAGES(),
          stats([stat("15", "Years of experience"), stat("300+", "Clients")]),
          testimonials("Clients", [
            quote("One session and I finally knew what to charge. Our sales went up the next month.", "Hakan D.", "Shop owner"),
            quote("Clear, honest advice and a plan we could follow. Worth every minute.", "Lina A.", "Founder"),
            quote("Tarek's workshop got our whole team pulling the same way.", "Youssef R.", "Team lead"),
          ]),
          faq("Questions", [
            question("How do sessions work?", "We meet online or at my office for an hour. You get written notes and next steps the same day."),
            HOW_TO_BOOK,
            LATE_CANCEL,
            PAY,
          ]),
          text("story", "<h3>Why {app}</h3><p>Plain advice, written down, that you can act on the next morning.</p>"),
          contact(),
        ],
      },
      pricesPage("<p>Clear prices, agreed before we start. Your first thirty-minute call is free.</p>", CONSULTING_PACKAGES()),
      aboutPage({
        story:
          "<p>I started {app} after fifteen years of helping businesses from the inside: running a family shop, then advising companies of every size. I know how it feels to make every decision alone. My sessions are practical: we look at your numbers, choose what matters most this month, and you leave with a short written plan. I work with a small team of specialists for the things I don't do myself, so you always talk to someone who knows.</p>",
        people: { title: "The team", list: [who("tarek", "Consultant and founder"), who("nadia", "Strategy"), who("emre", "Finance"), who("mariam", "Client care")] },
        numbers: [stat("15", "Years of experience"), stat("300+", "Clients"), stat("4.9", "Average rating")],
        photos: { title: "Where we work", files: ["art-place-office.png", "art-course-business.png", "art-course-excel.png", "art-course-marketing.png", "art-event-talk.png", "art-place-hall.png"] },
      }),
      contactPage(BOOKINGS_CONTACT, hours("Office hours", days(WEEKDAYS_ONLY, "09:00", "18:00"))),
      questionsPage("<p>How sessions work, and what to expect.</p>", [
        question("How do sessions work?", "We meet online or at my office for an hour. You get written notes and next steps the same day."),
        HOW_TO_BOOK,
        CHANGE,
        LATE_CANCEL,
        PAY,
        question("Is what I tell you kept private?", "Yes. Everything you share stays between us, and I'm happy to sign your confidentiality agreement."),
      ]),
    ],
  },
];

// Clinics: specialties, doctors with their bios, insurance, what to know before a visit.

const visitTab = screenTab("book", "Book a visit", "stethoscope", "services");
const visitsTab = screenTab("appointments", "Visits", "event", "appointments");

const EMERGENCY = () => notice("warning", "In an emergency, call your local emergency number or go to the nearest hospital.", null, null, "emergency");

const BEFORE_YOUR_VISIT = [
  question("How do I prepare for my visit?", "Fill in the questions when you book, and come ten minutes early."),
  question("What should I bring to my visit?", "Your ID, your insurance card and a list of any medicines you take."),
  question("Can someone come with me?", "Yes. A family member or a friend is welcome in the room with you."),
  question("How long will I wait?", "Most patients are seen within ten minutes of their time. We'll tell you if we're running late."),
  question("Can I change or cancel my visit?", "Yes. Open Visits and choose the visit, up to 24 hours before."),
  question("How do I get my test results?", "We call or message you when they're ready, usually within three working days."),
];

const INSURANCE = () =>
  cards("insurance", "Insurance and paying", [
    card("Most insurers", "Bring your insurance card: we send the claim for you."),
    card("Paying yourself", "See each visit's price before you book, and pay by card or in cash."),
    card("Receipts", "Ask for your receipt at the desk, ready for your insurer."),
  ]);

const CLINIC_CONTACT = "<p>To book, change a visit or ask a question, call us or send a message here. For an emergency, call your local emergency number.</p>";

const CLINIC_NUMBERS = [stat("15", "Years of care"), stat("12,000", "Patients a year"), stat("4.9", "Patient rating")];

/** A clinic's pages: its doctors, what patients need to know, its story, how to reach it and questions. */
function clinicPages(parts: { doctors: ReturnType<typeof who>[]; doctorsTitle: string; story: string; photos: string[]; opening: ReturnType<typeof hours>; questions: ReturnType<typeof question>[] }) {
  return [
    otherPage("doctors", parts.doctorsTitle, [
      text("doctors-intro", "<p>Choose who you see when you book. Every one of us has years of experience and time to listen.</p>"),
      team(parts.doctorsTitle, parts.doctors, "list"),
      button("book", "Book a visit", screen("services"), "filled", "stethoscope"),
    ]),
    otherPage("patients", "Patient info", [
      EMERGENCY(),
      text("patients-intro", "<p>What to know before you come, and how paying and insurance work.</p>"),
      faq("Before your visit", BEFORE_YOUR_VISIT, "before-visit"),
      INSURANCE(),
      parts.opening,
    ]),
    aboutPage({ story: parts.story, people: { title: parts.doctorsTitle, list: parts.doctors }, numbers: CLINIC_NUMBERS, photos: { title: "Our clinic", files: parts.photos } }),
    contactPage(CLINIC_CONTACT, parts.opening, [EMERGENCY()]),
    questionsPage("<p>Answers to what patients ask us most. For anything about your health, ask your doctor.</p>", parts.questions),
  ];
}

const THERAPY_QUESTIONS = [
  question("Is what I share private?", "Yes. What you share stays between you and your therapist, unless someone's safety is at risk."),
  question("Can I cancel a session?", "Yes. Open Sessions and choose the session to cancel it."),
  question("Do you offer online sessions?", "Yes. Choose Online when you book, and we send you a link before the session."),
  question("How many sessions will I need?", "It depends on you. We talk about it together in the first session, and look at it again as we go."),
  question("How long is a session?", "Fifty minutes, once a week or every two weeks."),
  question("How do I choose a therapist?", "Read about each of us on Our therapists, or send us a message and we'll help you choose."),
];

const FAMILY_DOCTORS = [
  who("rania", "Family doctor", "Rania has looked after families for eighteen years, from newborns to grandparents."),
  who("murat", "Pediatrician", "Murat makes children's visits calm and quick, and explains everything to parents."),
  who("huda", "Women's health", "Huda cares for women at every age, with time for every question."),
  who("ali", "Internal medicine", "Ali helps patients manage diabetes, blood pressure and long-term conditions."),
];

const DENTISTS = [
  who("rania", "Dentist", "Rania does check-ups, fillings and cleaning, gently and without hurry."),
  who("murat", "Orthodontist", "Murat fits braces and clear aligners for teenagers and adults."),
  who("huda", "Children's dentist", "Huda makes a child's first visits fun, so they're never afraid of the dentist."),
  who("ali", "Oral surgeon", "Ali takes care of wisdom teeth and implants, and explains every step first."),
];

const THERAPISTS = [
  who("nadia", "Clinical psychologist", "Nadia helps adults with anxiety, stress and big life changes."),
  who("omar", "Family therapist", "Omar works with couples and families who want to talk and listen better."),
  who("zeynep", "Child psychologist", "Zeynep supports children and teenagers, and their parents too."),
  who("yusuf", "Counsellor", "Yusuf offers short-term support, in person or online."),
];

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
          slider([
            slide("Care for the whole family", "From newborns to grandparents", screen("services")),
            slide("Book a visit in a minute", "Choose your doctor and a time", screen("services")),
            slide("Before your visit", "What to bring, and how insurance works", page("patients")),
          ]),
          button("book", "Book a visit", screen("services"), "filled", "stethoscope"),
          cards("specialties", "Our specialties", [
            card("Check-ups", "Yearly check-ups and blood tests for every age.", "art-visit-checkup.png", screen("services")),
            card("Children's health", "Vaccines, growth checks and sick visits.", "art-visit-children.png", screen("services")),
            card("Women's health", "Check-ups and care at every stage of life.", "art-visit-followup.png", screen("services")),
            card("Physiotherapy", "Back, knee and sports injuries.", "art-visit-physio.png", screen("services")),
          ]),
          list("services", "Our services", "services", "list", { seeAll: screen("services") }),
          team("Our doctors", FAMILY_DOCTORS),
          testimonials("What patients say", [
            quote("Dr. Murat is wonderful with my two boys. They actually like going now.", "Merve A.", "Parent"),
            quote("I was seen on time, and the doctor took the time to explain my results.", "Ahmed F.", "Patient"),
            quote("Booking in the app is so much easier than calling. A reminder comes the day before.", "Dina M.", "Patient"),
          ]),
          hours("Opening hours", [...days(WEEKDAYS_ONLY, "08:00", "18:00"), ...days(["sat"], "09:00", "13:00")], "For an emergency, call your local emergency number."),
          faq("Questions", BEFORE_YOUR_VISIT.slice(0, 4)),
          EMERGENCY(),
          contact(),
        ],
      },
      ...clinicPages({
        doctors: FAMILY_DOCTORS,
        doctorsTitle: "Our doctors",
        story:
          "<p>{app} has cared for families in our neighbourhood for fifteen years. Many of our patients first came as children and now bring their own. We believe a good visit starts with time to listen, so we keep our days unhurried and our waiting short. Our doctors work together, which means your family doctor, your child's pediatrician and our physiotherapist all see the same notes. Book in the app, choose your doctor and come as you are.</p>",
        photos: ["art-place-clinic.png", "art-visit-checkup.png", "art-visit-children.png", "art-visit-followup.png", "art-visit-physio.png", "art-visit-dental.png"],
        opening: hours("Opening hours", [...days(WEEKDAYS_ONLY, "08:00", "18:00"), ...days(["sat"], "09:00", "13:00")], "For an emergency, call your local emergency number."),
        questions: [...BEFORE_YOUR_VISIT, question("Do you see children?", "Yes, from birth. Our pediatrician sees children every weekday.")],
      }),
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
          slider([
            slide("A smile you'll love", "Check-ups, cleaning and more", screen("services")),
            slide("Book online", "Pick a time that suits you", screen("services")),
            slide("Kids love it here", "A gentle first visit for children", page("doctors")),
          ]),
          quickLinks([
            link("stethoscope", "Book a visit", screen("services")),
            link("event_available", "My visits", screen("appointments")),
            link("groups", "Our dentists", page("doctors")),
            link("info", "Patient info", page("patients")),
          ]),
          cards("specialties", "What we do", [
            card("Check-ups and cleaning", "Twice a year keeps problems away.", "art-visit-dental.png", screen("services")),
            card("Fillings", "Tooth-coloured and done in one visit.", "art-visit-checkup.png", screen("services")),
            card("Braces and aligners", "For teenagers and adults.", "art-visit-followup.png", screen("services")),
            card("Children's dentistry", "Gentle first visits that kids enjoy.", "art-visit-children.png", screen("services")),
          ]),
          list("treatments", "Treatments", "services", "grid", { limit: 6, seeAll: screen("services") }),
          team("Our dentists", DENTISTS),
          testimonials("What patients say", [
            quote("I used to be afraid of the dentist. Dr. Rania changed that in one visit.", "Gül S.", "Patient"),
            quote("My daughter left her check-up smiling, with a sticker and clean teeth.", "Ahmed F.", "Parent"),
            quote("Clear prices before the treatment, and no surprises after.", "Burak T.", "Patient"),
          ]),
          hours("Opening hours", days(["sat", "sun", "mon", "tue", "wed", "thu"], "10:00", "21:00")),
          faq("Questions", [BEFORE_YOUR_VISIT[0]!, BEFORE_YOUR_VISIT[4]!, question("Does a check-up hurt?", "No. A check-up and cleaning are gentle; tell us if anything feels uncomfortable and we stop.")]),
          EMERGENCY(),
          contact(),
        ],
      },
      ...clinicPages({
        doctors: DENTISTS,
        doctorsTitle: "Our dentists",
        story:
          "<p>{app} is a dental clinic for the whole family, built around one idea: nobody should be afraid of the dentist. We explain every treatment and its price before we start, we use gentle, modern equipment, and we never rush. Children have their own dentist and their own little rewards. Book a check-up in the app, and we'll remind you when the next one is due.</p>",
        photos: ["art-place-clinic.png", "art-visit-dental.png", "art-visit-children.png", "art-visit-checkup.png", "art-visit-followup.png", "art-place-salon.png"],
        opening: hours("Opening hours", days(["sat", "sun", "mon", "tue", "wed", "thu"], "10:00", "21:00")),
        questions: [
          question("Does a check-up hurt?", "No. A check-up and cleaning are gentle; tell us if anything feels uncomfortable and we stop."),
          question("How often should I come?", "Every six months for a check-up and cleaning, or as your dentist tells you."),
          question("At what age should children come?", "From their first tooth, or by their first birthday. Early visits make it easy later."),
          ...BEFORE_YOUR_VISIT.slice(1, 5),
        ],
      }),
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
          slider(
            [
              slide("You don't have to do it alone", "Talk to someone who listens", screen("services")),
              slide("In person or online", "Choose what feels right", screen("services")),
              slide("For couples and families", "Learn to talk and listen again", page("doctors")),
            ],
            false,
          ),
          button("book", "Book a session", screen("services")),
          cards("specialties", "How we can help", [
            card("Anxiety and stress", "Tools to feel calmer, day by day.", null, screen("services")),
            card("Couples", "Talk, listen and understand each other.", null, screen("services")),
            card("Children and teens", "Support for young people and their parents.", null, screen("services")),
            card("Online sessions", "The same care, from your own home.", null, screen("services")),
          ]),
          team("Your therapist", [THERAPISTS[0]!], "list"),
          list("sessions", "Sessions", "services", "list"),
          testimonials("In their words", [
            quote("For the first time in years I sleep through the night.", "A client", "Online sessions"),
            quote("Omar helped us talk again, without shouting. Our home feels different.", "A couple", "Couples therapy"),
            quote("My son looks forward to his sessions. That says everything.", "A parent", "Child sessions"),
          ]),
          faq("Questions", THERAPY_QUESTIONS.slice(0, 4)),
          EMERGENCY(),
          contact(),
        ],
      },
      ...clinicPages({
        doctors: THERAPISTS,
        doctorsTitle: "Our therapists",
        story:
          "<p>{app} is a small practice where people come to talk, in confidence, about what weighs on them. Our therapists work with adults, couples, children and families, in person and online. The first session is about getting to know you: what brings you here and what you hope will change. There's no rush and no judgement. Book a session in the app when you're ready, and change it whenever you need to.</p>",
        photos: ["art-place-office.png", "art-place-studio.png", "art-room-living.png", "art-visit-physio.png", "art-event-talk.png", "art-place-hall.png"],
        opening: hours("Opening hours", [...days(WEEKDAYS_ONLY, "09:00", "20:00"), ...days(["sat"], "10:00", "14:00")]),
        questions: THERAPY_QUESTIONS,
      }),
    ],
  },
];


// Gyms and studios: classes, plans, coaches, a timetable.

const classesTab = screenTab("classes", "Classes", "fitness_center", "classes");
const membershipTab = screenTab("membership", "Membership", "card_membership", "memberships");
const myBookingsTab = screenTab("appointments", "My bookings", "event", "appointments");

const FITNESS_QUESTIONS = [
  question("I'm new. Which class should I take?", "Start with a beginners' class: they're marked in the timetable, and the coach shows you every move."),
  question("How do I book a class?", "Open Classes, choose a time and tap Book. Your place is kept until the class starts."),
  question("Can I cancel a class?", "Yes, up to two hours before, from My bookings. Your place goes to the next person waiting."),
  question("Can I freeze my membership?", "Yes, for up to a month a year, when you travel or are unwell. Send us a message."),
  question("Can I bring a friend?", "Yes. Members can bring a friend once a month for free."),
  question("What do I need to bring?", "Comfortable clothes, trainers and a water bottle. We have towels and lockers."),
  question("How do memberships renew?", "Each month, by card, until you stop them in the app."),
];

const PLANS = () =>
  cards("plans", "Membership plans", [
    card("Day pass", "The gym and any class, for one day.", null, screen("memberships")),
    card("Monthly", "Unlimited gym and classes. Stop whenever you like.", null, screen("memberships")),
    card("Yearly", "Two months free, and a session with a coach.", null, screen("memberships")),
    card("Personal training", "One-to-one sessions with your coach, in packs of five.", null, screen("services")),
  ]);

const FITNESS_PHOTOS = ["art-place-gym.png", "art-class-spin.png", "art-class-hiit.png", "art-class-yoga.png", "art-class-pilates.png", "art-class-pt.png", "art-place-studio.png"];

const FITNESS_CONTACT = "<p>Questions about classes, plans or your membership? Ask at the desk, call us or send a message here.</p>";

/** A gym's pages: the week's timetable, its plans, its story, how to reach it and questions. */
function fitnessPages(parts: { week: [string, string][]; story: string; people: ReturnType<typeof who>[]; peopleTitle: string; photos: string[]; opening: ReturnType<typeof hours> }) {
  return [
    otherPage("timetable", "Timetable", [
      text("timetable-intro", "<p>The usual week. Book your place in Classes: it always shows today's times and how many places are left.</p>"),
      cards(
        "week",
        null,
        parts.week.map(([day, classes]) => card(day, classes, null, screen("classes"))),
      ),
      button("book-class", "Book a class", screen("classes"), "filled", "schedule"),
    ]),
    otherPage("plans", "Plans", [
      text("plans-intro", "<p>Choose the plan that fits your week. Every plan includes the gym, the changing rooms and a first session with a coach.</p>"),
      PLANS(),
      faq("About plans", [FITNESS_QUESTIONS[3]!, FITNESS_QUESTIONS[4]!, FITNESS_QUESTIONS[6]!], "plan-questions"),
      button("join", "See the memberships", screen("memberships"), "filled", "card_membership"),
    ]),
    aboutPage({ story: parts.story, people: { title: parts.peopleTitle, list: parts.people }, numbers: [stat("10", "Years"), stat("40", "Classes a week"), stat("900+", "Members")], photos: { title: "Inside the studio", files: parts.photos } }),
    contactPage(FITNESS_CONTACT, parts.opening),
    questionsPage("<p>What new members ask us most.</p>", FITNESS_QUESTIONS),
  ];
}

const GYM_COACHES = [who("kerem", "Strength coach"), who("ece", "Group classes"), who("mira", "Pilates and mobility"), who("yusuf", "Personal trainer")];
const YOGA_TEACHERS = [who("ece", "Yoga teacher"), who("mira", "Pilates teacher"), who("zeynep", "Breathing and meditation"), who("leyla", "Studio manager")];

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
          slider([
            slide("Stronger every week", "Book your spot in a class", screen("classes")),
            slide("Train with a coach", "Personal sessions that fit your goals", screen("services")),
            slide("Your first week is free", "Come and try every class", page("plans")),
          ]),
          quickLinks([
            link("schedule", "Timetable", page("timetable")),
            link("card_membership", "Plans", page("plans")),
            link("event_available", "My bookings", screen("appointments")),
            link("person", "Account", screen("account")),
          ]),
          countdown("The next challenge starts in", 14, null, { label: "See the classes", action: screen("classes") }),
          list("training", "Personal training", "services", "list", { seeAll: screen("services") }),
          PLANS(),
          team("Our coaches", GYM_COACHES),
          stats([stat("40", "Classes a week"), stat("6", "Coaches"), stat("7 days", "A week")]),
          testimonials("Member stories", [
            quote("I lifted my first full push-up at 45. Kerem never let me give up.", "Hakan D.", "Member"),
            quote("The six o'clock spin class is the best start to my day.", "Salma H.", "Member"),
            quote("Booking a class takes two taps. No more queues at the desk.", "Mert Y.", "Member"),
          ]),
          hours("Gym hours", [...days(WEEKDAYS_ONLY, "06:00", "23:00"), ...days(["sat", "sun"], "08:00", "20:00")]),
          faq("Questions", FITNESS_QUESTIONS.slice(0, 4)),
          contact(),
        ],
      },
      ...fitnessPages({
        week: [
          ["Monday", "07:00 Spin, 12:30 Strength, 19:00 HIIT"],
          ["Tuesday", "07:00 Pilates, 18:00 Boxing, 19:30 Yoga"],
          ["Wednesday", "07:00 Spin, 12:30 Strength, 19:00 HIIT"],
          ["Thursday", "07:00 Pilates, 18:00 Boxing, 19:30 Yoga"],
          ["Friday", "07:00 Spin, 18:00 Strength"],
          ["Weekend", "10:00 Family class, 11:30 Open gym with a coach"],
        ],
        story:
          "<p>{app} started in a garage with two benches and a group of friends who trained before work. Ten years later we have a full gym and a busy timetable, but the feeling is the same: people who cheer each other on. Our coaches know every member by name and help you start safely, whatever your level. Come for the classes, stay for the people, and book everything from your phone.</p>",
        people: GYM_COACHES,
        peopleTitle: "Our coaches",
        photos: FITNESS_PHOTOS,
        opening: hours("Gym hours", [...days(WEEKDAYS_ONLY, "06:00", "23:00"), ...days(["sat", "sun"], "08:00", "20:00")]),
      }),
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
          slider(
            [
              slide("A class for every level", "From your first class to handstands", screen("classes")),
              slide("Mornings on the mat", "Start the day slowly, at seven", page("timetable")),
              slide("New to yoga?", "Your first class is free", page("plans")),
            ],
            false,
          ),
          button("classes", "See this week's classes", screen("classes"), "filled", "schedule"),
          quickLinks(
            [
              link("schedule", "Timetable", page("timetable")),
              link("card_membership", "Plans", page("plans")),
              link("event_available", "My bookings", screen("appointments")),
            ],
            "row",
          ),
          list("private", "Private sessions", "services", "list", { limit: 4, seeAll: screen("services") }),
          team("Teachers", YOGA_TEACHERS),
          testimonials("From our students", [
            quote("My back pain is gone after three months of Ece's morning classes.", "Gül S.", "Student"),
            quote("The calmest place in the city. I leave lighter every time.", "Dina M.", "Student"),
            quote("I'd never done yoga before. Nobody made me feel new.", "Burak T.", "Student"),
          ]),
          faq("Questions", [FITNESS_QUESTIONS[0]!, FITNESS_QUESTIONS[1]!, FITNESS_QUESTIONS[5]!, FITNESS_QUESTIONS[2]!]),
          hours("Studio hours", days(["mon", "tue", "wed", "thu", "fri", "sat"], "07:00", "21:00")),
          contact(),
        ],
      },
      ...fitnessPages({
        week: [
          ["Monday", "07:00 Morning flow, 18:30 Pilates, 20:00 Gentle yoga"],
          ["Tuesday", "07:00 Breathing, 12:30 Lunch flow, 19:00 Beginners"],
          ["Wednesday", "07:00 Morning flow, 18:30 Pilates, 20:00 Gentle yoga"],
          ["Thursday", "07:00 Breathing, 12:30 Lunch flow, 19:00 Beginners"],
          ["Friday", "07:00 Morning flow, 18:00 Yin yoga"],
          ["Weekend", "10:00 Family yoga, 11:30 Meditation"],
        ],
        story:
          "<p>{app} is a small, bright studio where you can slow down. We teach yoga, pilates and breathing in small classes, so every teacher can see you and help. Beginners are always welcome: our teachers show easier and harder ways of every pose, and nobody is watching but you. Bring nothing but yourself; we have mats, blocks and tea. Book your class in the app and come a few minutes early to settle in.</p>",
        people: YOGA_TEACHERS,
        peopleTitle: "Our teachers",
        photos: ["art-place-studio.png", "art-class-yoga.png", "art-class-pilates.png", "art-service-massage.png", "art-class-spin.png", "art-place-hall.png"],
        opening: hours("Studio hours", days(["mon", "tue", "wed", "thu", "fri", "sat"], "07:00", "21:00")),
      }),
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
          slider(
            [
              slide("Reach your goal with a plan", "Training and advice made for you", screen("services")),
              slide("Training at the park", "Small groups, three mornings a week", page("timetable")),
              slide("A free first session", "We look at your goals together", screen("services")),
            ],
            false,
          ),
          team("Your coach", [who("kerem", "Personal trainer", "Kerem has coached people back to strength for twelve years, after injuries, babies and long years at a desk.")], "list"),
          stats([stat("1:1", "Coaching"), stat("12 weeks", "Programs")]),
          list("sessions", "Sessions", "services", "list", { seeAll: screen("services") }),
          PLANS(),
          button("plans", "See membership plans", screen("memberships"), "outlined", "card_membership"),
          testimonials("Results", [
            quote("Twelve weeks, eight kilos and my knee doesn't hurt any more.", "Ahmed F.", "Client"),
            quote("Kerem made a plan around my shifts. For once I didn't quit.", "Merve A.", "Client"),
            quote("The park group is the best part of my week.", "Youssef R.", "Group member"),
          ]),
          faq("Questions", [question("Where do we train?", "At the studio, at the park in small groups, or online by video. You choose."), FITNESS_QUESTIONS[1]!, FITNESS_QUESTIONS[2]!, FITNESS_QUESTIONS[6]!]),
          contact(),
        ],
      },
      ...fitnessPages({
        week: [
          ["Monday", "07:00 Park group, 18:00 Personal sessions"],
          ["Tuesday", "Personal sessions all day"],
          ["Wednesday", "07:00 Park group, 18:00 Personal sessions"],
          ["Thursday", "Personal sessions all day"],
          ["Friday", "07:00 Park group, 12:00 Online session"],
          ["Weekend", "09:00 Long walk and talk, Saturdays"],
        ],
        story:
          "<p>I'm Kerem, and I started {app} to coach people one at a time, the way I wish someone had coached me. We begin with a free session to look at your goals, your week and anything that hurts. Then I write a plan that fits your life, not the other way round, and we check it together every two weeks. Train with me at the studio, in a small group at the park, or online when you travel.</p>",
        people: [who("kerem", "Head coach"), who("ece", "Nutrition"), who("mira", "Mobility"), who("can", "Client support")],
        peopleTitle: "The team",
        photos: ["art-class-pt.png", "art-place-gym.png", "art-class-hiit.png", "art-class-spin.png", "art-class-yoga.png", "art-place-studio.png"],
        opening: hours("Studio hours", [...days(WEEKDAYS_ONLY, "07:00", "21:00"), ...days(["sat"], "08:00", "13:00")]),
      }),
    ],
  },
];

// 84.1 Services and companies (the booking engine): cleaning, repairs, consultancies and agencies,
// with pages about the company and its offers as well as the home page.
const servicesBookTab = screenTab("book", "Book", "calendar_month", "services");
const aboutTab = pageTab("about", "About us", "info");

const HOME_SERVICE_QUESTIONS = [
  question("Which areas do you cover?", "The whole city and the towns nearby. Enter your address when you book to check."),
  question("Do you bring your own equipment?", "Yes. Our team brings everything, from cleaning products to ladders: you only need to let us in."),
  HOW_TO_BOOK,
  CHANGE,
  LATE_CANCEL,
  PAY,
  question("What if I'm not happy with the job?", "Tell us within 24 hours and we come back to put it right, at no cost."),
];

const HOME_PACKAGES = () =>
  cards("packages", "Packages", [
    card("One-off clean", "A full clean of your home, top to bottom.", "art-room-living.png", screen("services")),
    card("Weekly clean", "The same team every week, at a lower price.", "art-room-kitchen.png", screen("services")),
    card("Deep clean", "Before moving in or out, or after building work.", "art-room-bedroom.png", screen("services")),
    card("Repairs visit", "A handyman for an hour or a day.", "art-home-maadi.png", screen("services")),
  ]);

const AGENCY_PACKAGES = () =>
  cards("packages", "Packages", [
    card("Brand start", "A logo, colours and your first social posts.", "art-course-ux.png", screen("services")),
    card("Photo day", "A day of product and team photos, edited.", "art-course-photo.png", screen("services")),
    card("Monthly content", "Posts, stories and a report every month.", "art-course-marketing.png", screen("services")),
    card("Campaign", "An idea, the design and the ads, start to finish.", "art-event-photo.png", page("contact")),
  ]);

export const SERVICES_DESIGNS: Design[] = [
  {
    id: "services-home",
    kind: "services",
    name: "Home services",
    description: "Cleaning or repairs: a Book button, your services, numbers, reviews, and About and Offers pages.",
    look: { template: "classic", corners: "round", cards: "elevated", font: "Plus Jakarta Sans", secondary_color: "#F59E0B" },
    tabs: [homeTab, servicesBookTab, aboutTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([
            slide("Your home, taken care of", "Book a visit in a few taps", screen("services")),
            slide("This month's offers", "See what's on offer", page("offers")),
            slide("The same team every week", "People you know in your home", page("about")),
          ]),
          button("book", "Book a service", screen("services"), "filled", "calendar_month"),
          list("services", "Our services", "services", "grid", { limit: 6, seeAll: screen("services") }),
          HOME_PACKAGES(),
          stats([stat("10+", "Years of work"), stat("2,000+", "Jobs done"), stat("4.9", "Average rating")]),
          testimonials("What customers say", [
            quote("They cleaned our flat before we moved in. It looked brand new.", "Lina A.", "Customer"),
            quote("Same two people every Thursday, always on time. I trust them with my keys.", "Hakan D.", "Weekly customer"),
            quote("The handyman fixed three things in an hour and cleaned up after.", "Gül S.", "Customer"),
          ]),
          faq("Questions", HOME_SERVICE_QUESTIONS.slice(0, 4)),
          hours("Working hours", [...days(WEEKDAYS_ONLY, "08:00", "19:00"), ...days(["sat"], "09:00", "15:00")]),
          contact(),
        ],
      },
      aboutPage({
          story:
            "<p>{app} began with one van, two people and a list of neighbours who needed a hand. Today our team cleans and fixes homes all over the city, but we work the same way: on time, careful with your things, and happy to explain what we did. Every team member is trained, insured and someone we know well. If anything isn't right, tell us within a day and we'll come back to fix it.</p>",
          people: { title: "Our team", list: [who("yusuf", "Team lead"), who("tarek", "Technician"), who("mariam", "Cleaning team"), who("nadia", "Bookings")] },
          numbers: [stat("10+", "Years of work"), stat("2,000+", "Jobs done"), stat("4.9", "Average rating")],
          photos: { title: "Before and after", files: [["art-room-before.png", "Before"], ["art-room-living.png", "After"], "art-room-kitchen.png", "art-room-bedroom.png", "art-home-maadi.png", "art-home-garden-city.png"] },
          more: [faq("Questions", HOME_SERVICE_QUESTIONS.slice(0, 2))],
      }),
      {
        slug: "offers",
        title: "Offers",
        show_title: true,
        blocks: [
          notice("success", "This month: 20% off your first visit."),
          list("offer-services", "Services on offer", "services", "list", { seeAll: screen("services") }),
        ],
      },
      pricesPage("<p>Every service's price is on its page before you book. Regular visits cost less, and there are no hidden extras.</p>", HOME_PACKAGES()),
      contactPage(BOOKINGS_CONTACT, hours("Working hours", [...days(WEEKDAYS_ONLY, "08:00", "19:00"), ...days(["sat"], "09:00", "15:00")])),
      questionsPage("<p>How booking works, and what to expect when we come.</p>", HOME_SERVICE_QUESTIONS),
    ],
  },
  {
    id: "services-consulting",
    kind: "services",
    name: "Consultancy",
    description: "Calm and clear: who you are, a Book a call button, your services, your people, and a contact page.",
    look: { template: "minimal", corners: "soft", cards: "outlined", font: "DM Sans", secondary_color: "#2563EB" },
    tabs: [homeTab, screenTab("book", "Book a call", "support_agent", "services"), aboutTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Advice you can act on</h2><p>{app} helps businesses grow. Book a call to talk about yours.</p>"),
          slider(
            [
              slide("Plans that work on Monday morning", "Strategy, finance and teams", screen("services")),
              slide("Your first call is free", "Thirty minutes to talk about your business", screen("services")),
              slide("Workshops for teams", "At your office or online", page("contact")),
            ],
            false,
          ),
          button("book", "Book a call", screen("services"), "filled", "support_agent"),
          list("services", "How we help", "services", "list", { seeAll: screen("services") }),
          CONSULTING_PACKAGES(),
          stats([stat("15", "Years of experience"), stat("300+", "Clients")]),
          testimonials("What clients say", [
            quote("They found the three changes that mattered and helped us make them.", "Lina A.", "Founder"),
            quote("A clear plan, written down, and someone to call when it got hard.", "Hakan D.", "Managing director"),
            quote("Our team workshop was the most useful day we had all year.", "Youssef R.", "Team lead"),
          ]),
          faq("Questions", [
            question("How do sessions work?", "We meet online or at our office for an hour. You get written notes and next steps the same day."),
            HOW_TO_BOOK,
            PAY,
          ]),
          button("contact-page", "Contact us", page("contact"), "outlined", "mail"),
        ],
      },
      aboutPage({
        story:
          "<p>{app} is a small team of advisers who have run businesses themselves. We help owners and managers make better decisions about money, people and growth, and we stay with you while you put them into practice. We don't write long reports nobody reads: you get a short plan, clear numbers and someone to call. Most of our clients come to us because another client sent them.</p>",
        people: { title: "Our people", list: [who("tarek", "Founder"), who("nadia", "Strategy"), who("emre", "Finance"), who("mariam", "Client care")] },
        numbers: [stat("15", "Years of experience"), stat("300+", "Clients"), stat("4.9", "Average rating")],
        photos: { title: "Where we work", files: ["art-place-office.png", "art-course-business.png", "art-course-excel.png", "art-event-talk.png", "art-place-hall.png", "art-course-marketing.png"] },
      }),
      contactPage("<p>Tell us a little about your business and what you need. We'll reply within a working day to book your free first call.</p>", hours("Office hours", days(WEEKDAYS_ONLY, "09:00", "18:00"))),
      pricesPage("<p>Clear prices, agreed before we start. Your first thirty-minute call is free.</p>", CONSULTING_PACKAGES()),
      questionsPage("<p>How working with us works.</p>", [
        question("How do sessions work?", "We meet online or at our office for an hour. You get written notes and next steps the same day."),
        question("Is what I tell you kept private?", "Yes. Everything you share stays between us, and we're happy to sign your confidentiality agreement."),
        HOW_TO_BOOK,
        CHANGE,
        LATE_CANCEL,
        PAY,
      ]),
    ],
  },
  {
    id: "services-agency",
    kind: "services",
    name: "Creative agency",
    description: "Bold: your work in slides, quick links, your services and team, reviews, and an offers page.",
    look: { template: "bold", corners: "round", cards: "flat", font: "Outfit", secondary_color: "#EC4899" },
    tabs: [homeTab, servicesBookTab, pageTab("offers", "Offers", "local_offer"), accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([
            slide("Work that gets noticed", "Design, photos and campaigns", screen("services")),
            slide("Start a project", "Book a first meeting", screen("services")),
            slide("See our packages", "Clear prices, agreed up front", page("prices")),
          ]),
          quickLinks([
            link("calendar_month", "Book", screen("services")),
            link("local_offer", "Offers", page("offers")),
            link("event", "My bookings", screen("appointments")),
            link("info", "About us", page("about")),
          ]),
          list("services", "What we do", "services", "grid", { limit: 6, seeAll: screen("services") }),
          AGENCY_PACKAGES(),
          team("The team", [who("deniz", "Designer"), who("can", "Photographer"), who("zeynep", "Copywriter"), who("omar", "Ads and reports")]),
          testimonials("Clients", [
            quote("Our new logo and photos doubled the visits to our shop page in a month.", "Salma H.", "Café owner"),
            quote("They understood our brand in one meeting. Every post since sounds like us.", "Mert Y.", "Marketing manager"),
            quote("Fast, friendly and the photo day was actually fun.", "Dina M.", "Shop owner"),
          ]),
          stats([stat("120+", "Projects"), stat("8", "Years")]),
          faq("Questions", [
            question("How does a project start?", "With a free first meeting. We listen, then send you a short plan and a price."),
            question("How long does a project take?", "Most take two to six weeks. We agree the dates before we start."),
            PAY,
          ]),
          contact(),
        ],
      },
      {
        slug: "offers",
        title: "Offers",
        show_title: true,
        blocks: [
          countdown("This offer ends in", 14, null, { label: "Book now", action: screen("services") }),
          list("offer-services", "On offer", "services", "list"),
        ],
      },
      aboutPage({
        story:
          "<p>{app} started when a designer and a photographer shared a desk and a few clients. Eight years and many projects later, we're a small team that makes brands look and sound like themselves. We work with cafés, shops, clinics and growing companies, and we keep every project personal: the people you meet on day one are the people who do the work. Tell us what you want people to feel, and we'll make it happen.</p>",
        people: { title: "The team", list: [who("deniz", "Designer"), who("can", "Photographer"), who("zeynep", "Copywriter"), who("omar", "Ads and reports")] },
        numbers: [stat("120+", "Projects"), stat("8", "Years"), stat("4.9", "Average rating")],
        photos: { title: "Our work", files: ["art-course-ux.png", "art-course-photo.png", "art-course-marketing.png", "art-event-photo.png", "art-event-film.png", "art-place-office.png"] },
      }),
      pricesPage("<p>Every project has a clear price, agreed before we start. Packages are a good place to begin.</p>", AGENCY_PACKAGES()),
      contactPage("<p>Have a project in mind? Tell us about it and we'll reply within a working day to book a first meeting.</p>", hours("Office hours", days(WEEKDAYS_ONLY, "10:00", "19:00"))),
      questionsPage("<p>How we work with clients.</p>", [
        question("How does a project start?", "With a free first meeting. We listen, then send you a short plan and a price."),
        question("How long does a project take?", "Most take two to six weeks. We agree the dates before we start."),
        question("Who owns the work?", "You do. When the project is paid, every file is yours to use as you like."),
        question("Can we change things along the way?", "Yes. Two rounds of changes are in every price; more are possible at an agreed cost."),
        HOW_TO_BOOK,
        PAY,
      ]),
    ],
  },
];
