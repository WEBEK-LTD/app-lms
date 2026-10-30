import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'store_test.dart' show cartPrefs, storeApi;

/// 91.1 The cart's coupon: typed once, priced by the shop, and carried to
/// the checkout unless the shop said it doesn't apply.
Map<String, dynamic> couponQuote(
  String status, {
  String? message,
  bool totalFinal = true,
}) => {
  ...cartQuoteJson(),
  'coupon': {'code': 'SPRING10', 'status': status, 'message': message},
  'discount': status == 'applied' ? '₺40.00' : null,
  'shipping': totalFinal ? '₺35.00' : null,
  'tax': null,
  'total': status == 'applied'
      ? (totalFinal ? '₺395.00' : '₺360.00')
      : '₺435.00',
  'total_amount': status == 'applied' ? '395.00' : '435.00',
  'total_final': totalFinal,
};

Future<TestApp> openCart(WidgetTester tester, FakeApi api) async {
  final app = TestApp(
    signedIn: true,
    appType: AppType.store,
    api: api,
    preferences: {CartController.storageKey: cartPrefs()},
  );
  await app.pump(tester);
  app.container.read(appRouterProvider).go('/cart');
  await TestApp.settle(tester);
  return app;
}

Future<void> typeCoupon(WidgetTester tester, String code) async {
  await tester.tap(find.byKey(const Key('cart-coupon-open')));
  await TestApp.settle(tester);
  await tester.enterText(find.byKey(const Key('cart-coupon-field')), code);
  await tester.tap(find.byKey(const Key('cart-coupon-apply')));
  await TestApp.settle(tester);
}

/// 110 The total on the cart's bar, by the Checkout button.
Finder onBar(Finder finder) => find.descendant(
  of: find.byKey(const ValueKey('cart-bar-total')),
  matching: finder,
);

void main() {
  testWidgets('an applied coupon shows its discount and goes to the checkout', (
    tester,
  ) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false));
    final app = await openCart(tester, api);
    expect(find.text('Have a coupon?'), findsOneWidget);
    expect(find.text('Delivery and taxes are added at checkout.'), findsOne);
    expect(api.lastCoupon, isNull);

    api.cartQuote = couponQuote('applied');
    await typeCoupon(tester, ' spring 10 ');
    expect(api.lastCoupon, 'SPRING10');
    expect(find.text('SPRING10 applied'), findsOneWidget);
    expect(find.text('−₺40.00'), findsOneWidget);
    expect(find.text('₺35.00'), findsOneWidget);
    // In the summary, and on the bar.
    expect(find.text('Total'), findsNWidgets(2));
    expect(find.text('₺395.00'), findsNWidgets(2));
    expect(onBar(find.text('Total')), findsOneWidget);
    expect(onBar(find.text('₺395.00')), findsOneWidget);
    expect(find.text('Plus shipping and taxes at checkout.'), findsNothing);

    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);
    expect(api.count('createStoreCheckoutLink'), 1);
    expect(api.lastCoupon, 'SPRING10');
    expect(app.webViews.requests, isNotEmpty);
  });

  testWidgets('the total says when the checkout still adds shipping', (
    tester,
  ) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false));
    await openCart(tester, api);
    api.cartQuote = couponQuote('applied', totalFinal: false);
    await typeCoupon(tester, 'SPRING10');
    expect(find.text('₺360.00'), findsNWidgets(2));
    expect(onBar(find.text('₺360.00')), findsOneWidget);
    expect(find.text('Plus shipping and taxes at checkout.'), findsOneWidget);
  });

  testWidgets("a coupon that doesn't apply says why and stays out", (
    tester,
  ) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false));
    await openCart(tester, api);
    api.cartQuote = couponQuote('invalid', message: 'This coupon has expired.');
    await typeCoupon(tester, 'SPRING10');
    expect(find.text('This coupon has expired.'), findsOneWidget);
    expect(find.text('Discount'), findsNothing);

    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);
    expect(api.count('createStoreCheckoutLink'), 1);
    expect(api.lastCoupon, isNull);
  });

  testWidgets('a coupon checked on the checkout goes along; removing it '
      'prices the cart again', (tester) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false));
    await openCart(tester, api);
    api.cartQuote = couponQuote('at_checkout');
    await typeCoupon(tester, 'SPRING10');
    expect(find.text('SPRING10 is applied at checkout.'), findsOneWidget);

    api.cartQuote = cartQuoteJson();
    await tester.tap(find.byKey(const Key('cart-coupon-remove')));
    await TestApp.settle(tester);
    expect(api.lastCoupon, isNull);
    expect(find.text('Have a coupon?'), findsOneWidget);
  });

  testWidgets('the coupon reads in Arabic', (tester) async {
    final api = FakeApi(
      config: {
        ...configJson(lms: null, orders: true, languages: languagesJson()),
        'store': storeConfigJson(deliveryDate: false),
      },
    );
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {
        'settings.language': 'ar',
        CartController.storageKey: cartPrefs(),
      },
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/cart');
    await TestApp.settle(tester);
    api.cartQuote = couponQuote('applied');
    await typeCoupon(tester, 'SPRING10');
    expect(find.textContaining('تم تطبيق'), findsOneWidget);
    expect(find.text('الإجمالي'), findsNWidgets(2));
    expect(onBar(find.text('الإجمالي')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
