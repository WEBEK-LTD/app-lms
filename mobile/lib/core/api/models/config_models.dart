import 'billing_models.dart';
import 'bookings_models.dart';
import '../../config/build_config_data.dart';
import '../../l10n/locales.dart';
import 'catalog_models.dart';
import 'chat_models.dart';
import 'event_models.dart';
import 'donation_models.dart';
import 'delivery_models.dart';
import 'food_models.dart';
import 'rides_models.dart';
import 'school_models.dart';
import 'teachers_models.dart';
import 'json.dart';
import 'learning_models.dart';
import 'listing_models.dart';
import 'news_models.dart';
import 'store_models.dart';

/// `GET /config`: branding, detected features and app rules.
class AppConfig {
  const AppConfig({
    required this.site,
    required this.branding,
    required this.features,
    required this.auth,
    required this.purchases,
    required this.content,
    required this.app,
    this.store,
    this.bookings,
    this.appearance,
    this.languages,
    this.listings,
    this.news,
    this.events,
    this.donations,
    this.delivery,
    this.food,
    this.rides,
    this.instructors,
    this.school,
    this.vertical,
    this.shareBaseUrl,
    this.chat,
    this.storeBilling,
    this.switches = const {},
  });

  factory AppConfig.fromJson(Json json) => AppConfig(
    site: SiteInfo.fromJson(asJson(json['site'], 'site')),
    branding: RemoteBranding.fromJson(asJson(json['branding'], 'branding')),
    features: SiteFeatures.fromJson(asJson(json['features'], 'features')),
    auth: AuthRules.fromJson(asJson(json['auth'], 'auth')),
    purchases: PurchaseRules.fromJson(asJson(json['purchases'], 'purchases')),
    content: ContentRules.fromJson(asJson(json['content'], 'content')),
    app: AppRules.fromJson(asJson(json['app'], 'app')),
    store: optObject(json, 'store', StoreConfig.fromJson),
    bookings: optObject(json, 'bookings', BookingsConfig.fromJson),
    appearance: optObject(json, 'appearance', Appearance.fromJson),
    languages: optObject(json, 'languages', Languages.fromJson),
    listings: optObject(json, 'listings', ListingsConfig.fromJson),
    news: optObject(json, 'news', NewsConfig.fromJson),
    events: optObject(json, 'events', EventsConfig.fromJson),
    donations: optObject(json, 'donations', DonationsConfig.fromJson),
    delivery: optObject(json, 'delivery', DeliveryConfig.fromJson),
    food: optObject(json, 'food', FoodConfig.fromJson),
    rides: optObject(json, 'rides', RidesConfig.fromJson),
    instructors: optObject(json, 'instructors', InstructorsConfig.fromJson),
    school: optObject(json, 'school', SchoolConfig.fromJson),
    vertical: AppVertical.fromWire(json['vertical']),
    shareBaseUrl: _shareBase(json['links']),
    chat: _chat(json['chat']),
    storeBilling: _storeBilling(json['store_billing']),
    switches: _switches(json['switches']),
  );

  /// 83.3 Whether the Yallapp team left a module or new feature on for this
  /// app: on unless `Config.switches` says false (older servers send none).
  bool switchOn(String name) => switches[name] != false;

  static Map<String, bool> _switches(Object? value) => {
    if (value is Map)
      for (final MapEntry(:key, :value) in value.entries)
        if (key is String && value is bool) key: value,
  };

  /// 53 What the app protects from screenshots and screen recording. An
  /// older server without `app.screen_protection` protects lessons when
  /// `content.block_screen_capture` says so.
  ScreenProtection get screenProtection =>
      app.screenProtection ??
      (content.blockScreenCapture
          ? ScreenProtection.content
          : ScreenProtection.off);

  /// 77 `Config.chat`, when its address is a web address the app can call.
  static ChatConfig? _chat(Object? value) {
    if (value is! Map) return null;
    try {
      final chat = ChatConfig.fromJson(asJson(value, 'chat'));
      final uri = Uri.tryParse(chat.baseUrl);
      return uri != null && uri.hasScheme && uri.host.isNotEmpty ? chat : null;
    } on FormatException {
      return null;
    }
  }

  /// 100 `Config.store_billing`, when its address is a web address the app
  /// can call.
  static StoreBillingConfig? _storeBilling(Object? value) {
    if (value is! Map) return null;
    try {
      final billing = StoreBillingConfig.fromJson(
        asJson(value, 'store_billing'),
      );
      final uri = Uri.tryParse(billing.baseUrl);
      return uri != null && uri.hasScheme && uri.host.isNotEmpty
          ? billing
          : null;
    } on FormatException {
      return null;
    }
  }

  /// `Config.links.share_base_url` when it is an https address.
  static String? _shareBase(Object? links) {
    if (links is! Map) return null;
    final value = links['share_base_url'];
    if (value is! String) return null;
    final uri = Uri.tryParse(value);
    return uri != null && uri.scheme == 'https' && uri.host.isNotEmpty
        ? value.replaceAll(RegExp(r'/+$'), '')
        : null;
  }

  /// 83.3 The team's switches for the app's modules and new features.
  final Map<String, bool> switches;

  final SiteInfo site;
  final RemoteBranding branding;
  final SiteFeatures features;
  final AuthRules auth;
  final PurchaseRules purchases;
  final ContentRules content;
  final AppRules app;

  /// The shop's settings, when WooCommerce is active (Store apps).
  final StoreConfig? store;

  /// The booking plugin's rules, when one is active (Bookings apps).
  final BookingsConfig? bookings;

  /// The look set in the client dashboard; `null` keeps the build's look.
  final Appearance? appearance;

  /// The languages the client turned on; `null` on older servers means
  /// English only.
  final Languages? languages;

  /// The office's settings (Real estate apps).
  final ListingsConfig? listings;

  /// How articles show (News & blog apps, 23).
  final NewsConfig? news;

  /// Events & tickets apps' settings (28).
  final EventsConfig? events;

  /// How donations work (Charity & donations apps, 29).
  final DonationsConfig? donations;

  /// 104 How a delivery company prices, takes payment and follows parcels.
  final DeliveryConfig? delivery;

  /// 105.1 How a food delivery company takes orders from its restaurants.
  final FoodConfig? food;

  /// 105.2 How a ride company prices, matches and cancels rides.
  final RidesConfig? rides;

  /// 105.3 An academy with many teachers: its teachers, and applying to teach.
  final InstructorsConfig? instructors;

  /// 105.4 A school: its time zone, term, and whether fees are paid by card.
  final SchoolConfig? school;

  /// The kind of business (wording and defaults only); null for none, on
  /// older servers, and for values this app doesn't know.
  final AppVertical? vertical;

  /// 46 What Share buttons put before `/<kind>/<id>` (`Config.links`):
  /// `<site>/a` on WordPress, else Yallapp's link domain. Null on older
  /// servers: the build config's link domain is used.
  final String? shareBaseUrl;

  /// 77 Chat with the business (and an academy's course groups); null when
  /// the plan has no chat, the owner turned it off, or on older servers.
  final ChatConfig? chat;

  /// 100 Courses and memberships bought through Google Play Billing and the
  /// App Store; null when the app doesn't sell in the app (Starter, stores
  /// not connected) and on older servers.
  final StoreBillingConfig? storeBilling;
}

/// `Config.languages`. Codes the app doesn't ship are dropped.
class Languages {
  const Languages({
    required this.defaultCode,
    required this.available,
    this.list = const [],
  });

  /// 43 Any language the app's system widgets come in (`appLocales`), in
  /// the owner's order; codes the app can't show are left out.
  factory Languages.fromJson(Json json) {
    final available = [
      for (final code in stringList(json, 'available'))
        if (appLocaleOf(code) != null) code,
    ];
    final fallback = optString(json, 'default');
    final defaultCode = fallback != null && available.contains(fallback)
        ? fallback
        : (available.isEmpty ? 'en' : available.first);
    final details = <String, AppLanguage>{};
    final raw = json['list'];
    if (raw is List) {
      for (final item in raw) {
        final language = item is Map
            ? AppLanguage.tryParse(asJson(item))
            : null;
        if (language != null) details[language.code] = language;
      }
    }
    final codes = available.isEmpty ? [defaultCode] : available;
    return Languages(
      defaultCode: defaultCode,
      available: codes,
      list: [for (final code in codes) details[code] ?? AppLanguage.of(code)],
    );
  }

  /// The interface languages this app ships translations for.
  static const shippedLanguages = ['en', 'ar', 'tr'];

  final String defaultCode;
  final List<String> available;

  /// 43 Each available language's names, direction and string pack, in the
  /// same order. Built from the app's own list when the server sends none.
  final List<AppLanguage> list;

  AppLanguage language(String code) {
    for (final language in list) {
      if (language.code == code) return language;
    }
    return AppLanguage.of(code);
  }

  Json toJson() => {
    'default': defaultCode,
    'available': available,
    'list': [for (final l in list) l.toJson()],
  };
}

/// 43 `AppLanguage`: a language's names, direction and the owner's string
/// pack (null without one).
class AppLanguage {
  const AppLanguage({
    required this.code,
    required this.name,
    required this.nativeName,
    required this.rtl,
    this.packUrl,
    this.packVersion,
  });

  /// From the app's own list, without a pack.
  factory AppLanguage.of(String code) {
    final locale = appLocaleOf(code);
    return AppLanguage(
      code: code,
      name: locale?.name ?? code,
      nativeName: locale?.nativeName ?? code,
      rtl: rtlLanguageCodes.contains(code),
    );
  }

  static AppLanguage? tryParse(Json json) {
    final code = optString(json, 'code');
    if (code == null || appLocaleOf(code) == null) return null;
    final own = AppLanguage.of(code);
    final strings = json['strings'] is Map ? asJson(json['strings']) : null;
    final url = strings == null ? null : optString(strings, 'url');
    final version = strings == null ? null : optString(strings, 'version');
    final direction = optString(json, 'direction');
    return AppLanguage(
      code: code,
      name: optString(json, 'name') ?? own.name,
      nativeName: optString(json, 'native_name') ?? own.nativeName,
      rtl: direction == null ? own.rtl : direction == 'rtl',
      packUrl: url != null && version != null ? url : null,
      packVersion: url != null && version != null ? version : null,
    );
  }

  final String code;
  final String name;

  /// For the language picker.
  final String nativeName;
  final bool rtl;

  /// Where the owner's strings in this language are, and their version.
  final String? packUrl;
  final String? packVersion;

  Json toJson() => {
    'code': code,
    'name': name,
    'native_name': nativeName,
    'direction': rtl ? 'rtl' : 'ltr',
    'strings': packUrl == null
        ? null
        : {'url': packUrl, 'version': packVersion},
  };
}

class SiteInfo {
  const SiteInfo({
    required this.name,
    required this.url,
    this.termsUrl,
    this.privacyUrl,
    this.supportWhatsapp,
    this.supportEmail,
  });

  factory SiteInfo.fromJson(Json json) => SiteInfo(
    name: reqString(json, 'name'),
    url: reqString(json, 'url'),
    termsUrl: optString(json, 'terms_url'),
    privacyUrl: optString(json, 'privacy_url'),
    supportWhatsapp: optString(json, 'support_whatsapp'),
    supportEmail: optString(json, 'support_email'),
  );

  final String name;
  final String url;
  final String? termsUrl;
  final String? privacyUrl;
  final String? supportWhatsapp;

  /// Where users write to the app's owner. Older servers don't send it.
  final String? supportEmail;

  /// How users reach the app's owner, from this config.
  OwnerContact get contact =>
      OwnerContact(name: name, whatsapp: supportWhatsapp, email: supportEmail);
}

/// `OwnerContact`: how app users reach the app's owner (the business behind
/// the app), sent with `license_inactive`, `account_suspended` and
/// `app_user_limit`. The app offers WhatsApp first, then email.
class OwnerContact {
  const OwnerContact({required this.name, this.whatsapp, this.email});

  factory OwnerContact.fromJson(Json json) => OwnerContact(
    name: optString(json, 'name') ?? '',
    whatsapp: _blankToNull(optString(json, 'whatsapp')),
    email: _blankToNull(optString(json, 'email')),
  );

  final String name;
  final String? whatsapp;
  final String? email;

  /// Whether there is a way to reach the owner.
  bool get reachable => whatsapp != null || email != null;

  Json toJson() => {'name': name, 'whatsapp': whatsapp, 'email': email};

  static String? _blankToNull(String? value) =>
      (value == null || value.trim().isEmpty) ? null : value.trim();
}

class RemoteBranding {
  const RemoteBranding({required this.primaryColor, this.logoUrl});

  factory RemoteBranding.fromJson(Json json) => RemoteBranding(
    primaryColor: reqString(json, 'primary_color'),
    logoUrl: optString(json, 'logo_url'),
  );

  final String primaryColor;
  final String? logoUrl;
}

enum LmsKind {
  tutor,
  learndash,
  learnpress,
  lifterlms,
  masterstudy,
  sensei,
  masteriyo,
  unknown,
}

class SiteFeatures {
  const SiteFeatures({
    required this.lms,
    required this.lmsVersion,
    required this.pro,
    required this.certificates,
    required this.quizzes,
    required this.wishlist,
    required this.reviews,
    required this.qna,
    required this.push,
    this.orders = false,
    this.offline = false,
    this.downloads = false,
    this.memberships = false,
  });

  factory SiteFeatures.fromJson(Json json) => SiteFeatures(
    lms: json['lms'] == null
        ? null
        : enumFrom(LmsKind.values, json['lms'], LmsKind.unknown),
    lmsVersion: reqString(json, 'lms_version'),
    pro: reqBool(json, 'pro'),
    certificates: reqBool(json, 'certificates'),
    quizzes: reqBool(json, 'quizzes'),
    wishlist: reqBool(json, 'wishlist'),
    reviews: reqBool(json, 'reviews'),
    qna: reqBool(json, 'qna'),
    push: reqBool(json, 'push'),
    orders: boolOr(json, 'orders', false),
    offline: boolOr(json, 'offline', false),
    downloads: boolOr(json, 'downloads', false),
    memberships: boolOr(json, 'memberships', false),
  );

  /// Null on a site without an LMS (a Store app).
  final LmsKind? lms;
  final String lmsVersion;
  final bool pro;
  final bool certificates;
  final bool quizzes;
  final bool wishlist;
  final bool reviews;
  final bool qna;
  final bool push;

  /// Whether the site sells (courses or products), so customers have orders.
  /// Older plugins don't send it.
  final bool orders;

  /// Offline mode, when the app's plan includes it: the app keeps what the
  /// user last saw and shows it without a connection.
  final bool offline;

  /// 45 Students can save lessons and courses on the phone to watch and read
  /// offline: offline mode in the plan and the owner turned downloads on.
  final bool downloads;

  /// 90.3 The website gives access through memberships, subscriptions or
  /// groups: the account lists the student's (`GET /me/subscriptions`).
  final bool memberships;
}

enum SignupField { name, email, city }

/// 18 How people sign in: a code to their phone, or by email.
enum SignInMethod { phone, email }

/// 18 How email sign-in works on this server: a code by email (the hosted
/// API) or the account's password (a WordPress site).
enum EmailSignIn { code, password }

class AuthRules {
  const AuthRules({
    required this.signupAllowed,
    required this.signupFields,
    required this.defaultCountryCode,
    this.previewSignIn = false,
    this.methods = const [SignInMethod.phone],
    this.emailSignIn = EmailSignIn.code,
    this.passwordResetUrl,
  });

  factory AuthRules.fromJson(Json json) {
    final methods = [
      for (final method in SignInMethod.values)
        if (stringList(json, 'methods').contains(method.name)) method,
    ];
    return AuthRules(
      signupAllowed: reqBool(json, 'signup_allowed'),
      signupFields: parseSignupFields(json, 'signup_fields'),
      defaultCountryCode: reqString(json, 'default_country_code'),
      previewSignIn: boolOr(json, 'preview_sign_in', false),
      // Missing on older servers: phone only.
      methods: methods.isEmpty ? const [SignInMethod.phone] : methods,
      emailSignIn: optString(json, 'email_sign_in') == 'password'
          ? EmailSignIn.password
          : EmailSignIn.code,
      passwordResetUrl: optString(json, 'password_reset_url'),
    );
  }

  final bool signupAllowed;
  final List<SignupField> signupFields;
  final String defaultCountryCode;

  /// Phone, email or both, in the order the server sends them.
  final List<SignInMethod> methods;
  final EmailSignIn emailSignIn;

  /// With [EmailSignIn.password]: the website's page for a forgotten password.
  final String? passwordResetUrl;

  /// The server signs in only the store review number when the app preview
  /// asks with `preview: true` (and never sends a code). Missing on older
  /// servers: the preview then doesn't offer sign-in.
  final bool previewSignIn;
}

List<SignupField> parseSignupFields(Json json, String key) => [
  for (final wire in stringList(json, key))
    for (final field in SignupField.values)
      if (field.name == wire) field,
];

enum CheckoutOpensIn { inApp, browser }

class PurchaseRules {
  const PurchaseRules({
    required this.enrollButton,
    required this.freeEnrollment,
    this.checkoutOpensIn,
  });

  factory PurchaseRules.fromJson(Json json) => PurchaseRules(
    enrollButton: reqBool(json, 'enroll_button'),
    freeEnrollment: reqBool(json, 'free_enrollment'),
    checkoutOpensIn: json['checkout_opens_in'] == null
        ? null
        : enumFromSnake(
            CheckoutOpensIn.values,
            json['checkout_opens_in'],
            CheckoutOpensIn.inApp,
          ),
  );

  final bool enrollButton;
  final bool freeEnrollment;
  final CheckoutOpensIn? checkoutOpensIn;
}

enum WatermarkMode { off, phone, name, nameAndPhone }

enum EmbedHeightMode { auto, fitScreen, asSet }

class ContentRules {
  const ContentRules({
    required this.blockScreenCapture,
    required this.watermark,
    required this.embedFullscreenButton,
    required this.embedHeight,
    this.codeHighlighting = true,
    this.requiredWatchPercent,
  });

  factory ContentRules.fromJson(Json json) => ContentRules(
    blockScreenCapture: reqBool(json, 'block_screen_capture'),
    watermark: enumFromSnake(
      WatermarkMode.values,
      json['watermark'],
      WatermarkMode.off,
    ),
    embedFullscreenButton: reqBool(json, 'embed_fullscreen_button'),
    embedHeight: enumFromSnake(
      EmbedHeightMode.values,
      json['embed_height'],
      EmbedHeightMode.auto,
    ),
    codeHighlighting: boolOr(json, 'code_highlighting', true),
    requiredWatchPercent: optInt(json, 'required_watch_percent'),
  );

  final bool blockScreenCapture;
  final WatermarkMode watermark;
  final bool embedFullscreenButton;
  final EmbedHeightMode embedHeight;
  final bool codeHighlighting;
  final int? requiredWatchPercent;
}

/// 53 What the app protects from screenshots and screen recording
/// (`Config.app.screen_protection`): nothing, course content only (lessons,
/// quizzes, their attachments and videos) or every screen.
enum ScreenProtection { off, content, app }

class AppRules {
  const AppRules({
    required this.updateRequired,
    required this.maintenance,
    this.maintenanceMessage,
    this.reviewPrompt = true,
    this.crashReports = true,
    this.screenProtection,
    this.hideVideoBranding = false,
  });

  factory AppRules.fromJson(Json json) => AppRules(
    updateRequired: reqBool(json, 'update_required'),
    maintenance: reqBool(json, 'maintenance'),
    maintenanceMessage: optString(json, 'maintenance_message'),
    reviewPrompt: boolOr(json, 'review_prompt', true),
    crashReports: boolOr(json, 'crash_reports', true),
    screenProtection: enumOrNull(
      ScreenProtection.values,
      json['screen_protection'],
    ),
    hideVideoBranding: boolOr(json, 'hide_video_branding', false),
  );

  final bool updateRequired;
  final bool maintenance;
  final String? maintenanceMessage;

  /// 46 The owner lets the app ask for a rating with the store's own
  /// prompt after good moments. Missing on older servers: true.
  final bool reviewPrompt;

  /// 46 The owner lets the app send crash reports. Missing: true.
  final bool crashReports;

  /// 53 The owner's screen protection; null on older servers (see
  /// [AppConfig.screenProtection]).
  final ScreenProtection? screenProtection;

  /// 72 The owner chose to hide the video sites' own players (their
  /// branding and controls), at their own risk. Missing: false, each site's
  /// normal player.
  final bool hideVideoBranding;
}

enum AppearanceMode { system, light, dark }

enum CornerStyle { sharp, soft, round }

enum CardStyle { flat, outlined, elevated }

/// `Config.appearance`. Every value is optional here: a missing or unknown
/// value means "use the build's default", so newer dashboards never break
/// older apps.
class Appearance {
  const Appearance({
    this.template,
    this.themeMode,
    this.userCanChangeMode = true,
    this.secondaryColor,
    this.font,
    this.fontFamily,
    this.fontFiles = const [],
    this.arabicFont,
    this.arabicFontFiles = const [],
    this.corners,
    this.cards,
    this.primaryColor,
    this.logoUrl,
    this.header,
  });

  factory Appearance.fromJson(Json json) => Appearance(
    template: enumOrNull(AppTemplate.values, json['template']),
    themeMode: enumOrNull(AppearanceMode.values, json['theme_mode']),
    userCanChangeMode: boolOr(json, 'user_can_change_mode', true),
    secondaryColor: optString(json, 'secondary_color'),
    font: optString(json, 'font'),
    fontFamily: optString(json, 'font_family'),
    fontFiles: listOf(json, 'font_files', FontFileRef.fromJson),
    arabicFont: optString(json, 'arabic_font'),
    arabicFontFiles: listOf(json, 'arabic_font_files', FontFileRef.fromJson),
    corners: enumOrNull(CornerStyle.values, json['corners']),
    cards: enumOrNull(CardStyle.values, json['cards']),
    primaryColor: optString(json, 'primary_color'),
    logoUrl: optString(json, 'logo_url'),
    header: json['header'] is Map
        ? AppHeader.fromJson(asJson(json['header'], 'header'))
        : null,
  );

  final AppTemplate? template;
  final AppearanceMode? themeMode;
  final bool userCanChangeMode;
  final String? secondaryColor;

  /// One of the fonts bundled with the app: with [fontFamily], the one shown
  /// until that font is on the phone.
  final String? font;

  /// 97.1 Any free font the owner chose, downloaded once from [fontFiles].
  final String? fontFamily;
  final List<FontFileRef> fontFiles;

  /// 97.1 The font of Arabic text; missing: Readex Pro, bundled.
  final String? arabicFont;
  final List<FontFileRef> arabicFontFiles;
  final CornerStyle? corners;
  final CardStyle? cards;

  /// 97.3 The Figma look's main color and logo, over `Config.branding`'s.
  final String? primaryColor;
  final String? logoUrl;

  /// 101 The header of the pages in the bottom tabs; null: the template's.
  final AppHeader? header;
}

/// 101 The header's layouts (`AppHeader.layout`).
enum HeaderLayout { title, centered, logo, search }

/// 101 The header's buttons (`AppHeader.icons`).
enum HeaderIcon { search, cart, notifications, chat, account }

/// 101 `AppHeader`: the top of the pages in the bottom tabs, chosen in the
/// dashboard. An unknown layout falls back to [HeaderLayout.title]; unknown
/// buttons are left out.
class AppHeader {
  const AppHeader({required this.layout, this.icons = const []});

  factory AppHeader.fromJson(Json json) {
    final icons = <HeaderIcon>[];
    final raw = json['icons'];
    for (final wire in raw is List ? raw : const []) {
      final icon = enumOrNull(HeaderIcon.values, wire);
      if (icon != null && !icons.contains(icon)) icons.add(icon);
    }
    return AppHeader(
      layout:
          enumOrNull(HeaderLayout.values, json['layout']) ?? HeaderLayout.title,
      icons: icons.take(4).toList(),
    );
  }

  final HeaderLayout layout;

  /// From the start of the bar.
  final List<HeaderIcon> icons;
}

/// 97.1 `FontFile`: a font file on Yallapp, for one weight or (null) all.
class FontFileRef {
  const FontFileRef({required this.url, this.weight});

  factory FontFileRef.fromJson(Json json) => FontFileRef(
    url: optString(json, 'url') ?? '',
    weight: optInt(json, 'weight'),
  );

  final String url;
  final int? weight;
}

enum HomeSectionType {
  banner,
  continueLearning,
  categories,
  featuredCourses,
  latestCourses,
  unknown,
}

/// One block of `GET /home`, in the order chosen in the plugin settings.
class HomeSection {
  const HomeSection({
    required this.type,
    this.title,
    this.banner,
    this.course,
    this.categories = const [],
    this.courses = const [],
  });

  factory HomeSection.fromJson(Json json) => HomeSection(
    type: enumFromSnake(
      HomeSectionType.values,
      json['type'],
      HomeSectionType.unknown,
    ),
    title: optString(json, 'title'),
    banner: optObject(json, 'banner', HomeBanner.fromJson),
    course: optObject(json, 'course', MyCourse.fromJson),
    categories: listOf(json, 'categories', Category.fromJson),
    courses: listOf(json, 'courses', CourseSummary.fromJson),
  );

  final HomeSectionType type;
  final String? title;
  final HomeBanner? banner;
  final MyCourse? course;
  final List<Category> categories;
  final List<CourseSummary> courses;
}

class HomeBanner {
  const HomeBanner({this.imageUrl, this.linkCourseId});

  factory HomeBanner.fromJson(Json json) => HomeBanner(
    imageUrl: optString(json, 'image_url'),
    linkCourseId: optInt(json, 'link_course_id'),
  );

  final String? imageUrl;
  final int? linkCourseId;
}
