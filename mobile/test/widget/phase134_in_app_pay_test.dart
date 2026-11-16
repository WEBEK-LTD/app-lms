import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/l10n/app_localizations.dart';
import 'package:yallapp/l10n/app_localizations_ar.dart';
import 'package:yallapp/l10n/app_localizations_en.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/widgets/in_app_payment.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 134 Pay inside the app (Demo): a store whose checkout ends in the app
/// asks for it, opens Yallapp's payment page, and says how it ended (the
/// order placed, the payment received while the shop confirms it, or not
/// paid with the cart kept), light, dark and right to left; a store that
/// doesn't, or an answer of the shop's own checkout, works as before.
void main() {
  const payPage = 'https://yallapp.com.tr/pay/tok-134';
  final cart = jsonEncode([
    const CartItem(
      productId: 21,
      quantity: 2,
      name: 'Red roses',
      price: '₺450.00',
      maxQuantity: 5,
    ).toJson(),
  ]);

  FakeApi storeApi({bool inApp = true, String payment = 'in_app'}) =>
      FakeApi(
          config: {
            ...configJson(lms: null, orders: true, languages: languagesJson()),
            'store': {
              ...storeConfigJson(deliveryDate: false),
              if (inApp) 'checkout_payment': 'in_app',
            },
          },
        )
        ..checkoutLinkJson = {
          'url': payment == 'in_app'
              ? payPage
              : 'https://your-shop.com/?yallapp_cart=abc',
          'expires_at': '2030-01-01T00:00:00Z',
          'open_in': 'in_app',
          'payment': payment,
          if (payment == 'in_app') 'payment_id': '1042',
          if (payment == 'in_app') 'gateway': 'stripe',
        };

  Future<TestApp> openCart(
    WidgetTester tester,
    FakeApi api, {
    bool dark = false,
    String language = 'en',
  }) async {
    tester.view
      ..physicalSize = const Size(1080, 2400)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {
        CartController.storageKey: cart,
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel(RegExp('^Cart|^السلة')).last);
    await TestApp.settle(tester, 20);
    return app;
  }

  /// Taps the checkout button, as the cart words it.
  Future<void> checkout(WidgetTester tester, AppLocalizations l10n) async {
    await tester.tap(find.text(l10n.checkout).last);
    await TestApp.settle(tester);
  }

  /// The payment page reaches `address` (null: it's closed before paying), then is closed.
  Future<void> finishPage(
    WidgetTester tester,
    TestApp app,
    AppLocalizations l10n,
    String? address,
  ) async {
    final page = app.webViews.requests.last;
    expect(page.url.toString(), payPage);
    if (address != null) page.onUrlChange!(Uri.parse(address));
    await TestApp.settle(tester);
    // "Done" once the page reached its end, "Close" before.
    await tester.tap(
      find.bySemanticsLabel(address != null ? l10n.done : l10n.close).first,
    );
    await TestApp.settle(tester, 20);
  }

  test('the page\'s last address says how it ended', () {
    expect(
      inAppPaymentOutcome(
        Uri.parse('$payPage/order-received?shop_order=placed'),
      ),
      InAppPaymentOutcome.placed,
    );
    expect(
      inAppPaymentOutcome(
        Uri.parse('$payPage/order-received?shop_order=confirming'),
      ),
      InAppPaymentOutcome.confirming,
    );
    // Paid on an older server that doesn't say: the shop confirms it.
    expect(
      inAppPaymentOutcome(Uri.parse('$payPage/order-received')),
      InAppPaymentOutcome.confirming,
    );
    expect(inAppPaymentOutcome(null), InAppPaymentOutcome.notPaid);
  });

  for (final (mode, dark, language) in [
    ('light', false, 'en'),
    ('dark', true, 'en'),
    ('rtl', false, 'ar'),
  ]) {
    testWidgets('the checkout ends in the app, the order placed, $mode', (
      tester,
    ) async {
      final AppLocalizations l10n = language == 'ar'
          ? AppLocalizationsAr()
          : AppLocalizationsEn();
      final api = storeApi();
      final app = await openCart(tester, api, dark: dark, language: language);
      await checkout(tester, l10n);
      expect(api.lastPayInApp, isTrue);
      await finishPage(
        tester,
        app,
        l10n,
        '$payPage/order-received?shop_order=placed',
      );

      final note = find.byKey(const ValueKey('in-app-payment-placed'));
      expect(note, findsOneWidget);
      expect(tester.takeException(), isNull);
      expect(find.text(l10n.inAppPaidTitle), findsOneWidget);
      expect(find.text(l10n.inAppPaidBody), findsOneWidget);
      expect(find.text(l10n.inAppViewOrders), findsOneWidget);
      expect(
        Directionality.of(tester.element(note)),
        language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      );
      expect(
        Theme.of(tester.element(note)).brightness,
        dark ? Brightness.dark : Brightness.light,
      );
      // Paid: the cart is emptied, without the general "order placed" line.
      expect(app.container.read(cartProvider), isEmpty);
      expect(find.text(l10n.orderPlaced), findsNothing);
    });
  }

  testWidgets(
    'paid while the shop still has to confirm: "we received your payment"',
    (tester) async {
      final l10n = AppLocalizationsEn();
      final app = await openCart(tester, storeApi());
      await checkout(tester, l10n);
      await finishPage(
        tester,
        app,
        l10n,
        '$payPage/order-received?shop_order=confirming',
      );
      expect(
        find.byKey(const ValueKey('in-app-payment-confirming')),
        findsOneWidget,
      );
      expect(find.text('Payment received'), findsOneWidget);
      expect(
        find.text(
          'We received your payment. The shop will confirm your order shortly.',
        ),
        findsOneWidget,
      );
      expect(app.container.read(cartProvider), isEmpty);
      // "View my orders" opens them.
      await tester.tap(find.text('View my orders'));
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('in-app-payment-confirming')),
        findsNothing,
      );
      expect(app.api.count('listOrders'), greaterThan(0));
    },
  );

  for (final (mode, dark, language) in [
    ('light', false, 'en'),
    ('dark', true, 'en'),
    ('rtl', false, 'ar'),
  ]) {
    testWidgets('closed before paying: nothing charged, the cart kept, $mode', (
      tester,
    ) async {
      final AppLocalizations l10n = language == 'ar'
          ? AppLocalizationsAr()
          : AppLocalizationsEn();
      final app = await openCart(
        tester,
        storeApi(),
        dark: dark,
        language: language,
      );
      await checkout(tester, l10n);
      await finishPage(tester, app, l10n, null);
      final note = find.byKey(const ValueKey('in-app-payment-notPaid'));
      expect(note, findsOneWidget);
      expect(tester.takeException(), isNull);
      expect(find.text(l10n.inAppNotPaidTitle), findsOneWidget);
      expect(find.text(l10n.inAppNotPaidBody), findsOneWidget);
      expect(app.container.read(cartProvider), isNotEmpty);
      expect(
        Theme.of(tester.element(note)).brightness,
        dark ? Brightness.dark : Brightness.light,
      );
      await tester.tap(find.text(l10n.inAppBackToCart));
      await TestApp.settle(tester);
      expect(note, findsNothing);
    });
  }

  testWidgets(
    'a store on its own checkout, as before: the app asks nothing and opens the shop\'s page',
    (tester) async {
      final api = storeApi(inApp: false)..checkoutLinkJson = null;
      final app = await openCart(tester, api);
      await checkout(tester, AppLocalizationsEn());
      expect(api.lastPayInApp, isFalse);
      expect(
        app.webViews.requests.last.url.toString(),
        'https://your-shop.com/?yallapp_link=abc',
      );
      app.webViews.requests.last.onUrlChange!(
        Uri.parse('https://your-shop.com/checkout/order-received/55/?key=x'),
      );
      await TestApp.settle(tester);
      await tester.tap(find.bySemanticsLabel('Done').first);
      await TestApp.settle(tester);
      expect(
        find.text('Thank you! Your order has been placed.'),
        findsOneWidget,
      );
      expect(find.byType(InAppPaymentResult), findsNothing);
    },
  );

  testWidgets(
    'the shop falls back to its own checkout: the app opens it as before',
    (tester) async {
      final api = storeApi(payment: 'platform');
      final app = await openCart(tester, api);
      await checkout(tester, AppLocalizationsEn());
      expect(api.lastPayInApp, isTrue);
      expect(
        app.webViews.requests.last.url.toString(),
        'https://your-shop.com/?yallapp_cart=abc',
      );
      await tester.tap(find.bySemanticsLabel('Close').first);
      await TestApp.settle(tester);
      expect(find.byType(InAppPaymentResult), findsNothing);
      expect(app.container.read(cartProvider), isNotEmpty);
    },
  );
}
