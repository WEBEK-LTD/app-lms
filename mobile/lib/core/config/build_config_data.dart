/// The per-client build config (`docs/build-config.schema.json`) as Dart
/// constants. `tool/apply_config.dart` writes `lib/generated/build_config.g.dart`
/// with one [BuildConfigData] value.
library;

enum AppTemplate { classic, bold, minimal }

/// Which module the app is: an Academy (`lms`), a Store, Bookings or Real
/// estate (`real_estate`). One app type per build.
enum AppType { lms, store, booking, realEstate }

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
    this.clientId,
    this.iconUrl,
    this.logoUrl,
    this.firebaseAndroid,
    this.firebaseIos,
  });

  final AppType appType;
  final String appName;
  final String shortName;

  /// The client's website, without a trailing slash.
  final String siteUrl;

  /// Where the Yallapp API is when it isn't the WordPress plugin's
  /// `<site_url>/wp-json/yallapp/v1`: a custom API or the hosted one.
  final String? apiBaseUrl;
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

  BuildConfigData copyWith({
    String? siteUrl,
    bool clearApiBaseUrl = false,
    AppTemplate? template,
    AppType? appType,
  }) => BuildConfigData(
    appType: appType ?? this.appType,
    appName: appName,
    shortName: shortName,
    siteUrl: siteUrl ?? this.siteUrl,
    apiBaseUrl: clearApiBaseUrl ? null : apiBaseUrl,
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
  );
}
