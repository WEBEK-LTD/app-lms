import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 113.9 A university in the app: the student's School tab (program, GPA,
/// registration with its rules, results, transcript, study plan), a parent
/// reading it, the lecturer's sections (grades, publishing, attendance) and
/// the advisor approving a registration. 113 With the other parts: the
/// Parent tab of a university's parent, the lecturer's payslips and the
/// pushes.

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

Future<void> confirmDialog(WidgetTester tester, String label) async {
  // The dialog's button (its title may say the same).
  await tester.tap(
    find
        .descendant(of: find.byType(AlertDialog), matching: find.text(label))
        .last,
  );
  await TestApp.settle(tester);
}

/// Takes the message off the screen (it covers the bottom bar).
Future<void> clearMessage(WidgetTester tester) async {
  tester
      .state<ScaffoldMessengerState>(find.byType(ScaffoldMessenger).first)
      .removeCurrentSnackBar();
  await TestApp.settle(tester);
}

FakeApi uniApi(List<String> roles) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'school': {...schoolConfigJson(), 'university': true},
    },
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = {
    ...schoolMeJson(roles: roles),
    if (roles.contains('student')) 'students': [schoolStudentJson()],
  };
  return api;
}

void main() {
  testWidgets('113.9 a student\'s School tab is the university\'s', (
    tester,
  ) async {
    usePhone(tester);
    final api = uniApi(['student']);
    final app = TestApp(api: api, appType: AppType.school, signedIn: true);
    await app.pump(tester);
    await push(app, tester, Paths.school);
    expect(find.byKey(const ValueKey('university-overview')), findsOneWidget);
    expect(find.byKey(const ValueKey('school-homework')), findsNothing);
    expect(find.text('3.50'), findsOneWidget);
    expect(
      find.text('BSc Computer Science · Advisor: Mona Adel'),
      findsOneWidget,
    );
    expect(find.text('6 of 132 credits'), findsOneWidget);
    expect(find.text('Spring 2027'), findsOneWidget);
    expect(find.text('Not sent'), findsOneWidget);
    expect(api.count('getUniversityStudent'), 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('113.9 a student registers: adds, sees why not, drops, sends', (
    tester,
  ) async {
    usePhone(tester);
    final api = uniApi(['student']);
    final app = TestApp(api: api, appType: AppType.school, signedIn: true);
    await app.pump(tester);
    await push(app, tester, Paths.schoolPart('uni-registration', student: 11));
    expect(find.textContaining('3 credits · 6 to 18 a term'), findsOneWidget);
    expect(find.text('Waiting for approval'), findsOneWidget);
    // A clash says why, without a button; a full section has the waiting list.
    final list = find.descendant(
      of: find.byKey(const ValueKey('uni-registration')),
      matching: find.byType(Scrollable),
    );
    final clash = find.text('Its lectures are at the same time as CS201-01.');
    await tester.scrollUntilVisible(clash, 200, scrollable: list.first);
    expect(clash, findsOneWidget);
    expect(find.byKey(const ValueKey('uni-add-23')), findsNothing);
    final waitlist = find.descendant(
      of: find.byKey(const ValueKey('uni-add-24')),
      matching: find.text('Join the waiting list'),
    );
    await tester.scrollUntilVisible(waitlist, 200, scrollable: list.first);
    expect(waitlist, findsOneWidget);
    await tapKey(tester, 'uni-add-22');
    expect(api.uniSent['added'], 22);
    await tapKey(tester, 'uni-drop-21');
    expect(find.text('Drop CS201-01?'), findsOneWidget);
    await confirmDialog(tester, 'Drop');
    expect(api.uniSent['dropped'], 21);
    await tapKey(tester, 'uni-submit');
    expect(api.count('submitUniRegistration'), 1);
    expect(find.text('Sent to your advisor.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('113.9 a parent sees the registration, read only', (
    tester,
  ) async {
    usePhone(tester);
    final api = uniApi(['parent'])
      ..uniRegistration = uniRegistrationJson(status: 'returned');
    final app = TestApp(api: api, appType: AppType.school, signedIn: true);
    await app.pump(tester);
    await push(app, tester, Paths.schoolPart('uni-registration', student: 11));
    expect(
      find.text('Only the student changes the registration.'),
      findsOneWidget,
    );
    expect(
      find.text('Your advisor: Add a mathematics course.'),
      findsOneWidget,
    );
    expect(find.text('Sent back'), findsOneWidget);
    expect(find.byKey(const ValueKey('uni-add-22')), findsNothing);
    expect(find.byKey(const ValueKey('uni-drop-21')), findsNothing);
    expect(find.byKey(const ValueKey('uni-submit')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('113.9 results by term, the transcript\'s PDF and the plan', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final api = uniApi(['student']);
    final app = TestApp(
      api: api,
      appType: AppType.school,
      signedIn: true,
      overrides: [
        openExternalProvider.overrideWithValue((u) async {
          opened.add(u);
          return true;
        }),
      ],
    );
    await app.pump(tester);
    await push(app, tester, Paths.schoolPart('uni-results', student: 11));
    expect(find.text('3.50'), findsOneWidget);
    expect(find.text('Term GPA 3.70'), findsOneWidget);
    expect(find.text('Term GPA 3.30'), findsOneWidget);
    expect(find.text('CS201 · Data structures'), findsOneWidget);
    expect(find.text('A-'), findsOneWidget);
    expect(find.byKey(const ValueKey('uni-pdf')), findsNothing);

    await push(app, tester, Paths.schoolPart('uni-transcript', student: 11));
    expect(find.text('BSc Computer Science'), findsOneWidget);
    await tapKey(tester, 'uni-pdf');
    expect(opened, [
      'https://yallapp.test/a/app/transcript/11-1999999999-abc/pdf',
    ]);

    await push(app, tester, Paths.schoolPart('uni-plan', student: 11));
    expect(
      find.text('6 done · 3 in progress · 4 left of 132 credits'),
      findsOneWidget,
    );
    expect(find.text('Year 1'), findsOneWidget);
    expect(find.text('Done'), findsOneWidget);
    expect(find.text('In progress'), findsOneWidget);
    expect(find.text('Left'), findsOneWidget);
    expect(find.text('3 credits · Elective'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    '113.9 a lecturer grades a section, publishes, takes attendance',
    (tester) async {
      usePhone(tester);
      final api = uniApi(['teacher']);
      final app = TestApp(api: api, appType: AppType.school, signedIn: true);
      await app.pump(tester);
      await push(app, tester, Paths.classroom);
      expect(find.byKey(const ValueKey('lecturer-home')), findsOneWidget);
      expect(find.text('1 registration waits for you'), findsOneWidget);
      expect(find.textContaining('2 students'), findsOneWidget);
      await tapKey(tester, 'lecturer-section-21');
      expect(find.text('Omar Hassan'), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('mark-12')), '91');
      await tapKey(tester, 'section-save-grades');
      expect(api.uniSent['grades'], {11: ('A-', 87.0), 12: (null, 91.0)});
      expect(find.text('Grades saved.'), findsOneWidget);
      tester
          .state<ScaffoldMessengerState>(find.byType(ScaffoldMessenger).first)
          .removeCurrentSnackBar();
      await TestApp.settle(tester);
      await tapKey(tester, 'section-publish');
      await confirmDialog(tester, 'Publish results');
      expect(api.count('publishSectionResults'), 1);
      await clearMessage(tester);

      await tapKey(tester, 'section-attendance');
      await tapKey(tester, 'uni-mark-11-absent');
      await tapKey(tester, 'section-attendance-save');
      expect(api.uniSent['attendance'], {11: 'absent', 12: 'late'});
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('113.9 an advisor approves a registration', (tester) async {
    usePhone(tester);
    final api = uniApi(['teacher']);
    final app = TestApp(api: api, appType: AppType.school, signedIn: true);
    await app.pump(tester);
    await push(app, tester, Paths.classroomAdvisees);
    expect(find.text('With your advisor'), findsOneWidget);
    await tapKey(tester, 'advisee-11');
    expect(find.text('CS201-01 · Data structures'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('advisee-note')),
      'Well chosen.',
    );
    await tapKey(tester, 'advisee-approve');
    expect(api.uniSent['decision'], (true, 'Well chosen.'));
    expect(find.text('Approved. The student was told.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  test('113.9 the university\'s pushes open its pages', () {
    expect(
      pushTargetLocation({'type': 'uni_registration', 'student_id': '11'}),
      '/school/uni-registration?student=11',
    );
    expect(
      pushTargetLocation({'type': 'uni_seat', 'student_id': '11'}),
      '/school/uni-registration?student=11',
    );
    expect(
      pushTargetLocation({'type': 'uni_results', 'student_id': '11'}),
      '/school/uni-results?student=11',
    );
    expect(
      pushTargetLocation({'type': 'uni_advisee', 'student_id': '11'}),
      Paths.classroomAdvisee(11),
    );
    expect(
      pushTargetLocation({'type': 'uni_advisee'}),
      Paths.classroomAdvisees,
    );
  });

  testWidgets('113.4 a university\'s parent: the Parent tab has its pages', (
    tester,
  ) async {
    usePhone(tester);
    final api = uniApi(['parent'])
      ..uniRegistration = uniRegistrationJson(status: 'returned');
    final app = TestApp(api: api, appType: AppType.school, signedIn: true);
    await app.pump(tester);
    // The School tab of a parent who isn't a student points to the Parent tab.
    await push(app, tester, Paths.school);
    expect(find.byKey(const ValueKey('school-for-parents')), findsOneWidget);
    expect(find.byKey(const ValueKey('university-overview')), findsNothing);
    await push(app, tester, Paths.parent);
    expect(find.byKey(const ValueKey('parent-day')), findsOneWidget);
    // Today's lectures instead of the class's lessons and homework.
    expect(find.byKey(const ValueKey('parent-lessons')), findsNothing);
    expect(find.byKey(const ValueKey('parent-homework-due')), findsNothing);
    expect(api.count('getUniTimetable'), 1);
    final dayList = find
        .descendant(
          of: find.byKey(const ValueKey('parent-day')),
          matching: find.byType(Scrollable),
        )
        .first;
    // The parents' own parts stay; the university's pages are beside them.
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('parent-slips')),
      200,
      scrollable: dayList,
    );
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('parent-uni-plan')),
      200,
      scrollable: dayList,
    );
    for (final key in ['parent-grades', 'parent-report-card', 'parent-exams']) {
      expect(find.byKey(ValueKey(key)), findsNothing);
    }
    await tapKey(tester, 'parent-uni-registration');
    expect(
      find.text('Only the student changes the registration.'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('uni-submit')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    '113.12 a lecturer has My payslips and checks in like a teacher',
    (tester) async {
      usePhone(tester);
      final api = uniApi(['teacher']);
      final app = TestApp(api: api, appType: AppType.school, signedIn: true);
      await app.pump(tester);
      await push(app, tester, Paths.classroom);
      expect(find.byKey(const ValueKey('lecturer-home')), findsOneWidget);
      // Sections, not the classes' exams.
      expect(find.byKey(const ValueKey('classroom-exams')), findsNothing);
      expect(find.byKey(const ValueKey('classroom-calendar')), findsOneWidget);
      await tapKey(tester, 'staff-payslips');
      expect(api.count('listPayslips'), 1);
      expect(tester.takeException(), isNull);
    },
  );
}
