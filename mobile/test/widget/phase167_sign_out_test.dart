import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/l10n/app_localizations.dart';

import '../screenshots/support/demo_api.dart';
import '../screenshots/support/studio_demo.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 167 Sign out is always there for a signed-in person, whatever draws the
/// Account: the app's own list, the account menu's looks (plain, card,
/// cover, tiles, night, academy), the premium system looks (large, glass,
/// photo, brand, petal) and the account pages of Studio's templates. It
/// can be scrolled above a tab bar that floats over the page (the petal,
/// the owner's report of 18 November 2026: Leqaa and KechFlora), asks
/// first, then signs out; Delete account is reachable from the Account in
/// every look. English, Arabic (right to left) and Turkish.
void main() {
  /// A phone, so the floating bar sits where it does on one.
  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
  }

  const petalBar = {
    'design': 'petal',
    'labels': 'active',
    'radius': 30,
    'margin': 12,
    'center': 'cart',
  };

  FakeApi shop({Map<String, dynamic>? screens, Map<String, dynamic>? bar}) =>
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
              navTabJson('shop', 'Shop', 'storefront', {
                'type': 'screen',
                'screen': 'courses',
              }),
              navTabJson('cart', 'Cart', 'shopping_bag', {
                'type': 'screen',
                'screen': 'cart',
              }),
              navTabJson('account', 'Account', 'person', {
                'type': 'screen',
                'screen': 'account',
              }),
            ],
          ),
          'tab_bar': ?bar,
        };

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    AppType appType = AppType.store,
    String language = 'en',
  }) async {
    phone(tester);
    final app = TestApp(
      appType: appType,
      api: api,
      signedIn: true,
      preferences: {'settings.language': language},
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    // The home's own drawing isn't what is checked here.
    tester.takeException();
    return app;
  }

  AppLocalizations words(String language) =>
      lookupAppLocalizations(Locale(language));

  Future<void> toAccount(WidgetTester tester, TestApp app) async {
    app.container.read(appRouterProvider).go('/account');
    await TestApp.settle(tester, 20);
    tester.takeException();
  }

  /// Scrolls the Account to [finder] and checks it can be tapped where it
  /// is: on the screen and not under the tab bar.
  Future<void> reach(WidgetTester tester, Finder finder) async {
    await tester.scrollUntilVisible(
      finder,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    // To the very end: the last entry must still be above the bar.
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -3000));
    await TestApp.settle(tester, 10);
    expect(
      finder.hitTestable(),
      findsOneWidget,
      reason: 'it is on the screen and nothing lies over it',
    );
  }

  /// Delete account from the Account: in the app's settings (every look
  /// has Settings), asked first.
  Future<void> deleteReachable(
    WidgetTester tester,
    TestApp app,
    String language,
  ) async {
    final l = words(language);
    final settings = find.text(l.settings);
    await tester.scrollUntilVisible(
      settings.first,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await TestApp.settle(tester, 5);
    await tester.tap(settings.hitTestable().first);
    await TestApp.settle(tester, 20);
    final delete = find.byKey(const ValueKey('account-delete'));
    await tester.scrollUntilVisible(
      delete,
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(delete);
    await TestApp.settle(tester, 10);
    expect(find.text(l.deleteAccountTitle), findsOneWidget);
    await tester.tap(find.text(l.cancel));
    await TestApp.settle(tester, 10);
  }

  /// Sign out: asked first (Cancel keeps the person signed in), then
  /// signed out, back to the signed-out app.
  Future<void> signsOut(
    WidgetTester tester,
    TestApp app,
    String language,
  ) async {
    final l = words(language);
    final signOut = find.byKey(const ValueKey('account-sign-out'));
    await reach(tester, signOut);
    expect(
      Directionality.of(tester.element(signOut)),
      language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
    );
    await tester.tap(signOut.hitTestable());
    await TestApp.settle(tester, 10);
    expect(find.text(l.logOutTitle), findsOneWidget);
    await tester.tap(find.text(l.cancel));
    await TestApp.settle(tester, 10);
    expect(app.container.read(authControllerProvider), isA<SignedIn>());
    await tester.tap(signOut.hitTestable());
    await TestApp.settle(tester, 10);
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text(l.logOut),
      ),
    );
    await TestApp.settle(tester, 20);
    expect(app.container.read(authControllerProvider), isA<SignedOut>());
    expect(find.byKey(const ValueKey('account-sign-out')), findsNothing);
  }

  final looks = <(String, Map<String, dynamic>?, AppType)>[
    ('the app\'s own list', null, AppType.store),
    for (final header in ['plain', 'card', 'cover', 'tiles', 'night'])
      (
        'the $header account menu',
        {
          'account_menu': {'header': header, 'items': <dynamic>[]},
        },
        AppType.store,
      ),
    (
      'the academy account menu',
      {
        'account_menu': {'header': 'academy', 'items': <dynamic>[]},
      },
      AppType.lms,
    ),
    for (final look in ['large', 'glass', 'photo', 'brand', 'petal'])
      (
        'the premium $look look',
        {
          'system': {'look': look},
        },
        AppType.store,
      ),
  ];

  group('167 every Account look, under the petal bar', () {
    for (final (name, screens, appType) in looks) {
      for (final language in ['en', 'ar', 'tr']) {
        testWidgets('$name in $language: Sign out shows, asks, signs out; '
            'Delete account is reachable', (tester) async {
          final app = await open(
            tester,
            shop(screens: screens, bar: petalBar),
            appType: appType,
            language: language,
          );
          await toAccount(tester, app);
          await deleteReachable(tester, app, language);
          await toAccount(tester, app);
          await signsOut(tester, app, language);
        });
      }
    }

    testWidgets('the classic bar too', (tester) async {
      final app = await open(tester, shop());
      await toAccount(tester, app);
      await signsOut(tester, app, 'en');
    });
  });

  group('167 a Studio page on the Account tab', () {
    FakeApi ownPage(List<Map<String, dynamic>> children) => shop(bar: petalBar)
      ..navigation = {
        ...navigationJson(
          tabs: [
            navTabJson('home', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('account', 'Me', 'person', {
              'type': 'page',
              'page_slug': 'me',
            }),
          ],
        ),
        'tab_bar': petalBar,
        'pages': [
          {
            'slug': 'home',
            'title': 'Home',
            'updated_at': '2026-10-13T18:00:00Z',
          },
          {'slug': 'me', 'title': 'Me', 'updated_at': '2026-10-13T18:00:00Z'},
        ],
      }
      ..pages = {
        'me': {
          ...appPageJson(blocks: []),
          'slug': 'me',
          'studio': {
            'background': '#24131B',
            'body': {
              'id': 'root',
              'type': 'column',
              'children': [
                for (var i = 0; i < 4; i++)
                  {
                    'id': 'block$i',
                    'type': 'column',
                    'height': 200,
                    'children': [
                      {'id': 't$i', 'type': 'text', 'text': 'Part $i'},
                    ],
                  },
                ...children,
              ],
            },
          },
        },
      };

    for (final language in ['en', 'ar', 'tr']) {
      testWidgets('without a Sign out of its own, the app adds Sign out and '
          'Delete account at its end ($language)', (tester) async {
        final app = await open(tester, ownPage([]), language: language);
        app.container.read(appRouterProvider).go('/page/me');
        await TestApp.settle(tester, 20);
        expect(find.text('Part 0'), findsOneWidget);
        final delete = find.byKey(const ValueKey('account-delete'));
        await reach(tester, delete);
        expect(find.byKey(const ValueKey('account-page-end')), findsOneWidget);
        await tester.tap(delete.hitTestable());
        await TestApp.settle(tester, 10);
        expect(find.text(words(language).deleteAccountTitle), findsOneWidget);
        await tester.tap(find.text(words(language).cancel));
        await TestApp.settle(tester, 10);
        await signsOut(tester, app, language);
      });
    }

    testWidgets('with its own Sign out element: that one, and no second', (
      tester,
    ) async {
      final app = await open(
        tester,
        ownPage([
          {
            'id': 'out',
            'type': 'button',
            'text': 'Leave',
            'action': {'type': 'sign_out'},
          },
        ]),
      );
      app.container.read(appRouterProvider).go('/page/me');
      await TestApp.settle(tester, 20);
      final leave = find.text('Leave');
      await reach(tester, leave);
      expect(find.byKey(const ValueKey('account-page-end')), findsNothing);
      await tester.tap(leave.hitTestable());
      await TestApp.settle(tester, 10);
      expect(find.text(words('en').logOutTitle), findsOneWidget);
      await tester.tap(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.text(words('en').logOut),
        ),
      );
      await TestApp.settle(tester, 20);
      expect(app.container.read(authControllerProvider), isA<SignedOut>());
    });
  });

  testWidgets('a page drawn around the account with a Sign out element: '
      'the account\'s own Sign out, last, and no second over it', (
    tester,
  ) async {
    final api =
        shop(
            screens: {
              'system': {'look': 'petal'},
            },
            bar: petalBar,
          )
          ..navigation = {
            ...navigationJson(
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
            ),
            'tab_bar': petalBar,
            'pages': [
              {
                'slug': 'home',
                'title': 'Home',
                'updated_at': '2026-10-13T18:00:00Z',
              },
              {
                'slug': 'account',
                'title': 'Account',
                'updated_at': '2026-10-13T18:00:00Z',
                'screen': 'account',
              },
            ],
          }
          ..pages = {
            'account': {
              ...appPageJson(blocks: []),
              'slug': 'account',
              'studio': {
                'screen': 'account',
                'body': {
                  'id': 'root',
                  'type': 'column',
                  'children': [
                    {
                      'id': 'out',
                      'type': 'button',
                      'text': 'Leave',
                      'action': {'type': 'sign_out'},
                    },
                  ],
                },
              },
            },
          };
    final app = await open(tester, api);
    await toAccount(tester, app);
    expect(
      find.byKey(const ValueKey('system-screen-account-petal')),
      findsOneWidget,
    );
    expect(find.text('Leave'), findsNothing);
    await signsOut(tester, app, 'en');
  });

  /// 167 The account pages of Studio's templates, as the platform makes
  /// them (test/support/signatures, written by
  /// platform/web/tests/unit/signature-looks.test.ts): the Account in the
  /// template's look and bar.
  group('167 the templates\' account pages', () {
    const kinds = {
      'flowers': AppType.store,
      'multi-vendor': AppType.store,
      'delivery': AppType.delivery,
      'food-delivery': AppType.food,
      'rides': AppType.rides,
      'taxi': AppType.rides,
      'premium-academy': AppType.lms,
      'teachers': AppType.lms,
      'school': AppType.school,
      'travel': AppType.travel,
    };
    for (final MapEntry(key: demo, value: appType) in kinds.entries) {
      for (final look in ['a', 'b']) {
        final file = 'test/support/signatures/${demo}_$look.json';
        testWidgets('$demo look $look', skip: !File(file).existsSync(), (
          tester,
        ) async {
          final template = StudioDemo.signature(demo, look);
          final api = template.apply(
            appType == AppType.store ? DemoApi.leqaa() : DemoApi.store(),
            appName: 'Demo',
            primaryColor: '#8E2445',
          );
          final app = await open(tester, api, appType: appType);
          await toAccount(tester, app);
          // The template's account page has its Sign out element, which
          // the account draws last, in its look: one Sign out.
          await deleteReachable(tester, app, 'en');
          await toAccount(tester, app);
          await signsOut(tester, app, 'en');
        });
      }
    }
  });
}
