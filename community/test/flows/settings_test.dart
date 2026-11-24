import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/api/fake_community_api.dart';
import 'package:yallapp_community/core/providers.dart';
import 'package:yallapp_community/core/routing/paths.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

void main() {
  testWidgets('language: Arabic turns the app right to left', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.settings);
    await TestApp.settle(tester);
    await tap(tester, 'settings-language');
    await tap(tester, 'language-ar');
    expect(app.container.read(languageProvider), 'ar');
    expect(
      Directionality.of(tester.element(key('settings-language'))),
      TextDirection.rtl,
    );
    expect(api.calls, contains('updateMe:language=ar'));
  });

  testWidgets('theme: dark, kept with the account', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.settings);
    await TestApp.settle(tester);
    await tester.tap(find.text('Dark'));
    await TestApp.settle(tester);
    expect(app.container.read(themeModeProvider), ThemeMode.dark);
    expect(api.calls, contains('updateMe:theme=dark'));
  });

  testWidgets('nothing about paid things or unlocking', (tester) async {
    // Every tutorial is free (the owner, 24 November 2026).
    final app = await TestApp.start(tester);
    app.go(Paths.settings);
    await TestApp.settle(tester);
    expect(key('settings-paid-note'), findsNothing);
    expect(key('locked'), findsNothing);
    expect(find.textContaining('website'), findsNothing);
    expect(find.textContaining('Unlocks'), findsNothing);
  });

  testWidgets('delete account with the password signs out', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.settings);
    await TestApp.settle(tester);
    await tap(tester, 'settings-delete');
    await tester.enterText(key('delete-password'), api.password);
    await tap(tester, 'delete-confirm');
    expect(api.calls, contains('delete:password'));
    expect(app.path, Paths.welcome);
  });

  testWidgets('blocked members list, unblock', (tester) async {
    final api = FakeCommunityApi();
    await api.block('m-karim');
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.blocked);
    await TestApp.settle(tester);
    await tap(tester, 'unblock-m-karim');
    expect(api.calls, contains('unblock:m-karim'));
    expect(key('unblock-m-karim'), findsNothing);
  });
}
