import type { Strings } from "../types";

/**
 * 133 Every currency: the searchable currency picker (components/currency-picker.tsx)
 * on each page where an app chooses what it sells in, its notes on decimals
 * and on the card gateway, and the shop's customers' currencies (the day's
 * rates, charging in the customer's currency).
 */
export const en = {
  label: "Currency",
  search: "Search currencies",
  searchPlaceholder: "Name, code or sign",
  usual: "Usual",
  all: "All currencies",
  none: "No currency matches “{query}”.",
  count: "{count} currencies",
  digits0: "{code} has no decimals: prices are whole amounts, like 1250.",
  digits3: "{code} is written with three decimals (1.250); prices go to the hundredth, like 1.250 or 1.260.",
  gatewayNo: "{provider} doesn't take payments in {code}: customers can't pay by card until you choose a currency it takes ({list}) or connect a gateway that takes {code}.",
  gatewayNoCheckout: "{provider} doesn't take payments in {code}, so card payments are off for now. Choose a currency it takes ({list}) in Settings, or connect a gateway that takes {code}.",
  customerTitle: "Customers' currencies",
  customerIntro: "Customers also see your prices in their own currency, at the day's rate, and pay in {base}. The app picks their currency from the phone's region, and they can change it in the app.",
  ratesDate: "The day's rates: {date}.",
  ratesNone: "The day's rates aren't in yet: customers see {base} only.",
  chargeLabel: "Charge in the customer's currency when the card gateway takes it",
  chargeHint: "Off: everyone pays in {base}, and the app shows the converted amount as approximate. On: a customer whose currency your card gateway takes pays in it, at the day's rate; anyone else pays in {base}, and the app says so.",
  chargeGateway: "Your card gateway, {provider}, takes {count} currencies.",
  charged: "Charged {amount} at {rate}",
  chargedHint: "The customer paid in their currency. Refunds go back in it.",
  known: {
    saved: "Customers' currencies saved.",
  },
} as const;

type Messages = Strings<typeof en>;

export const ar: Messages = {
  label: "العملة",
  search: "دوّر على عملة",
  searchPlaceholder: "الاسم أو الكود أو الرمز",
  usual: "الأكثر استخدامًا",
  all: "كل العملات",
  none: "مفيش عملة مطابقة لـ “{query}”.",
  count: "{count} عملة",
  digits0: "{code} مالهاش كسور: الأسعار أرقام صحيحة، زي 1250.",
  digits3: "{code} بتتكتب بـ 3 أرقام بعد العلامة (1.250)، والأسعار بتتسجل لحد جزء من المية، زي 1.250 أو 1.260.",
  gatewayNo: "{provider} مش بياخد مدفوعات بـ {code}: العملاء مش هيقدروا يدفعوا بالكارت إلا لما تختار عملة بياخدها ({list}) أو توصّل بوابة دفع بتاخد {code}.",
  gatewayNoCheckout: "{provider} مش بياخد مدفوعات بـ {code}، فالدفع بالكارت مقفول دلوقتي. اختار عملة بياخدها ({list}) من الإعدادات، أو وصّل بوابة دفع بتاخد {code}.",
  customerTitle: "عملات العملاء",
  customerIntro: "العملاء بيشوفوا أسعارك بعملتهم كمان، بسعر صرف النهارده، وبيدفعوا بـ {base}. التطبيق بيختار عملتهم من منطقة الموبايل، ويقدروا يغيّروها من التطبيق.",
  ratesDate: "أسعار الصرف بتاريخ {date}.",
  ratesNone: "أسعار صرف النهارده لسه موصلتش: العملاء بيشوفوا {base} بس.",
  chargeLabel: "اسحب المبلغ بعملة العميل لما بوابة الدفع تقبلها",
  chargeHint: "مقفول: الكل بيدفع بـ {base}، والتطبيق بيعرض المبلغ المحوّل على إنه تقريبي. مفتوح: العميل اللي بوابة الدفع بتاعتك بتقبل عملته بيدفع بيها بسعر صرف النهارده، وأي حد تاني بيدفع بـ {base}، والتطبيق بيقول له كده.",
  chargeGateway: "بوابة الدفع بتاعتك، {provider}، بتقبل {count} عملة.",
  charged: "اتسحب {amount} بسعر {rate}",
  chargedHint: "العميل دفع بعملته. المرتجعات بترجع بنفس العملة.",
  known: {
    saved: "اتحفظت إعدادات عملات العملاء.",
  },
};

export const tr: Messages = {
  label: "Para birimi",
  search: "Para birimi ara",
  searchPlaceholder: "Ad, kod ya da simge",
  usual: "Sık kullanılanlar",
  all: "Tüm para birimleri",
  none: "“{query}” ile eşleşen para birimi yok.",
  count: "{count} para birimi",
  digits0: "{code} küsuratsızdır: fiyatlar 1250 gibi tam tutarlardır.",
  digits3: "{code} üç ondalıkla yazılır (1.250); fiyatlar yüzde bir basamağına kadar girilir, 1.250 ya da 1.260 gibi.",
  gatewayNo: "{provider}, {code} ile ödeme almıyor: aldığı bir para birimini ({list}) seçene ya da {code} alan bir ödeme altyapısı bağlayana kadar müşteriler kartla ödeyemez.",
  gatewayNoCheckout: "{provider}, {code} ile ödeme almıyor; bu yüzden kartla ödeme şimdilik kapalı. Ayarlar'dan aldığı bir para birimini ({list}) seçin ya da {code} alan bir ödeme altyapısı bağlayın.",
  customerTitle: "Müşterilerin para birimleri",
  customerIntro: "Müşteriler fiyatlarınızı günün kuruyla kendi para birimlerinde de görür ve {base} ile öder. Uygulama para birimini telefonun bölgesinden seçer; müşteri bunu uygulamadan değiştirebilir.",
  ratesDate: "Günün kurları: {date}.",
  ratesNone: "Günün kurları henüz gelmedi: müşteriler yalnızca {base} görür.",
  chargeLabel: "Kart altyapısı alıyorsa müşterinin para biriminde tahsil et",
  chargeHint: "Kapalı: herkes {base} ile öder, uygulama dönüştürülmüş tutarı yaklaşık olarak gösterir. Açık: para birimini kart altyapınızın aldığı müşteri günün kuruyla o para biriminde öder; diğerleri {base} ile öder ve uygulama bunu söyler.",
  chargeGateway: "Kart altyapınız {provider}, {count} para birimi alıyor.",
  charged: "{rate} kurundan {amount} tahsil edildi",
  chargedHint: "Müşteri kendi para biriminde ödedi. İadeler de o para biriminde yapılır.",
  known: {
    saved: "Müşterilerin para birimleri kaydedildi.",
  },
};
