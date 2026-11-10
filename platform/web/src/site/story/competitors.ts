import type { Lang } from "@/i18n";
import type { StoryId } from "./types";

/**
 * The comparison on each story page: companies that make and sell such
 * apps (SaaS builders, white-label and clone-script vendors), what their own
 * sites say, checked on 10 November 2026, with the pages it comes from.
 * Only rows their sites state plainly: which apps come with it, whether the
 * apps carry the client's own name, how it is priced, whether prices are
 * published, and whether Arabic is stated. No prices are quoted (several
 * vendors give different ones on their own pages). Fair and factual: where
 * a site says nothing, the cell says "not stated".
 */

type Cell = Record<Lang, string>;

export interface CompareColumn {
  name: string;
  kind: Cell;
  apps: Cell;
  ownName: Cell;
  pricing: Cell;
  published: Cell;
  arabic: Cell;
  /** The vendor's own pages these come from. */
  sources: string[];
}

const NOT_STATED: Cell = { en: "Not stated", ar: "غير مذكور", tr: "Belirtilmemiş" };
const YES_PUBLISHED: Cell = { en: "Yes", ar: "نعم", tr: "Evet" };
const NOT_PUBLISHED: Cell = { en: "No, on request", ar: "لا، عند الطلب", tr: "Hayır, talep üzerine" };

const SAAS: Cell = { en: "Subscription software", ar: "برنامج باشتراك", tr: "Abonelikli yazılım" };
const SCRIPT: Cell = { en: "Source code to buy and run", ar: "شيفرة مصدرية تُشترى وتُشغَّل", tr: "Satın alınıp çalıştırılan kaynak kod" };
const CLONE: Cell = { en: "White-label and clone apps", ar: "تطبيقات جاهزة بعلامتك أو مستنسخة", tr: "Beyaz etiketli ve klon uygulamalar" };
const QUOTE: Cell = { en: "Quote per project", ar: "عرض سعر لكل مشروع", tr: "Proje başına teklif" };

const COLUMNS = {
  classera: {
    name: "Classera",
    kind: SAAS,
    apps: { en: "One app with a view for each role; fees, bus and pick-up services", ar: "تطبيق واحد بواجهة لكل دور؛ وخدمات للرسوم والحافلة والاستلام", tr: "Her rol için bir görünümlü tek uygulama; ücret, servis ve teslim alma hizmetleri" },
    ownName: { en: "Not stated; its store app is listed as Classera", ar: "غير مذكور؛ تطبيقه في المتجر باسم Classera", tr: "Belirtilmemiş; mağazadaki uygulaması Classera adıyla" },
    pricing: { en: "Demo or trial first; the fees service is a subscription", ar: "عرض توضيحي أو تجربة أولًا؛ وخدمة الرسوم باشتراك", tr: "Önce demo veya deneme; ücret hizmeti abonelikle" },
    published: NOT_PUBLISHED,
    arabic: { en: "Yes: an Arabic site and app listing", ar: "نعم: موقع وصفحة تطبيق بالعربية", tr: "Evet: Arapça site ve uygulama sayfası" },
    sources: ["https://classera.com/en/company/new_release/", "https://classera.com/en/products/c-pay/", "https://classera.com/ar/requestdemo/"],
  },
  fedena: {
    name: "Fedena",
    kind: SAAS,
    apps: { en: "Apps for parents, teachers and students, with an administrator view", ar: "تطبيقات لأولياء الأمور والمعلمين والطلاب، مع واجهة للإدارة", tr: "Veliler, öğretmenler ve öğrenciler için uygulamalar, yönetici görünümüyle" },
    ownName: { en: "Yes, stated: apps in the school's brand", ar: "نعم، مذكور: تطبيقات بعلامة المدرسة", tr: "Evet, belirtilmiş: okulun markasıyla uygulamalar" },
    pricing: { en: "Yearly subscription; cost depends on the plugins chosen", ar: "اشتراك سنوي؛ والتكلفة بحسب الإضافات المختارة", tr: "Yıllık abonelik; maliyet seçilen eklentilere göre" },
    published: { en: "Yes, for its plans; the mobile app's price not shown", ar: "نعم لباقاته؛ وسعر تطبيق الهاتف غير معروض", tr: "Paketleri için evet; mobil uygulamanın fiyatı gösterilmiyor" },
    arabic: { en: "Arabic listed; right to left stated for the web product", ar: "العربية مذكورة؛ والاتجاه من اليمين لليسار مذكور لنسخة الويب", tr: "Arapça listede; sağdan sola web ürünü için belirtilmiş" },
    sources: ["https://fedena.com/pricing-and-plans", "https://fedena.com/mobile_app", "https://fedena.com/101-reasons"],
  },
  myclassboard: {
    name: "MyClassboard",
    kind: SAAS,
    apps: { en: "Teacher, parent, transport and school admin apps", ar: "تطبيقات للمعلم وولي الأمر والنقل وإدارة المدرسة", tr: "Öğretmen, veli, ulaşım ve okul yönetimi uygulamaları" },
    ownName: { en: "The school's logo inside its apps; an own store listing not stated", ar: "شعار المدرسة داخل تطبيقاته؛ ولا ذكر لصفحة متجر باسمها", tr: "Okulun logosu uygulamalarının içinde; ayrı mağaza sayfası belirtilmemiş" },
    pricing: { en: "Not published; apps included with the licence", ar: "غير منشور؛ والتطبيقات ضمن الترخيص", tr: "Yayınlanmamış; uygulamalar lisansa dahil" },
    published: NOT_PUBLISHED,
    arabic: NOT_STATED,
    sources: ["https://www.myclassboard.com/mobile-apps/", "https://www.myclassboard.com/why-myclassboard/"],
  },
  eschool: {
    name: "WRTeam eSchool",
    kind: SCRIPT,
    apps: { en: "Student and parent app, teacher and staff app, web admin", ar: "تطبيق للطالب وولي الأمر، وتطبيق للمعلم والموظفين، ولوحة ويب", tr: "Öğrenci ve veli uygulaması, öğretmen ve personel uygulaması, web yönetimi" },
    ownName: { en: "You rebrand it and publish it yourself", ar: "تغيّر علامته وتنشره بنفسك", tr: "Markasını siz değiştirip kendiniz yayınlarsınız" },
    pricing: { en: "One-time licence; hosting and publishing are yours", ar: "ترخيص لمرة واحدة؛ والاستضافة والنشر عليك", tr: "Tek seferlik lisans; barındırma ve yayın sizde" },
    published: YES_PUBLISHED,
    arabic: NOT_STATED,
    sources: ["https://marketplace.wrteam.in/products/eschool-saas-multi-school-management-erp"],
  },
  appscrip: {
    name: "Appscrip",
    kind: CLONE,
    apps: { en: "Rider app, driver app, dispatch console, admin panel", ar: "تطبيق للراكب، وتطبيق للسائق، ولوحة توزيع، ولوحة إدارة", tr: "Yolcu uygulaması, sürücü uygulaması, sevk konsolu, yönetim paneli" },
    ownName: { en: "Yes, white-label; store submission in its process", ar: "نعم، بعلامتك؛ والنشر في المتاجر ضمن خطواته", tr: "Evet, beyaz etiket; mağaza gönderimi sürecinde" },
    pricing: { en: "Project price; add-on modules priced separately", ar: "سعر للمشروع؛ والوحدات الإضافية بسعر منفصل", tr: "Proje fiyatı; ek modüller ayrı fiyatlı" },
    published: { en: "Starting prices, different on different pages", ar: "أسعار بداية تختلف من صفحة لأخرى", tr: "Sayfadan sayfaya değişen başlangıç fiyatları" },
    arabic: { en: "Arabic and English stated on its Dubai pages", ar: "العربية والإنجليزية مذكورتان في صفحات دبي", tr: "Dubai sayfalarında Arapça ve İngilizce belirtilmiş" },
    sources: ["https://appscrip.com/uber-clone/", "https://appscrip.com/white-label-taxi-app/", "https://appscrip.com/blog/taxi-app-development-dubai/"],
  },
  onde: {
    name: "Onde",
    kind: SAAS,
    apps: { en: "Passenger and driver apps, dispatch and admin panels", ar: "تطبيقا الراكب والسائق، ولوحتا التوزيع والإدارة", tr: "Yolcu ve sürücü uygulamaları, sevk ve yönetim panelleri" },
    ownName: { en: "Yes, white-label; Onde publishes the apps", ar: "نعم، بعلامتك؛ وOnde تنشر التطبيقات", tr: "Evet, beyaz etiket; uygulamaları Onde yayınlar" },
    pricing: { en: "Setup fee, then a monthly fee or a share of revenue", ar: "رسوم تأسيس، ثم رسوم شهرية أو نسبة من الإيراد", tr: "Kurulum ücreti, sonra aylık ücret veya gelir payı" },
    published: { en: "Some, on its blog pages", ar: "بعضها، في صفحات مدونته", tr: "Bazıları, blog sayfalarında" },
    arabic: NOT_STATED,
    sources: ["https://onde.app/blog/how-to-start-taxi-business-initial-costs", "https://onde.app/blog/startups/best-white-label-ride-hailing-apps-2025"],
  },
  apporio: {
    name: "Apporio",
    kind: CLONE,
    apps: { en: "User app, driver app, admin and dispatcher panels", ar: "تطبيق للمستخدم، وتطبيق للسائق، ولوحتا الإدارة والتوزيع", tr: "Kullanıcı uygulaması, sürücü uygulaması, yönetim ve sevk panelleri" },
    ownName: { en: "Yes; its team publishes the apps", ar: "نعم؛ وفريقه ينشر التطبيقات", tr: "Evet; uygulamaları ekibi yayınlar" },
    pricing: QUOTE,
    published: NOT_PUBLISHED,
    arabic: NOT_STATED,
    sources: ["https://www.apporio.com/product/apporio-taxi-uber-clone-script", "https://www.apporio.com/product/super-app-development"],
  },
  codebrewRides: {
    name: "Code Brew Labs",
    kind: { en: "Agency with ready-made clone apps", ar: "وكالة بتطبيقات مستنسخة جاهزة", tr: "Hazır klon uygulamaları olan ajans" },
    apps: { en: "Customer and driver apps, admin and dispatcher dashboard", ar: "تطبيقا العميل والسائق، ولوحة الإدارة والتوزيع", tr: "Müşteri ve sürücü uygulamaları, yönetim ve sevk paneli" },
    ownName: { en: "White-label apps; store listing not stated", ar: "تطبيقات بعلامتك؛ ولا ذكر لصفحة المتجر", tr: "Beyaz etiketli uygulamalar; mağaza sayfası belirtilmemiş" },
    pricing: QUOTE,
    published: { en: "Estimates on its articles only", ar: "تقديرات في مقالاته فقط", tr: "Yalnızca makalelerinde tahminler" },
    arabic: NOT_STATED,
    sources: ["https://www.code-brew.com/uber-clone/", "https://www.code-brew.com/how-much-is-the-cost-for-taxi-app-development/"],
  },
  tookan: {
    name: "Tookan",
    kind: SAAS,
    apps: { en: "Driver app and dashboard; a customer app on some tiers", ar: "تطبيق للسائق ولوحة؛ وتطبيق للعميل في بعض الباقات", tr: "Sürücü uygulaması ve panel; bazı paketlerde müşteri uygulaması" },
    ownName: { en: "On paid tiers; its terms say the apps stay Tookan's property", ar: "في باقات مدفوعة؛ وشروطه تقول إن التطبيقات تبقى ملكًا لـ Tookan", tr: "Ücretli paketlerde; şartlarına göre uygulamalar Tookan'ın mülkü kalır" },
    pricing: { en: "Monthly, with a fee per task over the plan", ar: "شهري، مع رسوم لكل مهمة فوق الباقة", tr: "Aylık, paketi aşan her görev için ücret" },
    published: YES_PUBLISHED,
    arabic: { en: "Arabic listed for the driver app", ar: "العربية مذكورة لتطبيق السائق", tr: "Sürücü uygulaması için Arapça listede" },
    sources: ["https://jungleworks.com/tookan/pricing/", "https://jungleworks.com/tookan/terms-of-service/", "https://help.jungleworks.com/knowledge-base/languages-supported/"],
  },
  shipday: {
    name: "Shipday",
    kind: SAAS,
    apps: { en: "Driver app, dispatch and tracking page; no customer ordering app", ar: "تطبيق للسائق ولوحة توزيع وصفحة تتبع؛ بلا تطبيق طلب للعملاء", tr: "Sürücü uygulaması, sevk ve takip sayfası; müşteri sipariş uygulaması yok" },
    ownName: { en: "Your brand inside the Shipday Driver app and on tracking", ar: "علامتك داخل تطبيق Shipday Driver وفي التتبع", tr: "Markanız Shipday Driver uygulamasının içinde ve takipte" },
    pricing: { en: "Monthly, with a fee per order over the plan", ar: "شهري، مع رسوم لكل طلب فوق الباقة", tr: "Aylık, paketi aşan her sipariş için ücret" },
    published: YES_PUBLISHED,
    arabic: NOT_STATED,
    sources: ["https://www.shipday.com/pricing", "https://www.shipday.com/features/branded-tracking-and-customer-communication"],
  },
  onfleet: {
    name: "Onfleet",
    kind: SAAS,
    apps: { en: "Driver app, dispatcher dashboard, tracking page", ar: "تطبيق للسائق، ولوحة للموزّع، وصفحة تتبع", tr: "Sürücü uygulaması, sevk paneli, takip sayfası" },
    ownName: { en: "The tracking page only; its apps keep Onfleet's name", ar: "صفحة التتبع فقط؛ وتطبيقاته تبقى باسم Onfleet", tr: "Yalnızca takip sayfası; uygulamaları Onfleet adını taşır" },
    pricing: { en: "Monthly, with a fee per delivery over the plan", ar: "شهري، مع رسوم لكل توصيلة فوق الباقة", tr: "Aylık, paketi aşan her teslimat için ücret" },
    published: YES_PUBLISHED,
    arabic: { en: "Yes, in the driver app", ar: "نعم، في تطبيق السائق", tr: "Evet, sürücü uygulamasında" },
    sources: ["https://onfleet.com/pricing", "https://onfleet.com/blog/frequently-asked-questions-about-onfleet/", "https://support.onfleet.com/hc/en-us/articles/360023910491-Driver-Settings"],
  },
  apporioDelivery: {
    name: "Apporio",
    kind: CLONE,
    apps: { en: "Customer app, delivery partner app, admin panel", ar: "تطبيق للعميل، وتطبيق للمندوب، ولوحة إدارة", tr: "Müşteri uygulaması, teslimat ortağı uygulaması, yönetim paneli" },
    ownName: { en: "Yes, under your store account", ar: "نعم، في حسابك على المتجر", tr: "Evet, mağaza hesabınızda" },
    pricing: { en: "One-time payment, by quote", ar: "دفعة واحدة، بعرض سعر", tr: "Tek seferlik ödeme, teklifle" },
    published: NOT_PUBLISHED,
    arabic: NOT_STATED,
    sources: ["https://www.apporio.com/product/logistics-app-development", "https://www.apporio.com/product/delivery-app-development"],
  },
  yelo: {
    name: "Yelo",
    kind: SAAS,
    apps: { en: "Customer apps; vendor and driver apps on higher tiers", ar: "تطبيقات للعملاء؛ وتطبيقات للمتاجر والسائقين في باقات أعلى", tr: "Müşteri uygulamaları; satıcı ve sürücü uygulamaları üst paketlerde" },
    ownName: { en: "Depends on the tier", ar: "بحسب الباقة", tr: "Pakete göre" },
    pricing: { en: "Monthly tiers; a fee per order over the plan", ar: "باقات شهرية؛ ورسوم لكل طلب فوق الباقة", tr: "Aylık paketler; paketi aşan her sipariş için ücret" },
    published: YES_PUBLISHED,
    arabic: { en: "Right to left stated; Arabic checkout shown", ar: "الاتجاه من اليمين لليسار مذكور؛ ودفع بالعربية معروض", tr: "Sağdan sola belirtilmiş; Arapça ödeme gösterilmiş" },
    sources: ["https://jungleworks.com/yelo/pricing/", "https://jungleworks.com/yelo/online-marketplace-software/", "https://help.jungleworks.com/yelo/whats-new/"],
  },
  enatega: {
    name: "Enatega",
    kind: { en: "One-time licence", ar: "ترخيص لمرة واحدة", tr: "Tek seferlik lisans" },
    apps: { en: "Customer, rider and vendor apps, web dashboard, admin", ar: "تطبيقات للعميل والمندوب والمتجر، ولوحة ويب، وإدارة", tr: "Müşteri, kurye ve satıcı uygulamaları, web paneli, yönetim" },
    ownName: { en: "Yes; publishing included on its higher plan", ar: "نعم؛ والنشر ضمن باقته الأعلى", tr: "Evet; yayın üst paketine dahil" },
    pricing: { en: "One-time payment, no commission on orders", ar: "دفعة واحدة، بلا عمولة على الطلبات", tr: "Tek seferlik ödeme, siparişlerden komisyon yok" },
    published: { en: "No, quoted on a call", ar: "لا، يُعرض السعر في مكالمة", tr: "Hayır, görüşmede teklif" },
    arabic: { en: "Yes, Arabic right to left", ar: "نعم، العربية من اليمين لليسار", tr: "Evet, sağdan sola Arapça" },
    sources: ["https://enatega.com/", "https://enatega.com/enatega-multivendor-one-time-license-marketplace/", "https://enatega.com/yalla-delivery/"],
  },
  deonde: {
    name: "Deonde",
    kind: SAAS,
    apps: { en: "Customer, driver and partner apps, admin, ordering website", ar: "تطبيقات للعميل والسائق والشريك، وإدارة، وموقع للطلب", tr: "Müşteri, sürücü ve iş ortağı uygulamaları, yönetim, sipariş sitesi" },
    ownName: { en: "Yes, for a one-time fee per app", ar: "نعم، برسوم لمرة واحدة لكل تطبيق", tr: "Evet, uygulama başına tek seferlik ücretle" },
    pricing: { en: "Monthly, no commission; a fee per order over the plan", ar: "شهري بلا عمولة؛ ورسوم لكل طلب فوق الباقة", tr: "Aylık, komisyonsuz; paketi aşan her sipariş için ücret" },
    published: YES_PUBLISHED,
    arabic: { en: "Yes, Arabic and right to left", ar: "نعم، العربية ومن اليمين لليسار", tr: "Evet, Arapça ve sağdan sola" },
    sources: ["https://deonde.co/pricing.shtml", "https://deonde.co/faq.shtml", "https://deonde.co/talabat-alternative.shtml"],
  },
  sixammart: {
    name: "6amMart",
    kind: SCRIPT,
    apps: { en: "Customer app, admin and store panels; store and delivery apps sold separately", ar: "تطبيق للعميل ولوحتا الإدارة والمتجر؛ وتطبيقا المتجر والتوصيل يُباعان منفصلين", tr: "Müşteri uygulaması, yönetim ve mağaza panelleri; mağaza ve teslimat uygulamaları ayrı satılır" },
    ownName: { en: "You rebrand it; publishing is a paid extra", ar: "تغيّر علامته بنفسك؛ والنشر خدمة مدفوعة إضافية", tr: "Markasını siz değiştirirsiniz; yayın ücretli ek hizmet" },
    pricing: { en: "One-time licences, paid installation optional", ar: "تراخيص لمرة واحدة، والتثبيت المدفوع اختياري", tr: "Tek seferlik lisanslar, ücretli kurulum isteğe bağlı" },
    published: YES_PUBLISHED,
    arabic: { en: "Right to left stated", ar: "الاتجاه من اليمين لليسار مذكور", tr: "Sağdan sola belirtilmiş" },
    sources: ["https://6ammart.app/pricing/", "https://6ammart.app/features/", "https://6ammart.app/installation/"],
  },
} satisfies Record<string, CompareColumn>;

/** Each story's companies, in the order shown. */
const BY_STORY: Record<StoryId, (keyof typeof COLUMNS)[]> = {
  school: ["classera", "fedena", "myclassboard", "eschool"],
  rides: ["appscrip", "onde", "apporio", "codebrewRides"],
  delivery: ["tookan", "shipday", "onfleet", "apporioDelivery"],
  "multi-vendor": ["yelo", "enatega", "deonde", "sixammart"],
};

export function competitorsOf(story: StoryId): CompareColumn[] {
  return BY_STORY[story].map((key) => COLUMNS[key]);
}

/** Custom development by an agency, described in words only. */
export const AGENCY: Omit<CompareColumn, "name" | "sources"> = {
  kind: { en: "An app built for you from scratch", ar: "تطبيق يُبنى لك من الصفر", tr: "Sizin için sıfırdan yapılan uygulama" },
  apps: { en: "What you specify and pay for", ar: "ما تحدّده وتدفع ثمنه", tr: "Belirleyip ödediğiniz kadarı" },
  ownName: { en: "Usually yes, under your accounts", ar: "غالبًا نعم، في حساباتك", tr: "Genellikle evet, hesaplarınızda" },
  pricing: { en: "Quoted after scoping; hosting, maps and upkeep usually extra; months of work", ar: "عرض سعر بعد تحديد النطاق؛ والاستضافة والخرائط والصيانة غالبًا إضافية؛ وشهور من العمل", tr: "Kapsam belirlendikten sonra teklif; barındırma, harita ve bakım genellikle ek; aylarca süren iş" },
  published: { en: "Rarely", ar: "نادرًا", tr: "Nadiren" },
  arabic: { en: "Depends on the team", ar: "بحسب الفريق", tr: "Ekibe göre" },
};

/** Yallapp's own column, by story (whether prices are published depends on the plans offered). */
export const YALLAPP: Record<StoryId, Pick<CompareColumn, "kind" | "apps" | "ownName" | "pricing" | "arabic">> = {
  school: {
    kind: { en: "A Yallapp Studio bundle", ar: "باقة من Yallapp Studio", tr: "Bir Yallapp Studio paketi" },
    apps: { en: "The school's app for students and parents, its staff app, and Studio for the office", ar: "تطبيق المدرسة للطلاب وأولياء الأمور، وتطبيق موظفيها، وStudio للإدارة", tr: "Öğrenci ve veliler için okulun uygulaması, personel uygulaması ve ofis için Studio" },
    ownName: { en: "Yes: your name, your icon, your store accounts", ar: "نعم: اسمك وأيقونتك وحساباتك في المتاجر", tr: "Evet: adınız, simgeniz, mağaza hesaplarınız" },
    pricing: { en: "A Studio plan; no fee per student", ar: "باقة Studio؛ بلا رسوم لكل طالب", tr: "Bir Studio paketi; öğrenci başına ücret yok" },
    arabic: { en: "Yes: Arabic, right to left, in the apps and in Studio", ar: "نعم: العربية من اليمين لليسار، في التطبيقات وفي Studio", tr: "Evet: Arapça, sağdan sola, uygulamalarda ve Studio'da" },
  },
  rides: {
    kind: { en: "A Yallapp Studio bundle", ar: "باقة من Yallapp Studio", tr: "Bir Yallapp Studio paketi" },
    apps: { en: "The riders' app, the drivers' app under your name, and Studio for your team", ar: "تطبيق الركاب، وتطبيق السائقين باسمك، وStudio لفريقك", tr: "Yolcu uygulaması, adınızla sürücü uygulaması ve ekibiniz için Studio" },
    ownName: { en: "Yes: your name, your icon, your store accounts", ar: "نعم: اسمك وأيقونتك وحساباتك في المتاجر", tr: "Evet: adınız, simgeniz, mağaza hesaplarınız" },
    pricing: { en: "A Studio plan; no share of your fares", ar: "باقة Studio؛ بلا نسبة من أجرتك", tr: "Bir Studio paketi; ücretlerinizden pay yok" },
    arabic: { en: "Yes: Arabic, right to left, in the apps and in Studio", ar: "نعم: العربية من اليمين لليسار، في التطبيقات وفي Studio", tr: "Evet: Arapça, sağdan sola, uygulamalarda ve Studio'da" },
  },
  delivery: {
    kind: { en: "A Yallapp Studio bundle", ar: "باقة من Yallapp Studio", tr: "Bir Yallapp Studio paketi" },
    apps: { en: "The customers' app, a courier app under your name, and Studio for dispatch", ar: "تطبيق العملاء، وتطبيق مناديب باسمك، وStudio للتوزيع", tr: "Müşteri uygulaması, adınızla kurye uygulaması ve sevk için Studio" },
    ownName: { en: "Yes: your name, your icon, your store accounts", ar: "نعم: اسمك وأيقونتك وحساباتك في المتاجر", tr: "Evet: adınız, simgeniz, mağaza hesaplarınız" },
    pricing: { en: "A Studio plan; no fee per parcel", ar: "باقة Studio؛ بلا رسوم لكل طرد", tr: "Bir Studio paketi; paket başına ücret yok" },
    arabic: { en: "Yes: Arabic, right to left, in the apps and in Studio", ar: "نعم: العربية من اليمين لليسار، في التطبيقات وفي Studio", tr: "Evet: Arapça, sağdan sola, uygulamalarda ve Studio'da" },
  },
  "multi-vendor": {
    kind: { en: "A Yallapp Studio bundle", ar: "باقة من Yallapp Studio", tr: "Bir Yallapp Studio paketi" },
    apps: { en: "The customers' app, the places' app and web panel, the couriers' app, and Studio for you", ar: "تطبيق العملاء، وتطبيق المتاجر ولوحتها على الويب، وتطبيق المناديب، وStudio لك", tr: "Müşteri uygulaması, işletmelerin uygulaması ve web paneli, kurye uygulaması ve sizin için Studio" },
    ownName: { en: "Yes: your name, your icon, your store accounts", ar: "نعم: اسمك وأيقونتك وحساباتك في المتاجر", tr: "Evet: adınız, simgeniz, mağaza hesaplarınız" },
    pricing: { en: "A Studio plan; no fee per order", ar: "باقة Studio؛ بلا رسوم لكل طلب", tr: "Bir Studio paketi; sipariş başına ücret yok" },
    arabic: { en: "Yes: Arabic, right to left, in the apps and in Studio", ar: "نعم: العربية من اليمين لليسار، في التطبيقات وفي Studio", tr: "Evet: Arapça, sağdan sola, uygulamalarda ve Studio'da" },
  },
};

export const PRICES_ON_PAGE: Cell = { en: "Yes, on this page", ar: "نعم، في هذه الصفحة", tr: "Evet, bu sayfada" };
export const PRICES_ON_REQUEST: Cell = { en: "On request for now", ar: "عند الطلب حاليًا", tr: "Şimdilik talep üzerine" };
