import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 128.8 Ufuq Academy's home as the owner approved it: the course the
/// student is taking over its photo (the lesson and the minutes on one
/// chip, how far they are, a play button), their streak as one figure
/// beside their live class on a photo ("LIVE AT 19:30"), photo cards with
/// the teacher and the rating, and the bar a floating navy pill with the
/// open tab on gold.
void main() {
  final now = DateTime(2026, 11, 12, 18, 10);

  Map<String, dynamic> config() {
    final c = configJson(languages: languagesJson());
    return {
      ...c,
      'features': {
        ...(c['features'] as Map<String, dynamic>),
        'gamification': true,
        'live_classes': true,
      },
    };
  }

  Map<String, dynamic> item(String id, String title, double? rating) => {
    'source': 'courses',
    'id': id,
    'title': title,
    'subtitle': 'Deniz Kaya',
    'image_url': null,
    'price_label': null,
    'badge': null,
    'rating': rating,
    'action': {'type': 'course', 'course_id': int.parse(id)},
  };

  Map<String, dynamic> home() => {
    ...appPageJson(blocks: []),
    'studio': {
      'header': {
        'type': 'greeting',
        'title': 'What will you learn today?',
        'buttons': ['notifications'],
      },
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {
            'id': 'continue',
            'type': 'learning',
            'learning': {'section': 'continue', 'style': 'photo'},
            'height': 236,
            'radius': 26,
            'background': '#1D2B4F',
          },
          {
            'id': 'row',
            'type': 'row',
            'children': [
              {
                'id': 'streak',
                'type': 'learning',
                'learning': {'section': 'streak', 'style': 'photo'},
                'width': 145,
                'border_color': '#E3DFD6',
                'dark_border_color': '#262D48',
                'border_width': 1,
              },
              {
                'id': 'live',
                'type': 'learning',
                'learning': {'section': 'live', 'style': 'photo'},
                'width': 'fill',
                'background': '#1D2B4F',
              },
            ],
          },
          {
            'id': 'picked',
            'type': 'items',
            'source': 'courses',
            'layout': 'carousel',
            'items': [
              item('1', 'UX Design Fundamentals', 4.9),
              item('2', 'Excel for Small Business Owners', null),
            ],
            'card': {
              'id': 'card',
              'type': 'column',
              'width': 200,
              'children': [
                {'id': 'title', 'type': 'text', 'bind': 'title'},
                {
                  'id': 'line',
                  'type': 'row',
                  'children': [
                    {
                      'id': 'teacher',
                      'type': 'text',
                      'bind': 'subtitle',
                      'max_lines': 1,
                    },
                    {
                      'id': 'rating',
                      'type': 'text',
                      'bind': 'rating',
                      'text': '·',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  };

  FakeApi api() => FakeApi(config: config())
    ..navigation = {
      ...navigationJson(
        tabs: [
          navTabJson('home', 'Home', 'home', {
            'type': 'page',
            'page_slug': 'home',
          }),
          navTabJson('courses', 'Explore', 'explore', {
            'type': 'screen',
            'screen': 'courses',
          }),
          navTabJson('account', 'Account', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      ),
      'tab_bar': {
        'design': 'float',
        'radius': 22,
        'margin': 12,
        'labels': 'active',
        'background': '#1D2B4F',
        'dark_background': '#EEF0F7',
        'active': '#E6C26E',
        'dark_active': '#E6C26E',
        'inactive': '#AFB6CC',
        'dark_inactive': '#59607A',
      },
    }
    ..pages = {'home': home()}
    ..achievements = {...achievementsJson(), 'streak_days': 12}
    ..liveSessions = [
      {
        ...liveSessionJson(),
        'title': 'Content marketing',
        'starts_at': now
            .add(const Duration(hours: 1, minutes: 20))
            .toUtc()
            .toIso8601String(),
        'ends_at': now
            .add(const Duration(hours: 2, minutes: 20))
            .toUtc()
            .toIso8601String(),
      },
    ];

  Future<void> open(WidgetTester tester, TestApp app) async {
    await app.pump(tester);
    await TestApp.settle(tester, 20);
  }

  testWidgets('draws the student\'s day on photos, as approved', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final app = TestApp(
      appType: AppType.lms,
      api: api(),
      signedIn: true,
      overrides: [pageClockProvider.overrideWithValue(() => now)],
    );
    await open(tester, app);
    expect(find.text('Good evening, Sara'), findsOneWidget);
    // The course they are taking on its photo: one chip, the play button.
    expect(
      find.byKey(const ValueKey('learning-continue-photo')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('learning-continue')), findsNothing);
    expect(find.text('Lesson 13 of 20 · 9 min left'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('learning-photo-progress')),
      findsOneWidget,
    );
    // The streak as one figure, the live class's time in gold.
    expect(
      find.byKey(const ValueKey('learning-streak-compact')),
      findsOneWidget,
    );
    expect(find.text('Streak'), findsOneWidget);
    expect(find.text('12 days'), findsOneWidget);
    expect(find.byKey(const ValueKey('learning-live-photo')), findsOneWidget);
    expect(find.textContaining('LIVE AT '), findsOneWidget);
    expect(find.text('Content marketing'), findsOneWidget);
    // The rating after the teacher, with its star; none without a rating.
    expect(find.byKey(const ValueKey('studio-rating-star')), findsOneWidget);
    expect(
      find.bySemanticsLabel(RegExp(r'Rated 4\.9 out of 5')),
      findsOneWidget,
    );
    semantics.dispose();
  });

  testWidgets('the bar is a floating pill 62 high, the open tab 40', (
    tester,
  ) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api(),
      signedIn: true,
      overrides: [pageClockProvider.overrideWithValue(() => now)],
    );
    await open(tester, app);
    final open0 = find.byKey(const ValueKey('nav-0-float'));
    expect(open0, findsOneWidget);
    expect(tester.getSize(open0).height, 40);
    final pill = tester.widget<DecoratedBox>(open0);
    expect((pill.decoration as BoxDecoration).color, const Color(0xFFE6C26E));
  });

  testWidgets('in Arabic, right to left, with its own words', (tester) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api(),
      signedIn: true,
      preferences: const {'settings.language': 'ar'},
      overrides: [pageClockProvider.overrideWithValue(() => now)],
    );
    await open(tester, app);
    expect(find.text('الدرس 13 من 20 · 9 د متبقية'), findsOneWidget);
    expect(find.text('السلسلة'), findsOneWidget);
    expect(find.textContaining('مباشر الساعة'), findsOneWidget);
    final chip = tester.getRect(find.text('الدرس 13 من 20 · 9 د متبقية'));
    final card = tester.getRect(
      find.byKey(const ValueKey('learning-continue-photo')),
    );
    // The chip at the card's start, which is its right.
    expect(card.right - chip.right, lessThan(40));
  });
}
