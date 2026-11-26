import type { CmLang } from "./words";

/**
 * 231 The Community's privacy policy and its account-deletion pages, in
 * English, Arabic (MSA) and Turkish. Built on Yallapp's own privacy policy
 * (src/content/legal.ts: same company, same order and tone) and limited to
 * what the Community's code keeps: docs/community/privacy-answers.md.
 * {email} is the contact address of the main site's policy; {delete} the
 * web deletion page.
 */

export type PrivacySection = { h: string; p?: string[]; li?: string[] };

export type PrivacyText = {
  title: string;
  description: string;
  updated: string;
  updatedLabel: string;
  prevails: string;
  englishVersion: string;
  sections: PrivacySection[];
};

export const CM_PRIVACY_UPDATED = "2026-11-26";

const en: PrivacyText = {
  title: "Privacy policy",
  description: "What Yallapp Community keeps about you, why, and how to delete your account.",
  updated: "26 November 2026",
  updatedLabel: "Last updated",
  prevails: "",
  englishVersion: "",
  sections: [
    {
      h: "1. Who we are",
      p: [
        "Yallapp Community (community.yallapp.com.tr and the Yallapp Community app) is run by Yallapp, based in Cairo, Egypt. Yallapp is the data controller for the personal data described here. We follow the data protection laws that apply to it: Egypt's Personal Data Protection Law (Law No. 151 of 2020), and, where they apply, the EU General Data Protection Regulation (GDPR) and the Turkish Personal Data Protection Law No. 6698 (KVKK). Contact: {email}.",
        "This policy covers only the Community. Your Yallapp account on yallapp.com.tr, if you have one, is covered by Yallapp's own privacy policy.",
      ],
    },
    {
      h: "2. Data we keep",
      li: [
        "Account: your email address, your name and username, and your member id. If you join with email, a securely hashed password (never the password itself). If you continue with Apple or Google, the id that Apple or Google gives us for you; Apple may give us a private relay address instead of your email.",
        "Profile: your profile picture, and the bio, headline, skills and links you choose to add.",
        "What you post and do: your questions, answers, replies and votes, and your bookmarks, follows, friends, blocks and reports.",
        "Gold badge proof: if you apply for the Gold (Pro Developer) badge, the proof of identity you upload (a photo or PDF), your full name and your portfolio links. Only the Community's admins can see them, to decide on your request. The proof is deleted 30 days after the decision.",
        "Linked Yallapp account: if you link one, which account it is and its apps, to show your apps and give the Gold and Green badges.",
        "Signed-in devices: for each sign-in, the device's name and platform (such as \"iPhone\" or \"Android phone\") and when it was last used, so you can see your devices and sign one out. We don't store your IP address with them.",
        "Settings: your language, your theme and which emails you want from the Community.",
      ],
    },
    {
      h: "3. What we don't collect",
      li: [
        "No tracking, analytics or advertising: there are no analytics, crash-reporting or advertising tools on the website or in the app, and nothing tracks you across other apps or websites.",
        "No payments: nothing in the Community is paid, and every tutorial is free. We keep no card or billing details.",
        "No location, contacts, calendar, health or financial data, and no search history (searches are answered, not kept with your account).",
      ],
    },
    {
      h: "4. Why we use your data, and our legal basis",
      li: [
        "To run your account and the Community: signing in, your profile, posting, following and notifications (performance of a contract).",
        "To keep the Community safe: reports, moderation, spam filtering and blocking (legitimate interests).",
        "To check a Gold badge request (your consent, given when you apply).",
        "To send the emails you choose in Settings, and the emails your account needs, such as confirming your address and resetting your password (performance of a contract).",
      ],
    },
    {
      h: "5. Who can see it",
      p: [
        "Your profile, your questions and answers, and your badges are public. Your email address, devices, settings, bookmarks, blocks and reports are not shown to other members. Your Gold badge proof is seen only by the Community's admins.",
      ],
    },
    {
      h: "6. Who we share it with",
      p: [
        "We share data only with the providers that help us run the Community: hosting (webek.org) for the website, the database and files, and our email server for the Community's emails. When you choose to continue with Apple or Google, they confirm your sign-in to us. We may also share data with professional advisers or authorities when the law requires it. We never sell personal data.",
      ],
    },
    {
      h: "7. How long we keep it",
      p: [
        "We keep your account while it is active. When you delete it, your profile, picture, follows, friends, blocks, bookmarks, settings and signed-in devices are deleted at once. The Gold badge proof is deleted 30 days after the decision on your request, or with your account if that comes first.",
      ],
    },
    {
      h: "8. Deleting your account",
      li: [
        "In the app: Settings → Delete account.",
        "On the website: sign in and open {delete}, or Settings → Delete account.",
        "Your account is deleted at once and can't be restored. Your questions and answers stay, so that conversations still make sense, and are shown as from \"Deleted member\", without your name or picture.",
      ],
    },
    {
      h: "9. Your rights",
      p: [
        "You can ask to access, correct or delete your data, restrict or object to how we use it, and receive a copy in a portable format. Where the GDPR or KVKK (Article 11) apply, they give you these rights. We reply within one month. Email {email}.",
      ],
    },
    {
      h: "10. Cookies",
      p: [
        "We use only the cookies needed to keep you signed in, and one that remembers the language you choose. We don't use advertising or tracking cookies.",
      ],
    },
    {
      h: "11. Changes and contact",
      p: ["We will post changes here, with a new date above. Questions: {email}."],
    },
  ],
};

const ar: PrivacyText = {
  title: "سياسة الخصوصية",
  description: "ما يحتفظ به مجتمع Yallapp من بياناتك، ولماذا، وكيف تحذف حسابك.",
  updated: "26 نوفمبر 2026",
  updatedLabel: "آخر تحديث",
  prevails: "هذه ترجمة. عند أي اختلاف يُعتمد النص الإنجليزي.",
  englishVersion: "النسخة الإنجليزية",
  sections: [
    {
      h: "1. من نحن",
      p: [
        "يُدار مجتمع Yallapp (موقع community.yallapp.com.tr وتطبيق Yallapp Community) من قِبل Yallapp، ومقرها القاهرة، مصر. وYallapp هي المسؤولة عن البيانات الشخصية الموضحة هنا. ونلتزم بقوانين حماية البيانات التي تنطبق عليها: قانون حماية البيانات الشخصية المصري (القانون رقم 151 لسنة 2020)، وحيثما انطبقت، اللائحة العامة لحماية البيانات في الاتحاد الأوروبي (GDPR) وقانون حماية البيانات الشخصية التركي رقم 6698 (KVKK). للتواصل: {email}.",
        "تغطي هذه السياسة المجتمع وحده. أما حسابك في Yallapp على yallapp.com.tr، إن كان لديك حساب، فتغطيه سياسة الخصوصية الخاصة بـYallapp.",
      ],
    },
    {
      h: "2. البيانات التي نحتفظ بها",
      li: [
        "الحساب: بريدك الإلكتروني واسمك واسم المستخدم ومعرّف العضوية. إن انضممت بالبريد الإلكتروني، فكلمة مرور مشفّرة تشفيرًا آمنًا (لا كلمة المرور نفسها). وإن تابعت عبر Apple أو Google، فالمعرّف الذي تعطينا إياه Apple أو Google؛ وقد تعطينا Apple عنوان ترحيل خاصًا بدلًا من بريدك.",
        "الملف الشخصي: صورتك، والنبذة والعنوان والمهارات والروابط التي تختار إضافتها.",
        "ما تنشره وتفعله: أسئلتك وإجاباتك وردودك وتصويتاتك، ومحفوظاتك ومتابعاتك وأصدقاؤك ومن حظرتهم وبلاغاتك.",
        "إثبات الشارة الذهبية: إن تقدّمت بطلب الشارة الذهبية (مطوّر محترف)، فإثبات الهوية الذي ترفعه (صورة أو ملف PDF) واسمك الكامل وروابط أعمالك. لا يراها إلا مشرفو المجتمع للبتّ في طلبك. ويُحذف الإثبات بعد 30 يومًا من القرار.",
        "حساب Yallapp المرتبط: إن ربطت حسابًا، فأيّ حساب هو وتطبيقاته، لعرض تطبيقاتك ومنح الشارتين الذهبية والخضراء.",
        "الأجهزة المسجّل دخولها: لكل تسجيل دخول، اسم الجهاز ونظامه (مثل \"iPhone\" أو \"هاتف Android\") وآخر استخدام له، لترى أجهزتك وتسجّل الخروج من أيّ منها. ولا نحفظ عنوان IP الخاص بك معها.",
        "الإعدادات: لغتك ومظهر العرض والرسائل التي تريدها من المجتمع.",
      ],
    },
    {
      h: "3. ما لا نجمعه",
      li: [
        "لا تتبّع ولا تحليلات ولا إعلانات: لا توجد أدوات تحليلات أو تقارير أعطال أو إعلانات في الموقع أو التطبيق، ولا شيء يتتبّعك عبر تطبيقات أو مواقع أخرى.",
        "لا مدفوعات: لا شيء في المجتمع مدفوع، وكل الدروس مجانية. ولا نحتفظ بأي بيانات بطاقات أو فواتير.",
        "لا موقع جغرافي ولا جهات اتصال ولا تقويم ولا بيانات صحية أو مالية، ولا سجل بحث (يُجاب عن البحث ولا يُحفظ مع حسابك).",
      ],
    },
    {
      h: "4. لماذا نستخدم بياناتك، وأساسنا القانوني",
      li: [
        "لتشغيل حسابك والمجتمع: تسجيل الدخول وملفك الشخصي والنشر والمتابعة والإشعارات (تنفيذ عقد).",
        "للحفاظ على أمان المجتمع: البلاغات والإشراف وتصفية الرسائل المزعجة والحظر (المصالح المشروعة).",
        "لمراجعة طلب الشارة الذهبية (موافقتك عند التقديم).",
        "لإرسال الرسائل التي تختارها في الإعدادات، والرسائل التي يحتاجها حسابك مثل تأكيد بريدك وإعادة تعيين كلمة المرور (تنفيذ عقد).",
      ],
    },
    {
      h: "5. من يمكنه رؤيتها",
      p: [
        "ملفك الشخصي وأسئلتك وإجاباتك وشاراتك علنية. أما بريدك وأجهزتك وإعداداتك ومحفوظاتك ومن حظرتهم وبلاغاتك فلا تظهر للأعضاء الآخرين. ولا يرى إثبات الشارة الذهبية إلا مشرفو المجتمع.",
      ],
    },
    {
      h: "6. مع من نشاركها",
      p: [
        "لا نشارك البيانات إلا مع مقدّمي الخدمات الذين يساعدوننا في تشغيل المجتمع: الاستضافة (webek.org) للموقع وقاعدة البيانات والملفات، وخادم البريد الخاص بنا لرسائل المجتمع. وعندما تختار المتابعة عبر Apple أو Google، فإنهما يؤكّدان لنا تسجيل دخولك. وقد نشارك البيانات مع المستشارين المهنيين أو الجهات الرسمية حين يقتضي القانون ذلك. ولا نبيع البيانات الشخصية أبدًا.",
      ],
    },
    {
      h: "7. مدة الاحتفاظ بها",
      p: [
        "نحتفظ بحسابك ما دام نشطًا. وعند حذفه، تُحذف فورًا ملفك الشخصي وصورتك ومتابعاتك وأصدقاؤك ومن حظرتهم ومحفوظاتك وإعداداتك وأجهزتك المسجّل دخولها. ويُحذف إثبات الشارة الذهبية بعد 30 يومًا من القرار في طلبك، أو مع حسابك إن حُذف قبل ذلك.",
      ],
    },
    {
      h: "8. حذف حسابك",
      li: [
        "في التطبيق: الإعدادات ← حذف الحساب.",
        "على الموقع: سجّل الدخول وافتح {delete}، أو الإعدادات ← حذف الحساب.",
        "يُحذف حسابك فورًا ولا يمكن استعادته. وتبقى أسئلتك وإجاباتك حتى تظل المحادثات مفهومة، وتظهر على أنها من \"عضو محذوف\"، دون اسمك أو صورتك.",
      ],
    },
    {
      h: "9. حقوقك",
      p: [
        "يمكنك أن تطلب الاطلاع على بياناتك أو تصحيحها أو حذفها، أو تقييد استخدامنا لها أو الاعتراض عليه، والحصول على نسخة منها بصيغة قابلة للنقل. وحيثما انطبقت اللائحة العامة لحماية البيانات أو قانون KVKK (المادة 11)، فإنهما يمنحانك هذه الحقوق. نردّ خلال شهر واحد. راسلنا على {email}.",
      ],
    },
    {
      h: "10. ملفات تعريف الارتباط",
      p: [
        "لا نستخدم إلا ملفات تعريف الارتباط اللازمة لإبقائك مسجّل الدخول، وملفًا واحدًا يتذكّر اللغة التي تختارها. ولا نستخدم ملفات تعريف ارتباط إعلانية أو للتتبّع.",
      ],
    },
    {
      h: "11. التغييرات والتواصل",
      p: ["سننشر أي تغييرات هنا مع تاريخ جديد في الأعلى. للأسئلة: {email}."],
    },
  ],
};

const tr: PrivacyText = {
  title: "Gizlilik politikası",
  description: "Yallapp Community'nin senin hakkında ne tuttuğu, neden tuttuğu ve hesabını nasıl sileceğin.",
  updated: "26 Kasım 2026",
  updatedLabel: "Son güncelleme",
  prevails: "Bu bir çeviridir. Herhangi bir farklılıkta İngilizce metin geçerlidir.",
  englishVersion: "İngilizce sürüm",
  sections: [
    {
      h: "1. Biz kimiz",
      p: [
        "Yallapp Community (community.yallapp.com.tr ve Yallapp Community uygulaması), merkezi Kahire, Mısır'da bulunan Yallapp tarafından işletilir. Burada açıklanan kişisel verilerin veri sorumlusu Yallapp'tır. Bu verilere uygulanan veri koruma yasalarına uyarız: Mısır Kişisel Verilerin Korunması Kanunu (2020 tarihli 151 sayılı Kanun) ve uygulandığı durumlarda AB Genel Veri Koruma Tüzüğü (GDPR) ile 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK). İletişim: {email}.",
        "Bu politika yalnızca Community'yi kapsar. yallapp.com.tr'deki Yallapp hesabın, varsa, Yallapp'ın kendi gizlilik politikası kapsamındadır.",
      ],
    },
    {
      h: "2. Tuttuğumuz veriler",
      li: [
        "Hesap: e-posta adresin, adın ve kullanıcı adın, üye kimliğin. E-postayla katılırsan güvenli biçimde karma (hash) yapılmış bir parola (parolanın kendisi değil). Apple veya Google ile devam edersen Apple'ın veya Google'ın bize senin için verdiği kimlik; Apple e-postan yerine özel bir aktarma adresi verebilir.",
        "Profil: profil fotoğrafın ve eklemeyi seçtiğin biyografi, başlık, beceriler ve bağlantılar.",
        "Paylaştıkların ve yaptıkların: soruların, cevapların, yanıtların ve oyların; kaydettiklerin, takip ettiklerin, arkadaşların, engellediklerin ve bildirimlerin.",
        "Altın rozet kanıtı: Altın (Pro Geliştirici) rozetine başvurursan yüklediğin kimlik kanıtı (fotoğraf veya PDF), tam adın ve portföy bağlantıların. Bunları yalnızca Community yöneticileri, başvurunla ilgili karar vermek için görebilir. Kanıt, karardan 30 gün sonra silinir.",
        "Bağlı Yallapp hesabı: bir hesap bağlarsan hangi hesap olduğu ve uygulamaları; uygulamalarını göstermek ve Altın ile Yeşil rozetleri vermek için.",
        "Oturum açılmış cihazlar: her oturum açmada cihazın adı ve platformu (\"iPhone\" veya \"Android telefon\" gibi) ve en son ne zaman kullanıldığı; cihazlarını görebilmen ve birinden çıkış yapabilmen için. Bunlarla birlikte IP adresini saklamayız.",
        "Ayarlar: dilin, temanı ve Community'den hangi e-postaları istediğin.",
      ],
    },
    {
      h: "3. Toplamadıklarımız",
      li: [
        "İzleme, analiz ve reklam yok: web sitesinde ve uygulamada analiz, hata raporlama veya reklam aracı yoktur ve hiçbir şey seni başka uygulamalar ya da web siteleri arasında izlemez.",
        "Ödeme yok: Community'de hiçbir şey ücretli değildir ve tüm eğitimler ücretsizdir. Hiçbir kart veya fatura bilgisi tutmayız.",
        "Konum, kişiler, takvim, sağlık veya finans verisi ve arama geçmişi yok (aramalar yanıtlanır, hesabınla birlikte saklanmaz).",
      ],
    },
    {
      h: "4. Verilerini neden kullanıyoruz ve hukuki dayanağımız",
      li: [
        "Hesabını ve Community'yi çalıştırmak için: oturum açma, profilin, paylaşım, takip ve bildirimler (sözleşmenin ifası).",
        "Community'yi güvende tutmak için: bildirimler, moderasyon, spam filtreleme ve engelleme (meşru menfaat).",
        "Altın rozet başvurusunu incelemek için (başvururken verdiğin açık rıza).",
        "Ayarlarda seçtiğin e-postaları ve adresini doğrulama, parolanı sıfırlama gibi hesabının gerektirdiği e-postaları göndermek için (sözleşmenin ifası).",
      ],
    },
    {
      h: "5. Kimler görebilir",
      p: [
        "Profilin, soruların ve cevapların ile rozetlerin herkese açıktır. E-posta adresin, cihazların, ayarların, kaydettiklerin, engellediklerin ve bildirimlerin diğer üyelere gösterilmez. Altın rozet kanıtını yalnızca Community yöneticileri görür.",
      ],
    },
    {
      h: "6. Kimlerle paylaşıyoruz",
      p: [
        "Verileri yalnızca Community'yi çalıştırmamıza yardım eden hizmet sağlayıcılarla paylaşırız: web sitesi, veritabanı ve dosyalar için barındırma (webek.org) ve Community e-postaları için kendi e-posta sunucumuz. Apple veya Google ile devam etmeyi seçtiğinde oturum açmanı bize onlar doğrular. Yasa gerektirdiğinde verileri profesyonel danışmanlarla veya yetkili makamlarla da paylaşabiliriz. Kişisel verileri asla satmayız.",
      ],
    },
    {
      h: "7. Ne kadar süre saklıyoruz",
      p: [
        "Hesabını etkin olduğu sürece saklarız. Hesabını sildiğinde profilin, fotoğrafın, takiplerin, arkadaşların, engellediklerin, kaydettiklerin, ayarların ve oturum açılmış cihazların hemen silinir. Altın rozet kanıtı başvurunla ilgili karardan 30 gün sonra ya da daha önce olursa hesabınla birlikte silinir.",
      ],
    },
    {
      h: "8. Hesabını silmek",
      li: [
        "Uygulamada: Ayarlar → Hesabı sil.",
        "Web sitesinde: oturum aç ve {delete} sayfasını aç ya da Ayarlar → Hesabı sil.",
        "Hesabın hemen silinir ve geri getirilemez. Konuşmaların anlamını yitirmemesi için soruların ve cevapların kalır; adın veya fotoğrafın olmadan \"Silinmiş üye\" tarafından yazılmış olarak gösterilir.",
      ],
    },
    {
      h: "9. Hakların",
      p: [
        "Verilerine erişmeyi, onları düzeltmeyi veya silmeyi, kullanımımızı kısıtlamayı ya da itiraz etmeyi ve taşınabilir bir biçimde bir kopyasını almayı isteyebilirsin. GDPR veya KVKK (11. madde) uygulandığında bu hakları sana onlar tanır. Bir ay içinde yanıt veririz. E-posta: {email}.",
      ],
    },
    {
      h: "10. Çerezler",
      p: [
        "Yalnızca oturumunu açık tutmak için gereken çerezleri ve seçtiğin dili hatırlayan bir çerezi kullanırız. Reklam veya izleme çerezi kullanmayız.",
      ],
    },
    {
      h: "11. Değişiklikler ve iletişim",
      p: ["Değişiklikleri burada, yukarıda yeni bir tarihle yayınlarız. Sorular için: {email}."],
    },
  ],
};

export const CM_PRIVACY: Record<CmLang, PrivacyText> = { en, ar, tr };

/** The account-deletion pages: the public explanation, the signed-in form and the done page. */
export type DeleteText = {
  publicTitle: string;
  publicDescription: string;
  publicIntro: string;
  withApp: string;
  withAppSteps: string;
  withoutApp: string;
  withoutAppSteps: string;
  noAccess: string;
  whatGoes: string;
  goes: string[];
  stays: string;
  start: string;
  formTitle: string;
  formIntro: string;
  password: string;
  typeDelete: string;
  typeDeleteHint: string;
  freshSignIn: string;
  signInAgain: string;
  submit: string;
  cancel: string;
  errorPassword: string;
  errorConfirm: string;
  errorFresh: string;
  errorGeneric: string;
  doneTitle: string;
  doneText: string;
  home: string;
  privacy: string;
  agreeBefore: string;
  agreeLink: string;
  agreeAfter: string;
};

const deleteEn: DeleteText = {
  publicTitle: "Delete your Yallapp Community account",
  publicDescription: "How to delete your Yallapp Community account and what happens to your data, with or without the app.",
  publicIntro: "You can delete your Yallapp Community account at any time, in the app or on this website.",
  withApp: "In the app",
  withAppSteps: "Open the Yallapp Community app, go to Settings and tap Delete account.",
  withoutApp: "Without the app",
  withoutAppSteps: "Sign in on this website, open Settings and choose Delete account, or use the button below.",
  noAccess: "Can't sign in any more? Email {email} from your account's address and we'll delete it for you.",
  whatGoes: "What gets deleted",
  goes: [
    "Your profile, name, username and picture",
    "Your follows, friends, blocks and bookmarks",
    "Your settings, signed-in devices and linked Yallapp account",
    "Any Gold badge proof you sent",
  ],
  stays: "Your questions and answers stay, so conversations still make sense, shown as from \"Deleted member\", without your name or picture. Deleting is immediate and can't be undone.",
  start: "Delete my account",
  formTitle: "Delete account",
  formIntro: "This deletes your account at once. It can't be undone.",
  password: "Your password",
  typeDelete: "Type DELETE to confirm",
  typeDeleteHint: "In capital letters.",
  freshSignIn: "You signed in with {provider}. To make sure it's you, sign in with {provider} again just before deleting.",
  signInAgain: "Sign in again",
  submit: "Delete my account",
  cancel: "Cancel",
  errorPassword: "That password isn't right.",
  errorConfirm: "Type DELETE to confirm.",
  errorFresh: "Please sign in again first.",
  errorGeneric: "Something went wrong. Please try again.",
  doneTitle: "Your account is deleted",
  doneText: "Your Yallapp Community account and its data are gone, and you're signed out on this browser. Thank you for being part of the community.",
  home: "Back to the Community",
  privacy: "Privacy",
  agreeBefore: "By joining you agree to the community's rules (be kind, stay on topic, no spam) and our ",
  agreeLink: "privacy policy",
  agreeAfter: ".",
};

const deleteAr: DeleteText = {
  publicTitle: "حذف حسابك في مجتمع Yallapp",
  publicDescription: "كيف تحذف حسابك في مجتمع Yallapp وما يحدث لبياناتك، بالتطبيق أو بدونه.",
  publicIntro: "يمكنك حذف حسابك في مجتمع Yallapp في أي وقت، من التطبيق أو من هذا الموقع.",
  withApp: "من التطبيق",
  withAppSteps: "افتح تطبيق Yallapp Community، وانتقل إلى الإعدادات، ثم اضغط حذف الحساب.",
  withoutApp: "بدون التطبيق",
  withoutAppSteps: "سجّل الدخول إلى هذا الموقع، وافتح الإعدادات واختر حذف الحساب، أو استخدم الزر أدناه.",
  noAccess: "لم تعد تستطيع تسجيل الدخول؟ راسلنا على {email} من عنوان بريد حسابك وسنحذفه لك.",
  whatGoes: "ما الذي يُحذف",
  goes: [
    "ملفك الشخصي واسمك واسم المستخدم وصورتك",
    "متابعاتك وأصدقاؤك ومن حظرتهم ومحفوظاتك",
    "إعداداتك وأجهزتك المسجّل دخولها وحساب Yallapp المرتبط",
    "أي إثبات أرسلته للشارة الذهبية",
  ],
  stays: "تبقى أسئلتك وإجاباتك حتى تظل المحادثات مفهومة، وتظهر على أنها من \"عضو محذوف\"، دون اسمك أو صورتك. الحذف فوري ولا يمكن التراجع عنه.",
  start: "احذف حسابي",
  formTitle: "حذف الحساب",
  formIntro: "سيُحذف حسابك فورًا. ولا يمكن التراجع عن ذلك.",
  password: "كلمة المرور",
  typeDelete: "اكتب DELETE للتأكيد",
  typeDeleteHint: "بالأحرف الإنجليزية الكبيرة.",
  freshSignIn: "سجّلت الدخول عبر {provider}. للتأكد من أنك أنت، سجّل الدخول عبر {provider} مرة أخرى قبل الحذف مباشرة.",
  signInAgain: "سجّل الدخول مرة أخرى",
  submit: "احذف حسابي",
  cancel: "إلغاء",
  errorPassword: "كلمة المرور غير صحيحة.",
  errorConfirm: "اكتب DELETE للتأكيد.",
  errorFresh: "يُرجى تسجيل الدخول مرة أخرى أولًا.",
  errorGeneric: "حدث خطأ ما. يُرجى المحاولة مرة أخرى.",
  doneTitle: "حُذف حسابك",
  doneText: "حُذف حسابك في مجتمع Yallapp وبياناته، وسُجّل خروجك من هذا المتصفح. شكرًا لكونك جزءًا من المجتمع.",
  home: "العودة إلى المجتمع",
  privacy: "الخصوصية",
  agreeBefore: "بانضمامك توافق على قواعد المجتمع (كن لطيفًا، والتزم بالموضوع، ولا رسائل مزعجة) وعلى ",
  agreeLink: "سياسة الخصوصية",
  agreeAfter: ".",
};

const deleteTr: DeleteText = {
  publicTitle: "Yallapp Community hesabını sil",
  publicDescription: "Yallapp Community hesabını uygulamayla veya uygulama olmadan nasıl sileceğin ve verilerine ne olacağı.",
  publicIntro: "Yallapp Community hesabını istediğin zaman uygulamadan veya bu web sitesinden silebilirsin.",
  withApp: "Uygulamada",
  withAppSteps: "Yallapp Community uygulamasını aç, Ayarlar'a git ve Hesabı sil'e dokun.",
  withoutApp: "Uygulama olmadan",
  withoutAppSteps: "Bu web sitesinde oturum aç, Ayarlar'ı açıp Hesabı sil'i seç ya da aşağıdaki düğmeyi kullan.",
  noAccess: "Artık oturum açamıyor musun? Hesabının adresinden {email} adresine yaz, hesabını senin için silelim.",
  whatGoes: "Neler silinir",
  goes: [
    "Profilin, adın, kullanıcı adın ve fotoğrafın",
    "Takiplerin, arkadaşların, engellediklerin ve kaydettiklerin",
    "Ayarların, oturum açılmış cihazların ve bağlı Yallapp hesabın",
    "Altın rozet için gönderdiğin kanıt",
  ],
  stays: "Konuşmaların anlamını yitirmemesi için soruların ve cevapların kalır; adın veya fotoğrafın olmadan \"Silinmiş üye\" tarafından yazılmış olarak gösterilir. Silme işlemi hemen yapılır ve geri alınamaz.",
  start: "Hesabımı sil",
  formTitle: "Hesabı sil",
  formIntro: "Bu, hesabını hemen siler. Geri alınamaz.",
  password: "Parolan",
  typeDelete: "Onaylamak için DELETE yaz",
  typeDeleteHint: "Büyük harflerle.",
  freshSignIn: "{provider} ile oturum açtın. Sen olduğundan emin olmak için silmeden hemen önce {provider} ile yeniden oturum aç.",
  signInAgain: "Yeniden oturum aç",
  submit: "Hesabımı sil",
  cancel: "Vazgeç",
  errorPassword: "Parola doğru değil.",
  errorConfirm: "Onaylamak için DELETE yaz.",
  errorFresh: "Lütfen önce yeniden oturum aç.",
  errorGeneric: "Bir şeyler ters gitti. Lütfen yeniden dene.",
  doneTitle: "Hesabın silindi",
  doneText: "Yallapp Community hesabın ve verilerin silindi; bu tarayıcıda oturumun kapatıldı. Topluluğun bir parçası olduğun için teşekkürler.",
  home: "Community'ye dön",
  privacy: "Gizlilik",
  agreeBefore: "Katılarak topluluk kurallarını (nazik ol, konuda kal, spam yapma) ve ",
  agreeLink: "gizlilik politikamızı",
  agreeAfter: " kabul edersin.",
};

export const CM_DELETE: Record<CmLang, DeleteText> = { en: deleteEn, ar: deleteAr, tr: deleteTr };
