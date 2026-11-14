import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 130.18 The student's cards' new options, as Ufuq Academy's Signature
/// looks draw them: the course they are taking in a gold ring (`style`
/// `ring`: its photo, the ring, the lesson on a chip, Continue learning,
/// its name, the minutes and the share left, Resume lesson), and this
/// week's days under a streak (`days`: round letters or short pills); by
/// day and by night, and right to left.
void main() {
  final now = DateTime(2026, 11, 12, 18, 10);

  Map<String, dynamic> config({String mode = 'light'}) {
    final c = configJson(
      languages: languagesJson(),
      appearance: appearanceJson(themeMode: mode),
    );
    return {
      ...c,
      'features': {
        ...(c['features'] as Map<String, dynamic>),
        'gamification': true,
      },
    };
  }

  Map<String, dynamic> home() => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {
            'id': 'ring',
            'type': 'learning',
            'learning': {'section': 'continue', 'style': 'ring'},
          },
          {
            'id': 'letters',
            'type': 'learning',
            'learning': {
              'section': 'streak',
              'style': 'photo',
              'days': 'letters',
            },
            'width': 240,
          },
          {
            'id': 'pills',
            'type': 'learning',
            'learning': {
              'section': 'streak',
              'style': 'photo',
              'days': 'pills',
            },
          },
        ],
      },
    },
  };

  FakeApi api({String mode = 'light'}) => FakeApi(config: config(mode: mode))
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
    ..pages = {'home': home()}
    ..achievements = {...achievementsJson(), 'streak_days': 12};

  Future<void> open(WidgetTester tester, TestApp app) async {
    await app.pump(tester);
    await TestApp.settle(tester, 20);
  }

  TestApp appOf(FakeApi api, {Map<String, Object> preferences = const {}}) =>
      TestApp(
        appType: AppType.lms,
        api: api,
        signedIn: true,
        preferences: preferences,
        overrides: [pageClockProvider.overrideWithValue(() => now)],
      );

  for (final mode in ['light', 'dark']) {
    testWidgets('draws the course in its gold ring and the week ($mode)', (
      tester,
    ) async {
      await open(tester, appOf(api(mode: mode)));
      expect(
        find.byKey(const ValueKey('learning-continue-ring')),
        findsOneWidget,
      );
      // Not the photo card.
      expect(
        find.byKey(const ValueKey('learning-continue-photo')),
        findsNothing,
      );
      expect(find.text('CONTINUE LEARNING'), findsOneWidget);
      expect(find.textContaining('of the course'), findsOneWidget);
      expect(find.text('Resume lesson'), findsOneWidget);
      expect(find.byKey(const ValueKey('learning-ring-chip')), findsOneWidget);
      // The week under each streak, as letters and as pills.
      expect(
        find.byKey(const ValueKey('learning-streak-week-letters')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('learning-streak-week-pills')),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('in Arabic, right to left, with its own words', (tester) async {
    await open(
      tester,
      appOf(api(), preferences: const {'settings.language': 'ar'}),
    );
    expect(find.text('تابع الدرس'), findsOneWidget);
    expect(find.textContaining('من الدورة'), findsOneWidget);
    final week = tester.getRect(
      find.byKey(const ValueKey('learning-streak-week-letters')),
    );
    final card = tester.getRect(
      find.byKey(const ValueKey('studio-node-letters')),
    );
    // The week starts at the card's start, which is its right.
    expect(card.right - week.right, lessThan(week.left - card.left));
    expect(tester.takeException(), isNull);
  });

  testWidgets('a streak without days keeps its figure alone', (tester) async {
    final a = api()
      ..pages = {
        'home': {
          ...appPageJson(blocks: []),
          'studio': {
            'body': {
              'id': 'root',
              'type': 'column',
              'children': [
                {
                  'id': 'streak',
                  'type': 'learning',
                  'learning': {'section': 'streak', 'style': 'photo'},
                },
              ],
            },
          },
        },
      };
    await open(tester, appOf(a));
    expect(
      find.byKey(const ValueKey('learning-streak-compact')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('learning-streak-week-letters')),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey('learning-streak-week-pills')),
      findsNothing,
    );
  });
}
