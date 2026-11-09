import type { Strings } from "../types";

/** 110.2 Sample entries: their badge, the banner above a list that has them, the question after the first own entry and the stores' guard; the app's overview with all of them (templates = demos). */
export const en = {
  badge: "Sample",
  banner: "{count, plural, one {You have {count} sample entry.} other {You have {count} sample entries.}}",
  bannerText: "We added them so your app looks ready. Edit one and it becomes yours. Your app can't go to the stores while any are left.",
  removeAll: "Remove all samples",
  askTitle: "Remove the samples now?",
  askText: "You added your first own entry, and the sample entries are still in this list.",
  askYes: "Yes, remove them",
  askNo: "No, keep them for now",
  removed: "{count, plural, =0 {There were no sample entries to remove.} one {Removed {count} sample entry and its pictures.} other {Removed {count} sample entries and their pictures.}}",
  stores: "Your app still has sample entries ({count}). Remove them, or edit them to make them yours, before it goes to the stores. <link>See the sample entries</link>",
  allTitle: "{count, plural, one {Your app has {count} sample entry.} other {Your app has {count} sample entries.}}",
  allText: "They show your app the way our demo looks. Edit one and it becomes yours, or remove them all at once.",
  removeEverything: "Remove all sample data",
  seeThem: "See them",
  known: {
    blocked: "Sample entries left: {count}. Remove them, or edit them to make them yours, before your app goes to the stores.",
  },
} as const;

export const ar: Strings<typeof en> = {
  badge: "تجريبي",
  banner: "{count, plural, one {لديك إدخال تجريبي واحد.} two {لديك إدخالان تجريبيان.} other {لديك {count} من الإدخالات التجريبية.}}",
  bannerText: "أضفناها ليبدو تطبيقك جاهزًا. عدّل أيًّا منها ليصبح ملكك. ولا يمكن إرسال تطبيقك إلى المتاجر ما دام فيه شيء منها.",
  removeAll: "إزالة كل الإدخالات التجريبية",
  askTitle: "هل تريد إزالة الإدخالات التجريبية الآن؟",
  askText: "أضفت أول إدخال خاص بك، وما زالت الإدخالات التجريبية في هذه القائمة.",
  askYes: "نعم، أزلها",
  askNo: "لا، أبقِها الآن",
  removed: "{count, plural, =0 {لم تكن هناك إدخالات تجريبية لإزالتها.} one {أُزيل إدخال تجريبي واحد مع صوره.} two {أُزيل إدخالان تجريبيان مع صورهما.} other {عدد الإدخالات التجريبية التي أُزيلت مع صورها: {count}.}}",
  stores: "ما زال في تطبيقك إدخالات تجريبية ({count}). أزلها أو عدّلها لتصبح ملكك قبل إرساله إلى المتاجر. <link>عرض الإدخالات التجريبية</link>",
  allTitle: "{count, plural, one {في تطبيقك إدخال تجريبي واحد.} two {في تطبيقك إدخالان تجريبيان.} other {في تطبيقك {count} من الإدخالات التجريبية.}}",
  allText: "تُظهر تطبيقك كما يبدو في العرض التجريبي لدينا. عدّل أيًّا منها ليصبح ملكك، أو أزلها كلها دفعة واحدة.",
  removeEverything: "إزالة كل البيانات التجريبية",
  seeThem: "عرضها",
  known: {
    blocked: "الإدخالات التجريبية المتبقية: {count}. أزلها أو عدّلها لتصبح ملكك قبل إرسال تطبيقك إلى المتاجر.",
  },
};

export const tr: Strings<typeof en> = {
  badge: "Örnek",
  banner: "{count, plural, other {{count} örnek kaydınız var.}}",
  bannerText: "Uygulamanız hazır görünsün diye ekledik. Birini düzenlediğinizde sizin olur. Örnek kayıt kaldıkça uygulamanız mağazalara gönderilemez.",
  removeAll: "Tüm örnekleri kaldır",
  askTitle: "Örnekler şimdi kaldırılsın mı?",
  askText: "İlk kendi kaydınızı eklediniz; örnek kayıtlar hâlâ bu listede.",
  askYes: "Evet, kaldır",
  askNo: "Hayır, şimdilik kalsın",
  removed: "{count, plural, =0 {Kaldırılacak örnek kayıt yoktu.} other {{count} örnek kayıt, resimleriyle birlikte kaldırıldı.}}",
  stores: "Uygulamanızda hâlâ örnek kayıtlar var ({count}). Mağazalara gönderilmeden önce bunları kaldırın ya da düzenleyerek kendinizin yapın. <link>Örnek kayıtları gör</link>",
  allTitle: "{count, plural, other {Uygulamanızda {count} örnek kayıt var.}}",
  allText: "Uygulamanızı demomuzdaki gibi gösterirler. Birini düzenlediğinizde sizin olur; dilerseniz hepsini tek seferde kaldırın.",
  removeEverything: "Tüm örnek verileri kaldır",
  seeThem: "Göster",
  known: {
    blocked: "Kalan örnek kayıt: {count}. Uygulamanız mağazalara gönderilmeden önce bunları kaldırın ya da düzenleyerek kendinizin yapın.",
  },
};
