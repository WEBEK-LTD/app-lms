import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/lms/courses/course_detail_screen.dart';
import 'package:yallapp/modules/lms/lesson/lesson_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

Map<String, dynamic> _item(
  int id,
  String title, {
  String type = 'lesson',
  bool completed = false,
  int? minutes,
}) => {
  'id': id,
  'type': type,
  'title': title,
  'duration_minutes': minutes,
  'question_count': type == 'quiz' ? 3 : null,
  'preview': false,
  'locked': false,
  'completed': completed,
};

/// 50 A WordPress course the student is part way through: Tutor LMS topics in
/// the order the LMS gives them, the first one done.
Map<String, dynamic> twoTopics({bool started = true}) => {
  'topics': [
    {
      'id': 10,
      'title': 'Module 1: Getting started',
      'items': [
        _item(101, 'Lesson 1: Welcome', completed: started, minutes: 12),
        _item(102, 'Lesson 2: Your first function', completed: started),
        _item(201, 'Module 1 quiz', type: 'quiz', completed: started),
      ],
    },
    {
      'id': 11,
      'title': 'Module 2: Going further',
      'items': [
        _item(107, 'Lesson 7: Functions & Variables', minutes: 9),
        _item(108, 'Lesson 8: Files', minutes: 13),
        _item(301, 'Photograph a model', type: 'assignment'),
      ],
    },
  ],
};

FakeApi _api() {
  final api = FakeApi(
    course: courseDetailJson(enrolled: true, action: 'continue'),
  )..curriculum = twoTopics();
  api.lessons[107] = {
    ...textLessonJson(),
    'id': 107,
    'title': 'Lesson 7: Functions & Variables',
  };
  return api;
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  Future<TestApp> start(WidgetTester tester, FakeApi api, String tab) async {
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go(tab);
    await TestApp.settle(tester);
    return app;
  }

  Future<void> tapText(WidgetTester tester, String text) async {
    await tester.ensureVisible(find.text(text));
    await TestApp.settle(tester);
    await tester.tap(find.text(text));
    await TestApp.settle(tester);
  }

  /// The course page, on its curriculum, at the student's place.
  void expectCoursePage(WidgetTester tester, FakeApi api) {
    expect(find.byType(CourseDetailScreen), findsOneWidget);
    expect(find.byType(LessonScreen), findsNothing);
    expect(api.count('getLesson'), 0);
    expect(find.text('UI Design Fundamentals'), findsOneWidget);
    // Every topic shows; the one with the next lesson is open.
    expect(find.text('Module 1: Getting started'), findsOneWidget);
    expect(find.text('Module 2: Going further'), findsOneWidget);
    expect(find.text('Lesson 7: Functions & Variables'), findsOneWidget);
    expect(find.text('Lesson 1: Welcome'), findsNothing);
    expect(tester.takeException(), isNull);
  }

  testWidgets('My courses opens the course page, not a lesson', (tester) async {
    final api = _api();
    await start(tester, api, Paths.myCourses);
    await tester.tap(find.text('UI Design Fundamentals').first);
    await TestApp.settle(tester);
    expectCoursePage(tester, api);
  });

  testWidgets('the home screen\'s Continue card opens the course page', (
    tester,
  ) async {
    final api = _api();
    await start(tester, api, Paths.home);
    final card = find.textContaining('Functions & Variables').first;
    await tester.ensureVisible(card);
    await tester.tap(card);
    await TestApp.settle(tester);
    expectCoursePage(tester, api);
  });

  testWidgets('topics open and close; a lesson opens from its topic', (
    tester,
  ) async {
    final api = _api();
    final app = await start(tester, api, Paths.myCourses);
    app.container.read(appRouterProvider).push(Paths.course(1));
    await TestApp.settle(tester);
    expectCoursePage(tester, api);
    // What each topic holds, and the student's progress in it.
    expect(find.text('2 of 2 lessons · 12 min'), findsOneWidget);
    expect(find.text('0 of 2 lessons · 22 min'), findsOneWidget);

    await tapText(tester, 'Module 1: Getting started');
    expect(find.text('Lesson 1: Welcome'), findsOneWidget);
    expect(find.text('Module 1 quiz'), findsOneWidget);
    expect(find.text('Lesson 7: Functions & Variables'), findsOneWidget);

    await tapText(tester, 'Module 2: Going further');
    expect(find.text('Lesson 7: Functions & Variables'), findsNothing);
    expect(find.text('Lesson 1: Welcome'), findsOneWidget);

    await tapText(tester, 'Module 2: Going further');
    final lesson = find.text('Lesson 7: Functions & Variables');
    await tester.ensureVisible(lesson);
    await tester.tap(lesson);
    await TestApp.settle(tester);
    expect(find.byType(LessonScreen), findsOneWidget);
    expect(api.count('getLesson'), 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a visitor sees the first topic open', (tester) async {
    final api = FakeApi(course: courseDetailJson(action: 'checkout'))
      ..curriculum = twoTopics(started: false);
    final app = TestApp(signedIn: false, guest: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.course(1));
    await TestApp.settle(tester);
    await tapText(tester, 'Curriculum');
    expect(find.text('Lesson 1: Welcome'), findsOneWidget);
    expect(find.text('Lesson 7: Functions & Variables'), findsNothing);
    expect(find.text('3 lessons'), findsNothing);
    expect(find.text('2 lessons · 12 min'), findsOneWidget);
  });

  test('the current topic is the one with the next lesson', () {
    final topics = [
      for (final t in twoTopics()['topics'] as List)
        Topic.fromJson(t as Map<String, dynamic>),
    ];
    expect(currentTopicIndex(topics), 1);
    expect(currentTopicIndex(const []), 0);
  });
}
