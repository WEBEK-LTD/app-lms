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
  "Button on the empty My tickets list of an Events app: opens the events.": {
    ar: "زر في قائمة «تذاكري» الفارغة في تطبيق الفعاليات: يفتح الفعاليات.",
    tr: "Etkinlik uygulamasında boş Biletlerim listesindeki düğme: etkinlikleri açar.",
  },
  "Button on the empty Saved list of a News app: opens the articles.": {
    ar: "زر في قائمة المحفوظات الفارغة في تطبيق الأخبار: يفتح المقالات.",
    tr: "Haber uygulamasında boş Kaydedilenler listesindeki düğme: makaleleri açar.",
  },
  "Button on the empty Favorites and Messages lists of a Real estate app: opens the search.": {
    ar: "زر في قائمتي المفضلة والرسائل الفارغتين في تطبيق العقارات: يفتح البحث.",
    tr: "Emlak uygulamasında boş Favoriler ve Mesajlar listelerindeki düğme: aramayı açar.",
  },
  "Button on a day without classes in the timetable: opens the next day of the week with a class.": {
    ar: "زر في يوم بلا حصص في الجدول: يفتح اليوم التالي من الأسبوع الذي فيه حصة.",
    tr: "Ders programında dersi olmayan bir gündeki düğme: haftanın ders olan bir sonraki gününü açar.",
  },
  "101 The search button and search field in the header of the pages in the bottom tabs.": {
    en: "The search button and search field at the top of the pages in the bottom tabs.",
    ar: "زر البحث وخانة البحث أعلى الصفحات في الأزرار السفلية.",
    tr: "Alt sekmelerdeki sayfaların üstündeki arama düğmesi ve arama alanı.",
  },
  "100 A membership's subscription in the app: its price in the store, charged each month.": {
    en: "A membership's subscription in the app: its price in the store, charged each month.",
    ar: "اشتراك العضوية في التطبيق: سعره في المتجر، يُدفع كل شهر.",
    tr: "Uygulamadaki üyelik aboneliği: mağazadaki fiyatı, her ay alınır.",
  },
  "100 A membership's subscription in the app: its price in the store, charged each year.": {
    en: "A membership's subscription in the app: its price in the store, charged each year.",
    ar: "اشتراك العضوية في التطبيق: سعره في المتجر، يُدفع كل سنة.",
    tr: "Uygulamadaki üyelik aboneliği: mağazadaki fiyatı, her yıl alınır.",
  },
  "100 Course page of a course that comes with a membership: the button that shows the membership's subscriptions sold in the app, and each subscription's button to buy it in the store.": {
    en: "On a course that comes with a membership: the button that shows the membership's subscriptions sold in the app, and each subscription's button to buy it in the store.",
    ar: "في دورة ضمن عضوية: الزر الذي يعرض اشتراكات العضوية المباعة في التطبيق، وزر كل اشتراك لشرائه من المتجر.",
    tr: "Üyelikle gelen bir kursta: uygulamada satılan üyelik aboneliklerini gösteren düğme ve her aboneliği mağazadan satın alma düğmesi.",
  },
  "100 Course page of a course that comes with a membership sold in the app, for a student who has none.": {
    en: "On a course that comes with a membership sold in the app, for a student who doesn't have one.",
    ar: "في دورة ضمن عضوية تُباع في التطبيق، للطالب الذي لا يملكها.",
    tr: "Uygulamada satılan bir üyelikle gelen kursta, üyeliği olmayan öğrenci için.",
  },
  "100 The subscription terms shown next to a membership's subscriptions sold in the app, as the stores ask. {store} is Google Play or App Store.": {
    en: "The subscription terms shown next to a membership's subscriptions sold in the app, as Google Play and the App Store ask. {store} is Google Play or App Store.",
    ar: "شروط الاشتراك المعروضة بجانب اشتراكات العضوية المباعة في التطبيق، كما يطلب Google Play وApp Store. {store} هو Google Play أو App Store.",
    tr: "Uygulamada satılan üyelik aboneliklerinin yanında, Google Play ve App Store'un istediği gibi gösterilen abonelik koşulları. {store}, Google Play veya App Store'dur.",
  },
  "100 Opens the store's page of the person's subscriptions (Google Play or the App Store), to change or cancel one.": {
    en: "Opens the store's page of the person's subscriptions (Google Play or the App Store), to change or cancel one.",
    ar: "يفتح صفحة اشتراكات الشخص في المتجر (Google Play أو App Store) لتغيير اشتراك أو إلغائه.",
    tr: "Kişinin mağazadaki abonelikler sayfasını (Google Play veya App Store) açar; bir aboneliği değiştirmek ya da iptal etmek için.",
  },
  "100 Course page and Settings: gives this account the courses and memberships bought before with the same store account.": {
    en: "On a course's page and in Settings: gives this account the courses and memberships bought before with the same store account.",
    ar: "في صفحة الدورة وفي الإعدادات: يمنح هذا الحساب الدورات والعضويات التي اشتُريت سابقًا بحساب المتجر نفسه.",
    tr: "Kurs sayfasında ve Ayarlar'da: aynı mağaza hesabıyla daha önce satın alınan kursları ve üyelikleri bu hesaba verir.",
  },
  "100 Settings: the heading over Restore purchases and Manage subscription.": {
    en: "In Settings: the heading over Restore purchases and Manage subscription.",
    ar: "في الإعدادات: العنوان فوق استعادة المشتريات وإدارة الاشتراك.",
    tr: "Ayarlar'da: Satın alımları geri yükle ve Aboneliği yönet'in üstündeki başlık.",
  },
  "100 After Restore purchases, when purchases were found for this account.": {
    en: "After Restore purchases, when purchases were found for this account.",
    ar: "بعد استعادة المشتريات، عند العثور على مشتريات لهذا الحساب.",
    tr: "Satın alımları geri yükledikten sonra, bu hesap için satın alım bulunduğunda.",
  },
  "100 After Restore purchases, when nothing was found for this account.": {
    en: "After Restore purchases, when nothing was found for this account.",
    ar: "بعد استعادة المشتريات، عندما لا يُعثر على شيء لهذا الحساب.",
    tr: "Satın alımları geri yükledikten sonra, bu hesap için bir şey bulunamadığında.",
  },
  "100 A purchase in the store that waits for the payment (for example cash at a shop): nothing is given yet.": {
    en: "A purchase in the store that waits for the payment (for example cash at a shop): nothing is given yet.",
    ar: "عملية شراء في المتجر بانتظار الدفع (مثل الدفع نقدًا في متجر): لا يُمنح شيء بعد.",
    tr: "Mağazada ödemeyi bekleyen bir satın alım (örneğin bir dükkânda nakit): henüz bir şey verilmez.",
  },
  "100 After a membership's subscription was bought in the app and confirmed.": {
    en: "After a membership's subscription was bought in the app and confirmed.",
    ar: "بعد شراء اشتراك العضوية في التطبيق وتأكيده.",
    tr: "Bir üyelik aboneliği uygulamada satın alınıp onaylandıktan sonra.",
  },
  "100 A purchase made in the store that couldn't be confirmed yet (no connection, the store not answering); the app sends it again later.": {
    en: "A purchase made in the store that couldn't be confirmed yet (no connection, the store not answering); the app sends it again later.",
    ar: "عملية شراء تمت في المتجر ولم يمكن تأكيدها بعد (لا يوجد اتصال، أو المتجر لا يستجيب)؛ يرسلها التطبيق مرة أخرى لاحقًا.",
    tr: "Mağazada yapılan ama henüz onaylanamayan bir satın alım (bağlantı yok, mağaza yanıt vermiyor); uygulama daha sonra yeniden gönderir.",
  },
  "100 A purchase from the store that isn't a valid purchase of this app's product.": {
    en: "A purchase from the store that isn't a valid purchase of your app's product.",
    ar: "عملية شراء من المتجر ليست شراءً صالحًا لمنتج تطبيقك.",
    tr: "Mağazadan gelen ve uygulamanızın ürününün geçerli bir satın alımı olmayan satın alım.",
  },
  "100 A purchase from the store that already gives access to another account of the app.": {
    en: "A purchase from the store that already gives access to another account of your app.",
    ar: "عملية شراء من المتجر تمنح الوصول بالفعل لحساب آخر في تطبيقك.",
    tr: "Mağazadan gelen ve uygulamanızdaki başka bir hesaba zaten erişim veren satın alım.",
  },
  "100 A purchase from the store that no longer gives access (an ended subscription, a refund).": {
    en: "A purchase from the store that no longer gives access (an ended subscription, a refund).",
    ar: "عملية شراء من المتجر لم تعد تمنح الوصول (اشتراك منتهٍ، أو استرداد).",
    tr: "Artık erişim vermeyen bir mağaza satın alımı (sona ermiş abonelik, iade).",
  },
  "100 The store couldn't make the purchase.": {
    en: "The store couldn't make the purchase.",
    ar: "تعذّر على المتجر إتمام عملية الشراء.",
    tr: "Mağaza satın alımı gerçekleştiremedi.",
  },
  "100 Buying in the app when the phone's store can't take payments (no Google Play, purchases turned off).": {
    en: "Buying in the app when the phone's store can't take payments (no Google Play, purchases turned off).",
    ar: "الشراء في التطبيق عندما لا يستطيع متجر الهاتف قبول الدفع (لا يوجد Google Play، أو المشتريات معطّلة).",
    tr: "Telefonun mağazası ödeme alamadığında uygulamada satın alma (Google Play yok, satın almalar kapalı).",
  },
  "99.4 Form block: shown in place of the form once its answers are sent, when the owner wrote no text for it.": {
    en: "Shown in place of a form once its answers are sent, when you wrote no text for it.",
    ar: "يظهر مكان النموذج بعد إرسال الإجابات، إذا لم تكتب نصًا لذلك.",
    tr: "Yanıtlar gönderildikten sonra, bunun için bir metin yazmadıysanız formun yerinde görünür.",
  },
  "99.4 Form block whose answers go to the chat: its button while the person is signed out; opens sign-in.": {
    en: "The button of a form whose answers go to the chat, while the person isn't signed in; it opens sign-in.",
    ar: "زر النموذج الذي تُرسل إجاباته إلى المحادثة، عندما لا يكون الشخص مسجّلًا الدخول؛ يفتح تسجيل الدخول.",
    tr: "Yanıtları sohbete giden bir formun düğmesi, kişi giriş yapmamışken; girişi açar.",
  },
  "99.4 Form block: under a required field left empty.": {
    en: "Under a required question of a form left empty.",
    ar: "تحت سؤال مطلوب في نموذج تُرك فارغًا.",
    tr: "Bir formda boş bırakılan zorunlu sorunun altında.",
  },
  "99.4 Form block: under an email field whose answer isn't an email address.": {
    en: "Under a form's email question when the answer isn't an email address.",
    ar: "تحت سؤال البريد الإلكتروني في نموذج عندما لا تكون الإجابة بريدًا إلكترونيًا.",
    tr: "Bir formun e-posta sorusunun altında, yanıt bir e-posta adresi değilse.",
  },
  "99.4 Form block: under a phone field whose answer isn't a phone number.": {
    en: "Under a form's phone question when the answer isn't a phone number.",
    ar: "تحت سؤال الهاتف في نموذج عندما لا تكون الإجابة رقم هاتف.",
    tr: "Bir formun telefon sorusunun altında, yanıt bir telefon numarası değilse.",
  },
  "99.4 Form block: under a number field whose answer isn't a number.": {
    en: "Under a form's number question when the answer isn't a number.",
    ar: "تحت سؤال الرقم في نموذج عندما لا تكون الإجابة رقمًا.",
    tr: "Bir formun sayı sorusunun altında, yanıt bir sayı değilse.",
  },
  "99.4 Form block: under a choice field, when none of its choices is picked.": {
    en: "Under a form's choice question when none of its choices is picked.",
    ar: "تحت سؤال الاختيار في نموذج عندما لا يُختار أي خيار.",
    tr: "Bir formun seçim sorusunun altında, hiçbir seçenek seçilmediğinde.",
  },
  "91.4 The account entry and title of the customer's loyalty points.": {
    en: "The account entry and the page with the customer's loyalty points.",
    ar: "عنصر الحساب والصفحة التي تعرض نقاط ولاء العميل.",
    tr: "Müşterinin sadakat puanlarının hesap öğesi ve sayfası.",
  },
  "91.4 The customer's loyalty points balance.": {
    en: "The customer's loyalty points balance.",
    ar: "رصيد نقاط ولاء العميل.",
    tr: "Müşterinin sadakat puanı bakiyesi.",
  },
  "91.4 What the balance takes off later orders.": {
    en: "What the customer's points take off their next orders.",
    ar: "ما تخصمه نقاط العميل من طلباته القادمة.",
    tr: "Müşterinin puanlarının sonraki siparişlerinden düştüğü tutar.",
  },
  "91.4 How points are earned and what one is worth.": {
    en: "How customers earn points, and what one point is worth.",
    ar: "كيف يكسب العملاء النقاط، وكم تساوي النقطة الواحدة.",
    tr: "Müşterilerin nasıl puan kazandığı ve bir puanın değeri.",
  },
  "91.4 Under the points in the cart and on My points: the fewest used at once.": {
    en: "Under the points in the cart and on My points: the fewest points used at once.",
    ar: "تحت النقاط في السلة وفي صفحة نقاطي: أقل عدد من النقاط يُستخدم مرة واحدة.",
    tr: "Sepetteki puanların ve Puanlarım sayfasının altında: tek seferde kullanılan en az puan.",
  },
  "91.4 The cart's switch that uses the customer's points on this order.": {
    en: "The switch in the cart that uses the customer's points on this order.",
    ar: "المفتاح في السلة الذي يستخدم نقاط العميل في هذا الطلب.",
    tr: "Sepette müşterinin puanlarını bu siparişte kullanan anahtar.",
  },
  "91.4 Under the cart's points switch: what the points take off.": {
    en: "Under the points switch in the cart: what the points take off.",
    ar: "تحت مفتاح النقاط في السلة: ما تخصمه النقاط.",
    tr: "Sepetteki puan anahtarının altında: puanların düştüğü tutar.",
  },
  "91.4 The cart's line for what the loyalty points take off.": {
    en: "The line in the cart's totals for what the points take off.",
    ar: "السطر في إجمالي السلة لما تخصمه النقاط.",
    tr: "Sepet toplamlarında puanların düştüğü tutarın satırı.",
  },
  "91.4 The heading over the changes to the customer's points.": {
    en: "The heading over the changes to the customer's points on My points.",
    ar: "العنوان فوق تغييرات نقاط العميل في صفحة نقاطي.",
    tr: "Puanlarım sayfasında müşterinin puan değişikliklerinin başlığı.",
  },
  "91.4 A change to the points: earned on a completed order.": {
    en: "In the points history: points earned on a completed order.",
    ar: "في سجل النقاط: نقاط مكتسبة على طلب مكتمل.",
    tr: "Puan geçmişinde: tamamlanan bir siparişte kazanılan puanlar.",
  },
  "91.4 A change to the points: used on an order.": {
    en: "In the points history: points used on an order.",
    ar: "في سجل النقاط: نقاط استُخدمت في طلب.",
    tr: "Puan geçmişinde: bir siparişte kullanılan puanlar.",
  },
  "91.4 A change to the points: given back when a paid order was cancelled or refunded.": {
    en: "In the points history: points given back when a paid order was cancelled or refunded.",
    ar: "في سجل النقاط: نقاط أُعيدت عند إلغاء طلب مدفوع أو استرداد قيمته.",
    tr: "Puan geçmişinde: ödenmiş bir sipariş iptal ya da iade edildiğinde geri verilen puanlar.",
  },
  "91.4 A change to the points: taken back when an order was refunded or returned.": {
    en: "In the points history: points taken back when an order was refunded or returned.",
    ar: "في سجل النقاط: نقاط سُحبت عند استرداد قيمة طلب أو إرجاعه.",
    tr: "Puan geçmişinde: bir sipariş iade edildiğinde geri alınan puanlar.",
  },
  "91.4 My points without any changes yet.": {
    en: "On My points before the customer has any.",
    ar: "في صفحة نقاطي قبل أن يكون لدى العميل أي نقاط.",
    tr: "Puanlarım sayfasında müşterinin henüz puanı yokken.",
  },
  "91.5 Under the cart's total when the shop's prices include tax: how much of it is tax.": {
    en: "Under the cart's total when your prices include tax: how much of it is tax.",
    ar: "تحت إجمالي السلة عندما تشمل أسعارك الضريبة: كم منه ضريبة.",
    tr: "Fiyatlarınız vergi dahilken sepet toplamının altında: ne kadarının vergi olduğu.",
  },
  "91.4 On an order: the loyalty points used on it and what they took off.": {
    en: "On an order: the points used on it and what they took off.",
    ar: "على الطلب: النقاط المستخدمة فيه وما خصمته.",
    tr: "Siparişte: kullanılan puanlar ve düştükleri tutar.",
  },
  "91.4 On a completed order: the loyalty points it earned.": {
    en: "On a completed order: the points it earned.",
    ar: "على طلب مكتمل: النقاط التي كسبها.",
    tr: "Tamamlanan bir siparişte: kazandırdığı puanlar.",
  },
  "91.3 On a completed order: asks the shop to take it back.": {
    en: "The button on a completed order that asks your shop to take it back.",
    ar: "الزر في طلب مكتمل الذي يطلب من متجرك استرجاعه.",
    tr: "Tamamlanmış bir siparişte mağazanızdan geri almasını isteyen düğme.",
  },
  "91.3 The title of the sheet where the customer picks the return's reason.": {
    en: "The title above the reasons the customer picks from when returning an order.",
    ar: "العنوان فوق الأسباب التي يختار منها العميل عند إرجاع طلب.",
    tr: "Müşterinin bir siparişi iade ederken seçtiği nedenlerin üstündeki başlık.",
  },
  "91.3 A return reason.": {
    en: "A reason the customer can give for a return.",
    ar: "سبب يمكن أن يذكره العميل للإرجاع.",
    tr: "Müşterinin iade için belirtebileceği bir neden.",
  },
  "91.3 A return reason: not what was ordered.": {
    en: "A reason for a return: the customer got something other than what they ordered.",
    ar: "سبب للإرجاع: وصل العميلَ منتج غير الذي طلبه.",
    tr: "Bir iade nedeni: müşteriye sipariş ettiğinden farklı bir ürün geldi.",
  },
  "91.3 A return reason; then a note is needed.": {
    en: "A reason for a return; with it the customer must write a note.",
    ar: "سبب للإرجاع؛ معه يجب أن يكتب العميل ملاحظة.",
    tr: "Bir iade nedeni; bununla müşterinin bir not yazması gerekir.",
  },
  "91.3 The note field of a return request.": {
    en: "The field where the customer adds a note to a return request.",
    ar: "الخانة التي يضيف فيها العميل ملاحظة إلى طلب الإرجاع.",
    tr: "Müşterinin iade talebine not eklediği alan.",
  },
  "91.3 The note field when the reason is 'Another reason', where it is needed.": {
    en: "The note field when the customer chose \"Another reason\", where the note is needed.",
    ar: "خانة الملاحظة عندما يختار العميل \"سبب آخر\"، وتكون الملاحظة مطلوبة.",
    tr: "Müşteri \"Başka bir neden\" seçtiğinde notun gerekli olduğu not alanı.",
  },
  "91.3 Sends the return request to the shop.": {
    en: "The button that sends the return request to your shop.",
    ar: "الزر الذي يرسل طلب الإرجاع إلى متجرك.",
    tr: "İade talebini mağazanıza gönderen düğme.",
  },
  "91.3 Shown after the return request is sent.": {
    en: "Shown after the customer sends a return request.",
    ar: "يظهر بعد أن يرسل العميل طلب إرجاع.",
    tr: "Müşteri bir iade talebi gönderdikten sonra gösterilir.",
  },
  "91.3 A return the shop hasn't answered yet.": {
    en: "On an order whose return you haven't answered yet.",
    ar: "على طلب لم تردّ على إرجاعه بعد.",
    tr: "İadesini henüz yanıtlamadığınız bir siparişte.",
  },
  "91.3 The shop approved the return.": {
    en: "On an order whose return you approved.",
    ar: "على طلب وافقت على إرجاعه.",
    tr: "İadesini onayladığınız bir siparişte.",
  },
  "91.3 The shop declined the return.": {
    en: "On an order whose return you declined.",
    ar: "على طلب رفضت إرجاعه.",
    tr: "İadesini reddettiğiniz bir siparişte.",
  },
  "91.3 What the shop wrote with its answer.": {
    en: "Your reply to a return, as the customer sees it.",
    ar: "ردك على طلب إرجاع كما يراه العميل.",
    tr: "Bir iadeye yanıtınız, müşterinin gördüğü şekliyle.",
  },
  "91.2 The settings switch for pushes about the customer's orders: shipped, completed, cancelled or refunded.": {
    en: "The switch in the app's settings for notifications about the customer's orders: shipped, completed, cancelled or refunded.",
    ar: "مفتاح في إعدادات التطبيق لإشعارات طلبات العميل: شُحن أو اكتمل أو أُلغي أو استُرد.",
    tr: "Uygulama ayarlarında müşterinin siparişleriyle ilgili bildirimler için anahtar: kargolandı, tamamlandı, iptal edildi veya iade edildi.",
  },
  "91.1 The cart's button that shows the coupon field.": {
    en: "The cart's button that shows the field for a coupon code.",
    ar: "زر السلة الذي يُظهر خانة رمز الكوبون.",
    tr: "Sepette kupon kodu alanını gösteren düğme.",
  },
  "91.1 Under the coupon in the cart when it takes money off.": {
    en: "Under the coupon in the cart when it takes money off the order.",
    ar: "تحت الكوبون في السلة عندما يخصم من الطلب.",
    tr: "Sepetteki kuponun altında, siparişten indirim yaptığında.",
  },
  "91.1 The shop checks coupons only on its own checkout.": {
    en: "Under the coupon in the cart when your shop checks coupons only on its own checkout page.",
    ar: "تحت الكوبون في السلة عندما يتحقق متجرك من الكوبونات في صفحة الدفع فقط.",
    tr: "Mağazanız kuponları yalnızca kendi ödeme sayfasında kontrol ettiğinde sepetteki kuponun altında.",
  },
  "91.1 Shown when the shop gives no reason.": {
    en: "Under a coupon that doesn't apply, when the shop gives no reason.",
    ar: "تحت كوبون لا ينطبق، عندما لا يذكر المتجر السبب.",
    tr: "Geçerli olmayan bir kuponun altında, mağaza bir neden belirtmediğinde.",
  },
  "91.1 Under the cart's total when the checkout still adds to it.": {
    en: "Under the cart's total when shipping or taxes are still added at checkout.",
    ar: "تحت إجمالي السلة عندما يُضاف الشحن أو الضرائب عند الدفع.",
    tr: "Kargo veya vergiler ödeme adımında eklenecekse sepet toplamının altında.",
  },
  "90.3 The account item and screen listing the student's memberships, subscriptions and groups on the website.": {
    en: "The account item and screen that list the student's memberships, subscriptions and groups on your website.",
    ar: "عنصر الحساب والشاشة اللذان يعرضان عضويات الطالب واشتراكاته ومجموعاته على موقعك.",
    tr: "Öğrencinin web sitenizdeki üyeliklerini, aboneliklerini ve gruplarını listeleyen hesap öğesi ve ekran.",
  },
  "90.1 A course lesson that opens later (drip), with its day.": {
    en: "Next to a course lesson that opens some days after the student enrolls: the day it opens.",
    ar: "بجانب درس يُفتح بعد أيام من تسجيل الطالب: يوم فتحه.",
    tr: "Öğrenci kaydolduktan birkaç gün sonra açılan bir dersin yanında: açılacağı gün.",
  },
  "90.1 The day a student's access to a course ends.": {
    en: "Under a course in My courses: the day the student's access to it ends.",
    ar: "تحت الدورة في «دوراتي»: يوم انتهاء وصول الطالب إليها.",
    tr: "Kurslarım'daki bir kursun altında: öğrencinin kursa erişiminin sona erdiği gün.",
  },
  "73 The button of a finished course whose progress can be cleared to take it again.": {
    en: "The button of a finished course that the student can take again: it clears their progress in it.",
    ar: "زر الدورة المكتملة التي يمكن للطالب أخذها من جديد: يمسح تقدّمه فيها.",
    tr: "Öğrencinin yeniden alabileceği bitmiş bir kursun düğmesi: kurstaki ilerlemesini siler.",
  },
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
  // 63 A gym member's code at the door, and the business's answers to reviews.
  "Under a gym member's QR code on the membership screen.": {
    ar: "تحت رمز QR الخاص بعضو النادي في شاشة العضوية.",
    tr: "Üyelik ekranında spor salonu üyesinin QR kodunun altında.",
  },
  "Read aloud for a gym member's QR code.": {
    ar: "يُقرأ بصوت عالٍ لرمز QR الخاص بعضو النادي.",
    tr: "Spor salonu üyesinin QR kodu için sesli okunur.",
  },
  "Above the business's reply under a course review.": {
    en: "Above your reply under a course review.",
    ar: "فوق ردك تحت تقييم دورة.",
    tr: "Bir kurs değerlendirmesinin altındaki yanıtınızın üstünde.",
  },
  // 64 Hidden questions and answers, and frozen memberships.
  "Under the student's own question or answer in a course when the business hid it.": {
    en: "Under a student's own question or answer in a course when you hid it.",
    ar: "تحت سؤال الطالب أو إجابته في دورة عندما تخفيها.",
    tr: "Bir kursta, gizlediğinizde öğrencinin kendi sorusunun ya da yanıtının altında.",
  },
  "Status of a membership the business froze.": {
    en: "Status of a membership you froze.",
    ar: "حالة عضوية جمّدتها.",
    tr: "Dondurduğunuz bir üyeliğin durumu.",
  },
  "On a frozen membership: the day it's back.": {
    ar: "على عضوية مجمّدة: يوم عودتها.",
    tr: "Dondurulmuş bir üyelikte: geri geleceği gün.",
  },
  "On a frozen membership without a day it's back.": {
    ar: "على عضوية مجمّدة دون يوم عودة.",
    tr: "Geri geleceği günü olmayan dondurulmuş bir üyelikte.",
  },
  "On a membership the business will freeze from a later day.": {
    en: "On a membership you'll freeze from a later day.",
    ar: "على عضوية ستجمّدها من يوم لاحق.",
    tr: "Daha sonraki bir günden itibaren donduracağınız bir üyelikte.",
  },
  "Under a gym member's QR code while the membership is frozen.": {
    ar: "تحت رمز QR الخاص بعضو النادي أثناء تجميد العضوية.",
    tr: "Üyelik dondurulmuşken spor salonu üyesinin QR kodunun altında.",
  },
  "Under the student's own review when the business hid it.": {
    en: "Under a student's own review when you hid it.",
    ar: "تحت تقييم الطالب نفسه عندما تخفيه.",
    tr: "Gizlediğinizde öğrencinin kendi değerlendirmesinin altında.",
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
  "96.2 On an order to pay by bank transfer or the shop's own method, above the shop's details.": {
    en: "On an order to pay by bank transfer or your own method, above your payment details.",
    ar: "على طلب سيُدفع بتحويل بنكي أو بطريقتك الخاصة، فوق بيانات الدفع الخاصة بك.",
    tr: "Banka havalesiyle veya kendi yönteminizle ödenecek bir siparişte, ödeme bilgilerinizin üstünde.",
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
  "71 Button on an order and a donation: downloads the receipt as a PDF (opens in the browser).": {
    en: "Button on an order and a donation: downloads the receipt as a PDF (opens in the browser).",
    ar: "زر على الطلب والتبرع: ينزّل الإيصال بصيغة PDF (يفتح في المتصفح).",
    tr: "Sipariş ve bağış üzerindeki düğme: makbuzu PDF olarak indirir (tarayıcıda açılır).",
  },
  "80.4 An order's shipment card, when the shop gave no carrier name.": {
    en: "An order's shipment card, when the shop gave no carrier name.",
    ar: "بطاقة شحنة الطلب، حين لا يذكر المتجر اسم شركة الشحن.",
    tr: "Mağaza kargo firmasının adını vermediğinde siparişin gönderi kartı.",
  },
  "80.4 When the shop shipped the order.": {
    en: "When the shop shipped the order.",
    ar: "متى شحن المتجر الطلب.",
    tr: "Mağazanın siparişi kargoya verdiği zaman.",
  },
  "80.4 Opens the carrier's tracking page in the browser.": {
    en: "Opens the carrier's tracking page in the browser.",
    ar: "يفتح صفحة التتبّع لدى شركة الشحن في المتصفح.",
    tr: "Kargo firmasının takip sayfasını tarayıcıda açar.",
  },
  "104 Delivery apps: the tab for sending a parcel.": {
    en: "Delivery apps: the tab for sending a parcel.",
    ar: "تطبيقات التوصيل: تبويب إرسال طرد.",
    tr: "Teslimat uygulamaları: paket gönderme sekmesi.",
  },
  "104 Delivery apps: the customer's shipments tab.": {
    en: "Delivery apps: the customer's shipments tab.",
    ar: "تطبيقات التوصيل: تبويب شحنات العميل.",
    tr: "Teslimat uygulamaları: müşterinin gönderileri sekmesi.",
  },
  "104 Delivery apps: the courier's tab, shown to the company's couriers only.": {
    en: "Delivery apps: the courier's tab, shown to the company's couriers only.",
    ar: "تطبيقات التوصيل: تبويب المندوب، ويظهر لمناديب الشركة فقط.",
    tr: "Teslimat uygulamaları: yalnızca şirketin kuryelerine görünen kurye sekmesi.",
  },
  "104 The send screen's title.": {
    en: "The send screen's title.",
    ar: "عنوان شاشة الإرسال.",
    tr: "Gönderme ekranının başlığı.",
  },
  "104 Choosing a delivery service.": {
    en: "Choosing a delivery service.",
    ar: "اختيار خدمة التوصيل.",
    tr: "Teslimat hizmetini seçme.",
  },
  "104 Where the courier picks up the parcel.": {
    en: "Where the courier picks up the parcel.",
    ar: "المكان الذي يستلم منه المندوب الطرد.",
    tr: "Kuryenin paketi aldığı yer.",
  },
  "104 Where the parcel goes.": {
    en: "Where the parcel goes.",
    ar: "المكان الذي يذهب إليه الطرد.",
    tr: "Paketin gideceği yer.",
  },
  "104 A place's address field.": {
    en: "A place's address field.",
    ar: "حقل عنوان المكان.",
    tr: "Yerin adres alanı.",
  },
  "104 A place's details field.": {
    en: "A place's details field.",
    ar: "حقل تفاصيل المكان.",
    tr: "Yerin ayrıntı alanı.",
  },
  "104 Sets a place to the phone's position.": {
    en: "Sets a place to the phone's position.",
    ar: "يحدد المكان بموقع الهاتف.",
    tr: "Yeri telefonun konumuna ayarlar.",
  },
  "104 Sets a place from a Google Maps or Apple Maps link.": {
    en: "Sets a place from a Google Maps or Apple Maps link.",
    ar: "يحدد المكان من رابط Google Maps أو Apple Maps.",
    tr: "Yeri bir Google Haritalar veya Apple Haritalar bağlantısından ayarlar.",
  },
  "104 Sets a place by moving a map.": {
    en: "Sets a place by moving a map.",
    ar: "يحدد المكان بتحريك الخريطة.",
    tr: "Yeri haritayı kaydırarak ayarlar.",
  },
  "104 The place has coordinates.": {
    en: "The place has coordinates.",
    ar: "المكان محدد على الخريطة.",
    tr: "Yerin koordinatları var.",
  },
  "104 The place has no coordinates, and the price doesn't need them.": {
    en: "The place has no coordinates, and the price doesn't need them.",
    ar: "المكان غير محدد على الخريطة، والسعر لا يحتاج ذلك.",
    tr: "Yerin koordinatı yok ve fiyat için gerekmiyor.",
  },
  "104 The place needs coordinates for pricing by distance.": {
    en: "The place needs coordinates for pricing by distance.",
    ar: "يلزم تحديد المكان على الخريطة لأن السعر حسب المسافة.",
    tr: "Mesafeye göre fiyat için yerin koordinatları gerekli.",
  },
  "104 Removes a place's coordinates.": {
    en: "Removes a place's coordinates.",
    ar: "يزيل تحديد المكان على الخريطة.",
    tr: "Yerin koordinatlarını kaldırır.",
  },
  "104 The paste-a-link dialog's title.": {
    en: "The paste-a-link dialog's title.",
    ar: "عنوان نافذة لصق الرابط.",
    tr: "Bağlantı yapıştırma penceresinin başlığı.",
  },
  "104 The paste-a-link field's hint.": {
    en: "The paste-a-link field's hint.",
    ar: "تلميح حقل لصق الرابط.",
    tr: "Bağlantı yapıştırma alanının ipucu.",
  },
  "104 Confirms a pasted link.": {
    en: "Confirms a pasted link.",
    ar: "يؤكد الرابط الملصوق.",
    tr: "Yapıştırılan bağlantıyı onaylar.",
  },
  "104 A pasted link had no coordinates.": {
    en: "A pasted link had no coordinates.",
    ar: "الرابط الملصوق لا يحتوي على مكان.",
    tr: "Yapıştırılan bağlantıda konum yoktu.",
  },
  "104 Location services are off.": {
    en: "Location services are off.",
    ar: "خدمة الموقع متوقفة.",
    tr: "Konum hizmetleri kapalı.",
  },
  "104 The location permission was refused.": {
    en: "The location permission was refused.",
    ar: "رُفض إذن الموقع.",
    tr: "Konum izni reddedildi.",
  },
  "104 The position couldn't be read.": {
    en: "The position couldn't be read.",
    ar: "تعذّر تحديد الموقع.",
    tr: "Konum okunamadı.",
  },
  "104 The map picker's title.": {
    en: "The map picker's title.",
    ar: "عنوان شاشة اختيار المكان على الخريطة.",
    tr: "Haritadan yer seçme ekranının başlığı.",
  },
  "104 Confirms the place under the pin.": {
    en: "Confirms the place under the pin.",
    ar: "يؤكد المكان الموجود تحت الدبوس.",
    tr: "İğnenin altındaki yeri onaylar.",
  },
  "104 The drop-off area (pricing by area).": {
    en: "The drop-off area (pricing by area).",
    ar: "منطقة التسليم (التسعير حسب المنطقة).",
    tr: "Teslim bölgesi (bölgeye göre fiyat).",
  },
  "104 Who receives the parcel.": {
    en: "Who receives the parcel.",
    ar: "من يستلم الطرد.",
    tr: "Paketi kimin teslim alacağı.",
  },
  "104 The recipient's name field.": {
    en: "The recipient's name field.",
    ar: "حقل اسم المستلم.",
    tr: "Alıcının ad alanı.",
  },
  "104 The recipient's number field.": {
    en: "The recipient's number field.",
    ar: "حقل رقم المستلم.",
    tr: "Alıcının numara alanı.",
  },
  "104 The parcel's size and contents.": {
    en: "The parcel's size and contents.",
    ar: "حجم الطرد ومحتواه.",
    tr: "Paketin boyutu ve içeriği.",
  },
  "104 A parcel's size.": {
    en: "A parcel's size.",
    ar: "حجم الطرد.",
    tr: "Paketin boyutu.",
  },
  "104 The parcel's contents field.": {
    en: "The parcel's contents field.",
    ar: "حقل محتوى الطرد.",
    tr: "Paketin içerik alanı.",
  },
  "104 Notes for the courier.": {
    en: "Notes for the courier.",
    ar: "ملاحظات للمندوب.",
    tr: "Kurye için notlar.",
  },
  "104 How the customer pays.": {
    en: "How the customer pays.",
    ar: "طريقة دفع العميل.",
    tr: "Müşterinin nasıl ödeyeceği.",
  },
  "104 Paying in cash at the drop-off.": {
    en: "Paying in cash at the drop-off.",
    ar: "الدفع نقدًا عند التسليم.",
    tr: "Teslimatta nakit ödeme.",
  },
  "104 Paying by card on the company's payment page.": {
    en: "Paying by card on the company's payment page.",
    ar: "الدفع بالبطاقة في صفحة الدفع الخاصة بالشركة.",
    tr: "Şirketin ödeme sayfasında kartla ödeme.",
  },
  "104 The price before sending.": {
    en: "The price before sending.",
    ar: "السعر قبل الإرسال.",
    tr: "Göndermeden önceki fiyat.",
  },
  "104 The price is being worked out.": {
    en: "The price is being worked out.",
    ar: "جارٍ حساب السعر.",
    tr: "Fiyat hesaplanıyor.",
  },
  "104 No price yet.": {
    en: "No price yet.",
    ar: "لا يوجد سعر بعد.",
    tr: "Henüz fiyat yok.",
  },
  "104 A distance in kilometres.": {
    en: "A distance in kilometres.",
    ar: "مسافة بالكيلومتر.",
    tr: "Kilometre cinsinden mesafe.",
  },
  "104 Sends the parcel.": {
    en: "Sends the parcel.",
    ar: "يرسل الطرد.",
    tr: "Paketi gönderir.",
  },
  "104 Sending needs an account.": {
    en: "Sending needs an account.",
    ar: "الإرسال يحتاج إلى حساب.",
    tr: "Göndermek için hesap gerekir.",
  },
  "104 An address is missing.": {
    en: "An address is missing.",
    ar: "أحد العناوين ناقص.",
    tr: "Bir adres eksik.",
  },
  "104 The recipient is missing.": {
    en: "The recipient is missing.",
    ar: "بيانات المستلم ناقصة.",
    tr: "Alıcı bilgisi eksik.",
  },
  "104 A cash shipment was sent.": {
    en: "A cash shipment was sent.",
    ar: "تم إرسال شحنة تُدفع نقدًا.",
    tr: "Nakit ödenecek bir gönderi gönderildi.",
  },
  "104 A card shipment was paid.": {
    en: "A card shipment was paid.",
    ar: "تم دفع شحنة بالبطاقة.",
    tr: "Kartla ödenen bir gönderinin ödemesi yapıldı.",
  },
  "104 The shipments list is loading.": {
    en: "The shipments list is loading.",
    ar: "جارٍ تحميل قائمة الشحنات.",
    tr: "Gönderi listesi yükleniyor.",
  },
  "104 The customer has sent nothing.": {
    en: "The customer has sent nothing.",
    ar: "العميل لم يرسل شيئًا بعد.",
    tr: "Müşteri henüz bir şey göndermedi.",
  },
  "104 The empty shipments list.": {
    en: "The empty shipments list.",
    ar: "قائمة الشحنات الفارغة.",
    tr: "Boş gönderi listesi.",
  },
  "104 Signed out on My shipments.": {
    en: "Signed out on My shipments.",
    ar: "شاشة شحناتي قبل تسجيل الدخول.",
    tr: "Giriş yapılmadan Gönderilerim ekranı.",
  },
  "104 A shipment's page title, like \"Shipment S-1042\".": {
    en: "A shipment's page title, like \"Shipment S-1042\".",
    ar: "عنوان صفحة الشحنة، مثل \"الشحنة S-1042\".",
    tr: "Gönderi sayfasının başlığı, örneğin \"S-1042 gönderisi\".",
  },
  "104 A shipment's stage.": {
    en: "A shipment's stage.",
    ar: "مرحلة من مراحل الشحنة.",
    tr: "Gönderinin bir aşaması.",
  },
  "104 The shipment's courier.": {
    en: "The shipment's courier.",
    ar: "مندوب الشحنة.",
    tr: "Gönderinin kuryesi.",
  },
  "104 Calls the courier.": {
    en: "Calls the courier.",
    ar: "يتصل بالمندوب.",
    tr: "Kuryeyi arar.",
  },
  "104 No courier yet.": {
    en: "No courier yet.",
    ar: "لا يوجد مندوب بعد.",
    tr: "Henüz kurye yok.",
  },
  "104 When the courier's position was sent.": {
    en: "When the courier's position was sent.",
    ar: "وقت إرسال موقع المندوب.",
    tr: "Kuryenin konumunun gönderildiği zaman.",
  },
  "104 Opens the courier's position in the phone's maps.": {
    en: "Opens the courier's position in the phone's maps.",
    ar: "يفتح موقع المندوب في خرائط الهاتف.",
    tr: "Kuryenin konumunu telefonun haritasında açar.",
  },
  "104 Live tracking without a position yet.": {
    en: "Live tracking without a position yet.",
    ar: "التتبع المباشر قبل وصول موقع المندوب.",
    tr: "Henüz konum gelmeden canlı takip.",
  },
  "104 The shipment is paid.": {
    en: "The shipment is paid.",
    ar: "الشحنة مدفوعة.",
    tr: "Gönderi ödendi.",
  },
  "104 The shipment isn't paid yet.": {
    en: "The shipment isn't paid yet.",
    ar: "الشحنة لم تُدفع بعد.",
    tr: "Gönderi henüz ödenmedi.",
  },
  "104 Pays a card shipment.": {
    en: "Pays a card shipment.",
    ar: "يدفع شحنة بالبطاقة.",
    tr: "Kartla ödenecek gönderiyi öder.",
  },
  "104 Cancels a shipment that waits.": {
    en: "Cancels a shipment that waits.",
    ar: "يلغي شحنة لم يبدأ توصيلها.",
    tr: "Bekleyen bir gönderiyi iptal eder.",
  },
  "104 Asks before cancelling.": {
    en: "Asks before cancelling.",
    ar: "سؤال قبل الإلغاء.",
    tr: "İptalden önce sorar.",
  },
  "104 Confirms cancelling.": {
    en: "Confirms cancelling.",
    ar: "يؤكد الإلغاء.",
    tr: "İptali onaylar.",
  },
  "104 Doesn't cancel.": {
    en: "Doesn't cancel.",
    ar: "لا يلغي.",
    tr: "İptal etmez.",
  },
  "104 The shipment was cancelled.": {
    en: "The shipment was cancelled.",
    ar: "أُلغيت الشحنة.",
    tr: "Gönderi iptal edildi.",
  },
  "104 The shipment's stages.": {
    en: "The shipment's stages.",
    ar: "مراحل الشحنة.",
    tr: "Gönderinin aşamaları.",
  },
  "104 Directions to a place in the phone's maps.": {
    en: "Directions to a place in the phone's maps.",
    ar: "الاتجاهات إلى المكان في خرائط الهاتف.",
    tr: "Telefonun haritasında yere yol tarifi.",
  },
  "104 The courier's screen title.": {
    en: "The courier's screen title.",
    ar: "عنوان شاشة المندوب.",
    tr: "Kurye ekranının başlığı.",
  },
  "104 The courier's on-duty switch.": {
    en: "The courier's on-duty switch.",
    ar: "مفتاح دخول المندوب الخدمة.",
    tr: "Kuryenin görev anahtarı.",
  },
  "104 The courier is off duty.": {
    en: "The courier is off duty.",
    ar: "المندوب خارج الخدمة.",
    tr: "Kurye görev dışında.",
  },
  "104 How many the courier delivered today.": {
    en: "How many the courier delivered today.",
    ar: "عدد ما سلّمه المندوب اليوم.",
    tr: "Kuryenin bugün kaç teslimat yaptığı.",
  },
  "104 The courier's jobs.": {
    en: "The courier's jobs.",
    ar: "مهام المندوب.",
    tr: "Kuryenin işleri.",
  },
  "104 Jobs waiting for a courier.": {
    en: "Jobs waiting for a courier.",
    ar: "مهام بانتظار مندوب.",
    tr: "Kurye bekleyen işler.",
  },
  "104 The courier's done jobs.": {
    en: "The courier's done jobs.",
    ar: "المهام التي أنهاها المندوب.",
    tr: "Kuryenin bitirdiği işler.",
  },
  "104 The courier's jobs are loading.": {
    en: "The courier's jobs are loading.",
    ar: "جارٍ تحميل مهام المندوب.",
    tr: "Kuryenin işleri yükleniyor.",
  },
  "104 An empty job list.": {
    en: "An empty job list.",
    ar: "قائمة مهام فارغة.",
    tr: "Boş iş listesi.",
  },
  "104 No jobs waiting for a courier.": {
    en: "No jobs waiting for a courier.",
    ar: "لا توجد مهام بانتظار مندوب.",
    tr: "Kurye bekleyen iş yok.",
  },
  "104 Off duty, waiting jobs aren't shown.": {
    en: "Off duty, waiting jobs aren't shown.",
    ar: "خارج الخدمة لا تظهر المهام المنتظرة.",
    tr: "Görev dışındayken bekleyen işler gösterilmez.",
  },
  "104 Someone who isn't a courier opened the courier's screen.": {
    en: "Someone who isn't a courier opened the courier's screen.",
    ar: "شخص ليس مندوبًا فتح شاشة المندوب.",
    tr: "Kurye olmayan biri kurye ekranını açtı.",
  },
  "104 A courier switches to the customer's screens.": {
    en: "A courier switches to the customer's screens.",
    ar: "المندوب ينتقل إلى شاشات العميل.",
    tr: "Kurye müşteri ekranlarına geçer.",
  },
  "104 The courier's position is being shared.": {
    en: "The courier's position is being shared.",
    ar: "موقع المندوب تتم مشاركته.",
    tr: "Kuryenin konumu paylaşılıyor.",
  },
  "104 A courier's job, like \"Job S-1042\".": {
    en: "A courier's job, like \"Job S-1042\".",
    ar: "مهمة المندوب، مثل \"المهمة S-1042\".",
    tr: "Kuryenin işi, örneğin \"S-1042 işi\".",
  },
  "104 Cash to collect, in a job's line.": {
    en: "Cash to collect, in a job's line.",
    ar: "المبلغ النقدي المطلوب تحصيله، في سطر المهمة.",
    tr: "İş satırında tahsil edilecek nakit.",
  },
  "104 Cash to collect.": {
    en: "Cash to collect.",
    ar: "المبلغ النقدي المطلوب تحصيله.",
    tr: "Tahsil edilecek nakit.",
  },
  "104 Nothing to collect.": {
    en: "Nothing to collect.",
    ar: "لا شيء للتحصيل.",
    tr: "Tahsil edilecek bir şey yok.",
  },
  "104 A waiting job hides the numbers.": {
    en: "A waiting job hides the numbers.",
    ar: "المهمة المنتظرة تُخفي الأرقام.",
    tr: "Bekleyen iş numaraları gizler.",
  },
  "104 Calls the sender.": {
    en: "Calls the sender.",
    ar: "يتصل بالمرسل.",
    tr: "Göndericiyi arar.",
  },
  "104 Calls the recipient.": {
    en: "Calls the recipient.",
    ar: "يتصل بالمستلم.",
    tr: "Alıcıyı arar.",
  },
  "104 A courier takes a waiting job.": {
    en: "A courier takes a waiting job.",
    ar: "المندوب يأخذ مهمة منتظرة.",
    tr: "Kurye bekleyen bir işi alır.",
  },
  "104 The courier took the job.": {
    en: "The courier took the job.",
    ar: "أخذ المندوب المهمة.",
    tr: "Kurye işi aldı.",
  },
  "104 A job moved on.": {
    en: "A job moved on.",
    ar: "انتقلت المهمة إلى مرحلة تالية.",
    tr: "İş bir sonraki aşamaya geçti.",
  },
  "104 A job was delivered.": {
    en: "A job was delivered.",
    ar: "تم تسليم المهمة.",
    tr: "İş teslim edildi.",
  },
  "104 The courier picked up the parcel.": {
    en: "The courier picked up the parcel.",
    ar: "المندوب استلم الطرد.",
    tr: "Kurye paketi aldı.",
  },
  "104 The courier is on the way to the drop-off.": {
    en: "The courier is on the way to the drop-off.",
    ar: "المندوب في الطريق إلى مكان التسليم.",
    tr: "Kurye teslim yerine gidiyor.",
  },
  "104 The courier delivered the parcel.": {
    en: "The courier delivered the parcel.",
    ar: "المندوب سلّم الطرد.",
    tr: "Kurye paketi teslim etti.",
  },
  "104 The courier couldn't deliver it.": {
    en: "The courier couldn't deliver it.",
    ar: "المندوب لم يتمكن من التسليم.",
    tr: "Kurye teslim edemedi.",
  },
  "104 The courier gives the job back.": {
    en: "The courier gives the job back.",
    ar: "المندوب يعيد المهمة.",
    tr: "Kurye işi geri verir.",
  },
  "104 Asks before giving a job back.": {
    en: "Asks before giving a job back.",
    ar: "سؤال قبل إعادة المهمة.",
    tr: "İşi geri vermeden önce sorar.",
  },
  "104 Asks why the parcel wasn't delivered.": {
    en: "Asks why the parcel wasn't delivered.",
    ar: "يسأل عن سبب تعذّر التسليم.",
    tr: "Paketin neden teslim edilemediğini sorar.",
  },
  "104 The reason field's hint.": {
    en: "The reason field's hint.",
    ar: "تلميح حقل السبب.",
    tr: "Neden alanının ipucu.",
  },
  "104 Sends the reason.": {
    en: "Sends the reason.",
    ar: "يرسل السبب.",
    tr: "Nedeni gönderir.",
  },
  "104 Account: a courier opens the courier's screens.": {
    en: "Account: a courier opens the courier's screens.",
    ar: "الحساب: المندوب يفتح شاشات المندوب.",
    tr: "Hesap: kurye, kurye ekranlarını açar.",
  },
  // 105.1 Food delivery
  "105.1 The tab with the company's restaurants.": {
    en: "The tab with the company's restaurants.",
    ar: "التبويب الذي يعرض مطاعم الشركة.",
    tr: "Şirketin restoranlarının bulunduğu sekme.",
  },
  "105.1 The tab with the customer's food orders.": {
    en: "The tab with the customer's food orders.",
    ar: "التبويب الذي يعرض طلبات الطعام الخاصة بالعميل.",
    tr: "Müşterinin yemek siparişlerinin bulunduğu sekme.",
  },
  "105.1 The tab of a restaurant's staff.": {
    en: "The tab of a restaurant's staff.",
    ar: "تبويب موظفي المطعم.",
    tr: "Restoran personelinin sekmesi.",
  },
  "105.1 Account: a restaurant's staff open the restaurant's screens.": {
    en: "Account: a restaurant's staff open the restaurant's screens.",
    ar: "الحساب: يفتح موظفو المطعم شاشات المطعم.",
    tr: "Hesap: restoran personeli restoranın ekranlarını açar.",
  },
  "105.1 The restaurants list's search box.": {
    en: "The restaurants list's search box.",
    ar: "خانة البحث في قائمة المطاعم.",
    tr: "Restoran listesinin arama kutusu.",
  },
  "105.1 The cuisine chip that shows every restaurant.": {
    en: "The cuisine chip that shows every restaurant.",
    ar: "زر التصنيف الذي يعرض كل المطاعم.",
    tr: "Tüm restoranları gösteren mutfak düğmesi.",
  },
  "105.1 Read while the restaurants load.": {
    en: "Read while the restaurants load.",
    ar: "يُقرأ أثناء تحميل المطاعم.",
    tr: "Restoranlar yüklenirken okunur.",
  },
  "105.1 The restaurants list is empty.": {
    en: "The restaurants list is empty.",
    ar: "قائمة المطاعم فارغة.",
    tr: "Restoran listesi boş.",
  },
  "105.1 A restaurant isn't taking orders now.": {
    en: "A restaurant isn't taking orders now.",
    ar: "المطعم لا يستقبل طلبات الآن.",
    tr: "Restoran şu an sipariş almıyor.",
  },
  "105.1 When a closed restaurant opens.": {
    en: "When a closed restaurant opens.",
    ar: "متى يفتح المطعم المغلق.",
    tr: "Kapalı bir restoranın ne zaman açılacağı.",
  },
  "105.1 A restaurant paused new orders for a while.": {
    en: "A restaurant paused new orders for a while.",
    ar: "أوقف المطعم الطلبات الجديدة لفترة.",
    tr: "Restoran yeni siparişleri bir süreliğine durdurdu.",
  },
  "105.1 The restaurant is too far.": {
    en: "The restaurant is too far.",
    ar: "المطعم بعيد جدًا.",
    tr: "Restoran çok uzakta.",
  },
  "105.1 A number of minutes.": {
    en: "A number of minutes.",
    ar: "عدد من الدقائق.",
    tr: "Dakika sayısı.",
  },
  "105.1 A restaurant's smallest order.": {
    en: "A restaurant's smallest order.",
    ar: "أقل طلب لدى المطعم.",
    tr: "Restoranın en düşük sipariş tutarı.",
  },
  "105.1 The delivery fee.": {
    en: "The delivery fee.",
    ar: "رسوم التوصيل.",
    tr: "Teslimat ücreti.",
  },
  "105.1 A dish or choice that is sold out.": {
    en: "A dish or choice that is sold out.",
    ar: "صنف أو خيار نفد.",
    tr: "Tükenen bir yemek veya seçenek.",
  },
  "105.1 A dish the restaurant marks as popular.": {
    en: "A dish the restaurant marks as popular.",
    ar: "صنف يعلّمه المطعم بأنه الأكثر طلبًا.",
    tr: "Restoranın popüler olarak işaretlediği yemek.",
  },
  "105.1 A dish's note.": {
    en: "A dish's note.",
    ar: "ملاحظة على الصنف.",
    tr: "Bir yemeğe eklenen not.",
  },
  "105.1 A dish was added.": {
    en: "A dish was added.",
    ar: "تمت إضافة صنف.",
    tr: "Bir yemek eklendi.",
  },
  "105.1 Asks before replacing another restaurant's dishes.": {
    en: "Asks before replacing another restaurant's dishes.",
    ar: "يسأل قبل استبدال أصناف من مطعم آخر.",
    tr: "Başka bir restoranın yemeklerini değiştirmeden önce sorar.",
  },
  "105.1 Replaces the cart.": {
    en: "Replaces the cart.",
    ar: "يستبدل محتوى السلة.",
    tr: "Sepeti değiştirir.",
  },
  "105.1 Opens the cart.": {
    en: "Opens the cart.",
    ar: "يفتح السلة.",
    tr: "Sepeti açar.",
  },
  "105.1 The checkout screen's title.": {
    en: "The checkout screen's title.",
    ar: "عنوان شاشة إتمام الطلب.",
    tr: "Ödeme ekranının başlığı.",
  },
  "105.1 The cart has nothing.": {
    en: "The cart has nothing.",
    ar: "السلة فارغة.",
    tr: "Sepet boş.",
  },
  "105.1 The drop-off section.": {
    en: "The drop-off section.",
    ar: "قسم عنوان التوصيل.",
    tr: "Teslimat adresi bölümü.",
  },
  "105.1 The dishes' total.": {
    en: "The dishes' total.",
    ar: "إجمالي الأصناف.",
    tr: "Yemeklerin toplamı.",
  },
  "105.1 The order's total.": {
    en: "The order's total.",
    ar: "إجمالي الطلب.",
    tr: "Siparişin toplamı.",
  },
  "105.1 The total before the address.": {
    en: "The total before the address.",
    ar: "الإجمالي قبل إدخال العنوان.",
    tr: "Adres girilmeden önceki toplam.",
  },
  "105.1 Asked of accounts without a number.": {
    en: "Asked of accounts without a number.",
    ar: "يُطلب من الحسابات التي ليس لها رقم هاتف.",
    tr: "Telefon numarası olmayan hesaplardan istenir.",
  },
  "105.1 Places the order.": {
    en: "Places the order.",
    ar: "يرسل الطلب.",
    tr: "Siparişi verir.",
  },
  "105.1 The order button for signed-out customers.": {
    en: "The order button for signed-out customers.",
    ar: "زر الطلب للعملاء غير المسجلين دخولهم.",
    tr: "Giriş yapmamış müşteriler için sipariş düğmesi.",
  },
  "105.1 The address is missing.": {
    en: "The address is missing.",
    ar: "العنوان غير مُدخل.",
    tr: "Adres eksik.",
  },
  "105.1 The phone is missing.": {
    en: "The phone is missing.",
    ar: "رقم الهاتف غير مُدخل.",
    tr: "Telefon numarası eksik.",
  },
  "105.1 A cash order was placed.": {
    en: "A cash order was placed.",
    ar: "تم إرسال طلب بالدفع نقدًا.",
    tr: "Nakit ödemeli bir sipariş verildi.",
  },
  "105.1 A card order was paid.": {
    en: "A card order was paid.",
    ar: "تم دفع طلب بالبطاقة.",
    tr: "Kartla ödenen bir sipariş ödendi.",
  },
  "105.1 How long until it arrives.": {
    en: "How long until it arrives.",
    ar: "المدة حتى وصول الطلب.",
    tr: "Siparişin ulaşmasına kalan süre.",
  },
  "105.1 A food order's stage.": {
    en: "A food order's stage.",
    ar: "مرحلة طلب الطعام.",
    tr: "Yemek siparişinin aşaması.",
  },
  "105.1 A food order's title.": {
    en: "A food order's title.",
    ar: "عنوان طلب الطعام.",
    tr: "Yemek siparişinin başlığı.",
  },
  "105.1 When the restaurant said it is ready.": {
    en: "When the restaurant said it is ready.",
    ar: "الموعد الذي حدده المطعم لجاهزية الطلب.",
    tr: "Restoranın siparişin hazır olacağını söylediği saat.",
  },
  "105.1 Why a restaurant turned an order down.": {
    en: "Why a restaurant turned an order down.",
    ar: "سبب رفض المطعم للطلب.",
    tr: "Restoranın siparişi neden reddettiği.",
  },
  "105.1 Cancels a food order.": {
    en: "Cancels a food order.",
    ar: "يلغي طلب الطعام.",
    tr: "Yemek siparişini iptal eder.",
  },
  "105.1 Asks before cancelling.": {
    en: "Asks before cancelling.",
    ar: "يسأل قبل الإلغاء.",
    tr: "İptal etmeden önce sorar.",
  },
  "105.1 The order was cancelled.": {
    en: "The order was cancelled.",
    ar: "تم إلغاء الطلب.",
    tr: "Sipariş iptal edildi.",
  },
  "105.1 Calls the restaurant.": {
    en: "Calls the restaurant.",
    ar: "يتصل بالمطعم.",
    tr: "Restoranı arar.",
  },
  "105.1 The order's restaurant.": {
    en: "The order's restaurant.",
    ar: "مطعم الطلب.",
    tr: "Siparişin restoranı.",
  },
  "105.1 The order's dishes.": {
    en: "The order's dishes.",
    ar: "أصناف الطلب.",
    tr: "Siparişin yemekleri.",
  },
  "105.1 The order waits for the restaurant.": {
    en: "The order waits for the restaurant.",
    ar: "الطلب بانتظار المطعم.",
    tr: "Sipariş restoranı bekliyor.",
  },
  "105.1 The rating section.": {
    en: "The rating section.",
    ar: "قسم التقييم.",
    tr: "Değerlendirme bölümü.",
  },
  "105.1 The restaurant's stars.": {
    en: "The restaurant's stars.",
    ar: "نجوم المطعم.",
    tr: "Restoranın yıldızları.",
  },
  "105.1 The courier's stars.": {
    en: "The courier's stars.",
    ar: "نجوم المندوب.",
    tr: "Kuryenin yıldızları.",
  },
  "105.1 The rating's comment.": {
    en: "The rating's comment.",
    ar: "تعليق التقييم.",
    tr: "Değerlendirmenin yorumu.",
  },
  "105.1 Sends the rating.": {
    en: "Sends the rating.",
    ar: "يرسل التقييم.",
    tr: "Değerlendirmeyi gönderir.",
  },
  "105.1 The rating was sent.": {
    en: "The rating was sent.",
    ar: "تم إرسال التقييم.",
    tr: "Değerlendirme gönderildi.",
  },
  "105.1 No stars were chosen.": {
    en: "No stars were chosen.",
    ar: "لم يتم اختيار أي نجمة.",
    tr: "Yıldız seçilmedi.",
  },
  "105.1 The order's rating.": {
    en: "The order's rating.",
    ar: "تقييم الطلب.",
    tr: "Siparişin değerlendirmesi.",
  },
  "105.1 A star button's label for screen readers.": {
    en: "A star button's label for screen readers.",
    ar: "وصف زر النجمة لقارئات الشاشة.",
    tr: "Ekran okuyucular için yıldız düğmesinin etiketi.",
  },
  "105.1 Read while the orders load.": {
    en: "Read while the orders load.",
    ar: "يُقرأ أثناء تحميل الطلبات.",
    tr: "Siparişler yüklenirken okunur.",
  },
  "105.1 The orders list is empty.": {
    en: "The orders list is empty.",
    ar: "قائمة الطلبات فارغة.",
    tr: "Sipariş listesi boş.",
  },
  "105.1 Opens the restaurants.": {
    en: "Opens the restaurants.",
    ar: "يفتح المطاعم.",
    tr: "Restoranları açar.",
  },
  "105.1 Orders while signed out.": {
    en: "Orders while signed out.",
    ar: "الطلبات قبل تسجيل الدخول.",
    tr: "Giriş yapılmadan siparişler.",
  },
  "105.1 The restaurant's new orders.": {
    en: "The restaurant's new orders.",
    ar: "الطلبات الجديدة للمطعم.",
    tr: "Restoranın yeni siparişleri.",
  },
  "105.1 The restaurant's accepted orders.": {
    en: "The restaurant's accepted orders.",
    ar: "الطلبات المقبولة لدى المطعم.",
    tr: "Restoranın kabul ettiği siparişler.",
  },
  "105.1 The restaurant's finished orders.": {
    en: "The restaurant's finished orders.",
    ar: "الطلبات المنتهية لدى المطعم.",
    tr: "Restoranın tamamlanan siparişleri.",
  },
  "105.1 The restaurant takes orders.": {
    en: "The restaurant takes orders.",
    ar: "المطعم يستقبل الطلبات.",
    tr: "Restoran sipariş alıyor.",
  },
  "105.1 The restaurant paused new orders.": {
    en: "The restaurant paused new orders.",
    ar: "أوقف المطعم الطلبات الجديدة.",
    tr: "Restoran yeni siparişleri durdurdu.",
  },
  "105.1 Outside the restaurant's hours.": {
    en: "Outside the restaurant's hours.",
    ar: "خارج مواعيد عمل المطعم.",
    tr: "Restoranın çalışma saatleri dışında.",
  },
  "105.1 Today's orders and sales.": {
    en: "Today's orders and sales.",
    ar: "طلبات اليوم ومبيعاته.",
    tr: "Bugünün siparişleri ve satışları.",
  },
  "105.1 Stops new orders for a while.": {
    en: "Stops new orders for a while.",
    ar: "يوقف الطلبات الجديدة لفترة.",
    tr: "Yeni siparişleri bir süreliğine durdurur.",
  },
  "105.1 Asks for how long.": {
    en: "Asks for how long.",
    ar: "يسأل عن المدة.",
    tr: "Ne kadar süreyle olduğunu sorar.",
  },
  "105.1 Ends the pause.": {
    en: "Ends the pause.",
    ar: "ينهي الإيقاف.",
    tr: "Durdurmayı sona erdirir.",
  },
  "105.1 Someone who isn't a restaurant's staff opened its screen.": {
    en: "Someone who isn't a restaurant's staff opened its screen.",
    ar: "فتح شخص ليس من موظفي المطعم شاشته.",
    tr: "Restoran personeli olmayan biri restoran ekranını açtı.",
  },
  "105.1 Read while the restaurant's orders load.": {
    en: "Read while the restaurant's orders load.",
    ar: "يُقرأ أثناء تحميل طلبات المطعم.",
    tr: "Restoranın siparişleri yüklenirken okunur.",
  },
  "105.1 A restaurant's list is empty.": {
    en: "A restaurant's list is empty.",
    ar: "قائمة من قوائم المطعم فارغة.",
    tr: "Restoranın listelerinden biri boş.",
  },
  "105.1 Accepts an order.": {
    en: "Accepts an order.",
    ar: "يقبل الطلب.",
    tr: "Siparişi kabul eder.",
  },
  "105.1 Asks how long the order takes.": {
    en: "Asks how long the order takes.",
    ar: "يسأل كم يستغرق تحضير الطلب.",
    tr: "Siparişin ne kadar süreceğini sorar.",
  },
  "105.1 The order was accepted.": {
    en: "The order was accepted.",
    ar: "تم قبول الطلب.",
    tr: "Sipariş kabul edildi.",
  },
  "105.1 Turns an order down.": {
    en: "Turns an order down.",
    ar: "يرفض الطلب.",
    tr: "Siparişi reddeder.",
  },
  "105.1 Asks why.": {
    en: "Asks why.",
    ar: "يسأل عن السبب.",
    tr: "Nedenini sorar.",
  },
  "105.1 The reason's note.": {
    en: "The reason's note.",
    ar: "ملاحظة السبب.",
    tr: "Nedenin notu.",
  },
  "105.1 The order was turned down.": {
    en: "The order was turned down.",
    ar: "تم رفض الطلب.",
    tr: "Sipariş reddedildi.",
  },
  "105.1 Marks the order ready.": {
    en: "Marks the order ready.",
    ar: "يعلّم الطلب بأنه جاهز.",
    tr: "Siparişi hazır olarak işaretler.",
  },
  "105.1 The order is ready.": {
    en: "The order is ready.",
    ar: "الطلب جاهز.",
    tr: "Sipariş hazır.",
  },
  "105.1 The order's customer.": {
    en: "The order's customer.",
    ar: "عميل الطلب.",
    tr: "Siparişin müşterisi.",
  },
  // 105.2 Ride hailing
  "105.2 The tab where the rider asks for a ride.": {
    en: "The tab where the rider asks for a ride.",
    ar: "التبويب الذي يطلب منه الراكب مشوارًا.",
    tr: "Yolcunun yolculuk istediği sekme.",
  },
  "105.2 The tab with the rider's rides.": {
    en: "The tab with the rider's rides.",
    ar: "التبويب الذي يعرض مشاوير الراكب.",
    tr: "Yolcunun yolculuklarının bulunduğu sekme.",
  },
  "105.2 The tab of the company's drivers.": {
    en: "The tab of the company's drivers.",
    ar: "تبويب سائقي الشركة.",
    tr: "Şirketin sürücülerinin sekmesi.",
  },
  "105.2 The title of the screen where the rider asks for a ride.": {
    en: "The title of the screen where the rider asks for a ride.",
    ar: "عنوان الشاشة التي يطلب منها الراكب مشوارًا.",
    tr: "Yolcunun yolculuk istediği ekranın başlığı.",
  },
  "105.2 Where the driver picks the rider up.": {
    en: "Where the driver picks the rider up.",
    ar: "المكان الذي يركب منه الراكب.",
    tr: "Sürücünün yolcuyu aldığı yer.",
  },
  "105.2 Where the ride ends.": {
    en: "Where the ride ends.",
    ar: "المكان الذي ينتهي فيه المشوار.",
    tr: "Yolculuğun bittiği yer.",
  },
  "105.2 The pickup's address when the rider used their position.": {
    en: "The pickup's address when the rider used their position.",
    ar: "عنوان مكان الركوب عندما يستخدم الراكب موقعه.",
    tr: "Yolcu konumunu kullandığında alış noktasının adresi.",
  },
  "105.2 Now or later.": {
    en: "Now or later.",
    ar: "الآن أو لاحقًا.",
    tr: "Şimdi veya daha sonra.",
  },
  "105.2 A ride now.": {
    en: "A ride now.",
    ar: "مشوار الآن.",
    tr: "Şimdi yolculuk.",
  },
  "105.2 A ride booked for later.": {
    en: "A ride booked for later.",
    ar: "مشوار محجوز لوقت لاحق.",
    tr: "Daha sonraya ayrılan yolculuk.",
  },
  "105.2 When a booked ride picks the rider up.": {
    en: "When a booked ride picks the rider up.",
    ar: "موعد ركوب المشوار المحجوز.",
    tr: "Ayrılan yolculuğun alış zamanı.",
  },
  "105.2 The vehicle types with their fares.": {
    en: "The vehicle types with their fares.",
    ar: "أنواع السيارات وأسعارها.",
    tr: "Araç türleri ve ücretleri.",
  },
  "105.2 Fares while signed out.": {
    en: "Fares while signed out.",
    ar: "الأسعار قبل تسجيل الدخول.",
    tr: "Giriş yapılmadan ücretler.",
  },
  "105.2 Both places need their position.": {
    en: "Both places need their position.",
    ar: "يحتاج المكانان إلى موقعهما على الخريطة.",
    tr: "İki yerin de konumu gerekir.",
  },
  "105.2 How far and how long a ride is.": {
    en: "How far and how long a ride is.",
    ar: "مسافة المشوار ومدته.",
    tr: "Yolculuğun mesafesi ve süresi.",
  },
  "105.2 The company charges what the meter says.": {
    en: "The company charges what the meter says.",
    ar: "تحاسب الشركة بما يقوله العداد.",
    tr: "Şirket taksimetreye göre ücret alır.",
  },
  "105.2 A vehicle type's seats.": {
    en: "A vehicle type's seats.",
    ar: "عدد مقاعد نوع السيارة.",
    tr: "Araç türünün koltuk sayısı.",
  },
  "105.2 How soon a driver can be at the pickup.": {
    en: "How soon a driver can be at the pickup.",
    ar: "متى يمكن أن يصل السائق إلى مكان الركوب.",
    tr: "Sürücünün alış noktasına ne zaman gelebileceği.",
  },
  "105.2 No online driver of this type is near.": {
    en: "No online driver of this type is near.",
    ar: "لا يوجد سائق متصل من هذا النوع بالقرب.",
    tr: "Yakında bu türden çevrimiçi sürücü yok.",
  },
  "105.2 The promo code's discount.": {
    en: "The promo code's discount.",
    ar: "قيمة خصم الكود.",
    tr: "İndirim kodunun indirimi.",
  },
  "105.2 A cancellation fee carried into this ride.": {
    en: "A cancellation fee carried into this ride.",
    ar: "رسوم إلغاء مضافة إلى هذا المشوار.",
    tr: "Bu yolculuğa eklenen iptal ücreti.",
  },
  "105.2 The promo code box.": {
    en: "The promo code box.",
    ar: "خانة كود الخصم.",
    tr: "İndirim kodu kutusu.",
  },
  "105.2 The rider's note.": {
    en: "The rider's note.",
    ar: "ملاحظة الراكب.",
    tr: "Yolcunun notu.",
  },
  "105.2 When a card ride is paid.": {
    en: "When a card ride is paid.",
    ar: "متى يُدفع مشوار البطاقة.",
    tr: "Kartlı yolculuğun ne zaman ödendiği.",
  },
  "105.2 The button that asks for a ride now.": {
    en: "The button that asks for a ride now.",
    ar: "زر طلب مشوار الآن.",
    tr: "Şimdi yolculuk isteyen düğme.",
  },
  "105.2 The button that books a ride for later.": {
    en: "The button that books a ride for later.",
    ar: "زر حجز مشوار لوقت لاحق.",
    tr: "Daha sonrası için yolculuk ayıran düğme.",
  },
  "105.2 The ride is offered to the drivers.": {
    en: "The ride is offered to the drivers.",
    ar: "المشوار معروض على السائقين.",
    tr: "Yolculuk sürücülere sunuluyor.",
  },
  "105.2 A driver took the ride.": {
    en: "A driver took the ride.",
    ar: "قبل سائق المشوار.",
    tr: "Bir sürücü yolculuğu aldı.",
  },
  "105.2 The driver is at the pickup.": {
    en: "The driver is at the pickup.",
    ar: "السائق عند مكان الركوب.",
    tr: "Sürücü alış noktasında.",
  },
  "105.2 The ride has started.": {
    en: "The ride has started.",
    ar: "بدأ المشوار.",
    tr: "Yolculuk başladı.",
  },
  "105.2 The ride ended.": {
    en: "The ride ended.",
    ar: "انتهى المشوار.",
    tr: "Yolculuk bitti.",
  },
  "105.2 The ride was cancelled.": {
    en: "The ride was cancelled.",
    ar: "أُلغي المشوار.",
    tr: "Yolculuk iptal edildi.",
  },
  "105.2 No driver took the ride.": {
    en: "No driver took the ride.",
    ar: "لم يقبل أي سائق المشوار.",
    tr: "Hiçbir sürücü yolculuğu almadı.",
  },
  "105.2 While a driver is looked for.": {
    en: "While a driver is looked for.",
    ar: "أثناء البحث عن سائق.",
    tr: "Sürücü aranırken.",
  },
  "105.2 What to do when no driver took the ride.": {
    en: "What to do when no driver took the ride.",
    ar: "ما يفعله الراكب عندما لا يقبل أي سائق المشوار.",
    tr: "Hiçbir sürücü almadığında yapılacak şey.",
  },
  "105.2 Asking again after no driver took the ride.": {
    en: "Asking again after no driver took the ride.",
    ar: "الطلب من جديد بعد ألا يقبل أي سائق.",
    tr: "Hiçbir sürücü almadıktan sonra yeniden isteme.",
  },
  "105.2 A ride's screen title.": {
    en: "A ride's screen title.",
    ar: "عنوان شاشة المشوار.",
    tr: "Yolculuk ekranının başlığı.",
  },
  "105.2 The code the rider tells the driver.": {
    en: "The code the rider tells the driver.",
    ar: "الكود الذي يقوله الراكب للسائق.",
    tr: "Yolcunun sürücüye söylediği kod.",
  },
  "105.2 When to tell the code.": {
    en: "When to tell the code.",
    ar: "متى يقول الراكب الكود.",
    tr: "Kodun ne zaman söyleneceği.",
  },
  "105.2 Calls the driver or the rider.": {
    en: "Calls the driver or the rider.",
    ar: "اتصال بالسائق أو بالراكب.",
    tr: "Sürücüyü veya yolcuyu arar.",
  },
  "105.2 When the driver's position was sent.": {
    en: "When the driver's position was sent.",
    ar: "وقت إرسال موقع السائق.",
    tr: "Sürücünün konumunun gönderildiği zaman.",
  },
  "105.2 Sends the ride's page to someone.": {
    en: "Sends the ride's page to someone.",
    ar: "يرسل صفحة المشوار إلى شخص آخر.",
    tr: "Yolculuğun sayfasını birine gönderir.",
  },
  "105.2 The text sent when sharing the ride.": {
    en: "The text sent when sharing the ride.",
    ar: "النص المرسل عند مشاركة المشوار.",
    tr: "Yolculuk paylaşılırken gönderilen metin.",
  },
  "105.2 The emergency button.": {
    en: "The emergency button.",
    ar: "زر الطوارئ.",
    tr: "Acil durum düğmesi.",
  },
  "105.2 The emergency button's question.": {
    en: "The emergency button's question.",
    ar: "سؤال زر الطوارئ.",
    tr: "Acil durum düğmesinin sorusu.",
  },
  "105.2 The number the emergency button calls.": {
    en: "The number the emergency button calls.",
    ar: "الرقم الذي يتصل به زر الطوارئ.",
    tr: "Acil durum düğmesinin aradığı numara.",
  },
  "105.2 Calls the emergency number.": {
    en: "Calls the emergency number.",
    ar: "يتصل برقم الطوارئ.",
    tr: "Acil numarayı arar.",
  },
  "105.2 Cancels the ride.": {
    en: "Cancels the ride.",
    ar: "يلغي المشوار.",
    tr: "Yolculuğu iptal eder.",
  },
  "105.2 The question before cancelling a ride.": {
    en: "The question before cancelling a ride.",
    ar: "السؤال قبل إلغاء المشوار.",
    tr: "Yolculuğu iptal etmeden önceki soru.",
  },
  "105.2 The company's cancellation fee.": {
    en: "The company's cancellation fee.",
    ar: "رسوم الإلغاء التي تحددها الشركة.",
    tr: "Şirketin iptal ücreti.",
  },
  "105.2 A reason to cancel.": {
    en: "A reason to cancel.",
    ar: "سبب للإلغاء.",
    tr: "İptal nedeni.",
  },
  "105.2 After cancelling.": {
    en: "After cancelling.",
    ar: "بعد إلغاء المشوار.",
    tr: "İptal ettikten sonra.",
  },
  "105.2 After cancelling with a fee.": {
    en: "After cancelling with a fee.",
    ar: "بعد إلغاء المشوار مع رسوم.",
    tr: "Ücretli iptalden sonra.",
  },
  "105.2 Who cancelled the ride.": {
    en: "Who cancelled the ride.",
    ar: "من ألغى المشوار.",
    tr: "Yolculuğu kimin iptal ettiği.",
  },
  "105.2 The cancellation fee charged.": {
    en: "The cancellation fee charged.",
    ar: "رسوم الإلغاء المحتسبة.",
    tr: "Alınan iptal ücreti.",
  },
  "105.2 The fare charged.": {
    en: "The fare charged.",
    ar: "الأجرة المحتسبة.",
    tr: "Alınan ücret.",
  },
  "105.2 The fare before the ride ends.": {
    en: "The fare before the ride ends.",
    ar: "الأجرة قبل انتهاء المشوار.",
    tr: "Yolculuk bitmeden önceki ücret.",
  },
  "105.2 After paying a card ride.": {
    en: "After paying a card ride.",
    ar: "بعد دفع مشوار البطاقة.",
    tr: "Kartlı yolculuk ödendikten sonra.",
  },
  "105.2 Rating the driver.": {
    en: "Rating the driver.",
    ar: "تقييم السائق.",
    tr: "Sürücüyü puanlama.",
  },
  "105.2 The driver's rating.": {
    en: "The driver's rating.",
    ar: "تقييم السائق.",
    tr: "Sürücünün puanı.",
  },
  "105.2 Rides while signed out.": {
    en: "Rides while signed out.",
    ar: "المشاوير قبل تسجيل الدخول.",
    tr: "Giriş yapılmadan yolculuklar.",
  },
  "105.2 Read while the rides load.": {
    en: "Read while the rides load.",
    ar: "تُقرأ أثناء تحميل المشاوير.",
    tr: "Yolculuklar yüklenirken okunur.",
  },
  "105.2 The rides list is empty.": {
    en: "The rides list is empty.",
    ar: "قائمة المشاوير فارغة.",
    tr: "Yolculuk listesi boş.",
  },
  "105.2 The driver's screen title.": {
    en: "The driver's screen title.",
    ar: "عنوان شاشة السائق.",
    tr: "Sürücü ekranının başlığı.",
  },
  "105.2 A driver switches to the riders' screens.": {
    en: "A driver switches to the riders' screens.",
    ar: "ينتقل السائق إلى شاشات الراكب.",
    tr: "Sürücü yolcu ekranlarına geçer.",
  },
  "105.2 Account: a driver opens the driver's screens.": {
    en: "Account: a driver opens the driver's screens.",
    ar: "الحساب: يفتح السائق شاشات السائق.",
    tr: "Hesap: sürücü, sürücü ekranlarını açar.",
  },
  "105.2 Someone who isn't a driver opened the driver's screen.": {
    en: "Someone who isn't a driver opened the driver's screen.",
    ar: "شخص ليس سائقًا فتح شاشة السائق.",
    tr: "Sürücü olmayan biri sürücü ekranını açtı.",
  },
  "105.2 The switch that makes the driver available.": {
    en: "The switch that makes the driver available.",
    ar: "المفتاح الذي يجعل السائق متاحًا.",
    tr: "Sürücüyü müsait yapan anahtar.",
  },
  "105.2 The driver is offline.": {
    en: "The driver is offline.",
    ar: "السائق غير متصل.",
    tr: "Sürücü çevrimdışı.",
  },
  "105.2 The driver's rides today and what they made.": {
    en: "The driver's rides today and what they made.",
    ar: "مشاوير السائق اليوم وما كسبه.",
    tr: "Sürücünün bugünkü yolculukları ve kazancı.",
  },
  "105.2 An online driver without a ride.": {
    en: "An online driver without a ride.",
    ar: "سائق متصل بلا مشوار.",
    tr: "Yolculuğu olmayan çevrimiçi sürücü.",
  },
  "105.2 The driver's position is being shared.": {
    en: "The driver's position is being shared.",
    ar: "يجري إرسال موقع السائق.",
    tr: "Sürücünün konumu paylaşılıyor.",
  },
  "105.2 A ride offered to the driver.": {
    en: "A ride offered to the driver.",
    ar: "مشوار معروض على السائق.",
    tr: "Sürücüye sunulan yolculuk.",
  },
  "105.2 The seconds left to take the offered ride.": {
    en: "The seconds left to take the offered ride.",
    ar: "الثواني المتبقية لقبول المشوار المعروض.",
    tr: "Sunulan yolculuğu almak için kalan saniye.",
  },
  "105.2 How far the pickup is.": {
    en: "How far the pickup is.",
    ar: "بُعد مكان الركوب.",
    tr: "Alış noktasının uzaklığı.",
  },
  "105.2 Takes the offered ride.": {
    en: "Takes the offered ride.",
    ar: "يقبل المشوار المعروض.",
    tr: "Sunulan yolculuğu alır.",
  },
  "105.2 Passes the offered ride to the next driver.": {
    en: "Passes the offered ride to the next driver.",
    ar: "يمرر المشوار المعروض إلى السائق التالي.",
    tr: "Sunulan yolculuğu sıradaki sürücüye bırakır.",
  },
  "105.2 The driver's ride that isn't over.": {
    en: "The driver's ride that isn't over.",
    ar: "مشوار السائق الذي لم ينته.",
    tr: "Sürücünün bitmemiş yolculuğu.",
  },
  "105.2 The driver's rides that aren't over.": {
    en: "The driver's rides that aren't over.",
    ar: "مشاوير السائق التي لم تنته.",
    tr: "Sürücünün bitmemiş yolculukları.",
  },
  "105.2 The driver's finished rides.": {
    en: "The driver's finished rides.",
    ar: "مشاوير السائق المنتهية.",
    tr: "Sürücünün biten yolculukları.",
  },
  "105.2 What the driver made.": {
    en: "What the driver made.",
    ar: "ما كسبه السائق.",
    tr: "Sürücünün kazancı.",
  },
  "105.2 A driver's list is empty.": {
    en: "A driver's list is empty.",
    ar: "قائمة السائق فارغة.",
    tr: "Sürücünün listesi boş.",
  },
  "105.2 Earnings over today.": {
    en: "Earnings over today.",
    ar: "الأرباح اليوم.",
    tr: "Bugünkü kazanç.",
  },
  "105.2 Earnings over this week.": {
    en: "Earnings over this week.",
    ar: "الأرباح هذا الأسبوع.",
    tr: "Bu haftaki kazanç.",
  },
  "105.2 Earnings over this month.": {
    en: "Earnings over this month.",
    ar: "الأرباح هذا الشهر.",
    tr: "Bu ayki kazanç.",
  },
  "105.2 How many rides the driver completed.": {
    en: "How many rides the driver completed.",
    ar: "عدد المشاوير التي أكملها السائق.",
    tr: "Sürücünün tamamladığı yolculuk sayısı.",
  },
  "105.2 The fares of the driver's rides.": {
    en: "The fares of the driver's rides.",
    ar: "أجرة مشاوير السائق.",
    tr: "Sürücünün yolculuklarının ücretleri.",
  },
  "105.2 The cash the driver collected.": {
    en: "The cash the driver collected.",
    ar: "النقد الذي حصّله السائق.",
    tr: "Sürücünün tahsil ettiği nakit.",
  },
  "105.2 The company's share of the fares.": {
    en: "The company's share of the fares.",
    ar: "حصة الشركة من الأجرة.",
    tr: "Şirketin ücretlerden payı.",
  },
  "105.2 A day's rides.": {
    en: "A day's rides.",
    ar: "مشاوير يوم واحد.",
    tr: "Bir günün yolculukları.",
  },
  "105.2 The rider is in: the ride starts.": {
    en: "The rider is in: the ride starts.",
    ar: "ركب الراكب: يبدأ المشوار.",
    tr: "Yolcu bindi: yolculuk başlar.",
  },
  "105.2 The ride ends at the drop-off.": {
    en: "The ride ends at the drop-off.",
    ar: "ينتهي المشوار عند الوجهة.",
    tr: "Yolculuk bırakış noktasında biter.",
  },
  "105.2 When the driver arrived at the pickup.": {
    en: "When the driver arrived at the pickup.",
    ar: "وقت وصول السائق إلى مكان الركوب.",
    tr: "Sürücünün alış noktasına geldiği zaman.",
  },
  "105.2 The cash the driver collects at the end.": {
    en: "The cash the driver collects at the end.",
    ar: "النقد الذي يحصّله السائق في النهاية.",
    tr: "Sürücünün sonunda tahsil ettiği nakit.",
  },
  "105.2 A card ride: nothing to collect.": {
    en: "A card ride: nothing to collect.",
    ar: "مشوار بالبطاقة: لا شيء للتحصيل.",
    tr: "Kartlı yolculuk: tahsil edilecek bir şey yok.",
  },
  "105.2 The rider's name.": {
    en: "The rider's name.",
    ar: "اسم الراكب.",
    tr: "Yolcunun adı.",
  },
  "105.2 Where the code is.": {
    en: "Where the code is.",
    ar: "مكان الكود.",
    tr: "Kodun yeri.",
  },
  "105.2 The question before a driver cancels.": {
    en: "The question before a driver cancels.",
    ar: "السؤال قبل أن يلغي السائق.",
    tr: "Sürücü iptal etmeden önceki soru.",
  },
  "105.2 When a driver may cancel because the rider didn't come.": {
    en: "When a driver may cancel because the rider didn't come.",
    ar: "متى يمكن للسائق الإلغاء لعدم حضور الراكب.",
    tr: "Sürücünün yolcu gelmediği için ne zaman iptal edebileceği.",
  },
  "105.2 Cancelling because the rider didn't come.": {
    en: "Cancelling because the rider didn't come.",
    ar: "الإلغاء لعدم حضور الراكب.",
    tr: "Yolcu gelmediği için iptal.",
  },
  "105.2 The driver gives the ride back.": {
    en: "The driver gives the ride back.",
    ar: "يعيد السائق المشوار.",
    tr: "Sürücü yolculuğu geri verir.",
  },
  "105.2 The driver cancels because the rider didn't come.": {
    en: "The driver cancels because the rider didn't come.",
    ar: "يلغي السائق لأن الراكب لم يحضر.",
    tr: "Sürücü, yolcu gelmediği için iptal eder.",
  },
  "105.3 The list of the academy's teachers.": {
    en: "The list of the academy's teachers.",
    ar: "قائمة مدرّسي الأكاديمية.",
    tr: "Akademinin eğitmenlerinin listesi.",
  },
  "105.3 The search field of the teachers' list.": {
    en: "The search field of the teachers' list.",
    ar: "خانة البحث في قائمة المدرّسين.",
    tr: "Eğitmen listesinin arama alanı.",
  },
  "105.3 The teachers' list is empty.": {
    en: "The teachers' list is empty.",
    ar: "قائمة المدرّسين فارغة.",
    tr: "Eğitmen listesi boş.",
  },
  "105.3 The chip that shows teachers of every subject.": {
    en: "The chip that shows teachers of every subject.",
    ar: "الزر الذي يعرض مدرّسي كل المواد.",
    tr: "Tüm konuların eğitmenlerini gösteren düğme.",
  },
  "105.3 A teacher the academy shows first.": {
    en: "A teacher the academy shows first.",
    ar: "مدرّس تعرضه الأكاديمية أولًا.",
    tr: "Akademinin önce gösterdiği eğitmen.",
  },
  "105.3 How many published courses a teacher has.": {
    en: "How many published courses a teacher has.",
    ar: "عدد الدورات المنشورة للمدرّس.",
    tr: "Eğitmenin yayındaki kurs sayısı.",
  },
  "105.3 How many students a teacher's courses have.": {
    en: "How many students a teacher's courses have.",
    ar: "عدد طلاب دورات المدرّس.",
    tr: "Eğitmenin kurslarındaki öğrenci sayısı.",
  },
  "105.3 How many students follow a teacher.": {
    en: "How many students follow a teacher.",
    ar: "عدد الطلاب الذين يتابعون المدرّس.",
    tr: "Eğitmeni takip eden öğrenci sayısı.",
  },
  "105.3 Follow a teacher: hear of their new courses.": {
    en: "Follow a teacher: hear of their new courses.",
    ar: "متابعة المدرّس لمعرفة دوراته الجديدة.",
    tr: "Eğitmeni takip et: yeni kurslarından haberdar ol.",
  },
  "105.3 The student follows this teacher (tap to stop).": {
    en: "The student follows this teacher (tap to stop).",
    ar: "الطالب يتابع هذا المدرّس (اضغط للإلغاء).",
    tr: "Öğrenci bu eğitmeni takip ediyor (bırakmak için dokunun).",
  },
  "105.3 Shown after following a teacher.": {
    en: "Shown after following a teacher.",
    ar: "يظهر بعد متابعة المدرّس.",
    tr: "Bir eğitmeni takip ettikten sonra gösterilir.",
  },
  "105.3 The heading of a teacher's courses on their page.": {
    en: "The heading of a teacher's courses on their page.",
    ar: "عنوان دورات المدرّس في صفحته.",
    tr: "Eğitmenin sayfasındaki kursların başlığı.",
  },
  "105.3 The button and sheet title to rate a teacher.": {
    en: "The button and sheet title to rate a teacher.",
    ar: "زر وعنوان نافذة تقييم المدرّس.",
    tr: "Eğitmeni değerlendirme düğmesi ve başlığı.",
  },
  "105.3 Why the student can't rate the teacher yet.": {
    en: "Why the student can't rate the teacher yet.",
    ar: "سبب عدم قدرة الطالب على تقييم المدرّس بعد.",
    tr: "Öğrencinin eğitmeni neden henüz değerlendiremediği.",
  },
  "105.3 Shown after rating a teacher.": {
    en: "Shown after rating a teacher.",
    ar: "يظهر بعد تقييم المدرّس.",
    tr: "Bir eğitmeni değerlendirdikten sonra gösterilir.",
  },
  "105.3 The student's own rating of the teacher.": {
    en: "The student's own rating of the teacher.",
    ar: "تقييم الطالب للمدرّس.",
    tr: "Öğrencinin eğitmene verdiği puan.",
  },
  "105.3 Opens the academy's list of teachers.": {
    en: "Opens the academy's list of teachers.",
    ar: "يفتح قائمة مدرّسي الأكاديمية.",
    tr: "Akademinin eğitmen listesini açar.",
  },
  "105.3 The account menu's item to apply to teach.": {
    en: "The account menu's item to apply to teach.",
    ar: "عنصر قائمة الحساب للتقديم للتدريس.",
    tr: "Hesap menüsünde eğitmenlik başvurusu öğesi.",
  },
  "105.3 Above the form to apply to teach.": {
    en: "Above the form to apply to teach.",
    ar: "فوق نموذج التقديم للتدريس.",
    tr: "Eğitmenlik başvuru formunun üstünde.",
  },
  "105.3 The applicant's name.": {
    en: "The applicant's name.",
    ar: "اسم المتقدّم.",
    tr: "Başvuranın adı.",
  },
  "105.3 The applicant's bio.": {
    en: "The applicant's bio.",
    ar: "نبذة المتقدّم.",
    tr: "Başvuranın kendini tanıtması.",
  },
  "105.3 The hint of the applicant's bio.": {
    en: "The hint of the applicant's bio.",
    ar: "تلميح خانة النبذة.",
    tr: "Biyografi alanının ipucu.",
  },
  "105.3 The subjects a teacher teaches.": {
    en: "The subjects a teacher teaches.",
    ar: "المواد التي يدرّسها المدرّس.",
    tr: "Eğitmenin öğrettiği konular.",
  },
  "105.3 The hint of the subjects field.": {
    en: "The hint of the subjects field.",
    ar: "تلميح خانة المواد.",
    tr: "Konular alanının ipucu.",
  },
  "105.3 Sends the application to teach.": {
    en: "Sends the application to teach.",
    ar: "يرسل طلب التدريس.",
    tr: "Eğitmenlik başvurusunu gönderir.",
  },
  "105.3 The application waits for the academy.": {
    en: "The application waits for the academy.",
    ar: "الطلب بانتظار رد الأكاديمية.",
    tr: "Başvuru akademiyi bekliyor.",
  },
  "105.3 The academy approved the application.": {
    en: "The academy approved the application.",
    ar: "وافقت الأكاديمية على الطلب.",
    tr: "Akademi başvuruyu onayladı.",
  },
  "105.3 The academy declined the application.": {
    en: "The academy declined the application.",
    ar: "رفضت الأكاديمية الطلب.",
    tr: "Akademi başvuruyu reddetti.",
  },
  "105.3 The academy's note on an application or a course.": {
    en: "The academy's note on an application or a course.",
    ar: "ملاحظة الأكاديمية على الطلب أو الدورة.",
    tr: "Akademinin başvuru veya kurs hakkındaki notu.",
  },
  "105.3 Apply again after a declined application.": {
    en: "Apply again after a declined application.",
    ar: "التقديم مجددًا بعد رفض الطلب.",
    tr: "Reddedilen başvurudan sonra tekrar başvur.",
  },
  "105.3 The tab of the academy's teachers.": {
    en: "The tab of the academy's teachers.",
    ar: "تبويب مدرّسي الأكاديمية.",
    tr: "Akademinin eğitmenlerine ait sekme.",
  },
  "105.3 The teacher's share of their courses' sales.": {
    en: "The teacher's share of their courses' sales.",
    ar: "نصيب المدرّس من مبيعات دوراته.",
    tr: "Eğitmenin kurs satışlarındaki payı.",
  },
  "105.3 The Teacher tab's courses.": {
    en: "The Teacher tab's courses.",
    ar: "دورات تبويب المدرّس.",
    tr: "Eğitmen sekmesinin kursları.",
  },
  "105.3 The Teacher tab's students' questions.": {
    en: "The Teacher tab's students' questions.",
    ar: "أسئلة الطلاب في تبويب المدرّس.",
    tr: "Eğitmen sekmesindeki öğrenci soruları.",
  },
  "105.3 The Teacher tab's earnings.": {
    en: "The Teacher tab's earnings.",
    ar: "أرباح تبويب المدرّس.",
    tr: "Eğitmen sekmesindeki kazançlar.",
  },
  "105.3 Starts a new course.": {
    en: "Starts a new course.",
    ar: "يبدأ دورة جديدة.",
    tr: "Yeni bir kurs başlatır.",
  },
  "105.3 The teacher has no course yet.": {
    en: "The teacher has no course yet.",
    ar: "ليست لدى المدرّس دورات بعد.",
    tr: "Eğitmenin henüz kursu yok.",
  },
  "105.3 A teacher's course not sent yet.": {
    en: "A teacher's course not sent yet.",
    ar: "دورة لم يرسلها المدرّس بعد.",
    tr: "Eğitmenin henüz göndermediği kurs.",
  },
  "105.3 A teacher's course waiting for the academy's review.": {
    en: "A teacher's course waiting for the academy's review.",
    ar: "دورة بانتظار مراجعة الأكاديمية.",
    tr: "Akademinin incelemesini bekleyen kurs.",
  },
  "105.3 The academy sent the course back.": {
    en: "The academy sent the course back.",
    ar: "أعادت الأكاديمية الدورة.",
    tr: "Akademi kursu geri gönderdi.",
  },
  "105.3 Students see the course.": {
    en: "Students see the course.",
    ar: "يرى الطلاب الدورة.",
    tr: "Öğrenciler kursu görüyor.",
  },
  "105.3 The academy took the course out of the app.": {
    en: "The academy took the course out of the app.",
    ar: "أزالت الأكاديمية الدورة من التطبيق.",
    tr: "Akademi kursu uygulamadan kaldırdı.",
  },
  "105.3 A course's title, as its teacher writes it.": {
    en: "A course's title, as its teacher writes it.",
    ar: "عنوان الدورة كما يكتبه المدرّس.",
    tr: "Kursun eğitmenin yazdığı başlığı.",
  },
  "105.3 A course's description.": {
    en: "A course's description.",
    ar: "وصف الدورة.",
    tr: "Kursun açıklaması.",
  },
  "105.3 A course's price in the academy's currency.": {
    en: "A course's price in the academy's currency.",
    ar: "سعر الدورة بعملة الأكاديمية.",
    tr: "Kursun akademinin para birimindeki fiyatı.",
  },
  "105.3 The hint of a course's price.": {
    en: "The hint of a course's price.",
    ar: "تلميح خانة سعر الدورة.",
    tr: "Kurs fiyatı alanının ipucu.",
  },
  "105.3 A course's level.": {
    en: "A course's level.",
    ar: "مستوى الدورة.",
    tr: "Kursun seviyesi.",
  },
  "105.3 The beginner level.": {
    en: "The beginner level.",
    ar: "المستوى المبتدئ.",
    tr: "Başlangıç seviyesi.",
  },
  "105.3 The intermediate level.": {
    en: "The intermediate level.",
    ar: "المستوى المتوسط.",
    tr: "Orta seviye.",
  },
  "105.3 The advanced level.": {
    en: "The advanced level.",
    ar: "المستوى المتقدّم.",
    tr: "İleri seviye.",
  },
  "105.3 A course's category.": {
    en: "A course's category.",
    ar: "تصنيف الدورة.",
    tr: "Kursun kategorisi.",
  },
  "105.3 A course without a category.": {
    en: "A course without a category.",
    ar: "دورة بلا تصنيف.",
    tr: "Kategorisi olmayan kurs.",
  },
  "105.3 Creates the teacher's course.": {
    en: "Creates the teacher's course.",
    ar: "ينشئ دورة المدرّس.",
    tr: "Eğitmenin kursunu oluşturur.",
  },
  "105.3 Saves the course's details.": {
    en: "Saves the course's details.",
    ar: "يحفظ تفاصيل الدورة.",
    tr: "Kurs ayrıntılarını kaydeder.",
  },
  "105.3 Opens the course's details to change them.": {
    en: "Opens the course's details to change them.",
    ar: "يفتح تفاصيل الدورة لتعديلها.",
    tr: "Kurs ayrıntılarını değiştirmek için açar.",
  },
  "105.3 Adds a section to the course.": {
    en: "Adds a section to the course.",
    ar: "يضيف قسمًا إلى الدورة.",
    tr: "Kursa bölüm ekler.",
  },
  "105.3 A section's title.": {
    en: "A section's title.",
    ar: "عنوان القسم.",
    tr: "Bölümün başlığı.",
  },
  "105.3 Adds a lesson to a section.": {
    en: "Adds a lesson to a section.",
    ar: "يضيف درسًا إلى القسم.",
    tr: "Bölüme ders ekler.",
  },
  "105.3 A lesson's title.": {
    en: "A lesson's title.",
    ar: "عنوان الدرس.",
    tr: "Dersin başlığı.",
  },
  "105.3 A lesson's text.": {
    en: "A lesson's text.",
    ar: "نص الدرس.",
    tr: "Dersin metni.",
  },
  "105.3 A lesson's video address.": {
    en: "A lesson's video address.",
    ar: "رابط فيديو الدرس.",
    tr: "Dersin video adresi.",
  },
  "105.3 Picks a video or a PDF from the phone for the lesson.": {
    en: "Picks a video or a PDF from the phone for the lesson.",
    ar: "يختار فيديو أو ملف PDF من الهاتف للدرس.",
    tr: "Ders için telefondan video veya PDF seçer.",
  },
  "105.3 A lesson's file being sent.": {
    en: "A lesson's file being sent.",
    ar: "جارٍ إرسال ملف الدرس.",
    tr: "Dersin dosyası gönderiliyor.",
  },
  "105.3 A lesson's length.": {
    en: "A lesson's length.",
    ar: "مدة الدرس.",
    tr: "Dersin süresi.",
  },
  "105.3 The lesson opens to everyone before they join.": {
    en: "The lesson opens to everyone before they join.",
    ar: "يُفتح الدرس للجميع قبل الاشتراك.",
    tr: "Ders, katılmadan önce herkese açılır.",
  },
  "105.3 A lesson has nothing in it.": {
    en: "A lesson has nothing in it.",
    ar: "الدرس بلا محتوى.",
    tr: "Dersin içeriği yok.",
  },
  "105.3 The picked file is over the size allowed.": {
    en: "The picked file is over the size allowed.",
    ar: "الملف المختار أكبر من الحجم المسموح.",
    tr: "Seçilen dosya izin verilen boyuttan büyük.",
  },
  "105.3 The picked file isn't a video or a PDF.": {
    en: "The picked file isn't a video or a PDF.",
    ar: "الملف المختار ليس فيديو ولا PDF.",
    tr: "Seçilen dosya video veya PDF değil.",
  },
  "105.3 A video lesson.": {
    en: "A video lesson.",
    ar: "درس فيديو.",
    tr: "Video ders.",
  },
  "105.3 A lesson with a PDF.": {
    en: "A lesson with a PDF.",
    ar: "درس بملف PDF.",
    tr: "PDF içeren ders.",
  },
  "105.3 A text lesson.": {
    en: "A text lesson.",
    ar: "درس نصي.",
    tr: "Metin ders.",
  },
  "105.3 Removes a lesson from a draft course.": {
    en: "Removes a lesson from a draft course.",
    ar: "يحذف درسًا من دورة مسودة.",
    tr: "Taslak kurstan dersi kaldırır.",
  },
  "105.3 Sends the course to the academy.": {
    en: "Sends the course to the academy.",
    ar: "يرسل الدورة إلى الأكاديمية.",
    tr: "Kursu akademiye gönderir.",
  },
  "105.3 Shown after sending a course for review.": {
    en: "Shown after sending a course for review.",
    ar: "يظهر بعد إرسال الدورة للمراجعة.",
    tr: "Kurs incelemeye gönderildikten sonra gösterilir.",
  },
  "105.3 The course waits for the academy.": {
    en: "The course waits for the academy.",
    ar: "الدورة بانتظار الأكاديمية.",
    tr: "Kurs akademiyi bekliyor.",
  },
  "105.3 The course is published.": {
    en: "The course is published.",
    ar: "الدورة منشورة.",
    tr: "Kurs yayında.",
  },
  "105.3 The teacher has no students' questions.": {
    en: "The teacher has no students' questions.",
    ar: "لا أسئلة من الطلاب للمدرّس.",
    tr: "Eğitmene öğrenci sorusu yok.",
  },
  "105.3 A question the teacher hasn't answered.": {
    en: "A question the teacher hasn't answered.",
    ar: "سؤال لم يجب عنه المدرّس.",
    tr: "Eğitmenin yanıtlamadığı soru.",
  },
  "105.3 A question the teacher answered.": {
    en: "A question the teacher answered.",
    ar: "سؤال أجاب عنه المدرّس.",
    tr: "Eğitmenin yanıtladığı soru.",
  },
  "105.3 The earnings of last month.": {
    en: "The earnings of last month.",
    ar: "أرباح الشهر الماضي.",
    tr: "Geçen ayın kazançları.",
  },
  "105.3 The earnings of this year.": {
    en: "The earnings of this year.",
    ar: "أرباح هذا العام.",
    tr: "Bu yılın kazançları.",
  },
  "105.3 How many of the teacher's courses sold, and for how much.": {
    en: "How many of the teacher's courses sold, and for how much.",
    ar: "عدد ما بيع من دورات المدرّس وقيمته.",
    tr: "Eğitmenin kurslarından kaç tane ve kaça satıldığı.",
  },
  "105.3 What was refunded of the teacher's courses.": {
    en: "What was refunded of the teacher's courses.",
    ar: "ما استُرد من مبيعات دورات المدرّس.",
    tr: "Eğitmenin kurslarından iade edilen tutar.",
  },
  "105.3 The teacher's share of the sales.": {
    en: "The teacher's share of the sales.",
    ar: "نصيب المدرّس من المبيعات.",
    tr: "Eğitmenin satışlardaki payı.",
  },
  "105.3 Under the teacher's earnings.": {
    en: "Under the teacher's earnings.",
    ar: "أسفل أرباح المدرّس.",
    tr: "Eğitmenin kazançlarının altında.",
  },
  "105.3 Opens the teacher's bio and subjects.": {
    en: "Opens the teacher's bio and subjects.",
    ar: "يفتح نبذة المدرّس ومواده.",
    tr: "Eğitmenin biyografisini ve konularını açar.",
  },
  "105.3 The teacher's profile was saved.": {
    en: "The teacher's profile was saved.",
    ar: "تم حفظ ملف المدرّس.",
    tr: "Eğitmenin profili kaydedildi.",
  },
  "105.2 Paying a ride in cash to the driver.": {
    en: "Paying a ride in cash to the driver.",
    ar: "دفع المشوار نقدًا للسائق.",
    tr: "Yolculuğu sürücüye nakit ödemek.",
  },
  // 105.4 Schools
  "105.4 The tab of a school's students and parents.": { ar: "تبويب المدرسة للطلاب وأولياء الأمور.", tr: "Okulun öğrencileri ve velileri için sekme." },
  "105.4 The tab of a school's teachers.": { ar: "تبويب معلّمي المدرسة.", tr: "Okulun öğretmenleri için sekme." },
  "105.4 The School tab before signing in.": { ar: "تبويب المدرسة قبل تسجيل الدخول.", tr: "Giriş yapmadan önce Okul sekmesi." },
  "105.4 Under the School tab's sign-in title.": { ar: "تحت عنوان تسجيل الدخول في تبويب المدرسة.", tr: "Okul sekmesindeki giriş başlığının altında." },
  "105.4 Someone the school didn't add opens the School tab.": { ar: "شخص لم تضفه المدرسة يفتح تبويب المدرسة.", tr: "Okulun eklemediği biri Okul sekmesini açar." },
  "105.4 Under the title for someone the school didn't add.": { ar: "تحت العنوان لشخص لم تضفه المدرسة.", tr: "Okulun eklemediği biri için başlığın altında." },
  "105.4 A parent the school hasn't linked to a child yet.": { ar: "ولي أمر لم تربطه المدرسة بأي طالب بعد.", tr: "Okulun henüz bir çocuğa bağlamadığı veli." },
  "105.4 Under the title for a parent without children linked.": { ar: "تحت العنوان لولي أمر بلا أبناء مرتبطين.", tr: "Çocuğu bağlı olmayan veli için başlığın altında." },
  "105.4 Today's lessons on the School and Classroom tabs.": { ar: "حصص اليوم في تبويبي المدرسة والفصل.", tr: "Okul ve Sınıf sekmelerinde bugünün dersleri." },
  "105.4 Today's day in the week's timetable.": { ar: "يوم اليوم في جدول الأسبوع.", tr: "Haftalık ders programında bugünün günü." },
  "105.4 Today has no lessons.": { ar: "لا توجد حصص اليوم.", tr: "Bugün ders olmadığında." },
  "105.4 The list of the school's parts on the School tab.": { ar: "قائمة أقسام المدرسة في تبويب المدرسة.", tr: "Okul sekmesindeki okul bölümleri listesi." },
  "105.4 The student's homework, and a class's on the Classroom tab.": { ar: "واجبات الطالب، وواجبات الفصل في تبويب الفصل.", tr: "Öğrencinin ödevleri ve Sınıf sekmesinde bir sınıfın ödevleri." },
  "105.4 The student's scores by subject.": { ar: "درجات الطالب حسب المادة.", tr: "Öğrencinin derslere göre puanları." },
  "105.4 The days the student was absent, late or excused.": { ar: "الأيام التي غاب فيها الطالب أو تأخر أو كان بعذر.", tr: "Öğrencinin devamsız, geç veya izinli olduğu günler." },
  "105.4 The class's lessons in the week.": { ar: "حصص الفصل في الأسبوع.", tr: "Sınıfın haftalık dersleri." },
  "105.4 What the school asks of the family.": { ar: "ما تطلبه المدرسة من الأسرة.", tr: "Okulun aileden istedikleri." },
  "105.4 The school's and the teachers' news.": { ar: "أخبار المدرسة والمعلّمين.", tr: "Okulun ve öğretmenlerin duyuruları." },
  "105.4 The school hasn't posted news.": { ar: "لم تنشر المدرسة أخبارًا بعد.", tr: "Okul henüz duyuru yayınlamadı." },
  "105.4 Where a lesson is.": { ar: "مكان الحصة.", tr: "Dersin yapıldığı yer." },
  "105.4 The class has no lessons in the week.": { ar: "لا توجد حصص للفصل في الأسبوع.", tr: "Sınıfın haftada dersi yok." },
  "105.4 Under the title when there is no timetable.": { ar: "تحت العنوان عند عدم وجود جدول.", tr: "Ders programı yokken başlığın altında." },
  "105.4 Under Fees on the School tab: what is still due.": { ar: "تحت الرسوم في تبويب المدرسة: المبلغ المستحق.", tr: "Okul sekmesinde Ücretler altında: kalan borç." },
  "105.4 Homework still to hand in.": { ar: "واجبات لم تُسلَّم بعد.", tr: "Henüz teslim edilmemiş ödevler." },
  "105.4 Homework handed in, or past its date.": { ar: "واجبات سُلّمت أو انتهى موعدها.", tr: "Teslim edilen veya süresi geçen ödevler." },
  "105.4 No homework still to hand in.": { ar: "لا توجد واجبات مطلوبة.", tr: "Teslim edilecek ödev yok." },
  "105.4 No homework handed in yet.": { ar: "لم يُسلَّم أي واجب بعد.", tr: "Henüz teslim edilen ödev yok." },
  "105.4 When homework is to be handed in.": { ar: "موعد تسليم الواجب.", tr: "Ödevin teslim tarihi." },
  "105.4 The student handed the homework in.": { ar: "سلّم الطالب الواجب.", tr: "Öğrenci ödevi teslim etti." },
  "105.4 The homework was handed in after its date.": { ar: "سُلّم الواجب بعد موعده.", tr: "Ödev tarihinden sonra teslim edildi." },
  "105.4 The student's work on a homework's page.": { ar: "عمل الطالب في صفحة الواجب.", tr: "Ödev sayfasında öğrencinin çalışması." },
  "105.4 The teacher's mark on homework.": { ar: "درجة المعلّم على الواجب.", tr: "Öğretmenin ödeve verdiği not." },
  "105.4 What the student writes to hand homework in.": { ar: "ما يكتبه الطالب لتسليم الواجب.", tr: "Öğrencinin ödevi teslim etmek için yazdığı." },
  "105.4 Adds a photo of the work to homework.": { ar: "يضيف صورة للعمل إلى الواجب.", tr: "Ödeve çalışmanın fotoğrafını ekler." },
  "105.4 Adds a file to homework.": { ar: "يضيف ملفًا إلى الواجب.", tr: "Ödeve dosya ekler." },
  "105.4 Takes the picked file off the homework.": { ar: "يزيل الملف المختار من الواجب.", tr: "Seçilen dosyayı ödevden kaldırır." },
  "105.4 The picked file isn't one homework takes.": { ar: "الملف المختار ليس من الأنواع التي يقبلها الواجب.", tr: "Seçilen dosya ödevin kabul ettiği türde değil." },
  "105.4 The picked file is over the size allowed.": { ar: "الملف المختار أكبر من الحجم المسموح.", tr: "Seçilen dosya izin verilen boyuttan büyük." },
  "105.4 Handing in empty homework.": { ar: "محاولة تسليم واجب فارغ.", tr: "Boş ödev teslim etmeye çalışınca." },
  "105.4 Hands the homework in.": { ar: "يسلّم الواجب.", tr: "Ödevi teslim eder." },
  "105.4 Hands in homework again before it is marked.": { ar: "يسلّم الواجب مرة أخرى قبل تصحيحه.", tr: "Ödevi not verilmeden önce yeniden teslim eder." },
  "105.4 Shown after handing homework in.": { ar: "يظهر بعد تسليم الواجب.", tr: "Ödev teslim edildikten sonra gösterilir." },
  "105.4 The student has no scores yet.": { ar: "لا توجد درجات للطالب بعد.", tr: "Öğrencinin henüz puanı yok." },
  "105.4 Under the title when there are no grades.": { ar: "تحت العنوان عند عدم وجود درجات.", tr: "Not yokken başlığın altında." },
  "105.4 Exams, quizzes and assignments still to come.": { ar: "امتحانات واختبارات وتكليفات قادمة.", tr: "Yaklaşan sınavlar, kısa sınavlar ve ödevler." },
  "105.4 An exam.": { ar: "امتحان.", tr: "Sınav." },
  "105.4 A short test.": { ar: "اختبار قصير.", tr: "Kısa sınav." },
  "105.4 An assignment with a score.": { ar: "تكليف عليه درجة.", tr: "Puanlı ödev." },
  "105.4 The start of the attendance period shown.": { ar: "بداية فترة الحضور المعروضة.", tr: "Gösterilen devam döneminin başı." },
  "105.4 The student has no marks besides present.": { ar: "لا توجد حالات غير الحضور.", tr: "Öğrencinin var dışında kaydı yok." },
  "105.4 A student came to school.": { ar: "حضر الطالب إلى المدرسة.", tr: "Öğrenci okula geldi." },
  "105.4 A student didn't come.": { ar: "لم يحضر الطالب.", tr: "Öğrenci gelmedi." },
  "105.4 A student came late.": { ar: "حضر الطالب متأخرًا.", tr: "Öğrenci geç geldi." },
  "105.4 A student was away with the school's leave.": { ar: "غاب الطالب بإذن المدرسة.", tr: "Öğrenci okulun izniyle yoktu." },
  "105.4 The school asks nothing of the family.": { ar: "لا تطلب المدرسة شيئًا من الأسرة.", tr: "Okul aileden bir şey istemiyor." },
  "105.4 Under the title when there are no fees.": { ar: "تحت العنوان عند عدم وجود رسوم.", tr: "Ücret yokken başlığın altında." },
  "105.4 The total of the fees not paid yet.": { ar: "إجمالي الرسوم غير المدفوعة.", tr: "Ödenmemiş ücretlerin toplamı." },
  "105.4 The school doesn't take fees by card in the app.": { ar: "المدرسة لا تقبل الدفع بالبطاقة في التطبيق.", tr: "Okul uygulamada kartla ödeme almıyor." },
  "105.4 A fee not paid yet.": { ar: "رسوم لم تُدفع بعد.", tr: "Henüz ödenmemiş ücret." },
  "105.4 The date a fee is due.": { ar: "موعد استحقاق الرسوم.", tr: "Ücretin son ödeme tarihi." },
  "105.4 A fee paid.": { ar: "رسوم مدفوعة.", tr: "Ödenmiş ücret." },
  "105.4 When a fee was paid.": { ar: "تاريخ دفع الرسوم.", tr: "Ücretin ödendiği tarih." },
  "105.4 Pays a fee by card.": { ar: "يدفع الرسوم بالبطاقة.", tr: "Ücreti kartla öder." },
  "105.4 Shown after paying a fee.": { ar: "يظهر بعد دفع الرسوم.", tr: "Ücret ödendikten sonra gösterilir." },
  "105.4 Opens a paid fee's receipt.": { ar: "يفتح إيصال الرسوم المدفوعة.", tr: "Ödenen ücretin makbuzunu açar." },
  "105.4 Someone who isn't a teacher opens the Classroom tab.": { ar: "شخص ليس معلّمًا يفتح تبويب الفصل.", tr: "Öğretmen olmayan biri Sınıf sekmesini açar." },
  "105.4 Under the title for someone who isn't a teacher.": { ar: "تحت العنوان لشخص ليس معلّمًا.", tr: "Öğretmen olmayan biri için başlığın altında." },
  "105.4 The classes a teacher teaches.": { ar: "الفصول التي يدرّسها المعلّم.", tr: "Öğretmenin ders verdiği sınıflar." },
  "105.4 A teacher without classes.": { ar: "معلّم بلا فصول.", tr: "Sınıfı olmayan öğretmen." },
  "105.4 The class the teacher is the own teacher of.": { ar: "الفصل الذي يكون المعلّم معلّمَه.", tr: "Öğretmenin sınıf öğretmeni olduğu sınıf." },
  "105.4 How many students a class has.": { ar: "عدد طلاب الفصل.", tr: "Sınıftaki öğrenci sayısı." },
  "105.4 Opens a class's attendance for today.": { ar: "يفتح حضور الفصل لليوم.", tr: "Sınıfın bugünkü yoklamasını açar." },
  "105.4 Writes news to a class and its families.": { ar: "يكتب خبرًا للفصل وأسره.", tr: "Sınıfa ve ailelerine duyuru yazar." },
  "105.4 The title of the message to a class.": { ar: "عنوان الرسالة إلى فصل.", tr: "Bir sınıfa mesajın başlığı." },
  "105.4 A class's exams, quizzes and assignments.": { ar: "امتحانات الفصل واختباراته وتكليفاته.", tr: "Sınıfın sınavları, kısa sınavları ve ödevleri." },
  "105.4 Gives a class homework.": { ar: "يعطي الفصل واجبًا.", tr: "Sınıfa ödev verir." },
  "105.4 A class has no homework.": { ar: "لا واجبات للفصل.", tr: "Sınıfın ödevi yok." },
  "105.4 Adds an exam, a quiz or an assignment.": { ar: "يضيف امتحانًا أو اختبارًا أو تكليفًا.", tr: "Sınav, kısa sınav veya ödev ekler." },
  "105.4 A class has no assessments.": { ar: "لا امتحانات للفصل.", tr: "Sınıfın sınavı yok." },
  "105.4 How many of a class handed homework in, and how many the teacher marked.": { ar: "عدد من سلّم الواجب من الفصل وعدد ما صحّحه المعلّم.", tr: "Sınıftan kaç kişinin ödevi teslim ettiği ve kaçının notlandırıldığı." },
  "105.4 How many of a class have a score, and the full mark.": { ar: "عدد من رُصدت درجاتهم والدرجة النهائية.", tr: "Kaç kişinin puanlandığı ve tam puan." },
  "105.4 An assessment's full mark.": { ar: "الدرجة النهائية للتقييم.", tr: "Değerlendirmenin tam puanı." },
  "105.4 The subject of homework or an exam.": { ar: "مادة الواجب أو الامتحان.", tr: "Ödevin veya sınavın dersi." },
  "105.4 The title of homework, an exam or a message.": { ar: "عنوان الواجب أو الامتحان أو الرسالة.", tr: "Ödevin, sınavın veya mesajın başlığı." },
  "105.4 What the students are to do.": { ar: "ما على الطلاب فعله.", tr: "Öğrencilerin yapacakları." },
  "105.4 The day homework is due.": { ar: "يوم تسليم الواجب.", tr: "Ödevin teslim günü." },
  "105.4 The day of an exam or of the attendance.": { ar: "يوم الامتحان أو الحضور.", tr: "Sınavın veya yoklamanın günü." },
  "105.4 No day chosen yet.": { ar: "لم يُختر يوم بعد.", tr: "Henüz gün seçilmedi." },
  "105.4 The highest score of an exam.": { ar: "أعلى درجة في الامتحان.", tr: "Sınavın en yüksek puanı." },
  "105.4 Gives the homework.": { ar: "يعطي الواجب.", tr: "Ödevi verir." },
  "105.4 Adds the exam, quiz or assignment.": { ar: "يضيف الامتحان أو الاختبار أو التكليف.", tr: "Sınavı, kısa sınavı veya ödevi ekler." },
  "105.4 Giving homework without what it needs.": { ar: "إعطاء واجب بدون ما يلزمه.", tr: "Gerekenler olmadan ödev vermeye çalışınca." },
  "105.4 Shown after giving homework.": { ar: "يظهر بعد إعطاء الواجب.", tr: "Ödev verildikten sonra gösterilir." },
  "105.4 Adding an exam without what it needs.": { ar: "إضافة امتحان بدون ما يلزمه.", tr: "Gerekenler olmadan sınav eklemeye çalışınca." },
  "105.4 The text of a message to a class.": { ar: "نص الرسالة إلى الفصل.", tr: "Sınıfa mesajın metni." },
  "105.4 Sending an empty message.": { ar: "إرسال رسالة فارغة.", tr: "Boş mesaj göndermeye çalışınca." },
  "105.4 Shown after writing to a class.": { ar: "يظهر بعد الكتابة للفصل.", tr: "Sınıfa yazıldıktan sonra gösterilir." },
  "105.4 The title of a class's attendance.": { ar: "عنوان حضور الفصل.", tr: "Sınıf yoklamasının başlığı." },
  "105.4 The day's attendance wasn't saved yet.": { ar: "لم يُحفظ حضور اليوم بعد.", tr: "Günün yoklaması henüz kaydedilmedi." },
  "105.4 A class without students.": { ar: "فصل بلا طلاب.", tr: "Öğrencisi olmayan sınıf." },
  "105.4 Saves the day's attendance.": { ar: "يحفظ حضور اليوم.", tr: "Günün yoklamasını kaydeder." },
  "105.4 Shown after saving attendance.": { ar: "يظهر بعد حفظ الحضور.", tr: "Yoklama kaydedildikten sonra gösterilir." },
  "105.4 A student didn't hand the homework in.": { ar: "لم يسلّم الطالب الواجب.", tr: "Öğrenci ödevi teslim etmedi." },
  "105.4 How a mark may be written.": { ar: "كيف تُكتب الدرجة.", tr: "Notun nasıl yazılabileceği." },
  "105.4 The teacher's words on homework.": { ar: "ملاحظات المعلّم على الواجب.", tr: "Öğretmenin ödev hakkındaki sözleri." },
  "105.4 Saving a mark without one.": { ar: "حفظ درجة بدون كتابتها.", tr: "Not yazmadan kaydetmeye çalışınca." },
  "105.4 Saves an exam's scores.": { ar: "يحفظ درجات الامتحان.", tr: "Sınavın puanlarını kaydeder." },
  "105.4 Shown after saving scores.": { ar: "يظهر بعد حفظ الدرجات.", tr: "Puanlar kaydedildikten sonra gösterilir." },
  "105.4 A score over the full mark.": { ar: "درجة أكبر من الدرجة النهائية.", tr: "Tam puandan büyük puan." },
  "105.9 How many free taxis are on the map around the rider.": { ar: "عدد سيارات الأجرة المتاحة على الخريطة حول الراكب.", tr: "Yolcunun çevresinde haritadaki boş taksi sayısı." },
  "105.9 After the taxis near the rider: how far the nearest one is.": { ar: "بعد عدد السيارات القريبة: كم تبعد أقربها.", tr: "Yakındaki taksilerden sonra: en yakınının ne kadar uzakta olduğu." },
  "105.9 The search for where the ride starts.": { ar: "البحث عن مكان بدء الرحلة.", tr: "Yolculuğun başlayacağı yerin araması." },
  "105.9 Where the ride starts, on the map and in the sheet.": { ar: "مكان بدء الرحلة، على الخريطة وفي اللوحة السفلية.", tr: "Yolculuğun başladığı yer, haritada ve alttaki panelde." },
  "105.9 Where the ride ends, on the map and in the sheet.": { ar: "مكان انتهاء الرحلة، على الخريطة وفي اللوحة السفلية.", tr: "Yolculuğun bittiği yer, haritada ve alttaki panelde." },
  "105.9 The button asking for a ride in the chosen vehicle type (Economy, Comfort).": { ar: "زر طلب الرحلة بنوع المركبة المختار (اقتصادي، مريح).", tr: "Seçilen araç türünde yolculuk isteme düğmesi (Ekonomi, Konfor)." },
  "105.9 Over the map: when the driver reaches the rider.": { ar: "فوق الخريطة: متى يصل السائق إلى الراكب.", tr: "Haritanın üstünde: sürücünün yolcuya ne zaman ulaşacağı." },
  "105.9 Over the map: the driver's position is live.": { ar: "فوق الخريطة: موقع السائق يتحدث مباشرة.", tr: "Haritanın üstünde: sürücünün konumu canlı." },
  "105.9 The driver's switch over the map: online and taking rides.": { ar: "مفتاح السائق فوق الخريطة: متصل ويستقبل الرحلات.", tr: "Sürücünün haritanın üstündeki düğmesi: çevrimiçi ve yolculuk alıyor." },
  "105.9 The place search's field.": { ar: "خانة البحث عن مكان.", tr: "Yer arama alanı." },
  "105.9 The place search found nothing.": { ar: "لم يعثر البحث عن مكان على نتائج.", tr: "Yer aramasında sonuç bulunamadı." },
  "105.9 In the place search: pick the place on the map instead.": { ar: "في البحث عن مكان: اختيار المكان من الخريطة بدلًا من ذلك.", tr: "Yer aramasında: bunun yerine yeri haritadan seçmek." },
  "105.9 The name of a place chosen on the map.": { ar: "اسم مكان اختير من الخريطة.", tr: "Haritadan seçilen bir yerin adı." },
  "105.9 A place from the search has no position.": { ar: "مكان من نتائج البحث بلا موقع على الخريطة.", tr: "Aramadan gelen bir yerin konumu yok." },
  "110 Chat: why a photo or file the customer is sending didn't go.": { ar: "المحادثة: سبب عدم إرسال صورة أو ملف يرسله العميل.", tr: "Sohbet: müşterinin gönderdiği fotoğraf veya dosyanın neden gitmediği." },
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
