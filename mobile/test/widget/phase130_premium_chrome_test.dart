import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/widgets/premium_chrome.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 130.20–130.29 Premium chrome: a Studio page's premium header styles
/// (each drawn, folding on scroll, snapping with reduced motion, its round
/// glass buttons, the bell's dot and the back button, light, dark, right to
/// left; an old header exactly as before) and the system screens' premium
/// look (the account, settings, notifications, the lists, the language,
/// sign-in and the code screen, the empty and loading states), a screen
/// with its own look kept, and no look at all as before.
void main() {
  Map<String, dynamic> filler(int n) => {
    'id': 'filler$n',
    'type': 'column',
    'height': 220,
    'background': '#E9E2D5',
    'radius': 20,
    'children': [
      {'id': 'text$n', 'type': 'text', 'text': 'Block $n'},
    ],
  };

  FakeApi studio(
    Map<String, dynamic> header, {
    Map<String, dynamic>? screens,
  }) =>
      FakeApi(
          config: {
            ...configJson(languages: languagesJson()),
            'screens': ?screens,
          },
        )
        ..navigation = navigationJson(
          tabs: [
            navTabJson('home', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('account', 'Account', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        )
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
    bool signedIn = true,
    AppType type = AppType.lms,
  }) async {
    final app = TestApp(
      appType: type,
      api: api,
      signedIn: signedIn,
      guest: !signedIn,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  group('130.20 the premium headers', () {
    for (final style in ['large', 'glass', 'photo', 'brand', 'search']) {
      for (final (dark, language) in [(false, 'en'), (true, 'ar')]) {
        testWidgets('$style, ${dark ? 'dark, right to left' : 'light'}', (
          tester,
        ) async {
          await open(
            tester,
            studio({
              'type': 'title',
              'style': style,
              'title': 'Orders',
              'buttons': ['notifications', 'search', 'account'],
            }),
            dark: dark,
            language: language,
          );
          expect(
            find.byKey(ValueKey('studio-header-style-$style')),
            findsOneWidget,
          );
          expect(find.byKey(ValueKey('chrome-header-$style')), findsOneWidget);
          // The bell with its dot: the person has unread notifications.
          expect(
            find.byKey(const ValueKey('studio-header-notifications')),
            findsOneWidget,
          );
          expect(find.byKey(const ValueKey('chrome-dot')), findsOneWidget);
          if (style == 'search') {
            expect(find.byKey(const ValueKey('chrome-search')), findsOneWidget);
            expect(
              find.byKey(const ValueKey('studio-header-search')),
              findsNothing,
            );
          }
          if (language == 'ar') {
            // The buttons at the end: on the left right to left.
            final bell = tester.getCenter(
              find.byKey(const ValueKey('studio-header-notifications')),
            );
            expect(bell.dx, lessThan(200));
          }
        });
      }
    }

    testWidgets('large folds into the compact bar on scroll; open with '
        'collapse false', (tester) async {
      await open(tester, studio({'type': 'title', 'style': 'large'}));
      final header = find.byKey(const ValueKey('chrome-header-large'));
      final open0 = tester.getSize(header).height;
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -300));
      await tester.pump();
      expect(tester.getSize(header).height, lessThan(open0));
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('large stays open with collapse false', (tester) async {
      await open(
        tester,
        studio({'type': 'title', 'style': 'large', 'collapse': false}),
      );
      final header = find.byKey(const ValueKey('chrome-header-large'));
      final kept = tester.getSize(header).height;
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -300));
      await tester.pump();
      expect(tester.getSize(header).height, kept);
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
      await open(tester, studio({'type': 'title', 'style': 'photo'}));
      final header = find.byKey(const ValueKey('chrome-header-photo'));
      final open0 = tester.getSize(header).height;
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -20));
      await tester.pump();
      expect(tester.getSize(header).height, open0);
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -200));
      await tester.pump();
      expect(tester.getSize(header).height, lessThan(open0 - 100));
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('an old header is drawn as before', (tester) async {
      await open(
        tester,
        studio({
          'type': 'logo_center',
          'buttons': ['cart'],
        }),
      );
      expect(
        find.byKey(const ValueKey('studio-header-logo_center')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('chrome-header-large')), findsNothing);
      expect(find.byKey(const ValueKey('chrome-dot')), findsNothing);
    });

    test('the header and the system look are read, unknown ones left out', () {
      final h = StudioHeader.tryParse({
        'type': 'title',
        'style': 'photo',
        'subtitle': 'Tonight',
        'image_url': 'https://x.test/a.jpg',
        'collapse': false,
      })!;
      expect(h.style, StudioHeaderStyle.photo);
      expect(h.subtitle, 'Tonight');
      expect(h.collapse, isFalse);
      expect(
        StudioHeader.tryParse({'type': 'title', 'style': 'neon'})!.style,
        isNull,
      );
      final s = SystemScreensLook.tryParse({
        'look': 'glass',
        'screens': {'account': 'classic', 'sign_in': 'photo', 'code': 'neon'},
      })!;
      expect(s.lookFor(SystemScreen.settings), SystemLook.glass);
      expect(s.lookFor(SystemScreen.account), isNull);
      expect(s.lookFor(SystemScreen.signIn), SystemLook.photo);
      expect(s.lookFor(SystemScreen.code), SystemLook.glass);
      expect(SystemScreensLook.tryParse({'look': 'neon'}), isNull);
    });
  });

  group('130.21 the system screens', () {
    Map<String, dynamic> system(String look, [Map<String, String>? own]) => {
      'system': {'look': look, 'screens': ?own},
    };

    for (final look in ['large', 'glass', 'photo', 'brand']) {
      testWidgets('the account in $look: the hero, the shortcuts, the groups', (
        tester,
      ) async {
        final app = await open(
          tester,
          studio({'type': 'title'}, screens: system(look)),
          dark: look == 'glass',
          language: look == 'brand' ? 'ar' : 'en',
        );
        app.container.read(appRouterProvider).go('/account');
        await TestApp.settle(tester, 20);
        expect(
          find.byKey(ValueKey('system-screen-account-$look')),
          findsOneWidget,
        );
        expect(
          find.byKey(ValueKey('chrome-account-hero-$look')),
          findsOneWidget,
        );
        expect(
          find.byKey(const ValueKey('chrome-account-quick')),
          findsOneWidget,
        );
        expect(find.text('Sara Yilmaz'), findsOneWidget);
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('account-sign-out')),
          300,
          scrollable: find.byType(Scrollable).first,
        );
        expect(find.byType(ChromeIconTile), findsWidgets);
      });
    }

    testWidgets('settings, the language and notifications in the look', (
      tester,
    ) async {
      final app = await open(
        tester,
        studio({'type': 'title'}, screens: system('large')),
      );
      final router = app.container.read(appRouterProvider);
      router.push('/account/settings');
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('system-screen-settings-large')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('chrome-back')), findsOneWidget);
      expect(find.byType(ChromeIconTile), findsWidgets);
      final language = find.byKey(const ValueKey('language-tile'));
      if (language.evaluate().isNotEmpty) {
        await tester.tap(language);
        await TestApp.settle(tester, 10);
        expect(
          find.byKey(const ValueKey('chrome-choice-large')),
          findsOneWidget,
        );
        await tester.tapAt(const Offset(20, 20));
        await TestApp.settle(tester, 10);
      }
      router.push('/notifications');
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('system-screen-notifications-large')),
        findsOneWidget,
      );
    });

    testWidgets('a screen with its own look keeps it', (tester) async {
      final app = await open(
        tester,
        studio({
          'type': 'title',
        }, screens: system('glass', {'settings': 'classic'})),
      );
      final router = app.container.read(appRouterProvider);
      router.push('/account/settings');
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('system-screen-settings-glass')),
        findsNothing,
      );
      expect(find.byType(ChromeIconTile), findsNothing);
    });

    testWidgets('without a look, the account as before', (tester) async {
      final plain = await open(tester, studio({'type': 'title'}));
      plain.container.read(appRouterProvider).go('/account');
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('system-screen-account-large')),
        findsNothing,
      );
      expect(find.byKey(const ValueKey('chrome-account-quick')), findsNothing);
    });

    testWidgets('sign-in and the code screen on the hero', (tester) async {
      final app = await open(
        tester,
        studio(
          {'type': 'title'},
          screens: {
            ...system('photo'),
            'sign_in': {
              'style': 'classic',
              'title': {'en': 'Tonight, at your table'},
              'show_logo': true,
            },
          },
        ),
        signedIn: false,
      );
      app.container.read(appRouterProvider).push('/sign-in');
      await TestApp.settle(tester, 20);
      expect(find.byKey(const ValueKey('chrome-auth-photo')), findsOneWidget);
      expect(find.byKey(const ValueKey('chrome-auth-sheet')), findsOneWidget);
      expect(find.text('Tonight, at your table'), findsOneWidget);
    });

    testWidgets('the empty state and loading in the brand\'s tones', (
      tester,
    ) async {
      final api = studio({'type': 'title'}, screens: system('brand'))
        ..notifications = [];
      final app = await open(tester, api);
      app.container.read(appRouterProvider).push('/notifications');
      await TestApp.settle(tester, 20);
      expect(find.byKey(const ValueKey('chrome-empty')), findsOneWidget);
    });
  });
}
