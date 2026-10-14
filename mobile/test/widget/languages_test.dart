import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/language.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/shared/account/settings_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi languagesApi({List<String> available = const ['en', 'ar', 'tr']}) =>
    FakeApi(
      config: configJson(languages: languagesJson(available: available)),
    );

TextDirection directionOf(WidgetTester tester, Finder finder) =>
    Directionality.of(tester.element(finder.first));

void main() {
  testWidgets('switching to Arabic turns the app right to left', (
    tester,
  ) async {
    final api = languagesApi();
    final app = TestApp(signedIn: true, api: api);
    final semantics = tester.ensureSemantics();
    await app.pump(tester);
    expect(find.text('Search for a course'), findsOneWidget);
    expect(directionOf(tester, find.byType(Scaffold)), TextDirection.ltr);
    expect(api.count('getConfig'), 1);
    expect(api.count('getHome'), 1);

    final router = app.container.read(appRouterProvider);
    router.push('/account/settings');
    await TestApp.settle(tester);
    expect(find.text('English'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('language-tile')));
    await TestApp.settle(tester);
    // Each language in its own name.
    expect(find.text('Türkçe'), findsOneWidget);
    await tester.tap(find.text('العربية'));
    await TestApp.settle(tester);

    expect(directionOf(tester, find.byType(SettingsScreen)), TextDirection.rtl);
    expect(find.text('الإعدادات'), findsOneWidget);
    expect(find.text('Settings'), findsNothing);
    expect(app.container.read(appLanguageProvider), 'ar');
    expect(
      app.container
          .read(sharedPreferencesProvider)
          .getString('settings.language'),
      'ar',
    );
    // The config, the pages and the content are fetched again in Arabic.
    expect(api.count('getConfig'), 2);
    expect(api.count('getPages'), 2);

    router.pop();
    await TestApp.settle(tester);
    expect(tester.takeException(), isNull);
    // The tabs and home screen are in Arabic too.
    expect(find.text('الرئيسية'), findsWidgets);
    expect(find.text('ابحث عن دورة'), findsOneWidget);
    expect(api.count('getHome'), greaterThan(1));
    semantics.dispose();
  });

  testWidgets('every main screen renders right to left in Arabic', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(320, 568) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final app = TestApp(
      signedIn: true,
      api: languagesApi(),
      preferences: {'settings.language': 'ar'},
    );
    final semantics = tester.ensureSemantics();
    await app.pump(tester);
    expect(tester.takeException(), isNull);
    expect(directionOf(tester, find.byType(Scaffold)), TextDirection.rtl);

    for (final tab in ['الدورات', 'دوراتي', 'الحساب']) {
      await tester.tap(find.bySemanticsLabel(tab).last);
      await TestApp.settle(tester);
      expect(tester.takeException(), isNull, reason: tab);
    }
    final router = app.container.read(appRouterProvider);
    for (final location in [
      '/account/settings',
      '/course/1',
      '/lesson/107',
      '/quiz/201',
      '/notifications',
    ]) {
      router.push(location);
      await TestApp.settle(tester);
      expect(tester.takeException(), isNull, reason: location);
      router.pop();
      await TestApp.settle(tester);
    }
    semantics.dispose();
  });

  testWidgets('first run uses the device language when offered', (
    tester,
  ) async {
    tester.platformDispatcher.localesTestValue = const [Locale('tr', 'TR')];
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);
    final app = TestApp(signedIn: true, api: languagesApi());
    await app.pump(tester);
    expect(app.container.read(appLanguageProvider), 'tr');
    expect(find.text('Kurs ara'), findsOneWidget);
  });

  testWidgets('a device language the client did not turn on falls back to '
      'the default', (tester) async {
    tester.platformDispatcher.localesTestValue = const [Locale('tr', 'TR')];
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);
    final app = TestApp(
      signedIn: true,
      api: FakeApi(
        config: configJson(
          languages: languagesJson(
            defaultCode: 'ar',
            available: const ['en', 'ar'],
          ),
        ),
      ),
    );
    await app.pump(tester);
    expect(app.container.read(appLanguageProvider), 'ar');
  });

  for (final (name, languages) in [
    ('no languages in /config', null),
    ('one language', languagesJson(available: const ['en'])),
  ]) {
    testWidgets('the picker is hidden with $name', (tester) async {
      final app = TestApp(
        signedIn: true,
        api: FakeApi(config: configJson(languages: languages)),
        preferences: {'settings.language': 'ar'},
      );
      await app.pump(tester);
      // A saved language the client no longer offers isn't used.
      expect(app.container.read(appLanguageProvider), 'en');
      app.container.read(appRouterProvider).push('/account/settings');
      await TestApp.settle(tester);
      expect(find.text('Settings'), findsOneWidget);
      expect(find.byKey(const ValueKey('language-tile')), findsNothing);
      expect(find.text('Language'), findsNothing);
    });
  }

  for (final template in AppTemplate.values) {
    testWidgets('dashboard pages in Arabic, '
        '${template.name}', (tester) async {
      tester.view
        ..physicalSize = const Size(320, 568) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final pages = languagesApi()
        ..navigation = navigationJson()
        ..pages = {'home': appPageJson()};
      final app = TestApp(
        signedIn: true,
        template: template,
        api: pages,
        preferences: {'settings.language': 'ar'},
      );
      await app.pump(tester);
      final page = find.byType(Scrollable).first;
      for (var i = 0; i < 12; i++) {
        await tester.drag(page, const Offset(0, -300));
        await tester.pump();
        expect(tester.takeException(), isNull, reason: 'page scroll $i');
      }
    });

    testWidgets('Real estate screens in Arabic, ${template.name}', (
      tester,
    ) async {
      tester.view
        ..physicalSize = const Size(320, 568) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final realEstate = FakeApi(
        config: configJson(
          lms: null,
          languages: languagesJson(),
          listings: listingsConfigJson(),
        ),
      );
      final second = TestApp(
        signedIn: true,
        template: template,
        appType: AppType.realEstate,
        api: realEstate,
        preferences: {'settings.language': 'ar'},
      );
      await second.pump(tester);
      expect(tester.takeException(), isNull, reason: 'search');
      expect(find.text('للبيع'), findsWidgets);
      final router = second.container.read(appRouterProvider);
      for (final location in [
        '/favorites',
        '/messages',
        '/listing/42',
        '/messages/7',
      ]) {
        router.push(location);
        await TestApp.settle(tester);
        expect(tester.takeException(), isNull, reason: location);
        router.pop();
        await TestApp.settle(tester);
      }
    });
  }
}
