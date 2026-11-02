import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 113 The school's parts together: the Staff tab with the bus, the
/// calendar and the library; the School tab of someone who only works
/// there; every school notification opening its screen from the inbox.
FakeApi workApi({List<String> roles = const ['staff'], bool library = true}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'school': {
        ...schoolConfigJson(),
        'checkin': {'on': true, 'methods': 'either'},
        'bus': true,
        'library': library,
      },
    },
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = {
    'name': 'Samir Fawzy',
    'roles': roles.where((r) => r != 'bus').toList(),
    'students': roles.contains('student') || roles.contains('parent')
        ? [schoolStudentJson()]
        : <Object>[],
  };
  api.checkinToday = checkinTodayJson();
  return api;
}

TestApp workApp(FakeApi api) =>
    TestApp(api: api, appType: AppType.school, signedIn: true);

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

Future<void> tapKey(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester);
}

/// Scrolls the tab's list until [key] is built and on screen.
Future<void> seeKey(WidgetTester tester, String key) async {
  await tester.scrollUntilVisible(
    find.byKey(ValueKey(key)),
    200,
    scrollable: find.byType(Scrollable).first,
  );
  await TestApp.settle(tester);
}

List<String?> tabPaths(TestApp app) =>
    app.container.read(shellTabsProvider).map((t) => t.location).toList();

void main() {
  test("113 every school notification opens its screen from the inbox", () {
    const types = {
      'school_checkin': '/school/attendance?student=11',
      'school_staff': Paths.staffNews,
      'school_leave': Paths.staffLeave,
      'school_exam': '/school/exams?student=11',
      'school_behaviour': '/school/behaviour?student=11',
      'school_bus': '/school/bus?student=11',
      'school_library': '/school/library-loans',
      'school_report_shared': '/school/reports?student=11',
    };
    for (final MapEntry(key: type, value: location) in types.entries) {
      final n = InboxNotification.fromJson({
        'id': 1,
        'title': 'T',
        'body': 'B',
        'type': type,
        'student_id': 11,
        'created_at': '2026-10-12T08:00:00Z',
        'read': false,
      });
      expect(n.type, isNot(NotificationType.unknown), reason: type);
      expect(pushTargetLocation(n.target), location, reason: type);
      expect(
        pushTargetLocation({'type': type, 'student_id': '11'}),
        location,
        reason: type,
      );
    }
  });

  group('113.3 with 113.8, 113.10 and 113.11', () {
    testWidgets('someone who only works at the school opens on the Staff tab, '
        'with bus duty, the calendar and the library', (tester) async {
      usePhone(tester);
      final api = workApi(roles: ['staff', 'bus']);
      final app = workApp(api);
      await app.pump(tester);
      expect(tabPaths(app), [Paths.school, Paths.staff, Paths.account]);
      await go(app, tester, Paths.staff);
      expect(find.byKey(const ValueKey('staff')), findsOneWidget);
      expect(find.byKey(const ValueKey('bus-duty')), findsOneWidget);
      await seeKey(tester, 'school-library');
      expect(find.byKey(const ValueKey('school-library')), findsOneWidget);
      await seeKey(tester, 'staff-calendar');
      await tapKey(tester, 'staff-calendar');
      // The person's own calendar (the staff's events too), no student.
      expect(api.calendarQueries.last.studentId, isNull);
    });

    testWidgets('the app starts on the Staff tab for staff only', (
      tester,
    ) async {
      usePhone(tester);
      final app = workApp(workApi());
      await app.pump(tester);
      expect(find.byKey(const ValueKey('staff')), findsOneWidget);
      expect(find.text('No student yet'), findsNothing);
    });

    testWidgets("staff only: the School tab points to the Staff tab, never "
        "'No student yet'", (tester) async {
      usePhone(tester);
      final app = workApp(workApi());
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(find.byKey(const ValueKey('school-for-workers')), findsOneWidget);
      expect(find.text('No student yet'), findsNothing);
      await tester.tap(find.text('Open Staff'));
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('staff')), findsOneWidget);
    });

    testWidgets('a teacher only: the School tab points to the Classroom tab', (
      tester,
    ) async {
      usePhone(tester);
      final app = workApp(workApi(roles: ['teacher']));
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(find.text('Open Classroom'), findsOneWidget);
      expect(find.text('No student yet'), findsNothing);
    });

    testWidgets('a parent who works at the school keeps the School tab', (
      tester,
    ) async {
      usePhone(tester);
      final app = workApp(workApi(roles: ['parent', 'staff']));
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(find.byKey(const ValueKey('school-for-workers')), findsNothing);
      expect(tabPaths(app), contains(Paths.staff));
    });

    testWidgets('a teacher on the staff list too (the review account) has '
        'both tabs', (tester) async {
      usePhone(tester);
      final app = workApp(
        workApi(roles: ['student', 'parent', 'teacher', 'staff']),
      );
      await app.pump(tester);
      expect(tabPaths(app), containsAll([Paths.classroom, Paths.staff]));
    });

    testWidgets('teachers: bus duty on top, the calendar, exams and the '
        'library together', (tester) async {
      usePhone(tester);
      final app = workApp(workApi(roles: ['teacher', 'bus']));
      await app.pump(tester);
      await go(app, tester, Paths.classroom);
      expect(find.byKey(const ValueKey('bus-duty')), findsOneWidget);
      await seeKey(tester, 'school-library');
      expect(find.byKey(const ValueKey('classroom-calendar')), findsOneWidget);
      expect(find.byKey(const ValueKey('classroom-exams')), findsOneWidget);
      expect(find.byKey(const ValueKey('school-library')), findsOneWidget);
      // One "Your school" group, not two.
      expect(find.text('Your school'), findsOneWidget);
    });
  });
}
