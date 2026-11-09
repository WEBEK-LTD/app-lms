/**
 * Templates = demos: Yallapp's Arabic and Turkish for the texts each demo's
 * design writes on its home (lib/demo/look.ts): its banner's heading and
 * subheading and the welcome with its sentence. Part of PAGE_TEXTS_AR and
 * PAGE_TEXTS_TR (./ar.ts, ./tr.ts); keys are the English texts exactly, so
 * an app started from a demo shows the demo's home in each of its languages.
 */

/** English, Arabic, Turkish. */
type Texts = readonly [en: string, ar: string, tr: string];

/** A demo's banner (heading, subheading) and the sentence under its welcome. */
const DEMOS: readonly { banner: readonly [Texts, Texts]; welcome: Texts }[] = [
  {
    // lms
    banner: [
      ["Learn something new this week", "تعلّم شيئًا جديدًا هذا الأسبوع", "Bu hafta yeni bir şey öğrenin"],
      ["Short lessons from people who do it every day.", "دروس قصيرة من أناس يمارسون ذلك كل يوم.", "Bu işi her gün yapanlardan kısa dersler."],
    ],
    welcome: ["Practical courses you can finish. Start with a free preview lesson.", "دورات عملية يمكنك إنهاؤها. ابدأ بدرس تجريبي مجاني.", "Bitirebileceğiniz uygulamalı kurslar. Ücretsiz bir önizleme dersiyle başlayın."],
  },
  {
    // store
    banner: [
      ["Fresh flowers, delivered today", "زهور طازجة تصلك اليوم", "Taze çiçekler, bugün kapınızda"],
      ["Free delivery on orders over ₺1,500.", "توصيل مجاني للطلبات التي تتجاوز 1,500 ₺.", "1.500 ₺ üzeri siparişlerde teslimat ücretsiz."],
    ],
    welcome: ["Bouquets made this morning, gift boxes and little treats.", "باقات حُضّرت هذا الصباح، وصناديق هدايا، وحلوى صغيرة.", "Bu sabah hazırlanan buketler, hediye kutuları ve küçük ikramlar."],
  },
  {
    // restaurant
    banner: [
      ["Breakfast all day, coffee all night", "فطور طوال اليوم، وقهوة طوال الليل", "Gün boyu kahvaltı, gece boyu kahve"],
      ["Order ahead for pickup, or have it delivered in Moda.", "اطلب مسبقًا لتستلمه بنفسك، أو ليصلك في مودا.", "Önceden sipariş verip gelip alın ya da Moda'da kapınıza gelsin."],
    ],
    welcome: [
      "Open every day from 08:00 to 23:00. Pickup in Moda, delivery in Kadıköy.",
      "مفتوح كل يوم من 08:00 إلى 23:00. الاستلام في مودا، والتوصيل في كاديكوي.",
      "Her gün 08:00-23:00 arası açığız. Moda'da gel-al, Kadıköy'de paket servis.",
    ],
  },
  {
    // booking
    banner: [
      ["Book your next visit", "احجز زيارتك القادمة", "Bir sonraki ziyaretinizi ayırtın"],
      ["Hair, spa, nails and brows. Pick a time that suits you.", "الشعر والسبا والأظافر والحواجب. اختر الوقت الذي يناسبك.", "Saç, spa, tırnak ve kaş. Size uyan saati seçin."],
    ],
    welcome: ["Open Monday to Saturday, 10:00 to 19:00.", "مفتوح من الاثنين إلى السبت، من 10:00 إلى 19:00.", "Pazartesiden cumartesiye, 10:00-19:00 arası açığız."],
  },
  {
    // clinic
    banner: [
      ["Book your visit in a minute", "احجز زيارتك في دقيقة", "Ziyaretinizi bir dakikada ayırtın"],
      ["Choose your doctor and a time. Answer a few questions before you come.", "اختر طبيبك والوقت، وأجب عن بضعة أسئلة قبل أن تأتي.", "Doktorunuzu ve saati seçin. Gelmeden önce birkaç soruyu yanıtlayın."],
    ],
    welcome: [
      "Open Monday to Friday, 09:00 to 18:00, and Saturday mornings.",
      "مفتوح من الاثنين إلى الجمعة، من 09:00 إلى 18:00، وصباح السبت.",
      "Pazartesiden cumaya 09:00-18:00 arası ve cumartesi sabahları açığız.",
    ],
  },
  {
    // fitness
    banner: [
      ["Your week of classes", "أسبوعك من الحصص", "Haftalık dersleriniz"],
      ["Yoga, spin, HIIT and pilates. Book a spot, come and move.", "يوغا وسبين وHIIT وبيلاتس. احجز مكانك، وتعال لتتحرك.", "Yoga, spinning, HIIT ve pilates. Yerinizi ayırtın, gelin ve hareket edin."],
    ],
    welcome: ["Classes every day of the week. Personal training on request.", "حصص كل يوم من أيام الأسبوع، وتدريب شخصي عند الطلب.", "Haftanın her günü dersler. İsteğe bağlı kişisel antrenman."],
  },
  {
    // real_estate
    banner: [
      ["Find your next home in Cairo", "اعثر على بيتك القادم في القاهرة", "Kahire'deki yeni evinizi bulun"],
      ["Apartments, villas and offices for sale and for rent.", "شقق وفلل ومكاتب للبيع وللإيجار.", "Satılık ve kiralık daireler, villalar ve ofisler."],
    ],
    welcome: ["Homes we know well, in the neighbourhoods we know best.", "بيوت نعرفها جيدًا، في الأحياء التي نعرفها أكثر من غيرها.", "İyi tanıdığımız evler, en iyi bildiğimiz semtlerde."],
  },
  {
    // news
    banner: [
      ["News from your side of the water", "أخبار ضفّتك من المدينة", "Yakanızdan haberler"],
      ["The city, its people and what's on, every day.", "المدينة وأهلها وما يجري فيها، كل يوم.", "Şehir, insanları ve etkinlikleri, her gün."],
    ],
    welcome: ["Local news, written by people who live here.", "أخبار محلية يكتبها أناس يعيشون هنا.", "Burada yaşayanların yazdığı yerel haberler."],
  },
  {
    // events
    banner: [
      ["Something on every week", "فعالية جديدة كل أسبوع", "Her hafta bir etkinlik"],
      ["Concerts, films, workshops and talks at the centre and online.", "حفلات وأفلام وورش عمل وندوات في المركز وعبر الإنترنت.", "Merkezde ve çevrimiçi konserler, filmler, atölyeler ve söyleşiler."],
    ],
    welcome: [
      "Concerts, films, workshops and talks. Get your tickets here and show them at the door.",
      "حفلات وأفلام وورش عمل وندوات. احصل على تذاكرك هنا واعرضها عند الباب.",
      "Konserler, filmler, atölyeler ve söyleşiler. Biletlerinizi buradan alın, kapıda gösterin.",
    ],
  },
  {
    // donations
    banner: [
      ["No family in our city goes hungry", "لا تبيت أسرة في مدينتنا جائعة", "Şehrimizde hiçbir aile aç kalmasın"],
      ["Food parcels, hot meals and school lunches, given by neighbours.", "سلال غذائية ووجبات ساخنة ووجبات مدرسية، يقدّمها الجيران.", "Komşuların verdiği gıda kolileri, sıcak yemekler ve okul öğle yemekleri."],
    ],
    welcome: [
      "Every parcel is packed by volunteers and given out at our three centres.",
      "يجهّز المتطوعون كل سلة، وتُوزَّع في مراكزنا الثلاثة.",
      "Her koli gönüllüler tarafından hazırlanır ve üç merkezimizde dağıtılır.",
    ],
  },
  {
    // delivery
    banner: [
      ["Across Cairo, the same day", "في أنحاء القاهرة، في اليوم نفسه", "Kahire'nin her yerine, aynı gün"],
      ["Picked up from your door, delivered to theirs. Follow it all the way.", "نستلمها من بابك ونسلّمها إلى بابهم، وتتابعها طوال الطريق.", "Kapınızdan alınır, onların kapısına teslim edilir. Yol boyunca takip edin."],
    ],
    welcome: ["Same-day, express and documents, anywhere in Cairo and Giza.", "توصيل في اليوم نفسه وسريع ومستندات، إلى أي مكان في القاهرة والجيزة.", "Aynı gün, ekspres ve evrak teslimatı; Kahire ve Giza'nın her yerine."],
  },
  {
    // food
    banner: [
      ["Hungry? It's on its way", "جائع؟ طعامك في الطريق", "Acıktınız mı? Yemeğiniz yolda"],
      ["Koshary, grills and pizza from restaurants near you.", "كشري ومشويات وبيتزا من مطاعم قريبة منك.", "Yakınınızdaki restoranlardan koşari, ızgara ve pizza."],
    ],
    welcome: ["Three kitchens, one app. Order in a few taps.", "ثلاثة مطابخ في تطبيق واحد. اطلب بلمسات قليلة.", "Üç mutfak, tek uygulama. Birkaç dokunuşla sipariş verin."],
  },
  {
    // marketplace
    banner: [
      ["Dinner and groceries, one app", "العشاء والبقالة في تطبيق واحد", "Akşam yemeği ve market alışverişi tek uygulamada"],
      [
        "Grills, pizza and a supermarket near you, delivered or ready for pick-up.",
        "مشويات وبيتزا وسوبر ماركت قريب منك، بالتوصيل أو جاهزة للاستلام.",
        "Yakınınızda ızgara, pizza ve bir süpermarket; kapınıza gelsin ya da gelip alın.",
      ],
    ],
    welcome: ["Two kitchens and a supermarket, one basket at a time.", "مطبخان وسوبر ماركت، وكل طلب في سلة واحدة.", "İki mutfak ve bir süpermarket, her seferinde tek sepet."],
  },
  {
    // rides ("Where to?" is in ./ar.ts and ./tr.ts already)
    banner: [
      ["Where to?", "إلى أين؟", "Nereye?"],
      ["See the fare first, follow your driver and share your ride.", "اعرف الأجرة أولًا، وتابع سائقك، وشارك رحلتك.", "Ücreti önceden görün, sürücünüzü takip edin ve yolculuğunuzu paylaşın."],
    ],
    welcome: ["Economy, Comfort and Van, day and night.", "اقتصادي ومريح وفان، ليلًا ونهارًا.", "Ekonomi, Konfor ve Van; gece gündüz."],
  },
  {
    // taxi
    banner: [
      ["Your taxi, live on the map", "سيارة الأجرة على الخريطة لحظة بلحظة", "Taksiniz haritada, canlı"],
      ["See the free taxis around you and follow yours to the door.", "شاهد سيارات الأجرة المتاحة حولك، وتابع سيارتك حتى الباب.", "Çevrenizdeki boş taksileri görün, sizinkini kapıya kadar takip edin."],
    ],
    welcome: ["Taxi, Comfort and XL across Cairo, day and night.", "تاكسي ومريح وXL في أنحاء القاهرة، ليلًا ونهارًا.", "Kahire'nin her yerinde Taksi, Konfor ve XL; gece gündüz."],
  },
  {
    // school
    banner: [
      ["The school day in one app", "اليوم الدراسي في تطبيق واحد", "Okul günü tek uygulamada"],
      [
        "Timetable, homework, grades and news for students, parents and teachers.",
        "الجدول والواجبات والدرجات والأخبار، للطلاب وأولياء الأمور والمعلمين.",
        "Öğrenciler, veliler ve öğretmenler için ders programı, ödevler, notlar ve haberler.",
      ],
    ],
    welcome: ["A primary school in Heliopolis, from Grade 1 to Grade 6.", "مدرسة ابتدائية في مصر الجديدة، من الصف الأول إلى الصف السادس.", "Heliopolis'te 1. sınıftan 6. sınıfa bir ilkokul."],
  },
  {
    // instructors
    banner: [
      ["Learn from people who do it every day", "تعلّم من أناس يمارسون ذلك كل يوم", "Bu işi her gün yapanlardan öğrenin"],
      ["Seven teachers and their courses in design, business, languages and code.", "سبعة معلمين ودوراتهم في التصميم والأعمال واللغات والبرمجة.", "Yedi öğretmen ve tasarım, iş, dil ve kodlama kursları."],
    ],
    welcome: ["Seven teachers, each with their own courses. Start with a free one.", "سبعة معلمين، لكل منهم دوراته. ابدأ بدورة مجانية.", "Yedi öğretmen, her birinin kendi kursları var. Ücretsiz bir kursla başlayın."],
  },
];

function dictionary(lang: 1 | 2): Record<string, string> {
  const welcome = lang === 1 ? "مرحبًا بك في {app}" : "{app} uygulamasına hoş geldiniz";
  const out: Record<string, string> = {};
  for (const demo of DEMOS) {
    for (const text of demo.banner) out[text[0]] = text[lang];
    out[`<h2>Welcome to {app}</h2><p>${demo.welcome[0]}</p>`] = `<h2>${welcome}</h2><p>${demo.welcome[lang]}</p>`;
  }
  return out;
}

export const DEMO_TEXTS_AR: Record<string, string> = dictionary(1);
export const DEMO_TEXTS_TR: Record<string, string> = dictionary(2);
