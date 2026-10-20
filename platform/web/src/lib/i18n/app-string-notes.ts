import type { Lang } from "@/i18n/config";

/**
 * 62 What the app's interface strings are for, as Dashboard › Languages says
 * it: the descriptions in mobile/lib/l10n/app_en.arb (copied into
 * app-strings.json by scripts/app-strings.mjs) are written for developers and
 * name the app's code; owners read these instead, in the dashboard's
 * language. Keyed by the English description; `en` when the owner's English
 * differs from it. A description without an entry shows in English, with
 * its code names left out (tests/unit/phase62.test.ts lists those missing).
 */
export const APP_STRING_NOTES: Record<string, { en?: string; ar: string; tr: string }> = {
  "The language's own name, shown in the language picker.": {
    ar: "اسم اللغة بلغتها نفسها، ويظهر في قائمة اختيار اللغة.",
    tr: "Dilin kendi dilindeki adı; dil seçicide görünür.",
  },
  "A country name by ISO code, for the country code picker.": {
    en: "A country's name, in the country code picker.",
    ar: "اسم دولة، في قائمة اختيار رمز الدولة.",
    tr: "Bir ülkenin adı; ülke kodu seçicide.",
  },
  "Registered devices when the app has no device limit (limit 0).": {
    en: "Registered devices, when the app has no device limit.",
    ar: "الأجهزة المسجّلة، عندما لا يكون للتطبيق حدّ لعدد الأجهزة.",
    tr: "Uygulamada cihaz sınırı yokken kayıtlı cihazlar.",
  },
  "Settings › Registered devices when the app has no device limit.": {
    ar: "الإعدادات › الأجهزة المسجّلة، عندما لا يكون للتطبيق حدّ لعدد الأجهزة.",
    tr: "Ayarlar › Kayıtlı cihazlar, uygulamada cihaz sınırı yokken.",
  },
  "What the app calls the business that owns it. lib/core/l10n/vertical_wording.dart picks the word by the app's kind of business (Config.vertical); clinics use their own word, every other kind this default.": {
    en: "What the app calls your business. Clinics, restaurants and gyms use their own word; every other kind of business uses this one.",
    ar: "ما يسمّي به التطبيق نشاطك التجاري. للعيادات والمطاعم والنوادي الرياضية كلمتها الخاصة؛ وتستخدم بقية الأنشطة هذه الكلمة.",
    tr: "Uygulamanın işletmenize verdiği ad. Klinikler, restoranlar ve spor salonları kendi sözcüklerini kullanır; diğer tüm işletmeler bunu kullanır.",
  },
  "What the app calls the business's customers. lib/core/l10n/vertical_wording.dart picks the word by the app's kind of business (Config.vertical); clinics use their own word, every other kind this default.": {
    en: "What the app calls your customers. Clinics and gyms use their own word; every other kind of business uses this one.",
    ar: "ما يسمّي به التطبيق عملاءك. للعيادات والنوادي الرياضية كلمتها الخاصة؛ وتستخدم بقية الأنشطة هذه الكلمة.",
    tr: "Uygulamanın müşterilerinize verdiği ad. Klinikler ve spor salonları kendi sözcüklerini kullanır; diğer tüm işletmeler bunu kullanır.",
  },
  "What a clinic app calls the business that owns it (vertical_wording.dart).": {
    en: "What a clinic's app calls the clinic.",
    ar: "ما يسمّي به تطبيق العيادة العيادةَ نفسها.",
    tr: "Bir klinik uygulamasının kliniğe verdiği ad.",
  },
  "What a clinic app calls the clinic's customers (vertical_wording.dart).": {
    en: "What a clinic's app calls its patients.",
    ar: "ما يسمّي به تطبيق العيادة مرضاها.",
    tr: "Bir klinik uygulamasının hastalarına verdiği ad.",
  },
  "Heading above the doctor picker when booking. lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.": {
    en: "The heading above the doctor picker when booking, in a clinic's app.",
    ar: "العنوان فوق قائمة اختيار الطبيب عند الحجز، في تطبيق العيادة.",
    tr: "Bir klinik uygulamasında randevu alırken doktor seçicinin üstündeki başlık.",
  },
  "lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.": {
    en: "In a clinic's app, instead of the general word for bookings.",
    ar: "في تطبيق العيادة، بدلًا من الكلمة العامة للحجوزات.",
    tr: "Bir klinik uygulamasında, randevular için genel sözcüğün yerine.",
  },
  "The tab and screen with the patient's visits. lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.": {
    en: "The tab and screen with the patient's visits, in a clinic's app.",
    ar: "التبويب والشاشة التي فيها زيارات المريض، في تطبيق العيادة.",
    tr: "Bir klinik uygulamasında hastanın ziyaretlerinin olduğu sekme ve ekran.",
  },
  "Title of one visit. lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.": {
    en: "The title of one visit, in a clinic's app.",
    ar: "عنوان زيارة واحدة، في تطبيق العيادة.",
    tr: "Bir klinik uygulamasında tek bir ziyaretin başlığı.",
  },
  "The doctor picker's choice for the first doctor free. lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.": {
    en: "The doctor picker's choice for the first doctor who is free, in a clinic's app.",
    ar: "خيار أول طبيب متاح في قائمة اختيار الطبيب، في تطبيق العيادة.",
    tr: "Bir klinik uygulamasında doktor seçicideki ilk müsait doktor seçeneği.",
  },
  "Title of the intake form shown before booking, when the business asks questions (BookingsConfig.intake_fields).": {
    en: "The title of the questions form shown before booking, when you ask questions.",
    ar: "عنوان نموذج الأسئلة الذي يظهر قبل الحجز، عندما تطرح أسئلة.",
    tr: "Soru sorduğunuzda randevudan önce görünen soru formunun başlığı.",
  },
  "Under the intake form's title; business is the business's name.": {
    en: "Under the questions form's title; {business} is your business's name.",
    ar: "تحت عنوان نموذج الأسئلة؛ {business} هو اسم نشاطك التجاري.",
    tr: "Soru formunun başlığının altında; {business}, işletmenizin adıdır.",
  },
  "Next to an intake question that can be left empty.": {
    en: "Next to a question that can be left empty.",
    ar: "بجانب سؤال يمكن تركه فارغًا.",
    tr: "Boş bırakılabilen bir sorunun yanında.",
  },
  "An intake question's date field before a date is chosen.": {
    en: "A question's date field, before a date is chosen.",
    ar: "حقل التاريخ في سؤال، قبل اختيار تاريخ.",
    tr: "Bir sorunun tarih alanı, tarih seçilmeden önce.",
  },
  "Heading of the customer's intake answers on their appointment.": {
    en: "The heading of the customer's answers on their appointment.",
    ar: "عنوان إجابات العميل في موعده.",
    tr: "Müşterinin randevusundaki yanıtlarının başlığı.",
  },
  "On a staff member's (a doctor's) profile.": {
    ar: "في الملف الشخصي لأحد أفراد الفريق (طبيب مثلًا).",
    tr: "Bir ekip üyesinin (örneğin bir doktorun) profilinde.",
  },
  "On a staff member's profile: the languages they speak.": {
    ar: "في الملف الشخصي لأحد أفراد الفريق: اللغات التي يتحدثها.",
    tr: "Bir ekip üyesinin profilinde: konuştuğu diller.",
  },
  "On a staff member's profile, above a few lines about them.": {
    ar: "في الملف الشخصي لأحد أفراد الفريق، فوق بضعة أسطر عنه.",
    tr: "Bir ekip üyesinin profilinde, hakkındaki birkaç satırın üstünde.",
  },
  "Opens a staff member's profile (also read by screen readers).": {
    ar: "يفتح الملف الشخصي لأحد أفراد الفريق (وتقرؤه قارئات الشاشة أيضًا).",
    tr: "Bir ekip üyesinin profilini açar (ekran okuyucular da okur).",
  },
  "What a restaurant app calls the business that owns it (vertical_wording.dart).": {
    en: "What a restaurant's app calls the restaurant.",
    ar: "ما يسمّي به تطبيق المطعم المطعمَ نفسه.",
    tr: "Bir restoran uygulamasının restorana verdiği ad.",
  },
  "The tab and screen with a restaurant's dishes. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant) instead of Shop.": {
    en: "The tab and screen with a restaurant's dishes, instead of Shop.",
    ar: "التبويب والشاشة التي فيها أطباق المطعم، بدلًا من المتجر.",
    tr: "Bir restoranın yemeklerinin olduğu sekme ve ekran; Mağaza yerine.",
  },
  "Search box hint on a restaurant's menu. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).": {
    en: "The search box's hint on a restaurant's menu.",
    ar: "التلميح في مربع البحث في قائمة طعام المطعم.",
    tr: "Bir restoranın menüsündeki arama kutusunun ipucu.",
  },
  "Button of an empty cart in a restaurant app. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).": {
    en: "The button of an empty cart, in a restaurant's app.",
    ar: "زر السلة الفارغة، في تطبيق المطعم.",
    tr: "Bir restoran uygulamasında boş sepetin düğmesi.",
  },
  "The menu has no dishes. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).": {
    en: "When the menu has no dishes, in a restaurant's app.",
    ar: "عندما لا تحتوي قائمة الطعام على أطباق، في تطبيق المطعم.",
    tr: "Bir restoran uygulamasında menüde yemek yokken.",
  },
  "Screen reader label while the menu loads. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).": {
    en: "Read by screen readers while the menu loads, in a restaurant's app.",
    ar: "تقرؤه قارئات الشاشة أثناء تحميل قائمة الطعام، في تطبيق المطعم.",
    tr: "Bir restoran uygulamasında menü yüklenirken ekran okuyucuların okuduğu metin.",
  },
  "The menu's last section: dishes without a category.": {
    ar: "القسم الأخير من قائمة الطعام: أطباق بلا فئة.",
    tr: "Menünün son bölümü: kategorisi olmayan yemekler.",
  },
  "An option group the customer must choose from.": {
    ar: "مجموعة خيارات يجب أن يختار العميل منها.",
    tr: "Müşterinin seçim yapması gereken bir seçenek grubu.",
  },
  "An option group the customer may skip.": {
    ar: "مجموعة خيارات يمكن للعميل تخطّيها.",
    tr: "Müşterinin atlayabileceği bir seçenek grubu.",
  },
  "How many options of a group to choose.": {
    ar: "عدد الخيارات التي يجب اختيارها من مجموعة.",
    tr: "Bir gruptan kaç seçenek seçileceği.",
  },
  "The option sheet's button, with the price of the chosen dish and quantity.": {
    ar: "زر نافذة الخيارات، مع سعر الطبق المختار والكمية.",
    tr: "Seçenek panelinin düğmesi; seçilen yemeğin ve adedin fiyatıyla.",
  },
  "The option sheet's button while a required group has no choice.": {
    ar: "زر نافذة الخيارات عندما لا يكون هناك اختيار في مجموعة مطلوبة.",
    tr: "Zorunlu bir grupta seçim yokken seçenek panelinin düğmesi.",
  },
  "Under the option sheet's price.": {
    ar: "تحت السعر في نافذة الخيارات.",
    tr: "Seçenek panelindeki fiyatın altında.",
  },
  "Heading of the cart's choice between pickup and delivery.": {
    ar: "عنوان الاختيار في السلة بين الاستلام والتوصيل.",
    tr: "Sepette gel-al ile teslimat arasındaki seçimin başlığı.",
  },
  "The customer collects the order.": {
    ar: "يستلم العميل الطلب بنفسه.",
    tr: "Müşteri siparişi kendisi alır.",
  },
  "The order is delivered.": {
    ar: "يُوصَّل الطلب.",
    tr: "Sipariş teslim edilir.",
  },
  "Where pickup orders are collected.": {
    ar: "مكان استلام طلبات الاستلام.",
    tr: "Gel-al siparişlerinin alındığı yer.",
  },
  "Field for the delivery address.": {
    ar: "حقل عنوان التوصيل.",
    tr: "Teslimat adresi alanı.",
  },
  "Hint of the delivery address field.": {
    ar: "تلميح حقل عنوان التوصيل.",
    tr: "Teslimat adresi alanının ipucu.",
  },
  "The district the order goes to.": {
    ar: "الحيّ الذي يذهب إليه الطلب.",
    tr: "Siparişin gideceği semt.",
  },
  "Field for a note to the courier.": {
    ar: "حقل ملاحظة لمندوب التوصيل.",
    tr: "Kuryeye not alanı.",
  },
  "The delivery fee line in the cart and on an order.": {
    ar: "سطر رسوم التوصيل في السلة وفي الطلب.",
    tr: "Sepette ve siparişte teslimat ücreti satırı.",
  },
  "Shown when a delivery's subtotal is below the minimum.": {
    ar: "يظهر عندما يكون المجموع الفرعي للتوصيل أقل من الحد الأدنى.",
    tr: "Teslimatın ara toplamı en düşük tutarın altındayken görünür.",
  },
  "Why checkout is blocked.": {
    ar: "سبب منع إتمام الطلب.",
    tr: "Ödemeye geçişin neden engellendiği.",
  },
  "Heading of the cart's time choice.": {
    ar: "عنوان اختيار الوقت في السلة.",
    tr: "Sepetteki zaman seçiminin başlığı.",
  },
  "An order without a chosen time.": {
    ar: "طلب بلا وقت محدد.",
    tr: "Zaman seçilmemiş bir sipariş.",
  },
  "Under As soon as possible.": {
    ar: "تحت «في أقرب وقت ممكن».",
    tr: "\"En kısa sürede\"nin altında.",
  },
  "Choose a time for the order.": {
    ar: "اختيار وقت للطلب.",
    tr: "Sipariş için bir zaman seçme.",
  },
  "Title of the time picker and why checkout is blocked.": {
    ar: "عنوان أداة اختيار الوقت، وسبب منع إتمام الطلب.",
    tr: "Zaman seçicinin başlığı ve ödemeye geçişin neden engellendiği.",
  },
  "A time today.": {
    ar: "وقت اليوم.",
    tr: "Bugün bir saat.",
  },
  "A time tomorrow.": {
    ar: "وقت غدًا.",
    tr: "Yarın bir saat.",
  },
  "Shown when the kitchen is closed.": {
    ar: "يظهر عندما يكون المطبخ مغلقًا.",
    tr: "Mutfak kapalıyken görünür.",
  },
  "Shown when the kitchen is closed and no opening is known.": {
    ar: "يظهر عندما يكون المطبخ مغلقًا ولا يُعرف موعد فتحه.",
    tr: "Mutfak kapalıyken ve açılış saati bilinmiyorken görünür.",
  },
  "Under Closed now, when scheduled orders are allowed.": {
    ar: "تحت «مغلق الآن»، عندما تكون الطلبات المجدولة مسموحة.",
    tr: "\"Şu an kapalı\"nın altında, ileri tarihli siparişlere izin varken.",
  },
  "Under Closed now, when only orders as soon as possible are taken.": {
    ar: "تحت «مغلق الآن»، عندما تُقبل الطلبات الفورية فقط.",
    tr: "\"Şu an kapalı\"nın altında, yalnızca en kısa sürede siparişler alınırken.",
  },
  "An order's step: received by the kitchen.": {
    ar: "مرحلة من مراحل الطلب: استلمه المطبخ.",
    tr: "Siparişin bir adımı: mutfak aldı.",
  },
  "An order's step.": {
    ar: "مرحلة من مراحل الطلب.",
    tr: "Siparişin bir adımı.",
  },
  "An order's step, for pickup orders.": {
    ar: "مرحلة من مراحل الطلب، لطلبات الاستلام.",
    tr: "Siparişin bir adımı; gel-al siparişleri için.",
  },
  "An order's step, for deliveries.": {
    ar: "مرحلة من مراحل الطلب، للتوصيل.",
    tr: "Siparişin bir adımı; teslimatlar için.",
  },
  "An order's state.": {
    ar: "حالة الطلب.",
    tr: "Siparişin durumu.",
  },
  "On a cancelled order.": {
    ar: "في طلب ملغى.",
    tr: "İptal edilmiş bir siparişte.",
  },
  "How an order is collected.": {
    ar: "طريقة استلام الطلب.",
    tr: "Siparişin nasıl alındığı.",
  },
  "On an order's tracking screen.": {
    ar: "في شاشة تتبّع الطلب.",
    tr: "Sipariş takip ekranında.",
  },
  "Heading of an order's items.": {
    ar: "عنوان عناصر الطلب.",
    tr: "Siparişin ürünlerinin başlığı.",
  },
  "An order's total.": {
    ar: "إجمالي الطلب.",
    tr: "Siparişin toplamı.",
  },
  "Screen reader label while an order loads.": {
    en: "Read by screen readers while an order loads.",
    ar: "تقرؤه قارئات الشاشة أثناء تحميل الطلب.",
    tr: "Bir sipariş yüklenirken ekran okuyucuların okuduğu metin.",
  },
  "What a gym or studio app calls the business that owns it (vertical_wording.dart).": {
    en: "What a gym's or studio's app calls the gym or studio.",
    ar: "ما يسمّي به تطبيق النادي الرياضي أو الاستوديو النادي أو الاستوديو.",
    tr: "Bir spor salonu veya stüdyo uygulamasının salona ya da stüdyoya verdiği ad.",
  },
  "What a gym or studio app calls its customers (vertical_wording.dart).": {
    en: "What a gym's or studio's app calls its members.",
    ar: "ما يسمّي به تطبيق النادي الرياضي أو الاستوديو أعضاءه.",
    tr: "Bir spor salonu veya stüdyo uygulamasının üyelerine verdiği ad.",
  },
  "Heading above the coach picker when booking a personal session. lib/core/l10n/vertical_wording.dart uses it in gym apps (Config.vertical fitness).": {
    en: "The heading above the coach picker when booking a personal session, in a gym's app.",
    ar: "العنوان فوق قائمة اختيار المدرّب عند حجز جلسة خاصة، في تطبيق النادي الرياضي.",
    tr: "Bir spor salonu uygulamasında özel seans alırken antrenör seçicinin üstündeki başlık.",
  },
  "lib/core/l10n/vertical_wording.dart uses it in gym apps (Config.vertical fitness) instead of the general bookings word.": {
    en: "In a gym's app, instead of the general word for bookings.",
    ar: "في تطبيق النادي الرياضي، بدلًا من الكلمة العامة للحجوزات.",
    tr: "Bir spor salonu uygulamasında, randevular için genel sözcüğün yerine.",
  },
  "The class timetable's title and tab (a gym's or studio's group classes).": {
    ar: "عنوان جدول الحصص وتبويبه (الحصص الجماعية في النادي الرياضي أو الاستوديو).",
    tr: "Ders programının başlığı ve sekmesi (bir spor salonunun veya stüdyonun grup dersleri).",
  },
  "Read by screen readers while the timetable loads.": {
    ar: "تقرؤه قارئات الشاشة أثناء تحميل جدول الحصص.",
    tr: "Ders programı yüklenirken ekran okuyucuların okuduğu metin.",
  },
  "The timetable on a day without classes.": {
    ar: "جدول الحصص في يوم بلا حصص.",
    tr: "Dersi olmayan bir günde ders programı.",
  },
  "When the business has no classes in the app.": {
    en: "When you have no classes in the app.",
    ar: "عندما لا تكون لديك حصص في التطبيق.",
    tr: "Uygulamada hiç dersiniz yokken.",
  },
  "Spots left in a class.": {
    ar: "الأماكن المتبقية في حصة.",
    tr: "Bir derste kalan yerler.",
  },
  "A class with no spots left.": {
    ar: "حصة لم يتبقَّ فيها مكان.",
    tr: "Yeri kalmamış bir ders.",
  },
  "A class the business called off.": {
    en: "A class you called off.",
    ar: "حصة ألغيتها.",
    tr: "İptal ettiğiniz bir ders.",
  },
  "On a class the member has a spot in.": {
    ar: "في حصة حجز فيها العضو مكانًا.",
    tr: "Üyenin yer ayırttığı bir derste.",
  },
  "Books a spot in a class.": {
    ar: "يحجز مكانًا في حصة.",
    tr: "Bir derste yer ayırtır.",
  },
  "Gives back the member's spot in a class.": {
    ar: "يتنازل عن مكان العضو في حصة.",
    tr: "Üyenin bir dersteki yerini geri verir.",
  },
  "Read by screen readers on a class's Book button.": {
    ar: "تقرؤه قارئات الشاشة على زر الحجز في حصة.",
    tr: "Bir dersin Rezervasyon düğmesinde ekran okuyucuların okuduğu metin.",
  },
  "Read by screen readers on a class's Cancel button.": {
    ar: "تقرؤه قارئات الشاشة على زر الإلغاء في حصة.",
    tr: "Bir dersin İptal düğmesinde ekran okuyucuların okuduğu metin.",
  },
  "Asks before cancelling a spot in a class.": {
    ar: "يسأل قبل إلغاء مكان في حصة.",
    tr: "Bir dersteki yeri iptal etmeden önce sorar.",
  },
  "Under a class's name: its coach.": {
    ar: "تحت اسم الحصة: مدرّبها.",
    tr: "Dersin adının altında: antrenörü.",
  },
  "The membership screen's title and tab.": {
    ar: "عنوان شاشة الاشتراك وتبويبها.",
    tr: "Üyelik ekranının başlığı ve sekmesi.",
  },
  "Read by screen readers.": {
    ar: "تقرؤه قارئات الشاشة.",
    tr: "Ekran okuyucular okur.",
  },
  "Classes a plan includes.": {
    ar: "الحصص التي تتضمنها الخطة.",
    tr: "Bir planın içerdiği dersler.",
  },
  "When a membership ends.": {
    ar: "موعد انتهاء الاشتراك.",
    tr: "Üyeliğin bittiği zaman.",
  },
  "A pack of classes.": {
    ar: "باقة حصص.",
    tr: "Bir ders paketi.",
  },
  "Above the membership plans on sale.": {
    ar: "فوق خطط الاشتراك المعروضة للبيع.",
    tr: "Satıştaki üyelik planlarının üstünde.",
  },
  "Buys a membership plan on the payment page.": {
    ar: "يشتري خطة اشتراك في صفحة الدفع.",
    tr: "Ödeme sayfasında bir üyelik planı satın alır.",
  },
  "Read by screen readers on a plan's Buy button.": {
    ar: "تقرؤه قارئات الشاشة على زر الشراء في خطة.",
    tr: "Bir planın Satın al düğmesinde ekran okuyucuların okuduğu metin.",
  },
  "After a plan's price.": {
    ar: "بعد سعر الخطة.",
    tr: "Bir planın fiyatından sonra.",
  },
  "After a pack's price.": {
    ar: "بعد سعر الباقة.",
    tr: "Bir paketin fiyatından sonra.",
  },
  "Opens the membership plans, for example when booking a class needs one.": {
    ar: "يفتح خطط الاشتراك، مثلًا عندما يتطلب حجز حصة اشتراكًا.",
    tr: "Üyelik planlarını açar; örneğin bir derse yer ayırtmak üyelik gerektirdiğinde.",
  },
  "Confirms giving back a spot in a class.": {
    ar: "يؤكد التنازل عن مكان في حصة.",
    tr: "Bir dersteki yeri geri vermeyi onaylar.",
  },
  "Shows the events as a list (beside Calendar).": {
    ar: "يعرض الفعاليات في قائمة (بجانب التقويم).",
    tr: "Etkinlikleri liste olarak gösterir (Takvim'in yanında).",
  },
  "Shows the events on a month calendar.": {
    ar: "يعرض الفعاليات في تقويم شهري.",
    tr: "Etkinlikleri aylık takvimde gösterir.",
  },
  "Paid tickets that can't be bought here (an online event on iPhone, or no card payments). Never a link to buy elsewhere.": {
    en: "Paid tickets that can't be bought in the app (an online event on iPhone, or no card payments). Never a link to buy elsewhere.",
    ar: "تذاكر مدفوعة لا يمكن شراؤها في التطبيق (فعالية عبر الإنترنت على iPhone، أو لا دفع بالبطاقة). ولا يكون أبدًا رابطًا للشراء من مكان آخر.",
    tr: "Uygulamada satın alınamayan ücretli biletler (iPhone'da çevrim içi bir etkinlik ya da kartla ödeme yok). Asla başka yerden satın alma bağlantısı değildir.",
  },
  "47 A ticket the organiser refunded (it is cancelled and its place freed).": {
    en: "A ticket you refunded (it is cancelled and its place freed).",
    ar: "تذكرة استرددت ثمنها (أُلغيت وأصبح مكانها متاحًا).",
    tr: "İade ettiğiniz bir bilet (iptal edilir ve yeri boşalır).",
  },
  '47 What the business refunded of an order or donation, like "Refunded ₺100.00".': {
    en: 'What you refunded of an order or donation, like "Refunded ₺100.00".',
    ar: "ما استرددته من طلب أو تبرع، مثل «تم استرداد ₺100.00».",
    tr: "Bir sipariş veya bağıştan iade ettiğiniz tutar; örneğin \"₺100.00 iade edildi\".",
  },
  "What a campaign has raised and its goal.": {
    ar: "ما جمعته الحملة وهدفها.",
    tr: "Bir kampanyanın topladığı tutar ve hedefi.",
  },
  "What a campaign without a goal has raised.": {
    ar: "ما جمعته حملة بلا هدف.",
    tr: "Hedefi olmayan bir kampanyanın topladığı tutar.",
  },
  "The iPhone app's donate button: it opens the donation page in the browser (App Store rules).": {
    ar: "زر التبرع في تطبيق iPhone: يفتح صفحة التبرع في المتصفح (قواعد App Store).",
    tr: "iPhone uygulamasının bağış düğmesi: bağış sayfasını tarayıcıda açar (App Store kuralları).",
  },
  "Opening hours block: the business is open at this moment.": {
    en: "Opening hours block: you're open at this moment.",
    ar: "قسم ساعات العمل: أنت مفتوح في هذه اللحظة.",
    tr: "Çalışma saatleri bloğu: şu anda açıksınız.",
  },
  "Opening hours block: a weekday without opening hours.": {
    ar: "قسم ساعات العمل: يوم من أيام الأسبوع بلا ساعات عمل.",
    tr: "Çalışma saatleri bloğu: çalışma saati olmayan bir gün.",
  },
  "Opening hours block: marks today's row.": {
    ar: "قسم ساعات العمل: يميّز صف اليوم.",
    tr: "Çalışma saatleri bloğu: bugünün satırını işaretler.",
  },
  "Contact block: opens the address in the phone's maps.": {
    ar: "قسم التواصل: يفتح العنوان في خرائط الهاتف.",
    tr: "İletişim bloğu: adresi telefonun haritalarında açar.",
  },
  "Contact block: opens the business's website.": {
    en: "Contact block: opens your website.",
    ar: "قسم التواصل: يفتح موقعك الإلكتروني.",
    tr: "İletişim bloğu: web sitenizi açar.",
  },
  "Countdown block: short for minutes.": {
    ar: "قسم العدّ التنازلي: اختصار الدقائق.",
    tr: "Geri sayım bloğu: dakikanın kısaltması.",
  },
  "Countdown block: short for seconds.": {
    ar: "قسم العدّ التنازلي: اختصار الثواني.",
    tr: "Geri sayım bloğu: saniyenin kısaltması.",
  },
  "Course page: a course the website protects with a password. The app never asks for the password.": {
    en: "Course page: a course your website protects with a password. The app never asks for the password.",
    ar: "صفحة الدورة: دورة يحميها موقعك بكلمة مرور. لا يطلب التطبيق كلمة المرور أبدًا.",
    tr: "Kurs sayfası: web sitenizin şifreyle koruduğu bir kurs. Uygulama şifreyi hiçbir zaman sormaz.",
  },
  "Course page, under the password notice, when the course can be opened on the website.": {
    ar: "صفحة الدورة، تحت تنبيه كلمة المرور، عندما يمكن فتح الدورة على الموقع.",
    tr: "Kurs sayfası, şifre uyarısının altında, kurs web sitesinde açılabildiğinde.",
  },
  "Course page, under the password notice, on iPhone for a paid course: no link to the website there.": {
    ar: "صفحة الدورة، تحت تنبيه كلمة المرور، على iPhone لدورة مدفوعة: لا رابط إلى الموقع هناك.",
    tr: "Kurs sayfası, şifre uyarısının altında, iPhone'da ücretli bir kurs için: orada web sitesine bağlantı yoktur.",
  },
  "Course page button that opens a password-protected course on the website, where its password is entered.": {
    ar: "زر في صفحة الدورة يفتح الدورة المحمية بكلمة مرور على الموقع، حيث تُدخل كلمة مرورها.",
    tr: "Şifreli bir kursu, şifresinin girildiği web sitesinde açan kurs sayfası düğmesi.",
  },
  "Slider block: which slide is shown, for screen readers.": {
    ar: "قسم الشرائح: الشريحة المعروضة، لقارئات الشاشة.",
    tr: "Kaydırıcı bloğu: hangi slaytın gösterildiği; ekran okuyucular için.",
  },
};

/** A developer's description without the app's code names: "… lib/core/x.dart uses it …", "(vertical_wording.dart)", a leading roadmap number. */
export function plainDescription(description: string): string {
  return description
    .replace(/^\d+ /, "")
    .replace(/\s*\([^)]*\.dart\)/g, "")
    .replace(/\s*\((?:[A-Z][A-Za-z]+\.)+[a-z_]+[^)]*\)/g, "")
    .replace(/[^.]*\b(?:lib\/\S+\.dart|Config\.\w+)[^.]*\.\s*/g, "")
    .trim();
}

/** What an interface string is for, in the dashboard's language. */
export function appStringNote(description: string | undefined, lang: Lang): string {
  if (!description) return "";
  const note = APP_STRING_NOTES[description];
  if (!note) return plainDescription(description);
  return lang === "en" ? (note.en ?? description) : note[lang];
}
