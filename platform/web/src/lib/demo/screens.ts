import type { TabBarStyle } from "../pages/types";
import type { StudioScreens } from "../studio/screens";
import { ACADEMY_PROJECT } from "../studio/academy";
import { demoDesignBar } from "../studio/demo-designs";
import { PREMIUM_ACADEMY_DEMO, type StudioDemoId } from "./constants";

/**
 * 118.3 Each Studio demo's sign-in screen and account menu, as an owner
 * would design them on Studio › Screens: a look that suits the business,
 * a photo that needs no credit on the screen (CC0 or public domain): one the
 * website's stories already use (public/stories), or one of its own
 * (public/demo-screens, CREDITS.json), and
 * a welcome in each of the demo's languages (the app's Arabic is formal).
 */
interface DemoScreens {
  /** 128 `premium`: the welcome large over the photo, the form on a card (Nakhla School, Rawaq Academy). */
  style: "photo" | "card" | "minimal" | "premium";
  /** Under public/, served by the platform. */
  photo?: string;
  title: Record<"en" | "ar" | "tr", string>;
  subtitle: Record<"en" | "ar" | "tr", string>;
  menu: "plain" | "card" | "cover" | "tiles" | "night" | "academy";
  /** `night`: the membership card's colour. */
  accent?: string;
}

/** 123 The premium academy's are its template's (lib/studio/academy.ts), as a project started from it has them. */
export const DEMO_SCREENS: Record<Exclude<StudioDemoId, typeof PREMIUM_ACADEMY_DEMO>, DemoScreens> = {
  delivery: {
    style: "card",
    photo: "/stories/delivery/delivery-shop-owner.jpg",
    title: { en: "Your parcel, across town today", ar: "طردك يصل عبر المدينة اليوم", tr: "Paketiniz bugün şehrin öbür ucunda" },
    subtitle: {
      en: "Sign in to send your parcels and follow them.",
      ar: "سجّل الدخول لترسل طرودك وتتابعها.",
      tr: "Paketlerinizi göndermek ve takip etmek için giriş yapın.",
    },
    menu: "tiles",
  },
  // 128 The approved home's photo and words: tonight's table.
  food: {
    style: "photo",
    photo: "/demo-screens/sofra-mezze.jpg",
    title: { en: "Tonight’s table is set.", ar: "سفرة الليلة جاهزة.", tr: "Bu akşamın sofrası hazır." },
    subtitle: {
      en: "Sign in to order from the restaurants near you.",
      ar: "سجّل الدخول لتطلب من المطاعم القريبة منك.",
      tr: "Yakınınızdaki restoranlardan sipariş vermek için giriş yapın.",
    },
    menu: "cover",
  },
  // 128 The approved home's market photo, its green and amber.
  marketplace: {
    style: "photo",
    photo: "/demo-photos/cover-market.jpg",
    title: { en: "Your neighbourhood, in one app", ar: "حيّك كله في تطبيق واحد", tr: "Mahalleniz tek bir uygulamada" },
    subtitle: {
      en: "Fresh food and groceries from the places near you, at your door.",
      ar: "طعام طازج وبقالة من الأماكن القريبة منك حتى باب بيتك.",
      tr: "Yakınınızdaki yerlerden taze yemek ve market, kapınıza kadar.",
    },
    menu: "night",
    accent: "#F2A93B",
  },
  rides: {
    style: "card",
    photo: "/stories/rides/rides-driver.jpg",
    title: { en: "Where to today?", ar: "إلى أين اليوم؟", tr: "Bugün nereye?" },
    subtitle: {
      en: "Sign in to see the fare before you ride.",
      ar: "سجّل الدخول لترى الأجرة قبل أن تركب.",
      tr: "Binmeden önce ücreti görmek için giriş yapın.",
    },
    menu: "cover",
  },
  taxi: {
    style: "photo",
    photo: "/stories/rides/rides-night-city.jpg",
    title: { en: "A taxi, moments away", ar: "سيارة أجرة على بُعد لحظات", tr: "Taksiniz birkaç dakika uzakta" },
    subtitle: {
      en: "See the free taxis around you, live on the map.",
      ar: "شاهد سيارات الأجرة المتاحة حولك مباشرةً على الخريطة.",
      tr: "Etrafınızdaki boş taksileri haritada canlı görün.",
    },
    menu: "night",
    accent: "#F5B700",
  },
  school: {
    // 128 In the approved home's language: the welcome large over the school's photo.
    style: "premium",
    // The school's building: no photo of real children.
    photo: "/demo-screens/nakhla-school.jpg",
    title: { en: "Every school day, in one place", ar: "كل يوم دراسي في مكان واحد", tr: "Her okul günü tek bir yerde" },
    subtitle: {
      en: "Lessons, homework, grades and fees for students, parents and teachers.",
      ar: "الحصص والواجبات والدرجات والرسوم للطلاب وأولياء الأمور والمعلمين.",
      tr: "Öğrenciler, veliler ve öğretmenler için dersler, ödevler, notlar ve ücretler.",
    },
    menu: "cover",
  },
  instructors: {
    // 128 In the approved home's language: the welcome large over the library, the student's card in the account.
    style: "premium",
    photo: "/demo-screens/rawaq-library.jpg",
    title: { en: "Learn from the best teachers", ar: "تعلّم من أفضل المدرّسين", tr: "En iyi öğretmenlerden öğrenin" },
    subtitle: {
      en: "Follow your teachers and pick up where you left off.",
      ar: "تابع مدرّسيك وأكمل من حيث توقفت.",
      tr: "Öğretmenlerinizi takip edin, kaldığınız yerden devam edin.",
    },
    menu: "academy",
  },
};

/** 118.3 A Studio demo's `hostedSettings.studioScreens`; its photo on the platform's own address. */
export function demoStudioScreens(id: StudioDemoId, platformUrl: string): StudioScreens {
  if (id === PREMIUM_ACADEMY_DEMO) return ACADEMY_PROJECT.screens(platformUrl);
  const d = DEMO_SCREENS[id];
  return {
    sign_in: {
      style: d.style,
      image_url: d.photo ? `${platformUrl.replace(/\/+$/, "")}${d.photo}` : null,
      title: { ...d.title },
      subtitle: { ...d.subtitle },
      show_logo: true,
    },
    account_menu: { header: d.menu, ...(d.accent ? { accent: d.accent } : {}), items: [] },
    // 128 Rawaq Academy's courses, lessons and cart in the premium screens' looks, in its own green and gold.
    ...(id === "instructors"
      ? {
          course_card: { style: "premium" as const, radius: 18, hide: [] },
          course_page: { cover: "full" as const, bar: "glass" as const, hide: [], look: "premium" as const },
          looks: { catalog: "explore" as const, my_courses: "premium" as const, lesson: "premium" as const, code: "premium" as const, cart: "premium" as const },
        }
      : {}),
  };
}

/**
 * 119 Each Studio demo's bottom bar in its own design (light and dark mode
 * alike): a line, a bubble, frosted glass, the open tab lifted, the taxi's
 * dark island lit in taxi yellow at night, the classic one with the person's
 * photo, a segmented track.
 */
export const DEMO_TAB_BARS: Record<StudioDemoId, TabBarStyle> = {
  // 128 The approved bars (lib/studio/demo-designs): Sahm Express's and Masar Rides's across the bottom with the open tab's icon in a soft pill, Sofra Eats's floating pill, Zad's five named tabs.
  delivery: demoDesignBar("delivery"),
  food: demoDesignBar("food"),
  marketplace: demoDesignBar("marketplace"),
  rides: demoDesignBar("rides"),
  taxi: { design: "island", dark_active: "#F5B700" },
  // 128 Nakhla School's and Rawaq Academy's: the open tab's icon in a soft pill over its name, on the board's surface.
  school: demoDesignBar("school"),
  instructors: demoDesignBar("instructors"),
  // 123 The premium academy's bar as its template has it (128.8 a floating navy pill, the open tab on gold).
  premium_academy: ACADEMY_PROJECT.tab_bar,
};
