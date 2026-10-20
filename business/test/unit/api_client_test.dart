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
import 'package:yallapp_business/core/services/push.dart';

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

  // 65 The token goes with the service it's from (owner.yaml PushTokenRequest).
  test('the push token is sent with its provider', () async {
    api = build((o, body) async => ResponseBody.fromString('', 204));
    await api.setPushToken('fcm-token');
    await api.setPushToken('hms-token', provider: PushProvider.hms.name);
    expect(adapter.requests.map((r) => '${r.method} ${r.uri.path}'), [
      'PUT /api/owner/v1/me/push-token',
      'PUT /api/owner/v1/me/push-token',
    ]);
    expect(adapter.bodies.map((b) => jsonDecode(b!)), [
      {'token': 'fcm-token', 'provider': 'fcm'},
      {'token': 'hms-token', 'provider': 'hms'},
    ]);
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
    '64b the media gate: GET for the offset, POST chunks as octet-stream '
    'with the offset in the header and the query, 409 gives the offset',
    () async {
      final adapter = FakeAdapter((o, body) async {
        if (o.method == 'GET') {
          return ResponseBody.fromString(
            '{"offset":5,"length":20}',
            200,
            headers: {
              'content-type': ['application/json'],
            },
          );
        }
        if (o.headers['Upload-Offset'] == '5') {
          return ResponseBody.fromString(
            '{"offset":8,"message":"The upload is elsewhere."}',
            409,
            headers: {
              'upload-offset': ['8'],
              'content-type': ['application/json'],
            },
          );
        }
        if (o.headers['Upload-Offset'] == '8') {
          // A proxy dropped the header: the offset only in the JSON body.
          return ResponseBody.fromString(
            '{"offset":12}',
            200,
            headers: {
              'content-type': ['application/json'],
            },
          );
        }
        // A gate before 64b: 204 with the header only.
        return ResponseBody.fromString(
          '',
          204,
          headers: {
            'upload-offset': ['16'],
          },
        );
      });
      final gate = HttpUploadTransport(adapter: adapter);
      const url = 'https://media.example/u/a/b/mp4?size=20&expires=1&sig=x';
      expect(await gate.offset(url), 5);
      expect(adapter.requests.last.method, 'GET');
      expect(await gate.send(url, 5, [1, 2, 3]), 8);
      expect(await gate.send(url, 8, [1, 2, 3, 4]), 12);
      expect(await gate.send(url, 12, [1, 2, 3, 4]), 16);
      final post = adapter.requests.last;
      expect(post.method, 'POST');
      expect(post.headers['Content-Type'], 'application/octet-stream');
      expect(post.headers['Upload-Offset'], '12');
      expect(post.uri.queryParameters, {
        'size': '20',
        'expires': '1',
        'sig': 'x',
        'offset': '12',
      });
      expect(post.headers['Authorization'], isNull);
      expect(adapter.bodies.last, '\u0001\u0002\u0003\u0004');
    },
  );

  test('64b the media gate refusing an upload says how', () async {
    var status = 403;
    const body = '<html>Forbidden</html>';
    final gate = HttpUploadTransport(
      adapter: FakeAdapter(
        (o, _) async => ResponseBody.fromString(
          body,
          status,
          headers: {
            'content-type': ['text/html'],
          },
        ),
      ),
    );
    Future<ApiException> refused() async {
      try {
        await gate.send('https://media.example/u/a/b/png?size=9', 0, [1]);
      } on ApiException catch (e) {
        return e;
      }
      fail('no refusal');
    }

    for (final s in [403, 405, 406, 410, 501]) {
      status = s;
      final e = await refused();
      expect(e.code, ApiException.uploadRefused);
      expect(e.statusCode, s);
    }
    status = 503;
    expect((await refused()).code, ApiException.uploadStorage);
    status = 413;
    expect((await refused()).code, ApiException.uploadTooBig);
    status = 502;
    expect((await refused()).code, ApiException.serverError);
    // A success with no offset: a firewall's page, not the gate.
    status = 200;
    expect((await refused()).code, ApiException.uploadRefused);
    // The connection itself: offline, as before.
    final away = HttpUploadTransport(
      adapter: FakeAdapter(
        (o, _) async => throw DioException.connectionError(
          requestOptions: o,
          reason: 'reset',
        ),
      ),
    );
    try {
      await away.send('https://media.example/u/a/b/png?size=9', 0, [1]);
      fail('no error');
    } on ApiException catch (e) {
      expect(e.isOffline, isTrue);
    }
  });

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

  test('61 moving an appointment: its free times, then the new time', () async {
    api = build((o, body) async {
      if (o.uri.path.endsWith('/times')) {
        return json(200, {
          'time_zone': 'Africa/Cairo',
          'staff': [
            {'id': 20, 'name': 'Dr. Mona Adel'},
            {'id': 21, 'name': 'Dr. Karim Nabil'},
          ],
          'days': [
            {
              'date': '2026-10-21',
              'slots': [
                {
                  'start': '2026-10-21T07:00:00Z',
                  'end': '2026-10-21T07:30:00Z',
                  'local_time': '10:00',
                  'staff_ids': [20, 21],
                },
              ],
            },
          ],
        });
      }
      return json(200, {
        'id': 9,
        'status': 'approved',
        'service': 'Check-up',
        'staff': 'Dr. Karim Nabil',
        'customer': {'name': 'Ali'},
        'start_at': '2026-10-21T07:00:00Z',
        'end_at': '2026-10-21T07:30:00Z',
        'local_date': '2026-10-21',
        'local_time': '10:00',
        'price': {
          'amount_cents': 0,
          'currency': 'EGP',
          'formatted': 'EGP 0.00',
        },
        'notes': null,
        'next_statuses': ['cancelled'],
        'can_reschedule': true,
      });
    });
    final times = await api.rescheduleTimes(
      'a',
      9,
      from: '2026-10-21',
      staffId: 21,
    );
    expect(
      adapter.requests.first.uri.path,
      '/api/owner/v1/apps/a/appointments/9/times',
    );
    expect(adapter.requests.first.uri.queryParameters, {
      'from': '2026-10-21',
      'days': '7',
      'staff_id': '21',
    });
    expect(times.staff.map((s) => s.name), [
      'Dr. Mona Adel',
      'Dr. Karim Nabil',
    ]);
    expect(times.days.single.slots.single.staffIds, [20, 21]);
    final moved = await api.reschedule(
      'a',
      9,
      start: times.days.single.slots.single.start,
      staffId: 21,
    );
    expect(
      adapter.requests.last.uri.path,
      '/api/owner/v1/apps/a/appointments/9/reschedule',
    );
    expect(jsonDecode(adapter.bodies.last!), {
      'start': '2026-10-21T07:00:00.000Z',
      'staff_id': 21,
    });
    expect(moved.canReschedule, isTrue);
    expect(moved.staff, 'Dr. Karim Nabil');
  });

  test('61 notifications sent later: list, add, change, cancel', () async {
    final item = {
      'id': 3,
      'title': 'Weekend offer',
      'body': '20% off',
      'send_at': '2026-10-24T15:00:00Z',
      'local_date': '2026-10-24',
      'local_time': '18:00',
      'status': 'scheduled',
      'result': null,
    };
    api = build((o, body) async {
      if (o.method == 'DELETE') return ResponseBody.fromString('', 204);
      if (o.method == 'GET') {
        return json(200, {
          'time_zone': 'Africa/Cairo',
          'max': 50,
          'items': [item],
        });
      }
      return json(o.method == 'POST' ? 201 : 200, item);
    });
    final list = await api.scheduledNotifications('a');
    expect(list.timeZone, 'Africa/Cairo');
    expect(list.items.single.localTime, '18:00');
    await api.scheduleNotification(
      'a',
      title: 'Weekend offer',
      body: '20% off',
      date: '2026-10-24',
      time: '18:00',
    );
    expect(adapter.requests[1].method, 'POST');
    expect(
      adapter.requests[1].uri.path,
      '/api/owner/v1/apps/a/notifications/scheduled',
    );
    expect(jsonDecode(adapter.bodies[1]!), {
      'title': 'Weekend offer',
      'body': '20% off',
      'date': '2026-10-24',
      'time': '18:00',
    });
    await api.editScheduledNotification(
      'a',
      3,
      title: 'Weekend offer',
      body: '25% off',
      date: '2026-10-24',
      time: '18:30',
    );
    expect(adapter.requests[2].method, 'PUT');
    expect(
      adapter.requests[2].uri.path,
      '/api/owner/v1/apps/a/notifications/scheduled/3',
    );
    await api.cancelScheduledNotification('a', 3);
    expect(adapter.requests[3].method, 'DELETE');
    expect(
      adapter.requests[3].uri.path,
      '/api/owner/v1/apps/a/notifications/scheduled/3',
    );
  });

  test(
    '63 questions, reviews and the door: paths, bodies and answers',
    () async {
      api = build((o, body) async {
        final path = o.uri.path;
        if (path.endsWith('/questions')) {
          return json(200, {
            'page': 1,
            'per_page': 20,
            'total': 1,
            'total_pages': 1,
            'open': 1,
            'items': [
              {
                'id': 31,
                'course_id': 10,
                'course_title': 'Arabic',
                'person': 'Omar',
                'text': 'Worksheet?',
                'status': 'open',
                'answer_count': 0,
                'created_at': '2026-10-20T08:00:00Z',
                'updated_at': '2026-10-20T08:00:00Z',
              },
            ],
          });
        }
        if (path.endsWith('/answers')) {
          return json(201, {
            'id': 31,
            'course_id': 10,
            'course_title': 'Arabic',
            'person': 'Omar',
            'text': 'Worksheet?',
            'status': 'answered',
            'answer_count': 1,
            'created_at': '2026-10-20T08:00:00Z',
            'updated_at': '2026-10-20T09:00:00Z',
            'answers': [
              {
                'id': 1,
                'from': 'business',
                'name': 'Nile Academy',
                'text': 'Yes',
                'created_at': '2026-10-20T09:00:00Z',
              },
            ],
          });
        }
        if (path.contains('/reviews/')) {
          return json(200, {
            'id': 41,
            'course_id': 10,
            'course_title': 'Arabic',
            'person': 'Fatma',
            'rating': 5,
            'text': 'Great',
            'hidden': true,
            'reply': {'text': 'Thanks', 'created_at': '2026-10-20T09:00:00Z'},
            'created_at': '2026-10-20T08:00:00Z',
            'updated_at': '2026-10-20T09:00:00Z',
          });
        }
        if (path.endsWith('/members/check-in')) {
          return json(200, {
            'outcome': 'already_in',
            'admitted': false,
            'message': 'Already checked in today at 09:12',
            'member': {
              'membership_id': 1,
              'name': 'Sara',
              'plan_name': 'Monthly',
              'ends_at': null,
              'credits_left': null,
              'checked_in_at': '2026-10-20T06:12:00Z',
            },
          });
        }
        return json(200, {
          'date': '2026-10-20',
          'time_zone': 'Africa/Cairo',
          'count': 0,
          'items': [],
        });
      });
      final questions = await api.questions('a', status: 'open');
      expect(adapter.requests.last.uri.path, '/api/owner/v1/apps/a/questions');
      expect(adapter.requests.last.uri.queryParameters['status'], 'open');
      expect(questions.open, 1);
      expect(questions.page.items.single.open, isTrue);
      final answered = await api.answerQuestion('a', 31, 'Yes');
      expect(jsonDecode(adapter.bodies.last!), {'text': 'Yes'});
      expect(answered.answers.single.fromBusiness, isTrue);
      final hidden = await api.setReviewHidden('a', 41, true);
      expect(adapter.requests.last.method, 'PATCH');
      expect(jsonDecode(adapter.bodies.last!), {'hidden': true});
      expect(hidden.hidden, isTrue);
      expect(hidden.reply?.text, 'Thanks');
      await api.replyReview('a', 41, 'Thanks');
      expect(adapter.requests.last.method, 'PUT');
      expect(
        adapter.requests.last.uri.path,
        '/api/owner/v1/apps/a/reviews/41/reply',
      );
      await api.deleteReviewReply('a', 41);
      expect(adapter.requests.last.method, 'DELETE');
      final door = await api.checkInMember('a', code: ' YM1.1.Q4MZ7KP2XH9D ');
      expect(jsonDecode(adapter.bodies.last!), {'code': 'YM1.1.Q4MZ7KP2XH9D'});
      expect(door.outcome, 'already_in');
      expect(door.member?.checkedInAt, DateTime.utc(2026, 10, 20, 6, 12));
      await api.checkInMember('a', membershipId: 7);
      expect(jsonDecode(adapter.bodies.last!), {'membership_id': 7});
      final visits = await api.memberCheckIns('a');
      expect(
        adapter.requests.last.uri.path,
        '/api/owner/v1/apps/a/members/check-ins',
      );
      expect(visits.count, 0);
    },
  );

  test('64 hiding questions and answers, freezing members: paths, bodies and answers', () async {
    final question = {
      'id': 31,
      'course_id': 10,
      'course_title': 'Arabic',
      'person': 'Omar',
      'text': 'Spam',
      'status': 'open',
      'hidden': true,
      'answer_count': 0,
      'created_at': '2026-10-20T08:00:00Z',
      'updated_at': '2026-10-20T08:00:00Z',
      'answers': [
        {
          'id': 4,
          'from': 'student',
          'name': 'Omar',
          'text': 'More spam',
          'hidden': true,
          'created_at': '2026-10-20T09:00:00Z',
        },
      ],
    };
    final member = {
      'membership_id': 7,
      'name': 'Nour',
      'phone': null,
      'plan_name': 'Monthly',
      'status': 'frozen',
      'starts_at': '2026-10-01T00:00:00Z',
      'ends_at': '2026-11-20T00:00:00Z',
      'credits_left': null,
      'checked_in_at': null,
      'frozen': {
        'from': '2026-10-19T21:00:00Z',
        'until': '2026-10-26T21:00:00Z',
      },
    };
    api = build((o, body) async {
      if (o.uri.path.contains('/members/')) return json(200, member);
      return json(200, question);
    });
    final hidden = await api.setQuestionHidden('a', 31, true);
    expect(adapter.requests.last.method, 'PATCH');
    expect(adapter.requests.last.uri.path, '/api/owner/v1/apps/a/questions/31');
    expect(jsonDecode(adapter.bodies.last!), {'hidden': true});
    expect(hidden.question.hidden, isTrue);
    expect(hidden.answers.single.hidden, isTrue);
    await api.setAnswerHidden('a', 31, 4, false);
    expect(
      adapter.requests.last.uri.path,
      '/api/owner/v1/apps/a/questions/31/answers/4',
    );
    expect(jsonDecode(adapter.bodies.last!), {'hidden': false});

    final frozen = await api.freezeMember(
      'a',
      7,
      from: '2026-10-20',
      until: '2026-10-27',
    );
    expect(adapter.requests.last.method, 'PUT');
    expect(
      adapter.requests.last.uri.path,
      '/api/owner/v1/apps/a/members/7/freeze',
    );
    expect(jsonDecode(adapter.bodies.last!), {
      'from': '2026-10-20',
      'until': '2026-10-27',
    });
    expect(frozen.frozen, isTrue);
    expect(frozen.freezeSet, isTrue);
    expect(frozen.frozenUntil, DateTime.utc(2026, 10, 26, 21));
    await api.unfreezeMember('a', 7);
    expect(adapter.requests.last.method, 'DELETE');
    // The door's answer carries `frozen_until`.
    final door = MemberCheckIn.fromJson({
      'outcome': 'frozen',
      'admitted': false,
      'message': 'Frozen until 27 Oct 2026',
      'member': {
        'membership_id': 7,
        'name': 'Nour',
        'plan_name': 'Monthly',
        'ends_at': null,
        'credits_left': null,
        'checked_in_at': null,
        'frozen_until': '2026-10-26T21:00:00Z',
      },
    });
    expect(door.member!.frozenUntil, DateTime.utc(2026, 10, 26, 21));
  });

  test('64 a push names its business', () {
    final target = pushTarget({
      'kind': 'new_order',
      'order_id': '1041',
      'business_id': 'b-2',
      'business_name': 'Omar Bakery',
    });
    expect(target.businessId, 'b-2');
    expect(target.businessName, 'Omar Bakery');
  });
}
