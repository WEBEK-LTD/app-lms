import type { Lang } from "@/i18n/config";
import type { EmailTemplateKey, TemplateText } from "./templates";

/**
 * 56 Arabic and Turkish defaults of the emails to clients (the people who
 * use the dashboard), sent in the language they chose for the dashboard.
 * They use the same {{placeholders}} as the English default. A template the
 * team edited in the admin is one English text, sent as it is in every
 * language. Emails to the team and to the people using a client's app are
 * left out: they stay in English or in the app's own words.
 */

const SIGNATURE_AR = "\n\nYallapp\nhttps://yallapp.com.tr · WhatsApp {{yallapp_whatsapp}}\nYallapp · القاهرة، مصر";
const SIGNATURE_TR = "\n\nYallapp\nhttps://yallapp.com.tr · WhatsApp {{yallapp_whatsapp}}\nYallapp · Kahire, Mısır";

export type ClientEmailKey = Extract<
  EmailTemplateKey,
  | "password_reset"
  | "password_set"
  | "account_activated"
  | "app_activated"
  | "plan_renewed"
  | "build_ready"
  | "build_failed"
  | "wordpress_ready"
  | "new_order"
  | "new_appointment"
  | "new_inquiry"
  | "publishing_status"
  | "app_users_80"
  | "app_users_100"
  | "plan_ends_in_7_days"
  | "plan_ends_tomorrow"
  | "plan_ends_today"
  | "storage_pack_added"
  | "storage_pack_ended"
  | "chat_expiring"
  | "integration_failed"
  | "own_whatsapp_failed"
  | "own_email_failed"
  | "team_invitation"
  | "account_deletion_received"
  | "account_deletion_done"
  | "two_step_on"
  | "two_step_off"
  | "weekly_summary"
>;

const AR: Record<ClientEmailKey, TemplateText> = {
  password_reset: {
    subject: "إعادة تعيين كلمة مرور Yallapp",
    body:
      "مرحبًا {{name}}،\n\nتلقّينا طلبًا لإعادة تعيين كلمة مرور حسابك في Yallapp. استخدم هذا الرابط لاختيار كلمة مرور جديدة:\n\n{{link}}\n\n" +
      "يعمل الرابط مرة واحدة وتنتهي صلاحيته خلال ساعة. إن لم تطلب ذلك، فيمكنك تجاهل هذه الرسالة." +
      SIGNATURE_AR,
  },
  password_set: {
    subject: "عيّن كلمة مرور Yallapp",
    body:
      "مرحبًا {{name}}،\n\nاستخدم هذا الرابط لتعيين كلمة المرور لحسابك في Yallapp:\n\n{{link}}\n\n" +
      "يعمل الرابط مرة واحدة وتنتهي صلاحيته خلال ساعة. إن لم تطلب ذلك، فيمكنك تجاهل هذه الرسالة." +
      SIGNATURE_AR,
  },
  account_activated: {
    subject: "حسابك في Yallapp مفعّل",
    body:
      "مرحبًا {{name}}،\n\nحسابك في Yallapp مفعّل.\n\nالتطبيق: {{app_name}}\nالخطة: {{plan}}\nمفعّل حتى: {{active_until}}\nمفتاح الترخيص: {{license_key}}\n\n{{payment_line}}" +
      "الخطوات التالية:\n1. ثبّت إضافة Yallapp على موقع WordPress الخاص بك والصق مفتاح الترخيص.\n" +
      "2. أعدّ تطبيقك من لوحة التحكم: {{dashboard_url}}\n\n" +
      "تجد مفتاح الترخيص دائمًا في صفحة «الترخيص والإضافة»." +
      SIGNATURE_AR,
  },
  app_activated: {
    subject: "تطبيقك في Yallapp مفعّل",
    body:
      "مرحبًا {{name}}،\n\n{{app_name}} مفعّل.\n\nالخطة: {{plan}}\nمفعّل حتى: {{active_until}}\n\n{{payment_line}}" +
      "الخطوة التالية: أعدّ تطبيقك وابنِه من لوحة التحكم: {{dashboard_url}}\n\n" +
      "تجد باقتك ومدفوعاتك دائمًا في صفحة «الباقة»." +
      SIGNATURE_AR,
  },
  plan_renewed: {
    subject: "تم تجديد خطتك في Yallapp",
    body: "مرحبًا {{name}}،\n\nخطة {{plan}} لتطبيق {{app_name}} مفعّلة الآن حتى {{active_until}}.\n\n{{payment_line}}لوحة التحكم: {{dashboard_url}}" + SIGNATURE_AR,
  },
  build_ready: {
    subject: "{{app_name}}: الإصدار رقم {{build_number}} جاهز",
    body:
      "مرحبًا {{name}}،\n\nالإصدار رقم {{build_number}} من {{app_name}} (النسخة {{version}}) جاهز.\n\n{{note_line}}نزّل ملفاتك من صفحة «الإصدارات والتنزيلات»:\n{{builds_url}}" +
      SIGNATURE_AR,
  },
  build_failed: {
    subject: "{{app_name}}: لم يكتمل الإصدار رقم {{build_number}}",
    body:
      "مرحبًا {{name}}،\n\nلم يكتمل الإصدار رقم {{build_number}} من {{app_name}} (النسخة {{version}})، لذا لم يُنشر شيء.\n\n{{reason}}\n\n" +
      "أُبلغ فريقنا وسيتابع الأمر. يمكنك أيضًا بدء الإصدار من جديد بزر «المحاولة مرة أخرى» في صفحة «الإصدارات والتنزيلات»:\n{{builds_url}}" +
      SIGNATURE_AR,
  },
  wordpress_ready: {
    subject: "{{app_name}}: موقع WordPress الخاص بك جاهز",
    body:
      "مرحبًا {{name}}،\n\nموقع WordPress الخاص بك جاهز: {{website}}\n\nيحصل {{app_name}} الآن على محتواه منه عبر إضافة Yallapp. " +
      "أكمل خطوات الإعداد المتبقية ليبدأ إصدارك الأول:\n\n{{setup_url}}" +
      SIGNATURE_AR,
  },
  new_order: {
    subject: "طلب جديد {{order_number}} · {{total}}",
    body: "دفع أحد العملاء ثمن طلب في {{app_name}}.\n\n{{order_lines}}\nالإجمالي: {{total}}\n\n{{customer}}اطّلع على طلباتك: {{orders_url}}",
  },
  new_appointment: {
    subject: "موعد جديد: {{service}}، {{date}} {{time}}",
    body:
      "حجز {{customer_name}} خدمة {{service}} مع {{staff}} في {{app_name}}.\n\nالموعد: {{date}} الساعة {{time}} ({{timezone}})\nالسعر: {{price}}\n{{contact_label}}: {{phone}}\n" +
      "{{note_line}}{{intake_line}}{{approval_line}}\nمواعيدك: {{appointments_url}}",
  },
  new_inquiry: {
    subject: "رسالة جديدة بخصوص {{listing_title}}",
    body: "كتب {{customer_name}} بخصوص {{listing}} في {{app_name}}:\n\n{{message}}\n\nالهاتف: {{phone}}\n{{email_line}}\nردّ من لوحة التحكم: {{conversation_url}}",
  },
  publishing_status: {
    subject: "{{app_name}} على {{store}}: {{status}}",
    body:
      "مرحبًا {{name}}،\n\nنشر {{app_name}} على {{store}}: {{status}}.\n{{status_text}}\n\n{{note_line}}{{store_link_line}}" +
      "تابع كل خطوة في صفحة «النشر على المتاجر»:\n{{publishing_url}}" +
      SIGNATURE_AR,
  },
  app_users_80: {
    subject: "استخدم {{app_name}} ‏80% من مستخدمي التطبيق المسموح بهم",
    body:
      "مرحبًا {{name}}،\n\nلدى {{app_name}} الآن {{app_users}} من أصل {{app_user_limit}} مستخدم تشملهم خطة {{plan}}. " +
      "عند بلوغ {{app_user_limit}}، لن يتمكن أشخاص جدد من التسجيل في التطبيق؛ ويواصل كل من لديه حساب استخدامه.\n\n" +
      "رقِّ خطتك لمزيد من المستخدمين: {{upgrade_url}}" +
      SIGNATURE_AR,
  },
  app_users_100: {
    subject: "بلغ {{app_name}} الحد الأقصى لمستخدمي التطبيق",
    body:
      "مرحبًا {{name}}،\n\nلدى {{app_name}} الآن {{app_users}} مستخدم، وهو أقصى ما تشمله خطة {{plan}}. " +
      "لا يمكن لأشخاص جدد التسجيل في التطبيق الآن؛ ويواصل كل من لديه حساب استخدامه.\n\n" +
      "رقِّ خطتك لاستقبال أعضاء جدد مرة أخرى: {{upgrade_url}}" +
      SIGNATURE_AR,
  },
  plan_ends_in_7_days: {
    subject: "{{app_name}}: تنتهي خطتك في {{end_date}}",
    body:
      "مرحبًا {{name}}،\n\nتنتهي خطة {{plan}} لتطبيق {{app_name}} في {{end_date}}. عند انتهائها، يتوقف التطبيق مؤقتًا حتى تُجدَّد الخطة.\n\n" +
      "جدّد بالبطاقة: {{renew_url}}" +
      SIGNATURE_AR,
  },
  plan_ends_tomorrow: {
    subject: "{{app_name}}: تنتهي خطتك غدًا",
    body:
      "مرحبًا {{name}}،\n\nتنتهي خطة {{plan}} لتطبيق {{app_name}} غدًا، {{end_date}}. جدّدها اليوم ليستمر تطبيقك في العمل.\n\n" +
      "جدّد بالبطاقة: {{renew_url}}" +
      SIGNATURE_AR,
  },
  plan_ends_today: {
    subject: "{{app_name}}: تنتهي خطتك اليوم",
    body:
      "مرحبًا {{name}}،\n\nتنتهي خطة {{plan}} لتطبيق {{app_name}} اليوم، {{end_date}}. يتوقف التطبيق مؤقتًا عند انتهائها ويعود فور التجديد.\n\n" +
      "جدّد بالبطاقة: {{renew_url}}" +
      SIGNATURE_AR,
  },
  storage_pack_added: {
    subject: "{{app_name}}: أُضيفت مساحة تخزين {{pack}}",
    body:
      "مرحبًا {{name}}،\n\nشكرًا على الدفع. لدى {{app_name}} الآن مساحة إضافية قدرها {{pack}} لمقاطع الفيديو والصور وملفات PDF حتى {{end_date}}. " +
      "تشغل ملفاته {{used}} من {{storage}}.\n\nعند تجديد خطتك بالبطاقة، يمكنك تجديد الحزمة معها.\n\nمكتبة الوسائط: {{media_url}}" +
      SIGNATURE_AR,
  },
  storage_pack_ended: {
    subject: "{{app_name}}: انتهت حزمة التخزين",
    body:
      "مرحبًا {{name}}،\n\nانتهت حزمة التخزين {{pack}} لتطبيق {{app_name}}. تشغل ملفاته {{used}}، وهذا أكثر من مساحة التخزين المتاحة له الآن ({{storage}}).\n\n" +
      "لم يُحذف شيء وتستمر مقاطع الفيديو في العمل داخل التطبيق، لكن الرفع الجديد متوقف حتى تشتري مساحة إضافية أو تحذف ملفات لا تحتاجها.\n\n" +
      "مكتبة الوسائط: {{media_url}}" +
      SIGNATURE_AR,
  },
  chat_expiring: {
    subject: "{{app_name}}: ستُحذف رسائل المحادثات في {{date}}",
    body:
      "مرحبًا {{name}}،\n\nتُحفظ رسائل المحادثات لمدة سنة. في {{conversations}} من محادثات {{app_name}}، ستُحذف الرسائل المرسلة منذ أكثر من سنة في {{date}} مع صورها وفيديوهاتها ورسائلها الصوتية وملفاتها.\n\n" +
      "للاحتفاظ بها سنة أخرى، افتح المحادثات واختر «الاحتفاظ بالرسائل». ويمكنك أيضًا من هناك حذف محادثة كاملة أو رسائل محددة متى شئت.\n\n" +
      "المحادثات: {{chat_url}}" +
      SIGNATURE_AR,
  },
  integration_failed: {
    subject: "{{title}}",
    body:
      "مرحبًا {{name}}،\n\nوجد فحصنا اليومي لاتصالات {{app_name}} مشكلة.\n\n{{problem}}\n\n{{details}}\n\n" +
      "تعرض صفحة «التكاملات» كل اتصال وآخر اختبار له. اختبره هناك من جديد بعد إصلاحه:\n{{integrations_url}}" +
      SIGNATURE_AR,
  },
  own_whatsapp_failed: {
    subject: "{{app_name}}: تعذّر على رقم WhatsApp الخاص بك إرسال رموز تسجيل الدخول",
    body:
      "مرحبًا {{name}}،\n\nفي {{date}}، تعذّر على رقم WhatsApp الخاص بك إرسال رمز تسجيل دخول لتطبيق {{app_name}}. " +
      "ولكي تصل الرموز إلى عملائك رغم ذلك، أرسلناها من رقم WhatsApp الخاص بـ Yallapp متى كان متاحًا.\n\n" +
      "تحقّق من رقمك ومفتاح API في حسابك على WABEK، ثم أرسل رمزًا تجريبيًا من صفحة «تسجيل الدخول في التطبيق»:\n{{sign_in_url}}" +
      SIGNATURE_AR,
  },
  own_email_failed: {
    subject: "{{app_name}}: تعذّر على خادم البريد الخاص بك إرسال رسالة",
    body:
      "مرحبًا {{name}}،\n\nفي {{date}}، تعذّر على خادم البريد الخاص بك إرسال رسالة إلى أحد مستخدمي {{app_name}}:\n{{reason}}\n\n" +
      "ولكي تصلهم الرسالة رغم ذلك، أرسلناها من عنوان البريد الخاص بـ Yallapp باسم تطبيقك.\n\n" +
      "تحقّق من إعدادات خادم البريد، ثم أرسل رسالة تجريبية من صفحة «تسجيل الدخول في التطبيق»:\n{{sign_in_url}}" +
      SIGNATURE_AR,
  },
  team_invitation: {
    subject: "دعاك {{inviter}} إلى {{business}} على Yallapp",
    body:
      "مرحبًا {{name}}،\n\nدعاك {{inviter}} للعمل معه على {{business}} في Yallapp بدور {{role}}.\n\n" +
      "افتح هذا الرابط للانضمام. يمكنك تعيين كلمة المرور هناك، أو تسجيل الدخول إن كنت تستخدم Yallapp من قبل:\n\n{{link}}\n\n" +
      "يعمل الرابط مرة واحدة حتى {{expires}}. إن لم تكن تتوقع هذه الدعوة، فيمكنك تجاهل هذه الرسالة." +
      SIGNATURE_AR,
  },
  account_deletion_received: {
    subject: "تلقّينا طلبك لحذف حسابك في Yallapp",
    body:
      "مرحبًا {{name}}،\n\nتلقّينا طلبك لحذف حسابك في Yallapp. سنحذفه مع تطبيقاته وبياناتها خلال {{days}} يومًا، وسنراسلك عند الانتهاء.\n\n" +
      "وحتى ذلك الحين يمكنك إلغاء الطلب من لوحة التحكم:\n{{dashboard_url}}\n\n" +
      "إن لم تطلب ذلك، فألغِ الطلب وغيّر كلمة المرور وراسلنا على {{yallapp_email}}." +
      SIGNATURE_AR,
  },
  account_deletion_done: {
    subject: "حُذف حسابك في Yallapp",
    body:
      "مرحبًا {{name}}،\n\nحُذف حسابك في Yallapp مع تطبيقاته وبياناتها كما طلبت. ولا نحتفظ إلا بسجلات الفوترة التي تشترطها قوانين المحاسبة والضرائب، وبسجلّ لطلبك.\n\n" +
      "وتبقى التطبيقات التي نشرتها بحساباتك الخاصة في المتاجر هناك إلى أن تزيلها. شكرًا لاستخدامك Yallapp." +
      SIGNATURE_AR,
  },
  // 70 Two-step sign-in
  two_step_on: {
    subject: "تسجيل الدخول بخطوتين مفعّل لحسابك في Yallapp",
    body:
      "مرحبًا {{name}}،\n\nفُعّل تسجيل الدخول بخطوتين لحسابك في Yallapp في {{date}}. من الآن، يطلب تسجيل الدخول إلى yallapp.com.tr وYallapp Business رمزًا من تطبيق المصادقة بعد كلمة المرور.\n\n" +
      "احتفظ برموز الاسترداد في مكان آمن: كل رمز منها يتيح لك تسجيل الدخول مرة واحدة إن فقدت هاتفك. يمكنك إدارته من هنا:\n{{account_url}}\n\n" +
      "إن لم تفعل ذلك بنفسك، فأعد تعيين كلمة المرور فورًا وراسلنا على {{yallapp_email}}." +
      SIGNATURE_AR,
  },
  weekly_summary: {
    subject: "{{app_name}}: أسبوعك، {{week}}",
    body:
      "مرحبًا {{name}}،\n\nهكذا كان أداء {{app_name}} في أسبوع {{week}}، وبجانبه الأسبوع الذي قبله:\n\n{{summary}}\n\n" +
      "كل الأرقام، يومًا بيوم، في صفحة «التحليلات»:\n{{analytics_url}}\n\n" +
      "تصلك هذه الرسالة كل يوم اثنين. لإيقافها، أوقف «ملخص أسبوعي بالبريد» في الصفحة نفسها." +
      SIGNATURE_AR,
  },
  two_step_off: {
    subject: "تسجيل الدخول بخطوتين متوقف لحسابك في Yallapp",
    body:
      "مرحبًا {{name}}،\n\nأُوقف تسجيل الدخول بخطوتين لحسابك في Yallapp في {{date}}. أصبح تسجيل الدخول يحتاج إلى كلمة المرور فقط.\n\n" +
      "يمكنك تفعيله مرة أخرى من هنا:\n{{account_url}}\n\n" +
      "إن لم تفعل ذلك ولم تطلبه، فأعد تعيين كلمة المرور فورًا وفعّل تسجيل الدخول بخطوتين مرة أخرى وراسلنا على {{yallapp_email}}." +
      SIGNATURE_AR,
  },
};

const TR: Record<ClientEmailKey, TemplateText> = {
  password_reset: {
    subject: "Yallapp parolanızı sıfırlayın",
    body:
      "Merhaba {{name}},\n\nYallapp parolanızı sıfırlamak için bir istek aldık. Yeni bir parola seçmek için bu bağlantıyı kullanın:\n\n{{link}}\n\n" +
      "Bağlantı bir kez çalışır ve 1 saat içinde geçerliliğini yitirir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz." +
      SIGNATURE_TR,
  },
  password_set: {
    subject: "Yallapp parolanızı belirleyin",
    body:
      "Merhaba {{name}},\n\nYallapp hesabınızın parolasını belirlemek için bu bağlantıyı kullanın:\n\n{{link}}\n\n" +
      "Bağlantı bir kez çalışır ve 1 saat içinde geçerliliğini yitirir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz." +
      SIGNATURE_TR,
  },
  account_activated: {
    subject: "Yallapp hesabınız etkin",
    body:
      "Merhaba {{name}},\n\nYallapp hesabınız etkin.\n\nUygulama: {{app_name}}\nPlan: {{plan}}\nBitiş tarihi: {{active_until}}\nLisans anahtarı: {{license_key}}\n\n{{payment_line}}" +
      "Sonraki adımlar:\n1. Yallapp eklentisini WordPress sitenize kurun ve lisans anahtarınızı yapıştırın.\n" +
      "2. Uygulamanızı panelinizden ayarlayın: {{dashboard_url}}\n\n" +
      "Lisans anahtarınızı her zaman Lisans ve eklenti sayfasında bulabilirsiniz." +
      SIGNATURE_TR,
  },
  app_activated: {
    subject: "Yallapp uygulamanız etkin",
    body:
      "Merhaba {{name}},\n\n{{app_name}} etkin.\n\nPlan: {{plan}}\nBitiş tarihi: {{active_until}}\n\n{{payment_line}}" +
      "Sonraki adım: uygulamanızı panelinizden ayarlayın ve derleyin: {{dashboard_url}}\n\n" +
      "Paketinizi ve ödemelerinizi her zaman Paket sayfasında görebilirsiniz." +
      SIGNATURE_TR,
  },
  plan_renewed: {
    subject: "Yallapp planınız yenilendi",
    body: "Merhaba {{name}},\n\n{{app_name}} uygulamasının {{plan}} planı artık şu tarihe kadar etkin: {{active_until}}.\n\n{{payment_line}}Panel: {{dashboard_url}}" + SIGNATURE_TR,
  },
  build_ready: {
    subject: "{{app_name}}: #{{build_number}} numaralı derleme hazır",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının #{{build_number}} numaralı derlemesi (sürüm {{version}}) hazır.\n\n{{note_line}}Dosyalarınızı Derlemeler ve indirmeler sayfasından indirin:\n{{builds_url}}" +
      SIGNATURE_TR,
  },
  build_failed: {
    subject: "{{app_name}}: #{{build_number}} numaralı derleme tamamlanmadı",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının #{{build_number}} numaralı derlemesi (sürüm {{version}}) tamamlanmadı, bu yüzden hiçbir şey yayımlanmadı.\n\n{{reason}}\n\n" +
      "Ekibimiz bilgilendirildi ve inceleyecek. Derlemeyi Derlemeler ve indirmeler sayfasındaki Tekrar dene ile de yeniden başlatabilirsiniz:\n{{builds_url}}" +
      SIGNATURE_TR,
  },
  wordpress_ready: {
    subject: "{{app_name}}: WordPress siteniz hazır",
    body:
      "Merhaba {{name}},\n\nWordPress siteniz hazır: {{website}}\n\n{{app_name}} artık içeriğini Yallapp eklentisi aracılığıyla bu siteden alıyor. " +
      "Kalan kurulum adımlarını tamamlayın, ilk derlemeniz başlasın:\n\n{{setup_url}}" +
      SIGNATURE_TR,
  },
  new_order: {
    subject: "Yeni sipariş {{order_number}} · {{total}}",
    body: "Bir müşteri {{app_name}} uygulamasında bir siparişin ödemesini yaptı.\n\n{{order_lines}}\nToplam: {{total}}\n\n{{customer}}Siparişlerinizi görün: {{orders_url}}",
  },
  new_appointment: {
    subject: "Yeni randevu: {{service}}, {{date}} {{time}}",
    body:
      "{{customer_name}}, {{app_name}} uygulamasında {{staff}} ile {{service}} randevusu aldı.\n\nZaman: {{date}}, saat {{time}} ({{timezone}})\nFiyat: {{price}}\n{{contact_label}}: {{phone}}\n" +
      "{{note_line}}{{intake_line}}{{approval_line}}\nRandevularınız: {{appointments_url}}",
  },
  new_inquiry: {
    subject: "Yeni mesaj: {{listing_title}}",
    body: "{{customer_name}}, {{app_name}} uygulamasında {{listing}} hakkında yazdı:\n\n{{message}}\n\nTelefon: {{phone}}\n{{email_line}}\nPanelinizden yanıtlayın: {{conversation_url}}",
  },
  publishing_status: {
    subject: "{{app_name}} · {{store}}: {{status}}",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının {{store}} yayını: {{status}}.\n{{status_text}}\n\n{{note_line}}{{store_link_line}}" +
      "Her adımı Yayınlama sayfanızdan takip edin:\n{{publishing_url}}" +
      SIGNATURE_TR,
  },
  app_users_80: {
    subject: "{{app_name}}, uygulama kullanıcı sınırının %80'ine ulaştı",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasında şu anda {{plan}} planının içerdiği {{app_user_limit}} uygulama kullanıcısından {{app_users}} tanesi var. " +
      "Sınıra ({{app_user_limit}}) ulaşıldığında yeni kişiler uygulamaya kaydolamaz; hesabı olan herkes kullanmaya devam eder.\n\n" +
      "Daha fazla uygulama kullanıcısı için planınızı yükseltin: {{upgrade_url}}" +
      SIGNATURE_TR,
  },
  app_users_100: {
    subject: "{{app_name}}, uygulama kullanıcı sınırına ulaştı",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasında {{app_users}} uygulama kullanıcısı var; bu, {{plan}} planının içerdiği en yüksek sayı. " +
      "Yeni kişiler şu anda uygulamaya kaydolamıyor; hesabı olan herkes kullanmaya devam ediyor.\n\n" +
      "Yeniden yeni üye almak için planınızı yükseltin: {{upgrade_url}}" +
      SIGNATURE_TR,
  },
  plan_ends_in_7_days: {
    subject: "{{app_name}}: planınızın bitiş tarihi {{end_date}}",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının {{plan}} planının bitiş tarihi: {{end_date}}. Plan bittiğinde, yenilenene kadar uygulama duraklatılır.\n\n" +
      "Kartla yenileyin: {{renew_url}}" +
      SIGNATURE_TR,
  },
  plan_ends_tomorrow: {
    subject: "{{app_name}}: planınız yarın bitiyor",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının {{plan}} planı yarın ({{end_date}}) bitiyor. Uygulamanızın çalışmaya devam etmesi için planı bugün yenileyin.\n\n" +
      "Kartla yenileyin: {{renew_url}}" +
      SIGNATURE_TR,
  },
  plan_ends_today: {
    subject: "{{app_name}}: planınız bugün bitiyor",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının {{plan}} planı bugün ({{end_date}}) bitiyor. Plan bittiğinde uygulama duraklatılır ve yenilediğiniz anda geri gelir.\n\n" +
      "Kartla yenileyin: {{renew_url}}" +
      SIGNATURE_TR,
  },
  storage_pack_added: {
    subject: "{{app_name}}: {{pack}} depolama alanı eklendi",
    body:
      "Merhaba {{name}},\n\nÖdemeniz için teşekkürler. {{app_name}} uygulamasının videoları, resimleri ve PDF'leri için {{end_date}} tarihine kadar {{pack}} ek depolama alanı var. " +
      "Dosyaları {{storage}} alanın {{used}} kadarını kullanıyor.\n\nPlanınızı kartla yenilediğinizde paketi de birlikte yenileyebilirsiniz.\n\nMedya kitaplığınız: {{media_url}}" +
      SIGNATURE_TR,
  },
  storage_pack_ended: {
    subject: "{{app_name}}: depolama paketiniz sona erdi",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının {{pack}} depolama paketi sona erdi. Dosyaları {{used}} yer kaplıyor; bu, şu anki {{storage}} depolama alanından fazla.\n\n" +
      "Hiçbir şey silinmedi ve videolarınız uygulamada oynamaya devam ediyor, ancak siz daha fazla alan alana veya gerekmeyen dosyaları silene kadar yeni yüklemeler duraklatıldı.\n\n" +
      "Medya kitaplığınız: {{media_url}}" +
      SIGNATURE_TR,
  },
  chat_expiring: {
    subject: "{{app_name}}: sohbet mesajları {{date}} tarihinde silinecek",
    body:
      "Merhaba {{name}},\n\nSohbet mesajları bir yıl saklanır. {{app_name}} uygulamasının {{conversations}} sohbetinde bir yıldan önce gönderilen mesajlar, fotoğrafları, videoları, sesli mesajları ve dosyalarıyla birlikte {{date}} tarihinde silinecek.\n\n" +
      "Onları bir yıl daha saklamak için Sohbet sayfasını açıp Mesajları sakla'yı seçin. Orada istediğiniz zaman bir sohbetin tamamını ya da tek tek mesajları da silebilirsiniz.\n\n" +
      "Sohbet: {{chat_url}}" +
      SIGNATURE_TR,
  },
  integration_failed: {
    subject: "{{title}}",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının bağlantılarını her gün kontrol ediyoruz ve bir sorun bulduk.\n\n{{problem}}\n\n{{details}}\n\n" +
      "Entegrasyonlar sayfası her bağlantıyı ve son testini gösterir. Düzelttikten sonra orada yeniden test edin:\n{{integrations_url}}" +
      SIGNATURE_TR,
  },
  own_whatsapp_failed: {
    subject: "{{app_name}}: WhatsApp numaranız giriş kodlarını gönderemedi",
    body:
      "Merhaba {{name}},\n\n{{date}} tarihinde kendi WhatsApp numaranız {{app_name}} için bir giriş kodu gönderemedi. " +
      "Müşterileriniz kodlarını yine de alabilsin diye kodları, uygun olduğunda Yallapp'in WhatsApp numarasından gönderdik.\n\n" +
      "WABEK hesabınızda numaranızı ve API anahtarınızı kontrol edin, ardından Uygulamada giriş sayfasından bir test kodu gönderin:\n{{sign_in_url}}" +
      SIGNATURE_TR,
  },
  own_email_failed: {
    subject: "{{app_name}}: e-posta sunucunuz bir e-posta gönderemedi",
    body:
      "Merhaba {{name}},\n\n{{date}} tarihinde kendi e-posta sunucunuz {{app_name}} kullanan birine e-posta gönderemedi:\n{{reason}}\n\n" +
      "E-posta yine de ulaşsın diye onu uygulamanızın adıyla Yallapp'in e-posta adresinden gönderdik.\n\n" +
      "E-posta sunucunuzun ayarlarını kontrol edin, ardından Uygulamada giriş sayfasından bir test e-postası gönderin:\n{{sign_in_url}}" +
      SIGNATURE_TR,
  },
  team_invitation: {
    subject: "{{inviter}} sizi Yallapp'te {{business}} ekibine davet etti",
    body:
      "Merhaba {{name}},\n\n{{inviter}} sizi Yallapp'te {{business}} üzerinde {{role}} olarak birlikte çalışmaya davet etti.\n\n" +
      "Katılmak için bu bağlantıyı açın. Orada parolanızı belirleyebilir ya da Yallapp'i zaten kullanıyorsanız giriş yapabilirsiniz:\n\n{{link}}\n\n" +
      "Bağlantı bir kez ve {{expires}} tarihine kadar çalışır. Bu daveti beklemiyorsanız bu e-postayı yok sayabilirsiniz." +
      SIGNATURE_TR,
  },
  account_deletion_received: {
    subject: "Yallapp hesabınızı silme isteğinizi aldık",
    body:
      "Merhaba {{name}},\n\nYallapp hesabınızı silme isteğinizi aldık. Hesabınızı, uygulamaları ve onların verileriyle birlikte {{days}} gün içinde sileceğiz ve bittiğinde size e-posta göndereceğiz.\n\n" +
      "O zamana kadar isteği panelinizden iptal edebilirsiniz:\n{{dashboard_url}}\n\n" +
      "Bunu siz istemediyseniz isteği iptal edin, parolanızı değiştirin ve bize {{yallapp_email}} adresinden yazın." +
      SIGNATURE_TR,
  },
  account_deletion_done: {
    subject: "Yallapp hesabınız silindi",
    body:
      "Merhaba {{name}},\n\nYallapp hesabınız, istediğiniz gibi uygulamaları ve onların verileriyle birlikte silindi. Yalnızca muhasebe ve vergi yasalarının gerektirdiği fatura kayıtlarını ve isteğinizin bir kaydını saklıyoruz.\n\n" +
      "Kendi mağaza hesaplarınızla yayınladığınız uygulamalar, siz kaldırana kadar orada kalır. Yallapp'i kullandığınız için teşekkür ederiz." +
      SIGNATURE_TR,
  },
  // 70 Two-step sign-in
  two_step_on: {
    subject: "Yallapp hesabınızda iki adımlı giriş açık",
    body:
      "Merhaba {{name}},\n\nYallapp hesabınızda iki adımlı giriş {{date}} tarihinde açıldı. Artık yallapp.com.tr'ye ve Yallapp Business'a girişte parolanızdan sonra doğrulama uygulamanızdan bir kod istenir.\n\n" +
      "Kurtarma kodlarınızı güvenli bir yerde saklayın: telefonunuzu kaybederseniz her biri bir kez giriş yapmanızı sağlar. Buradan yönetebilirsiniz:\n{{account_url}}\n\n" +
      "Bunu siz yapmadıysanız hemen parolanızı sıfırlayın ve bize {{yallapp_email}} adresinden yazın." +
      SIGNATURE_TR,
  },
  weekly_summary: {
    subject: "{{app_name}}: haftanız, {{week}}",
    body:
      "Merhaba {{name}},\n\n{{app_name}} uygulamasının {{week}} haftası, bir önceki haftanın yanında:\n\n{{summary}}\n\n" +
      "Tüm sayılar, gün gün, Analiz sayfanızda:\n{{analytics_url}}\n\n" +
      "Bu e-postayı her pazartesi alırsınız. Durdurmak için aynı sayfada \"E-postayla haftalık özet\" seçeneğini kapatın." +
      SIGNATURE_TR,
  },
  two_step_off: {
    subject: "Yallapp hesabınızda iki adımlı giriş kapalı",
    body:
      "Merhaba {{name}},\n\nYallapp hesabınızda iki adımlı giriş {{date}} tarihinde kapatıldı. Giriş artık yalnızca parolanızla yapılıyor.\n\n" +
      "Buradan yeniden açabilirsiniz:\n{{account_url}}\n\n" +
      "Bunu siz yapmadıysanız ve istemediyseniz hemen parolanızı sıfırlayın, iki adımlı girişi yeniden açın ve bize {{yallapp_email}} adresinden yazın." +
      SIGNATURE_TR,
  },
};

const DEFAULTS: Record<Exclude<Lang, "en">, Record<ClientEmailKey, TemplateText>> = { ar: AR, tr: TR };

/** The built-in default of an email to a client in their language; null for English and for emails that stay English. */
export function localizedDefault(key: EmailTemplateKey, lang: Lang): TemplateText | null {
  if (lang === "en") return null;
  return (DEFAULTS[lang] as Partial<Record<EmailTemplateKey, TemplateText>>)[key] ?? null;
}

/** Every localized default, for the tests. */
export const LOCALIZED_DEFAULTS = DEFAULTS;
