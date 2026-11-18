import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/share_links.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/market/data/market_providers.dart';
import 'package:yallapp/modules/market/screens/market_vendor_screen.dart';

import '../support/market_fixtures.dart';

/// 177 A marketplace vendor's page (docs/qa/2026-11-18-market-store): its
/// cover's search, share and heart did nothing, and an aisle's chip only
/// changed colour; the page now goes to the aisle, under the pinned chips.
void main() {
  final shared = <String>[];

  Widget app({String lang = 'en'}) {
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const MarketVendorScreen(vendorId: 'fresh-basket'),
        ),
        GoRoute(
          path: Paths.marketSearch,
          builder: (_, _) => const Scaffold(body: Text('THE SEARCH')),
        ),
      ],
    );
    return ProviderScope(
      overrides: [
        ...marketSampleOverrides,
        shellTabsProvider.overrideWithValue(const []),
        shareBaseProvider.overrideWithValue('https://souq.example/app'),
        shareTextProvider.overrideWithValue((text) async => shared.add(text)),
      ],
      child: MaterialApp.router(
        theme: buildAppTheme(
          primary: const Color(0xFF134A36),
          secondary: const Color(0xFFF2B33D),
          brightness: Brightness.light,
          template: AppTemplate.bold,
          fontFamily: 'Plus Jakarta Sans',
        ),
        locale: Locale(lang),
        supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        routerConfig: router,
      ),
    );
  }

  setUp(() {
    shared.clear();
    SharedPreferences.setMockInitialValues({});
  });

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(360, 800) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  for (final lang in ['en', 'ar']) {
    testWidgets('$lang: an aisle chip goes to its aisle, under the chips', (
      tester,
    ) async {
      phone(tester);
      await tester.pumpWidget(app(lang: lang));
      await tester.pumpAndSettle();
      // The second aisle's heading is under the first's products, out of view.
      expect(find.text('Bakery'), findsOneWidget);
      await tester.drag(
        find.text('Fruit & vegetables').first,
        Offset(lang == 'ar' ? 200 : -200, 0),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Bakery'));
      await tester.pumpAndSettle();
      final bakery = find.text('Bakery');
      expect(bakery, findsNWidgets(2));
      final chipsBottom = tester.getBottomLeft(bakery.first).dy;
      final top = tester.getTopLeft(bakery.last).dy;
      // Just under the pinned chips, unless the page ends first.
      final page = tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position;
      expect(top, greaterThanOrEqualTo(chipsBottom));
      if (page.pixels < page.maxScrollExtent) {
        expect(top, lessThan(chipsBottom + 40));
      } else {
        expect(tester.getBottomLeft(bakery.last).dy, lessThan(800));
      }
      expect(page.pixels, greaterThan(300));
      // The last aisle, not built until then: in view, the page at its end.
      await tester.drag(
        find.text('Bakery').first,
        Offset(lang == 'ar' ? 300 : -300, 0),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Coffee & tea').first);
      await tester.pumpAndSettle();
      final coffee = find.text('Coffee & tea');
      expect(coffee, findsNWidgets(2));
      expect(tester.getTopLeft(coffee.last).dy, greaterThan(chipsBottom));
      expect(tester.getBottomLeft(coffee.last).dy, lessThan(800));
    });
  }

  testWidgets('the heart saves the place on the phone, and takes it out', (
    tester,
  ) async {
    phone(tester);
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel('Save to favorites'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Remove from favorites'), findsOneWidget);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getStringList(MarketSavedPlaces.key), ['fresh-basket']);
    await tester.tap(find.bySemanticsLabel('Remove from favorites'));
    await tester.pumpAndSettle();
    expect(prefs.getStringList(MarketSavedPlaces.key), isEmpty);
  });

  testWidgets('share sends its name and the app\'s link; search opens search', (
    tester,
  ) async {
    phone(tester);
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel('Share'));
    await tester.pump();
    expect(shared, ['Fresh Basket\nhttps://souq.example/app']);
    await tester.tap(find.bySemanticsLabel('Search'));
    await tester.pumpAndSettle();
    expect(find.text('THE SEARCH'), findsOneWidget);
  });
}
