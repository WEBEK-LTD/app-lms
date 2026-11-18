import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/format/bidi.dart';
import 'package:yallapp/core/format/money.dart';
import 'package:yallapp/core/l10n/currency.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/shared/pages/recently_viewed.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/widgets/product_widgets.dart';

import '../screenshots/support/demo_api.dart';
import '../screenshots/support/shot.dart' show usePhone;
import '../screenshots/support/studio_demo.dart';
import '../support/test_app.dart';

/// 161 The whole app in the customer's currency: the owner of Kech Flora
/// (18 November), on a flower shop made from Leqaa's Signature template
/// selling in Moroccan dirhams, "The currency on the home page is in
/// Moroccan even though I set my currency to something else. I need the
/// whole app to be in the currency I choose." The hosted API converts every
/// price it sends (`display`, lib/money/display.ts); the app shows each in
/// the customer's currency, "≈" as the shop does, never the shop's alone.
/// These serve the template's own pages (test/support/signatures/
/// flowers_a.json) with a shop in MAD, as the hosted API does for a
/// customer who chose USD, EGP or EUR.

/// The day's rates, units of each for one dirham.
const _rates = {'USD': 0.1, 'EGP': 5.0, 'EUR': 0.092};

String _mad(int cents) => formatMoney(cents, 'MAD');
String _dec(int cents, String currency) =>
    (cents / 100).toStringAsFixed(currencyDigits(currency));

/// The shop's [cents] in [currency], as the server converts them.
String _in(int cents, String currency) =>
    formatMoney(convertCents(cents, _rates[currency]!, currency), currency);
String _approx(int cents, String currency) => '≈ ${_in(cents, currency)}';

Map<String, dynamic> _display(String? currency, Map<String, int> amounts) => {
  if (currency != null)
    'display': {
      'currency': currency,
      for (final MapEntry(:key, :value) in amounts.entries)
        key: _in(value, currency),
      'rate': _rates[currency],
      'rate_date': '2026-11-18',
    },
};

/// A product's price as the shop sends it: MAD, with `display` in [c].
Map<String, dynamic> _price(int cents, String? c, {int? was, int? high}) => {
  'amount': _dec(cents, 'MAD'),
  'regular_amount': was == null ? null : _dec(was, 'MAD'),
  'regular_formatted': was == null ? null : _mad(was),
  'currency': 'MAD',
  'formatted': high == null ? _mad(cents) : '${_mad(cents)} – ${_mad(high)}',
  'on_sale': was != null,
  'range': high != null,
  if (high != null) 'max_amount': _dec(high, 'MAD'),
  if (c != null)
    'display': {
      'currency': c,
      'amount': _dec(convertCents(cents, _rates[c]!, c), c),
      'formatted': high == null
          ? _in(cents, c)
          : '${_in(cents, c)} – ${_in(high, c)}',
      if (was != null) 'regular_formatted': _in(was, c),
      'rate': _rates[c],
      'rate_date': '2026-11-18',
    },
};

/// A sale as the shop sends it (`ProductSale`), with its currency and `display`.
Map<String, dynamic> _sale(int was, int now, String? c) => {
  'currency': 'MAD',
  'was': _dec(was, 'MAD'),
  'was_formatted': _mad(was),
  'now': _dec(now, 'MAD'),
  'now_formatted': _mad(now),
  'percent_off': ((was - now) * 100 / was).round(),
  'starts_at': null,
  'ends_at': DateTime.now()
      .toUtc()
      .add(const Duration(hours: 2))
      .toIso8601String(),
  'remaining': 4,
  'total': 12,
  'flash_sale_id': 7,
  ..._display(c, {'was_formatted': was, 'now_formatted': now}),
};

/// Kech Flora's bouquets: (id, name, MAD cents, was, dearest variation).
const _bouquets = [
  (101, 'Atlas Roses', 25000, 32000, null),
  (102, 'Majorelle Blue', 41000, null, 78000),
  (103, 'Medina Lilies', 18000, null, null),
];

Map<String, dynamic> _product((int, String, int, int?, int?) b, String? c) => {
  'id': b.$1,
  'name': b.$2,
  'type': b.$5 == null ? 'simple' : 'variable',
  'image_url': null,
  'price': _price(b.$3, c, was: b.$4, high: b.$5),
  'rating': null,
  'rating_count': 0,
  'stock_status': 'in_stock',
  'purchasable': true,
  'digital': false,
  if (b.$4 != null) 'sale': _sale(b.$4!, b.$3, c),
};

/// A product as a Studio list's card (`Item`), as GET /pages serves it.
Map<String, dynamic> _item((int, String, int, int?, int?) b, String? c) {
  final p = _product(b, c);
  final price = p['price'] as Map<String, dynamic>;
  return {
    'source': 'products',
    'id': '${b.$1}',
    'title': b.$2,
    'subtitle': null,
    'image_url': null,
    'price_label': price['formatted'],
    'price': price,
    'badge': null,
    'sale': ?p['sale'],
    'action': {
      'type': 'item',
      'item': {'source': 'products', 'id': '${b.$1}'},
    },
  };
}

/// Kech Flora on Leqaa's look A, its shop in MAD, the customer in [c]
/// (null: the owner's switch off, or the shop's own chosen: no `display`).
DemoApi _kechFlora(String? c) {
  final demo = StudioDemo.signature('flowers', 'a');
  final api = DemoApi.leqaa()
    ..shopProducts = [for (final b in _bouquets) _product(b, c)];
  api.config = {
    ...api.config,
    'store': {
      ...(api.config['store'] as Map<String, dynamic>),
      'currency': 'MAD',
    },
  };
  return demo.apply(
    api,
    appName: 'Kech Flora',
    primaryColor: '#8E2445',
    items: {
      'products': [for (final b in _bouquets) _item(b, c)],
    },
    flashSale: {
      'flash': {
        'id': 7,
        'title': 'Rose hour',
        'starts_at': null,
        'ends_at': DateTime.now()
            .toUtc()
            .add(const Duration(hours: 2))
            .toIso8601String(),
        'percent_off': 22,
        'remaining': 4,
        'total': 12,
      },
      'items': [_item(_bouquets.first, c)],
    },
    couponOffer: {
      'code': 'FLORA10',
      'kind': 'amount',
      'percent_off': null,
      'currency': 'MAD',
      'amount_off': '50.00',
      'amount_off_formatted': _mad(5000),
      'min_order': '300.00',
      'min_order_formatted': _mad(30000),
      'ends_at': null,
      ..._display(c, {
        'amount_off_formatted': 5000,
        'min_order_formatted': 30000,
      }),
    },
  );
}

Future<TestApp> _open(
  WidgetTester tester,
  DemoApi api,
  String? c, {
  Map<String, Object> more = const {},
}) async {
  StudioDemo.language = 'en';
  usePhone(tester);
  letStudioOverflows();
  final app = TestApp(
    api: api,
    appType: AppType.store,
    signedIn: true,
    preferences: {'settings.currency': ?c, ...more},
  );
  await app.pump(tester);
  return app;
}

/// 161 Layout overflows inside Studio's elements in the test's font, whose
/// letters are all as wide as they are tall (the cover's top row, the
/// flash sale's title beside its countdown), belong to the layout fixes
/// (163); these tests are about the prices, so only those are let through.
/// Any other error, and an overflow anywhere else (the shop's cards), still
/// fails the test.
void letStudioOverflows() {
  final shown = FlutterError.onError;
  FlutterError.onError = (details) {
    final text = details.toString();
    if (text.contains('overflowed') &&
        text.contains('/lib/modules/shared/pages/')) {
      return;
    }
    shown?.call(details);
  };
  addTearDown(() => FlutterError.onError = shown);
}

/// Every text on screen.
List<String> _texts() => [
  for (final e in find.byType(Text).evaluate()) ?(e.widget as Text).data,
];

void main() {
  for (final c in ['USD', 'EGP', 'EUR']) {
    group('161 a shop in MAD, the customer in $c', () {
      testWidgets(
        'the home page: the bouquets\' cards, their sale and the price before it, the flash sale and the coupon',
        (tester) async {
          final app = await _open(tester, _kechFlora(c), c);
          expect(app.container.read(appCurrencyProvider), c);
          // The flash sale's bouquet, at its sale price and the one before it.
          expect(find.text(_approx(25000, c)), findsWidgets);
          expect(find.text(_in(32000, c)), findsWidgets);
          // The shop's code: what it takes off and from what order.
          expect(find.textContaining(_in(30000, c)), findsWidgets);
          // What is loved most: the cards' prices, a range's both ends.
          await tester.scrollUntilVisible(
            find.text('Majorelle Blue'),
            300,
            scrollable: find.byType(Scrollable).first,
          );
          await TestApp.settle(tester);
          expect(
            find.text('≈ ${_in(41000, c)} – ${_in(78000, c)}'),
            findsWidgets,
          );
          expect(find.text(_approx(18000, c)), findsWidgets);
          // Nothing in the shop's dirhams.
          expect(_texts().where((t) => t.contains('MAD')), isEmpty);
          expect(tester.takeException(), isNull);
        },
      );

      testWidgets('the shop, its search and a bouquet\'s page', (tester) async {
        final api = _kechFlora(c);
        api.product = {
          ..._product(_bouquets.last, c),
          'description_html': '<p>Lilies.</p>',
          'short_description_html': null,
          'images': <Object>[],
          'sku': null,
          'max_quantity': 5,
          'attributes': <Object>[],
          'variations': <Object>[],
          'categories': <Object>[],
          'related': <Object>[],
          'external_url': null,
          'permalink': 'https://kechflora.ma/p/103',
        };
        // 131 A gift add-on offered with it.
        api.addons = {
          0: [
            {
              ..._product((201, 'Ceramic Vase', 3500, null, null), c),
              'addon': true,
            },
          ],
        };
        final app = await _open(tester, api, c);
        final router = app.container.read(appRouterProvider);
        router.go('${Paths.shop}?focus=1');
        await TestApp.settle(tester);
        // The shop's grid, under the Studio page around it (built, maybe
        // below the fold).
        final converted = find.text(_approx(18000, c), skipOffstage: false);
        expect(converted, findsWidgets);
        // 161 The grid's card as the product's page: the customer's price
        // and, under it, the shop's, what is charged.
        final card = find.ancestor(
          of: converted,
          matching: find.byType(ProductCard, skipOffstage: false),
        );
        final shopPrice = find.descendant(
          of: card,
          matching: find.text(_mad(18000), skipOffstage: false),
        );
        expect(shopPrice, findsOneWidget);
        // At the card's foot: no empty band under the prices.
        expect(
          tester.getRect(card).bottom - tester.getRect(shopPrice).bottom,
          lessThan(16),
        );
        // The shop's dirhams only as that second line.
        for (final t in _texts().where((t) => t.contains('MAD'))) {
          expect(
            [for (final b in _bouquets) _mad(b.$3)],
            contains(t),
            reason: t,
          );
        }

        router.push(Paths.product(103));
        await TestApp.settle(tester);
        // In theirs first; the shop's under it, as the shop's products show.
        expect(find.text(_approx(18000, c)), findsWidgets);
        expect(find.text(_mad(18000)), findsOneWidget);
        // The add-on: "+" after the approximate sign.
        await tester.scrollUntilVisible(
          find.text('Ceramic Vase'),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        expect(find.text('≈ +${_in(3500, c)}'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets(
        'the cart: its lines, the coupon\'s discount, shipping, the total and what is charged',
        (tester) async {
          final api = _kechFlora(c);
          api.cartQuote = {
            'lines': [
              {
                'product_id': 103,
                'variation_id': null,
                'quantity': 2,
                'name': 'Medina Lilies',
                'image_url': null,
                'unit_price': _mad(18000),
                'line_total': _mad(36000),
                'available': true,
                'problem': null,
                'max_quantity': 5,
                'digital': false,
                'currency': 'MAD',
                'unit_price_amount': '180.00',
                'line_total_amount': '360.00',
                ..._display(c, {'unit_price': 18000, 'line_total': 36000}),
              },
            ],
            'item_count': 2,
            'subtotal': _mad(36000),
            'subtotal_amount': '360.00',
            'currency': 'MAD',
            'coupon': {'code': 'FLORA10', 'status': 'applied', 'message': null},
            'discount': _mad(5000),
            'discount_amount': '50.00',
            'shipping': _mad(2000),
            'shipping_amount': '20.00',
            'total': _mad(33000),
            'total_amount': '330.00',
            'total_final': true,
            'charge': {
              'currency': 'MAD',
              'total': _mad(33000),
              'total_amount': '330.00',
              'in_customer_currency': false,
              'reason': null,
              'display': null,
            },
            ..._display(c, {
              'subtotal': 36000,
              'discount': 5000,
              'shipping': 2000,
              'total': 33000,
            }),
          };
          final cart = [
            const CartItem(
              productId: 103,
              quantity: 2,
              name: 'Medina Lilies',
              price: 'MAD 180.00',
            ).toJson(),
          ];
          final app = await _open(
            tester,
            api,
            c,
            more: {CartController.storageKey: jsonEncode(cart)},
          );
          app.container.read(appRouterProvider).go(Paths.cart);
          await TestApp.settle(tester, 20);
          // The cart's own list, under the Studio page around it.
          final list = find
              .ancestor(
                of: find.text('Medina Lilies', skipOffstage: false).first,
                matching: find.byType(Scrollable, skipOffstage: false),
              )
              .first;
          Future<void> seen(Finder f) async {
            await tester.scrollUntilVisible(f, 120, scrollable: list);
            await TestApp.settle(tester, 4);
          }

          final texts = <String>{};
          // Each line's price and total, then the sums, as they scroll by.
          await seen(find.text(_approx(18000, c)));
          expect(find.text(_approx(18000, c)), findsOneWidget);
          expect(find.text(_approx(36000, c)), findsWidgets);
          texts.addAll(_texts());
          await seen(find.text('≈ −${_in(5000, c)}'));
          expect(find.text(_approx(2000, c)), findsOneWidget);
          texts.addAll(_texts());
          // What the card is charged stays the shop's, said once.
          await seen(find.byKey(const Key('cart-charge-line')));
          expect(
            find.text('≈ ${_in(33000, c)} · you pay ${_mad(33000)}'),
            findsOneWidget,
          );
          expect(find.text(_approx(33000, c)), findsWidgets);
          texts.addAll(_texts());
          expect(
            texts.where((t) => t.contains('MAD') && !t.contains('you pay')),
            isEmpty,
          );
          expect(tester.takeException(), isNull);
        },
      );

      testWidgets(
        'the orders: the list, an order\'s lines, its delivery fee and its total',
        (tester) async {
          final api = _kechFlora(c);
          final order = {
            'id': 77,
            'number': '77',
            'status': 'processing',
            'status_label': 'Processing',
            'currency': 'MAD',
            'total': _mad(38000),
            'total_amount': '380.00',
            'created_at': '2026-11-18T09:00:00Z',
            'items': [
              {
                'name': 'Medina Lilies',
                'product_id': 103,
                'quantity': 2,
                'total': _mad(36000),
                'currency': 'MAD',
                'total_amount': '360.00',
                ..._display(c, {'total': 36000}),
              },
            ],
            'fulfilment': {
              'type': 'delivery',
              'scheduled_for': null,
              'delivery_address': null,
              'delivery_fee': _mad(2000),
              'currency': 'MAD',
              'delivery_fee_amount': '20.00',
              ..._display(c, {'delivery_fee': 2000}),
            },
            'stage': {'code': 'preparing', 'label': 'Preparing'},
            ..._display(c, {'total': 38000}),
          };
          api
            ..orders = [order]
            ..order = order;
          final app = await _open(tester, api, c);
          final router = app.container.read(appRouterProvider);
          router.push(Paths.orders);
          await TestApp.settle(tester);
          expect(find.text(_approx(38000, c)), findsOneWidget);
          router.push(Paths.order(77));
          await TestApp.settle(tester);
          expect(find.text(_approx(36000, c)), findsOneWidget);
          expect(find.text(_approx(2000, c)), findsOneWidget);
          expect(find.text(_approx(38000, c)), findsWidgets);
          // What was charged, the shop's, under the total.
          expect(find.byKey(const Key('order-shop-total')), findsOneWidget);
          expect(tester.takeException(), isNull);
        },
      );

      testWidgets(
        'the picks page: what was seen lately and the shop\'s featured flowers',
        (tester) async {
          final api = _kechFlora(c);
          final app = await _open(tester, api, c);
          app.container
              .read(recentlyViewedProvider.notifier)
              .opened(ProductSummary.fromJson(_product(_bouquets[2], c)));
          app.container.read(appRouterProvider).push(Paths.page('wishlist'));
          await TestApp.settle(tester);
          expect(find.text(_approx(18000, c)), findsWidgets);
          expect(_texts().where((t) => t.contains('MAD')), isEmpty);
          expect(tester.takeException(), isNull);
        },
      );
    });
  }

  testWidgets(
    '161 the owner\'s switch off (no `display` from the server): the shop\'s dirhams, as before',
    (tester) async {
      await _open(tester, _kechFlora(null), null);
      expect(find.text(_mad(25000)), findsWidgets);
      expect(_texts().where((t) => t.contains('≈')), isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  test('161 every money text the shop sends, read in the customer\'s currency where it is parsed', () {
    const c = 'USD';
    final slot = DeliverySlot.fromJson({
      'id': 's2',
      'start': '12:00',
      'end': '16:00',
      'fee': '20.00',
      'fee_formatted': _mad(2000),
      'currency': 'MAD',
      ..._display(c, {'fee_formatted': 2000}),
    });
    expect(slot.fee, _approx(2000, c));
    expect(addedPrice(slot.fee!), '≈ +${_in(2000, c)}');
    final coupon = PublicCoupon.tryParse({
      'code': 'FLORA10',
      'currency': 'MAD',
      'amount_off': '50.00',
      'amount_off_formatted': _mad(5000),
      'min_order_formatted': _mad(30000),
      ..._display(c, {
        'amount_off_formatted': 5000,
        'min_order_formatted': 30000,
      }),
    })!;
    expect(coupon.amountOff, _approx(5000, c));
    expect(coupon.minOrder, _approx(30000, c));
    final option = ProductOption.fromJson({
      'id': 'xl',
      'name': 'Grand',
      'price_delta': '60.00',
      'price_delta_formatted': '+${_mad(6000)}',
      'currency': 'MAD',
      ..._display(c, {'price_delta_formatted': 6000}),
    });
    expect(option.priceDeltaFormatted, '≈ +${_in(6000, c)}');
    final points = CartPoints.fromJson({
      'balance': 120,
      'usable': 100,
      'usable_value': _mad(1000),
      'applied': true,
      'discount': _mad(1000),
      'currency': 'MAD',
      ..._display(c, {'usable_value': 1000, 'discount': 1000}),
    });
    expect(points.usableValue, _approx(1000, c));
    expect(points.discount, _approx(1000, c));
    final rules = LoyaltyRules.fromJson({
      'spend_per_point_formatted': _mad(1000),
      'point_value_formatted': _mad(10),
      'min_points': 10,
      ..._display(c, {
        'spend_per_point_formatted': 1000,
        'point_value_formatted': 10,
      }),
    });
    expect(rules.spendPerPoint, _approx(1000, c));
    final sale = ProductSale.tryParse(_sale(32000, 25000, c))!;
    expect(sale.nowFormatted, _approx(25000, c));
    expect(sale.wasFormatted, _in(32000, c));
    expect(sale.shopNowFormatted, _mad(25000));
    // A free card stays "Free"; an older server's card, the shop's words.
    final free = PageItem.fromJson({
      'source': 'courses',
      'id': '1',
      'title': 'Intro',
      'price_label': 'Free',
      'price': {
        'amount': '0.00',
        'currency': 'MAD',
        'formatted': _mad(0),
        ..._display(c, {'formatted': 0}),
      },
    });
    expect(free.shownPrice, 'Free');
    final old = PageItem.fromJson({
      'source': 'products',
      'id': '2',
      'title': 'Roses',
      'price_label': _mad(25000),
    });
    expect(old.shownPrice, _mad(25000));
    // An event's words with its price in them.
    final event = PageItem.fromJson({
      'source': 'events',
      'id': '3',
      'title': 'Workshop',
      'price_label': 'From ${_mad(15000)}',
      'price': {
        'amount': '150.00',
        'currency': 'MAD',
        'formatted': _mad(15000),
        'display': {
          'currency': c,
          'formatted': _in(15000, c),
          'label': 'From ${_in(15000, c)}',
          'rate': 0.1,
          'rate_date': null,
        },
      },
    });
    expect(event.shownPrice, '≈ From ${_in(15000, c)}');
  });

  test('161 in Arabic: a share off, and a price taken off or added, the right way round', () {
    setCurrentLanguage('ar');
    addTearDown(() => setCurrentLanguage('en'));
    // The badge's number and percent kept left to right ("خصم 20%", never "20%-").
    expect(percentText(currentL10n.saleOff(20)), 'خصم \u206620%\u2069');
    // An owner's own words with a sign: the sign stays before the number.
    expect(percentText('-20%'), '\u2066-20%\u2069');
    expect(percentText('−20٪'), '\u2066−20٪\u2069');
    // A discount's minus and a fee's plus stay before the amount.
    expect(takenOffPrice(_mad(5000)), '\u2066−${_mad(5000)}\u2069');
    expect(
      takenOffPrice(_approx(5000, 'USD')),
      '≈ \u2066−${_in(5000, 'USD')}\u2069',
    );
    expect(
      addedPrice(_approx(2000, 'USD')),
      '≈ \u2066+${_in(2000, 'USD')}\u2069',
    );
    setCurrentLanguage('en');
    // In English, as they read.
    expect(percentText(currentL10n.saleOff(20)), '20% off');
    expect(takenOffPrice(_approx(5000, 'USD')), '≈ −${_in(5000, 'USD')}');
  });

  test('161 the app converts what it adds up itself as the server does', () {
    // Rounded to the cent, and to whole yen.
    expect(convertCents(18000, 0.1, 'USD'), 1800);
    expect(convertCents(18050, 0.0923, 'EUR'), 1666);
    expect(convertCents(18000, 15.37, 'JPY'), 276700);
  });
}
