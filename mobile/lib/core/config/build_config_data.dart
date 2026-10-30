/// The per-client build config (`docs/build-config.schema.json`) as Dart
/// constants. `tool/apply_config.dart` writes `lib/generated/build_config.g.dart`
/// with one [BuildConfigData] value.
library;

enum AppTemplate { classic, bold, minimal }

/// Which module the app is: an Academy (`lms`), a Store, Bookings, Real
/// estate (`real_estate`), News & blog (`news`), Events & tickets (`events`)
/// or Charity & donations (`donations`, 29). One app type per build.
enum AppType {
  lms,
  store,
  booking,
  realEstate,
  news,
  events,
  donations,

  /// 104 Delivery and courier companies.
  delivery,

  /// 105.1 Food delivery from many restaurants.
  food,

  /// 105.2 Ride hailing.
  rides,

  /// 105.4 Schools: students, parents and teachers.
  school;

  /// The value as the build config writes it (`app_type`).
  String get wire => this == realEstate ? 'real_estate' : name;
}

/// The kind of business on top of the app type (`vertical` in the build
/// config and in `Config`). It changes wording and defaults, never which
/// screens the app has. Null for most apps.
enum AppVertical {
  restaurant,
  clinic,
  fitness,
  charity,

  /// 84.1 Services and companies: the bookings wording.
  services,

  /// 105.3 An academy with many teachers.
  instructors,

  /// 105.9 A live taxi app (the rides module on the live map).
  taxi;

  /// The value as the build config and `Config` send it; anything unknown
  /// (a newer platform) is none.
  static AppVertical? fromWire(Object? value) {
    for (final vertical in values) {
      if (vertical.name == value) return vertical;
    }
    return null;
  }
}

/// 104.6 Who the build is for (`role` in the build config): the customers'
/// app, or a delivery company's second app for its couriers only.
enum AppRole { customer, courier, driver }

/// Firebase settings read from the client's google-services.json or
/// GoogleService-Info.plist by `tool/apply_config.dart`.
class FirebaseOptionsData {
  const FirebaseOptionsData({
    required this.apiKey,
    required this.appId,
    required this.messagingSenderId,
    required this.projectId,
    this.storageBucket,
    this.iosBundleId,
  });

  final String apiKey;
  final String appId;
  final String messagingSenderId;
  final String projectId;
  final String? storageBucket;
  final String? iosBundleId;
}

class BuildConfigData {
  const BuildConfigData({
    this.appType = AppType.lms,
    this.vertical,
    this.role = AppRole.customer,
    required this.appName,
    required this.shortName,
    required this.siteUrl,
    required this.androidPackage,
    required this.iosBundleId,
    required this.versionName,
    required this.versionCode,
    required this.primaryColor,
    required this.splashColor,
    required this.template,
    required this.font,
    this.apiBaseUrl,
    this.authBaseUrl,
    this.clientId,
    this.iconUrl,
    this.logoUrl,
    this.firebaseAndroid,
    this.firebaseIos,
    this.huaweiAppId,
    this.analyticsUrl,
    this.analyticsKey,
    this.appId,
    this.linkBaseUrl,
    this.siteLinkBaseUrl,
    this.crashReportUrl,
    this.sitePaths = const [],
  });

  final AppType appType;

  /// The kind of business; `Config.vertical` replaces it when the server
  /// sends one.
  final AppVertical? vertical;

  /// 104.6 [AppRole.courier]: the courier app, with the courier's screens only.
  final AppRole role;
  final String appName;
  final String shortName;

  /// The client's website, without a trailing slash.
  final String siteUrl;

  /// Where the Yallapp API is when it isn't the WordPress plugin's
  /// `<site_url>/wp-json/yallapp/v1`: a custom API or the hosted one.
  final String? apiBaseUrl;

  /// 34 An app on its own API that Yallapp signs people in to: Yallapp's
  /// hosted API for the app (`auth_base_url`). Sign-in, the account and its
  /// devices go there; everything else to [apiBaseUrl].
  final String? authBaseUrl;
  final String androidPackage;
  final String iosBundleId;
  final String versionName;
  final int versionCode;

  /// ARGB, for example 0xFF0E0D24.
  final int primaryColor;
  final int splashColor;
  final AppTemplate template;

  /// One of the bundled font families.
  final String font;
  final String? clientId;
  final String? iconUrl;
  final String? logoUrl;
  final FirebaseOptionsData? firebaseAndroid;
  final FirebaseOptionsData? firebaseIos;

  /// 36 The AppGallery Connect app ID from the client's
  /// agconnect-services.json: set when the build includes Huawei Push Kit,
  /// for Android phones without Google Play services.
  final String? huaweiAppId;

  /// 44 Where the app sends its usage statistics (`analytics.events_url`)
  /// and the app's analytics key (`analytics.key`, not a secret). Without
  /// them the app sends nothing; the app preview never has them.
  final String? analyticsUrl;
  final String? analyticsKey;

  /// 46 The platform's app ID and its links on Yallapp's link domain
  /// (`https://yallapp.com.tr/a/<app_id>`), a WordPress site's own
  /// (`<site>/a`), and where crash reports go (build config `links`). Null
  /// in builds made before Phase 46 and in development builds.
  final String? appId;
  final String? linkBaseUrl;
  final String? siteLinkBaseUrl;
  final String? crashReportUrl;

  /// 48 The paths of the WordPress site's own pages that open the app on
  /// Android (permalink bases like `/courses/`, build config
  /// `links.site_paths`). An incoming address under one of them that isn't
  /// one of the app's own screens is a page of the site: the app asks the
  /// site what it is (`GET /links/resolve`).
  final List<String> sitePaths;

  BuildConfigData copyWith({
    String? appName,
    String? siteUrl,
    bool clearApiBaseUrl = false,
    AppTemplate? template,
    AppType? appType,
    AppRole? role,
    String? analyticsUrl,
    String? analyticsKey,
    String? appId,
    String? linkBaseUrl,
    String? siteLinkBaseUrl,
    String? crashReportUrl,
    List<String>? sitePaths,
  }) => BuildConfigData(
    appType: appType ?? this.appType,
    vertical: vertical,
    role: role ?? this.role,
    appName: appName ?? this.appName,
    shortName: shortName,
    siteUrl: siteUrl ?? this.siteUrl,
    apiBaseUrl: clearApiBaseUrl ? null : apiBaseUrl,
    authBaseUrl: clearApiBaseUrl ? null : authBaseUrl,
    androidPackage: androidPackage,
    iosBundleId: iosBundleId,
    versionName: versionName,
    versionCode: versionCode,
    primaryColor: primaryColor,
    splashColor: splashColor,
    template: template ?? this.template,
    font: font,
    clientId: clientId,
    iconUrl: iconUrl,
    logoUrl: logoUrl,
    firebaseAndroid: firebaseAndroid,
    firebaseIos: firebaseIos,
    huaweiAppId: huaweiAppId,
    analyticsUrl: analyticsUrl ?? this.analyticsUrl,
    analyticsKey: analyticsKey ?? this.analyticsKey,
    appId: appId ?? this.appId,
    linkBaseUrl: linkBaseUrl ?? this.linkBaseUrl,
    siteLinkBaseUrl: siteLinkBaseUrl ?? this.siteLinkBaseUrl,
    crashReportUrl: crashReportUrl ?? this.crashReportUrl,
    sitePaths: sitePaths ?? this.sitePaths,
  );
}
