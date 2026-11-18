import type { Lang } from "@/i18n";

/**
 * 106.13 The words of the website's Studio Market pages (/templates and
 * /templates/<slug>) in English, Modern Standard Arabic and Turkish. The
 * market's parts (cards, prices, plans, the demo) take theirs from
 * site/templates-words.ts. What it says about buying, renewing and payouts
 * is what the dashboard, the designer terms and the privacy policy say
 * (Phase 106), nothing new.
 */

export interface TemplatesText {
  metaTitle: string;
  metaDescription: string;
  ogText: string;
  eyebrow: string;
  title: string;
  lead: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchButton: string;
  statsTemplates: string;
  statsDesigners: string;
  statsReviewed: string;
  kindsLabel: string;
  kindAll: string;
  priceLabel: string;
  priceAll: string;
  priceFree: string;
  pricePaid: string;
  sortShown: string;
  sortPopular: string;
  sortNewest: string;
  sortName: string;
  results: string;
  clear: string;
  byDesigner: string;
  noResults: string;
  noResultsText: string;
  emptyTitle: string;
  emptyText: string;
  featuredEyebrow: string;
  featuredHint: string;
  viewFeatured: string;
  flashEyebrow: string;
  flashTitle: string;
  flashHint: string;
  justIn: string;
  newWeek: string;
  newWeekHint: string;
  lastDays: string;
  popular: string;
  topDesigners: string;
  topDesignersHint: string;
  everyTemplate: string;
  designersEyebrow: string;
  designersTitle: string;
  designersText: string;
  designersButton: string;
  ownersTitle: string;
  ownersText: string;
  ownersButton: string;
  /** /demo/studio's link to the market. */
  demoLink: string;
  // A template's page
  usedBy: string;
  updatedOn: string;
  included: string;
  includedTitle: string;
  includedHint: string;
  screensWord: string;
  elementsWord: string;
  languagesLine: string;
  languageNames: Record<"en" | "ar" | "tr", string>;
  lightDarkValue: string;
  bothIncluded: string;
  rtl: string;
  rtlHint: string;
  kindsFit: string;
  about: string;
  designerEyebrow: string;
  seeDesigner: string;
  fromWord: string;
  fromLabel: string;
  planLabel: string;
  freePlanHint: string;
  getFree: string;
  haveAccount: string;
  visitorNote: string;
  planPanel: string;
}

const EN: TemplatesText = {
  metaTitle: "Studio Market: ready app designs for your Yallapp Studio app",
  metaDescription: "Whole app designs by independent designers, reviewed by Yallapp's team. Try each one in the demo, then apply it to your Studio app, free or for a month, a year or for good.",
  ogText: "Whole app designs by independent designers, reviewed by our team.",
  eyebrow: "Studio Market",
  title: "Ready designs for your whole app.",
  lead: "Whole app designs by independent designers, reviewed by our team. Try one in the demo, then apply it to your Studio app.",
  searchLabel: "Search the templates",
  searchPlaceholder: "Search templates, designers or kinds of app",
  searchButton: "Search",
  statsTemplates: "{count, plural, one {{count} template} other {{count} templates}}",
  statsDesigners: "{count, plural, one {{count} designer} other {{count} designers}}",
  statsReviewed: "reviewed by our team",
  kindsLabel: "Kinds of app",
  kindAll: "All",
  priceLabel: "Price",
  priceAll: "All",
  priceFree: "Free",
  pricePaid: "Paid",
  sortShown: "Order: {sort}",
  sortPopular: "Most applied",
  sortNewest: "Newest",
  sortName: "Name",
  results: "{count, plural, =0 {No templates} one {{count} template} other {{count} templates}}",
  clear: "Clear",
  byDesigner: "By {name}",
  noResults: "Nothing matches",
  noResultsText: "Try other words, or another kind of app or price.",
  emptyTitle: "The first templates are on their way",
  emptyText: "Designers are making them in Yallapp Studio, and our team reviews each one before it's published.",
  featuredEyebrow: "Featured",
  featuredHint: "The template applied most lately.",
  viewFeatured: "See the template",
  flashEyebrow: "On now",
  flashTitle: "Flash sales",
  flashHint: "For a few hours or days only, the soonest to end first.",
  justIn: "Just in",
  newWeek: "New this week",
  newWeekHint: "Published after our team reviewed them.",
  lastDays: "The last 30 days",
  popular: "Most applied",
  topDesigners: "Top designers",
  topDesignersHint: "The designers whose templates are on the most apps.",
  everyTemplate: "Every template",
  designersEyebrow: "For designers",
  designersTitle: "Design in Studio? Sell your templates here.",
  designersText: "Studio is free for designers, and you don't need an app of your own. Yallapp takes 25% of each sale and you always get exactly 75%, paid on the 1st of every month once your balance is USD 250 or more.",
  designersButton: "Become a designer",
  ownersTitle: "How buying a template works",
  ownersText: "Applying, renewing, moving a template to another app and what happens when a plan ends, step by step.",
  ownersButton: "Read the guide",
  demoLink: "Ready designs on Studio Market",
  usedBy: "{count, plural, =0 {New on Studio Market} one {{count} app uses it} other {{count} apps use it}}",
  updatedOn: "Updated {date}",
  included: "What's included",
  includedTitle: "The whole app, designed.",
  includedHint: "Everything below is applied to your app at once; your content stays yours.",
  screensWord: "screens",
  elementsWord: "elements",
  languagesLine: "{count, plural, one {language: {names}} other {languages: {names}}}",
  languageNames: { en: "English", ar: "Arabic", tr: "Turkish" },
  lightDarkValue: "Light & dark",
  bothIncluded: "both included",
  rtl: "Right to left",
  rtlHint: "for Arabic",
  kindsFit: "app kinds it fits",
  about: "About this template",
  designerEyebrow: "The designer",
  seeDesigner: "{count, plural, one {See the template} other {See all {count} templates}}",
  fromWord: "From",
  fromLabel: "Price",
  planLabel: "Plan",
  freePlanHint: "Never ends · every update",
  getFree: "Apply it to my app, free",
  haveAccount: "I have an account: sign in",
  visitorNote: "You'll make a free Yallapp account first, then come back here to finish.",
  planPanel: "Plans and prices",
};

const AR: TemplatesText = {
  metaTitle: "ماركت Studio: تصاميم تطبيقات جاهزة لتطبيقك في Yallapp Studio",
  metaDescription: "تصاميم تطبيقات كاملة من مصممين مستقلين، يراجعها فريق Yallapp. جرّب كل تصميم في العرض التجريبي، ثم طبّقه على تطبيقك في Studio مجانًا أو لمدة شهر أو سنة أو مدى الحياة.",
  ogText: "تصاميم تطبيقات كاملة من مصممين مستقلين، يراجعها فريقنا.",
  eyebrow: "ماركت Studio",
  title: "تصاميم جاهزة لتطبيقك كله.",
  lead: "تصاميم تطبيقات كاملة من مصممين مستقلين، يراجعها فريقنا. جرّب أيًّا منها في العرض التجريبي، ثم طبّقه على تطبيقك في Studio.",
  searchLabel: "ابحث في القوالب",
  searchPlaceholder: "ابحث عن قالب أو مصمم أو نوع تطبيق",
  searchButton: "بحث",
  statsTemplates: "{count, plural, =0 {لا قوالب} one {قالب واحد} two {قالبان} few {{count} قوالب} other {{count} قالبًا}}",
  statsDesigners: "{count, plural, =0 {لا مصممين} one {مصمم واحد} two {مصممان} few {{count} مصممين} other {{count} مصممًا}}",
  statsReviewed: "يراجعها فريقنا",
  kindsLabel: "أنواع التطبيقات",
  kindAll: "الكل",
  priceLabel: "السعر",
  priceAll: "الكل",
  priceFree: "مجاني",
  pricePaid: "مدفوع",
  sortShown: "الترتيب: {sort}",
  sortPopular: "الأكثر تطبيقًا",
  sortNewest: "الأحدث",
  sortName: "الاسم",
  results: "{count, plural, =0 {لا قوالب} one {قالب واحد} two {قالبان} few {{count} قوالب} other {{count} قالبًا}}",
  clear: "مسح",
  byDesigner: "من تصميم {name}",
  noResults: "لا توجد نتائج مطابقة",
  noResultsText: "جرّب كلمات أخرى، أو نوع تطبيق أو سعرًا آخر.",
  emptyTitle: "القوالب الأولى في الطريق",
  emptyText: "يصممها المصممون في Yallapp Studio، ويراجع فريقنا كل قالب قبل نشره.",
  featuredEyebrow: "مختار",
  featuredHint: "القالب الأكثر تطبيقًا مؤخرًا.",
  viewFeatured: "عرض القالب",
  flashEyebrow: "الآن",
  flashTitle: "العروض الخاطفة",
  flashHint: "لساعات أو أيام قليلة فقط، والأقرب انتهاءً أولًا.",
  justIn: "وصل حديثًا",
  newWeek: "جديد هذا الأسبوع",
  newWeekHint: "نُشرت بعد أن راجعها فريقنا.",
  lastDays: "آخر 30 يومًا",
  popular: "الأكثر تطبيقًا",
  topDesigners: "أبرز المصممين",
  topDesignersHint: "المصممون الذين تعمل قوالبهم على أكبر عدد من التطبيقات.",
  everyTemplate: "كل القوالب",
  designersEyebrow: "للمصممين",
  designersTitle: "تصمم في Studio؟ بع قوالبك هنا.",
  designersText: "Studio مجاني للمصممين، ولا تحتاج إلى تطبيق خاص بك. تأخذ Yallapp نسبة 25% من كل عملية بيع وتحصل أنت دائمًا على 75% بالضبط، تُحوَّل إليك في اليوم الأول من كل شهر متى بلغ رصيدك 250 دولارًا أمريكيًا أو أكثر.",
  designersButton: "ابدأ كمصمم",
  ownersTitle: "كيف يعمل شراء قالب",
  ownersText: "التطبيق والتجديد ونقل القالب إلى تطبيق آخر وما يحدث عند انتهاء الخطة، خطوة بخطوة.",
  ownersButton: "اقرأ الدليل",
  demoLink: "تصاميم جاهزة في ماركت Studio",
  usedBy: "{count, plural, =0 {جديد في ماركت Studio} one {يستخدمه تطبيق واحد} two {يستخدمه تطبيقان} few {يستخدمه {count} تطبيقات} other {يستخدمه {count} تطبيقًا}}",
  updatedOn: "حُدّث في {date}",
  included: "ما يتضمنه",
  includedTitle: "التطبيق كله، مصممًا.",
  includedHint: "يُطبَّق كل ما يلي على تطبيقك دفعة واحدة، ويبقى محتواك ملكك.",
  screensWord: "شاشات",
  elementsWord: "عناصر",
  languagesLine: "{count, plural, one {اللغة: {names}} other {اللغات: {names}}}",
  languageNames: { en: "الإنجليزية", ar: "العربية", tr: "التركية" },
  lightDarkValue: "فاتح وداكن",
  bothIncluded: "كلاهما متضمَّن",
  rtl: "من اليمين إلى اليسار",
  rtlHint: "للعربية",
  kindsFit: "أنواع التطبيقات التي يناسبها",
  about: "عن هذا القالب",
  designerEyebrow: "المصمم",
  seeDesigner: "{count, plural, one {عرض القالب} two {عرض القالبين} few {عرض القوالب الـ {count}} other {عرض القوالب الـ {count}}}",
  fromWord: "ابتداءً من",
  fromLabel: "السعر",
  planLabel: "الخطة",
  freePlanHint: "لا تنتهي · كل التحديثات",
  getFree: "طبّقه على تطبيقي مجانًا",
  haveAccount: "لديّ حساب: تسجيل الدخول",
  visitorNote: "ستنشئ أولًا حسابًا مجانيًا في Yallapp، ثم تعود إلى هنا لإكمال الخطوات.",
  planPanel: "الخطط والأسعار",
};

const TR: TemplatesText = {
  metaTitle: "Studio Market: Yallapp Studio uygulamanız için hazır uygulama tasarımları",
  metaDescription: "Bağımsız tasarımcıların bütün uygulama tasarımları, Yallapp ekibince incelenir. Her birini demoda deneyin, sonra Studio uygulamanıza ücretsiz ya da bir ay, bir yıl veya ömür boyu uygulayın.",
  ogText: "Bağımsız tasarımcıların bütün uygulama tasarımları, ekibimizce incelenir.",
  eyebrow: "Studio Market",
  title: "Bütün uygulamanız için hazır tasarımlar.",
  lead: "Bağımsız tasarımcıların bütün uygulama tasarımları, ekibimizce incelenir. Birini demoda deneyin, sonra Studio uygulamanıza uygulayın.",
  searchLabel: "Şablonlarda ara",
  searchPlaceholder: "Şablon, tasarımcı veya uygulama türü arayın",
  searchButton: "Ara",
  statsTemplates: "{count, plural, other {{count} şablon}}",
  statsDesigners: "{count, plural, other {{count} tasarımcı}}",
  statsReviewed: "ekibimizce incelenir",
  kindsLabel: "Uygulama türleri",
  kindAll: "Tümü",
  priceLabel: "Fiyat",
  priceAll: "Tümü",
  priceFree: "Ücretsiz",
  pricePaid: "Ücretli",
  sortShown: "Sıra: {sort}",
  sortPopular: "En çok uygulanan",
  sortNewest: "En yeni",
  sortName: "Ad",
  results: "{count, plural, =0 {Şablon yok} other {{count} şablon}}",
  clear: "Temizle",
  byDesigner: "Tasarım: {name}",
  noResults: "Eşleşen bir şey yok",
  noResultsText: "Başka kelimeler, başka bir uygulama türü veya fiyat deneyin.",
  emptyTitle: "İlk şablonlar yolda",
  emptyText: "Tasarımcılar onları Yallapp Studio'da hazırlıyor; ekibimiz her birini yayımlanmadan önce inceliyor.",
  featuredEyebrow: "Öne çıkan",
  featuredHint: "Son zamanlarda en çok uygulanan şablon.",
  viewFeatured: "Şablonu incele",
  flashEyebrow: "Şimdi",
  flashTitle: "Flaş indirimler",
  flashHint: "Yalnızca birkaç saat veya gün; ilk bitecek olan önce.",
  justIn: "Yeni geldi",
  newWeek: "Bu hafta yeni",
  newWeekHint: "Ekibimiz inceledikten sonra yayımlandı.",
  lastDays: "Son 30 gün",
  popular: "En çok uygulanan",
  topDesigners: "Öne çıkan tasarımcılar",
  topDesignersHint: "Şablonları en çok uygulamada olan tasarımcılar.",
  everyTemplate: "Tüm şablonlar",
  designersEyebrow: "Tasarımcılar için",
  designersTitle: "Studio'da mı tasarlıyorsunuz? Şablonlarınızı burada satın.",
  designersText: "Studio tasarımcılar için ücretsizdir ve kendi uygulamanız olması gerekmez. Yallapp her satışın %25'ini alır, siz her zaman tam %75'ini alırsınız; bakiyeniz 250 ABD doları veya üzerindeyken her ayın 1'inde ödenir.",
  designersButton: "Tasarımcı ol",
  ownersTitle: "Şablon satın almak nasıl işler",
  ownersText: "Uygulama, yenileme, şablonu başka bir uygulamaya taşıma ve plan bittiğinde ne olacağı, adım adım.",
  ownersButton: "Rehberi okuyun",
  demoLink: "Studio Market'te hazır tasarımlar",
  usedBy: "{count, plural, =0 {Studio Market'te yeni} other {{count} uygulama kullanıyor}}",
  updatedOn: "{date} tarihinde güncellendi",
  included: "Neler dahil",
  includedTitle: "Bütün uygulama, tasarlanmış.",
  includedHint: "Aşağıdakilerin hepsi uygulamanıza bir kerede uygulanır; içeriğiniz sizin kalır.",
  screensWord: "ekran",
  elementsWord: "öğe",
  languagesLine: "{count, plural, other {dil: {names}}}",
  languageNames: { en: "İngilizce", ar: "Arapça", tr: "Türkçe" },
  lightDarkValue: "Açık ve koyu",
  bothIncluded: "ikisi de dahil",
  rtl: "Sağdan sola",
  rtlHint: "Arapça için",
  kindsFit: "uyduğu uygulama türü",
  about: "Bu şablon hakkında",
  designerEyebrow: "Tasarımcı",
  seeDesigner: "{count, plural, one {Şablonu incele} other {{count} şablonun hepsini gör}}",
  fromWord: "Başlangıç",
  fromLabel: "Fiyat",
  planLabel: "Plan",
  freePlanHint: "Hiç bitmez · her güncelleme",
  getFree: "Uygulamama ücretsiz uygula",
  haveAccount: "Hesabım var: giriş yap",
  visitorNote: "Önce ücretsiz bir Yallapp hesabı açacak, sonra bitirmek için buraya döneceksiniz.",
  planPanel: "Planlar ve fiyatlar",
};

const TEXT: Record<Lang, TemplatesText> = { en: EN, ar: AR, tr: TR };

export function templatesText(lang: Lang): TemplatesText {
  return TEXT[lang];
}
