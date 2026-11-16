import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 132 A store order's delivery stage on the customer's order: out for
/// delivery with the courier to call and the shop's tracking link,
/// postponed with the new day and why, "We couldn't deliver" with what's
/// next, and the order's chip saying where it is. A stage this app doesn't
/// know shows the order as in progress. Light, dark, right to left.

void _phone(WidgetTester tester) {
  tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
}

Future<FakeApi> _open(
  WidgetTester tester,
  Map<String, Object?> stage, {
  String language = 'en',
  String theme = 'light',
}) async {
  _phone(tester);
  final api =
      FakeApi(
          config: {
            ...configJson(
              lms: null,
              orders: true,
              languages: {
                'default': 'en',
                'available': ['en', 'ar'],
              },
            ),
            'store': storeConfigJson(),
          },
        )
        ..order = {
          ...orderJson(),
          'status': 'processing',
          'status_label': 'Processing',
          'stage': stage,
        };
  final app = TestApp(
    api: api,
    appType: AppType.store,
    signedIn: true,
    preferences: {'settings.language': language, 'settings.theme_mode': theme},
  );
  await app.pump(tester);
  app.container.read(appRouterProvider).push(Paths.order(1042));
  await TestApp.settle(tester, 20);
  return api;
}

void main() {
  testWidgets('out for delivery: the courier to call and the tracking link', (
    tester,
  ) async {
    await _open(tester, {
      'code': 'shipped',
      'label': 'Out for delivery',
      'courier': {'name': 'Mostafa', 'phone': '+20 100 555 1234'},
      'tracking_url': 'https://track.example.com/a1',
    });
    final card = find.byKey(const ValueKey('order-stage'));
    expect(card, findsOneWidget);
    expect(
      find.descendant(of: card, matching: find.text('Out for delivery')),
      findsOneWidget,
    );
    expect(find.text('Courier: Mostafa'), findsOneWidget);
    expect(find.text('Call the courier'), findsOneWidget);
    expect(find.text('Follow the delivery'), findsOneWidget);
    // The chip says where it is.
    final chip = find.byKey(const ValueKey('order-status'));
    expect(
      find.descendant(of: chip, matching: find.text('Out for delivery')),
      findsOneWidget,
    );
  });

  testWidgets('postponed: the new day and why', (tester) async {
    await _open(tester, {
      'code': 'postponed',
      'label': 'Delivery postponed',
      'reason': "The recipient isn't available",
      'date': '2026-11-17',
      'slot': {
        'id': 's1',
        'start': '10:00',
        'end': '13:00',
        'label': '10:00–13:00',
      },
    });
    expect(find.text('Delivery postponed'), findsWidgets);
    expect(find.textContaining('New delivery day: Tue 17 Nov'), findsOneWidget);
    expect(find.text("The recipient isn't available"), findsOneWidget);
    expect(find.text('Call the courier'), findsNothing);
  });

  testWidgets("a failed attempt: we couldn't deliver, and what's next", (
    tester,
  ) async {
    await _open(tester, {
      'code': 'failed',
      'label': 'Delivery failed',
      'reason': 'No one answered the phone',
      'date': '2026-11-18',
      'slot': null,
      'next_step': {'code': 'retry', 'label': "We'll try again"},
    });
    expect(find.text("We couldn't deliver"), findsWidgets);
    expect(find.text("We'll try again on Wed 18 Nov"), findsOneWidget);
    expect(find.text('No one answered the phone'), findsOneWidget);
  });

  testWidgets('a stage this app doesn\'t know: the order in progress', (
    tester,
  ) async {
    await _open(tester, {'code': 'teleported', 'label': 'Teleported'});
    expect(find.byKey(const ValueKey('order-stage')), findsNothing);
    final chip = find.byKey(const ValueKey('order-status'));
    expect(
      find.descendant(of: chip, matching: find.text('Processing')),
      findsOneWidget,
    );
  });

  testWidgets('in Arabic, dark, right to left', (tester) async {
    await _open(
      tester,
      {
        'code': 'postponed',
        'label': 'تم تأجيل التوصيل',
        'reason': 'لعدم توفّر المستلم',
        'date': '2026-11-17',
        'slot': {
          'id': 's1',
          'start': '10:00',
          'end': '13:00',
          'label': '10:00–13:00',
        },
      },
      language: 'ar',
      theme: 'dark',
    );
    final title = find.descendant(
      of: find.byKey(const ValueKey('order-stage')),
      matching: find.text('تم تأجيل التوصيل'),
    );
    expect(title, findsOneWidget);
    expect(Directionality.of(tester.element(title)), TextDirection.rtl);
    expect(Theme.of(tester.element(title)).brightness, Brightness.dark);
    expect(find.textContaining('موعد التوصيل الجديد: '), findsOneWidget);
    expect(find.text('لعدم توفّر المستلم'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('older servers and unknown stages read as no stage', () {
    expect(OrderStage.tryParse(null), isNull);
    expect(OrderStage.tryParse({'code': 'teleported'}), isNull);
    final s = OrderStage.tryParse({
      'code': 'shipped',
      'label': 'Out for delivery',
      'courier': {'name': 'Ali', 'phone': null},
    })!;
    expect(s.courierName, 'Ali');
    expect(s.courierPhone, isNull);
  });
}
