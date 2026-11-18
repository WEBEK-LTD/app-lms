import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/modules/store/widgets/product_widgets.dart';

import '../screenshots/support/leqaa.dart';
import '../screenshots/support/shot.dart' show loadAppFonts;
import '../screenshots/support/studio_demo.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 193 The owner (18 November), on Kech Flora, made from Leqaa's Signature
/// template: "not all the products show" on the products page, and "the
/// all-products page feels disorganised". A shop with more products than
/// one page holds (45, served 20 at a time as the hosted API does), names
/// of one and two lines, some on sale: on the Bouquets tab (the shop under
/// Leqaa's page) a customer scrolling down, by drags or flings, on a tall
/// and a small phone, reaches every product, the last one too; and each
/// row's cards are the same height, with their prices level.
void main() {
  setUpAll(loadAppFonts);

  final configs = [
    for (final look in ['a', 'b'])
      for (final size in const [Size(390, 844), Size(320, 568)])
        for (final fling in [false, true]) (look, size, fling),
  ];

  for (final (look, size, fling) in configs) {
    testWidgets('look $look, ${size.width.toInt()}x${size.height.toInt()}, '
        '${fling ? 'flings' : 'drags'}: every product, rows in line', (
      tester,
    ) async {
      tester.view
        ..devicePixelRatio = 3
        ..physicalSize = size * 3;
      addTearDown(tester.view.reset);
      final previous = FlutterError.onError;
      FlutterError.onError = (details) {
        if (details.exceptionAsString().contains('A RenderFlex overflowed')) {
          return;
        }
        previous?.call(details);
      };
      addTearDown(() => FlutterError.onError = previous);

      final demo = StudioDemo.signature('flowers', look);
      final api = leqaaStudioApi(look: demo)
        ..shopPerPage = 20
        ..shopProducts = [
          for (var id = 1; id <= 45; id++)
            {
              ...productSummaryJson(
                id: 1000 + id,
                name: id.isEven
                    ? 'Bouquet $id'
                    : 'Bouquet $id of garden roses and white lilies',
              ),
              if (id % 3 == 0)
                'price': {
                  'amount': '90.00',
                  'regular_amount': '120.00',
                  'regular_formatted': 'MAD 120.00',
                  'currency': 'MAD',
                  'formatted': 'MAD 90.00',
                  'on_sale': true,
                  'range': false,
                },
              // A flash sale with its countdown under the price.
              if (id % 3 == 0)
                'sale': {
                  'was': '120.00',
                  'was_formatted': 'MAD 120.00',
                  'now': '90.00',
                  'now_formatted': 'MAD 90.00',
                  'percent_off': 25,
                  'starts_at': null,
                  'ends_at': DateTime.now()
                      .add(const Duration(hours: 3))
                      .toUtc()
                      .toIso8601String(),
                  'remaining': 4,
                  'total': 12,
                  'flash_sale_id': 7,
                },
            },
        ];
      final app = TestApp(
        api: api,
        appType: AppType.store,
        signedIn: true,
        preferences: const {'settings.theme_mode': 'light'},
      );
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      await tester.tap(
        find
            .descendant(
              of: find.byType(AppNavBar),
              matching: find.byType(InkWell),
            )
            .at(1),
      );
      await TestApp.settle(tester, 30);
      expect(api.shopPages, contains(1));

      final last = find.text('Bouquet 45 of garden roses and white lilies');
      final from = Offset(size.width / 2, size.height * 0.6);
      for (var i = 0; i < 80 && last.evaluate().isEmpty; i++) {
        if (fling) {
          await tester.flingFrom(from, Offset(0, -size.height * 0.5), 2500);
          await tester.pump();
          await tester.pump(const Duration(seconds: 2));
        } else {
          await tester.dragFrom(from, Offset(0, -size.height * 0.45));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 600));
        }
      }
      expect(api.shopPages, containsAll([1, 2, 3]));
      expect(last, findsOneWidget, reason: 'the shop\'s last product');

      // The cards built: those side by side the same height, their prices
      // level.
      final cards = find
          .byType(ProductCard, skipOffstage: false)
          .evaluate()
          .toList();
      expect(cards.length, greaterThan(1));
      final rects = [
        for (final c in cards)
          tester.getRect(find.byWidget(c.widget, skipOffstage: false)),
      ];
      var pairs = 0;
      for (var i = 0; i < rects.length; i++) {
        for (var j = i + 1; j < rects.length; j++) {
          if ((rects[i].top - rects[j].top).abs() > 0.5) continue;
          pairs++;
          expect(
            rects[i].height,
            moreOrLessEquals(rects[j].height, epsilon: 0.5),
            reason: 'cards in a row the same height',
          );
          final prices = [
            for (final k in [i, j])
              tester
                  .getRect(
                    find
                        .descendant(
                          of: find.byWidget(
                            cards[k].widget,
                            skipOffstage: false,
                          ),
                          matching: find.byType(
                            ProductPriceLabel,
                            skipOffstage: false,
                          ),
                        )
                        .first,
                  )
                  .top,
          ];
          expect(
            prices[0],
            moreOrLessEquals(prices[1], epsilon: 0.5),
            reason: 'prices level across a row',
          );
        }
      }
      expect(pairs, greaterThan(0));

      await tester.pumpWidget(const SizedBox());
      app.container.dispose();
      await TestApp.settle(tester, 2);
    });
  }
}
