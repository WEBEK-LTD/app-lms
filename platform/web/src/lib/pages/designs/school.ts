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
  WEEKDAYS_ONLY,
  type Design,
} from "./build";
import { aboutPage, contactPage, otherPage, questionsPage, who } from "./pages";

// 105.4 Schools: students, parents and teachers (teachers also get the Classroom tab in the app).
// 110.3 With the principal's welcome, Admissions (and a form to ask about a place) and About the school.

const schoolTabs = [homeTab, screenTab("school", "School", "school", "school"), accountTab];

const SIGN_IN = question("How do I sign in?", "With the mobile number you gave the school. A parent sees each of their children.");
const FEES = question("How do I pay the fees?", "Open My school, then Fees: pay by card in the app, or at the school.");
const APPLY = question("When can we apply?", "All year round. Places for the new school year are offered from January.");
const VISIT = question("Can we visit the school?", "Yes. Ask for a visit with the form on our Admissions page and we'll show you around.");
const TEST = question("Is there an entry test?", "Not for young children. Older students meet a teacher for a friendly talk.");
const BUS = question("Is there a school bus?", "Yes, on several routes across the city. Ask us about your area.");
const COST = question("What are the fees?", "They depend on the year. Ask us and we'll send you the full list.");
const ILL = question("Who do I tell when my child is ill?", "Send a message to the school office before 8 am, or call us.");
const ADMISSIONS = [APPLY, VISIT, TEST, BUS, COST];

const PRINCIPAL = () =>
  team(
    "A word from our principal",
    [who("nadia", "Principal", "Welcome! Every child here is known by name, and every family is part of school life. Come and visit: you'll feel it as soon as you walk in.")],
    "list",
    "principal",
  );

const STAFF = [who("nadia", "Principal"), who("omar", "Head of primary"), who("selin", "Head of secondary"), who("yusuf", "School office")];

const CALENDAR = () => notice("info", "The new term starts next month. See every date in My school.", "My school", screen("school"), "calendar");

const QUOTES = [
  quote("The teachers know my daughter as well as I do.", "Merve A.", "Parent"),
  quote("Homework and grades in the app: no more lost notes in school bags.", "Ahmed F.", "Parent"),
  quote("My son runs to school in the morning. That says it all.", "Ece B.", "Parent"),
];

const NUMBERS = [stat("30+", "Teachers"), stat("600+", "Students"), stat("25", "Years")];

const STORY =
  "<p>{app} has welcomed children for twenty-five years. We're a school where every child is known by name, where teachers have time to listen and where parents are part of school life. Our classrooms are bright, our library is busy and our playground is never quiet. We teach with plenty of science, art, sport and languages, and we help each child find what they love. Come and visit: you'll feel it as soon as you walk in.</p>";

const FACILITIES = [
  ["art-school-classroom.png", "Classrooms"],
  ["art-school-library.png", "The library"],
  ["art-school-lab.png", "The science lab"],
  ["art-school-art.png", "The art room"],
  ["art-school-sports.png", "The sports field"],
  ["art-school-bus.png", "The school bus"],
] as [string, string][];

const schoolPages = () => [
  otherPage("admissions", "Admissions", [
    text("admissions-intro", "<p>Thinking of joining us? We'd love to meet you and your child. Here's how it works.</p>"),
    cards("admission-steps", "Four steps", [
      card("1. Visit us", "See the school on a normal day."),
      card("2. Apply", "Fill in the form below, or ask us for one."),
      card("3. Meet us", "A friendly talk with your child and a teacher."),
      card("4. Welcome day", "Meet the class before the first day."),
    ]),
    faq("Admissions questions", ADMISSIONS, "admissions-questions"),
    form(
      "admissions-form",
      "Ask about a place",
      [
        field("name", "text", "Parent's name", true),
        field("phone", "phone", "Phone number", true),
        field("email", "email", "Email"),
        field("child", "text", "Child's name"),
        field("age", "number", "Child's age", true),
        field("message", "long_text", "Your questions"),
      ],
      "Send",
      "Thank you. The school office will call you within two working days.",
    ),
  ]),
  aboutPage({
    title: "About the school",
    story: STORY,
    people: { title: "Our staff", list: STAFF },
    numbers: NUMBERS,
    photos: { title: "Our school", files: FACILITIES },
    more: [PRINCIPAL()],
  }),
  contactPage("<p>The school office is open on school days. Call us, write, or send a message here and we'll answer the same day.</p>", hours("School office", days(WEEKDAYS_ONLY, "07:30", "16:30"))),
  questionsPage("<p>What families ask us most.</p>", [SIGN_IN, FEES, ILL, ...ADMISSIONS]),
];

export const SCHOOL_DESIGNS: Design[] = [
  {
    id: "school-classic",
    kind: "school",
    name: "Classic school",
    description: "A welcome, quick links to the timetable and the school, the school's news and questions families ask.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#E9C46A" },
    tabs: schoolTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Welcome to our school", "The timetable, homework, grades and news in one place", screen("school")),
              slide("Admissions are open", "Ask about a place for your child", page("admissions")),
              slide("Come and visit", "See the school on a normal day", page("admissions")),
            ],
            false,
          ),
          quickLinks([
            link("school", "My school", screen("school")),
            link("notifications", "Updates", screen("notifications")),
            link("person", "Account", screen("account")),
            link("info", "Admissions", page("admissions")),
          ]),
          PRINCIPAL(),
          CALENDAR(),
          list("school_news", "School news", "school_news", "list", { seeAll: screen("school") }),
          stats(NUMBERS),
          testimonials("What parents say", QUOTES),
          faq("Questions", [SIGN_IN, FEES, APPLY, VISIT]),
          button("admissions", "Ask about a place", page("admissions"), "outlined", "school"),
          contact(),
        ],
      },
      ...schoolPages(),
    ],
  },
  {
    id: "school-bright",
    kind: "school",
    name: "Bright school",
    description: "Colourful and friendly: a big button to the school, the latest news and what parents say.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#FF9F1C" },
    tabs: schoolTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Every day at school, on your phone", "Homework, grades and attendance as they happen", screen("school")),
              slide("Science, art and sport", "Something for every child", page("about")),
              slide("Join us next year", "Admissions are open", page("admissions")),
            ],
            false,
          ),
          button("school", "Open my school", screen("school")),
          CALENDAR(),
          list("school_news", "Latest news", "school_news", "carousel", { seeAll: screen("school") }),
          PRINCIPAL(),
          team("Our staff", STAFF),
          testimonials("What parents say", QUOTES),
          faq("Questions", [SIGN_IN, ILL, BUS, APPLY]),
          contact(),
        ],
      },
      ...schoolPages(),
    ],
  },
  {
    id: "school-calm",
    kind: "school",
    name: "Calm school",
    description: "Quiet and clear: a short welcome, the school's news, a few numbers and the team to talk to.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Manrope", secondary_color: "#84A98C" },
    tabs: schoolTabs,
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Welcome</h2><p>{app} keeps families and teachers close: the timetable, homework, grades and news.</p>"),
          slider(
            [
              slide("Every child known by name", "Small classes, caring teachers", page("about")),
              slide("School life, on your phone", "Homework, grades and news", screen("school")),
              slide("Ask about a place", "Admissions for next year", page("admissions")),
            ],
            false,
          ),
          button("school", "My school", screen("school")),
          list("school_news", "School news", "school_news", "list", { seeAll: screen("school") }),
          CALENDAR(),
          stats(NUMBERS),
          team("Talk to us", STAFF),
          testimonials("What parents say", QUOTES),
          faq("Questions", [SIGN_IN, FEES, ILL, VISIT]),
          contact(),
        ],
      },
      ...schoolPages(),
    ],
  },
];
