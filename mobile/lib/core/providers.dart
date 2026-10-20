import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/http_client.dart';
import 'api/offline_cache.dart';
import 'api/yallapp_api.dart';
import 'app_environment.dart';
import 'auth/token_manager.dart';
import 'auth/token_store.dart';
import 'config/build_config.dart';
import 'gate/app_gate.dart';
import 'l10n/language.dart';
import 'preview/preview.dart';
import 'services/analytics_interceptor.dart';
import 'services/analytics_providers.dart';

/// 62 Tells the hosted API the app can open Media links bound to the student
/// (docs/api/openapi.yaml, `X-Yallapp-Bound-Media`).
const boundMediaHeader = 'X-Yallapp-Bound-Media';

/// 62 The headers to open a media link with: a link bound to the student
/// (its `t` parameter) needs their access token, the one the lesson was
/// asked with; other links need nothing.
Future<Map<String, String>> boundMediaHeaders(
  TokenManager tokens,
  String url,
) async {
  final uri = Uri.tryParse(url);
  if (uri == null || !uri.queryParameters.containsKey('t')) return const {};
  final token = await tokens.validAccessToken();
  return token == null ? const {} : {'Authorization': 'Bearer $token'};
}

/// Must be overridden with the environment loaded at start-up.
final appEnvironmentProvider = Provider<AppEnvironment>(
  (ref) => throw UnimplementedError('Override appEnvironmentProvider'),
);

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

class ApiBundle {
  const ApiBundle(this.api, this.tokens);
  final YallappApi api;
  final TokenManager tokens;
}

/// Builds the HTTP API and the token manager that refreshes through it.
final apiBundleProvider = Provider<ApiBundle>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  final baseUrl = apiUrlOf(env.build);
  // 34 Yallapp signs people in to an app on its own API: sign-in, the account
  // and token refreshes go to Yallapp (until /config says otherwise).
  final authBaseUrl = env.build.authBaseUrl;
  final accountUrl = authBaseUrl == null
      ? baseUrl
      : normalizeSiteUrl(authBaseUrl);
  // 17 The app preview tells the hosted API who it is with its preview token
  // (34: only Yallapp's, never the client's own API).
  final previewToken = env.preview?.apiToken;
  final previewHeaders = <String, dynamic>{'X-Yallapp-Preview': ?previewToken};
  final contentIsHosted =
      env.preview == null ||
      env.preview!.contentSource == PreviewContentSource.hosted;
  final refreshDio = Dio(
    BaseOptions(
      baseUrl: accountUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      contentType: Headers.jsonContentType,
      headers: previewHeaders,
    ),
  );
  String language() => ref.read(appLanguageProvider);
  refreshDio.interceptors.add(LanguageInterceptor(language));
  late final HttpYallappApi api;
  final tokens = TokenManager(
    store: ref.watch(tokenStoreProvider),
    refresh: (refreshToken) => api.refreshTokens(refreshToken),
  );
  final dio = createHttpClient(
    baseUrl: baseUrl,
    tokens: tokens,
    onGateError: (error) => ref.read(appGateProvider.notifier).report(error),
    language: language,
    offline: ref.read(offlineCacheProvider),
  );
  if (contentIsHosted) dio.options.headers.addAll(previewHeaders);
  // 62 The app opens Media library videos bound to the student (with their
  // access token, [boundMediaHeaders]); a browser's video element can't.
  if (!kIsWeb && env.preview == null) {
    dio.options.headers[boundMediaHeader] = '1';
  }
  // 44 Items opened, enrolments, bookings, tickets, donations, checkouts
  // and searches, from the content API's answers.
  dio.interceptors.insert(
    0,
    AnalyticsInterceptor(() => ref.read(analyticsProvider)),
  );
  final authDio = createHttpClient(
    baseUrl: accountUrl,
    tokens: tokens,
    onGateError: (error) => ref.read(appGateProvider.notifier).report(error),
    language: language,
    offline: ref.read(offlineCacheProvider),
  );
  authDio.options.headers.addAll(previewHeaders);
  api = HttpYallappApi(
    dio: dio,
    refreshDio: refreshDio,
    platform: env.platform,
    appVersion: env.appVersion,
    language: language,
    preview: env.isPreview,
    appType: env.build.appType,
    authDio: authDio,
    authBaseUrl: authBaseUrl,
  );
  ref.onDispose(() {
    dio.close();
    authDio.close();
    refreshDio.close();
    tokens.dispose();
  });
  return ApiBundle(api, tokens);
});

final yallappApiProvider = Provider<YallappApi>(
  (ref) => ref.watch(apiBundleProvider).api,
);

final tokenManagerProvider = Provider<TokenManager>(
  (ref) => ref.watch(apiBundleProvider).tokens,
);

extension ContentApi on Ref {
  /// The API, for content that comes back in the user's language: providers
  /// that use it reload when the language changes.
  YallappApi get contentApi {
    watch(appLanguageProvider);
    return watch(yallappApiProvider);
  }
}
