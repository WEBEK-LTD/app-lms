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
    picture: "banner-delivery",
    file: "art-banner-delivery.png",
    heading: "Across Cairo, the same day",
    subheading: "Picked up from your door, delivered to theirs. Follow it all the way.",
    welcome: "Same-day, express and documents, anywhere in Cairo and Giza.",
    lists: [list("services", "Our services", "delivery_services", "send_parcel")],
  },
  food: {
    picture: "banner-food",
    file: "art-banner-food.png",
    heading: "Hungry? It's on its way",
    subheading: "Koshary, grills and pizza from restaurants near you.",
    welcome: "Three kitchens, one app. Order in a few taps.",
    lists: [list("restaurants", "Restaurants", "restaurants", "restaurants")],
  },
  marketplace: {
    picture: "banner-food",
    file: "art-banner-food.png",
    heading: "Dinner and groceries, one app",
    subheading: "Grills, pizza and a supermarket near you, delivered or ready for pick-up.",
    welcome: "Two kitchens and a supermarket, one basket at a time.",
    lists: [list("restaurants", "Restaurants", "restaurants", "restaurants")],
  },
  rides: {
    picture: "banner-rides",
    file: "art-banner-rides.png",
    heading: "Where to?",
    subheading: "See the fare first, follow your driver and share your ride.",
    welcome: "Economy, Comfort and Van, day and night.",
    lists: [list("vehicle_types", "Ride with us", "vehicle_types", "ride")],
  },
  taxi: {
    picture: "banner-taxi",
    file: "art-demo-banner-taxi.png",
    heading: "Your taxi, live on the map",
    subheading: "See the free taxis around you and follow yours to the door.",
    welcome: "Taxi, Comfort and XL across Cairo, day and night.",
    lists: [list("vehicle_types", "Ride with us", "vehicle_types", "ride")],
  },
  school: {
    picture: "banner-school",
    file: "art-demo-banner-school.png",
    heading: "The school day in one app",
    subheading: "Timetable, homework, grades and news for students, parents and teachers.",
    welcome: "A primary school in Heliopolis, from Grade 1 to Grade 6.",
    lists: [list("school_news", "School news", "school_news", "school")],
  },
  instructors: {
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

/**
 * Templates = demos: the demos' first pages in Arabic (Egyptian, as Studio's
 * own words are) and Turkish, by their English text: the banner, the
 * sentence under the welcome and the lists' titles. The template writes
 * them in the dashboard's language and keeps the others as translations, so
 * the page is the demo's in each of the app's languages.
 */
export const STUDIO_DEMO_WORDS: Record<StudioDemoId, Record<"ar" | "tr", Record<string, string>>> = {
  delivery: {
    ar: {
      "Across Cairo, the same day": "في كل القاهرة، في نفس اليوم",
      "Picked up from your door, delivered to theirs. Follow it all the way.": "بناخدها من باب بيتك ونوصّلها لباب بيتهم. وتابعها طول الطريق.",
      "Same-day, express and documents, anywhere in Cairo and Giza.": "توصيل في نفس اليوم ومستعجل ومستندات، لأي حتة في القاهرة والجيزة.",
      "Our services": "خدماتنا",
    },
    tr: {
      "Across Cairo, the same day": "Kahire'nin her yerine, aynı gün",
      "Picked up from your door, delivered to theirs. Follow it all the way.": "Kapınızdan alınır, onların kapısına teslim edilir. Yol boyunca takip edin.",
      "Same-day, express and documents, anywhere in Cairo and Giza.": "Aynı gün, ekspres ve evrak teslimatı; Kahire ve Giza'nın her yerine.",
      "Our services": "Hizmetlerimiz",
    },
  },
  food: {
    ar: {
      "Hungry? It's on its way": "جعان؟ أكلك في السكة",
      "Koshary, grills and pizza from restaurants near you.": "كشري ومشويات وبيتزا من مطاعم قريبة منك.",
      "Three kitchens, one app. Order in a few taps.": "تلات مطابخ في أبلكيشن واحد. اطلب بكام دوسة.",
      Restaurants: "المطاعم",
    },
    tr: {
      "Hungry? It's on its way": "Acıktınız mı? Yemeğiniz yolda",
      "Koshary, grills and pizza from restaurants near you.": "Yakınınızdaki restoranlardan koşari, ızgara ve pizza.",
      "Three kitchens, one app. Order in a few taps.": "Üç mutfak, tek uygulama. Birkaç dokunuşla sipariş verin.",
      Restaurants: "Restoranlar",
    },
  },
  marketplace: {
    ar: {
      "Dinner and groceries, one app": "العشا والبقالة في أبلكيشن واحد",
      "Grills, pizza and a supermarket near you, delivered or ready for pick-up.": "مشويات وبيتزا وسوبر ماركت قريب منك، توصيل لحد عندك أو تستلم بنفسك.",
      "Two kitchens and a supermarket, one basket at a time.": "مطبخين وسوبر ماركت، وكل طلب في سلة واحدة.",
      Restaurants: "المطاعم",
    },
    tr: {
      "Dinner and groceries, one app": "Akşam yemeği ve market alışverişi tek uygulamada",
      "Grills, pizza and a supermarket near you, delivered or ready for pick-up.": "Yakınınızda ızgara, pizza ve bir süpermarket; kapınıza gelsin ya da gelip alın.",
      "Two kitchens and a supermarket, one basket at a time.": "İki mutfak ve bir süpermarket, her seferinde tek sepet.",
      Restaurants: "Restoranlar",
    },
  },
  rides: {
    ar: {
      "Where to?": "رايح فين؟",
      "See the fare first, follow your driver and share your ride.": "اعرف الأجرة الأول، وتابع السوّاق، وشارك رحلتك.",
      "Economy, Comfort and Van, day and night.": "اقتصادي ومريح وفان، بالليل وبالنهار.",
      "Ride with us": "اركب معانا",
    },
    tr: {
      "Where to?": "Nereye?",
      "See the fare first, follow your driver and share your ride.": "Ücreti önceden görün, sürücünüzü takip edin ve yolculuğunuzu paylaşın.",
      "Economy, Comfort and Van, day and night.": "Ekonomi, Konfor ve Van; gece gündüz.",
      "Ride with us": "Bizimle yolculuk edin",
    },
  },
  taxi: {
    ar: {
      "Your taxi, live on the map": "التاكسي بتاعك على الخريطة لحظة بلحظة",
      "See the free taxis around you and follow yours to the door.": "شوف التاكسيات الفاضية حواليك وتابع التاكسي بتاعك لحد الباب.",
      "Taxi, Comfort and XL across Cairo, day and night.": "تاكسي ومريح وXL في كل القاهرة، بالليل وبالنهار.",
      "Ride with us": "اركب معانا",
    },
    tr: {
      "Your taxi, live on the map": "Taksiniz haritada, canlı",
      "See the free taxis around you and follow yours to the door.": "Çevrenizdeki boş taksileri görün, sizinkini kapıya kadar takip edin.",
      "Taxi, Comfort and XL across Cairo, day and night.": "Kahire'nin her yerinde Taksi, Konfor ve XL; gece gündüz.",
      "Ride with us": "Bizimle yolculuk edin",
    },
  },
  school: {
    ar: {
      "The school day in one app": "اليوم الدراسي كله في أبلكيشن واحد",
      "Timetable, homework, grades and news for students, parents and teachers.": "الجدول والواجبات والدرجات والأخبار، للطلبة وأولياء الأمور والمدرسين.",
      "A primary school in Heliopolis, from Grade 1 to Grade 6.": "مدرسة ابتدائي في مصر الجديدة، من أولى لسادسة ابتدائي.",
      "School news": "أخبار المدرسة",
    },
    tr: {
      "The school day in one app": "Okul günü tek uygulamada",
      "Timetable, homework, grades and news for students, parents and teachers.": "Öğrenciler, veliler ve öğretmenler için ders programı, ödevler, notlar ve haberler.",
      "A primary school in Heliopolis, from Grade 1 to Grade 6.": "Heliopolis'te 1. sınıftan 6. sınıfa bir ilkokul.",
      "School news": "Okul haberleri",
    },
  },
  instructors: {
    ar: {
      "Learn from people who do it every day": "اتعلّم من ناس بتعمل كده كل يوم",
      "Seven teachers and their courses in design, business, languages and code.": "سبع مدرسين وكورساتهم في التصميم والبيزنس واللغات والبرمجة.",
      "Seven teachers, each with their own courses. Start with a free one.": "سبع مدرسين، كل واحد ليه كورساته. ابدأ بكورس ببلاش.",
      "Search courses": "دوّر على كورس",
      "Continue learning": "كمّل اتعلّم",
      "New courses": "كورسات جديدة",
      Categories: "الأقسام",
    },
    tr: {
      "Learn from people who do it every day": "Bu işi her gün yapanlardan öğrenin",
      "Seven teachers and their courses in design, business, languages and code.": "Yedi öğretmen ve tasarım, iş, dil ve kodlama kursları.",
      "Seven teachers, each with their own courses. Start with a free one.": "Yedi öğretmen, her birinin kendi kursları var. Ücretsiz bir kursla başlayın.",
      "Search courses": "Kurs ara",
      "Continue learning": "Öğrenmeye devam et",
      "New courses": "Yeni kurslar",
      Categories: "Kategoriler",
    },
  },
};

/** The demo's own texts on its first page, in English: what STUDIO_DEMO_WORDS has in Arabic and Turkish. */
export function studioDemoTexts(id: StudioDemoId): string[] {
  const home = STUDIO_DEMO_HOMES[id];
  const lists = home.lists.flatMap((b) => [b.title, b.type === "search" ? b.placeholder : null]).filter((x): x is string => Boolean(x));
  return [home.heading, home.subheading, home.welcome, ...lists];
}
