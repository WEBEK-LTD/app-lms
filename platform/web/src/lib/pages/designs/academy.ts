import {
  accountTab,
  button,
  categories,
  contact,
  continueLearning,
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
  type Design,
} from "./build";

// 33 Academy apps (the lms engine): courses, a student's own courses and the wishlist.

const coursesTab = screenTab("courses", "Courses", "school", "courses");
const learningTab = screenTab("learning", "My courses", "menu_book", "my_courses");

export const ACADEMY_DESIGNS: Design[] = [
  {
    id: "academy-classic",
    kind: "academy",
    name: "Classic academy",
    description: "Slides, your newest and most popular courses, categories, reviews and questions.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Bricolage Grotesque", secondary_color: "#E8B04B" },
    tabs: [homeTab, coursesTab, learningTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([
            slide("Learn something new this season", "Courses from our teachers, at your own pace", screen("courses")),
            slide("Start with a free lesson", "Try a course before you enroll", screen("courses")),
          ]),
          search("courses", "Search courses"),
          continueLearning(),
          quickLinks([
            link("school", "All courses", screen("courses")),
            link("menu_book", "My courses", screen("my_courses")),
            link("favorite", "Wishlist", screen("favorites")),
            link("receipt_long", "Orders", screen("orders")),
          ]),
          list("new-courses", "New courses", "courses", "carousel", { seeAll: screen("courses") }),
          categories("Categories", "courses"),
          list("popular", "Popular courses", "courses", "grid", { sort: "popular", limit: 4 }),
          testimonials("What students say", [quote("Write what one of your students says about your courses.", "Student's name", "Student")]),
          faq("Questions", [
            question("How do I start a course?", "Open the course and choose Enroll. Free courses start at once; you'll find them under My courses."),
            question("Can I learn on my phone and my computer?", "Yes. Sign in with the same account and your progress follows you."),
          ]),
        ],
      },
    ],
  },
  {
    id: "academy-online",
    kind: "academy",
    name: "Online courses",
    description: "Big slides and numbers, popular courses first and topics as tiles.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#F97316" },
    tabs: [homeTab, coursesTab, learningTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          search("courses", "What do you want to learn?"),
          continueLearning(),
          slider([
            slide("Learn from anywhere", "Lessons on your phone, whenever you have a moment", screen("courses")),
            slide("New courses every month", "Turn on notifications to hear first", screen("notifications")),
            slide("Pick up where you left off", "Your courses and progress in one place", screen("my_courses")),
          ]),
          stats([stat("100%", "Online"), stat("24/7", "Access"), stat("1:1", "Teacher help")]),
          list("popular", "Most popular", "courses", "carousel", { sort: "popular", seeAll: screen("courses") }),
          categories("Browse by topic", "courses", "tiles"),
          list("new-courses", "Just added", "courses", "list", { limit: 5 }),
          notice("info", "Questions about a course? Write to us from your account.", "Account", screen("account")),
        ],
      },
    ],
  },
  {
    id: "academy-coaching",
    kind: "academy",
    name: "Coaching",
    description: "You and your programs first, with an About page for your story and questions.",
    look: { template: "minimal", corners: "sharp", cards: "flat", font: "Plus Jakarta Sans", secondary_color: "#0F766E" },
    tabs: [homeTab, screenTab("courses", "Programs", "school", "courses"), learningTab, pageTab("about", "About", "info"), accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          text("welcome", "<h2>Coaching that fits your week</h2><p>Programs, live sessions and one-to-one support from {app}.</p>"),
          button("see-programs", "See the programs", screen("courses")),
          continueLearning(),
          countdown("The next group starts in", 30, null, { label: "Join the group", action: screen("courses") }),
          list("programs", "Programs", "courses", "list", { seeAll: screen("courses") }),
          testimonials("Results", [quote("Write what someone you coached says about working with you.", "Client's name", "Program member")]),
        ],
      },
      {
        slug: "about",
        title: "About",
        show_title: true,
        blocks: [
          team("Your coach", [person("Your name", "Coach", "Write a few words about your experience and how you work with people.")], "list"),
          faq("Questions", [
            question("How do the programs work?", "Each program has short lessons you follow at your pace, with tasks between them."),
            question("Can I ask questions?", "Yes. Write to us from your account and we answer within a day."),
          ]),
          contact(),
        ],
      },
    ],
  },
  {
    id: "academy-kids",
    kind: "academy",
    name: "Kids academy",
    description: "Bright and friendly: courses by age, your center's hours and answers for parents.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Lexend", secondary_color: "#FFB703" },
    tabs: [homeTab, coursesTab, learningTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          notice("success", "Enrollment for the new term is open.", "See courses", screen("courses")),
          slider([slide("Fun lessons for curious kids", "Games, stories and projects", screen("courses")), slide("Learn at home", "At your own pace, with a grown-up nearby", page("home"))]),
          quickLinks(
            [
              link("school", "Courses", screen("courses")),
              link("menu_book", "My courses", screen("my_courses")),
              link("favorite", "Wishlist", screen("favorites")),
              link("person", "Account", screen("account")),
            ],
            "row",
          ),
          continueLearning(),
          list("new-courses", "For young learners", "courses", "carousel", { seeAll: screen("courses") }),
          categories("By age and subject", "courses", "tiles"),
          hours("Our center's hours", [...days(["mon", "tue", "wed", "thu"], "15:00", "19:00"), ...days(["sat"], "10:00", "14:00")], "Online lessons are open any time."),
          faq("For parents", [
            question("How do I follow my child's progress?", "Sign in with your child's account and open My courses to see each course's progress."),
            question("What does my child need?", "A phone or a tablet and an account. Lessons work on both."),
          ]),
          contact(),
        ],
      },
    ],
  },
];
