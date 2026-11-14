import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/core/widgets/premium_chrome.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 131.21–131.23 Leqaa's signature chrome, for every app: the `petal`
/// header (its wash, centred title, floral line and petal edge, folding on
/// scroll and snapping with reduced motion), the `petal` bar (the open tab
/// on a petal-cut leaf, the middle tab a raised bloom) and the `petal`
/// system screens (the account's hero in the middle with its double ring),
/// light, dark and right to left; unknown values as before.
void main() {
  Map<String, dynamic> filler(int n) => {
    'id': 'filler$n',
    'type': 'column',
    'height': 220,
    'background': '#F3E3DE',
    'radius': 20,
    'children': [
      {'id': 'text$n', 'type': 'text', 'text': 'Block $n'},
    ],
  };

  FakeApi studio(
    Map<String, dynamic> header, {
    Map<String, dynamic>? screens,
    Map<String, dynamic>? tabBar,
  }) =>
      FakeApi(
          config: {
            ...configJson(languages: languagesJson()),
            'screens': ?screens,
          },
        )
        ..navigation = {
          ...navigationJson(
            tabs: [
              navTabJson('home', 'Home', 'home', {
                'type': 'page',
                'page_slug': 'home',
              }),
              navTabJson('shop', 'Bouquets', 'local_florist', {
                'type': 'screen',
                'screen': 'courses',
              }),
              navTabJson('cart', 'Send', 'redeem', {
                'type': 'screen',
                'screen': 'cart',
              }),
              navTabJson('orders', 'Orders', 'local_shipping', {
                'type': 'screen',
                'screen': 'orders',
              }),
              navTabJson('account', 'Account', 'person', {
                'type': 'screen',
                'screen': 'account',
              }),
            ],
          ),
          'tab_bar': ?tabBar,
        }
        ..pages = {
          'home': {
            ...appPageJson(blocks: []),
            'studio': {
              'header': header,
              'body': {
                'id': 'root',
                'type': 'column',
                'children': [for (var i = 0; i < 6; i++) filler(i)],
              },
            },
          },
        };

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    bool dark = false,
    String language = 'en',
  }) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api,
      signedIn: true,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  const petalHeader = {
    'type': 'title',
    'style': 'petal',
    'title': 'Bouquets',
    'subtitle': 'Flowers for every moment',
    'buttons': ['search', 'notifications'],
  };

  group('131.21 the petal header', () {
    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets('drawn ${dark ? 'by night' : 'by day'} in $language', (
        tester,
      ) async {
        await open(tester, studio(petalHeader), dark: dark, language: language);
        expect(
          find.byKey(const ValueKey('studio-header-style-petal')),
          findsOneWidget,
        );
        expect(
          find.byKey(const ValueKey('chrome-header-petal')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('chrome-floral')), findsOneWidget);
        expect(find.text('Bouquets'), findsWidgets);
        expect(find.text('Flowers for every moment'), findsOneWidget);
        expect(find.byType(ClipPath), findsWidgets);
        // Its title in the middle, the buttons at the end (the left in Arabic).
        final bell = tester.getCenter(
          find.byKey(const ValueKey('studio-header-notifications')),
        );
        if (language == 'ar') {
          expect(bell.dx, lessThan(200));
        } else {
          expect(bell.dx, greaterThan(200));
        }
      });
    }

    testWidgets('folds on scroll; stays open with collapse false', (
      tester,
    ) async {
      await open(tester, studio(petalHeader));
      final header = find.byKey(const ValueKey('chrome-header-petal'));
      final open0 = tester.getSize(header).height;
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -300));
      await tester.pump();
      expect(tester.getSize(header).height, lessThan(open0));
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('with reduced motion it snaps, never in between', (
      tester,
    ) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await open(tester, studio(petalHeader));
      final header = find.byKey(const ValueKey('chrome-header-petal'));
      final open0 = tester.getSize(header).height;
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -20));
      await tester.pump();
      expect(tester.getSize(header).height, open0);
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -200));
      await tester.pump();
      expect(tester.getSize(header).height, lessThan(open0 - 30));
      await tester.pump(const Duration(seconds: 3));
    });

    test('is read; an app that does not know it keeps the type', () {
      final h = StudioHeader.tryParse({
        'type': 'logo_center',
        'style': 'petal',
        'image_url': 'https://x.test/a.jpg',
      })!;
      expect(h.style, StudioHeaderStyle.petal);
      expect(
        ChromeHeaderBar.onColourFor(ChromeHeaderStyle.petal, h.imageUrl),
        isTrue,
      );
      expect(
        ChromeHeaderBar.onColourFor(ChromeHeaderStyle.petal, null),
        isFalse,
      );
    });
  });

  group('131.22 the petal bar', () {
    const bar = {
      'design': 'petal',
      'background': '#FFFFFF',
      'dark_background': '#24131B',
      'active': '#8E2445',
      'dark_active': '#F3A9C0',
      'labels': 'active',
      'radius': 30,
      'margin': 12,
      'center': 'cart',
    };
    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets('floats with its raised bloom, ${dark ? 'dark' : 'light'} '
          '$language', (tester) async {
        await open(
          tester,
          studio({'type': 'title'}, tabBar: bar),
          dark: dark,
          language: language,
        );
        expect(find.byType(AppNavBar), findsOneWidget);
        expect(find.byKey(const ValueKey('nav-petal-bloom')), findsOneWidget);
        // The open tab (Home) on its leaf.
        expect(find.byKey(const ValueKey('nav-0-petal')), findsOneWidget);
        // The bloom is the middle of five, raised over the bar.
        final bloom = tester.getCenter(
          find.byKey(const ValueKey('nav-petal-bloom')),
        );
        final home = tester.getCenter(
          find.byKey(const ValueKey('nav-0-petal')),
        );
        expect(bloom.dy, lessThan(home.dy));
        final width =
            tester.view.physicalSize.width / tester.view.devicePixelRatio;
        expect((bloom.dx - width / 2).abs(), lessThan(24));
        // Home at the start: the right in Arabic.
        expect(
          home.dx,
          language == 'ar' ? greaterThan(width * 0.7) : lessThan(width * 0.3),
        );
      });
    }

    test('is read', () {
      expect(
        TabBarStyle.fromJson({'design': 'petal'}).design,
        TabBarDesign.petal,
      );
    });
  });

  group('131.23 the petal system screens', () {
    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets('the account: the person in the middle in a double ring, '
          '${dark ? 'dark' : 'light'} $language', (tester) async {
        final app = await open(
          tester,
          studio(
            {'type': 'title'},
            screens: {
              'system': {'look': 'petal'},
            },
          ),
          dark: dark,
          language: language,
        );
        app.container.read(appRouterProvider).go('/account');
        await TestApp.settle(tester, 20);
        expect(
          find.byKey(const ValueKey('system-screen-account-petal')),
          findsOneWidget,
        );
        expect(
          find.byKey(const ValueKey('chrome-account-hero-petal')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('chrome-floral')), findsOneWidget);
        expect(find.text('Sara Yilmaz'), findsOneWidget);
        // In the middle.
        final name = tester.getCenter(find.text('Sara Yilmaz'));
        final width =
            tester.view.physicalSize.width / tester.view.devicePixelRatio;
        expect((name.dx - width / 2).abs(), lessThan(30));
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('account-sign-out')),
          300,
          scrollable: find.byType(Scrollable).first,
        );
      });
    }

    testWidgets('settings in the petal look, its header the petal', (
      tester,
    ) async {
      final app = await open(
        tester,
        studio(
          {'type': 'title'},
          screens: {
            'system': {'look': 'petal'},
          },
        ),
      );
      app.container.read(appRouterProvider).go('/account/settings');
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('system-screen-settings-petal')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('chrome-header-petal')), findsOneWidget);
    });

    test('the look and the checkout look are read, unknown ones left out', () {
      expect(
        SystemScreensLook.tryParse({'look': 'petal'})!.look,
        SystemLook.petal,
      );
      final screens = StudioScreens.fromJson({
        'checkout': {
          'look': 'gift',
          'accent': '#8E2445',
          'dark_accent': '#F3A9C0',
        },
      })!;
      expect(screens.checkout!.look, CheckoutLookName.gift);
      expect(screens.checkout!.accentFor(dark: true), const Color(0xFFF3A9C0));
      expect(
        StudioScreens.fromJson({
          'checkout': {'look': 'express'},
        })!.checkout,
        isNull,
      );
    });
  });
}
