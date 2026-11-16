import type { Strings } from "../types";

/**
 * 132.130 Studio's premium pages (components/studio-page): the "?" that
 * folds a page's long help, "How it works", the "⋯" menu, the products'
 * filters behind one button, the orders' numbers and their rows, and Your
 * account's settings as pills, its deletion behind one line. 132.145
 * Payments: the ways customers pay in one card, each on or off.
 */
export const en = {
  // The "?" beside the line under a page's title, and under a card's.
  help: "More about this page",
  helpSection: "More about this",
  howItWorks: "How it works",
  more: "More options",
  // 132.131 Products: the filters behind one button.
  filters: "Filters",
  // 132.132 Orders: the numbers on top, and each order's row.
  ordersOpen: "Waiting for you",
  ordersPaid: "Paid orders",
  ordersLine: "Your app's paid orders, newest first.",
  orderItems: "{count, plural, one {{count} item} other {{count} items}}",
  // 132.133 Your account: its settings' states, and deleting it behind one line.
  off: "Off",
  notSet: "Not set",
  deleteOpen: "See what happens and ask to delete it",
  // 132.145 Payments: the ways customers pay, each on or off; the gateway's state as a pill.
  on: "On",
  waysTitle: "Ways customers pay",
  waysLine: "Turn on each way you take. Customers see every one that's on, the card and the others alike.",
  connectGateway: "Connect a card gateway",
  notConnected: "Not connected",
  ready: "Ready",
  needsTest: "Needs a test",
} as const;

type Messages = Strings<typeof en>;

export const ar: Messages = {
  help: "اعرف أكتر عن الصفحة دي",
  helpSection: "اعرف أكتر",
  howItWorks: "إزاي بتشتغل",
  more: "اختيارات تانية",
  filters: "الفلاتر",
  ordersOpen: "مستنياك",
  ordersPaid: "طلبات مدفوعة",
  ordersLine: "طلبات تطبيقك المدفوعة، الأحدث الأول.",
  orderItems: "{count, plural, zero {مفيش منتجات} one {منتج واحد} two {منتجين} few {{count} منتجات} many {{count} منتج} other {{count} منتج}}",
  off: "مش مفعّل",
  notSet: "مش متحدد",
  deleteOpen: "شوف إيه اللي هيحصل واطلب حذفه",
  on: "مفعّل",
  waysTitle: "طرق الدفع لعملائك",
  waysLine: "شغّل كل طريقة بتقبلها. عملاؤك هيشوفوا كل اللي شغّال منها، الكارت والباقي زيه.",
  connectGateway: "اربط بوابة الدفع بالكارت",
  notConnected: "مش مربوطة",
  ready: "جاهزة",
  needsTest: "محتاجة تجربة",
};

export const tr: Messages = {
  help: "Bu sayfa hakkında daha fazlası",
  helpSection: "Daha fazlası",
  howItWorks: "Nasıl çalışır",
  more: "Diğer seçenekler",
  filters: "Filtreler",
  ordersOpen: "Sizi bekliyor",
  ordersPaid: "Ödenen siparişler",
  ordersLine: "Uygulamanızın ödenen siparişleri, en yenisi önce.",
  orderItems: "{count, plural, one {{count} ürün} other {{count} ürün}}",
  off: "Kapalı",
  notSet: "Belirlenmedi",
  deleteOpen: "Ne olacağını görün ve silinmesini isteyin",
  on: "Açık",
  waysTitle: "Müşterilerin ödeme yolları",
  waysLine: "Kabul ettiğiniz her yolu açın. Müşteriler, kart da diğerleri de, açık olanların hepsini görür.",
  connectGateway: "Bir kart ödeme sağlayıcısı bağlayın",
  notConnected: "Bağlı değil",
  ready: "Hazır",
  needsTest: "Test edilmeli",
};
