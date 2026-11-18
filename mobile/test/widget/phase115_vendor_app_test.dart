import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/vendor/screens/vendor_desk_screen.dart';
import 'package:yallapp/modules/vendor/screens/vendor_pick_screen.dart';
import 'package:yallapp/modules/vendor/widgets/vendor_widgets.dart';

import '../support/test_app.dart';
import '../support/vendor_fixtures.dart';

/// 115.70–115.72 The vendor app's live orders (08), picking (09) and stock
/// (10) as the owner approved them: a new order rings until someone acts
/// and is accepted with a ready-in time or turned down with the panel's
/// reasons; picking by aisle with each line's choice, the weight from a
/// keypad capped per D1, out of stock and a live substitute (D2), and Ready
/// off until every line is done or answered; stock searched or scanned, in
/// and out, and a price changed for new orders only. In English and Arabic
/// (right to left), light and dark, at text scale 1.3 on a 360 phone.
void main() {
  void phone(WidgetTester tester, {double scale = 1, double height = 1400}) {
    tester.view
      ..physicalSize = Size(360, height) * 2
      ..devicePixelRatio = 2;
    tester.platformDispatcher.textScaleFactorTestValue = scale;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  }

  Future<void> open(TestApp app, WidgetTester tester, String path) async {
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    if (path != Paths.vendorDesk) {
      app.container.read(appRouterProvider).push(path);
      await TestApp.settle(tester, 20);
    }
  }

  group('115.70 live orders (08)', () {
    testWidgets('a new order rings until someone acts, then stops', (
      tester,
    ) async {
      phone(tester);
      var rings = 0;
      final before = vendorRing;
      vendorRing = () async => rings++;
      addTearDown(() => vendorRing = before);
      final api = zadVendorApi();
      api.vendorOrders['new'] = zadNewOrders();
      await open(zadVendorApp(api), tester, Paths.vendorDesk);
      expect(find.text('Zad Market'), findsWidgets);
      expect(find.text('Hany · 1 min ago'), findsOneWidget);
      expect(find.text('Salma · just now'), findsOneWidget);
      expect(find.text('Zad Partner · Samir, Manager'), findsOneWidget);
      expect(find.text('2 new'), findsOneWidget);
      expect(find.text('RINGING'), findsOneWidget);
      // It keeps ringing while nobody answers.
      final first = rings;
      await tester.pump(vendorRingEvery * 3);
      expect(rings, greaterThanOrEqualTo(first + 3));
      // The sound switch silences it.
      await tester.tap(find.byKey(const ValueKey('vendor-sound')));
      await tester.pump();
      final silent = rings;
      await tester.pump(vendorRingEvery * 2);
      expect(rings, silent);
      await tester.tap(find.byKey(const ValueKey('vendor-sound')));
      await tester.pump();
      // Accepted: no new order is left, the ringing stops.
      await tester.tap(find.byKey(const ValueKey('vendor-card-prep-30')));
      await tester.pump();
      expect(find.textContaining('Accept · ready'), findsOneWidget);
      // Salma's was answered on the panel meanwhile; Hany's is accepted here.
      api.vendorOrders['new']!.removeLast();
      api.vendorOrders['active'] = [api.vendorOrders['new']!.removeAt(0)];
      await tester.tap(find.byKey(const ValueKey('vendor-card-accept')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('accept 4822 30'));
      final after = rings;
      await tester.pump(vendorRingEvery * 3);
      expect(rings, after);
    });

    testWidgets('only 10 to 45 minutes, the panel\'s reasons, and the first '
        'name only', (tester) async {
      phone(tester);
      final api = zadVendorApi();
      api.vendorOrders['new'] = zadNewOrders();
      await open(zadVendorApp(api), tester, Paths.vendorDesk);
      for (final m in [10, 15, 20, 30, 45]) {
        expect(find.byKey(ValueKey('vendor-card-prep-$m')), findsOneWidget);
      }
      expect(find.byKey(const ValueKey('vendor-card-prep-60')), findsNothing);
      // The place's own time is offered first.
      expect(
        tester
            .widget<Semantics>(
              find
                  .descendant(
                    of: find.byKey(const ValueKey('vendor-card-prep-20')),
                    matching: find.byType(Semantics),
                  )
                  .first,
            )
            .properties
            .selected,
        isTrue,
      );
      expect(find.text('Hany · 1 min ago'), findsOneWidget);
      expect(find.text('2 by weight'), findsOneWidget);
      expect(find.text('+4'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('vendor-card-reject')));
      await TestApp.settle(tester, 10);
      expect(find.text('Why are you turning it down?'), findsOneWidget);
      for (final why in [
        "We're closing",
        'Too busy',
        'Items unavailable',
        'Too far',
        'Other',
      ]) {
        expect(find.text(why), findsOneWidget);
      }
      await tester.tap(find.byKey(const ValueKey('vendor-reject-tooBusy')));
      await tester.tap(find.byKey(const ValueKey('vendor-reject-send')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('reject 4822 tooBusy'));
    });

    testWidgets('a picker sees the orders but doesn\'t answer them', (
      tester,
    ) async {
      phone(tester);
      final api = zadVendorApi(role: 'picker');
      api.vendorOrders['new'] = zadNewOrders();
      await open(zadVendorApp(api), tester, Paths.vendorDesk);
      expect(find.text('Zad Partner · Samir, Picker'), findsOneWidget);
      expect(find.text('RINGING'), findsOneWidget);
      expect(find.byKey(const ValueKey('vendor-card-accept')), findsNothing);
    });
  });

  group('115.71 picking (09)', () {
    testWidgets('lines by aisle, each with its choice', (tester) async {
      phone(tester);
      final api = zadVendorApi();
      api.vendorOrders['active'] = [zadPickOrder()];
      await open(zadVendorApp(api), tester, Paths.vendorPick(4821));
      expect(find.text('Order #4821 · Mona'), findsOneWidget);
      expect(find.text('3/5'), findsOneWidget);
      final headings = [
        'FRESH FRUIT · AISLE 1',
        'CHEESE & EGGS · AISLE 4',
        'RICE, PASTA & PULSES · AISLE 7',
      ];
      final ys = [for (final h in headings) tester.getTopLeft(find.text(h)).dy];
      expect(ys, orderedEquals([...ys]..sort()));
      expect(find.text('If out: similar'), findsOneWidget);
      expect(find.text('Short-grain rice, 1 kg ×2'), findsOneWidget);
      expect(find.textContaining('Asked the customer · 4:3'), findsOneWidget);
      expect(find.text('Their pick, for Eggs, 15 ×2'), findsOneWidget);
      expect(find.text('Weighed 950 g of 1 kg · EGP 33.25'), findsOneWidget);
    });

    testWidgets('card: up to the weight asked, never more (D1)', (
      tester,
    ) async {
      phone(tester);
      final api = zadVendorApi();
      api.vendorOrders['active'] = [zadPickOrder(proposal: false)];
      await open(zadVendorApp(api), tester, Paths.vendorPick(4821));
      expect(find.text('Card order: up to 750 g · EGP 120.00'), findsOneWidget);
      for (final k in ['7', '4', '0']) {
        await tester.tap(find.byKey(ValueKey('vendor-key-31-$k')));
        await tester.pump();
      }
      // Lighter costs less: the difference is refunded.
      expect(find.text('EGP 118.40'), findsOneWidget);
      // Heavier than asked (760 g) is refused: the card never pays more.
      for (final k in ['⌫', '⌫', '6', '0']) {
        await tester.tap(find.byKey(ValueKey('vendor-key-31-$k')));
        await tester.pump();
      }
      expect(find.text('Too heavy: at most 750 g'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('vendor-pick-31-picked')));
      await tester.pump();
      expect(api.vendorCalls.where((c) => c.startsWith('pick')), isEmpty);
      for (final k in ['⌫', '⌫', '4', '0']) {
        await tester.tap(find.byKey(ValueKey('vendor-key-31-$k')));
        await tester.pump();
      }
      await tester.tap(find.byKey(const ValueKey('vendor-pick-31-picked')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('pick 4821 31:picked:0.74:'));
    });

    testWidgets('wallet: the same as a card (D1)', (tester) async {
      phone(tester);
      final api = zadVendorApi();
      api.vendorOrders['active'] = [
        zadPickOrder(pay: 'wallet', proposal: false),
      ];
      await open(zadVendorApp(api), tester, Paths.vendorPick(4821));
      expect(
        find.text('Wallet order: up to 750 g · EGP 120.00'),
        findsOneWidget,
      );
      for (final k in ['7', '6', '0']) {
        await tester.tap(find.byKey(ValueKey('vendor-key-31-$k')));
        await tester.pump();
      }
      expect(find.text('Too heavy: at most 750 g'), findsOneWidget);
    });

    testWidgets('cash: at most 10% over, heavier refused (D1)', (tester) async {
      phone(tester);
      final api = zadVendorApi();
      api.vendorOrders['active'] = [zadPickOrder(pay: 'cash', proposal: false)];
      await open(zadVendorApp(api), tester, Paths.vendorPick(4821));
      // 750 g asked: at most 825 g, EGP 132.00.
      expect(find.text('Cash order: up to 825 g · EGP 132.00'), findsOneWidget);
      for (final k in ['9', '0', '0']) {
        await tester.tap(find.byKey(ValueKey('vendor-key-31-$k')));
        await tester.pump();
      }
      expect(find.text('Too heavy: at most 825 g'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('vendor-pick-31-picked')));
      await tester.pump();
      expect(api.vendorCalls.where((c) => c.startsWith('pick')), isEmpty);
      for (var i = 0; i < 3; i++) {
        await tester.tap(find.byKey(const ValueKey('vendor-key-31-⌫')));
        await tester.pump();
      }
      for (final k in ['8', '2', '0']) {
        await tester.tap(find.byKey(ValueKey('vendor-key-31-$k')));
        await tester.pump();
      }
      // What the scale reads: 820 g × 160 = 131.20.
      expect(find.text('EGP 131.20'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('vendor-pick-31-picked')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('pick 4821 31:picked:0.82:'));
    });

    test('the cap per payment way, as numbers', () {
      const line = MarketOrderLine(
        productId: 1,
        name: 'White cheese',
        quantity: 0.75,
        unit: ProductUnit.kg,
        unitPrice: MarketMoney(amount: '160.00', formatted: 'EGP 160.00'),
        total: MarketMoney(amount: '120.00', formatted: 'EGP 120.00'),
      );
      for (final online in [
        MarketPayMethod.card,
        MarketPayMethod.applePay,
        MarketPayMethod.googlePay,
        MarketPayMethod.wallet,
      ]) {
        expect(weightCap(line, online, 10), 0.75);
      }
      expect(weightCap(line, MarketPayMethod.cash, 10), 0.825);
      expect(chargeFor(line, 0.74), closeTo(118.4, 1e-9));
      expect(moneyLike(line.unitPrice, 124.8), 'EGP 124.80');
      expect(
        moneyLike(
          const MarketMoney(amount: '14820', formatted: 'EGP 14,820'),
          15000,
        ),
        'EGP 15,000',
      );
    });

    testWidgets('Ready stays off while a substitute waits for the customer', (
      tester,
    ) async {
      phone(tester);
      final api = zadVendorApi();
      final order = zadPickOrder(proposal: false);
      api.vendorOrders['active'] = [order];
      api.vendorProducts.addAll(zadStock());
      await open(zadVendorApp(api), tester, Paths.vendorPick(4821));
      FilledButton ready() => tester.widget<FilledButton>(
        find.byKey(const ValueKey('vendor-pick-ready')),
      );
      expect(ready().onPressed, isNull);
      expect(
        find.text('2 lines left: White cheese, sliced, Egyptian rice, 1 kg'),
        findsOneWidget,
      );
      // The cheese is picked.
      for (final k in ['7', '5', '0']) {
        await tester.tap(find.byKey(ValueKey('vendor-key-31-$k')));
      }
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('vendor-pick-31-picked')));
      await TestApp.settle(tester, 20);
      // The rice is out: a similar one, never dearer, offered to Mona.
      await tester.tap(
        find.byKey(const ValueKey('vendor-pick-32-substituted')),
      );
      await TestApp.settle(tester, 20);
      expect(find.text('Offer something similar'), findsOneWidget);
      // Dearer than 38.00 or sold by weight: not offered.
      expect(find.byKey(const ValueKey('vendor-substitute-4')), findsNothing);
      expect(find.byKey(const ValueKey('vendor-substitute-1')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('vendor-substitute-77')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('propose 4821 32 77 2.0'));
      expect(
        find.byKey(const ValueKey('vendor-pick-32-waiting')),
        findsOneWidget,
      );
      expect(find.textContaining('Asked the customer · 4:5'), findsOneWidget);
      expect(ready().onPressed, isNull);
      expect(
        find.text('1 line left: Egyptian rice, 1 kg waiting for the customer'),
        findsOneWidget,
      );
      // Mona takes it: the line is done, Ready turns on.
      final rice = (order['lines'] as List).cast<Map<String, dynamic>>()[1];
      rice
        ..['outcome'] = 'substituted'
        ..['substitute'] = {
          'product_id': 77,
          'name': 'Short-grain rice, 1 kg',
          'quantity': 2,
          'total': egp('72.00'),
        }
        ..['proposal'] = {...rice['proposal'] as Map, 'status': 'accepted'};
      await tester.pump(vendorProposalRefresh);
      await TestApp.settle(tester, 20);
      expect(find.text('Instead of Egyptian rice, 1 kg'), findsOneWidget);
      expect(ready().onPressed, isNotNull);
      await tester.tap(find.byKey(const ValueKey('vendor-pick-ready')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('ready 4821'));
    });

    testWidgets('a line the customer wants left out can only be out; their '
        'own pick is brought without asking', (tester) async {
      phone(tester);
      final api = zadVendorApi();
      final order = zadPickOrder(proposal: false);
      final lines = (order['lines'] as List).cast<Map<String, dynamic>>();
      lines[0]['if_missing'] = 'remove';
      lines[1]['if_missing'] = 'chosen';
      api.vendorOrders['active'] = [order];
      await open(zadVendorApp(api), tester, Paths.vendorPick(4821));
      expect(find.text('If out: leave it out'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('vendor-pick-31-substituted')),
        findsNothing,
      );
      await tester.tap(find.byKey(const ValueKey('vendor-pick-31-missing')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('pick 4821 31:missing::'));
      expect(find.text('Bring their pick'), findsOneWidget);
      await tester.tap(
        find.byKey(const ValueKey('vendor-pick-32-substituted')),
      );
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('pick 4821 32:substituted::'));
      expect(api.vendorCalls.where((c) => c.startsWith('propose')), isEmpty);
    });
  });

  group('115.72 stock (10)', () {
    testWidgets('search by SKU, out of stock at once, a price for new orders '
        'only', (tester) async {
      phone(tester);
      final api = zadVendorApi();
      api.vendorProducts.addAll(zadStock());
      api.vendorOrders['active'] = [zadPickOrder()];
      api.vendorOrders['new'] = [
        zadOrder(
          lines: [
            zadLine(
              id: 1,
              name: 'Bananas',
              quantity: 1,
              unit: 'kg',
              unitPrice: '35.00',
            ),
          ],
        ),
      ];
      await open(zadVendorApp(api), tester, Paths.vendorStock);
      expect(find.text('Zad Market · 6 products · 1 out'), findsOneWidget);
      expect(find.text('PAN-RIC · 6221034500127'), findsOneWidget);
      expect(find.text('In stock · 40 left'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('vendor-stock-search')),
        'DAI-EGG',
      );
      await tester.pump(const Duration(milliseconds: 400));
      await TestApp.settle(tester, 20);
      expect(find.text('Eggs, 30'), findsOneWidget);
      expect(find.text('Oranges'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('vendor-stock-4')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('stock 4 false'));
      // The bananas' price: 32.00, shown as an offer from 35.00.
      await tester.enterText(
        find.byKey(const ValueKey('vendor-stock-search')),
        '',
      );
      await tester.pump(const Duration(milliseconds: 400));
      await TestApp.settle(tester, 20);
      await tester.tap(find.byKey(const ValueKey('vendor-stock-price-1')));
      await TestApp.settle(tester, 10);
      expect(find.text('New price / kg'), findsOneWidget);
      // Mona's order has bananas: it keeps its price.
      expect(
        find.textContaining(
          'Applies at once to new orders, not to the 1 already placed. '
          "Zad's team sees each change and can undo it.",
        ),
        findsOneWidget,
      );
      await tester.enterText(
        find.byKey(const ValueKey('vendor-price-new')),
        '32',
      );
      await tester.tap(find.byKey(const ValueKey('vendor-price-offer')));
      await tester.tap(find.byKey(const ValueKey('vendor-price-save')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('price 1 32.00 was=35.00'));
    });

    testWidgets('scan (typed for now), then open what was scanned', (
      tester,
    ) async {
      phone(tester);
      final api = zadVendorApi();
      api.vendorProducts.addAll(zadStock());
      await open(zadVendorApp(api), tester, Paths.vendorStock);
      await tester.tap(find.byKey(const ValueKey('vendor-stock-scan')));
      await TestApp.settle(tester, 10);
      await tester.enterText(
        find.byKey(const ValueKey('vendor-scan-code')),
        '6221034500127',
      );
      await tester.tap(find.byKey(const ValueKey('vendor-scan-find')));
      await TestApp.settle(tester, 20);
      expect(find.text('Scanned: Egyptian rice, 1 kg'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('vendor-scan-open')));
      await tester.pump(const Duration(milliseconds: 400));
      await TestApp.settle(tester, 20);
      expect(find.byKey(const ValueKey('vendor-price-3')), findsOneWidget);
      // A code nothing has.
      await tester.tap(find.byKey(const ValueKey('vendor-price-cancel')));
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('vendor-stock-scan')));
      await TestApp.settle(tester, 10);
      await tester.enterText(
        find.byKey(const ValueKey('vendor-scan-code')),
        '000',
      );
      await tester.tap(find.byKey(const ValueKey('vendor-scan-find')));
      await TestApp.settle(tester, 20);
      expect(find.text('Nothing here has the code 000.'), findsOneWidget);
    });

    testWidgets('an owner adds a product', (tester) async {
      phone(tester);
      final api = zadVendorApi(role: 'owner');
      api.vendorDesk['can_edit_place'] = true;
      await open(zadVendorApp(api), tester, Paths.vendorStock);
      await tester.tap(find.byKey(const ValueKey('vendor-stock-add')));
      await TestApp.settle(tester, 10);
      await tester.enterText(
        find.byKey(const ValueKey('vendor-add-name')),
        'Lemons',
      );
      await tester.enterText(
        find.byKey(const ValueKey('vendor-add-price')),
        '30',
      );
      await tester.tap(find.text('By the kilo'));
      await tester.enterText(
        find.byKey(const ValueKey('vendor-add-sku')),
        'FRT-LEM',
      );
      await tester.tap(find.byKey(const ValueKey('vendor-add-save')));
      await TestApp.settle(tester, 20);
      expect(api.vendorCalls, contains('create Lemons 30.00 kg FRT-LEM null'));
      expect(find.text('Lemons'), findsOneWidget);
    });
  });

  // Each screen in English and Arabic (right to left), light and dark, with
  // the text 1.3 times bigger on a 360-point phone: nothing overflows.
  for (final lang in ['en', 'ar']) {
    for (final dark in [false, true]) {
      final name = '$lang ${dark ? 'dark' : 'light'}, text x1.3';
      testWidgets('08 live orders, $name', (tester) async {
        phone(tester, scale: 1.3, height: 1600);
        final api = zadVendorApi();
        api.vendorOrders['new'] = zadNewOrders();
        await open(
          zadVendorApp(api, lang: lang, dark: dark),
          tester,
          Paths.vendorDesk,
        );
        expect(tester.takeException(), isNull);
        expect(
          find.byKey(const ValueKey('vendor-card-accept')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('vendor-bell')), findsOneWidget);
        if (lang == 'ar') {
          expect(find.text('طلبان جديدان'), findsOneWidget);
          expect(find.text('يرنّ'), findsOneWidget);
          expect(
            Directionality.of(
              tester.element(find.byKey(const ValueKey('vendor-card-accept'))),
            ),
            TextDirection.rtl,
          );
        }
      });

      testWidgets('09 picking, $name', (tester) async {
        phone(tester, scale: 1.3, height: 1800);
        final api = zadVendorApi();
        api.vendorOrders['active'] = [zadPickOrder()];
        await open(
          zadVendorApp(api, lang: lang, dark: dark),
          tester,
          Paths.vendorPick(4821),
        );
        expect(tester.takeException(), isNull);
        expect(find.byKey(const ValueKey('vendor-key-31-7')), findsOneWidget);
        expect(
          tester
              .widget<FilledButton>(
                find.byKey(const ValueKey('vendor-pick-ready')),
              )
              .onPressed,
          isNull,
        );
        if (lang == 'ar') {
          expect(find.text('عند النفاد: مشابه'), findsOneWidget);
          expect(find.text('جاهز للمندوب'), findsOneWidget);
          // The keypad reads left to right in Arabic too.
          expect(
            tester.getTopLeft(find.byKey(const ValueKey('vendor-key-31-1'))).dx,
            lessThan(
              tester
                  .getTopLeft(find.byKey(const ValueKey('vendor-key-31-6')))
                  .dx,
            ),
          );
        }
      });

      testWidgets('10 stock, $name', (tester) async {
        phone(tester, scale: 1.3, height: 1600);
        final api = zadVendorApi();
        api.vendorProducts.addAll(zadStock());
        await open(
          zadVendorApp(api, lang: lang, dark: dark),
          tester,
          Paths.vendorStock,
        );
        await tester.tap(find.byKey(const ValueKey('vendor-stock-price-1')));
        await TestApp.settle(tester, 10);
        expect(tester.takeException(), isNull);
        expect(find.byKey(const ValueKey('vendor-price-save')), findsOneWidget);
        if (lang == 'ar') {
          expect(find.text('اعرضه كعرض'), findsOneWidget);
          expect(find.text('الاسم أو SKU أو الباركود'), findsOneWidget);
        }
      });
    }
  }
}
