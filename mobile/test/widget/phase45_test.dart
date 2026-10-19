import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/widgets/file_viewer.dart';
import 'package:yallapp/modules/lms/downloads/download_manager.dart';
import 'package:yallapp/modules/lms/downloads/progress_queue.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 45 A course the student finished, with the date and a certificate.
Map<String, dynamic> finishedCourseJson({bool certificate = true}) => {
  ...courseDetailJson(enrolled: true, action: 'continue'),
  'progress': {
    'course_id': 1,
    'completed_items': 3,
    'total_items': 3,
    'percent': 100,
    'course_completed': true,
    'completed_at': '2026-10-12T09:30:00Z',
  },
  'certificate_url': certificate
      ? 'https://your-academy.com/certificate/1'
      : null,
};

Map<String, dynamic> finishedMyCourseJson() => {
  'course': courseSummaryJson(enrolled: true),
  'progress': (finishedCourseJson()['progress'] as Map<String, dynamic>),
  'certificate_url': 'https://your-academy.com/certificate/1',
};

/// A text lesson that can be saved: text, an image and an attachment.
Map<String, dynamic> savableTextLesson() => {
  ...textLessonJson(),
  'id': 110,
  'title': 'Reading offline',
  'html': '<p>Saved notes for the train.</p>',
  'embeds': <Object>[],
  'offline': {'available': true, 'reason': null, 'size_bytes': 14},
};

Map<String, dynamic> downloadsConfig({bool downloads = true}) {
  final config = configJson();
  (config['features'] as Map<String, dynamic>)['downloads'] = downloads;
  return config;
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

  Future<TestApp> open(
    WidgetTester tester,
    String location, {
    FakeApi? api,
    AppTemplate template = AppTemplate.classic,
    Map<String, Object> preferences = const {},
  }) async {
    final app = TestApp(
      signedIn: true,
      template: template,
      preferences: preferences,
      api: api ?? FakeApi(course: finishedCourseJson()),
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(location);
    await TestApp.settle(tester);
    return app;
  }

  group('a finished course says so', () {
    for (final template in AppTemplate.values) {
      testWidgets('on the course page, ${template.name}', (tester) async {
        await open(tester, '/course/1', template: template);
        expect(find.byKey(const ValueKey('course-completed')), findsOneWidget);
        expect(find.text("You've completed this course"), findsOneWidget);
        expect(find.text('Completed on 12 Oct 2026'), findsOneWidget);
        expect(find.text('View certificate'), findsOneWidget);
        expect(find.byKey(const ValueKey('cta-continue')), findsNothing);
        expect(find.text('Continue learning'), findsNothing);
        expect(find.byKey(const ValueKey('cta-review')), findsOneWidget);

        // "Review course" opens the curriculum, never the first lesson.
        await tester.ensureVisible(find.text('Overview'));
        await TestApp.settle(tester);
        await tester.tap(find.text('Overview'));
        await TestApp.settle(tester);
        expect(find.text('Module 1: Introduction'), findsNothing);
        await tester.tap(find.text('Review course'));
        await TestApp.settle(tester);
        expect(find.text('Module 1: Introduction'), findsOneWidget);
        expect(find.text('Writing your first function'), findsNothing);
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('right to left, in Arabic', (tester) async {
      final config = configJson(languages: languagesJson());
      await open(
        tester,
        '/course/1',
        api: FakeApi(config: config, course: finishedCourseJson()),
        preferences: {'settings.language': 'ar'},
      );
      expect(tester.takeException(), isNull);
      expect(find.text('لقد أكملت هذه الدورة'), findsOneWidget);
      expect(find.text('مراجعة الدورة'), findsOneWidget);
      expect(find.text('عرض الشهادة'), findsOneWidget);
      final direction = Directionality.of(
        tester.element(find.byKey(const ValueKey('course-completed'))),
      );
      expect(direction, TextDirection.rtl);
    });

    testWidgets('without a date or certificate, it still says Completed', (
      tester,
    ) async {
      final course = finishedCourseJson(certificate: false);
      course['progress'] = <String, dynamic>{
        ...(course['progress'] as Map),
        'completed_at': null,
      };
      await open(tester, '/course/1', api: FakeApi(course: course));
      expect(find.text("You've completed this course"), findsOneWidget);
      expect(find.text('Completed'), findsWidgets);
      expect(find.text('View certificate'), findsNothing);
    });

    testWidgets('an older server: every lesson and quiz done counts', (
      tester,
    ) async {
      final api = FakeApi(
        course: courseDetailJson(enrolled: true, action: 'continue'),
      );
      final curriculum = curriculumJson();
      for (final item
          in (curriculum['topics'] as List).first['items'] as List) {
        (item as Map<String, dynamic>)
          ..['completed'] = true
          ..['locked'] = false;
      }
      api.curriculum = curriculum;
      await open(tester, '/course/1', api: api);
      expect(find.text("You've completed this course"), findsOneWidget);
      expect(find.text('Review course'), findsOneWidget);
    });

    testWidgets('in My courses › Completed, with the date and Review course', (
      tester,
    ) async {
      final api = FakeApi(course: finishedCourseJson())
        ..completedCourses = [finishedMyCourseJson()];
      final app = TestApp(signedIn: true, api: api);
      await app.pump(tester);
      app.container.read(appRouterProvider).go('/my-courses?tab=completed');
      await TestApp.settle(tester);
      expect(find.text('Completed on 12 Oct 2026'), findsOneWidget);
      expect(find.text('Certificate'), findsOneWidget);
      await tester.tap(find.text('Review course'));
      await TestApp.settle(tester);
      expect(find.text("You've completed this course"), findsOneWidget);
    });
  });

  testWidgets('course cards say Completed instead of Enrolled', (tester) async {
    final api = FakeApi(course: finishedCourseJson())
      ..catalogEnrolled = true
      ..completedCourses = [finishedMyCourseJson()];
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/courses');
    await TestApp.settle(tester);
    expect(find.text('Completed'), findsOneWidget);
    expect(find.text('Enrolled'), findsNothing);
  });

  group('lessons saved for offline viewing', () {
    Future<TestApp> lesson(
      WidgetTester tester,
      Map<String, dynamic> json, {
      bool downloads = true,
    }) async {
      final api = FakeApi(
        config: downloadsConfig(downloads: downloads),
        course: courseDetailJson(enrolled: true, action: 'continue'),
        lesson: json,
      );
      return open(tester, '/lesson/${json['id']}', api: api);
    }

    testWidgets('saves a lesson, lists it in Downloads, and deletes it all', (
      tester,
    ) async {
      final app = await lesson(tester, savableTextLesson());
      expect(find.byKey(const ValueKey('lesson-download')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('lesson-download')));
      await TestApp.settle(tester);
      expect(
        find.text('Saving for offline. You can keep using the app.'),
        findsOneWidget,
      );
      await TestApp.settle(tester);
      final state = app.container.read(downloadManagerProvider);
      expect(state.isSaved(110), isTrue);
      expect(app.api.count('downloadLesson'), 1);

      app.container.read(appRouterProvider).push('/account/downloads');
      await TestApp.settle(tester);
      expect(find.text('Downloads'), findsWidgets);
      expect(find.text('UI Design Fundamentals'), findsOneWidget);
      expect(find.text('Reading offline'), findsOneWidget);
      expect(find.text('1 lesson saved for offline · 10 B'), findsOneWidget);
      expect(find.text('Storage used'), findsOneWidget);

      // Wi-Fi only, on by default.
      final wifi = find.byKey(const ValueKey('downloads-wifi-only'));
      expect(tester.widget<Switch>(wifi).value, isTrue);
      await tester.tap(wifi);
      await TestApp.settle(tester);
      expect(
        app.container.read(downloadManagerProvider).index.wifiOnly,
        isFalse,
      );

      await tester.tap(find.byKey(const ValueKey('downloads-delete-all')));
      await TestApp.settle(tester);
      await tester.tap(find.text('Delete'));
      await TestApp.settle(tester);
      expect(find.text('No downloads yet'), findsOneWidget);
      expect(app.container.read(downloadManagerProvider).index.isEmpty, isTrue);
    });

    testWidgets('opens a saved lesson without a connection', (tester) async {
      final app = await lesson(tester, savableTextLesson());
      app.api.downloads[110] = {
        'lesson_id': 110,
        'course_id': 1,
        'files': [
          {
            'kind': 'attachment',
            'url': 'https://your-academy.com/wp-json/yallapp/v1/media/5?dl=1',
            'source_url': 'https://your-academy.com/slides.pdf',
            'name': 'Slides.pdf',
            'mime_type': 'application/pdf',
          },
        ],
        'expires_at': fromNow(const Duration(minutes: 15)),
        'keep_days': 30,
      };
      await tester.tap(find.byKey(const ValueKey('lesson-download')));
      await TestApp.settle(tester);
      await TestApp.settle(tester);
      final router = app.container.read(appRouterProvider)..pop();
      await TestApp.settle(tester);

      app.api.failures['getLesson'] = const ApiException(
        code: ApiException.networkError,
        message: "You're offline.",
      );
      router.push('/lesson/110');
      await TestApp.settle(tester);
      expect(find.text('Reading offline'), findsOneWidget);
      expect(
        find.textContaining('Saved notes for the train.', findRichText: true),
        findsOneWidget,
      );
      // Its attachment opens (53: in the app's own viewer, as this config
      // protects lessons; phase53_test.dart opens it from the phone without).
      await tester.tap(find.text('Slides.pdf'));
      await TestApp.settle(tester);
      expect(find.byType(FileViewerScreen), findsOneWidget);
      expect(app.downloads.opened, isEmpty);
    });

    testWidgets("a video site's lesson explains it needs the internet", (
      tester,
    ) async {
      final json = {
        ...savableTextLesson(),
        'offline': {'available': false, 'reason': 'video_site'},
      };
      final app = await lesson(tester, json);
      await tester.tap(find.byKey(const ValueKey('lesson-download')));
      await TestApp.settle(tester);
      expect(
        find.textContaining(
          'plays from a video site, so it needs the internet',
        ),
        findsOneWidget,
      );
      expect(app.api.count('downloadLesson'), 0);
    });

    testWidgets('no download button when the app has no downloads', (
      tester,
    ) async {
      await lesson(tester, savableTextLesson(), downloads: false);
      expect(find.byKey(const ValueKey('lesson-download')), findsNothing);
    });

    testWidgets('the course page saves the whole course', (tester) async {
      final api = FakeApi(
        config: downloadsConfig(),
        course: courseDetailJson(enrolled: true, action: 'continue'),
        lesson: {...savableTextLesson(), 'id': 101},
      );
      final app = await open(tester, '/course/1', api: api);
      expect(find.text('Save course for offline'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('course-download')));
      await TestApp.settle(tester);
      await TestApp.settle(tester);
      // Only the lesson the student can open (101); 102 is locked.
      expect(app.container.read(downloadManagerProvider).isSaved(101), isTrue);
      expect(find.text('1 lesson saved for offline'), findsOneWidget);
    });

    testWidgets('Account › Downloads, with the space it takes', (tester) async {
      final api = FakeApi(config: downloadsConfig());
      final app = TestApp(signedIn: true, api: api);
      await app.pump(tester);
      app.container.read(appRouterProvider).go('/account');
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('account-downloads')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('account-downloads')));
      await TestApp.settle(tester);
      expect(find.text('No downloads yet'), findsOneWidget);
    });

    testWidgets('completing a lesson offline is sent later', (tester) async {
      final app = await lesson(tester, savableTextLesson());
      app.api.failures['completeLesson'] = const ApiException(
        code: ApiException.networkError,
        message: "You're offline.",
      );
      await tester.tap(find.text('Mark complete'));
      await TestApp.settle(tester);
      expect(
        find.text("Marked complete. It's sent when you're back online."),
        findsOneWidget,
      );
      final queue = app.container.read(progressQueueProvider);
      expect(queue.completedOffline(110), isTrue);
      await queue.flush(app.api);
      expect(queue.isEmpty, isTrue);
      expect(app.api.count('completeLesson'), 2);
    });
  });
}
