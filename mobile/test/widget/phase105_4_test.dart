import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi schoolApi({
  List<String> roles = const ['parent'],
  List<String>? schoolRoles,
}) {
  final api = FakeApi(
    config: {...configJson(lms: null), 'school': schoolConfigJson()},
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = schoolMeJson(roles: schoolRoles ?? roles);
  return api;
}

TestApp schoolApp(FakeApi api, {bool signedIn = true}) => TestApp(
  api: api,
  appType: AppType.school,
  signedIn: signedIn,
  guest: !signedIn,
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
  test('105.4 a school notification opens its part, for its student', () {
    expect(
      pushTargetLocation({'type': 'school_absence', 'student_id': '11'}),
      '/school/attendance?student=11',
    );
    expect(
      pushTargetLocation({
        'type': 'school_homework',
        'student_id': '12',
        'homework_id': '21',
      }),
      '/school/homework?student=12',
    );
    expect(
      pushTargetLocation({'type': 'school_grade', 'student_id': '11'}),
      '/school/grades?student=11',
    );
    expect(
      pushTargetLocation({'type': 'school_fee', 'student_id': '11'}),
      '/school/fees?student=11',
    );
    expect(pushTargetLocation({'type': 'school_announcement'}), '/school/news');
  });

  test('105.4 the school models read the contract', () {
    final me = SchoolMe.fromJson(schoolMeJson(roles: ['parent', 'teacher']));
    expect(me.roles, [SchoolRole.parent, SchoolRole.teacher]);
    expect(me.students.map((s) => s.className), ['Grade 5 A', 'Grade 3 B']);
    final attendance = StudentAttendance.fromJson(studentAttendanceJson());
    expect(attendance.count(AttendanceStatus.absent), 1);
    expect(attendance.days.first.note, 'Sick');
    final fees = StudentFees.fromJson(studentFeesJson());
    expect(fees.items.map((f) => (f.status, f.paidByCard)), [
      (FeeStatus.due, false),
      (FeeStatus.paid, true),
    ]);
    final config = AppConfig.fromJson({
      ...configJson(lms: null),
      'school': schoolConfigJson(),
    });
    expect(config.school?.term?.name, 'First term');
    expect(config.school?.feesByCard, isTrue);
    final work = ClassroomHomeworkDetail.fromJson(
      classroomHomeworkDetailJson(),
    );
    expect(work.work.map((w) => w.submission?.handedIn ?? false), [
      true,
      false,
    ]);
  });

  group('105.4 School tab', () {
    testWidgets('a parent switches between their children', (tester) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      expect(tabPaths(app), [Paths.school, Paths.account]);
      await go(app, tester, Paths.school);
      expect(find.text('Omar Hassan'), findsWidgets);
      expect(find.text('Grade 5 A'), findsOneWidget);
      expect(find.text('Due: E£4,500.00'), findsOneWidget);
      await tapKey(tester, 'student-12');
      expect(find.text('Grade 3 B'), findsOneWidget);
      expect(find.text('Grade 5 A'), findsNothing);
    });

    testWidgets("someone the school didn't add is told to ask it", (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: const [], schoolRoles: const [])
        ..failures['getSchoolMe'] = const ApiException(
          code: 'not_school_member',
          message: "This account isn't one the school added.",
          statusCode: 403,
        );
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(
        find.text("This number isn't on the school's list"),
        findsOneWidget,
      );
    });

    testWidgets('a parent sees homework but the student hands it in', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.schoolPart('homework', student: 11));
      expect(find.text('Fractions, page 12'), findsOneWidget);
      await tapKey(tester, 'homework-21');
      expect(find.text('Questions 1 to 5.'), findsOneWidget);
      expect(find.byKey(const ValueKey('homework-send')), findsNothing);
    });

    testWidgets('a student hands homework in', (tester) async {
      usePhone(tester);
      final api = schoolApi(roles: ['student'])
        ..schoolMe = {
          'name': 'Omar Hassan',
          'roles': ['student'],
          'students': [schoolStudentJson()],
        };
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.schoolPart('homework'));
      expect(find.byKey(const ValueKey('student-switcher')), findsNothing);
      await tapKey(tester, 'homework-21');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('homework-text')),
          matching: find.byType(TextField),
        ),
        '1) 3/4 2) 1/2',
      );
      await tapKey(tester, 'homework-send');
      expect(api.handedIn.single, (
        student: 11,
        homework: 21,
        text: '1) 3/4 2) 1/2',
        upload: null,
      ));
      expect(find.text('Nothing to do. Well done!'), findsOneWidget);
    });

    testWidgets('grades, attendance and fees with a receipt', (tester) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.schoolPart('grades', student: 11));
      expect(find.text('85%'), findsOneWidget);
      expect(find.text('8.5/10'), findsOneWidget);
      expect(find.text('Midterm'), findsOneWidget);
      await push(app, tester, Paths.schoolPart('attendance', student: 11));
      expect(find.text('Sick'), findsOneWidget);
      await push(app, tester, Paths.schoolPart('fees', student: 11));
      expect(find.byKey(const ValueKey('fee-pay-41')), findsOneWidget);
      expect(find.byKey(const ValueKey('fee-pay-42')), findsNothing);
      expect(find.byKey(const ValueKey('fee-receipt-42')), findsOneWidget);
    });
  });

  group('105.4 Classroom tab', () {
    testWidgets('is left out for parents and students', (tester) async {
      usePhone(tester);
      final parent = schoolApp(schoolApi());
      await parent.pump(tester);
      expect(tabPaths(parent), isNot(contains(Paths.classroom)));
    });

    testWidgets('is added for the school\'s teachers', (tester) async {
      usePhone(tester);
      final teacher = schoolApp(schoolApi(roles: ['teacher', 'parent']));
      await teacher.pump(tester);
      expect(tabPaths(teacher), [Paths.school, Paths.classroom, Paths.account]);
      await go(teacher, tester, Paths.classroom);
      expect(find.text('Grade 5 A'), findsOneWidget);
      expect(find.text('Your class'), findsOneWidget);
    });

    testWidgets('a teacher takes attendance', (tester) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.classAttendance(3));
      expect(
        find.text('Not taken yet: everyone is present until you change it.'),
        findsOneWidget,
      );
      await tapKey(tester, 'mark-11-absent');
      await tapKey(tester, 'attendance-save');
      final saved = api.attendanceSaved.single;
      expect(saved.date, '2026-10-12');
      expect(saved.items.map((i) => (i.studentId, i.status)), [
        (11, AttendanceStatus.absent),
        (13, AttendanceStatus.present),
      ]);
    });

    testWidgets('a teacher marks homework and enters scores', (tester) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.classroomHomework(21));
      expect(find.text('1 of 2 handed in · 0 marked'), findsOneWidget);
      await tapKey(tester, 'work-11');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('mark-value')),
          matching: find.byType(TextField),
        ),
        '9/10',
      );
      await tapKey(tester, 'mark-save');
      expect(api.marks.single.mark, '9/10');

      await push(app, tester, Paths.classroomAssessment(31));
      await tester.enterText(find.byKey(const ValueKey('score-11')), '8.5');
      await TestApp.settle(tester);
      await tapKey(tester, 'scores-save');
      expect(api.scoresSaved.single, [
        (studentId: 11, score: 8.5),
        (studentId: 13, score: 7.0),
      ]);
    });

    testWidgets('a teacher gives homework to a class', (tester) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.classroomClass(3));
      await tapKey(tester, 'give-homework');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('homework-title')),
          matching: find.byType(TextField),
        ),
        'Read chapter 3',
      );
      // Without a due day: asked for it.
      await tapKey(tester, 'homework-give');
      expect(
        find.text('Choose the subject, write a title and choose the due day.'),
        findsOneWidget,
      );
      expect(api.homeworkGiven, isEmpty);
    });
  });
}
