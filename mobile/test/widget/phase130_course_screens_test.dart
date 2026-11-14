import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 130.52 Studio's course screens (`Config.screens.courses`): the course
/// card, a course's page, the lesson and My courses in each look and with
/// each option, by day, by night and right to left, with the course's own
/// data only; without them every screen is as before.
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

  Map<String, dynamic> curriculum() => {
    'topics': [
      {
        'id': 2,
        'title': 'Unit 2',
        'items': [
          for (final (id, type, title, minutes, questions, done, locked) in [
            (101, 'lesson', 'Colour', 15, null, true, false),
            (102, 'lesson', 'Layout principles', 18, null, false, false),
            (103, 'lesson', 'Grids and spacing', 22, null, false, false),
            (201, 'quiz', 'Unit 2 quiz', null, 10, false, true),
          ])
            {
              'id': id,
              'type': type,
              'title': title,
              'duration_minutes': minutes,
              'question_count': questions,
              'preview': false,
              'locked': locked,
              'completed': done,
            },
        ],
      },
    ],
  };

  FakeApi api({Map<String, dynamic>? courses, bool enrolled = false}) {
    final config = configJson(languages: languagesJson());
    final api = FakeApi(
      config: {
        ...config,
        'features': {
          ...(config['features'] as Map<String, dynamic>),
          'notes': true,
          'reviews': true,
        },
        'screens': {'courses': ?courses},
      },
      lesson: {
        ...videoLessonJson(),
        'id': 102,
        'title': 'Layout principles',
        'previous_id': 101,
        'next_id': 103,
        'attachments': [
          {
            'name': 'Spacing guide.pdf',
            'url': 'https://academy.test/guide.pdf',
            'size_bytes': 1258291,
            'mime_type': 'application/pdf',
          },
        ],
      },
    );
    api.course = {
      ...api.course,
      'enrolled': enrolled,
      'student_count': 1240,
      'about': {
        'learn': ['Lay out a screen on a grid', 'Choose colours that work'],
      },
    };
    api.curriculum = curriculum();
    return api;
  }

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api,
    String location, {
    bool dark = false,
    String language = 'en',
    bool signedIn = true,
  }) async {
    final app = TestApp(
      appType: AppType.lms,
      api: api,
      signedIn: signedIn,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    app.container.read(appRouterProvider).push(location);
    await TestApp.settle(tester, 20);
    return app;
  }

  group('the model', () {
    test("every option left out is the look's own; unknown values too", () {
      final look = CourseScreensLook.tryParse({
        'look': 'index',
        'card': {'layout': 'carousel', 'scrim': 200, 'hide': ['price', 'x']},
        'lesson': {'progress': 'ring', 'hide': ['up_next']},
        'my_courses': {
          'hide': ['continue'],
          'headline': {'en': ' Keep going '},
        },
      })!;
      expect(look.look, CourseLook.faculty);
      expect(look.card.layout, CourseCardLayout.ticket);
      expect(look.card.scrim, 0);
      expect(look.card.hide, {CourseCardPart.price});
      expect(look.page.hero, CoursePageHero.split);
      expect(look.page.bar, CourseEnrolBar.solid);
      expect(look.lesson.progress, LessonProgress.ring);
      expect(look.lesson.hide, {LessonPart.upNext});
      expect(look.myCourses.hide, {MyCoursesPart.continueLearning});
      expect(look.myCourses.headline, {'en': 'Keep going'});
      expect(
        CourseScreensLook.tryParse({'look': 'on_air'})!.card.layout,
        CourseCardLayout.glass,
      );
      expect(CourseScreensLook.tryParse({'look': 'neon'}), isNull);
      expect(StudioScreens.fromJson(<String, dynamic>{})!.courses, isNull);
    });
  });

  group('the course card', () {
    for (final (look, layout) in [
      ('cinema', 'poster'),
      ('ring', 'row'),
      ('index', 'ticket'),
      ('on_air', 'glass'),
    ]) {
      testWidgets('$look draws the $layout card with the rating as stars', (
        tester,
      ) async {
        await open(tester, api(courses: {'look': look}), '/courses');
        expect(
          find.byKey(ValueKey('studio-course-card-$layout-1')),
          findsOneWidget,
        );
        expect(
          find.bySemanticsLabel(RegExp('4.6 out of 5 stars')),
          findsOneWidget,
        );
        expect(find.text('Deniz Kaya'), findsWidgets);
      });
    }

    testWidgets('an enrolled student sees how far they are, not the price', (
      tester,
    ) async {
      final fake = api(courses: {'look': 'on_air'});
      fake.catalogEnrolled = true;
      await open(tester, fake, '/courses');
      expect(find.byKey(const ValueKey('studio-course-card-glass-1')), findsOneWidget);
      expect(find.text('60%'), findsOneWidget);
      expect(find.text('₺450'), findsNothing);
    });

    testWidgets('the parts the owner left out are not drawn', (tester) async {
      await open(
        tester,
        api(
          courses: {
            'look': 'ring',
            'card': {
              'hide': ['teacher', 'rating', 'price'],
            },
          },
        ),
        '/courses',
      );
      expect(find.byKey(const ValueKey('studio-course-card-row-1')), findsOneWidget);
      expect(find.text('Deniz Kaya'), findsNothing);
      expect(find.text('₺450'), findsNothing);
      expect(find.bySemanticsLabel(RegExp('out of 5 stars')), findsNothing);
    });
  });

  group("a course's page", () {
    for (final (look, hero, bar) in [
      ('cinema', 'cinema', 'glass'),
      ('ring', 'framed', 'floating'),
      ('index', 'split', 'solid'),
    ]) {
      for (final (dark, language) in [(false, 'en'), (true, 'ar')]) {
        testWidgets(
          '$look: the $hero hero, the sections and the $bar bar, '
          '${dark ? 'dark, right to left' : 'light'}',
          (tester) async {
            await open(
              tester,
              api(courses: {'look': look}),
              '/course/1',
              dark: dark,
              language: language,
            );
            expect(
              find.byKey(ValueKey('studio-course-hero-$hero')),
              findsOneWidget,
            );
            expect(find.byKey(const ValueKey('studio-course-sections')), findsOneWidget);
            expect(find.text('UI Design Fundamentals'), findsWidgets);
            expect(find.text('Lay out a screen on a grid'), findsOneWidget);
            expect(find.byKey(const ValueKey('cta-checkout')), findsOneWidget);
            if (bar == 'floating') {
              expect(find.byKey(const ValueKey('bottom-bar-floating')), findsOneWidget);
            } else if (bar == 'glass') {
              expect(find.byKey(const ValueKey('bottom-bar-glass')), findsOneWidget);
            }
            if (language == 'ar') {
              final back = tester.getCenter(
                find.byKey(const ValueKey('studio-course-back')),
              );
              expect(back.dx, greaterThan(300));
            }
            // The curriculum as a timeline, the student's place on it.
            await tester.scrollUntilVisible(
              find.byKey(const ValueKey('studio-curriculum')),
              300,
              scrollable: find
                  .descendant(
                    of: find.byKey(const ValueKey('studio-course-page')),
                    matching: find.byType(Scrollable),
                  )
                  .first,
            );
            expect(
              find.byKey(const ValueKey('studio-curriculum-lesson-102')),
              findsOneWidget,
            );
            expect(find.byKey(const ValueKey('studio-course-reviews')), findsOneWidget);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }

    testWidgets("the owner's words on the button, and the parts left out", (
      tester,
    ) async {
      await open(
        tester,
        api(
          courses: {
            'look': 'cinema',
            'page': {
              'hide': ['learn', 'reviews', 'teacher'],
              'cta': {'en': 'Join the class'},
            },
          },
        ),
        '/course/1',
      );
      expect(find.text('Join the class'), findsOneWidget);
      expect(find.text('Lay out a screen on a grid'), findsNothing);
      expect(find.byKey(const ValueKey('studio-course-reviews')), findsNothing);
      expect(find.byKey(const ValueKey('studio-course-teacher')), findsNothing);
    });
  });

  group('the lesson', () {
    for (final (look, player, progress) in [
      ('cinema', 'cinema', 'segments'),
      ('ring', 'framed', 'ring'),
      ('index', 'framed', 'bar'),
    ]) {
      for (final (dark, language) in [(false, 'en'), (true, 'ar')]) {
        testWidgets(
          '$look: the $player player and the $progress progress, '
          '${dark ? 'dark, right to left' : 'light'}',
          (tester) async {
            await open(
              tester,
              api(courses: {'look': look}, enrolled: true),
              '/lesson/102',
              dark: dark,
              language: language,
            );
            expect(
              find.byKey(ValueKey('studio-lesson-$player')),
              findsOneWidget,
            );
            expect(
              find.byKey(ValueKey('studio-lesson-progress-$progress')),
              findsOneWidget,
            );
            expect(
              find.text(language == 'ar' ? '1 من 4' : '1 of 4'),
              findsOneWidget,
            );
            expect(find.byKey(const ValueKey('studio-lesson-previous')), findsOneWidget);
            expect(find.byKey(const ValueKey('studio-lesson-next')), findsOneWidget);
            // The resources as a chip with how many.
            expect(
              find.text(language == 'ar' ? 'الموارد 1' : 'Resources 1'),
              findsOneWidget,
            );
            expect(tester.takeException(), isNull);
          },
        );
      }
    }

    testWidgets('the parts left out', (tester) async {
      await open(
        tester,
        api(
          courses: {
            'look': 'cinema',
            'lesson': {
              'hide': ['progress', 'resources', 'up_next'],
            },
          },
          enrolled: true,
        ),
        '/lesson/102',
      );
      expect(find.byKey(const ValueKey('studio-lesson-cinema')), findsOneWidget);
      expect(find.byKey(const ValueKey('studio-lesson-progress-segments')), findsNothing);
      expect(find.text('Spacing guide.pdf'), findsNothing);
      expect(find.byKey(const ValueKey('premium-next')), findsNothing);
    });
  });

  group('My courses', () {
    for (final (look, layout) in [('cinema', 'list'), ('ring', 'grid')]) {
      for (final (dark, language) in [(false, 'en'), (true, 'ar')]) {
        testWidgets(
          '$look: continue learning and the $layout, '
          '${dark ? 'dark, right to left' : 'light'}',
          (tester) async {
            await open(
              tester,
              api(
                courses: {
                  'look': look,
                  'my_courses': {
                    'headline': {
                      'en': 'Pick up where you left off.',
                      'ar': 'تابع من حيث توقفت.',
                    },
                  },
                },
              ),
              '/my-courses',
              dark: dark,
              language: language,
            );
            expect(
              find.byKey(ValueKey('studio-my-courses-$layout')),
              findsOneWidget,
            );
            expect(
              find.byKey(const ValueKey('studio-my-courses-continue')),
              findsOneWidget,
            );
            expect(
              find.text(
                language == 'ar'
                    ? 'تابع من حيث توقفت.'
                    : 'Pick up where you left off.',
              ),
              findsOneWidget,
            );
            expect(find.byKey(const ValueKey('studio-my-course-1')), findsOneWidget);
            expect(find.text('60%'), findsWidgets);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }

    testWidgets('the completed courses with their certificate', (tester) async {
      final fake = api(courses: {'look': 'index'});
      fake.completedCourses = [
        {
          ...myCourseJson(),
          'course': courseSummaryJson(id: 2, title: 'Business English', enrolled: true),
          'progress': {
            'course_id': 2,
            'completed_items': 20,
            'total_items': 20,
            'percent': 100,
            'course_completed': true,
          },
          'next_item': null,
          'certificate_url': 'https://academy.test/certificate/2.pdf',
        },
      ];
      await open(tester, fake, '/my-courses');
      await tester.tap(find.byKey(const ValueKey('studio-my-courses-chip-1')));
      await TestApp.settle(tester, 10);
      expect(find.text('Business English'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('studio-my-course-certificate-2')),
        findsOneWidget,
      );
    });

    testWidgets('without continue learning and the completed list', (
      tester,
    ) async {
      await open(
        tester,
        api(
          courses: {
            'look': 'ring',
            'my_courses': {
              'hide': ['continue', 'completed', 'week'],
            },
          },
        ),
        '/my-courses',
      );
      expect(find.byKey(const ValueKey('studio-my-courses-continue')), findsNothing);
      expect(find.byKey(const ValueKey('studio-my-courses-week')), findsNothing);
      expect(find.byKey(const ValueKey('studio-my-courses-chip-1')), findsOneWidget);
      expect(find.textContaining('Completed'), findsNothing);
    });
  });

  testWidgets('without the course screens, every screen is as before', (
    tester,
  ) async {
    final fake = api();
    final app = await open(tester, fake, '/courses');
    expect(find.byKey(const ValueKey('studio-course-card-poster-1')), findsNothing);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('studio-course-page')), findsNothing);
    app.container.read(appRouterProvider).go('/my-courses');
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('studio-my-courses-list')), findsNothing);
    expect(find.byKey(const ValueKey('studio-my-courses-grid')), findsNothing);
  });
}
