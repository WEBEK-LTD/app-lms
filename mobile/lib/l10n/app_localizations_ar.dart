// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get languageName => 'العربية';

  @override
  String get tabHome => 'الرئيسية';

  @override
  String get tabCourses => 'الدورات';

  @override
  String get tabMyCourses => 'دوراتي';

  @override
  String get tabAccount => 'الحساب';

  @override
  String get tabShop => 'المتجر';

  @override
  String get tabCart => 'السلة';

  @override
  String get tabBook => 'احجز';

  @override
  String get tabAppointments => 'المواعيد';

  @override
  String get tabFavorites => 'المفضلة';

  @override
  String get tabMessages => 'الرسائل';

  @override
  String get loadingPage => 'جارٍ تحميل الصفحة';

  @override
  String get pageEmptyTitle => 'لا يوجد شيء هنا بعد';

  @override
  String get playVideo => 'تشغيل الفيديو';

  @override
  String get savedItem => 'محفوظ';

  @override
  String itemCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count عنصر',
      many: '$count عنصرًا',
      few: '$count عناصر',
      two: 'عنصران',
      one: 'عنصر واحد',
      zero: 'لا عناصر',
    );
    return '$_temp0';
  }

  @override
  String get searchListingsHint => 'ابحث بالمكان أو العنوان أو الرقم المرجعي';

  @override
  String get filters => 'عوامل التصفية';

  @override
  String filtersActive(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'عوامل التصفية، $count مفعّل',
      many: 'عوامل التصفية، $count مفعّلًا',
      few: 'عوامل التصفية، $count مفعّلة',
      two: 'عوامل التصفية، اثنان مفعّلان',
      one: 'عوامل التصفية، واحد مفعّل',
    );
    return '$_temp0';
  }

  @override
  String sortBy(String order) {
    return 'الترتيب: $order';
  }

  @override
  String get sortNewest => 'الأحدث';

  @override
  String get sortPriceLowHigh => 'السعر: من الأقل إلى الأعلى';

  @override
  String get sortPriceHighLow => 'السعر: من الأعلى إلى الأقل';

  @override
  String get sortLargest => 'الأكبر مساحة أولًا';

  @override
  String get filterAll => 'الكل';

  @override
  String get filterAny => 'أي';

  @override
  String get forSale => 'للبيع';

  @override
  String get forRent => 'للإيجار';

  @override
  String get featured => 'مميز';

  @override
  String get negotiable => 'قابل للتفاوض';

  @override
  String pricePerMonth(String price) {
    return '$price / شهريًا';
  }

  @override
  String pricePerYear(String price) {
    return '$price / سنويًا';
  }

  @override
  String areaSquareMetres(String area) {
    return '$area م²';
  }

  @override
  String areaSquareFeet(String area) {
    return '$area قدم²';
  }

  @override
  String bedroomsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count غرفة نوم',
      many: '$count غرفة نوم',
      few: '$count غرف نوم',
      two: 'غرفتا نوم',
      one: 'غرفة نوم واحدة',
      zero: 'بلا غرف نوم',
    );
    return '$_temp0';
  }

  @override
  String bathroomsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count حمّام',
      many: '$count حمّامًا',
      few: '$count حمّامات',
      two: 'حمّامان',
      one: 'حمّام واحد',
      zero: 'بلا حمّامات',
    );
    return '$_temp0';
  }

  @override
  String get loadingListings => 'جارٍ تحميل العقارات';

  @override
  String get loadingMoreListings => 'جارٍ تحميل المزيد من العقارات';

  @override
  String get noListingsTitle => 'لم يتم العثور على عقارات';

  @override
  String get noListingsMessage => 'جرّب كلمات أخرى أو عوامل تصفية أقل.';

  @override
  String get propertyType => 'نوع العقار';

  @override
  String get city => 'المدينة';

  @override
  String get district => 'الحي';

  @override
  String get priceRange => 'السعر';

  @override
  String get areaRange => 'المساحة';

  @override
  String get bedrooms => 'غرف النوم';

  @override
  String get bathrooms => 'الحمّامات';

  @override
  String get minimum => 'الحد الأدنى';

  @override
  String get maximum => 'الحد الأقصى';

  @override
  String get reset => 'إعادة تعيين';

  @override
  String get showResults => 'عرض النتائج';

  @override
  String get loadingListing => 'جارٍ تحميل العقار';

  @override
  String listingReference(String reference) {
    return 'الرقم المرجعي $reference';
  }

  @override
  String get keyFacts => 'معلومات أساسية';

  @override
  String get factArea => 'المساحة';

  @override
  String get factFloor => 'الطابق';

  @override
  String get factYearBuilt => 'سنة البناء';

  @override
  String get factFurnished => 'مفروش';

  @override
  String get yes => 'نعم';

  @override
  String get no => 'لا';

  @override
  String get features => 'المزايا';

  @override
  String get description => 'الوصف';

  @override
  String get watchVideo => 'شاهد الفيديو';

  @override
  String get location => 'الموقع';

  @override
  String get openInMaps => 'افتح في الخرائط';

  @override
  String get contactOffice => 'تواصل مع المكتب';

  @override
  String get call => 'اتصال';

  @override
  String get whatsapp => 'واتساب';

  @override
  String get email => 'البريد الإلكتروني';

  @override
  String get similarListings => 'عقارات مشابهة';

  @override
  String get messageOffice => 'راسل المكتب';

  @override
  String inquiryTemplate(String title) {
    return 'مرحبًا، أنا مهتم بـ \"$title\". هل ما زال متاحًا؟';
  }

  @override
  String get writeMessage => 'اكتب رسالة';

  @override
  String get send => 'إرسال';

  @override
  String photoOf(int index, int total) {
    return 'الصورة $index من $total';
  }

  @override
  String get saveToFavorites => 'أضف إلى المفضلة';

  @override
  String get removeFromFavorites => 'أزل من المفضلة';

  @override
  String get loadingFavorites => 'جارٍ تحميل المفضلة';

  @override
  String get noFavoritesTitle => 'لا توجد عناصر مفضلة بعد';

  @override
  String get noFavoritesMessage => 'اضغط على القلب في أي عقار لحفظه هنا.';

  @override
  String get favoritesSignInTitle => 'احفظ العقارات التي تعجبك';

  @override
  String get favoritesSignInMessage =>
      'سجّل الدخول للاحتفاظ بمفضلتك على جميع أجهزتك.';

  @override
  String get messagesSignInTitle => 'تحدّث مع المكتب';

  @override
  String get messagesSignInMessage =>
      'سجّل الدخول لمراسلة المكتب بشأن أي عقار.';

  @override
  String get signIn => 'تسجيل الدخول';

  @override
  String get loadingMessages => 'جارٍ تحميل الرسائل';

  @override
  String get noMessagesTitle => 'لا توجد رسائل بعد';

  @override
  String get noMessagesMessage => 'تظهر هنا الأسئلة التي ترسلها بشأن أي عقار.';

  @override
  String unreadMessages(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count رسالة غير مقروءة',
      many: '$count رسالة غير مقروءة',
      few: '$count رسائل غير مقروءة',
      two: 'رسالتان غير مقروءتين',
      one: 'رسالة واحدة غير مقروءة',
    );
    return '$_temp0';
  }

  @override
  String messageFromYou(String text) {
    return 'أنت: $text';
  }

  @override
  String messageFromOffice(String text) {
    return 'المكتب: $text';
  }

  @override
  String get conversationClosed => 'تم إغلاق هذه المحادثة.';

  @override
  String get progress => 'التقدم';

  @override
  String get seeAll => 'عرض الكل';

  @override
  String get loading => 'جارٍ التحميل';

  @override
  String get offlineTitle => 'أنت غير متصل بالإنترنت';

  @override
  String get errorTitle => 'حدث خطأ ما';

  @override
  String get tryAgain => 'حاول مرة أخرى';

  @override
  String get cancel => 'إلغاء';

  @override
  String durationMinutes(int minutes) {
    return '$minutes د';
  }

  @override
  String durationHours(int hours) {
    return '$hours س';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '$hours س $minutes د';
  }

  @override
  String get back => 'رجوع';

  @override
  String tabPosition(String label, int index, int count) {
    return '$label، علامة التبويب $index من $count';
  }

  @override
  String get mainNavigation => 'التنقل الرئيسي';

  @override
  String tabWithCount(String label, int count) {
    return '$label، $count';
  }

  @override
  String get maintenanceTitle => 'سنعود قريبًا';

  @override
  String maintenanceMessage(String name) {
    return 'يجري تحديث $name. يُرجى المحاولة مرة أخرى بعد قليل.';
  }

  @override
  String get updateRequiredTitle => 'التحديث مطلوب';

  @override
  String updateRequiredMessage(String name) {
    return 'يتوفر إصدار جديد من $name. حدّث التطبيق لمتابعة التعلّم.';
  }

  @override
  String get updateNow => 'حدّث الآن';

  @override
  String appPausedTitle(String name) {
    return '$name متوقف مؤقتًا';
  }

  @override
  String appPausedMessage(String name) {
    return 'يمكن لمالك $name إعادة تشغيله. تواصل معه لمعرفة المزيد، أو حاول مرة أخرى لاحقًا.';
  }

  @override
  String contactOwner(String name) {
    return 'تواصل مع $name';
  }

  @override
  String membersClosedTitle(String name) {
    return '$name لا يقبل أعضاء جددًا حاليًا';
  }

  @override
  String membersClosedMessage(String name) {
    return 'تواصل مع $name لتسأل عن الانضمام. إذا كان لديك حساب بالفعل، فسجّل الدخول بالرقم الذي استخدمته من قبل.';
  }

  @override
  String get connectionTitle => 'تعذّر الاتصال';

  @override
  String get done => 'تم';

  @override
  String get close => 'إغلاق';

  @override
  String get videoQualityAuto => 'تلقائي';

  @override
  String get errorTimeout =>
      'انتهت مهلة الاتصال. تحقّق من اتصالك بالإنترنت وحاول مرة أخرى.';

  @override
  String get errorCancelled => 'تم إلغاء الطلب.';

  @override
  String get errorNetwork =>
      'تعذّر الاتصال. تحقّق من اتصالك بالإنترنت وحاول مرة أخرى.';

  @override
  String get error401 => 'انتهت جلستك. يُرجى تسجيل الدخول مرة أخرى.';

  @override
  String get error403 => 'ليس لديك صلاحية الوصول إلى هذا.';

  @override
  String get error404 => 'لم نعثر على ما تبحث عنه.';

  @override
  String get error429 =>
      'محاولات كثيرة جدًا. يُرجى الانتظار قليلًا ثم المحاولة مرة أخرى.';

  @override
  String get error503 => 'التطبيق غير متاح حاليًا. يُرجى المحاولة لاحقًا.';

  @override
  String get errorGeneric => 'حدث خطأ ما. يُرجى المحاولة مرة أخرى.';

  @override
  String get errorInvalidResponse => 'تلقى التطبيق ردًا لم يتمكن من قراءته.';

  @override
  String get errorPurchaseNotAllowed => 'هذه الدورة غير متاحة في حسابك بعد.';

  @override
  String get free => 'مجاني';

  @override
  String get questionSingleChoice => 'اختيار واحد';

  @override
  String get questionMultipleChoice => 'اختيار متعدد';

  @override
  String get questionTrueFalse => 'صح أو خطأ';

  @override
  String get questionShortAnswer => 'إجابة قصيرة';

  @override
  String get questionOpenEnded => 'إجابة مفتوحة';

  @override
  String get questionFillInBlank => 'املأ الفراغ';

  @override
  String get questionOrdering => 'الترتيب';

  @override
  String get questionMatching => 'المطابقة';

  @override
  String get questionImageAnswer => 'إجابة بصورة';

  @override
  String get questionOther => 'سؤال';

  @override
  String get attemptPassed => 'ناجح';

  @override
  String get attemptFailed => 'لم ينجح';

  @override
  String get attemptPendingReview => 'بانتظار المراجعة';

  @override
  String countryName(String code) {
    String _temp0 = intl.Intl.selectLogic(code, {
      'AF': 'أفغانستان',
      'AL': 'ألبانيا',
      'DZ': 'الجزائر',
      'AR': 'الأرجنتين',
      'AU': 'أستراليا',
      'AT': 'النمسا',
      'AZ': 'أذربيجان',
      'BH': 'البحرين',
      'BD': 'بنغلاديش',
      'BE': 'بلجيكا',
      'BA': 'البوسنة والهرسك',
      'BR': 'البرازيل',
      'BG': 'بلغاريا',
      'CA': 'كندا',
      'CN': 'الصين',
      'HR': 'كرواتيا',
      'CY': 'قبرص',
      'CZ': 'التشيك',
      'DK': 'الدنمارك',
      'EG': 'مصر',
      'FI': 'فنلندا',
      'FR': 'فرنسا',
      'GE': 'جورجيا',
      'DE': 'ألمانيا',
      'GR': 'اليونان',
      'HU': 'المجر',
      'IN': 'الهند',
      'ID': 'إندونيسيا',
      'IR': 'إيران',
      'IQ': 'العراق',
      'IE': 'أيرلندا',
      'IT': 'إيطاليا',
      'JP': 'اليابان',
      'JO': 'الأردن',
      'KZ': 'كازاخستان',
      'KE': 'كينيا',
      'XK': 'كوسوفو',
      'KW': 'الكويت',
      'KG': 'قيرغيزستان',
      'LB': 'لبنان',
      'LY': 'ليبيا',
      'MY': 'ماليزيا',
      'MX': 'المكسيك',
      'MA': 'المغرب',
      'NL': 'هولندا',
      'NZ': 'نيوزيلندا',
      'NG': 'نيجيريا',
      'MK': 'مقدونيا الشمالية',
      'NO': 'النرويج',
      'OM': 'عُمان',
      'PK': 'باكستان',
      'PS': 'فلسطين',
      'PH': 'الفلبين',
      'PL': 'بولندا',
      'PT': 'البرتغال',
      'QA': 'قطر',
      'RO': 'رومانيا',
      'RU': 'روسيا',
      'SA': 'السعودية',
      'RS': 'صربيا',
      'SG': 'سنغافورة',
      'SO': 'الصومال',
      'ZA': 'جنوب أفريقيا',
      'KR': 'كوريا الجنوبية',
      'ES': 'إسبانيا',
      'SD': 'السودان',
      'SE': 'السويد',
      'CH': 'سويسرا',
      'SY': 'سوريا',
      'TN': 'تونس',
      'TR': 'تركيا',
      'TM': 'تركمانستان',
      'UA': 'أوكرانيا',
      'AE': 'الإمارات العربية المتحدة',
      'GB': 'المملكة المتحدة',
      'US': 'الولايات المتحدة',
      'UZ': 'أوزبكستان',
      'YE': 'اليمن',
      'other': '$code',
    });
    return '$_temp0';
  }

  @override
  String get pageNotFound => 'هذه الصفحة غير موجودة';

  @override
  String get goHome => 'العودة إلى الرئيسية';

  @override
  String get profileSaved => 'تم حفظ الملف الشخصي';

  @override
  String get editProfile => 'تعديل الملف الشخصي';

  @override
  String get save => 'حفظ';

  @override
  String get fullName => 'الاسم الكامل';

  @override
  String get enterName => 'أدخل اسمك.';

  @override
  String get emailOptional => 'البريد الإلكتروني (اختياري)';

  @override
  String get enterValidEmail => 'أدخل بريدًا إلكترونيًا صحيحًا.';

  @override
  String get enterEmail => 'أدخل بريدك الإلكتروني.';

  @override
  String get enterCity => 'أدخل مدينتك.';

  @override
  String get cityOptional => 'المدينة (اختياري)';

  @override
  String get mobileNumber => 'رقم الجوال';

  @override
  String get mobileNumberLocked =>
      'تسجّل الدخول برقم جوالك، لذا لا يمكن تغييره هنا.';

  @override
  String signOutDeviceTitle(String device) {
    return 'تسجيل الخروج من $device؟';
  }

  @override
  String get signOutDeviceMessage =>
      'سيحتاج ذلك الجهاز إلى رمز تحقق لتسجيل الدخول مرة أخرى.';

  @override
  String get signOut => 'تسجيل الخروج';

  @override
  String signOutDevice(String device) {
    return 'تسجيل الخروج من $device';
  }

  @override
  String get registeredDevices => 'الأجهزة المسجّلة';

  @override
  String deviceLimit(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'يمكنك استخدام $count جهاز مع هذا الحساب.',
      many: 'يمكنك استخدام $count جهازًا مع هذا الحساب.',
      few: 'يمكنك استخدام $count أجهزة مع هذا الحساب.',
      two: 'يمكنك استخدام جهازين مع هذا الحساب.',
      one: 'يمكنك استخدام جهاز واحد مع هذا الحساب.',
    );
    return '$_temp0';
  }

  @override
  String thisDevice(String device) {
    return '$device (هذا الجهاز)';
  }

  @override
  String lastUsed(String date) {
    return 'آخر استخدام $date';
  }

  @override
  String get myCertificates => 'شهاداتي';

  @override
  String get noCertificatesTitle => 'لا توجد شهادات بعد';

  @override
  String get noCertificatesMessage => 'أكمل دورة للحصول على شهادتها.';

  @override
  String get noQuizResultsTitle => 'لا توجد نتائج اختبارات بعد';

  @override
  String get noQuizResultsMessage => 'ستظهر درجات اختباراتك هنا.';

  @override
  String get quizResults => 'نتائج الاختبارات';

  @override
  String get justNow => 'الآن';

  @override
  String minutesAgo(int minutes) {
    return 'قبل $minutes د';
  }

  @override
  String hoursAgo(int hours) {
    return 'قبل $hours س';
  }

  @override
  String get yesterday => 'أمس';

  @override
  String daysAgo(int days) {
    return 'قبل $days أيام';
  }

  @override
  String get noNotificationsTitle => 'لا توجد إشعارات بعد';

  @override
  String get noNotificationsMessage =>
      'ستظهر هنا الدروس الجديدة والإعلانات والإجابات عن أسئلتك.';

  @override
  String get notifications => 'الإشعارات';

  @override
  String get unread => 'غير مقروء';

  @override
  String get noOrdersTitle => 'لا توجد طلبات بعد';

  @override
  String get noOrdersMessage => 'تظهر مشترياتك هنا.';

  @override
  String get myOrders => 'طلباتي';

  @override
  String orderNumber(String number) {
    return 'الطلب رقم $number';
  }

  @override
  String lineQuantity(String name, int quantity) {
    return '$name × $quantity';
  }

  @override
  String get logOutTitle => 'تسجيل الخروج؟';

  @override
  String get logOutMessage => 'ستحتاج إلى رمز تحقق لتسجيل الدخول مرة أخرى.';

  @override
  String get logOut => 'تسجيل الخروج';

  @override
  String get edit => 'تعديل';

  @override
  String get shopping => 'التسوق';

  @override
  String get learning => 'التعلّم';

  @override
  String get wishlist => 'قائمة الرغبات';

  @override
  String get accountAndApp => 'الحساب والتطبيق';

  @override
  String get settings => 'الإعدادات';

  @override
  String get helpAndSupport => 'المساعدة والدعم';

  @override
  String get privacyPolicy => 'سياسة الخصوصية';

  @override
  String get termsAndConditions => 'الشروط والأحكام';

  @override
  String get deleteAccountTitle => 'حذف حسابك؟';

  @override
  String get deleteAccountMessage =>
      'سيُحذف حسابك وتقدّمك وتسجيلاتك، وسيتم تسجيل الخروج من كل الأجهزة. لا يمكن التراجع عن ذلك.';

  @override
  String get deleteAccount => 'حذف الحساب';

  @override
  String get accountDeleted => 'تم حذف حسابك.';

  @override
  String get display => 'العرض';

  @override
  String get appearance => 'المظهر';

  @override
  String get themeSystem => 'النظام';

  @override
  String get themeLight => 'فاتح';

  @override
  String get themeDark => 'داكن';

  @override
  String get video => 'الفيديو';

  @override
  String get defaultQuality => 'الجودة الافتراضية';

  @override
  String get playbackSpeed => 'سرعة التشغيل';

  @override
  String get autoplayNext => 'تشغيل الدرس التالي تلقائيًا';

  @override
  String get newsAndOffers => 'الأخبار والعروض';

  @override
  String get notifyNewLessons => 'الدروس الجديدة في دوراتي';

  @override
  String get notifyAnnouncements => 'إعلانات المدرّبين';

  @override
  String get notifyDailyReminder => 'تذكير يومي بالدراسة';

  @override
  String get security => 'الأمان';

  @override
  String devicesUsed(int used, int limit) {
    return '$used من $limit';
  }

  @override
  String version(String version) {
    return 'الإصدار $version';
  }

  @override
  String get language => 'اللغة';

  @override
  String get notNow => 'ليس الآن';

  @override
  String get welcome => 'مرحبًا';

  @override
  String get signInIntro => 'سجّل الدخول برقم جوالك وسنرسل إليك رمز تحقق.';

  @override
  String chooseCountryCode(String code) {
    return 'رمز الدولة $code. اختر رمز الدولة';
  }

  @override
  String get sendCode => 'إرسال الرمز';

  @override
  String get signInNewHere =>
      'جديد هنا؟ سنطلب اسمك بعد التحقق وننشئ حسابك بهذا الرقم.';

  @override
  String signInRegisteredOnly(String site) {
    return 'استخدم رقم الجوال المسجّل لدى $site.';
  }

  @override
  String tooManyAttemptsSeconds(int seconds) {
    return 'محاولات كثيرة جدًا. حاول مرة أخرى بعد $seconds ثانية.';
  }

  @override
  String logoOf(String name) {
    return 'شعار $name';
  }

  @override
  String legalAgreeBoth(String terms, String privacy) {
    return 'بالمتابعة، فإنك توافق على $terms و$privacy';
  }

  @override
  String legalAgreeOne(String document) {
    return 'بالمتابعة، فإنك توافق على $document';
  }

  @override
  String get searchCountry => 'ابحث عن دولة أو رمز';

  @override
  String useCode(String code) {
    return 'استخدم $code';
  }

  @override
  String get codeExpired => 'انتهت صلاحية هذا الرمز. اطلب رمزًا جديدًا.';

  @override
  String get noAccountForNumber =>
      'لا يوجد حساب بهذا الرقم. يُرجى التواصل مع الأكاديمية.';

  @override
  String get newCodeSent => 'أرسلنا إليك رمزًا جديدًا.';

  @override
  String get enterCode => 'أدخل رمز التحقق';

  @override
  String codeSentTo(String number) {
    return 'أرسلنا رمزًا إلى $number';
  }

  @override
  String get changeNumber => 'تغيير الرقم';

  @override
  String resendCodeIn(String time) {
    return 'يمكنك طلب رمز جديد بعد $time';
  }

  @override
  String get sending => 'جارٍ الإرسال…';

  @override
  String get sendNewCode => 'إرسال رمز جديد';

  @override
  String get verifyAndSignIn => 'تحقّق وسجّل الدخول';

  @override
  String codeFieldLabel(int length) {
    return 'رمز التحقق، $length أرقام';
  }

  @override
  String get createYourAccount => 'أنشئ حسابك';

  @override
  String signupIntro(String site) {
    return 'تم التحقق من رقمك. أخبرنا باسمك لإكمال الانضمام إلى $site.';
  }

  @override
  String get createAccount => 'إنشاء الحساب';

  @override
  String get loadingHome => 'جارٍ تحميل الصفحة الرئيسية';

  @override
  String get goodMorning => 'صباح الخير';

  @override
  String get goodAfternoon => 'مساء الخير';

  @override
  String get goodEvening => 'مساء الخير';

  @override
  String get continueLearning => 'تابع التعلّم';

  @override
  String get categories => 'الفئات';

  @override
  String get featuredCourses => 'دورات مميزة';

  @override
  String get latestCourses => 'أحدث الدورات';

  @override
  String notificationsUnread(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'الإشعارات، $count غير مقروء',
      many: 'الإشعارات، $count غير مقروء',
      few: 'الإشعارات، $count غير مقروءة',
      two: 'الإشعارات، اثنان غير مقروءين',
      one: 'الإشعارات، واحد غير مقروء',
    );
    return '$_temp0';
  }

  @override
  String get announcement => 'إعلان';

  @override
  String get searchForCourse => 'ابحث عن دورة';

  @override
  String get welcomeBack => 'مرحبًا بعودتك،';

  @override
  String get whatToLearn => 'ماذا تريد أن تتعلّم؟';

  @override
  String get forYou => 'لك';

  @override
  String get newCourses => 'جديد';

  @override
  String get learn => 'تعلّم';

  @override
  String get searchCourses => 'ابحث في الدورات';

  @override
  String get newCoursesShowHere => 'ستظهر الدورات الجديدة هنا.';

  @override
  String get noCoursesYet => 'لا توجد دورات بعد';

  @override
  String courseCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count دورة',
      many: '$count دورة',
      few: '$count دورات',
      two: 'دورتان',
      one: 'دورة واحدة',
      zero: 'لا دورات',
    );
    return '$_temp0';
  }

  @override
  String lessonCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count درس',
      many: '$count درسًا',
      few: '$count دروس',
      two: 'درسان',
      one: 'درس واحد',
      zero: 'لا دروس',
    );
    return '$_temp0';
  }

  @override
  String questionCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count سؤال',
      many: '$count سؤالًا',
      few: '$count أسئلة',
      two: 'سؤالان',
      one: 'سؤال واحد',
      zero: 'لا أسئلة',
    );
    return '$_temp0';
  }

  @override
  String answerCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count إجابة',
      many: '$count إجابة',
      few: '$count إجابات',
      two: 'إجابتان',
      one: 'إجابة واحدة',
      zero: 'لا إجابات',
    );
    return '$_temp0';
  }

  @override
  String ratingCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count تقييم',
      many: '$count تقييمًا',
      few: '$count تقييمات',
      two: 'تقييمان',
      one: 'تقييم واحد',
      zero: 'لا تقييمات',
    );
    return '$_temp0';
  }

  @override
  String reviewCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مراجعة',
      many: '$count مراجعة',
      few: '$count مراجعات',
      two: 'مراجعتان',
      one: 'مراجعة واحدة',
      zero: 'لا مراجعات',
    );
    return '$_temp0';
  }

  @override
  String starCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count نجمة',
      many: '$count نجمة',
      few: '$count نجوم',
      two: 'نجمتان',
      one: 'نجمة واحدة',
    );
    return '$_temp0';
  }

  @override
  String get enrolled => 'مسجّل';

  @override
  String ratedOutOf5(String rating) {
    return 'التقييم $rating من 5';
  }

  @override
  String continueCourseLabel(String title, int percent) {
    return 'تابع $title، مكتمل بنسبة $percent%';
  }

  @override
  String continueCourseNextLabel(String title, int percent, String next) {
    return 'تابع $title، مكتمل بنسبة $percent%، التالي: $next';
  }

  @override
  String lessonsDone(int done, int total) {
    return '$done من $total دروس';
  }

  @override
  String get continueAction => 'متابعة';

  @override
  String get sortPopular => 'الأكثر شيوعًا';

  @override
  String get sortAtoZ => 'أبجديًا';

  @override
  String get allCourses => 'كل الدورات';

  @override
  String get searchCoursesHint => 'اسم الدورة أو المدرّب';

  @override
  String get filtersAndSorting => 'التصفية والترتيب';

  @override
  String get paid => 'مدفوع';

  @override
  String removeFilter(String name) {
    return '$name  ×';
  }

  @override
  String get noCoursesFound => 'لم يتم العثور على دورات';

  @override
  String get noCoursesFoundFiltered =>
      'جرّب بحثًا مختلفًا أو امسح عوامل التصفية.';

  @override
  String get noCoursesPublished => 'ستظهر الدورات هنا عند نشرها.';

  @override
  String get clearFilters => 'مسح عوامل التصفية';

  @override
  String get loadMoreFailed => 'تعذّر تحميل المزيد. حاول مرة أخرى';

  @override
  String get loadingMoreCourses => 'جارٍ تحميل المزيد من الدورات';

  @override
  String get sortByTitle => 'ترتيب حسب';

  @override
  String get category => 'الفئة';

  @override
  String get categoriesFailed => 'تعذّر تحميل الفئات.';

  @override
  String get showCourses => 'عرض الدورات';

  @override
  String get enrollToOpen => 'سجّل في هذه الدورة لفتح هذا العنصر.';

  @override
  String get assignmentsOnWebsite =>
      'الواجبات والحصص المباشرة متاحة على الموقع حاليًا.';

  @override
  String get enrolledMessage => 'تم تسجيلك. تعلّمًا ممتعًا!';

  @override
  String get checkout => 'الدفع';

  @override
  String get checkoutFailed => 'تعذّر فتح صفحة الدفع.';

  @override
  String get loadingCourse => 'جارٍ تحميل الدورة';

  @override
  String get overview => 'نظرة عامة';

  @override
  String get curriculum => 'المنهج';

  @override
  String get reviews => 'المراجعات';

  @override
  String get questionsAndAnswers => 'الأسئلة والأجوبة';

  @override
  String get removeFromWishlist => 'إزالة من قائمة الرغبات';

  @override
  String get addToWishlist => 'إضافة إلى قائمة الرغبات';

  @override
  String get certificate => 'شهادة';

  @override
  String get instructor => 'المدرّب';

  @override
  String get noDescription => 'لا يوجد وصف بعد.';

  @override
  String get aboutInstructor => 'عن المدرّب';

  @override
  String get curriculumEmpty => 'سيظهر المنهج هنا.';

  @override
  String get loadingCurriculum => 'جارٍ تحميل المنهج';

  @override
  String get freePreviewLower => 'معاينة مجانية';

  @override
  String get lockedLower => 'مقفل';

  @override
  String get completedLower => 'مكتمل';

  @override
  String get freePreview => 'معاينة مجانية';

  @override
  String get enrollForFree => 'سجّل مجانًا';

  @override
  String get enrollNow => 'سجّل الآن';

  @override
  String get coursePrice => 'سعر الدورة';

  @override
  String get askQuestion => 'اطرح سؤالًا';

  @override
  String get askQuestionHint => 'ماذا تريد أن تسأل عن هذه الدورة؟';

  @override
  String get sendQuestion => 'إرسال السؤال';

  @override
  String get loadingQuestions => 'جارٍ تحميل الأسئلة';

  @override
  String get noQuestionsTitle => 'لا توجد أسئلة بعد';

  @override
  String get noQuestionsMessage => 'اسأل المدرّب أي شيء عن هذه الدورة.';

  @override
  String get loadingEllipsis => 'جارٍ التحميل…';

  @override
  String get showMoreQuestions => 'عرض المزيد من الأسئلة';

  @override
  String get noAnswersYet => 'لا توجد إجابات بعد';

  @override
  String get writeReply => 'اكتب ردًا';

  @override
  String get sendReply => 'إرسال الرد';

  @override
  String get answerNotification => 'ستصلك إشعار عندما يجيب المدرّب.';

  @override
  String get loadingQuestion => 'جارٍ تحميل السؤال';

  @override
  String get writeReview => 'اكتب مراجعة';

  @override
  String get editReview => 'عدّل مراجعتك';

  @override
  String get reviewHint => 'ما الذي أعجبك؟ وما الذي يمكن تحسينه؟ (اختياري)';

  @override
  String get postReview => 'نشر المراجعة';

  @override
  String get chooseRating => 'اختر تقييمًا من 1 إلى 5 نجوم.';

  @override
  String get reviewPending =>
      'شكرًا! ستظهر مراجعتك بعد موافقة الأكاديمية عليها.';

  @override
  String get reviewThanks => 'شكرًا على مراجعتك!';

  @override
  String get loadingReviews => 'جارٍ تحميل المراجعات';

  @override
  String get noReviewsBeFirst => 'لا توجد مراجعات بعد. كن أول من يشارك رأيه.';

  @override
  String get noReviews => 'لا توجد مراجعات بعد.';

  @override
  String get showMoreReviews => 'عرض المزيد من المراجعات';

  @override
  String starsCount(int stars, int count) {
    return '$stars نجوم: $count';
  }

  @override
  String get reviewAwaitingApproval => 'بانتظار موافقة الأكاديمية.';

  @override
  String personYou(String name) {
    return '$name (أنت)';
  }

  @override
  String ratingOutOf5(String rating) {
    return '$rating من 5';
  }

  @override
  String get inProgress => 'قيد التقدم';

  @override
  String get completed => 'مكتمل';

  @override
  String get noCoursesInProgress => 'لا توجد دورات قيد التقدم';

  @override
  String get noCompletedCourses => 'لا توجد دورات مكتملة بعد';

  @override
  String get noCoursesInProgressMessage => 'ستظهر هنا الدورات التي تسجّل فيها.';

  @override
  String get noCompletedCoursesMessage => 'أكمل دورة لتراها هنا.';

  @override
  String get browseCourses => 'تصفّح الدورات';

  @override
  String courseProgressLabel(String title, int percent) {
    return '$title، مكتمل بنسبة $percent%';
  }

  @override
  String courseProgressNextLabel(String title, int percent, String next) {
    return '$title، مكتمل بنسبة $percent%، التالي: $next';
  }

  @override
  String nextItem(String title) {
    return 'التالي: $title';
  }

  @override
  String get wishlistEmptyTitle => 'قائمة رغباتك فارغة';

  @override
  String get wishlistEmptyMessage =>
      'اضغط على القلب في أي دورة لحفظها لوقت لاحق.';

  @override
  String get courseComplete => 'اكتملت الدورة. أحسنت!';

  @override
  String lessonComplete(int percent) {
    return 'اكتمل الدرس · أُنجز $percent% من الدورة';
  }

  @override
  String get keepWatching => 'تابع المشاهدة';

  @override
  String get watchMore => 'شاهد المزيد من الفيديو قبل تعيين هذا الدرس كمكتمل.';

  @override
  String watchAtLeast(int percent) {
    return 'شاهد $percent% على الأقل من الفيديو قبل تعيين هذا الدرس كمكتمل.';
  }

  @override
  String get ok => 'حسنًا';

  @override
  String get loadingLesson => 'جارٍ تحميل الدرس';

  @override
  String get lessonLocked => 'هذا الدرس مقفل';

  @override
  String get lessonLockedEnroll => 'سجّل في الدورة لفتح هذا الدرس.';

  @override
  String get lessonLockedSignIn => 'سجّل الدخول لفتح هذا الدرس.';

  @override
  String lessonPosition(int index, int total) {
    return 'الدرس $index من $total';
  }

  @override
  String get lesson => 'درس';

  @override
  String get lessons => 'الدروس';

  @override
  String get notes => 'الملاحظات';

  @override
  String get attachments => 'المرفقات';

  @override
  String get noAttachments => 'لا توجد مرفقات لهذا الدرس.';

  @override
  String get previousLesson => 'الدرس السابق';

  @override
  String get signInToTrack => 'سجّل الدخول لتتبّع تقدّمك';

  @override
  String get markComplete => 'تعيين كمكتمل';

  @override
  String get nextLesson => 'الدرس التالي';

  @override
  String get playingNow => 'قيد التشغيل الآن';

  @override
  String sizeBytes(int size) {
    return '$size بايت';
  }

  @override
  String sizeKilobytes(String size) {
    return '$size ك.ب';
  }

  @override
  String sizeMegabytes(String size) {
    return '$size م.ب';
  }

  @override
  String get videoFailed => 'تعذّر تشغيل الفيديو.';

  @override
  String get loadingVideo => 'جارٍ تحميل الفيديو';

  @override
  String get screenRecording =>
      'تسجيل الشاشة يعمل. أوقف التسجيل لمتابعة المشاهدة.';

  @override
  String get videoUnavailable => 'هذا الفيديو غير متاح.';

  @override
  String get pause => 'إيقاف مؤقت';

  @override
  String get play => 'تشغيل';

  @override
  String get playAgain => 'إعادة التشغيل';

  @override
  String positionOf(String position, String duration) {
    return '$position من $duration';
  }

  @override
  String playbackSpeedIs(String speed) {
    return 'سرعة التشغيل $speed';
  }

  @override
  String get exitFullScreen => 'الخروج من ملء الشاشة';

  @override
  String get fullScreen => 'ملء الشاشة';

  @override
  String get loadingEmbed => 'جارٍ تحميل المحتوى المضمّن';

  @override
  String embedFrom(String host) {
    return 'محتوى مضمّن من $host';
  }

  @override
  String get openFullScreen => 'فتح بملء الشاشة';

  @override
  String get interactive => 'تفاعلي';

  @override
  String get embeddedContent => 'محتوى مضمّن';

  @override
  String get opensFullScreen => 'يُفتح هذا المحتوى بملء الشاشة.';

  @override
  String get open => 'فتح';

  @override
  String get rotateScreen => 'تدوير الشاشة';

  @override
  String get code => 'كود';

  @override
  String codeIn(String language) {
    return 'كود بلغة $language';
  }

  @override
  String get copyCode => 'نسخ الكود';

  @override
  String get codeCopied => 'تم نسخ الكود';

  @override
  String get copy => 'نسخ';

  @override
  String get answerTrue => 'صح';

  @override
  String get answerFalse => 'خطأ';

  @override
  String get submitQuizTitle => 'إرسال الاختبار؟';

  @override
  String unansweredQuestions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count سؤال بلا إجابة بعد.',
      many: '$count سؤالًا بلا إجابة بعد.',
      few: '$count أسئلة بلا إجابة بعد.',
      two: 'سؤالان بلا إجابة بعد.',
      one: 'سؤال واحد بلا إجابة بعد.',
    );
    return '$_temp0';
  }

  @override
  String get submit => 'إرسال';

  @override
  String get timeUp => 'انتهى الوقت. تم إرسال إجاباتك.';

  @override
  String get leaveQuizTitle => 'مغادرة الاختبار؟';

  @override
  String get leaveQuizMessage => 'لن يتم إرسال إجاباتك.';

  @override
  String get leave => 'مغادرة';

  @override
  String get closeQuiz => 'إغلاق الاختبار';

  @override
  String get loadingQuiz => 'جارٍ تحميل الاختبار';

  @override
  String timeLeft(String time) {
    return 'الوقت المتبقي $time';
  }

  @override
  String get quizNoQuestions => 'لا توجد أسئلة في هذا الاختبار بعد';

  @override
  String questionPosition(int index, int total) {
    return 'السؤال $index من $total';
  }

  @override
  String get previous => 'السابق';

  @override
  String get submitQuiz => 'إرسال الاختبار';

  @override
  String get nextQuestion => 'السؤال التالي';

  @override
  String timeLimit(String duration) {
    return 'المدة المحددة $duration';
  }

  @override
  String passMark(int percent) {
    return 'درجة النجاح $percent%';
  }

  @override
  String get unlimitedAttempts => 'محاولات غير محدودة';

  @override
  String attemptsUsed(int used, int allowed) {
    return 'استُخدمت $used من $allowed محاولات';
  }

  @override
  String get lastResult => 'آخر نتيجة';

  @override
  String get startQuiz => 'ابدأ الاختبار';

  @override
  String get startNewAttempt => 'ابدأ محاولة جديدة';

  @override
  String get noAttemptsLeft => 'لقد استخدمت كل محاولاتك لهذا الاختبار.';

  @override
  String get youPassed => 'لقد نجحت';

  @override
  String get notPassedThisTime => 'لم تنجح هذه المرة';

  @override
  String get submittedForReview => 'أُرسل للمراجعة';

  @override
  String yourScore(String score) {
    return 'درجتك: $score%';
  }

  @override
  String passMarkColon(int percent) {
    return 'درجة النجاح: $percent%';
  }

  @override
  String get instructorWillReview => 'سيراجع المدرّب إجاباتك.';

  @override
  String get backToCourse => 'العودة إلى الدورة';

  @override
  String get questionNotSupported => 'لا يمكن عرض هذا السؤال في التطبيق.';

  @override
  String get answerBelow => 'أجب أدناه. تُحفظ إجابتك عند الانتقال.';

  @override
  String get chooseAll => 'اختر كل ما ينطبق';

  @override
  String get chooseOne => 'اختر إجابة واحدة';

  @override
  String get quiz => 'اختبار';

  @override
  String get noDeliveryDays => 'لا توجد أيام توصيل متاحة حاليًا.';

  @override
  String get deliveryDate => 'تاريخ التوصيل';

  @override
  String get deliveryDateOptional => 'تاريخ التوصيل (اختياري)';

  @override
  String get emptyCartTitle => 'إفراغ سلتك؟';

  @override
  String get emptyCartMessage => 'ستُزال كل المنتجات من سلتك.';

  @override
  String get emptyCart => 'إفراغ السلة';

  @override
  String get orderPlaced => 'شكرًا! تم تقديم طلبك.';

  @override
  String get shopClosedTitle => 'المتجر مغلق حاليًا';

  @override
  String get tryLater => 'يُرجى المحاولة لاحقًا.';

  @override
  String get cartEmptyTitle => 'سلتك فارغة';

  @override
  String get cartEmptyMessage => 'تظهر هنا المنتجات التي تضيفها.';

  @override
  String get startShopping => 'ابدأ التسوق';

  @override
  String get choose => 'اختر';

  @override
  String get giftMessage => 'رسالة الهدية (اختياري)';

  @override
  String get giftMessageHint => 'سنضيفها إلى طلبك.';

  @override
  String get subtotal => 'المجموع الفرعي';

  @override
  String get deliveryAndTaxes => 'تُضاف رسوم التوصيل والضرائب عند الدفع.';

  @override
  String get fixCartItems => 'غيّر العناصر المحددة أعلاه أو أزلها للمتابعة.';

  @override
  String get chooseDeliveryDate => 'اختر تاريخ التوصيل للمتابعة.';

  @override
  String removeItem(String name) {
    return 'إزالة $name';
  }

  @override
  String get customerReviewsShowHere => 'تظهر هنا مراجعات العملاء.';

  @override
  String get loadingProduct => 'جارٍ تحميل المنتج';

  @override
  String get addedToCart => 'تمت الإضافة إلى السلة';

  @override
  String get cartFull => 'سلتك ممتلئة.';

  @override
  String get viewCart => 'عرض السلة';

  @override
  String cartWithItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'السلة، $count منتج',
      many: 'السلة، $count منتجًا',
      few: 'السلة، $count منتجات',
      two: 'السلة، منتجان',
      one: 'السلة، منتج واحد',
    );
    return '$_temp0';
  }

  @override
  String get youMayAlsoLike => 'قد يعجبك أيضًا';

  @override
  String get addToCart => 'أضف إلى السلة';

  @override
  String chooseOptions(String options) {
    return 'اختر $options';
  }

  @override
  String get notAvailableInOptions => 'غير متاح بهذه الخيارات';

  @override
  String get outOfStock => 'نفد من المخزون';

  @override
  String get notSoldInApp => 'لا يُباع هذا المنتج في التطبيق.';

  @override
  String get optionsLower => 'الخيارات';

  @override
  String get listAnd => ' و';

  @override
  String get productPhoto => 'صورة المنتج';

  @override
  String productPhotoOf(int index, int total) {
    return 'صورة المنتج $index من $total';
  }

  @override
  String get quantity => 'الكمية';

  @override
  String get sortBestSelling => 'الأكثر مبيعًا';

  @override
  String get sortTopRated => 'الأعلى تقييمًا';

  @override
  String get sortName => 'الاسم';

  @override
  String get searchProducts => 'ابحث في المنتجات';

  @override
  String get onSale => 'عليه تخفيض';

  @override
  String get loadingProducts => 'جارٍ تحميل المنتجات';

  @override
  String get noProductsTitle => 'لم يتم العثور على منتجات';

  @override
  String get noProductsMessage => 'جرّب بحثًا أو فئة أخرى.';

  @override
  String get loadingMoreProducts => 'جارٍ تحميل المزيد من المنتجات';

  @override
  String get loadingShop => 'جارٍ تحميل المتجر';

  @override
  String get shopGettingReady => 'المتجر قيد التجهيز';

  @override
  String get newProductsSoon => 'ستظهر المنتجات الجديدة هنا قريبًا.';

  @override
  String get newArrivals => 'وصل حديثًا';

  @override
  String get bestSellers => 'الأكثر مبيعًا';

  @override
  String get offer => 'عرض';

  @override
  String wasPrice(String price) {
    return 'كان $price';
  }

  @override
  String get inStock => 'متوفر';

  @override
  String get onBackorder => 'متاح بالطلب المسبق';

  @override
  String get onSaleLower => 'عليه تخفيض';

  @override
  String get outOfStockLower => 'نفد من المخزون';

  @override
  String get sale => 'تخفيض';

  @override
  String get fewer => 'أقل';

  @override
  String quantityIs(int quantity) {
    return 'الكمية $quantity';
  }

  @override
  String get more => 'أكثر';

  @override
  String get loadingAppointments => 'جارٍ تحميل المواعيد';

  @override
  String get noUpcomingAppointments => 'لا توجد مواعيد قادمة';

  @override
  String get noUpcomingAppointmentsMessage => 'احجز موعدًا وسيظهر هنا.';

  @override
  String get bookAppointment => 'احجز موعدًا';

  @override
  String get noPastAppointments => 'لا توجد مواعيد سابقة';

  @override
  String get upcoming => 'القادمة';

  @override
  String get past => 'السابقة';

  @override
  String get cancelAppointmentTitle => 'إلغاء هذا الموعد؟';

  @override
  String get cancelAppointment => 'إلغاء الموعد';

  @override
  String get appointmentCancelled => 'تم إلغاء موعدك.';

  @override
  String get appointment => 'الموعد';

  @override
  String get loadingAppointment => 'جارٍ تحميل الموعد';

  @override
  String get cancelling => 'جارٍ الإلغاء';

  @override
  String withStaff(String name) {
    return 'مع $name';
  }

  @override
  String withStaffLower(String name) {
    return 'مع $name';
  }

  @override
  String get contactToChange => 'لتغييره أو إلغائه، يُرجى التواصل معنا.';

  @override
  String get tooLateToCancel =>
      'فات الأوان للإلغاء من التطبيق. لتغييره، يُرجى التواصل معنا.';

  @override
  String cancelUpTo(String duration) {
    return 'يمكنك الإلغاء قبل موعد البدء بـ $duration على الأقل.';
  }

  @override
  String get gettingReady => 'قيد التجهيز';

  @override
  String get servicesSoon => 'ستظهر هنا قريبًا الخدمات التي يمكنك حجزها.';

  @override
  String get nextAppointment => 'موعدك القادم';

  @override
  String get services => 'الخدمات';

  @override
  String get ourTeam => 'فريقنا';

  @override
  String get loadingService => 'جارٍ تحميل الخدمة';

  @override
  String get appointmentBooked => 'تم حجز موعدك.';

  @override
  String get slotTaken => 'تم حجز هذا الوقت للتو. يُرجى اختيار وقت آخر.';

  @override
  String get withTitle => 'مع';

  @override
  String get chooseTime => 'اختر وقتًا';

  @override
  String get findingTimes => 'جارٍ البحث عن أوقات متاحة';

  @override
  String bookSlot(String time) {
    return 'احجز $time';
  }

  @override
  String dayAtTime(String day, String time) {
    return '$day الساعة $time';
  }

  @override
  String get noTimesThisWeek => 'لا توجد أوقات متاحة هذا الأسبوع';

  @override
  String get tryAnotherWeek => 'جرّب أسبوعًا آخر، أو أي شخص متاح.';

  @override
  String get nextWeek => 'الأسبوع التالي';

  @override
  String get previousWeek => 'الأسبوع السابق';

  @override
  String get noTimesThisDay => 'لا توجد أوقات متاحة في هذا اليوم.';

  @override
  String timesIn(String zone) {
    return 'الأوقات بتوقيت $zone.';
  }

  @override
  String get anyone => 'أي شخص';

  @override
  String freeTimeCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count وقت متاح',
      many: '$count وقتًا متاحًا',
      few: '$count أوقات متاحة',
      two: 'وقتان متاحان',
      one: 'وقت متاح واحد',
    );
    return '$_temp0';
  }

  @override
  String get noFreeTimes => 'لا أوقات متاحة';

  @override
  String get confirmYourBooking => 'أكّد حجزك';

  @override
  String get anyoneAvailable => 'أي شخص متاح';

  @override
  String get noteForBusiness => 'ملاحظة للنشاط التجاري (اختياري)';

  @override
  String get confirmBooking => 'تأكيد الحجز';

  @override
  String get loadingServices => 'جارٍ تحميل الخدمات';

  @override
  String get noServicesYet => 'لا توجد خدمات بعد';

  @override
  String get noMatches => 'لا توجد نتائج';

  @override
  String get servicesShowHere => 'ستظهر هنا الخدمات التي يمكنك حجزها.';

  @override
  String get tryAnotherWord => 'جرّب كلمة أخرى.';

  @override
  String get searchServices => 'ابحث في الخدمات';
}
