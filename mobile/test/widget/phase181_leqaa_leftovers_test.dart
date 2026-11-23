import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/storage/local_settings.dart';

import '../screenshots/support/leqaa.dart';
import '../screenshots/support/shot.dart' show loadAppFonts;
import '../screenshots/support/studio_demo.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 181 What phases 157 to 163 left open for Leqaa and Kech Flora.
///
/// 158.3 A premium header that folds as the page scrolls gives what is
/// under it more room, so on a page a little longer than the screen the
/// page's end moves as it folds: a slow drag reached the end, a quick
/// fling stopped up to about 10 points short (Settings on a 320 by 568
/// phone). A fling of any speed now ends at the end, on Android's and
/// the iPhone's physics, and the page still scrolls back from there.
///
/// 158.8 Settings' plain choice sheet (an app without a premium look:
/// the language, and the video's quality and speed) scrolls to its last
/// choice, above the phone's bar, as the other sheets do (158).
void main() {
  setUpAll(loadAppFonts);

  const phones = <_Phone>[
    (name: '320x568', size: Size(320, 568), top: 20, bottom: 0),
    (name: '360x640', size: Size(360, 640), top: 24, bottom: 0),
    (name: '360x720 gestures', size: Size(360, 720), top: 24, bottom: 24),
    (name: '360x800 three buttons', size: Size(360, 800), top: 24, bottom: 48),
  ];
  const scales = [1.0, 1.3];

  group('181 (158.3) a quick fling reaches the end under a folding header', () {
    for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
      for (final look in ['a', 'b']) {
        for (final language in ['en', 'ar']) {
          for (final theme in ['light', 'dark']) {
            testWidgets(
              '${platform.name}, look $look, $language, $theme: Settings',
              (tester) async {
                debugDefaultTargetPlatformOverride = platform;
                try {
                  await _usePhone(tester, phones.first, 1);
                  final app = await _leqaa(
                    tester,
                    look: look,
                    language: language,
                    theme: theme,
                    platform: platform,
                  );
                  await _push(tester, app, Paths.settings);
                  for (final phone in phones) {
                    for (final scale in scales) {
                      await _usePhone(tester, phone, scale);
                      final why =
                          '${platform.name}, look $look, $language, $theme, '
                          '${phone.name}, text x$scale';
                      await _expectFlingsReachEnd(tester, why);
                    }
                  }
                  await _close(tester, app);
                } finally {
                  debugDefaultTargetPlatformOverride = null;
                }
              },
            );
          }
        }
      }
    }
  });

  group('181 (158.8) Settings\' plain choice sheet scrolls to its end', () {
    for (final look in ['a', 'b']) {
      for (final language in ['en', 'ar']) {
        for (final theme in ['light', 'dark']) {
          testWidgets(
            'Leqaa look $look without its premium look, $language, $theme: '
            'the language',
            (tester) async {
              await _usePhone(tester, phones.first, 1);
              final app = await _leqaa(
                tester,
                look: look,
                language: language,
                theme: theme,
                premium: false,
              );
              await _push(tester, app, Paths.settings);
              for (final phone in phones) {
                for (final scale in [...scales, 1.5]) {
                  await _usePhone(tester, phone, scale);
                  await _expectChoiceInReach(
                    tester,
                    tile: find.byKey(const ValueKey('language-tile')),
                    last: find.text('Türkçe'),
                    why:
                        'look $look, $language, $theme, ${phone.name}, '
                        'text x$scale',
                  );
                }
              }
              await _close(tester, app);
            },
          );
        }
      }
    }

    for (final language in ['en', 'ar']) {
      for (final theme in ['light', 'dark']) {
        testWidgets('a course app, $language, $theme: the video\'s quality '
            'and speed', (tester) async {
          await _usePhone(tester, phones.first, 1);
          final app = TestApp(
            api: FakeApi(config: configJson(languages: languagesJson())),
            signedIn: true,
            preferences: {
              'settings.theme_mode': theme,
              'settings.language': language,
            },
          );
          await app.pump(tester);
          await TestApp.settle(tester, 20);
          await _push(tester, app, Paths.settings);
          for (final phone in phones) {
            for (final scale in scales) {
              await _usePhone(tester, phone, scale);
              final why = '$language, $theme, ${phone.name}, text x$scale';
              await _expectChoiceInReach(
                tester,
                tile: find.text(speedLabel(1.0)),
                last: find.text(speedLabel(playbackSpeeds.last)),
                why: 'speed, $why',
              );
              await _expectChoiceInReach(
                tester,
                tile: find.text(VideoQuality.auto.label),
                last: find.text(VideoQuality.values.last.label),
                why: 'quality, $why',
              );
            }
          }
          await _close(tester, app);
        });
      }
    }
  });
}

typedef _Phone = ({String name, Size size, double top, double bottom});

/// The test's view as [phone], with the phone's font at [scale].
Future<void> _usePhone(WidgetTester tester, _Phone phone, double scale) async {
  const ratio = 3.0;
  tester.view
    ..devicePixelRatio = ratio
    ..physicalSize = phone.size * ratio
    ..viewPadding = FakeViewPadding(
      top: phone.top * ratio,
      bottom: phone.bottom * ratio,
    )
    ..padding = FakeViewPadding(
      top: phone.top * ratio,
      bottom: phone.bottom * ratio,
    );
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

/// Leqaa's app on its Signature look [look], signed in with a cart;
/// without [premium], as an app without a premium look for its system
/// screens (their choice sheets plain).
Future<TestApp> _leqaa(
  WidgetTester tester, {
  required String look,
  String language = 'en',
  String theme = 'light',
  bool premium = true,
  TargetPlatform platform = TargetPlatform.android,
}) async {
  StudioDemo.language = language;
  addTearDown(() => StudioDemo.language = 'en');
  final demo = StudioDemo.signature('flowers', look);
  final api = leqaaStudioApi(
    look: demo,
    lang: language,
    primaryColor: look == 'a' ? '#8E2445' : '#2F5D50',
  );
  if (!premium) {
    final screens = Map<String, dynamic>.from(api.config['screens'] as Map)
      ..remove('system');
    api.config = {...api.config, 'screens': screens};
  }
  final app = TestApp(
    api: api,
    appType: AppType.store,
    signedIn: true,
    platform: platform == TargetPlatform.iOS
        ? DevicePlatform.ios
        : DevicePlatform.android,
    preferences: {
      'settings.theme_mode': theme,
      'settings.language': language,
      ...leqaaCartPreferences(demo, lang: language),
    },
  );
  await app.pump(tester);
  await TestApp.settle(tester, 20);
  return app;
}

Future<void> _push(WidgetTester tester, TestApp app, String location) async {
  unawaited(app.container.read(appRouterProvider).push(location));
  await TestApp.settle(tester, 30);
}

Future<void> _close(WidgetTester tester, TestApp app) async {
  await tester.pumpWidget(const SizedBox());
  app.container.dispose();
  await TestApp.settle(tester, 2);
}

Size _screen(WidgetTester tester) =>
    tester.view.physicalSize / tester.view.devicePixelRatio;

/// The page's own list (not a row of chips or a sheet's).
ScrollPosition _page(WidgetTester tester) {
  final size = _screen(tester);
  final positions =
      [
        for (final e
            in find
                .byWidgetPredicate(
                  (w) =>
                      w is Scrollable && w.axisDirection == AxisDirection.down,
                )
                .evaluate())
          ((e as StatefulElement).state as ScrollableState).position,
      ].where(
        (p) =>
            p.hasViewportDimension && p.viewportDimension > size.height * 0.4,
      );
  expect(positions, isNotEmpty, reason: 'the page scrolls');
  return positions.first;
}

/// Frames as a phone draws them (60 a second), for [seconds].
Future<void> _frames(WidgetTester tester, [double seconds = 3]) async {
  for (var i = 0; i < seconds * 60; i++) {
    await tester.pump(const Duration(microseconds: 16667));
  }
}

/// Flings of every speed, from the top, as a quick finger does: each ends
/// at the page's end once it is still; and from there the page scrolls
/// back as it is dragged (the end holds it only while it rests).
Future<void> _expectFlingsReachEnd(WidgetTester tester, String why) async {
  final size = _screen(tester);
  final from = Offset(size.width / 2, size.height * 0.6);
  Future<void> toTop() async {
    _page(tester).jumpTo(0);
    await _frames(tester);
  }

  void expectAtEnd(String how) {
    final p = _page(tester);
    expect(
      p.pixels,
      greaterThanOrEqualTo(p.maxScrollExtent - 0.5),
      reason:
          '$why, $how: the fling ended at the page\'s end '
          '(${p.pixels.toStringAsFixed(2)} of '
          '${p.maxScrollExtent.toStringAsFixed(2)})',
    );
  }

  for (final speed in [1500.0, 3000.0, 6000.0]) {
    await toTop();
    await tester.flingFrom(from, const Offset(0, -80), speed);
    await _frames(tester);
    expectAtEnd('a fling at $speed');
  }
  // A fling a frame at a time: 24 points each 8 ms, then let go.
  await toTop();
  final finger = await tester.startGesture(from);
  for (var i = 0; i < 6; i++) {
    await finger.moveBy(const Offset(0, -24));
    await tester.pump(const Duration(milliseconds: 8));
  }
  await finger.up();
  await _frames(tester);
  expectAtEnd('a fling as frames go');
  // Back from the end, past the touch slop.
  final end = _page(tester).pixels;
  if (end > 2) {
    await tester.dragFrom(from, const Offset(0, 60));
    await _frames(tester);
    expect(
      _page(tester).pixels,
      lessThan(end - 1),
      reason: '$why: the page scrolls back from its end',
    );
  }
}

/// The choice sheet [tile] opens shows its [last] choice whole above the
/// phone's bar once scrolled to it, and a tap there reaches it; nothing
/// in it overflows.
Future<void> _expectChoiceInReach(
  WidgetTester tester, {
  required Finder tile,
  required Finder last,
  required String why,
}) async {
  _page(tester).jumpTo(0);
  await tester.pumpAndSettle();
  await tester.ensureVisible(tile.first);
  await tester.pumpAndSettle();
  await tester.tap(tile.first);
  await tester.pumpAndSettle();
  final sheet = find.byType(BottomSheet);
  expect(sheet, findsOneWidget, reason: '$why: the sheet opened');
  final choice = find.descendant(of: sheet, matching: last);
  expect(choice, findsOneWidget, reason: '$why: its last choice');
  final element = choice.evaluate().single;
  if (Scrollable.maybeOf(element) != null) {
    await Scrollable.ensureVisible(element);
    await tester.pumpAndSettle();
  }
  final rect = tester.getRect(choice);
  final size = _screen(tester);
  final view = tester.view;
  final foot = size.height - view.viewPadding.bottom / view.devicePixelRatio;
  final top = tester.getRect(sheet).top;
  expect(
    rect.top,
    greaterThanOrEqualTo(top - 0.5),
    reason: '$why: the last choice inside the sheet',
  );
  expect(
    rect.bottom,
    lessThanOrEqualTo(foot + 0.5),
    reason: '$why: the last choice above the phone\'s bar (down to $foot)',
  );
  final hit = tester.hitTestOnBinding(rect.center);
  final box = element.renderObject!;
  expect(
    hit.path.any((entry) {
      RenderObject? node = entry.target is RenderObject
          ? entry.target as RenderObject
          : null;
      while (node != null) {
        if (node == box) return true;
        node = node.parent;
      }
      return false;
    }),
    isTrue,
    reason: '$why: a tap there reaches it',
  );
  // Closed again with the system's back, the choice unchanged.
  Navigator.of(element).pop();
  await tester.pumpAndSettle();
}
