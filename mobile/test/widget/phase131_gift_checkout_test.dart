import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/widgets/gift_checkout_look.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 131.25 The premium gift checkout (`Config.screens.checkout.look` `gift`)
/// on the store's real gift checkout: the five steps in a bar that stays at
/// the top and follows the order (who it is from, who it is for, when, the
/// card, pay), the card's live preview with the bouquet's photo and its wax
/// seal following the typing, the gift checkout's own parts in between (the
/// people, the day and slot, the card's occasions), and the chosen day and
/// slot in the summary; light, dark and right to left. A look's `look: gift`
/// turns the gift checkout on; without the look, the checkout as before; a
/// product's two or three sizes as cards in one row, the shop's default
/// chosen.
void main() {
  final cartJson = jsonEncode([
    const CartItem(
      productId: 21,
      quantity: 1,
      name: 'Blush Garden',
      price: '₺1,450.00',
      maxQuantity: 5,
      imageUrl: 'https://example.com/blush.jpg',
    ).toJson(),
  ]);

  Map<String, dynamic> store() => {
    ...storeConfigJson(),
    'delivery_date': {
      'enabled': true,
      'required': true,
      'min_days': 0,
      'max_days': 14,
      'closed_weekdays': <int>[],
      'timezone': 'Africa/Cairo',
      'same_day_cutoff': '23:59',
      'slots': [
        {'id': 's1', 'start': '10:00', 'end': '13:00', 'label': '10:00–13:00'},
        {'id': 's2', 'start': '13:00', 'end': '16:00', 'label': '13:00–16:00'},
      ],
    },
    'gift_message': {
      'enabled': true,
      'max_length': 300,
      'starters': <String>[],
      'recipient': true,
      'anonymous': true,
    },
  };

  FakeApi api({bool look = true}) =>
      FakeApi(
          config: {
            ...configJson(lms: null, orders: true, languages: languagesJson()),
            'store': store(),
            if (look)
              'screens': {
                'checkout': {
                  'look': 'gift',
                  'accent': '#8E2445',
                  'dark_accent': '#F3A9C0',
                },
              },
          },
        )
        ..deliverySlotsJson = [
          for (final (id, label) in [
            ('s1', '10:00–13:00'),
            ('s2', '13:00–16:00'),
          ])
            {
              'id': id,
              'start': label.substring(0, 5),
              'end': label.substring(6),
              'label': label,
              'available': true,
              'full': false,
            },
        ]
        ..giftOccasions = [
          {
            'id': 'birthday',
            'name': 'Birthday',
            'icon': 'cake',
            'templates': [
              {'id': 't1', 'text': 'Happy birthday! With love.'},
            ],
          },
        ];

  Future<TestApp> openCart(
    WidgetTester tester,
    FakeApi api, {
    bool dark = false,
    String language = 'en',
  }) async {
    tester.view
      ..physicalSize = const Size(1080, 4800)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {
        CartController.storageKey: cartJson,
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel(RegExp('^Cart|^السلة')).last);
    await TestApp.settle(tester, 20);
    return app;
  }

  int stepNow(WidgetTester tester) =>
      tester.widget<GiftStepBar>(find.byType(GiftStepBar)).step;

  for (final (mode, dark, language) in [
    ('light', false, 'en'),
    ('dark', true, 'en'),
    ('rtl', false, 'ar'),
  ]) {
    testWidgets('the premium look frames the real gift checkout, $mode', (
      tester,
    ) async {
      await openCart(tester, api(), dark: dark, language: language);
      expect(tester.takeException(), isNull);
      // The steps at the top, the card with its seal, then the real parts.
      expect(find.byKey(const ValueKey('gift-stepper')), findsOneWidget);
      expect(find.byKey(const ValueKey('gift-card-preview')), findsOneWidget);
      expect(find.byKey(const ValueKey('gift-seal')), findsOneWidget);
      for (final key in [
        'delivery-picker',
        'gift-sender',
        'gift-recipient',
        'gift-card',
      ]) {
        expect(find.byKey(ValueKey(key)), findsOneWidget, reason: key);
      }
      // The steps bar stays above the scrolling order.
      final bar = tester.getTopLeft(find.byKey(const ValueKey('gift-stepper')));
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -400));
      await tester.pump();
      expect(
        tester.getTopLeft(find.byKey(const ValueKey('gift-stepper'))),
        bar,
      );
      expect(
        Directionality.of(
          tester.element(find.byKey(const ValueKey('gift-stepper'))),
        ),
        language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      );
    });
  }

  testWidgets(
    'the steps follow the order, the card follows the typing, the summary shows when',
    (tester) async {
      await openCart(tester, api());
      expect(stepNow(tester), 0);

      Future<void> type(String key, String text) async {
        await tester.enterText(find.byKey(ValueKey(key)), text);
        await tester.pump();
      }

      await type('gift-sender-name', 'Omar Hassan');
      await type('gift-sender-phone', '+20 100 555 0142');
      await type('gift-sender-email', 'omar@example.com');
      expect(stepNow(tester), 1);
      await type('gift-recipient-name', 'Salma Adel');
      await type('gift-recipient-phone', '+20 122 555 0187');
      await type('gift-recipient-address', '12 Shagaret El Dor St., Zamalek');
      expect(stepNow(tester), 2);
      // The card says who it is for and from, as they are typed.
      final card = find.byKey(const ValueKey('gift-card-preview'));
      expect(
        find.descendant(of: card, matching: find.textContaining('Salma Adel')),
        findsWidgets,
      );
      // When: the day, then the slot; both in the summary.
      await tester.tap(find.byKey(const ValueKey('delivery-today')));
      await TestApp.settle(tester);
      expect(stepNow(tester), 2);
      await tester.tap(find.byKey(const ValueKey('delivery-slot-s2')));
      await TestApp.settle(tester);
      expect(stepNow(tester), 3);
      expect(find.textContaining('13:00–16:00'), findsWidgets);
      // The summary, further down: when it arrives, the day and the slot.
      await tester.scrollUntilVisible(
        find.text('Arrives'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      final arrives = find.ancestor(
        of: find.text('Arrives'),
        matching: find.byType(Row),
      );
      expect(
        find.descendant(
          of: arrives.first,
          matching: find.textContaining('13:00–16:00'),
        ),
        findsOneWidget,
      );
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('gift-occasion-birthday')),
        -300,
        scrollable: find.byType(Scrollable).first,
      );
      // The card's words, from the occasion's ready message, on the card.
      await tester.tap(find.byKey(const ValueKey('gift-occasion-birthday')));
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const ValueKey('gift-template-birthday-t1')));
      await TestApp.settle(tester);
      expect(stepNow(tester), 4);
      await tester.scrollUntilVisible(
        card,
        -300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        find.descendant(
          of: card,
          matching: find.textContaining('Happy birthday!'),
        ),
        findsOneWidget,
      );
      // Sent anonymously, the card says so.
      await tester.ensureVisible(find.byKey(const ValueKey('gift-anonymous')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('gift-anonymous')));
      await TestApp.settle(tester);
      await tester.scrollUntilVisible(
        card,
        -300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        find.descendant(of: card, matching: find.textContaining('Omar')),
        findsNothing,
      );
    },
  );

  testWidgets('without the look, the checkout as before: no steps bar', (
    tester,
  ) async {
    await openCart(tester, api(look: false));
    expect(find.byKey(const ValueKey('gift-stepper')), findsNothing);
    expect(find.byKey(const ValueKey('gift-card-preview')), findsNothing);
  });

  testWidgets(
    'in the look, a bouquet\'s sizes are cards in one row, the default chosen',
    (tester) async {
      final fake = api()
        ..product = {
          ...variableProductJson(),
          'attributes': [
            {
              'slug': 'a1',
              'name': 'Size',
              'variation': true,
              'options': [
                for (final s in ['Classic', 'Deluxe', 'Grand'])
                  {'value': s, 'label': '$s · 12 stems'},
              ],
            },
          ],
          'variations': [
            for (final (i, s) in ['Classic', 'Deluxe', 'Grand'].indexed)
              {
                'id': 300 + i,
                'attributes': {'a1': s},
                'price': priceJson('${1450 + i * 600}.00'),
                'image_url': null,
                'stock_status': 'in_stock',
                'max_quantity': null,
                'purchasable': true,
              },
          ],
          'default_attributes': {'a1': 'Deluxe'},
        };
      final app = TestApp(signedIn: true, appType: AppType.store, api: fake);
      await app.pump(tester);
      app.container.read(appRouterProvider).go('/product/20');
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('product-choice-cards')),
        findsOneWidget,
      );
      final cards = [
        for (final s in ['Classic', 'Deluxe', 'Grand'])
          tester.getRect(find.byKey(ValueKey('product-choice-$s'))),
      ];
      // One row, equal widths.
      expect(cards.map((r) => r.top).toSet(), hasLength(1));
      expect((cards[0].width - cards[2].width).abs(), lessThan(1));
      // Deluxe chosen: the button adds to the cart.
      expect(
        tester
            .widget<Semantics>(
              find
                  .ancestor(
                    of: find.byKey(const ValueKey('product-choice-Deluxe')),
                    matching: find.byType(Semantics),
                  )
                  .first,
            )
            .properties
            .selected,
        isTrue,
      );
      expect(find.text('Add to cart'), findsOneWidget);
    },
  );
}
