import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/l10n/app_localizations.dart';
import 'package:yallapp/modules/lms/lesson/video/player_controls.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 The premium academy's lesson (`looks` `lesson: premium`): where it
/// is and its name large, the student's notes, the files and the
/// discussion as chips, the next lesson and the quiz coming up on cards,
/// the files with their kind, and the player's controls with the played
/// part in gold.
void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(390 * 3, 844 * 3)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  Map<String, dynamic> lesson() => {
    ...videoLessonJson(),
    'id': 102,
    'title': 'Layout principles',
    'previous_id': null,
    'next_id': null,
    'note_count': 1,
    'discussion_count': 24,
    'attachments': [
      {
        'name': 'Spacing guide.pdf',
        'url': 'https://academy.test/guide.pdf',
        'size_bytes': 1258291,
        'mime_type': 'application/pdf',
      },
    ],
  };

  FakeApi api({bool premium = true}) {
    final config = configJson();
    final api = FakeApi(
      lesson: lesson(),
      config: {
        ...config,
        'features': {
          ...(config['features'] as Map<String, dynamic>),
          'notes': true,
          'lesson_discussion': true,
        },
        'screens': {
          if (premium) 'looks': {'lesson': 'premium'},
        },
      },
    );
    api.course = {...api.course, 'enrolled': true};
    api.notes = [
      {
        ...noteJson(id: 7, lessonId: 102, text: '8 px for every space'),
        'position_seconds': 272,
      },
    ];
    // What is in the topic around it: a lesson before, one after, a quiz.
    api.curriculum = {
      'topics': [
        {
          'id': 2,
          'title': 'Unit 2',
          'items': [
            for (final (id, type, title, minutes, questions, locked) in [
              (101, 'lesson', 'Colour', 15, null, false),
              (102, 'lesson', 'Layout principles', 18, null, false),
              (103, 'lesson', 'Grids and spacing', 22, null, false),
              (201, 'quiz', 'Unit 2 quiz', null, 10, true),
            ])
              {
                'id': id,
                'type': type,
                'title': title,
                'duration_minutes': minutes,
                'question_count': questions,
                'preview': false,
                'locked': locked,
                'completed': false,
              },
          ],
        },
      ],
    };
    return api;
  }

  Future<TestApp> open(WidgetTester tester, FakeApi api) async {
    final app = TestApp(api: api, signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/lesson/102');
    await TestApp.settle(tester, 20);
    return app;
  }

  testWidgets('where it is, the chips, the note, the next lesson, the quiz '
      'and the files', (tester) async {
    final fake = api();
    await open(tester, fake);
    expect(find.byKey(const ValueKey('premium-lesson')), findsOneWidget);
    expect(find.text('Lesson 2 of 3 · Unit 2'), findsOneWidget);
    expect(find.text('Layout principles'), findsWidgets);
    expect(find.text('My notes'), findsOneWidget);
    expect(find.text('Files 1'), findsOneWidget);
    expect(find.text('Discussion 24'), findsOneWidget);
    // The student's note, where in the video it was written.
    expect(find.text('8 px for every space'), findsOneWidget);
    expect(find.text('04:32'), findsOneWidget);
    expect(find.text('Next · 22 min'), findsOneWidget);
    expect(find.text('Grids and spacing'), findsOneWidget);
    expect(find.byKey(const ValueKey('premium-quiz')), findsOneWidget);
    expect(find.text('10 questions · Opens after this lesson'), findsOneWidget);
    expect(find.text('Spacing guide.pdf'), findsOneWidget);
    expect(find.text('1.2 MB'), findsOneWidget);
    expect(find.byKey(const ValueKey('lesson-bookmark')), findsOneWidget);

    // Marked complete with the button at the end.
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('premium-lesson-complete')),
      200,
      scrollable: find
          .descendant(
            of: find.byKey(const ValueKey('premium-lesson')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.ensureVisible(
      find.byKey(const ValueKey('premium-lesson-complete')),
    );
    await TestApp.settle(tester, 5);
    await tester.tap(find.byKey(const ValueKey('premium-lesson-complete')));
    await TestApp.settle(tester, 10);
    expect(fake.count('completeLesson'), 1);
  });

  testWidgets('the files chip shows the files in its place', (tester) async {
    await open(tester, api());
    await tester.tap(find.byKey(const ValueKey('lesson-chip-files')));
    await TestApp.settle(tester, 5);
    expect(find.text('8 px for every space'), findsNothing);
    expect(find.byKey(const ValueKey('premium-files')), findsOneWidget);
  });

  testWidgets('the next lesson opens from its card', (tester) async {
    final fake = api();
    fake.lessons[103] = {...lesson(), 'id': 103, 'title': 'Grids and spacing'};
    await open(tester, fake);
    await tester.tap(find.byKey(const ValueKey('premium-next')));
    await TestApp.settle(tester, 20);
    expect(find.text('Lesson 3 of 3 · Unit 2'), findsOneWidget);
  });

  testWidgets('a lesson without a video: its text first, then the notes', (
    tester,
  ) async {
    final fake = api();
    fake.lessons[102] = {
      ...textLessonJson(),
      'id': 102,
      'title': 'Layout principles',
      'previous_id': null,
      'next_id': null,
      'discussion_count': 3,
    };
    await open(tester, fake);
    expect(find.byKey(const ValueKey('premium-lesson')), findsOneWidget);
    expect(find.text('Lesson 2 of 3 · Unit 2'), findsOneWidget);
    // The lesson's text is the first chip, open; the student's notes after it.
    final overview = tester.getCenter(
      find.byKey(const ValueKey('lesson-chip-overview')),
    );
    final notes = tester.getCenter(
      find.byKey(const ValueKey('lesson-chip-notes')),
    );
    expect(overview.dx, lessThan(notes.dx));
    expect(find.text('8 px for every space'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('lesson-chip-notes')));
    await TestApp.settle(tester, 5);
    expect(find.text('8 px for every space'), findsOneWidget);
  });

  testWidgets('without the look, the lesson is as it was', (tester) async {
    await open(tester, api(premium: false));
    expect(find.byKey(const ValueKey('premium-lesson')), findsNothing);
    expect(find.byKey(const ValueKey('lesson-tools')), findsOneWidget);
  });

  testWidgets('the premium controls: speed at the top, the play button, the '
      'time, seeking', (tester) async {
    final seeks = <Duration>[];
    var played = 0;
    Widget controls({required bool premium}) {
      final c = PlayerControls(
        state: const PlayerSnapshot(
          position: Duration(minutes: 6, seconds: 12),
          duration: Duration(minutes: 18),
          started: true,
          speed: 1.25,
        ),
        fullScreen: false,
        onPlayPause: () => played++,
        onSeek: seeks.add,
        onFullScreen: () {},
        onSpeed: () {},
      );
      return MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: SizedBox(
            width: 390,
            height: 220,
            child: premium
                ? PremiumPlayer(gold: const Color(0xFFB8893A), child: c)
                : c,
          ),
        ),
      );
    }

    await tester.pumpWidget(controls(premium: true));
    expect(find.text('06:12'), findsOneWidget);
    expect(find.text('18:00'), findsOneWidget);
    expect(find.text('1.25x'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('player-play')));
    expect(played, 1);
    await tester.tap(find.bySemanticsLabel('Forward 10 seconds'));
    expect(seeks.last, const Duration(minutes: 6, seconds: 22));

    // The app's own controls elsewhere.
    await tester.pumpWidget(controls(premium: false));
    expect(find.text('06:12 / 18:00'), findsOneWidget);
  });
}
