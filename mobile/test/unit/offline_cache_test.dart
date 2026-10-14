import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/offline_cache.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';

/// Answers with a course list until it goes offline.
class FlakyServer implements HttpClientAdapter {
  bool offline = false;
  int requests = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests++;
    if (offline) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'offline',
      );
    }
    return ResponseBody.fromString(
      jsonEncode({
        'items': [
          {'id': requests, 'path': options.path},
        ],
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late SharedPreferences prefs;
  late OfflineCache cache;
  late FlakyServer server;
  late Dio dio;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    cache = OfflineCache(prefs);
    server = FlakyServer();
    dio = createHttpClient(
      baseUrl: 'https://x.test/api/app/1',
      tokens: TokenManager(
        store: MemoryTokenStore(null),
        refresh: (_) async => throw const ApiException(code: 'x', message: 'x'),
      ),
      adapter: server,
      offline: cache,
    );
  });

  Future<Object?> get(String path) async =>
      (await dio.get<dynamic>(path, options: authOptions(AuthMode.none))).data;

  test('without offline mode in the plan, nothing is kept', () async {
    await get('/courses');
    server.offline = true;
    await expectLater(get('/courses'), throwsA(isA<DioException>()));
    expect(prefs.getKeys().where((k) => k.startsWith('offline.entry.')), isEmpty);
  });

  test('with offline mode, the last answer comes back without a connection', () async {
    await cache.setEnabled(true);
    final online = await get('/courses');
    server.offline = true;
    expect(await get('/courses'), online);
    // Never seen before: still an error.
    await expectLater(get('/products'), throwsA(isA<DioException>()));
    // Sign-in calls are never kept.
    server.offline = false;
    await get('/auth/something');
    expect(cache.read('GET https://x.test/api/app/1/auth/something '), isNull);
  });

  test('turning it off, or signing out, forgets everything', () async {
    await cache.setEnabled(true);
    await get('/courses');
    expect(prefs.getStringList('offline.index'), hasLength(1));
    await cache.clear();
    expect(prefs.getStringList('offline.index'), isNull);
    await get('/courses');
    await cache.setEnabled(false);
    expect(prefs.getKeys().where((k) => k.startsWith('offline.entry.')), isEmpty);
  });

  test('keeps at most the newest entries', () async {
    await cache.setEnabled(true);
    for (var i = 0; i < OfflineCache.maxEntries + 5; i++) {
      await cache.write('GET /page/$i', {'i': i});
    }
    expect(prefs.getStringList('offline.index'), hasLength(OfflineCache.maxEntries));
    expect(cache.read('GET /page/0'), isNull);
    expect(cache.read('GET /page/${OfflineCache.maxEntries + 4}'), {'i': OfflineCache.maxEntries + 4});
  });

  test('reads the owner contact and offline mode from the contract', () {
    final error = ApiException.fromResponse(503, {
      'code': 'license_inactive',
      'message': 'Rose Shop is paused right now.',
      'contact': {'name': 'Rose Shop', 'whatsapp': '+905321112233', 'email': null},
    });
    expect(error.contact?.name, 'Rose Shop');
    expect(error.contact?.whatsapp, '+905321112233');
    expect(error.contact?.reachable, isTrue);
    expect(
      const OwnerContact(name: 'A').reachable,
      isFalse,
    );
  });
}
