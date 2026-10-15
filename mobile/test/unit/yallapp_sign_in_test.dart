import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/core/config/build_config_json.dart';

import '../support/fixtures.dart';

/// 34 An app on its own API that Yallapp signs people in to: sign-in, the
/// account and token refreshes go to Yallapp, everything else to the
/// client's API with Yallapp's access token.

const clientApi = 'https://api.academy.test/yallapp/v1';
const yallapp = 'https://yallapp.test/api/app/app-1';

/// Both servers: the client's API and Yallapp's hosted API, told apart by host.
class TwoServers implements HttpClientAdapter {
  String validAccess = 'jwt-1';
  String validRefresh = 'refresh-1';
  int refreshes = 0;

  /// What Yallapp's /config says: `yallapp`, or null to answer 404 (the
  /// owner went back to their own API's sign-in).
  String? yallappProvider = 'yallapp';

  /// What the client's own /config says in `auth` (besides the rules).
  Map<String, dynamic> clientAuth = {};
  int clientDeleteStatus = 204;
  final seen = <String>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    ResponseBody json(int status, Object? body) => ResponseBody.fromString(
      body == null ? '' : jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
    final uri = options.uri;
    final server = uri.host == 'yallapp.test' ? 'yallapp' : 'client';
    final path = uri.path
        .replaceFirst('/api/app/app-1', '')
        .replaceFirst('/yallapp/v1', '');
    final auth = options.headers['Authorization'];
    seen.add('$server ${options.method} $path${auth == null ? '' : ' $auth'}');

    if (server == 'client') {
      if (path == '/config') {
        final config = configJson();
        config['auth'] = {...(config['auth'] as Map), ...clientAuth};
        return json(200, config);
      }
      if (path.startsWith('/auth/')) {
        return json(404, {'code': 'not_found', 'message': 'Not here.'});
      }
      if (auth != 'Bearer $validAccess') {
        return json(401, {'code': 'invalid_token', 'message': 'Sign in.'});
      }
      if (path == '/me' && options.method == 'DELETE') {
        return json(clientDeleteStatus, {
          'code': 'not_found',
          'message': 'Nothing kept.',
        });
      }
      return json(200, {
        'page': 1,
        'per_page': 20,
        'total': 0,
        'total_pages': 1,
        'items': <Object>[],
      });
    }

    // Yallapp.
    if (path == '/config') {
      if (yallappProvider == null) {
        return json(404, {'code': 'not_found', 'message': 'Not found.'});
      }
      return json(200, {
        ...configJson(),
        'auth': {
          'signup_allowed': true,
          'signup_fields': ['name'],
          'default_country_code': '+20',
          'methods': ['phone', 'email'],
          'email_sign_in': 'code',
          'preview_sign_in': true,
          'provider': yallappProvider,
          'base_url': yallapp,
        },
      });
    }
    if (path == '/auth/otp/request') {
      return json(200, {
        'request_id': 'r1',
        'code_length': 6,
        'resend_after_seconds': 60,
        'expires_in_seconds': 300,
      });
    }
    if (path == '/auth/refresh') {
      refreshes++;
      if ((options.data as Map)['refresh_token'] != validRefresh) {
        return json(401, {'code': 'invalid_token', 'message': 'Sign in.'});
      }
      validRefresh = 'refresh-${refreshes + 1}';
      validAccess = 'jwt-${refreshes + 1}';
      return json(200, {
        'access_token': validAccess,
        'refresh_token': validRefresh,
        'expires_in': 900,
      });
    }
    if (auth != 'Bearer $validAccess') {
      return json(401, {'code': 'invalid_token', 'message': 'Sign in.'});
    }
    if (path == '/me' && options.method == 'DELETE') return json(204, null);
    if (path == '/me/devices') {
      return json(200, {'items': <Object>[], 'limit': 2});
    }
    return json(200, {'id': 42, 'name': 'Sara', 'phone': '+905321234567'});
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  final now = DateTime.utc(2026, 10, 15, 9);

  ({HttpYallappApi api, MemoryTokenStore store}) setUp(
    TwoServers servers, {
    String? buildAuthBaseUrl = yallapp,
    StoredTokens? initial,
  }) {
    final store = MemoryTokenStore(initial);
    final refreshDio = Dio(BaseOptions(baseUrl: buildAuthBaseUrl ?? clientApi))
      ..httpClientAdapter = servers;
    late final HttpYallappApi api;
    final tokens = TokenManager(
      store: store,
      refresh: (rt) => api.refreshTokens(rt),
      clock: () => now,
    );
    final dio = createHttpClient(
      baseUrl: clientApi,
      tokens: tokens,
      adapter: servers,
    );
    final authDio = createHttpClient(
      baseUrl: buildAuthBaseUrl ?? clientApi,
      tokens: tokens,
      adapter: servers,
    );
    api = HttpYallappApi(
      dio: dio,
      refreshDio: refreshDio,
      platform: DevicePlatform.android,
      appVersion: '1.0.0',
      authDio: authDio,
      authBaseUrl: buildAuthBaseUrl,
    );
    return (api: api, store: store);
  }

  StoredTokens signedIn(String access, String refresh) => StoredTokens(
    accessToken: access,
    refreshToken: refresh,
    expiresAt: now.add(const Duration(minutes: 10)),
  );

  test(
    'takes the sign-in rules from Yallapp and the rest from the client',
    () async {
      final servers = TwoServers();
      final c = setUp(servers);
      final config = await c.api.getConfig();
      expect(c.api.yallappSignsIn, isTrue);
      expect(config.auth.methods, [SignInMethod.phone, SignInMethod.email]);
      expect(config.auth.defaultCountryCode, '+20');
      expect(config.auth.previewSignIn, isTrue);
      // The content settings are the client's.
      expect(config.features.lms, LmsKind.tutor);
      expect(servers.seen, ['client GET /config', 'yallapp GET /config']);
    },
  );

  test('sends sign-in and the account to Yallapp, content to the client with the token', () async {
    final servers = TwoServers();
    final c = setUp(servers, initial: signedIn('jwt-1', 'refresh-1'));
    await c.api.getConfig();
    servers.seen.clear();

    await c.api.requestOtp(countryCode: '+90', phone: '5321234567');
    await c.api.getMe();
    await c.api.listDevices();
    await c.api.listMyCourses();
    await c.api.setPushToken('push-1', const NotificationPreferences());

    expect(servers.seen, [
      'yallapp POST /auth/otp/request',
      'yallapp GET /me Bearer jwt-1',
      'yallapp GET /me/devices Bearer jwt-1',
      'client GET /me/courses Bearer jwt-1',
      'client PUT /me/push-token Bearer jwt-1',
    ]);
  });

  test(
    'a token the client refuses is refreshed at Yallapp, then sent again',
    () async {
      final servers = TwoServers()..validAccess = 'jwt-new';
      final c = setUp(servers, initial: signedIn('jwt-old', 'refresh-1'));
      await c.api.getConfig();
      servers.seen.clear();

      await c.api.listMyCourses();

      expect(servers.refreshes, 1);
      expect(servers.seen, [
        'client GET /me/courses Bearer jwt-old',
        'yallapp POST /auth/refresh',
        'client GET /me/courses Bearer jwt-2',
      ]);
      expect((await c.store.read())!.refreshToken, 'refresh-2');
    },
  );

  test(
    'an app built before the switch follows the client\'s /config',
    () async {
      final servers = TwoServers()
        ..clientAuth = {'provider': 'yallapp', 'base_url': yallapp};
      final c = setUp(
        servers,
        buildAuthBaseUrl: null,
        initial: signedIn('jwt-1', 'refresh-1'),
      );
      expect(c.api.yallappSignsIn, isFalse);
      await c.api.getConfig();
      expect(c.api.yallappSignsIn, isTrue);
      servers.seen.clear();
      await c.api.getMe();
      expect(servers.seen, ['yallapp GET /me Bearer jwt-1']);
    },
  );

  test(
    'back on the client\'s own sign-in when Yallapp no longer signs in',
    () async {
      final servers = TwoServers()..yallappProvider = null;
      final c = setUp(servers);
      final config = await c.api.getConfig();
      expect(c.api.yallappSignsIn, isFalse);
      expect(config.auth.defaultCountryCode, '+90');
      servers.seen.clear();
      await expectLater(
        c.api.requestOtp(countryCode: '+90', phone: '5321234567'),
        throwsA(isA<ApiException>()),
      );
      expect(servers.seen, ['client POST /auth/otp/request']);
    },
  );

  test('deleting the account asks the client first, then Yallapp', () async {
    final servers = TwoServers()..clientDeleteStatus = 404;
    final c = setUp(servers, initial: signedIn('jwt-1', 'refresh-1'));
    await c.api.getConfig();
    servers.seen.clear();
    await c.api.deleteMe();
    expect(servers.seen, [
      'client DELETE /me Bearer jwt-1',
      'yallapp DELETE /me Bearer jwt-1',
    ]);

    // A client that fails keeps the account: the person tries again.
    servers
      ..clientDeleteStatus = 500
      ..seen.clear();
    await expectLater(c.api.deleteMe(), throwsA(isA<ApiException>()));
    expect(servers.seen, ['client DELETE /me Bearer jwt-1']);
  });

  test('reads auth_base_url from the preview\'s build config', () {
    final build = buildConfigFromJson({
      'app_name': 'Ada',
      'site_url': 'https://academy.test',
      'api_base_url': '$clientApi/',
      'auth_base_url': '$yallapp/',
    });
    expect(build.apiBaseUrl, clientApi);
    expect(build.authBaseUrl, yallapp);
    expect(
      buildConfigFromJson({'site_url': 'https://a.test'}).authBaseUrl,
      isNull,
    );
  });
}
