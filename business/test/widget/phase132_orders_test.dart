import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/widgets/contact.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 132 The owner's report: a Studio app's order "shows there's an order,
/// but not who ordered, nor the recipient, nor where it goes". Now an
/// order's page has who ordered (Call, WhatsApp), where it goes (Open in
/// Maps, Copy address), when, the gift card, the items with their add-ons
/// under them, the payment with its discounts and fees; the list has who,
/// when and the total; light, dark, right to left. The food, marketplace,
/// shipment and ride pages have their people and places too.
///
/// `YB_SHOTS_DIR=<dir> flutter test test/widget/phase132_orders_test.dart`
/// also writes 2x pictures of the gift and food pages and the list.

Finder down() => find
    .byWidgetPredicate(
      (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
    )
    .first;

final _shots = Platform.environment['YB_SHOTS_DIR'] ?? '';
const _frame = ValueKey('phase132-shot');

Future<void> _loadFonts() async {
  final manifest =
      json.decode(await rootBundle.loadString('FontManifest.json')) as List;
  for (final entry in manifest.cast<Map<String, dynamic>>()) {
    final loader = FontLoader(entry['family'] as String);
    for (final font in (entry['fonts'] as List).cast<Map<String, dynamic>>()) {
      loader.addFont(rootBundle.load(font['asset'] as String));
    }
    await loader.load();
  }
}

/// Writes what the screen shows at 2x when YB_SHOTS_DIR is set.
Future<void> _shot(WidgetTester tester, String name) async {
  if (_shots.isEmpty) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(_frame),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('$_shots/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

Future<TestApp> _open(
  WidgetTester tester,
  String location, {
  String appId = FakeOwnerApi.flowersId,
  String language = 'en',
  Brightness? brightness,
  double height = 860,
}) async {
  final app = TestApp(
    api: FakeOwnerApi()..language = language,
    appId: appId,
    language: language,
    brightness: brightness,
  );
  await app.pump(
    tester,
    size: Size(400, height),
    pixelRatio: 2,
    wrap: (root) => RepaintBoundary(key: _frame, child: root),
  );
  await go(tester, app, location);
  return app;
}

void main() {
  final copied = <String>[];
  setUpAll(() async {
    if (_shots.isNotEmpty) await _loadFonts();
  });
  setUp(() {
    copied.clear();
    TestWidgetsFlutterBinding.ensureInitialized();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (call) async {
          if (call.method == 'Clipboard.setData') {
            copied.add((call.arguments as Map)['text'] as String);
          }
          return null;
        });
  });

  testWidgets(
    'a gift order: the sender, the recipient with the map, when, the card, the add-ons, the payment',
    (tester) async {
      final app = await _open(tester, '/orders/2051', height: 2200);
      expect(find.text('#2051'), findsOneWidget);
      expect(find.text('Gift'), findsOneWidget);
      // Who ordered: the gift's sender, with Call and WhatsApp.
      expect(find.text('Sender'), findsOneWidget);
      expect(find.text(isolate('Omar Nabil')), findsOneWidget);
      expect(find.text('omar.nabil@example.com'), findsOneWidget);
      // Where it goes: the recipient and the place.
      expect(find.text('Deliver to'), findsOneWidget);
      expect(find.text('Recipient'), findsOneWidget);
      expect(find.text(isolate('Salma Nabil')), findsOneWidget);
      expect(
        find.text(isolate('14 Brazil St, Zamalek, Cairo')),
        findsOneWidget,
      );
      expect(
        find.text('Zone: ${isolate('4.2 km')} · Pinned on the map'),
        findsOneWidget,
      );
      await tapOn(tester, find.text('Open in Maps'));
      expect(app.opened.last, startsWith('geo:30.0626,31.2197?q='));
      await tapOn(tester, find.text('Copy address'));
      expect(copied.last, '14 Brazil St, Zamalek, Cairo');
      expect(find.text('Address copied'), findsOneWidget);
      await tapOn(tester, find.text('WhatsApp').last);
      expect(app.opened.last, 'whatsapp://send?phone=201007654321');
      await tapOn(tester, find.text('Call').first);
      expect(app.opened.last, 'tel:+201001234567');
      // When: the day and the slot.
      expect(find.text('When'), findsOneWidget);
      expect(find.textContaining(isolate('13:00–16:00')), findsOneWidget);
      // The card, signed by the sender.
      expect(
        find.text('“${isolate('Happy birthday, Mama! With all my love.')}”'),
        findsOneWidget,
      );
      expect(find.text('Signed: ${isolate('Omar Nabil')}'), findsOneWidget);
      // The bouquet, its flash sale and its two add-ons under it.
      expect(find.text('Wrap: Kraft paper'), findsOneWidget);
      expect(
        find.text("${isolate("Mother's Day roses")} · ${isolate('−25%')}"),
        findsOneWidget,
      );
      expect(find.text('Add-on'), findsNWidgets(2));
      final bouquet = tester.getTopLeft(find.text('Blush Garden - Deluxe'));
      final chocolate = tester.getTopLeft(find.text('Belgian chocolate box'));
      expect(chocolate.dy, greaterThan(bouquet.dy));
      expect(chocolate.dx, greaterThan(bouquet.dx));
      // The payment: the coupon, the delivery fee and what made it up.
      expect(find.text('Subtotal'), findsOneWidget);
      expect(find.text('Coupon ${isolate('LEQAA10')}'), findsOneWidget);
      expect(find.text('−E£209.50'), findsOneWidget);
      expect(find.text('Delivery fee'), findsOneWidget);
      expect(find.text('Base fee'), findsOneWidget);
      expect(find.text('Delivery time'), findsOneWidget);
      expect(find.text('E£2,035.50'), findsOneWidget);
      // Its next steps at the foot.
      expect(
        find.widgetWithText(FilledButton, 'Mark completed'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'a gift sent anonymously says so; the owner still sees the sender',
    (tester) async {
      await _open(tester, '/orders/2050', height: 1800);
      expect(find.text(isolate('Karim Adel')), findsOneWidget);
      expect(find.text(isolate('Hana Fathy')), findsOneWidget);
      expect(
        find.text("Send anonymously: the card doesn't show the sender's name."),
        findsOneWidget,
      );
      expect(find.textContaining('Signed'), findsNothing);
    },
  );

  testWidgets(
    'the list: who ordered, for whom, when, the total; waiting payments in progress',
    (tester) async {
      await _open(tester, '/orders');
      expect(find.text('Omar Nabil'), findsOneWidget);
      expect(find.text('For ${isolate('Salma Nabil')}'), findsOneWidget);
      expect(find.textContaining(isolate('13:00–16:00')), findsOneWidget);
      expect(find.text('E£2,035.50'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('#2048'),
        200,
        scrollable: down(),
      );
      expect(
        find.text('Waiting for payment: ${isolate('Cash on delivery')}'),
        findsOneWidget,
      );
      expect(find.widgetWithText(FilledButton, 'Mark as paid'), findsOneWidget);
    },
  );

  testWidgets('Today: an order waiting for its payment needs the owner', (
    tester,
  ) async {
    await _open(tester, '/today', height: 1400);
    await tester.scrollUntilVisible(
      find.text('1 order waiting for its payment'),
      200,
      scrollable: down(),
    );
    await tapOn(tester, find.text('1 order waiting for its payment'));
    expect(find.text('#2048'), findsOneWidget);
  });

  testWidgets('in dark, every part has its colors and nothing overflows', (
    tester,
  ) async {
    await _open(
      tester,
      '/orders/2051',
      brightness: Brightness.dark,
      height: 2200,
    );
    expect(
      Theme.of(tester.element(find.text('Deliver to'))).brightness,
      Brightness.dark,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('in Arabic, right to left, in Modern Standard Arabic', (
    tester,
  ) async {
    await _open(tester, '/orders/2051', language: 'ar', height: 2200);
    expect(find.text('التوصيل إلى'), findsOneWidget);
    expect(find.text('فتح في الخرائط'), findsOneWidget);
    expect(find.text('نسخ العنوان'), findsOneWidget);
    expect(find.text('رسالة بطاقة الهدية'), findsOneWidget);
    expect(find.text('إضافة'), findsNWidgets(2));
    expect(
      Directionality.of(tester.element(find.text('التوصيل إلى'))),
      TextDirection.rtl,
    );
    // The add-ons are indented toward the start, the right in Arabic.
    final bouquet = tester.getTopRight(find.text('Blush Garden - Deluxe'));
    final chocolate = tester.getTopRight(find.text('Belgian chocolate box'));
    expect(chocolate.dx, lessThan(bouquet.dx));
    expect(tester.takeException(), isNull);
  });

  testWidgets('in Turkish', (tester) async {
    await _open(tester, '/orders/2051', language: 'tr', height: 2200);
    expect(find.text('Teslimat adresi'), findsOneWidget);
    expect(find.text('Haritada aç'), findsOneWidget);
    expect(find.text('Hediye kartı mesajı'), findsOneWidget);
  });

  testWidgets(
    'a restaurant delivery: the address, the notes, as soon as possible',
    (tester) async {
      final app = await _open(
        tester,
        '/orders/1042',
        appId: FakeOwnerApi.restaurantId,
        height: 1800,
      );
      expect(
        find.text(isolate('Moda Cd. 12, Kadıköy, Istanbul')),
        findsOneWidget,
      );
      expect(find.text('Third floor, ring twice'), findsOneWidget);
      expect(find.text('As soon as possible'), findsOneWidget);
      await tapOn(tester, find.text('Open in Maps'));
      expect(app.opened.last, startsWith('geo:40.9869,29.0254'));
    },
  );

  testWidgets('a food order: Call, WhatsApp, the map and Copy address', (
    tester,
  ) async {
    final app = await _open(
      tester,
      '/food-orders/48',
      appId: FakeOwnerApi.foodId,
      height: 1600,
    );
    expect(find.text('Customer'), findsOneWidget);
    await tapOn(tester, find.text('WhatsApp'));
    expect(app.opened.last, 'whatsapp://send?phone=905320000000');
    await tapOn(tester, find.text('Open in Maps'));
    expect(app.opened.last, startsWith('geo:41.0422,29.0083'));
    await tapOn(tester, find.text('Copy address'));
    expect(copied.last, 'Moda Cd. 41, flat 6');
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'a marketplace order: the customer, where, the payment and its lines',
    (tester) async {
      final app = await _open(
        tester,
        '/market/orders/42',
        appId: FakeOwnerApi.marketId,
        height: 1600,
      );
      expect(find.text('Leave it with the doorman'), findsNothing);
      expect(
        find.text('“${isolate('Leave it with the doorman')}”'),
        findsOneWidget,
      );
      expect(
        find.text(isolate('Bağdat Cd. 210, Caddebostan, Flat 6')),
        findsOneWidget,
      );
      expect(find.text('Delivery'), findsWidgets);
      expect(find.text('Card · Paid'), findsOneWidget);
      await tapOn(tester, find.text('Call').first);
      expect(app.opened.last, 'tel:+905346000002');
    },
  );

  testWidgets(
    'a shipment: the sender with their phone, the package, both places',
    (tester) async {
      final app = await _open(
        tester,
        '/shipments/2028',
        appId: FakeOwnerApi.deliveryId,
        height: 1800,
      );
      expect(find.text('Sender'), findsOneWidget);
      expect(find.text('Small · Documents'), findsOneWidget);
      expect(find.text('Service: ${isolate('Same day')}'), findsOneWidget);
      await tapOn(tester, find.text('Call').first);
      expect(app.opened.last, 'tel:+905324445566');
      await tapOn(tester, find.text('Open in Maps').last);
      expect(app.opened.last, startsWith('geo:41.0151,29.0266'));
    },
  );

  testWidgets(
    'a ride: the rider with Call and WhatsApp, the pickup on the map',
    (tester) async {
      final app = await _open(
        tester,
        '/rides/551',
        appId: FakeOwnerApi.ridesId,
        height: 1400,
      );
      await tapOn(tester, find.text('WhatsApp'));
      expect(app.opened.last, 'whatsapp://send?phone=905357000001');
      await tapOn(tester, find.text('Open in Maps'));
      expect(app.opened.last, startsWith('geo:41.037,28.9857'));
    },
  );

  for (final (lang, dark) in [
    ('en', false),
    ('en', true),
    ('ar', false),
    ('ar', true),
  ]) {
    final brightness = dark ? Brightness.dark : Brightness.light;
    final tone = dark ? 'dark' : 'light';
    for (final (name, location, appId, height) in [
      ('gift-order', '/orders/2051', FakeOwnerApi.flowersId, 2300.0),
      ('orders-list', '/orders', FakeOwnerApi.flowersId, 860.0),
      ('food-order', '/food-orders/48', FakeOwnerApi.foodId, 1500.0),
    ]) {
      testWidgets('2x picture: $name, $lang, $tone', (tester) async {
        await _open(
          tester,
          location,
          appId: appId,
          language: lang,
          brightness: brightness,
          height: height,
        );
        await _shot(tester, '$name-$lang-$tone');
        expect(tester.takeException(), isNull);
      });
    }
  }

  test('the order reads the contract, an older server\'s too', () {
    final m = {'amount_cents': 100, 'currency': 'EGP', 'formatted': 'E£1.00'};
    final order = Order.fromJson({
      'id': 7,
      'number': '7',
      'status': 'processing',
      'total': m,
      'lines': [
        {
          'product_id': 1,
          'name': 'Roses',
          'quantity': 1,
          'unit': m,
          'total': m,
          'options': ['Wrap: Kraft'],
          'flash_sale': {'id': 2, 'title': null, 'percent': 10},
        },
        {
          'product_id': 2,
          'name': 'Card',
          'quantity': 1,
          'unit': m,
          'addon_of': 1,
        },
      ],
      'customer': {'name': 'Omar', 'phone': null, 'source': 'sender'},
      'deliver_to': {
        'person': 'recipient',
        'name': 'Salma',
        'phone': '+20 1',
        'address': '14 Brazil St',
        'city': 'Cairo',
        'country': 'EG',
        'lat': 30.1,
        'lng': 31.2,
        'notes': null,
      },
      'amounts': {
        'subtotal': m,
        'discount': {'code': null, 'amount': m},
        'points': {'used': 50, 'amount': m},
        'shipping': null,
        'tax': {'label': 'VAT', 'included': true, 'amount': m},
        'total': m,
      },
      'delivery': {
        'date': '2026-11-17',
        'slot': {'id': 'a', 'start': '10:00', 'end': '13:00'},
        'anonymous': true,
        'signed_by': null,
        'breakdown': [
          {'label': 'Base', 'amount': m},
        ],
      },
      'pay_outside': {
        'method': 'bank_transfer',
        'name': 'Bank transfer',
        'due_at': '2026-11-20T00:00:00Z',
      },
      'created_at': '2026-11-16T10:00:00Z',
      'next_statuses': ['completed'],
    });
    expect(order.lines.last.addonOf, 1);
    expect(order.lines.first.flashSale?.percent, 10);
    expect(order.customer?.source, 'sender');
    expect(order.deliverTo?.isRecipient, isTrue);
    expect(order.deliverTo?.line, '14 Brazil St, Cairo');
    expect(order.amounts?.pointsUsed, 50);
    expect(order.amounts?.taxIncluded, isTrue);
    expect(order.delivery?.slotLabel, '10:00–13:00');
    expect(order.delivery?.hasCard, isTrue);
    expect(order.payOutside?.method, 'bank_transfer');
    // An older server: none of these, nothing breaks.
    final old = Order.fromJson({
      'id': 1,
      'number': '1',
      'status': 'processing',
      'total': m,
      'lines': [
        {'name': 'Tea', 'quantity': 1, 'unit': m},
      ],
      'customer': {'name': 'Mona'},
      'created_at': '2026-11-16T10:00:00Z',
      'next_statuses': [],
    });
    expect(old.deliverTo, isNull);
    expect(old.amounts, isNull);
    expect(old.lines.single.productId, isNull);
    expect(old.buyerName, 'Mona');
  });

  test('maps and WhatsApp open the phone\'s own apps, no web address', () {
    expect(
      mapsUrl(
        TargetPlatform.android,
        query: '14 Brazil St',
        lat: 30.06,
        lng: 31.22,
      ),
      'geo:30.06,31.22?q=30.06,31.22(14%20Brazil%20St)',
    );
    expect(
      mapsUrl(TargetPlatform.android, query: 'Moda Cd. 12'),
      'geo:0,0?q=Moda%20Cd.%2012',
    );
    expect(
      mapsUrl(TargetPlatform.iOS, query: 'Zamalek', lat: 30.06, lng: 31.22),
      'maps:?ll=30.06,31.22&q=Zamalek',
    );
    expect(mapsUrl(TargetPlatform.iOS, query: 'Zamalek'), 'maps:?q=Zamalek');
    expect(
      whatsappUrl('+20 100 765 4321'),
      'whatsapp://send?phone=201007654321',
    );
    expect(telUrl('+90 532 000 00 00'), 'tel:+905320000000');
  });
}
