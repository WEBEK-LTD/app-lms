// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get languageName => 'English';

  @override
  String get tabHome => 'Home';

  @override
  String get tabCourses => 'Courses';

  @override
  String get tabMyCourses => 'My Courses';

  @override
  String get tabAccount => 'Account';

  @override
  String get tabShop => 'Shop';

  @override
  String get tabCart => 'Cart';

  @override
  String get tabBook => 'Book';

  @override
  String get tabAppointments => 'Appointments';

  @override
  String get tabFavorites => 'Favorites';

  @override
  String get tabMessages => 'Messages';

  @override
  String get loadingPage => 'Loading page';

  @override
  String get pageEmptyTitle => 'Nothing here yet';

  @override
  String get playVideo => 'Play video';

  @override
  String get savedItem => 'Saved';

  @override
  String itemCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items',
      one: '1 item',
    );
    return '$_temp0';
  }

  @override
  String get searchListingsHint => 'Place or reference';

  @override
  String get filters => 'Filters';

  @override
  String filtersActive(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Filters, $count active',
      one: 'Filters, 1 active',
    );
    return '$_temp0';
  }

  @override
  String sortBy(String order) {
    return 'Sort: $order';
  }

  @override
  String get sortNewest => 'Newest';

  @override
  String get sortPriceLowHigh => 'Price: low to high';

  @override
  String get sortPriceHighLow => 'Price: high to low';

  @override
  String get sortLargest => 'Largest first';

  @override
  String get filterAll => 'All';

  @override
  String get filterAny => 'Any';

  @override
  String get forSale => 'For sale';

  @override
  String get forRent => 'For rent';

  @override
  String get featured => 'Featured';

  @override
  String get negotiable => 'Negotiable';

  @override
  String pricePerMonth(String price) {
    return '$price / month';
  }

  @override
  String pricePerYear(String price) {
    return '$price / year';
  }

  @override
  String areaSquareMetres(String area) {
    return '$area m²';
  }

  @override
  String areaSquareFeet(String area) {
    return '$area ft²';
  }

  @override
  String bedroomsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count bedrooms',
      one: '1 bedroom',
    );
    return '$_temp0';
  }

  @override
  String bathroomsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count bathrooms',
      one: '1 bathroom',
    );
    return '$_temp0';
  }

  @override
  String get loadingListings => 'Loading listings';

  @override
  String get loadingMoreListings => 'Loading more listings';

  @override
  String get noListingsTitle => 'No listings found';

  @override
  String get noListingsMessage => 'Try other words or fewer filters.';

  @override
  String get propertyType => 'Property type';

  @override
  String get city => 'City';

  @override
  String get district => 'District';

  @override
  String get priceRange => 'Price';

  @override
  String get areaRange => 'Area';

  @override
  String get bedrooms => 'Bedrooms';

  @override
  String get bathrooms => 'Bathrooms';

  @override
  String get minimum => 'Min';

  @override
  String get maximum => 'Max';

  @override
  String get reset => 'Reset';

  @override
  String get showResults => 'Show results';

  @override
  String get loadingListing => 'Loading listing';

  @override
  String listingReference(String reference) {
    return 'Ref. $reference';
  }

  @override
  String get keyFacts => 'Key facts';

  @override
  String get factArea => 'Area';

  @override
  String get factFloor => 'Floor';

  @override
  String get factYearBuilt => 'Year built';

  @override
  String get factFurnished => 'Furnished';

  @override
  String get yes => 'Yes';

  @override
  String get no => 'No';

  @override
  String get features => 'Features';

  @override
  String get description => 'Description';

  @override
  String get watchVideo => 'Watch the video';

  @override
  String get location => 'Location';

  @override
  String get openInMaps => 'Open in maps';

  @override
  String get contactOffice => 'Contact the office';

  @override
  String get call => 'Call';

  @override
  String get whatsapp => 'WhatsApp';

  @override
  String get email => 'Email';

  @override
  String get similarListings => 'Similar listings';

  @override
  String get messageOffice => 'Message the office';

  @override
  String inquiryTemplate(String title) {
    return 'Hello, I am interested in \"$title\". Is it still available?';
  }

  @override
  String get writeMessage => 'Write a message';

  @override
  String get send => 'Send';

  @override
  String photoOf(int index, int total) {
    return 'Photo $index of $total';
  }

  @override
  String get saveToFavorites => 'Save to favorites';

  @override
  String get removeFromFavorites => 'Remove from favorites';

  @override
  String get loadingFavorites => 'Loading favorites';

  @override
  String get noFavoritesTitle => 'No favorites yet';

  @override
  String get noFavoritesMessage =>
      'Tap the heart on a listing to save it here.';

  @override
  String get favoritesSignInTitle => 'Save the homes you like';

  @override
  String get favoritesSignInMessage =>
      'Sign in to keep your favorites on all your devices.';

  @override
  String get messagesSignInTitle => 'Talk to the office';

  @override
  String get messagesSignInMessage =>
      'Sign in to message the office about a listing.';

  @override
  String get signIn => 'Sign in';

  @override
  String get loadingMessages => 'Loading messages';

  @override
  String get noMessagesTitle => 'No messages yet';

  @override
  String get noMessagesMessage =>
      'Questions you send about a listing show up here.';

  @override
  String unreadMessages(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count unread messages',
      one: '1 unread message',
    );
    return '$_temp0';
  }

  @override
  String messageFromYou(String text) {
    return 'You: $text';
  }

  @override
  String messageFromOffice(String text) {
    return 'Office: $text';
  }

  @override
  String get conversationClosed => 'This conversation is closed.';

  @override
  String get progress => 'Progress';

  @override
  String get seeAll => 'See all';

  @override
  String get loading => 'Loading';

  @override
  String get offlineTitle => 'You\'re offline';

  @override
  String get errorTitle => 'Something went wrong';

  @override
  String get tryAgain => 'Try again';

  @override
  String get cancel => 'Cancel';

  @override
  String durationMinutes(int minutes) {
    return '$minutes min';
  }

  @override
  String durationHours(int hours) {
    return '$hours h';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '$hours h $minutes min';
  }

  @override
  String get back => 'Back';

  @override
  String tabPosition(String label, int index, int count) {
    return '$label, tab $index of $count';
  }

  @override
  String get mainNavigation => 'Main navigation';

  @override
  String tabWithCount(String label, int count) {
    return '$label, $count';
  }

  @override
  String get maintenanceTitle => 'We\'ll be right back';

  @override
  String maintenanceMessage(String name) {
    return '$name is being updated. Please try again in a little while.';
  }

  @override
  String get updateRequiredTitle => 'Update required';

  @override
  String updateRequiredMessage(String name) {
    return 'A new version of $name is available. Update the app to keep learning.';
  }

  @override
  String get updateNow => 'Update now';

  @override
  String appPausedTitle(String name) {
    return '$name is paused';
  }

  @override
  String appPausedMessage(String name) {
    return 'The owner of $name can bring it back. Contact them to find out more, or try again later.';
  }

  @override
  String contactOwner(String name) {
    return 'Contact $name';
  }

  @override
  String membersClosedTitle(String name) {
    return '$name isn\'t taking new members right now';
  }

  @override
  String membersClosedMessage(String name) {
    return 'Contact $name to ask about joining. If you already have an account, sign in with the number you used before.';
  }

  @override
  String get connectionTitle => 'We couldn\'t connect';

  @override
  String get done => 'Done';

  @override
  String get close => 'Close';

  @override
  String get videoQualityAuto => 'Auto';

  @override
  String get errorTimeout =>
      'The connection timed out. Check your internet and try again.';

  @override
  String get errorCancelled => 'The request was cancelled.';

  @override
  String get errorNetwork =>
      'We couldn\'t connect. Check your internet and try again.';

  @override
  String get error401 => 'Your session has ended. Please sign in again.';

  @override
  String get error403 => 'You don\'t have access to this.';

  @override
  String get error404 => 'We couldn\'t find what you were looking for.';

  @override
  String get error429 =>
      'Too many attempts. Please wait a moment and try again.';

  @override
  String get error503 =>
      'The app is unavailable right now. Please try again later.';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorInvalidResponse =>
      'The app received a response it couldn\'t read.';

  @override
  String get errorPurchaseNotAllowed =>
      'This course isn\'t available on your account yet.';

  @override
  String get free => 'Free';

  @override
  String get questionSingleChoice => 'Single choice';

  @override
  String get questionMultipleChoice => 'Multiple choice';

  @override
  String get questionTrueFalse => 'True or false';

  @override
  String get questionShortAnswer => 'Short answer';

  @override
  String get questionOpenEnded => 'Open answer';

  @override
  String get questionFillInBlank => 'Fill in the blank';

  @override
  String get questionOrdering => 'Ordering';

  @override
  String get questionMatching => 'Matching';

  @override
  String get questionImageAnswer => 'Image answer';

  @override
  String get questionOther => 'Question';

  @override
  String get attemptPassed => 'Passed';

  @override
  String get attemptFailed => 'Not passed';

  @override
  String get attemptPendingReview => 'Waiting for review';

  @override
  String countryName(String code) {
    String _temp0 = intl.Intl.selectLogic(code, {
      'AF': 'Afghanistan',
      'AL': 'Albania',
      'DZ': 'Algeria',
      'AR': 'Argentina',
      'AU': 'Australia',
      'AT': 'Austria',
      'AZ': 'Azerbaijan',
      'BH': 'Bahrain',
      'BD': 'Bangladesh',
      'BE': 'Belgium',
      'BA': 'Bosnia and Herzegovina',
      'BR': 'Brazil',
      'BG': 'Bulgaria',
      'CA': 'Canada',
      'CN': 'China',
      'HR': 'Croatia',
      'CY': 'Cyprus',
      'CZ': 'Czechia',
      'DK': 'Denmark',
      'EG': 'Egypt',
      'FI': 'Finland',
      'FR': 'France',
      'GE': 'Georgia',
      'DE': 'Germany',
      'GR': 'Greece',
      'HU': 'Hungary',
      'IN': 'India',
      'ID': 'Indonesia',
      'IR': 'Iran',
      'IQ': 'Iraq',
      'IE': 'Ireland',
      'IT': 'Italy',
      'JP': 'Japan',
      'JO': 'Jordan',
      'KZ': 'Kazakhstan',
      'KE': 'Kenya',
      'XK': 'Kosovo',
      'KW': 'Kuwait',
      'KG': 'Kyrgyzstan',
      'LB': 'Lebanon',
      'LY': 'Libya',
      'MY': 'Malaysia',
      'MX': 'Mexico',
      'MA': 'Morocco',
      'NL': 'Netherlands',
      'NZ': 'New Zealand',
      'NG': 'Nigeria',
      'MK': 'North Macedonia',
      'NO': 'Norway',
      'OM': 'Oman',
      'PK': 'Pakistan',
      'PS': 'Palestine',
      'PH': 'Philippines',
      'PL': 'Poland',
      'PT': 'Portugal',
      'QA': 'Qatar',
      'RO': 'Romania',
      'RU': 'Russia',
      'SA': 'Saudi Arabia',
      'RS': 'Serbia',
      'SG': 'Singapore',
      'SO': 'Somalia',
      'ZA': 'South Africa',
      'KR': 'South Korea',
      'ES': 'Spain',
      'SD': 'Sudan',
      'SE': 'Sweden',
      'CH': 'Switzerland',
      'SY': 'Syria',
      'TN': 'Tunisia',
      'TR': 'Turkey',
      'TM': 'Turkmenistan',
      'UA': 'Ukraine',
      'AE': 'United Arab Emirates',
      'GB': 'United Kingdom',
      'US': 'United States',
      'UZ': 'Uzbekistan',
      'YE': 'Yemen',
      'other': '$code',
    });
    return '$_temp0';
  }

  @override
  String get pageNotFound => 'This page doesn\'t exist';

  @override
  String get goHome => 'Go home';

  @override
  String get profileSaved => 'Profile saved';

  @override
  String get editProfile => 'Edit profile';

  @override
  String get save => 'Save';

  @override
  String get fullName => 'Full name';

  @override
  String get enterName => 'Enter your name.';

  @override
  String get emailOptional => 'Email (optional)';

  @override
  String get enterValidEmail => 'Enter a valid email address.';

  @override
  String get enterEmail => 'Enter your email.';

  @override
  String get enterCity => 'Enter your city.';

  @override
  String get cityOptional => 'City (optional)';

  @override
  String get mobileNumber => 'Mobile number';

  @override
  String get mobileNumberLocked =>
      'Your mobile number is how you sign in, so it can’t be changed here.';

  @override
  String signOutDeviceTitle(String device) {
    return 'Sign out $device?';
  }

  @override
  String get signOutDeviceMessage =>
      'That device will need a verification code to sign in again.';

  @override
  String get signOut => 'Sign out';

  @override
  String signOutDevice(String device) {
    return 'Sign out $device';
  }

  @override
  String get registeredDevices => 'Registered devices';

  @override
  String deviceLimit(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'You can use $count devices with this account.',
      one: 'You can use 1 device with this account.',
    );
    return '$_temp0';
  }

  @override
  String thisDevice(String device) {
    return '$device (this device)';
  }

  @override
  String lastUsed(String date) {
    return 'Last used $date';
  }

  @override
  String get myCertificates => 'My certificates';

  @override
  String get noCertificatesTitle => 'No certificates yet';

  @override
  String get noCertificatesMessage =>
      'Complete a course to earn its certificate.';

  @override
  String get noQuizResultsTitle => 'No quiz results yet';

  @override
  String get noQuizResultsMessage => 'Your quiz scores will show up here.';

  @override
  String get quizResults => 'Quiz results';

  @override
  String get justNow => 'Just now';

  @override
  String minutesAgo(int minutes) {
    return '$minutes min ago';
  }

  @override
  String hoursAgo(int hours) {
    return '$hours h ago';
  }

  @override
  String get yesterday => 'Yesterday';

  @override
  String daysAgo(int days) {
    return '$days days ago';
  }

  @override
  String get noNotificationsTitle => 'No notifications yet';

  @override
  String get noNotificationsMessage =>
      'New lessons, announcements and answers to your questions will show up here.';

  @override
  String get notifications => 'Notifications';

  @override
  String get unread => 'Unread';

  @override
  String get noOrdersTitle => 'No orders yet';

  @override
  String get noOrdersMessage => 'Your purchases show up here.';

  @override
  String get myOrders => 'My orders';

  @override
  String orderNumber(String number) {
    return 'Order #$number';
  }

  @override
  String lineQuantity(String name, int quantity) {
    return '$name × $quantity';
  }

  @override
  String get logOutTitle => 'Log out?';

  @override
  String get logOutMessage =>
      'You\'ll need a verification code to sign in again.';

  @override
  String get logOut => 'Log out';

  @override
  String get edit => 'Edit';

  @override
  String get shopping => 'Shopping';

  @override
  String get learning => 'Learning';

  @override
  String get wishlist => 'Wishlist';

  @override
  String get accountAndApp => 'Account & app';

  @override
  String get settings => 'Settings';

  @override
  String get helpAndSupport => 'Help & support';

  @override
  String get privacyPolicy => 'Privacy Policy';

  @override
  String get termsAndConditions => 'Terms & Conditions';

  @override
  String get deleteAccountTitle => 'Delete your account?';

  @override
  String get deleteAccountMessage =>
      'Your account, progress and enrollments will be deleted and every device signed out. This can’t be undone.';

  @override
  String get deleteAccount => 'Delete account';

  @override
  String get accountDeleted => 'Your account was deleted.';

  @override
  String get display => 'Display';

  @override
  String get appearance => 'Appearance';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get video => 'Video';

  @override
  String get defaultQuality => 'Default quality';

  @override
  String get playbackSpeed => 'Playback speed';

  @override
  String get autoplayNext => 'Autoplay next lesson';

  @override
  String get newsAndOffers => 'News and offers';

  @override
  String get notifyNewLessons => 'New lessons in my courses';

  @override
  String get notifyAnnouncements => 'Instructor announcements';

  @override
  String get notifyDailyReminder => 'Daily study reminder';

  @override
  String get security => 'Security';

  @override
  String devicesUsed(int used, int limit) {
    return '$used of $limit';
  }

  @override
  String version(String version) {
    return 'Version $version';
  }

  @override
  String get language => 'Language';

  @override
  String get notNow => 'Not now';

  @override
  String get welcome => 'Welcome';

  @override
  String get signInIntro =>
      'Sign in with your mobile number and we\'ll send you a verification code.';

  @override
  String chooseCountryCode(String code) {
    return 'Country code $code. Choose country code';
  }

  @override
  String get sendCode => 'Send code';

  @override
  String get signInNewHere =>
      'New here? We\'ll ask for your name after verification and create your account with this number.';

  @override
  String signInRegisteredOnly(String site) {
    return 'Use the mobile number registered with $site.';
  }

  @override
  String tooManyAttemptsSeconds(int seconds) {
    return 'Too many attempts. Try again in $seconds seconds.';
  }

  @override
  String logoOf(String name) {
    return '$name logo';
  }

  @override
  String legalAgreeBoth(String terms, String privacy) {
    return 'By continuing, you agree to the $terms and $privacy';
  }

  @override
  String legalAgreeOne(String document) {
    return 'By continuing, you agree to the $document';
  }

  @override
  String get searchCountry => 'Search country or code';

  @override
  String useCode(String code) {
    return 'Use $code';
  }

  @override
  String get codeExpired => 'This code has expired. Request a new one.';

  @override
  String get noAccountForNumber =>
      'There\'s no account with this number. Please contact the academy.';

  @override
  String get newCodeSent => 'We sent you a new code.';

  @override
  String get enterCode => 'Enter verification code';

  @override
  String codeSentTo(String number) {
    return 'We sent a code to $number';
  }

  @override
  String get changeNumber => 'Change number';

  @override
  String get signInWithPhone => 'Phone';

  @override
  String get signInWithEmail => 'Email';

  @override
  String get signInMethodLabel => 'Sign in with';

  @override
  String get emailAddress => 'Email address';

  @override
  String get password => 'Password';

  @override
  String get forgotPassword => 'Forgot your password?';

  @override
  String get signInIntroEmail =>
      'Sign in with your email address and we\'ll send you a verification code.';

  @override
  String get signInIntroPassword =>
      'Sign in with the email address and password of your account.';

  @override
  String get signInNewHereEmail =>
      'New here? We\'ll ask for your name after verification and create your account with this email address.';

  @override
  String signInPasswordAccountsOnly(String site) {
    return 'Use the email address and password of your account on $site.';
  }

  @override
  String get changeEmail => 'Change email';

  @override
  String get noAccountForEmail =>
      'There\'s no account with this email address.';

  @override
  String get invalidEmail => 'Enter a valid email address.';

  @override
  String resendCodeIn(String time) {
    return 'You can request a new code in $time';
  }

  @override
  String get sending => 'Sending…';

  @override
  String get sendNewCode => 'Send a new code';

  @override
  String get verifyAndSignIn => 'Verify & sign in';

  @override
  String codeFieldLabel(int length) {
    return 'Verification code, $length digits';
  }

  @override
  String get createYourAccount => 'Create your account';

  @override
  String signupIntro(String site) {
    return 'Your number is verified. Tell us your name to finish joining $site.';
  }

  @override
  String get createAccount => 'Create account';

  @override
  String get loadingHome => 'Loading home';

  @override
  String get goodMorning => 'Good morning';

  @override
  String get goodAfternoon => 'Good afternoon';

  @override
  String get goodEvening => 'Good evening';

  @override
  String get continueLearning => 'Continue learning';

  @override
  String get categories => 'Categories';

  @override
  String get featuredCourses => 'Featured courses';

  @override
  String get latestCourses => 'Latest courses';

  @override
  String notificationsUnread(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Notifications, $count unread',
      one: 'Notifications, 1 unread',
    );
    return '$_temp0';
  }

  @override
  String get announcement => 'Announcement';

  @override
  String get searchForCourse => 'Search for a course';

  @override
  String get welcomeBack => 'Welcome back,';

  @override
  String get whatToLearn => 'What do you want to learn?';

  @override
  String get forYou => 'For you';

  @override
  String get newCourses => 'New';

  @override
  String get learn => 'Learn';

  @override
  String get searchCourses => 'Search courses';

  @override
  String get newCoursesShowHere => 'New courses will show up here.';

  @override
  String get noCoursesYet => 'No courses yet';

  @override
  String courseCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count courses',
      one: '1 course',
    );
    return '$_temp0';
  }

  @override
  String lessonCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count lessons',
      one: '1 lesson',
    );
    return '$_temp0';
  }

  @override
  String questionCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count questions',
      one: '1 question',
    );
    return '$_temp0';
  }

  @override
  String answerCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count answers',
      one: '1 answer',
    );
    return '$_temp0';
  }

  @override
  String ratingCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ratings',
      one: '1 rating',
    );
    return '$_temp0';
  }

  @override
  String reviewCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count reviews',
      one: '1 review',
    );
    return '$_temp0';
  }

  @override
  String starCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stars',
      one: '1 star',
    );
    return '$_temp0';
  }

  @override
  String get enrolled => 'Enrolled';

  @override
  String ratedOutOf5(String rating) {
    return 'Rated $rating of 5';
  }

  @override
  String continueCourseLabel(String title, int percent) {
    return 'Continue $title, $percent% complete';
  }

  @override
  String continueCourseNextLabel(String title, int percent, String next) {
    return 'Continue $title, $percent% complete, next: $next';
  }

  @override
  String lessonsDone(int done, int total) {
    return '$done of $total lessons';
  }

  @override
  String get continueAction => 'Continue';

  @override
  String get sortPopular => 'Popular';

  @override
  String get sortAtoZ => 'A to Z';

  @override
  String get allCourses => 'All courses';

  @override
  String get searchCoursesHint => 'Course or instructor name';

  @override
  String get filtersAndSorting => 'Filters and sorting';

  @override
  String get paid => 'Paid';

  @override
  String removeFilter(String name) {
    return '$name  ×';
  }

  @override
  String get noCoursesFound => 'No courses found';

  @override
  String get noCoursesFoundFiltered =>
      'Try a different search or clear the filters.';

  @override
  String get noCoursesPublished =>
      'Courses will show up here when they are published.';

  @override
  String get clearFilters => 'Clear filters';

  @override
  String get loadMoreFailed => 'Couldn\'t load more. Try again';

  @override
  String get loadingMoreCourses => 'Loading more courses';

  @override
  String get sortByTitle => 'Sort by';

  @override
  String get category => 'Category';

  @override
  String get categoriesFailed => 'Categories couldn\'t be loaded.';

  @override
  String get showCourses => 'Show courses';

  @override
  String get enrollToOpen => 'Enroll in this course to open this item.';

  @override
  String get assignmentsOnWebsite =>
      'Assignments and live classes are on the website for now.';

  @override
  String get enrolledMessage => 'You\'re enrolled. Happy learning!';

  @override
  String get checkout => 'Checkout';

  @override
  String get checkoutFailed => 'The checkout couldn\'t be opened.';

  @override
  String get loadingCourse => 'Loading course';

  @override
  String get overview => 'Overview';

  @override
  String get curriculum => 'Curriculum';

  @override
  String get reviews => 'Reviews';

  @override
  String get questionsAndAnswers => 'Q&A';

  @override
  String get removeFromWishlist => 'Remove from wishlist';

  @override
  String get addToWishlist => 'Add to wishlist';

  @override
  String get certificate => 'Certificate';

  @override
  String get instructor => 'Instructor';

  @override
  String get noDescription => 'No description yet.';

  @override
  String get aboutInstructor => 'About the instructor';

  @override
  String get curriculumEmpty => 'The curriculum will appear here.';

  @override
  String get loadingCurriculum => 'Loading curriculum';

  @override
  String get freePreviewLower => 'free preview';

  @override
  String get lockedLower => 'locked';

  @override
  String get completedLower => 'completed';

  @override
  String get freePreview => 'Free preview';

  @override
  String get enrollForFree => 'Enroll for free';

  @override
  String get enrollNow => 'Enroll now';

  @override
  String get coursePrice => 'Course price';

  @override
  String get askQuestion => 'Ask a question';

  @override
  String get askQuestionHint => 'What would you like to ask about this course?';

  @override
  String get sendQuestion => 'Send question';

  @override
  String get loadingQuestions => 'Loading questions';

  @override
  String get noQuestionsTitle => 'No questions yet';

  @override
  String get noQuestionsMessage =>
      'Ask the instructor anything about this course.';

  @override
  String get loadingEllipsis => 'Loading…';

  @override
  String get showMoreQuestions => 'Show more questions';

  @override
  String get noAnswersYet => 'No answers yet';

  @override
  String get writeReply => 'Write a reply';

  @override
  String get sendReply => 'Send reply';

  @override
  String get answerNotification =>
      'You\'ll get a notification when the instructor answers.';

  @override
  String get loadingQuestion => 'Loading question';

  @override
  String get writeReview => 'Write a review';

  @override
  String get editReview => 'Edit your review';

  @override
  String get reviewHint =>
      'What did you like? What could be better? (optional)';

  @override
  String get postReview => 'Post review';

  @override
  String get chooseRating => 'Choose a rating from 1 to 5 stars.';

  @override
  String get reviewPending =>
      'Thanks! Your review will appear once the academy approves it.';

  @override
  String get reviewThanks => 'Thanks for your review!';

  @override
  String get loadingReviews => 'Loading reviews';

  @override
  String get noReviewsBeFirst =>
      'No reviews yet. Be the first to share what you think.';

  @override
  String get noReviews => 'No reviews yet.';

  @override
  String get showMoreReviews => 'Show more reviews';

  @override
  String starsCount(int stars, int count) {
    return '$stars stars: $count';
  }

  @override
  String get reviewAwaitingApproval => 'Waiting for the academy to approve it.';

  @override
  String personYou(String name) {
    return '$name (you)';
  }

  @override
  String ratingOutOf5(String rating) {
    return '$rating out of 5';
  }

  @override
  String get inProgress => 'In progress';

  @override
  String get completed => 'Completed';

  @override
  String get noCoursesInProgress => 'No courses in progress';

  @override
  String get noCompletedCourses => 'No completed courses yet';

  @override
  String get noCoursesInProgressMessage =>
      'Courses you enroll in will show up here.';

  @override
  String get noCompletedCoursesMessage => 'Finish a course to see it here.';

  @override
  String get browseCourses => 'Browse courses';

  @override
  String courseProgressLabel(String title, int percent) {
    return '$title, $percent% complete';
  }

  @override
  String courseProgressNextLabel(String title, int percent, String next) {
    return '$title, $percent% complete, next: $next';
  }

  @override
  String nextItem(String title) {
    return 'Next: $title';
  }

  @override
  String get wishlistEmptyTitle => 'Your wishlist is empty';

  @override
  String get wishlistEmptyMessage =>
      'Tap the heart on a course to save it for later.';

  @override
  String get courseComplete => 'Course complete. Well done!';

  @override
  String lessonComplete(int percent) {
    return 'Lesson complete · $percent% of the course done';
  }

  @override
  String get keepWatching => 'Keep watching';

  @override
  String get watchMore =>
      'Watch more of the video before marking this lesson complete.';

  @override
  String watchAtLeast(int percent) {
    return 'Watch at least $percent% of the video before marking this lesson complete.';
  }

  @override
  String get ok => 'OK';

  @override
  String get loadingLesson => 'Loading lesson';

  @override
  String get lessonLocked => 'This lesson is locked';

  @override
  String get lessonLockedEnroll => 'Enroll in the course to open this lesson.';

  @override
  String get lessonLockedSignIn => 'Sign in to open this lesson.';

  @override
  String lessonPosition(int index, int total) {
    return 'Lesson $index of $total';
  }

  @override
  String get lesson => 'Lesson';

  @override
  String get lessons => 'Lessons';

  @override
  String get notes => 'Notes';

  @override
  String get attachments => 'Attachments';

  @override
  String get noAttachments => 'This lesson has no attachments.';

  @override
  String get previousLesson => 'Previous lesson';

  @override
  String get signInToTrack => 'Sign in to track progress';

  @override
  String get markComplete => 'Mark complete';

  @override
  String get nextLesson => 'Next lesson';

  @override
  String get playingNow => 'playing now';

  @override
  String sizeBytes(int size) {
    return '$size B';
  }

  @override
  String sizeKilobytes(String size) {
    return '$size KB';
  }

  @override
  String sizeMegabytes(String size) {
    return '$size MB';
  }

  @override
  String get videoFailed => 'The video couldn\'t be played.';

  @override
  String get loadingVideo => 'Loading video';

  @override
  String get screenRecording =>
      'Screen recording is on. Stop recording to keep watching.';

  @override
  String get videoUnavailable => 'This video isn\'t available.';

  @override
  String get pause => 'Pause';

  @override
  String get play => 'Play';

  @override
  String get playAgain => 'Play again';

  @override
  String positionOf(String position, String duration) {
    return '$position of $duration';
  }

  @override
  String playbackSpeedIs(String speed) {
    return 'Playback speed $speed';
  }

  @override
  String get exitFullScreen => 'Exit full screen';

  @override
  String get fullScreen => 'Full screen';

  @override
  String get loadingEmbed => 'Loading embedded content';

  @override
  String embedFrom(String host) {
    return 'Embedded content from $host';
  }

  @override
  String get openFullScreen => 'Open full screen';

  @override
  String get interactive => 'Interactive';

  @override
  String get embeddedContent => 'Embedded content';

  @override
  String get opensFullScreen => 'This content opens in full screen.';

  @override
  String get open => 'Open';

  @override
  String get rotateScreen => 'Rotate screen';

  @override
  String get code => 'code';

  @override
  String codeIn(String language) {
    return 'Code in $language';
  }

  @override
  String get copyCode => 'Copy code';

  @override
  String get codeCopied => 'Code copied';

  @override
  String get copy => 'Copy';

  @override
  String get answerTrue => 'True';

  @override
  String get answerFalse => 'False';

  @override
  String get submitQuizTitle => 'Submit the quiz?';

  @override
  String unansweredQuestions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count questions have no answer yet.',
      one: '1 question has no answer yet.',
    );
    return '$_temp0';
  }

  @override
  String get submit => 'Submit';

  @override
  String get timeUp => 'Time\'s up. Your answers were submitted.';

  @override
  String get leaveQuizTitle => 'Leave the quiz?';

  @override
  String get leaveQuizMessage => 'Your answers won\'t be submitted.';

  @override
  String get leave => 'Leave';

  @override
  String get closeQuiz => 'Close quiz';

  @override
  String get loadingQuiz => 'Loading quiz';

  @override
  String timeLeft(String time) {
    return 'Time left $time';
  }

  @override
  String get quizNoQuestions => 'This quiz has no questions yet';

  @override
  String questionPosition(int index, int total) {
    return 'Question $index of $total';
  }

  @override
  String get previous => 'Previous';

  @override
  String get submitQuiz => 'Submit quiz';

  @override
  String get nextQuestion => 'Next question';

  @override
  String timeLimit(String duration) {
    return '$duration time limit';
  }

  @override
  String passMark(int percent) {
    return 'Pass mark $percent%';
  }

  @override
  String get unlimitedAttempts => 'Unlimited attempts';

  @override
  String attemptsUsed(int used, int allowed) {
    return '$used of $allowed attempts used';
  }

  @override
  String get lastResult => 'Last result';

  @override
  String get startQuiz => 'Start quiz';

  @override
  String get startNewAttempt => 'Start a new attempt';

  @override
  String get noAttemptsLeft => 'You\'ve used all your attempts for this quiz.';

  @override
  String get youPassed => 'You passed';

  @override
  String get notPassedThisTime => 'Not passed this time';

  @override
  String get submittedForReview => 'Submitted for review';

  @override
  String yourScore(String score) {
    return 'Your score: $score%';
  }

  @override
  String passMarkColon(int percent) {
    return 'Pass mark: $percent%';
  }

  @override
  String get instructorWillReview =>
      'Your instructor will review your answers.';

  @override
  String get backToCourse => 'Back to the course';

  @override
  String get questionNotSupported =>
      'This question can\'t be shown in the app.';

  @override
  String get answerBelow =>
      'Answer below. Your answer is saved when you move on.';

  @override
  String get chooseAll => 'Choose all that apply';

  @override
  String get chooseOne => 'Choose one answer';

  @override
  String get quiz => 'Quiz';

  @override
  String get noDeliveryDays =>
      'There are no delivery days available right now.';

  @override
  String get deliveryDate => 'Delivery date';

  @override
  String get deliveryDateOptional => 'Delivery date (optional)';

  @override
  String get emptyCartTitle => 'Empty your cart?';

  @override
  String get emptyCartMessage => 'Everything in your cart will be removed.';

  @override
  String get emptyCart => 'Empty cart';

  @override
  String get orderPlaced => 'Thank you! Your order has been placed.';

  @override
  String get shopClosedTitle => 'The shop is closed right now';

  @override
  String get tryLater => 'Please try again later.';

  @override
  String get cartEmptyTitle => 'Your cart is empty';

  @override
  String get cartEmptyMessage => 'Products you add show up here.';

  @override
  String get startShopping => 'Start shopping';

  @override
  String get choose => 'Choose';

  @override
  String get giftMessage => 'Gift message (optional)';

  @override
  String get giftMessageHint => 'We will add it to your order.';

  @override
  String get subtotal => 'Subtotal';

  @override
  String get deliveryAndTaxes => 'Delivery and taxes are added at checkout.';

  @override
  String get fixCartItems =>
      'Change or remove the items marked above to continue.';

  @override
  String get chooseDeliveryDate => 'Choose a delivery date to continue.';

  @override
  String removeItem(String name) {
    return 'Remove $name';
  }

  @override
  String get customerReviewsShowHere => 'Reviews from customers show up here.';

  @override
  String get loadingProduct => 'Loading product';

  @override
  String get addedToCart => 'Added to cart';

  @override
  String get cartFull => 'Your cart is full.';

  @override
  String get viewCart => 'View cart';

  @override
  String cartWithItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Cart, $count items',
      one: 'Cart, 1 item',
    );
    return '$_temp0';
  }

  @override
  String get youMayAlsoLike => 'You may also like';

  @override
  String get addToCart => 'Add to cart';

  @override
  String chooseOptions(String options) {
    return 'Choose $options';
  }

  @override
  String get notAvailableInOptions => 'Not available in these options';

  @override
  String get outOfStock => 'Out of stock';

  @override
  String get notSoldInApp => 'This item isn\'t sold in the app.';

  @override
  String get optionsLower => 'options';

  @override
  String get listAnd => ' and ';

  @override
  String get productPhoto => 'Product photo';

  @override
  String productPhotoOf(int index, int total) {
    return 'Product photo $index of $total';
  }

  @override
  String get quantity => 'Quantity';

  @override
  String get sortBestSelling => 'Best selling';

  @override
  String get sortTopRated => 'Top rated';

  @override
  String get sortName => 'Name';

  @override
  String get searchProducts => 'Search products';

  @override
  String get onSale => 'On sale';

  @override
  String get loadingProducts => 'Loading products';

  @override
  String get noProductsTitle => 'No products found';

  @override
  String get noProductsMessage => 'Try another search or category.';

  @override
  String get loadingMoreProducts => 'Loading more products';

  @override
  String get loadingShop => 'Loading the shop';

  @override
  String get shopGettingReady => 'The shop is getting ready';

  @override
  String get newProductsSoon => 'New products will show up here soon.';

  @override
  String get newArrivals => 'New arrivals';

  @override
  String get bestSellers => 'Best sellers';

  @override
  String get offer => 'Offer';

  @override
  String wasPrice(String price) {
    return 'was $price';
  }

  @override
  String get inStock => 'In stock';

  @override
  String get onBackorder => 'Available on backorder';

  @override
  String get onSaleLower => 'on sale';

  @override
  String get outOfStockLower => 'out of stock';

  @override
  String get sale => 'Sale';

  @override
  String get fewer => 'Fewer';

  @override
  String quantityIs(int quantity) {
    return 'Quantity $quantity';
  }

  @override
  String get more => 'More';

  @override
  String get loadingAppointments => 'Loading appointments';

  @override
  String get noUpcomingAppointments => 'No upcoming appointments';

  @override
  String get noUpcomingAppointmentsMessage =>
      'Book a time and it shows up here.';

  @override
  String get bookAppointment => 'Book an appointment';

  @override
  String get noPastAppointments => 'No past appointments';

  @override
  String get upcoming => 'Upcoming';

  @override
  String get past => 'Past';

  @override
  String get cancelAppointmentTitle => 'Cancel this appointment?';

  @override
  String get cancelAppointment => 'Cancel appointment';

  @override
  String get appointmentCancelled => 'Your appointment is cancelled.';

  @override
  String get appointment => 'Appointment';

  @override
  String get loadingAppointment => 'Loading appointment';

  @override
  String get cancelling => 'Cancelling';

  @override
  String withStaff(String name) {
    return 'With $name';
  }

  @override
  String withStaffLower(String name) {
    return 'with $name';
  }

  @override
  String get contactToChange => 'To change or cancel it, please contact us.';

  @override
  String get tooLateToCancel =>
      'It\'s too late to cancel in the app. To change it, please contact us.';

  @override
  String cancelUpTo(String duration) {
    return 'You can cancel up to $duration before it starts.';
  }

  @override
  String get gettingReady => 'Getting ready';

  @override
  String get servicesSoon => 'Services you can book will show up here soon.';

  @override
  String get nextAppointment => 'Your next appointment';

  @override
  String get services => 'Services';

  @override
  String get ourTeam => 'Our team';

  @override
  String get loadingService => 'Loading service';

  @override
  String get appointmentBooked => 'Your appointment is booked.';

  @override
  String get slotTaken =>
      'This time was just taken. Please choose another one.';

  @override
  String get withTitle => 'With';

  @override
  String get chooseTime => 'Choose a time';

  @override
  String get findingTimes => 'Finding free times';

  @override
  String bookSlot(String time) {
    return 'Book $time';
  }

  @override
  String dayAtTime(String day, String time) {
    return '$day at $time';
  }

  @override
  String get noTimesThisWeek => 'No free times this week';

  @override
  String get tryAnotherWeek => 'Try another week, or anyone available.';

  @override
  String get nextWeek => 'Next week';

  @override
  String get previousWeek => 'Previous week';

  @override
  String get noTimesThisDay => 'No free times on this day.';

  @override
  String timesIn(String zone) {
    return 'Times are in $zone time.';
  }

  @override
  String get anyone => 'Anyone';

  @override
  String freeTimeCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count free times',
      one: '1 free time',
    );
    return '$_temp0';
  }

  @override
  String get noFreeTimes => 'no free times';

  @override
  String get confirmYourBooking => 'Confirm your booking';

  @override
  String get anyoneAvailable => 'Anyone available';

  @override
  String get noteForBusiness => 'Note for the business (optional)';

  @override
  String get confirmBooking => 'Confirm booking';

  @override
  String get loadingServices => 'Loading services';

  @override
  String get noServicesYet => 'No services yet';

  @override
  String get noMatches => 'No matches';

  @override
  String get servicesShowHere => 'Services you can book will show up here.';

  @override
  String get tryAnotherWord => 'Try another word.';

  @override
  String get searchServices => 'Search services';

  @override
  String get previewTitle => 'App preview';

  @override
  String get previewInstalledAppOnly => 'Available in the installed app';

  @override
  String get previewWebPageNote =>
      'Pages from the web, such as embedded videos and payment pages, open in the installed app.';

  @override
  String get previewOpenInNewTab => 'Open in a new tab';

  @override
  String get previewCheckoutNote =>
      'Checkout and payments work in the installed app. The preview never takes payments.';

  @override
  String get previewSignInNote =>
      'This is a preview. Sign in with your app\'s store review number and its code. The preview never sends sign-in codes.';

  @override
  String get previewSignInUnavailable =>
      'Signing in works in the installed app. Your app\'s server can\'t sign people in from the preview yet.';

  @override
  String get previewNoLink => 'Open the preview from your Yallapp dashboard.';

  @override
  String get previewExpired =>
      'This preview link has expired. Open the preview again from your Yallapp dashboard.';

  @override
  String get previewInvalid =>
      'This preview link isn\'t valid. Open the preview from your Yallapp dashboard.';

  @override
  String get previewUnreachable =>
      'The preview couldn\'t load. Check your connection and try again.';

  @override
  String get previewNoContent =>
      'Choose where your app\'s content comes from on the Website step of your setup, then reload the preview.';

  @override
  String previewApiBlocked(String origin) {
    return 'The preview couldn\'t reach your app\'s content. If your site or API blocks requests from other addresses, allow $origin. The guide Connect your own API in the Yallapp docs shows how.';
  }

  @override
  String get wordingBusiness => 'Business';

  @override
  String get wordingCustomer => 'Customer';
}
