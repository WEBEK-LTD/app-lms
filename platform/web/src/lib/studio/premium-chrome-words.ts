/**
 * 130.20–130.29 The app's own words on the premium system screens Studio's
 * canvas draws (components/studio/premium-chrome.tsx), as the app says them
 * (mobile/lib/l10n/app_*.arb: Arabic in Modern Standard Arabic), in the
 * language being edited, with the sample person and entries the drawings
 * show (the editor has no one signed in).
 */
export interface ChromeWords {
  account: string;
  settings: string;
  notifications: string;
  editProfile: string;
  myOrders: string;
  search: string;
  sampleName: string;
  samplePhone: string;
  edit: string;
  stats: [string, string, string];
  general: string;
  preferences: string;
  support: string;
  rows: Record<"orders" | "notifications" | "language" | "darkMode" | "settings" | "help" | "privacy" | "terms" | "about" | "devices" | "password" | "deleteAccount" | "logOut", string>;
  languageName: string;
  fullName: string;
  phone: string;
  email: string;
  save: string;
  today: string;
  earlier: string;
  notes: [string, string][];
  orders: { title: string; meta: string; status: string }[];
  emptyTitle: string;
  emptyText: string;
}

const EN: ChromeWords = {
  account: "Account",
  settings: "Settings",
  notifications: "Notifications",
  editProfile: "Edit profile",
  myOrders: "My orders",
  search: "Search",
  sampleName: "Sara Demir",
  samplePhone: "+90 532 123 45 67",
  edit: "Edit",
  stats: ["Orders", "Saved", "Points"],
  general: "General",
  preferences: "Preferences",
  support: "Support",
  rows: { orders: "My orders", notifications: "Notifications", language: "Language", darkMode: "Dark mode", settings: "Settings", help: "Help", privacy: "Privacy policy", terms: "Terms of use", about: "About", devices: "Devices", password: "Change password", deleteAccount: "Delete account", logOut: "Log out" },
  languageName: "English",
  fullName: "Full name",
  phone: "Phone number",
  email: "Email",
  save: "Save",
  today: "Today",
  earlier: "Earlier",
  notes: [
    ["Your order is on its way", "It arrives in about 12 minutes."],
    ["Welcome", "Thanks for joining us."],
    ["A new offer for you", "See what's new this week."],
  ],
  orders: [
    { title: "Order #1042", meta: "2 items · Today", status: "On its way" },
    { title: "Order #1031", meta: "1 item · Yesterday", status: "Delivered" },
    { title: "Order #1007", meta: "3 items · 2 Nov", status: "Delivered" },
  ],
  emptyTitle: "Nothing here yet",
  emptyText: "What you add shows here.",
};

const AR: ChromeWords = {
  account: "الحساب",
  settings: "الإعدادات",
  notifications: "الإشعارات",
  editProfile: "تعديل الملف الشخصي",
  myOrders: "طلباتي",
  search: "بحث",
  sampleName: "سارة دمير",
  samplePhone: "+90 532 123 45 67",
  edit: "تعديل",
  stats: ["الطلبات", "المحفوظات", "النقاط"],
  general: "عام",
  preferences: "التفضيلات",
  support: "الدعم",
  rows: { orders: "طلباتي", notifications: "الإشعارات", language: "اللغة", darkMode: "الوضع الداكن", settings: "الإعدادات", help: "المساعدة", privacy: "سياسة الخصوصية", terms: "شروط الاستخدام", about: "حول التطبيق", devices: "الأجهزة", password: "تغيير كلمة المرور", deleteAccount: "حذف الحساب", logOut: "تسجيل الخروج" },
  languageName: "العربية",
  fullName: "الاسم الكامل",
  phone: "رقم الهاتف",
  email: "البريد الإلكتروني",
  save: "حفظ",
  today: "اليوم",
  earlier: "سابقًا",
  notes: [
    ["طلبك في الطريق", "يصل خلال نحو 12 دقيقة."],
    ["أهلًا بك", "شكرًا لانضمامك إلينا."],
    ["عرض جديد لك", "اطّلع على الجديد هذا الأسبوع."],
  ],
  orders: [
    { title: "الطلب رقم 1042", meta: "عنصران · اليوم", status: "في الطريق" },
    { title: "الطلب رقم 1031", meta: "عنصر واحد · أمس", status: "تم التوصيل" },
    { title: "الطلب رقم 1007", meta: "3 عناصر · 2 نوفمبر", status: "تم التوصيل" },
  ],
  emptyTitle: "لا شيء هنا بعد",
  emptyText: "ما تضيفه يظهر هنا.",
};

const TR: ChromeWords = {
  account: "Hesap",
  settings: "Ayarlar",
  notifications: "Bildirimler",
  editProfile: "Profili düzenle",
  myOrders: "Siparişlerim",
  search: "Ara",
  sampleName: "Sara Demir",
  samplePhone: "+90 532 123 45 67",
  edit: "Düzenle",
  stats: ["Siparişler", "Kaydedilenler", "Puanlar"],
  general: "Genel",
  preferences: "Tercihler",
  support: "Destek",
  rows: { orders: "Siparişlerim", notifications: "Bildirimler", language: "Dil", darkMode: "Karanlık mod", settings: "Ayarlar", help: "Yardım", privacy: "Gizlilik politikası", terms: "Kullanım koşulları", about: "Hakkında", devices: "Cihazlar", password: "Şifreyi değiştir", deleteAccount: "Hesabı sil", logOut: "Çıkış yap" },
  languageName: "Türkçe",
  fullName: "Ad soyad",
  phone: "Telefon numarası",
  email: "E-posta",
  save: "Kaydet",
  today: "Bugün",
  earlier: "Daha önce",
  notes: [
    ["Siparişiniz yolda", "Yaklaşık 12 dakika içinde ulaşır."],
    ["Hoş geldiniz", "Aramıza katıldığınız için teşekkürler."],
    ["Size yeni bir teklif", "Bu haftanın yeniliklerine bakın."],
  ],
  orders: [
    { title: "Sipariş #1042", meta: "2 ürün · Bugün", status: "Yolda" },
    { title: "Sipariş #1031", meta: "1 ürün · Dün", status: "Teslim edildi" },
    { title: "Sipariş #1007", meta: "3 ürün · 2 Kasım", status: "Teslim edildi" },
  ],
  emptyTitle: "Henüz bir şey yok",
  emptyText: "Eklediğiniz her şey burada görünür.",
};

/** The words in `lang` (another language: English). */
export function chromeWords(lang: string): ChromeWords {
  return lang === "ar" ? AR : lang === "tr" ? TR : EN;
}
