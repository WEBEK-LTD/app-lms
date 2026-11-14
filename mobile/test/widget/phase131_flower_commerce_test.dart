import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/format/dates.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/sale_widgets.dart';
import 'package:yallapp/modules/shared/pages/studio_flash_sale.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/widgets/gift_checkout.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 131 The flower shop's commerce in the app: the premium delivery picker
/// (Today until the cut-off, Tomorrow, a date; the slots, full ones
/// disabled), the gift checkout (the sender, the recipient and the
/// address, the card with its occasions and ready messages, "send
/// anonymously") sent with the order, and Studio's flash sale element (was
/// and now, the share off, a ticking countdown, the stock bar, gone once
/// the sale is over), each light, dark and right to left.
void main() {
  final cartJson = jsonEncode([
    const CartItem(
      productId: 21,
      quantity: 1,
      name: 'Red roses',
      price: '₺400.00',
      maxQuantity: 5,
    ).toJson(),
  ]);

  Map<String, dynamic> store({bool gift = true, String? cutoff}) => {
    ...storeConfigJson(),
    'checkout_mode': gift ? 'gift' : 'standard',
    'delivery_date': {
      'enabled': true,
      'required': true,
      'min_days': 0,
      'max_days': 14,
      'closed_weekdays': <int>[],
      'timezone': 'Europe/Istanbul',
      'same_day_cutoff': cutoff,
      'slots': [
        {'id': 's1', 'start': '10:00', 'end': '13:00', 'label': '10:00–13:00'},
        {
          'id': 's2',
          'start': '16:00',
          'end': '20:00',
          'label': '16:00–20:00',
          'fee': '25.00',
          'fee_formatted': '₺25.00',
          'capacity': 5,
        },
      ],
    },
    'gift_message': {
      'enabled': true,
      'max_length': 500,
      'starters': ['With love'],
      'recipient': true,
      'anonymous': true,
    },
  };

  FakeApi giftApi({bool gift = true}) =>
      FakeApi(
          config: {
            ...configJson(lms: null, orders: true, languages: languagesJson()),
            'store': store(gift: gift),
          },
        )
        ..deliverySlotsJson = [
          {
            'id': 's1',
            'start': '10:00',
            'end': '13:00',
            'label': '10:00–13:00',
            'available': true,
            'full': false,
          },
          {
            'id': 's2',
            'start': '16:00',
            'end': '20:00',
            'label': '16:00–20:00',
            'fee_formatted': '₺25.00',
            'available': false,
            'full': true,
            'remaining': 0,
          },
        ]
        ..giftOccasions = [
          {
            'id': 'birthday',
            'name': 'Birthday',
            'icon': 'cake',
            'templates': [
              {
                'id': 't1',
                'text': 'Happy birthday! May your year be as bright as these flowers.',
              },
            ],
          },
          {
            'id': 'love',
            'name': 'Love',
            'icon': 'favorite',
            'templates': [
              {'id': 't1', 'text': 'Just because I love you.'},
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

  for (final (mode, dark, arabic) in [
    ('light', false, false),
    ('dark', true, false),
    ('rtl', false, true),
  ]) {
    testWidgets('the gift checkout draws $mode', (tester) async {
      await openCart(
        tester,
        giftApi(),
        dark: dark,
        language: arabic ? 'ar' : 'en',
      );
      expect(tester.takeException(), isNull);
      final picker = find.byKey(const ValueKey('delivery-picker'));
      expect(picker, findsOneWidget);
      expect(
        Directionality.of(tester.element(picker)),
        arabic ? TextDirection.rtl : TextDirection.ltr,
      );
      expect(
        Theme.of(tester.element(picker)).brightness,
        dark ? Brightness.dark : Brightness.light,
      );
      for (final key in ['gift-sender', 'gift-recipient', 'gift-card']) {
        expect(find.byKey(ValueKey(key)), findsOneWidget, reason: key);
      }
      // The day comes first: the slots wait for it.
      expect(find.byKey(const ValueKey('delivery-slot-s1')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('delivery-today')));
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('delivery-slot-s1')), findsOneWidget);
      expect(
        find.text(arabic ? 'ممتلئ' : 'Full'),
        findsOneWidget,
        reason: 'the full slot says so',
      );
    });
  }

  testWidgets(
    'the gift checkout asks for the day, the slot and both people, then sends them',
    (tester) async {
      final api = giftApi();
      await openCart(tester, api);
      await tester.tap(find.text('Checkout'));
      await TestApp.settle(tester);
      expect(api.count('createStoreCheckoutLink'), 0);
      expect(find.text('Choose a delivery date to continue.'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('delivery-today')));
      await TestApp.settle(tester);
      expect(find.text('Choose a delivery time to continue.'), findsOneWidget);
      // A full slot can't be chosen.
      await tester.tap(find.byKey(const ValueKey('delivery-slot-s2')));
      await TestApp.settle(tester);
      expect(find.text('Choose a delivery time to continue.'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('delivery-slot-s1')));
      await TestApp.settle(tester);
      expect(api.lastQuoteDelivery?.slot, 's1');
      expect(
        find.text('Add your name, phone and email to continue.'),
        findsOneWidget,
      );

      Future<void> type(String key, String text) async {
        await tester.enterText(find.byKey(ValueKey(key)), text);
        await tester.pump();
      }

      await type('gift-sender-name', 'Ayşe Kaya');
      await type('gift-sender-phone', '+90 532 111 11 11');
      await type('gift-sender-email', 'ayse@example.com');
      expect(
        find.text('Add the recipient\'s name, phone and address to continue.'),
        findsOneWidget,
      );
      await type('gift-recipient-name', 'Leyla');
      await type('gift-recipient-phone', '+905322222222');
      await type('gift-recipient-address', 'Moda Cd. 12, Kadıköy');

      // An occasion's ready message fills the card; it can still be changed.
      await tester.tap(find.byKey(const ValueKey('gift-occasion-birthday')));
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const ValueKey('gift-template-birthday-t1')));
      await TestApp.settle(tester);
      final card = tester.widget<TextField>(
        find.byKey(const ValueKey('gift-message')),
      );
      expect(card.controller!.text, startsWith('Happy birthday!'));
      await tester.ensureVisible(find.byKey(const ValueKey('gift-anonymous')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('gift-anonymous')));
      await TestApp.settle(tester);

      await tester.tap(find.text('Checkout'));
      await TestApp.settle(tester);
      expect(api.count('createStoreCheckoutLink'), 1);
      expect(api.lastStoreCheckout?.deliveryDate, isoDate(DateTime.now()));
      expect(api.lastStoreCheckout?.giftMessage, startsWith('Happy birthday!'));
      expect(api.lastGift?.slot, 's1');
      expect(api.lastGift?.anonymous, isTrue);
      expect(api.lastGift?.sender?.toSender(), {
        'name': 'Ayşe Kaya',
        'phone': '+90 532 111 11 11',
        'email': 'ayse@example.com',
      });
      expect(
        api.lastGift?.recipient?.toRecipient()['address'],
        'Moda Cd. 12, Kadıköy',
      );
    },
  );

  testWidgets(
    'the standard checkout keeps one card field until a recipient is asked for',
    (tester) async {
      final api = giftApi(gift: false);
      await openCart(tester, api);
      expect(find.byKey(const ValueKey('gift-sender')), findsNothing);
      expect(find.byKey(const ValueKey('gift-recipient-name')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('gift-to-someone')));
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('gift-recipient-name')), findsOneWidget);
      // No address in the standard checkout.
      expect(
        find.byKey(const ValueKey('gift-recipient-address')),
        findsNothing,
      );
    },
  );

  Widget bare(Widget child, {String lang = 'en', bool dark = false}) =>
      ProviderScope(
        child: MaterialApp(
          theme: buildAppTheme(
            primary: const Color(0xFFC2185B),
            secondary: const Color(0xFF2E7D32),
            brightness: dark ? Brightness.dark : Brightness.light,
            template: AppTemplate.bold,
            fontFamily: 'Manrope',
          ),
          locale: Locale(lang),
          supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: Scaffold(
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: child,
            ),
          ),
        ),
      );

  group('the delivery day picker counts the cut-off', () {
    final rules = DeliveryDateRules.fromJson({
      ...(store(cutoff: '14:00')['delivery_date'] as Map<String, dynamic>),
      'slots': <Map<String, dynamic>>[],
    });

    testWidgets('before it, today is offered until then', (tester) async {
      await tester.pumpWidget(
        bare(
          DeliveryPicker(
            rules: rules,
            date: null,
            slot: null,
            onDate: (_) {},
            onSlot: (_) {},
            now: () => DateTime(2026, 11, 20, 11),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('Order by 14:00 for delivery today'), findsOneWidget);
      final today = tester.widget<CheckoutChip>(
        find.byKey(const ValueKey('delivery-today')),
      );
      expect(today.onTap, isNotNull);
    });

    testWidgets('after it, today is closed and tomorrow is offered', (
      tester,
    ) async {
      await tester.pumpWidget(
        bare(
          DeliveryPicker(
            rules: rules,
            date: null,
            slot: null,
            onDate: (_) {},
            onSlot: (_) {},
            now: () => DateTime(2026, 11, 20, 14, 30),
          ),
          lang: 'ar',
        ),
      );
      await tester.pump();
      expect(find.text('انتهى وقت طلبات اليوم.'), findsOneWidget);
      expect(
        tester
            .widget<CheckoutChip>(find.byKey(const ValueKey('delivery-today')))
            .onTap,
        isNull,
      );
      expect(
        tester
            .widget<CheckoutChip>(
              find.byKey(const ValueKey('delivery-tomorrow')),
            )
            .onTap,
        isNotNull,
      );
    });
  });

  group('Studio\'s flash sale element', () {
    final ends = DateTime.utc(2026, 11, 21, 18);
    StudioNode flashNode({String look = 'banner'}) => StudioNode.tryParse({
      'id': 'flash',
      'type': 'flash_sale',
      'text': 'Mother\'s Day roses',
      'flash_sale': {'look': look, 'accent': '#C2185B'},
      'flash': {
        'id': 1,
        'title': 'Roses',
        'ends_at': ends.toIso8601String(),
        'percent_off': 20,
        'remaining': 12,
        'total': 40,
      },
      'items': [
        for (final (id, name) in [(7, 'Red roses'), (8, 'White lilies')])
          {
            'source': 'products',
            'id': '$id',
            'title': name,
            'price_label': '₺400.00',
            'sale': {
              'was': '500.00',
              'was_formatted': '₺500.00',
              'now': '400.00',
              'now_formatted': '₺400.00',
              'percent_off': 20,
              'ends_at': ends.toIso8601String(),
              'remaining': 12,
              'total': 40,
              'flash_sale_id': 1,
            },
          },
      ],
    })!;

    for (final (mode, dark, lang) in [
      ('light', false, 'en'),
      ('dark', true, 'en'),
      ('rtl', false, 'ar'),
    ]) {
      for (final look in ['banner', 'carousel', 'grid']) {
        testWidgets('$look draws $mode', (tester) async {
          var clock = DateTime.utc(2026, 11, 21, 12);
          await tester.pumpWidget(
            bare(
              StudioFlashSale(
                node: flashNode(look: look),
                title: 'Mother\'s Day roses',
                now: () => clock,
              ),
              lang: lang,
              dark: dark,
            ),
          );
          await tester.pump();
          expect(tester.takeException(), isNull);
          expect(find.text('Mother\'s Day roses'), findsOneWidget);
          expect(find.text('Red roses'), findsOneWidget);
          expect(find.text('₺500.00'), findsNWidgets(2));
          expect(find.byType(SaleChip), findsNWidgets(2));
          expect(find.byType(SaleStockBar), findsOneWidget);
          expect(
            find.text(lang == 'ar' ? 'بقيت 12 قطعة' : 'Only 12 left'),
            findsOneWidget,
          );
          // The countdown ticks: six hours, then a second less.
          String box(int i) => tester
              .widget<Text>(
                find.descendant(
                  of: find.byKey(ValueKey('sale-countdown-$i')),
                  matching: find.byType(Text),
                ),
              )
              .data!;
          expect(box(0), startsWith('06'));
          clock = clock.add(const Duration(seconds: 1));
          await tester.pump(const Duration(seconds: 1));
          expect(box(0), startsWith('05'));
          expect(box(1), startsWith('59'));
          if (look == 'banner') {
            expect(
              find.byKey(const ValueKey('flash-banner-flash')),
              findsOneWidget,
            );
          }
        });
      }
    }

    testWidgets('it is gone once the sale ends, even with reduced motion', (
      tester,
    ) async {
      var clock = ends.subtract(const Duration(seconds: 2));
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: bare(
            StudioFlashSale(node: flashNode(), title: null, now: () => clock),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('Roses'), findsOneWidget);
      clock = ends.add(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('Roses'), findsNothing);
      expect(find.byType(SaleChip), findsNothing);
      expect(StudioFlashSale.shows(flashNode(), clock), isFalse);
    });
  });
}
