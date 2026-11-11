import type { AppType, AppVertical } from "../data/types";

/**
 * 120.4 The app's screens opened from the tabs that a Studio page can be
 * drawn around too (`StudioPage.screen`), besides the ones a tab or a button
 * opens (`SCREENS`): a shipment, a restaurant's menu, the cart and the
 * checkout, an order, a ride on its way, a course and its lessons, the
 * school's parts, the account's pages. Each is at its address in the app
 * (mobile/lib/core/routing/inner_screens.dart has the same list;
 * tests/unit/inner-screens.test.ts compares the two). A screen with a title
 * of its own gets a page with that title in its header in the demos; one
 * whose top is its own (a cover, a map, the screen's name of what it
 * shows) gets a page with nothing over it, for the owner to add to.
 */

export interface InnerScreen {
  id: string;
  /** Where it is in the app (go_router's pattern). */
  path: string;
  /** The app types and kinds that have it; missing, every app. */
  types?: readonly AppType[];
  verticals?: readonly AppVertical[];
  /** Its fixed title, in English, Arabic and Turkish; null when its top is its own. */
  title: { en: string; ar: string; tr: string } | null;
}

const t = (en: string, ar: string, tr: string) => ({ en, ar, tr });
const LMS = ["lms"] as const;
const SCHOOL = ["school"] as const;

export const INNER_SCREENS: readonly InnerScreen[] = [
  // Every app's account.
  { id: "edit_profile", path: "/account/edit", title: t("Edit profile", "تعديل الملف الشخصي", "Profili düzenle") },
  { id: "devices", path: "/account/settings/devices", title: t("Devices", "الأجهزة", "Cihazlar") },
  { id: "change_password", path: "/account/settings/password", title: null },
  { id: "chat_conversation", path: "/chat/:id", title: null },
  // 104 Delivery.
  { id: "shipment", path: "/shipment/:id", types: ["delivery"], title: null },
  // 105.1 Food delivery, and 115 the marketplace (a food app with its market).
  { id: "restaurant_menu", path: "/restaurant/:id", types: ["food"], title: null },
  { id: "food_order", path: "/food-order/:id", types: ["food"], title: null },
  { id: "food_cart", path: "/food-cart", types: ["food"], title: t("Your cart", "سلتك", "Sepetiniz") },
  { id: "market_vendor", path: "/market/:id", verticals: ["marketplace"], title: null },
  { id: "market_list", path: "/market-list", verticals: ["marketplace"], title: null },
  { id: "market_checkout", path: "/market-checkout", verticals: ["marketplace"], title: t("Checkout", "إتمام الطلب", "Ödeme") },
  { id: "market_orders", path: "/market-orders", verticals: ["marketplace"], title: t("My orders", "طلباتي", "Siparişlerim") },
  { id: "market_order", path: "/market-order/:id", verticals: ["marketplace"], title: null },
  { id: "market_wallet", path: "/market-wallet", verticals: ["marketplace"], title: t("Wallet", "المحفظة", "Cüzdan") },
  { id: "market_complain", path: "/market-complain/:id", verticals: ["marketplace"], title: t("Report a problem", "الإبلاغ عن مشكلة", "Sorun bildir") },
  { id: "market_complaint", path: "/market-complaint/:id", verticals: ["marketplace"], title: null },
  // 105.2 Rides, and 105.9 taxis.
  { id: "ride_follow", path: "/ride/:id", types: ["rides"], title: null },
  // Academies, and 105.3 those with many teachers.
  { id: "course", path: "/course/:id", types: LMS, title: null },
  { id: "bundle", path: "/bundle/:id", types: LMS, title: null },
  { id: "lesson", path: "/lesson/:id", types: LMS, title: null },
  { id: "quiz", path: "/quiz/:id", types: LMS, title: null },
  { id: "assignment", path: "/assignment/:id", types: LMS, title: null },
  { id: "live", path: "/live/:id", types: LMS, title: null },
  { id: "question", path: "/question/:id", types: LMS, title: null },
  { id: "learning_paths", path: "/learning-paths", types: LMS, title: t("Learning paths", "مسارات التعلم", "Öğrenme yolları") },
  { id: "learning_path", path: "/learning-path/:id", types: LMS, title: null },
  { id: "leaderboard", path: "/course/:id/leaderboard", types: LMS, title: t("Leaderboard", "لوحة المتصدرين", "Liderlik tablosu") },
  { id: "course_notes", path: "/course/:id/notes", types: LMS, title: t("My notes", "ملاحظاتي", "Notlarım") },
  { id: "lesson_discussion", path: "/lesson/:id/discussion", types: LMS, title: t("Discussion", "النقاش", "Tartışma") },
  { id: "teacher_profile", path: "/teachers/:id", types: LMS, verticals: ["instructors"], title: null },
  { id: "teach_apply", path: "/teach-apply", types: LMS, verticals: ["instructors"], title: t("Teach with us", "درّس معنا", "Bizimle öğretin") },
  { id: "certificates", path: "/account/certificates", types: LMS, title: t("Certificates", "الشهادات", "Sertifikalar") },
  { id: "quiz_results", path: "/account/quiz-results", types: LMS, title: t("Quiz results", "نتائج الاختبارات", "Sınav sonuçları") },
  { id: "live_classes", path: "/account/live-classes", types: LMS, title: t("Live classes", "الحصص المباشرة", "Canlı dersler") },
  { id: "achievements", path: "/account/achievements", types: LMS, title: t("Achievements", "الإنجازات", "Başarılar") },
  { id: "downloads", path: "/account/downloads", types: LMS, title: t("Downloads", "التنزيلات", "İndirilenler") },
  // 105.4 Schools: a student's school and a parent's.
  { id: "parent", path: "/parent", types: SCHOOL, title: null },
  { id: "parent_slips", path: "/parent/slips", types: SCHOOL, title: t("Permission slips", "أذونات الخروج", "İzin formları") },
  { id: "parent_excuses", path: "/parent/excuses", types: SCHOOL, title: t("Absence notes", "أعذار الغياب", "Devamsızlık mazeretleri") },
  { id: "parent_excuse_new", path: "/parent/excuses/new", types: SCHOOL, title: t("New absence note", "عذر غياب جديد", "Yeni mazeret") },
  { id: "parent_pickup", path: "/parent/pickup", types: SCHOOL, title: t("Pickup", "الاستلام من المدرسة", "Okuldan alma") },
  { id: "school_checkin", path: "/school/checkin", types: SCHOOL, title: t("Check-in", "تسجيل الحضور", "Giriş kaydı") },
  { id: "school_timetable", path: "/school/timetable", types: SCHOOL, title: t("Timetable", "الجدول", "Ders programı") },
  { id: "school_homework", path: "/school/homework", types: SCHOOL, title: t("Homework", "الواجبات", "Ödevler") },
  { id: "school_grades", path: "/school/grades", types: SCHOOL, title: t("Grades", "الدرجات", "Notlar") },
  { id: "school_attendance", path: "/school/attendance", types: SCHOOL, title: t("Attendance", "الحضور", "Devam") },
  { id: "school_fees", path: "/school/fees", types: SCHOOL, title: t("Fees", "المصروفات", "Ücretler") },
  { id: "school_news", path: "/school/news", types: SCHOOL, title: t("News", "الأخبار", "Haberler") },
  { id: "school_report_card", path: "/school/report-card", types: SCHOOL, title: t("Report card", "الشهادة", "Karne") },
  { id: "school_messages", path: "/school/messages", types: SCHOOL, title: t("Messages", "الرسائل", "Mesajlar") },
  { id: "school_bus", path: "/school/bus", types: SCHOOL, title: t("School bus", "باص المدرسة", "Okul servisi") },
  { id: "school_library", path: "/school/library", types: SCHOOL, title: t("Library", "المكتبة", "Kütüphane") },
  { id: "school_library_loans", path: "/school/library-loans", types: SCHOOL, title: t("My loans", "كتبي المستعارة", "Ödünç aldıklarım") },
  { id: "school_library_book", path: "/school/library/book/:id", types: SCHOOL, title: null },
  { id: "school_calendar", path: "/school/calendar", types: SCHOOL, title: t("Calendar", "التقويم", "Takvim") },
  { id: "school_exams", path: "/school/exams", types: SCHOOL, title: t("Exams", "الامتحانات", "Sınavlar") },
  { id: "school_behaviour", path: "/school/behaviour", types: SCHOOL, title: t("Behaviour", "السلوك", "Davranış") },
  { id: "school_reports", path: "/school/reports", types: SCHOOL, title: t("Reports", "التقارير", "Raporlar") },
  { id: "uni_registration", path: "/school/uni-registration", types: SCHOOL, title: t("Registration", "تسجيل المقررات", "Ders kaydı") },
  { id: "uni_timetable", path: "/school/uni-timetable", types: SCHOOL, title: t("Timetable", "الجدول", "Ders programı") },
  { id: "uni_results", path: "/school/uni-results", types: SCHOOL, title: t("Results", "النتائج", "Sonuçlar") },
  { id: "uni_transcript", path: "/school/uni-transcript", types: SCHOOL, title: t("Transcript", "كشف الدرجات", "Transkript") },
  { id: "uni_plan", path: "/school/uni-plan", types: SCHOOL, title: t("Study plan", "الخطة الدراسية", "Ders planı") },
];

export const INNER_SCREEN_IDS = INNER_SCREENS.map((s) => s.id);

/** The names, in the editor, of the screens whose top is their own. */
const NAMES: Record<string, string> = {
  change_password: "Change password",
  chat_conversation: "A conversation",
  shipment: "A shipment",
  restaurant_menu: "A restaurant's menu",
  food_order: "An order",
  market_vendor: "A place's page",
  market_list: "A list of places",
  market_order: "An order",
  market_complaint: "A complaint",
  ride_follow: "A ride on its way",
  course: "A course",
  bundle: "A bundle",
  lesson: "A lesson",
  quiz: "A quiz",
  assignment: "An assignment",
  live: "A live session",
  question: "A question",
  learning_path: "A learning path",
  teacher_profile: "A teacher's page",
  parent: "Parent",
  school_library_book: "A library book",
};

/** A screen's name in the editor and in messages. */
export function innerScreenName(id: string): string | undefined {
  const s = innerScreen(id);
  return s ? (s.title?.en ?? NAMES[id] ?? id) : undefined;
}

/** The inner screens this app has. */
export function innerScreensFor(app: { appType: string; vertical?: string | null }): InnerScreen[] {
  return INNER_SCREENS.filter((s) => {
    if (!s.types && !s.verticals) return true;
    const byType = s.types ? (s.types as readonly string[]).includes(app.appType) : false;
    const byVertical = s.verticals && app.vertical ? (s.verticals as readonly string[]).includes(app.vertical) : false;
    // A screen of a kind (a marketplace's) only there; one of a type in every app of it.
    if (s.verticals && !s.types) return byVertical;
    if (s.verticals && s.types) return byType && byVertical;
    return byType;
  });
}

export function innerScreen(id: string): InnerScreen | undefined {
  return INNER_SCREENS.find((s) => s.id === id);
}

/**
 * 120.4 The titles of the screens a tab or a button opens that aren't a
 * demo's tabs, for their pages in the demos; staff screens (a courier's, a
 * driver's, a teacher's desk) have none, and so no page.
 */
export const OWN_SCREEN_TITLES: Partial<Record<string, { en: string; ar: string; tr: string }>> = {
  settings: t("Settings", "الإعدادات", "Ayarlar"),
  notifications: t("Notifications", "الإشعارات", "Bildirimler"),
  orders: t("My orders", "طلباتي", "Siparişlerim"),
  search: t("Search", "البحث", "Ara"),
  favorites: t("Wishlist", "المفضلة", "Favoriler"),
  messages: t("Messages", "الرسائل", "Mesajlar"),
  cart: t("Your cart", "سلتك", "Sepetiniz"),
  teachers: t("Teachers", "المعلمون", "Öğretmenler"),
  courses: t("Courses", "الدورات", "Kurslar"),
  my_courses: t("My courses", "دوراتي", "Kurslarım"),
  restaurants: t("Restaurants", "المطاعم", "Restoranlar"),
  food_orders: t("My orders", "طلباتي", "Siparişlerim"),
  club: t("Club", "النادي", "Kulüp"),
  send_parcel: t("Send a parcel", "إرسال طرد", "Kargo gönder"),
  shipments: t("My shipments", "شحناتي", "Gönderilerim"),
  ride: t("Ride", "رحلة", "Yolculuk"),
  my_rides: t("My rides", "رحلاتي", "Yolculuklarım"),
  school: t("School", "المدرسة", "Okul"),
};
