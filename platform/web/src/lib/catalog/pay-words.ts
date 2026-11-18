import type { CatalogOrder } from "../data/types";
import { serverMessage } from "../i18n/builtin";

/**
 * 168 The payment page an app opens at checkout (`/pay/<token>`), in the
 * customer's language: the app's language when they checked out
 * (`CatalogOrder.lang`, from its `Accept-Language`), in English, Arabic
 * (Modern Standard, right to left) or Turkish; English for any other.
 * Words with `{name}` take values (`fill`). English is as the page always
 * said it.
 */

export type PayLang = "en" | "ar" | "tr";

export function payLangOf(order: Pick<CatalogOrder, "lang"> | null | undefined): PayLang {
  const lang = (order?.lang ?? "").toLowerCase().split(/[-_]/)[0];
  return lang === "ar" || lang === "tr" ? lang : "en";
}

/** `{name}` in `text` with `values[name]`. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{([a-z]+)\}/g, (all, name: string) => (name in values ? String(values[name]) : all));
}

const EN = {
  // The page around it.
  checkout: "Checkout",
  linkInvalidTitle: "Link not valid",
  linkInvalidText: "This payment link isn't valid. Go back to the app and check out again.",
  orderClosedTitle: "Order closed",
  orderClosedText: "This order is closed. Go back to the app and check out again.",
  linkExpiredTitle: "Link expired",
  linkExpiredText: "This payment link has expired. Go back to the app and check out again.",
  placesReleasedTitle: "Places released",
  placesReleasedText: "The places held for this order were released. Go back to the app and get your tickets again.",
  paymentsOffTitle: "Payments are off",
  paymentsOffText: "This shop can't take payments right now. Please try again later.",
  demoBold: "Demo.",
  demoText: "This is a demo app: no card is asked for and nothing is charged. In your own app, customers pay here by card.",
  payFailed: "The payment didn't go through. Check your card details and try again.",
  payPending: "Your payment isn't confirmed yet. If you paid, your order is confirmed within a few minutes; otherwise, try again.",
  // The order.
  order: "Order {number}",
  coupon: "Coupon {code}",
  points: "Loyalty points ({count})",
  deliveryTime: "Delivery time",
  shipping: "Shipping",
  deliveryFee: "Delivery fee",
  total: "Total",
  quoteNote: "Shipping and tax for your address are added before you pay.",
  chargedIn: "Charged in {currency}: {amount} ({rate}, rates of {date})",
  approx: "≈ {amount} · you pay {total}",
  includes: "Includes {amount} {tax}",
  delivery: "Delivery",
  pickup: "Pickup",
  asap: "as soon as possible",
  toPlace: " to {place}",
  atPlace: " at {place}",
  deliveryOn: "Delivery {day}",
  toName: " to {name}",
  placeDemo: "Place demo order",
  securedBy: "Card payments are processed securely by {provider}.",
  // The form.
  card: "Card",
  yourCard: "Your card",
  cardIntro: "Enter your card to pay {total}. It goes straight to {provider}: the shop never sees its number.",
  stripeNotLoaded: "The card form didn't load here. Pay on Stripe's secure page instead.",
  iyzicoNotLoaded: "The card form didn't load here. Pay on iyzico's secure page instead.",
  kashierNotShowing: "Card form not showing? Pay on Kashier's secure page instead.",
  payOn: "Pay {total} on {provider}",
  opening: "Opening the payment…",
  changeDetails: "Change your details",
  howPay: "How would you like to pay?",
  manualNote: "Place your order, then pay {total} this way. The shop confirms your order once the payment arrives.",
  fullName: "Full name",
  mobile: "Mobile number",
  email: "Email",
  city: "City",
  cityOptional: "City (optional)",
  address: "Address",
  pay: "Pay {total}",
  placeOrder: "Place order · {total}",
  placing: "Placing your order…",
  // After it.
  orderReceived: "Order received",
  thankYou: "Thank you!",
  placedOnPlatform: "Your payment is received and your order {number} is placed with {app}. You'll find it in your orders in the app.",
  paymentReceived: "Payment received",
  willConfirm: "We received your payment of {amount}. {app} will confirm your order shortly.",
  noPlacesTitle: "No places left",
  noPlacesText: "Your payment for order {number} arrived after the places held for you were released, and the event is now full, so no tickets were issued. {app} will refund your payment.",
  orderPlaced: "Order placed",
  waitingPayment: "Your order {number} is waiting for your payment. Pay {amount} by {date} as shown below, and give the order number with your payment. {app} confirms your order once the payment arrives, and you get your receipt then.",
  emailed: "We also emailed these details to you.",
  membershipDemo: "Your demo membership (order {number}) is active. Nothing was charged. Go back to the app to book your classes.",
  membership: "Your membership (order {number}) is paid and active. Go back to the app to book your classes.",
  demoOrder: "Your demo order {number} is placed. Nothing was charged. You'll find it in your orders in the app.",
  paidOrder: "Your order {number} is placed and paid. You'll find it in your orders in the app.",
  receipt: "Download receipt (PDF)",
  // 170 The app's payment in the phone's browser sheet.
  backToApp: "Back to the app",
  notPaidTitle: "Order not paid",
  notPaidText: "We couldn't confirm a payment for this order. Go back to the app and check out again.",
  theShop: "The shop",
  theShopLower: "the shop",
  theOrganiser: "The organiser",
};

export type PayWords = typeof EN;

const AR: PayWords = {
  checkout: "إتمام الطلب",
  linkInvalidTitle: "الرابط غير صالح",
  linkInvalidText: "رابط الدفع هذا غير صالح. ارجع إلى التطبيق وأتمّ الطلب من جديد.",
  orderClosedTitle: "الطلب مغلق",
  orderClosedText: "هذا الطلب مغلق. ارجع إلى التطبيق وأتمّ الطلب من جديد.",
  linkExpiredTitle: "انتهت صلاحية الرابط",
  linkExpiredText: "انتهت صلاحية رابط الدفع هذا. ارجع إلى التطبيق وأتمّ الطلب من جديد.",
  placesReleasedTitle: "أُلغي حجز الأماكن",
  placesReleasedText: "أُلغي حجز الأماكن المحجوزة لهذا الطلب. ارجع إلى التطبيق واحصل على تذاكرك من جديد.",
  paymentsOffTitle: "الدفع متوقف",
  paymentsOffText: "لا يستطيع هذا المتجر استلام المدفوعات الآن. يُرجى المحاولة لاحقًا.",
  demoBold: "تجريبي.",
  demoText: "هذا تطبيق تجريبي: لا تُطلب بطاقة ولا يُخصم أي مبلغ. في تطبيقك، يدفع العملاء هنا بالبطاقة.",
  payFailed: "لم تتم عملية الدفع. تحقّق من بيانات بطاقتك وحاول مرة أخرى.",
  payPending: "لم يُؤكَّد دفعك بعد. إذا كنت قد دفعت، فسيُؤكَّد طلبك خلال دقائق؛ وإلا فحاول مرة أخرى.",
  order: "الطلب {number}",
  coupon: "القسيمة {code}",
  points: "نقاط الولاء ({count})",
  deliveryTime: "وقت التوصيل",
  shipping: "الشحن",
  deliveryFee: "رسوم التوصيل",
  total: "الإجمالي",
  quoteNote: "يُضاف الشحن والضريبة لعنوانك قبل الدفع.",
  chargedIn: "يُخصم بعملة {currency}: {amount} ({rate}، أسعار {date})",
  approx: "≈ {amount} · تدفع {total}",
  includes: "يشمل {amount} {tax}",
  delivery: "التوصيل",
  pickup: "الاستلام",
  asap: "في أقرب وقت ممكن",
  toPlace: " إلى {place}",
  atPlace: " من {place}",
  deliveryOn: "التوصيل {day}",
  toName: " إلى {name}",
  placeDemo: "قدّم طلبًا تجريبيًا",
  securedBy: "تُعالَج مدفوعات البطاقات بأمان عبر {provider}.",
  card: "البطاقة",
  yourCard: "بطاقتك",
  cardIntro: "أدخل بطاقتك لدفع {total}. تذهب بياناتها مباشرة إلى {provider}: لا يرى المتجر رقمها أبدًا.",
  stripeNotLoaded: "لم يُحمَّل نموذج البطاقة هنا. ادفع في صفحة Stripe الآمنة بدلًا من ذلك.",
  iyzicoNotLoaded: "لم يُحمَّل نموذج البطاقة هنا. ادفع في صفحة iyzico الآمنة بدلًا من ذلك.",
  kashierNotShowing: "لا يظهر نموذج البطاقة؟ ادفع في صفحة Kashier الآمنة بدلًا من ذلك.",
  payOn: "ادفع {total} عبر {provider}",
  opening: "جارٍ فتح الدفع…",
  changeDetails: "غيّر بياناتك",
  howPay: "كيف تريد أن تدفع؟",
  manualNote: "قدّم طلبك، ثم ادفع {total} بهذه الطريقة. يؤكّد المتجر طلبك عند وصول الدفعة.",
  fullName: "الاسم الكامل",
  mobile: "رقم الجوال",
  email: "البريد الإلكتروني",
  city: "المدينة",
  cityOptional: "المدينة (اختياري)",
  address: "العنوان",
  pay: "ادفع {total}",
  placeOrder: "قدّم الطلب · {total}",
  placing: "جارٍ تقديم طلبك…",
  orderReceived: "تم استلام الطلب",
  thankYou: "شكرًا لك!",
  placedOnPlatform: "استلمنا دفعتك وقُدِّم طلبك {number} لدى {app}. ستجده في طلباتك في التطبيق.",
  paymentReceived: "تم استلام الدفعة",
  willConfirm: "استلمنا دفعتك بقيمة {amount}. سيؤكّد {app} طلبك قريبًا.",
  noPlacesTitle: "لم تتبقَّ أماكن",
  noPlacesText: "وصلت دفعتك للطلب {number} بعد إلغاء حجز الأماكن المحجوزة لك، وقد اكتملت الفعالية، لذلك لم تُصدر تذاكر. سيردّ {app} مبلغك.",
  orderPlaced: "تم تقديم الطلب",
  waitingPayment: "طلبك {number} في انتظار دفعتك. ادفع {amount} قبل {date} كما هو موضّح أدناه، واذكر رقم الطلب مع دفعتك. يؤكّد {app} طلبك عند وصول الدفعة، وتصلك الفاتورة حينها.",
  emailed: "أرسلنا إليك هذه التفاصيل بالبريد الإلكتروني أيضًا.",
  membershipDemo: "اشتراكك التجريبي (الطلب {number}) مفعّل. لم يُخصم أي مبلغ. ارجع إلى التطبيق لحجز حصصك.",
  membership: "اشتراكك (الطلب {number}) مدفوع ومفعّل. ارجع إلى التطبيق لحجز حصصك.",
  demoOrder: "قُدِّم طلبك التجريبي {number}. لم يُخصم أي مبلغ. ستجده في طلباتك في التطبيق.",
  paidOrder: "قُدِّم طلبك {number} ودُفع. ستجده في طلباتك في التطبيق.",
  receipt: "نزّل الفاتورة (PDF)",
  backToApp: "العودة إلى التطبيق",
  notPaidTitle: "الطلب غير مدفوع",
  notPaidText: "لم نتمكّن من تأكيد دفعة لهذا الطلب. ارجع إلى التطبيق وأتمّ الطلب من جديد.",
  theShop: "المتجر",
  theShopLower: "المتجر",
  theOrganiser: "المنظّم",
};

const TR: PayWords = {
  checkout: "Ödeme",
  linkInvalidTitle: "Bağlantı geçersiz",
  linkInvalidText: "Bu ödeme bağlantısı geçersiz. Uygulamaya dönüp yeniden ödeme yapın.",
  orderClosedTitle: "Sipariş kapandı",
  orderClosedText: "Bu sipariş kapandı. Uygulamaya dönüp yeniden ödeme yapın.",
  linkExpiredTitle: "Bağlantının süresi doldu",
  linkExpiredText: "Bu ödeme bağlantısının süresi doldu. Uygulamaya dönüp yeniden ödeme yapın.",
  placesReleasedTitle: "Yerler bırakıldı",
  placesReleasedText: "Bu sipariş için ayrılan yerler bırakıldı. Uygulamaya dönüp biletlerinizi yeniden alın.",
  paymentsOffTitle: "Ödemeler kapalı",
  paymentsOffText: "Bu mağaza şu anda ödeme alamıyor. Lütfen daha sonra tekrar deneyin.",
  demoBold: "Demo.",
  demoText: "Bu bir demo uygulama: kart istenmez ve ücret alınmaz. Kendi uygulamanızda müşteriler burada kartla öder.",
  payFailed: "Ödeme gerçekleşmedi. Kart bilgilerinizi kontrol edip tekrar deneyin.",
  payPending: "Ödemeniz henüz onaylanmadı. Ödediyseniz siparişiniz birkaç dakika içinde onaylanır; ödemediyseniz tekrar deneyin.",
  order: "Sipariş {number}",
  coupon: "Kupon {code}",
  points: "Sadakat puanı ({count})",
  deliveryTime: "Teslimat saati",
  shipping: "Kargo",
  deliveryFee: "Teslimat ücreti",
  total: "Toplam",
  quoteNote: "Adresinizin kargo ve vergisi ödemeden önce eklenir.",
  chargedIn: "{currency} ile tahsil edilir: {amount} ({rate}, {date} kurları)",
  approx: "≈ {amount} · ödeyeceğiniz {total}",
  includes: "{amount} {tax} dahil",
  delivery: "Teslimat",
  pickup: "Gel al",
  asap: "en kısa sürede",
  toPlace: ", {place} adresine",
  atPlace: ", {place} adresinden",
  deliveryOn: "Teslimat {day}",
  toName: ", alıcı {name}",
  placeDemo: "Demo siparişi ver",
  securedBy: "Kart ödemeleri {provider} tarafından güvenle işlenir.",
  card: "Kart",
  yourCard: "Kartınız",
  cardIntro: "{total} ödemek için kartınızı girin. Bilgiler doğrudan {provider}'a gider: mağaza kart numarasını hiç görmez.",
  stripeNotLoaded: "Kart formu burada yüklenmedi. Bunun yerine Stripe'ın güvenli sayfasında ödeyin.",
  iyzicoNotLoaded: "Kart formu burada yüklenmedi. Bunun yerine iyzico'nun güvenli sayfasında ödeyin.",
  kashierNotShowing: "Kart formu görünmüyor mu? Bunun yerine Kashier'in güvenli sayfasında ödeyin.",
  payOn: "{provider} üzerinden {total} öde",
  opening: "Ödeme açılıyor…",
  changeDetails: "Bilgilerinizi değiştirin",
  howPay: "Nasıl ödemek istersiniz?",
  manualNote: "Siparişinizi verin, ardından {total} tutarını bu şekilde ödeyin. Mağaza, ödeme ulaştığında siparişinizi onaylar.",
  fullName: "Ad soyad",
  mobile: "Cep telefonu",
  email: "E-posta",
  city: "Şehir",
  cityOptional: "Şehir (isteğe bağlı)",
  address: "Adres",
  pay: "{total} öde",
  placeOrder: "Sipariş ver · {total}",
  placing: "Siparişiniz veriliyor…",
  orderReceived: "Sipariş alındı",
  thankYou: "Teşekkürler!",
  placedOnPlatform: "Ödemeniz alındı ve {number} numaralı siparişiniz {app} tarafından oluşturuldu. Siparişinizi uygulamadaki siparişlerinizde bulabilirsiniz.",
  paymentReceived: "Ödeme alındı",
  willConfirm: "{amount} tutarındaki ödemenizi aldık. {app} siparişinizi kısa süre içinde onaylayacak.",
  noPlacesTitle: "Yer kalmadı",
  noPlacesText: "{number} numaralı sipariş için ödemeniz, sizin için ayrılan yerler bırakıldıktan sonra ulaştı ve etkinlik doldu; bu yüzden bilet düzenlenmedi. {app} ödemenizi iade edecek.",
  orderPlaced: "Sipariş verildi",
  waitingPayment: "{number} numaralı siparişiniz ödemenizi bekliyor. {amount} tutarını {date} tarihine kadar aşağıda gösterildiği gibi ödeyin ve ödemenizle birlikte sipariş numarasını belirtin. {app}, ödeme ulaştığında siparişinizi onaylar ve faturanız o zaman gelir.",
  emailed: "Bu bilgileri size e-postayla da gönderdik.",
  membershipDemo: "Demo üyeliğiniz (sipariş {number}) etkin. Ücret alınmadı. Derslerinizi ayırtmak için uygulamaya dönün.",
  membership: "Üyeliğiniz (sipariş {number}) ödendi ve etkin. Derslerinizi ayırtmak için uygulamaya dönün.",
  demoOrder: "{number} numaralı demo siparişiniz verildi. Ücret alınmadı. Uygulamadaki siparişlerinizde bulabilirsiniz.",
  paidOrder: "{number} numaralı siparişiniz verildi ve ödendi. Uygulamadaki siparişlerinizde bulabilirsiniz.",
  receipt: "Faturayı indir (PDF)",
  backToApp: "Uygulamaya dön",
  notPaidTitle: "Sipariş ödenmedi",
  notPaidText: "Bu sipariş için bir ödemeyi doğrulayamadık. Uygulamaya dönüp yeniden ödeme yapın.",
  theShop: "Mağaza",
  theShopLower: "mağaza",
  theOrganiser: "Organizatör",
};

const WORDS: Record<PayLang, PayWords> = { en: EN, ar: AR, tr: TR };

export function payWords(lang: PayLang): PayWords {
  return WORDS[lang];
}

/** What the page's form says back (its checks, the payment's start) in Arabic and Turkish; the hosted API's dictionary for the rest. */
const MESSAGES: Record<"ar" | "tr", Record<string, string>> = {
  ar: {
    "Enter your first and last name.": "أدخل اسمك الأول واسم العائلة.",
    "Enter a valid mobile number.": "أدخل رقم جوال صحيحًا.",
    "Enter a valid email address.": "أدخل بريدًا إلكترونيًا صحيحًا.",
    "Enter your city.": "أدخل مدينتك.",
    "Enter your full address.": "أدخل عنوانك كاملًا.",
    "This payment link isn't valid.": "رابط الدفع هذا غير صالح.",
    "This payment link has expired. Go back to the app and check out again.": AR.linkExpiredText,
    "The places held for this order were released. Go back to the app and get your tickets again.": AR.placesReleasedText,
    "This payment method isn't offered any more. Choose another one.": "لم تعد طريقة الدفع هذه متاحة. اختر طريقة أخرى.",
    "This shop can't take payments right now. Please try again later.": AR.paymentsOffText,
    "The card payment couldn't start. Please try again in a moment.": "تعذّر بدء الدفع بالبطاقة. يُرجى المحاولة بعد قليل.",
  },
  tr: {
    "Enter your first and last name.": "Adınızı ve soyadınızı girin.",
    "Enter a valid mobile number.": "Geçerli bir cep telefonu numarası girin.",
    "Enter a valid email address.": "Geçerli bir e-posta adresi girin.",
    "Enter your city.": "Şehrinizi girin.",
    "Enter your full address.": "Açık adresinizi girin.",
    "This payment link isn't valid.": "Bu ödeme bağlantısı geçersiz.",
    "This payment link has expired. Go back to the app and check out again.": TR.linkExpiredText,
    "The places held for this order were released. Go back to the app and get your tickets again.": TR.placesReleasedText,
    "This payment method isn't offered any more. Choose another one.": "Bu ödeme yöntemi artık sunulmuyor. Başka bir yöntem seçin.",
    "This shop can't take payments right now. Please try again later.": TR.paymentsOffText,
    "The card payment couldn't start. Please try again in a moment.": "Kartla ödeme başlatılamadı. Lütfen birazdan tekrar deneyin.",
  },
};

/** A message of the payment page's form in `lang`; English as it is. */
export function payMessage(message: string, lang: PayLang): string {
  if (lang === "en") return message;
  return MESSAGES[lang][message] ?? serverMessage(message, lang) ?? message;
}

/** Each field's error in `lang`. */
export function payErrors(errors: Record<string, string> | undefined, lang: PayLang): Record<string, string> | undefined {
  if (!errors) return errors;
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, payMessage(v, lang)]));
}
