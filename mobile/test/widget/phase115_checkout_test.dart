import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/market/data/market_basket.dart';
import 'package:yallapp/modules/market/data/market_models.dart';
import 'package:yallapp/modules/market/data/market_place.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 115 The marketplace's checkout: the basket priced by the server, a
/// coupon, picking up instead of delivery, cash, and the order it makes.
void main() {
  FakeApi marketApi() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': {
          'country': 'EG',
          'currency': 'EGP',
          'currency_decimals': 2,
          'kinds': ['restaurant', 'grocery'],
          'categories': const [],
          'payment': {
            'cash': true,
            'card': true,
            'apple_pay': true,
            'google_pay': true,
            'wallet': true,
          },
          'pickup': true,
          'scheduling': {'enabled': true, 'days_ahead': 3},
          'club': false,
          'wallet': true,
        },
      },
    );
    api.me = userJson();
    return api;
  }

  const vendor = MarketVendor(
    id: '7',
    kind: MarketVendorKind.restaurant,
    name: 'Nile Grill House',
    coverUrl: '',
    logoUrl: '',
    tags: [],
  );
  const grill = MarketItem(
    id: '1',
    name: 'Mixed grill',
    price: 'EGP 265.00',
    priceValue: 265,
  );

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  Future<TestApp> open(WidgetTester tester, FakeApi api) async {
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    await app.container.read(marketPlaceProvider.notifier).set((
      address: '9 Road 233, Maadi',
      lat: 29.96,
      lng: 31.25,
    ));
    app.container
        .read(marketBasketProvider.notifier)
        .add(vendor, grill, currency: 'EGP', decimals: 2);
    app.container.read(appRouterProvider).push(Paths.marketCheckout);
    await TestApp.settle(tester, 20);
    return app;
  }

  testWidgets('the basket is priced line by line and ordered in cash', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi();
    final app = await open(tester, api);

    expect(find.text('Your basket'), findsOneWidget);
    expect(find.text('Mixed grill'), findsOneWidget);
    expect(find.text('9 Road 233, Maadi'), findsOneWidget);
    // The server's price, every line of it.
    expect(find.text('Coupon LUNCH'), findsOneWidget);
    expect(find.text('Total'), findsOneWidget);
    expect(api.marketQuotes, isNotEmpty);
    final cart = api.marketQuotes.last.toJson();
    expect(cart['vendor_id'], 7);
    expect(cart['fulfilment'], 'delivery');
    expect((cart['dropoff'] as Map)['lat'], 29.96);
    expect((cart['lines'] as List).single, {'product_id': 1, 'quantity': 1.0});

    // A coupon is priced again.
    await tester.enterText(find.byType(TextField).at(1), 'lunch');
    await tester.tap(find.text('Apply'));
    await TestApp.settle(tester, 20);
    expect(api.marketQuotes.last.toJson()['coupon_code'], 'lunch');

    final place = find.textContaining('Place order');
    await tester.scrollUntilVisible(
      place,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await TestApp.settle(tester);
    await tester.tap(place);
    await TestApp.settle(tester, 20);

    expect(api.marketOrdersPlaced.single.payment, MarketPayMethod.cash);
    expect(find.text('Order M-901'), findsOneWidget);
    expect(find.text('Sent to the restaurant or the shop'), findsOneWidget);
    // The basket is empty once ordered.
    expect(app.container.read(marketBasketProvider).isEmpty, isTrue);
  });

  testWidgets('picking up leaves the address out and shows the code', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi();
    await open(tester, api);

    await tester.tap(find.text('Pick up'));
    await TestApp.settle(tester, 20);
    final cart = api.marketQuotes.last.toJson();
    expect(cart['fulfilment'], 'pickup');
    expect(cart.containsKey('dropoff'), isFalse);
    expect(find.text('Deliver to'), findsNothing);
  });

  test('an order reads its stages, tracking and what the customer can do', () {
    final order = MarketOrder.fromJson(
      marketOrderJson(
        status: 'on_the_way',
        tracking: {
          'mode': 'map',
          'courier': {
            'name': 'Ahmed',
            'photo_url': null,
            'vehicle': 'Motorbike',
          },
          'position': {'lat': 29.95, 'lng': 31.24},
          'updated_at': '2026-11-04T10:20:00Z',
          'route': [
            [29.95, 31.24],
            [29.96, 31.25],
          ],
        },
      ),
    );
    expect(order.status, MarketOrderStatus.onTheWay);
    expect(order.deliveryBy, VendorDelivery.app);
    expect(order.tracking!.onMap, isTrue);
    expect(order.tracking!.courierName, 'Ahmed');
    expect(order.tracking!.route.length, 2);
    expect(order.canComplain, isTrue);
    expect(order.price.last.isTotal, isTrue);

    final cart = MarketCartInput(
      vendorId: 3,
      lines: const [
        MarketCartLineInput(
          productId: 5,
          quantity: 0.5,
          ifMissing: MarketIfMissing.similar,
        ),
      ],
      fulfilment: MarketFulfilment.delivery,
      address: 'Home',
      lat: 1,
      lng: 2,
      scheduledFor: DateTime.utc(2026, 11, 5, 9),
      useWallet: true,
    );
    final json = cart.orderJson(
      quoteId: 'q1',
      payment: MarketPayMethod.googlePay,
    );
    expect(json['payment'], 'google_pay');
    expect(json['quote_id'], 'q1');
    expect(json['use_wallet'], isTrue);
    expect(json['scheduled_for'], '2026-11-05T09:00:00.000Z');
    expect((json['lines'] as List).single['if_missing'], 'similar');
  });

  test('a product\'s photos: all of them, the main one first', () {
    Map<String, dynamic> product(Map<String, dynamic> extra) => {
      'id': 4,
      'name': 'Apples',
      'price': {'amount': '45.00', 'formatted': 'EGP 45.00'},
      'image_url': 'https://x.test/a.jpg',
      ...extra,
    };
    final many = MarketProduct.fromJson(
      product({
        'images': ['https://x.test/a.jpg', 'https://x.test/b.jpg'],
      }),
    );
    expect(many.photos, ['https://x.test/a.jpg', 'https://x.test/b.jpg']);
    // An older server sends only the main photo.
    expect(MarketProduct.fromJson(product({})).photos, [
      'https://x.test/a.jpg',
    ]);
  });
}
