import type { Strings } from "../types";

/** 73 Deleting an app (Setup › Delete this app, lib/apps/deletion.ts): owner only, with the app's name and the password. */
export const en = {
  deleteTitle: "Delete this app",
  deleteIntro: "Deletes {app} for good, with its data. Your other apps and your Yallapp account stay as they are.",
  whatGoes: "What is deleted",
  goesNow: "The app stops at once for the people who use it: its content, sign-in and notifications stop, and the Yallapp plugin on a WordPress site loses its license.",
  goesData: "Its settings, pages, content, customers with their orders, bookings and messages, its Media files, builds and statistics.",
  goesPlan: "Its plan ends with it: nothing renews or is charged. Payments already made are refunded only as the <refund>Refund policy</refund> says, and we keep their records for billing.",
  whatStays: "What stays",
  staysStores: "Its listings on Google Play, the App Store and the other stores under your own developer accounts: remove or unpublish them there.",
  staysKey: "If you'll ever update it on Google Play again, download the Android upload key from <builds>Builds & downloads</builds> first.",
  restore: "Changed your mind? Write to us within {days} days and we can restore it as it was. After that it's gone for good.",
  typeName: "Type the app's name, {app}, to confirm",
  password: "Your password",
  submit: "Delete this app",
  deleting: "Deleting…",
  deleted: "{app} was deleted. Write to us within {days} days if you want it back.",
  known: {
    owner: "Only the owner of this business can delete an app, signed in with their own password.",
    name: "Type the app's name exactly as it shows here.",
    gone: "This app no longer exists.",
  },
} as const;

type Messages = Strings<typeof en>;

export const ar: Messages = {
  deleteTitle: "حذف هذا التطبيق",
  deleteIntro: "يحذف {app} نهائيًا مع بياناته. تبقى تطبيقاتك الأخرى وحسابك في Yallapp كما هي.",
  whatGoes: "ما الذي يُحذف",
  goesNow: "يتوقف التطبيق فورًا لمن يستخدمه: يتوقف محتواه وتسجيل الدخول والإشعارات، وتفقد إضافة Yallapp على موقع WordPress ترخيصها.",
  goesData: "إعداداته وصفحاته ومحتواه، وعملاؤه مع طلباتهم وحجوزاتهم ورسائلهم، وملفات الوسائط والإصدارات والإحصاءات.",
  goesPlan: "تنتهي باقته معه: لا يُجدَّد شيء ولا يُخصم أي مبلغ. ولا تُستردّ المدفوعات السابقة إلا وفق <refund>سياسة الاسترداد</refund>، ونحتفظ بسجلاتها لأغراض الفوترة.",
  whatStays: "ما الذي يبقى",
  staysStores: "صفحاته على Google Play وApp Store والمتاجر الأخرى بحسابات المطوّر الخاصة بك: أزلها أو أوقف نشرها من هناك.",
  staysKey: "إن كنت ستحدّثه على Google Play يومًا ما، فنزّل مفتاح رفع Android من <builds>الإصدارات والتنزيلات</builds> أولًا.",
  restore: "غيّرت رأيك؟ راسلنا خلال {days} أيام ويمكننا استعادته كما كان. بعد ذلك يُحذف نهائيًا.",
  typeName: "اكتب اسم التطبيق، {app}، للتأكيد",
  password: "كلمة المرور",
  submit: "احذف هذا التطبيق",
  deleting: "جارٍ الحذف…",
  deleted: "حُذف {app}. راسلنا خلال {days} أيام إن أردت استعادته.",
  known: {
    owner: "لا يحذف التطبيقات إلا مالك هذا النشاط، بعد تسجيل الدخول بكلمة مروره.",
    name: "اكتب اسم التطبيق كما يظهر هنا تمامًا.",
    gone: "لم يعد هذا التطبيق موجودًا.",
  },
};

export const tr: Messages = {
  deleteTitle: "Bu uygulamayı sil",
  deleteIntro: "{app} uygulamasını verileriyle birlikte kalıcı olarak siler. Diğer uygulamalarınız ve Yallapp hesabınız olduğu gibi kalır.",
  whatGoes: "Neler silinir",
  goesNow: "Uygulama, kullananlar için hemen durur: içeriği, girişi ve bildirimleri durur; WordPress sitesindeki Yallapp eklentisi lisansını kaybeder.",
  goesData: "Ayarları, sayfaları, içeriği, müşterileri ile onların siparişleri, randevuları ve mesajları, Medya dosyaları, derlemeleri ve istatistikleri.",
  goesPlan: "Paketi de onunla sona erer: hiçbir şey yenilenmez veya ücretlendirilmez. Yapılmış ödemeler yalnızca <refund>İade politikası</refund> kapsamında iade edilir; kayıtlarını faturalama için saklarız.",
  whatStays: "Neler kalır",
  staysStores: "Kendi geliştirici hesaplarınızdaki Google Play, App Store ve diğer mağazalardaki sayfaları: oradan kaldırın veya yayından çekin.",
  staysKey: "Onu bir gün Google Play'de yeniden güncelleyecekseniz, önce Android yükleme anahtarını <builds>Derlemeler ve indirmeler</builds> sayfasından indirin.",
  restore: "Fikrinizi mi değiştirdiniz? {days} gün içinde bize yazın, olduğu gibi geri getirebiliriz. Sonrasında kalıcı olarak silinir.",
  typeName: "Onaylamak için uygulamanın adını ({app}) yazın",
  password: "Parolanız",
  submit: "Bu uygulamayı sil",
  deleting: "Siliniyor…",
  deleted: "{app} silindi. Geri istiyorsanız {days} gün içinde bize yazın.",
  known: {
    owner: "Bir uygulamayı yalnızca bu işletmenin sahibi, kendi parolasıyla giriş yapmışken silebilir.",
    name: "Uygulamanın adını tam olarak burada göründüğü gibi yazın.",
    gone: "Bu uygulama artık mevcut değil.",
  },
};
