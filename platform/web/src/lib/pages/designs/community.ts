import { button, faq, homeTab, link, question, quickLinks, screen, screenTab, slide, slider, text, type Design } from "./build";
import { questionsPage } from "./pages";

// 235 A client's own community: the app's screens (feed, Q&A, groups,
// messages, the member's profile) do the work; the home page welcomes
// members, points them to those screens and sets out the house rules. One
// light design, one dark and one that follows the phone, all flat: 1px
// lines, no shadows.

const communityTabs = [
  { ...homeTab, label: "Community", icon: "newspaper" },
  screenTab("questions", "Q&A", "help", "community_questions"),
  screenTab("groups", "Groups", "groups", "community_groups"),
  screenTab("messages", "Messages", "chat", "community_messages"),
  screenTab("profile", "Profile", "person", "community_profile"),
];

const RULES = question("What are the house rules?", "Be kind, stay on topic and never share anyone's private details. Report anything that breaks the rules and our team will look at it.");
const WHO = question("Who can join?", "Everyone with an account in {app}. Sign in with your account and you're a member.");
const BLOCK = question("Can I stop someone from messaging me?", "Yes. Open their profile and choose Block: they can't message you or see your posts.");
const GROUPS = question("How do private groups work?", "Ask to join and a group's moderators let you in. Only members see a private group's posts.");

const home = (welcome: string): Design["pages"][number] => ({
  slug: "home",
  title: "Home",
  show_title: false,
  blocks: [
    slider(
      [
        slide("Ask, answer, share", "Questions and posts from members like you", screen("community_feed")),
        slide("Find your people", "Groups for every interest", screen("community_groups")),
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
    faq("Questions", [WHO, RULES, GROUPS, BLOCK]),
  ],
});

const pages = () => [questionsPage("<p>How our community works.</p>", [WHO, RULES, GROUPS, BLOCK])];

export const COMMUNITY_DESIGNS: Design[] = [
  {
    id: "community-day",
    kind: "community",
    name: "Day",
    description: "Light and calm: a short welcome, the feed, Q&A, groups and messages a tap away.",
    look: { template: "minimal", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#FF5A1F", theme_mode: "light" },
    tabs: communityTabs,
    pages: [home("<h2>Welcome to the {app} community</h2><p>Ask questions, share what you're working on and meet other members.</p>"), ...pages()],
  },
  {
    id: "community-everyday",
    kind: "community",
    name: "Everyday",
    description: "Follows the phone: light by day, dark at night, with the same flat cards.",
    look: { template: "minimal", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#FF5A1F", theme_mode: "system" },
    tabs: communityTabs,
    pages: [home("<h2>Hello from {app}</h2><p>Members help each other here. Ask your first question or say hello in a group.</p>"), ...pages()],
  },
  {
    id: "community-night",
    kind: "community",
    name: "Night",
    description: "Dark and focused: the same screens on a deep navy, with orange only where you act.",
    look: { template: "minimal", corners: "soft", cards: "outlined", font: "Plus Jakarta Sans", secondary_color: "#FF5A1F", theme_mode: "dark" },
    tabs: communityTabs,
    pages: [home("<h2>The {app} community</h2><p>Questions, answers, groups and messages, all in one place.</p>"), ...pages()],
  },
];
