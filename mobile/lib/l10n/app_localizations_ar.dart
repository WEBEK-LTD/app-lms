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
  String get browseListings => 'تصفّح العقارات';

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
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'قبل $days يوم',
      many: 'قبل $days يومًا',
      few: 'قبل $days أيام',
      two: 'قبل يومين',
      one: 'قبل يوم',
    );
    return '$_temp0';
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
    String _temp0 = intl.Intl.pluralLogic(
      seconds,
      locale: localeName,
      other: 'محاولات كثيرة جدًا. حاول مرة أخرى بعد $seconds ثانية.',
      few: 'محاولات كثيرة جدًا. حاول مرة أخرى بعد $seconds ثوانٍ.',
      two: 'محاولات كثيرة جدًا. حاول مرة أخرى بعد ثانيتين.',
      one: 'محاولات كثيرة جدًا. حاول مرة أخرى بعد ثانية واحدة.',
    );
    return '$_temp0';
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
    String _temp0 = intl.Intl.pluralLogic(
      length,
      locale: localeName,
      other: 'رمز التحقق، $length رقم',
      many: 'رمز التحقق، $length رقمًا',
      few: 'رمز التحقق، $length أرقام',
    );
    return '$_temp0';
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
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$done من $total درس',
      many: '$done من $total درسًا',
      few: '$done من $total دروس',
      two: '$done من درسين',
      one: '$done من درس واحد',
    );
    return '$_temp0';
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
    String _temp0 = intl.Intl.pluralLogic(
      stars,
      locale: localeName,
      other: '$stars نجمة: $count',
      few: '$stars نجوم: $count',
      two: 'نجمتان: $count',
      one: 'نجمة واحدة: $count',
    );
    return '$_temp0';
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
    String _temp0 = intl.Intl.pluralLogic(
      allowed,
      locale: localeName,
      other: 'استُخدمت $used من $allowed محاولة',
      few: 'استُخدمت $used من $allowed محاولات',
      two: 'استُخدمت $used من محاولتين',
      one: 'استُخدمت $used من محاولة واحدة',
    );
    return '$_temp0';
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
  String get onSale => 'تخفيضات';

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
  String get previewNoPlugin =>
      'ثبّت إضافة Yallapp على موقعك على WordPress وفعّل مفتاح الترخيص فيها (Yallapp في قائمة WordPress)، ثم أعد تحميل المعاينة.';

  @override
  String get previewBeingSetUp =>
      'يعمل فريقنا على إعداد موقعك على WordPress. تعرض المعاينة محتوى تطبيقك عندما يصبح جاهزًا.';

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
    String _temp0 = intl.Intl.pluralLogic(
      max,
      locale: localeName,
      other: 'يُرجى استخدام $max حرف على الأكثر.',
      many: 'يُرجى استخدام $max حرفًا على الأكثر.',
      few: 'يُرجى استخدام $max أحرف على الأكثر.',
    );
    return '$_temp0';
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
  String get browseArticles => 'تصفّح المقالات';

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
    String _temp0 = intl.Intl.pluralLogic(
      minutes,
      locale: localeName,
      other: 'جاهز خلال $minutes دقيقة تقريبًا',
      few: 'جاهز خلال $minutes دقائق تقريبًا',
      two: 'جاهز خلال دقيقتين تقريبًا',
      one: 'جاهز خلال دقيقة تقريبًا',
    );
    return '$_temp0';
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
  String get classesNextClass => 'اعرض الحصة التالية';

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
  String get browseEvents => 'تصفّح الفعاليات';

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
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other:
          'حُذفت دروسك المحفوظة: لم يتمكن التطبيق من التحقق من وصولك لمدة $days يوم. اتصل بالإنترنت واحفظها مرة أخرى.',
      many:
          'حُذفت دروسك المحفوظة: لم يتمكن التطبيق من التحقق من وصولك لمدة $days يومًا. اتصل بالإنترنت واحفظها مرة أخرى.',
      few:
          'حُذفت دروسك المحفوظة: لم يتمكن التطبيق من التحقق من وصولك لمدة $days أيام. اتصل بالإنترنت واحفظها مرة أخرى.',
      two: 'حُذفت دروسك المحفوظة: لم يتمكن التطبيق من التحقق من وصولك لمدة يومين. اتصل بالإنترنت واحفظها مرة أخرى.',
      one: 'حُذفت دروسك المحفوظة: لم يتمكن التطبيق من التحقق من وصولك لمدة يوم واحد. اتصل بالإنترنت واحفظها مرة أخرى.',
    );
    return '$_temp0';
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
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other:
          'تُحفظ الدروس مشفّرة داخل هذا التطبيق، ولا تظهر أبدًا في معرض الصور أو الملفات. تُحذف عندما ينتهي وصولك إلى الدورة، أو بعد $days يوم دون اتصال.',
      many:
          'تُحفظ الدروس مشفّرة داخل هذا التطبيق، ولا تظهر أبدًا في معرض الصور أو الملفات. تُحذف عندما ينتهي وصولك إلى الدورة، أو بعد $days يومًا دون اتصال.',
      few:
          'تُحفظ الدروس مشفّرة داخل هذا التطبيق، ولا تظهر أبدًا في معرض الصور أو الملفات. تُحذف عندما ينتهي وصولك إلى الدورة، أو بعد $days أيام دون اتصال.',
      two: 'تُحفظ الدروس مشفّرة داخل هذا التطبيق، ولا تظهر أبدًا في معرض الصور أو الملفات. تُحذف عندما ينتهي وصولك إلى الدورة، أو بعد يومين دون اتصال.',
      one: 'تُحفظ الدروس مشفّرة داخل هذا التطبيق، ولا تظهر أبدًا في معرض الصور أو الملفات. تُحذف عندما ينتهي وصولك إلى الدورة، أو بعد يوم واحد دون اتصال.',
    );
    return '$_temp0';
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
  String get chatUploadRefused => 'تعذّر إرسال الملف. حاول مرة أخرى.';

  @override
  String get chatUploadExpired =>
      'انتهت صلاحية رابط إرسال الملف. حاول مرة أخرى.';

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

  @override
  String get notifyOrderUpdates => 'تحديثات الطلبات';

  @override
  String get requestReturn => 'إرجاع هذا الطلب';

  @override
  String get returnReasonTitle => 'لماذا تريد إرجاعه؟';

  @override
  String get returnReasonDamaged => 'وصل تالفًا';

  @override
  String get returnReasonWrongItem => 'منتج خاطئ';

  @override
  String get returnReasonNotAsDescribed => 'لا يطابق الوصف';

  @override
  String get returnReasonNoLongerNeeded => 'لم أعد بحاجة إليه';

  @override
  String get returnReasonOther => 'سبب آخر';

  @override
  String get returnNote => 'ملاحظة للمتجر (اختياري)';

  @override
  String get returnNoteRequired => 'اكتب للمتجر السبب';

  @override
  String get sendReturnRequest => 'أرسل الطلب';

  @override
  String get returnRequested => 'تم إرسال طلب الإرجاع. سيرد المتجر هنا.';

  @override
  String get returnStatusRequested => 'طلب الإرجاع بانتظار الرد';

  @override
  String get returnStatusApproved => 'تمت الموافقة على الإرجاع';

  @override
  String get returnStatusDeclined => 'تم رفض الإرجاع';

  @override
  String returnShopReply(String reply) {
    return 'المتجر: $reply';
  }

  @override
  String get myPoints => 'نقاطي';

  @override
  String pointsBalance(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count نقطة',
      many: '$count نقطة',
      few: '$count نقاط',
      two: 'نقطتان',
      one: 'نقطة واحدة',
      zero: 'لا نقاط',
    );
    return '$_temp0';
  }

  @override
  String pointsWorth(String value) {
    return 'تساوي $value من قيمة طلباتك القادمة';
  }

  @override
  String pointsRule(String spend, String value) {
    return 'اكسب نقطة واحدة مقابل كل $spend تنفقها على المنتجات. وقيمة كل نقطة $value.';
  }

  @override
  String cartPointsFrom(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'استخدمها عندما يصبح لديك $count نقطة.',
      many: 'استخدمها عندما يصبح لديك $count نقطة.',
      few: 'استخدمها عندما يصبح لديك $count نقاط.',
      two: 'استخدمها عندما يصبح لديك نقطتان.',
      one: 'استخدمها عندما يصبح لديك نقطة واحدة.',
    );
    return '$_temp0';
  }

  @override
  String cartUsePoints(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'استخدم $count نقطة',
      many: 'استخدم $count نقطة',
      few: 'استخدم $count نقاط',
      two: 'استخدم نقطتين',
      one: 'استخدم نقطة واحدة',
    );
    return '$_temp0';
  }

  @override
  String cartPointsWorth(String value) {
    return 'خصم $value من هذا الطلب';
  }

  @override
  String get cartPointsDiscount => 'النقاط';

  @override
  String get pointsHistory => 'السجل';

  @override
  String get pointsReasonEarned => 'مكتسبة';

  @override
  String get pointsReasonUsed => 'مستخدمة';

  @override
  String get pointsReasonGivenBack => 'مُعادة';

  @override
  String get pointsReasonTakenBack => 'مسحوبة';

  @override
  String get noPointsYet => 'لا توجد نقاط بعد. تكسبها عند اكتمال طلباتك.';

  @override
  String orderPointsUsed(int count, String amount) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'استُخدمت $count نقطة: −$amount',
      many: 'استُخدمت $count نقطة: −$amount',
      few: 'استُخدمت $count نقاط: −$amount',
      two: 'استُخدمت نقطتان: −$amount',
      one: 'استُخدمت نقطة واحدة: −$amount',
    );
    return '$_temp0';
  }

  @override
  String orderPointsEarned(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'كُسبت $count نقطة',
      many: 'كُسبت $count نقطة',
      few: 'كُسبت $count نقاط',
      two: 'كُسبت نقطتان',
      one: 'كُسبت نقطة واحدة',
    );
    return '$_temp0';
  }

  @override
  String cartTaxIncluded(String amount, String tax) {
    return 'يشمل $amount $tax';
  }

  @override
  String payOutsideDue(String total, String date, String number) {
    return 'ادفع $total قبل $date كما هو موضح أدناه، واذكر رقم الطلب $number مع دفعتك. يؤكد المتجر طلبك عند وصول المبلغ.';
  }

  @override
  String get pageFormSent => 'تم الإرسال. شكرًا لك.';

  @override
  String get pageFormSignIn => 'سجّل الدخول للإرسال';

  @override
  String get pageFormRequired => 'هذا الحقل مطلوب';

  @override
  String get pageFormInvalidEmail => 'أدخل بريدًا إلكترونيًا صحيحًا';

  @override
  String get pageFormInvalidPhone => 'أدخل رقم هاتف صحيحًا';

  @override
  String get pageFormInvalidNumber => 'أدخل رقمًا';

  @override
  String get pageFormChooseOne => 'اختر واحدًا';

  @override
  String storePricePerMonth(String price) {
    return '$price شهريًا';
  }

  @override
  String storePricePerYear(String price) {
    return '$price سنويًا';
  }

  @override
  String get storeSubscribe => 'اشترك';

  @override
  String get storeMembershipSubscribe => 'اشترك في عضوية لفتح هذه الدورة.';

  @override
  String storeSubscriptionTerms(String store) {
    return 'يُخصم المبلغ من حسابك في $store عند تأكيد الشراء. يتجدد الاشتراك تلقائيًا بالسعر نفسه في كل فترة حتى تلغيه. يمكنك إدارته أو إلغاؤه من إعدادات حسابك في $store.';
  }

  @override
  String get storeManageSubscription => 'إدارة الاشتراك';

  @override
  String get storeRestorePurchases => 'استعادة المشتريات';

  @override
  String get storePurchasesGroup => 'المشتريات';

  @override
  String get storeRestored => 'تمت استعادة مشترياتك.';

  @override
  String get storeRestoredNone => 'لا توجد مشتريات لاستعادتها لهذا الحساب.';

  @override
  String get storePending =>
      'بانتظار الدفع. ستحصل على الوصول بعد اكتمال الدفع.';

  @override
  String get storeMembershipActive => 'عضويتك مفعّلة.';

  @override
  String get storeRetryLater =>
      'تمت عملية الشراء. تعذّر تأكيدها الآن، وسنعيد المحاولة تلقائيًا.';

  @override
  String get storeInvalidReceipt =>
      'تعذّر استخدام عملية الشراء هذه. إذا خُصم منك مبلغ، تواصل معنا.';

  @override
  String get storePurchaseInUse =>
      'عملية الشراء هذه تخص حسابًا آخر في هذا التطبيق. سجّل الدخول بذلك الحساب لاستخدامها.';

  @override
  String get storePurchaseEnded =>
      'انتهت عملية الشراء هذه أو تم استرداد مبلغها.';

  @override
  String get storePurchaseFailed => 'لم تكتمل عملية الشراء. حاول مرة أخرى.';

  @override
  String get storeUnavailable => 'الشراء غير متاح على هذا الجهاز حاليًا.';

  @override
  String get headerSearch => 'بحث';

  @override
  String get tabSend => 'إرسال';

  @override
  String get tabShipments => 'شحناتي';

  @override
  String get tabCourier => 'المندوب';

  @override
  String get sendTitle => 'أرسل طردًا';

  @override
  String get sendService => 'الخدمة';

  @override
  String get sendPickup => 'الاستلام';

  @override
  String get sendDropoff => 'التسليم';

  @override
  String get placeAddress => 'العنوان';

  @override
  String get placeDetails => 'المبنى والدور وعلامة مميزة (اختياري)';

  @override
  String get placeUseMyLocation => 'موقعي';

  @override
  String get placePasteLink => 'الصق رابط خرائط';

  @override
  String get placeOnMap => 'على الخريطة';

  @override
  String get placeLocated => 'تم تحديد الموقع';

  @override
  String get placeNotLocated => 'لم يُحدَّد الموقع بعد (اختياري)';

  @override
  String get placeLocationNeeded =>
      'حدّد هذا المكان بموقعك أو برابط خرائط أو على الخريطة: السعر حسب المسافة.';

  @override
  String get placeRemoveLocation => 'إزالة';

  @override
  String get pasteLinkTitle => 'الصق رابط الخرائط';

  @override
  String get pasteLinkHint =>
      'رابط Google Maps أو Apple Maps، أو موقع تمت مشاركته على واتساب';

  @override
  String get pasteLinkUse => 'استخدم هذا المكان';

  @override
  String get pasteLinkFailed => 'لم نجد مكانًا في هذا الرابط.';

  @override
  String get locateOff => 'شغّل خدمة الموقع من إعدادات هاتفك.';

  @override
  String get locateDenied => 'اسمح للتطبيق باستخدام موقعك من إعدادات هاتفك.';

  @override
  String get locateFailed =>
      'لم نتمكن من تحديد مكانك. حاول مجددًا أو حدّد المكان على الخريطة.';

  @override
  String get mapPickTitle => 'حرّك الخريطة إلى المكان';

  @override
  String get mapPickConfirm => 'استخدم هذا المكان';

  @override
  String get sendZone => 'المنطقة';

  @override
  String get sendRecipient => 'المستلم';

  @override
  String get recipientName => 'الاسم';

  @override
  String get recipientPhone => 'رقم الجوال';

  @override
  String get sendParcelSection => 'الطرد';

  @override
  String get parcelSmall => 'صغير';

  @override
  String get parcelMedium => 'متوسط';

  @override
  String get parcelLarge => 'كبير';

  @override
  String get parcelDescription => 'ما بداخله (اختياري)';

  @override
  String get sendNotes => 'ملاحظات للمندوب (اختياري)';

  @override
  String get sendPayment => 'الدفع';

  @override
  String get payCash => 'نقدًا للمندوب';

  @override
  String get payCard => 'بطاقة';

  @override
  String get sendPrice => 'السعر';

  @override
  String get sendPriceCalculating => 'جارٍ الحساب…';

  @override
  String get sendPriceMissing => 'أدخل العنوانين لترى السعر.';

  @override
  String distanceKm(String km) {
    return '$km كم';
  }

  @override
  String get sendButton => 'أرسل الطرد';

  @override
  String get sendSignIn => 'سجّل الدخول للإرسال';

  @override
  String get sendFillPlace => 'أدخل عنواني الاستلام والتسليم.';

  @override
  String get sendFillRecipient => 'أدخل اسم المستلم ورقم جواله.';

  @override
  String get sendSent => 'تم الإرسال. سنخبرك حين يكون المندوب في الطريق.';

  @override
  String get sendPaid => 'تم الدفع. طردك بانتظار مندوب.';

  @override
  String get loadingShipments => 'جارٍ تحميل الشحنات';

  @override
  String get noShipmentsTitle => 'لا توجد شحنات بعد';

  @override
  String get noShipmentsMessage => 'تظهر هنا الطرود التي ترسلها، بكل مراحلها.';

  @override
  String get shipmentsSignInTitle => 'شحناتك';

  @override
  String get shipmentsSignInMessage => 'سجّل الدخول لإرسال الطرود ومتابعتها.';

  @override
  String shipmentHeading(String reference) {
    return 'الشحنة $reference';
  }

  @override
  String get shipmentAwaitingPayment => 'بانتظار الدفع';

  @override
  String get shipmentPending => 'بانتظار مندوب';

  @override
  String get shipmentAssigned => 'المندوب في الطريق للاستلام';

  @override
  String get shipmentPickedUp => 'تم الاستلام';

  @override
  String get shipmentOnTheWay => 'في الطريق';

  @override
  String get shipmentDelivered => 'تم التسليم';

  @override
  String get shipmentFailed => 'تعذّر التسليم';

  @override
  String get shipmentCancelled => 'أُلغيت';

  @override
  String get shipmentCourier => 'المندوب';

  @override
  String get callCourier => 'اتصال';

  @override
  String get shipmentWaitingCourier => 'نبحث عن مندوب لطردك.';

  @override
  String trackingCourierAt(String time) {
    return 'موقع المندوب الساعة $time';
  }

  @override
  String get trackingOpenMap => 'افتح في الخرائط';

  @override
  String get trackingNoPosition => 'سترى مكان المندوب حين يشارك موقعه.';

  @override
  String get paymentPaid => 'مدفوع';

  @override
  String get paymentUnpaid => 'لم يُدفع بعد';

  @override
  String get payNow => 'ادفع الآن';

  @override
  String get cancelShipment => 'إلغاء الشحنة';

  @override
  String get cancelShipmentConfirm => 'إلغاء هذه الشحنة؟';

  @override
  String get cancelShipmentYes => 'ألغِها';

  @override
  String get keepIt => 'أبقِها';

  @override
  String get shipmentCancelledToast => 'تم الإلغاء.';

  @override
  String get shipmentStages => 'المراحل';

  @override
  String get directionsButton => 'الاتجاهات';

  @override
  String get courierTitle => 'المندوب';

  @override
  String get courierOnDuty => 'في الخدمة';

  @override
  String get courierOffDutyHint => 'خارج الخدمة: لن تُعرض عليك مهام جديدة.';

  @override
  String courierDeliveredToday(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count توصيلة اليوم',
      many: '$count توصيلة اليوم',
      few: '$count توصيلات اليوم',
      two: 'توصيلتان اليوم',
      one: 'توصيلة واحدة اليوم',
      zero: 'لا توصيلات اليوم بعد',
    );
    return '$_temp0';
  }

  @override
  String get courierMyJobs => 'مهامي';

  @override
  String get courierWaiting => 'المنتظرة';

  @override
  String get courierDone => 'المنتهية';

  @override
  String get loadingJobs => 'جارٍ تحميل المهام';

  @override
  String get noJobsTitle => 'لا توجد مهام هنا';

  @override
  String get noJobsMessage => 'تظهر هنا المهام الجديدة، ويصلك إشعار بها.';

  @override
  String get noWaitingTitle => 'لا توجد مهام منتظرة';

  @override
  String get noWaitingOffDuty => 'ادخل الخدمة لترى المهام المنتظرة.';

  @override
  String get notCourierTitle => 'لمناديبنا';

  @override
  String get notCourierMessage =>
      'هذه الشاشة لمناديب الشركة. اطلب من الشركة إضافة رقمك.';

  @override
  String get customerView => 'شاشات العميل';

  @override
  String get sharingLocation =>
      'ما دام الطرد في الطريق وهذه الشاشة مفتوحة، يرى العميل مكانك.';

  @override
  String jobTitle(String reference) {
    return 'المهمة $reference';
  }

  @override
  String jobCollect(String amount) {
    return 'حصّل $amount';
  }

  @override
  String jobCollectBanner(String amount) {
    return 'حصّل $amount نقدًا عند التسليم.';
  }

  @override
  String get jobPaidByCard => 'مدفوعة بالبطاقة: لا شيء للتحصيل.';

  @override
  String get jobPhonesAfterTaking => 'تظهر الأرقام بعد أن تأخذ المهمة.';

  @override
  String callSender(String name) {
    return 'اتصل بـ $name';
  }

  @override
  String callRecipient(String name) {
    return 'اتصل بـ $name';
  }

  @override
  String get jobTake => 'خذ هذه المهمة';

  @override
  String get jobTaken => 'المهمة لك. توجّه إلى مكان الاستلام.';

  @override
  String get jobUpdated => 'تم الحفظ. تم إبلاغ العميل.';

  @override
  String get deliveredDone => 'تم التسليم. أحسنت.';

  @override
  String get stepPickedUp => 'استلمت الطرد';

  @override
  String get stepOnTheWay => 'في الطريق';

  @override
  String get stepDelivered => 'تم التسليم';

  @override
  String get stepFailed => 'تعذّر التسليم';

  @override
  String get stepReleased => 'أعِد المهمة';

  @override
  String get releaseConfirm => 'إعادة هذه المهمة؟ سيأخذها مندوب آخر.';

  @override
  String get failReasonTitle => 'لماذا تعذّر التسليم؟';

  @override
  String get failReasonHint => 'مثل: لم يرد أحد';

  @override
  String get failReasonSend => 'إرسال';

  @override
  String get courierMode => 'وضع المندوب';

  @override
  String get tabRestaurants => 'المطاعم';

  @override
  String get tabFoodOrders => 'طلباتي';

  @override
  String get tabRestaurantDesk => 'المطعم';

  @override
  String get restaurantMode => 'وضع المطعم';

  @override
  String get restaurantsSearchHint => 'ابحث عن المطاعم والأطباق';

  @override
  String get cuisineAll => 'الكل';

  @override
  String get loadingRestaurants => 'جارٍ تحميل المطاعم';

  @override
  String get noRestaurantsTitle => 'لا توجد مطاعم هنا بعد';

  @override
  String get noRestaurantsMessage => 'جرّب بحثًا أو مطبخًا آخر، أو عد لاحقًا.';

  @override
  String get restaurantClosed => 'مغلق';

  @override
  String restaurantOpensAt(String time) {
    return 'يفتح $time';
  }

  @override
  String get restaurantBusy => 'مشغول الآن';

  @override
  String get restaurantNoDelivery => 'لا يوصّل إليك';

  @override
  String restaurantMinutes(int minutes) {
    return '$minutes د';
  }

  @override
  String restaurantMinOrder(String amount) {
    return 'الحد الأدنى $amount';
  }

  @override
  String restaurantFee(String amount) {
    return 'التوصيل $amount';
  }

  @override
  String get dishSoldOut => 'نفد';

  @override
  String get dishPopular => 'الأكثر طلبًا';

  @override
  String get dishNote => 'ملاحظة للمطبخ (اختياري)';

  @override
  String get foodAdded => 'أُضيف إلى سلتك.';

  @override
  String get cartReplaceTitle => 'بدء سلة جديدة؟';

  @override
  String cartReplaceMessage(String restaurant) {
    return 'سلتك فيها أطباق من $restaurant. إضافة هذا الطبق تفرغها.';
  }

  @override
  String get cartReplaceYes => 'ابدأ سلة جديدة';

  @override
  String foodViewCart(int count) {
    return 'عرض السلة ($count)';
  }

  @override
  String get foodCartTitle => 'طلبك';

  @override
  String get foodCartEmptyTitle => 'سلتك فارغة';

  @override
  String get foodCartEmptyMessage => 'اختر مطعمًا وأضف أطباقًا.';

  @override
  String get foodDeliverTo => 'التوصيل إلى';

  @override
  String get foodSubtotal => 'المجموع الفرعي';

  @override
  String get foodDeliveryFee => 'التوصيل';

  @override
  String get foodTotal => 'الإجمالي';

  @override
  String get foodTotalMissing => 'أدخل العنوان لرؤية الإجمالي.';

  @override
  String get foodYourPhone => 'رقم هاتفك المحمول للمندوب';

  @override
  String get foodPlaceOrder => 'أرسل الطلب';

  @override
  String get foodSignInToOrder => 'سجّل الدخول للطلب';

  @override
  String get foodFillAddress => 'أدخل عنوان التوصيل.';

  @override
  String get foodFillPhone => 'أدخل رقم هاتفك المحمول ليتصل بك المندوب.';

  @override
  String get foodOrderSent => 'أُرسل طلبك إلى المطعم.';

  @override
  String get foodOrderPaid => 'تم الدفع. وصل طلبك إلى المطعم.';

  @override
  String foodEta(int minutes) {
    String _temp0 = intl.Intl.pluralLogic(
      minutes,
      locale: localeName,
      other: 'نحو $minutes دقيقة',
      few: 'نحو $minutes دقائق',
      two: 'نحو دقيقتين',
      one: 'نحو دقيقة',
    );
    return '$_temp0';
  }

  @override
  String get foodAwaitingPayment => 'بانتظار الدفع';

  @override
  String get foodPlaced => 'أُرسل إلى المطعم';

  @override
  String get foodAccepted => 'قيد التحضير';

  @override
  String get foodReady => 'جاهز للمندوب';

  @override
  String get foodPickedUp => 'استلمه المندوب';

  @override
  String get foodOnTheWay => 'في الطريق';

  @override
  String get foodDelivered => 'تم التوصيل';

  @override
  String get foodRejected => 'لم يُقبل';

  @override
  String get foodCancelled => 'أُلغي';

  @override
  String get foodFailed => 'تعذّر التوصيل';

  @override
  String foodOrderHeading(String reference) {
    return 'الطلب $reference';
  }

  @override
  String foodReadyAt(String time) {
    return 'يجهز نحو $time';
  }

  @override
  String get rejectClosing => 'المطعم على وشك الإغلاق';

  @override
  String get rejectTooBusy => 'مشغول جدًا الآن';

  @override
  String get rejectItemUnavailable => 'صنف غير متوفر';

  @override
  String get rejectOther => 'سبب آخر';

  @override
  String get foodCancel => 'إلغاء الطلب';

  @override
  String get foodCancelConfirm => 'إلغاء هذا الطلب؟';

  @override
  String get foodCancelledToast => 'أُلغي الطلب.';

  @override
  String get foodCallRestaurant => 'اتصل بالمطعم';

  @override
  String get foodRestaurant => 'المطعم';

  @override
  String get foodDishes => 'الأطباق';

  @override
  String get foodWaitingRestaurant => 'بانتظار قبول المطعم للطلب.';

  @override
  String get foodRateTitle => 'قيّم طلبك';

  @override
  String get rateRestaurant => 'المطعم';

  @override
  String get rateCourier => 'المندوب';

  @override
  String get rateComment => 'هل من إضافة؟ (اختياري)';

  @override
  String get rateSend => 'أرسل التقييم';

  @override
  String get rateThanks => 'شكرًا على التقييم.';

  @override
  String get ratePickStars => 'اختر نجوم المطعم.';

  @override
  String foodRated(int stars) {
    return 'قيّمته $stars من 5.';
  }

  @override
  String rateStar(int stars) {
    String _temp0 = intl.Intl.pluralLogic(
      stars,
      locale: localeName,
      other: '$stars نجمة',
      few: '$stars نجوم',
      two: 'نجمتان',
      one: 'نجمة واحدة',
    );
    return '$_temp0';
  }

  @override
  String get loadingFoodOrders => 'جارٍ تحميل طلباتك';

  @override
  String get noFoodOrdersTitle => 'لا توجد طلبات بعد';

  @override
  String get noFoodOrdersMessage => 'تظهر طلبات الطعام هنا.';

  @override
  String get foodOrderFood => 'اطلب طعامًا';

  @override
  String get foodOrdersSignInTitle => 'سجّل الدخول لرؤية طلباتك';

  @override
  String get foodOrdersSignInMessage => 'تظهر هنا طلباتك وأين وصلت.';

  @override
  String get deskNew => 'جديدة';

  @override
  String get deskPreparing => 'قيد التحضير';

  @override
  String get deskDone => 'المنتهية';

  @override
  String get deskAccepting => 'يستقبل الطلبات';

  @override
  String deskPausedUntil(String time) {
    return 'متوقف حتى $time';
  }

  @override
  String get deskClosedHours => 'مغلق حسب ساعات العمل';

  @override
  String deskToday(int count, String sales) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'اليوم: $count طلب · $sales',
      many: 'اليوم: $count طلبًا · $sales',
      few: 'اليوم: $count طلبات · $sales',
      two: 'اليوم: طلبان · $sales',
      one: 'اليوم: طلب واحد · $sales',
      zero: 'اليوم: لا طلبات · $sales',
    );
    return '$_temp0';
  }

  @override
  String get deskPause => 'إيقاف الطلبات الجديدة';

  @override
  String get deskPauseFor => 'إيقاف الطلبات الجديدة لمدة';

  @override
  String get deskOpenAgain => 'استقبال الطلبات من جديد';

  @override
  String get notRestaurantTitle => 'لمطاعمنا';

  @override
  String get notRestaurantMessage =>
      'هذه الشاشة لموظفي المطاعم التي نوصّل طلباتها.';

  @override
  String get loadingRestaurantOrders => 'جارٍ تحميل الطلبات';

  @override
  String get noRestaurantOrdersTitle => 'لا توجد طلبات هنا';

  @override
  String get noRestaurantOrdersMessage =>
      'تظهر الطلبات الجديدة هنا فور وصولها.';

  @override
  String get deskAccept => 'قبول';

  @override
  String get deskAcceptTitle => 'يجهز خلال كم دقيقة؟';

  @override
  String get deskAccepted => 'تم القبول. أُبلغ العميل.';

  @override
  String get deskReject => 'لا يمكن قبوله';

  @override
  String get deskRejectTitle => 'لماذا لا يمكنك قبوله؟';

  @override
  String get deskRejectNote => 'ملاحظة للعميل (اختياري)';

  @override
  String get deskRejected => 'تم الرفض. أُبلغ العميل.';

  @override
  String get deskMarkReady => 'جاهز للمندوب';

  @override
  String get deskMarkedReady => 'تم وضع علامة جاهز.';

  @override
  String get deskCustomer => 'العميل';

  @override
  String get tabRide => 'مشوار';

  @override
  String get tabMyRides => 'مشاويري';

  @override
  String get tabDriver => 'السائق';

  @override
  String get rideWhereTo => 'إلى أين؟';

  @override
  String get ridePickup => 'مكان الركوب';

  @override
  String get rideDropoff => 'الوجهة';

  @override
  String get rideMyLocation => 'موقعي';

  @override
  String get rideWhen => 'متى';

  @override
  String get rideNow => 'الآن';

  @override
  String get rideLater => 'لاحقًا';

  @override
  String rideScheduledFor(String time) {
    return 'الركوب في $time';
  }

  @override
  String get rideChooseCar => 'اختر نوع السيارة';

  @override
  String get rideSignInForFares => 'سجّل الدخول لرؤية الأسعار.';

  @override
  String get rideFillPlaces =>
      'حدّد مكان الركوب والوجهة بموقعك أو برابط خرائط أو على الخريطة.';

  @override
  String rideTrip(String km, int minutes) {
    return '$km كم · نحو $minutes د';
  }

  @override
  String get rideMeteredNote => 'العداد يحدد الأجرة النهائية';

  @override
  String rideSeats(int seats) {
    String _temp0 = intl.Intl.pluralLogic(
      seats,
      locale: localeName,
      other: '$seats مقعدًا',
      few: '$seats مقاعد',
      two: 'مقعدان',
      one: 'مقعد واحد',
    );
    return '$_temp0';
  }

  @override
  String ridePickupIn(int minutes) {
    return 'على بُعد $minutes د';
  }

  @override
  String get rideNoneNearby => 'لا توجد سيارة قريبة الآن';

  @override
  String rideDiscount(String amount) {
    return 'كود الخصم: خصم $amount';
  }

  @override
  String ridePreviousFee(String amount) {
    return 'يشمل $amount من آخر مشوار ألغيته';
  }

  @override
  String get ridePromoCode => 'كود خصم (اختياري)';

  @override
  String get rideNotes => 'ملاحظة للسائق';

  @override
  String get rideCardAfter => 'تدفع بالبطاقة بعد انتهاء المشوار.';

  @override
  String get rideRequest => 'اطلب مشوارًا';

  @override
  String get rideBook => 'احجز المشوار';

  @override
  String get rideScheduled => 'محجوز';

  @override
  String get rideSearching => 'جارٍ البحث عن سائق';

  @override
  String get rideAccepted => 'السائق في الطريق';

  @override
  String get rideArrived => 'السائق وصل';

  @override
  String get rideInProgress => 'في الطريق';

  @override
  String get rideCompleted => 'انتهى';

  @override
  String get rideCancelled => 'أُلغي';

  @override
  String get rideNoDriver => 'لم يُعثر على سائق';

  @override
  String get rideSearchingHint => 'نعرض مشوارك على أقرب السائقين.';

  @override
  String get rideArrivedHint => 'السائق ينتظرك في مكان الركوب.';

  @override
  String get rideNoDriverHint => 'لم يقبله أي سائق. حاول مرة أخرى بعد دقائق.';

  @override
  String get rideTryAgain => 'حاول مرة أخرى';

  @override
  String rideHeading(String reference) {
    return 'مشوار $reference';
  }

  @override
  String get ridePin => 'كودك';

  @override
  String get ridePinHint => 'قل هذا الكود للسائق عندما تركب.';

  @override
  String get rideCall => 'اتصال';

  @override
  String rideDriverSeen(String time) {
    return 'موقع السائق الساعة $time';
  }

  @override
  String get rideShare => 'مشاركة المشوار';

  @override
  String rideShareText(String url) {
    return 'تابع مشواري: $url';
  }

  @override
  String get rideSos => 'طوارئ';

  @override
  String get rideSosTitle => 'اتصال طوارئ';

  @override
  String rideSosMessage(String number) {
    return 'الاتصال بـ $number؟ استخدمه في حالات الطوارئ فقط.';
  }

  @override
  String get rideSosCall => 'اتصل الآن';

  @override
  String get rideCancel => 'إلغاء المشوار';

  @override
  String get rideCancelConfirm => 'لماذا تلغي المشوار؟';

  @override
  String rideCancelFeeNote(String fee, int minutes) {
    return 'الإلغاء بعد أكثر من $minutes د من قبول السائق يكلف $fee تُضاف إلى مشوارك التالي.';
  }

  @override
  String get rideReasonChangedPlans => 'تغيّرت خططي';

  @override
  String get rideReasonDriverLate => 'السائق تأخر كثيرًا';

  @override
  String get rideReasonDriverAsked => 'السائق طلب مني الإلغاء';

  @override
  String get rideReasonWrongPlace => 'مكان الركوب خطأ';

  @override
  String get rideReasonOther => 'سبب آخر';

  @override
  String get rideCancelledToast => 'أُلغي المشوار.';

  @override
  String rideCancelledFee(String fee) {
    return 'أُلغي المشوار. ستُضاف $fee إلى مشوارك التالي.';
  }

  @override
  String get rideCancelledByYou => 'ألغيته أنت';

  @override
  String get rideCancelledByCompany => 'ألغته الشركة';

  @override
  String rideFeeCharged(String fee) {
    return 'الرسوم: $fee';
  }

  @override
  String get rideFare => 'الأجرة';

  @override
  String get rideFareEstimate => 'الأجرة التقديرية';

  @override
  String get ridePaid => 'تم الدفع. شكرًا لك.';

  @override
  String get rideRateTitle => 'كيف كان السائق؟';

  @override
  String rideRated(int stars) {
    return 'قيّمت السائق $stars من 5.';
  }

  @override
  String get myRidesSignInTitle => 'سجّل الدخول لرؤية مشاويرك';

  @override
  String get myRidesSignInMessage => 'تظهر مشاويرك وإيصالاتها هنا.';

  @override
  String get loadingRides => 'جارٍ تحميل المشاوير';

  @override
  String get noRidesTitle => 'لا توجد مشاوير بعد';

  @override
  String get noRidesMessage => 'إلى أين تريد الذهاب؟';

  @override
  String get driverTitle => 'السائق';

  @override
  String get riderView => 'شاشات الراكب';

  @override
  String get driverMode => 'وضع السائق';

  @override
  String get notDriverTitle => 'لسائقينا';

  @override
  String get notDriverMessage =>
      'هذه الشاشة لسائقي الشركة. اطلب من الشركة إضافة رقمك.';

  @override
  String get driverOnline => 'متصل';

  @override
  String get driverOfflineHint => 'اتصل لتصلك المشاوير.';

  @override
  String driverToday(int rides, String earned) {
    String _temp0 = intl.Intl.pluralLogic(
      rides,
      locale: localeName,
      other: '$rides مشوارًا اليوم · $earned',
      few: '$rides مشاوير اليوم · $earned',
      two: 'مشواران اليوم · $earned',
      one: 'مشوار واحد اليوم · $earned',
      zero: 'لا مشاوير اليوم بعد',
    );
    return '$_temp0';
  }

  @override
  String get driverWaiting =>
      'في انتظار مشوار. اترك هذه الشاشة مفتوحة: يُرسل موقعك ما دمت متصلًا.';

  @override
  String get driverSharing =>
      'ما دمت متصلًا وهذه الشاشة مفتوحة، يُرسل موقعك إلى الشركة والراكب.';

  @override
  String get driverOffer => 'مشوار جديد';

  @override
  String driverSecondsLeft(int seconds) {
    return '$seconds ث';
  }

  @override
  String driverPickupKm(String km) {
    return '$km كم إلى مكان الركوب';
  }

  @override
  String get driverAccept => 'قبول';

  @override
  String get driverDecline => 'رفض';

  @override
  String get driverOpenRide => 'افتح مشواري الحالي';

  @override
  String get driverCurrent => 'الحالية';

  @override
  String get driverDone => 'المنتهية';

  @override
  String get driverEarnings => 'الأرباح';

  @override
  String get driverNoRides => 'لا توجد مشاوير هنا';

  @override
  String get driverNoRidesMessage => 'تظهر هنا المشاوير التي تقبلها.';

  @override
  String get earningsToday => 'اليوم';

  @override
  String get earningsWeek => 'هذا الأسبوع';

  @override
  String get earningsMonth => 'هذا الشهر';

  @override
  String get earningsRides => 'المشاوير';

  @override
  String get earningsFares => 'الأجرة';

  @override
  String get earningsCash => 'النقد المحصّل';

  @override
  String get earningsCompany => 'حصة الشركة';

  @override
  String get earningsEarned => 'ربحك';

  @override
  String earningsRidesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مشوارًا',
      few: '$count مشاوير',
      two: 'مشواران',
      one: 'مشوار واحد',
    );
    return '$_temp0';
  }

  @override
  String get driverArrived => 'وصلت';

  @override
  String get driverStart => 'ابدأ المشوار';

  @override
  String get driverEnd => 'أنهِ المشوار';

  @override
  String driverWaitingSince(String time) {
    return 'في الانتظار منذ $time';
  }

  @override
  String driverCollect(String amount) {
    return 'حصّل $amount نقدًا.';
  }

  @override
  String get driverCardRide => 'يدفع الراكب بالبطاقة في التطبيق.';

  @override
  String get driverRider => 'الراكب';

  @override
  String get driverPinTitle => 'كود الراكب';

  @override
  String get driverPinHint =>
      'اطلب من الراكب الكود المكوّن من 4 أرقام في تطبيقه.';

  @override
  String get driverCancelTitle => 'إلغاء هذا المشوار؟';

  @override
  String driverNoShowAfter(int minutes) {
    return 'إذا لم يحضر الراكب يمكنك الإلغاء بعد $minutes د من وصولك. وإلا ينتقل المشوار إلى سائق آخر.';
  }

  @override
  String get driverCancelNoShowHint =>
      'لم يحضر الراكب: تُحتسب عليه رسوم الإلغاء التي تحددها الشركة.';

  @override
  String get driverCantMakeIt => 'لا أستطيع';

  @override
  String get driverNoShow => 'الراكب لم يحضر';

  @override
  String get ridePayCash => 'نقدًا للسائق';

  @override
  String get teachersTitle => 'المدرّسون';

  @override
  String get teachersSearch => 'ابحث عن مدرّس أو مادة';

  @override
  String get teachersEmpty => 'لا يوجد مدرّسون هنا بعد';

  @override
  String get teachersAllSubjects => 'الكل';

  @override
  String get teacherFeatured => 'مميّز';

  @override
  String teacherCourseCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count دورة',
      many: '$count دورة',
      few: '$count دورات',
      two: 'دورتان',
      one: 'دورة واحدة',
      zero: 'لا دورات بعد',
    );
    return '$_temp0';
  }

  @override
  String teacherStudentCount(int count) {
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
  String teacherFollowerCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count متابع',
      many: '$count متابعًا',
      few: '$count متابعين',
      two: 'متابعان',
      one: 'متابع واحد',
      zero: 'لا متابعين',
    );
    return '$_temp0';
  }

  @override
  String get teacherFollow => 'متابعة';

  @override
  String get teacherFollowing => 'تتابعه';

  @override
  String teacherFollowed(String name) {
    return 'سيصلك إشعار عندما ينشر $name دورة جديدة.';
  }

  @override
  String teacherCoursesTitle(String name) {
    return 'دورات $name';
  }

  @override
  String teacherRate(String name) {
    return 'قيّم $name';
  }

  @override
  String get teacherRateHint => 'اشترك في إحدى دوراته لتقييمه.';

  @override
  String teacherRated(String name) {
    return 'شكرًا لتقييمك $name!';
  }

  @override
  String get teacherYourRating => 'تقييمك';

  @override
  String get teachersSeeAll => 'عرض كل المدرّسين';

  @override
  String get teachHere => 'درّس معنا';

  @override
  String get teachIntro =>
      'عرّف الأكاديمية بنفسك وبما ستدرّسه، وسيظهر ردّها هنا.';

  @override
  String get teachName => 'اسمك';

  @override
  String get teachBio => 'نبذة عنك';

  @override
  String get teachBioHint => 'خبرتك وما ستدرّسه';

  @override
  String get teachSubjects => 'المواد';

  @override
  String get teachSubjectsHint => 'مفصولة بفواصل، مثل: العربية، النحو';

  @override
  String get teachSend => 'إرسال الطلب';

  @override
  String get teachPending => 'أُرسل طلبك، وسترد الأكاديمية هنا.';

  @override
  String get teachApproved => 'أصبحت من مدرّسي الأكاديمية. افتح تبويب المدرّس.';

  @override
  String get teachDeclined => 'رفضت الأكاديمية طلبك.';

  @override
  String teachNote(String note) {
    return 'ملاحظة الأكاديمية: $note';
  }

  @override
  String get teachApplyAgain => 'تقدّم مرة أخرى';

  @override
  String get tabTeacher => 'المدرّس';

  @override
  String teacherShare(String percent) {
    return 'نصيبك: $percent%';
  }

  @override
  String get teacherTabCourses => 'الدورات';

  @override
  String get teacherTabQuestions => 'الأسئلة';

  @override
  String get teacherTabEarnings => 'الأرباح';

  @override
  String get teacherNewCourse => 'دورة جديدة';

  @override
  String get teacherNoCourses =>
      'ابدأ دورتك الأولى، وأضف دروسها، ثم أرسلها إلى الأكاديمية لمراجعتها.';

  @override
  String get stageDraft => 'مسودة';

  @override
  String get stageInReview => 'لدى الأكاديمية';

  @override
  String get stageReturned => 'تحتاج إلى تعديل';

  @override
  String get stagePublished => 'منشورة';

  @override
  String get stageHidden => 'مخفية';

  @override
  String get courseFieldTitle => 'العنوان';

  @override
  String get courseFieldDescription => 'الوصف';

  @override
  String courseFieldPrice(String currency) {
    return 'السعر ($currency)';
  }

  @override
  String get courseFieldPriceHint => '0 لدورة مجانية';

  @override
  String get courseFieldLevel => 'المستوى';

  @override
  String get levelBeginner => 'مبتدئ';

  @override
  String get levelIntermediate => 'متوسط';

  @override
  String get levelAdvanced => 'متقدّم';

  @override
  String get courseFieldCategory => 'التصنيف';

  @override
  String get courseNoCategory => 'بلا تصنيف';

  @override
  String get courseCreate => 'إنشاء الدورة';

  @override
  String get courseSave => 'حفظ التعديلات';

  @override
  String get courseEditDetails => 'تعديل التفاصيل';

  @override
  String get courseAddSection => 'إضافة قسم';

  @override
  String get courseSectionTitle => 'عنوان القسم';

  @override
  String get courseAddLesson => 'إضافة درس';

  @override
  String get lessonFieldTitle => 'عنوان الدرس';

  @override
  String get lessonFieldText => 'نص (اختياري)';

  @override
  String get lessonFieldVideo => 'رابط الفيديو (يوتيوب أو فيميو أو رابط)';

  @override
  String get lessonPickFile => 'رفع فيديو أو PDF';

  @override
  String lessonUploading(int percent) {
    return 'جارٍ الرفع… $percent%';
  }

  @override
  String get lessonFieldMinutes => 'المدة بالدقائق (اختياري)';

  @override
  String get lessonFieldPreview => 'معاينة مجانية: متاح قبل الاشتراك';

  @override
  String get lessonNeedsContent => 'أضف فيديو أو ملف PDF أو نصًا.';

  @override
  String get lessonFileTooBig => 'هذا الملف كبير جدًا.';

  @override
  String get lessonFileType => 'اختر فيديو MP4 أو MOV أو WebM، أو ملف PDF.';

  @override
  String get lessonKindVideo => 'فيديو';

  @override
  String get lessonKindPdf => 'PDF';

  @override
  String get lessonKindText => 'نص';

  @override
  String get lessonRemove => 'حذف الدرس';

  @override
  String get courseSendForReview => 'إرسال للمراجعة';

  @override
  String get courseSentForReview =>
      'أُرسلت. ستنشرها الأكاديمية أو تخبرك بما يجب تعديله.';

  @override
  String get courseInReviewNote => 'تراجع الأكاديمية هذه الدورة.';

  @override
  String get coursePublishedNote =>
      'يرى الطلاب هذه الدورة، وتظهر الدروس الجديدة فورًا.';

  @override
  String get teacherNoQuestions => 'لا أسئلة من طلابك بعد.';

  @override
  String get questionWaiting => 'بانتظار ردّك';

  @override
  String get questionAnswered => 'تمت الإجابة';

  @override
  String get periodLastMonth => 'الشهر الماضي';

  @override
  String get periodYear => 'هذا العام';

  @override
  String teacherSold(int count, String amount) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مبيع · $amount',
      many: '$count مبيعًا · $amount',
      few: '$count مبيعات · $amount',
      two: 'بيعان · $amount',
      one: 'بيع واحد · $amount',
      zero: 'لم يُبع شيء',
    );
    return '$_temp0';
  }

  @override
  String teacherRefunds(String amount) {
    return 'المبالغ المستردة: $amount';
  }

  @override
  String get teacherEarned => 'نصيبك';

  @override
  String get teacherPaidBy =>
      'مبيعات صفحة الدفع الخاصة بالأكاديمية بعد خصم المبالغ المستردة، والأكاديمية هي من يدفع لك.';

  @override
  String get teacherEditProfile => 'تعديل ملفك';

  @override
  String get teacherProfileSaved => 'تم الحفظ.';

  @override
  String get tabSchool => 'المدرسة';

  @override
  String get tabClassroom => 'الفصل';

  @override
  String get schoolSignInTitle => 'سجّل الدخول لترى مدرستك';

  @override
  String get schoolSignInMessage =>
      'استخدم رقم الجوال الذي أعطيته للمدرسة. يرى أولياء الأمور كل أبنائهم.';

  @override
  String get schoolNotMemberTitle => 'هذا الرقم ليس في قائمة المدرسة';

  @override
  String get schoolNotMemberMessage =>
      'اطلب من المدرسة إضافة الرقم الذي سجّلت الدخول به، ثم افتح هذا التبويب مرة أخرى.';

  @override
  String get schoolNoStudents => 'لا يوجد طالب بعد';

  @override
  String get schoolNoStudentsMessage => 'اطلب من المدرسة ربط أبنائك برقمك.';

  @override
  String get schoolForWorkersTitle => 'هذا التبويب للطلاب وأولياء الأمور';

  @override
  String get schoolForStaffMessage =>
      'ما تحتاجه في عملك في تبويب الموظفين: تسجيل الحضور والانصراف وإجازاتك وأخبار الموظفين والتقويم والمكتبة.';

  @override
  String get schoolForTeachersMessage =>
      'ما تحتاجه في عملك في تبويب الفصل: فصولك وتسجيل الحضور والانصراف والتقويم والامتحانات.';

  @override
  String get schoolOpenStaff => 'افتح الموظفين';

  @override
  String get schoolOpenClassroom => 'افتح الفصل';

  @override
  String get schoolToday => 'اليوم';

  @override
  String schoolTodayDay(String day) {
    return 'اليوم، $day';
  }

  @override
  String get schoolNoLessonsToday => 'لا حصص اليوم.';

  @override
  String get schoolEverything => 'مدرستك';

  @override
  String get schoolHomework => 'الواجبات';

  @override
  String get schoolGrades => 'الدرجات';

  @override
  String get schoolAttendance => 'الحضور';

  @override
  String get schoolTimetable => 'الجدول';

  @override
  String get schoolFees => 'الرسوم';

  @override
  String get schoolNews => 'أخبار المدرسة';

  @override
  String get schoolNoNews => 'لا أخبار بعد.';

  @override
  String schoolRoom(String room) {
    return 'القاعة $room';
  }

  @override
  String get schoolNoTimetable => 'لا يوجد جدول بعد';

  @override
  String get schoolNoTimetableMessage => 'تضيف المدرسة حصص الأسبوع وتظهر هنا.';

  @override
  String feesDue(String amount) {
    return 'المستحق: $amount';
  }

  @override
  String get homeworkDue => 'المطلوب';

  @override
  String get homeworkDone => 'المنتهي';

  @override
  String get homeworkNoneDue => 'لا شيء مطلوب. أحسنت!';

  @override
  String get homeworkNoneDone => 'لا توجد واجبات هنا بعد.';

  @override
  String homeworkDueOn(String date) {
    return 'التسليم $date';
  }

  @override
  String get homeworkHandedIn => 'سُلّم';

  @override
  String get homeworkLate => 'سُلّم متأخرًا';

  @override
  String get homeworkYourWork => 'ما تم تسليمه';

  @override
  String get homeworkMark => 'الدرجة';

  @override
  String get homeworkAnswer => 'إجابتك';

  @override
  String get homeworkAddPhoto => 'التقط صورة';

  @override
  String get homeworkAddFile => 'أضف ملف PDF أو صورة';

  @override
  String get homeworkRemoveFile => 'إزالة الملف';

  @override
  String get homeworkFileType => 'أرسل صورة (JPEG أو PNG أو WebP) أو ملف PDF.';

  @override
  String get homeworkFileTooBig =>
      'هذا الملف كبير جدًا: الصور حتى 20 ميغابايت وملفات PDF حتى 200 ميغابايت.';

  @override
  String get homeworkNeedsSomething => 'اكتب إجابتك أو أضف صورة أو ملف PDF.';

  @override
  String get homeworkSend => 'تسليم';

  @override
  String get homeworkSendAgain => 'تسليم مرة أخرى';

  @override
  String get homeworkSent => 'تم التسليم. يراه معلّمك الآن.';

  @override
  String get gradesNone => 'لا درجات بعد';

  @override
  String get gradesNoneMessage => 'تظهر الدرجات هنا عندما يُدخلها المعلّمون.';

  @override
  String get gradesComing => 'قادمة';

  @override
  String get assessmentExam => 'امتحان';

  @override
  String get assessmentQuiz => 'اختبار قصير';

  @override
  String get assessmentAssignment => 'تكليف';

  @override
  String attendanceSince(String date) {
    return 'منذ $date';
  }

  @override
  String get attendanceNone => 'لا غياب ولا تأخير. استمر!';

  @override
  String get attendancePresent => 'حاضر';

  @override
  String get attendanceAbsent => 'غائب';

  @override
  String get attendanceLate => 'متأخر';

  @override
  String get attendanceExcused => 'بعذر';

  @override
  String get feesNone => 'لا رسوم';

  @override
  String get feesNoneMessage =>
      'تظهر هنا الرسوم التي تضيفها المدرسة، مع إيصال لكل دفعة.';

  @override
  String get feesStillDue => 'المتبقي';

  @override
  String get feesPayAtSchool => 'ادفع في المدرسة، وتظهر الدفعة هنا مع إيصالها.';

  @override
  String get feeDue => 'مستحقة';

  @override
  String feeDueOn(String date) {
    return 'مستحقة قبل $date';
  }

  @override
  String get feePaid => 'مدفوعة';

  @override
  String feePaidOn(String date) {
    return 'دُفعت يوم $date';
  }

  @override
  String feePay(String amount) {
    return 'ادفع $amount';
  }

  @override
  String get feePaidThanks => 'تم الدفع. الإيصال هنا.';

  @override
  String get feeReceipt => 'الإيصال';

  @override
  String get classroomNotTeacher => 'لمعلّمي المدرسة';

  @override
  String get classroomNotTeacherMessage =>
      'تضيف المدرسة أرقام معلّميها؛ يسجّلون الدخول بها وتظهر فصولهم هنا.';

  @override
  String get classroomClasses => 'فصولك';

  @override
  String get classroomNoClasses => 'لا فصول بعد: تضيفك المدرسة إلى جدولها.';

  @override
  String get classroomYourClass => 'فصلك';

  @override
  String classroomStudents(int count) {
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
  String get classroomTakeAttendance => 'الحضور';

  @override
  String get classroomWrite => 'اكتب للفصل';

  @override
  String classroomWriteTo(String name) {
    return 'اكتب إلى $name';
  }

  @override
  String get classroomAssessments => 'الامتحانات والدرجات';

  @override
  String get classroomGiveHomework => 'إعطاء واجب';

  @override
  String get classroomNoHomework => 'لم يُعطَ أي واجب بعد.';

  @override
  String get classroomNewAssessment => 'امتحان أو اختبار جديد';

  @override
  String get classroomNoAssessments => 'لا امتحانات أو اختبارات بعد.';

  @override
  String classroomHandedIn(int done, int total, int marked) {
    return 'سلّم $done من $total · صُحّح $marked';
  }

  @override
  String classroomScored(int count, String max) {
    return 'رُصدت $count · من $max';
  }

  @override
  String classroomOutOf(String max) {
    return 'من $max';
  }

  @override
  String get classroomSubject => 'المادة';

  @override
  String get classroomTitle => 'العنوان';

  @override
  String get classroomInstructions => 'التعليمات (اختياري)';

  @override
  String get classroomDue => 'موعد التسليم';

  @override
  String get classroomDate => 'التاريخ';

  @override
  String get classroomChooseDay => 'اختر';

  @override
  String get classroomFullMark => 'الدرجة النهائية';

  @override
  String get classroomGive => 'إعطاء';

  @override
  String get classroomAdd => 'إضافة';

  @override
  String get classroomHomeworkMissing =>
      'اختر المادة واكتب عنوانًا واختر يوم التسليم.';

  @override
  String get classroomHomeworkGiven => 'تم. أُبلغ الفصل وأسرهم.';

  @override
  String get classroomAssessmentMissing =>
      'اختر المادة، واكتب العنوان والدرجة النهائية واليوم.';

  @override
  String get classroomMessage => 'الرسالة';

  @override
  String get classroomMessageMissing => 'اكتب عنوانًا والرسالة.';

  @override
  String get classroomMessageSent => 'أُرسلت إلى الفصل وأسرهم.';

  @override
  String classroomAttendanceOf(String name) {
    return 'الحضور: $name';
  }

  @override
  String get classroomNotTaken =>
      'لم يُسجَّل بعد: الجميع حاضرون حتى تغيّر ذلك.';

  @override
  String get classroomNoStudents => 'لا طلاب في هذا الفصل بعد.';

  @override
  String get classroomSaveAttendance => 'حفظ الحضور';

  @override
  String get classroomAttendanceSaved =>
      'تم الحفظ. أُبلغت أسر الغائبين والمتأخرين.';

  @override
  String get classroomNotHandedIn => 'لم يُسلَّم';

  @override
  String get classroomMarkHint => 'مثل 9/10 أو أ أو ممتاز';

  @override
  String get classroomFeedback => 'ملاحظات (اختياري)';

  @override
  String get classroomMarkMissing => 'اكتب الدرجة.';

  @override
  String get classroomSaveScores => 'حفظ الدرجات';

  @override
  String get classroomScoresSaved =>
      'تم الحفظ. أُبلغ الطلاب والأسر بالدرجات الجديدة.';

  @override
  String classroomScoreRange(String max) {
    return 'الدرجة من 0 إلى $max.';
  }

  @override
  String taxiNearby(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count سيارة أجرة قربك',
      many: '$count سيارة أجرة قربك',
      few: '$count سيارات أجرة قربك',
      two: 'سيارتا أجرة قربك',
      one: 'سيارة أجرة واحدة قربك',
      zero: 'لا توجد سيارات أجرة متاحة قربك',
    );
    return '$_temp0';
  }

  @override
  String taxiNearest(int minutes) {
    return 'أقربها على بُعد $minutes د';
  }

  @override
  String get taxiWhereFrom => 'من أين؟';

  @override
  String taxiFrom(String place) {
    return 'من: $place';
  }

  @override
  String taxiTo(String place) {
    return 'إلى: $place';
  }

  @override
  String taxiRequestType(String type) {
    return 'اطلب $type';
  }

  @override
  String taxiArrivingIn(int minutes) {
    return 'يصل خلال $minutes د';
  }

  @override
  String get taxiLive => 'مباشر';

  @override
  String get taxiAvailable => 'متاح لاستقبال الطلبات';

  @override
  String get taxiSearchHint => 'ابحث عن مكان';

  @override
  String get taxiSearchNone => 'لم نجد أماكن. جرّب كلمات أخرى.';

  @override
  String get taxiChooseOnMap => 'اختر على الخريطة';

  @override
  String get taxiOnMap => 'مكان محدد على الخريطة';

  @override
  String get taxiPlaceFailed => 'لا يمكن استخدام هذا المكان. اختر مكانًا آخر.';

  @override
  String get assignmentTitle => 'واجب';

  @override
  String assignmentOutOf(int points) {
    return 'من $points درجة';
  }

  @override
  String assignmentPassScore(int points) {
    return 'درجة النجاح: $points';
  }

  @override
  String get assignmentWaiting => 'تم التسليم. بانتظار تقييم معلّمك.';

  @override
  String get assignmentReturned => 'أعاده معلّمك. عدّله وسلّمه مرة أخرى.';

  @override
  String assignmentGraded(int score, int max) {
    return 'التقييم: $score من $max';
  }

  @override
  String get assignmentBelowPass => 'أقل من درجة النجاح.';

  @override
  String get assignmentFeedback => 'ملاحظة معلّمك';

  @override
  String get liveClass => 'حصة مباشرة';

  @override
  String get liveClasses => 'الحصص المباشرة';

  @override
  String get liveUpcoming => 'القادمة';

  @override
  String get livePast => 'السابقة';

  @override
  String get liveNow => 'الآن';

  @override
  String get liveEnded => 'انتهت هذه الحصة المباشرة.';

  @override
  String get liveJoin => 'انضم إلى الحصة المباشرة';

  @override
  String get liveJoinSoon => 'يمكنك الانضمام قبل بدئها بـ 15 دقيقة.';

  @override
  String get liveStartsSoon => 'تبدأ قريبًا. يمكنك الانضمام الآن.';

  @override
  String get liveRecording => 'شاهد التسجيل';

  @override
  String get liveNone => 'لا توجد حصص مباشرة قادمة.';

  @override
  String get liveNonePast => 'لا توجد حصص مباشرة سابقة بعد.';

  @override
  String get lockedPreviousNotDone => 'أكمل ما يسبقه في الدورة أولًا.';

  @override
  String get lockedAccessEnded => 'انتهى وصولك إلى هذه الدورة.';

  @override
  String get afterPrevious => 'بعد ما يسبقه';

  @override
  String get shortAnswerHint => 'اكتب إجابتك';

  @override
  String get quizReviewTitle => 'إجاباتك';

  @override
  String quizReviewYours(String answer) {
    return 'إجابتك: $answer';
  }

  @override
  String quizReviewRight(String answer) {
    return 'الإجابة الصحيحة: $answer';
  }

  @override
  String get quizReviewNone => 'لا إجابة';

  @override
  String get quizReviewCorrect => 'صحيحة';

  @override
  String get quizReviewWrong => 'خاطئة';

  @override
  String get mapNotShown => 'الخريطة غير متاحة';

  @override
  String get placesHome => 'المنزل';

  @override
  String get placesWork => 'العمل';

  @override
  String get placesAddHome => 'أضف المنزل';

  @override
  String get placesAddWork => 'أضف العمل';

  @override
  String get placesSetHome => 'حدّد منزلك';

  @override
  String get placesSetWork => 'حدّد مكان عملك';

  @override
  String get placesRecent => 'الأخيرة';

  @override
  String get placesNoSearch => 'اختر مكانًا محفوظًا أو موقعك أو رابط خرائط.';

  @override
  String get placeFromLink => 'من رابط خرائط';

  @override
  String get rideAdjustPickup => 'عدّل مكان الالتقاء على الخريطة';

  @override
  String get rideConfirmPickup => 'أكّد مكان الالتقاء';

  @override
  String get rideMovePin => 'حرّك الخريطة إلى مكان الالتقاء';

  @override
  String rideCarsNearby(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count سيارة قربك',
      many: '$count سيارة قربك',
      few: '$count سيارات قربك',
      two: 'سيارتان قربك',
      one: 'سيارة واحدة قربك',
      zero: 'لا توجد سيارات متاحة قربك',
    );
    return '$_temp0';
  }

  @override
  String taxiDropoffIn(int minutes) {
    return 'الوصول إلى الوجهة خلال $minutes د';
  }

  @override
  String get rideReceipt => 'الإيصال';

  @override
  String get navigateWith => 'التنقل باستخدام';

  @override
  String get navigateButton => 'ابدأ التنقل';

  @override
  String get navigateToPickup => 'التنقل إلى مكان الالتقاء';

  @override
  String get navigateToDropoff => 'التنقل إلى الوجهة';

  @override
  String trackingOnTheWayFrom(String place) {
    return 'في الطريق من $place إليك';
  }

  @override
  String trackingArrivesIn(int minutes) {
    return 'يصل خلال $minutes د تقريبًا';
  }

  @override
  String get certificatePdf => 'تنزيل ملف PDF';

  @override
  String get certificateShare => 'مشاركة الشهادة';

  @override
  String certificateShareText(String course, String url) {
    return 'شهادتي في $course: $url';
  }

  @override
  String cohortStarts(String cohort, String date) {
    return '$cohort · تبدأ $date';
  }

  @override
  String get teacherTabGrading => 'التقييم';

  @override
  String get gradingToGrade => 'بانتظار التقييم';

  @override
  String get gradingGraded => 'مُقيَّمة';

  @override
  String get gradingNone => 'لا شيء للتقييم. أحسنت!';

  @override
  String get gradingNoneGraded => 'لم يُقيَّم شيء بعد.';

  @override
  String get gradingSentBackLabel => 'أُعيد للطالب';

  @override
  String gradingScore(int max) {
    return 'الدرجة (من $max)';
  }

  @override
  String get gradingNote => 'ملاحظة للطالب';

  @override
  String get gradingSave => 'حفظ التقييم';

  @override
  String get gradingSendBack => 'إعادته ليحاول مجددًا';

  @override
  String get gradingSaved => 'تم التقييم. يراه طالبك في التطبيق.';

  @override
  String get gradingSentBack => 'أُعيد إلى طالبك.';

  @override
  String get gradingNeedsNote => 'اكتب ما يجب تغييره قبل إعادته.';

  @override
  String gradingScoreRange(int max) {
    return 'أدخل درجة من 0 إلى $max.';
  }

  @override
  String get reportCard => 'الشهادة المدرسية';

  @override
  String reportPeriod(String from, String to) {
    return 'من $from إلى $to';
  }

  @override
  String get reportOverall => 'الإجمالي';

  @override
  String reportAttendance(int present, int absent, int late, int excused) {
    return 'الحضور: حاضر $present، غائب $absent، متأخر $late، بعذر $excused.';
  }

  @override
  String get reportCardNone => 'لا توجد درجات في هذا الفصل الدراسي بعد.';

  @override
  String get classGradebook => 'سجل الدرجات';

  @override
  String get gradebookNone => 'لا يوجد طلاب في هذا الفصل بعد.';

  @override
  String get gradebookStudent => 'الطالب';

  @override
  String get gradebookAbsent => 'غائب';

  @override
  String get liveCalendar => 'التقويم';

  @override
  String get liveNoneThisDay => 'لا توجد حصة مباشرة في هذا اليوم.';

  @override
  String liveClassesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count حصة مباشرة',
      few: '$count حصص مباشرة',
      two: 'حصتان مباشرتان',
      one: 'حصة مباشرة واحدة',
    );
    return '$_temp0';
  }

  @override
  String get calendarPrevious => 'الشهر السابق';

  @override
  String get calendarNext => 'الشهر التالي';

  @override
  String couponSaves(String discount, String total) {
    return 'خصم $discount: تدفع $total.';
  }

  @override
  String get couponContinue => 'المتابعة بالقسيمة';

  @override
  String get couponWithout => 'المتابعة دون قسيمة';

  @override
  String get schoolCalendar => 'التقويم';

  @override
  String get schoolExams => 'الامتحانات';

  @override
  String get schoolBehaviour => 'السلوك';

  @override
  String get calendarMonth => 'الشهر';

  @override
  String get calendarList => 'القائمة';

  @override
  String get calendarNothingThisDay => 'لا شيء في هذا اليوم';

  @override
  String get calendarNothingAhead => 'لا شيء في التقويم خلال الأسابيع القادمة';

  @override
  String get calendarAllDay => 'طوال اليوم';

  @override
  String get calendarDayOff => 'لا دراسة';

  @override
  String get calendarExamDays => 'أيام امتحانات';

  @override
  String get calendarExam => 'امتحان';

  @override
  String get calendarStaffOnly => 'العاملون';

  @override
  String calendarDays(String from, String to) {
    return 'من $from إلى $to';
  }

  @override
  String calendarItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count عنصر',
      many: '$count عنصرًا',
      few: '$count عناصر',
      two: 'عنصران',
      one: 'عنصر واحد',
    );
    return '$_temp0';
  }

  @override
  String get examsComing => 'القادمة';

  @override
  String get examsDone => 'المنتهية';

  @override
  String get examsNone => 'لا امتحانات في الجدول بعد';

  @override
  String get examsNoneMessage => 'تنشر المدرسة جدول الامتحانات هنا.';

  @override
  String examTime(String starts, String ends, int minutes) {
    return '$starts–$ends · $minutes دقيقة';
  }

  @override
  String get behaviourPoints => 'النقاط';

  @override
  String get behaviourMerits => 'نقاط التميز';

  @override
  String get behaviourNotes => 'الملاحظات';

  @override
  String get behaviourNone => 'لا نقاط تميز أو ملاحظات بعد';

  @override
  String get behaviourFromSchool => 'من المدرسة';

  @override
  String behaviourPointsValue(String points) {
    return '$points نقاط';
  }

  @override
  String get behaviourWrite => 'كتابة نقطة تميز أو ملاحظة';

  @override
  String behaviourFor(String name) {
    return 'لـ $name';
  }

  @override
  String get behaviourCategory => 'الفئة';

  @override
  String get behaviourNoteHint => 'ملاحظة للأسرة (اختياري)';

  @override
  String get behaviourSaved => 'تم الحفظ. تراه الأسرة في التطبيق.';

  @override
  String get behaviourChooseCategory => 'اختر فئة';

  @override
  String get behaviourTakeBack => 'تراجع';

  @override
  String get behaviourTakenBack => 'تم التراجع';

  @override
  String get behaviourLatest => 'الأحدث';

  @override
  String get behaviourNoCategories => 'لم تحدد المدرسة فئات السلوك بعد';

  @override
  String classroomDayOff(String title) {
    return 'لا دراسة: $title. لا يُبلَّغ أحد بالغياب في هذا اليوم.';
  }

  @override
  String get schoolBus => 'حافلة المدرسة';

  @override
  String get busMorningTrip => 'رحلة الصباح';

  @override
  String get busAfternoonTrip => 'رحلة بعد الظهر';

  @override
  String busRouteLine(String route, String plate) {
    return '$route · $plate';
  }

  @override
  String busYourStop(String stop, String time) {
    return 'المحطة: $stop الساعة $time';
  }

  @override
  String get busNotStarted => 'لم تنطلق الحافلة بعد.';

  @override
  String get busOnTheWay => 'في الطريق';

  @override
  String busEtaMinutes(int minutes, String stop) {
    return 'نحو $minutes دقيقة إلى $stop';
  }

  @override
  String get busWaitingPosition => 'بانتظار موقع الحافلة…';

  @override
  String get busEnded => 'انتهت هذه الرحلة.';

  @override
  String busOnSince(String time) {
    return 'في الحافلة منذ $time';
  }

  @override
  String busGotOffAt(String time) {
    return 'نزل الساعة $time';
  }

  @override
  String get busAbsentToday => 'سُجّل غائبًا في هذه الرحلة';

  @override
  String busNoTrips(String name) {
    return 'لا حافلة لـ $name';
  }

  @override
  String busNoTripsMessage(String name) {
    return 'لم تضع المدرسة $name على خط حافلة.';
  }

  @override
  String get busStops => 'المحطات';

  @override
  String get busDutyTitle => 'مهام الحافلة';

  @override
  String get busDutySubtitle => 'خطوطك ورحلات اليوم';

  @override
  String get busDriver => 'السائق';

  @override
  String get busSupervisor => 'المشرف';

  @override
  String busStudents(int count) {
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
  String get busStart => 'ابدأ';

  @override
  String get busOpenTrip => 'فتح';

  @override
  String get busDone => 'انتهت';

  @override
  String get busWaitingDriver => 'يبدأ السائق هذه الرحلة.';

  @override
  String get busNoRoutes => 'لا خطوط حافلات';

  @override
  String get busNoRoutesMessage =>
      'لا تقود أي حافلة من حافلات المدرسة ولا تشرف عليها.';

  @override
  String get busSharing =>
      'يشارك هاتفك موقع الحافلة ما دامت هذه الشاشة مفتوحة.';

  @override
  String get busLocationOff => 'فعّل الموقع لترى الأسر الحافلة.';

  @override
  String get busMarkOn => 'صعد';

  @override
  String get busMarkOff => 'نزل';

  @override
  String get busMarkAbsent => 'غائب';

  @override
  String busCounts(int boarded, int off, int absent, int riders) {
    return '$boarded صعدوا · $off نزلوا · $absent غائبون · $riders إجمالًا';
  }

  @override
  String get busEndTrip => 'إنهاء الرحلة';

  @override
  String get busEndTitle => 'إنهاء الرحلة؟';

  @override
  String get busEndMessage => 'تتوقف الأسر عن رؤية الحافلة على الخريطة.';

  @override
  String busTripTitle(String route, String trip) {
    return '$route · $trip';
  }

  @override
  String get libraryTitle => 'المكتبة';

  @override
  String get librarySearchHint => 'العنوان أو المؤلف أو ISBN';

  @override
  String get libraryAll => 'الكل';

  @override
  String libraryAvailable(int count) {
    return '$count على الرف';
  }

  @override
  String get libraryAllOut => 'كل النسخ معارة';

  @override
  String get libraryEbook => 'كتاب إلكتروني';

  @override
  String get libraryNoBooks => 'لم نجد كتبًا';

  @override
  String get libraryNoBooksMessage => 'جرّب عنوانًا أو مؤلفًا أو تصنيفًا آخر.';

  @override
  String get libraryBorrowed => 'الكتب المستعارة';

  @override
  String libraryShelf(String shelf) {
    return 'الرف $shelf';
  }

  @override
  String libraryCopies(int available, int copies) {
    return '$available من $copies على الرف';
  }

  @override
  String get libraryRead => 'اقرأ الكتاب الإلكتروني';

  @override
  String get libraryReserve => 'احجز';

  @override
  String get libraryReserveFor => 'احجزه لـ';

  @override
  String libraryReservedReady(String date) {
    return 'محجوز لك في المكتبة حتى $date.';
  }

  @override
  String get libraryReservedWaiting => 'تم الحجز. سنخبرك حين تُحجز لك نسخة.';

  @override
  String libraryHoldReady(String name, String date) {
    return 'محجوز لـ $name حتى $date';
  }

  @override
  String libraryHoldWaiting(String name) {
    return '$name ينتظر نسخة';
  }

  @override
  String get libraryCancelHold => 'إلغاء الحجز';

  @override
  String get libraryOutNow => 'معارة الآن';

  @override
  String libraryDue(String date) {
    return 'تُعاد $date';
  }

  @override
  String libraryOverdue(String date) {
    return 'متأخر منذ $date';
  }

  @override
  String get libraryReservedSection => 'المحجوزة';

  @override
  String get libraryReturned => 'أُعيدت سابقًا';

  @override
  String libraryReturnedOn(String date) {
    return 'أُعيد $date';
  }

  @override
  String get libraryNoLoans => 'لا كتب مستعارة';

  @override
  String get libraryNoLoansMessage =>
      'تظهر هنا الكتب المعارة من مكتب المكتبة مع مواعيد إعادتها.';

  @override
  String libraryLoanDays(int days) {
    return 'تُعار الكتب $days يومًا.';
  }

  @override
  String get libraryAbout => 'عن الكتاب';

  @override
  String get schoolMessages => 'الرسائل';

  @override
  String get schoolMessagesWithTeachers => 'مع معلميك';

  @override
  String get schoolMessagesWithFamilies => 'مع أسر فصولك';

  @override
  String get schoolMessagesOff =>
      'لم تفعّل مدرستك الرسائل بين المعلمين والأسر.';

  @override
  String get schoolMessagesOffice => 'إدارة المدرسة';

  @override
  String get schoolMessagesOfficeHint => 'راسل المدرسة في أي وقت.';

  @override
  String get schoolMessagesTeachers => 'المعلمون';

  @override
  String get schoolMessagesFamilies => 'أولياء الأمور والطلاب';

  @override
  String schoolMessagesParentOf(String names) {
    return 'ولي أمر $names';
  }

  @override
  String get schoolMessagesClassTeacher => 'معلم الفصل';

  @override
  String get schoolMessagesTeacherFirst =>
      'يبدأ المعلم المراسلة، ويمكنك الرد بعدها.';

  @override
  String schoolMessagesHours(String days, String from, String to) {
    return 'يمكن إرسال الرسائل أيام $days، من $from إلى $to.';
  }

  @override
  String schoolMessagesOpensAt(String when) {
    return 'يمكنك الكتابة مرة أخرى يوم $when.';
  }

  @override
  String get schoolMessagesClosed => 'أغلقت المدرسة هذه المحادثة.';

  @override
  String get schoolMessagesNotAllowed => 'لا تسمح المدرسة بالرسائل هنا الآن.';

  @override
  String get schoolMessagesTextOnly => 'تسمح المدرسة بالرسائل النصية فقط.';

  @override
  String get schoolMessagesAdminReads =>
      'تستطيع إدارة المدرسة قراءة هذه المحادثة.';

  @override
  String get schoolMessagesPrivate =>
      'هذه المحادثة خاصة: لا تقرؤها المدرسة إلا إذا أُبلغ عن رسالة فيها.';

  @override
  String get schoolMessagesNone => 'لا يوجد من تراسله بعد.';

  @override
  String get schoolMessagesWriteClass => 'راسل فصلًا كاملًا';

  @override
  String classMessageTitle(String name) {
    return 'راسل $name';
  }

  @override
  String get classMessageTo => 'أرسل إلى';

  @override
  String get classMessageParents => 'أولياء الأمور';

  @override
  String get classMessageStudents => 'الطلاب';

  @override
  String get classMessageFamilies => 'أولياء الأمور والطلاب';

  @override
  String get classMessageHint =>
      'يتلقاها كل واحد على حدة، وتعود ردودهم إليك وحدك.';

  @override
  String classMessageSent(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'أُرسلت إلى $count أشخاص.',
      one: 'أُرسلت إلى شخص واحد.',
    );
    return '$_temp0';
  }

  @override
  String classMessageNotInApp(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count أشخاص لم يسجلوا الدخول إلى التطبيق بعد.',
      one: 'شخص واحد لم يسجل الدخول إلى التطبيق بعد.',
    );
    return '$_temp0';
  }

  @override
  String get classMessageMissing => 'اكتب الرسالة أولًا.';

  @override
  String get checkinTitle => 'الحضور والانصراف';

  @override
  String get checkinButton => 'تسجيل الحضور';

  @override
  String get checkoutButton => 'تسجيل الانصراف';

  @override
  String get checkinCardTitle => 'اليوم في المدرسة';

  @override
  String get checkinStateNotYet => 'لم يُسجَّل الحضور بعد';

  @override
  String get checkinStateIn => 'تم تسجيل الحضور';

  @override
  String get checkinStateLeft => 'تم تسجيل الانصراف';

  @override
  String get checkinStateAbsent => 'غائب';

  @override
  String get checkinStateExcused => 'بعذر';

  @override
  String get checkinStateLeave => 'في إجازة';

  @override
  String get checkinStateOff => 'ليس يوم دراسة';

  @override
  String checkinInAt(String time) {
    return 'حضور الساعة $time';
  }

  @override
  String checkinOutAt(String time) {
    return 'انصراف الساعة $time';
  }

  @override
  String get checkinLate => 'متأخر';

  @override
  String get checkinLeftEarly => 'انصرف مبكرًا';

  @override
  String checkinTimes(String starts, String ends, String late) {
    return '$starts–$ends · التأخر من $late';
  }

  @override
  String get checkinCodeLabel => 'رمز البوابة';

  @override
  String get checkinCodeHint => 'الأرقام الستة على شاشة المدرسة عند البوابة';

  @override
  String get checkinWithLocation => 'استخدام موقعي';

  @override
  String get checkinBothNote => 'تطلب مدرستك رمز البوابة وموقعك.';

  @override
  String get checkinLocating => 'جارٍ تحديد موقعك…';

  @override
  String get checkinLocationOff => 'شغّل الموقع في هاتفك لتسجيل الحضور.';

  @override
  String get checkinLocationDenied =>
      'اسمح للتطبيق باستخدام موقعك لتسجيل الحضور.';

  @override
  String get checkinLocationFailed => 'تعذّر تحديد موقعك. حاول مرة أخرى.';

  @override
  String checkinDoneOnTime(String time) {
    return 'تم تسجيل الحضور الساعة $time في الموعد.';
  }

  @override
  String checkinDoneLate(String time) {
    return 'تم تسجيل الحضور الساعة $time: متأخر.';
  }

  @override
  String checkinDoneOut(String time) {
    return 'تم تسجيل الانصراف الساعة $time.';
  }

  @override
  String checkinDoneEarly(String time) {
    return 'تم تسجيل الانصراف الساعة $time قبل نهاية اليوم.';
  }

  @override
  String get checkinMonth => 'هذا الشهر';

  @override
  String get checkinCountPresent => 'حضور';

  @override
  String get checkinCountAbsent => 'غياب';

  @override
  String get checkinNoDays => 'لا توجد أيام دراسة في هذا الشهر بعد.';

  @override
  String checkinCorrected(String reason) {
    return 'صحّحته المدرسة: $reason';
  }

  @override
  String get checkinOff => 'لا تستقبل مدرستك تسجيل الحضور في التطبيق.';

  @override
  String get checkinNotSchoolDay => 'اليوم ليس من أيامك الدراسية.';

  @override
  String get checkinAtGate => 'عند البوابة';

  @override
  String get tabStaff => 'الموظفون';

  @override
  String get staffNotStaff => 'لموظفي المدرسة';

  @override
  String get staffNotStaffMessage =>
      'تضيف المدرسة أرقام موظفيها؛ يسجّلون الدخول بها ويظهر عملهم هنا.';

  @override
  String get staffWork => 'عملك';

  @override
  String staffDays(String days) {
    return 'الأيام: $days';
  }

  @override
  String staffHours(String starts, String ends) {
    return 'الساعات: $starts–$ends';
  }

  @override
  String get staffDuties => 'المهام';

  @override
  String get staffLeave => 'طلبات الإجازة';

  @override
  String get staffNews => 'أخبار الموظفين';

  @override
  String get staffNoNews => 'لا توجد أخبار للموظفين بعد.';

  @override
  String get leaveAsk => 'طلب إجازة';

  @override
  String get leaveKind => 'نوع الإجازة';

  @override
  String get leaveSick => 'مرضية';

  @override
  String get leaveAnnual => 'سنوية';

  @override
  String get leaveOther => 'أخرى';

  @override
  String get leaveFirstDay => 'اليوم الأول';

  @override
  String get leaveLastDay => 'اليوم الأخير';

  @override
  String get leaveNote => 'ملاحظة (اختياري)';

  @override
  String get leaveAddPhoto => 'صورة مستند';

  @override
  String get leaveAddFile => 'ملف PDF';

  @override
  String get leaveSend => 'إرسال الطلب';

  @override
  String get leaveSent => 'تم الإرسال. ترد المدرسة في التطبيق.';

  @override
  String get leaveNone => 'لا توجد طلبات إجازة بعد.';

  @override
  String leaveDays(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count يوم',
      many: '$count يومًا',
      few: '$count أيام',
      two: 'يومان',
      one: 'يوم واحد',
    );
    return '$_temp0';
  }

  @override
  String get leavePending => 'بانتظار الرد';

  @override
  String get leaveApproved => 'موافَق عليها';

  @override
  String get leaveRefused => 'غير موافَق عليها';

  @override
  String get leaveCancelled => 'مسحوبة';

  @override
  String get leaveWithdraw => 'سحب';

  @override
  String leaveSchoolNote(String note) {
    return 'المدرسة: $note';
  }

  @override
  String leaveDates(String from, String to) {
    return '$from – $to';
  }

  @override
  String get leaveDatesOrder => 'اليوم الأخير في اليوم الأول أو بعده.';

  @override
  String get classroomSyllabus => 'المنهج';

  @override
  String get syllabusNone => 'لا يوجد منهج لهذا الفصل بعد';

  @override
  String get syllabusNoneMessage =>
      'تكتب المدرسة منهج كل مادة، ويظهر هنا حين تفعل.';

  @override
  String syllabusCovered(int covered, int total, int percent) {
    return 'أُنجز $covered من $total ($percent%)';
  }

  @override
  String syllabusPlanned(int percent) {
    return 'الخطة: $percent% حتى اليوم';
  }

  @override
  String syllabusBehind(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'متأخر عن الخطة بـ $count درس',
      many: 'متأخر عن الخطة بـ $count درسًا',
      few: 'متأخر عن الخطة بـ $count دروس',
      two: 'متأخر عن الخطة بدرسين',
      one: 'متأخر عن الخطة بدرس واحد',
    );
    return '$_temp0';
  }

  @override
  String get syllabusOnPlan => 'وفق الخطة';

  @override
  String get syllabusAhead => 'متقدم على الخطة';

  @override
  String syllabusPlanNow(String topic) {
    return 'الخطة الآن: $topic';
  }

  @override
  String syllabusDays(String from, String to) {
    return '$from – $to';
  }

  @override
  String syllabusCoveredOn(String date) {
    return 'أُنجز في $date';
  }

  @override
  String get syllabusNotCovered => 'لم يُنجز بعد';

  @override
  String get syllabusMarkCovered => 'تعليم كمُنجَز';

  @override
  String get syllabusUnmark => 'غير مُنجَز';

  @override
  String get syllabusCoveredDay => 'أُنجز في';

  @override
  String get syllabusNote => 'ملاحظة (اختيارية)';

  @override
  String get classroomReports => 'التقارير إلى المدرسة';

  @override
  String get classroomReportsHint =>
      'عن طلابك وفصولك: المسودات والمُرسلة والمُعادة والمعتمدة';

  @override
  String get reportsDrafts => 'المسودات';

  @override
  String get reportsSent => 'المُرسلة';

  @override
  String get reportsReturned => 'المُعادة';

  @override
  String get reportsApproved => 'المعتمدة';

  @override
  String get reportsNone => 'لا توجد تقارير هنا';

  @override
  String get reportsWrite => 'كتابة تقرير';

  @override
  String get reportsTemplate => 'النموذج';

  @override
  String get reportsNoTemplates => 'لم تُعدّ المدرسة نماذج تقاريرها بعد.';

  @override
  String get reportsClass => 'الفصل';

  @override
  String get reportsStudent => 'الطالب';

  @override
  String get reportsSubject => 'المادة (اختيارية)';

  @override
  String get reportsNoSubject => 'بلا مادة';

  @override
  String get reportsStart => 'بدء التقرير';

  @override
  String get reportsChooseMissing =>
      'اختر نموذجًا وفصلًا، والطالب إن كان التقرير عن طالب.';

  @override
  String get reportsSaveDraft => 'حفظ المسودة';

  @override
  String get reportsSend => 'الإرسال إلى المدرسة';

  @override
  String get reportsNoteForSchool => 'ملاحظة للمدرسة (اختيارية)';

  @override
  String get reportsDraftSaved => 'حُفظت المسودة.';

  @override
  String get reportsSentDone => 'أُرسل إلى المدرسة.';

  @override
  String get reportsDelete => 'حذف المسودة';

  @override
  String get reportsDeleteConfirm => 'حذف هذه المسودة؟';

  @override
  String get reportsDeleted => 'حُذفت المسودة.';

  @override
  String get reportsRead => 'قرأته المدرسة';

  @override
  String get reportsNotRead => 'لم يُقرأ بعد';

  @override
  String get reportsShared => 'تمت مشاركته مع أولياء الأمور';

  @override
  String get reportsFromSchool => 'المدرسة';

  @override
  String get reportsFromYou => 'أنت';

  @override
  String get reportsComments => 'التعليقات';

  @override
  String get reportsLocked =>
      'هذا التقرير لدى المدرسة. يمكنك تعديله إن أعادته إليك.';

  @override
  String get reportsReturnedBanner =>
      'أعادت المدرسة هذا التقرير للتعديل: اقرأ تعليقها، وعدّل التقرير وأرسله من جديد.';

  @override
  String reportsRatingOf(int value) {
    return '$value من 5';
  }

  @override
  String reportsPeriod(String from, String to) {
    return '$from – $to';
  }

  @override
  String reportsRequiredMissing(String label) {
    return 'املأ «$label» قبل الإرسال.';
  }

  @override
  String get schoolReports => 'تقارير المعلمين';

  @override
  String get schoolReportsNone => 'لم تُشارَك أي تقارير بعد';

  @override
  String get schoolReportsNoneMessage =>
      'حين تشارك المدرسة تقرير معلم عن طفلك، يظهر هنا.';

  @override
  String schoolReportsBy(String name) {
    return 'بقلم $name';
  }

  @override
  String get schoolReportsParentsOnly =>
      'تشارك المدرسة هذه التقارير مع أولياء أمور الطالب.';

  @override
  String get syllabusSaved => 'تم الحفظ.';

  @override
  String get bundles => 'الحزم';

  @override
  String bundleCourseCount(int count) {
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
  String bundleInsteadOf(String price) {
    return 'بدلًا من $price';
  }

  @override
  String get bundlePrice => 'سعر الحزمة';

  @override
  String get bundleBuy => 'شراء الحزمة';

  @override
  String get bundleCoursesIn => 'الدورات في هذه الحزمة';

  @override
  String bundleOwnedSome(int count) {
    return 'لديك $count من هذه الدورات بالفعل: تبقى لك، وتضيف الحزمة الباقي.';
  }

  @override
  String get bundleOwned => 'كل دورات هذه الحزمة لك.';

  @override
  String get bundleEnrolled => 'أنت مسجّل في كل دورات الحزمة. تعلّمًا ممتعًا!';

  @override
  String get bundleMyCourses => 'الذهاب إلى دوراتي';

  @override
  String get bundleAlsoIn => 'موجودة أيضًا في حزمة';

  @override
  String get bundleNotSold => 'لا يمكن شراء هذه الحزمة في التطبيق.';

  @override
  String get loadingBundle => 'جارٍ تحميل الحزمة…';

  @override
  String get couponFree => 'القسيمة تجعلها مجانية: لن تدفع شيئًا.';

  @override
  String get couponEnrollFree => 'التسجيل مجانًا';

  @override
  String get attemptAwaitingResults => 'النتيجة بعد إغلاق الامتحان';

  @override
  String get learningPaths => 'المسارات التعليمية';

  @override
  String get noLearningPaths => 'لا توجد مسارات تعليمية بعد';

  @override
  String pathProgress(int done, int total) {
    return 'أتممت $done من $total دورات';
  }

  @override
  String get pathInOrder => 'ادرس هذه الدورات بالترتيب';

  @override
  String get pathLocked => 'تُفتح بعد الدورة التي قبلها';

  @override
  String get courseDoneLabel => 'مكتملة';

  @override
  String get prerequisitesTitle => 'أتمم هذه الدورات أولًا';

  @override
  String get prerequisitesHint => 'يمكنك التسجيل بعد أن تُتمّها.';

  @override
  String finalScore(int score) {
    return 'الدرجة النهائية: $score%';
  }

  @override
  String finalScoreNeeded(int score, int min) {
    return 'الدرجة النهائية: $score% · يلزم $min% لإتمامها';
  }

  @override
  String get achievementsTitle => 'النقاط والشارات';

  @override
  String pointsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count نقطة',
      many: '$count نقطة',
      few: '$count نقاط',
      two: 'نقطتان',
      one: 'نقطة واحدة',
      zero: 'لا نقاط',
    );
    return '$_temp0';
  }

  @override
  String streakDays(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'تتابع $count يوم',
      many: 'تتابع $count يومًا',
      few: 'تتابع $count أيام',
      two: 'تتابع يومين',
      one: 'تتابع يوم واحد',
      zero: 'لا تتابع',
    );
    return '$_temp0';
  }

  @override
  String bestStreak(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'أطول تتابع: $count يوم',
      many: 'أطول تتابع: $count يومًا',
      few: 'أطول تتابع: $count أيام',
      two: 'أطول تتابع: يومان',
      one: 'أطول تتابع: يوم واحد',
      zero: 'أطول تتابع: لا شيء',
    );
    return '$_temp0';
  }

  @override
  String get badgesTitle => 'الشارات';

  @override
  String get badgeNotYet => 'ليس بعد';

  @override
  String get badgeFirstLesson => 'الدرس الأول';

  @override
  String get badgeFirstQuiz => 'أول اختبار ناجح';

  @override
  String get badgePerfectQuiz => 'اختبار بالدرجة الكاملة';

  @override
  String get badgeFirstAssignment => 'الواجب الأول';

  @override
  String get badgeStreak7 => 'تتابع 7 أيام';

  @override
  String get badgeCourseCompleted => 'إتمام دورة';

  @override
  String get badgePathCompleted => 'إتمام مسار';

  @override
  String get badgePoints500 => '500 نقطة';

  @override
  String get leaderboardTitle => 'لوحة المتصدرين';

  @override
  String get leaderboardCourse => 'الدورة';

  @override
  String get leaderboardCohort => 'مجموعتي';

  @override
  String leaderboardRank(int rank, int total) {
    return 'ترتيبك $rank من $total';
  }

  @override
  String get leaderboardEmpty => 'لا أحد في لوحة المتصدرين بعد';

  @override
  String get leaderboardPrivacy =>
      'تظهر الأسماء الأولى والحرف الأول من اسم العائلة فقط.';

  @override
  String get leaderboardYou => 'أنت';

  @override
  String get myNotes => 'ملاحظاتي';

  @override
  String get notesTitle => 'الملاحظات';

  @override
  String get notesPrivate => 'لا يرى ملاحظاتك أحد غيرك.';

  @override
  String get noNotes => 'لا ملاحظات بعد';

  @override
  String get noteHint => 'اكتب ملاحظة لنفسك';

  @override
  String get addNote => 'إضافة ملاحظة';

  @override
  String noteAt(String time) {
    return 'عند $time';
  }

  @override
  String get editNote => 'تعديل الملاحظة';

  @override
  String get deleteNote => 'حذف الملاحظة';

  @override
  String get bookmarkLesson => 'إشارة مرجعية';

  @override
  String get removeBookmark => 'إزالة الإشارة المرجعية';

  @override
  String get bookmarksTitle => 'الإشارات المرجعية';

  @override
  String get lessonDiscussion => 'النقاش';

  @override
  String discussionCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count سؤال',
      many: '$count سؤالًا',
      few: '$count أسئلة',
      two: 'سؤالان',
      one: 'سؤال واحد',
      zero: 'لا أسئلة بعد',
    );
    return '$_temp0';
  }

  @override
  String get askAboutLesson => 'اسأل عن هذا الدرس';

  @override
  String get pinnedLabel => 'مثبّت';

  @override
  String get pinQuestion => 'تثبيت';

  @override
  String get unpinQuestion => 'إلغاء التثبيت';

  @override
  String get deleteQuestion => 'حذف السؤال';

  @override
  String get deleteAnswer => 'حذف الإجابة';

  @override
  String get deleteConfirm => 'هل تريد حذفه؟ لا يمكن التراجع عن ذلك.';

  @override
  String get examLabel => 'امتحان';

  @override
  String examOpensAt(String time) {
    return 'يُفتح $time';
  }

  @override
  String examClosesAt(String time) {
    return 'يُغلق $time';
  }

  @override
  String get examNotOpen => 'لم يُفتح هذا الامتحان بعد';

  @override
  String get examClosed => 'أُغلق هذا الامتحان';

  @override
  String get examResume => 'العودة إلى الامتحان';

  @override
  String examResultsAt(String time) {
    return 'تظهر نتيجتك في $time';
  }

  @override
  String get examTimeUp => 'انتهى الوقت: وصلت إجاباتك متأخرة.';

  @override
  String get examTimedHint => 'يستمر الوقت حتى إن خرجت من التطبيق.';

  @override
  String get rubricTitle => 'معايير التقييم';

  @override
  String rubricPoints(int points, int max) {
    return '$points من $max';
  }

  @override
  String rubricLevelPoints(String level, int points) {
    return '$level · $points';
  }

  @override
  String get rubricChooseAll => 'اختر مستوى لكل معيار';

  @override
  String rubricTotal(int score, int max) {
    return 'الدرجة: $score من $max';
  }

  @override
  String tryOf(int attempt, int total) {
    return 'المحاولة $attempt من $total';
  }

  @override
  String triesLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'يمكنك تسليمه $count مرة أخرى.',
      many: 'يمكنك تسليمه $count مرة أخرى.',
      few: 'يمكنك تسليمه $count مرات أخرى.',
      two: 'يمكنك تسليمه مرتين أخريين.',
      one: 'يمكنك تسليمه مرة أخرى.',
    );
    return '$_temp0';
  }

  @override
  String get handInAgain => 'التسليم مرة أخرى';

  @override
  String get tabParent => 'ولي الأمر';

  @override
  String get parentNotParentTitle => 'لأولياء أمور المدرسة';

  @override
  String get parentNotParentMessage =>
      'لم تُضف المدرسة هذا الرقم وليَّ أمر. اطلب من المدرسة ربطه بأبنائك.';

  @override
  String get parentChildrenTitle => 'أبناؤك في تبويب ولي الأمر';

  @override
  String get parentChildrenMessage =>
      'يوم كل طالب، والأذونات التي تحتاج توقيعك، وأعذار الغياب، ومن يستلمه.';

  @override
  String get parentOpen => 'فتح تبويب ولي الأمر';

  @override
  String parentDayOff(String title) {
    return 'لا دراسة اليوم: $title';
  }

  @override
  String parentPicksUpToday(String name) {
    return 'يستلمه اليوم: $name';
  }

  @override
  String get parentAtTheGate => 'عند البوابة';

  @override
  String parentHomeworkDue(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count واجب مستحق',
      many: '$count واجبًا مستحقًا',
      few: '$count واجبات مستحقة',
      two: 'واجبان مستحقان',
      one: 'واجب واحد مستحق',
      zero: 'لا واجبات مستحقة',
    );
    return '$_temp0';
  }

  @override
  String get parentLatestGrades => 'آخر الدرجات';

  @override
  String parentBehaviourPoints(int points) {
    return '$points نقطة';
  }

  @override
  String get parentLibraryBooks => 'كتب المكتبة';

  @override
  String parentBookDue(String date) {
    return 'يُعاد $date';
  }

  @override
  String parentBookOverdue(String date) {
    return 'متأخر منذ $date';
  }

  @override
  String get parentBusOnTheWay => 'الحافلة في الطريق';

  @override
  String get parentComing => 'قريبًا';

  @override
  String parentEverything(String name) {
    return 'كل ما يخص $name';
  }

  @override
  String get parentSlips => 'أذونات الموافقة';

  @override
  String parentSlipsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count إذن للتوقيع',
      many: '$count إذنًا للتوقيع',
      few: '$count أذونات للتوقيع',
      two: 'إذنان للتوقيع',
      one: 'إذن واحد للتوقيع',
      zero: 'لا شيء للتوقيع',
    );
    return '$_temp0';
  }

  @override
  String get parentExcuses => 'أعذار الغياب';

  @override
  String get parentExcusesSubtitle => 'ليوم أو أكثر، مع السبب';

  @override
  String get parentPickup => 'من يستلم الطالب';

  @override
  String parentPickupPeople(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count شخص',
      many: '$count شخصًا',
      few: '$count أشخاص',
      two: 'شخصان',
      one: 'شخص واحد',
      zero: 'لا أحد في القائمة بعد',
    );
    return '$_temp0';
  }

  @override
  String parentReportsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count تقرير',
      many: '$count تقريرًا',
      few: '$count تقارير',
      two: 'تقريران',
      one: 'تقرير واحد',
      zero: 'لم يُشارك شيء بعد',
    );
    return '$_temp0';
  }

  @override
  String slipDue(String date) {
    return 'أجب قبل $date';
  }

  @override
  String get slipClosed => 'مغلق';

  @override
  String slipFee(String note) {
    return 'الرسوم: $note';
  }

  @override
  String get slipYes => 'نعم، أوافق';

  @override
  String get slipNo => 'لا';

  @override
  String slipSignedYes(String name) {
    return 'وقّع بنعم: $name';
  }

  @override
  String slipSignedNo(String name) {
    return 'رفض: $name';
  }

  @override
  String get slipNotAnswered => 'لم يُجب';

  @override
  String slipAgree(String child, String title) {
    return 'أوافق على مشاركة $child: $title.';
  }

  @override
  String slipDecline(String child, String title) {
    return 'لن يشارك $child: $title.';
  }

  @override
  String get slipYourName => 'اسمك';

  @override
  String get slipSign => 'توقيع';

  @override
  String get slipSigned => 'تم التوقيع. ترى المدرسة إجابتك.';

  @override
  String get slipsNone => 'لا أذونات موافقة.';

  @override
  String get slipNameNeeded => 'وقّع باسمك.';

  @override
  String get excuseNew => 'تقديم عذر غياب';

  @override
  String get excuseFirstDay => 'اليوم الأول';

  @override
  String get excuseLastDay => 'اليوم الأخير';

  @override
  String get excuseReason => 'السبب';

  @override
  String get excuseAddPhoto => 'صورة شهادة';

  @override
  String get excuseAddFile => 'ملف PDF';

  @override
  String get excuseSend => 'إرسال إلى المدرسة';

  @override
  String get excuseSent => 'تم الإرسال. ستردّ المدرسة في التطبيق.';

  @override
  String get excuseReasonNeeded => 'اكتب السبب.';

  @override
  String get excusePending => 'بانتظار الرد';

  @override
  String get excuseAccepted => 'بعذر';

  @override
  String get excuseDeclined => 'لم يُقبل';

  @override
  String get excuseWithdrawn => 'مسحوب';

  @override
  String get excuseWithdraw => 'سحب';

  @override
  String get excusesNone => 'لم تُرسل أعذار.';

  @override
  String excuseSchoolNote(String note) {
    return 'المدرسة: $note';
  }

  @override
  String pickupIntro(String name) {
    return 'من يُسمح له باستلام $name من المدرسة. ترى المدرسة هذه القائمة عند البوابة.';
  }

  @override
  String get pickupNone => 'لا أحد في القائمة بعد.';

  @override
  String get pickupAdd => 'إضافة شخص';

  @override
  String get pickupName => 'الاسم';

  @override
  String get pickupRelation => 'صلة القرابة';

  @override
  String get pickupPhone => 'الهاتف';

  @override
  String get pickupPhoto => 'إضافة صورة';

  @override
  String get pickupRemove => 'حذف';

  @override
  String get pickupSaved => 'تم الحفظ. ترى المدرسة القائمة.';

  @override
  String get pickupNameNeeded => 'اكتب الاسم.';

  @override
  String get pickupOneDay => 'ليوم واحد فقط';

  @override
  String get pickupOneDayIntro =>
      'سيستلمه شخص آخر في يوم ما؟ أخبر المدرسة: تراه في لوحة ذلك اليوم.';

  @override
  String get pickupDay => 'اليوم';

  @override
  String get pickupNote => 'ملاحظة للمدرسة';

  @override
  String get pickupTell => 'إبلاغ المدرسة';

  @override
  String get pickupTold => 'تراه المدرسة في لوحة ذلك اليوم.';

  @override
  String pickupNoteLine(String date, String name) {
    return '$date: $name';
  }

  @override
  String get pickupTakeBack => 'تراجع';

  @override
  String get staffPayslips => 'قسائم راتبي';

  @override
  String get payslipsNone =>
      'لا قسائم بعد. تظهر هنا حين تعتمدها المدرسة نهائيًا.';

  @override
  String get payslipsByHand =>
      'تسجّل المدرسة الرواتب يدويًا: تدفع نقدًا أو بتحويل بنكي وتسجّل ذلك هنا.';

  @override
  String get payslipUnpaid => 'لم تُدفع بعد';

  @override
  String get payslipPartPaid => 'مدفوعة جزئيًا';

  @override
  String get payslipPaid => 'مدفوعة';

  @override
  String payslipNetLine(String amount) {
    return 'الصافي $amount';
  }

  @override
  String get payslipBase => 'الراتب الأساسي';

  @override
  String get payslipBonus => 'مكافأة';

  @override
  String get payslipDeduction => 'خصم';

  @override
  String payslipAbsences(int count) {
    return 'الغياب ($count)';
  }

  @override
  String payslipLateness(int count) {
    return 'التأخير ($count)';
  }

  @override
  String get payslipAdvance => 'قسط سلفة';

  @override
  String get payslipGross => 'الإجمالي';

  @override
  String get payslipDeductions => 'الخصومات';

  @override
  String get payslipNet => 'صافي الراتب';

  @override
  String get payslipPaidSoFar => 'المدفوع';

  @override
  String get payslipLeft => 'المتبقي';

  @override
  String get payslipPayments => 'الدفعات';

  @override
  String payslipCash(String date) {
    return 'نقدًا، $date';
  }

  @override
  String payslipBank(String date) {
    return 'تحويل بنكي، $date';
  }

  @override
  String payslipDays(
    int working,
    int present,
    int absent,
    int late,
    int leave,
  ) {
    return '$working يوم عمل · $present حضور · $absent غياب · $late تأخير · $leave إجازة';
  }

  @override
  String get payslipViewPdf => 'عرض ملف PDF';

  @override
  String get payslipDownloadPdf => 'تنزيل ملف PDF';

  @override
  String get payslipAdvances => 'السُّلف';

  @override
  String payslipAdvanceLine(
    String amount,
    String date,
    String instalment,
    String left,
  ) {
    return '$amount في $date · $instalment شهريًا · المتبقي $left';
  }

  @override
  String get uniRegister => 'التسجيل للفصل';

  @override
  String get uniTimetable => 'جدولي';

  @override
  String get uniResults => 'النتائج';

  @override
  String get uniTranscript => 'السجل الأكاديمي';

  @override
  String get uniStudyPlan => 'الخطة الدراسية';

  @override
  String get uniGpa => 'المعدل';

  @override
  String uniCreditsOf(String earned, String required) {
    return '$earned من $required ساعة';
  }

  @override
  String uniCredits(String credits) {
    return '$credits ساعة';
  }

  @override
  String uniAdvisor(String name) {
    return 'المرشد: $name';
  }

  @override
  String get uniNoProgram => 'لا يوجد برنامج بعد: تضيفه الجامعة.';

  @override
  String get uniStatusDraft => 'لم يُرسل';

  @override
  String get uniStatusSubmitted => 'لدى مرشدك';

  @override
  String get uniStatusApproved => 'تمت الموافقة';

  @override
  String get uniStatusReturned => 'أُعيد إليك';

  @override
  String uniPhaseBefore(String date) {
    return 'يبدأ التسجيل في $date';
  }

  @override
  String uniPhaseOpen(String date) {
    return 'التسجيل مفتوح حتى $date';
  }

  @override
  String uniPhaseDrop(String date) {
    return 'يمكنك حذف مقرر حتى $date';
  }

  @override
  String get uniPhaseClosed => 'انتهى التسجيل لهذا الفصل';

  @override
  String uniCreditsRange(String taken, String min, String max) {
    return '$taken ساعة · من $min إلى $max في الفصل';
  }

  @override
  String get uniMySections => 'شُعبي';

  @override
  String get uniOffered => 'الشُّعب المتاحة';

  @override
  String get uniAdd => 'إضافة';

  @override
  String get uniJoinWaitlist => 'الانضمام إلى قائمة الانتظار';

  @override
  String get uniDrop => 'حذف';

  @override
  String uniDropConfirm(String course) {
    return 'حذف $course؟';
  }

  @override
  String uniSeatsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مقعد متبقٍّ',
      many: '$count مقعدًا متبقيًا',
      few: '$count مقاعد متبقية',
      two: 'مقعدان متبقيان',
      one: 'مقعد واحد متبقٍّ',
      zero: 'ممتلئة',
    );
    return '$_temp0';
  }

  @override
  String get uniEnrolPending => 'بانتظار الموافقة';

  @override
  String get uniEnrolEnrolled => 'مسجّل';

  @override
  String get uniEnrolWaitlisted => 'قائمة الانتظار';

  @override
  String get uniSubmit => 'إرسال إلى مرشدي';

  @override
  String get uniSubmitted => 'أُرسل إلى مرشدك.';

  @override
  String uniAdvisorNote(String note) {
    return 'مرشدك: $note';
  }

  @override
  String get uniReadOnly => 'الطالب وحده يعدّل التسجيل.';

  @override
  String get uniNoSections => 'لا توجد شُعب في هذا الفصل بعد.';

  @override
  String get uniNoLectures => 'لا توجد محاضرات في هذا الفصل.';

  @override
  String get uniNoLecturesToday => 'لا توجد محاضرات اليوم.';

  @override
  String uniTermGpa(String gpa) {
    return 'المعدل الفصلي $gpa';
  }

  @override
  String get uniCumulative => 'المعدل التراكمي';

  @override
  String get uniNoResults => 'لا توجد نتائج بعد.';

  @override
  String get uniOpenPdf => 'فتح ملف PDF';

  @override
  String get uniPlanDone => 'منجز';

  @override
  String get uniPlanInProgress => 'جارٍ';

  @override
  String get uniPlanLeft => 'متبقٍّ';

  @override
  String uniPlanCredits(
    String done,
    String inProgress,
    String left,
    String required,
  ) {
    return '$done منجزة · $inProgress جارية · $left متبقية من $required ساعة';
  }

  @override
  String uniYear(int year) {
    return 'السنة $year';
  }

  @override
  String get uniElective => 'اختياري';

  @override
  String uniStudents(int count) {
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
  String get uniAdvisees => 'طلابي في الإرشاد';

  @override
  String uniAdviseesWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count تسجيل بانتظارك',
      many: '$count تسجيلًا بانتظارك',
      few: '$count تسجيلات بانتظارك',
      two: 'تسجيلان بانتظارك',
      one: 'تسجيل واحد بانتظارك',
      zero: 'لا شيء بانتظارك',
    );
    return '$_temp0';
  }

  @override
  String get uniNoTeaching =>
      'لا شُعب في هذا الفصل: تضيفك الجامعة محاضرًا لها.';

  @override
  String get uniPublished => 'نُشرت النتائج';

  @override
  String get uniPublish => 'نشر النتائج';

  @override
  String get uniPublishConfirm =>
      'يرى الطلاب وأولياء أمورهم تقديراتهم ويُبلَّغون.';

  @override
  String get uniSaveGrades => 'حفظ الدرجات';

  @override
  String get uniGradesSaved => 'تم حفظ الدرجات.';

  @override
  String get uniResultsPublished => 'تم النشر. أُبلغ الطلاب.';

  @override
  String get uniMark => 'الدرجة (%)';

  @override
  String get uniGrade => 'التقدير';

  @override
  String get uniNoGrade => 'بلا تقدير';

  @override
  String get uniApprove => 'موافقة';

  @override
  String get uniSendBack => 'إعادة إلى الطالب';

  @override
  String get uniNoteHint => 'ملاحظة للطالب (اختياري)';

  @override
  String get uniApproved => 'تمت الموافقة. أُبلغ الطالب.';

  @override
  String get uniSentBack => 'أُعيد. أُبلغ الطالب.';

  @override
  String get uniNoAdvisees => 'لا يوجد طلاب لإرشادهم في هذا الفصل.';

  @override
  String get uniAttendanceSaved => 'تم حفظ الحضور.';

  @override
  String get hubSignInIntro =>
      'سجّل الدخول برقم الجوال أو البريد الإلكتروني الذي أضافته الشركة التي توصّل لها.';

  @override
  String get hubCompaniesTitle => 'شركاتك';

  @override
  String get hubCompaniesIntro => 'اختر الشركة التي توصّل لها الآن.';

  @override
  String get hubNoCompaniesTitle => 'لا توجد شركات بعد';

  @override
  String get hubNoCompaniesMessage =>
      'لم تُضِف أي شركة رقمك أو بريدك الإلكتروني مندوبًا على Yallapp Courier بعد. اطلب من الشركة التي توصّل لها إضافته، ثم تحقّق مرة أخرى.';

  @override
  String get hubCheckAgain => 'تحقّق مرة أخرى';

  @override
  String hubJobsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مهمة في الانتظار',
      many: '$count مهمة في الانتظار',
      few: '$count مهام في الانتظار',
      two: 'مهمتان في الانتظار',
      one: 'مهمة واحدة في الانتظار',
      zero: 'لا مهام في الانتظار',
    );
    return '$_temp0';
  }

  @override
  String get hubOffDuty => 'خارج الخدمة';

  @override
  String get hubPaused => 'أوقفتك الشركة مؤقتًا';

  @override
  String hubPausedMessage(String company) {
    return 'أوقفتك $company مؤقتًا بصفتك مندوبًا. اطلب منها إعادة تفعيلك.';
  }

  @override
  String hubCompanyGone(String company) {
    return 'لم تعد $company من شركاتك.';
  }

  @override
  String hubSessionEnded(String company) {
    return 'انتهت جلستك في $company. افتحها مرة أخرى من القائمة.';
  }

  @override
  String get hubCompanyGroup => 'الشركة';

  @override
  String get hubSwitchCompany => 'تبديل الشركة';

  @override
  String get hubSignOutMessage =>
      'سيُسجَّل خروجك من Yallapp Courier ومن كل الشركات على هذا الهاتف.';

  @override
  String hubOpening(String company) {
    return 'جارٍ فتح $company…';
  }

  @override
  String get hubDeleteAccount => 'حذف حسابي في Yallapp Courier';

  @override
  String get hubDeleteAccountTitle => 'حذف حسابك في Yallapp Courier؟';

  @override
  String get hubDeleteAccountMessage =>
      'سيُسجَّل خروجك على كل الهواتف وستنتهي جلساتك في كل الشركات. تحتفظ كل شركة بسجلاتها الخاصة عن توصيلاتك، فاطلب من الشركة إزالتك لديها.';

  @override
  String get marketDeliverTo => 'التوصيل إلى';

  @override
  String get marketSearchHint => 'مطاعم أو أطباق أو بقالة';

  @override
  String marketEta(int min, int max) {
    return '$min–$max د';
  }

  @override
  String get marketFreeDelivery => 'توصيل مجاني';

  @override
  String marketDeliveryFee(String fee) {
    return 'توصيل $fee';
  }

  @override
  String get marketOutsideArea => 'خارج نطاق التوصيل';

  @override
  String get marketOutsideAreaBanner => 'هذا المكان لا يوصّل إلى عنوانك.';

  @override
  String get marketOutsideAreaMessage =>
      'هذا المكان لا يوصّل إلى عنوانك. اختر عنوانًا آخر، أو استلم الطلب بنفسك إن كان المكان يتيح ذلك.';

  @override
  String marketMinOrder(String amount) {
    return 'الحد الأدنى $amount';
  }

  @override
  String get marketClub => 'النادي';

  @override
  String get marketClubFree => 'مجاني مع النادي';

  @override
  String get marketJoinClub => 'انضم';

  @override
  String get marketClubMember => 'أنت عضو';

  @override
  String get marketBusy => 'مشغول';

  @override
  String marketClosedOpens(String time) {
    return 'مغلق · يفتح $time';
  }

  @override
  String get marketClosed => 'مغلق';

  @override
  String get marketOwnDelivery => 'توصيل المطعم';

  @override
  String get marketLiveTracking => 'تتبع مباشر';

  @override
  String get marketSeeAll => 'عرض الكل';

  @override
  String get marketOrderAgain => 'اطلب مرة أخرى';

  @override
  String marketCode(String code) {
    return 'الكود $code';
  }

  @override
  String get marketAdd => 'أضف';

  @override
  String get marketPerKg => '/ كجم';

  @override
  String get marketSoldOut => 'نفد';

  @override
  String marketKm(String km) {
    return '$km كم';
  }

  @override
  String marketSearchVendor(String name) {
    return 'ابحث في $name';
  }

  @override
  String get marketViewBasket => 'عرض السلة';

  @override
  String marketBasketItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count منتج',
      few: '$count منتجات',
      two: 'منتجان',
      one: 'منتج واحد',
    );
    return '$_temp0';
  }

  @override
  String get marketSupportNote =>
      'عندك سؤال عن طلب؟ فريق الدعم يرد عليك داخل التطبيق في أي وقت.';

  @override
  String get marketChoices => 'اختيارات';

  @override
  String marketRatingsCount(String count) {
    return '($count)';
  }

  @override
  String get marketAisles => 'الأقسام';

  @override
  String get marketMenu => 'القائمة';

  @override
  String get marketReviews => 'التقييمات';

  @override
  String get marketInfo => 'معلومات';

  @override
  String marketHours(String hours) {
    String _temp0 = intl.Intl.selectLogic(hours, {
      'allDay': 'مفتوح 24 ساعة',
      'other': 'يفتح $hours',
    });
    return '$_temp0';
  }

  @override
  String get marketNew => 'جديد';

  @override
  String get marketChooseAddress => 'اختر عنوانك';

  @override
  String get marketPerGram => '/ جم';

  @override
  String get marketPerLitre => '/ لتر';

  @override
  String get marketKindRestaurant => 'الطعام';

  @override
  String get marketKindGrocery => 'الماركت';

  @override
  String get marketKindShop => 'المتاجر';

  @override
  String marketPlaces(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مكانًا',
      few: '$count أماكن',
      two: 'مكانان',
      one: 'مكان واحد',
      zero: 'لا أماكن',
    );
    return '$_temp0';
  }

  @override
  String get marketNewBasketTitle => 'هل تبدأ سلة جديدة؟';

  @override
  String marketNewBasketMessage(String vendor) {
    return 'في سلتك أصناف من $vendor. الطلب يكون من مكان واحد، لذا ستُحذف.';
  }

  @override
  String get marketNewBasketConfirm => 'سلة جديدة';

  @override
  String get marketCheckoutTitle => 'سلتك';

  @override
  String get marketEmptyBasketTitle => 'سلتك فارغة';

  @override
  String get marketEmptyBasketMessage =>
      'أضف أطباقًا أو منتجات من مطعم أو متجر.';

  @override
  String get marketBrowse => 'تصفّح';

  @override
  String get marketDelivery => 'توصيل';

  @override
  String get marketPickup => 'استلام';

  @override
  String get marketDeliverHere => 'التوصيل إلى';

  @override
  String get marketUseMyLocation => 'استخدم موقعي';

  @override
  String get marketAddressDetails => 'المبنى والطابق والشقة وعلامة مميزة';

  @override
  String get marketNeedAddress => 'اختر مكان التوصيل أولًا.';

  @override
  String get marketWhen => 'الموعد';

  @override
  String get marketNow => 'في أقرب وقت';

  @override
  String get marketLater => 'جدولة';

  @override
  String marketScheduledFor(String time) {
    return 'في $time';
  }

  @override
  String get marketCoupon => 'رمز القسيمة';

  @override
  String get marketApply => 'تطبيق';

  @override
  String get marketUseWallet => 'استخدم رصيد محفظتي';

  @override
  String get marketPayWith => 'الدفع بواسطة';

  @override
  String get marketPayCash => 'الدفع عند الاستلام';

  @override
  String get marketPayCard => 'بطاقة';

  @override
  String get marketPayApplePay => 'Apple Pay';

  @override
  String get marketPayGooglePay => 'Google Pay';

  @override
  String get marketPayWallet => 'المحفظة';

  @override
  String get marketNotes => 'ملاحظة للمطعم أو المتجر';

  @override
  String get marketIfMissing => 'إذا لم يتوفر';

  @override
  String get marketIfMissingSimilar => 'استبدله بمنتج مشابه';

  @override
  String get marketIfMissingRemove => 'احذفه';

  @override
  String marketPlaceOrder(String total) {
    return 'اطلب · $total';
  }

  @override
  String get marketPricing => 'جارٍ حساب الإجمالي…';

  @override
  String get marketOrderSent => 'تم إرسال طلبك.';

  @override
  String get marketOrderPaid => 'تم الدفع. طلبك في طريقه إلى المطعم أو المتجر.';

  @override
  String marketOrderTitle(String reference) {
    return 'الطلب $reference';
  }

  @override
  String get marketStatusAwaitingPayment => 'بانتظار الدفع';

  @override
  String get marketStatusScheduled => 'مجدول';

  @override
  String get marketStatusPlaced => 'أُرسل إلى المطعم أو المتجر';

  @override
  String get marketStatusAccepted => 'قيد التحضير';

  @override
  String get marketStatusPicking => 'قيد التجهيز';

  @override
  String get marketStatusReady => 'جاهز';

  @override
  String get marketStatusOnTheWay => 'في الطريق';

  @override
  String get marketStatusDelivered => 'تم التوصيل';

  @override
  String get marketStatusPickedUp => 'تم الاستلام';

  @override
  String get marketStatusRejected => 'مرفوض';

  @override
  String get marketStatusCancelled => 'ملغى';

  @override
  String marketPickupCode(String code) {
    return 'رمز الاستلام: $code';
  }

  @override
  String get marketCancelOrder => 'إلغاء الطلب';

  @override
  String get marketPayAgain => 'ادفع الآن';

  @override
  String get marketMyOrders => 'طلباتي';

  @override
  String get marketNoOrders => 'لا توجد طلبات بعد';

  @override
  String marketTrackingCourier(String name) {
    return '$name في الطريق بطلبك';
  }

  @override
  String marketTrackingUpdated(String time) {
    return 'آخر تحديث $time';
  }

  @override
  String get marketVendorDelivers =>
      'يوصّل المطعم أو المتجر هذا الطلب بنفسه. ستظهر لك كل خطوة هنا.';

  @override
  String marketArrivesAt(String time) {
    return 'يصل نحو $time';
  }

  @override
  String marketReadyAt(String time) {
    return 'يكون جاهزًا نحو $time';
  }

  @override
  String get marketReportProblem => 'الإبلاغ عن مشكلة';

  @override
  String get marketViewComplaint => 'شكواك';

  @override
  String get marketComplaintWindow =>
      'يمكنك الإبلاغ عن مشكلة حتى 48 ساعة بعد وصول الطلب. يرد عليك فريق الدعم هنا في التطبيق.';

  @override
  String marketComplaintTitle(String reference) {
    return 'الشكوى $reference';
  }

  @override
  String get marketWhatHappened => 'ماذا حدث؟';

  @override
  String get marketReasonLate => 'وصل متأخرًا';

  @override
  String get marketReasonMissingItems => 'أصناف ناقصة';

  @override
  String get marketReasonWrongItems => 'أصناف خاطئة';

  @override
  String get marketReasonQuality => 'الجودة غير مناسبة';

  @override
  String get marketReasonDamaged => 'وصل تالفًا';

  @override
  String get marketReasonNotDelivered => 'لم يصل';

  @override
  String get marketReasonChargedWrong => 'تم خصم مبلغ خاطئ';

  @override
  String get marketReasonCourier => 'بخصوص المندوب';

  @override
  String get marketReasonOther => 'شيء آخر';

  @override
  String get marketWhichItems => 'أي الأصناف؟';

  @override
  String get marketTellUs => 'أخبرنا بما حدث';

  @override
  String get marketTellUsMore => 'اكتب بضع كلمات على الأقل.';

  @override
  String marketComplaintPhotos(int count) {
    return 'الصور ($count من 5)';
  }

  @override
  String get marketAddPhoto => 'أضف صورة';

  @override
  String get marketPhotoType => 'اختر صورة JPEG أو PNG أو WebP حتى 8 ميجابايت.';

  @override
  String get marketSendComplaint => 'أرسل إلى الدعم';

  @override
  String get marketComplaintSent => 'تم الإرسال. سيرد فريق الدعم هنا.';

  @override
  String get marketComplaintOpen => 'مُرسلة';

  @override
  String get marketComplaintInReview => 'قيد المراجعة';

  @override
  String get marketComplaintWaiting => 'بانتظار ردك';

  @override
  String get marketComplaintResolved => 'تم الحل';

  @override
  String get marketComplaintRejected => 'أُغلقت دون استرداد';

  @override
  String marketDecisionRefund(String amount) {
    return 'تم استرداد $amount';
  }

  @override
  String marketDecisionPartial(String amount) {
    return 'استرداد جزئي: $amount';
  }

  @override
  String marketDecisionCompensation(String amount) {
    return 'تعويض: $amount';
  }

  @override
  String get marketDecisionNone => 'لا يوجد استرداد';

  @override
  String get marketDecisionToPayment => 'إلى وسيلة الدفع التي استخدمتها';

  @override
  String get marketDecisionToWallet => 'أُضيف إلى محفظتك';

  @override
  String marketDecisionToCoupon(String code) {
    return 'كقسيمة: $code';
  }

  @override
  String get marketWriteToSupport => 'اكتب إلى الدعم';

  @override
  String get marketSupport => 'الدعم';

  @override
  String get marketYou => 'أنت';

  @override
  String get marketComplaintClosed => 'هذه الشكوى مغلقة.';

  @override
  String get marketWallet => 'المحفظة';

  @override
  String get marketWalletBalance => 'رصيدك';

  @override
  String get marketWalletNote =>
      'استخدمه في طلباتك القادمة. لا يمكن سحبه نقدًا.';

  @override
  String get marketWalletEmpty =>
      'تظهر هنا المبالغ المستردة والرصيد المضاف من الدعم.';

  @override
  String marketClubJoinWith(String price) {
    return 'انضم · $price';
  }

  @override
  String get marketClubPerMonth => 'شهريًا';

  @override
  String get marketClubPerYear => 'سنويًا';

  @override
  String marketClubActiveUntil(String date) {
    return 'عضو حتى $date';
  }

  @override
  String marketClubSaved(String amount) {
    return 'وفّرت حتى الآن: $amount';
  }

  @override
  String get marketClubWaiting => 'بانتظار الدفع. تبدأ عضويتك بعد تأكيده.';

  @override
  String get marketClubPayAgain => 'لم يتم الدفع. حاول مرة أخرى.';

  @override
  String get marketClubNoRenew =>
      'تُدفع كل فترة على حدة، ولا يتجدد شيء تلقائيًا.';

  @override
  String get marketClubJoined => 'مرحبًا بك في النادي.';

  @override
  String get marketClubNone => 'لا يوجد نادٍ في هذا التطبيق بعد.';

  @override
  String get tabSearch => 'بحث';

  @override
  String get tabOrders => 'الطلبات';

  @override
  String get tabClub => 'النادي';

  @override
  String get marketSearchStart => 'ابحث عن مطعم أو طبق أو منتج من المتاجر.';

  @override
  String get marketSearchTry => 'ابدأ بـ';

  @override
  String get marketSearchPlaces => 'الأماكن';

  @override
  String get marketSearchItems => 'الأطباق والمنتجات';

  @override
  String marketSearchNone(String query) {
    return 'لم نجد شيئًا لـ «$query».';
  }

  @override
  String get marketListEmptyTitle => 'لا يوجد شيء هنا بالقرب منك بعد';

  @override
  String get marketListEmptyMessage =>
      'جرّب عنوانًا آخر، أو تصفّح كل شيء من الرئيسية.';

  @override
  String get tabVendor => 'متجري';

  @override
  String get tabVendorStock => 'المخزون';

  @override
  String get notVendorTitle => 'لفريق عمل المتاجر';

  @override
  String get notVendorMessage =>
      'سجّل الدخول بالرقم أو البريد الذي أضافك به صاحب التطبيق.';

  @override
  String get vendorLater => 'لاحقًا';

  @override
  String get vendorPaused => 'متوقف: لا يستقبل طلبات';

  @override
  String get vendorPauseUntilBack => 'حتى أستقبل الطلبات مرة أخرى';

  @override
  String get vendorPauseNote => 'الطلبات المجدولة تستمر في الوصول.';

  @override
  String get vendorNoOrdersMessage => 'تظهر الطلبات الجديدة هنا مع صوت تنبيه.';

  @override
  String vendorItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count صنف',
      few: '$count أصناف',
      two: 'صنفان',
      one: 'صنف واحد',
    );
    return '$_temp0';
  }

  @override
  String get vendorItemsTitle => 'الأصناف';

  @override
  String vendorFor(String time) {
    return 'موعده $time';
  }

  @override
  String vendorCollect(String amount) {
    return 'حصّل $amount نقدًا';
  }

  @override
  String get vendorCustomerNotes => 'ملاحظات العميل';

  @override
  String get vendorDeliverTo => 'التوصيل إلى';

  @override
  String get vendorNoContact => 'لأي شيء يخص العميل، تواصل مع دعم التطبيق.';

  @override
  String get vendorRejectOutsideArea => 'خارج منطقة التوصيل';

  @override
  String get vendorHandToDriver => 'تم التسليم لمندوبنا';

  @override
  String get vendorMarkDelivered => 'تم التوصيل';

  @override
  String get vendorHandToCustomer => 'استلمه العميل';

  @override
  String get vendorHandedOver => 'تم تحديث الطلب';

  @override
  String get vendorPickupCodeTitle => 'كود العميل';

  @override
  String get vendorPickupCode => 'كود من 4 أرقام';

  @override
  String get vendorStockSearch => 'ابحث عن صنف';

  @override
  String get vendorOutOfStockOnly => 'غير المتوفر فقط';

  @override
  String get vendorOutOfStock => 'غير متوفر';

  @override
  String get vendorStockEmpty => 'لا توجد أصناف';

  @override
  String get vendorPickItems => 'تجهيز الأصناف';

  @override
  String get vendorPickAgain => 'تعديل التجهيز';

  @override
  String get vendorPicked => 'متوفر';

  @override
  String get vendorSubstituted => 'بديل';

  @override
  String get vendorMissing => 'غير متوفر';

  @override
  String get vendorPickedCount => 'العدد';

  @override
  String vendorPickedWeight(String unit) {
    return 'الوزن ($unit)';
  }

  @override
  String vendorWeightTolerance(int percent) {
    return 'حتى $percent% أكثر من المطلوب';
  }

  @override
  String get vendorIfMissingSimilar => 'إن لم يتوفر: صنف مشابه';

  @override
  String get vendorIfMissingChosen => 'إن لم يتوفر: الصنف الذي اختاره العميل';

  @override
  String get vendorIfMissingRemove => 'إن لم يتوفر: يُحذف من الطلب';

  @override
  String get vendorBringChosen => 'أحضر الصنف الذي اختاره العميل.';

  @override
  String get vendorChooseSubstitute => 'اختر الصنف';

  @override
  String get vendorChangeSubstitute => 'تغيير';

  @override
  String get vendorPickSave => 'حفظ التجهيز';

  @override
  String get vendorPickSaved => 'تم حفظ التجهيز';

  @override
  String vendorPickNeedsAmount(String item) {
    return 'أدخل الكمية التي جهّزتها من $item.';
  }

  @override
  String vendorPickNeedsSubstitute(String item) {
    return 'اختر ما ستحضره بدلًا من $item.';
  }

  @override
  String vendorLinePicked(String amount) {
    return 'جُهّز $amount';
  }

  @override
  String vendorLineSubstituted(String item) {
    return 'البديل: $item';
  }

  @override
  String get vendorStatementsTitle => 'كشوف الحساب';

  @override
  String get vendorPreviousMonth => 'الشهر السابق';

  @override
  String get vendorNextMonth => 'الشهر التالي';

  @override
  String vendorStatementOrders(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count طلب',
      few: '$count طلبات',
      two: 'طلبان',
      one: 'طلب واحد',
      zero: 'لا طلبات',
    );
    return '$_temp0';
  }

  @override
  String get vendorStatementEarns => 'أرباحك';

  @override
  String get vendorStatementCommission => 'عمولة التطبيق';

  @override
  String get vendorStatementDue => 'المستحق لك';

  @override
  String get vendorStatementYouOwe => 'المستحق عليك للتطبيق';

  @override
  String get vendorStatementEmpty => 'لا طلبات مُسلّمة في هذا الشهر';

  @override
  String get vendorStatementOrdersTitle => 'الطلبات';

  @override
  String vendorStatementDueEach(String amount) {
    return '$amount لك';
  }

  @override
  String get vendorStatementAdjustments => 'الاستردادات والتعويضات';

  @override
  String vendorAdjustmentRefund(String reference) {
    return 'استرداد على $reference';
  }

  @override
  String vendorAdjustmentCompensation(String reference) {
    return 'تعويض على $reference';
  }

  @override
  String get vendorPaidByYou => 'على حسابك';

  @override
  String get vendorPaidByApp => 'على حساب التطبيق';

  @override
  String get vendorComplaintsTitle => 'الشكاوى';

  @override
  String get vendorComplaintsEmptyTitle => 'لا شكاوى';

  @override
  String get vendorComplaintsEmptyMessage =>
      'تظهر هنا الشكاوى التي يشاركها معك دعم التطبيق.';

  @override
  String vendorComplaintOrder(String reference) {
    return 'الطلب $reference';
  }

  @override
  String get schoolInStaffAppTitle => 'عملك في تطبيق العاملين';

  @override
  String get schoolInStaffAppMessage =>
      'يستخدم معلمو المدرسة وموظفوها تطبيق العاملين الخاص بها. سجّل الدخول إليه بالرقم نفسه.';

  @override
  String get staffAppOnlyMessage =>
      'هذا التطبيق لمعلمي المدرسة وموظفيها. ويستخدم الطلاب وأولياء الأمور التطبيق الرئيسي للمدرسة.';

  @override
  String get teacherAppOnly => 'لمعلمي الأكاديمية';

  @override
  String get teacherAppOnlyMessage =>
      'هذا التطبيق لمعلمي الأكاديمية. ويتعلم الطلاب في التطبيق الرئيسي للأكاديمية.';

  @override
  String marketLateShort(int minutes) {
    return 'تأخير ~$minutes د';
  }

  @override
  String marketLateBanner(int minutes, String reason) {
    return 'تأخير نحو $minutes دقيقة: $reason';
  }

  @override
  String get marketLateIncluded => 'تشمل مواعيد التوصيل والاستلام هذا التأخير.';

  @override
  String get marketLateDemand => 'طلب مرتفع';

  @override
  String get marketLateCouriers => 'قلة المندوبين';

  @override
  String get marketLateWeather => 'الطقس';

  @override
  String get vendorLate => 'تأخير';

  @override
  String get vendorLateTitle => 'هل لديك تأخير؟';

  @override
  String get vendorLateText =>
      'واصل استقبال الطلبات وأخبر العملاء أن الطلب يستغرق وقتًا أطول. تشمل مواعيد التوصيل والاستلام الدقائق الإضافية.';

  @override
  String get vendorLateMinutes => 'الوقت الإضافي';

  @override
  String vendorLateExtra(int minutes) {
    return '+$minutes دقيقة';
  }

  @override
  String get vendorLateReason => 'السبب';

  @override
  String get vendorLateDemand => 'طلب مرتفع';

  @override
  String get vendorLateCouriers => 'قلة المندوبين';

  @override
  String get vendorLateWeather => 'الطقس';

  @override
  String get vendorLateOther => 'سبب آخر';

  @override
  String get vendorLateNote => 'كلماتك (يراها العملاء)';

  @override
  String get vendorLateFor => 'المدة';

  @override
  String vendorLateForMinutes(int minutes) {
    return '$minutes دقيقة';
  }

  @override
  String vendorLateForHours(int hours) {
    String _temp0 = intl.Intl.pluralLogic(
      hours,
      locale: localeName,
      other: '$hours ساعة',
      few: '$hours ساعات',
      two: 'ساعتان',
      one: 'ساعة',
    );
    return '$_temp0';
  }

  @override
  String get vendorLateUntilEnd => 'حتى أنهيه';

  @override
  String get vendorLateSet => 'إبلاغ العملاء';

  @override
  String get vendorLateEnd => 'إنهاء التأخير';

  @override
  String vendorLateUntil(String time) {
    return 'حتى $time';
  }

  @override
  String get vendorHoursTitle => 'المواعيد والإجازات';

  @override
  String get vendorHoursNote =>
      'تظهر التغييرات في التطبيق فورًا. ويرى فريق التطبيق ما غيّرته ويمكنه إعادته كما كان.';

  @override
  String get vendorHoursWeek => 'كل أسبوع';

  @override
  String get vendorHoursHint =>
      'فترتان في اليوم على الأكثر. اليوم بلا مواعيد مغلق؛ والموعد الذي يغلق قبل أن يفتح يمتد بعد منتصف الليل.';

  @override
  String get vendorHoursClosed => 'مغلق';

  @override
  String get vendorHoursAdd => 'إضافة مواعيد';

  @override
  String get vendorHoursRemove => 'إزالة';

  @override
  String get vendorPrepTitle => 'مدة التحضير';

  @override
  String get vendorPrepHint =>
      'المدة المعتادة لتحضير الطلب. تبدأ منها مواعيد التوصيل والاستلام التي يراها العملاء.';

  @override
  String get vendorDaysOff => 'الإجازات';

  @override
  String get vendorDaysOffHint =>
      'العطلات والأيام الأخرى التي تُغلق فيها طوال اليوم. يراك العملاء مغلقًا، ويرون متى تفتح من جديد.';

  @override
  String get vendorDaysOffNone => 'لا توجد إجازات قادمة.';

  @override
  String get vendorDaysOffAdd => 'إضافة إجازة';

  @override
  String get vendorHoursSave => 'حفظ';

  @override
  String get vendorHoursSaved => 'تم الحفظ. يراه العملاء الآن.';

  @override
  String get signInWithUsername => 'اسم المستخدم';

  @override
  String get username => 'اسم المستخدم';

  @override
  String get usernameHint =>
      'من 3 إلى 30 حرفًا أو رقمًا أو نقطة أو شرطة سفلية، يبدأ بحرف.';

  @override
  String get enterUsername =>
      'اختر اسم مستخدم من 3 إلى 30 حرفًا أو رقمًا أو نقطة أو شرطة سفلية، يبدأ بحرف.';

  @override
  String get signInIntroPasswordStudio => 'سجّل الدخول بكلمة المرور.';

  @override
  String get forgotPasswordTitle => 'نسيت كلمة المرور؟';

  @override
  String get forgotPasswordIntro =>
      'أدخل البريد الإلكتروني أو رقم الهاتف المسجَّل في حسابك، وسنرسل إليك رمزًا لتعيين كلمة مرور جديدة.';

  @override
  String get newPasswordTitle => 'اختر كلمة مرور جديدة';

  @override
  String get newPassword => 'كلمة المرور الجديدة';

  @override
  String get confirmPassword => 'أعد كتابة كلمة المرور';

  @override
  String get passwordsDontMatch => 'كلمتا المرور غير متطابقتين.';

  @override
  String get saveAndSignIn => 'حفظ وتسجيل الدخول';

  @override
  String get signInWithCodeInstead => 'سجّل الدخول برمز بدلًا من ذلك';

  @override
  String get signInWithPasswordInstead => 'سجّل الدخول بكلمة المرور';

  @override
  String get createAnAccount => 'أنشئ حسابًا';

  @override
  String get newHereQuestion => 'جديد هنا؟';

  @override
  String get createAccountIntroCode =>
      'سنرسل إليك رمزًا للتحقق من رقم هاتفك أو بريدك الإلكتروني، ثم تختار كلمة المرور.';

  @override
  String get changePassword => 'تغيير كلمة المرور';

  @override
  String get currentPassword => 'كلمة المرور الحالية';

  @override
  String get enterCurrentPassword => 'أدخل كلمة المرور الحالية.';

  @override
  String get passwordChanged =>
      'تم تغيير كلمة المرور، وسُجِّل الخروج من هواتفك الأخرى.';

  @override
  String get showPassword => 'إظهار كلمة المرور';

  @override
  String get hidePassword => 'إخفاء كلمة المرور';

  @override
  String newPasswordIntro(int min) {
    return 'استخدم $min أحرف على الأقل. سيُسجَّل الخروج من هواتفك الأخرى.';
  }

  @override
  String passwordTooShort(int min) {
    return '$min أحرف على الأقل';
  }
}
