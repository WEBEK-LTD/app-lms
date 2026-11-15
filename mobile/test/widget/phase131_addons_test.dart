import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/sale_widgets.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 131 Gift add-ons in the app ("Add a little more": chocolates, a card, a
/// vase offered with a bouquet, on its page and in the cart, each line
/// linked to its item and indented under it, removed with it), a flash sale
/// on one product's own page (the badge, the prices, the countdown, what's
/// left), and the section titles the owner words, each light, dark and right
/// to left.
void main() {
  Map<String, dynamic> addonJson(int id, String name, String price) => {
    ...productSummaryJson(id: id, name: name, price: priceJson(price)),
    'addon': true,
  };

  final chocolates = addonJson(31, 'Chocolates', '90.00');
  final card = addonJson(32, 'Greeting card', '25.00');
  final vase = addonJson(33, 'Ceramic vase', '150.00');

  Map<String, dynamic> flashSale({
    int remaining = 8,
    Duration left = const Duration(hours: 3),
  }) => {
    'was': '400.00',
    'was_formatted': '₺400.00',
    'now': '300.00',
    'now_formatted': '₺300.00',
    'percent_off': 25,
    'starts_at': DateTime.now()
        .subtract(const Duration(hours: 1))
        .toUtc()
        .toIso8601String(),
    'ends_at': DateTime.now().add(left).toUtc().toIso8601String(),
    'remaining': remaining,
    'total': 20,
    'flash_sale_id': 7,
  };

  Map<String, dynamic> store({Map<String, dynamic>? titles}) => {
    ...storeConfigJson(deliveryDate: false),
    // Days and slots: the premium delivery picker, with its title.
    'delivery_date': {
      'enabled': titles != null,
      'required': false,
      'min_days': 1,
      'max_days': 14,
      'closed_weekdays': <int>[],
      'timezone': 'Europe/Istanbul',
      'slots': [
        {'id': 's1', 'start': '10:00', 'end': '13:00', 'label': '10:00–13:00'},
      ],
    },
    'gift_message': {
      'enabled': true,
      'max_length': 300,
      'starters': ['With love'],
      'recipient': true,
      'anonymous': true,
    },
    'titles': ?titles,
  };

  FakeApi api({Map<String, dynamic>? titles, Map<String, dynamic>? checkout}) =>
      FakeApi(
        config: {
          ...configJson(lms: null, orders: true, languages: languagesJson()),
          'store': store(titles: titles),
          if (checkout != null) 'screens': {'checkout': checkout},
        },
      );

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    String? cart,
    String location = '/cart',
    bool dark = false,
    String language = 'en',
  }) async {
    tester.view
      ..physicalSize = const Size(1080, 5200)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {
        CartController.storageKey: ?cart,
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go(location);
    await TestApp.settle(tester, 20);
    return app;
  }

  for (final (mode, dark, arabic) in [
    ('light', false, false),
    ('dark', true, false),
    ('rtl', false, true),
  ]) {
    testWidgets('a product page offers its add-ons and its flash sale, $mode', (
      tester,
    ) async {
      final fake = api()
        ..product = {
          ...productDetailJson(),
          'sale': flashSale(),
          'addons': [chocolates, card],
        };
      final app = await open(
        tester,
        fake,
        location: '/product/21',
        dark: dark,
        language: arabic ? 'ar' : 'en',
      );
      expect(tester.takeException(), isNull);

      // The flash sale: −25%, now and was, the clock, 8 left with its bar.
      final flash = find.byKey(const ValueKey('product-flash-sale'));
      expect(flash, findsOneWidget);
      expect(
        Directionality.of(tester.element(flash)),
        arabic ? TextDirection.rtl : TextDirection.ltr,
      );
      expect(
        Theme.of(tester.element(flash)).brightness,
        dark ? Brightness.dark : Brightness.light,
      );
      expect(
        find.descendant(
          of: flash,
          matching: find.text(arabic ? '−25٪' : '−25%'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(of: flash, matching: find.text('₺300.00')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: flash, matching: find.text('₺400.00')),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: flash,
          matching: find.byKey(const ValueKey('sale-countdown-0')),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: flash,
          matching: find.byKey(const ValueKey('sale-stock-bar')),
        ),
        findsOneWidget,
      );
      if (!arabic) expect(find.text('Only 8 left'), findsOneWidget);

      // "Add a little more": photo, name, price and a checkbox each.
      expect(
        find.text(arabic ? 'أضف لمسة إضافية' : 'Add a little more'),
        findsOneWidget,
      );
      expect(find.text('Chocolates'), findsOneWidget);
      expect(find.text('+₺25.00'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const ValueKey('addon-31')));
      await tester.tap(find.byKey(const ValueKey('addon-31')));
      await TestApp.settle(tester);
      await tester.tap(
        find.bySemanticsLabel(RegExp('^(Add to cart|أضف إلى السلة)')).last,
      );
      await TestApp.settle(tester);

      final cart = app.container.read(cartProvider);
      expect(
        [for (final i in cart) (i.productId, i.addonOf)],
        [(21, null), (31, 21)],
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('a flash sale on a product goes once it has ended', (
    tester,
  ) async {
    var now = DateTime.now();
    final sale = ProductSale.tryParse(
      flashSale(left: const Duration(seconds: 2)),
    )!;
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildAppTheme(
            primary: const Color(0xFFC2185B),
            secondary: const Color(0xFF2E7D32),
            brightness: Brightness.light,
            template: AppTemplate.bold,
            fontFamily: 'Manrope',
          ),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
          home: Scaffold(
            body: ProductFlashSale(sale: sale, now: () => now),
          ),
        ),
      ),
    );
    expect(find.byKey(const ValueKey('product-flash-sale')), findsOneWidget);
    now = now.add(const Duration(seconds: 5));
    await tester.pump(const Duration(seconds: 1));
    await tester.pump();
    expect(find.byKey(const ValueKey('product-flash-sale')), findsNothing);
  });

  testWidgets(
    "the cart puts each add-on under its item, offers more and removes them with it",
    (tester) async {
      final fake = api()
        ..addons = {
          21: [chocolates, card, vase],
        }
        ..cartQuote = {
          ...cartQuoteJson(),
          // In the cart's order, as the shop prices them.
          'lines': [
            {
              'product_id': 31,
              'variation_id': null,
              'quantity': 1,
              'name': 'Chocolates',
              'image_url': null,
              'unit_price': '₺90.00',
              'line_total': '₺90.00',
              'available': true,
              'problem': null,
              'max_quantity': null,
              'digital': false,
              'addon': true,
              'addon_of': 21,
            },
            (cartQuoteJson()['lines'] as List).first,
          ],
        };
      final app = await open(
        tester,
        fake,
        cart: jsonEncode([
          // An add-on first in the list still shows under its item.
          const CartItem(
            productId: 31,
            quantity: 1,
            name: 'Chocolates',
            price: '₺90.00',
            addonOf: 21,
          ).toJson(),
          const CartItem(
            productId: 21,
            quantity: 2,
            name: 'Sunflower Basket',
            price: '₺200.00',
          ).toJson(),
        ]),
      );
      expect(tester.takeException(), isNull);
      final addonLine = find.byKey(const ValueKey('cart-addon-31'));
      expect(addonLine, findsOneWidget);
      expect(find.text('With Sunflower Basket'), findsOneWidget);
      // Shown under its item: below it on the screen.
      expect(
        tester.getTopLeft(addonLine).dy,
        greaterThan(tester.getTopLeft(find.text('Sunflower Basket').first).dy),
      );
      // The add-ons go to the shop linked to their item.
      expect(
        [for (final l in fake.lastCartLines!) (l.productId, l.addonOf)],
        [(31, 21), (21, null)],
      );

      // "Add a little more": the chocolates ticked, the vase added.
      expect(find.byKey(const ValueKey('addons')), findsOneWidget);
      await tester.ensureVisible(find.byKey(const ValueKey('addon-33')));
      await tester.tap(find.byKey(const ValueKey('addon-33')));
      await TestApp.settle(tester);
      expect(
        [
          for (final i in app.container.read(cartProvider))
            (i.productId, i.addonOf),
        ],
        [(31, 21), (21, null), (33, 21)],
      );

      // Removing the item takes its add-ons with it.
      await tester.tap(find.bySemanticsLabel('Remove Sunflower Basket').first);
      await TestApp.settle(tester);
      expect(app.container.read(cartProvider), isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  for (final (mode, dark, arabic) in [
    ('light', false, false),
    ('dark', true, false),
    ('rtl', false, true),
  ]) {
    testWidgets("the owner's titles, $mode", (tester) async {
      final fake =
          api(
              titles: {
                'addons': {'en': 'Make it extra special'},
                'gift_card': {
                  'en': 'Your words on the card',
                  'ar': 'كلماتك على البطاقة',
                },
                'delivery': {'en': 'When should it arrive?'},
              },
              // The checkout look's own title wins over the store's.
              checkout: {
                'delivery_title': {'en': 'Pick the moment'},
              },
            )
            ..addons = {
              21: [card],
            };
      await open(
        tester,
        fake,
        cart: jsonEncode([
          const CartItem(
            productId: 21,
            quantity: 1,
            name: 'Sunflower Basket',
            price: '₺200.00',
          ).toJson(),
        ]),
        dark: dark,
        language: arabic ? 'ar' : 'en',
      );
      expect(tester.takeException(), isNull);
      final picker = find.byKey(const ValueKey('delivery-picker'));
      expect(picker, findsOneWidget);
      if (arabic) {
        // No Arabic titles for the add-ons or the day: the app's own words.
        expect(find.text('أضف لمسة إضافية'), findsOneWidget);
        expect(find.text('كلماتك على البطاقة'), findsWidgets);
        expect(
          find.descendant(of: picker, matching: find.text('Pick the moment')),
          findsNothing,
        );
      } else {
        expect(find.text('Make it extra special'), findsOneWidget);
        expect(find.text('Your words on the card'), findsWidgets);
        expect(
          find.descendant(of: picker, matching: find.text('Pick the moment')),
          findsOneWidget,
        );
        expect(find.text('When should it arrive?'), findsNothing);
      }
      expect(
        Theme.of(tester.element(find.byKey(const ValueKey('addons'))))
            .brightness,
        dark ? Brightness.dark : Brightness.light,
      );
    });
  }

  test("a delivery picker's title: the look's, the store's, the app's", () {
    const store = SectionTitles(delivery: {'en': 'When should it arrive?'});
    const look = SectionTitles(delivery: {'en': 'Pick the moment'});
    expect(
      sectionTitle(
        SectionTitle.delivery,
        'en',
        'When',
        look: look,
        store: store,
      ),
      'Pick the moment',
    );
    expect(
      sectionTitle(SectionTitle.delivery, 'en', 'When', store: store),
      'When should it arrive?',
    );
    expect(
      sectionTitle(
        SectionTitle.delivery,
        'ar',
        'متى',
        look: look,
        store: store,
      ),
      'متى',
    );
    expect(
      SectionTitles.fromStore({
        'addons': {'en': '  Make it extra special ', 'ar': ''},
      }).addons,
      {'en': 'Make it extra special'},
    );
  });
}
