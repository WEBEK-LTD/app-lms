import 'dart:async';
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

StoredTokens tokens(String access, String refresh, DateTime expiresAt) =>
    StoredTokens(
      accessToken: access,
      refreshToken: refresh,
      expiresAt: expiresAt,
    );

/// A fake server: `/auth/refresh` rotates tokens; other paths accept only the
/// current access token.
class FakeServer implements HttpClientAdapter {
  FakeServer({this.refreshFails = false, this.refreshDelay = Duration.zero});

  String validAccess = 'access-2';
  String validRefresh = 'refresh-1';
  bool refreshFails;
  Duration refreshDelay;
  int refreshes = 0;
  final seen = <String>[];
  String? gateCode;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    ResponseBody json(int status, Object body) => ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );

    if (options.path.endsWith('/auth/refresh')) {
      refreshes++;
      await Future<void>.delayed(refreshDelay);
      final sent = (options.data as Map)['refresh_token'];
      if (refreshFails || sent != validRefresh) {
        return json(401, {
          'code': 'invalid_refresh_token',
          'message': 'Sign in again.',
        });
      }
      // Rotation: the old refresh token stops working.
      validRefresh = 'refresh-${refreshes + 1}';
      validAccess = 'access-${refreshes + 2}';
      return json(200, {
        'access_token': validAccess,
        'refresh_token': validRefresh,
        'expires_in': 900,
      });
    }
    if (gateCode != null) {
      return json(503, {'code': gateCode, 'message': 'Down for maintenance.'});
    }
    final auth = options.headers['Authorization'];
    seen.add('${options.path} $auth');
    if (auth != 'Bearer $validAccess') {
      return json(401, {'code': 'token_expired', 'message': 'Expired.'});
    }
    return json(200, {'id': 7, 'name': 'Sara', 'phone': '+905321234567'});
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  final now = DateTime.utc(2026, 10, 12, 9);

  ({HttpYallappApi api, TokenManager manager, MemoryTokenStore store})
  setUpClient(
    FakeServer server,
    StoredTokens? initial, {
    List<ApiException>? gate,
  }) {
    final store = MemoryTokenStore(initial);
    final refreshDio = Dio(
      BaseOptions(baseUrl: 'https://x.test/wp-json/yallapp/v1'),
    )..httpClientAdapter = server;
    late final HttpYallappApi api;
    final manager = TokenManager(
      store: store,
      refresh: (rt) => api.refreshTokens(rt),
      clock: () => now,
    );
    final dio = createHttpClient(
      baseUrl: 'https://x.test/wp-json/yallapp/v1',
      tokens: manager,
      adapter: server,
      onGateError: gate?.add,
    );
    api = HttpYallappApi(
      dio: dio,
      refreshDio: refreshDio,
      platform: DevicePlatform.android,
      appVersion: '1.0.0',
    );
    return (api: api, manager: manager, store: store);
  }

  test('sends the access token when it is valid', () async {
    final server = FakeServer()..validAccess = 'access-1';
    final c = setUpClient(
      server,
      tokens('access-1', 'refresh-1', now.add(const Duration(minutes: 10))),
    );
    final user = await c.api.getMe();
    expect(user.name, 'Sara');
    expect(server.refreshes, 0);
    expect(server.seen.single, '/me Bearer access-1');
  });

  test(
    'on 401 refreshes once, stores the rotated tokens and retries',
    () async {
      final server = FakeServer()..validAccess = 'access-new';
      server.validAccess = 'not-yet';
      final c = setUpClient(
        server,
        tokens('access-1', 'refresh-1', now.add(const Duration(minutes: 10))),
      );

      final user = await c.api.getMe();

      expect(user.id, 7);
      expect(server.refreshes, 1);
      final stored = (await c.store.read())!;
      expect(stored.accessToken, server.validAccess);
      expect(
        stored.refreshToken,
        'refresh-2',
        reason: 'rotated refresh token saved',
      );
      expect(stored.expiresAt, now.add(const Duration(seconds: 900)));
      expect(server.seen, [
        '/me Bearer access-1',
        '/me Bearer ${server.validAccess}',
      ]);
    },
  );

  test('concurrent 401s share a single refresh', () async {
    final server = FakeServer(refreshDelay: const Duration(milliseconds: 30))
      ..validAccess = 'stale';
    final c = setUpClient(
      server,
      tokens('access-1', 'refresh-1', now.add(const Duration(minutes: 10))),
    );

    final results = await Future.wait([
      c.api.getMe(),
      c.api.getMe(),
      c.api.getMe(),
    ]);

    expect(results, hasLength(3));
    expect(server.refreshes, 1, reason: 'one rotation for all three requests');
    expect((await c.store.read())!.refreshToken, 'refresh-2');
  });

  test('refreshes ahead of time when the token is about to expire', () async {
    final server = FakeServer()..validAccess = 'stale';
    final c = setUpClient(
      server,
      tokens('access-1', 'refresh-1', now.add(const Duration(seconds: 10))),
    );
    await c.api.getMe();
    expect(server.refreshes, 1);
    expect(server.seen, [
      '/me Bearer ${server.validAccess}',
    ], reason: 'no failed request first');
  });

  test('a rejected refresh token ends the session', () async {
    final server = FakeServer(refreshFails: true)..validAccess = 'other';
    final c = setUpClient(
      server,
      tokens('access-1', 'refresh-1', now.add(const Duration(minutes: 10))),
    );
    final expired = expectLater(c.manager.sessionExpired, emits(null));

    await expectLater(
      c.api.getMe(),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)),
    );
    await expired;
    expect(await c.store.read(), isNull);
    expect(await c.manager.validAccessToken(), isNull);
  });

  test('the old refresh token is never reused after rotation', () async {
    final server = FakeServer()..validAccess = 'stale';
    final c = setUpClient(
      server,
      tokens('access-1', 'refresh-1', now.add(const Duration(minutes: 10))),
    );
    await c.api.getMe();
    // The server rejects tokens again: the next refresh must send refresh-2.
    server.validAccess = 'rotated-again';
    await c.api.getMe();
    expect(server.refreshes, 2);
    expect((await c.store.read())!.refreshToken, 'refresh-3');
  });

  test('public endpoints never send a token', () async {
    final server = FakeServer();
    final store = MemoryTokenStore(
      tokens('access-1', 'refresh-1', now.add(const Duration(minutes: 10))),
    );
    final manager = TokenManager(
      store: store,
      refresh: (_) async => throw StateError('no'),
    );
    final dio = createHttpClient(
      baseUrl: 'https://x.test',
      tokens: manager,
      adapter: server,
    );
    await dio.get<dynamic>(
      '/categories',
      options: authOptions(AuthMode.none, Options(validateStatus: (_) => true)),
    );
    expect(server.seen.single, '/categories null');
  });

  test('stop codes are reported to the gate', () async {
    final server = FakeServer()..gateCode = 'maintenance';
    final gate = <ApiException>[];
    final c = setUpClient(server, null, gate: gate);
    await expectLater(c.api.listCategories(), throwsA(isA<ApiException>()));
    expect(gate.single.code, 'maintenance');
  });

  test('checkout links are never requested on iOS', () async {
    final server = FakeServer();
    final api = HttpYallappApi(
      dio: Dio()..httpClientAdapter = server,
      refreshDio: Dio(),
      platform: DevicePlatform.ios,
      appVersion: '1.0.0',
    );
    expect(
      () => api.createCheckoutLink(1),
      throwsA(
        isA<ApiException>().having(
          (e) => e.code,
          'code',
          'purchase_not_allowed',
        ),
      ),
    );
    expect(server.seen, isEmpty);
  });
}
