import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_module.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/chat/data/chat_api.dart';
import 'package:yallapp/modules/chat/data/chat_media.dart';
import 'package:yallapp/modules/lms/lms_routes.dart';
import 'package:yallapp/modules/lms/teachers/lesson_upload.dart';
import 'package:yallapp/modules/lms/teachers/teacher_widgets.dart';

import '../support/fake_api.dart';
import '../support/fake_chat_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi teachersApi({List<String> roles = const [], bool applications = true}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'vertical': 'instructors',
      'instructors': {'applications': applications, 'timezone': 'Africa/Cairo'},
    },
  );
  api.me = {...userJson(), 'roles': roles};
  return api;
}

/// Sends chunks nowhere: the gate has whatever arrives.
class MemoryUploads implements ChunkedUploads {
  MemoryUploads(this.api);

  final FakeApi api;
  final sent = <int>[];

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => api.startTeacherUpload(name: name, size: size, type: type);

  @override
  Future<ChatUpload> resumeUpload(String uploadId) =>
      api.resumeTeacherUpload(uploadId);

  @override
  Future<void> completeUpload(String uploadId) =>
      api.completeTeacherUpload(uploadId);

  @override
  Future<int> uploadOffset(String uploadUrl) async => sent.length;

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) async {
    sent.addAll(bytes);
    return offset + bytes.length;
  }
}

class FakeLessonPicker implements LessonFilePicker {
  ChatPick? next;

  @override
  Future<ChatPick?> pick() async => next;
}

TestApp teachersApp(
  FakeApi api, {
  bool signedIn = true,
  FakeLessonPicker? picker,
  MemoryUploads? uploads,
}) => TestApp(
  api: api,
  signedIn: signedIn,
  guest: !signedIn,
  overrides: [
    lessonFilePickerProvider.overrideWithValue(picker ?? FakeLessonPicker()),
    teacherUploadsProvider.overrideWithValue(uploads ?? MemoryUploads(api)),
  ],
);

void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> go(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).go(location);
  await TestApp.settle(tester);
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

List<String?> tabPaths(TestApp app) =>
    app.container.read(shellTabsProvider).map((t) => t.path).toList();

void main() {
  group('105.3 Teacher tab', () {
    ShellTab tab(String path) =>
        ShellTab(location: path, label: (_) => path, icon: Icons.circle);

    test('is added before Account, for teachers only', () {
      final tabs = [
        tab(Paths.home),
        tab(Paths.courses),
        tab(Paths.myCourses),
        tab(Paths.account),
      ];
      expect(withTeacherTab(tabs, true).map((t) => t.path), [
        Paths.home,
        Paths.courses,
        Paths.myCourses,
        Paths.teacherDesk,
        Paths.account,
      ]);
      expect(withTeacherTab(tabs, false).map((t) => t.path), [
        Paths.home,
        Paths.courses,
        Paths.myCourses,
        Paths.account,
      ]);
      expect(withTeacherTab(tabs, null), same(tabs));
      expect(teacherTab.path, Paths.teacherDesk);
    });

    test('notifications open the course, the teacher\'s course and the '
        'question', () {
      expect(
        pushTargetLocation({'type': 'new_course', 'course_id': '30'}),
        Paths.course(30),
      );
      expect(
        pushTargetLocation({'type': 'teacher_course', 'course_id': '30'}),
        Paths.teacherCourse(30),
      );
      expect(
        pushTargetLocation({
          'type': 'teacher_question',
          'course_id': '30',
          'question_id': '5',
        }),
        Paths.question(5),
      );
      expect(
        pushTargetLocation({'type': 'teacher_question'}),
        Paths.teacherDesk,
      );
    });

    test('the teachers are anyone\'s; applying and the teacher\'s screens '
        'need an account', () {
      expect(Paths.requiresAuth(Paths.teachers), isFalse);
      expect(Paths.requiresAuth(Paths.teacherPage(7)), isFalse);
      expect(Paths.requiresAuth(Paths.teachApply), isTrue);
      expect(Paths.requiresAuth(Paths.teacherDesk), isTrue);
      expect(Paths.requiresAuth(Paths.teacherCourse(3)), isTrue);
      expect(Paths.requiresAuth(Paths.newTeacherCourse), isTrue);
    });

    test('subjects are split on commas, Arabic ones too', () {
      expect(splitSubjects('Arabic, Grammar ,Arabic'), ['Arabic', 'Grammar']);
      expect(splitSubjects('العربية، النحو'), ['العربية', 'النحو']);
      expect(splitSubjects(' , '), isEmpty);
    });
  });

  testWidgets('105.3 a student finds a teacher, follows and rates them', (
    tester,
  ) async {
    usePhone(tester);
    final api = teachersApi()
      ..teacher = teacherDetailJson(canReview: true)
      ..teachers = [
        teacherSummaryJson(),
        teacherSummaryJson(id: 8, name: 'Kerem Aydın', featured: false),
      ];
    final app = teachersApp(api);
    await app.pump(tester);
    // Students have no Teacher tab.
    expect(tabPaths(app), isNot(contains(Paths.teacherDesk)));

    await go(app, tester, Paths.account);
    await tapKey(tester, 'account-teachers');
    expect(find.text('Teachers'), findsWidgets);
    expect(find.text('Salma Fathy'), findsOneWidget);
    expect(find.text('Kerem Aydın'), findsOneWidget);
    expect(find.text('Arabic grammar, simply.'), findsWidgets);
    expect(find.text('Grammar'), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('teachers-search')),
      'kerem',
    );
    await tester.pump(const Duration(milliseconds: 500));
    await TestApp.settle(tester);
    expect(find.text('Salma Fathy'), findsNothing);
    expect(find.text('Kerem Aydın'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('teachers-search')), '');
    await tester.pump(const Duration(milliseconds: 500));
    await TestApp.settle(tester);

    await tapKey(tester, 'teacher-7');
    expect(find.byKey(const ValueKey('teacher-page')), findsOneWidget);
    expect(find.text('1 course · 40 students · 18 followers'), findsOneWidget);
    expect(find.text('Courses by Salma Fathy'), findsOneWidget);

    await tapKey(tester, 'teacher-follow');
    expect(api.count('followTeacher'), 1);
    expect(find.text('Following'), findsOneWidget);
    expect(find.text('1 course · 40 students · 19 followers'), findsOneWidget);

    await tapKey(tester, 'teacher-rate');
    expect(find.text('Rate Salma Fathy'), findsWidgets);
    await tester.tap(find.bySemanticsLabel('4 stars'));
    await TestApp.settle(tester);
    await tester.tap(find.text('Post review'));
    await TestApp.settle(tester);
    expect(api.count('rateTeacher'), 1);
    expect(find.text('Thanks for rating Salma Fathy!'), findsOneWidget);
  });

  testWidgets('105.3 a teacher\'s course opens the teacher\'s page from the '
      'course', (tester) async {
    usePhone(tester);
    final api = teachersApi()
      ..course = {
        ...courseDetailJson(),
        'instructor': {
          'id': 7,
          'name': 'Salma Fathy',
          'avatar_url': null,
          'bio': null,
        },
      };
    final app = teachersApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.course(1));
    await tapKey(tester, 'course-instructor');
    expect(find.byKey(const ValueKey('teacher-page')), findsOneWidget);
  });

  testWidgets('105.3 someone applies to teach and waits for the academy', (
    tester,
  ) async {
    usePhone(tester);
    final api = teachersApi();
    final app = teachersApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.account);
    await tapKey(tester, 'account-teach');
    expect(find.byKey(const ValueKey('teach-form')), findsOneWidget);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('teach-bio')),
        matching: find.byType(TextFormField),
      ),
      'Ten years teaching grammar.',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('teach-subjects')),
        matching: find.byType(TextFormField),
      ),
      'Arabic, Grammar',
    );
    await tapKey(tester, 'teach-send');
    expect(api.count('applyToTeach'), 1);
    expect(api.teacherApplication!['subjects'], ['Arabic', 'Grammar']);
    expect(find.byKey(const ValueKey('teach-pending')), findsOneWidget);
  });

  testWidgets('105.3 a declined application can be sent again', (tester) async {
    usePhone(tester);
    final api = teachersApi()
      ..teacherApplication = {
        'status': 'declined',
        'name': 'Omar',
        'bio': 'Grammar.',
        'subjects': ['Grammar'],
        'note': 'We need more experience.',
        'created_at': '2026-10-20T10:00:00.000Z',
      };
    final app = teachersApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.teachApply);
    expect(find.text('The academy declined your application.'), findsOneWidget);
    expect(
      find.text("The academy's note: We need more experience."),
      findsOneWidget,
    );
    await tester.tap(find.text('Apply again'));
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('teach-form')), findsOneWidget);
    expect(find.text('Grammar.'), findsOneWidget);
  });

  testWidgets('105.3 without applications, no one is asked to teach', (
    tester,
  ) async {
    usePhone(tester);
    final api = teachersApi(applications: false);
    final app = teachersApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.account);
    expect(find.byKey(const ValueKey('account-teachers')), findsOneWidget);
    expect(find.byKey(const ValueKey('account-teach')), findsNothing);
  });

  testWidgets('105.3 a teacher makes a course, adds a lesson with a file '
      'and sends it for review', (tester) async {
    usePhone(tester);
    final api = teachersApi(roles: ['teacher'])..teacherCourses = [];
    final picker = FakeLessonPicker()
      ..next = ChatPicked(
        MemoryChatFile('lesson.pdf', 'application/pdf', List.filled(2500, 1)),
      );
    final uploads = MemoryUploads(api);
    final app = teachersApp(api, picker: picker, uploads: uploads);
    await app.pump(tester);
    expect(tabPaths(app), [
      Paths.home,
      Paths.courses,
      Paths.myCourses,
      Paths.teacherDesk,
      Paths.account,
    ]);
    await go(app, tester, Paths.teacherDesk);
    expect(find.text('Your share: 70%'), findsOneWidget);
    expect(
      find.text(
        'Start your first course, add its lessons and send it to the '
        'academy for review.',
      ),
      findsOneWidget,
    );

    await tester.tap(find.text('New course').last);
    await TestApp.settle(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('course-title')),
        matching: find.byType(TextFormField),
      ),
      'Arabic grammar',
    );
    await tapKey(tester, 'course-save');
    expect(api.count('createTeacherCourse'), 1);
    expect(find.byKey(const ValueKey('teacher-course')), findsOneWidget);
    expect(find.text('Draft'), findsOneWidget);
    // Nothing to send without a lesson.
    expect(find.byKey(const ValueKey('course-submit')), findsNothing);

    await tapKey(tester, 'add-section');
    await tester.enterText(find.byType(TextField).last, 'The sentence');
    await TestApp.settle(tester);
    await tester.tap(find.text('Add a section').last);
    await TestApp.settle(tester);
    expect(api.count('addTeacherSection'), 1);
    expect(find.text('The sentence'), findsOneWidget);

    await tapKey(tester, 'add-lesson-50');
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('lesson-title')),
        matching: find.byType(TextFormField),
      ),
      'Subject and verb',
    );
    await tapKey(tester, 'lesson-pick');
    expect(find.text('lesson.pdf'), findsOneWidget);
    await tapKey(tester, 'lesson-save');
    expect(api.teacherUploads, ['lesson.pdf']);
    expect(uploads.sent, hasLength(2500));
    expect(api.count('completeTeacherUpload'), 1);
    final lesson = api.teacherLessons.single;
    expect(lesson.sectionId, 50);
    expect(lesson.uploadId, isNotNull);
    expect(lesson.videoUrl, isNull);
    expect(find.text('Subject and verb'), findsOneWidget);

    await tapKey(tester, 'course-submit');
    expect(api.count('submitTeacherCourse'), 1);
    expect(find.text('With the academy'), findsOneWidget);
    expect(find.text('The academy is checking this course.'), findsOneWidget);
    expect(find.byKey(const ValueKey('add-section')), findsNothing);
  });

  testWidgets('105.3 a lesson needs something in it, and a file of the right '
      'kind', (tester) async {
    usePhone(tester);
    final api = teachersApi(roles: ['teacher']);
    final picker = FakeLessonPicker()..next = const ChatPickUnsupported();
    final app = teachersApp(api, picker: picker);
    await app.pump(tester);
    await push(app, tester, Paths.teacherCourse(30));
    await tapKey(tester, 'add-lesson-31');
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('lesson-title')),
        matching: find.byType(TextFormField),
      ),
      'Objects',
    );
    await tapKey(tester, 'lesson-save');
    expect(find.text('Add a video, a PDF or some text.'), findsOneWidget);
    expect(api.count('addTeacherLesson'), 0);
    await tapKey(tester, 'lesson-pick');
    expect(
      find.text('Choose an MP4, MOV or WebM video, or a PDF.'),
      findsOneWidget,
    );
  });

  testWidgets('105.3 the academy returned a course: its note shows and the '
      'teacher removes a lesson', (tester) async {
    usePhone(tester);
    final api = teachersApi(roles: ['teacher'])
      ..teacherCourses = [
        teacherCourseJson(stage: 'returned', note: 'Add a second lesson.'),
      ];
    final app = teachersApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.teacherCourse(30));
    expect(find.text('Needs changes'), findsOneWidget);
    expect(
      find.text("The academy's note: Add a second lesson."),
      findsOneWidget,
    );
    await tester.tap(find.byTooltip('Remove the lesson'));
    await TestApp.settle(tester);
    expect(api.count('deleteTeacherLesson'), 1);
    expect(find.text('Subject and verb'), findsNothing);
  });

  testWidgets('105.3 a teacher sees questions and earnings', (tester) async {
    usePhone(tester);
    final api = teachersApi(roles: ['teacher']);
    final app = teachersApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.teacherDesk);
    expect(find.text('Arabic grammar'), findsOneWidget);
    expect(find.text('Draft'), findsOneWidget);

    await tester.tap(find.text('Questions'));
    await TestApp.settle(tester);
    expect(find.text('Is the verb always first?'), findsOneWidget);
    expect(find.text('Omar · Waiting for you'), findsOneWidget);

    await tester.tap(find.text('Earnings'));
    await TestApp.settle(tester);
    expect(find.text('2 sold · E£900.00'), findsOneWidget);
    expect(find.text('Refunds: E£100.00'), findsOneWidget);
    expect(find.text('Your share: 70%'), findsWidgets);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('teacher-earned')),
        matching: find.text('E£560.00'),
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Last month'));
    await TestApp.settle(tester);
    expect(api.count('getTeacherEarnings'), 2);
  });

  testWidgets('105.3 someone who isn\'t a teacher is told how to apply', (
    tester,
  ) async {
    usePhone(tester);
    final api = teachersApi();
    final app = teachersApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.teacherDesk);
    expect(find.text('Teach here'), findsOneWidget);
    expect(api.count('getTeacherMe'), 0);
    expect(api.count('listTeacherCourses'), 0);
  });
}
