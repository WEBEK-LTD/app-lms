import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/shared/account/order_screen.dart';

import '../screenshots/support/leqaa.dart';
import '../screenshots/support/shot.dart' show loadAppFonts;
import '../screenshots/support/studio_demo.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 173 A tester's order (#1057) in Leqaa's app showed its lines and its
/// total only: 360 + 120 against 482, without the day, the time, the
/// recipient, the address, the card or the coupon. The order screen now
/// shows the delivery (the day and the shop's time, the recipient, the
/// address), the gift card (its message and who sends it) and the totals
/// that add up (the subtotal, the coupon with its code, the delivery, the
/// delivery time's fee, the total), by day and by night, left to right and
/// right to left. An order without a card or a coupon shows neither.
/// `ORDER_SHOTS_DIR` keeps a picture of each screen there.

Map<String, dynamic> _order1057({bool gift = true, bool coupon = true}) => {
  ...orderJson(),
  'id': 1057,
  'number': '1057',
  'status': 'processing',
  'status_label': 'Processing',
  'created_at': '2026-11-17T09:30:00Z',
  'total': coupon ? 'MAD 482.00' : 'MAD 530.00',
  'items': [
    {
      'name': 'Blush Garden',
      'product_id': 101,
      'quantity': 1,
      'total': 'MAD 360.00',
    },
    {
      'name': 'Chocolate box',
      'product_id': 102,
      'quantity': 1,
      'addon_of': 101,
      'total': 'MAD 120.00',
    },
  ],
  'delivery': {
    'date': '2026-11-19',
    'slot': {
      'id': 'morning',
      'start': '10:00',
      'end': '13:00',
      'label': '10:00–13:00',
    },
    'fee': 'MAD 20.00',
    'sender': {
      'name': 'Salma Idrissi',
      'phone': '+212600000001',
      'email': 'salma@example.com',
    },
    'recipient': {
      'name': 'Nadia Benali',
      'phone': '+212600000002',
      'address': '12 Rue de la Liberté, Guéliz',
      'city': 'Marrakech',
      'country': 'MA',
    },
    'gift_message': gift ? 'Happy birthday, Nadia! With love.' : null,
    'anonymous': false,
  },
  'amounts': {
    'subtotal': 'MAD 480.00',
    'discount': coupon ? {'code': 'LEQAA10', 'amount': 'MAD 48.00'} : null,
    'points': null,
    'shipping': {'zone': 'Marrakech', 'amount': 'MAD 30.00'},
    'slot_fee': 'MAD 20.00',
    'fees': <Object>[],
    'tax': null,
    'total': coupon ? 'MAD 482.00' : 'MAD 530.00',
  },
};

Future<FakeApi> _open(
  WidgetTester tester, {
  required Map<String, dynamic> order,
  String lang = 'en',
  bool dark = false,
}) async {
  tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  StudioDemo.language = lang;
  final demo = StudioDemo.signature('flowers', 'a');
  final api = leqaaStudioApi(look: demo, lang: lang)
    ..orders = [order]
    ..order = order;
  await demo.prepare(tester, leqaaPhotoPaths);
  final app = TestApp(
    api: api,
    appType: AppType.store,
    signedIn: true,
    preferences: {
      'settings.language': lang,
      'settings.theme_mode': dark ? 'dark' : 'light',
    },
  );
  await app.pump(tester);
  await TestApp.settle(tester, 30);
  app.container.read(appRouterProvider).push(Paths.order(order['id'] as int));
  await TestApp.settle(tester, 30);
  expect(find.byType(OrderScreen), findsOneWidget);
  return api;
}

/// The text of [key]'s widget and what's inside it, joined.
String _textOf(WidgetTester tester, Key key) => tester
    .widgetList<Text>(
      find.descendant(of: find.byKey(key), matching: find.byType(Text)),
    )
    .map((t) => t.data ?? '')
    .join(' | ')
    // The bidi marks around names, times and amounts in right to left.
    .replaceAll(RegExp('[\u2066-\u2069]'), '');

/// The whole order, scrolled through, as a picture in `ORDER_SHOTS_DIR`.
Future<void> _shot(WidgetTester tester, String name) async {
  final dir = Platform.environment['ORDER_SHOTS_DIR'];
  if (dir == null || dir.isEmpty) return;
  final list = find.descendant(
    of: find.byType(OrderScreen),
    matching: find.byType(Scrollable),
  );
  for (var page = 0; page < 3; page++) {
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byType(RepaintBoundary).first,
    );
    await tester.runAsync(() async {
      final image = await boundary.toImage(pixelRatio: 1.5);
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      File('$dir/$name-$page.png')
          .writeAsBytesSync(bytes!.buffer.asUint8List());
    });
    await tester.drag(list.first, const Offset(0, -500));
    await TestApp.settle(tester, 10);
  }
}

void main() {
  // The app's own fonts, as on a phone (the test font is wider).
  setUpAll(loadAppFonts);

  final words = {
    'en': (
      delivery: 'Delivery',
      day: 'Thu 19 Nov',
      slot: "10:00–13:00, the shop's time",
      recipient: 'Recipient',
      address: '12 Rue de la Liberté, Guéliz, Marrakech',
      gift: 'Gift card',
      from: 'From Salma Idrissi',
      subtotal: 'Subtotal',
      coupon: 'Coupon LEQAA10',
      shipping: 'Delivery to Marrakech',
      slotFee: 'Delivery time fee',
      total: 'Total',
    ),
    'ar': (
      delivery: 'التوصيل',
      day: null,
      slot: '10:00–13:00 بتوقيت المتجر',
      recipient: 'المستلم',
      address: '12 Rue de la Liberté, Guéliz, Marrakech',
      gift: 'بطاقة الإهداء',
      from: 'من Salma Idrissi',
      subtotal: 'المجموع الفرعي',
      coupon: 'القسيمة LEQAA10',
      shipping: 'التوصيل إلى Marrakech',
      slotFee: 'رسوم وقت التوصيل',
      total: 'المجموع',
    ),
    'tr': (
      delivery: 'Teslimat',
      day: null,
      slot: '10:00–13:00, mağaza saatiyle',
      recipient: 'Alıcı',
      address: '12 Rue de la Liberté, Guéliz, Marrakech',
      gift: 'Hediye kartı',
      from: 'Gönderen: Salma Idrissi',
      subtotal: 'Ara toplam',
      coupon: 'Kupon LEQAA10',
      shipping: 'Teslimat: Marrakech',
      slotFee: 'Teslimat saati ücreti',
      total: 'Toplam',
    ),
  };

  for (final (lang, dark) in [
    ('en', false),
    ('en', true),
    ('ar', false),
    ('ar', true),
    ('tr', false),
  ]) {
    final w = words[lang]!;
    final named = '$lang, ${dark ? 'dark' : 'light'}';

    testWidgets('173 every block of order #1057 ($named)', (tester) async {
      await _open(tester, order: _order1057(), lang: lang, dark: dark);
      final screen = tester.element(find.byType(OrderScreen));
      expect(
        Directionality.of(screen),
        lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      );
      expect(
        Theme.of(screen).brightness,
        dark ? Brightness.dark : Brightness.light,
      );

      // The delivery: the day, the shop's time, the recipient, the address.
      final delivery = _textOf(tester, const ValueKey('order-delivery'));
      expect(delivery, contains(w.delivery));
      if (w.day != null) {
        expect(_textOf(tester, const ValueKey('order-delivery-day')), w.day);
      } else {
        expect(find.byKey(const ValueKey('order-delivery-day')), findsOne);
      }
      expect(_textOf(tester, const ValueKey('order-delivery-slot')), w.slot);
      expect(
        _textOf(tester, const ValueKey('order-delivery-recipient')),
        '${w.recipient} | Nadia Benali | +212600000002',
      );
      expect(
        _textOf(tester, const ValueKey('order-delivery-address')),
        contains(w.address),
      );

      // The card: its message and who sends it.
      expect(
        _textOf(tester, const ValueKey('order-gift')),
        '${w.gift} | Happy birthday, Nadia! With love. | ${w.from}',
      );

      // The totals add up: 480 - 48 + 30 + 20 = 482.
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('order-amount-total')),
        200,
        scrollable: find
            .descendant(
              of: find.byType(OrderScreen),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(
        _textOf(tester, const ValueKey('order-amount-subtotal')),
        '${w.subtotal} | MAD 480.00',
      );
      expect(
        _textOf(tester, const ValueKey('order-amount-discount')),
        '${w.coupon} | \u2212MAD 48.00',
      );
      expect(
        _textOf(tester, const ValueKey('order-amount-shipping')),
        '${w.shipping} | MAD 30.00',
      );
      expect(
        _textOf(tester, const ValueKey('order-amount-slot')),
        '${w.slotFee} | MAD 20.00',
      );
      expect(
        _textOf(tester, const ValueKey('order-amount-total')),
        '${w.total} | MAD 482.00',
      );
      // The lines themselves are still there.
      expect(find.text('Blush Garden'), findsOneWidget);
      expect(find.text('MAD 360.00'), findsOneWidget);
      expect(find.text('MAD 120.00'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('order-delivery')),
        -200,
        scrollable: find
            .descendant(
              of: find.byType(OrderScreen),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await _shot(tester, 'order-1057-$lang-${dark ? 'dark' : 'light'}');
    });
  }

  for (final (lang, dark) in [('en', false), ('en', true), ('ar', false)]) {
    final named = '$lang, ${dark ? 'dark' : 'light'}';
    testWidgets('173 no card and no coupon: neither shows ($named)', (
      tester,
    ) async {
      await _open(
        tester,
        order: _order1057(gift: false, coupon: false),
        lang: lang,
        dark: dark,
      );
      expect(
        Directionality.of(tester.element(find.byType(OrderScreen))),
        lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      );
      expect(find.byKey(const ValueKey('order-delivery')), findsOneWidget);
      expect(find.byKey(const ValueKey('order-gift')), findsNothing);
      expect(find.byKey(const ValueKey('order-amount-discount')), findsNothing);
      expect(find.byKey(const ValueKey('order-amount-subtotal')), findsOne);
      expect(find.byKey(const ValueKey('order-amount-slot')), findsOne);
      expect(
        _textOf(tester, const ValueKey('order-amount-total')),
        endsWith('MAD 530.00'),
      );
      expect(tester.takeException(), isNull);
      await _shot(tester, 'order-plain-$lang-${dark ? 'dark' : 'light'}');
    });
  }

  testWidgets('173 an older server: the lines and the total, as before', (
    tester,
  ) async {
    final order = _order1057()
      ..remove('amounts')
      ..remove('delivery');
    await _open(tester, order: order);
    expect(find.byKey(const ValueKey('order-amounts')), findsNothing);
    expect(find.byKey(const ValueKey('order-delivery')), findsNothing);
    expect(find.byKey(const ValueKey('order-gift')), findsNothing);
    expect(find.text('MAD 482.00'), findsOneWidget);
  });

  test('173 an order with its details opens from the list before its first '
      'stage', () {
    expect(
      Order.fromJson(_order1057()).opensScreen,
      isTrue,
      reason: 'no stage, no shipment, no return: its details',
    );
    final older = Order.fromJson(
      _order1057()
        ..remove('amounts')
        ..remove('delivery'),
    );
    expect(older.opensScreen, isFalse);
  });
}
