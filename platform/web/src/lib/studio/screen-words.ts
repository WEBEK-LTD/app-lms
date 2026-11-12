/**
 * 124.8 The app's own words on the screens Studio's canvas draws
 * (components/studio/app-screens.tsx), as the app says them
 * (mobile/lib/l10n/app_*.arb), in the language being edited: English,
 * Arabic and Turkish (another language: English). With the sample learning
 * and the sample student the drawings show, since the editor has none.
 */

export interface ScreenWords {
  myCourses: string;
  allCourses: string;
  exploreSearch: string;
  searchCourses: string;
  all: string;
  free: string;
  /** Explore's chip of the free courses. */
  freeChip: string;
  paid: string;
  topRated: string;
  newest: string;
  sortNewest: string;
  learning: string;
  finished: string;
  saved: string;
  inProgress: string;
  completed: string;
  wishlist: string;
  doneOf: (done: number, total: number) => string;
  next: (title: string) => string;
  lessons: (n: number) => string;
  questions: (n: number) => string;
  badgeNew: string;
  badgeBestseller: string;
  weekTitle: string;
  weekTime: string;
  weekUp: string;
  /** Narrow weekday names, Sunday first. */
  weekdays: string[];
  /** The sample subjects, while the project has no categories. */
  subjects: string[];
  certificates: (n: number) => string;
  certificatesReady: string;
  // The account.
  sampleName: string;
  statCourses: (n: number) => string;
  statCertificates: (n: number) => string;
  statHours: (n: number) => string;
  darkMode: string;
  notifications: string;
  language: string;
  languageName: string;
  logOut: string;
  edit: string;
  learningGroup: string;
  accountAndApp: string;
  items: Record<string, string>;
  // A course's page.
  curriculum: string;
  aboutCourse: string;
  overview: string;
  reviews: string;
  certifiedCertificate: string;
  certificate: string;
  joinNow: string;
  enrollNow: string;
  unit: (n: number) => string;
  minutes: (n: number) => string;
  hoursMinutes: (h: number, m: number) => string;
  sampleCourse: string;
  sampleTeacher: string;
  sampleBio: string;
  sampleSubject: string;
  sampleLessons: string[];
  // A lesson.
  lessonOf: (i: number, total: number) => string;
  myNotes: string;
  files: string;
  discussion: string;
  addNote: string;
  upNext: string;
  nextLesson: string;
  previousLesson: string;
  quizOpens: string;
  markComplete: string;
  notes: string;
  lessonsTab: string;
  attachments: string;
  sampleLesson: string;
  sampleNextLesson: string;
  sampleNote: string;
  sampleNoteWhen: string;
  sampleQuiz: string;
  sampleFile: string;
  sampleUnit: string;
}

const EN: ScreenWords = {
  myCourses: "My courses",
  allCourses: "All courses",
  exploreSearch: "Course, skill or teacher",
  searchCourses: "Course or instructor name",
  all: "All",
  free: "Free",
  freeChip: "Free",
  paid: "Paid",
  topRated: "Top rated",
  newest: "Newest",
  sortNewest: "Sort: Newest",
  learning: "Learning",
  finished: "Completed",
  saved: "Saved",
  inProgress: "In progress",
  completed: "Completed",
  wishlist: "Wishlist",
  doneOf: (done, total) => `${done} of ${total}`,
  next: (title) => `Next: ${title}`,
  lessons: (n) => (n === 1 ? "1 lesson" : `${n} lessons`),
  questions: (n) => (n === 1 ? "1 question" : `${n} questions`),
  badgeNew: "New",
  badgeBestseller: "Bestseller",
  weekTitle: "This week",
  weekTime: "3 h 20 min",
  weekUp: "+25% on last week",
  weekdays: ["S", "M", "T", "W", "T", "F", "S"],
  subjects: ["Design", "Business", "Languages", "Photography"],
  certificates: (n) => (n === 1 ? "1 certificate" : `${n} certificates`),
  certificatesReady: "Ready to download",
  sampleName: "Sara Yılmaz",
  statCourses: (n) => (n === 1 ? "course" : "courses"),
  statCertificates: (n) => (n === 1 ? "certificate" : "certificates"),
  statHours: (n) => (n === 1 ? "hour" : "hours"),
  darkMode: "Dark mode",
  notifications: "Notifications",
  language: "Language",
  languageName: "English",
  logOut: "Log out",
  edit: "Edit",
  learningGroup: "Learning",
  accountAndApp: "Account & app",
  items: {
    orders: "My orders",
    points: "My points",
    certificates: "My certificates",
    memberships: "My memberships",
    quiz_results: "Quiz results",
    live_classes: "Live classes",
    learning_paths: "Learning paths",
    achievements: "Points and badges",
    wishlist: "Wishlist",
    downloads: "Downloads",
    my_courses: "My courses",
    teachers: "Teachers",
    teacher: "Teacher",
    teach: "Teach here",
    chat: "Chat",
    notifications: "Notifications",
    settings: "Settings",
    help: "Help & support",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
  },
  curriculum: "Curriculum",
  aboutCourse: "About the course",
  overview: "Overview",
  reviews: "Reviews",
  certifiedCertificate: "Certified certificate",
  certificate: "Certificate",
  joinNow: "Join now",
  enrollNow: "Enroll now",
  unit: (n) => `Unit ${n}`,
  minutes: (n) => `${n} min`,
  hoursMinutes: (h, m) => `${h} h ${m} min`,
  sampleCourse: "UX Design Fundamentals",
  sampleTeacher: "Deniz Kaya",
  sampleBio: "Product designer, 12 years",
  sampleSubject: "Design",
  sampleLessons: ["What UX is", "Talking to users", "Layout principles"],
  lessonOf: (i, total) => `Lesson ${i} of ${total}`,
  myNotes: "My notes",
  files: "Files",
  discussion: "Discussion",
  addNote: "Add note",
  upNext: "Next",
  nextLesson: "Next lesson",
  previousLesson: "Previous lesson",
  quizOpens: "Opens after this lesson",
  markComplete: "Mark complete",
  notes: "Notes",
  lessonsTab: "Lessons",
  attachments: "Attachments",
  sampleLesson: "Layout principles",
  sampleNextLesson: "Grids and spacing",
  sampleNote: "The rule: 8 px for every space, doubled between sections.",
  sampleNoteWhen: "2 min ago",
  sampleQuiz: "Unit 2 quiz",
  sampleFile: "Spacing guide.pdf",
  sampleUnit: "Unit 2",
};

const arabicCount = (n: number, one: string, two: string, few: string, many: string) => (n === 1 ? one : n === 2 ? two : n % 100 >= 3 && n % 100 <= 10 ? `${n} ${few}` : `${n} ${many}`);

const AR: ScreenWords = {
  myCourses: "دوراتي",
  allCourses: "كل الدورات",
  exploreSearch: "دورة، مهارة، أو معلم",
  searchCourses: "اسم الدورة أو المدرّب",
  all: "الكل",
  free: "مجاني",
  freeChip: "مجانية",
  paid: "مدفوع",
  topRated: "الأعلى تقييمًا",
  newest: "الأحدث",
  sortNewest: "الترتيب: الأحدث",
  learning: "قيد التعلم",
  finished: "مكتملة",
  saved: "المحفوظة",
  inProgress: "قيد التقدم",
  completed: "مكتمل",
  wishlist: "قائمة الرغبات",
  doneOf: (done, total) => `${done} من ${total}`,
  next: (title) => `التالي: ${title}`,
  lessons: (n) => arabicCount(n, "درس واحد", "درسان", "دروس", "درسًا"),
  questions: (n) => arabicCount(n, "سؤال واحد", "سؤالان", "أسئلة", "سؤالًا"),
  badgeNew: "جديدة",
  badgeBestseller: "الأكثر مبيعًا",
  weekTitle: "هذا الأسبوع",
  weekTime: "3 س 20 د",
  weekUp: "+25٪ عن الماضي",
  weekdays: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
  subjects: ["التصميم", "الأعمال", "اللغات", "التصوير"],
  certificates: (n) => (n === 1 ? "شهادة واحدة" : n === 2 ? "شهادتان" : `${n} شهادات`),
  certificatesReady: "جاهزة للتحميل",
  sampleName: "سارة أحمد",
  statCourses: (n) => (n === 1 ? "دورة" : n === 2 ? "دورتان" : n >= 3 && n <= 10 ? "دورات" : "دورة"),
  statCertificates: (n) => (n === 1 ? "شهادة" : n === 2 ? "شهادتان" : n >= 3 && n <= 10 ? "شهادات" : "شهادة"),
  statHours: (n) => (n === 1 ? "ساعة" : n === 2 ? "ساعتان" : n >= 3 && n <= 10 ? "ساعات" : "ساعة"),
  darkMode: "الوضع الغامق",
  notifications: "الإشعارات",
  language: "اللغة",
  languageName: "العربية",
  logOut: "تسجيل الخروج",
  edit: "تعديل",
  learningGroup: "التعلّم",
  accountAndApp: "الحساب والتطبيق",
  items: {
    orders: "طلباتي",
    points: "نقاطي",
    certificates: "شهاداتي",
    memberships: "عضوياتي",
    quiz_results: "نتائج الاختبارات",
    live_classes: "الحصص المباشرة",
    learning_paths: "المسارات التعليمية",
    achievements: "النقاط والشارات",
    wishlist: "قائمة الرغبات",
    downloads: "التنزيلات",
    my_courses: "دوراتي",
    teachers: "المدرّسون",
    teacher: "المدرّس",
    teach: "درّس معنا",
    chat: "المحادثة",
    notifications: "الإشعارات",
    settings: "الإعدادات",
    help: "المساعدة والدعم",
    privacy: "سياسة الخصوصية",
    terms: "الشروط والأحكام",
  },
  curriculum: "المنهج",
  aboutCourse: "عن الدورة",
  overview: "نظرة عامة",
  reviews: "المراجعات",
  certifiedCertificate: "شهادة معتمدة",
  certificate: "شهادة",
  joinNow: "اشترك الآن",
  enrollNow: "سجّل الآن",
  unit: (n) => `الوحدة ${n}`,
  minutes: (n) => `${n} د`,
  hoursMinutes: (h, m) => `${h} س ${m} د`,
  sampleCourse: "أساسيات تصميم تجربة المستخدم",
  sampleTeacher: "دنيز كايا",
  sampleBio: "مصمم منتجات، 12 عامًا",
  sampleSubject: "التصميم",
  sampleLessons: ["ما تجربة المستخدم", "الحديث مع المستخدمين", "مبادئ التخطيط"],
  lessonOf: (i, total) => `الدرس ${i} من ${total}`,
  myNotes: "ملاحظاتي",
  files: "الملفات",
  discussion: "النقاش",
  addNote: "إضافة ملاحظة",
  upNext: "التالي",
  nextLesson: "الدرس التالي",
  previousLesson: "الدرس السابق",
  quizOpens: "يفتح بعد هذا الدرس",
  markComplete: "تعيين كمكتمل",
  notes: "الملاحظات",
  lessonsTab: "الدروس",
  attachments: "المرفقات",
  sampleLesson: "مبادئ التخطيط",
  sampleNextLesson: "الشبكات والمسافات",
  sampleNote: "القاعدة: 8 بكسل لكل مسافة، وضعفها بين الأقسام.",
  sampleNoteWhen: "قبل دقيقتين",
  sampleQuiz: "اختبار الوحدة 2",
  sampleFile: "دليل المسافات.pdf",
  sampleUnit: "الوحدة 2",
};

const TR: ScreenWords = {
  myCourses: "Kurslarım",
  allCourses: "Tüm kurslar",
  exploreSearch: "Kurs, beceri veya öğretmen",
  searchCourses: "Kurs veya eğitmen adı",
  all: "Tümü",
  free: "Ücretsiz",
  freeChip: "Ücretsiz",
  paid: "Ücretli",
  topRated: "En yüksek puanlı",
  newest: "En yeni",
  sortNewest: "Sıralama: En yeni",
  learning: "Öğreniliyor",
  finished: "Tamamlanan",
  saved: "Kaydedilenler",
  inProgress: "Devam eden",
  completed: "Tamamlandı",
  wishlist: "İstek listesi",
  doneOf: (done, total) => `${total} dersten ${done}`,
  next: (title) => `Sıradaki: ${title}`,
  lessons: (n) => `${n} ders`,
  questions: (n) => `${n} soru`,
  badgeNew: "Yeni",
  badgeBestseller: "Çok satan",
  weekTitle: "Bu hafta",
  weekTime: "3 sa 20 dk",
  weekUp: "Geçen haftaya göre +%25",
  weekdays: ["P", "P", "S", "Ç", "P", "C", "C"],
  subjects: ["Tasarım", "İş dünyası", "Diller", "Fotoğraf"],
  certificates: (n) => `${n} sertifika`,
  certificatesReady: "İndirmeye hazır",
  sampleName: "Sara Yılmaz",
  statCourses: () => "kurs",
  statCertificates: () => "sertifika",
  statHours: () => "saat",
  darkMode: "Koyu mod",
  notifications: "Bildirimler",
  language: "Dil",
  languageName: "Türkçe",
  logOut: "Çıkış yap",
  edit: "Düzenle",
  learningGroup: "Öğrenme",
  accountAndApp: "Hesap ve uygulama",
  items: {
    orders: "Siparişlerim",
    points: "Puanlarım",
    certificates: "Sertifikalarım",
    memberships: "Üyeliklerim",
    quiz_results: "Sınav sonuçları",
    live_classes: "Canlı dersler",
    learning_paths: "Öğrenme yolları",
    achievements: "Puanlar ve rozetler",
    wishlist: "İstek listesi",
    downloads: "İndirilenler",
    my_courses: "Kurslarım",
    teachers: "Eğitmenler",
    teacher: "Eğitmen",
    teach: "Burada eğitmen ol",
    chat: "Sohbet",
    notifications: "Bildirimler",
    settings: "Ayarlar",
    help: "Yardım ve destek",
    privacy: "Gizlilik Politikası",
    terms: "Şartlar ve Koşullar",
  },
  curriculum: "Müfredat",
  aboutCourse: "Kurs hakkında",
  overview: "Genel bakış",
  reviews: "Yorumlar",
  certifiedCertificate: "Onaylı sertifika",
  certificate: "Sertifika",
  joinNow: "Hemen katıl",
  enrollNow: "Hemen kaydol",
  unit: (n) => `Ünite ${n}`,
  minutes: (n) => `${n} dk`,
  hoursMinutes: (h, m) => `${h} sa ${m} dk`,
  sampleCourse: "Kullanıcı Deneyimi Tasarımının Temelleri",
  sampleTeacher: "Deniz Kaya",
  sampleBio: "Ürün tasarımcısı, 12 yıl",
  sampleSubject: "Tasarım",
  sampleLessons: ["UX nedir", "Kullanıcılarla konuşmak", "Yerleşim ilkeleri"],
  lessonOf: (i, total) => `Ders ${i} / ${total}`,
  myNotes: "Notlarım",
  files: "Dosyalar",
  discussion: "Tartışma",
  addNote: "Not ekle",
  upNext: "Sıradaki",
  nextLesson: "Sonraki ders",
  previousLesson: "Önceki ders",
  quizOpens: "Bu dersten sonra açılır",
  markComplete: "Dersi tamamla",
  notes: "Notlar",
  lessonsTab: "Dersler",
  attachments: "Ekler",
  sampleLesson: "Yerleşim ilkeleri",
  sampleNextLesson: "Izgaralar ve boşluklar",
  sampleNote: "Kural: her boşluk için 8 px, bölümler arasında iki katı.",
  sampleNoteWhen: "2 dk önce",
  sampleQuiz: "Ünite 2 sınavı",
  sampleFile: "Boşluk rehberi.pdf",
  sampleUnit: "Ünite 2",
};

const WORDS: Record<string, ScreenWords> = { en: EN, ar: AR, tr: TR };

/** The words in a language, English for one the app's words here don't have. */
export function screenWords(lang: string): ScreenWords {
  return WORDS[lang] ?? EN;
}
