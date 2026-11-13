import { LOCALES } from "../i18n/locales";
import type { PhraseLang } from "./intents";

/**
 * The bot's built-in dictionary: for each intent, the words people use for
 * it in English, Turkish, Modern Standard Arabic and the Arabic dialects.
 * Phrases are separated by `|`; spelling variants that normalisation already
 * joins (ة/ه, ى/ي, أ/إ/آ/ا, diacritics, ı/i…) need not be listed twice.
 * The team adds phrases (and switches built-in ones off) in Admin › Bot
 * dictionary, often from what owners typed that the bot didn't understand.
 *
 * The owner's decisions on "I want": Egyptian is عايز / عاوز / محتاج, never
 * أبغى, which is Gulf with أبي and ودي; Levantine بدّي; Iraqi أريد / أريد أسوي;
 * Maghrebi بغيت / نبغي / حاب; Sudanese داير / عايز; MSA أريد / أود / أرغب.
 */

export interface SeedPhrase {
  intent: string;
  lang: PhraseLang;
  text: string;
}

type Words = Partial<Record<PhraseLang, string>>;

const SEED: Record<string, Words> = {
  // ——— "I want": tells the dialect ———
  want: {
    en: "i want|i need|i would like|i'd like|we want|we need|we would like|looking for|i am looking for",
    tr: "istiyorum|istiyoruz|lazım|ihtiyacım var|ihtiyacımız var|yapmak istiyorum|yaptırmak istiyorum|arıyorum",
    ar: "أريد|أود|أرغب|أرغب في|نريد|نود|نرغب|أحتاج|نحتاج",
    "ar-eg": "عايز|عاوز|محتاج|عايزة|عاوزة|عايزين|عاوزين|محتاجين",
    "ar-gulf": "أبغى|أبي|ودي|أبغا|نبي|ودنا|أبيه",
    "ar-lev": "بدّي|بدي|بدنا|بدو|حابب",
    "ar-iq": "أريد|أريد أسوي|أريد أسويلي|نريد نسوي",
    "ar-maghreb": "بغيت|نبغي|حاب|بغينا|نحب|حابة",
    "ar-sd": "داير|عايز|دايرة|دايرين|عايزين",
  },

  // ——— Kinds of business ———
  "kind.restaurant": {
    en: "restaurant|cafe|coffee shop|coffee house|coffee|bakery|pizzeria|pizza|burger|burgers|diner|bistro|eatery|menu|food menu|cafeteria|juice bar|dessert shop|desserts|sweets|grill|shawarma|kebab|bar",
    tr: "restoran|lokanta|kafe|kafeterya|kahve|kahveci|kahvehane|pastane|fırın|pizzacı|burgerci|dönerci|kebapçı|büfe|menü|yemek menüsü|tatlıcı|lokantam|meyhane",
    ar: "مطعم|مطاعم|مقهى|مقاهي|كافتيريا|مخبز|مخابز|حلويات|قائمة الطعام|مشويات|بيتزا|وجبات|منيو",
    "ar-eg": "كافيه|كوفي شوب|قهوة|قهوة بلدي|فرن|حلواني|كشري|فول وطعمية|مشويات|بيتزا|منيو|مطعم",
    "ar-gulf": "كوفي|كافيه|مقهى|مطبخ|شاورما|مندي|كبسة|مطعم|منيو",
    "ar-lev": "مطعم|مقهى|كافيه|قهوة|فرن|مناقيش|شاورما|فلافل|حلويات",
    "ar-iq": "مطعم|كافيه|جايخانة|گهوة|كباب|تكة|فلافل|مشويات",
    "ar-maghreb": "مطعم|قهوة|كافي|مقهى|طاجين|كسكس|فاست فود|بيتزيريا|حلويات",
    "ar-sd": "مطعم|كافتيريا|قهوة|ست شاي|فول|شية|بيتزا",
  },
  "kind.store": {
    en: "store|shop|online store|online shop|e-commerce|ecommerce|boutique|sell products|selling products|sell online|clothes|clothing|fashion|shoes|electronics|cosmetics|perfume|perfumes|jewelry|jewellery|gifts|flowers|florist|bookstore|supermarket|grocery|grocery store|minimarket|mini market|pharmacy|pet shop|toys|furniture|retail|products",
    tr: "mağaza|dükkan|dükkân|online mağaza|internet mağazası|e-ticaret|eticaret|butik|giyim|kıyafet|ayakkabı|elektronik|kozmetik|parfüm|takı|mücevher|hediyelik|çiçekçi|kitapçı|süpermarket|market|bakkal|eczane|oyuncak|mobilya|ürün satmak|ürünlerimi satmak|satış|online satış",
    ar: "متجر|متجر إلكتروني|محل|محلات|تجارة إلكترونية|بيع منتجات|بيع أونلاين|منتجات|ملابس|أزياء|أحذية|إلكترونيات|عطور|مستحضرات تجميل|مجوهرات|هدايا|زهور|ورود|مكتبة|سوبر ماركت|سوبرماركت|بقالة|صيدلية|ألعاب أطفال|أثاث",
    "ar-eg": "محل|محل هدوم|هدوم|لبس|جزم|سوبر ماركت|ماركت|بقالة|صيدلية|إكسسوارات|بوتيك|عطارة|أونلاين شوب",
    "ar-gulf": "محل|متجر|بقالة|سوبرماركت|عبايات|عطورات|بخور|ملابس|جوالات|إكسسوارات",
    "ar-lev": "محل|دكان|سمانة|ميني ماركت|سوبرماركت|تياب|ألبسة|عطور|موبايلات",
    "ar-iq": "محل|دكان|علوة|سوبرماركت|ملابس|هدوم|موبايلات",
    "ar-maghreb": "حانوت|محل|ماغازة|مغازة|حوايج|ملابس|عطور|سوبيرات",
    "ar-sd": "دكان|بقالة|محل|سوبرماركت|ملابس|توب|عطور",
  },
  "kind.marketplace": {
    en: "marketplace|market place|multi vendor|multivendor|multi-vendor|many vendors|many sellers|vendors|sellers|mall|online mall|many shops|shops and restaurants|supermarkets and restaurants",
    tr: "pazaryeri|pazar yeri|çok satıcılı|satıcılar|çarşı|avm|alışveriş merkezi|birçok mağaza",
    ar: "سوق إلكتروني|منصة بائعين|متعدد البائعين|عدة بائعين|بائعين|تجار|مول|سوق|عدة متاجر",
    "ar-eg": "سوق|مول|بياعين كتير|محلات كتير|تجار",
    "ar-gulf": "سوق|مول|حراج|تجار|محلات واجد",
    "ar-lev": "سوق|مول|بياعين|محلات كتير",
    "ar-iq": "سوك|سوق|مول|محلات هواية",
    "ar-maghreb": "سوق|مارشي|مول|بزاف ديال الحوانت",
    "ar-sd": "سوق|مول|تجار|دكاكين كتيرة",
  },
  "kind.delivery": {
    en: "delivery company|courier|couriers|parcel|parcels|package delivery|deliver packages|send packages|shipping|logistics|express delivery|last mile|cargo|delivery",
    tr: "kurye|kurye hizmeti|kargo|teslimat|paket teslimatı|gönderi|lojistik|kargo şirketi",
    ar: "توصيل|شحن|طرود|مندوب|مناديب|خدمة توصيل|شركة توصيل|لوجستيات|بريد سريع|توصيل طلبات|شركة شحن",
    "ar-eg": "دليفري|توصيل|شحن|مندوب|مناديب|طيارين|شحنات|توصيل أوردرات",
    "ar-gulf": "توصيل|مندوب|مناديب|شحن|طرود|توصيل طلبات",
    "ar-lev": "توصيل|ديليفري|شحن|طرود",
    "ar-iq": "توصيل|دلفري|شحن|مندوب",
    "ar-maghreb": "توصيل|ليفريزون|livraison|شحن",
    "ar-sd": "توصيل|شحن|مندوب|توصيل طلبات",
  },
  "kind.food": {
    en: "food delivery|food ordering|order food|meal delivery|deliver food|many restaurants|restaurants delivery",
    tr: "yemek siparişi|yemek sipariş|paket servis|yemek teslimatı|online yemek|yemek uygulaması|birçok restoran",
    ar: "توصيل طعام|طلب طعام|توصيل وجبات|مطاعم كثيرة|عدة مطاعم|توصيل أكل",
    "ar-eg": "توصيل أكل|دليفري أكل|اطلب أكل|أكل|مطاعم كتير",
    "ar-gulf": "توصيل أكل|طلبات أكل|مطاعم واجد",
    "ar-lev": "توصيل أكل|طلب أكل|مطاعم كتير",
    "ar-iq": "توصيل أكل|أكل|مطاعم هواية",
    "ar-maghreb": "توصيل الماكلة|ماكلة",
    "ar-sd": "توصيل أكل|أكل|مطاعم كتيرة",
  },
  "kind.rides": {
    en: "ride hailing|ride-hailing|rides|ride sharing|ridesharing|car booking|book a ride|drivers|chauffeur|transport|transportation|carpool|private driver",
    tr: "araç çağırma|yolculuk|şoför|sürücü|transfer|ulaşım|araç paylaşımı|özel şoför",
    ar: "نقل ركاب|حجز سيارة|مشاوير|رحلات|سائقين|سائق خاص|توصيل ركاب|نقل",
    "ar-eg": "مشاوير|عربيات|عربية بسواق|سواق|سواقين|توصيل ناس",
    "ar-gulf": "مشاوير|سواق خاص|كداد|سيارات|توصيل مشاوير",
    "ar-lev": "توصيلة|سرفيس|شوفير|شوفيرية",
    "ar-iq": "سايق|سواق|نقل|خطوط نقل",
    "ar-maghreb": "نقل|سائق|شيفور|كار",
    "ar-sd": "ترحيل|رقشة|أمجاد|سواق",
  },
  "kind.taxi": {
    en: "taxi|cab|cabs|live taxi|taxi on the map|taxi booking|yellow cab",
    tr: "taksi|taksi çağır|taksici|taksi durağı",
    ar: "تاكسي|سيارة أجرة|سيارات أجرة|أجرة",
    "ar-eg": "تاكسي|تاكس|عربية أجرة",
    "ar-gulf": "تاكسي|ليموزين",
    "ar-lev": "تكسي|تاكسي",
    "ar-iq": "تكسي|تاكسي",
    "ar-maghreb": "طاكسي|طاكسيات|تاكسي",
    "ar-sd": "تاكسي|ركشة",
  },
  "kind.school": {
    en: "school|kindergarten|nursery|preschool|primary school|high school|students and parents|parents|pupils|classes and grades",
    tr: "okul|kreş|anaokulu|ilkokul|ortaokul|lise|öğrenci veli|veli|veliler|öğrenciler|kolej",
    ar: "مدرسة|مدارس|روضة|حضانة|رياض أطفال|ابتدائي|إعدادي|ثانوي|أولياء الأمور|طلاب وأولياء أمور",
    "ar-eg": "مدرسة|حضانة|كي جي|مدرسة لغات|مدرسة خاصة|ولي أمر",
    "ar-gulf": "مدرسة|روضة|مدارس أهلية",
    "ar-lev": "مدرسة|روضة|حضانة",
    "ar-iq": "مدرسة|روضة|إعدادية|متوسطة",
    "ar-maghreb": "مدرسة|ليسي|كوليج|روض الأطفال|حضانة",
    "ar-sd": "مدرسة|روضة|خلوة|مدرسة أساس",
  },
  "kind.university": {
    en: "university|universities|college|faculty|campus|higher education",
    tr: "üniversite|fakülte|yüksekokul|kampüs|meslek yüksekokulu",
    ar: "جامعة|جامعات|كلية|كليات|معهد عالي|تعليم عالي|حرم جامعي",
    "ar-eg": "جامعة|كلية|جامعة خاصة",
    "ar-gulf": "جامعة|كلية",
    "ar-lev": "جامعة|كلية",
    "ar-iq": "جامعة|كلية",
    "ar-maghreb": "جامعة|كلية|فاك",
    "ar-sd": "جامعة|كلية",
  },
  "kind.academy": {
    en: "academy|courses|online courses|course|e-learning|elearning|lms|lessons|training|tutoring|teaching|online academy|learning platform|quizzes|certificates",
    tr: "akademi|kurs|kurslar|online kurs|eğitim|ders|dersler|uzaktan eğitim|eğitim platformu|sertifika|dershane",
    ar: "أكاديمية|دورات|كورسات|دورات تدريبية|تعليم إلكتروني|تعلم عن بعد|دروس|تدريب|منصة تعليمية|معهد|شهادات",
    "ar-eg": "كورسات|كورس|سنتر|دروس خصوصية|منصة تعليمية|أكاديمية",
    "ar-gulf": "دورات|كورسات|معهد|تدريب",
    "ar-lev": "دورات|كورسات|دروس|معهد",
    "ar-iq": "دورات|كورسات|دروس خصوصي|معهد",
    "ar-maghreb": "دروس|تكوين|فورماسيون|كورسات",
    "ar-sd": "كورسات|دورات|دروس|كورس",
  },
  "kind.instructors": {
    en: "academy with many teachers|many teachers|many instructors|instructors|teachers marketplace|tutors|tutor marketplace|multi instructor",
    tr: "eğitmenler|öğretmenler|çok eğitmenli|hocalar|özel ders öğretmenleri",
    ar: "مدربين|مدرسين|معلمين|عدة مدرسين|منصة مدرسين",
    "ar-eg": "مدرسين كتير|مدرسين|مستر",
    "ar-gulf": "معلمين|مدربين",
    "ar-lev": "أساتذة|مدرسين",
    "ar-iq": "مدرسين|أساتذة",
    "ar-maghreb": "أساتذة|أستاذ",
    "ar-sd": "أساتذة|معلمين",
  },
  "kind.fitness": {
    en: "gym|fitness|fitness center|health club|yoga|pilates|crossfit|personal trainer|workout|sports club|martial arts|boxing|dance studio|swimming",
    tr: "spor salonu|fitness|gym|yoga|pilates|kişisel antrenör|spor kulübü|dövüş sanatları|boks|dans stüdyosu|yüzme",
    ar: "نادي رياضي|صالة رياضية|لياقة بدنية|لياقة|يوغا|بيلاتس|مدرب شخصي|تمارين|كمال أجسام|ملاكمة|سباحة",
    "ar-eg": "جيم|جيمات|نادي|تمارين|لياقة",
    "ar-gulf": "نادي|جيم|نادي صحي|لياقة",
    "ar-lev": "نادي|جيم|صالة رياضة",
    "ar-iq": "قاعة رياضية|جيم|نادي|حديد",
    "ar-maghreb": "صال دو سبور|نادي|جيم|رياضة",
    "ar-sd": "جيم|نادي|رياضة",
  },
  "kind.clinic": {
    en: "clinic|doctor|doctors|dentist|dental clinic|medical center|hospital|physiotherapy|therapist|therapy|patients|health center|vet|veterinary|dermatologist|pediatrician|medical",
    tr: "klinik|doktor|diş hekimi|diş kliniği|muayenehane|hastane|fizyoterapi|terapist|hasta|hastalar|sağlık merkezi|veteriner|poliklinik",
    ar: "عيادة|عيادات|طبيب|أطباء|طبيب أسنان|عيادة أسنان|مركز طبي|مستشفى|علاج طبيعي|معالج|مرضى|مركز صحي|بيطري",
    "ar-eg": "عيادة|دكتور|دكاترة|دكتور سنان|سنان|عيادة سنان|كشف|مستشفى",
    "ar-gulf": "عيادة|دكتور|مستوصف|مجمع طبي|أسنان",
    "ar-lev": "عيادة|حكيم|دكتور|طبيب أسنان|مستوصف",
    "ar-iq": "عيادة|طبيب|دكتور|مستشفى",
    "ar-maghreb": "كلينيك|عيادة|طبيب|دكتور|سبيطار",
    "ar-sd": "عيادة|دكتور|شفخانة|مستشفى",
  },
  "kind.bookings": {
    en: "salon|beauty salon|hair salon|barber|barbershop|barber shop|spa|nails|nail salon|massage|bookings|booking|appointments|appointment|reservations|reservation|book appointments|beauty center",
    tr: "kuaför|berber|güzellik salonu|güzellik merkezi|spa|masaj|tırnak|randevu|randevular|rezervasyon|randevu sistemi",
    ar: "صالون|صالون تجميل|حلاق|حلاقة|سبا|منتجع صحي|مساج|أظافر|حجوزات|حجز|مواعيد|حجز مواعيد|مركز تجميل",
    "ar-eg": "كوافير|صالون|حلاق|باربر|سبا|حجز|مواعيد|بيوتي سنتر",
    "ar-gulf": "صالون|حلاق|مشغل|مشغل نسائي|سبا|حجز مواعيد",
    "ar-lev": "صالون|حلاق|كوافيرة|سبا|مواعيد",
    "ar-iq": "صالون|حلاق|كوافير|حجز",
    "ar-maghreb": "كوافور|صالون|حمام|مواعيد",
    "ar-sd": "كوافير|حلاق|صالون|حنانة|حجز",
  },
  "kind.services": {
    en: "services|service company|cleaning|maintenance|plumber|electrician|repairs|home services|consulting|agency|law firm|lawyer|accountant|car wash|laundry",
    tr: "hizmet|hizmetler|hizmet şirketi|temizlik|bakım|tesisatçı|elektrikçi|tamir|ev hizmetleri|danışmanlık|ajans|avukat|muhasebeci|oto yıkama|kuru temizleme",
    ar: "خدمات|شركة خدمات|تنظيف|صيانة|سباك|كهربائي|تصليح|خدمات منزلية|استشارات|وكالة|محاماة|محامي|محاسب|غسيل سيارات|مغسلة",
    "ar-eg": "خدمات|شركة خدمات|تنضيف|صيانة|سباك|كهربائي|تصليح|مغسلة|محامي",
    "ar-gulf": "خدمات|شركة خدمات|تنظيف|صيانة|سباك|كهربائي|مغسلة",
    "ar-lev": "خدمات|شركة خدمات|تنضيف|صيانة|تصليح|مصبغة",
    "ar-iq": "خدمات|شركة خدمات|تنظيف|تصليح|صيانة",
    "ar-maghreb": "خدمات|شركة خدمات|تنظيف|صيانة",
    "ar-sd": "خدمات|شركة خدمات|نظافة|صيانة",
  },
  "kind.real_estate": {
    en: "real estate|property|properties|realtor|real estate agency|apartments|apartment|houses|villas|rentals|for sale|for rent|homes|land",
    tr: "emlak|emlakçı|gayrimenkul|daire|konut|satılık|kiralık|villa|arsa",
    ar: "عقارات|عقار|شقق|شقة|فلل|فيلا|إيجار|للبيع|للإيجار|أراضي|وسيط عقاري|مكتب عقاري",
    "ar-eg": "عقارات|شقق|شقة|فيلات|إيجار|تمليك|سمسار",
    "ar-gulf": "عقار|عقارات|شقق|فلل|إيجار|مكتب عقار",
    "ar-lev": "عقارات|شقق|بيوت|إيجار|أجار",
    "ar-iq": "عقارات|بيوت|شقق|إيجار|دلال عقارات",
    "ar-maghreb": "عقار|ديور|شقق|كراء",
    "ar-sd": "عقارات|بيوت|شقق|إيجار|سمسار",
  },
  "kind.events": {
    en: "events|event|tickets|ticketing|concerts|conference|conferences|festival|festivals|weddings|exhibitions|meetups|shows|event tickets|workshops",
    tr: "etkinlik|etkinlikler|bilet|biletler|konser|konferans|festival|düğün|fuar|organizasyon|gösteri",
    ar: "فعاليات|فعالية|تذاكر|حفلات|حفلة|مؤتمر|مؤتمرات|مهرجان|معارض|معرض|أعراس|ورش عمل|مناسبات",
    "ar-eg": "حفلات|تذاكر|إيفنتات|إيفنت|فرح|أفراح|مهرجانات",
    "ar-gulf": "فعاليات|حفلات|تذاكر|مناسبات|زواجات",
    "ar-lev": "حفلات|تذاكر|أعراس|مناسبات",
    "ar-iq": "حفلات|تذاكر|مناسبات|أعراس",
    "ar-maghreb": "حفلات|تذاكر|أعراس|مهرجان",
    "ar-sd": "حفلات|تذاكر|مناسبات|أعراس",
  },
  "kind.news": {
    en: "news|newspaper|magazine|blog|articles|journal|media|news site|publishing|podcast",
    tr: "haber|haberler|gazete|dergi|blog|makaleler|medya|haber sitesi",
    ar: "أخبار|جريدة|صحيفة|مجلة|مدونة|مقالات|إعلام|موقع إخباري",
    "ar-eg": "أخبار|جورنال|جرنال|مجلة|بلوج|مقالات",
    "ar-gulf": "أخبار|جريدة|مدونة",
    "ar-lev": "أخبار|جريدة|مجلة|مدونة",
    "ar-iq": "أخبار|جريدة",
    "ar-maghreb": "أخبار|جريدة|لجورنال",
    "ar-sd": "أخبار|جريدة|صحيفة",
  },
  "kind.charity": {
    en: "donations|donation|charity|nonprofit|non profit|ngo|fundraising|foundation|mosque|church|zakat|sadaqah|volunteers",
    tr: "bağış|bağışlar|hayır kurumu|yardım|dernek|vakıf|sivil toplum|zekat|sadaka|cami|gönüllü",
    ar: "تبرعات|تبرع|جمعية خيرية|خيرية|عمل خيري|مؤسسة خيرية|زكاة|صدقة|صدقات|مسجد|متطوعين|جمع تبرعات",
    "ar-eg": "تبرعات|جمعية|خير|صدقة|زكاة",
    "ar-gulf": "تبرعات|جمعية خيرية|صدقة|زكاة",
    "ar-lev": "تبرعات|جمعية|خيرية",
    "ar-iq": "تبرعات|خيرية|صدقة",
    "ar-maghreb": "تبرعات|جمعية|صدقة",
    "ar-sd": "تبرعات|خيرية|صدقة|نفير",
  },
  "kind.travel": {
    en: "hotel|hotels|resort|travel agency|travel|flights|flight booking|charter flights|umrah|umrah packages|hajj|holiday packages|tour operator|airline",
    tr: "otel|oteller|tatil köyü|seyahat acentesi|seyahat|uçuş|uçak bileti|charter|umre|umre turu|tatil paketi|tur operatörü|havayolu",
    ar: "فندق|فنادق|منتجع|وكالة سفر|سفر وسياحة|سياحة|رحلات طيران|حجز طيران|تذاكر طيران|طيران عارض|عمرة|رحلات عمرة|حج|باقات سفر|شركة طيران",
    "ar-eg": "فندق|أوتيل|شركة سياحة|سياحة|طيران|تذاكر طيران|عمرة|رحلات طيران",
    "ar-gulf": "فندق|منتجع|سفريات|مكتب سفريات|تذاكر طيران|طيران|عمرة",
    "ar-lev": "فندق|أوتيل|مكتب سياحة|سفر|طيران|عمرة",
    "ar-iq": "فندق|شركة سفر|سفرات|طيران|عمرة|زيارات",
    "ar-maghreb": "أوطيل|فندق|وكالة أسفار|سفر|طيارة|عمرة",
    "ar-sd": "فندق|وكالة سفر|طيران|تذاكر طيران|عمرة",
  },

  // ——— Features ———
  "feature.chat": {
    en: "chat|live chat|messages|messaging|talk to customers|chat with customers|support chat|inbox",
    tr: "sohbet|canlı sohbet|mesaj|mesajlaşma|mesajlar|müşterilerle konuşma|canlı destek",
    ar: "محادثة|دردشة|محادثات|رسائل|مراسلة|تواصل مع العملاء",
    "ar-eg": "شات|رسايل|دردشة|كلام مع العملاء",
    "ar-gulf": "شات|دردشة|رسائل",
    "ar-lev": "شات|دردشة|رسايل|حكي مع الزباين",
    "ar-iq": "شات|دردشة|رسائل",
    "ar-maghreb": "شات|ميساجات|رسائل",
    "ar-sd": "شات|دردشة|ونسة",
  },
  "feature.loyalty": {
    en: "loyalty|loyalty points|points|rewards|reward points|cashback|points program",
    tr: "sadakat|puan|puanlar|sadakat programı|ödül|ödüller|bonus",
    ar: "نقاط|ولاء|برنامج ولاء|نقاط ولاء|مكافآت|مكافأة|استرداد نقدي",
    "ar-eg": "نقط|نقاط|مكافآت|بونص",
    "ar-gulf": "نقاط|مكافآت|ولاء",
    "ar-lev": "نقاط|مكافآت",
    "ar-iq": "نقاط|مكافآت",
    "ar-maghreb": "نقاط|مكافآت",
    "ar-sd": "نقاط|حوافز",
  },
  "feature.ratings": {
    en: "ratings|rating|reviews|store rating|rate the app|ask for reviews|stars",
    tr: "değerlendirme|puanlama|yorum|yorumlar|yıldız|uygulamayı değerlendir",
    ar: "تقييمات|تقييم|مراجعات|نجوم|تقييم التطبيق",
    "ar-eg": "تقييم|ريفيوهات|ريفيو|نجوم",
    "ar-gulf": "تقييم|تقييمات",
    "ar-lev": "تقييم|تقييمات",
    "ar-iq": "تقييم",
    "ar-maghreb": "تقييم",
    "ar-sd": "تقييم",
  },
  "feature.notifications": {
    en: "notifications|push notifications|push|alerts|notify|reminders",
    tr: "bildirim|bildirimler|anlık bildirim|push bildirim|hatırlatma|uyarı",
    ar: "إشعارات|إشعار|تنبيهات|تنبيه|إشعارات فورية|تذكير",
    "ar-eg": "نوتيفيكيشن|نوتيفكيشن|إشعارات|تنبيهات",
    "ar-gulf": "إشعارات|تنبيهات",
    "ar-lev": "إشعارات|تنبيهات",
    "ar-iq": "إشعارات|تنبيهات",
    "ar-maghreb": "نوتيفيكاسيون|إشعارات",
    "ar-sd": "إشعارات|تنبيهات",
  },
  "feature.payments": {
    en: "payments|payment|card payments|pay by card|online payment|credit card|checkout|pay online|accept payments",
    tr: "ödeme|ödemeler|kartla ödeme|kredi kartı|online ödeme|kart ile ödeme",
    ar: "دفع|مدفوعات|دفع إلكتروني|دفع بالبطاقة|بطاقة ائتمان|الدفع أونلاين|فيزا",
    "ar-eg": "دفع|فيزا|دفع أونلاين|كارت|الدفع بالكارت",
    "ar-gulf": "دفع|دفع إلكتروني|بطاقة",
    "ar-lev": "دفع|كرت|دفع أونلاين",
    "ar-iq": "دفع|كارت|دفع إلكتروني",
    "ar-maghreb": "دفع|بطاقة|كارط",
    "ar-sd": "دفع|تحويل",
  },
  "feature.ios": {
    en: "iphone|ios|app store|apple|ipad|iphone app",
    tr: "iphone|ios|app store|apple|ayfon",
    ar: "آيفون|آبل|متجر آبل|آي أو إس",
    "ar-eg": "آيفون|أبل|آب ستور",
    "ar-gulf": "آيفون|ايفونات",
    "ar-lev": "آيفون",
    "ar-iq": "آيفون",
    "ar-maghreb": "آيفون",
    "ar-sd": "آيفون",
  },

  // ——— Colours ———
  "color.red": {
    en: "red|crimson|maroon|burgundy|scarlet",
    tr: "kırmızı|bordo|al",
    ar: "أحمر|حمراء|عنابي|قرمزي",
    "ar-eg": "أحمر|نبيتي",
    "ar-gulf": "أحمر|عنابي",
    "ar-lev": "أحمر|خمري",
    "ar-iq": "أحمر|ماروني",
    "ar-maghreb": "حمر|أحمر",
    "ar-sd": "أحمر",
  },
  "color.orange": { en: "orange", tr: "turuncu", ar: "برتقالي", "ar-eg": "برتقاني|أورانج", "ar-gulf": "برتقالي", "ar-lev": "برتقاني", "ar-iq": "برتقالي", "ar-maghreb": "ليموني|برتقالي", "ar-sd": "برتقالي" },
  "color.yellow": { en: "yellow|lemon", tr: "sarı", ar: "أصفر|صفراء", "ar-eg": "أصفر|اصفر", "ar-gulf": "أصفر", "ar-lev": "أصفر", "ar-iq": "أصفر", "ar-maghreb": "صفر|أصفر", "ar-sd": "أصفر" },
  "color.green": { en: "green|olive|mint", tr: "yeşil|zeytin yeşili", ar: "أخضر|خضراء|زيتي", "ar-eg": "أخضر|زيتي|مينت", "ar-gulf": "أخضر", "ar-lev": "أخضر|زيتي", "ar-iq": "أخضر|زيتوني", "ar-maghreb": "خضر|أخضر", "ar-sd": "أخضر" },
  "color.teal": { en: "teal|turquoise|cyan|aqua", tr: "turkuaz|camgöbeği", ar: "فيروزي|تركوازي", "ar-eg": "تركواز|فيروزي", "ar-gulf": "فيروزي", "ar-lev": "فيروزي", "ar-iq": "شذري|فيروزي", "ar-maghreb": "فيروزي", "ar-sd": "فيروزي" },
  "color.blue": { en: "blue|sky blue|light blue", tr: "mavi|açık mavi", ar: "أزرق|زرقاء|سماوي", "ar-eg": "أزرق|لبني", "ar-gulf": "أزرق|سماوي", "ar-lev": "أزرق|سماوي", "ar-iq": "أزرق", "ar-maghreb": "زرق|أزرق", "ar-sd": "أزرق" },
  "color.navy": { en: "navy|navy blue|dark blue", tr: "lacivert|koyu mavi", ar: "كحلي|أزرق داكن|أزرق غامق", "ar-eg": "كحلي|أزرق غامق|نيلي", "ar-gulf": "كحلي|نيلي", "ar-lev": "كحلي", "ar-iq": "نيلي|كحلي", "ar-maghreb": "كحلي", "ar-sd": "كحلي" },
  "color.purple": { en: "purple|violet|lilac|lavender", tr: "mor|lila|eflatun", ar: "بنفسجي|أرجواني|ليلكي", "ar-eg": "موف|بنفسجي", "ar-gulf": "بنفسجي", "ar-lev": "ليلكي|بنفسجي", "ar-iq": "بنفسجي|موف", "ar-maghreb": "موف|بنفسجي", "ar-sd": "بنفسجي" },
  "color.pink": { en: "pink|rose|fuchsia|magenta", tr: "pembe|fuşya", ar: "وردي|زهري", "ar-eg": "بمبي|روز|وردي", "ar-gulf": "وردي", "ar-lev": "زهري", "ar-iq": "وردي", "ar-maghreb": "وردي|روز", "ar-sd": "وردي|بمبي" },
  "color.brown": { en: "brown|beige|coffee colour|coffee color", tr: "kahverengi|bej", ar: "بني|بيج", "ar-eg": "بني|بيج", "ar-gulf": "بني", "ar-lev": "بني", "ar-iq": "جوزي|بني", "ar-maghreb": "قهوي|بني", "ar-sd": "بني" },
  "color.black": { en: "black", tr: "siyah|kara", ar: "أسود|سوداء", "ar-eg": "إسود|أسود", "ar-gulf": "أسود", "ar-lev": "أسود", "ar-iq": "أسود", "ar-maghreb": "كحل|أكحل", "ar-sd": "أسود" },
  "color.gray": { en: "gray|grey|silver", tr: "gri|gümüş", ar: "رمادي|فضي", "ar-eg": "رصاصي|رمادي|سيلفر", "ar-gulf": "رمادي|رصاصي", "ar-lev": "رمادي|سكني", "ar-iq": "رصاصي|رمادي", "ar-maghreb": "رمادي", "ar-sd": "رمادي|رصاصي" },
  "color.gold": { en: "gold|golden", tr: "altın|altın rengi|altın sarısı", ar: "ذهبي", "ar-eg": "دهبي|ذهبي", "ar-gulf": "ذهبي", "ar-lev": "ذهبي|دهبي", "ar-iq": "ذهبي", "ar-maghreb": "ذهبي|دهبي", "ar-sd": "ذهبي|دهبي" },

  // ——— Answers ———
  "answer.yes": {
    en: "yes|yeah|yep|yup|sure|of course|ok|okay|correct|right|absolutely|we have one|i have one|have a website|we do|i do",
    tr: "evet|var|tabii|tabi|elbette|olur|tamam|evet var|kesinlikle|sitemiz var|sitem var",
    ar: "نعم|أجل|بلى|بالتأكيد|طبعا|لدي|لدينا|عندي|لدي موقع",
    "ar-eg": "أيوه|آه|أكيد|طبعا|عندي|عندنا|ماشي|أيوه عندي",
    "ar-gulf": "إيه|أيوا|إي نعم|أكيد|عندي|عندنا|زين|تمام",
    "ar-lev": "إي|أكيد|عندي|عنا|تمام|ماشي",
    "ar-iq": "إي|بلي|أكيد|عندي|عدنا|صح|زين",
    "ar-maghreb": "واه|إيه|آه|عندي|عندنا|مزيان|واخا",
    "ar-sd": "أيوه|أي|أكيد|عندي|عندنا|تمام|حاضر",
  },
  "answer.no": {
    en: "no|nope|nah|not yet|i don't|we don't|don't have|i don't have|we don't have|dont|dont have|i dont have|we dont have|none|nothing|no website|no thanks|neither",
    tr: "hayır|yok|değil|hiç|hiçbiri|istemiyorum|gerek yok|yok ki|sitemiz yok|sitem yok|hiçbir şey",
    ar: "لا|كلا|ليس لدي|ليس لدينا|لا يوجد|لا أملك|لا شيء|لا شيء منها|بدون موقع",
    "ar-eg": "لأ|لا|مفيش|ماعنديش|معنديش|مش عندي|ماعندناش|معندناش|مش عندنا|لا خالص|ولا حاجة",
    "ar-gulf": "لا|ماعندي|ما عندي|مو موجود|مافي|ما في|لا والله|ولا شي",
    "ar-lev": "لأ|لا|ما عندي|ماعندي|ما في|مافي|مش عنا|ولا شي",
    "ar-iq": "لا|ماكو|ما عندي|معندي|ماعدنا|ولا شي",
    "ar-maghreb": "لا|لالا|ماعنديش|ما عنديش|ماعندناش|والو|حتى حاجة",
    "ar-sd": "لا|مافي|ما عندي|ماعندي|مافيش|ولا حاجة",
  },
  "answer.skip": {
    en: "skip|later|not now|maybe later|no logo|without logo|next|pass|default|use default|demo colors|demo colours|keep the demo|like the demo|as in the demo",
    tr: "geç|atla|sonra|daha sonra|şimdi değil|logo yok|logosuz|varsayılan|demodaki gibi|demo renkleri",
    ar: "تخطي|تخطى|لاحقا|ليس الآن|فيما بعد|التالي|بدون شعار|الافتراضي|ألوان العرض التجريبي|مثل العرض التجريبي",
    "ar-eg": "بعدين|مش دلوقتي|عدي|سيبها|كمل|زي الديمو|من غير لوجو|مفيش لوجو",
    "ar-gulf": "بعدين|مو الحين|خلها|كمل|بعدين أشوف|بدون شعار",
    "ar-lev": "بعدين|مش هلق|كمل|خليها|بلا لوغو",
    "ar-iq": "بعدين|مو هسه|خليها|كمل",
    "ar-maghreb": "من بعد|ماشي دابا|دوز|خليها|بلا لوغو",
    "ar-sd": "بعدين|ما هسي|خليها|واصل",
  },
  "answer.done": {
    en: "done|that's all|thats all|that is all|finished|nothing else|that's it|enough|continue|go on|next",
    tr: "tamam|bitti|bu kadar|yeter|devam|başka yok|sonraki|tamamdır",
    ar: "انتهيت|هذا كل شيء|يكفي|متابعة|التالي|استمر|هذا يكفي",
    "ar-eg": "خلاص|كده تمام|بس كده|كمل|كفاية",
    "ar-gulf": "خلاص|بس|يكفي|كذا تمام|كمل",
    "ar-lev": "خلص|خلاص|بس هيك|كمل|هيك منيح",
    "ar-iq": "بس|خلص|كافي|كمل|هيج زين",
    "ar-maghreb": "صافي|سالينا|كفى|هادشي",
    "ar-sd": "خلاص|بس كده|كفاية|واصل",
  },
};

/** The app languages' own words in Arabic and Turkish, besides each language's English and native names (from LOCALES). */
const LANGUAGE_WORDS: Record<string, Words> = {
  en: {
    en: "english|eng",
    tr: "ingilizce",
    ar: "الإنجليزية|إنجليزي|الإنكليزية|اللغة الإنجليزية",
    "ar-eg": "إنجليزي|إنجلش|انجليش",
    "ar-gulf": "إنجليزي|انقليزي",
    "ar-lev": "إنكليزي|إنجليزي",
    "ar-iq": "انكليزي",
    "ar-maghreb": "نجليزية|لانجليزية|الإنجليزية",
    "ar-sd": "إنجليزي",
  },
  ar: {
    en: "arabic|arab",
    tr: "arapça",
    ar: "العربية|عربي|اللغة العربية|الفصحى|العربية الفصحى",
    "ar-eg": "عربي|مصري|باللهجة المصرية|المصري",
    "ar-gulf": "عربي|خليجي|سعودي",
    "ar-lev": "عربي|شامي|سوري|لبناني|فلسطيني|أردني",
    "ar-iq": "عربي|عراقي",
    "ar-maghreb": "عربية|دارجة|الدارجة|مغربي|جزائري|تونسي",
    "ar-sd": "عربي|سوداني",
  },
  tr: { en: "turkish", tr: "türkçe|turkce", ar: "التركية|تركي", "ar-eg": "تركي", "ar-gulf": "تركي", "ar-lev": "تركي", "ar-iq": "تركي", "ar-maghreb": "تركية", "ar-sd": "تركي" },
  fr: { en: "french", tr: "fransızca", ar: "الفرنسية|فرنسي", "ar-eg": "فرنساوي", "ar-lev": "فرنساوي", "ar-maghreb": "فرنسية|فرونسي|الفرنسية" },
  de: { en: "german", tr: "almanca", ar: "الألمانية|ألماني", "ar-eg": "ألماني" },
  es: { en: "spanish", tr: "ispanyolca", ar: "الإسبانية|إسباني", "ar-maghreb": "سبنيولية" },
  it: { en: "italian", tr: "italyanca", ar: "الإيطالية|إيطالي" },
  ru: { en: "russian", tr: "rusça", ar: "الروسية|روسي" },
  fa: { en: "persian|farsi", tr: "farsça", ar: "الفارسية|فارسي" },
  ur: { en: "urdu", tr: "urduca", ar: "الأردية|أردو" },
  zh: { en: "chinese|mandarin", tr: "çince", ar: "الصينية|صيني" },
  hi: { en: "hindi", tr: "hintçe", ar: "الهندية|هندي" },
  id: { en: "indonesian", tr: "endonezce", ar: "الإندونيسية" },
  ms: { en: "malay", tr: "malayca", ar: "الملايوية|الماليزية" },
  az: { en: "azerbaijani|azeri", tr: "azerice|azerbaycan türkçesi", ar: "الأذرية|أذري" },
  pt: { en: "portuguese", tr: "portekizce", ar: "البرتغالية" },
  nl: { en: "dutch", tr: "felemenkçe|hollandaca", ar: "الهولندية" },
  bn: { en: "bengali|bangla", tr: "bengalce", ar: "البنغالية" },
  sw: { en: "swahili", tr: "svahili", ar: "السواحيلية" },
  am: { en: "amharic", tr: "amharca", ar: "الأمهرية" },
  ps: { en: "pashto", tr: "peştuca", ar: "البشتوية" },
  uz: { en: "uzbek", tr: "özbekçe", ar: "الأوزبكية" },
  kk: { en: "kazakh", tr: "kazakça", ar: "الكازاخية" },
  ja: { en: "japanese", tr: "japonca", ar: "اليابانية" },
  ko: { en: "korean", tr: "korece", ar: "الكورية" },
  el: { en: "greek", tr: "yunanca", ar: "اليونانية" },
  he: { en: "hebrew", tr: "ibranice", ar: "العبرية" },
};

function split(words: string): string[] {
  return words
    .split("|")
    .map((w) => w.trim())
    .filter(Boolean);
}

function phrasesOf(intent: string, words: Words): SeedPhrase[] {
  return Object.entries(words).flatMap(([lang, text]) => split(text ?? "").map((t) => ({ intent, lang: lang as PhraseLang, text: t })));
}

function languagePhrases(): SeedPhrase[] {
  return LOCALES.flatMap((l) => {
    const intent = `lang.${l.code}`;
    const own = phrasesOf(intent, LANGUAGE_WORDS[l.code] ?? {});
    const named: SeedPhrase[] = [{ intent, lang: "en", text: l.name }];
    if (l.nativeName.toLowerCase() !== l.name.toLowerCase()) named.push({ intent, lang: "other", text: l.nativeName });
    return [...named, ...own];
  });
}

/** Every built-in phrase, each once per intent and language. */
export const SEED_PHRASES: readonly SeedPhrase[] = (() => {
  const all = [...Object.entries(SEED).flatMap(([intent, words]) => phrasesOf(intent, words)), ...languagePhrases()];
  const seen = new Set<string>();
  return all.filter((p) => {
    const key = `${p.intent}\u0000${p.lang}\u0000${p.text.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();
