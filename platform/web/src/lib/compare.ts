import type { Lang } from "@/i18n/config";

/**
 * The comparison pages (/compare and /compare/<competitor>): Yallapp's
 * features next to other app builders', for regular apps and for Yallapp
 * Studio projects.
 *
 * Yallapp's side comes from this repository (docs/ROADMAP.md, the features
 * and Studio pages). The other side comes only from each company's own
 * public pages, checked on CHECKED_ON. A feature we didn't find on their
 * site is "not listed", never "no": it may exist and not be described. A
 * feature of theirs that Yallapp doesn't have is shown as it is.
 */

export const CHECKED_ON = "2026-11-04";

type L = Record<Lang, string>;

/** yes: they say it does it; part: with limits, or through a paid service or add-on; listed: not on their site; no: Yallapp doesn't (our own side only). */
/** soon: part of Yallapp that is being released now. */
export type Mark = "yes" | "part" | "notListed" | "no" | "soon";

export interface Cell {
  mark: Mark;
  note?: L;
}

export type CompetitorId = "appmysite" | "mobiloud" | "appypie" | "goodbarber" | "flutterflow" | "adalo";

export interface Competitor {
  id: CompetitorId;
  name: string;
  /** The tables it appears in: regular apps, Studio projects, or both. */
  tables: ("regular" | "studio")[];
  /** What it is, in a line, from its own site. */
  what: L;
  /** The public pages its column comes from. */
  sources: { label: string; url: string }[];
}

export const COMPETITORS: Competitor[] = [
  {
    id: "appmysite",
    name: "AppMySite",
    tables: ["regular"],
    what: {
      en: "A do-it-yourself app builder for WordPress, WooCommerce and Shopify sites, and custom apps.",
      ar: "منشئ تطبيقات تبنيه بنفسك لمواقع WordPress وWooCommerce وShopify، ولتطبيقات مخصّصة.",
      tr: "WordPress, WooCommerce ve Shopify siteleri ile özel uygulamalar için kendin yap uygulama oluşturucu.",
    },
    sources: [
      { label: "Features", url: "https://www.appmysite.com/features/" },
      { label: "Support for app stores", url: "https://docs.appmysite.com/frequently-asked-questions/publishing-and-distribution/support-for-app-stores" },
      { label: "Custom app pricing", url: "https://www.appmysite.com/custom-app-pricing/" },
      { label: "Shopify to app", url: "https://www.appmysite.com/shopify-pricing/" },
      { label: "Notifications", url: "https://www.appmysite.com/notifications/" },
    ],
  },
  {
    id: "mobiloud",
    name: "MobiLoud",
    tables: ["regular"],
    what: {
      en: "A done-for-you service that turns an existing website into iOS and Android apps.",
      ar: "خدمة تُنجز العمل عنك وتحوّل موقعًا قائمًا إلى تطبيقات iOS وAndroid.",
      tr: "Mevcut bir web sitesini iOS ve Android uygulamalarına dönüştüren, işi sizin yerinize yapan bir hizmet.",
    },
    sources: [
      { label: "Website to app", url: "https://www.mobiloud.com/use-cases/website-to-app/" },
      { label: "WordPress", url: "https://www.mobiloud.com/use-cases/wordpress-app-builder/" },
      { label: "Ecommerce", url: "https://www.mobiloud.com/use-cases/ecommerce-mobile-app/" },
      { label: "FAQs", url: "https://www.mobiloud.com/faqs/" },
    ],
  },
  {
    id: "appypie",
    name: "Appy Pie",
    tables: ["regular", "studio"],
    what: {
      en: "A no-code app builder with templates for many kinds of business, including delivery and taxis.",
      ar: "منشئ تطبيقات بلا برمجة بقوالب لأنواع كثيرة من الأعمال، منها التوصيل والتاكسي.",
      tr: "Teslimat ve taksi dahil birçok işletme türü için şablonları olan kodsuz bir uygulama oluşturucu.",
    },
    sources: [
      { label: "Features", url: "https://www.appypie.com/features/" },
      { label: "Delivery app builder", url: "https://www.appypie.com/on-demand-delivery-app-builder" },
      { label: "Taxi app builder", url: "https://www.appypie.com/taxi-booking-app-builder" },
      { label: "Restaurant app", url: "https://www.appypie.com/restaurant-app-maker" },
      { label: "Push notifications", url: "https://www.appypie.com/push-notifications" },
      { label: "Multilingual apps", url: "https://www.appypie.com/multilingual-app-builder" },
    ],
  },
  {
    id: "goodbarber",
    name: "GoodBarber",
    tables: ["regular"],
    what: {
      en: "A no-code builder for native apps and web apps, with shopping, membership and content apps.",
      ar: "منشئ بلا برمجة لتطبيقات أصلية وتطبيقات ويب، للمتاجر والعضويات والمحتوى.",
      tr: "Alışveriş, üyelik ve içerik uygulamaları için yerel ve web uygulamaları yapan kodsuz bir oluşturucu.",
    },
    sources: [
      { label: "Feature index", url: "https://www.goodbarber.com/feature-index/" },
      { label: "Ecommerce", url: "https://www.goodbarber.com/ecommerce/" },
      { label: "Membership", url: "https://www.goodbarber.com/membership/" },
      { label: "Local delivery", url: "https://www.goodbarber.com/local-delivery-apps/" },
      { label: "Submit to Google Play", url: "https://www.goodbarber.com/blog/how-to-submit-an-app-to-google-play-a309/" },
    ],
  },
  {
    id: "flutterflow",
    name: "FlutterFlow",
    tables: ["studio"],
    what: {
      en: "A visual builder for Flutter apps, for teams that design and build an app themselves.",
      ar: "منشئ مرئي لتطبيقات Flutter، للفرق التي تصمّم التطبيق وتبنيه بنفسها.",
      tr: "Uygulamayı kendisi tasarlayıp geliştiren ekipler için görsel bir Flutter uygulama oluşturucu.",
    },
    sources: [
      { label: "Product", url: "https://flutterflow.io/product" },
      { label: "Google Play deployment", url: "https://docs.flutterflow.io/deployment/google-playstore-deployment/" },
      { label: "App Store deployment", url: "https://docs.flutterflow.io/deployment/apple-app-store-deployment/" },
    ],
  },
  {
    id: "adalo",
    name: "Adalo",
    tables: ["studio"],
    what: {
      en: "A no-code builder for native apps you design screen by screen.",
      ar: "منشئ بلا برمجة لتطبيقات أصلية تصمّمها شاشةً شاشة.",
      tr: "Ekran ekran tasarladığınız yerel uygulamalar için kodsuz bir oluşturucu.",
    },
    sources: [
      { label: "Adalo", url: "https://www.adalo.com/" },
      { label: "Publishing guide", url: "https://www.adalo.com/posts/publishing-apps-app-stores-beginners-guide/" },
    ],
  },
];

const yes: Cell = { mark: "yes" };
const part = (note?: L): Cell => ({ mark: "part", ...(note ? { note } : {}) });
const nl: Cell = { mark: "notListed" };
const no: Cell = { mark: "no" };
const y = (note: L): Cell => ({ mark: "yes", note });

export interface Row {
  id: string;
  label: L;
  yallapp: Cell;
  /** Missing competitors are "not listed". */
  them: Partial<Record<CompetitorId, Cell>>;
}

export interface Category {
  id: string;
  title: L;
  rows: Row[];
}

const ADDON: L = { en: "Paid add-on", ar: "إضافة مدفوعة", tr: "Ücretli eklenti" };
const SERVICE: L = { en: "Paid service", ar: "خدمة مدفوعة", tr: "Ücretli hizmet" };
const ANY_SITE: L = { en: "Any website, as a web view", ar: "أي موقع، بعرض الويب", tr: "Herhangi bir site, web görünümü olarak" };
const YOU_UPLOAD: L = { en: "You upload the builds", ar: "أنت ترفع النُّسخ", tr: "Derlemeleri siz yüklersiniz" };

/** Regular apps: Yallapp's apps for each kind of business, against website-to-app and no-code builders. */
export const REGULAR_TABLE: Category[] = [
  {
    id: "stores",
    title: { en: "App stores and publishing", ar: "متاجر التطبيقات والنشر", tr: "Uygulama mağazaları ve yayın" },
    rows: [
      { id: "play", label: { en: "Google Play", ar: "Google Play", tr: "Google Play" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: yes, goodbarber: yes } },
      { id: "appstore", label: { en: "Apple App Store", ar: "Apple App Store", tr: "Apple App Store" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: yes, goodbarber: yes } },
      { id: "appgallery", label: { en: "Huawei AppGallery", ar: "Huawei AppGallery", tr: "Huawei AppGallery" }, yallapp: y({ en: "With Huawei push (HMS)", ar: "مع إشعارات Huawei (HMS)", tr: "Huawei bildirimleriyle (HMS)" }), them: { appmysite: yes } },
      { id: "galaxy", label: { en: "Samsung Galaxy Store", ar: "Samsung Galaxy Store", tr: "Samsung Galaxy Store" }, yallapp: yes, them: {} },
      { id: "getapps", label: { en: "Xiaomi GetApps", ar: "Xiaomi GetApps", tr: "Xiaomi GetApps" }, yallapp: yes, them: {} },
      {
        id: "publish",
        label: { en: "We publish for you", ar: "ننشر التطبيق عنك", tr: "Sizin için yayınlıyoruz" },
        yallapp: y({ en: "Every build, to every store you use (Pro and Business)", ar: "كل نسخة، على كل متجر تستخدمه (Pro وBusiness)", tr: "Her derleme, kullandığınız her mağazaya (Pro ve Business)" }),
        them: { appmysite: part(ADDON), mobiloud: yes, goodbarber: part(SERVICE) },
      },
      { id: "own-accounts", label: { en: "Published under your own store accounts", ar: "يُنشر بحساباتك أنت على المتاجر", tr: "Kendi mağaza hesaplarınızla yayın" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: yes, goodbarber: yes } },
      { id: "builds", label: { en: "APK, App Bundle and iOS build to download", ar: "نُسخ APK وApp Bundle وiOS للتنزيل", tr: "İndirilebilir APK, App Bundle ve iOS derlemesi" }, yallapp: yes, them: { appmysite: yes, goodbarber: yes } },
      { id: "assets", label: { en: "Store listing, screenshots and icons made for you", ar: "صفحة المتجر ولقطات الشاشة والأيقونات جاهزة لك", tr: "Mağaza sayfası, ekran görüntüleri ve simgeler sizin için hazır" }, yallapp: yes, them: {} },
      { id: "pwa", label: { en: "Web app (PWA)", ar: "تطبيق ويب (PWA)", tr: "Web uygulaması (PWA)" }, yallapp: no, them: { goodbarber: yes } },
    ],
  },
  {
    id: "sources",
    title: { en: "Where the content comes from", ar: "من أين يأتي المحتوى", tr: "İçerik nereden gelir" },
    rows: [
      { id: "wordpress", label: { en: "WordPress, with Yallapp's plugin", ar: "WordPress بإضافة Yallapp", tr: "Yallapp eklentisiyle WordPress" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: part(ANY_SITE) } },
      {
        id: "lms",
        label: { en: "LMS plugins: Tutor LMS, LearnPress, LifterLMS, LearnDash, MasterStudy, Sensei, Masteriyo", ar: "إضافات التعليم: Tutor LMS وLearnPress وLifterLMS وLearnDash وMasterStudy وSensei وMasteriyo", tr: "LMS eklentileri: Tutor LMS, LearnPress, LifterLMS, LearnDash, MasterStudy, Sensei, Masteriyo" },
        yallapp: y({ en: "Courses, lessons, quizzes, progress and certificates in the app", ar: "الدورات والدروس والاختبارات والتقدّم والشهادات في التطبيق", tr: "Kurslar, dersler, sınavlar, ilerleme ve sertifikalar uygulamada" }),
        them: {},
      },
      { id: "woo", label: { en: "WooCommerce", ar: "WooCommerce", tr: "WooCommerce" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes } },
      { id: "bookings-wp", label: { en: "Booking plugins: Amelia, BookingPress, LatePoint", ar: "إضافات الحجز: Amelia وBookingPress وLatePoint", tr: "Rezervasyon eklentileri: Amelia, BookingPress, LatePoint" }, yallapp: yes, them: {} },
      { id: "shopify", label: { en: "Shopify", ar: "Shopify", tr: "Shopify" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes } },
      {
        id: "regional",
        label: { en: "ikas, Ticimax, IdeaSoft, Salla, Zid and Wix", ar: "ikas وTicimax وIdeaSoft وسلة وزد وWix", tr: "ikas, Ticimax, IdeaSoft, Salla, Zid ve Wix" },
        yallapp: yes,
        them: {},
      },
      { id: "courses-platforms", label: { en: "Teachable, Thinkific and SimplyBook.me", ar: "Teachable وThinkific وSimplyBook.me", tr: "Teachable, Thinkific ve SimplyBook.me" }, yallapp: yes, them: {} },
      { id: "own-api", label: { en: "Your own API, with a published contract", ar: "واجهتك البرمجية الخاصة، بعقد منشور", tr: "Yayınlanmış sözleşmeyle kendi API'niz" }, yallapp: yes, them: {} },
      {
        id: "no-site",
        label: { en: "No website: products, courses or bookings managed in the dashboard", ar: "بلا موقع: منتجات أو دورات أو حجوزات تُدار من لوحة التحكم", tr: "Web sitesi olmadan: ürünler, kurslar veya rezervasyonlar panelden" },
        yallapp: yes,
        them: { appmysite: yes, appypie: yes, goodbarber: yes },
      },
      { id: "import", label: { en: "Import products, menus or courses from CSV or a feed", ar: "استيراد المنتجات أو القوائم أو الدورات من CSV أو رابط", tr: "Ürün, menü veya kursları CSV ya da akıştan içe aktarma" }, yallapp: yes, them: {} },
    ],
  },
  {
    id: "kinds",
    title: { en: "Kinds of app", ar: "أنواع التطبيقات", tr: "Uygulama türleri" },
    rows: [
      { id: "shop", label: { en: "Online shop", ar: "متجر إلكتروني", tr: "Online mağaza" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: yes, goodbarber: yes } },
      { id: "academy", label: { en: "Academy and online courses", ar: "أكاديمية ودورات عبر الإنترنت", tr: "Akademi ve online kurslar" }, yallapp: yes, them: {} },
      { id: "restaurant", label: { en: "Restaurant and café", ar: "مطعم ومقهى", tr: "Restoran ve kafe" }, yallapp: yes, them: { appypie: yes } },
      { id: "clinic", label: { en: "Clinic and salon bookings", ar: "حجوزات العيادات والصالونات", tr: "Klinik ve salon rezervasyonları" }, yallapp: yes, them: {} },
      { id: "gym", label: { en: "Gym with classes and memberships", ar: "صالة رياضية بالحصص والاشتراكات", tr: "Dersler ve üyeliklerle spor salonu" }, yallapp: yes, them: {} },
      { id: "realestate", label: { en: "Real estate listings", ar: "إعلانات العقارات", tr: "Emlak ilanları" }, yallapp: yes, them: {} },
      { id: "news", label: { en: "News and blog", ar: "أخبار ومدونة", tr: "Haber ve blog" }, yallapp: yes, them: { mobiloud: yes, goodbarber: yes } },
      { id: "events", label: { en: "Events with tickets", ar: "فعاليات بالتذاكر", tr: "Biletli etkinlikler" }, yallapp: yes, them: {} },
      { id: "donations", label: { en: "Charity with donations and receipts", ar: "جمعية خيرية بالتبرعات والإيصالات", tr: "Bağış ve makbuzlu yardım kuruluşu" }, yallapp: yes, them: {} },
    ],
  },
  {
    id: "design",
    title: { en: "Design and languages", ar: "التصميم واللغات", tr: "Tasarım ve diller" },
    rows: [
      { id: "brand", label: { en: "Your name, logo and colors", ar: "اسمك وشعارك وألوانك", tr: "Adınız, logonuz ve renkleriniz" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: yes, goodbarber: yes } },
      { id: "templates", label: { en: "Ready templates, light and dark", ar: "قوالب جاهزة، فاتحة وداكنة", tr: "Açık ve koyu hazır şablonlar" }, yallapp: yes, them: { appmysite: yes, appypie: yes, goodbarber: yes } },
      { id: "editor", label: { en: "Page editor with blocks", ar: "محرّر صفحات بالكتل", tr: "Bloklarla sayfa düzenleyici" }, yallapp: yes, them: { appmysite: yes, appypie: yes, goodbarber: yes } },
      { id: "rtl", label: { en: "Arabic, right to left", ar: "العربية من اليمين إلى اليسار", tr: "Sağdan sola Arapça" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes } },
      { id: "tr", label: { en: "English, Arabic and Turkish built in, for the app and the dashboard", ar: "الإنجليزية والعربية والتركية مدمجة، للتطبيق ولوحة التحكم", tr: "Uygulama ve panel için yerleşik İngilizce, Arapça ve Türkçe" }, yallapp: yes, them: {} },
      { id: "more-langs", label: { en: "Other languages for the app", ar: "لغات أخرى للتطبيق", tr: "Uygulama için başka diller" }, yallapp: y({ en: "Add and translate any language", ar: "أضف أي لغة وترجمها", tr: "İstediğiniz dili ekleyip çevirin" }), them: { mobiloud: yes, appypie: yes, goodbarber: yes } },
    ],
  },
  {
    id: "engage",
    title: { en: "Notifications, chat and analytics", ar: "الإشعارات والمحادثة والتحليلات", tr: "Bildirimler, sohbet ve analiz" },
    rows: [
      { id: "push", label: { en: "Push notifications", ar: "الإشعارات", tr: "Anlık bildirimler" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: yes, goodbarber: yes } },
      { id: "campaigns", label: { en: "Campaigns to audiences, scheduled or weekly, with results", ar: "حملات لجماهير محدّدة، مجدولة أو أسبوعية، بنتائجها", tr: "Hedef kitlelere zamanlanmış veya haftalık kampanyalar ve sonuçları" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: yes, goodbarber: yes } },
      { id: "auto-push", label: { en: "Automatic pushes: new lesson, appointment reminder, cart left, membership ending", ar: "إشعارات تلقائية: درس جديد، تذكير بموعد، سلة متروكة، اشتراك ينتهي", tr: "Otomatik bildirimler: yeni ders, randevu hatırlatma, terk edilen sepet, biten üyelik" }, yallapp: yes, them: { goodbarber: part({ en: "Order stages and abandoned orders", ar: "مراحل الطلب والطلبات المتروكة", tr: "Sipariş aşamaları ve terk edilen siparişler" }) } },
      { id: "chat", label: { en: "Chat between customers and your team", ar: "محادثة بين العملاء وفريقك", tr: "Müşterileriniz ile ekibiniz arasında sohbet" }, yallapp: yes, them: { appmysite: part(ADDON), appypie: yes } },
      { id: "owner-app", label: { en: "An app for you: orders, chat and alerts on your phone (Yallapp Business)", ar: "تطبيق لك: الطلبات والمحادثات والتنبيهات على هاتفك (Yallapp Business)", tr: "Sizin için uygulama: siparişler, sohbet ve uyarılar telefonunuzda (Yallapp Business)" }, yallapp: yes, them: {} },
      { id: "analytics", label: { en: "Analytics: sales, where people come from, notification results", ar: "التحليلات: المبيعات ومصادر الزوار ونتائج الإشعارات", tr: "Analiz: satışlar, ziyaretçi kaynakları, bildirim sonuçları" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes, appypie: yes, goodbarber: yes } },
      { id: "weekly", label: { en: "Weekly summary email", ar: "ملخص أسبوعي بالبريد", tr: "Haftalık özet e-postası" }, yallapp: yes, them: {} },
    ],
  },
  {
    id: "money",
    title: { en: "Payments and selling", ar: "المدفوعات والبيع", tr: "Ödemeler ve satış" },
    rows: [
      { id: "cards", label: { en: "Card payments in the app", ar: "الدفع بالبطاقة في التطبيق", tr: "Uygulamada kartla ödeme" }, yallapp: yes, them: { appypie: yes, goodbarber: yes } },
      { id: "regional-gw", label: { en: "iyzico, Kashier and Fawaterk", ar: "iyzico وKashier وFawaterk", tr: "iyzico, Kashier ve Fawaterk" }, yallapp: yes, them: {} },
      { id: "iap", label: { en: "In-app purchases with Google and Apple", ar: "الشراء داخل التطبيق عبر Google وApple", tr: "Google ve Apple ile uygulama içi satın alma" }, yallapp: yes, them: { appypie: yes, goodbarber: yes } },
      { id: "loyalty", label: { en: "Loyalty points and coupons", ar: "نقاط الولاء والكوبونات", tr: "Sadakat puanları ve kuponlar" }, yallapp: yes, them: { appypie: yes, goodbarber: yes } },
      { id: "memberships", label: { en: "Memberships and subscriptions", ar: "العضويات والاشتراكات", tr: "Üyelikler ve abonelikler" }, yallapp: yes, them: { goodbarber: yes } },
      { id: "receipts", label: { en: "Receipts and invoices as PDF", ar: "إيصالات وفواتير PDF", tr: "PDF makbuz ve faturalar" }, yallapp: yes, them: {} },
    ],
  },
  {
    id: "team",
    title: { en: "Team, security and support", ar: "الفريق والأمان والدعم", tr: "Ekip, güvenlik ve destek" },
    rows: [
      { id: "roles", label: { en: "Team members with roles", ar: "أعضاء فريق بأدوار", tr: "Rollere sahip ekip üyeleri" }, yallapp: yes, them: { appmysite: yes } },
      { id: "2fa", label: { en: "Two-step sign-in for the dashboard", ar: "دخول بخطوتين للوحة التحكم", tr: "Panel için iki adımlı giriş" }, yallapp: yes, them: {} },
      { id: "code-signin", label: { en: "Sign-in with a code by text or email for your customers", ar: "دخول عملائك برمز بالرسالة أو البريد", tr: "Müşterileriniz için SMS veya e-postayla kodla giriş" }, yallapp: yes, them: {} },
      { id: "backups", label: { en: "Backups and data kept apart per client", ar: "نسخ احتياطية وبيانات كل عميل منفصلة", tr: "Yedekler ve her müşterinin verisi ayrı" }, yallapp: yes, them: {} },
      { id: "whitelabel", label: { en: "White label: no Yallapp name in your app", ar: "علامة بيضاء: لا يظهر اسم Yallapp في تطبيقك", tr: "Beyaz etiket: uygulamanızda Yallapp adı yok" }, yallapp: yes, them: { appmysite: yes, mobiloud: yes } },
      { id: "demos", label: { en: "Demo apps to install and try", ar: "تطبيقات تجريبية للتثبيت والتجربة", tr: "Kurup denenebilir demo uygulamalar" }, yallapp: yes, them: {} },
      { id: "local-support", label: { en: "Support on WhatsApp in English and Arabic", ar: "دعم على واتساب بالإنجليزية والعربية", tr: "İngilizce ve Arapça WhatsApp desteği" }, yallapp: yes, them: {} },
    ],
  },
];

/** Studio projects: bigger apps (delivery, marketplaces, taxis, schools), against visual builders and template builders. */
export const STUDIO_TABLE: Category[] = [
  {
    id: "projects",
    title: { en: "Ready project kinds", ar: "أنواع مشاريع جاهزة", tr: "Hazır proje türleri" },
    rows: [
      {
        id: "delivery",
        label: { en: "Delivery company, with a second app for couriers (Yallapp Courier)", ar: "شركة توصيل، مع تطبيق ثانٍ للمناديب (Yallapp Courier)", tr: "Kuryeler için ikinci uygulamayla teslimat şirketi (Yallapp Courier)" },
        yallapp: yes,
        them: { appypie: part({ en: "Delivery app template", ar: "قالب تطبيق توصيل", tr: "Teslimat uygulaması şablonu" }) },
      },
      {
        id: "marketplace",
        label: { en: "Multi-vendor app: many restaurants, supermarkets and shops", ar: "تطبيق متعدد المتاجر: مطاعم وسوبر ماركتات ومتاجر كثيرة", tr: "Çok satıcılı uygulama: birçok restoran, süpermarket ve dükkân" },
        yallapp: yes,
        them: { appypie: part({ en: "Food court template", ar: "قالب ساحة طعام", tr: "Yemek alanı şablonu" }) },
      },
      { id: "vendor-panel", label: { en: "A panel for each restaurant or shop, with no contact with customers", ar: "لوحة لكل مطعم أو متجر، دون تواصل مع العملاء", tr: "Her restoran veya mağaza için müşteriyle iletişimsiz panel" }, yallapp: yes, them: {} },
      { id: "taxi", label: { en: "Rides and taxis on a live map", ar: "رحلات وتاكسي على خريطة حيّة", tr: "Canlı haritada yolculuk ve taksi" }, yallapp: yes, them: { appypie: yes } },
      { id: "school", label: { en: "School: classes, homework, grades, attendance, fees", ar: "مدرسة: فصول وواجبات ودرجات وحضور ومصروفات", tr: "Okul: sınıflar, ödevler, notlar, devam, ücretler" }, yallapp: yes, them: {} },
      { id: "bus", label: { en: "School bus live on the parents' map", ar: "باص المدرسة حيًّا على خريطة أولياء الأمور", tr: "Velilerin haritasında canlı okul servisi" }, yallapp: yes, them: {} },
      { id: "parents", label: { en: "Parents' area: permission slips, excuses, pick-up", ar: "قسم أولياء الأمور: الأذونات والأعذار والاستلام", tr: "Veli alanı: izin formları, mazeretler, teslim alma" }, yallapp: yes, them: {} },
      { id: "university", label: { en: "University: registration, results and GPA", ar: "جامعة: التسجيل والنتائج والمعدل", tr: "Üniversite: kayıt, sonuçlar ve not ortalaması" }, yallapp: yes, them: {} },
      { id: "academies", label: { en: "Academy with many teachers", ar: "أكاديمية بمعلمين كثيرين", tr: "Çok öğretmenli akademi" }, yallapp: yes, them: {} },
      { id: "salaries", label: { en: "Staff check-in and salaries", ar: "حضور الموظفين ورواتبهم", tr: "Personel girişi ve maaşlar" }, yallapp: yes, them: {} },
    ],
  },
  {
    id: "money",
    title: { en: "Money in multi-vendor apps", ar: "الأموال في التطبيقات متعددة المتاجر", tr: "Çok satıcılı uygulamalarda para" },
    rows: [
      { id: "commission", label: { en: "Commission, tax and statements per vendor (CSV, Excel, PDF)", ar: "العمولة والضريبة وكشف حساب لكل بائع (CSV وExcel وPDF)", tr: "Satıcı başına komisyon, vergi ve ekstre (CSV, Excel, PDF)" }, yallapp: yes, them: {} },
      { id: "cod", label: { en: "Cash on delivery, cards, Apple Pay and Google Pay", ar: "الدفع عند الاستلام والبطاقات وApple Pay وGoogle Pay", tr: "Kapıda ödeme, kart, Apple Pay ve Google Pay" }, yallapp: yes, them: { appypie: yes } },
      { id: "coupons", label: { en: "Coupons, wallet and a delivery club", ar: "كوبونات ومحفظة ونادي توصيل", tr: "Kuponlar, cüzdan ve teslimat kulübü" }, yallapp: yes, them: { appypie: part({ en: "Coupons and wallet", ar: "كوبونات ومحفظة", tr: "Kupon ve cüzdan" }) } },
      { id: "complaints", label: { en: "Complaints center with refunds and compensation", ar: "مركز شكاوى بالاسترداد والتعويض", tr: "İade ve tazminatlı şikâyet merkezi" }, yallapp: yes, them: {} },
      { id: "delivery-modes", label: { en: "Each vendor chooses: your couriers or its own delivery", ar: "كل بائع يختار: مناديبك أو توصيله الخاص", tr: "Her satıcı seçer: kuryeleriniz veya kendi teslimatı" }, yallapp: yes, them: {} },
      { id: "grocery", label: { en: "Groceries by weight, stock and substitutes", ar: "بقالة بالوزن ومخزون وبدائل", tr: "Gramajlı market, stok ve muadiller" }, yallapp: yes, them: {} },
    ],
  },
  {
    id: "build",
    title: { en: "Design and building", ar: "التصميم والبناء", tr: "Tasarım ve geliştirme" },
    rows: [
      { id: "visual", label: { en: "Visual editor for every page", ar: "محرّر مرئي لكل صفحة", tr: "Her sayfa için görsel düzenleyici" }, yallapp: yes, them: { flutterflow: yes, adalo: yes, appypie: yes } },
      { id: "studio-templates", label: { en: "Complete templates you take as they are and change", ar: "قوالب كاملة تأخذها كما هي وتعدّلها", tr: "Olduğu gibi alıp değiştirdiğiniz eksiksiz şablonlar" }, yallapp: yes, them: { flutterflow: yes, adalo: yes, appypie: yes } },
      { id: "motion", label: { en: "Motion in the editor", ar: "حركة في المحرّر", tr: "Düzenleyicide hareket" }, yallapp: yes, them: { flutterflow: yes } },
      { id: "backend", label: { en: "Server, database and APIs included and run for you", ar: "الخادم وقاعدة البيانات والواجهات البرمجية مضمّنة ونشغّلها عنك", tr: "Sunucu, veritabanı ve API'ler dahil ve sizin için çalıştırılır" }, yallapp: yes, them: { adalo: yes } },
      { id: "code", label: { en: "Download the source code", ar: "تنزيل الشيفرة المصدرية", tr: "Kaynak kodu indirme" }, yallapp: no, them: { flutterflow: yes } },
      { id: "rtl-studio", label: { en: "Arabic, right to left, in every screen", ar: "العربية من اليمين إلى اليسار في كل شاشة", tr: "Her ekranda sağdan sola Arapça" }, yallapp: yes, them: {} },
      { id: "demo-studio", label: { en: "Demo apps of each kind to try", ar: "تطبيقات تجريبية لكل نوع للتجربة", tr: "Her tür için denenebilir demo uygulamalar" }, yallapp: yes, them: {} },
    ],
  },
  {
    id: "stores",
    title: { en: "Stores and publishing", ar: "المتاجر والنشر", tr: "Mağazalar ve yayın" },
    rows: [
      { id: "two-stores", label: { en: "Google Play and the App Store", ar: "Google Play وApp Store", tr: "Google Play ve App Store" }, yallapp: yes, them: { flutterflow: yes, adalo: yes, appypie: yes } },
      { id: "three-more", label: { en: "Galaxy Store, AppGallery and GetApps", ar: "Galaxy Store وAppGallery وGetApps", tr: "Galaxy Store, AppGallery ve GetApps" }, yallapp: yes, them: {} },
      { id: "publish-studio", label: { en: "We publish for you", ar: "ننشر عنك", tr: "Sizin için yayınlıyoruz" }, yallapp: yes, them: { adalo: part(YOU_UPLOAD), flutterflow: part(YOU_UPLOAD) } },
      { id: "companion", label: { en: "Every app of the project (customers, couriers, vendors) built and published together", ar: "كل تطبيقات المشروع (العملاء والمناديب والبائعين) تُبنى وتُنشر معًا", tr: "Projenin tüm uygulamaları (müşteri, kurye, satıcı) birlikte derlenip yayınlanır" }, yallapp: yes, them: {} },
    ],
  },
];

export function competitor(id: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.id === id);
}

/** A competitor's cell in a row: not listed unless their site says otherwise. */
export function cellOf(row: Row, id: CompetitorId): Cell {
  return row.them[id] ?? nl;
}

/** The categories of the table(s) a competitor is in, with only the rows that compare (both tables for one in both). */
export function tablesFor(c: Competitor): { table: "regular" | "studio"; categories: Category[] }[] {
  return c.tables.map((table) => ({ table, categories: table === "regular" ? REGULAR_TABLE : STUDIO_TABLE }));
}

/** How many rows Yallapp has that a competitor doesn't list: the lead of each page. */
export function leadOver(c: Competitor): { ours: number; total: number } {
  let ours = 0;
  let total = 0;
  for (const { categories } of tablesFor(c)) {
    for (const cat of categories) {
      for (const row of cat.rows) {
        total++;
        if (row.yallapp.mark === "yes" && cellOf(row, c.id).mark !== "yes") ours++;
      }
    }
  }
  return { ours, total };
}

/** The pages' own words, in every language. */
export interface CompareText {
  nav: string;
  eyebrow: string;
  title: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  vsTitle: string;
  vsIntro: string;
  vsMetaTitle: string;
  vsMetaDescription: string;
  regular: string;
  regularText: string;
  studio: string;
  studioText: string;
  feature: string;
  yes: string;
  part: string;
  notListed: string;
  no: string;
  leadsTitle: string;
  leadCount: string;
  statStores: string;
  statLanguages: string;
  statKinds: string;
  statSources: string;
  others: string;
  sources: string;
  checked: string;
  method: string;
  trademarks: string;
  seeVs: string;
  tryDemo: string;
  pricing: string;
}

export const COMPARE_TEXT: Record<Lang, CompareText> = {
  en: {
    nav: "Compare",
    eyebrow: "Compare",
    title: "Yallapp compared with other app builders",
    intro:
      "Every feature of Yallapp's regular apps and Yallapp Studio projects next to AppMySite, MobiLoud, Appy Pie, GoodBarber, FlutterFlow and Adalo, from their own websites.",
    metaTitle: "Yallapp vs other app builders",
    metaDescription: "Yallapp compared with AppMySite, MobiLoud, Appy Pie, GoodBarber, FlutterFlow and Adalo: stores, WordPress, LMS, Arabic, delivery, taxi and schools.",
    vsTitle: "Yallapp vs {name}",
    vsIntro: "{what} Here is every Yallapp feature next to what {name}'s own website lists.",
    vsMetaTitle: "Yallapp vs {name}",
    vsMetaDescription: "Yallapp vs {name}, feature by feature: app stores, publishing, content sources, Arabic and Turkish, payments, chat, analytics and Studio projects.",
    regular: "Regular apps",
    regularText: "Apps for a business, from its website, a platform or no website at all.",
    studio: "Yallapp Studio projects",
    studioText: "Bigger apps designed freely: delivery with a courier app, multi-vendor apps for restaurants and supermarkets, taxis, schools and universities with a staff app.",
    feature: "Feature",
    yes: "Yes",
    part: "With limits",
    notListed: "Not listed",
    no: "No",
    leadsTitle: "Where Yallapp leads",
    leadCount: "{ours} of {total} features here are Yallapp's and not listed by {name}.",
    statStores: "app stores, published for you",
    statLanguages: "languages built in, Arabic right to left",
    statKinds: "kinds of app and Studio project",
    statSources: "plugins and platforms for content",
    others: "Compare one by one",
    sources: "Where each column comes from",
    checked: "Checked on {date} on each company's public pages.",
    method:
      "“Not listed” means we didn't find it on that company's website, not that it's missing. Features change: check each company's site before you decide. Yallapp's column comes from what Yallapp does today.",
    trademarks: "The names on this page are trademarks of their owners, who don't endorse Yallapp and aren't affiliated with it.",
    seeVs: "Yallapp vs {name}",
    tryDemo: "Try a demo app",
    pricing: "See the plans",
  },
  ar: {
    nav: "المقارنة",
    eyebrow: "المقارنة",
    title: "مقارنة Yallapp بمنشئي التطبيقات الآخرين",
    intro:
      "كل ميزة في تطبيقات Yallapp العادية ومشاريع Yallapp Studio بجانب AppMySite وMobiLoud وAppy Pie وGoodBarber وFlutterFlow وAdalo، من مواقعهم نفسها.",
    metaTitle: "Yallapp مقارنةً بمنشئي التطبيقات الآخرين",
    metaDescription: "مقارنة Yallapp بـ AppMySite وMobiLoud وAppy Pie وGoodBarber وFlutterFlow وAdalo: المتاجر وWordPress والتعليم والعربية والتوصيل والتاكسي والمدارس.",
    vsTitle: "Yallapp مقابل {name}",
    vsIntro: "{what} هذه كل ميزة في Yallapp بجانب ما يذكره موقع {name} نفسه.",
    vsMetaTitle: "Yallapp مقابل {name}",
    vsMetaDescription: "Yallapp مقابل {name} ميزةً بميزة: متاجر التطبيقات والنشر ومصادر المحتوى والعربية والتركية والدفع والمحادثة والتحليلات ومشاريع Studio.",
    regular: "التطبيقات العادية",
    regularText: "تطبيقات لنشاط تجاري، من موقعه أو منصة أو بلا موقع.",
    studio: "مشاريع Yallapp Studio",
    studioText: "تطبيقات أكبر بتصميم حر: توصيل مع تطبيق للمناديب، وأسواق طعام وبقالة، وتاكسي، ومدارس وجامعات مع تطبيق للعاملين.",
    feature: "الميزة",
    yes: "نعم",
    part: "بحدود",
    notListed: "غير مذكور",
    no: "لا",
    leadsTitle: "أين يتفوّق Yallapp",
    leadCount: "{ours} من {total} ميزة هنا لدى Yallapp ولا يذكرها {name}.",
    statStores: "متاجر تطبيقات، ننشر عليها عنك",
    statLanguages: "لغات مدمجة، والعربية من اليمين إلى اليسار",
    statKinds: "نوعًا من التطبيقات ومشاريع Studio",
    statSources: "إضافة ومنصة للمحتوى",
    others: "قارن واحدًا واحدًا",
    sources: "مصدر كل عمود",
    checked: "رُوجعت في {date} على الصفحات العامة لكل شركة.",
    method:
      "«غير مذكور» يعني أننا لم نجده في موقع تلك الشركة، لا أنه غير موجود. المزايا تتغيّر: راجع موقع كل شركة قبل أن تقرّر. عمود Yallapp مأخوذ مما يفعله Yallapp اليوم.",
    trademarks: "الأسماء في هذه الصفحة علامات تجارية لأصحابها، ولا يرتبطون بـ Yallapp ولا يؤيّدونه.",
    seeVs: "Yallapp مقابل {name}",
    tryDemo: "جرّب تطبيقًا تجريبيًا",
    pricing: "اطّلع على الباقات",
  },
  tr: {
    nav: "Karşılaştır",
    eyebrow: "Karşılaştırma",
    title: "Yallapp ve diğer uygulama oluşturucular",
    intro:
      "Yallapp'in normal uygulamalarının ve Yallapp Studio projelerinin tüm özellikleri; AppMySite, MobiLoud, Appy Pie, GoodBarber, FlutterFlow ve Adalo'nun kendi siteleriyle yan yana.",
    metaTitle: "Yallapp ve diğer uygulama oluşturucular",
    metaDescription: "Yallapp; AppMySite, MobiLoud, Appy Pie, GoodBarber, FlutterFlow ve Adalo ile: mağazalar, WordPress, LMS, Arapça, teslimat, taksi ve okullar.",
    vsTitle: "Yallapp ve {name}",
    vsIntro: "{what} Yallapp'in her özelliği, {name} sitesinin kendi listesiyle yan yana.",
    vsMetaTitle: "Yallapp ve {name}",
    vsMetaDescription: "Yallapp ve {name}, özellik özellik: uygulama mağazaları, yayın, içerik kaynakları, Arapça ve Türkçe, ödeme, sohbet, analiz ve Studio projeleri.",
    regular: "Normal uygulamalar",
    regularText: "Bir işletme için; web sitesinden, bir platformdan ya da sitesiz uygulamalar.",
    studio: "Yallapp Studio projeleri",
    studioText: "Özgürce tasarlanan büyük uygulamalar: kurye uygulamalı teslimat, yemek ve market pazaryerleri, taksi, personel uygulamalı okul ve üniversiteler.",
    feature: "Özellik",
    yes: "Evet",
    part: "Sınırlı",
    notListed: "Belirtilmemiş",
    no: "Hayır",
    leadsTitle: "Yallapp'in öne çıktığı yerler",
    leadCount: "Buradaki {total} özellikten {ours} tanesi Yallapp'te var ve {name} sitesinde belirtilmemiş.",
    statStores: "uygulama mağazası, sizin için yayın",
    statLanguages: "yerleşik dil, sağdan sola Arapça",
    statKinds: "uygulama ve Studio proje türü",
    statSources: "içerik eklentisi ve platformu",
    others: "Tek tek karşılaştırın",
    sources: "Her sütunun kaynağı",
    checked: "Her şirketin herkese açık sayfalarında {date} tarihinde kontrol edildi.",
    method:
      "“Belirtilmemiş”, o şirketin sitesinde bulamadığımız anlamına gelir; olmadığı anlamına gelmez. Özellikler değişir: karar vermeden önce her şirketin sitesine bakın. Yallapp sütunu Yallapp'in bugün yaptıklarından gelir.",
    trademarks: "Bu sayfadaki adlar sahiplerinin ticari markalarıdır; sahipleri Yallapp'i onaylamaz ve Yallapp ile bağlantılı değildir.",
    seeVs: "Yallapp ve {name}",
    tryDemo: "Demo uygulamayı deneyin",
    pricing: "Paketleri görün",
  },
};

/** A row of the regular apps and Studio comparison: what each one gives. */
export interface DuoRow {
  id: string;
  label: L;
  regular: Cell;
  studio: Cell;
}

const t = (en: string, ar: string, tr: string): L => ({ en, ar, tr });

/** Yallapp's regular apps next to Yallapp Studio projects, to pick the right one. */

export const DUO_TABLE: { id: string; title: L; rows: DuoRow[] }[] = [
  {
    id: "who",
    title: t("Who it's for", "لمن هو", "Kimin için"),
    rows: [
      {
        id: "for",
        label: t("Made for", "مصمَّم لـ", "Kimin için yapıldı"),
        regular: y(t("A business that wants its own app fast: a shop, academy, restaurant, clinic, gym or charity", "نشاط يريد تطبيقه بسرعة: متجر أو أكاديمية أو مطعم أو عيادة أو صالة رياضية أو جمعية", "Hızla kendi uygulamasını isteyen işletme: mağaza, akademi, restoran, klinik, spor salonu veya yardım kuruluşu")),
        studio: y(t("A company running a bigger service: deliveries, a multi-vendor app, taxis, a school or a university", "شركة تدير خدمة أكبر: توصيل أو تطبيق متعدد المتاجر أو تاكسي أو مدرسة أو جامعة", "Daha büyük bir hizmet yöneten şirket: teslimat, çok satıcılı uygulama, taksi, okul veya üniversite")),
      },
      {
        id: "setup",
        label: t("How you make it", "كيف تصنعه", "Nasıl yapılır"),
        regular: y(t("Pick your kind of app, connect your content, choose a template", "اختر نوع تطبيقك واربط محتواك واختر قالبًا", "Uygulama türünü seçin, içeriğinizi bağlayın, şablon seçin")),
        studio: y(t("Pick a project kind and a template, then design every page in the Studio editor", "اختر نوع المشروع وقالبًا، ثم صمّم كل صفحة في محرّر Studio", "Proje türü ve şablon seçin, sonra her sayfayı Studio düzenleyicide tasarlayın")),
      },
    ],
  },
  {
    id: "kinds",
    title: t("Kinds of app", "أنواع التطبيقات", "Uygulama türleri"),
    rows: [
      { id: "shop", label: t("Shop, café and restaurant", "متجر ومقهى ومطعم", "Mağaza, kafe ve restoran"), regular: yes, studio: yes },
      { id: "courses", label: t("Academy and online courses", "أكاديمية ودورات", "Akademi ve online kurslar"), regular: yes, studio: y(t("With many teachers", "بمعلمين كثيرين", "Çok öğretmenli")) },
      { id: "bookings", label: t("Clinics, salons and gyms with bookings", "عيادات وصالونات وصالات رياضية بالحجوزات", "Rezervasyonlu klinik, salon ve spor salonu"), regular: yes, studio: yes },
      { id: "other", label: t("Real estate, news, events and charities", "عقارات وأخبار وفعاليات وجمعيات", "Emlak, haber, etkinlik ve yardım kuruluşları"), regular: yes, studio: yes },
      { id: "delivery", label: t("Delivery company with couriers", "شركة توصيل بمناديب", "Kuryeli teslimat şirketi"), regular: no, studio: yes },
      { id: "food", label: t("Food delivery from many restaurants", "توصيل طعام من مطاعم كثيرة", "Birçok restorandan yemek teslimatı"), regular: no, studio: yes },
      { id: "market", label: t("Multi-vendor apps for restaurants and supermarkets, with a panel for each", "تطبيقات متعددة المتاجر للمطاعم والسوبر ماركت، بلوحة لكلٍّ منها", "Her birine panelli, restoran ve süpermarketler için çok satıcılı uygulamalar"), regular: no, studio: yes },
      { id: "rides", label: t("Rides and taxis", "رحلات وتاكسي", "Yolculuk ve taksi"), regular: no, studio: yes },
      { id: "school", label: t("Schools and universities", "مدارس وجامعات", "Okullar ve üniversiteler"), regular: no, studio: yes },
    ],
  },
  {
    id: "content",
    title: t("Content", "المحتوى", "İçerik"),
    rows: [
      { id: "wp", label: t("WordPress with Yallapp's plugin, LMS and WooCommerce", "WordPress بإضافة Yallapp والتعليم وWooCommerce", "Yallapp eklentisiyle WordPress, LMS ve WooCommerce"), regular: yes, studio: yes },
      { id: "platforms", label: t("Shopify and the other platforms", "Shopify والمنصات الأخرى", "Shopify ve diğer platformlar"), regular: yes, studio: yes },
      { id: "api", label: t("Your own API", "واجهتك البرمجية", "Kendi API'niz"), regular: yes, studio: yes },
      { id: "nosite", label: t("No website: managed in the dashboard", "بلا موقع: يُدار من لوحة التحكم", "Sitesiz: panelden yönetilir"), regular: yes, studio: yes },
    ],
  },
  {
    id: "design",
    title: t("Design", "التصميم", "Tasarım"),
    rows: [
      { id: "templates", label: t("Templates", "القوالب", "Şablonlar"), regular: y(t("Classic, Bold and Minimal, light and dark", "كلاسيكي وجريء وبسيط، فاتح وداكن", "Klasik, Cesur ve Minimal; açık ve koyu")), studio: y(t("Complete templates per project kind, to take as they are and change", "قوالب كاملة لكل نوع مشروع، تأخذها كما هي وتعدّلها", "Her proje türü için olduğu gibi alıp değiştirilebilen eksiksiz şablonlar")) },
      { id: "pages", label: t("Pages", "الصفحات", "Sayfalar"), regular: y(t("A page editor with blocks", "محرّر صفحات بالكتل", "Bloklarla sayfa düzenleyici")), studio: y(t("A free visual editor: every element, its size, place and colors", "محرّر مرئي حر: كل عنصر وحجمه ومكانه وألوانه", "Serbest görsel düzenleyici: her öğe, boyutu, yeri ve renkleri")) },
      { id: "motion", label: t("Motion", "الحركة", "Hareket"), regular: no, studio: y(t("On the plans that include it", "في الباقات التي تتضمّنها", "İçeren paketlerde")) },
      { id: "langs", label: t("English, Arabic (right to left) and Turkish", "الإنجليزية والعربية (من اليمين إلى اليسار) والتركية", "İngilizce, Arapça (sağdan sola) ve Türkçe"), regular: yes, studio: yes },
    ],
  },
  {
    id: "apps",
    title: t("Apps in the bundle", "التطبيقات في الباقة", "Paketteki uygulamalar"),
    rows: [
      { id: "customer", label: t("Your customers' app", "تطبيق عملائك", "Müşterilerinizin uygulaması"), regular: yes, studio: yes },
      { id: "business", label: t("Yallapp Business for you and your team", "Yallapp Business لك ولفريقك", "Siz ve ekibiniz için Yallapp Business"), regular: yes, studio: yes },
      { id: "courier", label: t("A courier app (Yallapp Courier, or your own branded one)", "تطبيق للمناديب (Yallapp Courier أو تطبيق باسمك)", "Kurye uygulaması (Yallapp Courier veya kendi markanızla)"), regular: no, studio: yes },
      { id: "vendor", label: t("A vendor app and web panel for each restaurant or shop", "تطبيق ولوحة ويب لكل مطعم أو متجر", "Her restoran veya mağaza için satıcı uygulaması ve web paneli"), regular: no, studio: yes },
      // 116 Schools', universities' and academies' teachers and staff in their own app.
      { id: "staff", label: t("A staff app for a school's or academy's teachers and staff", "تطبيق للعاملين لمعلمي المدرسة أو الأكاديمية وموظفيها", "Okul veya akademinin öğretmenleri ve personeli için personel uygulaması"), regular: no, studio: yes },
    ],
  },
  {
    id: "maps",
    title: t("Maps and tracking", "الخرائط والتتبع", "Harita ve takip"),
    rows: [
      { id: "live", label: t("Live map of couriers and drivers", "خريطة حيّة للمناديب والسائقين", "Kurye ve sürücülerin canlı haritası"), regular: no, studio: yes },
      { id: "bus", label: t("School bus on the parents' map", "باص المدرسة على خريطة أولياء الأمور", "Velilerin haritasında okul servisi"), regular: no, studio: yes },
      { id: "stages", label: t("Order stages in the app", "مراحل الطلب في التطبيق", "Uygulamada sipariş aşamaları"), regular: yes, studio: yes },
    ],
  },
  {
    id: "money",
    title: t("Payments and selling", "المدفوعات والبيع", "Ödemeler ve satış"),
    rows: [
      { id: "cards", label: t("Card payments and in-app purchases", "الدفع بالبطاقة والشراء داخل التطبيق", "Kartla ödeme ve uygulama içi satın alma"), regular: yes, studio: yes },
      { id: "cod", label: t("Cash on delivery", "الدفع عند الاستلام", "Kapıda ödeme"), regular: no, studio: yes },
      { id: "loyalty", label: t("Loyalty and coupons", "الولاء والكوبونات", "Sadakat ve kuponlar"), regular: yes, studio: yes },
      { id: "commission", label: t("Commission, tax and statements per vendor", "العمولة والضريبة وكشف حساب لكل بائع", "Satıcı başına komisyon, vergi ve ekstre"), regular: no, studio: yes },
      { id: "complaints", label: t("Complaints center with refunds", "مركز شكاوى بالاسترداد", "İadeli şikâyet merkezi"), regular: no, studio: yes },
    ],
  },
  {
    id: "team",
    title: t("Team, publishing and support", "الفريق والنشر والدعم", "Ekip, yayın ve destek"),
    rows: [
      { id: "roles", label: t("Team members with roles", "أعضاء فريق بأدوار", "Rollere sahip ekip üyeleri"), regular: yes, studio: y(t("Plus couriers, drivers, teachers and vendor staff", "ومعهم المناديب والسائقون والمعلمون وموظفو البائعين", "Kurye, sürücü, öğretmen ve satıcı personeli de")) },
      { id: "stores", label: t("Google Play, the App Store, Galaxy Store, AppGallery and GetApps", "Google Play وApp Store وGalaxy Store وAppGallery وGetApps", "Google Play, App Store, Galaxy Store, AppGallery ve GetApps"), regular: yes, studio: yes },
      { id: "publish", label: t("We publish for you", "ننشر عنك", "Sizin için yayınlıyoruz"), regular: y(t("On Pro and Business", "في Pro وBusiness", "Pro ve Business'ta")), studio: y(t("On the plans that include it", "في الباقات التي تتضمّنها", "İçeren paketlerde")) },
      { id: "support", label: t("Support on WhatsApp", "دعم على واتساب", "WhatsApp desteği"), regular: yes, studio: yes },
      { id: "plans", label: t("Plans", "الباقات", "Paketler"), regular: y(t("Starter, Growth, Pro and Business", "Starter وGrowth وPro وBusiness", "Starter, Growth, Pro ve Business")), studio: y(t("Studio's own plans", "باقات Studio الخاصة", "Studio'nun kendi paketleri")) },
    ],
  },
];

export const DUO_TEXT: Record<Lang, { title: string; intro: string; metaTitle: string; metaDescription: string; regular: string; studio: string; soon: string; pick: string; pickRegular: string; pickStudio: string }> = {
  en: {
    title: "Yallapp regular apps or Yallapp Studio?",
    intro: "Both are Yallapp: the same stores, languages and publishing. Regular apps are ready for each kind of business; Studio is for bigger services you design freely.",
    metaTitle: "Yallapp regular apps vs Yallapp Studio",
    metaDescription: "Regular Yallapp apps or a Yallapp Studio project? Kinds of app, content, design, courier and vendor apps, live maps, payments, team and publishing.",
    regular: "Regular apps",
    studio: "Yallapp Studio",
    soon: "Rolling out",
    pick: "Which one to pick",
    pickRegular: "Pick a regular app when your business is one of the kinds on the list and you want it in the stores soon, with your content and a ready template.",
    pickStudio: "Pick Studio when you run deliveries, a multi-vendor app, taxis, a school or a university, need extra apps for couriers, vendors or staff, or want to design every page.",
  },
  ar: {
    title: "تطبيقات Yallapp العادية أم Yallapp Studio؟",
    intro: "كلاهما Yallapp: المتاجر نفسها واللغات نفسها والنشر نفسه. التطبيقات العادية جاهزة لكل نوع من الأعمال، وStudio للخدمات الأكبر التي تصمّمها بحرية.",
    metaTitle: "تطبيقات Yallapp العادية مقابل Yallapp Studio",
    metaDescription: "تطبيق Yallapp عادي أم مشروع Yallapp Studio؟ أنواع التطبيقات والمحتوى والتصميم وتطبيقات المناديب والبائعين والخرائط والدفع والفريق والنشر.",
    regular: "التطبيقات العادية",
    studio: "Yallapp Studio",
    soon: "قيد الإطلاق",
    pick: "أيّهما تختار",
    pickRegular: "اختر تطبيقًا عاديًا إذا كان نشاطك من الأنواع الموجودة وتريده على المتاجر قريبًا، بمحتواك وقالب جاهز.",
    pickStudio: "اختر Studio إذا كنت تدير توصيلًا أو تطبيقًا متعدد المتاجر أو تاكسي أو مدرسة أو جامعة، أو تحتاج تطبيقات للمناديب أو البائعين أو العاملين، أو تريد تصميم كل صفحة.",
  },
  tr: {
    title: "Yallapp normal uygulama mı, Yallapp Studio mu?",
    intro: "İkisi de Yallapp: aynı mağazalar, diller ve yayın. Normal uygulamalar her işletme türü için hazırdır; Studio, özgürce tasarladığınız büyük hizmetler içindir.",
    metaTitle: "Yallapp normal uygulamalar ve Yallapp Studio",
    metaDescription: "Normal Yallapp uygulaması mı, Yallapp Studio projesi mi? Uygulama türleri, içerik, tasarım, kurye ve satıcı uygulamaları, harita, ödeme ve yayın.",
    regular: "Normal uygulamalar",
    studio: "Yallapp Studio",
    soon: "Yayına alınıyor",
    pick: "Hangisini seçmeli",
    pickRegular: "İşletmeniz listedeki türlerdense ve içeriğiniz ile hazır bir şablonla yakında mağazalarda olmak istiyorsanız normal uygulamayı seçin.",
    pickStudio: "Teslimat, çok satıcılı uygulama, taksi, okul veya üniversite işletiyorsanız, kurye, satıcı veya personel uygulamaları gerekiyorsa ya da her sayfayı tasarlamak istiyorsanız Studio'yu seçin.",
  },
};

/** The address of the regular apps and Studio comparison: /compare/regular-vs-studio. */
export const DUO_SLUG = "regular-vs-studio";

/** Every /compare/<name> page: one per competitor, and regular apps vs Studio. */
export function compareParams(): { name: string }[] {
  return [...COMPETITORS.map((c) => ({ name: c.id })), { name: DUO_SLUG }];
}
