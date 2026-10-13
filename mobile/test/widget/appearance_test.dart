import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// The look from `Config.appearance` replaces the build's look without a
/// new build, and every corner and card style renders cleanly.
void main() {
  ThemeMode modeOf(WidgetTester tester) =>
      tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode!;

  testWidgets('template and mode come from /config', (tester) async {
    final app = TestApp(
      signedIn: true,
      api: FakeApi(
        config: configJson(
          appearance: appearanceJson(
            template: 'bold',
            themeMode: 'dark',
            userCanChangeMode: false,
          ),
        ),
      ),
      // A saved choice is ignored while the client locks the mode.
      preferences: {'settings.theme_mode': 'light'},
    );
    await app.pump(tester);

    // The build config says Classic; the dashboard says Bold.
    expect(find.text('What do you want to learn?'), findsOneWidget);
    expect(modeOf(tester), ThemeMode.dark);

    app.container.read(appRouterProvider).push('/account/settings');
    await TestApp.settle(tester);
    expect(find.text('Video'), findsOneWidget);
    expect(find.text('Appearance'), findsNothing);
  });

  testWidgets('the student can change the mode when allowed', (tester) async {
    final app = TestApp(
      signedIn: true,
      api: FakeApi(
        config: configJson(appearance: appearanceJson(themeMode: 'dark')),
      ),
    );
    await app.pump(tester);
    expect(modeOf(tester), ThemeMode.dark);

    app.container.read(appRouterProvider).push('/account/settings');
    await TestApp.settle(tester);
    await tester.tap(find.text('Light'));
    await TestApp.settle(tester);
    expect(modeOf(tester), ThemeMode.light);
  });

  for (final corners in CornerStyle.values) {
    for (final cards in CardStyle.values) {
      for (final dark in [false, true]) {
        final name =
            '${corners.name} corners, ${cards.name} cards, '
            '${dark ? 'dark' : 'light'}';
        testWidgets(name, (tester) async {
          final view = tester.view
            ..physicalSize = const Size(320, 568) * 2
            ..devicePixelRatio = 2;
          addTearDown(view.reset);
          final app = TestApp(
            signedIn: true,
            api: FakeApi(
              config: configJson(
                appearance: appearanceJson(
                  template: 'classic',
                  themeMode: dark ? 'dark' : 'light',
                  corners: corners.name,
                  cards: cards.name,
                ),
              ),
            ),
          );
          final semantics = tester.ensureSemantics();
          await app.pump(tester);
          expect(tester.takeException(), isNull, reason: 'home');

          for (final tab in ['Courses', 'My Courses', 'Account']) {
            await tester.tap(find.bySemanticsLabel(tab).last);
            await TestApp.settle(tester);
            expect(tester.takeException(), isNull, reason: tab);
          }
          final router = app.container.read(appRouterProvider);
          for (final location in ['/account/settings', '/course/1']) {
            router.push(location);
            await TestApp.settle(tester);
            expect(tester.takeException(), isNull, reason: location);
            router.pop();
            await TestApp.settle(tester);
          }
          semantics.dispose();
        });
      }
    }
  }
}
