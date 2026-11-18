import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 131 Where an order goes in the standard checkout too: the country and
/// the city when the shop delivers to some places only, and the place on
/// the map when shipping is priced by distance, pinned on a full-screen map
/// (searched by address, or the phone's own position as one choice), the
/// shop measuring the distance to the pin. A shop without shipping areas
/// keeps its checkout as it was.
class _Locator implements Locator {
  int reads = 0;

  @override
  Future<LocateResult> current() async {
    reads++;
    return const LocateResult.found((lat: 41.0369, lng: 28.9850, accuracy: 8));
  }
}

void main() {
  final cart = jsonEncode([
    const CartItem(
      productId: 21,
      quantity: 1,
      name: 'Sunflower Basket',
      price: '₺200.00',
    ).toJson(),
  ]);

  Map<String, dynamic> areas() => {
    'mode': 'city',
    'countries': [
      {
        'code': 'TR',
        'names': {'en': 'Türkiye', 'ar': 'تركيا', 'tr': 'Türkiye'},
        'cities': ['İstanbul', 'Ankara'],
      },
      {
        'code': 'EG',
        'names': {'en': 'Egypt', 'ar': 'مصر', 'tr': 'Mısır'},
        'cities': null,
      },
    ],
    'needs_location': false,
    'charged': true,
  };

  Map<String, dynamic> distance({bool tiles = true}) => {
    'mode': 'distance',
    'countries': <Object>[],
    'needs_location': true,
    'charged': true,
    'max_km': 40,
    'map': {
      'tiles_url': tiles ? 'https://tiles.example.com/{z}/{x}/{y}.png' : null,
      'attribution': tiles ? '© OpenStreetMap' : null,
      'search': tiles,
      'routes': false,
    },
    'center': {'lat': 41.0082, 'lng': 28.9784},
  };

  FakeApi api(Map<String, dynamic>? shipping) =>
      FakeApi(
          config: {
            ...configJson(lms: null, orders: true, languages: languagesJson()),
            'store': {
              ...storeConfigJson(deliveryDate: false, giftMessage: false),
              'shipping': ?shipping,
            },
          },
        )
        ..taxiPlaces = [
          {
            'id': 'moda',
            'name': 'Moda Caddesi 12',
            'address': 'Kadıköy, İstanbul',
            'lat': 40.9862,
            'lng': 29.0256,
          },
        ];

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    bool dark = false,
    String language = 'en',
    Locator? locator,
  }) async {
    tester.view
      ..physicalSize = const Size(1080, 4800)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      overrides: [locatorProvider.overrideWithValue(locator ?? _Locator())],
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

  Future<void> checkout(WidgetTester tester) async {
    await tester.tap(find.textContaining(RegExp(r'^(Checkout|الدفع)$')).last);
    await TestApp.settle(tester);
  }

  testWidgets('a shop without shipping areas keeps its checkout', (
    tester,
  ) async {
    final fake = api(null);
    await open(tester, fake);
    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('delivery-place')), findsNothing);
    await checkout(tester);
    expect(fake.count('createStoreCheckoutLink'), 1);
    expect(fake.lastPlace, isNull);
  });

  testWidgets('the standard checkout asks where it goes among the areas', (
    tester,
  ) async {
    final fake = api(areas());
    await open(tester, fake);
    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('delivery-place')), findsOneWidget);
    expect(find.text('Choose where it goes.'), findsOneWidget);
    await checkout(tester);
    expect(fake.count('createStoreCheckoutLink'), 0);

    await tester.tap(find.byKey(const ValueKey('gift-country')));
    await TestApp.settle(tester);
    await tester.tap(find.text('Türkiye').last);
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('gift-city-TR')));
    await TestApp.settle(tester);
    await tester.tap(find.text('İstanbul').last);
    await TestApp.settle(tester);
    expect(find.text('Choose where it goes.'), findsNothing);
    // The quote prices it there.
    expect(fake.lastQuotePlace?.city, 'İstanbul');

    await checkout(tester);
    expect(fake.count('createStoreCheckoutLink'), 1);
    expect((fake.lastPlace?.country, fake.lastPlace?.city), ('TR', 'İstanbul'));
    // Not a gift: no recipient goes with it.
    expect(fake.lastGift?.recipient, isNull);
  });

  testWidgets('a country with all its cities takes the city as typed', (
    tester,
  ) async {
    final fake = api(areas());
    await open(tester, fake);
    await tester.tap(find.byKey(const ValueKey('gift-country')));
    await TestApp.settle(tester);
    await tester.tap(find.text('Egypt').last);
    await TestApp.settle(tester);
    await tester.enterText(
      find.byKey(const ValueKey('gift-recipient-city')),
      'Alexandria',
    );
    await TestApp.settle(tester);
    await checkout(tester);
    expect(
      (fake.lastPlace?.country, fake.lastPlace?.city),
      ('EG', 'Alexandria'),
    );
  });

  for (final (mode, dark, arabic) in [
    ('light', false, false),
    ('dark', true, false),
    ('rtl', false, true),
  ]) {
    testWidgets('priced by distance, the place is pinned on the map, $mode', (
      tester,
    ) async {
      final fake = api(distance());
      final locator = _Locator();
      await open(
        tester,
        fake,
        dark: dark,
        language: arabic ? 'ar' : 'en',
        locator: locator,
      );
      expect(tester.takeException(), isNull);
      final tile = find.byKey(const ValueKey('gift-location'));
      expect(tile, findsOneWidget);
      if (!arabic) {
        expect(find.text('Pin the delivery place on the map'), findsOneWidget);
        expect(find.text('Pin where it goes on the map.'), findsOneWidget);
      }

      await tester.tap(tile);
      await TestApp.settle(tester);
      final map = find.byKey(const ValueKey('delivery-pin-map'));
      expect(map, findsOneWidget);
      expect(find.byKey(const ValueKey('delivery-pin')), findsOneWidget);
      expect(
        Directionality.of(tester.element(map)),
        arabic ? TextDirection.rtl : TextDirection.ltr,
      );
      expect(
        Theme.of(tester.element(map)).brightness,
        dark ? Brightness.dark : Brightness.light,
      );

      // Searched by address: the map moves to it.
      await tester.enterText(
        find.byKey(const ValueKey('delivery-pin-search')),
        'Moda',
      );
      await tester.pump(const Duration(milliseconds: 400));
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const ValueKey('delivery-pin-result-0')));
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const ValueKey('delivery-pin-confirm')));
      await TestApp.settle(tester);
      expect(map, findsNothing);
      expect(locator.reads, 0);
      if (!arabic) expect(find.text('Pinned on the map'), findsOneWidget);
      expect(fake.lastQuotePlace?.lat, closeTo(40.9862, 1e-6));

      await checkout(tester);
      expect(fake.count('createStoreCheckoutLink'), 1);
      expect(fake.lastPlace?.lat, closeTo(40.9862, 1e-6));
      expect(fake.lastPlace?.lng, closeTo(29.0256, 1e-6));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('"My location" is one choice on the map', (tester) async {
    final fake = api(distance());
    final locator = _Locator();
    await open(tester, fake, locator: locator);
    await tester.tap(find.byKey(const ValueKey('gift-location')));
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('delivery-pin-here')));
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('delivery-pin-confirm')));
    await TestApp.settle(tester);
    expect(locator.reads, 1);
    await checkout(tester);
    expect(fake.lastPlace?.lat, closeTo(41.0369, 1e-6));
  });

  testWidgets('without the map, the phone’s position pins it', (tester) async {
    final fake = api(distance(tiles: false));
    final locator = _Locator();
    await open(tester, fake, locator: locator);
    // 168 Said first: no map, so where the phone is; a step back takes nothing.
    await tester.tap(find.byKey(const ValueKey('gift-location')));
    await TestApp.settle(tester);
    expect(find.text('This shop has no map yet'), findsOneWidget);
    expect(find.textContaining('where your phone is now'), findsOneWidget);
    expect(locator.reads, 0);
    await tester.tap(find.text('Cancel'));
    await TestApp.settle(tester);
    expect(locator.reads, 0);
    await tester.tap(find.byKey(const ValueKey('gift-location')));
    await TestApp.settle(tester);
    await tester.tap(find.text('Use where I am'));
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('delivery-pin-map')), findsNothing);
    expect(locator.reads, 1);
    await checkout(tester);
    expect(fake.lastPlace?.lng, closeTo(28.9850, 1e-6));
  });
}
