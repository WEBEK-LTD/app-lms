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
  return base.copyWith(siteUrl: normalizeSiteUrl(override));
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
