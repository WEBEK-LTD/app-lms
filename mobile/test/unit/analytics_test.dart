import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/services/analytics.dart';
import 'package:yallapp/core/services/analytics_interceptor.dart';

import '../../tool/src/build_config_tool.dart';

/// 44 Usage statistics: the queue, batches, retries, the toggle, the preview
/// and the events the API calls mean.
void main() {
  late DateTime now;
  late List<Map<String, Object?>> sent;
  late List<int> answers;

  setUp(() {
    now = DateTime.utc(2026, 10, 19, 12);
    sent = [];
    answers = [];
  });

  Future<AnalyticsResponse> sender(
    String url,
    String key,
    Map<String, Object?> body,
  ) async {
    expect(url, 'https://yallapp.com.tr/api/v1/apps/app-1/events');
    expect(key, 'k3y-for-the-tests-0123456789');
    sent.add(body);
    final status = answers.isEmpty ? 202 : answers.removeAt(0);
    return AnalyticsResponse(status);
  }

  Future<AnalyticsService> service({
    Map<String, Object> stored = const {},
    bool enabled = true,
    String? url = 'https://yallapp.com.tr/api/v1/apps/app-1/events',
  }) async {
    SharedPreferences.setMockInitialValues(stored);
    final prefs = await SharedPreferences.getInstance();
    return AnalyticsService(
      preferences: prefs,
      eventsUrl: url,
      key: url == null ? null : 'k3y-for-the-tests-0123456789',
      platform: 'android',
      appVersion: '1.2.0',
      osVersion: 'Android 14',
      locale: () => 'ar',
      enabled: enabled,
      sender: sender,
      clock: () => now,
    );
  }

  List<Map<String, Object?>> events(Map<String, Object?> body) =>
      (body['events']! as List).cast<Map<String, Object?>>();

  test(
    'the first start sends app_open with first_open, once per install',
    () async {
      final analytics = await service();
      analytics.start(lifecycle: false, every: null);
      await analytics.flush();
      expect(events(sent.single), [
        {
          'type': 'app_open',
          'at': '2026-10-19T12:00:00.000Z',
          'first_open': true,
        },
      ]);
      final body = sent.single;
      expect(body['platform'], 'android');
      expect(body['app_version'], '1.2.0');
      expect(body['os_version'], 'Android 14');
      expect(body['locale'], 'ar');
      expect(
        body['install_id'],
        matches(
          RegExp(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
          ),
        ),
      );
      // The next start of the same install is a session, not an install.
      final prefs = await SharedPreferences.getInstance();
      final again = AnalyticsService(
        preferences: prefs,
        eventsUrl: 'https://yallapp.com.tr/api/v1/apps/app-1/events',
        key: 'k3y-for-the-tests-0123456789',
        platform: 'android',
        appVersion: '1.2.0',
        locale: () => 'ar',
        enabled: true,
        sender: sender,
        clock: () => now,
      )..start(lifecycle: false, every: null);
      await again.flush();
      expect(events(sent.last).single, {
        'type': 'app_open',
        'at': '2026-10-19T12:00:00.000Z',
      });
      expect(sent.last['install_id'], body['install_id']);
    },
  );

  test(
    'sends 100 events a request, and keeps the queue on the phone',
    () async {
      final analytics = await service();
      for (var i = 0; i < 250; i++) {
        analytics.screen(i.isEven ? '/course/$i' : '/home');
      }
      // Only changes count: each alternation is a new screen.
      expect(analytics.queued, hasLength(250));
      final prefs = await SharedPreferences.getInstance();
      expect(
        prefs.getString(AnalyticsService.queueKey),
        contains('screen_view'),
      );
      final restored = AnalyticsService(
        preferences: prefs,
        eventsUrl: 'https://yallapp.com.tr/api/v1/apps/app-1/events',
        key: 'k3y-for-the-tests-0123456789',
        platform: 'android',
        appVersion: '1.2.0',
        locale: () => 'ar',
        enabled: true,
        sender: sender,
        clock: () => now,
      );
      expect(restored.queued, hasLength(250));
      expect(await restored.flush(), 250);
      expect(sent.map((b) => events(b).length), [100, 100, 50]);
      expect(events(sent.first).first, {
        'type': 'screen_view',
        'at': '2026-10-19T12:00:00.000Z',
        'screen': 'course',
      });
      expect(restored.queued, isEmpty);
      expect(prefs.getString(AnalyticsService.queueKey), '[]');
    },
  );

  test('tries again after a failure with a growing pause, and drops what a 400 refuses', () async {
    final analytics = await service();
    analytics.search('olive oil');
    answers.addAll([503, 0, 202]);
    expect(await analytics.flush(), 0);
    expect(analytics.queued, hasLength(1));
    // Within the pause: nothing goes.
    now = now.add(const Duration(seconds: 20));
    await analytics.flush();
    expect(sent, hasLength(1));
    now = now.add(const Duration(seconds: 15));
    expect(await analytics.flush(), 0);
    expect(sent, hasLength(2));
    // The second failure waits a minute.
    now = now.add(const Duration(seconds: 45));
    await analytics.flush();
    expect(sent, hasLength(2));
    now = now.add(const Duration(seconds: 20));
    expect(await analytics.flush(), 1);
    expect(analytics.queued, isEmpty);

    analytics.search('broken');
    answers.add(400);
    await analytics.flush();
    expect(analytics.queued, isEmpty);
  });

  test(
    'drops events older than 7 days, and stops on 404 until the next start',
    () async {
      final analytics = await service();
      analytics.search('old one');
      now = now.add(const Duration(days: 8));
      analytics.search('new one');
      await analytics.flush();
      expect(events(sent.single).map((e) => e['query']), ['new one']);

      analytics.search('again');
      answers.add(404);
      await analytics.flush();
      analytics.search('after');
      expect(analytics.queued, isEmpty);
      await analytics.flush();
      expect(sent, hasLength(2));
    },
  );

  test('a session starts again after 30 minutes in the background', () async {
    final analytics = await service(
      stored: {AnalyticsService.firstOpenKey: true},
    );
    analytics.start(lifecycle: false, every: null);
    analytics.wentToBackground();
    now = now.add(const Duration(minutes: 10));
    analytics.cameToForeground();
    analytics.wentToBackground();
    now = now.add(const Duration(minutes: 31));
    analytics.cameToForeground();
    expect(analytics.queued.map((e) => e['type']), ['app_open', 'app_open']);
  });

  test(
    'turning sharing off stops it and deletes the queue and the install ID',
    () async {
      final analytics = await service();
      analytics.search('yoga mat');
      await analytics.flush();
      final prefs = await SharedPreferences.getInstance();
      final firstId = prefs.getString(AnalyticsService.installIdKey);
      expect(firstId, isNotNull);
      analytics.search('waiting');
      analytics.setEnabled(false);
      expect(analytics.queued, isEmpty);
      expect(prefs.getString(AnalyticsService.queueKey), isNull);
      expect(prefs.getString(AnalyticsService.installIdKey), isNull);
      analytics.search('while off');
      expect(analytics.queued, isEmpty);
      expect(await analytics.flush(), 0);
      expect(sent, hasLength(1));
      // On again: a new install ID, and no second first open.
      analytics.setEnabled(true);
      analytics.search('back on');
      await analytics.flush();
      expect(sent.last['install_id'], isNot(firstId));

      // Starting with sharing off forgets what an older run left.
      final off = await service(
        stored: {
          AnalyticsService.queueKey:
              '[{"type":"search","at":"2026-10-19T11:00:00Z"}]',
        },
        enabled: false,
      );
      expect(off.queued, isEmpty);
      off.start(lifecycle: false, every: null);
      expect(await off.flush(), 0);
    },
  );

  test(
    'the preview and builds without analytics never record or send',
    () async {
      final analytics = await service(url: null);
      expect(analytics.available, isFalse);
      analytics.start(lifecycle: false, every: null);
      analytics.search('anything');
      analytics.pushOpened({'type': 'announcement', 'notification_id': '7'});
      expect(analytics.queued, isEmpty);
      expect(await analytics.flush(), 0);
      expect(sent, isEmpty);
    },
  );

  test(
    'push opens, items and their amounts as the contract has them',
    () async {
      final analytics = await service();
      analytics.pushOpened({'type': 'announcement', 'notification_id': '7'});
      analytics.pushOpened({'type': 'New Lesson!'});
      analytics.item(
        'add_to_cart',
        kind: 'product',
        id: 42,
        title: '  Olive oil  ',
        amount: 12.5,
        currency: 'try',
      );
      expect(analytics.queued.map((e) => {...e}..remove('at')), [
        {
          'type': 'push_open',
          'notification_id': '7',
          'push_type': 'announcement',
        },
        {'type': 'push_open'},
        {
          'type': 'add_to_cart',
          'item_kind': 'product',
          'item_id': '42',
          'title': 'Olive oil',
          'amount': 12.5,
          'currency': 'TRY',
        },
      ]);
    },
  );

  test('screen kinds never carry IDs', () {
    expect(screenKindOf('/home'), 'home');
    expect(screenKindOf('/course/12'), 'course');
    expect(screenKindOf('/product/12/reviews'), 'product_reviews');
    expect(screenKindOf('/account/orders/5'), 'order');
    expect(
      screenKindOf('/account/settings/devices'),
      'account_settings_devices',
    );
    expect(screenKindOf('/messages/9'), 'conversation');
    expect(screenKindOf('/page/about-us'), 'page');
    expect(screenKindOf('/article/how-to-cook'), 'article');
    expect(screenKindOf('/ticket/AB12CD'), 'ticket');
    expect(screenKindOf('/sign-in/code'), 'sign_in_code');
    expect(screenKindOf('/events?category=music'), 'events');
    expect(screenKindOf(''), isNull);
  });

  test('API answers become events, for every app type', () {
    expect(
      eventsFor(
        method: 'GET',
        path: '/wp-json/yallapp/v1/courses/12',
        answer: {'title': 'Arabic 101'},
      ).single.fields,
      {'item_kind': 'course', 'item_id': '12', 'title': 'Arabic 101'},
    );
    expect(
      eventsFor(
        method: 'GET',
        path: '/api/app/x/store/products/5',
        answer: {'name': 'Mug'},
      ).single.type,
      'item_view',
    );
    expect(eventsFor(method: 'GET', path: '/courses/12/curriculum'), isEmpty);
    expect(
      eventsFor(
        method: 'GET',
        path: '/news/articles/a-b',
        answer: {'title': 'T'},
      ).single.fields['item_kind'],
      'article',
    );
    expect(
      eventsFor(
        method: 'GET',
        path: '/events',
        query: {'search': 'jazz', 'page': 1},
      ).single.fields,
      {'query': 'jazz'},
    );
    expect(
      eventsFor(
        method: 'GET',
        path: '/events',
        query: {'search': 'jazz', 'page': 2},
      ),
      isEmpty,
    );
    expect(
      eventsFor(method: 'POST', path: '/courses/3/enroll').single.type,
      'enroll',
    );
    expect(
      eventsFor(
        method: 'POST',
        path: '/auth/checkout-link',
        body: {'course_id': 3},
      ).single.type,
      'purchase_click',
    );
    expect(
      eventsFor(
        method: 'POST',
        path: '/store/checkout-link',
        body: {
          'lines': [
            {'product_id': 9, 'quantity': 1},
          ],
        },
      ).single.fields['item_id'],
      '9',
    );
    expect(
      eventsFor(
        method: 'POST',
        path: '/bookings/appointments',
        body: {'service_id': 4},
      ).single.type,
      'book',
    );
    expect(
      eventsFor(
        method: 'POST',
        path: '/bookings/classes/8/book',
      ).single.fields['item_kind'],
      'class',
    );
    expect(
      eventsFor(method: 'POST', path: '/events/6/register').single.type,
      'ticket',
    );
    expect(
      eventsFor(
        method: 'POST',
        path: '/events/checkout-link',
        body: {'event_id': 6},
      ).map((e) => e.type),
      ['ticket', 'purchase_click'],
    );
    final donation = eventsFor(
      method: 'POST',
      path: '/donations/checkout-link',
      body: {'campaign_id': 2, 'amount': '250.00'},
      answer: {'url': 'https://pay', 'currency': 'egp'},
    );
    expect(donation.map((e) => e.type), ['donate', 'purchase_click']);
    expect(donation.first.fields, {
      'item_kind': 'campaign',
      'item_id': '2',
      'amount': 250,
      'currency': 'EGP',
    });
    expect(
      eventsFor(
        method: 'POST',
        path: '/auth/otp/request',
        body: {'phone': '+90'},
      ),
      isEmpty,
    );
  });

  test('the build config tool writes analytics, and checks it', () {
    Map<String, dynamic> config() => {
      'schema_version': 1,
      'app_type': 'lms',
      'app_name': 'Ada',
      'short_name': 'Ada',
      'site_url': 'https://ada.test',
      'android_package': 'com.ada.app',
      'ios_bundle_id': 'com.ada.app',
      'version_name': '1.0.0',
      'version_code': 1,
      'branding': {
        'primary_color': '#0E0D24',
        'splash_color': '#F4EFE6',
        'template': 'classic',
        'font': 'Bricolage Grotesque',
      },
    };
    final withAnalytics = config()
      ..['analytics'] = {
        'events_url': 'https://yallapp.com.tr/api/v1/apps/a1/events',
        'key': 'abcdefghijklmnopqrstuvwxyz012345',
      };
    expect(validateBuildConfig(withAnalytics).isValid, isTrue);
    final dart = renderDartConfig(withAnalytics);
    expect(
      dart,
      contains("analyticsUrl: 'https://yallapp.com.tr/api/v1/apps/a1/events',"),
    );
    expect(dart, contains("analyticsKey: 'abcdefghijklmnopqrstuvwxyz012345',"));
    expect(renderDartConfig(config()), contains('analyticsUrl: null,'));
    final bad = config()
      ..['analytics'] = {
        'events_url': 'http://x.test/e',
        'key': 'short',
        'extra': 1,
      };
    final errors = validateBuildConfig(bad).errors.join('\n');
    expect(errors, contains('analytics.events_url'));
    expect(errors, contains('analytics.key'));
    expect(errors, contains('Unknown field "analytics.extra"'));
  });
}
