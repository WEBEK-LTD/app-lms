/**
 * 130.52 The app's words on Studio's drawings of the course screens
 * (components/studio/course-screens.tsx) beyond lib/studio/screen-words.ts,
 * as the app says them (mobile/lib/l10n/app_*.arb, the `courseLook…` and
 * course words), in the language being edited: English, Arabic (Modern
 * Standard, as the app) and Turkish; another language: English.
 */
export interface CourseScreenWords {
  instructor: string;
  learn: string;
  youAreHere: string;
  resources: string;
  allReviews: string;
  yourProgress: string;
  previous: string;
  continueLearning: string;
  viewCertificate: string;
  ratings: (n: number) => string;
  /** The sample of what a course teaches, while the editor has no course of its own. */
  sampleLearn: string[];
  sampleReview: string;
  sampleReviewer: string;
}

const EN: CourseScreenWords = {
  instructor: "Instructor",
  learn: "What you'll learn",
  youAreHere: "You're here",
  resources: "Resources",
  allReviews: "All reviews",
  yourProgress: "Your progress",
  previous: "Previous",
  continueLearning: "Continue learning",
  viewCertificate: "View certificate",
  ratings: (n) => (n === 1 ? "1 rating" : `${n} ratings`),
  sampleLearn: ["Talk to users and map their journey", "Wireframes that answer real questions", "Clickable prototypes, tested with five people"],
  sampleReview: "Clear, practical and well paced. I redesigned our booking form during module 2.",
  sampleReviewer: "Ayşe Demir",
};

const AR: CourseScreenWords = {
  instructor: "المدرّب",
  learn: "ماذا ستتعلّم",
  youAreHere: "أنت هنا",
  resources: "الموارد",
  allReviews: "كل التقييمات",
  yourProgress: "تقدّمك في الدورة",
  previous: "السابق",
  continueLearning: "تابع التعلّم",
  viewCertificate: "عرض الشهادة",
  ratings: (n) => (n === 1 ? "تقييم واحد" : n === 2 ? "تقييمان" : n % 100 >= 3 && n % 100 <= 10 ? `${n} تقييمات` : `${n} تقييمًا`),
  sampleLearn: ["البحث مع المستخدمين ورسم رحلتهم", "مخططات أولية تجيب عن الأسئلة", "نماذج قابلة للنقر واختبارها مع خمسة أشخاص"],
  sampleReview: "واضحة وعملية ومتوازنة الإيقاع. أعدت تصميم نموذج الحجز لدينا خلال الوحدة الثانية.",
  sampleReviewer: "عائشة دمير",
};

const TR: CourseScreenWords = {
  instructor: "Eğitmen",
  learn: "Neler öğreneceksiniz",
  youAreHere: "Buradasınız",
  resources: "Kaynaklar",
  allReviews: "Tüm değerlendirmeler",
  yourProgress: "İlerlemeniz",
  previous: "Önceki",
  continueLearning: "Öğrenmeye devam et",
  viewCertificate: "Sertifikayı görüntüle",
  ratings: (n) => `${n} değerlendirme`,
  sampleLearn: ["Kullanıcılarla konuşun ve yolculuklarını çizin", "Gerçek sorulara cevap veren tel kafesler", "Beş kişiyle test edilen tıklanabilir prototipler"],
  sampleReview: "Açık, pratik ve iyi tempolu. Rezervasyon formumuzu 2. modülde yeniden tasarladım.",
  sampleReviewer: "Ayşe Demir",
};

export function courseScreenWords(lang: string): CourseScreenWords {
  return lang === "ar" ? AR : lang === "tr" ? TR : EN;
}
