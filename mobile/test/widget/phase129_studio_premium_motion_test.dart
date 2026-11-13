import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';
import 'package:video_player_platform_interface/video_player_platform_interface.dart';
import 'package:yallapp/core/services/data_saver.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/storage/local_settings.dart';

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
    List<Override> overrides = const [],
  }) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api(children),
      signedIn: true,
      overrides: overrides,
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

  group('129.2 stories', () {
    Map<String, dynamic> stories() => {
      'id': 'st',
      'type': 'stories',
      'interval_ms': 3000,
      'slides': [
        {
          'image_url': 'https://cdn.example.com/a.jpg',
          'heading': 'New',
          'subheading': 'This week only',
          'action': {'type': 'url', 'url': 'https://example.com/new'},
        },
        {'image_url': 'https://cdn.example.com/b.jpg', 'heading': 'Offers'},
        {'image_url': 'https://cdn.example.com/c.jpg', 'heading': 'Tips'},
      ],
    };

    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets(
        'a row of rings that opens them full screen, one after another '
        '(${dark ? 'dark' : 'light'}, $language)',
        (tester) async {
          await open(tester, [stories()], dark: dark, language: language);
          expect(find.text('Offers'), findsOneWidget);
          final first = tester.getRect(
            find.byKey(const ValueKey('studio-story-ring-st-0')),
          );
          final second = tester.getRect(
            find.byKey(const ValueKey('studio-story-ring-st-1')),
          );
          // The first story at the start: the right in Arabic.
          expect(
            language == 'ar'
                ? first.left > second.left
                : first.left < second.left,
            isTrue,
          );
          expect(first.width, 76);
          await tester.tap(find.byKey(const ValueKey('studio-story-st-0')));
          await TestApp.settle(tester);
          expect(
            find.byKey(const ValueKey('studio-story-viewer-st')),
            findsOneWidget,
          );
          expect(find.text('This week only'), findsOneWidget);
          expect(find.byKey(const ValueKey('studio-story-open')), findsOne);
          // A tap on the end side moves on.
          final size = tester.getSize(find.byType(Scaffold).last);
          final end = language == 'ar' ? 40.0 : size.width - 40;
          await tester.tapAt(Offset(end, size.height / 2));
          await TestApp.settle(tester);
          expect(find.byKey(const ValueKey('studio-story-photo-1')), findsOne);
          // On its own after its time, then closing after the last.
          await tester.pump(const Duration(milliseconds: 3100));
          await TestApp.settle(tester);
          expect(find.byKey(const ValueKey('studio-story-photo-2')), findsOne);
          await tester.pump(const Duration(milliseconds: 3100));
          await TestApp.settle(tester, 20);
          expect(
            find.byKey(const ValueKey('studio-story-viewer-st')),
            findsNothing,
          );
        },
      );
    }

    testWidgets('holding pauses, swiping down closes, seen rings turn quiet', (
      tester,
    ) async {
      final app = await open(tester, [stories()]);
      await tester.tap(find.byKey(const ValueKey('studio-story-st-0')));
      await TestApp.settle(tester);
      final center = tester.getCenter(find.byType(Scaffold).last);
      final hold = await tester.startGesture(center);
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pump(const Duration(seconds: 4));
      expect(find.byKey(const ValueKey('studio-story-photo-0')), findsOne);
      await hold.up();
      await TestApp.settle(tester);
      await tester.fling(find.byType(Scaffold).last, const Offset(0, 300), 900);
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('studio-story-viewer-st')),
        findsNothing,
      );
      final prefs = app.container.read(sharedPreferencesProvider);
      expect(prefs.getStringList('studio.stories_seen'), [
        'st|https://cdn.example.com/a.jpg',
      ]);
      final ring = tester.widget<Container>(
        find
            .descendant(
              of: find.byKey(const ValueKey('studio-story-ring-st-0')),
              matching: find.byType(Container),
            )
            .first,
      );
      expect((ring.decoration! as BoxDecoration).gradient, isNull);
      final unseen = tester.widget<Container>(
        find
            .descendant(
              of: find.byKey(const ValueKey('studio-story-ring-st-1')),
              matching: find.byType(Container),
            )
            .first,
      );
      expect((unseen.decoration! as BoxDecoration).gradient, isNotNull);
    });

    testWidgets('moves on only when tapped on a phone that reduces motion', (
      tester,
    ) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await open(tester, [stories()]);
      await tester.tap(find.byKey(const ValueKey('studio-story-st-0')));
      await TestApp.settle(tester);
      await tester.pump(const Duration(seconds: 4));
      expect(find.byKey(const ValueKey('studio-story-photo-0')), findsOne);
      await tester.tap(find.byKey(const ValueKey('studio-story-close')));
      await TestApp.settle(tester);
      expect(
        find.byKey(const ValueKey('studio-story-viewer-st')),
        findsNothing,
      );
    });
  });

  group('129.4 the video banner', () {
    late _Video video;
    setUp(() => VideoPlayerPlatform.instance = video = _Video());

    Map<String, dynamic> banner({bool autoplay = true}) => {
      'id': 'vid',
      'type': 'video_hero',
      'video_url': 'https://cdn.example.com/loop.mp4',
      'image_url': 'https://cdn.example.com/poster.jpg',
      'autoplay': autoplay,
      'height': 400,
      'scrim': {'color': '#000000', 'from': 0.2, 'to': 0.8},
      'align': 'end',
      'padding': {'top': 20, 'end': 20, 'bottom': 30, 'start': 20},
      'children': [text('v-title', 'See it in motion')],
    };

    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets(
        'plays muted and looping by itself, its words over it, a button to '
        'pause (${dark ? 'dark' : 'light'}, $language)',
        (tester) async {
          await open(tester, [banner()], dark: dark, language: language);
          expect(find.text('See it in motion'), findsOneWidget);
          expect(find.byKey(const ValueKey('studio-scrim-vid')), findsOne);
          expect(find.byKey(const ValueKey('studio-video-vid')), findsOne);
          expect(
            video.calls,
            containsAllInOrder(['loop', 'volume 0.0', 'play']),
          );
          final button = find.byKey(const ValueKey('studio-video-button-vid'));
          final cover = tester.getRect(
            find.byKey(const ValueKey('studio-media-cover-vid')),
          );
          // In its top end corner: the right, or the left in Arabic.
          final at = tester.getRect(button);
          expect(
            language == 'ar'
                ? at.left - cover.left < 70
                : cover.right - at.right < 70,
            isTrue,
          );
          if (language == 'en') {
            expect(find.byTooltip('Pause the video'), findsOneWidget);
          }
          await tester.tap(button);
          await TestApp.settle(tester);
          expect(video.calls.last, 'pause');
          expect(find.byKey(const ValueKey('studio-video-vid')), findsNothing);
        },
      );
    }

    testWidgets('waits on its poster on a phone that saves data', (
      tester,
    ) async {
      await open(
        tester,
        [banner()],
        overrides: [dataSaverProvider.overrideWith((ref) async => true)],
      );
      expect(video.calls, isNot(contains('play')));
      expect(find.byKey(const ValueKey('studio-video-vid')), findsNothing);
      await tester.tap(find.byTooltip('Play the video'));
      await TestApp.settle(tester);
      expect(video.calls.last, 'play');
    });

    testWidgets('waits on a phone that reduces motion, and below the fold', (
      tester,
    ) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await open(tester, [banner()]);
      expect(video.calls, isNot(contains('play')));
    });

    testWidgets('plays only once scrolled onto the screen', (tester) async {
      await open(tester, [
        {'id': 'tall', 'type': 'spacer', 'height': 1400},
        banner(),
      ]);
      expect(video.calls, isNot(contains('play')));
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -1200));
      await TestApp.settle(tester, 20);
      expect(video.calls, contains('play'));
    });
  });

  group('129.7 the parallax banner', () {
    Map<String, dynamic> banner({bool glass = true}) => {
      'id': 'par',
      'type': 'parallax_banner',
      'image_url': 'https://cdn.example.com/photo.jpg',
      'height': 300,
      'glass': glass,
      'parallax': {'speed': 0.5},
      'align': 'center',
      'padding': {'top': 20, 'end': 20, 'bottom': 20, 'start': 20},
      'children': [text('p-title', 'Crafted with care')],
    };

    double offset(WidgetTester tester) => tester
        .widget<Transform>(find.byKey(const ValueKey('studio-parallax-photo')))
        .transform
        .getTranslation()
        .y;

    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets(
        'its photo moves slower than the page, its words in a frosted '
        'panel (${dark ? 'dark' : 'light'}, $language)',
        (tester) async {
          await open(
            tester,
            [
              {'id': 'top', 'type': 'spacer', 'height': 500},
              banner(),
              {'id': 'foot', 'type': 'spacer', 'height': 1200},
            ],
            dark: dark,
            language: language,
          );
          expect(find.byKey(const ValueKey('studio-glass')), findsOneWidget);
          expect(find.text('Crafted with care'), findsOneWidget);
          final before = offset(tester);
          final photoBefore = tester.getRect(
            find.descendant(
              of: find.byKey(const ValueKey('studio-parallax-photo')),
              matching: find.byType(Image),
            ),
          );
          await tester.drag(
            find.byType(Scrollable).first,
            const Offset(0, -200),
          );
          await TestApp.settle(tester);
          final moved = offset(tester) - before;
          final photoAfter = tester.getRect(
            find.descendant(
              of: find.byKey(const ValueKey('studio-parallax-photo')),
              matching: find.byType(Image),
            ),
          );
          // The page moved up 200; the photo less than that.
          expect(moved, greaterThan(0));
          final travelled = photoBefore.top - photoAfter.top;
          expect(travelled, greaterThan(100));
          expect(travelled, lessThan(200));
        },
      );
    }

    testWidgets('stands still on a phone that reduces motion', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await open(tester, [
        {'id': 'top', 'type': 'spacer', 'height': 500},
        banner(glass: false),
        {'id': 'foot', 'type': 'spacer', 'height': 1200},
      ]);
      expect(find.byKey(const ValueKey('studio-glass')), findsNothing);
      final before = offset(tester);
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -200));
      await TestApp.settle(tester);
      expect(offset(tester), before);
    });
  });

  group('129.5 the gallery', () {
    Map<String, dynamic> gallery(String layout, {int count = 5}) => {
      'id': 'gal',
      'type': 'gallery',
      'gap': 8,
      'gallery': {'layout': layout, 'radius': 18, 'captions': true},
      'images': [
        for (var i = 0; i < count; i++)
          {
            'image_url': 'https://cdn.example.com/p$i.jpg',
            'caption': 'Photo $i',
          },
      ],
    };
    Rect tile(WidgetTester tester, int i) =>
        tester.getRect(find.byKey(ValueKey('studio-gallery-gal-$i')));

    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets(
        'a bento: a big photo beside two small ones, then a wide one, '
        'opened full screen (${dark ? 'dark' : 'light'}, $language)',
        (tester) async {
          await open(
            tester,
            [gallery('bento')],
            dark: dark,
            language: language,
          );
          final big = tile(tester, 0);
          final small = tile(tester, 1);
          final wide = tile(tester, 3);
          expect(big.height, closeTo(small.height * 2 + 8, 1));
          expect(wide.width, greaterThan(big.width));
          // The big one at the start: the right in Arabic.
          expect(
            language == 'ar' ? big.left > small.left : big.left < small.left,
            isTrue,
          );
          expect(find.text('Photo 0'), findsOneWidget);
          await tester.tap(find.byKey(const ValueKey('studio-gallery-gal-2')));
          await TestApp.settle(tester);
          expect(find.byKey(const ValueKey('gallery-viewer')), findsOne);
          expect(find.text('3 / 5'), findsOneWidget);
          await tester.tap(find.byKey(const ValueKey('gallery-close')));
          await TestApp.settle(tester);
          expect(find.byKey(const ValueKey('gallery-viewer')), findsNothing);
        },
      );
    }

    testWidgets('masonry columns of different heights', (tester) async {
      await open(tester, [gallery('masonry', count: 4)]);
      expect(tile(tester, 0).left, lessThan(tile(tester, 1).left));
      expect(tile(tester, 0).height, isNot(tile(tester, 1).height));
      expect(tile(tester, 2).top, greaterThan(tile(tester, 0).bottom));
    });

    testWidgets('a filmstrip of tall photos in a row', (tester) async {
      await open(tester, [gallery('filmstrip', count: 6)]);
      final first = tile(tester, 0);
      expect(first.height, 220);
      expect(first.width, closeTo(165, 1));
      expect(tile(tester, 1).top, first.top);
    });
  });

  group('129.6 before and after', () {
    Map<String, dynamic> compare() => {
      'id': 'ba',
      'type': 'before_after',
      'aspect_ratio': 1.5,
      'radius': 20,
      'compare': {'at': 30},
      'images': [
        {'image_url': 'https://cdn.example.com/b.jpg', 'caption': 'Before'},
        {'image_url': 'https://cdn.example.com/a.jpg', 'caption': 'After'},
      ],
    };

    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets('a divider a finger drags, the labels at the corners '
          '(${dark ? 'dark' : 'light'}, $language)', (tester) async {
        await open(tester, [compare()], dark: dark, language: language);
        final box = tester.getRect(
          find.byKey(const ValueKey('studio-before-after-ba')),
        );
        Offset handle() => tester.getCenter(
          find.byKey(const ValueKey('studio-compare-handle-ba')),
        );
        final start = language == 'ar'
            ? box.right - box.width * 0.3
            : box.left + box.width * 0.3;
        expect(handle().dx, closeTo(start, 1));
        expect(find.text('Before'), findsOneWidget);
        expect(
          language == 'ar'
              ? tester.getRect(find.text('Before')).right > box.center.dx
              : tester.getRect(find.text('Before')).left < box.center.dx,
          isTrue,
        );
        await tester.drag(
          find.byKey(const ValueKey('studio-compare-handle-ba')),
          Offset(language == 'ar' ? -80 : 80, 0),
        );
        await TestApp.settle(tester);
        expect((handle().dx - start).abs(), greaterThan(40));
      });
    }

    testWidgets('screen readers move the divider as a slider', (tester) async {
      final semantics = tester.ensureSemantics();
      await open(tester, [compare()]);
      expect(
        tester.getSemantics(
          find.byKey(const ValueKey('studio-before-after-ba')),
        ),
        matchesSemantics(
          isSlider: true,
          label: 'Before and after: Before and After',
          hint: 'Drag to compare',
          value: '30%',
          increasedValue: '40%',
          decreasedValue: '20%',
          hasIncreaseAction: true,
          hasDecreaseAction: true,
        ),
      );
      semantics.dispose();
    });
  });

  group('129.8 entrances', () {
    Map<String, dynamic> rising(String id, String words) => {
      ...text(id, words),
      'motion': {'enter': 'slide_up', 'duration_ms': 400},
    };
    double opacityOf(WidgetTester tester, String words) => tester
        .widget<Opacity>(
          find
              .ancestor(
                of: find.text(words, skipOffstage: false),
                matching: find.byType(Opacity),
              )
              .first,
        )
        .opacity;

    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets(
        'an element rises in once when it first comes onto the screen '
        '(${dark ? 'dark' : 'light'}, $language)',
        (tester) async {
          await open(
            tester,
            [
              rising('top', 'At the top'),
              {'id': 'tall', 'type': 'spacer', 'height': 1600},
              rising('below', 'Further down'),
            ],
            dark: dark,
            language: language,
          );
          expect(opacityOf(tester, 'At the top'), 1);
          // Still waiting below the fold.
          expect(opacityOf(tester, 'Further down'), 0);
          await tester.scrollUntilVisible(
            find.text('Further down'),
            300,
            scrollable: find.byType(Scrollable).first,
          );
          for (var i = 0; i < 4; i++) {
            await tester.pump(const Duration(milliseconds: 60));
          }
          final midway = opacityOf(tester, 'Further down');
          expect(midway, greaterThan(0));
          expect(midway, lessThan(1));
          await TestApp.settle(tester);
          expect(opacityOf(tester, 'Further down'), 1);
          // Once: scrolling away and back doesn't play it again.
          await tester.drag(
            find.byType(Scrollable).first,
            const Offset(0, 1500),
          );
          await TestApp.settle(tester);
          await tester.drag(
            find.byType(Scrollable).first,
            const Offset(0, -1500),
          );
          await tester.pump();
          expect(opacityOf(tester, 'Further down'), 1);
        },
      );
    }

    testWidgets('nothing moves on a phone that reduces motion', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await open(tester, [
        {'id': 'tall', 'type': 'spacer', 'height': 1600},
        rising('below', 'Further down'),
      ]);
      expect(
        find.ancestor(
          of: find.text('Further down', skipOffstage: false),
          matching: find.byType(Opacity),
        ),
        findsNothing,
      );
    });
  });

  group('129.3 the ticker', () {
    Map<String, dynamic> ticker({Map<String, dynamic>? marquee}) => {
      'id': 'tick',
      'type': 'marquee',
      'text': 'Free delivery\nNew every week',
      'icon': 'star',
      'gap': 18,
      'marquee': ?marquee,
    };

    double shift(WidgetTester tester) => tester
        .widget<Transform>(
          find.byKey(const ValueKey('studio-marquee-run-tick')),
        )
        .transform
        .getTranslation()
        .x;

    for (final (dark, language) in [
      (false, 'en'),
      (true, 'en'),
      (false, 'ar'),
    ]) {
      testWidgets('runs toward the start, its words read once '
          '(${dark ? 'dark' : 'light'}, $language)', (tester) async {
        await open(tester, [ticker()], dark: dark, language: language);
        expect(find.text('Free delivery'), findsWidgets);
        expect(
          find.bySemanticsLabel('Free delivery, New every week'),
          findsOneWidget,
        );
        final before = shift(tester);
        await tester.pump(const Duration(milliseconds: 500));
        await tester.pump(const Duration(milliseconds: 500));
        final after = shift(tester);
        // 40 points a second, leftwards in English, rightwards in Arabic.
        expect((after - before).abs(), closeTo(40, 6));
        expect(after < before, language == 'en');
      });
    }

    testWidgets('runs toward the end, held still while pressed', (
      tester,
    ) async {
      await open(tester, [
        ticker(marquee: {'direction': 'end', 'speed': 80}),
      ]);
      final before = shift(tester);
      await tester.pump(const Duration(milliseconds: 250));
      await tester.pump(const Duration(milliseconds: 250));
      expect(shift(tester), greaterThan(before));
      final press = await tester.startGesture(
        tester.getCenter(find.byKey(const ValueKey('studio-marquee-tick'))),
      );
      await tester.pump(const Duration(milliseconds: 100));
      final held = shift(tester);
      await tester.pump(const Duration(milliseconds: 500));
      expect(shift(tester), held);
      await press.up();
      await tester.pump(const Duration(milliseconds: 500));
      expect(shift(tester), isNot(held));
    });

    testWidgets('a still row on a phone that reduces motion', (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await open(tester, [ticker()]);
      expect(find.text('Free delivery'), findsOneWidget);
      await tester.pump(const Duration(seconds: 1));
      expect(shift(tester), 0);
    });

    testWidgets('waits below the fold', (tester) async {
      await open(tester, [
        {'id': 'tall', 'type': 'spacer', 'height': 2000},
        ticker(),
      ]);
      final before = shift(tester);
      await tester.pump(const Duration(seconds: 1));
      expect(shift(tester), before);
    });
  });
}

/// A video that is ready at once, keeping what it was asked to do.
class _Video extends VideoPlayerPlatform with MockPlatformInterfaceMixin {
  final calls = <String>[];
  @override
  Future<void> init() async {}
  @override
  Future<int?> create(DataSource dataSource) async => 1;
  @override
  Future<int?> createWithOptions(VideoCreationOptions options) async => 1;
  @override
  Stream<VideoEvent> videoEventsFor(int playerId) => Stream.value(
    VideoEvent(
      eventType: VideoEventType.initialized,
      duration: const Duration(seconds: 20),
      size: const Size(1280, 720),
    ),
  );
  @override
  Future<void> dispose(int playerId) async {}
  @override
  Future<void> setLooping(int playerId, bool looping) async =>
      calls.add('loop');
  @override
  Future<void> play(int playerId) async => calls.add('play');
  @override
  Future<void> pause(int playerId) async => calls.add('pause');
  @override
  Future<void> setVolume(int playerId, double volume) async =>
      calls.add('volume $volume');
  @override
  Future<void> seekTo(int playerId, Duration position) async {}
  @override
  Future<void> setPlaybackSpeed(int playerId, double speed) async {}
  @override
  Future<Duration> getPosition(int playerId) async => Duration.zero;
  @override
  Future<void> setMixWithOthers(bool mixWithOthers) async {}
  @override
  Widget buildView(int playerId) => const ColoredBox(color: Color(0xFF223344));
  @override
  Widget buildViewWithOptions(VideoViewOptions options) => buildView(1);
}
