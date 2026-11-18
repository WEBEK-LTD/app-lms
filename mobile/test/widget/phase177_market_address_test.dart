import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart' show MarketFulfilment;
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/market/data/market_basket.dart';
import 'package:yallapp/modules/market/data/market_place.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../screenshots/support/studio_demo.dart';
import '../screenshots/support/zad.dart';
import '../support/test_app.dart';

/// 177 Delivery in the marketplace without the phone's position (docs/qa/
/// 2026-11-18-market-store, M10): "Choose your address" did nothing and
/// only "Use my location" set one, so a customer who refused it could only
/// pick up. It opens a choice now: the map's pin (with the map's address
/// search, where a typed street is found) or the phone's position; the
/// place pinned is named by the map, kept on the phone, and the quote asks
/// with its position, which the server measures the areas from (115.19).
void main() {
  setUpAll(loadAppFonts);

  for (final lang in ['en', 'ar']) {
    testWidgets('$lang at 1.3: the address pinned on the map, then quoted', (
      tester,
    ) async {
      tester.view
        ..physicalSize = const Size(360, 800) * 3
        ..devicePixelRatio = 3;
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      StudioDemo.language = lang;
      final api = zadStudioApi(look: StudioDemo.signature('multi-vendor', 'a'));
      final market = (api.config['market'] as Map).cast<String, dynamic>();
      api.config = {
        ...api.config,
        'market': {
          ...market,
          'map': {
            'tiles_url': 'https://tiles.example/{z}/{x}/{y}.png',
            'attribution': '© OpenStreetMap',
            'search': true,
            'routes': false,
          },
        },
      };
      api.taxiPlaces = [
        {
          'id': 'p1',
          'name': '9 Road 233',
          'address': '9 Road 233, Maadi, Cairo',
          'lat': 29.9602,
          'lng': 31.2569,
        },
      ];
      api.mapAddress = {
        'id': 'a1',
        'name': '9 Road 233',
        'address': '9 Road 233, Maadi, Cairo',
        'lat': 29.9602,
        'lng': 31.2569,
      };
      await StudioDemo.zad.prepare(tester);
      final app = TestApp(
        api: api,
        appType: AppType.food,
        signedIn: true,
        overrides: Zad.overrides,
        preferences: {'settings.language': lang},
      );
      await app.pump(tester);
      await TestApp.settle(tester, 30);
      final page = Zad.page(Zad.market.id);
      app.container
          .read(marketBasketProvider.notifier)
          .add(
            Zad.market,
            page.shelves.first.items.first,
            currency: 'EGP',
            decimals: 2,
          );
      app.container.read(appRouterProvider).go(Paths.marketCheckout);
      await TestApp.settle(tester, 30);
      expect(app.container.read(marketPlaceProvider), isNull);

      final choose = find.text(
        lang == 'ar' ? 'اختر عنوانك' : 'Choose your address',
      );
      expect(choose, findsOneWidget);
      await tester.tap(choose);
      await TestApp.settle(tester);
      await tester.tap(
        find.text(
          lang == 'ar'
              ? 'حدّد مكان التوصيل على الخريطة'
              : 'Pin the delivery place on the map',
        ),
      );
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('delivery-pin-map')), findsOneWidget);
      // A typed street, found by the map's search.
      await tester.enterText(
        find.byKey(const ValueKey('delivery-pin-search')),
        'Road 233',
      );
      await tester.pump(const Duration(milliseconds: 400));
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const ValueKey('delivery-pin-result-0')));
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const ValueKey('delivery-pin-confirm')));
      await TestApp.settle(tester, 30);

      final place = app.container.read(marketPlaceProvider)!;
      expect(place.address, '9 Road 233, Maadi, Cairo');
      expect(place.lat, closeTo(29.9602, 0.001));
      expect(find.text('9 Road 233, Maadi, Cairo'), findsOneWidget);
      final asked = api.marketQuotes.last;
      expect(asked.fulfilment, MarketFulfilment.delivery);
      expect(asked.lat, closeTo(29.9602, 0.001));
      expect(asked.lng, closeTo(31.2569, 0.001));
      expect(tester.takeException(), isNull);
    });
  }
}
