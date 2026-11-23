import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../screenshots/support/demo_api.dart';
import '../screenshots/support/studio_demo.dart';
import '../support/test_app.dart';

/// 223 Lujain's and Toota's templates C and D drawn by the app, as the
/// platform makes them (test/support/signatures/clothes_c.json and the
/// others, written by platform/web/tests/unit/signature-looks.test.ts): the
/// home and the category menu of each, on a 390-point phone, in English and
/// Arabic, light and dark, with nothing running past its room.
void main() {
  const looks = [
    ('clothes', 'c'),
    ('clothes', 'd'),
    ('kids', 'c'),
    ('kids', 'd'),
  ];

  /// What the app reported while drawing: layout overflows only (the
  /// pictures don't load in tests, which is not what is checked here).
  Future<List<String>> drawn(
    WidgetTester tester,
    String demo,
    String look, {
    required String language,
    required bool dark,
    required String page,
  }) async {
    tester.view
      ..devicePixelRatio = 3
      ..physicalSize = const Size(390, 844) * 3;
    addTearDown(tester.view.reset);
    final overflows = <String>[];
    final before = FlutterError.onError;
    FlutterError.onError = (details) {
      final text = details.exceptionAsString();
      if (text.contains('overflowed')) overflows.add(text.split('\n').first);
    };
    addTearDown(() => FlutterError.onError = before);
    StudioDemo.language = language;
    addTearDown(() => StudioDemo.language = 'en');
    final template = StudioDemo.signature(demo, look);
    final api = template.apply(
      DemoApi.store(),
      appName: demo == 'clothes' ? 'Lujain' : 'Toota',
      primaryColor: '#7A1F30',
    );
    final app = TestApp(
      appType: AppType.store,
      api: api,
      signedIn: true,
      preferences: {
        'settings.language': language,
        'settings.theme_mode': dark ? 'dark' : 'light',
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    app.container.read(appRouterProvider).go('/page/$page');
    await TestApp.settle(tester, 20);
    // Scrolled through, so every part of the page is laid out.
    final scrollable = find.byType(Scrollable).first;
    for (var i = 0; i < 6; i++) {
      await tester.drag(scrollable, const Offset(0, -500), warnIfMissed: false);
      await TestApp.settle(tester, 4);
    }
    tester.takeException();
    return overflows;
  }

  for (final (demo, look) in looks) {
    for (final language in ['en', 'ar']) {
      for (final dark in [false, true]) {
        final mode = dark ? 'dark' : 'light';
        testWidgets('$demo $look: the home, $language, $mode', (tester) async {
          expect(
            await drawn(
              tester,
              demo,
              look,
              language: language,
              dark: dark,
              page: 'home',
            ),
            isEmpty,
          );
        });
      }
      testWidgets('$demo $look: the category menu, $language', (tester) async {
        expect(
          await drawn(
            tester,
            demo,
            look,
            language: language,
            dark: false,
            page: 'menu',
          ),
          isEmpty,
        );
      });
    }
  }

  testWidgets('RUNWAY opens on its looks under the header, in Arabic too', (
    tester,
  ) async {
    await drawn(
      tester,
      'clothes',
      'c',
      language: 'ar',
      dark: false,
      page: 'home',
    );
    // The first look's words, as the platform wrote them in Arabic.
    expect(find.text('أخضر في كامل تفتّحه', skipOffstage: false), findsWidgets);
  });

  testWidgets(
    'the story world\'s wavy edges are drawn: half-bubbles across the phone',
    (tester) async {
      await drawn(
        tester,
        'kids',
        'c',
        language: 'en',
        dark: false,
        page: 'home',
      );
      final mint = find.byWidgetPredicate(
        (w) =>
            w is DecoratedBox &&
            w.decoration is BoxDecoration &&
            (w.decoration as BoxDecoration).color?.toARGB32() == 0xFFBFEBD9 &&
            (w.decoration as BoxDecoration).borderRadius != null,
        skipOffstage: false,
      );
      final halves = mint
          .evaluate()
          .map((e) => (e.renderObject! as RenderBox).size)
          .where((size) => size.height == 20)
          .toList();
      expect(halves.length, greaterThanOrEqualTo(10));
      for (final size in halves) {
        expect(size.width, 40);
      }
    },
  );

  testWidgets('the story world greets with Tooti and the ages', (tester) async {
    await drawn(tester, 'kids', 'c', language: 'en', dark: false, page: 'home');
    expect(find.text("Hi! I'm Tooti.", skipOffstage: false), findsOneWidget);
    for (final age in ['0–2', '3–5', '6–9', '10+']) {
      expect(find.text(age, skipOffstage: false), findsWidgets, reason: age);
    }
  });
}
