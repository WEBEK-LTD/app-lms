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
  String get searchListingsHint => 'المنطقة أو الرقم المرجعي';

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
  String get sideMenuOpen => 'فتح القائمة';

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
  String get updateRecommendedTitle => 'إصدار جديد جاهز';

  @override
  String updateRecommendedMessage(String name) {
    return 'يتوفر إصدار أحدث من $name في المتجر. حدّثه الآن، أو تابع وحدّثه لاحقًا.';
  }

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
  String get deviceNoLimit => 'يمكنك استخدام هذا الحساب على أي عدد من الأجهزة.';

  @override
  String devicesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count جهاز',
      many: '$count جهازًا',
      few: '$count أجهزة',
      two: 'جهازان',
      one: 'جهاز واحد',
      zero: 'لا أجهزة',
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
  String get signInWithPhone => 'الهاتف';

  @override
  String get signInWithEmail => 'البريد الإلكتروني';

  @override
  String get signInMethodLabel => 'تسجيل الدخول باستخدام';

  @override
  String get emailAddress => 'عنوان البريد الإلكتروني';

  @override
  String get password => 'كلمة المرور';

  @override
  String get forgotPassword => 'هل نسيت كلمة المرور؟';

  @override
  String get signInIntroEmail =>
      'سجّل الدخول ببريدك الإلكتروني وسنرسل إليك رمز تحقق.';

  @override
  String get signInIntroPassword =>
      'سجّل الدخول بالبريد الإلكتروني وكلمة المرور الخاصة بحسابك.';

  @override
  String get signInNewHereEmail =>
      'جديد هنا؟ سنطلب اسمك بعد التحقق وننشئ حسابك بهذا البريد الإلكتروني.';

  @override
  String signInPasswordAccountsOnly(String site) {
    return 'استخدم البريد الإلكتروني وكلمة المرور لحسابك على $site.';
  }

  @override
  String get changeEmail => 'تغيير البريد الإلكتروني';

  @override
  String get noAccountForEmail => 'لا يوجد حساب بهذا البريد الإلكتروني.';

  @override
  String get invalidEmail => 'أدخل عنوان بريد إلكتروني صالحًا.';

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
  String get courseLearn => 'ماذا ستتعلّم';

  @override
  String get courseRequirements => 'المتطلبات';

  @override
  String get courseAudience => 'لمن هذه الدورة';

  @override
  String get courseIncludes => 'تتضمّن هذه الدورة';

  @override
  String studentCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count طالب',
      many: '$count طالبًا',
      few: '$count طلاب',
      two: 'طالبان',
      one: 'طالب واحد',
      zero: 'لا طلاب',
    );
    return '$_temp0';
  }

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
  String get back10Seconds => 'رجوع 10 ثوانٍ';

  @override
  String get forward10Seconds => 'تقديم 10 ثوانٍ';

  @override
  String get captionsTurnOn => 'تشغيل الترجمة';

  @override
  String get captionsTurnOff => 'إيقاف الترجمة';

  @override
  String get videoQuality => 'جودة الفيديو';

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

  @override
  String get previewTitle => 'معاينة التطبيق';

  @override
  String get previewInstalledAppOnly => 'متاح في التطبيق المثبّت';

  @override
  String get previewWebPageNote =>
      'صفحات الويب، مثل الفيديوهات المضمّنة وصفحات الدفع، تُفتح في التطبيق المثبّت.';

  @override
  String get previewOpenInNewTab => 'افتح في علامة تبويب جديدة';

  @override
  String get previewCheckoutNote =>
      'إتمام الشراء والدفع يعملان في التطبيق المثبّت. المعاينة لا تأخذ أي مدفوعات.';

  @override
  String get previewSignInNote =>
      'هذه معاينة. سجّل الدخول برقم مراجعة المتجر الخاص بتطبيقك ورمزه. المعاينة لا ترسل رموز تسجيل الدخول أبدًا.';

  @override
  String get previewSignInUnavailable =>
      'تسجيل الدخول يعمل في التطبيق المثبّت. خادم تطبيقك لا يدعم تسجيل الدخول من المعاينة بعد.';

  @override
  String get previewNoLink => 'افتح المعاينة من لوحة تحكم Yallapp.';

  @override
  String get previewExpired =>
      'انتهت صلاحية رابط المعاينة. افتح المعاينة مرة أخرى من لوحة تحكم Yallapp.';

  @override
  String get previewInvalid =>
      'رابط المعاينة غير صالح. افتح المعاينة من لوحة تحكم Yallapp.';

  @override
  String get previewUnreachable =>
      'تعذّر تحميل المعاينة. تحقّق من اتصالك وحاول مرة أخرى.';

  @override
  String get previewNoContent =>
      'اختر مصدر محتوى تطبيقك في خطوة الموقع ضمن الإعداد، ثم أعد تحميل المعاينة.';

  @override
  String previewApiBlocked(String origin) {
    return 'تعذّر على المعاينة الوصول إلى محتوى تطبيقك. إذا كان موقعك أو واجهتك البرمجية يحظر الطلبات من عناوين أخرى، فاسمح بـ $origin. يشرح دليل ربط واجهتك البرمجية في مستندات Yallapp الطريقة.';
  }

  @override
  String get wordingBusiness => 'النشاط التجاري';

  @override
  String get wordingCustomer => 'العميل';

  @override
  String get wordingClinic => 'العيادة';

  @override
  String get wordingPatient => 'المريض';

  @override
  String get clinicDoctor => 'الطبيب';

  @override
  String get clinicOurDoctors => 'أطباؤنا';

  @override
  String get clinicVisits => 'الزيارات';

  @override
  String get clinicVisit => 'الزيارة';

  @override
  String get clinicBookVisit => 'احجز زيارة';

  @override
  String get clinicNextVisit => 'زيارتك القادمة';

  @override
  String get clinicNoUpcomingVisits => 'لا توجد زيارات قادمة';

  @override
  String get clinicNoUpcomingVisitsMessage => 'احجز زيارة وستظهر هنا.';

  @override
  String get clinicNoPastVisits => 'لا توجد زيارات سابقة';

  @override
  String get clinicLoadingVisits => 'جارٍ تحميل الزيارات';

  @override
  String get clinicLoadingVisit => 'جارٍ تحميل الزيارة';

  @override
  String get clinicCancelVisit => 'إلغاء الزيارة';

  @override
  String get clinicCancelVisitTitle => 'هل تريد إلغاء هذه الزيارة؟';

  @override
  String get clinicVisitCancelled => 'تم إلغاء زيارتك.';

  @override
  String get clinicVisitBooked => 'تم حجز زيارتك.';

  @override
  String get clinicAnyDoctor => 'أي طبيب';

  @override
  String get clinicAnyDoctorAvailable => 'أي طبيب متاح';

  @override
  String get clinicNoteForClinic => 'ملاحظة للعيادة (اختياري)';

  @override
  String get clinicConfirmVisit => 'أكّد زيارتك';

  @override
  String get intakeTitle => 'بعض الأسئلة';

  @override
  String intakeIntro(String business) {
    return 'أجب عن هذه الأسئلة قبل الحجز. لا يرى إجاباتك إلا أنت و$business.';
  }

  @override
  String get intakeOptional => 'اختياري';

  @override
  String get intakeRequired => 'يُرجى الإجابة عن هذا السؤال.';

  @override
  String get intakeChooseOne => 'يُرجى اختيار إجابة.';

  @override
  String intakeTooLong(int max) {
    return 'يُرجى استخدام $max حرفًا على الأكثر.';
  }

  @override
  String get intakeChooseDate => 'اختر تاريخًا';

  @override
  String get yourAnswers => 'إجاباتك';

  @override
  String answersPrivate(String business) {
    return 'لا يرى هذه الإجابات إلا أنت و$business.';
  }

  @override
  String get staffSpecialties => 'التخصصات';

  @override
  String get staffLanguages => 'اللغات';

  @override
  String staffAbout(String name) {
    return 'نبذة عن $name';
  }

  @override
  String get staffViewProfile => 'عرض الملف الشخصي';

  @override
  String get tabLatest => 'الأحدث';

  @override
  String get tabSaved => 'المحفوظات';

  @override
  String get newsTopStories => 'أهم الأخبار';

  @override
  String get newsLatest => 'الأحدث';

  @override
  String get newsAll => 'الكل';

  @override
  String get newsSearchHint => 'ابحث في المقالات';

  @override
  String get loadingArticles => 'جارٍ تحميل المقالات';

  @override
  String get noArticlesTitle => 'لا توجد مقالات بعد';

  @override
  String get noArticlesMessage => 'ستظهر المقالات الجديدة هنا.';

  @override
  String get noArticlesFoundTitle => 'لم يتم العثور على مقالات';

  @override
  String get noArticlesFoundMessage => 'جرّب كلمات أخرى أو قسمًا آخر.';

  @override
  String get noSavedTitle => 'لا توجد مقالات محفوظة';

  @override
  String get noSavedMessage =>
      'اضغط على علامة الحفظ في أي مقال للاحتفاظ به هنا وقراءته لاحقًا، حتى دون اتصال.';

  @override
  String get articleSave => 'حفظ المقال';

  @override
  String get articleUnsave => 'إزالة من المحفوظات';

  @override
  String get articleSavedMessage => 'تم الحفظ. ستجده في المحفوظات.';

  @override
  String get articleShare => 'مشاركة';

  @override
  String articleBy(String author) {
    return 'بقلم $author';
  }

  @override
  String get articleOpenOnSite => 'اقرأ على الموقع';

  @override
  String get notifyBreakingNews => 'الأخبار العاجلة';

  @override
  String get wordingRestaurant => 'المطعم';

  @override
  String get menuTitle => 'القائمة';

  @override
  String get menuSearch => 'ابحث في القائمة';

  @override
  String get menuBrowse => 'تصفح القائمة';

  @override
  String get menuEmptyTitle => 'لا توجد أطباق بعد';

  @override
  String get menuEmptyMessage => 'ستظهر القائمة هنا قريبًا.';

  @override
  String get menuLoading => 'جارٍ تحميل القائمة';

  @override
  String get menuMore => 'المزيد';

  @override
  String get optionsRequired => 'مطلوب';

  @override
  String get optionsOptional => 'اختياري';

  @override
  String get optionsChooseOne => 'اختر واحدًا';

  @override
  String optionsChooseUpTo(int count) {
    return 'اختر حتى $count';
  }

  @override
  String optionsChooseAtLeast(int count) {
    return 'اختر $count على الأقل';
  }

  @override
  String optionsAddToCart(String price) {
    return 'أضف إلى السلة · $price';
  }

  @override
  String optionsMissing(String group) {
    return 'اختر: $group';
  }

  @override
  String get optionsPriceNote => 'يتم تأكيد السعر النهائي في السلة.';

  @override
  String get fulfilmentHow => 'استلام أو توصيل';

  @override
  String get fulfilmentPickup => 'استلام';

  @override
  String get fulfilmentDelivery => 'توصيل';

  @override
  String fulfilmentPickupAt(String address) {
    return 'الاستلام من $address';
  }

  @override
  String get deliveryAddress => 'عنوان التوصيل';

  @override
  String get deliveryAddressHint => 'الشارع والمبنى والشقة';

  @override
  String get deliveryDistrict => 'الحي';

  @override
  String get deliveryNotes => 'ملاحظة لعامل التوصيل (اختياري)';

  @override
  String get deliveryFee => 'رسوم التوصيل';

  @override
  String deliveryMinimum(String amount) {
    return 'الحد الأدنى للطلب مع التوصيل هو $amount.';
  }

  @override
  String get deliveryEnterAddress => 'أدخل عنوان التوصيل.';

  @override
  String get orderTimeTitle => 'متى';

  @override
  String get orderAsap => 'في أقرب وقت ممكن';

  @override
  String orderReadyIn(int minutes) {
    return 'جاهز خلال $minutes دقيقة تقريبًا';
  }

  @override
  String get orderLater => 'جدولة لوقت لاحق';

  @override
  String get orderChooseTime => 'اختر وقتًا';

  @override
  String orderToday(String time) {
    return 'اليوم $time';
  }

  @override
  String orderTomorrow(String time) {
    return 'غدًا $time';
  }

  @override
  String closedNowOpensAt(String time) {
    return 'مغلق الآن — يفتح $time';
  }

  @override
  String get closedNow => 'مغلق الآن';

  @override
  String get closedOrderLater => 'يمكنك الطلب لوقت لاحق.';

  @override
  String get closedComeBack => 'يرجى الطلب عندما نكون مفتوحين.';

  @override
  String get fulfilmentReceived => 'تم الاستلام';

  @override
  String get fulfilmentPreparing => 'قيد التحضير';

  @override
  String get fulfilmentReady => 'جاهز';

  @override
  String get fulfilmentReadyPickup => 'جاهز للاستلام';

  @override
  String get fulfilmentOutForDelivery => 'في الطريق إليك';

  @override
  String get fulfilmentCompleted => 'مكتمل';

  @override
  String get fulfilmentCancelled => 'أُلغي';

  @override
  String get orderCancelledMessage =>
      'تم إلغاء هذا الطلب. يرجى التواصل معنا إذا كانت لديك أسئلة.';

  @override
  String get orderPickupAsap => 'استلام، في أقرب وقت ممكن';

  @override
  String get orderDeliveryAsap => 'توصيل، في أقرب وقت ممكن';

  @override
  String orderPickupAt(String time) {
    return 'استلام في $time';
  }

  @override
  String orderDeliveryAt(String time) {
    return 'توصيل في $time';
  }

  @override
  String get orderUpdatesNote => 'سنرسل إليك إشعارًا في كل خطوة.';

  @override
  String get orderYourOrder => 'طلبك';

  @override
  String get orderTotal => 'المجموع';

  @override
  String get loadingOrder => 'جارٍ تحميل طلبك';

  @override
  String get wordingGym => 'النادي';

  @override
  String get wordingMember => 'العضو';

  @override
  String get fitnessCoach => 'المدرب';

  @override
  String get fitnessOurCoaches => 'مدربونا';

  @override
  String get fitnessAnyCoach => 'أي مدرب';

  @override
  String get fitnessAnyCoachAvailable => 'أي مدرب متاح';

  @override
  String get classesTitle => 'الحصص';

  @override
  String get classesLoading => 'جارٍ تحميل الحصص';

  @override
  String get classesNone => 'لا حصص في هذا اليوم';

  @override
  String get classesNoneMessage => 'اختر يومًا آخر لرؤية حصصه.';

  @override
  String get classesNoTimetable => 'لا توجد حصص بعد';

  @override
  String classesNoTimetableMessage(String business) {
    return 'لم يضف $business حصصه إلى التطبيق بعد.';
  }

  @override
  String classSpotsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مكان متبقٍ',
      many: '$count مكانًا متبقيًا',
      few: '$count أماكن متبقية',
      two: 'مكانان متبقيان',
      one: 'مكان واحد متبقٍ',
      zero: 'لا أماكن متبقية',
    );
    return '$_temp0';
  }

  @override
  String get classFull => 'مكتملة';

  @override
  String get classCancelledLabel => 'أُلغيت';

  @override
  String get classBookedLabel => 'حجزت مكانك';

  @override
  String get classBook => 'احجز';

  @override
  String get classCancel => 'إلغاء';

  @override
  String classBookName(String name) {
    return 'احجز $name';
  }

  @override
  String classCancelName(String name) {
    return 'ألغِ مكانك في $name';
  }

  @override
  String get classCancelTitle => 'هل تريد التخلي عن مكانك؟';

  @override
  String classCancelMessage(String name, String when) {
    return '$name في $when. يمكن لشخص آخر أن يأخذ مكانك.';
  }

  @override
  String get classKeepSpot => 'أبقِ مكاني';

  @override
  String classBooked(String name) {
    return 'حجزت مكانك في $name.';
  }

  @override
  String get classSpotCancelled => 'أصبح مكانك متاحًا من جديد.';

  @override
  String classWith(String name) {
    return 'مع $name';
  }

  @override
  String get classSignInToBook => 'سجّل الدخول لحجز مكان.';

  @override
  String get membershipTitle => 'العضوية';

  @override
  String get membershipLoading => 'جارٍ تحميل عضويتك';

  @override
  String get membershipMine => 'عضويتي';

  @override
  String get membershipNone => 'لا عضوية بعد';

  @override
  String get membershipNoneMessage => 'اختر خطة لحجز الحصص.';

  @override
  String get membershipSignIn => 'سجّل الدخول لرؤية عضويتك وشراء خطة.';

  @override
  String get membershipUnlimited => 'حصص غير محدودة';

  @override
  String membershipClassesLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count حصة متبقية',
      many: '$count حصة متبقية',
      few: '$count حصص متبقية',
      two: 'حصتان متبقيتان',
      one: 'حصة واحدة متبقية',
      zero: 'لا حصص متبقية',
    );
    return '$_temp0';
  }

  @override
  String membershipClasses(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count حصة',
      many: '$count حصة',
      few: '$count حصص',
      two: 'حصتان',
      one: 'حصة واحدة',
    );
    return '$_temp0';
  }

  @override
  String membershipUntil(String date) {
    return 'حتى $date';
  }

  @override
  String get membershipNoEnd => 'بلا تاريخ انتهاء';

  @override
  String get membershipEnded => 'انتهت';

  @override
  String get membershipCancelled => 'أُلغيت';

  @override
  String get membershipActive => 'سارية';

  @override
  String get membershipPlans => 'الخطط';

  @override
  String get membershipNoPlans =>
      'الخطط غير معروضة للبيع في التطبيق حاليًا. اسألنا عند زيارتك.';

  @override
  String get membershipBuy => 'اشترِ';

  @override
  String membershipBuyName(String name) {
    return 'اشترِ $name';
  }

  @override
  String get membershipPerMonth => 'شهريًا';

  @override
  String get membershipPerQuarter => 'كل 3 أشهر';

  @override
  String get membershipPerYear => 'سنويًا';

  @override
  String get membershipPack => 'باقة حصص';

  @override
  String get membershipBought => 'عضويتك سارية الآن.';

  @override
  String get membershipSeePlans => 'اعرض الخطط';

  @override
  String get classGiveBack => 'تخلَّ عن مكاني';

  @override
  String get tabEvents => 'الفعاليات';

  @override
  String get tabTickets => 'تذاكري';

  @override
  String get eventsSearchHint => 'ابحث عن فعالية';

  @override
  String get eventsAll => 'الكل';

  @override
  String get eventsListView => 'قائمة';

  @override
  String get eventsCalendarView => 'تقويم';

  @override
  String get loadingEvents => 'جارٍ تحميل الفعاليات';

  @override
  String get noEventsTitle => 'لا توجد فعاليات بعد';

  @override
  String get noEventsMessage => 'ستظهر الفعاليات الجديدة هنا.';

  @override
  String get noEventsFoundTitle => 'لم نجد فعاليات';

  @override
  String get noEventsFoundMessage => 'جرّب كلمات أخرى أو فئة أخرى.';

  @override
  String get noEventsOnDay => 'لا توجد فعاليات في هذا اليوم.';

  @override
  String get eventsPreviousMonth => 'الشهر السابق';

  @override
  String get eventsNextMonth => 'الشهر التالي';

  @override
  String eventsOnDay(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count فعالية',
      few: '$count فعاليات',
      two: 'فعاليتان',
      one: 'فعالية واحدة',
    );
    return '$_temp0';
  }

  @override
  String get eventOnline => 'عبر الإنترنت';

  @override
  String get eventSoldOut => 'نفدت التذاكر';

  @override
  String get eventCancelledBadge => 'أُلغيت';

  @override
  String get eventEndedBadge => 'انتهت';

  @override
  String eventSpotsLeft(int count) {
    return 'بقي $count';
  }

  @override
  String get eventCancelledMessage => 'أُلغيت هذه الفعالية.';

  @override
  String get eventEndedMessage => 'انتهت هذه الفعالية.';

  @override
  String get eventAddToCalendar => 'أضف إلى التقويم';

  @override
  String get eventShare => 'مشاركة';

  @override
  String get eventJoinOnline => 'انضم عبر الإنترنت';

  @override
  String get eventOnlineNote => 'رابط الانضمام موجود في تذكرتك.';

  @override
  String eventOrganiser(String name) {
    return 'تنظيم $name';
  }

  @override
  String get eventTicketsTitle => 'التذاكر';

  @override
  String get eventNoTickets => 'لم تُطرح التذاكر بعد.';

  @override
  String get eventGetTickets => 'احصل على التذاكر';

  @override
  String get eventBuyTickets => 'اشترِ التذاكر';

  @override
  String get eventSalesEnded => 'انتهى البيع';

  @override
  String eventSalesEnd(String date) {
    return 'ينتهي البيع $date';
  }

  @override
  String get eventNotInApp => 'لا تُباع في التطبيق';

  @override
  String eventYourTickets(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'لديك $count تذكرة',
      few: 'لديك $count تذاكر',
      two: 'لديك تذكرتان',
      one: 'لديك تذكرة واحدة',
    );
    return '$_temp0';
  }

  @override
  String get eventSeeTickets => 'عرض تذاكري';

  @override
  String get eventSeeEvent => 'عرض الفعالية';

  @override
  String get ticketsHowMany => 'عدد التذاكر';

  @override
  String get ticketsNamesTitle => 'الاسم على كل تذكرة';

  @override
  String ticketNameLabel(int number) {
    return 'التذكرة $number';
  }

  @override
  String ticketsGetFree(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'احصل على $count تذكرة مجانية',
      few: 'احصل على $count تذاكر مجانية',
      two: 'احصل على تذكرتين مجانيتين',
      one: 'احصل على تذكرة مجانية',
    );
    return '$_temp0';
  }

  @override
  String get ticketsContinueToPayment => 'المتابعة إلى الدفع';

  @override
  String get ticketsIssuedMessage => 'تم. تذاكرك في «تذاكري».';

  @override
  String get ticketsPaidMessage => 'تم الدفع. تذاكرك في «تذاكري».';

  @override
  String get ticketsSignInTitle => 'تذاكرك هنا';

  @override
  String get ticketsSignInMessage =>
      'سجّل الدخول لترى تذاكرك وتعرضها عند الدخول.';

  @override
  String get noTicketsTitle => 'لا توجد تذاكر بعد';

  @override
  String get noTicketsMessage =>
      'تظهر هنا التذاكر التي تحصل عليها، مع رمز QR للدخول.';

  @override
  String get ticketsOfflineNote =>
      'أنت غير متصل: هذه التذاكر المحفوظة على هذا الهاتف.';

  @override
  String get ticketStatusValid => 'صالحة';

  @override
  String get ticketStatusUsed => 'مستخدمة';

  @override
  String get ticketStatusCancelled => 'ملغاة';

  @override
  String get ticketStatusRefunded => 'مستردة';

  @override
  String refundedAmount(String amount) {
    return 'تم استرداد $amount';
  }

  @override
  String ticketUsedAt(String time) {
    return 'سُجّل الدخول $time';
  }

  @override
  String get ticketShowAtDoor => 'اعرض هذا الرمز عند الدخول';

  @override
  String get ticketCancel => 'إلغاء التذكرة';

  @override
  String get ticketCancelTitle => 'إلغاء هذه التذكرة؟';

  @override
  String get ticketCancelMessage =>
      'سيُعرض مكانك للبيع من جديد، ولا يمكن التراجع عن ذلك.';

  @override
  String get ticketCancelledMessage => 'أُلغيت التذكرة.';

  @override
  String ticketQrLabel(String name) {
    return 'رمز QR لتذكرة $name';
  }

  @override
  String get tabCampaigns => 'الحملات';

  @override
  String get tabMyDonations => 'تبرعاتي';

  @override
  String get loadingCampaigns => 'جارٍ تحميل الحملات';

  @override
  String get noCampaignsTitle => 'لا توجد حملات بعد';

  @override
  String get noCampaignsMessage => 'ستظهر الحملات هنا.';

  @override
  String campaignRaisedOf(String raised, String goal) {
    return '$raised من $goal';
  }

  @override
  String campaignRaised(String raised) {
    return 'تم جمع $raised';
  }

  @override
  String campaignDonors(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count متبرع',
      many: '$count متبرعًا',
      few: '$count متبرعين',
      two: 'متبرعان',
      one: 'متبرع واحد',
      zero: 'لا يوجد متبرعون بعد',
    );
    return '$_temp0';
  }

  @override
  String get campaignGoalReached => 'تم بلوغ الهدف';

  @override
  String get campaignEnded => 'انتهت';

  @override
  String campaignEndsOn(String date) {
    return 'تنتهي في $date';
  }

  @override
  String get donateTitle => 'تبرّع';

  @override
  String get donateChooseAmount => 'اختر مبلغًا';

  @override
  String get donateOtherAmount => 'مبلغ آخر';

  @override
  String donateMinimum(String amount) {
    return 'أقل تبرع هو $amount.';
  }

  @override
  String get donateAmountInvalid => 'أدخل مبلغًا، مثل 250.';

  @override
  String get donateChooseOne => 'اختر أحد المبالغ.';

  @override
  String get donateOnce => 'مرة واحدة';

  @override
  String get donateMonthly => 'شهريًا';

  @override
  String get donateAnonymous => 'تبرّع دون ذكر اسمك';

  @override
  String get donateAnonymousHint => 'لن يظهر اسمك في الحملة.';

  @override
  String get donateMessage => 'رسالة (اختيارية)';

  @override
  String get donateMessageHint => 'كلمات قليلة تظهر مع تبرعك';

  @override
  String donateButton(String amount) {
    return 'تبرّع بمبلغ $amount';
  }

  @override
  String get donateOnWebsite => 'تبرّع عبر موقعنا';

  @override
  String get donateOnWebsiteNote =>
      'يتم تبرعك على موقعنا في المتصفح. عد إلى التطبيق عند الانتهاء.';

  @override
  String get donateClosed => 'انتهت هذه الحملة. شكرًا لدعمك.';

  @override
  String get donateThanks => 'شكرًا لتبرعك!';

  @override
  String get donateFailed => 'تعذر فتح صفحة التبرع. حاول مرة أخرى.';

  @override
  String get donateSignInHint =>
      'سجّل الدخول أولًا لتحتفظ بتبرعاتك وإيصالاتها في التطبيق.';

  @override
  String get recentDonations => 'أحدث التبرعات';

  @override
  String get anonymousDonor => 'متبرع مجهول';

  @override
  String get loadingDonations => 'جارٍ تحميل التبرعات';

  @override
  String get myDonationsSignInTitle => 'تبرعاتك';

  @override
  String get myDonationsSignInMessage => 'سجّل الدخول لترى تبرعاتك وإيصالاتها.';

  @override
  String get noDonationsTitle => 'لا توجد تبرعات بعد';

  @override
  String get noDonationsMessage =>
      'تظهر هنا التبرعات التي تقدمها وأنت مسجل الدخول، مع إيصالاتها.';

  @override
  String get donationReceipt => 'الإيصال';

  @override
  String get downloadReceipt => 'تنزيل الإيصال';

  @override
  String get shipmentTitle => 'الشحنة';

  @override
  String shippedOnDate(String date) {
    return 'شُحن في $date';
  }

  @override
  String trackingNumberLine(String number) {
    return 'رقم التتبّع: $number';
  }

  @override
  String get copyTrackingNumber => 'نسخ رقم التتبّع';

  @override
  String get trackingNumberCopied => 'نُسخ رقم التتبّع.';

  @override
  String get trackShipment => 'تتبّع الشحنة';

  @override
  String waybillLine(String waybill) {
    return 'البوليصة: $waybill';
  }

  @override
  String get openWaybill => 'فتح البوليصة';

  @override
  String get donationSeeCampaign => 'عرض الحملة';

  @override
  String get notifyCampaignUpdates => 'أخبار الحملات';

  @override
  String get pageOpenNow => 'مفتوح الآن';

  @override
  String get pageClosedDay => 'مغلق';

  @override
  String get pageToday => 'اليوم';

  @override
  String get pageDirections => 'الاتجاهات';

  @override
  String get pageWebsite => 'الموقع الإلكتروني';

  @override
  String get countdownDays => 'أيام';

  @override
  String get countdownHours => 'ساعات';

  @override
  String get countdownMinutes => 'دقائق';

  @override
  String get countdownSeconds => 'ثوانٍ';

  @override
  String get socialWhatsappChannel => 'قناة واتساب';

  @override
  String ratingOutOfFive(int count) {
    return '$count من 5 نجوم';
  }

  @override
  String slideOf(int index, int count) {
    return 'الشريحة $index من $count';
  }

  @override
  String get privacyGroup => 'الخصوصية';

  @override
  String get shareUsageStatistics => 'مشاركة إحصاءات الاستخدام';

  @override
  String shareUsageNote(String app) {
    return 'تساعد $app على معرفة كيفية استخدام التطبيق، مثل الشاشات والعناصر التي تُفتح. لا يُرسل اسمك أو رقم هاتفك أو بريدك الإلكتروني أبدًا.';
  }

  @override
  String get shareLink => 'مشاركة';

  @override
  String get sendCrashReports => 'إرسال تقارير الأعطال';

  @override
  String get sendCrashReportsHint =>
      'عند حدوث خطأ، يرسل التطبيق ما حدث وإصداره ونوع الهاتف لإصلاحه. لا يرسل أبدًا اسمك أو رقمك أو ما كتبته.';

  @override
  String get downloadNeedsInternetVideo =>
      'يُعرض فيديو هذا الدرس من موقع فيديو، لذا يحتاج إلى الإنترنت. لا يمكن حفظه للمشاهدة دون اتصال.';

  @override
  String get downloadNeedsInternetPage =>
      'يعرض هذا الدرس صفحة ويب، لذا يحتاج إلى الإنترنت. لا يمكن حفظه للمشاهدة دون اتصال.';

  @override
  String get downloadsOff =>
      'حفظ الدروس للمشاهدة دون اتصال غير متاح في هذا التطبيق.';

  @override
  String get downloadNotAvailable =>
      'لا يمكن حفظ هذا الدرس للمشاهدة دون اتصال.';

  @override
  String get downloadFailed => 'لم يكتمل التنزيل. حاول مرة أخرى.';

  @override
  String get downloadWaitsForConnection => 'بانتظار الاتصال.';

  @override
  String downloadsSkipped(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          'لم يُحفظ $count من الدروس: تُعرض مقاطع الفيديو الخاصة بها من موقع فيديو، لذا تحتاج إلى الإنترنت.',
      one: 'لم يُحفظ درس واحد: يُعرض الفيديو الخاص به من موقع فيديو، لذا يحتاج إلى الإنترنت.',
    );
    return '$_temp0';
  }

  @override
  String downloadsExpired(int days) {
    return 'حُذفت دروسك المحفوظة: لم يتمكن التطبيق من التحقق من وصولك لمدة $days يومًا. اتصل بالإنترنت واحفظها مرة أخرى.';
  }

  @override
  String get downloadsTurnedOff =>
      'حُذفت دروسك المحفوظة: لم يعد حفظ الدروس متاحًا في هذا التطبيق.';

  @override
  String downloadsAccessEnded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'حُذف $count من الدروس المحفوظة لأن وصولك إليها انتهى.',
      one: 'حُذف درس محفوظ واحد لأن وصولك إليه انتهى.',
    );
    return '$_temp0';
  }

  @override
  String get downloadsNotificationRunning => 'جارٍ الحفظ للمشاهدة دون اتصال';

  @override
  String get downloadsNotificationPaused => 'التنزيل متوقف مؤقتًا';

  @override
  String get downloadsNotificationDone => 'محفوظ للمشاهدة دون اتصال';

  @override
  String get downloadsNotificationDoneBody =>
      'دروسك جاهزة للمشاهدة دون إنترنت.';

  @override
  String get downloadsNotificationFailed => 'فشل التنزيل';

  @override
  String get downloads => 'التنزيلات';

  @override
  String get downloadLesson => 'احفظ للمشاهدة دون اتصال';

  @override
  String get downloadCourse => 'احفظ الدورة للمشاهدة دون اتصال';

  @override
  String downloadSaving(int saved, int total) {
    return 'جارٍ الحفظ للمشاهدة دون اتصال · $saved من $total';
  }

  @override
  String downloadSavingLesson(int percent) {
    return 'جارٍ الحفظ للمشاهدة دون اتصال · $percent%';
  }

  @override
  String get downloadSaved => 'محفوظ للمشاهدة دون اتصال';

  @override
  String downloadCourseSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count من الدروس محفوظة للمشاهدة دون اتصال',
      one: 'درس واحد محفوظ للمشاهدة دون اتصال',
    );
    return '$_temp0';
  }

  @override
  String get downloadQueued => 'بانتظار التنزيل';

  @override
  String get downloadPaused => 'متوقف مؤقتًا';

  @override
  String get downloadPause => 'إيقاف مؤقت';

  @override
  String get downloadResume => 'استئناف';

  @override
  String get downloadRetry => 'حاول مرة أخرى';

  @override
  String get downloadCancel => 'إلغاء التنزيل';

  @override
  String get downloadDelete => 'احذف من هذا الهاتف';

  @override
  String get downloadsDeleteAll => 'احذف كل التنزيلات';

  @override
  String get downloadsDeleteAllConfirm =>
      'هل تريد حذف كل الدروس المحفوظة من هذا الهاتف؟ يمكنك حفظها مرة أخرى عند الاتصال.';

  @override
  String get downloadsDeleteCourseConfirm =>
      'هل تريد حذف دروس هذه الدورة المحفوظة من هذا الهاتف؟';

  @override
  String get delete => 'حذف';

  @override
  String get downloadsStorage => 'المساحة المستخدمة';

  @override
  String get downloadsWifiOnly => 'التنزيل عبر Wi-Fi فقط';

  @override
  String get downloadsWifiOnlyHint =>
      'يوفّر بيانات الجوال: تنتظر التنزيلات حتى تتصل بشبكة Wi-Fi.';

  @override
  String get downloadsEmptyTitle => 'لا توجد تنزيلات بعد';

  @override
  String get downloadsEmptyMessage =>
      'احفظ درسًا أو دورة كاملة لمشاهدتها وقراءتها دون إنترنت: ابحث عن «احفظ للمشاهدة دون اتصال» في الدورة أو الدرس.';

  @override
  String downloadsNote(int days) {
    return 'تُحفظ الدروس مشفّرة داخل هذا التطبيق، ولا تظهر أبدًا في معرض الصور أو الملفات. تُحذف عندما ينتهي وصولك إلى الدورة، أو بعد $days يومًا دون اتصال.';
  }

  @override
  String downloadsKeptFor(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'تُحفظ $days يومًا آخر دون اتصال',
      one: 'تُحفظ ليوم واحد آخر دون اتصال',
    );
    return '$_temp0';
  }

  @override
  String get downloadsUnsupported => 'تعمل التنزيلات في التطبيق على هاتفك.';

  @override
  String get downloadStarted =>
      'جارٍ الحفظ للمشاهدة دون اتصال. يمكنك متابعة استخدام التطبيق.';

  @override
  String downloadCourseStarted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'جارٍ حفظ $count من الدروس للمشاهدة دون اتصال.',
      one: 'جارٍ حفظ درس واحد للمشاهدة دون اتصال.',
      zero: 'كل الدروس المتاحة لك محفوظة بالفعل.',
    );
    return '$_temp0';
  }

  @override
  String downloadCourseSize(String lessons, String size) {
    return '$lessons · $size';
  }

  @override
  String sizeGigabytes(String size) {
    return '$size غيغابايت';
  }

  @override
  String get lessonCompleteOffline =>
      'تم وضع علامة مكتمل. سيُرسل عند عودتك للاتصال.';

  @override
  String get reviewCourse => 'مراجعة الدورة';

  @override
  String courseCompletedOn(String date) {
    return 'اكتملت في $date';
  }

  @override
  String get courseCompletedTitle => 'لقد أكملت هذه الدورة';

  @override
  String get viewCertificate => 'عرض الشهادة';

  @override
  String get startCourseAgain => 'ابدأ الدورة من جديد';

  @override
  String get startCourseAgainTitle => 'هل تريد بدء الدورة من جديد؟';

  @override
  String get startCourseAgainMessage =>
      'سيُمسح تقدّمك في هذه الدورة: الدروس التي أكملتها والموضع الذي توقّف عنده كل فيديو. ستبقى مسجّلًا فيها وتبدأ من الدرس الأول.';

  @override
  String get startCourseAgainConfirm => 'ابدأ من جديد';

  @override
  String completedCourseLabel(String title) {
    return '$title، مكتملة';
  }

  @override
  String get screenProtected =>
      'هذا المحتوى محمي، ويُخفى أثناء تسجيل الشاشة أو مشاركتها.';

  @override
  String get screenshotProtected =>
      'هذا المحتوى محمي: لا يُسمح بالتقاط صور الشاشة له.';

  @override
  String get fileOpenFailed => 'تعذّر فتح هذا الملف.';

  @override
  String get fileInAppOnly => 'لا يمكن عرض هذا الملف هنا';

  @override
  String get fileInAppOnlyMessage =>
      'تُفتح ملفات الدورة داخل التطبيق فقط، وهو يعرض ملفات PDF والصور والنصوص. اطلب هذا الملف من المدرّس بصيغة PDF.';

  @override
  String pageOf(int page, int total) {
    return 'صفحة $page من $total';
  }

  @override
  String get coursePasswordTitle => 'لهذه الدورة كلمة مرور';

  @override
  String get coursePasswordWebsite =>
      'أدخل كلمة مرورها على الموقع. بعد انضمامك إلى الدورة هناك، تُفتح هنا أيضًا.';

  @override
  String get coursePasswordInApp => 'لا يمكن فتحها في التطبيق.';

  @override
  String get courseOpenOnWebsite => 'افتح على الموقع';

  @override
  String get membershipShowAtDoor => 'اعرض هذا عند الدخول';

  @override
  String membershipQrLabel(String plan) {
    return 'رمز QR لعضويتك $plan';
  }

  @override
  String get reviewReplyTitle => 'ردّ الأكاديمية';

  @override
  String get reviewHiddenNote => 'أخفته الأكاديمية، ولا يراه غيرك.';

  @override
  String get qnaHiddenNote => 'أخفته الأكاديمية عن الآخرين، ولا يراه غيرك.';

  @override
  String get membershipFrozen => 'مجمّدة';

  @override
  String membershipFrozenUntil(String date) {
    return 'مجمّدة حتى $date';
  }

  @override
  String get membershipFrozenOpen => 'مجمّدة حتى يُلغى التجميد';

  @override
  String membershipFreezesOn(String date) {
    return 'تُجمَّد من $date';
  }

  @override
  String get membershipFrozenAtDoor =>
      'عضويتك مجمّدة، فلن يُدخلك هذا الرمز حتى تعود.';

  @override
  String get tabChat => 'المحادثة';

  @override
  String get chatTitle => 'المحادثة';

  @override
  String get chatLoading => 'جارٍ تحميل المحادثات';

  @override
  String get chatEmptyTitle => 'لا توجد محادثات بعد';

  @override
  String get chatEmptyMessage => 'ستظهر محادثاتك هنا.';

  @override
  String chatSignInTitle(String business) {
    return 'تحدّث مع $business';
  }

  @override
  String get chatSignInMessage => 'سجّل الدخول لترسل رسائلك وتصلك الردود هنا.';

  @override
  String get chatStart => 'أرسل رسالة';

  @override
  String get chatCourseGroup => 'مجموعة الدورة';

  @override
  String chatMemberCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count عضو',
      many: '$count عضوًا',
      few: '$count أعضاء',
      two: 'عضوان',
      one: 'عضو واحد',
      zero: 'لا أعضاء',
    );
    return '$_temp0';
  }

  @override
  String get chatNoMessagesTitle => 'ابدأ المحادثة';

  @override
  String get chatNoMessagesMessage => 'تظهر هنا الرسائل التي ترسلها وتصلك.';

  @override
  String get chatLoadingMessages => 'جارٍ تحميل الرسائل';

  @override
  String get chatOlder => 'عرض الرسائل الأقدم';

  @override
  String get chatAttach => 'إرفاق';

  @override
  String get chatGallery => 'صورة أو فيديو';

  @override
  String get chatTakePhoto => 'التقاط صورة';

  @override
  String get chatRecordVideo => 'تسجيل فيديو';

  @override
  String get chatChooseFile => 'ملف';

  @override
  String get chatPhoto => 'صورة';

  @override
  String get chatVideo => 'فيديو';

  @override
  String get chatVoice => 'رسالة صوتية';

  @override
  String get chatFile => 'ملف';

  @override
  String get chatRecord => 'تسجيل رسالة صوتية';

  @override
  String chatRecording(String time) {
    return 'جارٍ التسجيل $time';
  }

  @override
  String get chatStopAndSend => 'إرسال الرسالة الصوتية';

  @override
  String get chatMicDenied =>
      'اسمح باستخدام الميكروفون من إعدادات هاتفك لتسجيل الرسائل الصوتية.';

  @override
  String get chatSending => 'جارٍ الإرسال';

  @override
  String chatUploading(int percent) {
    return 'جارٍ الإرسال $percent٪';
  }

  @override
  String get chatNotSent => 'لم تُرسَل. اضغط للمحاولة مرة أخرى.';

  @override
  String get chatDeleted => 'حُذفت هذه الرسالة.';

  @override
  String get chatDeleteMessage => 'حذف الرسالة';

  @override
  String get chatDeleteConfirm => 'حذف هذه الرسالة عند الجميع؟';

  @override
  String get chatReport => 'إبلاغ';

  @override
  String get chatReportTitle => 'لماذا تبلّغ عن هذه الرسالة؟';

  @override
  String get chatReportSpam => 'رسائل مزعجة';

  @override
  String get chatReportAbuse => 'إساءة أو مضايقة';

  @override
  String get chatReportInappropriate => 'محتوى غير لائق';

  @override
  String get chatReportOther => 'سبب آخر';

  @override
  String chatReported(String business) {
    return 'شكرًا لك. سيراجع $business البلاغ.';
  }

  @override
  String get chatMembers => 'الأعضاء';

  @override
  String get chatBlock => 'حظر';

  @override
  String get chatUnblock => 'إلغاء الحظر';

  @override
  String chatBlockTitle(String name) {
    return 'حظر $name؟';
  }

  @override
  String chatBlockMessage(String name) {
    return 'لن ترى رسائل $name في أي مجموعة، ولن يُبلَّغ بذلك.';
  }

  @override
  String get chatBlocked => 'محظور';

  @override
  String get chatCantSend =>
      'يمكنك قراءة هذه المحادثة، لكن لا يمكنك إرسال رسائل فيها.';

  @override
  String get chatTooBig => 'هذا الملف أكبر من أن يُرسَل.';

  @override
  String get chatStorageFull =>
      'لا يمكن إرسال الملفات الآن، لكن يمكنك إرسال نص.';

  @override
  String get chatFileType =>
      'لا يمكن إرسال هذا النوع من الملفات. أرسل صورة أو فيديو أو ملف PDF أو Word أو Excel أو PowerPoint أو ملفًا نصيًا.';

  @override
  String get chatUnavailable => 'المحادثة غير متاحة الآن.';

  @override
  String get chatPlayVoice => 'تشغيل الرسالة الصوتية';

  @override
  String get chatPauseVoice => 'إيقاف الرسالة الصوتية مؤقتًا';

  @override
  String chatOpenFile(String name) {
    return 'فتح $name';
  }

  @override
  String chatMessageFrom(String name, String text) {
    return '$name: $text';
  }

  @override
  String get chatMore => 'المزيد';

  @override
  String chatBlockPerson(String name) {
    return 'حظر $name';
  }

  @override
  String opensOn(String date) {
    return 'يُفتح في $date';
  }

  @override
  String accessUntil(String date) {
    return 'متاح حتى $date';
  }

  @override
  String get siteMemberships => 'عضوياتي';

  @override
  String get siteMembershipsNoneTitle => 'لا عضويات';

  @override
  String get siteMembershipsNoneMessage =>
      'تظهر هنا العضويات والاشتراكات التي لديك على موقعنا.';

  @override
  String get siteMembershipsManaged => 'تُدار العضويات على موقعنا.';

  @override
  String get siteMembershipActive => 'نشطة';

  @override
  String get siteMembershipOnHold => 'معلّقة';

  @override
  String get siteMembershipCancelled => 'ملغاة';

  @override
  String siteMembershipRenews(String date) {
    return 'تتجدد في $date';
  }

  @override
  String siteMembershipEnds(String date) {
    return 'تنتهي في $date';
  }

  @override
  String siteMembershipCourses(int count) {
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
  String get courseMembershipTitle => 'للأعضاء';

  @override
  String courseMembershipPlans(String plans) {
    return 'هذه الدورة ضمن عضوية على موقعنا: $plans.';
  }

  @override
  String get courseMembershipAny => 'هذه الدورة ضمن عضوية على موقعنا.';

  @override
  String get courseMembershipWebsite => 'عرض العضويات على الموقع';

  @override
  String get couponHave => 'لديك كوبون؟';

  @override
  String get couponCode => 'رمز الكوبون';

  @override
  String get couponApply => 'تطبيق';

  @override
  String get couponRemove => 'إزالة الكوبون';

  @override
  String couponApplied(String code) {
    return 'تم تطبيق $code';
  }

  @override
  String couponAtCheckout(String code) {
    return 'يُطبَّق $code عند الدفع.';
  }

  @override
  String couponNotApplied(String code) {
    return 'لا ينطبق $code.';
  }

  @override
  String get cartDiscount => 'الخصم';

  @override
  String get cartShipping => 'الشحن';

  @override
  String get cartTaxes => 'الضرائب';

  @override
  String get cartTotal => 'الإجمالي';

  @override
  String get plusShippingAtCheckout => 'يُضاف الشحن والضرائب عند الدفع.';
}
