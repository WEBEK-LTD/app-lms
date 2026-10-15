import 'build_config.dart';

/// The fonts bundled with the app (`pubspec.yaml`), as the build config names
/// them. Any other value falls back to the first.
const bundledFonts = [
  'Bricolage Grotesque',
  'Plus Jakarta Sans',
  'Outfit',
  'Manrope',
  'DM Sans',
  'Lexend',
];

/// Reads a build config (`docs/build-config.schema.json`) at run time. Used by
/// the app preview on the web, which gets the config from the platform
/// instead of the constants `tool/apply_config.dart` compiles into a build.
/// Missing or unknown values fall back to the schema's defaults, so a setup
/// that isn't finished still opens.
BuildConfigData buildConfigFromJson(Map<String, dynamic> json) {
  String text(Object? value, String fallback) {
    final s = value is String ? value.trim() : '';
    return s.isEmpty ? fallback : s;
  }

  final branding = json['branding'] is Map
      ? Map<String, dynamic>.from(json['branding'] as Map)
      : const <String, dynamic>{};
  final appName = text(json['app_name'], 'Your app');
  final apiBase = text(json['api_base_url'], '');
  final authBase = text(json['auth_base_url'], '');
  final font = text(branding['font'], bundledFonts.first);
  return BuildConfigData(
    appType: switch (json['app_type']) {
      'store' => AppType.store,
      'booking' => AppType.booking,
      'real_estate' => AppType.realEstate,
      'news' => AppType.news,
      'events' => AppType.events,
      'donations' => AppType.donations,
      _ => AppType.lms,
    },
    vertical: AppVertical.fromWire(json['vertical']),
    appName: appName,
    shortName: text(json['short_name'], appName),
    siteUrl: normalizeSiteUrl(text(json['site_url'], '')),
    apiBaseUrl: apiBase.isEmpty ? null : normalizeSiteUrl(apiBase),
    authBaseUrl: authBase.isEmpty ? null : normalizeSiteUrl(authBase),
    androidPackage: text(json['android_package'], 'com.example.preview'),
    iosBundleId: text(json['ios_bundle_id'], 'com.example.preview'),
    versionName: text(json['version_name'], '1.0.0'),
    versionCode: json['version_code'] is int ? json['version_code'] as int : 1,
    primaryColor: argbOf(branding['primary_color'], 0xFF0E0D24),
    splashColor: argbOf(branding['splash_color'], 0xFFF4EFE6),
    template: switch (branding['template']) {
      'bold' => AppTemplate.bold,
      'minimal' => AppTemplate.minimal,
      _ => AppTemplate.classic,
    },
    font: bundledFonts.contains(font) ? font : bundledFonts.first,
    clientId: json['client_id'] is String ? json['client_id'] as String : null,
    iconUrl: _url(branding['icon_url']),
    logoUrl: _url(branding['logo_url']),
  );
}

/// `#0E0D24` as ARGB (`0xFF0E0D24`), or [fallback].
int argbOf(Object? hex, int fallback) {
  final match = RegExp(r'^#([0-9A-Fa-f]{6})$').firstMatch('${hex ?? ''}');
  if (match == null) return fallback;
  return 0xFF000000 | int.parse(match.group(1)!, radix: 16);
}

String? _url(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;
