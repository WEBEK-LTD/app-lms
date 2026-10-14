import 'bookings_models.dart';
import '../../config/build_config_data.dart';
import 'catalog_models.dart';
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
    this.vertical,
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
    vertical: AppVertical.fromWire(json['vertical']),
  );

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

  /// The kind of business (wording and defaults only); null for none, on
  /// older servers, and for values this app doesn't know.
  final AppVertical? vertical;
}

/// `Config.languages`. Codes the app doesn't ship are dropped.
class Languages {
  const Languages({required this.defaultCode, required this.available});

  factory Languages.fromJson(Json json) {
    final available = [
      for (final code in stringList(json, 'available'))
        if (shippedLanguages.contains(code)) code,
    ];
    final fallback = optString(json, 'default');
    final defaultCode = shippedLanguages.contains(fallback)
        ? fallback!
        : (available.isEmpty ? 'en' : available.first);
    return Languages(
      defaultCode: defaultCode,
      available: available.isEmpty ? [defaultCode] : available,
    );
  }

  /// The interface languages this app ships translations for.
  static const shippedLanguages = ['en', 'ar', 'tr'];

  final String defaultCode;
  final List<String> available;
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

class AppRules {
  const AppRules({
    required this.updateRequired,
    required this.maintenance,
    this.maintenanceMessage,
  });

  factory AppRules.fromJson(Json json) => AppRules(
    updateRequired: reqBool(json, 'update_required'),
    maintenance: reqBool(json, 'maintenance'),
    maintenanceMessage: optString(json, 'maintenance_message'),
  );

  final bool updateRequired;
  final bool maintenance;
  final String? maintenanceMessage;
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
    this.corners,
    this.cards,
  });

  factory Appearance.fromJson(Json json) => Appearance(
    template: enumOrNull(AppTemplate.values, json['template']),
    themeMode: enumOrNull(AppearanceMode.values, json['theme_mode']),
    userCanChangeMode: boolOr(json, 'user_can_change_mode', true),
    secondaryColor: optString(json, 'secondary_color'),
    font: optString(json, 'font'),
    corners: enumOrNull(CornerStyle.values, json['corners']),
    cards: enumOrNull(CardStyle.values, json['cards']),
  );

  final AppTemplate? template;
  final AppearanceMode? themeMode;
  final bool userCanChangeMode;
  final String? secondaryColor;
  final String? font;
  final CornerStyle? corners;
  final CardStyle? cards;
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
