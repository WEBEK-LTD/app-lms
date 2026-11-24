import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/theme/app_icons.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/modules/store/data/bouquet_draft.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/screens/bouquet_builder_screen.dart';
import 'package:yallapp/modules/store/screens/shop_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'store_test.dart' show storeApi;

/// 162 Build your bouquet: Leqaa's Start opens it when the shop has set it
/// up (the shop otherwise, as before): the flowers by the stem with the
/// live total, one wrap (or "No wrap"), the card and its words (or none),
/// the summary, and the bouquet in the cart as one group of lines; light,
/// dark and right to left.
void main() {
  const flow = {'type': 'screen', 'screen': 'search', 'flow': 'bouquet'};

  Map<String, dynamic> price(String amount, {String? usd}) => {
    ...priceJson(amount),
    // 135.5 The customer's currency, as the server converts it.
    if (usd != null)
      'display': {
        'currency': 'USD',
        'rate': 0.03,
        'amount': usd,
        'formatted': '\$$usd',
      },
  };

  Map<String, dynamic> item(
    int id,
    String name,
    String amount, {
    String? usd,
  }) => productSummaryJson(
    id: id,
    name: name,
    price: price(amount, usd: usd),
  );

  Map<String, dynamic> addon(
    int id,
    String name,
    String amount, {
    String? usd,
  }) => {...item(id, name, amount, usd: usd), 'addon': true};

  Map<String, dynamic> rules({
    bool wrapOptional = false,
    bool cardOptional = true,
    bool cards = true,
    int min = 3,
    int max = 12,
  }) => {
    'flowers_category_id': 4,
    'wraps_from': 'addons',
    'wrap_optional': wrapOptional,
    'card_optional': cardOptional,
    'has_cards': cards,
    'min_stems': min,
    'max_stems': max,
    'max_message': 500,
  };

  Map<String, dynamic> builder({
    bool wrapOptional = false,
    bool cardOptional = true,
    bool cards = true,
    bool usd = false,
  }) => {
    ...rules(
      wrapOptional: wrapOptional,
      cardOptional: cardOptional,
      cards: cards,
    ),
    'flowers': [
      item(11, 'Red Rose', '45.00', usd: usd ? '1.35' : null),
      item(12, 'Blush Ranunculus', '55.00', usd: usd ? '1.65' : null),
      // A flower with sizes to choose first isn't sold by the stem.
      {...item(13, 'Blush Garden', '1450.00'), 'type': 'variable'},
    ],
    'wraps': [
      addon(21, 'Kraft Paper Wrap', '60.00', usd: usd ? '1.80' : null),
      addon(22, 'Blush Paper Wrap', '90.00', usd: usd ? '2.70' : null),
    ],
    'cards': cards
        ? [addon(31, 'Greeting Card', '60.00', usd: usd ? '1.80' : null)]
        : [],
  };

  Map<String, dynamic> home() => {
    ...appPageJson(slug: 'home', title: 'Leqaa', blocks: []),
    'studio': {
      'header': {'type': 'title', 'title': 'Leqaa'},
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {'id': 'build', 'type': 'text', 'text': 'Build your bouquet'},
          {'id': 'start', 'type': 'button', 'text': 'Start', 'action': flow},
        ],
      },
    },
  };

  FakeApi api({
    Map<String, dynamic>? bouquet,
    Map<String, dynamic>? data,
    bool gift = false,
  }) {
    final store = {
      ...storeConfigJson(deliveryDate: false),
      'gift_message': {
        'enabled': true,
        'max_length': 300,
        'starters': ['With love'],
      },
      'bouquet': ?bouquet,
      if (gift) 'checkout_mode': 'gift',
    };
    final api = storeApi(store: store);
    // The app's languages, Arabic among them.
    api.config = {...api.config, 'languages': languagesJson()};
    return api
      ..bouquet = bouquet == null ? null : (data ?? builder())
      ..giftOccasions = [
        {
          'id': 'birthday',
          'name': 'Birthday',
          'icon': 'cake',
          'templates': [
            {'id': 't1', 'text': 'Happy birthday, with all my love.'},
          ],
        },
      ]
      ..navigation = navigationJson(
        tabs: [
          navTabJson('home', 'Home', 'home', {
            'type': 'page',
            'page_slug': 'home',
          }),
          navTabJson('shop', 'Shop', 'storefront', {
            'type': 'screen',
            'screen': 'search',
          }),
          navTabJson('cart', 'Cart', 'shopping_bag', {
            'type': 'screen',
            'screen': 'cart',
          }),
        ],
      )
      ..pages = {'home': home()};
  }

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    bool dark = false,
    String language = 'en',
  }) async {
    tester.view
      ..physicalSize = const Size(1080, 3200)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final app = TestApp(
      appType: AppType.store,
      api: api,
      signedIn: true,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  Finder inCard(String key, IconData icon) => find.descendant(
    of: find.byKey(ValueKey(key)),
    matching: find.byIcon(icon),
  );

  Future<void> tapKey(WidgetTester tester, String key) async {
    await tester.ensureVisible(find.byKey(ValueKey(key)));
    await tester.tap(find.byKey(ValueKey(key)));
    await TestApp.settle(tester, 10);
  }

  bool nextEnabled(WidgetTester tester) =>
      tester
          .widget<PrimaryButton>(find.byKey(const ValueKey('bouquet-next')))
          .onPressed !=
      null;

  Future<void> addStems(WidgetTester tester, int id, int count) async {
    for (var i = 0; i < count; i++) {
      final plus = inCard('bouquet-flower-$id', AppIcons.add);
      await tester.ensureVisible(plus);
      await tester.tap(plus);
      await tester.pump();
    }
  }

  for (final (mode, dark, language) in [
    ('light', false, 'en'),
    ('dark', true, 'en'),
    ('rtl', false, 'ar'),
  ]) {
    testWidgets(
      'Start opens the builder: stems, wrap, card, summary, one bouquet in the cart ($mode)',
      (tester) async {
        final app = await open(
          tester,
          api(bouquet: rules()),
          dark: dark,
          language: language,
        );
        await tester.tap(find.text('Start'));
        await TestApp.settle(tester, 20);
        expect(find.byType(BouquetBuilderScreen), findsOneWidget);
        expect(app.api.count('getBouquet'), 1);
        if (language == 'ar') {
          expect(find.text('صمّم باقتك'), findsWidgets);
          expect(
            Directionality.of(
              tester.element(find.byKey(const ValueKey('bouquet-header'))),
            ),
            TextDirection.rtl,
          );
        } else {
          expect(find.text('Build your bouquet'), findsWidgets);
        }
        // A flower with sizes isn't chosen by the stem.
        expect(find.byKey(const ValueKey('bouquet-flower-13')), findsNothing);
        expect(nextEnabled(tester), isFalse);

        // 1 The flowers: 3 roses and 2 ranunculus, the total live.
        await addStems(tester, 11, 3);
        await addStems(tester, 12, 2);
        expect(
          find.descendant(
            of: find.byKey(const ValueKey('bouquet-total')),
            matching: find.text('₺245'),
          ),
          findsOneWidget,
        );
        expect(nextEnabled(tester), isTrue);
        await tapKey(tester, 'bouquet-next');

        // 2 The wrap: required here, no "No wrap".
        expect(find.byKey(const ValueKey('bouquet-no-wrap')), findsNothing);
        expect(nextEnabled(tester), isFalse);
        expect(find.byKey(const ValueKey('bouquet-problem')), findsOneWidget);
        await tapKey(tester, 'bouquet-wrap-22');
        expect(nextEnabled(tester), isTrue);
        await tapKey(tester, 'bouquet-next');

        // 3 The card: chosen, its words from the occasion's ready message, then changed.
        expect(find.byKey(const ValueKey('bouquet-no-card')), findsOneWidget);
        await tapKey(tester, 'bouquet-card-31');
        await tapKey(tester, 'gift-occasion-birthday');
        await tapKey(tester, 'gift-template-birthday-t1');
        expect(find.text('Happy birthday, with all my love.'), findsWidgets);
        await tester.enterText(
          find.byKey(const ValueKey('gift-message')),
          'Happy birthday, Mama.',
        );
        await TestApp.settle(tester, 5);
        await tapKey(tester, 'bouquet-next');

        // 4 The bouquet: its lines and the total (245 + 90 + 60).
        expect(find.byKey(const ValueKey('bouquet-summary')), findsOneWidget);
        expect(find.byKey(const ValueKey('bouquet-line-11')), findsOneWidget);
        expect(
          find.byKey(const ValueKey('bouquet-summary-message')),
          findsOneWidget,
        );
        expect(
          find.descendant(
            of: find.byKey(const ValueKey('bouquet-total')),
            matching: find.text('₺395'),
          ),
          findsOneWidget,
        );
        await tapKey(tester, 'bouquet-next');

        // In the cart as one bouquet.
        final cart = app.container.read(cartProvider);
        expect(cart, hasLength(4));
        final id = cart.first.bouquet!.id;
        expect(cart.every((i) => i.bouquet?.id == id), isTrue);
        expect(
          [
            for (final i in cart)
              (i.productId, i.quantity, i.bouquet!.part, i.addonOf),
          ],
          [
            (11, 3, BouquetPartKind.flower, null),
            (12, 2, BouquetPartKind.flower, null),
            (22, 1, BouquetPartKind.wrap, 11),
            (31, 1, BouquetPartKind.card, 11),
          ],
        );
        expect(cart.last.bouquet!.message, 'Happy birthday, Mama.');
        expect(cart.take(3).every((i) => i.bouquet!.message == null), isTrue);
        // The tab's count: one bouquet.
        expect(app.container.read(cartCountProvider), 1);
        // The cart shows it as one, and sends its lines grouped.
        expect(find.byKey(ValueKey('cart-bouquet-$id')), findsOneWidget);
        expect(
          find.byKey(ValueKey('cart-bouquet-message-$id')),
          findsOneWidget,
        );
        expect(
          app.api.lastCartLines!.map((l) => l.toJson()['bouquet']).toList(),
          [
            {'id': id, 'part': 'flower'},
            {'id': id, 'part': 'flower'},
            {'id': id, 'part': 'wrap'},
            {'id': id, 'part': 'card', 'message': 'Happy birthday, Mama.'},
          ],
        );
        // Taken out of the cart as one.
        await tapKey(tester, 'cart-bouquet-remove-$id');
        expect(app.container.read(cartProvider), isEmpty);
      },
    );
  }

  testWidgets('without the builder set up, Start opens the shop as before', (
    tester,
  ) async {
    final app = await open(tester, api());
    await tester.tap(find.text('Start'));
    await TestApp.settle(tester, 20);
    expect(find.byType(BouquetBuilderScreen), findsNothing);
    expect(find.byType(ShopScreen), findsOneWidget);
    expect(app.api.count('getBouquet'), 0);
    expect(app.container.read(appRouterProvider).state.uri.path, '/shop');
  });

  testWidgets(
    'the wrap and the card left out where the owner allows it, in the gift checkout',
    (tester) async {
      final app = await open(
        tester,
        api(
          bouquet: rules(wrapOptional: true, cards: false),
          data: builder(wrapOptional: true, cards: false),
          gift: true,
        ),
      );
      await tester.tap(find.text('Start'));
      await TestApp.settle(tester, 20);
      await addStems(tester, 12, 4);
      await tapKey(tester, 'bouquet-next');
      await tapKey(tester, 'bouquet-no-wrap');
      expect(nextEnabled(tester), isTrue);
      await tapKey(tester, 'bouquet-next');
      // A shop with no cards to choose: the words only, which may be skipped.
      expect(find.byKey(const ValueKey('bouquet-card-31')), findsNothing);
      await tapKey(tester, 'bouquet-skip-card');
      expect(find.byKey(const ValueKey('bouquet-summary')), findsOneWidget);
      expect(find.text('No wrap'), findsWidgets);
      expect(find.text('No card'), findsWidgets);
      // The gift checkout's word on the button.
      expect(find.text('Send flowers'), findsOneWidget);
      await tapKey(tester, 'bouquet-next');
      final cart = app.container.read(cartProvider);
      expect(
        [for (final i in cart) (i.productId, i.quantity, i.bouquet!.part)],
        [(12, 4, BouquetPartKind.flower)],
      );
      expect(cart.single.bouquet!.message, isNull);
    },
  );

  testWidgets('the stems kept between the shop\'s least and most', (
    tester,
  ) async {
    await open(
      tester,
      api(bouquet: rules(max: 4), data: {...builder(), 'max_stems': 4}),
    );
    await tester.tap(find.text('Start'));
    await TestApp.settle(tester, 20);
    await addStems(tester, 11, 2);
    // Fewer than 3: said, and no going on.
    expect(nextEnabled(tester), isFalse);
    expect(find.byKey(const ValueKey('bouquet-problem')), findsOneWidget);
    await addStems(tester, 12, 2);
    expect(nextEnabled(tester), isTrue);
    // The most reached: no more plus anywhere.
    final plus = tester.widget<SquareIconButton>(
      find
          .ancestor(
            of: inCard('bouquet-flower-11', AppIcons.add),
            matching: find.byType(SquareIconButton),
          )
          .first,
    );
    expect(plus.onPressed, isNull);
    expect(find.text('A bouquet has at most 4 stems.'), findsOneWidget);
  });

  group('162 the draft', () {
    ProductSummary summary(Map<String, dynamic> json) =>
        ProductSummary.fromJson(json);

    test(
      'prices the bouquet, in the customer\'s currency too, and its lines',
      () {
        final d = BouquetDraft(BouquetBuilderData.fromJson(builder(usd: true)));
        final rose = summary(item(11, 'Red Rose', '45.00'));
        d.setStems(rose, 6);
        d.chooseWrap(21);
        d.chooseCard(31);
        d.message = '  For you  ';
        expect(d.stemCount, 6);
        expect(d.totalFormatted, '₺390');
        expect(d.displayTotal, r'$11.70');
        final lines = d.cartLines('b-1');
        expect(
          [for (final l in lines) l.key],
          ['11|0|b=b-1', '21|0|a=11|b=b-1', '31|0|a=11|b=b-1'],
        );
        expect(lines.last.bouquet!.message, 'For you');
        // Never more than the most.
        d.setStems(rose, 40);
        expect(d.stemCount, 12);
      },
    );

    test('puts the words on the first flower when the shop has no cards', () {
      final d = BouquetDraft(
        BouquetBuilderData.fromJson(builder(cards: false, cardOptional: false)),
      );
      d.setStems(summary(item(11, 'Red Rose', '45.00')), 3);
      d.chooseWrap(21);
      expect(d.cardDone, isFalse);
      d.message = 'Love';
      expect(d.cardDone, isTrue);
      final lines = d.cartLines('b-2');
      expect(lines.first.bouquet!.message, 'Love');
      expect(lines, hasLength(2));
      expect(newBouquetId(), matches(RegExp(r'^b-[a-z0-9]+-[0-9a-f]{4}$')));
    });
  });
}
