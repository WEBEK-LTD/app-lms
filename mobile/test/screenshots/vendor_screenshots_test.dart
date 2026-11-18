/// 115.70 The vendor app's live orders (08), picking (09) and stock (10) on
/// Zad's demo, to put beside the approved designs
/// (docs/design/2026-11-18-marketplace/png). Skipped unless run with a
/// folder for the pictures:
///
///   flutter test test/screenshots/vendor_screenshots_test.dart \
///     --dart-define=YALLAPP_SHOTS_OUT=/path/out
///
/// Each screen in English and Arabic, light and dark, at the designs' size
/// (390 x 844 points) and twice the pixels, with the app's bundled fonts.
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/test_app.dart';
import '../support/vendor_fixtures.dart';
import 'support/shot.dart';
import 'support/zad.dart';

const _out = String.fromEnvironment('YALLAPP_SHOTS_OUT');

void main() {
  final enabled = _out.isNotEmpty;

  setUpAll(() async {
    if (enabled) await loadAppFonts();
  });

  Future<void> shoot(
    WidgetTester tester, {
    required String name,
    required String lang,
    required bool dark,
    required void Function(TestApp app) setUp,
    String? path,
    Future<void> Function()? then,
  }) async {
    usePhone(tester, size: const Size(390, 844));
    await seedDesignPictures(tester);
    final api = zadVendorApi(
      role: name.startsWith('09') ? 'picker' : 'manager',
    );
    final app = zadVendorApp(
      api,
      lang: lang,
      dark: dark,
      wrap: (w) => withStatusBar(w, lightIcons: ValueNotifier(true)),
    );
    setUp(app);
    await app.pump(tester);
    await TestApp.settle(tester, 30);
    if (path != null) {
      app.container.read(appRouterProvider).push(path);
      await TestApp.settle(tester, 30);
    }
    if (then != null) await then();
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    final boundary =
        tester.renderObject(find.byKey(shotKey)) as RenderRepaintBoundary;
    await tester.runAsync(() async {
      final image = await boundary.toImage(pixelRatio: 2);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      Directory(_out).createSync(recursive: true);
      File('$_out/$name-$lang-${dark ? 'dark' : 'light'}.png')
          .writeAsBytesSync(Uint8List.view(data!.buffer));
    });
  }

  for (final lang in ['en', 'ar']) {
    for (final dark in [false, true]) {
      final variant = '$lang ${dark ? 'dark' : 'light'}';
      testWidgets('08 live orders, $variant', skip: !enabled, (tester) async {
        await shoot(
          tester,
          name: '08-vendor-live-orders',
          lang: lang,
          dark: dark,
          setUp: (app) {
            app.api.vendorOrders['new'] = zadNewOrders();
            app.api.vendorOrders['active'] = [
              for (var i = 0; i < 5; i++)
                zadOrder(id: 4810 + i, status: 'picking', lines: const []),
              zadOrder(id: 4809, status: 'ready', lines: const []),
            ];
            app.api.vendorOrders['scheduled'] = [
              for (var i = 0; i < 3; i++)
                zadOrder(id: 4800 + i, status: 'scheduled', lines: const []),
            ];
          },
        );
      });

      testWidgets('09 picking, $variant', skip: !enabled, (tester) async {
        await shoot(
          tester,
          name: '09-vendor-picking',
          lang: lang,
          dark: dark,
          setUp: (app) => app.api.vendorOrders['active'] = [zadPickOrder()],
          path: Paths.vendorPick(4821),
          then: () async {
            for (final k in ['7', '4', '0']) {
              await tester.tap(find.byKey(ValueKey('vendor-key-31-$k')));
              await tester.pump();
            }
          },
        );
      });

      testWidgets('10 stock, $variant', skip: !enabled, (tester) async {
        await shoot(
          tester,
          name: '10-vendor-stock',
          lang: lang,
          dark: dark,
          setUp: (app) {
            app.api.vendorProducts.addAll(zadStock());
            app.api.vendorOrders['new'] = zadNewOrders();
          },
          path: Paths.vendorStock,
          then: () async {
            await tester.tap(
              find.byKey(const ValueKey('vendor-stock-price-1')),
            );
            await TestApp.settle(tester, 10);
            await tester.enterText(
              find.byKey(const ValueKey('vendor-price-new')),
              '32.00',
            );
            await tester.tap(find.byKey(const ValueKey('vendor-price-offer')));
            await tester.pump();
            FocusManager.instance.primaryFocus?.unfocus();
            await TestApp.settle(tester, 10);
            await tester.tap(find.byKey(const ValueKey('vendor-stock-scan')));
            await TestApp.settle(tester, 10);
            await tester.enterText(
              find.byKey(const ValueKey('vendor-scan-code')),
              '6221034500127',
            );
            await tester.tap(find.byKey(const ValueKey('vendor-scan-find')));
            await TestApp.settle(tester, 20);
          },
        );
      });
    }
  }
}
