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
  String get authBubbleNour => 'أطلقتُ متجري اليوم';

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
  String get authContinueYallapp => 'المتابعة باستخدام Yallapp';

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
  String get homeMorning => 'صباح الخير';

  @override
  String get homeAfternoon => 'مساء الخير';

  @override
  String get homeEvening => 'مساء الخير';

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
  String get linkSuggestTitle => 'وجدنا حسابك في Yallapp. هل تربطه؟';

  @override
  String linkSuggestNamed(String name) {
    return 'وجدنا حسابك في Yallapp، $name. هل تربطه؟';
  }

  @override
  String get linkSuggestLine => 'ستظهر تطبيقاتك في ملفك الشخصي.';

  @override
  String get linkSuggestLink => 'ربط';

  @override
  String get linkSuggestDismiss => 'تجاهل';

  @override
  String get linkSuggestDone => 'تم الربط بـ Yallapp.';

  @override
  String get settingsAbout => 'حول التطبيق';

  @override
  String get settingsPrivacy => 'سياسة الخصوصية';

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

  @override
  String get socialReasonMisleading => 'مضلّل أو احتيال';

  @override
  String get qaTitle => 'سؤال وجواب';

  @override
  String get qaAskQuestion => 'اطرح سؤالًا';

  @override
  String qaViews(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مشاهدة',
      many: '$count مشاهدة',
      few: '$count مشاهدات',
      two: 'مشاهدتان',
      one: 'مشاهدة واحدة',
      zero: 'لا مشاهدات',
    );
    return '$_temp0';
  }

  @override
  String qaAnswerCount(int count) {
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
  String qaReplyCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count رد',
      many: '$count ردًا',
      few: '$count ردود',
      two: 'ردّان',
      one: 'رد واحد',
      zero: 'رد',
    );
    return '$_temp0';
  }

  @override
  String get qaAccepted => 'مقبولة';

  @override
  String get qaOfficial => 'رسمي';

  @override
  String get qaJustNow => 'الآن';

  @override
  String qaMinutes(int count) {
    return '$count د';
  }

  @override
  String qaHours(int count) {
    return '$count س';
  }

  @override
  String qaDays(int count) {
    return '$count ي';
  }

  @override
  String qaAgo(String time) {
    return 'منذ $time';
  }

  @override
  String get qaSave => 'احفظ';

  @override
  String get qaSaved => 'محفوظ';

  @override
  String get qaVoteUp => 'صوّت لأعلى';

  @override
  String get qaVoteDown => 'صوّت لأسفل';

  @override
  String get qaAccept => 'اقبل هذه الإجابة';

  @override
  String get qaUnaccept => 'تراجع عن القبول';

  @override
  String get qaWriteAnswer => 'اكتب إجابة';

  @override
  String get qaAnswerHint => 'شارك ما نجح معك…';

  @override
  String get qaPost => 'انشر';

  @override
  String get qaReplyHint => 'اكتب ردًّا…';

  @override
  String get qaPending => 'بانتظار المراجعة. سيظهر للآخرين بعد موافقة المشرف.';

  @override
  String qaTooShort(int count) {
    return 'اكتب $count حرفًا على الأقل.';
  }

  @override
  String get qaOwnVote => 'لا يمكنك التصويت على ما كتبته.';

  @override
  String get qaReport => 'أبلغ';

  @override
  String get qaRankNewcomer => 'جديد';

  @override
  String get qaRankMember => 'عضو';

  @override
  String get qaRankContributor => 'مساهم';

  @override
  String get qaRankExpert => 'خبير';

  @override
  String get qaRankPro => 'محترف';

  @override
  String get qaFilterAll => 'الكل';

  @override
  String get qaFilterUnanswered => 'بلا إجابة';

  @override
  String get qaFilterAnswered => 'مُجاب';

  @override
  String get qaFilterOfficial => 'إجابات رسمية';

  @override
  String get qaFilterFollowing => 'أتابعه';

  @override
  String get qaSortActive => 'الأنشط';

  @override
  String get qaSortNewest => 'الأحدث';

  @override
  String get qaSortVotes => 'الأعلى تصويتًا';

  @override
  String get qaEmpty => 'لا أسئلة هنا بعد. كن أول من يسأل.';

  @override
  String get qaAskTitleLabel => 'سؤالك';

  @override
  String get qaAskTitleHint => 'كيف أستطيع…';

  @override
  String get qaAskBodyLabel => 'التفاصيل';

  @override
  String get qaAskBodyHint => 'ماذا تحاول أن تفعل، وما الذي جرّبته؟';

  @override
  String get qaAskSection => 'القسم';

  @override
  String get qaAskTags => 'الوسوم (حتى 5)';

  @override
  String get qaAskLanguage => 'اللغة';

  @override
  String get qaSimilarTitle => 'هل سُئل من قبل؟';

  @override
  String get qaSimilarBody =>
      'هذه الأسئلة تشبه سؤالك، وقد تجد إجابتك في أحدها.';

  @override
  String get qaAskSend => 'انشر السؤال';

  @override
  String get qaSearchHint => 'ابحث في الأسئلة والدروس';

  @override
  String qaSearchEmpty(String query) {
    return 'لا نتائج لـ «$query».';
  }

  @override
  String get qaSearchQuestions => 'الأسئلة';

  @override
  String get qaSearchTutorials => 'الدروس';

  @override
  String get tutTitle => 'تعلّم';

  @override
  String get tutSubtitle => 'دروس رسمية من فريق يلا آب';

  @override
  String get tutArticle => 'مقال';

  @override
  String get tutVideo => 'فيديو';

  @override
  String get tutAllKinds => 'الكل';

  @override
  String get tutLevelBeginner => 'مبتدئ';

  @override
  String get tutLevelIntermediate => 'متوسط';

  @override
  String get tutLevelAdvanced => 'متقدم';

  @override
  String get tutAnyLevel => 'أي مستوى';

  @override
  String get tutAnyLanguage => 'أي لغة';

  @override
  String tutMinRead(int count) {
    return 'قراءة $count د';
  }

  @override
  String get tutWatch => 'شاهد الفيديو';

  @override
  String get tutOfficial => 'رسمي';

  @override
  String get tutEmpty => 'لا دروس هنا بعد.';

  @override
  String get tutCannotOpen => 'تعذّر فتح الفيديو.';

  @override
  String get verifyTitle => 'مطوّر محترف';

  @override
  String get verifyIntro =>
      'الشارة الذهبية للأعضاء الذين بنوا 5 تطبيقات أو أكثر بيلا آب. قوالب متجر Studio تُحتسب.';

  @override
  String get verifyNotLinked =>
      'اربط حساب يلا آب أولًا. تطبيقاتك تأتي منه، فلا تُحتسب إلا تطبيقاتك.';

  @override
  String get verifyLink => 'اربط حساب يلا آب';

  @override
  String verifyProgress(int count, int needed) {
    return '$count من $needed تطبيقات';
  }

  @override
  String verifyNeedMore(int needed) {
    return 'يمكنك التقديم عندما يصبح في حساب يلا آب $needed تطبيقات.';
  }

  @override
  String get verifyHasGold =>
      'أنت مطوّر محترف. تظهر الشارة الذهبية بجانب اسمك.';

  @override
  String get verifyPending => 'نراجع طلبك، وسنخبرك بالنتيجة في الحالتين.';

  @override
  String verifySentOn(String date) {
    return 'أُرسل في $date';
  }

  @override
  String get verifyRejected => 'لم يُقبل طلبك الأخير.';

  @override
  String verifyReason(String reason) {
    return 'السبب: $reason';
  }

  @override
  String get verifyFullName => 'الاسم الكامل (كما في الهوية)';

  @override
  String get verifyIdProof => 'إثبات الهوية';

  @override
  String get verifyIdProofHint =>
      'صورة لبطاقة الهوية أو جواز السفر. لا يراها إلا الفريق الذي يراجع طلبك.';

  @override
  String get verifyPickId => 'اختر صورة';

  @override
  String get verifyChangeId => 'غيّر';

  @override
  String get verifyPortfolio => 'روابط أعمالك (حتى 5)';

  @override
  String get verifyAddLink => 'أضف رابطًا';

  @override
  String get verifyApps => 'تطبيقاتك';

  @override
  String get verifyAppsFrom => 'من حساب يلا آب المرتبط';

  @override
  String get verifyTemplate => 'قالب';

  @override
  String get verifySend => 'أرسل طلبي';

  @override
  String get verifyNameNeeded => 'اكتب اسمك الكامل.';

  @override
  String get verifyIdNeeded => 'أضف صورة لهويتك.';

  @override
  String get verifyBadLink => 'تبدأ الروابط بـ https://';

  @override
  String get verifySent => 'أُرسل. سنخبرك عند مراجعته.';

  @override
  String get notifTitle => 'الإشعارات';

  @override
  String get notifMarkAll => 'تعليم الكل كمقروء';

  @override
  String get notifEmpty => 'لا جديد. تظهر هنا الإجابات والمتابعات والشارات.';

  @override
  String get notifUnread => 'غير المقروءة';

  @override
  String get notifAll => 'الكل';

  @override
  String get notifEmail => 'راسلني بالبريد عن';

  @override
  String get notifEmailBody =>
      'تظهر الإشعارات هنا دائمًا. اختر ما يصلك منها بالبريد أيضًا.';

  @override
  String get notifKindAnswer => 'إجابات أسئلتي';

  @override
  String get notifKindAccepted => 'قبول إجابتي';

  @override
  String get notifKindOfficial => 'الإجابات الرسمية';

  @override
  String get notifKindFriend => 'طلبات الصداقة';

  @override
  String get notifKindFollow => 'متابعون جدد';

  @override
  String get notifKindBadge => 'الشارات';

  @override
  String get notifKindVerification => 'طلب التوثيق';

  @override
  String get notifKindOther => 'أخرى';

  @override
  String get qaSearchMembers => 'الأعضاء';

  @override
  String get qaSearchTags => 'الوسوم';

  @override
  String get qaAcceptShort => 'اقبل';

  @override
  String get showcaseTitle => 'معرض الأعمال';

  @override
  String get showcaseAll => 'الكل';

  @override
  String get showcaseNewest => 'الأحدث';

  @override
  String get showcaseMostLiked => 'الأكثر إعجابًا';

  @override
  String get showcaseTypeStore => 'المتاجر';

  @override
  String get showcaseTypeAcademy => 'الأكاديميات';

  @override
  String get showcaseTypeBooking => 'الحجوزات';

  @override
  String get showcaseMadeWith => 'صُنع بـ Yallapp';

  @override
  String get showcaseLike => 'إعجاب';

  @override
  String get showcaseLiked => 'أعجبني';

  @override
  String get showcaseAppStore => 'App Store';

  @override
  String get showcasePlay => 'Google Play';

  @override
  String get showcaseWebsite => 'الموقع';

  @override
  String get showcaseEmpty => 'لا توجد تطبيقات هنا بعد.';

  @override
  String get academyTitle => 'الأكاديمية';

  @override
  String get academyLocked => 'مقفل';

  @override
  String get academyLockedNote => 'هذه الدورة غير متاحة في حسابك بعد.';

  @override
  String get academyFree => 'متاحة';

  @override
  String get academyComplete => 'تحديد كمكتمل';

  @override
  String get academyDone => 'مكتمل';

  @override
  String get academyWatch => 'شاهد الدرس';

  @override
  String get academyCertificate => 'شهادتك';

  @override
  String get academyEmpty => 'لا توجد دورات بعد.';

  @override
  String get challengesTitle => 'التحديات';

  @override
  String get challengeUpcoming => 'قريبًا';

  @override
  String get challengeOpen => 'مفتوح';

  @override
  String get challengeVoting => 'التصويت';

  @override
  String get challengeClosed => 'مغلق';

  @override
  String get challengeRules => 'القواعد';

  @override
  String get challengeEntriesTitle => 'المشاركات';

  @override
  String get challengeWinners => 'الفائزون';

  @override
  String get challengeVote => 'صوّت';

  @override
  String get challengeVoted => 'تم التصويت';

  @override
  String get challengeEnter => 'شارك برابط';

  @override
  String get challengeEnterHint => 'رابط تطبيقك';

  @override
  String get challengeEntered => 'لقد شاركت';

  @override
  String get challengeSend => 'إرسال';

  @override
  String get challengeEmpty => 'لا توجد تحديات الآن.';

  @override
  String get challengeCardTitle => 'تحدي هذا الأسبوع';

  @override
  String get boardTitle => 'لوحة الصدارة';

  @override
  String get boardWeek => 'هذا الأسبوع';

  @override
  String get boardAll => 'كل الأوقات';

  @override
  String get prosTitle => 'المحترفون';

  @override
  String get proAvailable => 'متاح';

  @override
  String get proBusy => 'مشغول';

  @override
  String get proUnavailable => 'لا يقبل أعمالًا';

  @override
  String get proAvailableOnly => 'متاح الآن';

  @override
  String get proServices => 'الخدمات';

  @override
  String get proPortfolio => 'الأعمال السابقة';

  @override
  String get proSkills => 'المهارات';

  @override
  String get proHire => 'أرسل طلب توظيف';

  @override
  String get proHireHint => 'ماذا تحتاج؟ 10 أحرف على الأقل.';

  @override
  String get proHireSent => 'تم الإرسال. محادثتك مع المحترف مفتوحة.';

  @override
  String get proDirect => 'أنت والمحترف تتفقان على العمل والشروط بينكما.';

  @override
  String get prosEmpty => 'لا يوجد محترفون بعد.';

  @override
  String get jobsTitle => 'الوظائف';

  @override
  String get jobRemote => 'عن بُعد';

  @override
  String get jobFullTime => 'دوام كامل';

  @override
  String get jobPartTime => 'دوام جزئي';

  @override
  String get jobContract => 'عقد';

  @override
  String get jobFreelance => 'عمل حر';

  @override
  String get jobInternship => 'تدريب';

  @override
  String get jobApply => 'تقدّم';

  @override
  String get jobApplyHint => 'رسالتك. 10 أحرف على الأقل.';

  @override
  String get jobApplied => 'لقد تقدّمت';

  @override
  String get jobApplicantsTitle => 'المتقدّمون';

  @override
  String get jobsEmpty => 'لا توجد وظائف الآن.';

  @override
  String get eventsTitle => 'الفعاليات';

  @override
  String get eventAll => 'الكل';

  @override
  String get eventLive => 'مباشر';

  @override
  String get eventLiveNow => 'مباشر الآن';

  @override
  String get eventOnline => 'عبر الإنترنت';

  @override
  String get eventInPerson => 'حضوريًا';

  @override
  String get eventFree => 'مجاني';

  @override
  String get eventRsvp => 'سأحضر';

  @override
  String get eventGoing => 'سأحضر';

  @override
  String get eventNotGoing => 'لن أحضر';

  @override
  String get eventCalendar => 'أضف إلى التقويم';

  @override
  String get eventJoin => 'انضم';

  @override
  String get eventWatch => 'شاهد';

  @override
  String get eventReplay => 'شاهد الإعادة';

  @override
  String get eventCancelled => 'أُلغيت';

  @override
  String get eventComments => 'التعليقات';

  @override
  String get eventCommentHint => 'اكتب شيئًا';

  @override
  String get eventsEmpty => 'لا توجد فعاليات قادمة.';

  @override
  String showcaseLikes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count إعجاب',
      many: '$count إعجابًا',
      few: '$count إعجابات',
      two: 'إعجابان',
      one: 'إعجاب واحد',
      zero: 'لا إعجابات',
    );
    return '$_temp0';
  }

  @override
  String academyLessons(int count) {
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
  String academyMinutes(int count) {
    return '$count د';
  }

  @override
  String academyProgress(int count) {
    return 'مكتمل بنسبة $count%';
  }

  @override
  String challengeEntries(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count مشاركة',
      many: '$count مشاركة',
      few: '$count مشاركات',
      two: 'مشاركتان',
      one: 'مشاركة واحدة',
      zero: 'لا مشاركات',
    );
    return '$_temp0';
  }

  @override
  String challengeReward(int count) {
    return '$count نقطة';
  }

  @override
  String challengeVotes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count صوت',
      many: '$count صوتًا',
      few: '$count أصوات',
      two: 'صوتان',
      one: 'صوت واحد',
      zero: 'لا أصوات',
    );
    return '$_temp0';
  }

  @override
  String boardPoints(int count) {
    return '$count نقطة';
  }

  @override
  String proReviews(int count) {
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
  String proDone(int count) {
    return '$count مكتمل';
  }

  @override
  String jobApplicants(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count متقدّم',
      many: '$count متقدّمًا',
      few: '$count متقدّمين',
      two: 'متقدّمان',
      one: 'متقدّم واحد',
      zero: 'لا متقدّمين',
    );
    return '$_temp0';
  }

  @override
  String eventGoingCount(int count) {
    return '$count سيحضرون';
  }

  @override
  String boardYou(int rank, int points) {
    return 'أنت: #$rank · $points نقطة';
  }

  @override
  String jobBudget(String budget) {
    return 'الميزانية: $budget';
  }

  @override
  String challengeEnds(String date) {
    return 'ينتهي $date';
  }
}
