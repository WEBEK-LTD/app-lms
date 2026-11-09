import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/market/widgets/market_sections.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../support/market_fixtures.dart';

class _Auth extends AuthController {
  _Auth(this.start);

  final AuthState start;

  @override
  AuthState build() => start;
}

/// Templates = demos: Zad's demo home, as the platform makes it
/// (test/support/zad_demo_home.json, kept equal to the platform's by
/// platform/web/tests/unit/studio-demo-templates.test.ts), is the
/// marketplace home approved in 115.14: every part of it drawn, in Zad's
/// colour and font, with how to sign in for people not signed in.
void main() {
  final page = StudioPage.tryParse(
    jsonDecode(File('test/support/zad_demo_home.json').readAsStringSync())
        as Map<String, dynamic>,
  )!;

  Widget app(AuthState auth) => ProviderScope(
    overrides: [
      ...marketSampleOverrides,
      authControllerProvider.overrideWith(() => _Auth(auth)),
    ],
    child: MaterialApp(
      theme: buildAppTheme(
        primary: const Color(0xFF1E6B52),
        secondary: const Color(0xFFF2A93B),
        brightness: Brightness.light,
        template: AppTemplate.bold,
        fontFamily: 'Outfit',
      ),
      locale: const Locale('en'),
      supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      home: Scaffold(
        body: StudioPageView(page: page, pageSlug: 'home'),
      ),
    ),
  );

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(360, 3400) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  test('the demo page has the approved sections, in their order', () {
    expect(page.header, isNull);
    final markets = [
      for (final n in page.body.children)
        if (n.type == StudioNodeType.market) n,
    ];
    expect(
      [for (final n in markets) n.market!.section],
      [
        StudioMarketSection.address,
        StudioMarketSection.kinds,
        StudioMarketSection.offers,
        StudioMarketSection.vendors,
        StudioMarketSection.cuisines,
        StudioMarketSection.club,
        StudioMarketSection.vendors,
        StudioMarketSection.reorder,
        StudioMarketSection.vendors,
      ],
    );
    expect(markets[3].market!.style, StudioMarketStyle.spotlight);
    expect(markets[3].market!.sort, StudioMarketSort.fastest);
    expect(markets[6].market!.kind, StudioMarketKind.grocery);
    expect(markets[6].market!.style, StudioMarketStyle.tiles);
    expect(markets[8].market!.style, StudioMarketStyle.list);
  });

  testWidgets('a visitor not signed in sees the approved home and the note', (
    tester,
  ) async {
    phone(tester);
    await tester.pumpWidget(app(const SignedOut()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
    expect(find.byType(MarketSectionView), findsNWidgets(9));
    for (final title in [
      'Hungry? Order in minutes.',
      'Today\'s offers',
      'Fastest near you',
      'What\'s your mood?',
      'Free delivery on every order',
      'Supermarkets & shops',
      'Order again',
      'All restaurants',
    ]) {
      // "Order again" is also each past order's button.
      expect(
        find.text(title),
        title == 'Order again' ? findsWidgets : findsOneWidget,
        reason: title,
      );
    }
    // The places, the kinds and the club come from the marketplace.
    expect(find.text('Food'), findsWidgets);
    expect(find.text('Fresh Basket'), findsWidgets);
    expect(find.text('Ember & Bun'), findsWidgets);
    expect(find.textContaining('This is a demo app.'), findsOneWidget);
  });

  testWidgets('signed in, the note is gone and the home stays', (tester) async {
    phone(tester);
    await tester.pumpWidget(app(const SignedIn()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
    expect(find.byType(MarketSectionView), findsNWidgets(9));
    expect(find.textContaining('This is a demo app.'), findsNothing);
  });
}
