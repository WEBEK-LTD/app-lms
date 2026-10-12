import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/http_client.dart';
import 'api/yallapp_api.dart';
import 'app_environment.dart';
import 'auth/token_manager.dart';
import 'auth/token_store.dart';
import 'config/build_config.dart';
import 'gate/app_gate.dart';

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
  final refreshDio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      contentType: Headers.jsonContentType,
    ),
  );
  late final HttpYallappApi api;
  final tokens = TokenManager(
    store: ref.watch(tokenStoreProvider),
    refresh: (refreshToken) => api.refreshTokens(refreshToken),
  );
  final dio = createHttpClient(
    baseUrl: baseUrl,
    tokens: tokens,
    onGateError: (error) => ref.read(appGateProvider.notifier).report(error),
  );
  api = HttpYallappApi(
    dio: dio,
    refreshDio: refreshDio,
    platform: env.platform,
    appVersion: env.appVersion,
  );
  ref.onDispose(() {
    dio.close();
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
