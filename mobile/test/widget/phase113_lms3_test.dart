import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 113.7 More of a real LMS in the app: learning paths, points and badges
/// with the leaderboard, prerequisites, timed exams, rubrics and another
/// try, notes and bookmarks, the lesson's discussion.

void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> push(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
  await TestApp.settle(tester);
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester);
}

/// The academy's config with 113.7's features on.
Map<String, dynamic> lmsConfig({bool gamification = true}) {
  final config = configJson();
  return {
    ...config,
    'features': {
      ...(config['features'] as Map<String, dynamic>),
      'learning_paths': true,
      'gamification': gamification,
      'notes': true,
      'lesson_discussion': true,
    },
  };
}

void main() {
  testWidgets(
    '113.7 learning paths from the account, a path with its progress',
    (tester) async {
      usePhone(tester);
      final api = FakeApi(config: lmsConfig());
      final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
      await app.pump(tester);
      app.container.read(appRouterProvider).go(Paths.account);
      await TestApp.settle(tester);
      await tapKey(tester, 'account-learning-paths');
      expect(find.text('Python from zero'), findsOneWidget);
      expect(find.text('1 of 2 courses completed'), findsOneWidget);
      await tapKey(tester, 'path-90');
      expect(find.text('Take these courses in order'), findsOneWidget);
      expect(find.text('Python Projects'), findsOneWidget);
      expect(find.text('Opens after the course before it'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
    },
  );

  testWidgets('113.7 points, a streak and badges, earned and not yet', (
    tester,
  ) async {
    usePhone(tester);
    final app = TestApp(
      signedIn: true,
      appType: AppType.lms,
      api: FakeApi(config: lmsConfig()),
    );
    await app.pump(tester);
    await push(app, tester, Paths.achievements);
    expect(find.text('145 points'), findsWidgets);
    expect(find.text('3-day streak · Best streak: 7 days'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('badge-firstLesson-earned')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('badge-perfectQuiz-not-yet')),
      findsOneWidget,
    );
    expect(find.text('7-day streak'), findsOneWidget);
    await tapKey(tester, 'achievements-course-1');
    expect(find.text("You're #2 of 3"), findsOneWidget);
  });

  testWidgets(
    '113.7 a course\'s leaderboard, the course\'s or the cohort\'s, with short names',
    (tester) async {
      usePhone(tester);
      final api = FakeApi(
        config: lmsConfig(),
        course: {
          ...courseDetailJson(enrolled: true),
          'cohort': {
            'id': 30,
            'name': 'October group',
            'starts_at': '2026-10-20T00:00:00Z',
          },
        },
      );
      final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
      await app.pump(tester);
      await push(app, tester, Paths.course(1));
      await tapKey(tester, 'course-leaderboard');
      expect(find.text('Ece K.'), findsOneWidget);
      expect(find.text('Deniz A. (You)'), findsOneWidget);
      expect(
        find.text('Only first names and an initial are shown.'),
        findsOneWidget,
      );
      await tester.tap(find.text('My cohort'));
      await TestApp.settle(tester);
      expect(api.leaderboardCohort, isTrue);
    },
  );

  testWidgets('113.7 a course that needs others first lists them', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(
      config: lmsConfig(),
      course: {
        ...courseDetailJson(action: 'none'),
        'prerequisites': [
          {'id': 4, 'title': 'Python for Beginners', 'completed': true},
          {'id': 5, 'title': 'Python Basics 2', 'completed': false},
        ],
        'prerequisites_met': false,
      },
    );
    final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.course(1));
    expect(find.text('Finish these courses first'), findsOneWidget);
    expect(
      find.text("You can enrol once you've completed them."),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('prerequisite-5')), findsOneWidget);
  });

  testWidgets(
    '113.7 a lesson\'s bookmark, the student\'s notes and its discussion',
    (tester) async {
      usePhone(tester);
      final api = FakeApi(
        config: lmsConfig(),
        course: courseDetailJson(enrolled: true),
        lesson: {
          ...textLessonJson(),
          'id': 12,
          'bookmarked': false,
          'note_count': 1,
          'discussion_count': 1,
        },
      );
      api.questions = [
        {...questionJson(id: 3), 'lesson_id': 12, 'pinned': true},
      ];
      final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
      await app.pump(tester);
      await push(app, tester, Paths.lesson(12));
      // The tools are under the lesson's text.
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('lesson-tools')),
        300,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('lesson-article')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tapKey(tester, 'lesson-bookmark');
      expect(api.bookmarks, {12});
      expect(find.text('Remove bookmark'), findsOneWidget);
      await tapKey(tester, 'lesson-notes');
      expect(find.text('Merhaba means hello'), findsOneWidget);
      expect(find.text('Only you can see your notes.'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('note-text')),
        'Teşekkürler: thank you',
      );
      await tapKey(tester, 'note-save');
      expect(api.notes.last['text'], 'Teşekkürler: thank you');
      expect(find.text('Teşekkürler: thank you'), findsOneWidget);
      await tester.tapAt(const Offset(20, 40));
      await TestApp.settle(tester);
      await tapKey(tester, 'lesson-discussion');
      expect(api.listedLesson, 12);
      expect(find.text('Pinned'), findsOneWidget);
      expect(find.byKey(const ValueKey('discussion-ask')), findsOneWidget);
    },
  );

  testWidgets('113.7 the student\'s notes and bookmarks in a course', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(
      config: lmsConfig(gamification: false),
      course: courseDetailJson(enrolled: true),
    );
    api.bookmarks.add(14);
    final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.course(1));
    expect(find.byKey(const ValueKey('course-leaderboard')), findsNothing);
    await tapKey(tester, 'course-notes');
    expect(find.text('Bookmarks'), findsOneWidget);
    expect(find.text('Lesson 14'), findsOneWidget);
    expect(find.text('Merhaba means hello'), findsOneWidget);
    expect(find.text('Greetings · At 01:15'), findsOneWidget);
  });

  testWidgets('113.7 a timed exam: its window, going back to it, closed', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(config: lmsConfig())
      ..quiz = {
        ...quizJson(),
        'attempts_used': 1,
        'exam': {
          'opens_at': '2026-10-20T06:00:00Z',
          'closes_at': '2026-10-20T09:00:00Z',
          'status': 'open',
          'results_after_close': true,
          'in_progress': {'attempt_id': 40, 'ends_at': '2026-10-20T07:30:00Z'},
        },
        'last_result': null,
      };
    final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.quiz(201));
    expect(find.byKey(const ValueKey('quiz-exam')), findsOneWidget);
    expect(find.textContaining('Closes '), findsOneWidget);
    expect(find.text('Back to the exam'), findsOneWidget);
    expect(
      find.text('The time keeps running if you leave the app.'),
      findsOneWidget,
    );

    api.quiz = {
      ...api.quiz!,
      'exam': {
        ...(api.quiz!['exam'] as Map<String, dynamic>),
        'status': 'closed',
        'in_progress': null,
      },
      'attempts_used': 1,
      'last_result': {
        'attempt_id': 40,
        'quiz_id': 201,
        'quiz_title': 'Module 2 quiz',
        'status': 'awaiting_results',
        'score_percent': null,
        'finished_at': '2026-10-20T07:00:00Z',
        'results_at': '2026-10-20T09:00:00Z',
      },
    };
    app.container.read(appRouterProvider).pop();
    await TestApp.settle(tester);
    await push(app, tester, Paths.quiz(201));
    expect(find.text('This exam has closed'), findsOneWidget);
    expect(find.text('Results after the exam closes'), findsOneWidget);
  });

  testWidgets('113.7 an assignment with a rubric, graded, handed in again', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(config: lmsConfig())
      ..assignment = {
        ...assignmentJson(
          submission: {
            ...assignmentSubmissionJson(text: 'My essay'),
            'status': 'graded',
            'score': 4,
            'max_points': 10,
            'passed': false,
            'attempt': 1,
            'rubric_result': [
              {
                'criterion_id': 1,
                'title': 'Content',
                'level_id': 2,
                'level_label': 'Good',
                'points': 3,
                'max_points': 6,
              },
              {
                'criterion_id': 2,
                'title': 'Spelling',
                'level_id': 2,
                'level_label': 'A few',
                'points': 1,
                'max_points': 4,
              },
            ],
          },
        ),
        'max_points': 10,
        'rubric': rubricJson(),
        'attempts_allowed': 2,
        'attempts_used': 1,
        'can_submit': true,
      };
    final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.assignment(16));
    expect(find.byKey(const ValueKey('rubric-result')), findsOneWidget);
    expect(find.text('3 of 6'), findsOneWidget);
    expect(find.text('You can hand it in again once.'), findsOneWidget);
    expect(find.textContaining('Try 1 of 2'), findsOneWidget);
    expect(find.text('Hand in again'), findsOneWidget);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('assignment-text')),
        matching: find.byType(TextFormField),
      ),
      'Better essay',
    );
    await tapKey(tester, 'assignment-send');
    expect(api.assignmentsHandedIn.single.text, 'Better essay');
  });

  testWidgets('113.7 a teacher grades with the rubric in the Teacher tab', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'vertical': 'instructors',
        'instructors': {'applications': true, 'timezone': 'Africa/Cairo'},
      },
    );
    api.me = {
      ...userJson(),
      'roles': ['teacher'],
    };
    api.teacherSubmissions = [
      {
        'id': 7,
        'course_id': 10,
        'course_title': 'Turkish for Beginners',
        'assignment_id': 16,
        'assignment_title': 'Essay',
        'student_name': 'Deniz Aksoy',
        'text': 'Merhaba',
        'file': null,
        'status': 'submitted',
        'score': null,
        'max_points': 10,
        'passed': null,
        'feedback': null,
        'submitted_at': '2026-10-12T15:00:00Z',
        'graded_at': null,
        'late': false,
        'rubric': rubricJson(),
        'rubric_result': null,
        'attempt': 2,
        'attempts_allowed': 3,
      },
    ];
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go(Paths.teacherDesk);
    await TestApp.settle(tester);
    await tester.tap(find.text('Grading'));
    await TestApp.settle(tester);
    expect(find.textContaining('Try 2 of 3'), findsOneWidget);
    await tapKey(tester, 'teacher-submission-7');
    expect(find.byKey(const ValueKey('grade-score')), findsNothing);
    await tapKey(tester, 'rubric-1-1');
    await tapKey(tester, 'grade-save');
    // A level for each criterion first.
    expect(api.graded, isEmpty);
    await tapKey(tester, 'rubric-2-2');
    expect(find.text('Score: 7 of 10'), findsOneWidget);
    await tapKey(tester, 'grade-save');
    expect(api.graded.single.rubric, {1: 1, 2: 2});
    expect(api.graded.single.score, isNull);
  });

  testWidgets('113.7 the course\'s teacher pins and deletes in a discussion', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(config: lmsConfig())
      ..thread = {
        ...questionThreadJson(),
        'lesson_id': 12,
        'lesson_title': 'Greetings',
        'can_moderate': true,
        'can_delete': true,
        'answers': [
          {
            'id': 4,
            'text': 'It returns a range object.',
            'author': personJson(name: 'Ayse Demir'),
            'created_at': '2026-10-03T11:00:00Z',
            'mine': false,
            'can_delete': true,
          },
        ],
      };
    final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.question(3));
    await tapKey(tester, 'question-pin');
    expect(api.pinned, {3: true});
    await tapKey(tester, 'answer-delete-4');
    await tester.tap(find.text('Delete answer').last);
    await TestApp.settle(tester);
    expect(api.deletedAnswers, [4]);
  });
}
