import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/events/data/events_providers.dart';
import 'package:yallapp/modules/school/screens/calendar_screens.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 113.8 The school's calendar, the exams' timetable and behaviour in the
/// app: a student's and each child's of a parent, and a teacher's.

FakeApi schoolApi({List<String> roles = const ['parent']}) {
  final api = FakeApi(
    config: {...configJson(lms: null), 'school': schoolConfigJson()},
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = schoolMeJson(roles: roles);
  return api;
}

TestApp schoolApp(FakeApi api, {List<String>? calendar}) => TestApp(
  api: api,
  appType: AppType.school,
  signedIn: true,
  overrides: [
    if (calendar != null)
      shareCalendarFileProvider.overrideWithValue(
        (name, ics) async => calendar
          ..add(name)
          ..add(ics),
      ),
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

void main() {
  test('113.8 an exam or a behaviour notification opens its part', () {
    expect(
      pushTargetLocation({
        'type': 'school_exam',
        'student_id': '12',
        'exam_id': '51',
      }),
      '/school/exams?student=12',
    );
    expect(
      pushTargetLocation({
        'type': 'school_behaviour',
        'student_id': '11',
        'note_id': '61',
      }),
      '/school/behaviour?student=11',
    );
  });

  test('113.8 the models read the contract', () {
    final calendar = SchoolCalendar.fromJson(schoolCalendarJson());
    expect(calendar.events.map((e) => (e.kind, e.allDay)), [
      (SchoolEventKind.event, false),
      (SchoolEventKind.holiday, true),
    ]);
    expect(calendar.events.last.isDayOff, isTrue);
    expect(calendar.exams.single.forName, 'Grade 5 A');
    final record = StudentBehaviour.fromJson(studentBehaviourJson());
    expect(record.totals.points, 1);
    expect(record.items.map((n) => (n.kind, n.points)), [
      (BehaviourKind.positive, 2),
      (BehaviourKind.negative, -1),
    ]);
    expect(record.items.last.teacherName, isNull);
    final klass = ClassBehaviour.fromJson(classBehaviourJson());
    expect(klass.students.map((s) => s.totals.points), [2, -1]);
    final sheet = ClassAttendance.fromJson({
      ...classAttendanceJson(),
      'day_off': {'id': 1, 'title': 'National holiday'},
    });
    expect(sheet.dayOff, 'National holiday');
    expect(ClassAttendance.fromJson(classAttendanceJson()).dayOff, isNull);
  });

  test('113.8 an event or an exam goes to the phone\'s calendar', () {
    final allDay = schoolIcs(
      uid: 'school-event-1',
      title: 'Mid-term break, week 1',
      startsOn: '2026-11-08',
      endsOn: '2026-11-12',
      host: 'school.example',
    );
    expect(allDay, contains('DTSTART;VALUE=DATE:20261108'));
    // The day after the last one.
    expect(allDay, contains('DTEND;VALUE=DATE:20261113'));
    expect(allDay, contains(r'SUMMARY:Mid-term break\, week 1'));
    expect(allDay, contains('UID:school-event-1@school.example'));
    final timed = schoolIcs(
      uid: 'school-exam-2',
      title: 'Exam: Mathematics',
      startsOn: '2026-11-15',
      endsOn: '2026-11-15',
      starts: '09:00',
      ends: '10:30',
      place: 'Room B2',
      notes: 'Units 1 to 3',
      host: 'school.example',
    );
    expect(timed, contains('DTSTART:20261115T090000'));
    expect(timed, contains('DTEND:20261115T103000'));
    expect(timed, contains('LOCATION:Room B2'));
    expect(timed, contains('DESCRIPTION:Units 1 to 3'));
  });

  group('113.8 a student and a parent', () {
    testWidgets('the School tab opens the calendar, exams and behaviour', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.school);
      for (final key in [
        'school-calendar',
        'school-exams',
        'school-behaviour',
      ]) {
        expect(find.byKey(ValueKey(key)), findsOneWidget);
      }
      await tapKey(tester, 'school-calendar');
      expect(find.byKey(const ValueKey('calendar-grid')), findsOneWidget);
      expect(api.calendarQueries.last.studentId, 11);
    });

    testWidgets('the calendar shows the day\'s events, exams and breaks, '
        'a month or a list, and adds one to the phone', (tester) async {
      usePhone(tester);
      final api = schoolApi();
      final shared = <String>[];
      final app = schoolApp(api, calendar: shared);
      await app.pump(tester);
      await push(app, tester, Paths.schoolPart('calendar', student: 12));
      // The parent's second child.
      expect(api.calendarQueries.last.studentId, 12);
      // Today is chosen at first: its event, its break and its exam.
      expect(find.text('Science fair'), findsOneWidget);
      expect(find.text('Mid-term break'), findsOneWidget);
      expect(find.text('No school'), findsOneWidget);
      expect(find.text('Mathematics'), findsOneWidget);
      await tapKey(tester, 'calendar-next');
      expect(find.byKey(const ValueKey('calendar-day-empty')), findsOneWidget);
      // The list of what is coming.
      await tester.tap(find.text('List'));
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('calendar-list')), findsOneWidget);
      expect(api.calendarQueries.last.from, isoDayFromToday());
      expect(find.text('Science fair'), findsOneWidget);
      await tapKey(tester, 'calendar-add-event-41');
      expect(shared.first, 'event-41.ics');
      expect(shared.last, contains('SUMMARY:Science fair'));
      expect(
        shared.last,
        contains('DTSTART:${isoDayFromToday().replaceAll('-', '')}T090000'),
      );
    });

    testWidgets('the exams\' timetable: coming and done', (tester) async {
      usePhone(tester);
      final api = schoolApi(roles: ['student']);
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.schoolPart('exams'));
      expect(find.byKey(const ValueKey('exam-51')), findsOneWidget);
      expect(find.text('Units 1 to 3. Bring a ruler.'), findsOneWidget);
      expect(find.textContaining('09:00–10:00 · 60 min'), findsOneWidget);
      await tester.tap(find.text('Done'));
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('exam-52')), findsOneWidget);
    });

    testWidgets('the behaviour record with its points', (tester) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.schoolPart('behaviour'));
      expect(find.byKey(const ValueKey('school-behaviour')), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('behaviour-points')),
          matching: find.text('+1'),
        ),
        findsOneWidget,
      );
      expect(find.text('Helping others'), findsOneWidget);
      expect(find.text('+2 points'), findsOneWidget);
      expect(find.text('-1 points'), findsOneWidget);
      // Written by the school.
      expect(find.textContaining('From the school'), findsOneWidget);
    });
  });

  group('113.8 a teacher', () {
    testWidgets('opens the calendar and the exams from the Classroom tab', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.classroom);
      await tapKey(tester, 'classroom-calendar');
      expect(find.byKey(const ValueKey('calendar-grid')), findsOneWidget);
      // The teacher's own calendar: no student.
      expect(api.calendarQueries.last.studentId, isNull);
      await go(app, tester, Paths.classroom);
      await tapKey(tester, 'classroom-exams');
      expect(api.count('listClassroomExams'), 1);
      expect(find.byKey(const ValueKey('exam-51')), findsOneWidget);
    });

    testWidgets('writes a merit for a student of the class and takes '
        'back their own', (tester) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.classroomClass(3));
      await tapKey(tester, 'class-behaviour-open');
      expect(find.byKey(const ValueKey('class-behaviour')), findsOneWidget);
      expect(find.text('Youssef Samir'), findsOneWidget);
      await tapKey(tester, 'behaviour-student-13');
      // Without a category first.
      await tapKey(tester, 'behaviour-save');
      expect(api.behaviourWritten, isEmpty);
      await tapKey(tester, 'behaviour-category-71');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('behaviour-note')),
          matching: find.byType(TextField),
        ),
        'Helped clean up after the lab.',
      );
      await tapKey(tester, 'behaviour-save');
      expect(api.behaviourWritten.single, (
        studentId: 13,
        categoryId: 71,
        note: 'Helped clean up after the lab.',
      ));
      // Written today by this teacher: it can be taken back.
      await tapKey(tester, 'behaviour-take-back-61');
      expect(api.behaviourDeleted, [61]);
    });

    testWidgets('the register says when the day is a holiday', (tester) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      api.classAttendance = {
        ...classAttendanceJson(),
        'day_off': {'id': 1, 'title': 'National holiday'},
      };
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.classAttendance(3));
      expect(find.byKey(const ValueKey('attendance-day-off')), findsOneWidget);
      expect(find.textContaining('National holiday'), findsOneWidget);
    });
  });
}
