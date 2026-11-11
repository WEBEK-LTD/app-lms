import type { TabBarStyle } from "../pages/types";
import type { StudioScreens } from "../studio/screens";
import type { StudioDemoId } from "./constants";

/**
 * 118.3 Each Studio demo's sign-in screen and account menu, as an owner
 * would design them on Studio › Screens: a look that suits the business,
 * a photo that needs no credit on the screen (CC0 or public domain): one the
 * website's stories already use (public/stories), or one of its own
 * (public/demo-screens, CREDITS.json), and
 * a welcome in each of the demo's languages (the app's Arabic is formal).
 */
interface DemoScreens {
  style: "photo" | "card" | "minimal";
  /** Under public/, served by the platform. */
  photo?: string;
  title: Record<"en" | "ar" | "tr", string>;
  subtitle: Record<"en" | "ar" | "tr", string>;
  menu: "plain" | "card" | "cover" | "tiles" | "night";
  /** `night`: the membership card's colour. */
  accent?: string;
}

export const DEMO_SCREENS: Record<StudioDemoId, DemoScreens> = {
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
  food: {
    style: "photo",
    photo: "/demo-screens/sofra-mezze.jpg",
    title: { en: "Hungry? We're on our way", ar: "جائع؟ نحن في الطريق", tr: "Acıktınız mı? Yoldayız" },
    subtitle: {
      en: "Sign in to order from your favourite restaurants.",
      ar: "سجّل الدخول لتطلب من مطاعمك المفضلة.",
      tr: "En sevdiğiniz restoranlardan sipariş vermek için giriş yapın.",
    },
    menu: "cover",
  },
  marketplace: {
    style: "card",
    photo: "/stories/multi-vendor/zad-market-aisle.jpg",
    title: { en: "Your neighbourhood, in one app", ar: "حيّك كله في تطبيق واحد", tr: "Mahalleniz tek bir uygulamada" },
    subtitle: {
      en: "Restaurants and the supermarket, delivered to your door.",
      ar: "المطاعم والسوبرماركت حتى باب بيتك.",
      tr: "Restoranlar ve market, kapınıza kadar.",
    },
    menu: "night",
    accent: "#D9B36C",
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
    style: "card",
    // The school's building: no photo of real children.
    photo: "/demo-screens/nakhla-school.jpg",
    title: { en: "Every school day, in one place", ar: "كل يوم دراسي في مكان واحد", tr: "Her okul günü tek bir yerde" },
    subtitle: {
      en: "Lessons, homework, grades and fees for students, parents and teachers.",
      ar: "الحصص والواجبات والدرجات والرسوم للطلاب وأولياء الأمور والمعلمين.",
      tr: "Öğrenciler, veliler ve öğretmenler için dersler, ödevler, notlar ve ücretler.",
    },
    menu: "card",
  },
  instructors: {
    style: "card",
    photo: "/demo-screens/rawaq-library.jpg",
    title: { en: "Learn from the best teachers", ar: "تعلّم من أفضل المدرّسين", tr: "En iyi öğretmenlerden öğrenin" },
    subtitle: {
      en: "Follow your teachers and pick up where you left off.",
      ar: "تابع مدرّسيك وأكمل من حيث توقفت.",
      tr: "Öğretmenlerinizi takip edin, kaldığınız yerden devam edin.",
    },
    menu: "tiles",
  },
};

/** 118.3 A Studio demo's `hostedSettings.studioScreens`; its photo on the platform's own address. */
export function demoStudioScreens(id: StudioDemoId, platformUrl: string): StudioScreens {
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
  };
}

/**
 * 119 Each Studio demo's bottom bar in its own design (light and dark mode
 * alike): a line, a bubble, frosted glass, the open tab lifted, the taxi's
 * dark island lit in taxi yellow at night, the classic one with the person's
 * photo, a segmented track.
 */
export const DEMO_TAB_BARS: Record<StudioDemoId, TabBarStyle> = {
  delivery: { design: "line" },
  food: { design: "bubble" },
  marketplace: { design: "glass" },
  rides: { design: "lift" },
  taxi: { design: "island", dark_active: "#F5B700" },
  school: { design: "classic", avatar: true },
  instructors: { design: "segment" },
};
