import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 129.1–129.8 Studio's premium motion and media in the app: the slider's
/// looks (a frosted pill, the slow zoom, still off the screen), stories, a
/// ticker, a video and a parallax banner, a gallery with its viewer, before
/// and after, and entrances played when an element first shows; light and
/// dark, right to left, and still on phones that reduce motion.
void main() {
  Map<String, dynamic> text(String id, String value) => {
    'id': id,
    'type': 'text',
    'text': value,
  };

  Map<String, dynamic> page(List<Map<String, dynamic>> children) => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  FakeApi api(List<Map<String, dynamic>> children) =>
      FakeApi(
          config: configJson(
            languages: languagesJson(available: const ['en', 'ar', 'tr']),
          ),
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
        ..pages = {'home': page(children)};

  Future<TestApp> open(
    WidgetTester tester,
    List<Map<String, dynamic>> children, {
    bool dark = false,
    String language = 'en',
  }) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api(children),
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

  Map<String, dynamic> slide(String id, String words) => {
    'id': id,
    'type': 'photo_hero',
    'image_url': 'https://cdn.example.com/$id.jpg',
    'height': 300,
    'scrim': {'color': '#000000', 'from': 0.2, 'to': 0.8},
    'align': 'end',
    'children': [text('$id-words', words)],
  };

  Map<String, dynamic> slider({
    String indicator = 'pill',
    bool kenBurns = true,
    bool autoplay = false,
  }) => {
    'id': 'hero',
    'type': 'slider',
    'height': 300,
    'indicator': indicator,
    'ken_burns': kenBurns,
    'autoplay': autoplay,
    'interval_ms': 2000,
    'children': [slide('one', 'First slide'), slide('two', 'Second slide')],
  };

  group('129.1 the slider premium looks', () {
    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets('shows its dots in a frosted pill, the open photo zooming '
          '(${dark ? 'dark' : 'light'}, $language)', (tester) async {
        await open(tester, [slider()], dark: dark, language: language);
        expect(find.byKey(const ValueKey('studio-pill-hero')), findsOneWidget);
        expect(find.byType(BackdropFilter), findsWidgets);
        // Only the open slide's photo zooms.
        expect(find.byKey(const ValueKey('studio-ken-burns')), findsOneWidget);
        expect(find.text('First slide'), findsOneWidget);
        final pill = tester.getRect(
          find.byKey(const ValueKey('studio-pill-hero')),
        );
        final cover = tester.getRect(
          find.byKey(const ValueKey('studio-cover-one')),
        );
        expect(pill.center.dx, closeTo(cover.center.dx, 1));
        expect(
          Directionality.of(
            tester.element(find.byKey(const ValueKey('studio-pill-hero'))),
          ),
          language == 'ar' ? TextDirection.rtl : TextDirection.ltr,
        );
        expect(pill.bottom, closeTo(cover.bottom - 12, 1));
      });
    }

    testWidgets('stands still on a phone that reduces motion', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await open(tester, [slider(autoplay: true)]);
      expect(find.byKey(const ValueKey('studio-ken-burns')), findsNothing);
      await tester.pump(const Duration(seconds: 3));
      await TestApp.settle(tester);
      expect(find.text('First slide'), findsOneWidget);
    });

    testWidgets('moves on by itself on the screen, not off it', (tester) async {
      await open(tester, [slider(autoplay: true, indicator: 'progress')]);
      await tester.pump(const Duration(milliseconds: 2100));
      await TestApp.settle(tester, 20);
      expect(find.text('Second slide'), findsOneWidget);
    });

    testWidgets('waits while it is below the fold', (tester) async {
      await open(tester, [
        {'id': 'tall', 'type': 'spacer', 'height': 2000},
        slider(autoplay: true, indicator: 'progress'),
      ]);
      await tester.pump(const Duration(milliseconds: 2100));
      await TestApp.settle(tester, 20);
      expect(find.text('First slide', skipOffstage: false), findsOneWidget);
      expect(find.text('Second slide', skipOffstage: false), findsNothing);
    });
  });
}
