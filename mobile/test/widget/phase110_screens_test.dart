import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/l10n/app_localizations_ar.dart';
import 'package:yallapp/modules/lms/lesson/content/html_content.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/widgets/product_widgets.dart';
import 'package:yallapp/core/api/models/models.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase104_test.dart' show typeInto;
import 'store_test.dart' show cartPrefs;

/// 110 The look of the app's screens: one kind of back button, the cart's
/// total on its bar, an order's status and line prices, empty lists that
/// lead somewhere, a pinned Donate button, a service picked for a parcel,
/// titles in their text's direction and Arabic plurals.

void _phone(WidgetTester tester, [Size size = const Size(390, 844)]) {
  tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
}

Future<TestApp> _open(
  WidgetTester tester,
  FakeApi api, {
  required AppType appType,
  String language = 'en',
  Map<String, Object> preferences = const {},
  String? go,
  String? push,
}) async {
  final app = TestApp(
    api: api,
    appType: appType,
    signedIn: true,
    preferences: {'settings.language': language, ...preferences},
  );
  await app.pump(tester);
  final router = app.container.read(appRouterProvider);
  if (go != null) {
    router.go(go);
    await TestApp.settle(tester, 20);
  }
  if (push != null) {
    router.push(push);
    await TestApp.settle(tester, 20);
  }
  return app;
}

String _location(TestApp app) => app.container
    .read(appRouterProvider)
    .routerDelegate
    .currentConfiguration
    .last
    .matchedLocation;

FakeApi _storeApi() => FakeApi(
  config: {...configJson(lms: null, orders: true), 'store': storeConfigJson()},
);

void main() {
  group('110 one kind of back button', () {
    for (final (name, appType, config, path) in [
      ('food order', AppType.food, 'food', Paths.foodOrder(7)),
      ('shipment', AppType.delivery, 'delivery', Paths.shipment(1)),
    ]) {
      testWidgets('a $name screen has the rounded back button', (tester) async {
        _phone(tester);
        final api = FakeApi(
          config: {
            ...configJson(lms: null),
            config: config == 'food' ? foodConfigJson() : deliveryConfigJson(),
          },
        );
        await _open(tester, api, appType: appType, push: path);
        expect(find.byType(AppBackButton), findsOneWidget);
        expect(find.byType(BackButton), findsNothing);
      });
    }
  });

  testWidgets("110 the cart's bar shows what the order comes to", (
    tester,
  ) async {
    _phone(tester);
    final api = _storeApi();
    await _open(
      tester,
      api,
      appType: AppType.store,
      preferences: {CartController.storageKey: cartPrefs()},
      go: Paths.cart,
    );
    final bar = find.byKey(const ValueKey('cart-bar-total'));
    expect(bar, findsOneWidget);
    expect(
      find.descendant(of: bar, matching: find.text('₺400.00')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: bar, matching: find.text('Subtotal')),
      findsOneWidget,
    );
    // Beside the Checkout button, in the bar at the bottom.
    final button = tester.getRect(find.text('Checkout'));
    expect(tester.getRect(bar).center.dy, closeTo(button.center.dy, 12));

    // With the shop's total, the bar says Total.
    api.cartQuote = {...cartQuoteJson(), 'total': '₺430.00', 'tax': '₺30.00'};
    await tester.drag(find.byType(Scrollable).first, const Offset(0, 300));
    await TestApp.settle(tester);
    expect(
      find.descendant(of: bar, matching: find.text('₺430.00')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: bar, matching: find.text('Total')),
      findsOneWidget,
    );
  });

  testWidgets("110 an order shows its status and each line's price", (
    tester,
  ) async {
    _phone(tester);
    final api = _storeApi()
      ..order = {
        ...orderJson(),
        'status': 'processing',
        'status_label': 'Processing',
        'items': [
          {'name': 'Rose Bouquet', 'product_id': 21, 'total': '₺1,290.00'},
          {
            'name': 'Fig Candle',
            'product_id': 25,
            'quantity': 2,
            'total': '₺1,120.00',
          },
          // An older server: no price for the line.
          {'name': 'Card', 'product_id': 26},
        ],
      };
    await _open(tester, api, appType: AppType.store, push: Paths.order(1042));
    final chip = find.byKey(const ValueKey('order-status'));
    expect(chip, findsOneWidget);
    expect(
      find.descendant(of: chip, matching: find.text('Processing')),
      findsOneWidget,
    );
    expect(find.text('₺1,290.00'), findsOneWidget);
    expect(find.text('₺1,120.00'), findsOneWidget);
    // Each price on its line's row, at the end.
    expect(
      tester.getRect(find.text('₺1,290.00')).center.dy,
      closeTo(tester.getRect(find.text('Rose Bouquet')).center.dy, 4),
    );
    expect(find.text('Card'), findsOneWidget);
  });

  test('110 order lines read their price, null on older servers', () {
    expect(
      OrderLine.fromJson({'name': 'A', 'total': '₺10.00'}).total,
      '₺10.00',
    );
    expect(OrderLine.fromJson({'name': 'A'}).total, isNull);
  });

  group('110 empty lists lead somewhere', () {
    testWidgets('no orders in a shop: Start shopping opens the shop', (
      tester,
    ) async {
      _phone(tester);
      final api = _storeApi()..orders = [];
      final app = await _open(
        tester,
        api,
        appType: AppType.store,
        push: Paths.orders,
      );
      await tester.tap(find.text('Start shopping'));
      await TestApp.settle(tester);
      expect(_location(app), Paths.shop);
    });

    testWidgets('no orders in an academy: Browse courses', (tester) async {
      _phone(tester);
      final api = FakeApi(config: configJson(orders: true))..orders = [];
      final app = await _open(
        tester,
        api,
        appType: AppType.lms,
        push: Paths.orders,
      );
      await tester.tap(find.text('Browse courses'));
      await TestApp.settle(tester);
      expect(_location(app), Paths.courses);
    });

    testWidgets('no notifications: Go home', (tester) async {
      _phone(tester);
      final api = FakeApi(config: configJson())..notifications = [];
      await _open(tester, api, appType: AppType.lms, push: Paths.notifications);
      expect(find.text('No notifications yet'), findsOneWidget);
      await tester.tap(find.text('Go home'));
      await TestApp.settle(tester);
      expect(find.text('No notifications yet'), findsNothing);
    });

    testWidgets('no tickets: Browse events', (tester) async {
      _phone(tester);
      final api = FakeApi(
        config: {...configJson(lms: null), 'events': eventsConfigJson()},
      )..tickets = [];
      final app = await _open(
        tester,
        api,
        appType: AppType.events,
        go: Paths.tickets,
      );
      await tester.tap(find.text('Browse events'));
      await TestApp.settle(tester);
      expect(_location(app), Paths.events);
    });

    testWidgets('no saved articles: Browse articles', (tester) async {
      _phone(tester);
      final api = FakeApi(
        config: {...configJson(lms: null), 'news': newsConfigJson()},
      );
      final app = await _open(
        tester,
        api,
        appType: AppType.news,
        go: Paths.saved,
      );
      await tester.tap(find.text('Browse articles'));
      await TestApp.settle(tester);
      expect(_location(app), Paths.articles);
    });
  });

  testWidgets('110 the Donate button stays at the bottom of a campaign', (
    tester,
  ) async {
    _phone(tester);
    final api = FakeApi(
      config: {...configJson(lms: null), 'donations': donationsConfigJson()},
    );
    await _open(
      tester,
      api,
      appType: AppType.donations,
      push: Paths.campaign(1),
    );
    final button = find.byKey(const ValueKey('donate-button'));
    expect(
      find.ancestor(of: button, matching: find.byType(BottomActionBar)),
      findsOneWidget,
    );
    final before = tester.getRect(button);
    expect(before.bottom, lessThanOrEqualTo(844));
    // The page scrolls under it; the amount chosen stays.
    await tester.tap(find.byType(PillChip).at(2));
    await tester.pump();
    final label = tester.widget<PrimaryButton>(button).label;
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -600));
    await TestApp.settle(tester);
    expect(tester.getRect(button), before);
    expect(tester.widget<PrimaryButton>(button).label, label);
  });

  testWidgets('110 Send parcel picks the first service', (tester) async {
    _phone(tester, const Size(390, 1400));
    final api = FakeApi(
      config: {...configJson(lms: null), 'delivery': deliveryConfigJson()},
    );
    await _open(tester, api, appType: AppType.delivery);
    // The first service shows as chosen, the second doesn't.
    bool chosen(String name) => tester
        .widgetList<Semantics>(
          find.ancestor(of: find.text(name), matching: find.byType(Semantics)),
        )
        .firstWhere((w) => w.properties.selected != null)
        .properties
        .selected!;
    expect(chosen('Same-day delivery'), isTrue);
    expect(chosen('Express'), isFalse);
    // And the price asked for is the first service's.
    await typeInto(tester, 'pickup-address', '12 Abbas El Akkad St');
    await typeInto(tester, 'dropoff-address', '9 Road 233, Maadi');
    await tester.pump(const Duration(milliseconds: 700));
    await TestApp.settle(tester);
    expect(api.quoteRequests, isNotEmpty);
    expect(api.quoteRequests.last.serviceId, 1);
  });

  testWidgets("110 an English lesson's title in an Arabic app reads left to "
      'right, like its text', (tester) async {
    _phone(tester);
    final api = FakeApi(
      config: configJson(
        languages: {
          'default': 'en',
          'available': ['en', 'ar'],
        },
      ),
    );
    await _open(
      tester,
      api,
      appType: AppType.lms,
      language: 'ar',
      push: '/lesson/108',
    );
    final title = find.descendant(
      of: find.byType(ContentTitle),
      matching: find.text('Writing your first function'),
    );
    expect(title, findsOneWidget);
    expect(Directionality.of(tester.element(title)), TextDirection.ltr);
  });

  test('110 Arabic counts take their plural', () {
    final ar = AppLocalizationsAr();
    expect(ar.lessonsDone(11, 18), '11 من 18 درسًا');
    expect(ar.lessonsDone(3, 5), '3 من 5 دروس');
    expect(ar.lessonsDone(1, 2), '1 من درسين');
    expect(ar.lessonsDone(40, 100), '40 من 100 درس');
    expect(ar.daysAgo(3), 'قبل 3 أيام');
    expect(ar.daysAgo(12), 'قبل 12 يومًا');
    expect(ar.daysAgo(2), 'قبل يومين');
    expect(ar.foodEta(5), 'نحو 5 دقائق');
    expect(ar.foodEta(25), 'نحو 25 دقيقة');
    expect(ar.rateStar(1), 'نجمة واحدة');
    expect(ar.attemptsUsed(1, 3), 'استُخدمت 1 من 3 محاولات');
    expect(ar.onSale, 'تخفيضات');
  });

  testWidgets('110 a row of categories is as tall as its names need', (
    tester,
  ) async {
    late double one;
    late double two;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            one = categoryRowHeight(context, [
              const ProductCategory(id: 1, name: 'Roses', count: 1),
              const ProductCategory(id: 2, name: 'Gifts', count: 1),
            ]);
            two = categoryRowHeight(context, [
              const ProductCategory(id: 1, name: 'Roses', count: 1),
              const ProductCategory(
                id: 2,
                name: 'Birthday gifts and surprises',
                count: 1,
              ),
            ]);
            return const SizedBox();
          },
        ),
      ),
    );
    // Picture, one line of 12 point text: no room for a second, unused one.
    expect(one, lessThan(64 + 6 + 24 + 6));
    expect(two, greaterThan(one));
    expect(two, lessThanOrEqualTo(76 + 36 + 6));
  });
}
