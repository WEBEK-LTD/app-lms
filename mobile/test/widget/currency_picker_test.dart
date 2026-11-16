import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/currency.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/l10n/language.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/shared/account/currency_picker.dart';
import 'package:yallapp/modules/store/screens/cart_screen.dart';
import 'package:yallapp/modules/store/widgets/product_widgets.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/widgets/rates_attribution.dart';
import 'package:yallapp/core/web/web_view.dart' show isAlwaysOutside;
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'store_test.dart' show cartPrefs, storeApi;

Widget wrapForTest(Widget child) => MaterialApp(
  theme: buildAppTheme(
    primary: const Color(0xFF0E0D24),
    brightness: Brightness.light,
    template: AppTemplate.classic,
    fontFamily: 'Bricolage Grotesque',
  ),
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: Scaffold(body: child),
);

FakeApi _shop() {
  final config = configJson(lms: null, store: true, orders: true);
  config['store'] = {...storeConfigJson(), 'currency': 'EGP'};
  return FakeApi(config: config);
}

Map<String, dynamic> _display(String currency, Map<String, String> values) => {
  'currency': currency,
  ...values,
  'rate': 0.0206,
  'rate_date': '2026-11-16',
};

void main() {
  testWidgets(
    '135.5 the currency follows the phone\'s region, the picker lists the shop\'s first, and a pick is kept',
    (tester) async {
      final api = _shop();
      final opened = <String>[];
      final app = TestApp(
        signedIn: true,
        api: api,
        appType: AppType.store,
        overrides: [
          deviceLocalesProvider.overrideWithValue(const [Locale('en', 'KW')]),
          openExternalProvider.overrideWithValue((url) async {
            opened.add(url);
            return true;
          }),
        ],
      );
      await app.pump(tester);
      expect(app.container.read(appCurrencyProvider), 'KWD');

      app.container.read(appRouterProvider).push('/account/settings');
      await TestApp.settle(tester);
      expect(find.text('Currency'), findsOneWidget);
      expect(find.text("KWD · your region's"), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('currency-tile')));
      await TestApp.settle(tester);
      expect(api.count('listCurrencies'), 1);
      // 135.10 The rates' source, as its terms ask; its site opens outside
      // the app.
      expect(find.text(ratesAttributionText), findsOneWidget);
      await tester.tap(find.byKey(const Key('rates-attribution')));
      await TestApp.settle(tester);
      expect(opened, [ratesAttributionUrl]);
      // The shop's own first, then the region's, then the others.
      final shop = tester.getTopLeft(
        find.byKey(const ValueKey('currency-EGP')),
      );
      final region = tester.getTopLeft(
        find.byKey(const ValueKey('currency-KWD')),
      );
      final usd = tester.getTopLeft(find.byKey(const ValueKey('currency-USD')));
      expect(shop.dy, lessThan(region.dy));
      expect(region.dy, lessThan(usd.dy));
      expect(find.text("The shop's currency"), findsOneWidget);
      expect(find.text('Your region'), findsOneWidget);
      // Searched by name or code.
      await tester.enterText(find.byKey(const Key('currency-search')), 'yen');
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('currency-JPY')), findsOneWidget);
      expect(find.byKey(const ValueKey('currency-USD')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('currency-JPY')));
      await TestApp.settle(tester);
      expect(app.container.read(appCurrencyProvider), 'JPY');
      expect(
        app.container
            .read(sharedPreferencesProvider)
            .getString('settings.currency'),
        'JPY',
      );
      expect(find.text('JPY'), findsOneWidget);

      // Back to the region's.
      await tester.tap(find.byKey(const ValueKey('currency-tile')));
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const Key('currency-use-region')));
      await TestApp.settle(tester);
      expect(app.container.read(appCurrencyProvider), 'KWD');
      expect(
        app.container
            .read(sharedPreferencesProvider)
            .getString('settings.currency'),
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );

  test('135.5 the picker\'s groups, searched', () {
    final all = [
      for (final c in ['EGP', 'KWD', 'USD', 'JPY'])
        CurrencyChoice(
          code: c,
          name: c == 'JPY' ? 'Japanese Yen' : c,
          symbol: c,
        ),
    ];
    final l10n = lookupAppLocalizations(const Locale('en'));
    final groups = currencyGroups(
      all,
      shop: 'EGP',
      region: 'KWD',
      query: '',
      l10n: l10n,
    );
    expect(
      [for (final g in groups) g.items.map((c) => c.code).join(',')],
      ['EGP', 'KWD', 'USD,JPY'],
    );
    expect(
      currencyGroups(
        all,
        shop: 'EGP',
        region: 'EGP',
        query: '',
        l10n: l10n,
      ).length,
      2,
    );
    expect(
      currencyGroups(
        all,
        shop: 'EGP',
        region: null,
        query: 'japan',
        l10n: l10n,
      ).single.items.single.code,
      'JPY',
    );
    expect(
      currencyGroups(all, shop: 'EGP', region: null, query: 'zzz', l10n: l10n),
      isEmpty,
    );
  });

  testWidgets(
    '135.5 a price shows in the customer\'s currency, the shop\'s under it, right to left in Arabic too',
    (tester) async {
      final price = ProductPrice.fromJson({
        ...priceJson('600.00', formatted: 'E£600.00'),
        'currency': 'EGP',
        'display': _display('USD', {'amount': '12.37', 'formatted': r'$12.37'}),
      });
      for (final dir in [TextDirection.ltr, TextDirection.rtl]) {
        await tester.pumpWidget(
          wrapForTest(
            Directionality(
              textDirection: dir,
              child: ProductPriceLabel(price, size: 20),
            ),
          ),
        );
        expect(find.text(r'≈ $12.37'), findsOneWidget);
        expect(find.text('E£600.00'), findsOneWidget);
      }
      // On a card, only the converted price fits.
      await tester.pumpWidget(wrapForTest(ProductPriceLabel(price, size: 14)));
      expect(find.text(r'≈ $12.37'), findsOneWidget);
      expect(find.text('E£600.00'), findsNothing);
    },
  );

  testWidgets('135.7 the cart says what is paid, and in which currency', (
    tester,
  ) async {
    late BuildContext context;
    await tester.pumpWidget(
      wrapForTest(
        Builder(
          builder: (c) {
            context = c;
            return const SizedBox();
          },
        ),
      ),
    );
    CartQuote quote(Map<String, dynamic> charge) => CartQuote.fromJson({
      'lines': <Object>[],
      'item_count': 1,
      'subtotal': 'E£600.00',
      'subtotal_amount': '600.00',
      'currency': 'EGP',
      'total': 'E£600.00',
      'display': _display('USD', {'total': r'$12.37', 'total_amount': '12.37'}),
      'charge': charge,
    });
    expect(
      chargeLine(
        context,
        quote({
          'currency': 'EGP',
          'total': 'E£600.00',
          'in_customer_currency': false,
          'reason': null,
        }),
      ),
      r'≈ $12.37 · you pay E£600.00',
    );
    expect(
      chargeLine(
        context,
        quote({
          'currency': 'USD',
          'total': r'$12.37',
          'in_customer_currency': true,
          'reason': null,
        }),
      ),
      r'You pay $12.37',
    );
    expect(
      chargeLine(
        context,
        quote({
          'currency': 'EGP',
          'total': 'E£600.00',
          'in_customer_currency': false,
          'reason': 'gateway',
        }),
      ),
      r"≈ $12.37 · You pay E£600.00: the shop's card payment doesn't take USD.",
    );
    final plain = CartQuote.fromJson({
      'lines': <Object>[],
      'item_count': 1,
      'subtotal': 'E£600.00',
      'subtotal_amount': '600.00',
      'currency': 'EGP',
    });
    expect(chargeLine(context, plain), isNull);
  });

  testWidgets(
    "135.10 the cart's price in the customer's currency names the rates' source",
    (tester) async {
      // A phone's screen.
      tester.view.physicalSize = const Size(1170, 2532);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      final api = storeApi(store: storeConfigJson(deliveryDate: false));
      final opened = <String>[];
      final app = TestApp(
        signedIn: true,
        appType: AppType.store,
        api: api,
        preferences: {CartController.storageKey: cartPrefs()},
        overrides: [
          openExternalProvider.overrideWithValue((url) async {
            opened.add(url);
            return true;
          }),
        ],
      );
      await app.pump(tester);
      // The shop's currency only: no converted price, no source.
      app.container.read(appRouterProvider).go('/cart');
      await TestApp.settle(tester);
      expect(find.byKey(const Key('cart-charge-line')), findsNothing);
      expect(find.text(ratesAttributionText), findsNothing);

      api.cartQuote = {
        ...cartQuoteJson(),
        'display': _display('USD', {
          'subtotal': r'$8.25',
          'subtotal_amount': '8.25',
          'total': r'$8.25',
          'total_amount': '8.25',
        }),
        'charge': {
          'currency': 'TRY',
          'total': '₺400.00',
          'in_customer_currency': false,
          'reason': null,
        },
      };
      app.container.read(appRouterProvider).go('/');
      await TestApp.settle(tester);
      app.container.read(appRouterProvider).go('/cart');
      await TestApp.settle(tester);
      expect(find.byKey(const Key('cart-charge-line')), findsOneWidget);
      final source = find.byKey(const Key('rates-attribution'));
      expect(source, findsOneWidget);
      await tester.tap(source);
      await TestApp.settle(tester);
      expect(opened, [ratesAttributionUrl]);
      expect(tester.takeException(), isNull);
    },
  );

  test("135.10 the rates' source opens in the browser from any web view, the payment's own pages stay", () {
    expect(isAlwaysOutside(Uri.parse(ratesAttributionUrl)), isTrue);
    expect(
      isAlwaysOutside(Uri.parse('https://exchangerate-api.com/docs')),
      isTrue,
    );
    expect(
      isAlwaysOutside(Uri.parse('https://checkout.stripe.com/c/pay/x')),
      isFalse,
    );
    expect(
      isAlwaysOutside(Uri.parse('https://yallapp.com.tr/pay/abc')),
      isFalse,
    );
  });
}
