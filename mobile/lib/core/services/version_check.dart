import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/config_models.dart';
import '../providers.dart';

/// 89.1 What Yallapp says about this version of the app
/// (docs/api/platform.yaml, getAppVersionPolicy): the owner's minimum and
/// recommended versions, and the app's page on the store it came from.
class VersionPolicy {
  const VersionPolicy({
    required this.updateRequired,
    required this.updateRecommended,
    this.recommendedVersion,
    this.storeUrl,
    this.paused,
  });

  factory VersionPolicy.fromJson(Map<String, dynamic> json) => VersionPolicy(
    updateRequired: json['update_required'] == true,
    updateRecommended: json['update_recommended'] == true,
    recommendedVersion: json['recommended_version'] as String?,
    storeUrl: json['store_url'] as String?,
    paused: json['paused'] is Map<String, dynamic>
        ? AppPaused.fromJson(json['paused'] as Map<String, dynamic>)
        : null,
  );

  final bool updateRequired;
  final bool updateRecommended;
  final String? recommendedVersion;
  final String? storeUrl;

  /// 76.6 Why a WordPress app is paused (its plan isn't active, or the
  /// owner's account is suspended), or null: Yallapp says so here since the
  /// plugin serves every site.
  final AppPaused? paused;
}

/// 76.6 `AppPaused` (docs/api/platform.yaml).
class AppPaused {
  const AppPaused({
    required this.message,
    required this.suspended,
    this.contact,
  });

  factory AppPaused.fromJson(Map<String, dynamic> json) => AppPaused(
    message: json['message'] as String? ?? '',
    suspended: json['code'] == 'account_suspended',
    contact: json['contact'] is Map<String, dynamic>
        ? OwnerContact.fromJson(json['contact'] as Map<String, dynamic>)
        : null,
  );

  final String message;
  final bool suspended;
  final OwnerContact? contact;
}

/// The version address next to the events one
/// (`…/api/v1/apps/{id}/events` → `…/version`), with the question.
Uri? versionUri(
  String? eventsUrl, {
  required String platform,
  required String version,
  String? store,
}) {
  if (eventsUrl == null || !eventsUrl.endsWith('/events')) return null;
  final base = Uri.tryParse(
    '${eventsUrl.substring(0, eventsUrl.length - '/events'.length)}/version',
  );
  return base?.replace(
    queryParameters: {
      'platform': platform,
      'version': version,
      'store': ?store,
    },
  );
}

/// Asks Yallapp; null when it can't say (offline, an old platform).
typedef VersionFetcher = Future<Map<String, dynamic>?> Function(
  Uri uri,
  String key,
);

VersionFetcher dioVersionFetcher([Dio? client]) {
  final dio =
      client ??
      Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
          validateStatus: (_) => true,
        ),
      );
  return (uri, key) async {
    final response = await dio.getUri<dynamic>(
      uri,
      options: Options(headers: {'X-Yallapp-Analytics-Key': key}),
    );
    final data = response.data;
    return response.statusCode == 200 && data is Map<String, dynamic>
        ? data
        : null;
  };
}

final versionFetcherProvider = Provider<VersionFetcher>(
  (ref) => dioVersionFetcher(),
);

/// The check on start: never fails the app, and is skipped in the preview
/// and without analytics in the build config.
final versionCheckProvider = Provider<Future<VersionPolicy?> Function()>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  final fetch = ref.watch(versionFetcherProvider);
  return () async {
    final key = env.build.analyticsKey;
    final uri = env.isPreview
        ? null
        : versionUri(
            env.build.analyticsUrl,
            platform: env.platform.name,
            version: env.appVersion,
            store: env.installStore,
          );
    if (uri == null || key == null) return null;
    try {
      final json = await fetch(uri, key);
      return json == null ? null : VersionPolicy.fromJson(json);
    } on Object {
      return null;
    }
  };
});

/// The recommended version the person last said "Not now" to.
const updateDismissedKey = 'update.dismissed_version';
