import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'events_test.dart' show usePhone;
import 'store_test.dart' show cartPrefs, storeApi;

/// 91.4 Loyalty points: used with a switch in the cart, taken off the total
/// and carried to the checkout; My points shows the balance and history;
/// an order shows the points it used and earned.

Map<String, dynamic> loyaltyJson() => {
  'enabled': true,
  'spend_per_point': '10.00',
  'spend_per_point_formatted': '₺10.00',
  'point_value': '0.10',
  'point_value_formatted': '₺0.10',
  'min_points': 100,
};

Map<String, dynamic> pointsQuote({required bool applied, int balance = 250}) =>
    {
      ...cartQuoteJson(),
      'shipping': '₺35.00',
      'tax': null,
      'total': applied ? '₺410.00' : '₺435.00',
      'total_amount': applied ? '410.00' : '435.00',
      'total_final': true,
      'points': {
        'balance': balance,
        'usable': balance >= 100 ? balance : 0,
        'usable_value': balance >= 100 ? '₺25.00' : null,
        'applied': applied,
        'discount': applied ? '₺25.00' : null,
      },
    };

FakeApi pointsApi() => storeApi(
  store: {...storeConfigJson(deliveryDate: false), 'loyalty': loyaltyJson()},
);

Future<TestApp> open(WidgetTester tester, FakeApi api, String path) async {
  final app = TestApp(
    signedIn: true,
    appType: AppType.store,
    api: api,
    preferences: {CartController.storageKey: cartPrefs()},
  );
  await app.pump(tester);
  app.container.read(appRouterProvider).go(path);
  await TestApp.settle(tester);
  return app;
}

/// 110 The total on the cart's bar, by the Checkout button.
Finder onBar(Finder finder) => find.descendant(
  of: find.byKey(const ValueKey('cart-bar-total')),
  matching: finder,
);

void main() {
  test('the models read points, and older servers mean none', () {
    final config = StoreConfig.fromJson({
      ...storeConfigJson(),
      'loyalty': loyaltyJson(),
    });
    expect(config.loyalty!.spendPerPoint, '₺10.00');
    expect(config.loyalty!.minPoints, 100);
    expect(StoreConfig.fromJson(storeConfigJson()).loyalty, isNull);
    expect(CartQuote.fromJson(cartQuoteJson()).points, isNull);
    final order = Order.fromJson({
      ...orderJson(),
      'points': {'used': 250, 'discount': '₺25.00', 'earned': 37},
    });
    expect(order.points!.used, 250);
    expect(order.points!.earned, 37);
    expect(Order.fromJson(orderJson()).points, isNull);
    final account = PointsAccount.fromJson({
      'balance': 37,
      'value': '₺3.70',
      'entries': [
        {
          'points': -250,
          'reason': 'used',
          'order_id': 1042,
          'order_number': '1042',
          'created_at': '2026-10-26T10:00:00Z',
        },
        {
          'points': 250,
          'reason': 'given_back',
          'order_id': null,
          'order_number': null,
          'created_at': '2026-10-25T10:00:00Z',
        },
      ],
    });
    expect(account.entries.first.reason, PointsReason.used);
    expect(account.entries.last.reason, PointsReason.givenBack);
  });

  testWidgets(
    'the cart uses the points with a switch, and checks out with them',
    (tester) async {
      usePhone(tester);
      final api = pointsApi()
        ..cartQuote = pointsQuote(applied: false)
        ..cartQuoteWithPoints = pointsQuote(applied: true);
      await open(tester, api, '/cart');
      expect(find.text('Use 250 points'), findsOneWidget);
      expect(find.text('₺25.00 off this order'), findsOneWidget);
      // In the summary, and on the bar by the Checkout button.
      expect(find.text('₺435.00'), findsNWidgets(2));
      expect(onBar(find.text('₺435.00')), findsOneWidget);
      expect(api.lastUsePoints, isFalse);

      await tester.tap(find.byKey(const Key('cart-use-points')));
      await TestApp.settle(tester);
      expect(api.lastUsePoints, isTrue);
      expect(find.text('Points'), findsOneWidget);
      expect(find.text('−₺25.00'), findsOneWidget);
      expect(find.text('₺410.00'), findsNWidgets(2));
      expect(onBar(find.text('₺410.00')), findsOneWidget);

      await tester.tap(find.text('Checkout'));
      await TestApp.settle(tester);
      expect(api.count('createStoreCheckoutLink'), 1);
      expect(api.lastUsePoints, isTrue);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('too few points say how many are needed', (tester) async {
    usePhone(tester);
    final api = pointsApi()
      ..cartQuote = pointsQuote(applied: false, balance: 60);
    await open(tester, api, '/cart');
    expect(find.text('60 points'), findsOneWidget);
    expect(find.text('Use them once you have 100 points.'), findsOneWidget);
    expect(find.byKey(const Key('cart-use-points')), findsNothing);
  });

  testWidgets('My points, from the account, in Arabic', (tester) async {
    usePhone(tester);
    final api =
        storeApi(
            store: {
              ...storeConfigJson(deliveryDate: false),
              'loyalty': loyaltyJson(),
            },
          )
          ..config = {
            ...configJson(
              lms: null,
              orders: true,
              languages: languagesJson(available: const ['en', 'ar', 'tr']),
            ),
            'store': {
              ...storeConfigJson(deliveryDate: false),
              'loyalty': loyaltyJson(),
            },
          }
          ..points = {
            'balance': 37,
            'value': '₺3.70',
            'entries': [
              {
                'points': 37,
                'reason': 'earned',
                'order_id': 1042,
                'order_number': '1042',
                'created_at': '2026-10-26T10:00:00Z',
              },
            ],
          };
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {'settings.language': 'ar'},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go(Paths.account);
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('account-points')));
    await TestApp.settle(tester);
    expect(find.text('نقاطي'), findsWidgets);
    expect(find.byKey(const Key('points-balance')), findsOneWidget);
    expect(find.text('37 نقطة'), findsOneWidget);
    expect(find.text('مكتسبة'), findsOneWidget);
    expect(find.text('+37'), findsOneWidget);
  });

  testWidgets('an order shows the points it used and earned', (tester) async {
    usePhone(tester);
    final api = pointsApi()
      ..order = {
        ...orderJson(),
        'status': 'completed',
        'status_label': 'Completed',
        'points': {'used': 250, 'discount': '₺25.00', 'earned': 37},
      };
    await open(tester, api, '/account/orders/1042');
    expect(find.text('250 points used: −₺25.00'), findsOneWidget);
    expect(find.text('37 points earned'), findsOneWidget);
  });
}
