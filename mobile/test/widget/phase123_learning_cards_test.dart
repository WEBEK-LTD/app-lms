import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 An academy's Studio home as the premium academy has it: the greeting
/// with the date and the student's first name, the course they are taking,
/// their streak and their next live class; signed out, none of the
/// student's cards and the header's own title.
void main() {
  final now = DateTime(2026, 11, 11, 9, 30);

  Map<String, dynamic> config({bool on = true}) {
    final c = configJson();
    return {
      ...c,
      'features': {
        ...(c['features'] as Map<String, dynamic>),
        'gamification': on,
        'live_classes': on,
      },
    };
  }

  Map<String, dynamic> home() => {
    ...appPageJson(blocks: []),
    'studio': {
      'header': {
        'type': 'greeting',
        'title': 'What will you learn today?',
        'buttons': ['search', 'notifications'],
      },
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          for (final s in ['continue', 'streak', 'live', 'week'])
            {
              'id': s,
              'type': 'learning',
              'learning': {'section': s},
            },
        ],
      },
    },
  };

  FakeApi api({bool on = true}) => FakeApi(config: config(on: on))
    ..navigation = navigationJson(
      tabs: [
        navTabJson('home', 'Home', 'home', {
          'type': 'page',
          'page_slug': 'home',
        }),
        navTabJson('account', 'Me', 'person', {
          'type': 'screen',
          'screen': 'account',
        }),
      ],
    )
    ..pages = {'home': home()}
    ..liveSessions = [
      {
        ...liveSessionJson(),
        'title': 'Content marketing',
        'starts_at': now.add(const Duration(hours: 2)).toUtc().toIso8601String(),
        'ends_at': now.add(const Duration(hours: 3)).toUtc().toIso8601String(),
      },
    ];

  Future<void> open(WidgetTester tester, TestApp app) async {
    await app.pump(tester);
    await TestApp.settle(tester, 20);
  }

  testWidgets('greets the student by name and shows their own cards', (
    tester,
  ) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api(),
      signedIn: true,
      overrides: [pageClockProvider.overrideWithValue(() => now)],
    );
    await open(tester, app);
    expect(find.byKey(const ValueKey('studio-greeting')), findsOneWidget);
    expect(find.text('Good morning, Sara'), findsOneWidget);
    expect(find.text('Wednesday, 11 November'), findsOneWidget);
    // The course they are taking: the lesson they are on, the next one's minutes.
    expect(find.byKey(const ValueKey('learning-continue')), findsOneWidget);
    expect(find.text('In progress · lesson 13 of 20'), findsOneWidget);
    expect(find.text('9 min left'), findsOneWidget);
    expect(find.text('60%'), findsOneWidget);
    // The streak and the next live class.
    expect(find.byKey(const ValueKey('learning-streak')), findsOneWidget);
    expect(find.text('Learning streak'), findsOneWidget);
    expect(find.byKey(const ValueKey('learning-live')), findsOneWidget);
    expect(find.text('Content marketing'), findsOneWidget);
    expect(find.textContaining('In 2 h · '), findsOneWidget);
  });

  testWidgets('signed out: the header says its title, and no card shows', (
    tester,
  ) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api(),
      signedIn: false,
      guest: true,
      overrides: [pageClockProvider.overrideWithValue(() => now)],
    );
    await open(tester, app);
    expect(find.text('What will you learn today?'), findsOneWidget);
    expect(find.byKey(const ValueKey('learning-continue')), findsNothing);
    expect(find.byKey(const ValueKey('learning-streak')), findsNothing);
    expect(find.byKey(const ValueKey('learning-live')), findsNothing);
  });

  testWidgets('without the academy\'s streaks and live classes, only the '
      'course they are taking', (tester) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api(on: false),
      signedIn: true,
      overrides: [pageClockProvider.overrideWithValue(() => now)],
    );
    await open(tester, app);
    expect(find.byKey(const ValueKey('learning-continue')), findsOneWidget);
    expect(find.byKey(const ValueKey('learning-streak')), findsNothing);
    expect(find.byKey(const ValueKey('learning-live')), findsNothing);
  });
}
