import type { AppFont } from "../build-config/types";
import type { ItemSource, LayoutBlock } from "../pages/types";
import type { StudioDemoId } from "./constants";
import type { PictureName } from "./pictures";

/**
 * Templates = demos, for Yallapp Studio. The first page of each Studio
 * demo: its welcome banner, the sentence about the business and its lists.
 * The demo's brand (lib/demo/content.ts), its design (lib/demo/look.ts) and
 * the Studio template an owner starts from (lib/studio/demo-templates.ts)
 * all read it here, so the template is the demo. Kept apart from the
 * demos' content so the editor and the new project page can use it.
 */

export interface StudioDemoHome {
  /** The demo's name, main colour and font, its brand's (lib/demo/content.ts) and its whole Studio design's (lib/studio/designs.ts). */
  appName: string;
  primaryColor: string;
  font: AppFont;
  /** The banner's picture, drawn in lib/demo/design-art.ts. */
  picture: PictureName;
  /** Its file in public/design-pictures. */
  file: string;
  heading: string;
  subheading: string;
  /** The sentence under "Welcome to <app>". */
  welcome: string;
  /** What the home shows after the welcome, as the demo's blocks. */
  lists: LayoutBlock[];
}

const QUERY = { category_id: null, featured: false, sort: "newest" as const, limit: 10, ids: [] };

function list(id: string, title: string, source: ItemSource, screen: string, layout: "list" | "carousel" = "list"): LayoutBlock {
  return { id, type: "items", visibility: "everyone", title, source, layout, see_all: { type: "screen", screen } as LayoutBlock["see_all"], query: { ...QUERY } };
}

export const STUDIO_DEMO_HOMES: Record<StudioDemoId, StudioDemoHome> = {
  delivery: {
    appName: "Sahm Express",
    primaryColor: "#1F6FB2",
    font: "Manrope",
    picture: "banner-delivery",
    file: "art-banner-delivery.png",
    heading: "Across Cairo, the same day",
    subheading: "Picked up from your door, delivered to theirs. Follow it all the way.",
    welcome: "Same-day, express and documents, anywhere in Cairo and Giza.",
    lists: [list("services", "Our services", "delivery_services", "send_parcel")],
  },
  food: {
    appName: "Sofra Eats",
    primaryColor: "#D2552B",
    font: "Outfit",
    picture: "banner-food",
    file: "art-banner-food.png",
    heading: "Hungry? It's on its way",
    subheading: "Koshary, grills and pizza from restaurants near you.",
    welcome: "Three kitchens, one app. Order in a few taps.",
    lists: [list("restaurants", "Restaurants", "restaurants", "restaurants")],
  },
  marketplace: {
    appName: "Zad",
    primaryColor: "#1E6B52",
    font: "Outfit",
    picture: "banner-food",
    file: "art-banner-food.png",
    heading: "Dinner and groceries, one app",
    subheading: "Grills, pizza and a supermarket near you, delivered or ready for pick-up.",
    welcome: "Two kitchens and a supermarket, one basket at a time.",
    lists: [list("restaurants", "Restaurants", "restaurants", "restaurants")],
  },
  rides: {
    appName: "Masar Rides",
    primaryColor: "#14857A",
    font: "Plus Jakarta Sans",
    picture: "banner-rides",
    file: "art-banner-rides.png",
    heading: "Where to?",
    subheading: "See the fare first, follow your driver and share your ride.",
    welcome: "Economy, Comfort and Van, day and night.",
    lists: [list("vehicle_types", "Ride with us", "vehicle_types", "ride")],
  },
  taxi: {
    appName: "Lamha Taxi",
    primaryColor: "#1C2541",
    font: "Manrope",
    picture: "banner-taxi",
    file: "art-demo-banner-taxi.png",
    heading: "Your taxi, live on the map",
    subheading: "See the free taxis around you and follow yours to the door.",
    welcome: "Taxi, Comfort and XL across Cairo, day and night.",
    lists: [list("vehicle_types", "Ride with us", "vehicle_types", "ride")],
  },
  school: {
    appName: "Nakhla School",
    primaryColor: "#1F4E79",
    font: "Plus Jakarta Sans",
    picture: "banner-school",
    file: "art-demo-banner-school.png",
    heading: "The school day in one app",
    subheading: "Timetable, homework, grades and news for students, parents and teachers.",
    welcome: "A primary school in Heliopolis, from Grade 1 to Grade 6.",
    lists: [list("school_news", "School news", "school_news", "school")],
  },
  instructors: {
    appName: "Rawaq Academy",
    primaryColor: "#2E5E4E",
    font: "Outfit",
    picture: "banner-teachers",
    file: "art-demo-banner-teachers.png",
    heading: "Learn from people who do it every day",
    subheading: "Seven teachers and their courses in design, business, languages and code.",
    welcome: "Seven teachers, each with their own courses. Start with a free one.",
    lists: [
      { id: "search", type: "search", visibility: "everyone", title: null, source: "courses", placeholder: "Search courses" },
      { id: "continue", type: "continue_learning", visibility: "signed_in", title: "Continue learning" },
      list("new-courses", "New courses", "courses", "courses", "carousel"),
      { id: "categories", type: "categories", visibility: "everyone", title: "Categories", source: "courses", style: "chips" },
    ],
  },
};

/** The demo's banner as its brand keeps it (lib/demo/content.ts). */
export function studioDemoBanner(id: StudioDemoId): { picture: PictureName; heading: string; subheading: string } {
  const home = STUDIO_DEMO_HOMES[id];
  return { picture: home.picture, heading: home.heading, subheading: home.subheading };
}
