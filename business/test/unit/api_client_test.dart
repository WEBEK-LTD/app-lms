import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/http_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/auth/token_manager.dart';
import 'package:yallapp_business/core/auth/token_store.dart';

/// Answers requests from a handler, and records them.
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.handler);

  final Future<ResponseBody> Function(RequestOptions options, String? body)
  handler;
  final requests = <RequestOptions>[];
  final bodies = <String?>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    String? body;
    if (requestStream != null) {
      final bytes = await requestStream.expand((c) => c).toList();
      body = utf8.decode(bytes, allowMalformed: true);
    }
    requests.add(options);
    bodies.add(body);
    return handler(options, body);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody json(
  int status,
  Object body, {
  Map<String, List<String>> headers = const {},
}) => ResponseBody.fromString(
  jsonEncode(body),
  status,
  headers: {
    Headers.contentTypeHeader: [Headers.jsonContentType],
    ...headers,
  },
);

Map<String, Object> sessionJson(
  String n, {
  Duration access = const Duration(minutes: 15),
}) => {
  'token_type': 'Bearer',
  'access_token': 'access-$n',
  'access_expires_at': DateTime.now().toUtc().add(access).toIso8601String(),
  'refresh_token': 'refresh-$n',
  'refresh_expires_at': DateTime.now()
      .toUtc()
      .add(const Duration(days: 60))
      .toIso8601String(),
  'device_id': '00000000-0000-4000-8000-000000000001',
  'account_state': 'active',
};

const meJson = {
  'user': {
    'id': 'u',
    'name': 'Layla Haddad',
    'email': 'owner@example.com',
    'language': 'ar',
  },
  'account': {'state': 'active', 'message': null},
  'apps': [
    {
      'id': 'a',
      'name': 'Bab Al Sham',
      'type': 'store',
      'vertical': 'restaurant',
      'type_name': 'Restaurant & café',
      'backend': 'hosted',
      'state': 'active',
      'icon_url': null,
      'plan': null,
      'features': {'orders': true, 'kitchen': true, 'products': true},
    },
  ],
  'links': {
    'dashboard': 'https://yallapp.com.tr/dashboard',
    'support_whatsapp': null,
    'support_email': 'info@yallapp.com.tr',
  },
};

void main() {
  late MemoryTokenStore store;
  late FakeAdapter adapter;
  late HttpOwnerApi api;
  late TokenManager tokens;
  var refreshCount = 0;
  var lang = 'en';

  HttpOwnerApi build(
    Future<ResponseBody> Function(RequestOptions o, String? body) handler,
  ) {
    adapter = FakeAdapter(handler);
    late HttpOwnerApi built;
    tokens = TokenManager(store: store, refresh: (rt) => built.refresh(rt));
    built = HttpOwnerApi(
      baseUrl: 'https://yallapp.com.tr/api/owner/v1',
      language: () => lang,
      tokens: tokens,
      adapter: adapter,
    );
    return built;
  }

  setUp(() {
    refreshCount = 0;
    lang = 'en';
    store = MemoryTokenStore(Session.fromJson(sessionJson('1')));
  });

  test('sign-in sends the device and no token; reads the session', () async {
    store = MemoryTokenStore();
    api = build((o, body) async => json(200, sessionJson('9')));
    final session = await api.signIn(
      email: ' owner@example.com ',
      password: 'secret',
      device: const DeviceInfo(
        name: 'Pixel 8',
        platform: 'android',
        appVersion: '1.0.0',
      ),
    );
    expect(session.accessToken, 'access-9');
    expect(session.accountState, AccountState.active);
    final request = adapter.requests.single;
    expect(
      request.uri.toString(),
      'https://yallapp.com.tr/api/owner/v1/auth/sign-in',
    );
    expect(request.headers['Authorization'], isNull);
    final sent = jsonDecode(adapter.bodies.single!) as Map;
    expect(sent['email'], 'owner@example.com');
    expect(sent['device'], {
      'name': 'Pixel 8',
      'platform': 'android',
      'app_version': '1.0.0',
    });
  });

  test('sends the bearer token and the language; reads /me', () async {
    lang = 'tr';
    api = build((o, body) async => json(200, meJson));
    final me = await api.me();
    expect(me.user.language, 'ar');
    expect(me.apps.single.features.kitchen, isTrue);
    expect(me.apps.single.isRestaurant, isTrue);
    expect(adapter.requests.single.headers['Authorization'], 'Bearer access-1');
    expect(adapter.requests.single.headers['Accept-Language'], 'tr');
  });

  test('a 401 renews the tokens once and retries; the newest refresh token is kept', () async {
    api = build((o, body) async {
      if (o.path.endsWith('/auth/refresh')) {
        refreshCount += 1;
        expect(jsonDecode(body!)['refresh_token'], 'refresh-1');
        return json(200, sessionJson('2'));
      }
      if (o.headers['Authorization'] == 'Bearer access-1') {
        return json(401, {
          'code': 'invalid_token',
          'message': 'Sign in again.',
        });
      }
      return json(200, meJson);
    });
    // Three calls at once: one refresh.
    final results = await Future.wait([api.me(), api.me(), api.me()]);
    expect(results, hasLength(3));
    expect(refreshCount, 1);
    expect((await store.read())!.refreshToken, 'refresh-2');
    expect(
      adapter.requests.where(
        (r) => r.headers['Authorization'] == 'Bearer access-2',
      ),
      hasLength(3),
    );
  });

  test('a token about to expire is renewed before the call', () async {
    store = MemoryTokenStore(
      Session.fromJson(sessionJson('1', access: const Duration(seconds: 10))),
    );
    api = build((o, body) async {
      if (o.path.endsWith('/auth/refresh')) return json(200, sessionJson('2'));
      return json(200, meJson);
    });
    await api.me();
    expect(adapter.requests.first.path, endsWith('/auth/refresh'));
    expect(adapter.requests.last.headers['Authorization'], 'Bearer access-2');
  });

  test('a refused refresh token ends the session', () async {
    api = build((o, body) async {
      if (o.path.endsWith('/auth/refresh')) {
        return json(401, {
          'code': 'invalid_token',
          'message': 'Sign in again.',
        });
      }
      return json(401, {'code': 'invalid_token', 'message': 'Sign in again.'});
    });
    final ended = expectLater(tokens.sessionEnded, emits(null));
    await expectLater(
      api.me(),
      throwsA(
        isA<ApiException>()
            .having((e) => e.code, 'code', 'invalid_token')
            .having((e) => e.statusCode, 'status', 401),
      ),
    );
    await ended;
    expect(await store.read(), isNull);
  });

  test('errors keep the code, message, field errors and Retry-After', () async {
    api = build((o, body) async {
      if (o.path.endsWith('/notifications')) {
        return json(
          429,
          {'code': 'rate_limited', 'message': 'Later.'},
          headers: {
            'retry-after': ['1800'],
          },
        );
      }
      return json(400, {
        'code': 'invalid_request',
        'message': 'Check the price.',
        'errors': {
          'sale_price': 'The sale price must be lower than the price.',
        },
      });
    });
    await expectLater(
      api.updateProduct(
        'a',
        1,
        const ProductPatch(price: '10.00', salePrice: '20.00'),
      ),
      throwsA(
        isA<ApiException>()
            .having((e) => e.code, 'code', 'invalid_request')
            .having((e) => e.message, 'message', 'Check the price.')
            .having(
              (e) => e.fieldErrors['sale_price'],
              'field',
              'The sale price must be lower than the price.',
            ),
      ),
    );
    await expectLater(
      api.sendNotification('a', title: 't', body: 'b'),
      throwsA(
        isA<ApiException>().having((e) => e.retryAfterSeconds, 'retry', 1800),
      ),
    );
  });

  test('pending and suspended accounts are reported', () async {
    final blocked = <String>[];
    adapter = FakeAdapter(
      (o, body) async =>
          json(403, {'code': 'account_suspended', 'message': 'Suspended.'}),
    );
    final api = HttpOwnerApi(
      baseUrl: 'https://yallapp.com.tr/api/owner/v1',
      language: () => 'en',
      tokens: TokenManager(
        store: store,
        refresh: (_) async => throw StateError('no'),
      ),
      adapter: adapter,
      onAccountBlocked: (e) => blocked.add(e.code),
    );
    await expectLater(api.today('a'), throwsA(isA<ApiException>()));
    expect(blocked, ['account_suspended']);
  });

  test('no answer is an offline error', () async {
    api = build(
      (o, body) async =>
          throw DioException.connectionError(requestOptions: o, reason: 'down'),
    );
    await expectLater(
      api.today('a'),
      throwsA(
        isA<ApiException>().having((e) => e.isOffline, 'offline', isTrue),
      ),
    );
  });

  test(
    'a body without the contract\'s shape gets a code from the status',
    () async {
      api = build((o, body) async => ResponseBody.fromString('<html>', 502));
      await expectLater(
        api.builds('a'),
        throwsA(
          isA<ApiException>().having((e) => e.code, 'code', 'server_error'),
        ),
      );
    },
  );

  test('lists send their filters and read their pages', () async {
    api = build(
      (o, body) async => json(200, {
        'page': 1,
        'per_page': 20,
        'total': 41,
        'total_pages': 3,
        'items': [
          {
            'id': 7,
            'number': '1042',
            'status': 'processing',
            'kitchen': {
              'type': 'pickup',
              'step': 'received',
              'step_label': 'New',
            },
            'total': {
              'amount_cents': 48500,
              'currency': 'TRY',
              'formatted': '₺485.00',
            },
            'refunded': null,
            'lines': [],
            'customer': {'name': 'Sara'},
            'created_at': '2026-10-20T10:00:00Z',
            'paid_at': '2026-10-20T10:00:00Z',
            'next_statuses': ['preparing', 'cancelled'],
          },
        ],
      }),
    );
    final page = await api.orders(
      'a',
      statuses: ['processing', 'completed'],
      page: 2,
    );
    final uri = adapter.requests.single.uri;
    expect(uri.path, '/api/owner/v1/apps/a/orders');
    expect(uri.queryParameters, {
      'status': 'processing,completed',
      'page': '2',
      'per_page': '20',
    });
    expect(page.hasMore, isTrue);
    expect(page.items.single.label, '#1042');
    expect(page.items.single.kitchen!.step, 'received');
  });

  test(
    'a product patch sends null to remove the sale price and the stock limit',
    () {
      expect(
        const ProductPatch(
          clearSalePrice: true,
          unlimitedStock: true,
          available: false,
        ).toJson(),
        {'sale_price': null, 'stock': null, 'available': false},
      );
      expect(const ProductPatch(price: '12.00', stock: 3).toJson(), {
        'price': '12.00',
        'stock': 3,
      });
    },
  );

  test(
    'the media gate: HEAD for the offset, PUT chunks, 409 gives the offset',
    () async {
      final adapter = FakeAdapter((o, body) async {
        if (o.method == 'HEAD')
          return ResponseBody.fromString(
            '',
            200,
            headers: {
              'upload-offset': ['5'],
            },
          );
        if (o.headers['Upload-Offset'] == '5') {
          return ResponseBody.fromString(
            '',
            409,
            headers: {
              'upload-offset': ['8'],
            },
          );
        }
        return ResponseBody.fromString(
          '',
          204,
          headers: {
            'upload-offset': ['12'],
          },
        );
      });
      final gate = HttpUploadTransport(adapter: adapter);
      expect(await gate.offset('https://media.example/u/x'), 5);
      expect(await gate.send('https://media.example/u/x', 5, [1, 2, 3]), 8);
      expect(await gate.send('https://media.example/u/x', 8, [1, 2, 3, 4]), 12);
      final put = adapter.requests.last;
      expect(put.method, 'PUT');
      expect(put.headers['Content-Type'], 'application/offset+octet-stream');
      expect(put.headers['Authorization'], isNull);
    },
  );

  test('updates read the final contract', () {
    final u = Update.fromJson({
      'key': 'announcement:1',
      'kind': 'update',
      'kind_label': 'Update',
      'title': 'Hello',
      'body': '**Bold** and [a link](https://x)',
      'summary': 'Bold and a link',
      'link': null,
      'link_label': null,
      'app_name': 'Bab Al Sham',
      'at': '2026-10-20T10:00:00Z',
      'unread': true,
      'current': true,
    });
    expect(u.summary, 'Bold and a link');
    expect(u.appName, 'Bab Al Sham');
    expect(u.read().unread, isFalse);
  });
}
