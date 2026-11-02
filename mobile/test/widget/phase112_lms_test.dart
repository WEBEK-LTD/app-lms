import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/lms/quiz/quiz_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 112.5 Courses managed in Yallapp: assignments handed in and graded, live
/// classes joined, quizzes answered in writing and reviewed, items of a
/// course taken in order.

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

TestApp academy(FakeApi api, {List<String>? opened}) => TestApp(
  signedIn: true,
  appType: AppType.lms,
  api: api,
  overrides: [
    if (opened != null)
      openExternalProvider.overrideWithValue((url) async {
        opened.add(url);
        return true;
      }),
  ],
);

Map<String, dynamic> _item(
  int id,
  String type, {
  bool locked = false,
  String? reason,
  bool inApp = true,
  bool completed = false,
}) => {
  'id': id,
  'type': type,
  'title': 'Item $id',
  'duration_minutes': null,
  'question_count': null,
  'preview': false,
  'locked': locked,
  'completed': completed,
  'locked_reason': reason,
  'in_app': inApp,
  if (type == 'live') 'starts_at': '2026-10-20T16:30:00Z',
  if (type == 'assignment') 'due_at': '2026-10-20T20:59:00Z',
};

void main() {
  test('112.5 the models read the contract', () {
    final item = CurriculumItem.fromJson(
      _item(16, 'assignment', locked: true, reason: 'previous_not_done'),
    );
    expect(item.lockedReason, LockedReason.previousNotDone);
    expect(item.opensInApp, isTrue);
    expect(item.dueAt, DateTime.utc(2026, 10, 20, 20, 59));
    final website = CurriculumItem.fromJson(
      _item(17, 'live', inApp: false)..remove('in_app'),
    );
    expect(website.opensInApp, isFalse);
    expect(CurriculumItem.fromJson(_item(17, 'live')).counts, isFalse);
    // Continue learning skips live classes.
    final topics = [
      Topic(
        id: 1,
        title: 'One',
        items: [
          CurriculumItem.fromJson(_item(17, 'live')),
          CurriculumItem.fromJson(_item(16, 'assignment')),
        ],
      ),
    ];
    expect(nextItemToOpen(topics)?.id, 16);

    final assignment = Assignment.fromJson(
      assignmentJson(
        submission: assignmentSubmissionJson(
          status: 'graded',
          score: 18,
          passed: true,
          feedback: 'Great.',
        ),
      ),
    );
    expect(assignment.submission?.status, SubmissionStatus.graded);
    expect(assignment.submission?.score, 18);
    final live = LiveSession.fromJson(
      liveSessionJson(status: 'live', joinUrl: 'https://meet.test/a'),
    );
    expect(
      (live.status, live.joinUrl),
      (LiveStatus.live, 'https://meet.test/a'),
    );

    final review = QuestionReview.fromJson({
      'question_id': 1,
      'title': 'Merhaba means…',
      'type': 'single_choice',
      'correct': false,
      'options': [
        {'id': 'a', 'label': 'Hello'},
        {'id': 'b', 'label': 'Goodbye'},
      ],
      'chosen_option_ids': ['b'],
      'right_option_ids': ['a'],
      'text': null,
      'accepted_answers': <String>[],
    });
    expect((review.given, review.rightAnswer), ('Goodbye', 'Hello'));
    final written = QuestionReview.fromJson({
      'question_id': 2,
      'title': 'Thank you in Turkish',
      'type': 'short_answer',
      'correct': true,
      'options': <Object>[],
      'chosen_option_ids': <String>[],
      'right_option_ids': <String>[],
      'text': 'teşekkürler',
      'accepted_answers': ['Teşekkürler', 'Teşekkür ederim'],
    });
    expect(written.rightAnswer, 'Teşekkürler / Teşekkür ederim');
  });

  test('112.5 a short answer sends what was written', () {
    final questions = [
      Question.fromJson({
        'id': 1,
        'type': 'short_answer',
        'title': 'Capital of France?',
        'render_mode': 'native',
        'options': <Object>[],
      }),
      Question.fromJson({
        'id': 2,
        'type': 'single_choice',
        'title': '2 + 2?',
        'render_mode': 'native',
        'options': [
          {'id': 'a', 'label': '4'},
        ],
      }),
    ];
    expect(questions.first.isNative, isTrue);
    final answers = buildAnswers(
      questions,
      {
        2: {'a'},
      },
      {1: '  Paris '},
    );
    expect(answers.map((a) => a.toJson()), [
      {'question_id': 1, 'text': 'Paris'},
      {
        'question_id': 2,
        'option_ids': ['a'],
      },
    ]);
    expect(isUnanswered(questions.first, const {}, const {1: ' '}), isTrue);
  });

  test('112.5 a live class soon and a graded assignment open them', () {
    expect(
      pushTargetLocation({'type': 'live_class_soon', 'live_id': '17'}),
      Paths.liveSession(17),
    );
    expect(
      pushTargetLocation({
        'type': 'assignment_graded',
        'assignment_id': '16',
        'course_id': '1',
      }),
      Paths.assignment(16),
    );
  });

  testWidgets('112.5 a student hands an assignment in', (tester) async {
    usePhone(tester);
    final api = FakeApi();
    final app = academy(api);
    await app.pump(tester);
    await push(app, tester, Paths.assignment(16));
    expect(find.text('Introduce yourself'), findsWidgets);
    expect(find.textContaining('Out of 20 points'), findsOneWidget);
    expect(find.textContaining('Pass score: 10'), findsOneWidget);
    expect(find.byKey(const ValueKey('assignment-photo')), findsOneWidget);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('assignment-text')),
        matching: find.byType(TextField),
      ),
      'Merhaba, ben Deniz.',
    );
    await tapKey(tester, 'assignment-send');
    expect(api.assignmentsHandedIn.single, (
      assignment: 16,
      text: 'Merhaba, ben Deniz.',
      upload: null,
    ));
    expect(find.byKey(const ValueKey('assignment-submitted')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('112.5 a graded assignment shows the grade and the note', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi()
      ..assignment = assignmentJson(
        canSubmit: false,
        submission: assignmentSubmissionJson(
          status: 'graded',
          score: 18,
          passed: true,
          feedback: 'Great work.',
        ),
      );
    final app = academy(api);
    await app.pump(tester);
    await push(app, tester, Paths.assignment(16));
    expect(find.text('Graded: 18 of 20'), findsOneWidget);
    expect(find.text('Great work.'), findsOneWidget);
    expect(find.byKey(const ValueKey('assignment-send')), findsNothing);
  });

  testWidgets('112.5 a live class: its link opens when it is time', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final api = FakeApi();
    final app = academy(api, opened: opened);
    await app.pump(tester);
    await push(app, tester, Paths.liveSession(17));
    expect(find.text('Speaking club'), findsWidgets);
    expect(
      find.text('You can join from 15 minutes before it starts.'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('live-join')), findsNothing);

    api.liveSession = liveSessionJson(
      status: 'live',
      joinUrl: 'https://meet.test/abc',
    );
    app.container.read(appRouterProvider).pop();
    await TestApp.settle(tester);
    await push(app, tester, Paths.liveSession(17));
    expect(find.text('On now'), findsOneWidget);
    await tapKey(tester, 'live-join');
    expect(opened, ['https://meet.test/abc']);
  });

  testWidgets('112.5 the student\'s live classes', (tester) async {
    usePhone(tester);
    final api = FakeApi();
    final app = academy(api);
    await app.pump(tester);
    await push(app, tester, Paths.liveClasses);
    expect(find.byKey(const ValueKey('live-17')), findsOneWidget);
    await tester.tap(find.text('Past'));
    await TestApp.settle(tester);
    expect(find.text('No past live classes yet.'), findsOneWidget);
  });

  testWidgets('112.5 a quiz answered in writing, then its answers reviewed', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi()
      ..attempt = {
        'id': 31,
        'quiz_id': 201,
        'started_at': fromNow(Duration.zero),
        'ends_at': null,
        'questions': [
          {
            'id': 1,
            'type': 'short_answer',
            'title': 'Write “thank you” in Turkish',
            'description_html': null,
            'render_mode': 'native',
            'webview_url': null,
            'options': <Object>[],
            'points': 1,
          },
        ],
      }
      ..attemptResult = {
        'attempt_id': 31,
        'quiz_id': 201,
        'quiz_title': 'Module 2 quiz',
        'status': 'failed',
        'score_percent': 0,
        'finished_at': '2026-10-12T09:05:00Z',
        'review': [
          {
            'question_id': 1,
            'title': 'Write “thank you” in Turkish',
            'type': 'short_answer',
            'correct': false,
            'options': <Object>[],
            'chosen_option_ids': <String>[],
            'right_option_ids': <String>[],
            'text': 'merci',
            'accepted_answers': ['Teşekkürler'],
          },
        ],
      };
    final app = academy(api);
    await app.pump(tester);
    await push(app, tester, Paths.quiz(201));
    await tester.tap(find.text('Start a new attempt'));
    await TestApp.settle(tester);
    await tester.enterText(
      find.byKey(const ValueKey('short-answer-1')),
      'merci',
    );
    await tester.tap(find.text('Submit quiz'));
    await TestApp.settle(tester);
    expect(api.submittedAnswers.single.single.toJson(), {
      'question_id': 1,
      'text': 'merci',
    });
    expect(find.text('Your answers'), findsOneWidget);
    expect(find.text('Your answer: merci'), findsOneWidget);
    expect(find.text('Right answer: Teşekkürler'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('112.5 a course taken in order: an item after one not done', (
    tester,
  ) async {
    // Tall enough for the whole curriculum above the course's bottom bar.
    final view = tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(view.reset);
    final api = FakeApi(course: courseDetailJson(enrolled: true))
      ..curriculum = {
        'topics': [
          {
            'id': 10,
            'title': 'Module 1',
            'items': [
              _item(16, 'assignment'),
              _item(17, 'live'),
              _item(18, 'lesson', locked: true, reason: 'previous_not_done'),
            ],
          },
        ],
      };
    final app = academy(api);
    await app.pump(tester);
    await push(app, tester, Paths.course(1));
    final after = find.text('Item 18');
    expect(find.text('After the one before'), findsOneWidget);
    await tester.tap(after);
    await tester.pump();
    expect(
      find.text('Finish what comes before it in the course first.'),
      findsOneWidget,
    );
    await TestApp.settle(tester);
    await tester.tap(find.text('Item 16'));
    await TestApp.settle(tester);
    expect(find.text('Introduce yourself'), findsWidgets);
    expect(api.count('getAssignment'), 1);
  });
}
