import type { Strings } from "../types";

/**
 * 56 The lines that go into an email's {{placeholders}} (lib/email): written
 * in the client's language when the email is (lib/email/templates-lang.ts).
 */
export const en = {
  paidCoupon: "Paid with a coupon: no card payment.",
  paid: "Paid: {amount} by card through {provider}.",
  paidAbout: "Paid: {amount} (about {shown}) by card through {provider}.",
  receipt: "Receipt: {url}",
  note: "Note: {note}",
  yourApp: "Your app: {url}",
  shipping: "Shipping: {amount}",
  // 91.1
  coupon: "Coupon {code}: -{amount}",
  points: "Loyalty points ({points}): -{amount}",
  deliveryFee: "Delivery fee: {amount}",
  withAddress: "{line}: {address}",
  phone: "Phone",
  email: "Email",
  emailLine: "Email: {email}",
  intake: "See the intake answers on your dashboard.",
  approval: "It waits for your approval.",
  phoneNotGiven: "Not given (signed in by email)",
  yourAppName: "your app",
  unlimited: "unlimited",
} as const;

type Messages = Strings<typeof en>;

export const ar: Messages = {
  paidCoupon: "دُفع بقسيمة: لا دفع بالبطاقة.",
  paid: "المدفوع: {amount} بالبطاقة عبر {provider}.",
  paidAbout: "المدفوع: {amount} (نحو {shown}) بالبطاقة عبر {provider}.",
  receipt: "الإيصال: {url}",
  note: "ملاحظة: {note}",
  yourApp: "تطبيقك: {url}",
  shipping: "الشحن: {amount}",
  coupon: "القسيمة {code}: -{amount}",
  points: "نقاط الولاء ({points}): -{amount}",
  deliveryFee: "رسوم التوصيل: {amount}",
  withAddress: "{line}: {address}",
  phone: "الهاتف",
  email: "البريد الإلكتروني",
  emailLine: "البريد الإلكتروني: {email}",
  intake: "اطّلع على إجابات الاستمارة في لوحة التحكم.",
  approval: "ينتظر موافقتك.",
  phoneNotGiven: "غير متوفر (سجّل الدخول بالبريد الإلكتروني)",
  yourAppName: "تطبيقك",
  unlimited: "غير محدودة",
};

export const tr: Messages = {
  paidCoupon: "Kuponla ödendi: kartla ödeme yok.",
  paid: "Ödenen: {amount}, {provider} üzerinden kartla.",
  paidAbout: "Ödenen: {amount} (yaklaşık {shown}), {provider} üzerinden kartla.",
  receipt: "Makbuz: {url}",
  note: "Not: {note}",
  yourApp: "Uygulamanız: {url}",
  shipping: "Kargo: {amount}",
  coupon: "Kupon {code}: -{amount}",
  points: "Sadakat puanları ({points}): -{amount}",
  deliveryFee: "Teslimat ücreti: {amount}",
  withAddress: "{line}: {address}",
  phone: "Telefon",
  email: "E-posta",
  emailLine: "E-posta: {email}",
  intake: "Form yanıtlarını panelinizde görün.",
  approval: "Onayınızı bekliyor.",
  phoneNotGiven: "Verilmedi (e-postayla giriş yaptı)",
  yourAppName: "uygulamanız",
  unlimited: "sınırsız",
};
