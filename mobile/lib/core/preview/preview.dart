import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../api/http_client.dart' show describeFailure;
import '../api/models/models.dart';
import '../config/build_config.dart';
import '../config/build_config_json.dart';

/// The app preview (roadmap 17): the web build of this app, opened by the
/// "Preview your app" page of the Yallapp dashboard (or its QR code) at
/// `<platform>/preview-app/index.html?token=…`. Its build config comes from
/// `GET <platform>/api/preview/{token}/config` (docs/api/platform.yaml)
/// instead of the compiled constants; Android and iOS builds never use this.

/// Where the preview gets the app's content (`preview.content_source`).
enum PreviewContentSource { wordpress, customApi, hosted, none }

/// What the preview link asks for: `token`, and optionally `theme`
/// (`light` or `dark`), `lang` (a language code) and 82.3 `os` (`android`
/// or `ios`: the app as on that system, its rules included).
@immutable
class PreviewLaunch {
  const PreviewLaunch({
    required this.token,
    this.themeMode,
    this.language,
    this.platform,
  });

  final String token;
  final ThemeMode? themeMode;
  final String? language;

  /// 82.3 Null: as the browser's system.
  final DevicePlatform? platform;

  static final _token = RegExp(r'^[A-Za-z0-9._-]{20,200}$');
  // 43 Any app language: two or three letters ("fil").
  static final _language = RegExp(r'^[a-z]{2,3}$');

  /// The launch parameters in the page address, or null without a token.
  static PreviewLaunch? fromUri(Uri uri) {
    final params = uri.queryParameters;
    final token = params['token']?.trim() ?? '';
    if (!_token.hasMatch(token)) return null;
    final lang = params['lang']?.trim();
    return PreviewLaunch(
      token: token,
      themeMode: switch (params['theme']) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => null,
      },
      language: lang != null && _language.hasMatch(lang) ? lang : null,
      platform: switch (params['os']) {
        'ios' => DevicePlatform.ios,
        'android' => DevicePlatform.android,
        _ => null,
      },
    );
  }
}

/// The preview's facts for the running app: kept in `AppEnvironment.preview`.
@immutable
class PreviewSession {
  const PreviewSession({
    required this.appId,
    required this.platformUrl,
    required this.contentSource,
    this.waitingFor,
    this.apiToken,
    this.draft = false,
    this.themeMode,
  });

  final String appId;

  /// The Yallapp platform the preview was opened from (the page's origin).
  final String platformUrl;
  final PreviewContentSource contentSource;

  /// Why there's no content yet ([PreviewContentSource.none]): what the
  /// owner does next. Null otherwise.
  final PreviewWaitingFor? waitingFor;

  /// Sent as `X-Yallapp-Preview` to the hosted API; null for other sources.
  final String? apiToken;

  /// The hosted API serves the Pages & look draft.
  final bool draft;

  /// Light or dark as picked on the preview page; null keeps the app's own.
  final ThemeMode? themeMode;
}

/// What a preview without content waits for: the Website step, the Yallapp
/// plugin on the WordPress site, or our team's setup of the site.
enum PreviewWaitingFor { website, plugin, setup }

/// Why the preview couldn't start.
enum PreviewProblem {
  noLink,
  expired,
  invalid,
  unreachable,
  noContent,

  /// The WordPress site doesn't have the Yallapp plugin with the app's
  /// license activated yet.
  noPlugin,

  /// Our team is still setting up the WordPress site.
  beingSetUp,
}

class PreviewException implements Exception {
  const PreviewException(this.problem);
  final PreviewProblem problem;

  @override
  String toString() => 'PreviewException($problem)';
}

/// The build config and session the preview starts with.
class PreviewStart {
  const PreviewStart(this.build, this.session);
  final BuildConfigData build;
  final PreviewSession session;
}

/// Reads the preview config for [launch] from the platform at [platformUrl].
Future<PreviewStart> fetchPreview(
  PreviewLaunch launch, {
  required String platformUrl,
  required Dio http,
}) async {
  final Response<dynamic> response;
  try {
    response = await http.get<dynamic>(
      '${normalizeSiteUrl(platformUrl)}/api/preview/'
      '${Uri.encodeComponent(launch.token)}/config',
      options: Options(
        responseType: ResponseType.json,
        validateStatus: (status) => status != null && status < 600,
      ),
    );
  } on DioException catch (e) {
    debugPrint(describeFailure(e));
    throw const PreviewException(PreviewProblem.unreachable);
  }
  final status = response.statusCode ?? 0;
  if (status == 410) throw const PreviewException(PreviewProblem.expired);
  if (status == 403 || status == 404) {
    throw const PreviewException(PreviewProblem.invalid);
  }
  final data = response.data;
  if (status != 200 || data is! Map) {
    debugPrint(
      'Yallapp preview: GET ${response.requestOptions.uri.path} answered '
      'HTTP $status${data is Map ? '' : ' without JSON'}',
    );
    throw const PreviewException(PreviewProblem.unreachable);
  }
  return previewStartFromJson(
    Map<String, dynamic>.from(data),
    platformUrl: platformUrl,
    themeMode: launch.themeMode,
  );
}

/// Parses the preview config (`PreviewConfig` in docs/api/platform.yaml).
PreviewStart previewStartFromJson(
  Map<String, dynamic> json, {
  required String platformUrl,
  ThemeMode? themeMode,
}) {
  final config = json['config'];
  final preview = json['preview'];
  if (config is! Map || preview is! Map) {
    throw const PreviewException(PreviewProblem.unreachable);
  }
  final token = preview['api_token'];
  final build = Map<String, dynamic>.from(config);
  // The hosted API: the app's content, or (34) only its sign-in.
  final hosted = [
    if (preview['content_source'] == 'hosted') 'api_base_url',
    'auth_base_url',
  ];
  for (final key in hosted) {
    final url = build[key];
    if (url is String) build[key] = onPageOrigin(url, platformUrl);
  }
  return PreviewStart(
    buildConfigFromJson(build),
    PreviewSession(
      appId: '${preview['app_id'] ?? ''}',
      platformUrl: normalizeSiteUrl(platformUrl),
      contentSource: switch (preview['content_source']) {
        'wordpress' => PreviewContentSource.wordpress,
        'custom_api' => PreviewContentSource.customApi,
        'hosted' => PreviewContentSource.hosted,
        _ => PreviewContentSource.none,
      },
      waitingFor: switch (preview['waiting_for']) {
        'website' => PreviewWaitingFor.website,
        'plugin' => PreviewWaitingFor.plugin,
        'setup' => PreviewWaitingFor.setup,
        _ => null,
      },
      apiToken: token is String && token.isNotEmpty ? token : null,
      draft: preview['draft'] == true,
      themeMode: themeMode,
    ),
  );
}

/// 17 The platform's hosted API at the address the preview page was opened
/// from. The platform names its hosted API at its own main address, and the
/// page can be on another of its addresses (www or not, a domain served
/// through a proxy, a deploy's own address): the browser then blocks every
/// request the app makes, and the app says it couldn't connect. The page's
/// address just answered the preview config, so it serves the API too.
/// Addresses that aren't the hosted API's stay as they are.
String onPageOrigin(String url, String platformUrl) {
  final api = Uri.tryParse(url);
  final page = Uri.tryParse(normalizeSiteUrl(platformUrl));
  if (api == null || page == null || !api.hasAuthority || !page.hasAuthority) {
    return url;
  }
  if (!api.path.startsWith('/api/app/')) return url;
  return api
      .replace(scheme: page.scheme, host: page.host, port: page.port)
      .toString();
}
