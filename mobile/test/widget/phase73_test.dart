import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/modules/lms/downloads/progress_queue.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase45_test.dart' show finishedCourseJson;

/// 73 A finished course the student can take again: "Start the course
/// again" asks first, clears the progress (and what waits to be sent from
/// the phone), then opens the first lesson. Hidden when the server says
/// the course can't be started again, or doesn't say (older servers).
Map<String, dynamic> restartableCourseJson({bool canRestart = true}) => {
  ...finishedCourseJson(),
  'can_restart': canRestart,
};

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

  Future<TestApp> open(
    WidgetTester tester, {
    required FakeApi api,
    AppTemplate template = AppTemplate.classic,
    Map<String, Object> preferences = const {},
  }) async {
    final app = TestApp(
      signedIn: true,
      template: template,
      preferences: preferences,
      api: api,
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);
    return app;
  }

  test('forgets what waits to be sent for the course\'s lessons', () async {
    SharedPreferences.setMockInitialValues({
      ProgressQueue.key: jsonEncode([
        {'lesson_id': 101, 'complete': true, 'position': 0, 'percent': 0},
        {'lesson_id': 999, 'complete': false, 'position': 40, 'percent': 20},
        {'lesson_id': 102, 'complete': false, 'position': 10, 'percent': 5},
      ]),
    });
    final queue = ProgressQueue(await SharedPreferences.getInstance());
    await queue.forgetLessons([101, 102, 201]);
    expect(queue.items.map((i) => i.lessonId), [999]);
    await queue.forgetLessons([5]);
    expect(queue.items.map((i) => i.lessonId), [999]);
  });

  test('reads can_restart, false when missing', () {
    expect(CourseDetail.fromJson(restartableCourseJson()).canRestart, isTrue);
    expect(
      CourseDetail.fromJson(restartableCourseJson(canRestart: false))
          .canRestart,
      isFalse,
    );
    expect(CourseDetail.fromJson(finishedCourseJson()).canRestart, isFalse);
  });

  for (final template in AppTemplate.values) {
    testWidgets(
      'asks, starts again and opens the first lesson, ${template.name}',
      (tester) async {
        final api = FakeApi(course: restartableCourseJson());
        await open(tester, api: api, template: template);
        expect(find.byKey(const ValueKey('cta-restart')), findsOneWidget);
        expect(find.byKey(const ValueKey('cta-review')), findsOneWidget);
        expect(find.text('Start the course again'), findsOneWidget);

        // Cancelled: nothing changes.
        await tester.tap(find.byKey(const ValueKey('cta-restart')));
        await TestApp.settle(tester);
        expect(find.text('Start the course again?'), findsOneWidget);
        await tester.tap(find.text('Cancel'));
        await TestApp.settle(tester);
        expect(api.restarted, isEmpty);

        await tester.tap(find.byKey(const ValueKey('cta-restart')));
        await TestApp.settle(tester);
        await tester.tap(find.text('Start again'));
        await TestApp.settle(tester);
        expect(api.restarted, [1]);
        expect(
          api.calls.sublist(api.calls.indexOf('restartCourse')),
          contains('getLesson'),
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('not offered when the course says no, or says nothing', (
    tester,
  ) async {
    await open(
      tester,
      api: FakeApi(course: restartableCourseJson(canRestart: false)),
    );
    expect(find.byKey(const ValueKey('cta-restart')), findsNothing);
    expect(find.byKey(const ValueKey('cta-review')), findsOneWidget);
  });

  testWidgets('an unfinished course keeps "Continue learning"', (tester) async {
    await open(
      tester,
      api: FakeApi(
        course: {
          ...courseDetailJson(enrolled: true, action: 'continue'),
          'can_restart': true,
        },
      ),
    );
    expect(find.byKey(const ValueKey('cta-restart')), findsNothing);
    expect(find.byKey(const ValueKey('cta-continue')), findsOneWidget);
  });

  testWidgets('says why when the server refuses', (tester) async {
    final api = FakeApi(course: restartableCourseJson())
      ..failures['restartCourse'] = const ApiException(
        code: 'restart_disabled',
        message: "This course can't be started again.",
        statusCode: 403,
      );
    await open(tester, api: api);
    await tester.tap(find.byKey(const ValueKey('cta-restart')));
    await TestApp.settle(tester);
    await tester.tap(find.text('Start again'));
    await TestApp.settle(tester);
    expect(find.text("This course can't be started again."), findsOneWidget);
    expect(find.byKey(const ValueKey('cta-restart')), findsOneWidget);
  });

  testWidgets('in Arabic, right to left', (tester) async {
    final config = configJson(languages: languagesJson());
    await open(
      tester,
      api: FakeApi(config: config, course: restartableCourseJson()),
      preferences: {'settings.language': 'ar'},
    );
    expect(find.text('ابدأ الدورة من جديد'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('cta-restart')));
    await TestApp.settle(tester);
    expect(find.text('هل تريد بدء الدورة من جديد؟'), findsOneWidget);
    expect(find.text('ابدأ من جديد'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('in Turkish', (tester) async {
    final config = configJson(languages: languagesJson());
    await open(
      tester,
      api: FakeApi(config: config, course: restartableCourseJson()),
      preferences: {'settings.language': 'tr'},
    );
    expect(find.text('Kursa yeniden başla'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
