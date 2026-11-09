import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 115 A marketplace's tabs, as the approved home has them: Home, Search,
/// Orders, Club and Account. Search finds places, dishes and products;
/// Club shows the club, the member's benefits and the wallet.
void main() {
  Map<String, dynamic> money(String a) => {'amount': a, 'formatted': 'EGP $a'};
  Map<String, dynamic> screen(String name) => {
    'type': 'screen',
    'screen': name,
  };

  /// The tabs Studio starts every marketplace with (lib/app/kinds.ts).
  Map<String, dynamic> studioTabs() => navigationJson(
    tabs: [
      navTabJson('home', 'Home', 'home', {'type': 'page', 'page_slug': 'home'}),
      navTabJson('search', 'Search', 'search', screen('search')),
      navTabJson('orders', 'Orders', 'receipt_long', screen('food_orders')),
      navTabJson('club', 'Club', 'workspace_premium', screen('club')),
      navTabJson('account', 'Account', 'person', screen('account')),
    ],
  );

  FakeApi marketApi({bool market = true}) {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        if (market)
          'market': {
            'currency': 'EGP',
            'kinds': ['restaurant', 'grocery'],
            'payment': {'cash': true},
            'club': true,
            'wallet': true,
          },
      },
    );
    api.me = userJson();
    api.marketVendors
      ..add(marketVendorSummaryJson())
      ..add(marketVendorSummaryJson(id: 8, kind: 'grocery'));
    api.marketProducts[8] = [
      {'id': 31, 'name': 'Red apples', 'price': money('65.00'), 'unit': 'kg'},
      {'id': 32, 'name': 'Baguette', 'price': money('25.00')},
    ];
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
    api.marketWallet = {
      'balance': money('55.00'),
      'entries': const [],
      'page': 1,
      'total_pages': 1,
    };
    return api;
  }

  Finder navTab(String label) => find.descendant(
    of: find.bySemanticsLabel(RegExp('Main navigation')),
    matching: find.text(label),
  );

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  testWidgets('Studio\'s tabs: Home, Search, Orders, Club and Account', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi()..navigation = studioTabs();
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    for (final label in ['Home', 'Search', 'Orders', 'Club', 'Account']) {
      expect(navTab(label), findsOneWidget, reason: label);
    }
  });

  testWidgets('a marketplace that published no tabs gets them too', (
    tester,
  ) async {
    phone(tester);
    final app = TestApp(
      api: marketApi(),
      appType: AppType.food,
      signedIn: true,
    );
    await app.pump(tester);
    for (final label in ['Search', 'Orders', 'Club', 'Account']) {
      expect(navTab(label), findsOneWidget, reason: label);
    }
    expect(navTab('Restaurants'), findsNothing);
  });

  testWidgets('Search finds places, and dishes and products with their place', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi()..navigation = studioTabs();
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    await tester.tap(navTab('Search'));
    await TestApp.settle(tester, 20);
    expect(
      find.text('Find a restaurant, a dish or something from the shops.'),
      findsOneWidget,
    );

    await tester.enterText(find.byKey(const ValueKey('market-search')), 'a');
    await tester.pump(const Duration(milliseconds: 400));
    await TestApp.settle(tester, 20);
    // One letter isn't searched for.
    expect(api.marketSearches, isEmpty);

    await tester.enterText(
      find.byKey(const ValueKey('market-search')),
      'apple',
    );
    await tester.pump(const Duration(milliseconds: 400));
    await TestApp.settle(tester, 20);
    expect(api.marketSearches, ['apple']);
    expect(find.text('Dishes and products'), findsOneWidget);
    expect(find.text('Red apples'), findsOneWidget);
    expect(find.text('Green Basket Market'), findsOneWidget);
    expect(find.text('Places'), findsNothing);

    await tester.enterText(
      find.byKey(const ValueKey('market-search')),
      'grill',
    );
    await tester.pump(const Duration(milliseconds: 400));
    await TestApp.settle(tester, 20);
    expect(find.text('Places'), findsOneWidget);
    expect(find.text('Nile Grill House'), findsWidgets);

    await tester.enterText(
      find.byKey(const ValueKey('market-search')),
      'pizza',
    );
    await tester.pump(const Duration(milliseconds: 400));
    await TestApp.settle(tester, 20);
    expect(find.text('Nothing found for “pizza”.'), findsOneWidget);
  });

  testWidgets('Club shows the club, its benefits and the member\'s wallet', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi()..navigation = studioTabs();
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    await tester.tap(navTab('Club'));
    await TestApp.settle(tester, 20);
    expect(find.text('Plus'), findsOneWidget);
    expect(
      find.text('Free delivery on orders over EGP 150.00'),
      findsOneWidget,
    );
    expect(find.text('Wallet'), findsOneWidget);
    expect(find.text('EGP 55.00'), findsOneWidget);
    await tester.tap(find.text('Wallet'));
    await TestApp.settle(tester, 20);
    expect(find.text('Your balance'), findsOneWidget);
  });

  testWidgets('a food delivery app has no Search or Club to show', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi(market: false)..navigation = studioTabs();
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    expect(navTab('Orders'), findsOneWidget);
    expect(navTab('Search'), findsNothing);
    expect(navTab('Club'), findsNothing);
  });
}
