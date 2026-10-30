import {
  accountTab,
  button,
  card,
  cards,
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

// 33 Academy apps (the lms engine): courses, a student's own courses and the wishlist.
// 110.3 Each with About us, Contact, Questions and Pricing pages.

const coursesTab = screenTab("courses", "Courses", "school", "courses");
const learningTab = screenTab("learning", "My courses", "menu_book", "my_courses");

const COURSE_PHOTOS = ["art-course-ux.png", "art-course-arabic.png", "art-course-photo.png", "art-course-marketing.png", "art-course-english.png", "art-course-python.png"];

const START = question("How do I start a course?", "Open the course and choose Enroll. Free courses start at once; you'll find them under My courses.");
const DEVICES = question("Can I learn on my phone and my computer?", "Yes. Sign in with the same account and your progress follows you.");
const KEEP = question("How long can I keep a course?", "For as long as the course is online. Watch any lesson again whenever you like.");
const CERTIFICATE = question("Do I get a certificate?", "Yes. When you finish every lesson and pass the final quiz, your certificate is ready to download from the course.");
const TRY = question("Can I try a course before I pay?", "Most courses have free lessons. Open the course and look for the lessons marked Free.");
const PAY = question("How do I pay?", "By card, in the app. Your receipt is under Orders as soon as you pay.");
const REFUND = question("Can I get my money back?", "If a course isn't right for you, write to us within 14 days of buying it and we'll refund it.");
const ASK = question("How do I ask my teacher a question?", "Write under the lesson or send us a message. Teachers answer within two working days.");
const ACADEMY_QUESTIONS = [START, DEVICES, TRY, CERTIFICATE, PAY, REFUND, KEEP, ASK];

const ACADEMY_QUOTES = [
  quote("The lessons are short and clear. I finished my first course in two weeks, on the bus to work.", "Ayşe K.", "Design student"),
  quote("I could ask the teacher under each lesson, and she answered every question.", "Mohamed S.", "Arabic student"),
  quote("Good courses, fair prices and a certificate I could add to my CV.", "Burak T.", "Excel student", 4),
];

const ACADEMY_NUMBERS = [stat("120+", "Courses"), stat("15,000", "Students"), stat("4.8", "Average rating"), stat("35", "Teachers")];

const ACADEMY_TEAM = [who("leyla", "Design teacher"), who("omar", "Arabic teacher"), who("selin", "Marketing teacher"), who("karim", "Programming teacher")];

const LEVELS = cards("levels", "Find your level", [
  { title: "Beginner", text: "Start from zero, one small step at a time.", image_url: null, action: screen("courses") },
  { title: "Intermediate", text: "Build on what you know with real projects.", image_url: null, action: screen("courses") },
  { title: "Advanced", text: "Go deeper, with harder tasks and expert feedback.", image_url: null, action: screen("courses") },
  { title: "Free lessons", text: "Try the first lessons of any course without paying.", image_url: null, action: screen("courses") },
]);

const FREE_LESSON = notice("success", "Every course starts with a free lesson. Try one today.", "Try a free lesson", screen("courses"), "free-lesson");

const CERTIFICATES = cards(
  "certificates",
  "How certificates work",
  [card("Finish the lessons", "Watch every lesson and do its task, at your own pace."), card("Pass the final quiz", "Answer the questions at the end. You can try again."), card("Download it", "Your certificate, with your name and the course, from the course page."), card("Share it", "Add it to your CV or send it to your employer.")],
);

const ACADEMY_CONTACT = "<p>Questions about a course, a payment or your account? Send us a message and we answer within a working day.</p>";
const SUPPORT_HOURS = hours("Support hours", days(WEEKDAYS_ONLY, "09:00", "18:00"), "Lessons are open any time.");

const KIDS_QUESTIONS = [
  question("How do I follow my child's progress?", "Sign in with your child's account and open My courses to see each course's progress."),
  question("What does my child need?", "A phone or a tablet and an account. Lessons work on both."),
  question("How long is a lesson?", "Fifteen to twenty minutes. Children can stop and carry on later from the same place."),
  question("Are the lessons safe for children?", "Yes. There are no adverts and no chat with strangers: only our teachers write to your child's account."),
  question("Can two children share an account?", "Each child needs their own account, so their progress is kept apart. You can sign in to each on the same phone."),
  question("Can we visit the center?", "Yes. Come during our opening hours, or send us a message to book a visit."),
];

const academyStory =
  "<p>{app} started in a small classroom with one teacher and twelve students. Today our courses reach people in many cities, but we still teach the same way: short lessons, real tasks and a teacher who answers your questions. Every course is made by someone who does the work every day. Start with a free lesson, learn at your own pace and come back to any lesson whenever you need it. We're glad you're here.</p>";

/** The Pricing page of an academy: the ways to pay, and questions about paying. */
const pricingPage = () =>
  otherPage("pricing", "Pricing", [
    text("pricing-intro", "<p>Pay for one course, or learn as much as you like with a pass. Every course starts with a free lesson.</p>"),
    cards("plans", "Ways to learn", [
      card("One course", "Pay once and keep the course for as long as it's online.", null, screen("courses")),
      card("Monthly pass", "Every course for one monthly price. Stop whenever you like."),
      card("For teams", "Courses for your whole team, with one invoice. Write to us for a price.", null, page("contact")),
      card("Free lessons", "Try the first lessons of any course without paying.", null, screen("courses")),
    ]),
    faq("Paying", [PAY, REFUND, question("Do prices include tax?", "Yes. The price you see on a course is the price you pay.")], "payments"),
    button("see-courses", "See all courses", screen("courses")),
  ]);

const academyPages = (story: string, people = ACADEMY_TEAM, questions = ACADEMY_QUESTIONS, hoursBlock = SUPPORT_HOURS) => [
  aboutPage({ story, people: { title: "Our teachers", list: people }, numbers: ACADEMY_NUMBERS, photos: { title: "Inside our courses", files: COURSE_PHOTOS } }),
  contactPage(ACADEMY_CONTACT, hoursBlock),
  questionsPage("<p>The questions students ask us most. Can't find yours? Send us a message.</p>", questions),
  pricingPage(),
];

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
            slide("A certificate for every course", "Finish the lessons, pass the quiz, download it", page("faq")),
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
          stats(ACADEMY_NUMBERS.slice(0, 3)),
          testimonials("What students say", ACADEMY_QUOTES),
          faq("Questions", [START, DEVICES, TRY, CERTIFICATE, PAY]),
          text("story", "<h3>Why {app}</h3><p>Short lessons, real tasks and teachers who answer. Learn at your own pace, on any device.</p>"),
          contact(),
        ],
      },
      ...academyPages(academyStory),
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
          LEVELS,
          FREE_LESSON,
          list("new-courses", "Just added", "courses", "list", { limit: 5 }),
          testimonials("What students say", ACADEMY_QUOTES),
          faq("Questions", [TRY, DEVICES, CERTIFICATE, REFUND]),
          contact(),
        ],
      },
      ...academyPages(academyStory),
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
          slider([
            slide("Change one thing this month", "Programs with short lessons and weekly tasks", screen("courses")),
            slide("Live group sessions", "Talk through your progress with the group", screen("courses")),
            slide("Not sure where to start?", "Send me a message and we'll find your program", page("contact")),
          ]),
          text("welcome", "<h2>Coaching that fits your week</h2><p>Programs, live sessions and one-to-one support from {app}.</p>"),
          button("see-programs", "See the programs", screen("courses")),
          continueLearning(),
          countdown("The next group starts in", 30, null, { label: "Join the group", action: screen("courses") }),
          team("Your coach", [who("leyla", "Coach", "Ten years of coaching people through new jobs, new businesses and new habits.")], "list"),
          list("programs", "Programs", "courses", "list", { seeAll: screen("courses") }),
          testimonials("Results", [
            quote("Three months ago I didn't know where to start. Now my shop is open and I have a plan for the year.", "Salma H.", "Program member"),
            quote("The weekly tasks kept me going. Small steps, every week, and they add up.", "Hakan D.", "Program member"),
            quote("The group sessions felt like talking to friends who push you forward.", "Dina M.", "Group member"),
          ]),
          faq("Questions", [
            question("How do the programs work?", "Each program has short lessons you follow at your pace, with tasks between them."),
            question("Can I ask questions?", "Yes. Write to us from your account and we answer within a day."),
            question("How big are the groups?", "Twelve people at most, so everyone gets time to talk."),
            REFUND,
          ]),
          contact(),
        ],
      },
      ...academyPages(
        "<p>I'm Leyla, and I have coached people through big changes for over ten years: new jobs, new businesses and new habits. {app} is how I work with people wherever they live. Each program mixes short lessons with tasks you do in your own week, and live group sessions where we look at your progress together. I keep the groups small so everyone is heard. Not sure where to start? Send me a message and we'll find the right program for you.</p>",
        [who("leyla", "Coach and founder"), who("mariam", "Program manager"), who("emre", "Group sessions"), who("zeynep", "Student support")],
        [
          question("How do the programs work?", "Each program has short lessons you follow at your pace, with tasks between them."),
          question("How big are the groups?", "Twelve people at most, so everyone gets time to talk."),
          question("Can I have one-to-one sessions?", "Yes. Some programs include them; for the others, send me a message to book one."),
          question("Can I ask questions?", "Yes. Write to us from your account and we answer within a day."),
          DEVICES,
          PAY,
          REFUND,
        ],
      ),
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
          slider([
            slide("Fun lessons for curious kids", "Games, stories and projects", screen("courses")),
            slide("Learn at home", "At your own pace, with a grown-up nearby", page("home")),
            slide("Small groups at our center", "Come and meet the teachers", page("contact")),
          ]),
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
          cards("ages", "Lessons for every age", [
            { title: "Ages 4 to 6", text: "Play, colours, letters and numbers.", image_url: null, action: screen("courses") },
            { title: "Ages 7 to 9", text: "Reading, maths and first science projects.", image_url: null, action: screen("courses") },
            { title: "Ages 10 to 12", text: "Coding, languages and bigger projects.", image_url: null, action: screen("courses") },
            { title: "For parents", text: "How to help at home, and what each course teaches.", image_url: null, action: page("faq") },
          ]),
          testimonials("What parents say", [
            quote("My daughter asks to do her lesson before dinner. That has never happened with homework.", "Merve A.", "Parent"),
            quote("The lessons are short enough for a seven-year-old and fun enough to finish.", "Ahmed F.", "Parent"),
            quote("I can see what my son learned each week, and the teachers write back quickly.", "Ece B.", "Parent"),
          ]),
          hours("Our center's hours", [...days(["mon", "tue", "wed", "thu"], "15:00", "19:00"), ...days(["sat"], "10:00", "14:00")], "Online lessons are open any time."),
          faq("For parents", KIDS_QUESTIONS.slice(0, 4)),
          contact(),
        ],
      },
      ...academyPages(
        "<p>{app} began with a simple idea: children learn best when they are having fun. Our teachers turn letters, numbers, science and coding into games, stories and small projects. Lessons are short, so they fit after school, and a grown-up can follow every step. At our center children learn in small groups; at home they carry on in the app. Every week we tell parents what their child learned, and we're always happy to answer questions.</p>",
        [who("selin", "Reading and writing"), who("yusuf", "Maths and science"), who("deniz", "Art and music"), who("karim", "Coding club")],
        KIDS_QUESTIONS,
        hours("Our center's hours", [...days(["mon", "tue", "wed", "thu"], "15:00", "19:00"), ...days(["sat"], "10:00", "14:00")], "Online lessons are open any time."),
      ),
    ],
  },
];

// 105.3 Academies with many teachers: their teachers as a tab, and a teacher's own screens for the teachers.
const teachersTab = screenTab("teachers", "Teachers", "groups", "teachers");

const TEACHERS_QUESTIONS = [
  question("Who teaches the courses?", "Our teachers. Open a teacher to see their courses and what students say, and follow them to hear of new ones."),
  question("How do I choose a teacher?", "Open Teachers to see each teacher's courses, ratings and reviews. Many courses start with a free lesson."),
  TRY,
  CERTIFICATE,
  PAY,
  REFUND,
  question("Can I teach here?", "Yes: open Account and choose Teach here. We answer every application."),
];

const TEACHERS_QUOTES = [
  quote("I tried three teachers before I found the right one. The free lessons made it easy to choose.", "Youssef R.", "Student"),
  quote("My English teacher comments on every task. I can see how much I've improved.", "Gül S.", "Student"),
  quote("I teach two courses here. Students find me, and I only think about teaching.", "Lina A.", "Teacher"),
];

const TEACHERS_TEAM = [who("leyla", "Design"), who("omar", "Arabic"), who("nadia", "Business English"), who("karim", "Python")];

const FEATURED_TEACHER = team("Teacher of the month", [who("nadia", "Business English", "Nadia has taught English to people at work for twelve years. Her students write real emails from the first lesson.")], "list", "featured-teacher");

const teachersStory =
  "<p>{app} brings good teachers and keen students together. Every teacher here does the work they teach: designers, developers, translators and business owners. Before a course goes online we watch every lesson, so you know what you're paying for. You choose the teacher, try a free lesson and learn at your own pace. If you teach yourself, we take care of payments and the app, so you can think only about your students.</p>";

const teachersPages = () => [
  aboutPage({ story: teachersStory, people: { title: "Some of our teachers", list: TEACHERS_TEAM }, numbers: ACADEMY_NUMBERS, photos: { title: "Inside our courses", files: COURSE_PHOTOS } }),
  contactPage(ACADEMY_CONTACT, SUPPORT_HOURS),
  questionsPage("<p>What students and teachers ask us most. Can't find yours? Send us a message.</p>", TEACHERS_QUESTIONS),
  pricingPage(),
];

export const INSTRUCTORS_DESIGNS: Design[] = [
  {
    id: "teachers-marketplace",
    kind: "instructors",
    name: "Course marketplace",
    description: "Many teachers, many courses: slides, the teachers, the newest and most popular courses and reviews.",
    look: { template: "classic", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#F2A541" },
    tabs: [homeTab, coursesTab, teachersTab, learningTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider([
            slide("Learn from the best teachers", "Each one teaches what they know best", screen("teachers")),
            slide("Start with a free lesson", "Try a course before you enroll", screen("courses")),
            slide("Teach what you know", "Open Account and choose Teach here", screen("account")),
          ]),
          search("courses", "Search courses"),
          continueLearning(),
          FEATURED_TEACHER,
          list("new-courses", "New courses", "courses", "carousel", { seeAll: screen("courses") }),
          categories("Categories", "courses"),
          list("popular", "Popular courses", "courses", "grid", { sort: "popular", limit: 4 }),
          FREE_LESSON,
          team("Meet the teachers", TEACHERS_TEAM, "grid"),
          testimonials("What students say", TEACHERS_QUOTES),
          faq("Questions", TEACHERS_QUESTIONS.slice(0, 5)),
          contact(),
        ],
      },
      ...teachersPages(),
    ],
  },
  {
    id: "teachers-school",
    kind: "instructors",
    name: "Online school",
    description: "Calm and clear: a welcome, quick links to the teachers and courses, numbers and questions.",
    look: { template: "minimal", corners: "soft", cards: "flat", font: "Manrope", secondary_color: "#7BC8A4" },
    tabs: [homeTab, coursesTab, teachersTab, learningTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Teachers you can trust", "Courses for every level", screen("courses")),
              slide("Learn at your own pace", "Short lessons on your phone", screen("courses")),
              slide("A certificate at the end", "For every course you finish", page("faq")),
            ],
            false,
          ),
          quickLinks([
            link("groups", "Teachers", screen("teachers")),
            link("school", "All courses", screen("courses")),
            link("menu_book", "My courses", screen("my_courses")),
            link("person", "Account", screen("account")),
          ]),
          list("new-courses", "New courses", "courses", "list", { seeAll: screen("courses") }),
          stats([stat("50+", "Teachers"), stat("200+", "Courses"), stat("4.8", "Rating")]),
          LEVELS,
          CERTIFICATES,
          team("Meet the teachers", TEACHERS_TEAM, "carousel"),
          testimonials("What students say", TEACHERS_QUOTES),
          faq("Questions", [TEACHERS_QUESTIONS[0]!, TEACHERS_QUESTIONS[1]!, CERTIFICATE, TEACHERS_QUESTIONS[6]!]),
          text("story", "<h3>About {app}</h3><p>Every teacher here does the work they teach. We watch every lesson before a course goes online.</p>"),
          contact(),
        ],
      },
      ...teachersPages(),
    ],
  },
  {
    id: "teachers-tutors",
    kind: "instructors",
    name: "Tutors",
    description: "Bold and personal: your teachers first, an offer with a countdown and what students say.",
    look: { template: "bold", corners: "round", cards: "elevated", font: "Outfit", secondary_color: "#FF8C42" },
    tabs: [homeTab, teachersTab, coursesTab, learningTab, accountTab],
    pages: [
      {
        slug: "home",
        title: "Home",
        show_title: false,
        blocks: [
          slider(
            [
              slide("Find your teacher", "Search by subject, then learn at your pace", screen("teachers")),
              slide("One teacher, one goal", "Courses made by people who do the work", screen("courses")),
              slide("Try before you pay", "Most courses start with a free lesson", screen("courses")),
            ],
            false,
          ),
          button("teachers", "Meet the teachers", screen("teachers")),
          countdown("New courses this month", 14, "The offer has ended.", { label: "See the courses", action: screen("courses") }),
          FEATURED_TEACHER,
          list("popular", "Popular courses", "courses", "carousel", { sort: "popular", seeAll: screen("courses") }),
          FREE_LESSON,
          team("Our tutors", TEACHERS_TEAM, "grid"),
          testimonials("What students say", TEACHERS_QUOTES),
          faq("Questions", TEACHERS_QUESTIONS.slice(1, 6)),
          contact(),
        ],
      },
      ...teachersPages(),
    ],
  },
];
