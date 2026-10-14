import 'dart:math';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api/models/models.dart';
import 'config/build_config.dart';
import 'preview/preview.dart';

/// Facts about this build and this install that don't change while the app
/// runs.
class AppEnvironment {
  const AppEnvironment({
    required this.build,
    required this.platform,
    required this.appVersion,
    required this.deviceId,
    required this.deviceName,
    this.preview,
  });

  /// Reads the platform, version and device facts once at start-up.
  static Future<AppEnvironment> load({
    required BuildConfigData build,
    required SharedPreferences preferences,
    PreviewSession? preview,
  }) async {
    final platform = defaultTargetPlatform == TargetPlatform.iOS
        ? DevicePlatform.ios
        : DevicePlatform.android;
    var version = build.versionName;
    try {
      final info = await PackageInfo.fromPlatform();
      if (info.version.isNotEmpty) version = info.version;
    } on Object {
      // Keep the build config's version.
    }
    return AppEnvironment(
      build: build,
      platform: platform,
      appVersion: version,
      deviceId: deviceIdFor(preferences),
      // 17 The app preview runs in a browser, which has no phone model.
      deviceName: kIsWeb ? 'App preview' : await _deviceName(platform),
      preview: preview,
    );
  }

  final BuildConfigData build;

  /// 17 Set when this is the app preview on the web (the dashboard's
  /// "Preview your app"); null in every installed app.
  final PreviewSession? preview;
  bool get isPreview => preview != null;
  final DevicePlatform platform;
  final String appVersion;

  /// A stable ID generated once per install.
  final String deviceId;
  final String deviceName;

  bool get isIos => platform == DevicePlatform.ios;
  bool get isAndroid => platform == DevicePlatform.android;
  String get siteUrl => build.siteUrl;

  DeviceInput get deviceInput => DeviceInput(
    id: deviceId,
    platform: platform,
    name: deviceName,
    appVersion: appVersion,
  );

  static const _deviceIdKey = 'yallapp.device_id';

  /// Returns this install's device ID, creating it the first time.
  static String deviceIdFor(SharedPreferences preferences) {
    final existing = preferences.getString(_deviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final id = generateDeviceId();
    preferences.setString(_deviceIdKey, id);
    return id;
  }

  /// A random version 4 UUID.
  static String generateDeviceId([Random? random]) {
    final rng = random ?? Random.secure();
    final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  static Future<String> _deviceName(DevicePlatform platform) async {
    try {
      final plugin = DeviceInfoPlugin();
      if (platform == DevicePlatform.ios) {
        final info = await plugin.iosInfo;
        return info.modelName.isNotEmpty ? info.modelName : info.model;
      }
      final info = await plugin.androidInfo;
      final brand = info.brand.isEmpty
          ? ''
          : '${info.brand[0].toUpperCase()}${info.brand.substring(1)}';
      final model = info.model;
      if (model.toLowerCase().startsWith(brand.toLowerCase())) return model;
      return '$brand $model'.trim();
    } on Object {
      return platform == DevicePlatform.ios ? 'iPhone' : 'Android phone';
    }
  }
}
