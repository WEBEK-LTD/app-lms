import type { Strings } from "../types";

/**
 * 132.130 Studio's premium pages (components/studio-page): the "?" that
 * folds a page's long help, "How it works", the "⋯" menu, the products'
 * filters behind one button, the orders' numbers and their rows, and Your
 * account's settings as pills, its deletion behind one line.
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
};
