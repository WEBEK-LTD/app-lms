import type { Strings } from "../types";

/**
 * 62 What payment providers (iyzico, Kashier, Fawaterk) and email servers
 * answer, in plain words (lib/payments/explain.ts, lib/payments/refund.ts,
 * lib/email/app-mail.ts), and a few sentences server actions put together
 * from others. The provider's own words after "Details:" stay as they are.
 */
export const en = {
  known: {
    // lib/payments/explain.ts
    details: "{text} Details: {details}",
    keys: "{provider} didn't accept the API keys. Check them in your {provider} panel and enter them again.",
    yallappKeys: "{provider} didn't accept Yallapp's request. Try again later, or message us on WhatsApp.",
    iban: "{provider} didn't accept the IBAN. Check it and try again.",
    identity: "{provider} didn't accept the ID or tax number. Check it and try again.",
    amount: "{provider} refused the amount: it's more than what's left of this payment.",
    notFound: "{provider} couldn't find this payment. Check it in its panel.",
    currency: "{provider} doesn't take this currency with these keys.",
    already: "{provider} already has this. Check it in its panel.",
    phone: "{provider} didn't accept the phone number. Check it and try again.",
    email: "{provider} didn't accept the email address. Check it and try again.",
    address: "{provider} didn't accept the address. Check it and try again.",
    refused: "{provider} refused the request.",
    detailsRefused: "iyzico didn't accept these details.",
    // lib/payments/iyzico.ts, kashier.ts, fawaterk.ts, provider.ts
    unreachable: "{provider} can't be reached.",
    couldntStart: "{provider} couldn't start the payment.",
    couldntRegister: "{provider} couldn't register the shop.",
    couldntApprove: "{provider} couldn't approve the payout.",
    couldntFind: "{provider} couldn't find the payment.",
    couldntCancel: "{provider} couldn't cancel the payment.",
    couldntRefund: "{provider} couldn't make the refund.",
    noSession: "Kashier didn't return the payment session.",
    http: "{provider} answered HTTP {status}.",
    noCurrency: "{provider} doesn't take payments in {currency}.",
    // lib/payments/refund.ts
    noAnswer: "{provider} didn't answer. Check its panel before trying again: the refund may have been made.",
    fawaterkPanel: "Fawaterk refunds are made in Fawaterk's panel.",
    noPaymentId: "{provider} didn't give this payment's ID. Refund it in its panel and record it here.",
    kashierSession: "Kashier's payment session isn't known. Refund it in Kashier's panel and record it here.",
    kashierOrder: "Kashier didn't give its order for this payment. Refund it in Kashier's panel and record it here.",
    iyzicoNothingLeft: "iyzico has nothing left to refund on this payment.",
    // app/actions/catalog.ts: the owner's own keys
    testKeys: "{provider} didn't accept these keys. Check them, and that they're your test keys.",
    liveKeys: "{provider} didn't accept these keys. Check them, and that they're your live keys.",
    // app/actions/dashboard.ts
    tickToSwitch: "{warning} Tick the box to switch anyway.",
    // lib/email/app-mail.ts
    chooseSender: "Choose who sends your app's emails.",
  },
} as const;

type Messages = Strings<typeof en>;

export const ar: Messages = {
  known: {
    details: "{text} التفاصيل: {details}",
    keys: "لم يقبل {provider} مفاتيح API. تحقّق منها في لوحة {provider} وأدخلها مرة أخرى.",
    yallappKeys: "لم يقبل {provider} طلب Yallapp. حاول مرة أخرى لاحقًا، أو راسلنا على WhatsApp.",
    iban: "لم يقبل {provider} رقم الآيبان. تحقّق منه وحاول مرة أخرى.",
    identity: "لم يقبل {provider} رقم الهوية أو الرقم الضريبي. تحقّق منه وحاول مرة أخرى.",
    amount: "رفض {provider} المبلغ: إنه أكثر مما تبقّى من هذه الدفعة.",
    notFound: "لم يجد {provider} هذه الدفعة. تحقّق منها في لوحته.",
    currency: "لا يقبل {provider} هذه العملة بهذه المفاتيح.",
    already: "هذا موجود بالفعل لدى {provider}. تحقّق منه في لوحته.",
    phone: "لم يقبل {provider} رقم الهاتف. تحقّق منه وحاول مرة أخرى.",
    email: "لم يقبل {provider} عنوان البريد الإلكتروني. تحقّق منه وحاول مرة أخرى.",
    address: "لم يقبل {provider} العنوان. تحقّق منه وحاول مرة أخرى.",
    refused: "رفض {provider} الطلب.",
    detailsRefused: "لم يقبل iyzico هذه البيانات.",
    unreachable: "تعذّر الوصول إلى {provider}.",
    couldntStart: "تعذّر على {provider} بدء الدفع.",
    couldntRegister: "تعذّر على {provider} تسجيل المتجر.",
    couldntApprove: "تعذّر على {provider} اعتماد الصرف.",
    couldntFind: "تعذّر على {provider} العثور على الدفعة.",
    couldntCancel: "تعذّر على {provider} إلغاء الدفعة.",
    couldntRefund: "تعذّر على {provider} إجراء الاسترداد.",
    noSession: "لم يُرجع Kashier جلسة الدفع.",
    http: "ردّ {provider} برمز HTTP {status}.",
    noCurrency: "لا يقبل {provider} الدفع بعملة {currency}.",
    noAnswer: "لم يردّ {provider}. تحقّق من لوحته قبل المحاولة مرة أخرى: ربما تمّ الاسترداد.",
    fawaterkPanel: "تتم استردادات Fawaterk من لوحة Fawaterk.",
    noPaymentId: "لم يُعطِ {provider} معرّف هذه الدفعة. استردّها من لوحته وسجّلها هنا.",
    kashierSession: "جلسة الدفع في Kashier غير معروفة. استردّها من لوحة Kashier وسجّلها هنا.",
    kashierOrder: "لم يُعطِ Kashier طلبه لهذه الدفعة. استردّها من لوحة Kashier وسجّلها هنا.",
    iyzicoNothingLeft: "لم يتبقَّ لدى iyzico شيء لاسترداده من هذه الدفعة.",
    testKeys: "لم يقبل {provider} هذه المفاتيح. تحقّق منها، ومن أنها مفاتيح الاختبار الخاصة بك.",
    liveKeys: "لم يقبل {provider} هذه المفاتيح. تحقّق منها، ومن أنها مفاتيحك الفعلية.",
    tickToSwitch: "{warning} حدّد المربع للتبديل على أي حال.",
    chooseSender: "اختر من يرسل رسائل البريد الإلكتروني لتطبيقك.",
  },
};

export const tr: Messages = {
  known: {
    details: "{text} Ayrıntılar: {details}",
    keys: "{provider} API anahtarlarını kabul etmedi. {provider} panelinizde kontrol edip yeniden girin.",
    yallappKeys: "{provider} Yallapp'in isteğini kabul etmedi. Daha sonra yeniden deneyin veya bize WhatsApp'tan yazın.",
    iban: "{provider} IBAN'ı kabul etmedi. Kontrol edip yeniden deneyin.",
    identity: "{provider} kimlik veya vergi numarasını kabul etmedi. Kontrol edip yeniden deneyin.",
    amount: "{provider} tutarı reddetti: bu ödemeden kalandan fazla.",
    notFound: "{provider} bu ödemeyi bulamadı. Panelinde kontrol edin.",
    currency: "{provider} bu anahtarlarla bu para birimini kabul etmiyor.",
    already: "{provider} bunu zaten kayıtlı tutuyor. Panelinde kontrol edin.",
    phone: "{provider} telefon numarasını kabul etmedi. Kontrol edip yeniden deneyin.",
    email: "{provider} e-posta adresini kabul etmedi. Kontrol edip yeniden deneyin.",
    address: "{provider} adresi kabul etmedi. Kontrol edip yeniden deneyin.",
    refused: "{provider} isteği reddetti.",
    detailsRefused: "iyzico bu bilgileri kabul etmedi.",
    unreachable: "{provider} ile bağlantı kurulamıyor.",
    couldntStart: "{provider} ödemeyi başlatamadı.",
    couldntRegister: "{provider} mağazayı kaydedemedi.",
    couldntApprove: "{provider} ödeme aktarımını onaylayamadı.",
    couldntFind: "{provider} ödemeyi bulamadı.",
    couldntCancel: "{provider} ödemeyi iptal edemedi.",
    couldntRefund: "{provider} iadeyi yapamadı.",
    noSession: "Kashier ödeme oturumunu döndürmedi.",
    http: "{provider} HTTP {status} ile yanıt verdi.",
    noCurrency: "{provider} {currency} ile ödeme kabul etmiyor.",
    noAnswer: "{provider} yanıt vermedi. Yeniden denemeden önce panelini kontrol edin: iade yapılmış olabilir.",
    fawaterkPanel: "Fawaterk iadeleri Fawaterk'in panelinden yapılır.",
    noPaymentId: "{provider} bu ödemenin kimliğini vermedi. İadeyi panelinden yapın ve buraya kaydedin.",
    kashierSession: "Kashier ödeme oturumu bilinmiyor. İadeyi Kashier panelinden yapın ve buraya kaydedin.",
    kashierOrder: "Kashier bu ödemenin siparişini vermedi. İadeyi Kashier panelinden yapın ve buraya kaydedin.",
    iyzicoNothingLeft: "iyzico'da bu ödemeden iade edilecek bir şey kalmadı.",
    testKeys: "{provider} bu anahtarları kabul etmedi. Kontrol edin ve test anahtarlarınız olduğundan emin olun.",
    liveKeys: "{provider} bu anahtarları kabul etmedi. Kontrol edin ve canlı anahtarlarınız olduğundan emin olun.",
    tickToSwitch: "{warning} Yine de geçmek için kutuyu işaretleyin.",
    chooseSender: "Uygulamanızın e-postalarını kimin göndereceğini seçin.",
  },
};
