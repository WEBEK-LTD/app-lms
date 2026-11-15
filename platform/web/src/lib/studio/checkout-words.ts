/**
 * 131.25 The gift checkout's words on Studio's canvas (the app's are its
 * own, mobile/lib/l10n), in the app's three languages (Arabic in Modern
 * Standard Arabic, as the app's), and the sample order it is drawn with.
 * SAMPLE: the integrator binds these to the store's gift checkout (its
 * zones, slots and fee, the recipient's places, the `gift_messages` the
 * owner writes in the dashboard); a customer never sees them.
 */

export interface CheckoutWords {
  steps: [string, string, string, string, string];
  stepTitles: [string, string, string, string, string];
  name: string;
  phone: string;
  email: string;
  theirName: string;
  theirPhone: string;
  country: string;
  city: string;
  address: string;
  pin: string;
  pinNote: string;
  onlyPlaces: string;
  required: string;
  today: string;
  tomorrow: string;
  pickDate: string;
  cutoffPassed: string;
  slot: string;
  occasion: string;
  occasions: [string, string, string, string, string, string, string, string];
  ready: string;
  write: string;
  anonymous: string;
  anonymousNote: string;
  preview: string;
  to: string;
  from: string;
  summary: string;
  arrives: string;
  addOns: string;
  discount: string;
  apply: string;
  subtotal: string;
  deliveryFee: string;
  base: string;
  distance: string;
  slotFee: string;
  freeOver: string;
  total: string;
  pay: string;
  sample: {
    sender: string;
    recipient: string;
    phone: string;
    theirPhone: string;
    email: string;
    country: string;
    city: string;
    address: string;
    bouquet: string;
    size: string;
    card: string;
    chocolates: string;
    messages: [string, string, string];
    message: string;
    tomorrowDate: string;
  };
}

const en: CheckoutWords = {
  steps: ["From", "For", "When", "Message", "Pay"],
  stepTitles: ["Who is it from?", "Who is it for?", "When should it arrive?", "Your message", "Your order"],
  name: "Full name",
  phone: "Phone",
  email: "Email",
  theirName: "Their name",
  theirPhone: "Their phone",
  country: "Country",
  city: "City",
  address: "Street, building and floor",
  pin: "Pin the door on the map",
  pinNote: "Delivery is priced by the distance from the shop.",
  onlyPlaces: "We deliver to these places only",
  required: "Required",
  today: "Today",
  tomorrow: "Tomorrow",
  pickDate: "Pick a date",
  cutoffPassed: "Today's cut-off has passed",
  slot: "Time slot",
  occasion: "Occasion",
  occasions: ["Love & romance", "Birthday", "Anniversary", "Congratulations", "New baby", "Get well", "Thank you", "Sympathy"],
  ready: "Ready messages",
  write: "Or write your own",
  anonymous: "Send anonymously",
  anonymousNote: "Your name won't be on the card.",
  preview: "The card",
  to: "To",
  from: "From",
  summary: "Your order",
  arrives: "Arrives",
  addOns: "Add-ons",
  discount: "Discount code",
  apply: "Apply",
  subtotal: "Subtotal",
  deliveryFee: "Delivery fee",
  base: "Base",
  distance: "Distance · 7 km",
  slotFee: "Time slot",
  freeOver: "Free over E£ 2,500",
  total: "Total",
  pay: "Pay E£ 2,575",
  sample: {
    sender: "Omar Hassan",
    recipient: "Salma Adel",
    phone: "+20 100 555 0142",
    theirPhone: "+20 122 555 0187",
    email: "omar@example.com",
    country: "Egypt",
    city: "Cairo",
    address: "12 Shagaret El Dor St., Zamalek, 3rd floor",
    bouquet: "Blush Garden",
    size: "Deluxe · 24 stems",
    card: "Greeting card",
    chocolates: "Chocolate box",
    messages: ["Happy birthday! May this year bloom like these flowers.", "Another year, another reason to celebrate you.", "Wishing you a day as lovely as you are."],
    message: "Happy birthday! May this year bloom like these flowers.",
    tomorrowDate: "Tomorrow, 15 Nov",
  },
};

const ar: CheckoutWords = {
  steps: ["من", "إلى", "متى", "الرسالة", "الدفع"],
  stepTitles: ["من المُرسِل؟", "لمن الهدية؟", "متى تصل؟", "رسالتك", "طلبك"],
  name: "الاسم الكامل",
  phone: "رقم الهاتف",
  email: "البريد الإلكتروني",
  theirName: "اسم المستلم",
  theirPhone: "هاتف المستلم",
  country: "الدولة",
  city: "المدينة",
  address: "الشارع والمبنى والطابق",
  pin: "حدّد الباب على الخريطة",
  pinNote: "تُحسب رسوم التوصيل حسب المسافة من المتجر.",
  onlyPlaces: "نوصّل إلى هذه الأماكن فقط",
  required: "مطلوب",
  today: "اليوم",
  tomorrow: "غدًا",
  pickDate: "اختر تاريخًا",
  cutoffPassed: "انتهى موعد طلبات اليوم",
  slot: "موعد التوصيل",
  occasion: "المناسبة",
  occasions: ["حب ورومانسية", "عيد ميلاد", "ذكرى سنوية", "تهنئة", "مولود جديد", "تمنيات بالشفاء", "شكرًا", "مواساة"],
  ready: "رسائل جاهزة",
  write: "أو اكتب رسالتك",
  anonymous: "أرسل دون ذكر اسمك",
  anonymousNote: "لن يظهر اسمك على البطاقة.",
  preview: "البطاقة",
  to: "إلى",
  from: "من",
  summary: "طلبك",
  arrives: "يصل",
  addOns: "الإضافات",
  discount: "رمز الخصم",
  apply: "تطبيق",
  subtotal: "المجموع الفرعي",
  deliveryFee: "رسوم التوصيل",
  base: "الرسوم الأساسية",
  distance: "المسافة · 7 كم",
  slotFee: "الموعد",
  freeOver: "مجانًا للطلبات فوق 2,500 ج.م",
  total: "الإجمالي",
  pay: "ادفع 2,575 ج.م",
  sample: {
    sender: "عمر حسن",
    recipient: "سلمى عادل",
    phone: "+20 100 555 0142",
    theirPhone: "+20 122 555 0187",
    email: "omar@example.com",
    country: "مصر",
    city: "القاهرة",
    address: "12 شارع شجرة الدر، الزمالك، الطابق الثالث",
    bouquet: "حديقة الورد",
    size: "فاخر · 24 ساقًا",
    card: "بطاقة تهنئة",
    chocolates: "علبة شوكولاتة",
    messages: ["عيد ميلاد سعيد! عسى أن يزهر عامك كهذه الزهور.", "عامٌ جديد وسببٌ آخر للاحتفال بك.", "أتمنى لك يومًا جميلًا مثلك."],
    message: "عيد ميلاد سعيد! عسى أن يزهر عامك كهذه الزهور.",
    tomorrowDate: "غدًا، 15 نوفمبر",
  },
};

const tr: CheckoutWords = {
  steps: ["Kimden", "Kime", "Ne zaman", "Mesaj", "Ödeme"],
  stepTitles: ["Kimden?", "Kime?", "Ne zaman ulaşsın?", "Mesajınız", "Siparişiniz"],
  name: "Ad soyad",
  phone: "Telefon",
  email: "E-posta",
  theirName: "Alıcının adı",
  theirPhone: "Alıcının telefonu",
  country: "Ülke",
  city: "Şehir",
  address: "Sokak, bina ve kat",
  pin: "Kapıyı haritada işaretleyin",
  pinNote: "Teslimat ücreti mağazaya uzaklığa göre hesaplanır.",
  onlyPlaces: "Yalnızca bu yerlere teslim ediyoruz",
  required: "Zorunlu",
  today: "Bugün",
  tomorrow: "Yarın",
  pickDate: "Tarih seçin",
  cutoffPassed: "Bugünün son sipariş saati geçti",
  slot: "Saat aralığı",
  occasion: "Vesile",
  occasions: ["Aşk ve romantizm", "Doğum günü", "Yıl dönümü", "Tebrikler", "Yeni bebek", "Geçmiş olsun", "Teşekkürler", "Taziye"],
  ready: "Hazır mesajlar",
  write: "Ya da kendiniz yazın",
  anonymous: "İsimsiz gönder",
  anonymousNote: "Adınız kartta yer almaz.",
  preview: "Kart",
  to: "Kime",
  from: "Kimden",
  summary: "Siparişiniz",
  arrives: "Varış",
  addOns: "Ekler",
  discount: "İndirim kodu",
  apply: "Uygula",
  subtotal: "Ara toplam",
  deliveryFee: "Teslimat ücreti",
  base: "Temel",
  distance: "Mesafe · 7 km",
  slotFee: "Saat aralığı",
  freeOver: "2.500 E£ üzeri ücretsiz",
  total: "Toplam",
  pay: "2.575 E£ öde",
  sample: {
    sender: "Omar Hassan",
    recipient: "Salma Adel",
    phone: "+20 100 555 0142",
    theirPhone: "+20 122 555 0187",
    email: "omar@example.com",
    country: "Mısır",
    city: "Kahire",
    address: "Shagaret El Dor Cad. 12, Zamalek, 3. kat",
    bouquet: "Pembe Bahçe",
    size: "Lüks · 24 dal",
    card: "Tebrik kartı",
    chocolates: "Çikolata kutusu",
    messages: ["İyi ki doğdun! Bu yıl bu çiçekler gibi açsın.", "Yeni bir yaş, seni kutlamak için bir neden daha.", "Senin kadar güzel bir gün dilerim."],
    message: "İyi ki doğdun! Bu yıl bu çiçekler gibi açsın.",
    tomorrowDate: "Yarın, 15 Kasım",
  },
};

export function checkoutWords(lang: string): CheckoutWords {
  return lang === "ar" ? ar : lang === "tr" ? tr : en;
}

/** SAMPLE The sample order's amounts (E£), as drawn: the bouquet, two add-ons, the fee's parts. */
export const CHECKOUT_SAMPLE_AMOUNTS = { bouquet: "2,100", card: "60", chocolates: "320", subtotal: "2,480", base: "60", distance: "35", slot: "0", fee: "95", total: "2,575", slots: ["10:00–13:00", "13:00–16:00", "16:00–19:00", "19:00–22:00"], slotExtra: [null, null, "+50", "+80"] } as const;
