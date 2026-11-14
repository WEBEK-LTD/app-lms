import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/market/widgets/market_compact.dart';
import 'package:yallapp/modules/market/widgets/market_sections.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../support/market_fixtures.dart';
import '../support/test_app.dart';

/// 128 The app's start, never reached here: the home's taps ask it which
/// screens this app opens.
class _Gate extends AppGate {
  @override
  GateState build() => const GateLoading();
}

class _Auth extends AuthController {
  _Auth(this.start);

  final AuthState start;

  @override
  AuthState build() => start;
}

/// Templates = demos: Zad's 128 demo home, as the platform makes it
/// (test/support/zad_demo_home.json, kept equal to the platform's by
/// platform/web/tests/unit/studio-demo-templates.test.ts; 130 the demo is
/// now its Signature look A, and this home a marketplace's template,
/// `market_photo`, shown here with the demo's note), the photo-first home
/// approved on 13 November 2026: the green bar with the
/// address, the soonest time and the search, this week's offer on a photo,
/// the departments as photo tiles and the places near you as chips, with
/// how to sign in for people not signed in.
void main() {
  final page = StudioPage.tryParse(
    jsonDecode(File('test/support/zad_demo_home.json').readAsStringSync())
        as Map<String, dynamic>,
  )!;

  Widget app(AuthState auth, {String lang = 'en'}) => ProviderScope(
    overrides: [
      ...marketSampleOverrides,
      authControllerProvider.overrideWith(() => _Auth(auth)),
      appGateProvider.overrideWith(_Gate.new),
      appEnvironmentProvider.overrideWithValue(
        AppEnvironment(
          build: testBuild.copyWith(appName: 'Zad', appType: AppType.food),
          platform: DevicePlatform.android,
          appVersion: '1.0.0',
          deviceId: 'device-1',
          deviceName: 'Test phone',
        ),
      ),
    ],
    child: MaterialApp(
      theme: buildAppTheme(
        primary: const Color(0xFF1E6B52),
        secondary: const Color(0xFFF2A93B),
        brightness: Brightness.light,
        template: AppTemplate.bold,
        fontFamily: 'Manrope',
      ),
      locale: Locale(lang),
      supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      home: Scaffold(
        body: StudioPageView(page: page, pageSlug: 'home'),
      ),
    ),
  );

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(360, 1800) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  test('the demo page has the approved parts, in their order', () {
    expect(page.header, isNull);
    final types = [for (final n in page.body.children) n.type];
    // 128 The demo's sign-in note last, after the approved design.
    expect(types, [
      StudioNodeType.market,
      StudioNodeType.stack,
      StudioNodeType.grid,
      StudioNodeType.row,
      StudioNodeType.market,
      StudioNodeType.row,
    ]);
    expect(page.body.children.last.visibility, StudioVisibility.signedOut);
    final bar = page.body.children.first.market!;
    expect(bar.section, StudioMarketSection.address);
    expect(bar.style, StudioMarketStyle.bar);
    final places = page.body.children[4].market!;
    expect(places.section, StudioMarketSection.vendors);
    expect(places.style, StudioMarketStyle.chips);
    expect(places.sort, StudioMarketSort.nearest);
    // The offer's words read over a shade from the start.
    final offer = page.body.children[1];
    expect(offer.scrim?.angle, 90);
    expect(offer.imageBackgroundUrl, endsWith('/demo-photos/cover-market.jpg'));
    // Four photo tiles, each with a shade at its foot.
    final tiles = page.body.children[2].children;
    expect(tiles, hasLength(4));
    for (final t in tiles) {
      expect(t.scrim?.to, 0.7);
    }
  });

  testWidgets('a visitor not signed in sees the approved home and the note', (
    tester,
  ) async {
    phone(tester);
    await tester.pumpWidget(app(const SignedOut()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
    expect(find.byType(MarketSectionView), findsNWidgets(2));
    expect(find.byType(MarketAddressBar), findsOneWidget);
    expect(find.byType(MarketVendorChips), findsOneWidget);
    for (final text in [
      'Search products and shops',
      // In capitals, as its font says.
      'THIS WEEK',
      'Fresh fruit, 15% off',
      'Shop now',
      'Fruit',
      'Picked this morning',
      'Dairy',
      'Places near you',
      'See all',
    ]) {
      expect(find.text(text), findsOneWidget, reason: text);
    }
    // The address and the places come from the marketplace.
    expect(find.text('Ember & Bun'), findsOneWidget);
    expect(find.text('Fresh Basket'), findsOneWidget);
    expect(find.byKey(const ValueKey('market-soonest')), findsOneWidget);
    expect(find.textContaining('This is a demo app.'), findsOneWidget);
  });

  testWidgets('signed in, the note is gone and the home stays', (tester) async {
    phone(tester);
    await tester.pumpWidget(app(const SignedIn()));
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
    expect(find.byType(MarketSectionView), findsNWidgets(2));
    expect(find.textContaining('This is a demo app.'), findsNothing);
  });

  testWidgets('in Arabic the bar and the chips read from the right', (
    tester,
  ) async {
    phone(tester);
    await tester.pumpWidget(app(const SignedIn(), lang: 'ar'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
    final bar = find.byType(MarketAddressBar);
    expect(bar, findsOneWidget);
    // The soonest time at the bar's end: its left in Arabic.
    final soonest = tester.getCenter(
      find.byKey(const ValueKey('market-soonest')),
    );
    expect(soonest.dx, lessThan(tester.getCenter(bar).dx));
  });
}
