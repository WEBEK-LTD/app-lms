/// 115.40 The supermarket's screens as built, beside the approved designs
/// of 18 November 2026 (docs/design/2026-11-18-marketplace/png): Zad Market
/// in Zad's look A, in English and Arabic, by day and by night, at the
/// designs' 390 × 844 points and twice the pixels. Skipped unless run with
/// a folder for the pictures:
///
///   flutter test test/screenshots/market_store_screenshots_test.dart \
///     --dart-define=YALLAPP_SHOTS_OUT=../docs/qa/2026-11-18-market-app/app
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/zad_market_fixtures.dart';
import 'support/demo_api.dart';
import 'support/screens.dart';
import 'support/studio_demo.dart';

const _out = String.fromEnvironment('YALLAPP_SHOTS_OUT');

DemoApi _zad() {
  final api = zadStudioApi(
    look: StudioDemo.signature('multi-vendor', 'a'),
    primaryColor: '#1B644C',
  );
  api.config = {
    ...api.config,
    'market': {...api.config['market'] as Map, ...ZadMarket.config()},
  };
  api.marketProducts[3] = ZadMarket.products();
  api.productPageSize = 4;
  api.marketQuote = ZadMarket.quote();
  api.marketOrders[4821] = ZadMarket.picking();
  api.marketOrders[4822] = {...ZadMarket.onTheWay(), 'id': 4822};
  return api;
}

final _screens = <(String, String, Future<void> Function(WidgetTester))>[
  ('01-supermarket-home', Paths.marketVendor(ZadMarket.id), _none),
  ('02-department', Paths.marketDepartment(ZadMarket.id, '1'), _none),
  (
    '03-product-by-weight',
    Paths.marketProduct(ZadMarket.id, '41'),
    (tester) async {
      for (var i = 0; i < 2; i++) {
        await tester.tap(find.byKey(const ValueKey('market-weight-plus')));
        await tester.pump();
      }
    },
  ),
  ('04-cart', Paths.marketCheckout, _none),
  ('05a-order-picking', Paths.marketOrder(4821), _none),
  ('05b-order-on-the-way', Paths.marketOrder(4822), _none),
];

Future<void> _none(WidgetTester tester) async {}

void main() {
  setUpAll(() async {
    if (_out.isNotEmpty) await loadAppFonts();
  });

  for (final (name, location, after) in _screens) {
    for (final lang in ['en', 'ar']) {
      for (final dark in [false, true]) {
        final file = '$name-$lang-${dark ? 'dark' : 'light'}';
        testWidgets(file, skip: _out.isEmpty, (tester) async {
          debugDisableShadows = false;
          ZadMarket.arabic = lang == 'ar';
          addTearDown(() => ZadMarket.arabic = false);
          final shot = Shot(
            file,
            api: _zad,
            appName: 'Zad',
            appType: AppType.food,
            template: AppTemplate.bold,
            language: lang,
            dark: dark,
            location: location,
            preferences: const {'market_place': ZadMarket.place},
            size: const ui.Size(390, 844),
            // The product page as first opened, its cheese not in the cart yet.
            overrides: ZadMarket.overrides(basket: !name.startsWith('03')),
            designPictures: true,
            prepare: StudioDemo.signature('multi-vendor', 'a').prepare,
            mapTiles: name.startsWith('05b'),
            mapCenter: (lat: 30.0548, lng: 31.2195),
            shadows: true,
            after: (tester, router) => after(tester),
          );
          final app = await shot.render(tester);
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(shotKey),
          );
          await tester.runAsync(() async {
            final image = await boundary.toImage(pixelRatio: 2);
            final data = await image.toByteData(format: ui.ImageByteFormat.png);
            image.dispose();
            Directory(_out).createSync(recursive: true);
            File('$_out/$file.png')
                .writeAsBytesSync(Uint8List.view(data!.buffer));
          });
          await Shot.close(app, tester);
          debugDisableShadows = true;
        });
      }
    }
  }
}
