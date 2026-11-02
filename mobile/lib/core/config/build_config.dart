import '../../generated/build_config.g.dart';
import 'build_config_data.dart';

export 'build_config_data.dart';

/// `--dart-define=YALLAPP_SITE_URL=https://staging.example.com` points a
/// development build at another site without regenerating the config.
const _siteUrlOverride = String.fromEnvironment('YALLAPP_SITE_URL');

/// The build config this app was built with, plus development overrides.
BuildConfigData resolveBuildConfig([BuildConfigData base = buildConfig]) {
  final override = _siteUrlOverride.trim();
  if (override.isEmpty) return base;
  return base.copyWith(
    siteUrl: normalizeSiteUrl(override),
    clearApiBaseUrl: true,
  );
}

/// Removes trailing slashes so paths can be appended safely.
String normalizeSiteUrl(String url) {
  var value = url.trim();
  while (value.endsWith('/')) {
    value = value.substring(0, value.length - 1);
  }
  return value;
}

/// The REST base for a site: `<site_url>/wp-json/yallapp/v1`.
String apiBaseUrl(String siteUrl) =>
    '${normalizeSiteUrl(siteUrl)}/wp-json/yallapp/v1';

/// The API this build talks to: its `api_base_url`, or the WordPress
/// plugin's on its site. A development site override always uses the plugin.
String apiUrlOf(BuildConfigData build) {
  final custom = build.apiBaseUrl;
  return custom == null || custom.trim().isEmpty
      ? apiBaseUrl(build.siteUrl)
      : normalizeSiteUrl(custom);
}

/// 104.8.4 The build a company's courier screens run as inside Yallapp
/// Courier: Yallapp Courier's own build pointed at the company's hosted API
/// (`api_base_url` from the Courier API's `GET /companies`), under the
/// company's app ID, name, logo and colour. The courier's screens only, as
/// in a company's own courier app (104.6).
BuildConfigData courierCompanyBuild(
  BuildConfigData hub, {
  required String appId,
  required String name,
  required String apiBaseUrl,
  String? logoUrl,
  int? primaryColor,
}) {
  final api = normalizeSiteUrl(apiBaseUrl);
  final origin = Uri.tryParse(api);
  return BuildConfigData(
    appType: AppType.delivery,
    role: AppRole.courier,
    appName: name,
    shortName: hub.shortName,
    siteUrl: origin == null || !origin.hasAuthority ? api : origin.origin,
    apiBaseUrl: api,
    androidPackage: hub.androidPackage,
    iosBundleId: hub.iosBundleId,
    versionName: hub.versionName,
    versionCode: hub.versionCode,
    primaryColor: primaryColor ?? hub.primaryColor,
    splashColor: hub.splashColor,
    template: hub.template,
    font: hub.font,
    clientId: hub.clientId,
    iconUrl: hub.iconUrl,
    logoUrl: logoUrl,
    firebaseAndroid: hub.firebaseAndroid,
    firebaseIos: hub.firebaseIos,
    huaweiAppId: hub.huaweiAppId,
    appId: appId,
  );
}
