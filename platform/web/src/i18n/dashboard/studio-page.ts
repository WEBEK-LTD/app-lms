import type { Strings } from "../types";

/**
 * 132.130 Studio's premium pages (components/studio-page): the "?" that
 * folds a page's long help, the orders' numbers and their rows, and Your
 * account's deletion folded behind one line.
 */
export const en = {
  // The "?" beside the line under a page's title, and under a card's.
  help: "More about this page",
  helpSection: "More about this",
  // 132.132 Orders: the numbers on top, and each order's row.
  ordersOpen: "Waiting for you",
  ordersPaid: "Paid orders",
  orderItems: "{count, plural, one {{count} item} other {{count} items}}",
  // 132.133 Your account: deleting it, behind one line.
  deleteOpen: "See what happens and ask to delete it",
} as const;

type Messages = Strings<typeof en>;

export const ar: Messages = {
  help: "اعرف أكتر عن الصفحة دي",
  helpSection: "اعرف أكتر",
  ordersOpen: "مستنياك",
  ordersPaid: "طلبات مدفوعة",
  orderItems: "{count, plural, zero {مفيش منتجات} one {منتج واحد} two {منتجين} few {{count} منتجات} many {{count} منتج} other {{count} منتج}}",
  deleteOpen: "شوف إيه اللي هيحصل واطلب حذفه",
};

export const tr: Messages = {
  help: "Bu sayfa hakkında daha fazlası",
  helpSection: "Daha fazlası",
  ordersOpen: "Sizi bekliyor",
  ordersPaid: "Ödenen siparişler",
  orderItems: "{count, plural, one {{count} ürün} other {{count} ürün}}",
  deleteOpen: "Ne olacağını görün ve silinmesini isteyin",
};
