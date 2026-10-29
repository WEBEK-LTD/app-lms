import type { CatalogCurrency } from "../data/types";
import {
  CLINIC_DOCTORS,
  CLINIC_SERVICES,
  DEMO_ARTICLES,
  DEMO_COURSES,
  DEMO_DELIVERY_SERVICES,
  DEMO_DISHES,
  DEMO_EVENTS,
  DEMO_LISTINGS,
  DEMO_PRODUCTS,
  DEMO_RESTAURANTS,
  DEMO_SERVICES,
  DEMO_STAFF,
  FITNESS_COACHES,
  FITNESS_SERVICES,
  RIDES_DEMO_TYPES,
  type DemoCourse,
  type DemoListing,
} from "../demo/content";
import type { PictureName } from "../demo/pictures";

/**
 * 110.2 The sample entries a list gets when a design is chosen and the list
 * is empty: the demo apps' content (lib/demo/content.ts) where it has
 * enough, with a few more, in the languages an app's samples come in. Names
 * of people and businesses are invented. Prices are in `currency` and moved
 * to the app's own (lib/samples/money.ts).
 */

export const SAMPLE_LANGS = ["en", "ar", "tr"] as const;
export type SampleLang = (typeof SAMPLE_LANGS)[number];

/** A text in each language: English, Modern Standard Arabic and Turkish. */
export type Tri = Record<SampleLang, string>;
const t3 = (en: string, ar: string, tr: string): Tri => ({ en, ar, tr });

/** The samples' language for the app's main language: English for any other. */
export function sampleLang(code: string | null | undefined): SampleLang {
  return code === "ar" || code === "tr" ? code : "en";
}

const find = <T, K extends keyof T>(list: readonly T[], key: K, value: T[K]): T => {
  const found = list.find((x) => x[key] === value);
  if (!found) throw new Error(`Sample content: ${String(value)} isn't in the demo content`);
  return found;
};

// ——— Courses (academies; 105.3 academies with many teachers get the teachers too) ———

export interface SampleCourse {
  title: Tri;
  description: Tri;
  instructor: Tri;
  level: Tri;
  category: string;
  priceCents: number;
  picture: PictureName;
  /** The English lessons (the demo's); other languages get a short start. */
  topics: DemoCourse["topics"];
}

const LEVEL = {
  Beginner: t3("Beginner", "مبتدئ", "Başlangıç"),
  Intermediate: t3("Intermediate", "متوسط", "Orta"),
  Advanced: t3("Advanced", "متقدم", "İleri"),
};

const PEOPLE = {
  deniz: t3("Deniz Kaya", "رنا الخطيب", "Deniz Kaya"),
  emre: t3("Emre Aydın", "كريم منصور", "Emre Aydın"),
  omar: t3("Omar Farouk", "عمر فاروق", "Omar Farouk"),
  yasmin: t3("Yasmin Adel", "ياسمين عادل", "Yasmin Adel"),
  hannah: t3("Hannah Clarke", "هبة السيد", "Hannah Clarke"),
  mert: t3("Mert Şahin", "مازن الشريف", "Mert Şahin"),
  salma: t3("Salma Nasser", "سلمى ناصر", "Salma Nasser"),
};

/** A short start for a course, in each language. */
export const START_TOPIC: Record<SampleLang, DemoCourse["topics"]> = {
  en: [
    {
      title: "Getting started",
      lessons: [
        { title: "Welcome to the course", minutes: 5, preview: true, text: "What you'll learn in this course, and how to get the most out of it." },
        { title: "Your first step", minutes: 10, text: "A short exercise to put what you've learned to use straight away." },
      ],
    },
  ],
  ar: [
    {
      title: "البداية",
      lessons: [
        { title: "مرحبًا بك في الدورة", minutes: 5, preview: true, text: "نتعرف في هذا الدرس على ما ستتعلمه في الدورة وكيف تستفيد منها أكثر." },
        { title: "خطوتك الأولى", minutes: 10, text: "نبدأ بتمرين قصير تطبّق فيه ما تعلمته مباشرة." },
      ],
    },
  ],
  tr: [
    {
      title: "Başlarken",
      lessons: [
        { title: "Kursa hoş geldiniz", minutes: 5, preview: true, text: "Bu derste kursta neler öğreneceğinizi ve kurstan en iyi nasıl yararlanacağınızı görüyoruz." },
        { title: "İlk adımınız", minutes: 10, text: "Öğrendiklerinizi hemen uygulayacağınız kısa bir alıştırmayla başlıyoruz." },
      ],
    },
  ],
};

function demoCourse(title: string, category: string, instructor: Tri, ar: [string, string], tr: [string, string]): SampleCourse {
  const seed = find(DEMO_COURSES, "title", title);
  return {
    title: t3(seed.title, ar[0], tr[0]),
    description: t3(seed.description, ar[1], tr[1]),
    instructor,
    level: LEVEL[seed.level as keyof typeof LEVEL],
    category,
    priceCents: seed.priceCents,
    picture: seed.picture,
    topics: seed.topics,
  };
}

export const SAMPLE_COURSES: { currency: CatalogCurrency; categories: Record<string, Tri>; courses: SampleCourse[] } = {
  currency: "TRY",
  categories: {
    Design: t3("Design", "التصميم", "Tasarım"),
    Business: t3("Business", "الأعمال", "İş dünyası"),
    Languages: t3("Languages", "اللغات", "Diller"),
    Technology: t3("Technology", "التقنية", "Teknoloji"),
  },
  courses: [
    demoCourse("UX Design Fundamentals", "Design", PEOPLE.deniz, [
      "أساسيات تصميم تجربة المستخدم",
      "تعلّم كيف يحوّل المصممون مشكلة معقدة إلى شاشة بسيطة: تقابل المستخدمين، وترسم الأفكار، وتبني نموذجًا أوليًا قابلًا للنقر وتختبره مع مستخدمين حقيقيين.\n\nلا تحتاج إلى برامج تصميم للبدء: تكفي ورقة وقلم.",
    ], [
      "Kullanıcı Deneyimi Tasarımının Temelleri",
      "Tasarımcıların karmaşık bir sorunu nasıl sade bir ekrana dönüştürdüğünü öğrenin: kullanıcılarla görüşün, fikirleri çizin, tıklanabilir bir prototip hazırlayıp gerçek kullanıcılarla test edin.\n\nBaşlamak için tasarım programına gerek yok: kâğıt ve kalem yeter.",
    ]),
    demoCourse("Product Photography with Your Phone", "Design", PEOPLE.emre, [
      "تصوير المنتجات بهاتفك",
      "التقط صورًا لمنتجاتك تجذب المشترين، بالهاتف الذي في جيبك ونافذة وورقة بيضاء: الإضاءة والزوايا والخلفيات وتعديلات سريعة.",
    ], [
      "Telefonla Ürün Fotoğrafçılığı",
      "Cebinizdeki telefon, bir pencere ve beyaz bir kartonla satış yaptıran ürün fotoğrafları çekin: ışık, açılar, arka planlar ve hızlı düzenlemeler.",
    ]),
    demoCourse("Excel for Small Business Owners", "Business", PEOPLE.omar, [
      "إكسل لأصحاب المشاريع الصغيرة",
      "دورة مجانية لكل من يدير مشروعًا صغيرًا: نظّم المبيعات والتكاليف والمخزون في ملف واحد مرتب، واعرف بنظرة واحدة كيف يسير الشهر.",
    ], [
      "Küçük İşletmeler için Excel",
      "Küçük bir işletme yöneten herkes için ücretsiz bir kurs: satışlarınızı, giderlerinizi ve stoğunuzu tek bir düzenli dosyada tutun, ayın nasıl gittiğini bir bakışta görün.",
    ]),
    demoCourse("Social Media Marketing That Sells", "Business", PEOPLE.yasmin, [
      "تسويق عبر وسائل التواصل يحقق المبيعات",
      "خطّط لمنشورات شهر كامل في ظهيرة واحدة، واكتب نصوصًا يقرؤها الناس حتى آخرها، واعرف أي المنشورات تجلب العملاء لا الإعجابات فقط.",
    ], [
      "Satış Getiren Sosyal Medya Pazarlaması",
      "Bir aylık paylaşımı tek bir öğleden sonrada planlayın, sonuna kadar okunan açıklamalar yazın ve hangi paylaşımların yalnızca beğeni değil müşteri getirdiğini öğrenin.",
    ]),
    demoCourse("Everyday English Conversation", "Languages", PEOPLE.hannah, [
      "محادثة إنجليزية يومية",
      "تحدّث بثقة أكبر في العمل والسفر: الأحاديث القصيرة والمكالمات الهاتفية والاجتماعات وطرق مهذبة للاعتراض.",
    ], [
      "Günlük İngilizce Konuşma",
      "İşte ve seyahatte daha özgüvenli konuşun: sohbet açmak, telefon görüşmeleri, toplantılar ve kibarca itiraz etmenin yolları.",
    ]),
    demoCourse("Python for Data Analysis", "Technology", PEOPLE.mert, [
      "بايثون لتحليل البيانات",
      "حمّل جدول بيانات في بايثون ونظّفه، وأجب عن أسئلتك ببضعة أسطر من pandas، وارسم مخططات تشاركها مع فريقك. لمن كتب القليل من الشيفرة من قبل.",
    ], [
      "Veri Analizi için Python",
      "Bir tabloyu Python'a yükleyin, temizleyin, birkaç satır pandas ile sorularınızı yanıtlayın ve paylaşabileceğiniz grafikler çizin. Daha önce biraz kod yazmış olanlar için.",
    ]),
    {
      title: t3("Arabic for Beginners", "العربية للمبتدئين", "Yeni Başlayanlar için Arapça"),
      description: t3(
        "Read and write the Arabic letters, greet people, introduce yourself and order at a café. Short lessons with audio you can repeat as often as you like.",
        "اقرأ الحروف العربية واكتبها، وتعلّم التحية والتعريف بنفسك والطلب في المقهى. دروس قصيرة بتسجيلات صوتية تعيدها كلما شئت.",
        "Arap harflerini okuyup yazın; selamlaşmayı, kendinizi tanıtmayı ve kafede sipariş vermeyi öğrenin. İstediğiniz kadar tekrar dinleyebileceğiniz sesli kısa dersler.",
      ),
      instructor: PEOPLE.salma,
      level: LEVEL.Beginner,
      category: "Languages",
      priceCents: 750_00,
      picture: "course-arabic",
      topics: [],
    },
    {
      title: t3("Start Your Own Small Business", "ابدأ مشروعك الصغير", "Kendi Küçük İşletmeni Kur"),
      description: t3(
        "From an idea to your first customers: check that people want it, set your prices, keep simple accounts and find customers without a big budget.",
        "من الفكرة إلى أول عملائك: تأكّد أن الناس يريدون ما تقدمه، وحدّد أسعارك، واحتفظ بحسابات بسيطة، واعثر على العملاء دون ميزانية كبيرة.",
        "Fikirden ilk müşterilerinize: insanların bunu istediğinden emin olun, fiyatlarınızı belirleyin, basit bir muhasebe tutun ve büyük bir bütçe olmadan müşteri bulun.",
      ),
      instructor: PEOPLE.omar,
      level: LEVEL.Beginner,
      category: "Business",
      priceCents: 990_00,
      picture: "course-business",
      topics: [],
    },
  ],
};

export interface SampleTeacher {
  name: Tri;
  bio: Tri;
  subjects: Record<SampleLang, string[]>;
  picture: PictureName;
  featured: boolean;
}

/** 105.3 An academy's teachers: the courses of the same name are theirs. Nobody signs in as them (no number or email). */
export const SAMPLE_TEACHERS: SampleTeacher[] = [
  {
    name: PEOPLE.deniz,
    bio: t3(
      "A product designer who has worked on banking and travel apps for ten years. Teaches design the way it's done at work: with real people and small steps.",
      "مصممة منتجات عملت عشر سنوات على تطبيقات مصرفية وتطبيقات سفر. تدرّس التصميم كما يُمارَس في العمل: مع أشخاص حقيقيين وبخطوات صغيرة.",
      "On yıldır bankacılık ve seyahat uygulamaları üzerinde çalışan bir ürün tasarımcısı. Tasarımı işte yapıldığı gibi öğretir: gerçek insanlarla ve küçük adımlarla.",
    ),
    subjects: { en: ["UX design", "Prototyping"], ar: ["تصميم تجربة المستخدم", "النماذج الأولية"], tr: ["Kullanıcı deneyimi", "Prototipleme"] },
    picture: "staff-deniz",
    featured: true,
  },
  {
    name: PEOPLE.omar,
    bio: t3(
      "Ran a family shop for fifteen years before he started teaching. Shows how to keep the numbers of a small business simple and clear.",
      "أدار متجر العائلة خمسة عشر عامًا قبل أن يتجه إلى التدريس. يشرح كيف تبقى أرقام المشروع الصغير بسيطة وواضحة.",
      "Öğretmeye başlamadan önce on beş yıl aile dükkânını işletti. Küçük bir işletmenin rakamlarını sade ve anlaşılır tutmayı gösteriyor.",
    ),
    subjects: { en: ["Excel", "Small business"], ar: ["إكسل", "المشاريع الصغيرة"], tr: ["Excel", "Küçük işletme"] },
    picture: "doctor-kerem",
    featured: false,
  },
  {
    name: PEOPLE.yasmin,
    bio: t3(
      "Plans social media for cafés, shops and clinics. Her students leave with a month of posts ready to go.",
      "تخطط لحسابات المقاهي والمتاجر والعيادات على وسائل التواصل. يخرج طلابها ومعهم منشورات شهر كامل جاهزة للنشر.",
      "Kafeler, mağazalar ve klinikler için sosyal medya planlıyor. Öğrencileri kurstan bir aylık paylaşımları hazır olarak ayrılıyor.",
    ),
    subjects: { en: ["Social media", "Marketing"], ar: ["وسائل التواصل", "التسويق"], tr: ["Sosyal medya", "Pazarlama"] },
    picture: "coach-mira",
    featured: false,
  },
  {
    name: PEOPLE.mert,
    bio: t3(
      "A data analyst who likes short code and clear charts. Teaches with the spreadsheets people already have.",
      "محلل بيانات يحب الشيفرة القصيرة والمخططات الواضحة. يدرّس باستخدام جداول البيانات المتوفرة لدى المتعلمين.",
      "Kısa kodu ve açık grafikleri seven bir veri analisti. Herkesin elinde olan tablolarla öğretiyor.",
    ),
    subjects: { en: ["Python", "Data analysis"], ar: ["بايثون", "تحليل البيانات"], tr: ["Python", "Veri analizi"] },
    picture: "coach-can",
    featured: false,
  },
];

// ——— Products (stores) and a restaurant's menu ———

export interface SampleOption {
  name: Tri;
  priceDeltaCents: number;
}

export interface SampleOptionGroup {
  id: string;
  name: Tri;
  min: number;
  max: number;
  options: (SampleOption & { id: string })[];
}

export interface SampleProduct {
  sku: string;
  name: Tri;
  description: Tri;
  category: string;
  priceCents: number;
  salePriceCents: number | null;
  picture: PictureName;
  featured: boolean;
  optionGroups?: SampleOptionGroup[];
}

const OPTION_WORDS: Record<string, Tri> = {
  Eggs: t3("Eggs", "البيض", "Yumurta"),
  Fried: t3("Fried", "مقلي", "Sahanda"),
  Boiled: t3("Boiled", "مسلوق", "Haşlanmış"),
  Menemen: t3("Menemen", "منمن بالطماطم", "Menemen"),
  Extras: t3("Extras", "إضافات", "Ekstralar"),
  Sucuk: t3("Sucuk", "سجق", "Sucuk"),
  Avocado: t3("Avocado", "أفوكادو", "Avokado"),
  "More cheese": t3("More cheese", "جبن إضافي", "Ekstra peynir"),
  Side: t3("Side", "طبق جانبي", "Yanında"),
  Fries: t3("Fries", "بطاطس مقلية", "Patates kızartması"),
  Salad: t3("Salad", "سلطة", "Salata"),
  Rice: t3("Rice", "أرز", "Pilav"),
  Sauces: t3("Sauces", "الصلصات", "Soslar"),
  "Garlic yoghurt": t3("Garlic yoghurt", "لبن بالثوم", "Sarımsaklı yoğurt"),
  Spicy: t3("Spicy", "حار", "Acı"),
  Smoky: t3("Smoky", "مدخّن", "İsli"),
  Size: t3("Size", "الحجم", "Boy"),
  Single: t3("Single", "عادي", "Tek"),
  Double: t3("Double", "مزدوج", "Duble"),
  Cheddar: t3("Cheddar", "جبن شيدر", "Çedar"),
  "Caramelised onion": t3("Caramelised onion", "بصل مكرمل", "Karamelize soğan"),
  Pickles: t3("Pickles", "مخلل", "Turşu"),
  Topping: t3("Topping", "الإضافة", "Sos"),
  "Chocolate sauce": t3("Chocolate sauce", "صلصة الشوكولاتة", "Çikolata sosu"),
  Berries: t3("Berries", "توت", "Orman meyveleri"),
  Sugar: t3("Sugar", "السكر", "Şeker"),
  "No sugar": t3("No sugar", "بدون سكر", "Sade"),
  "A little": t3("A little", "قليل", "Az şekerli"),
  Medium: t3("Medium", "مضبوط", "Orta"),
  Sweet: t3("Sweet", "زيادة", "Şekerli"),
  Small: t3("Small", "صغير", "Küçük"),
  Large: t3("Large", "كبير", "Büyük"),
};

const word = (english: string): Tri => {
  const found = OPTION_WORDS[english];
  if (!found) throw new Error(`Sample content: no translation of the option "${english}"`);
  return found;
};

function demoProduct(list: typeof DEMO_PRODUCTS, sku: string, ar: [string, string], tr: [string, string]): SampleProduct {
  const seed = find(list, "sku", sku);
  return {
    sku: seed.sku,
    name: t3(seed.name, ar[0], tr[0]),
    description: t3(seed.description, ar[1], tr[1]),
    category: seed.category,
    priceCents: seed.priceCents,
    salePriceCents: seed.salePriceCents,
    picture: seed.picture,
    featured: seed.featured,
    ...(seed.optionGroups
      ? {
          optionGroups: seed.optionGroups.map((g) => ({
            id: g.id,
            name: word(g.name),
            min: g.min,
            max: g.max,
            options: g.options.map((o) => ({ id: o.id, name: word(o.name), priceDeltaCents: o.priceDeltaCents })),
          })),
        }
      : {}),
  };
}

export const SAMPLE_PRODUCTS: { currency: CatalogCurrency; categories: Record<string, Tri>; products: SampleProduct[] } = {
  currency: "TRY",
  categories: {
    Flowers: t3("Flowers", "الزهور", "Çiçekler"),
    "Gift boxes": t3("Gift boxes", "صناديق الهدايا", "Hediye kutuları"),
    Sweets: t3("Sweets", "الحلويات", "Tatlılar"),
    Home: t3("Home", "المنزل", "Ev"),
  },
  products: [
    demoProduct(DEMO_PRODUCTS, "LALE-101", [
      "باقة ورد وردي ناعم",
      "اثنتا عشرة وردة بلون وردي فاتح مع أغصان الأوكالبتوس، ملفوفة بورق كريمي ومربوطة بشريط من الحرير.\n\nتُنسَّق صباح يوم التوصيل.",
    ], ["Pudra Pembesi Gül Buketi", "Okaliptüsle süslenmiş on iki pudra pembesi gül, krem rengi kâğıda sarılıp ipek kurdeleyle bağlanır.\n\nTeslimat sabahı hazırlanır."]),
    demoProduct(DEMO_PRODUCTS, "LALE-102", ["أوركيد أبيض في أصيص خزفي", "أوركيد أبيض بغصنين في أصيص خزفي مصنوع يدويًا. يزهر أسابيع بقليل من الماء مرة في الأسبوع."], [
      "Seramik Saksıda Beyaz Orkide",
      "El yapımı seramik saksıda iki dallı beyaz orkide. Haftada bir biraz suyla haftalarca çiçek açar.",
    ]),
    demoProduct(DEMO_PRODUCTS, "LALE-103", ["باقة توليب الربيع", "خمس عشرة زهرة توليب بالأحمر والأصفر والوردي، تواصل تفتحها أيامًا في المزهرية."], [
      "Bahar Lalesi Demeti",
      "Kırmızı, sarı ve pembe on beş lale. Vazoda günlerce açmaya devam eder.",
    ]),
    demoProduct(DEMO_PRODUCTS, "LALE-201", ["صندوق مفاجأة عيد الميلاد", "باقة صغيرة وشمعة معطرة وعلبة راحة الحلقوم، مع بطاقة مكتوبة بخط اليد."], [
      "Doğum Günü Sürpriz Kutusu",
      "Küçük bir buket, kokulu bir mum ve bir kutu lokum; el yazısıyla bir kartla.",
    ]),
    demoProduct(DEMO_PRODUCTS, "LALE-202", ["طقم هدية القهوة التركية", "دلة نحاسية وفنجانان من البورسلين و250 غرامًا من القهوة التركية المطحونة حديثًا."], [
      "Türk Kahvesi Hediye Seti",
      "Bakır bir cezve, iki porselen fincan ve 250 g taze çekilmiş Türk kahvesi.",
    ]),
    demoProduct(DEMO_PRODUCTS, "LALE-301", ["علبة راحة الحلقوم بالورد", "راحة حلقوم طرية بالورد والفستق، مرشوشة بالسكر الناعم. 500 غرام."], ["Güllü Lokum Kutusu", "Pudra şekerine bulanmış yumuşacık gül ve fıstıklı lokum. 500 g."]),
    demoProduct(DEMO_PRODUCTS, "LALE-302", ["علبة شاي الزيزفون", "أزهار زيزفون مجففة في علبة معدنية تحب أن تحتفظ بها. مهدئ وحلو قليلًا. 80 غرامًا."], [
      "Ihlamur Çayı Teneke Kutu",
      "Saklamak isteyeceğiniz bir teneke kutuda kurutulmuş ıhlamur çiçekleri. Rahatlatıcı, hafif tatlı. 80 g.",
    ]),
    demoProduct(DEMO_PRODUCTS, "LALE-401", ["شمعة التين والأرز", "شمعة من شمع الصويا بنفحات التين الناضج وخشب الأرز. تشتعل نحو 40 ساعة."], [
      "İncir ve Sedir Mumu",
      "Olgun incir ve sedir ağacı notalarıyla soya mumu. Yaklaşık 40 saat yanar.",
    ]),
  ],
};

/** 26 A café's or restaurant's menu (the restaurant vertical of stores). */
export const SAMPLE_MENU: typeof SAMPLE_PRODUCTS = {
  currency: "TRY",
  categories: {
    Breakfast: t3("Breakfast", "الفطور", "Kahvaltı"),
    Mains: t3("Mains", "الأطباق الرئيسية", "Ana yemekler"),
    Desserts: t3("Desserts", "الحلويات", "Tatlılar"),
    Drinks: t3("Drinks", "المشروبات", "İçecekler"),
  },
  products: [
    demoProduct(DEMO_DISHES, "DEFNE-101", ["طبق الفطور التركي", "جبن أبيض وجبن قشقوان وزيتون وطماطم وخيار وعسل وقشطة، مع خبز من المخبز المجاور."], [
      "Serpme Kahvaltı Tabağı",
      "Beyaz peynir, kaşar, zeytin, domates, salatalık, bal ve kaymak; yan fırından ekmekle.",
    ]),
    demoProduct(DEMO_DISHES, "DEFNE-201", ["راب الدجاج المشوي", "أفخاذ دجاج مشوية وفلفل وبصل ولبن بالثوم في خبز لافاش دافئ."], ["Izgara Tavuk Dürüm", "Izgara tavuk but, biber, soğan ve sarımsaklı yoğurt, sıcak lavaşta."]),
    demoProduct(DEMO_DISHES, "DEFNE-202", ["برجر دفنة", "قطعة لحم بقري مع خس وطماطم وصلصتنا الخاصة في خبز بريوش."], ["Defne Burger", "Dana köfte, marul, domates ve özel sosumuz, brioche ekmekte."]),
    demoProduct(DEMO_DISHES, "DEFNE-203", ["شوربة العدس", "شوربة العدس الأحمر مع عصرة ليمون وقليل من الزبدة بالفلفل الحار."], ["Mercimek Çorbası", "Limon ve biraz pul biberli tereyağıyla kırmızı mercimek çorbası."]),
    demoProduct(DEMO_DISHES, "DEFNE-301", ["تشيز كيك سان سيباستيان", "محمّص من الأعلى وطري من الداخل."], ["San Sebastian Cheesecake", "Üstü yanık, içi yumuşacık."]),
    demoProduct(DEMO_DISHES, "DEFNE-302", ["بقلاوة (4 قطع)", "بقلاوة بالفستق من غازي عنتاب، مع ملعقة قشطة على الجانب."], ["Baklava (4 dilim)", "Gaziantep'ten fıstıklı baklava, yanında bir kaşık kaymakla."]),
    demoProduct(DEMO_DISHES, "DEFNE-401", ["قهوة تركية", "تُحضَّر في دلة نحاسية وتُقدَّم مع قطعة من راحة الحلقوم."], ["Türk Kahvesi", "Bakır cezvede pişirilir, yanında bir lokumla gelir."]),
    demoProduct(DEMO_DISHES, "DEFNE-402", ["عصير برتقال طازج", "يُعصر عند طلبك."], ["Taze Portakal Suyu", "Siparişinizle sıkılır."]),
  ],
};

// ——— Services and the team (bookings: a salon, 21 a clinic, 27 a gym, 84.1 a services company) ———

export interface SampleService {
  name: Tri;
  description: Tri;
  category: string;
  minutes: number;
  priceCents: number;
  picture: PictureName;
  color: string;
}

export interface SampleStaff {
  name: Tri;
  title: Tri;
  picture: PictureName;
  /** English service names. */
  services: string[];
  /** 21 A clinic's doctors' profiles. */
  profile?: { specialties: Record<SampleLang, string[]>; languages: Record<SampleLang, string[]>; bio: Tri };
}

export interface SampleBookings {
  currency: CatalogCurrency;
  categories: Record<string, Tri>;
  services: SampleService[];
  staff: SampleStaff[];
}

function demoService(list: typeof DEMO_SERVICES, name: string, ar: [string, string], tr: [string, string]): SampleService {
  const seed = find(list, "name", name);
  return { name: t3(seed.name, ar[0], tr[0]), description: t3(seed.description, ar[1], tr[1]), category: seed.category, minutes: seed.minutes, priceCents: seed.priceCents, picture: seed.picture, color: seed.color };
}

function demoStaff(list: typeof DEMO_STAFF, name: string, names: [string, string], title: Tri, services?: string[]): SampleStaff {
  const seed = find(list, "name", name);
  return { name: t3(seed.name, names[0], names[1]), title, picture: seed.picture, services: services ?? seed.services };
}

export const SAMPLE_SALON: SampleBookings = {
  currency: "TRY",
  categories: {
    Hair: t3("Hair", "الشعر", "Saç"),
    Spa: t3("Spa", "السبا", "Spa"),
    "Nails & brows": t3("Nails & brows", "الأظافر والحواجب", "Tırnak ve kaş"),
  },
  services: [
    demoService(DEMO_SERVICES, "Haircut & blow-dry", ["قص الشعر وتصفيفه", "غسل وقصّة تناسبك وتصفيف بالسشوار. أخبرينا بما تريدين أو اطلبي نصيحتنا."], [
      "Saç Kesimi ve Fön",
      "Yıkama, size yakışan bir kesim ve fön. Ne istediğinizi söyleyin ya da bize danışın.",
    ]),
    demoService(DEMO_SERVICES, "Colour & gloss", ["صبغة ولمعان", "صبغة كاملة أو للجذور مع لمعان يمنح الشعر بريقًا. يشمل التصفيف."], ["Boya ve Parlatma", "Tüm saça ya da diplere boya, parlaklık veren bakımla. Fön dahil."]),
    demoService(DEMO_SERVICES, "Relaxing massage", ["تدليك للاسترخاء", "تدليك للجسم كله بالزيت الدافئ، لساعة من الهدوء."], ["Rahatlatıcı Masaj", "Ilık yağla tüm vücut masajı; bir saatliğine yavaşlamak için."]),
    demoService(DEMO_SERVICES, "Hydrating facial", ["عناية مرطبة بالوجه", "تنظيف وتقشير لطيف وقناع مرطب لبشرة منتعشة."], ["Nemlendirici Cilt Bakımı", "Temizleme, hafif peeling ve nemlendirici maske; tazelenmiş bir cilt için."]),
    demoService(DEMO_SERVICES, "Gel manicure", ["مانيكير جل", "تشكيل الأظافر والعناية بالجلد حولها ولون جل يدوم حتى ثلاثة أسابيع."], ["Kalıcı Oje Manikür", "Şekillendirme, kütikül bakımı ve üç haftaya kadar kalıcı jel renk."]),
    demoService(DEMO_SERVICES, "Brow shaping", ["تشكيل الحواجب", "تشكيل بالخيط أو الشمع، مع صبغة إن رغبتِ."], ["Kaş Şekillendirme", "İple ya da ağdayla şekillendirme, isterseniz boyayla."]),
  ],
  staff: [
    demoStaff(DEMO_STAFF, "Elif Arslan", ["نور حسن", "Elif Arslan"], t3("Hair stylist", "مصففة شعر", "Kuaför")),
    demoStaff(DEMO_STAFF, "Selin Koç", ["سلمى كامل", "Selin Koç"], t3("Beauty therapist", "أخصائية تجميل", "Güzellik uzmanı")),
    demoStaff(DEMO_STAFF, "Deniz Yıldız", ["دينا يوسف", "Deniz Yıldız"], t3("Massage therapist", "معالجة بالتدليك", "Masaj terapisti")),
  ],
};

const doctor = (name: string, names: [string, string], title: Tri, profile: NonNullable<SampleStaff["profile"]>, services?: string[]): SampleStaff => ({ ...demoStaff(CLINIC_DOCTORS, name, names, title, services), profile });

export const SAMPLE_CLINIC: SampleBookings = {
  currency: "TRY",
  categories: {
    "Family doctor": t3("Family doctor", "طب الأسرة", "Aile hekimi"),
    Dentist: t3("Dentist", "طب الأسنان", "Diş hekimi"),
    Physiotherapy: t3("Physiotherapy", "العلاج الطبيعي", "Fizyoterapi"),
  },
  services: [
    demoService(CLINIC_SERVICES, "General visit", ["كشف عام", "زيارة لطبيب الأسرة لتتحدث عمّا تشعر به وتطرح أسئلتك."], ["Genel Muayene", "Nasıl hissettiğinizi konuşmak ve sorularınızı sormak için aile hekimimizle bir görüşme."]),
    demoService(CLINIC_SERVICES, "Follow-up visit", ["زيارة متابعة", "زيارة قصيرة بعد زيارة سابقة لمتابعة حالتك."], ["Kontrol Muayenesi", "Önceki bir muayeneden sonra gidişatı görmek için kısa bir görüşme."]),
    demoService(CLINIC_SERVICES, "Dental check-up", ["فحص الأسنان", "فحص للأسنان واللثة مع تنظيف."], ["Diş Kontrolü", "Diş ve diş eti kontrolü, temizlikle birlikte."]),
    demoService(CLINIC_SERVICES, "Children's dental visit", ["زيارة أسنان للأطفال", "زيارة أولى هادئة للأطفال، مع وقت للتعرف على طبيب الأسنان."], [
      "Çocuk Diş Muayenesi",
      "Çocuklar için sakin bir ilk ziyaret; diş hekimini tanımaya zaman ayrılır.",
    ]),
    {
      name: t3("Teeth whitening", "تبييض الأسنان", "Diş Beyazlatma"),
      description: t3(
        "A whitening session at the clinic for a brighter smile, after a check that your teeth are ready for it.",
        "جلسة تبييض في العيادة لابتسامة أكثر إشراقًا، بعد التأكد من أن أسنانك جاهزة لها.",
        "Dişlerinizin hazır olduğu kontrol edildikten sonra, daha parlak bir gülüş için klinikte beyazlatma seansı.",
      ),
      category: "Dentist",
      minutes: 60,
      priceCents: 3500_00,
      picture: "visit-dental",
      color: "#4A7FB0",
    },
    demoService(CLINIC_SERVICES, "Physiotherapy session", ["جلسة علاج طبيعي", "جلسة مع أخصائية العلاج الطبيعي، مع تمارين تأخذها معك إلى المنزل."], [
      "Fizyoterapi Seansı",
      "Fizyoterapistimizle bir seans; evde yapmanız için egzersizlerle.",
    ]),
  ],
  staff: [
    doctor("Dr. Ayşe Demir", ["د. هالة منصور", "Dr. Ayşe Demir"], t3("Family doctor", "طبيبة أسرة", "Aile hekimi"), {
      specialties: { en: ["Family medicine", "Visits for children and adults"], ar: ["طب الأسرة", "زيارات للأطفال والكبار"], tr: ["Aile hekimliği", "Çocuk ve yetişkin muayeneleri"] },
      languages: { en: ["Turkish", "English"], ar: ["العربية", "الإنجليزية"], tr: ["Türkçe", "İngilizce"] },
      bio: t3(
        find(CLINIC_DOCTORS, "name", "Dr. Ayşe Demir").bio!,
        "تعمل د. هالة طبيبة أسرة منذ اثني عشر عامًا. تستقبل الكبار والأطفال، وتحرص على أن تمنح كل سؤال وقته.",
        "Ayşe on iki yıldır İstanbul'da aile hekimi. Yetişkin ve çocuk hastalara bakıyor; her soruya zaman ayırmayı seviyor.",
      ),
    }),
    doctor("Dr. Kerem Aksoy", ["د. كريم عزمي", "Dr. Kerem Aksoy"], t3("Dentist", "طبيب أسنان", "Diş hekimi"), {
      specialties: { en: ["General dentistry", "Children's dentistry"], ar: ["طب الأسنان العام", "طب أسنان الأطفال"], tr: ["Genel diş hekimliği", "Çocuk diş hekimliği"] },
      languages: { en: ["Turkish", "English", "German"], ar: ["العربية", "الإنجليزية", "الألمانية"], tr: ["Türkçe", "İngilizce", "Almanca"] },
      bio: t3(
        find(CLINIC_DOCTORS, "name", "Dr. Kerem Aksoy").bio!,
        "درس د. كريم في القاهرة وبرلين. يحب الأطفال زياراته لأنه يريهم كل أداة قبل أن يستخدمها.",
        "Kerem İstanbul ve Berlin'de okudu. Çocuklar onun muayenelerini seviyor, çünkü her aleti kullanmadan önce onlara gösteriyor.",
      ),
    }, ["Dental check-up", "Children's dental visit", "Teeth whitening"]),
    doctor("Leyla Haddad", ["ليلى حداد", "Leyla Haddad"], t3("Physiotherapist", "أخصائية علاج طبيعي", "Fizyoterapist"), {
      specialties: { en: ["Back and neck", "Sports"], ar: ["الظهر والرقبة", "الإصابات الرياضية"], tr: ["Bel ve boyun", "Spor yaralanmaları"] },
      languages: { en: ["Arabic", "English", "Turkish"], ar: ["العربية", "الإنجليزية", "التركية"], tr: ["Arapça", "İngilizce", "Türkçe"] },
      bio: t3(
        find(CLINIC_DOCTORS, "name", "Leyla Haddad").bio!,
        "تعمل ليلى مع أشخاص من كل الأعمار يريدون أن يتحركوا براحة أكبر، من موظفي المكاتب إلى عدّائي عطلة نهاية الأسبوع.",
        "Leyla, ofis çalışanlarından hafta sonu koşucularına kadar her yaştan, daha rahat hareket etmek isteyen insanlarla çalışıyor.",
      ),
    }),
  ],
};

export const SAMPLE_FITNESS: SampleBookings = {
  currency: "TRY",
  categories: {
    Classes: t3("Classes", "الحصص", "Dersler"),
    "Personal training": t3("Personal training", "التدريب الشخصي", "Kişisel antrenman"),
    Recovery: t3("Recovery", "التعافي", "Toparlanma"),
  },
  services: [
    demoService(FITNESS_SERVICES, "Yoga flow", ["يوغا متدفقة", "حصة متدفقة هادئة تناسب كل المستويات، مع وقت للتنفس والإطالة في النهاية."], ["Akış Yogası", "Her seviyeye uygun akıcı bir ders; sonunda nefes ve esneme için zaman."]),
    demoService(FITNESS_SERVICES, "Spin", ["دراجات سبين", "موسيقى وصعود وانطلاقات سريعة على الدراجة. أحضر الماء ومنشفة."], ["Spinning", "Bisiklette müzik, tırmanışlar ve sprintler. Su ve havlu getirin."]),
    demoService(FITNESS_SERVICES, "HIIT", ["تمارين HIIT", "فترات قصيرة من الجهد والراحة، بأثقال الكيتلبل ووزن جسمك."], ["HIIT", "Kettlebell ve kendi vücut ağırlığınızla kısa yüklenme ve dinlenme aralıkları."]),
    demoService(FITNESS_SERVICES, "Mat pilates", ["بيلاتس على البساط", "قوة الجذع والتوازن وتحسين القوام على البساط."], ["Mat Pilates", "Matta merkez kuvveti, denge ve duruş."]),
    demoService(FITNESS_SERVICES, "Personal training", ["تدريب شخصي", "ساعة مع مدرب على ما تريد العمل عليه. يُدفع في النادي."], ["Kişisel Antrenman", "Çalışmak istediğiniz konuda bir antrenörle bir saat. Ödeme stüdyoda."]),
    {
      name: t3("Sports massage", "تدليك رياضي", "Spor Masajı"),
      description: t3(
        "A firm massage for tired legs and shoulders after training, with stretches to keep you moving.",
        "تدليك قوي للساقين والكتفين المتعبين بعد التمرين، مع إطالات تساعدك على مواصلة الحركة.",
        "Antrenman sonrası yorgun bacaklar ve omuzlar için sıkı bir masaj; hareketli kalmanız için esnemelerle.",
      ),
      category: "Recovery",
      minutes: 45,
      priceCents: 900_00,
      picture: "service-massage",
      color: "#3F6E7A",
    },
  ],
  staff: [
    demoStaff(FITNESS_COACHES, "Selin Aydın", ["رهف سليم", "Selin Aydın"], t3("Yoga and pilates coach", "مدربة يوغا وبيلاتس", "Yoga ve pilates eğitmeni")),
    demoStaff(FITNESS_COACHES, "Can Yılmaz", ["خالد عمر", "Can Yılmaz"], t3("Spin and HIIT coach", "مدرب سبين وHIIT", "Spinning ve HIIT eğitmeni")),
    demoStaff(FITNESS_COACHES, "Mira Haddad", ["ميرا حداد", "Mira Haddad"], t3("Strength coach", "مدربة قوة", "Kuvvet antrenörü"), ["HIIT", "Mat pilates", "Sports massage"]),
  ],
};

/** 84.1 Services and companies: cleaning, repairs and moving (no demo of its own). */
export const SAMPLE_SERVICES: SampleBookings = {
  currency: "TRY",
  categories: {
    Cleaning: t3("Cleaning", "التنظيف", "Temizlik"),
    Repairs: t3("Repairs", "الإصلاحات", "Tamir"),
    "Moving & offices": t3("Moving & offices", "النقل والمكاتب", "Taşınma ve ofis"),
  },
  services: [
    {
      name: t3("Home deep cleaning", "تنظيف عميق للمنزل", "Detaylı Ev Temizliği"),
      description: t3(
        "A team of two cleans every room from top to bottom: dusting, floors, bathrooms and the kitchen. We bring the products.",
        "فريق من شخصين ينظف كل غرفة من الأعلى إلى الأسفل: الغبار والأرضيات والحمّامات والمطبخ. نحضر مواد التنظيف معنا.",
        "İki kişilik ekibimiz her odayı baştan sona temizler: toz, zeminler, banyolar ve mutfak. Malzemeleri biz getiriyoruz.",
      ),
      category: "Cleaning",
      minutes: 180,
      priceCents: 2400_00,
      picture: "room-living",
      color: "#2F6F62",
    },
    {
      name: t3("Kitchen cleaning", "تنظيف المطبخ", "Mutfak Temizliği"),
      description: t3(
        "Inside the oven, the fridge and the cupboards, the tiles and the hood, until it shines.",
        "داخل الفرن والثلاجة والخزائن، والبلاط وشفاط المطبخ، حتى يلمع كل شيء.",
        "Fırının, buzdolabının ve dolapların içi, fayanslar ve davlumbaz; pırıl pırıl olana kadar.",
      ),
      category: "Cleaning",
      minutes: 120,
      priceCents: 1500_00,
      picture: "room-kitchen",
      color: "#C98F7A",
    },
    {
      name: t3("Sofa & carpet washing", "غسيل الكنب والسجاد", "Koltuk ve Halı Yıkama"),
      description: t3(
        "Deep washing of sofas, armchairs and carpets at your home, dry in a few hours.",
        "غسيل عميق للكنب والمقاعد والسجاد في منزلك، يجف خلال ساعات قليلة.",
        "Koltuk, berjer ve halılarınız evinizde derinlemesine yıkanır, birkaç saatte kurur.",
      ),
      category: "Cleaning",
      minutes: 90,
      priceCents: 1200_00,
      picture: "room-bedroom",
      color: "#5D6B66",
    },
    {
      name: t3("Plumbing repair", "إصلاح السباكة", "Tesisat Tamiri"),
      description: t3(
        "Leaking taps, blocked drains and a toilet that won't stop running. The price covers the first hour; parts are extra.",
        "صنابير تسرّب وبالوعات مسدودة وخزان لا يتوقف عن الجريان. يشمل السعر الساعة الأولى، وتُحتسب القطع على حدة.",
        "Damlayan musluklar, tıkalı giderler ve durmadan akan rezervuar. Fiyat ilk saati kapsar; parçalar ayrıca ücretlendirilir.",
      ),
      category: "Repairs",
      minutes: 60,
      priceCents: 900_00,
      picture: "home-maadi",
      color: "#2C6A8A",
    },
    {
      name: t3("Electrical check", "فحص الكهرباء", "Elektrik Kontrolü"),
      description: t3(
        "A safety check of your sockets, switches and fuse box, with small repairs on the spot.",
        "فحص سلامة للمقابس والمفاتيح ولوحة الكهرباء، مع إصلاحات صغيرة في المكان.",
        "Prizlerinizin, anahtarlarınızın ve sigorta kutunuzun güvenlik kontrolü; küçük onarımlar yerinde yapılır.",
      ),
      category: "Repairs",
      minutes: 60,
      priceCents: 850_00,
      picture: "home-newcairo",
      color: "#C98A16",
    },
    {
      name: t3("Moving help", "المساعدة في النقل", "Taşınma Yardımı"),
      description: t3(
        "Two movers and a van for half a day: packing, carrying and setting up the furniture again.",
        "عاملا نقل وشاحنة لنصف يوم: التغليف والحمل وإعادة تركيب الأثاث.",
        "Yarım gün için iki taşıyıcı ve bir kamyonet: paketleme, taşıma ve mobilyaların yeniden kurulması.",
      ),
      category: "Moving & offices",
      minutes: 240,
      priceCents: 4500_00,
      picture: "service-express",
      color: "#B5471B",
    },
    {
      name: t3("Office cleaning", "تنظيف المكاتب", "Ofis Temizliği"),
      description: t3(
        "Desks, meeting rooms, the kitchen and the bathrooms, cleaned after hours so work isn't disturbed.",
        "المكاتب وغرف الاجتماعات والمطبخ ودورات المياه، تُنظَّف بعد ساعات العمل حتى لا يتعطل العمل.",
        "Masalar, toplantı odaları, mutfak ve tuvaletler; iş aksamasın diye mesai sonrasında temizlenir.",
      ),
      category: "Moving & offices",
      minutes: 120,
      priceCents: 2000_00,
      picture: "home-zayed",
      color: "#3F3A6B",
    },
  ],
  staff: [
    {
      name: t3("Ahmet Çelik", "أحمد سالم", "Ahmet Çelik"),
      title: t3("Cleaning team lead", "قائد فريق التنظيف", "Temizlik ekibi şefi"),
      picture: "staff-deniz",
      services: ["Home deep cleaning", "Kitchen cleaning", "Sofa & carpet washing", "Office cleaning"],
    },
    { name: t3("Murat Doğan", "مراد حسين", "Murat Doğan"), title: t3("Technician", "فني صيانة", "Teknisyen"), picture: "coach-can", services: ["Plumbing repair", "Electrical check"] },
    { name: t3("Zeynep Kurt", "زينب كريم", "Zeynep Kurt"), title: t3("Moving coordinator", "منسقة النقل", "Taşınma koordinatörü"), picture: "staff-selin", services: ["Moving help", "Office cleaning"] },
  ],
};

// ——— Real estate (10.7) ———

export interface SampleListing extends Omit<DemoListing, "title" | "description" | "city" | "district" | "features"> {
  title: Tri;
  description: Tri;
  city: Tri;
  district: Tri;
  features: Tri[];
}

const PLACES: Record<string, Tri> = {
  Cairo: t3("Cairo", "القاهرة", "Kahire"),
  Giza: t3("Giza", "الجيزة", "Giza"),
  Zamalek: t3("Zamalek", "الزمالك", "Zamalek"),
  Maadi: t3("Maadi", "المعادي", "Maadi"),
  "New Cairo": t3("New Cairo", "القاهرة الجديدة", "Yeni Kahire"),
  "Sheikh Zayed": t3("Sheikh Zayed", "الشيخ زايد", "Şeyh Zayed"),
  Heliopolis: t3("Heliopolis", "مصر الجديدة", "Heliopolis"),
  "Garden City": t3("Garden City", "جاردن سيتي", "Garden City"),
};

const FEATURES: Record<string, Tri> = {
  "Nile view": t3("Nile view", "إطلالة على النيل", "Nil manzarası"),
  Elevator: t3("Elevator", "مصعد", "Asansör"),
  Balcony: t3("Balcony", "شرفة", "Balkon"),
  Doorman: t3("Doorman", "حارس عقار", "Kapıcı"),
  Parking: t3("Parking", "موقف سيارات", "Otopark"),
  Garden: t3("Garden", "حديقة", "Bahçe"),
  "Private parking": t3("Private parking", "موقف خاص", "Özel otopark"),
  "Maid's room": t3("Maid's room", "غرفة خادمة", "Hizmetli odası"),
  Storage: t3("Storage", "مخزن", "Depo"),
  "Quiet street": t3("Quiet street", "شارع هادئ", "Sakin sokak"),
  Furnished: t3("Furnished", "مفروشة", "Eşyalı"),
  "Air conditioning": t3("Air conditioning", "تكييف", "Klima"),
  Gym: t3("Gym", "صالة رياضية", "Spor salonu"),
  Pool: t3("Pool", "مسبح", "Havuz"),
  Security: t3("Security", "حراسة أمنية", "Güvenlik"),
  Internet: t3("Internet", "إنترنت", "İnternet"),
  "Roof terrace": t3("Roof terrace", "سطح خاص", "Çatı terası"),
  "City view": t3("City view", "إطلالة على المدينة", "Şehir manzarası"),
  "High ceilings": t3("High ceilings", "أسقف عالية", "Yüksek tavanlar"),
  "Meeting room": t3("Meeting room", "غرفة اجتماعات", "Toplantı odası"),
};

const place = (name: string) => PLACES[name] ?? (() => { throw new Error(`Sample content: no translation of the place "${name}"`); })();
const feature = (name: string) => FEATURES[name] ?? (() => { throw new Error(`Sample content: no translation of the feature "${name}"`); })();

function demoListing(reference: string, ar: [string, string], tr: [string, string]): SampleListing {
  const seed = find(DEMO_LISTINGS, "reference", reference);
  return {
    ...seed,
    title: t3(seed.title, ar[0], tr[0]),
    description: t3(seed.description, ar[1], tr[1]),
    city: place(seed.city),
    district: place(seed.district),
    features: seed.features.map(feature),
  };
}

export const SAMPLE_LISTINGS: { currency: string; listings: SampleListing[] } = {
  currency: "EGP",
  listings: [
    demoListing("NH-1001", [
      "شقة مشرقة من 3 غرف نوم بإطلالة على النيل",
      "شقة زاوية مشرقة في الطابق السابع بإطلالة واسعة على النيل.\n\nثلاث غرف نوم وحمّامان وصالة واسعة تطل على الشرفة ومطبخ مستقل. موقف سيارات مغطى وحارس على مدار الساعة.",
    ], [
      "Nil manzaralı, aydınlık 3+1 daire",
      "Yedinci katta, Nil'i geniş açıdan gören aydınlık bir köşe daire.\n\nÜç yatak odası, iki banyo, balkona açılan geniş bir salon ve ayrı mutfak. Kapalı otopark ve 24 saat kapıcı.",
    ]),
    demoListing("NH-1002", [
      "فيلا عائلية بحديقة في المعادي",
      "فيلا من طابقين في شارع هادئ تكسوه الخضرة، على بعد خطوات من شارع 9.\n\nخمس غرف نوم وغرفة معيشة للعائلة وحديقة بأشجار كبيرة وموقف لسيارتين.",
    ], [
      "Maadi'de bahçeli aile villası",
      "9. Cadde'ye kısa bir yürüme mesafesinde, sakin ve yeşil bir sokakta iki katlı villa.\n\nBeş yatak odası, aile salonu, yaşlı ağaçlarla dolu bir bahçe ve iki araçlık otopark.",
    ]),
    demoListing("NH-1003", [
      "شقة حديثة من غرفتي نوم للإيجار في القاهرة الجديدة",
      "شقة مفروشة في مجمع سكني مغلق فيه مسبح وصالة رياضية وحراسة أمنية.\n\nغرفتا نوم ومطبخ مفتوح وشرفة تطل على الحديقة. متاحة من الشهر القادم.",
    ], [
      "Yeni Kahire'de kiralık modern 2+1 daire",
      "Havuzu, spor salonu ve güvenliği olan bir sitede eşyalı daire.\n\nİki yatak odası, açık mutfak ve bahçeye bakan bir balkon. Gelecek aydan itibaren boş.",
    ]),
    demoListing("NH-1004", ["استوديو قرب الجامعة في الشيخ زايد", "استوديو مفروش وعملي قريب من الجامعة والمحلات. مثالي لطالب أو لموظف شاب."], [
      "Şeyh Zayed'de üniversiteye yakın stüdyo daire",
      "Üniversiteye ve dükkânlara yakın, kullanışlı, eşyalı bir stüdyo. Bir öğrenci ya da genç bir çalışan için ideal.",
    ]),
    demoListing("NH-1005", [
      "بنتهاوس بسطح خاص في مصر الجديدة",
      "الطابق الأخير في مبنى بحالة ممتازة، مع سطح خاص يطل على مصر الجديدة.\n\nأربع غرف نوم وصالتان ومطبخ يتسع لطاولة.",
    ], [
      "Heliopolis'te çatı teraslı çatı katı",
      "Bakımlı bir binanın en üst katı; Heliopolis'e bakan özel bir çatı terası var.\n\nDört yatak odası, çift salon ve masa sığacak genişlikte bir mutfak.",
    ]),
    demoListing("NH-1006", [
      "شقة كلاسيكية في جاردن سيتي",
      "أسقف عالية ونوافذ طويلة وأرضيات خشبية في مبنى كلاسيكي بشارع تظلله الأشجار. تحتاج إلى بعض التجديد، وسعرها يراعي ذلك.",
    ], [
      "Garden City'de klasik daire",
      "Ağaçlı bir sokaktaki klasik bir binada yüksek tavanlar, uzun pencereler ve ahşap zeminler. Biraz yenileme istiyor; fiyatı da buna göre.",
    ]),
    demoListing("NH-1007", ["طابق مكاتب للإيجار في الزمالك", "طابق مكاتب مفتوح مع غرفة اجتماعات ومطبخ صغير، في شارع هادئ قريب من الطرق الرئيسية."], [
      "Zamalek'te kiralık ofis katı",
      "Toplantı odası ve küçük mutfağı olan açık planlı bir ofis katı; ana yollara yakın, sakin bir sokakta.",
    ]),
  ],
};

// ——— News (23) ———

export interface SampleArticle {
  title: Tri;
  excerpt: Tri;
  body: Tri;
  author: Tri;
  category: string;
  picture: PictureName;
  featured: boolean;
  hoursAgo: number;
}

const AUTHORS: Record<string, Tri> = {
  "Ayla Demir": t3("Ayla Demir", "ليلى ديب", "Ayla Demir"),
  "Kerem Aydın": t3("Kerem Aydın", "كريم عادل", "Kerem Aydın"),
  "Murat Şen": t3("Murat Şen", "مراد شاهين", "Murat Şen"),
  "Selin Kaya": t3("Selin Kaya", "سلمى قاسم", "Selin Kaya"),
  "Deniz Arslan": t3("Deniz Arslan", "دينا الأمين", "Deniz Arslan"),
};

function demoArticle(title: string, category: string, ar: [string, string, string], tr: [string, string, string]): SampleArticle {
  const seed = find(DEMO_ARTICLES, "title", title);
  return {
    title: t3(seed.title, ar[0], tr[0]),
    excerpt: t3(seed.excerpt, ar[1], tr[1]),
    body: t3(seed.body, ar[2], tr[2]),
    author: AUTHORS[seed.author]!,
    category,
    picture: seed.picture,
    featured: seed.featured,
    hoursAgo: seed.hoursAgo,
  };
}

export const SAMPLE_ARTICLES: { categories: Record<string, Tri>; articles: SampleArticle[] } = {
  categories: {
    City: t3("City", "المدينة", "Şehir"),
    Business: t3("Business", "الاقتصاد", "Ekonomi"),
    Culture: t3("Culture", "الثقافة", "Kültür"),
    Sport: t3("Sport", "الرياضة", "Spor"),
  },
  articles: [
    demoArticle("Night ferries return to the harbour from Monday", "City", [
      "عودة العبّارات الليلية إلى الميناء بدءًا من الاثنين",
      "ستعمل العبّارات كل 40 دقيقة حتى الواحدة بعد منتصف الليل في أيام الأسبوع، وحتى الثانية والنصف في عطلة نهاية الأسبوع، وفق شركة العبّارات في المدينة.",
      "<p>تعود العبّارات الليلية عبر الميناء يوم الاثنين بعد توقف دام عامين، كما أعلنت شركة العبّارات في المدينة يوم الثلاثاء.</p><p>ستنطلق العبّارات كل 40 دقيقة حتى الواحدة بعد منتصف الليل في أيام الأسبوع، وحتى الثانية والنصف ليلتي الجمعة والسبت. وتبقى الأجرة كما هي في النهار.</p>",
    ], [
      "Gece vapurları pazartesiden itibaren limana dönüyor",
      "Şehir hatları şirketine göre vapurlar hafta içi 01.00'e, hafta sonu 02.30'a kadar 40 dakikada bir kalkacak.",
      "<p>Limanda gece seferleri iki yıllık aradan sonra pazartesi günü yeniden başlıyor. Şehir hatları şirketi kararı salı günü duyurdu.</p><p>Vapurlar hafta içi 01.00'e, cuma ve cumartesi geceleri 02.30'a kadar 40 dakikada bir kalkacak. Ücretler gündüzle aynı kalıyor.</p>",
    ]),
    demoArticle("Old market hall reopens with forty stalls", "City", [
      "السوق المسقوف القديم يعيد فتح أبوابه بأربعين محلًا",
      "بعد ثمانية عشر شهرًا من الترميم، عاد السوق المسقوف بالفواكه والأسماك والتوابل وصفّ من المطابخ الصغيرة.",
      "<p>أعاد السوق المسقوف في الساحة القديمة فتح أبوابه يوم السبت بعد ثمانية عشر شهرًا من إصلاح سقفه وأرضياته.</p><p>تبيع أربعون محلًا الفواكه والخضار والأسماك والأجبان والتوابل، ويقدّم صفّ جديد من ستة مطابخ صغيرة الفطور والغداء.</p>",
    ], [
      "Eski çarşı binası kırk tezgâhla yeniden açıldı",
      "On sekiz aylık onarımın ardından kapalı çarşı meyve, balık, baharat ve bir sıra küçük mutfakla geri döndü.",
      "<p>Eski meydandaki kapalı çarşı, çatısı ve zeminleri on sekiz ay süren onarımın ardından cumartesi günü kapılarını yeniden açtı.</p><p>Kırk tezgâhta meyve, sebze, balık, peynir ve baharat satılıyor; altı küçük mutfaktan oluşan yeni bir sıra kahvaltı ve öğle yemeği sunuyor.</p>",
    ]),
    demoArticle("Harbour United sign a new coach before the derby", "Sport", [
      "نادي هاربور يونايتد يتعاقد مع مدرب جديد قبل الديربي",
      "عيّن النادي قائده السابق مدربًا أول بعقد لمدة عامين، قبل خمسة أيام من أول ديربي في الموسم.",
      "<p>عيّن نادي هاربور يونايتد قائده السابق مدربًا أول بعقد لمدة عامين، بحسب ما أعلن النادي يوم الأربعاء.</p><p>ويقود المدرب أول حصة تدريبية يوم الخميس، قبل خمسة أيام من الديربي على أرضه.</p>",
    ], [
      "Harbour United derbi öncesi yeni teknik direktörünü açıkladı",
      "Kulüp, sezonun ilk derbisine beş gün kala eski kaptanını iki yıllık sözleşmeyle teknik direktör olarak atadı.",
      "<p>Harbour United, eski kaptanını iki yıllık sözleşmeyle teknik direktörlüğe getirdiğini çarşamba günü açıkladı.</p><p>Yeni hoca ilk antrenmanına perşembe günü çıkacak; iç sahadaki derbiye beş gün var.</p>",
    ]),
    demoArticle("Tram line 3 extends to the university next spring", "City", [
      "خط الترام 3 يمتد إلى الجامعة في الربيع المقبل",
      "ستربط أربع محطات جديدة الواجهة البحرية بالحرم الجامعي، وتبدأ أعمال القضبان في نوفمبر.",
      "<p>سيصل خط الترام 3 إلى الحرم الجامعي بدءًا من الربيع المقبل، مع أربع محطات جديدة بين الواجهة البحرية والبوابة الرئيسية.</p><p>تبدأ أعمال القضبان في نوفمبر، وستحل الحافلات محل الترام في آخر محطتين خلال عطلات نهاية الأسبوع طوال مدة الأعمال.</p>",
    ], [
      "3 numaralı tramvay hattı gelecek bahar üniversiteye uzanıyor",
      "Dört yeni durak sahili kampüse bağlayacak. Ray çalışmaları kasımda başlıyor.",
      "<p>3 numaralı tramvay hattı gelecek bahardan itibaren üniversite kampüsüne kadar uzanacak; sahil ile ana kapı arasına dört yeni durak ekleniyor.</p><p>Ray çalışmaları kasımda başlıyor. Çalışmalar sürerken hafta sonları hattın son iki durağında tramvay yerine otobüs çalışacak.</p>",
    ]),
    demoArticle("Small shops hire more people this autumn", "Business", [
      "المتاجر الصغيرة توظف المزيد هذا الخريف",
      "وجد استطلاع شمل 300 من الأعمال المحلية أن معظمها يخطط للتوظيف قبل نهاية العام، خاصة في الطعام والإصلاحات.",
      "<p>تخطط ستة من كل عشرة أعمال صغيرة في المدينة لتوظيف شخص واحد على الأقل قبل نهاية العام، بحسب استطلاع أجرته الغرفة التجارية.</p><p>كانت المقاهي والمخابز وورش الإصلاح الأكثر رغبة في التوظيف، وتبقى الإيجارات وأسعار الطاقة أكبر هموم أصحابها.</p>",
    ], [
      "Küçük dükkânlar bu sonbahar daha çok eleman alıyor",
      "300 yerel işletmeyle yapılan bir anket, çoğunun yıl sonundan önce, özellikle yiyecek ve tamir işlerinde eleman almayı planladığını gösterdi.",
      "<p>Ticaret odasının anketine göre şehirdeki her on küçük işletmeden altısı yıl sonundan önce en az bir kişiyi işe almayı planlıyor.</p><p>Eleman arayanların başında kafeler, fırınlar ve tamirciler geliyor. Kiralar ve enerji fiyatları işletme sahiplerinin en büyük kaygısı olmaya devam ediyor.</p>",
    ]),
    demoArticle("Five books to read on the ferry this month", "Culture", [
      "خمسة كتب تقرؤها على العبّارة هذا الشهر",
      "روايات قصيرة، وكتاب مقالات عن البحر، وكتاب طبخ ستقرؤه من الغلاف إلى الغلاف.",
      "<p>تستغرق الرحلة عشرين دقيقة: وقت يكفي لفصل كامل، وقصير بما يكفي لتشتاق إلى العودة إليه. إليك اختيارات محررينا لهذا الشهر.</p><ul><li><strong>رواية صيفية</strong> تدور في ثلاث جزر</li><li><strong>مقالات عن البحر</strong>، مقال لكل رحلة</li><li><strong>كتاب طبخ</strong> من أكشاك السوق</li></ul>",
    ], [
      "Bu ay vapurda okunacak beş kitap",
      "Kısa romanlar, deniz üzerine bir deneme kitabı ve baştan sona okumak isteyeceğiniz bir yemek kitabı.",
      "<p>Karşıya geçmek yirmi dakika sürüyor: bir bölüm için yeterince uzun, ona geri dönmek isteyecek kadar kısa. İşte editörlerimizin bu ayki seçimleri.</p><ul><li>Üç adada geçen <strong>bir yaz romanı</strong></li><li>Her yolculuğa bir tane, <strong>deniz üzerine denemeler</strong></li><li>Çarşının tezgâhlarından <strong>bir yemek kitabı</strong></li></ul>",
    ]),
    demoArticle("Jazz on the pier every Thursday in October", "Culture", [
      "جاز على الرصيف كل خميس في أكتوبر",
      "حفلات مسائية مجانية لفرق محلية، من السابعة والنصف على الرصيف القديم. أحضر سترة.",
      "<p>تقدّم فرق جاز محلية حفلات مجانية على الرصيف القديم كل مساء خميس في أكتوبر، ابتداءً من السابعة والنصف.</p><p>توجد بعض المقاعد، لكن أغلب الحضور يأتون ببطانية. ويبقى المقهى في آخر الرصيف مفتوحًا حتى آخر أغنية.</p>",
    ], [
      "Ekim boyunca her perşembe iskelede caz",
      "Yerel gruplardan ücretsiz akşam konserleri; 19.30'dan itibaren eski iskelede. Yanınıza bir ceket alın.",
      "<p>Yerel caz grupları ekim ayı boyunca her perşembe akşamı 19.30'dan itibaren eski iskelede ücretsiz konser veriyor.</p><p>Birkaç bank var ama çoğu kişi yanında battaniye getiriyor. İskelenin ucundaki kafe son şarkıya kadar açık.</p>",
    ]),
    demoArticle("Harbour United win at home with a late goal", "Sport", [
      "هاربور يونايتد يفوز على أرضه بهدف متأخر",
      "منحت ضربة رأس في الدقيقة 89 أصحاب الأرض فوزهم الثالث على التوالي.",
      "<p>تغلّب هاربور يونايتد على ضيفه 2–1 يوم الأحد بضربة رأس في الدقيقة 89، محققًا فوزه الثالث على التوالي.</p><p>كان الضيوف قد أدركوا التعادل بعد الاستراحة مباشرة، قبل أن يسجّل المهاجم الشاب هدف الفوز من ركلة ركنية.</p>",
    ], [
      "Harbour United geç gelen golle evinde kazandı",
      "89. dakikada gelen kafa golü ev sahibine üst üste üçüncü galibiyetini getirdi.",
      "<p>Harbour United pazar günü konuk ettiği rakibini 89. dakikada attığı kafa golüyle 2–1 yendi ve üst üste üçüncü galibiyetini aldı.</p><p>Konuk ekip ikinci yarının hemen başında eşitliği yakalamıştı. Ev sahibinin genç forveti galibiyet golünü bir korner sonrası attı.</p>",
    ]),
  ],
};

// ——— Events (28) ———

export interface SampleVenue {
  name: Tri;
  address: string;
  latitude: number;
  longitude: number;
}

export interface SampleEvent {
  title: Tri;
  description: Tri;
  category: string;
  picture: PictureName;
  daysAhead: number;
  start: string;
  minutes: number;
  venue: SampleVenue | null;
  onlineUrl: string | null;
  capacity: number | null;
  ticketTypes: { name: Tri; priceCents: number; capacity: number | null; maxPerOrder: number }[];
}

const VENUES: Record<string, SampleVenue> = {
  "Kuzey Culture Centre, Main Hall": { name: t3("Kuzey Culture Centre, Main Hall", "مركز الشمال الثقافي، القاعة الرئيسية", "Kuzey Kültür Merkezi, Ana Salon"), address: "Moda Cd. 120, Kadıköy, İstanbul", latitude: 40.9837, longitude: 29.0262 },
  "Kuzey Culture Centre, Studio 2": { name: t3("Kuzey Culture Centre, Studio 2", "مركز الشمال الثقافي، الاستوديو 2", "Kuzey Kültür Merkezi, Stüdyo 2"), address: "Moda Cd. 120, Kadıköy, İstanbul", latitude: 40.9837, longitude: 29.0262 },
  "Kuzey Culture Centre, Garden": { name: t3("Kuzey Culture Centre, Garden", "مركز الشمال الثقافي، الحديقة", "Kuzey Kültür Merkezi, Bahçe"), address: "Moda Cd. 120, Kadıköy, İstanbul", latitude: 40.9837, longitude: 29.0262 },
};

const TICKETS: Record<string, Tri> = {
  Standard: t3("Standard", "عادية", "Standart"),
  "Front rows": t3("Front rows", "الصفوف الأمامية", "Ön sıralar"),
  "Free seat": t3("Free seat", "مقعد مجاني", "Ücretsiz koltuk"),
  "Workshop place": t3("Workshop place", "مكان في الورشة", "Atölye yeri"),
  "Free online seat": t3("Free online seat", "مقعد مجاني عبر الإنترنت", "Ücretsiz çevrimiçi yer"),
  "Online place": t3("Online place", "مكان عبر الإنترنت", "Çevrimiçi yer"),
};

function demoEvent(title: string, ar: [string, string], tr: [string, string]): SampleEvent {
  const seed = find(DEMO_EVENTS, "title", title);
  return {
    title: t3(seed.title, ar[0], tr[0]),
    description: t3(seed.description, ar[1], tr[1]),
    category: seed.category,
    picture: seed.picture,
    daysAhead: seed.daysAhead,
    start: seed.start,
    minutes: seed.minutes,
    venue: seed.venue ? VENUES[seed.venue.name]! : null,
    onlineUrl: seed.onlineUrl,
    capacity: seed.capacity,
    ticketTypes: seed.ticketTypes.map((t) => ({ name: TICKETS[t.name]!, priceCents: t.priceCents, capacity: t.capacity, maxPerOrder: t.maxPerOrder })),
  };
}

export const SAMPLE_EVENTS: { currency: CatalogCurrency; categories: Record<string, Tri>; events: SampleEvent[] } = {
  currency: "TRY",
  categories: {
    Concerts: t3("Concerts", "حفلات موسيقية", "Konserler"),
    Film: t3("Film", "أفلام", "Film"),
    Workshops: t3("Workshops", "ورش عمل", "Atölyeler"),
    Talks: t3("Talks", "ندوات", "Söyleşiler"),
  },
  events: [
    demoEvent("Autumn Jazz Night", [
      "ليلة جاز خريفية",
      "<p>رباعي من مشهد الجاز في المدينة يعزف المقطوعات الكلاسيكية وأعماله الخاصة في القاعة الرئيسية، مع استراحة قصيرة في المنتصف.</p><ul><li>تُفتح الأبواب في الثامنة مساءً</li><li>المقهى مفتوح قبل الحفل وأثناء الاستراحة</li></ul>",
    ], [
      "Sonbahar Caz Gecesi",
      "<p>Şehrin caz sahnesinden bir dörtlü, Ana Salon'da standartları ve kendi bestelerini çalıyor; ortada kısa bir ara var.</p><ul><li>Kapılar 20.00'de açılır</li><li>Kafe konser öncesinde ve arada açık</li></ul>",
    ]),
    demoEvent("Film Club: harbour classics", [
      "نادي السينما: كلاسيكيات الميناء",
      "<p>فيلم قديم بالأبيض والأسود تدور أحداثه على الواجهة البحرية، مع حديث قصير قبله وشاي بعده. الدخول مجاني للجميع؛ احجز تذكرة لنحفظ لك مقعدًا.</p>",
    ], [
      "Film Kulübü: Liman Klasikleri",
      "<p>Sahilde geçen eski bir siyah beyaz film; öncesinde kısa bir sohbet, sonrasında çay. Herkese ücretsiz; size yer ayırabilmemiz için bilet alın.</p>",
    ]),
    demoEvent("Ceramics for beginners", [
      "الخزف للمبتدئين",
      "<p>اصنع أول وعاء لك على الدولاب مع خزّاف من الحي. الطين والأدوات والمريلة مشمولة، ونحرق الوعاء في الفرن لتستلمه بعد أسبوع.</p>",
    ], [
      "Yeni Başlayanlar için Seramik",
      "<p>Mahalleden bir çömlekçiyle çarkta ilk kâsenizi yapın. Çamur, aletler ve önlük dahil; kâsenizi fırınlıyoruz, bir hafta sonra alıyorsunuz.</p>",
    ]),
    demoEvent("Online talk: writing about your city", [
      "ندوة عبر الإنترنت: الكتابة عن مدينتك",
      "<p>كاتبان من المدينة يتحدثان عن تحويل الشوارع والعبّارات والجيران إلى قصص، ويجيبان عن أسئلتكم. رابط الانضمام في تذكرتك.</p>",
    ], [
      "Çevrimiçi söyleşi: Şehriniz hakkında yazmak",
      "<p>İki yerel yazar sokakları, vapurları ve komşuları öykülere dönüştürmeyi anlatıyor ve sorularınızı yanıtlıyor. Katılım bağlantısı biletinizde.</p>",
    ]),
    demoEvent("Online masterclass: the city at night", [
      "درس متقدم عبر الإنترنت: المدينة ليلًا",
      "<p>مصوّرة تشرح كيف تلتقط صور المدينة بعد حلول الظلام بهاتف أو بكاميرا صغيرة، ثم تعلّق على صور يرسلها المشاركون.</p>",
    ], [
      "Çevrimiçi ustalık sınıfı: Gece şehir",
      "<p>Bir fotoğrafçı, hava karardıktan sonra şehri bir telefonla ya da küçük bir fotoğraf makinesiyle nasıl çektiğini gösteriyor, ardından katılımcıların gönderdiği fotoğraflara bakıyor.</p>",
    ]),
    {
      title: t3("Acoustic evening in the garden", "أمسية موسيقية في الحديقة", "Bahçede Akustik Akşam"),
      description: t3(
        "<p>A singer and two guitars play folk songs from around the Mediterranean in the centre's garden. Bring a cushion; tea and lemonade are on sale.</p>",
        "<p>مغنية وعازفا جيتار يقدّمون أغاني شعبية من حول البحر المتوسط في حديقة المركز. أحضر وسادة؛ الشاي والليموناضة متوفران للبيع.</p>",
        "<p>Bir şarkıcı ve iki gitarist, merkezin bahçesinde Akdeniz'in dört bir yanından halk şarkıları çalıyor. Bir minder getirin; çay ve limonata satışta.</p>",
      ),
      category: "Concerts",
      picture: "event-jazz",
      daysAhead: 12,
      start: "19:30",
      minutes: 90,
      venue: VENUES["Kuzey Culture Centre, Garden"]!,
      onlineUrl: null,
      capacity: 120,
      ticketTypes: [{ name: TICKETS.Standard!, priceCents: 250_00, capacity: null, maxPerOrder: 6 }],
    },
  ],
};

// ——— Charity & donations (29) ———

export interface SampleCampaign {
  title: Tri;
  summary: Tri;
  story: Tri;
  pictures: PictureName[];
  goalCents: number;
  raisedCents: number;
  donorCount: number;
  presetCents: number[];
  minCents: number;
  endsInDays: number;
  featured: boolean;
}

export const SAMPLE_CAMPAIGNS: { currency: CatalogCurrency; campaigns: SampleCampaign[] } = {
  currency: "TRY",
  campaigns: [
    {
      title: t3("Winter food parcels", "طرود غذائية للشتاء", "Kış Gıda Kolileri"),
      summary: t3(
        "A parcel of rice, lentils, oil, flour and tea feeds a family of four for two weeks. Help us pack 1,000 before the cold comes.",
        "طرد من الأرز والعدس والزيت والدقيق والشاي يطعم أسرة من أربعة أفراد لأسبوعين. ساعدنا على تجهيز 1,000 طرد قبل أن يشتد البرد.",
        "Pirinç, mercimek, yağ, un ve çaydan oluşan bir koli dört kişilik bir aileyi iki hafta doyurur. Soğuklar gelmeden 1.000 koli hazırlamamıza yardım edin.",
      ),
      story: t3(
        "<p>Every winter, more families come to our centres than in the rest of the year together. Heating bills go up, seasonal work stops, and the first thing families cut is food.</p><p>Each parcel holds rice, lentils, sunflower oil, flour, tea, sugar, pasta and tomato paste.</p>",
        "<p>في كل شتاء يقصد مراكزنا من الأسر أكثر مما يقصدها في بقية العام. ترتفع فواتير التدفئة ويتوقف العمل الموسمي، وأول ما تقتصد فيه الأسر هو الطعام.</p><p>يحتوي كل طرد على الأرز والعدس وزيت دوار الشمس والدقيق والشاي والسكر والمعكرونة ومعجون الطماطم.</p>",
        "<p>Her kış merkezlerimize yılın geri kalanından daha fazla aile geliyor. Isınma faturaları artıyor, mevsimlik işler duruyor ve ailelerin ilk kıstığı şey yemek oluyor.</p><p>Her kolide pirinç, mercimek, ayçiçek yağı, un, çay, şeker, makarna ve salça var.</p>",
      ),
      pictures: ["campaign-parcels", "campaign-volunteers"],
      goalCents: 250_000_00,
      raisedCents: 168_450_00,
      donorCount: 412,
      presetCents: [150_00, 300_00, 600_00, 1200_00],
      minCents: 50_00,
      endsInDays: 40,
      featured: true,
    },
    {
      title: t3("School lunches for 200 children", "وجبات غداء مدرسية لـ200 طفل", "200 Çocuğa Okul Yemeği"),
      summary: t3(
        "A hot lunch every school day for children whose families can't pack one.",
        "وجبة غداء ساخنة في كل يوم دراسي لأطفال لا تستطيع أسرهم أن تعدّ لهم واحدة.",
        "Ailesi beslenme çantası hazırlayamayan çocuklara her okul günü sıcak bir öğle yemeği.",
      ),
      story: t3(
        "<p>Teachers at two primary schools told us the same thing: some children come to school without breakfast and have nothing for lunch.</p><p>With the schools' kitchens, we serve a hot lunch every school day: soup, a main dish with bread, and fruit.</p>",
        "<p>أخبرنا معلمون في مدرستين ابتدائيتين بالأمر نفسه: بعض الأطفال يأتون إلى المدرسة دون فطور ولا يحملون شيئًا للغداء.</p><p>بالتعاون مع مطبخَي المدرستين نقدّم وجبة غداء ساخنة في كل يوم دراسي: شوربة وطبقًا رئيسيًا مع الخبز وفاكهة.</p>",
        "<p>İki ilkokulun öğretmenleri bize aynı şeyi söyledi: bazı çocuklar okula kahvaltı etmeden geliyor ve öğle yemeği için yanlarında hiçbir şey olmuyor.</p><p>Okulların mutfaklarıyla birlikte her okul günü sıcak bir öğle yemeği veriyoruz: çorba, ekmekle bir ana yemek ve meyve.</p>",
      ),
      pictures: ["campaign-lunch"],
      goalCents: 120_000_00,
      raisedCents: 37_800_00,
      donorCount: 96,
      presetCents: [75_00, 375_00, 1500_00],
      minCents: 25_00,
      endsInDays: 75,
      featured: false,
    },
    {
      title: t3("Warm coats for children", "معاطف دافئة للأطفال", "Çocuklara Sıcak Mont"),
      summary: t3(
        "A warm coat, a hat and gloves for every child in our after-school clubs before the first snow.",
        "معطف دافئ وقبعة وقفازان لكل طفل في نوادينا بعد المدرسة قبل أول ثلج.",
        "İlk kardan önce okul sonrası kulüplerimizdeki her çocuğa sıcak bir mont, bere ve eldiven.",
      ),
      story: t3(
        "<p>Many of the children in our after-school clubs walk to school in thin jackets. We buy coats in the right sizes from local shops and hand them out with the parents.</p>",
        "<p>كثير من الأطفال في نوادينا بعد المدرسة يمشون إلى المدرسة بسترات خفيفة. نشتري المعاطف بالمقاسات المناسبة من متاجر محلية ونوزعها بحضور الأهل.</p>",
        "<p>Okul sonrası kulüplerimizdeki çocukların çoğu okula ince ceketlerle yürüyor. Montları doğru bedenlerde yerel mağazalardan alıyor, velilerle birlikte dağıtıyoruz.</p>",
      ),
      pictures: ["campaign-volunteers"],
      goalCents: 90_000_00,
      raisedCents: 21_400_00,
      donorCount: 58,
      presetCents: [250_00, 500_00, 1000_00],
      minCents: 50_00,
      endsInDays: 50,
      featured: false,
    },
    {
      title: t3("Books for village schools", "كتب لمدارس القرى", "Köy Okullarına Kitap"),
      summary: t3(
        "Fill the shelves of six village school libraries with storybooks, atlases and dictionaries.",
        "املأ رفوف مكتبات ست مدارس قروية بكتب القصص والأطالس والقواميس.",
        "Altı köy okulunun kütüphane raflarını öykü kitapları, atlaslar ve sözlüklerle doldurun.",
      ),
      story: t3(
        "<p>The village schools near the city have a room for a library but almost no books. Each shelf we fill holds about sixty books chosen with the teachers.</p>",
        "<p>لدى مدارس القرى القريبة من المدينة غرفة للمكتبة لكن لا كتب فيها تقريبًا. يتسع كل رف نملؤه لنحو ستين كتابًا نختارها مع المعلمين.</p>",
        "<p>Şehre yakın köy okullarının kütüphane için bir odası var ama neredeyse hiç kitabı yok. Doldurduğumuz her rafa öğretmenlerle birlikte seçtiğimiz altmış kadar kitap giriyor.</p>",
      ),
      pictures: ["article-books"],
      goalCents: 60_000_00,
      raisedCents: 44_200_00,
      donorCount: 131,
      presetCents: [100_00, 250_00, 500_00],
      minCents: 25_00,
      endsInDays: 30,
      featured: false,
    },
    {
      title: t3("Food baskets for the holidays", "سلال غذائية للأعياد", "Bayram Gıda Paketleri"),
      summary: t3(
        "A basket of dates, rice, oil, sugar and tea for families to share at the holiday table.",
        "سلة من التمر والأرز والزيت والسكر والشاي تتشاركها الأسر على مائدة العيد.",
        "Ailelerin bayram sofrasında paylaşması için hurma, pirinç, yağ, şeker ve çaydan oluşan bir paket.",
      ),
      story: t3(
        "<p>Our volunteers pack the baskets in the week before the holiday and deliver them with a card from the people who gave.</p>",
        "<p>يجهّز متطوعونا السلال في الأسبوع الذي يسبق العيد ويوصلونها مع بطاقة من المتبرعين.</p>",
        "<p>Gönüllülerimiz paketleri bayramdan önceki hafta hazırlıyor ve bağışçılardan bir kartla birlikte teslim ediyor.</p>",
      ),
      pictures: ["campaign-parcels"],
      goalCents: 300_000_00,
      raisedCents: 96_000_00,
      donorCount: 240,
      presetCents: [400_00, 800_00, 1600_00],
      minCents: 50_00,
      endsInDays: 60,
      featured: true,
    },
    {
      title: t3("Clean water for families", "مياه نظيفة للأسر", "Ailelere Temiz Su"),
      summary: t3(
        "Water filters for homes that don't have safe drinking water, fitted and checked by our team.",
        "فلاتر مياه للمنازل التي لا تصلها مياه شرب آمنة، يركّبها فريقنا ويتابعها.",
        "Güvenli içme suyu olmayan evlere ekibimizin taktığı ve kontrol ettiği su filtreleri.",
      ),
      story: t3(
        "<p>One filter gives a family clean drinking water for a year. We fit it, show how to change the cartridge and come back after six months.</p>",
        "<p>يوفّر فلتر واحد لأسرة مياه شرب نظيفة لمدة عام. نركّبه ونشرح كيف تُبدَّل الخرطوشة ونعود بعد ستة أشهر.</p>",
        "<p>Bir filtre bir aileye bir yıl boyunca temiz içme suyu sağlıyor. Filtreyi takıyor, kartuşun nasıl değiştirileceğini gösteriyor ve altı ay sonra yeniden geliyoruz.</p>",
      ),
      pictures: ["banner-charity"],
      goalCents: 150_000_00,
      raisedCents: 12_000_00,
      donorCount: 33,
      presetCents: [200_00, 500_00, 1000_00],
      minCents: 50_00,
      endsInDays: 90,
      featured: false,
    },
  ],
};

// ——— Studio's own: delivery (104), food (105.1), rides (105.2), school (105.4) ———

export interface SampleDeliveryService {
  name: Tri;
  description: Tri;
  eta: Tri;
  extraCents: number;
  picture: PictureName;
}

function demoDelivery(name: string, ar: [string, string, string], tr: [string, string, string]): SampleDeliveryService {
  const seed = find(DEMO_DELIVERY_SERVICES, "name", name);
  return { name: t3(seed.name, ar[0], tr[0]), description: t3(seed.description, ar[1], tr[1]), eta: t3(seed.eta, ar[2], tr[2]), extraCents: seed.extraCents, picture: seed.picture };
}

/** A delivery company's services: settings it needs anyway, marked as samples like the rest. */
export const SAMPLE_DELIVERY_SERVICES: { currency: CatalogCurrency; services: SampleDeliveryService[] } = {
  currency: "EGP",
  services: [
    demoDelivery("Same day", ["في اليوم نفسه", "يُستلم خلال ساعة، ويُسلَّم قبل العاشرة مساءً.", "خلال 6 ساعات"], ["Aynı gün", "Bir saat içinde alınır, saat 22.00'den önce teslim edilir.", "6 saat içinde"]),
    demoDelivery("Express", ["سريع", "من نقطة الاستلام إلى التسليم مباشرة، دون توقف.", "خلال ساعتين"], ["Ekspres", "Alındığı yerden teslim adresine doğrudan, başka durak olmadan.", "2 saat içinde"]),
    demoDelivery("Documents", ["مستندات", "أوراق وأظرف، تُسلَّم بتوقيع عند الباب.", "خلال 4 ساعات"], ["Evrak", "Evrak ve zarflar, kapıda imzayla teslim edilir.", "4 saat içinde"]),
  ],
};

export interface SampleDish {
  name: Tri;
  description: Tri;
  priceCents: number;
  picture: PictureName;
  popular?: boolean;
  choices?: { name: Tri; min: number; max: number; options: [Tri, number][] };
}

export interface SampleRestaurant {
  name: Tri;
  description: Tri;
  cuisines: string[];
  address: Tri;
  prepMinutes: number;
  minOrderCents: number;
  logo: PictureName;
  sections: { name: Tri; dishes: SampleDish[] }[];
}

const MEAL = {
  Mains: t3("Mains", "الأطباق الرئيسية", "Ana yemekler"),
  Desserts: t3("Desserts", "الحلويات", "Tatlılar"),
  Grills: t3("Grills", "المشويات", "Izgaralar"),
  Drinks: t3("Drinks", "المشروبات", "İçecekler"),
  Pizza: t3("Pizza", "البيتزا", "Pizza"),
  Breakfast: t3("Breakfast", "الفطور", "Kahvaltı"),
  Coffee: t3("Coffee", "القهوة", "Kahve"),
  Burgers: t3("Burgers", "البرجر", "Burgerler"),
  Sides: t3("Sides", "الأطباق الجانبية", "Yan ürünler"),
};

const SIZE = t3("Size", "الحجم", "Boy");
const REGULAR = t3("Regular", "عادي", "Normal");
const LARGE = t3("Large", "كبير", "Büyük");
const MEDIUM = t3("Medium", "وسط", "Orta");

/** Food delivery from several restaurants: the demo's three and three more, each with a short menu. */
export const SAMPLE_RESTAURANTS: { currency: CatalogCurrency; cuisines: Record<string, Tri>; restaurants: SampleRestaurant[] } = {
  currency: "EGP",
  cuisines: {
    egyptian: t3("Egyptian", "مصري", "Mısır mutfağı"),
    grill: t3("Grill", "مشويات", "Izgara"),
    pizza: t3("Pizza", "بيتزا", "Pizza"),
    desserts: t3("Desserts", "حلويات", "Tatlılar"),
    cafe: t3("Café", "مقهى", "Kafe"),
  },
  restaurants: [
    {
      name: t3(DEMO_RESTAURANTS[0]!.name, "بيت الكشري", "Bayt El Koshary"),
      description: t3(DEMO_RESTAURANTS[0]!.description, "كشري وساندويتشات كبدة وأرز باللبن، كما تُصنع في البيت.", "Koşari, ciğer sandviçi ve sütlaç; evde yapıldığı gibi."),
      cuisines: ["egyptian", "desserts"],
      address: t3(DEMO_RESTAURANTS[0]!.address, "14 شارع شريف، وسط القاهرة", "Şerif Caddesi 14, Kahire Merkez"),
      prepMinutes: 15,
      minOrderCents: 50_00,
      logo: "dish-soup",
      sections: [
        {
          name: MEAL.Mains,
          dishes: [
            {
              name: t3("Koshary", "كشري", "Koşari"),
              description: t3("Rice, lentils, pasta, chickpeas, crispy onions and spicy tomato sauce.", "أرز وعدس ومكرونة وحمص وبصل مقرمش وصلصة طماطم حارة.", "Pirinç, mercimek, makarna, nohut, çıtır soğan ve acı domates sosu."),
              priceCents: 55_00,
              picture: "dish-soup",
              popular: true,
              choices: { name: SIZE, min: 1, max: 1, options: [[REGULAR, 0], [LARGE, 20_00]] },
            },
            { name: t3("Liver sandwich", "ساندويتش كبدة", "Ciğer sandviçi"), description: t3("Alexandrian liver with chili and garlic, in a baladi bread.", "كبدة إسكندراني بالفلفل الحار والثوم في عيش بلدي.", "Biber ve sarımsaklı İskenderiye usulü ciğer, köy ekmeğinde."), priceCents: 35_00, picture: "dish-wrap" },
            { name: t3("Lentil soup", "شوربة عدس", "Mercimek çorbası"), description: t3("With lemon and crispy bread.", "بالليمون والعيش المحمص.", "Limon ve kıtır ekmekle."), priceCents: 30_00, picture: "dish-soup" },
          ],
        },
        { name: MEAL.Desserts, dishes: [{ name: t3("Rice pudding", "أرز باللبن", "Fırın sütlaç"), description: t3("Baked, with nuts on top.", "في الفرن، بالمكسرات على الوجه.", "Fırında, üzeri cevizli."), priceCents: 25_00, picture: "dish-cheesecake" }] },
      ],
    },
    {
      name: t3(DEMO_RESTAURANTS[1]!.name, "مشويات الصحراء", "Sahara Grill"),
      description: t3(DEMO_RESTAURANTS[1]!.description, "كفتة ودجاج ومشويات مشكلة على الفحم، مع السلطات والطحينة.", "Közde köfte, tavuk ve karışık ızgara; salatalar ve tahinle."),
      cuisines: ["grill"],
      address: t3(DEMO_RESTAURANTS[1]!.address, "52 شارع مصدق، الدقي", "Mosaddak Caddesi 52, Dokki"),
      prepMinutes: 25,
      minOrderCents: 100_00,
      logo: "dish-burger",
      sections: [
        {
          name: MEAL.Grills,
          dishes: [
            {
              name: t3("Mixed grill", "مشويات مشكلة", "Karışık ızgara"),
              description: t3("Kofta, chicken and lamb chops, with rice and salads.", "كفتة ودجاج وريش ضاني، مع الأرز والسلطات.", "Köfte, tavuk ve kuzu pirzola; pilav ve salatalarla."),
              priceCents: 240_00,
              picture: "dish-burger",
              popular: true,
              choices: {
                name: t3("Sides", "الأطباق الجانبية", "Yanında"),
                min: 0,
                max: 2,
                options: [[t3("Extra tahini", "طحينة إضافية", "Ekstra tahin"), 10_00], [t3("Grilled vegetables", "خضار مشوية", "Izgara sebze"), 25_00], [t3("Fries", "بطاطس مقلية", "Patates kızartması"), 20_00]],
              },
            },
            { name: t3("Kofta wrap", "راب كفتة", "Köfte dürüm"), description: t3("Kofta with onions and parsley in a warm wrap.", "كفتة بالبصل والبقدونس في خبز دافئ.", "Soğan ve maydanozlu köfte, sıcak dürümde."), priceCents: 85_00, picture: "dish-wrap" },
            { name: t3("Chicken shish", "شيش طاووق", "Tavuk şiş"), description: t3("Marinated chicken skewers with garlic sauce.", "أسياخ دجاج متبل مع صوص الثوم.", "Sarımsak soslu, marine edilmiş tavuk şiş."), priceCents: 150_00, picture: "dish-breakfast" },
          ],
        },
        { name: MEAL.Drinks, dishes: [{ name: t3("Fresh lemonade", "ليمون فريش", "Taze limonata"), description: t3("With mint.", "بالنعناع.", "Naneli."), priceCents: 35_00, picture: "drink-juice" }] },
      ],
    },
    {
      name: t3(DEMO_RESTAURANTS[2]!.name, "فورنو الزمالك", "Forno Zamalek"),
      description: t3(DEMO_RESTAURANTS[2]!.description, "بيتزا في فرن الحجر وفطير وقطعة من شيء حلو.", "Taş fırında pizza, fatayer ve tatlı bir şeyler."),
      cuisines: ["pizza", "desserts"],
      address: t3(DEMO_RESTAURANTS[2]!.address, "9 شارع البرازيل، الزمالك", "Brezilya Caddesi 9, Zamalek"),
      prepMinutes: 20,
      minOrderCents: 80_00,
      logo: "dish-cheesecake",
      sections: [
        {
          name: MEAL.Pizza,
          dishes: [
            {
              name: t3("Margherita", "مارغريتا", "Margarita"),
              description: t3("Tomato, mozzarella and basil.", "طماطم وموتزاريلا وريحان.", "Domates, mozzarella ve fesleğen."),
              priceCents: 140_00,
              picture: "dish-breakfast",
              popular: true,
              choices: { name: SIZE, min: 1, max: 1, options: [[MEDIUM, 0], [LARGE, 40_00]] },
            },
            { name: t3("Sweet feteer", "فطير حلو", "Tatlı fatayer"), description: t3("Flaky pastry with honey and cream.", "فطير مشلتت بالعسل والقشطة.", "Bal ve kaymaklı kat kat hamur."), priceCents: 95_00, picture: "dish-simit" },
          ],
        },
        { name: MEAL.Desserts, dishes: [{ name: t3("Basbousa", "بسبوسة", "Revani"), description: t3("Semolina cake with syrup.", "كيكة السميد بالشربات.", "Şerbetli irmik tatlısı."), priceCents: 45_00, picture: "dish-baklava" }] },
      ],
    },
    {
      name: t3("Corniche Café", "مقهى الكورنيش", "Corniche Kafe"),
      description: t3("Coffee, cold drinks and cakes by the river, delivered while they're still cold or hot.", "قهوة ومشروبات باردة وكعك على ضفاف النهر، تصلك كما خرجت: باردة أو ساخنة.", "Nehir kenarından kahve, soğuk içecekler ve kekler; soğuğu soğuk, sıcağı sıcak gelir."),
      cuisines: ["cafe", "desserts"],
      address: t3("3 Corniche El Nil, Garden City", "3 كورنيش النيل، جاردن سيتي", "Corniche El Nil 3, Garden City"),
      prepMinutes: 10,
      minOrderCents: 60_00,
      logo: "drink-latte",
      sections: [
        {
          name: MEAL.Coffee,
          dishes: [
            { name: t3("Iced latte", "لاتيه مثلج", "Buzlu latte"), description: t3("A double shot over ice with cold milk.", "جرعتان من الإسبريسو على الثلج مع حليب بارد.", "Buzun üzerine duble espresso ve soğuk süt."), priceCents: 75_00, picture: "drink-latte", popular: true },
            { name: t3("Turkish coffee", "قهوة تركي", "Türk kahvesi"), description: t3("Made in a small pot, the way you like it.", "تُحضّر في كنكة صغيرة، كما تحبها.", "Küçük cezvede, sevdiğiniz gibi pişirilir."), priceCents: 40_00, picture: "drink-coffee" },
          ],
        },
        { name: MEAL.Desserts, dishes: [{ name: t3("Cheesecake", "تشيز كيك", "Cheesecake"), description: t3("Creamy, with a biscuit base.", "كريمي، بقاعدة من البسكويت.", "Kremamsı, bisküvi tabanlı."), priceCents: 85_00, picture: "dish-cheesecake" }] },
      ],
    },
    {
      name: t3("El Fawal Breakfast", "فطور الفوّال", "El Fawal Kahvaltı"),
      description: t3("Foul, falafel and warm bread every morning, from six until noon.", "فول وطعمية وعيش سخن كل صباح، من السادسة حتى الظهر.", "Her sabah altıdan öğlene kadar ful, falafel ve sıcak ekmek."),
      cuisines: ["egyptian"],
      address: t3("21 Shubra Street, Shubra", "21 شارع شبرا، شبرا", "Şubra Caddesi 21, Şubra"),
      prepMinutes: 10,
      minOrderCents: 40_00,
      logo: "dish-breakfast",
      sections: [
        {
          name: MEAL.Breakfast,
          dishes: [
            { name: t3("Foul and falafel plate", "طبق فول وطعمية", "Ful ve falafel tabağı"), description: t3("Foul with oil and cumin, four falafel, pickles and bread.", "فول بالزيت والكمون وأربع طعميات ومخلل وعيش.", "Zeytinyağı ve kimyonlu ful, dört falafel, turşu ve ekmek."), priceCents: 45_00, picture: "dish-breakfast", popular: true },
            { name: t3("Falafel sandwich", "ساندويتش طعمية", "Falafel sandviç"), description: t3("Falafel, salad and tahini in a baladi bread.", "طعمية وسلطة وطحينة في عيش بلدي.", "Köy ekmeğinde falafel, salata ve tahin."), priceCents: 15_00, picture: "dish-wrap" },
            { name: t3("Cheese feteer", "فطير بالجبن", "Peynirli fatayer"), description: t3("Flaky pastry with white cheese.", "فطير مشلتت بالجبن الأبيض.", "Beyaz peynirli kat kat hamur."), priceCents: 60_00, picture: "dish-simit" },
          ],
        },
      ],
    },
    {
      name: t3("Burger Lab", "برجر لاب", "Burger Lab"),
      description: t3("Smashed burgers, crispy chicken and fries, made to order.", "برجر مضغوط ودجاج مقرمش وبطاطس، يُحضَّر عند الطلب.", "Smash burger, çıtır tavuk ve patates; siparişe göre hazırlanır."),
      cuisines: ["grill"],
      address: t3("88 Road 9, Maadi", "88 شارع 9، المعادي", "9. Cadde 88, Maadi"),
      prepMinutes: 20,
      minOrderCents: 90_00,
      logo: "dish-burger",
      sections: [
        {
          name: MEAL.Burgers,
          dishes: [
            {
              name: t3("Classic smash burger", "برجر كلاسيك", "Klasik smash burger"),
              description: t3("Two thin beef patties, cheddar, pickles and our sauce.", "قطعتان رقيقتان من اللحم البقري وجبن شيدر ومخلل وصوصنا الخاص.", "İki ince dana köfte, çedar, turşu ve özel sosumuz."),
              priceCents: 165_00,
              picture: "dish-burger",
              popular: true,
              choices: { name: t3("Extras", "إضافات", "Ekstralar"), min: 0, max: 2, options: [[t3("Extra cheese", "جبن إضافي", "Ekstra peynir"), 20_00], [t3("Fried egg", "بيض مقلي", "Sahanda yumurta"), 15_00]] },
            },
            { name: t3("Crispy chicken burger", "برجر دجاج مقرمش", "Çıtır tavuk burger"), description: t3("Fried chicken thigh, lettuce and garlic mayo.", "فخذ دجاج مقلي وخس ومايونيز بالثوم.", "Kızarmış tavuk but, marul ve sarımsaklı mayonez."), priceCents: 145_00, picture: "dish-wrap" },
          ],
        },
        { name: MEAL.Sides, dishes: [{ name: t3("Fries", "بطاطس مقلية", "Patates kızartması"), description: t3("With a little salt and paprika.", "بقليل من الملح والبابريكا.", "Biraz tuz ve kırmızı biberle."), priceCents: 45_00, picture: "dish-simit" }] },
      ],
    },
  ],
};

export interface SampleVehicleType {
  name: Tri;
  description: Tri;
  icon: string;
  seats: number;
  baseCents: number;
  perKmCents: number;
  perMinuteCents: number;
  minCents: number;
  waitPerMinuteCents: number;
}

function demoVehicle(name: string, ar: [string, string], tr: [string, string]): SampleVehicleType {
  const seed = find(RIDES_DEMO_TYPES, "name", name);
  return { ...seed, name: t3(seed.name, ar[0], tr[0]), description: t3(seed.description, ar[1], tr[1]) };
}

/** A ride company's vehicle types and fares: settings it needs anyway, marked as samples like the rest. */
export const SAMPLE_VEHICLE_TYPES: { currency: CatalogCurrency; types: SampleVehicleType[] } = {
  currency: "EGP",
  types: [
    demoVehicle("Economy", ["اقتصادي", "سيارات للمشاوير اليومية"], ["Ekonomi", "Günlük yolculuklar için araçlar"]),
    demoVehicle("Comfort", ["مريح", "سيارات أحدث بمساحة أكبر"], ["Konfor", "Daha yeni ve geniş araçlar"]),
    demoVehicle("Van", ["فان", "للعائلة والأمتعة"], ["Van", "Aile ve bagaj için"]),
  ],
};

export interface SampleSchoolNews {
  title: Tri;
  body: Tri;
  daysAgo: number;
}

/** 105.4 A school's news to the whole school. */
export const SAMPLE_SCHOOL_NEWS: SampleSchoolNews[] = [
  {
    title: t3("Parents' evening on Thursday", "لقاء أولياء الأمور يوم الخميس", "Perşembe günü veli toplantısı"),
    body: t3(
      "Teachers will meet parents in the classrooms from 17:00 to 19:30. Your child's timetable shows which room to go to.",
      "يلتقي المعلمون أولياء الأمور في الفصول من الخامسة حتى السابعة والنصف مساءً. يبيّن جدول طفلك الفصل الذي تتوجه إليه.",
      "Öğretmenler velilerle 17.00-19.30 arasında sınıflarda görüşecek. Hangi sınıfa gideceğinizi çocuğunuzun ders programında görebilirsiniz.",
    ),
    daysAgo: 0,
  },
  {
    title: t3("Science fair projects are due next Friday", "موعد تسليم مشاريع معرض العلوم الجمعة المقبلة", "Bilim şenliği projeleri gelecek cuma teslim"),
    body: t3(
      "Each class shows its projects in the hall on the morning of the fair. Families are welcome from 10:00.",
      "يعرض كل فصل مشاريعه في القاعة صباح يوم المعرض، والأسر مدعوة ابتداءً من العاشرة.",
      "Her sınıf projelerini şenlik sabahı salonda sergileyecek. Aileler saat 10.00'dan itibaren davetli.",
    ),
    daysAgo: 1,
  },
  {
    title: t3("New school bus times from Monday", "مواعيد جديدة للحافلة المدرسية من الاثنين", "Pazartesiden itibaren yeni servis saatleri"),
    body: t3(
      "The morning bus now leaves the last stop ten minutes earlier, at 7:20. The afternoon times stay the same.",
      "تغادر الحافلة الصباحية آخر محطة قبل موعدها السابق بعشر دقائق، في السابعة وعشرين دقيقة. وتبقى مواعيد الظهيرة كما هي.",
      "Sabah servisi son duraktan artık on dakika erken, 07.20'de kalkıyor. Öğleden sonraki saatler değişmiyor.",
    ),
    daysAgo: 3,
  },
  {
    title: t3("Our football team is in the city final", "فريق كرة القدم في المدرسة يتأهل إلى نهائي المدينة", "Futbol takımımız şehir finalinde"),
    body: t3(
      "The final is on Saturday at 11:00 at the city stadium. Come and cheer them on!",
      "تُقام المباراة النهائية يوم السبت في الحادية عشرة صباحًا في ملعب المدينة. تعالوا لتشجيعهم!",
      "Final cumartesi saat 11.00'de şehir stadyumunda. Takımımızı desteklemeye gelin!",
    ),
    daysAgo: 5,
  },
  {
    title: t3("The library stays open after school", "المكتبة مفتوحة بعد انتهاء الدوام", "Kütüphane ders sonrasında da açık"),
    body: t3(
      "From this week, students can read and do their homework in the library until 17:00, Monday to Thursday.",
      "ابتداءً من هذا الأسبوع يمكن للطلاب القراءة وأداء واجباتهم في المكتبة حتى الخامسة مساءً، من الاثنين إلى الخميس.",
      "Bu haftadan itibaren öğrenciler pazartesiden perşembeye saat 17.00'ye kadar kütüphanede kitap okuyup ödevlerini yapabilir.",
    ),
    daysAgo: 8,
  },
  {
    title: t3("Winter break dates", "مواعيد عطلة منتصف العام", "Yarıyıl tatili tarihleri"),
    body: t3(
      "The winter break starts on the last Friday of January, and lessons start again two weeks later, on a Monday.",
      "تبدأ العطلة يوم آخر جمعة من يناير، وتُستأنف الدروس بعد أسبوعين يوم الاثنين.",
      "Yarıyıl tatili ocak ayının son cuma günü başlıyor; dersler iki hafta sonra pazartesi günü yeniden başlıyor.",
    ),
    daysAgo: 12,
  },
];
