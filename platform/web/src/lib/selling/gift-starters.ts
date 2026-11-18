/**
 * 131 The card messages a new store starts with, by occasion, in English,
 * Arabic (Modern Standard) and Turkish: copied into the store's own gift
 * messages the first time the owner opens them (and served as they are
 * until then), so a new store isn't empty. They are the owner's from then
 * on: edited, hidden, reordered or deleted on Store › Gift messages.
 */

export const GIFT_OCCASION_KEYS = [
  "love",
  "birthday",
  "anniversary",
  "congratulations",
  "new_baby",
  "get_well",
  "thank_you",
  "sorry",
  "sympathy",
  "eid_ramadan",
  "mothers_day",
] as const;
export type GiftOccasionKey = (typeof GIFT_OCCASION_KEYS)[number];

type Words = { en: string; ar: string; tr: string };

/** Each built-in occasion's name and icon (Material Symbols Rounded). */
export const GIFT_OCCASIONS: Record<GiftOccasionKey, { icon: string; name: Words }> = {
  love: { icon: "favorite", name: { en: "Love", ar: "الحب", tr: "Aşk" } },
  birthday: { icon: "cake", name: { en: "Birthday", ar: "عيد ميلاد", tr: "Doğum günü" } },
  anniversary: { icon: "celebration", name: { en: "Anniversary", ar: "ذكرى سنوية", tr: "Yıl dönümü" } },
  congratulations: { icon: "emoji_events", name: { en: "Congratulations", ar: "تهنئة", tr: "Tebrikler" } },
  new_baby: { icon: "child_care", name: { en: "New baby", ar: "مولود جديد", tr: "Yeni bebek" } },
  get_well: { icon: "healing", name: { en: "Get well", ar: "تمنيات بالشفاء", tr: "Geçmiş olsun" } },
  thank_you: { icon: "volunteer_activism", name: { en: "Thank you", ar: "شكر", tr: "Teşekkürler" } },
  sorry: { icon: "sentiment_dissatisfied", name: { en: "Sorry", ar: "اعتذار", tr: "Özür" } },
  sympathy: { icon: "local_florist", name: { en: "Sympathy", ar: "مواساة", tr: "Başsağlığı" } },
  eid_ramadan: { icon: "nights_stay", name: { en: "Eid and Ramadan", ar: "العيد ورمضان", tr: "Bayram ve Ramazan" } },
  mothers_day: { icon: "family_restroom", name: { en: "Mother's Day", ar: "عيد الأم", tr: "Anneler Günü" } },
};

/**
 * 169 Yallapp's own beginnings to tap (Delivery & offers › Gifts), in each
 * language: the Leqaa demo's, and the placeholder of each language's field.
 */
export const GIFT_BEGINNINGS: readonly Words[] = [
  { en: "Happy birthday!", ar: "عيد ميلاد سعيد!", tr: "Doğum günün kutlu olsun!" },
  { en: "With all my love", ar: "مع كلِّ حبّي", tr: "Tüm sevgimle" },
  { en: "Congratulations!", ar: "تهانينا!", tr: "Tebrikler!" },
  { en: "Get well soon", ar: "أتمنى لك الشفاء العاجل", tr: "Geçmiş olsun, çabuk iyileş" },
  { en: "Eid Mubarak!", ar: "عيد مبارك!", tr: "Bayramın mübarek olsun!" },
  { en: "Thank you", ar: "شكرًا لك", tr: "Teşekkür ederim" },
];

/** 169 Yallapp's beginnings in a language (English for one it doesn't have). */
export function giftBeginningsIn(lang: string): string[] {
  return GIFT_BEGINNINGS.map((w) => (w as Record<string, string>)[lang] ?? w.en);
}

/** The starting messages: two or three per occasion. */
export const GIFT_STARTERS: Record<GiftOccasionKey, Words[]> = {
  love: [
    {
      en: "Every day with you is my favourite day. With all my love.",
      ar: "كلُّ يومٍ معكِ هو أجمل أيامي. مع كلِّ حبّي.",
      tr: "Seninle geçen her gün en sevdiğim gün. Tüm sevgimle.",
    },
    {
      en: "Just because I love you, today and always.",
      ar: "لأنني أحبك، اليوم ودائمًا.",
      tr: "Sadece seni sevdiğim için; bugün ve her zaman.",
    },
    {
      en: "You make my world bloom. Thinking of you.",
      ar: "أنتِ من تجعلين عالمي يزهر. أفكّر فيكِ.",
      tr: "Dünyamı çiçeklendiren sensin. Aklım hep sende.",
    },
  ],
  birthday: [
    {
      en: "Happy birthday! May your year be as bright as these flowers.",
      ar: "عيد ميلاد سعيد! عسى أن يكون عامك مشرقًا كهذه الزهور.",
      tr: "Doğum günün kutlu olsun! Yeni yaşın bu çiçekler kadar güzel olsun.",
    },
    {
      en: "Wishing you a wonderful birthday full of joy and laughter.",
      ar: "أتمنى لك عيد ميلاد رائعًا مليئًا بالفرح والضحك.",
      tr: "Neşe ve kahkaha dolu harika bir doğum günü dilerim.",
    },
    {
      en: "Another year, another reason to celebrate you. Happy birthday!",
      ar: "عامٌ جديد وسببٌ جديد للاحتفاء بك. عيد ميلاد سعيد!",
      tr: "Yeni bir yaş, seni kutlamak için yeni bir sebep. İyi ki doğdun!",
    },
  ],
  anniversary: [
    {
      en: "Happy anniversary! Here's to many more years together.",
      ar: "ذكرى سعيدة! وإلى سنواتٍ أخرى كثيرة معًا.",
      tr: "Yıl dönümümüz kutlu olsun! Birlikte nice yıllara.",
    },
    {
      en: "Thank you for every year by my side. I would choose you again.",
      ar: "شكرًا لكل عامٍ قضيته بجانبي. سأختارك من جديد.",
      tr: "Yanımda geçirdiğin her yıl için teşekkürler. Yine seni seçerdim.",
    },
  ],
  congratulations: [
    {
      en: "Congratulations! You worked for this, and you deserve it.",
      ar: "تهانينا! لقد اجتهدت من أجل هذا وأنت تستحقه.",
      tr: "Tebrikler! Bunun için çok çalıştın ve sonuna kadar hak ettin.",
    },
    {
      en: "So proud of you. Wishing you every success ahead.",
      ar: "فخورون بك جدًا. نتمنى لك كل النجاح في ما هو آت.",
      tr: "Seninle gurur duyuyoruz. Bundan sonrası için de bol başarılar.",
    },
  ],
  new_baby: [
    {
      en: "Welcome to the world, little one! Congratulations to the happy family.",
      ar: "أهلًا بك في الدنيا أيها الصغير! تهانينا للعائلة السعيدة.",
      tr: "Dünyaya hoş geldin minik! Mutlu aileyi tebrik ederiz.",
    },
    {
      en: "Congratulations on your new arrival. May your home be filled with joy.",
      ar: "مبارك المولود الجديد، عسى أن يملأ الفرح بيتكم.",
      tr: "Yeni bebeğiniz hayırlı olsun. Eviniz neşeyle dolsun.",
    },
  ],
  get_well: [
    {
      en: "Get well soon. Sending you warm wishes and lots of rest.",
      ar: "سلامتك، مع أطيب الأمنيات بالشفاء العاجل والراحة.",
      tr: "Geçmiş olsun. Sıcak dileklerimle, bol bol dinlen.",
    },
    {
      en: "Thinking of you and hoping you feel better every day.",
      ar: "أفكّر فيك وأتمنى أن تكون أفضل في كل يوم.",
      tr: "Aklım sende, her gün daha iyi hissetmeni diliyorum.",
    },
  ],
  thank_you: [
    {
      en: "Thank you, from the bottom of my heart.",
      ar: "شكرًا لك من أعماق قلبي.",
      tr: "Tüm kalbimle teşekkür ederim.",
    },
    {
      en: "A small thank you for your big kindness.",
      ar: "شكرٌ صغير على لطفك الكبير.",
      tr: "Büyük iyiliğin için küçük bir teşekkür.",
    },
  ],
  sorry: [
    {
      en: "I'm sorry. I hope these flowers say what words cannot.",
      ar: "أنا آسف. أرجو أن تقول هذه الزهور ما تعجز عنه الكلمات.",
      tr: "Özür dilerim. Umarım bu çiçekler kelimelerin anlatamadığını anlatır.",
    },
    {
      en: "Forgive me? You mean the world to me.",
      ar: "هل تسامحني؟ أنت تعني لي الكثير.",
      tr: "Beni affeder misin? Benim için çok değerlisin.",
    },
  ],
  sympathy: [
    {
      en: "With deepest sympathy. We are thinking of you and your family.",
      ar: "مع خالص المواساة. نحن نفكّر فيكم وفي عائلتكم.",
      tr: "Başınız sağ olsun. Sizi ve ailenizi düşünüyoruz.",
    },
    {
      en: "May fond memories bring you comfort and peace.",
      ar: "عسى أن تمنحكم الذكريات الطيبة السكينة والسلوى.",
      tr: "Güzel anılar size huzur ve teselli versin.",
    },
  ],
  eid_ramadan: [
    {
      en: "Eid Mubarak! Wishing you and your family joy and blessings.",
      ar: "عيد مبارك! أتمنى لك ولعائلتك الفرح والبركة.",
      tr: "Bayramınız mübarek olsun! Size ve ailenize mutluluk ve bereket dilerim.",
    },
    {
      en: "Ramadan Kareem. May this month bring you peace and light.",
      ar: "رمضان كريم، عسى أن يحمل لك هذا الشهر السكينة والنور.",
      tr: "Hayırlı Ramazanlar. Bu ay size huzur ve aydınlık getirsin.",
    },
  ],
  mothers_day: [
    {
      en: "Happy Mother's Day to the one who taught me what love is.",
      ar: "عيد أم سعيد لمن علّمتني معنى الحب.",
      tr: "Bana sevgiyi öğreten kişiye: Anneler Günün kutlu olsun.",
    },
    {
      en: "For everything you do, every day. Thank you, Mum.",
      ar: "على كل ما تفعلينه في كل يوم، شكرًا يا أمي.",
      tr: "Her gün yaptığın her şey için teşekkürler anneciğim.",
    },
  ],
};
