import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 115.10 The wallet's balance and history, and joining the delivery club.
void main() {
  Map<String, dynamic> money(String a) => {'amount': a, 'formatted': 'EGP $a'};

  FakeApi marketApi() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': {
          'currency': 'EGP',
          'kinds': ['restaurant'],
          'payment': {'cash': true},
          'club': true,
          'wallet': true,
        },
      },
    );
    api.me = userJson();
    api.marketWallet = {
      'balance': money('55.00'),
      'entries': [
        {
          'id': 1,
          'kind': 'refund',
          'amount': money('55.00'),
          'label': 'Refund for M-901',
          'order_id': 901,
          'at': '2026-11-04T11:00:00Z',
        },
      ],
      'page': 1,
      'total_pages': 1,
    };
    api.marketClub = {
      'name': 'Plus',
      'description': 'Free delivery and members\' offers.',
      'plans': [
        {
          'id': 1,
          'name': 'Monthly',
          'period': 'month',
          'price': money('49.00'),
          'benefits': ['Free delivery on orders over EGP 150.00'],
        },
      ],
    };
    return api;
  }

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  testWidgets('the wallet shows its balance and history', (tester) async {
    phone(tester);
    final app = TestApp(
      api: marketApi(),
      appType: AppType.food,
      signedIn: true,
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketWallet);
    await TestApp.settle(tester, 20);
    expect(find.text('EGP 55.00'), findsWidgets);
    expect(find.text('Refund for M-901'), findsOneWidget);
  });

  testWidgets('joining a free club plan makes a member', (tester) async {
    phone(tester);
    final api = marketApi();
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketClub);
    await TestApp.settle(tester, 20);
    expect(find.text('Plus'), findsOneWidget);
    expect(
      find.text('Free delivery on orders over EGP 150.00'),
      findsOneWidget,
    );
    await tester.tap(find.text('Join · EGP 49.00'));
    await TestApp.settle(tester, 20);
    expect(api.clubJoins, [1]);
    expect(find.text('Join · EGP 49.00'), findsNothing);
    expect(find.textContaining('Saved so far'), findsOneWidget);
  });
}
