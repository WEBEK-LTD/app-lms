import {
  button,
  contact,
  days,
  faq,
  homeTab,
  hours,
  link,
  question,
  quickLinks,
  quote,
  screen,
  screenTab,
  slide,
  slider,
  stat,
  stats,
  testimonials,
  text,
  WEEK,
  type Design,
} from "./build";
import { aboutPage, contactPage, questionsPage, who } from "./pages";

// 235 A client's own community: the app's screens (feed, Q&A, groups,
// messages, the member's profile) do the work; these pages welcome members,
// say who runs the community and set out the house rules. One light design,
// one dark and one that follows the phone, all flat: 1px lines, no shadows.

const communityTabs = [
  { ...homeTab, label: "Community", icon: "newspaper" },
  screenTab("questions", "Q&A", "help", "community_questions"),
  screenTab("groups", "Groups", "groups", "community_groups"),
  screenTab("messages", "Messages", "chat", "community_messages"),
  screenTab("profile", "Profile", "person", "community_profile"),
];

const WHO = question("Who can join?", "Everyone with an account in {app}. Sign in with your account and you're a member.");
const RULES = question("What are the house rules?", "Be kind, stay on topic and never share anyone's private details. Report anything that breaks the rules and our team will look at it.");
const GROUPS = question("How do private groups work?", "Ask to join and a group's moderators let you in. Only members see a private group's posts.");
const BLOCK = question("Can I stop someone from messaging me?", "Yes. Open their profile and choose Block: they can't message you or see your posts.");
const ASK = question("How do I get a good answer?", "Give your question a clear title, say what you tried, and pick the right group. Members answer most questions within a day.");
const REPORT = question("What happens when I report something?", "Our moderators read every report, usually the same day. The member who reported stays anonymous.");
const PROFILE = question("What do others see on my profile?", "Your name, picture, a short bio and what you posted. Your email and phone stay private.");
const NOTICES = question("Can I choose what I'm told about?", "Yes. In Settings, turn each kind of notice on or off: replies, answers, messages and group news.");

const QUOTES = [
  quote("I asked about my first sourdough on a Sunday night and had three kind answers by morning.", "Hana M.", "Member since spring"),
  quote("The groups are the best part: people who care about the same things, and no noise.", "Karim S.", "Group moderator"),
  quote("Friendly, quick to help and well looked after. I always learn something here.", "Fatma Y.", "Regular member"),
];

const NUMBERS = [stat("12k", "Members"), stat("40", "Groups"), stat("95%", "Questions answered")];

const STAFF = [who("mariam", "Community lead"), who("omar", "Moderator"), who("selin", "Moderator"), who("leyla", "Events and groups")];

const STORY =
  "<p>{app} started its community so that the people who use what we make could meet, ask and help each other. It began with a handful of regulars swapping tips, and it has grown into groups for every interest and a place where no question is too small. Our team reads along every day, answers where we can and keeps the conversation kind and useful. Everyone with an account is welcome: say hello, ask your first question or start a group of your own.</p>";

const PHOTOS = [
  ["art-place-office.png", "Our team"],
  ["art-article-market.png", "Meetups"],
  ["art-article-bridge.png", "City groups"],
  ["art-article-harbour.png", "Weekends away"],
  ["art-article-tram.png", "Getting together"],
  ["art-dish-breakfast.png", "Coffee mornings"],
] as [string, string][];

const pages = () => [
  aboutPage({ story: STORY, people: { title: "Who looks after the community", list: STAFF }, numbers: NUMBERS, photos: { title: "Members together", files: PHOTOS } }),
  contactPage("<p>Questions about the community, a report that needs a person, or an idea for a group? Write to us and we'll answer within a day.</p>", hours("The team reads along", days(WEEK, "09:00", "21:00"))),
  questionsPage("<p>How our community works.</p>", [WHO, RULES, GROUPS, BLOCK, ASK, REPORT, PROFILE, NOTICES]),
];

const home = (welcome: string, slides: [string, string][], questions: ReturnType<typeof question>[]): Design["pages"][number] => ({
  slug: "home",
  title: "Home",
  show_title: false,
  blocks: [
    slider(
      [
        slide(slides[0]![0], slides[0]![1], screen("community_feed")),
        slide(slides[1]![0], slides[1]![1], screen("community_questions")),
        slide(slides[2]![0], slides[2]![1], screen("community_groups")),
      ],
      false,
    ),
    text("welcome", welcome),
    quickLinks([
      link("newspaper", "Feed", screen("community_feed")),
      link("help", "Ask a question", screen("community_questions")),
      link("groups", "Groups", screen("community_groups")),
      link("chat", "Messages", screen("community_messages")),
    ]),
    button("feed", "See what's new", screen("community_feed"), "filled", "newspaper"),
    stats(NUMBERS),
    testimonials("What members say", QUOTES),
    faq("Questions", questions),
    contact(),
  ],
});

export const COMMUNITY_DESIGNS: Design[] = [
  {
    id: "community-day",
    kind: "community",
    name: "Day",
    description: "Light and calm: a short welcome, the feed, Q&A, groups and messages a tap away.",
    look: { template: "minimal", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#FF5A1F", theme_mode: "light" },
    tabs: communityTabs,
    pages: [
      home(
        "<h2>Welcome to the {app} community</h2><p>Ask questions, share what you're working on and meet other members.</p>",
        [
          ["Ask, answer, share", "Questions and posts from members like you"],
          ["No question too small", "Members answer most within a day"],
          ["Find your people", "Groups for every interest"],
        ],
        [WHO, RULES, GROUPS, BLOCK],
      ),
      ...pages(),
    ],
  },
  {
    id: "community-everyday",
    kind: "community",
    name: "Everyday",
    description: "Follows the phone: light by day, dark at night, with the same flat cards.",
    look: { template: "minimal", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#FF5A1F", theme_mode: "system" },
    tabs: communityTabs,
    pages: [
      home(
        "<h2>Hello from {app}</h2><p>Members help each other here. Ask your first question or say hello in a group.</p>",
        [
          ["Something new every day", "Posts and questions from the community"],
          ["Ask the people who know", "Answers from members and our team"],
          ["Start a group", "Bring together people who share an interest"],
        ],
        [WHO, ASK, GROUPS, NOTICES],
      ),
      ...pages(),
    ],
  },
  {
    id: "community-night",
    kind: "community",
    name: "Night",
    description: "Dark and focused: the same screens on a deep navy, with orange only where you act.",
    look: { template: "minimal", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#FF5A1F", theme_mode: "dark" },
    tabs: communityTabs,
    pages: [
      home(
        "<h2>The {app} community</h2><p>Questions, answers, groups and messages, all in one place.</p>",
        [
          ["The conversation never sleeps", "See what members shared today"],
          ["Stuck? Ask", "Clear questions get quick answers"],
          ["Your groups", "Join one, or ask to join a private one"],
        ],
        [WHO, RULES, REPORT, BLOCK],
      ),
      ...pages(),
    ],
  },
];
