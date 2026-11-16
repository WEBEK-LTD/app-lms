import type { Strings } from "../types";

/**
 * 132.50–132.99 Studio's finishing touches: the account menu on Studio's bar
 * and the account's pages in Studio's frame, the editor's save shortcut, its
 * phone QR code and its confirmations, the search of each tab, the overview's
 * first steps, and the notices that say what is really the case.
 */
export const en = {
  // 132.51 The account menu on Studio's dark bar.
  accountMenu: "Your account, team and language",
  // 132.50 Your account and Team in Studio's frame.
  accountPages: "Your account and team",
  // 132.53 Ctrl+S with nothing left to save.
  allSaved: "Everything is saved",
  // 132.54
  publishFailed: "Not published: the connection dropped. Check it and press Publish again.",
  // 132.55
  deleteTemplateConfirm: "Delete your template {name}? It can't be brought back.",
  deleteDesignConfirm: "Delete your design {name}? It can't be brought back.",
  deleteTemplateFailed: "It couldn't be deleted. Check your connection and try again.",
  // 132.56 The search box of each tab of the editor.
  searchSections: "Search the ready sections",
  searchTemplates: "Search the templates",
  searchPictures: "Search your pictures",
  // 132.59 Notifications before the app has a plan.
  notifyNotActive: "This app isn't activated yet, so notifications aren't sent. They go out once its plan is active.",
  seePlan: "See its plan",
  // 132.61 The editor's QR code for the phone.
  phoneButton: "Open on my phone",
  phoneTitle: "Scan it with your phone's camera",
  phoneText: "Your app opens with the draft saved here. The code works for an hour; open the editor again for a new one.",
  // 132.62 The overview's steps before publishing.
  checkPublish: "Publish your design from the editor",
  // 132.63 Analytics before the app has a plan.
  keptNoteNoPlan: "Until it has a plan, this app keeps daily totals for {kept} and single events (each app open, screen or search) for {days}, so this page goes back to {from} at most.",
  keptNoteForeverNoPlan: "Until it has a plan, this app keeps daily totals until it's deleted, and single events (each app open, screen or search) for {days}.",
} as const;

type Messages = Strings<typeof en>;

export const ar: Messages = {
  accountMenu: "حسابك وفريقك واللغة",
  accountPages: "حسابك وفريقك",
  allSaved: "كل حاجة متحفظة",
  publishFailed: "ما اتنشرش: النت فصل. اتأكد منه ودوس نشر تاني.",
  deleteTemplateConfirm: "تمسح القالب بتاعك {name}؟ مش هتقدر ترجّعه.",
  deleteDesignConfirm: "تمسح التصميم بتاعك {name}؟ مش هتقدر ترجّعه.",
  deleteTemplateFailed: "ما اتمسحش. اتأكد من النت وجرّب تاني.",
  searchSections: "دوّر في الأقسام الجاهزة",
  searchTemplates: "دوّر في القوالب",
  searchPictures: "دوّر في صورك",
  notifyNotActive: "التطبيق ده لسه ما اتفعّلش، فالإشعارات مش هتتبعت. هتتبعت أول ما باقته تشتغل.",
  seePlan: "شوف باقته",
  phoneButton: "افتحه على تليفوني",
  phoneTitle: "صوّره بكاميرا تليفونك",
  phoneText: "تطبيقك هيفتح بالمسودة اللي اتحفظت هنا. الكود شغال ساعة؛ افتح المحرر تاني عشان تاخد كود جديد.",
  checkPublish: "انشر تصميمك من المحرر",
  keptNoteNoPlan: "لحد ما يبقى له باقة، التطبيق ده بيحتفظ بالمجاميع اليومية لمدة {kept} وبالأحداث المفردة (كل فتحة للتطبيق أو شاشة أو بحث) لمدة {days}، فالصفحة دي مش هترجع لقبل {from}.",
  keptNoteForeverNoPlan: "لحد ما يبقى له باقة، التطبيق ده بيحتفظ بالمجاميع اليومية لحد ما يتمسح، وبالأحداث المفردة (كل فتحة للتطبيق أو شاشة أو بحث) لمدة {days}.",
};

export const tr: Messages = {
  accountMenu: "Hesabınız, ekibiniz ve dil",
  accountPages: "Hesabınız ve ekibiniz",
  allSaved: "Her şey kaydedildi",
  publishFailed: "Yayınlanmadı: bağlantı koptu. Bağlantınızı kontrol edip Yayınla'ya yeniden basın.",
  deleteTemplateConfirm: "{name} şablonunuz silinsin mi? Geri getirilemez.",
  deleteDesignConfirm: "{name} tasarımınız silinsin mi? Geri getirilemez.",
  deleteTemplateFailed: "Silinemedi. Bağlantınızı kontrol edip yeniden deneyin.",
  searchSections: "Hazır bölümlerde ara",
  searchTemplates: "Şablonlarda ara",
  searchPictures: "Resimlerinizde ara",
  notifyNotActive: "Bu uygulama henüz etkinleştirilmedi, bu yüzden bildirimler gönderilmiyor. Paketi etkin olunca gönderilir.",
  seePlan: "Paketine bakın",
  phoneButton: "Telefonumda aç",
  phoneTitle: "Telefonunuzun kamerasıyla okutun",
  phoneText: "Uygulamanız burada kaydedilen taslakla açılır. Kod bir saat geçerlidir; yenisi için düzenleyiciyi yeniden açın.",
  checkPublish: "Tasarımınızı düzenleyiciden yayınlayın",
  keptNoteNoPlan: "Bir paketi olana kadar bu uygulama günlük toplamları {kept}, tek tek olayları (her açılış, ekran veya arama) {days} saklar; bu yüzden bu sayfa en fazla {from} tarihine kadar geri gider.",
  keptNoteForeverNoPlan: "Bir paketi olana kadar bu uygulama günlük toplamları silinene kadar, tek tek olayları (her açılış, ekran veya arama) {days} saklar.",
};
