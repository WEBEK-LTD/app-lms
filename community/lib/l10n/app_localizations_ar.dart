// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'مجتمع يلا آب';

  @override
  String get commonComingSoon => 'قريبًا';

  @override
  String get commonComingSoonBody => 'نعمل على هذا القسم، وسيصل في تحديث قريب.';

  @override
  String get commonOk => 'حسنًا';

  @override
  String get commonCancel => 'إلغاء';

  @override
  String get commonSave => 'حفظ';

  @override
  String get commonRetry => 'أعد المحاولة';

  @override
  String get commonClose => 'إغلاق';

  @override
  String get commonBack => 'رجوع';

  @override
  String get commonSeeAll => 'عرض الكل';

  @override
  String get commonError => 'حدث خطأ ما. أعد المحاولة.';

  @override
  String get commonOffline =>
      'لا يوجد اتصال بالإنترنت. تحقّق من اتصالك وأعد المحاولة.';

  @override
  String get commonEmpty => 'لا يوجد شيء هنا بعد.';

  @override
  String get langTitle => 'اللغة';

  @override
  String get langEnglish => 'English';

  @override
  String get langArabic => 'العربية';

  @override
  String get langTurkish => 'Türkçe';

  @override
  String get authHeadline1 => 'اصنع تطبيقات.';

  @override
  String get authHeadline2 => 'اصنعها معًا.';

  @override
  String get authPitch =>
      'انضم إلى أكثر من 18,000 صانع تطبيقات. تعلّم واسأل\nواعرض ما صنعت.';

  @override
  String get authBubbleNour => 'أطلقتُ متجري اليوم 🎉';

  @override
  String get authBubbleAccepted => 'قُبلت الإجابة';

  @override
  String get authBubblePoints => '+25 نقطة';

  @override
  String get authBubbleChallenge => 'تحدّي الشتاء';

  @override
  String get authBubbleDays => 'بقي 4 أيام';

  @override
  String get authContinueApple => 'المتابعة باستخدام Apple';

  @override
  String get authContinueGoogle => 'المتابعة باستخدام Google';

  @override
  String get authSignUpEmail => 'التسجيل بالبريد الإلكتروني';

  @override
  String get authAlreadyMember => 'لديك حساب بالفعل؟';

  @override
  String get authLogIn => 'تسجيل الدخول';

  @override
  String get authSignUpTitle => 'أنشئ حسابك';

  @override
  String get authSignUpLine =>
      'تعلّم واسأل واعرض تطبيقاتك مع أكثر من 18,000 صانع تطبيقات.';

  @override
  String get authLogInTitle => 'مرحبًا بعودتك';

  @override
  String get authLogInLine => 'سجّل الدخول إلى حسابك في المجتمع.';

  @override
  String get authName => 'اسمك';

  @override
  String get authEmail => 'البريد الإلكتروني';

  @override
  String get authPassword => 'كلمة المرور';

  @override
  String get authCreateAccount => 'إنشاء الحساب';

  @override
  String get authForgot => 'نسيت كلمة المرور؟';

  @override
  String get authResetSent =>
      'إن كان لهذا البريد حساب، فقد أرسلنا إليه رابطًا لإعادة التعيين.';

  @override
  String get authResetTitle => 'إعادة تعيين كلمة المرور';

  @override
  String get authSendLink => 'أرسل رابط إعادة التعيين';

  @override
  String get authNoAccount => 'جديد هنا؟';

  @override
  String get authOr => 'أو';

  @override
  String get authNameNeeded => 'أدخل اسمك.';

  @override
  String get authEmailInvalid => 'أدخل بريدًا إلكترونيًا صحيحًا.';

  @override
  String get authPasswordShort => 'استخدم 8 أحرف على الأقل.';

  @override
  String get authTerms =>
      'بالمتابعة فإنك توافق على قواعد المجتمع وسياسة الخصوصية.';

  @override
  String get authProviderNotReady =>
      'طريقة الدخول هذه غير مفعّلة في هذا الإصدار. استخدم البريد الإلكتروني الآن.';

  @override
  String get tabHome => 'الرئيسية';

  @override
  String get tabQa => 'الأسئلة';

  @override
  String get tabCreate => 'إنشاء';

  @override
  String get tabLearn => 'تعلّم';

  @override
  String get tabGroups => 'المجموعات';

  @override
  String get headerMenu => 'القائمة';

  @override
  String get headerSearch => 'بحث';

  @override
  String get headerMessages => 'الرسائل';

  @override
  String get headerNotifications => 'الإشعارات';

  @override
  String get headerProfile => 'ملفك الشخصي';

  @override
  String get homeMorning => 'صباح الخير ☀️';

  @override
  String get homeAfternoon => 'مساء الخير 🌤️';

  @override
  String get homeEvening => 'مساء الخير 🌙';

  @override
  String get homeRead => 'اقرأ';

  @override
  String get homeJoin => 'انضم الآن';

  @override
  String get homeStartTutorial => 'ابدأ الدرس';

  @override
  String homeAnswers(int count) {
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
  String get homeTeam => 'فريق Yallapp';

  @override
  String get homeDays => 'أيام';

  @override
  String get homeHours => 'ساعات';

  @override
  String get homeMinutes => 'دقائق';

  @override
  String get homeStoryLive => 'مباشر الخميس';

  @override
  String get homeStoryTutorial => 'درس جديد';

  @override
  String get homeStoryShowcase => 'المعرض';

  @override
  String get homeStoryTip => 'نصيحة اليوم';

  @override
  String get homeStoryNews => 'الجديد';

  @override
  String get homeFeedEmpty => 'تظهر هنا أسئلة المجتمع ودروسه.';

  @override
  String get menuCommunity => 'المجتمع';

  @override
  String get menuHome => 'الرئيسية';

  @override
  String get menuQa => 'الأسئلة';

  @override
  String get menuTutorials => 'الدروس';

  @override
  String get menuAcademy => 'الأكاديمية';

  @override
  String get menuShowcase => 'المعرض';

  @override
  String get menuChallenges => 'التحدّيات';

  @override
  String get menuGroups => 'المجموعات';

  @override
  String get menuFriends => 'الأصدقاء';

  @override
  String get menuPros => 'المحترفون';

  @override
  String get menuEvents => 'الفعاليات';

  @override
  String get menuYourGroups => 'مجموعاتك';

  @override
  String get menuGroupsSoon => 'تصل المجموعات في تحديث قريب.';

  @override
  String get menuLight => 'فاتح';

  @override
  String get menuDark => 'داكن';

  @override
  String get menuSaved => 'المحفوظات';

  @override
  String get menuSettings => 'الإعدادات';

  @override
  String get menuLogOut => 'تسجيل الخروج';

  @override
  String menuPoints(int points) {
    final intl.NumberFormat pointsNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String pointsString = pointsNumberFormat.format(points);

    return '$pointsString نقطة';
  }

  @override
  String get createTitle => 'إنشاء';

  @override
  String get createAsk => 'اطرح سؤالًا';

  @override
  String get createAskLine => 'احصل على إجابات من المجتمع وفريق يلا آب.';

  @override
  String get createShowcase => 'اعرض تطبيقك';

  @override
  String get createShowcaseLine => 'شارك ما صنعته باستخدام يلا آب.';

  @override
  String get createChallenge => 'شارك في تحدٍّ';

  @override
  String get createChallengeLine => 'اصنع حسب الموضوع واربح.';

  @override
  String get profileTitle => 'الملف الشخصي';

  @override
  String get profileEdit => 'تعديل الملف الشخصي';

  @override
  String get profileFollowers => 'المتابِعون';

  @override
  String get profileFollowing => 'يتابع';

  @override
  String get profileFriends => 'الأصدقاء';

  @override
  String get profilePoints => 'النقاط';

  @override
  String get profileAnswers => 'الإجابات';

  @override
  String get profileQuestions => 'الأسئلة';

  @override
  String get profileBadges => 'الشارات';

  @override
  String get profileNoBadges => 'لا شارات بعد. أجب وعلّم واصنع لتحصل عليها.';

  @override
  String get profileBadgeGold => 'مطوّر محترف';

  @override
  String get profileBadgeGreen => 'نشاط تجاري موثّق';

  @override
  String get profileBadgeBlue => 'عضو نشط';

  @override
  String get profileSkills => 'المهارات';

  @override
  String get profileApps => 'التطبيقات على يلا آب';

  @override
  String get profileNoApps => 'لا تطبيقات مرتبطة بعد.';

  @override
  String get profileLinkYallapp => 'اربط حسابك في يلا آب';

  @override
  String get profileLinkLine => 'اعرض التطبيقات التي صنعتها وتأهّل للشارات.';

  @override
  String get profileLinkOpened =>
      'أكّد الربط في الصفحة التي فُتحت ثم عُد إلى هنا.';

  @override
  String profileJoined(String date) {
    return 'انضم في $date';
  }

  @override
  String get profileBio => 'نبذة';

  @override
  String get profileName => 'الاسم';

  @override
  String get profileUsername => 'اسم المستخدم';

  @override
  String get profileAddSkill => 'أضف مهارة';

  @override
  String get profileChangePhoto => 'تغيير الصورة';

  @override
  String get profileSaved => 'حُفظ الملف الشخصي.';

  @override
  String get profileTeam => 'فريق يلا آب';

  @override
  String get socialFollow => 'متابعة';

  @override
  String get socialFollowingState => 'تتابعه';

  @override
  String get socialFollowsYou => 'يتابعك';

  @override
  String get socialAddFriend => 'إضافة صديق';

  @override
  String get socialRequested => 'طلب مُرسَل';

  @override
  String get socialAccept => 'قبول';

  @override
  String get socialDecline => 'رفض';

  @override
  String get socialFriendsState => 'أصدقاء';

  @override
  String get socialRemoveFriend => 'إزالة الصديق';

  @override
  String get socialCancelRequest => 'إلغاء الطلب';

  @override
  String get socialUnfollow => 'إلغاء المتابعة';

  @override
  String get socialBlock => 'حظر';

  @override
  String get socialUnblock => 'إلغاء الحظر';

  @override
  String socialBlockConfirm(String name) {
    return 'هل تريد حظر $name؟ لن يرى منشوراتك ولن يراسلك، ولن ترى منشوراته.';
  }

  @override
  String get socialBlockedNote => 'لقد حظرت هذا العضو.';

  @override
  String get socialReport => 'إبلاغ';

  @override
  String get socialReportTitle => 'لماذا تبلّغ عن هذا؟';

  @override
  String get socialReasonSpam => 'رسائل مزعجة أو إعلانات';

  @override
  String get socialReasonHarassment => 'تحرّش أو تنمّر';

  @override
  String get socialReasonHate => 'خطاب كراهية';

  @override
  String get socialReasonMisinformation => 'معلومات مضلِّلة';

  @override
  String get socialReasonImpersonation => 'انتحال شخصية';

  @override
  String get socialReasonInappropriate => 'محتوى غير لائق';

  @override
  String get socialReasonOther => 'سبب آخر';

  @override
  String get socialReportNote => 'هل تريد إضافة شيء؟ (اختياري)';

  @override
  String get socialReportSend => 'إرسال البلاغ';

  @override
  String get socialReportSent => 'شكرًا لك. سيراجعه المشرفون.';

  @override
  String get socialFriendRequests => 'طلبات الصداقة';

  @override
  String get socialNoRequests => 'لا توجد طلبات صداقة.';

  @override
  String get socialNoFollowers => 'لا متابِعين بعد.';

  @override
  String get socialNoFollowing => 'لا يتابع أحدًا بعد.';

  @override
  String get socialNoFriends => 'لا أصدقاء بعد.';

  @override
  String get socialMore => 'المزيد';

  @override
  String get settingsTitle => 'الإعدادات';

  @override
  String get settingsAccount => 'الحساب';

  @override
  String get settingsAppearance => 'المظهر';

  @override
  String get settingsSystem => 'حسب إعداد الهاتف';

  @override
  String get settingsLight => 'فاتح';

  @override
  String get settingsDark => 'داكن';

  @override
  String get settingsBlocked => 'الأعضاء المحظورون';

  @override
  String get settingsNoBlocked => 'لم تحظر أحدًا.';

  @override
  String get settingsYallapp => 'حساب يلا آب';

  @override
  String get settingsLinked => 'مرتبط';

  @override
  String get settingsNotLinked => 'غير مرتبط';

  @override
  String get settingsLink => 'ربط';

  @override
  String get settingsUnlink => 'إلغاء الربط';

  @override
  String get settingsUnlinkConfirm =>
      'هل تريد إلغاء ربط حساب يلا آب؟ ستُزال تطبيقاتك من ملفك، وتسقط الشارات التي تتطلبها.';

  @override
  String get settingsAbout => 'حول التطبيق';

  @override
  String settingsVersion(String version) {
    return 'الإصدار $version';
  }

  @override
  String get settingsLogOutConfirm =>
      'هل تريد تسجيل الخروج من مجتمع يلا آب على هذا الهاتف؟';

  @override
  String get savedEmpty => 'تظهر هنا الأسئلة والدروس التي تحفظها.';

  @override
  String get profileApply => 'تقدّم بطلب';

  @override
  String get profileApplyLine =>
      'لديك 5 تطبيقات أو أكثر على يلا آب. تقدّم بطلب شارة المطوّر المحترف.';

  @override
  String get commonShowMore => 'عرض المزيد';

  @override
  String get settingsEmail => 'البريد الإلكتروني';

  @override
  String get settingsEmailUnconfirmed => 'غير مؤكَّد';

  @override
  String get settingsResend => 'أرسل الرابط مجددًا';

  @override
  String get settingsResent => 'أُرسل. تفقّد بريدك الوارد.';

  @override
  String get settingsDeleteAccount => 'حذف الحساب';

  @override
  String get settingsDeleteLine =>
      'يحذف هذا ملفك الشخصي ومتابعاتك وأصدقاءك فورًا. تبقى أسئلتك وإجاباتك باسم «عضو محذوف».';

  @override
  String get settingsDeletePassword => 'كلمة المرور';

  @override
  String get settingsDeleteConfirm => 'احذف حسابي';

  @override
  String get openingTag => 'ابنِ تطبيقات. ابنِ معًا.';
}
