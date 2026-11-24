import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/features/opening/opening_page.dart';
import 'package:yallapp_community/l10n/app_localizations.dart';
import 'package:yallapp_community/core/routing/paths.dart';

import '../support/app_shots.dart';
import '../support/finders.dart';
import '../support/test_app.dart';

/// Area D's screens at 390 × 844, 2x, beside design/mobile.html and
/// design/opening.html. Every run checks they draw without an error;
/// `YC_SHOTS_DIR=<dir> flutter test test/shots` also writes them.
void main() {
  // Each moment of the opening, drawn as it is at that time.
  for (final (name, at) in [
    ('opening-0.0s', 0.0),
    ('opening-0.6s', 0.5),
    ('opening-1.2s', 1.0),
  ]) {
    testWidgets(name, (tester) async {
      designInsets(tester);
      final app = await TestApp.start(tester, signedIn: false);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: app.container,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: OpeningPage(at: at),
          ),
        ),
      );
      await tester.pump();
      await appShot(tester, name);
    });
  }

  for (final dark in [false, true]) {
    final theme = dark ? ThemeMode.dark : ThemeMode.light;
    final suffix = dark ? '-dark' : '';

    testWidgets('welcome$suffix', (tester) async {
      designInsets(tester);
      await TestApp.start(tester, signedIn: false, theme: theme);
      await appShot(tester, 'welcome$suffix');
    });

    testWidgets('home$suffix', (tester) async {
      designInsets(tester);
      await TestApp.start(tester, theme: theme);
      await appShot(tester, 'home$suffix');
    });

    testWidgets('menu$suffix', (tester) async {
      designInsets(tester);
      await TestApp.start(tester, theme: theme);
      await tap(tester, 'header-menu');
      await TestApp.settle(tester, 8);
      await appShot(tester, 'menu$suffix');
    });

    testWidgets('profile$suffix', (tester) async {
      designInsets(tester);
      final app = await TestApp.start(tester, theme: theme);
      app.go(Paths.me);
      await TestApp.settle(tester);
      await appShot(tester, 'profile$suffix');
    });

    testWidgets('member$suffix', (tester) async {
      designInsets(tester);
      final app = await TestApp.start(tester, theme: theme);
      app.go(Paths.member('m-nour'));
      await TestApp.settle(tester);
      await appShot(tester, 'member$suffix');
    });

    testWidgets('settings$suffix', (tester) async {
      designInsets(tester);
      final app = await TestApp.start(tester, theme: theme);
      app.go(Paths.settings);
      await TestApp.settle(tester);
      await appShot(tester, 'settings$suffix');
    });

    testWidgets('create$suffix', (tester) async {
      designInsets(tester);
      await TestApp.start(tester, theme: theme);
      await tap(tester, 'tab-create');
      await appShot(tester, 'create$suffix');
    });

    testWidgets('signup$suffix', (tester) async {
      designInsets(tester);
      await TestApp.start(tester, signedIn: false, theme: theme);
      await tap(tester, 'auth-email');
      await appShot(tester, 'signup$suffix');
    });
  }

  for (final language in ['ar', 'tr']) {
    testWidgets('welcome-$language', (tester) async {
      designInsets(tester);
      await TestApp.start(tester, signedIn: false, language: language);
      await appShot(tester, 'welcome-$language');
    });

    testWidgets('home-$language', (tester) async {
      designInsets(tester);
      await TestApp.start(tester, language: language);
      await appShot(tester, 'home-$language');
    });

    testWidgets('menu-$language', (tester) async {
      designInsets(tester);
      await TestApp.start(tester, language: language);
      await tap(tester, 'header-menu');
      await appShot(tester, 'menu-$language');
    });
  }
}
