import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

class FakeLocator implements Locator {
  FakeLocator([
    this.result = const LocateResult.found((
      lat: 30.0446,
      lng: 31.2358,
      accuracy: 8,
    )),
  ]);

  final LocateResult result;
  int reads = 0;

  @override
  Future<LocateResult> current() async {
    reads++;
    return result;
  }
}

FakeApi checkinApi({
  List<String> roles = const ['student'],
  String methods = 'either',
  bool on = true,
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'school': {
        ...schoolConfigJson(),
        'checkin': {'on': on, 'methods': methods},
      },
    },
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = {
    'name': 'Omar Hassan',
    'roles': roles,
    'students': roles.contains('student') ? [schoolStudentJson()] : <Object>[],
  };
  api.checkinToday = checkinTodayJson(methods: methods, on: on);
  return api;
}

TestApp checkinApp(FakeApi api, {FakeLocator? locator}) => TestApp(
  api: api,
  appType: AppType.school,
  signedIn: true,
  overrides: [locatorProvider.overrideWithValue(locator ?? FakeLocator())],
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
  test('113.2 the check-in and staff models read the contract', () {
    final today = CheckinToday.fromJson(
      checkinTodayJson(
        methods: 'both',
        role: 'staff',
        today: checkinDayJson(state: 'in', inTime: '07:52', late: true),
      ),
    );
    expect(today.methods, CheckinMethods.both);
    expect(today.methods.usesCode && today.methods.usesPlace, isTrue);
    expect(today.role, SchoolRole.staff);
    expect(today.place?.radiusM, 150);
    expect(today.today.state, CheckinState.checkedIn);
    expect(today.today.inMethod, CheckinMethod.qr);
    expect(today.today.late, isTrue);
    final month = CheckinMonth.fromJson(checkinMonthJson());
    expect(month.count('left_early'), 1);
    expect(month.days.first.corrections.single.reason, 'Came after the bell');
    expect(month.days.last.state, CheckinState.absent);
    final me = StaffMe.fromJson(staffMeJson());
    expect(me.isTeacher, isFalse);
    expect(me.workHours?.days, [1, 2, 3, 4, 7]);
    expect(me.duties, 'First aid and the morning check.');
    final leave = LeaveRequest.fromJson(
      leaveRequestJson(status: 'refused', answer: 'Exams week'),
    );
    expect(leave.status, LeaveStatus.refused);
    expect(leave.days, 2);
    expect(
      const LeaveInput(
        kind: LeaveKind.annual,
        startsOn: '2026-11-01',
        endsOn: '2026-11-02',
      ).toJson(),
      {'kind': 'annual', 'starts_on': '2026-11-01', 'ends_on': '2026-11-02'},
    );
    final config = AppConfig.fromJson({
      ...configJson(lms: null),
      'school': {
        ...schoolConfigJson(),
        'checkin': {'on': true, 'methods': 'qr'},
      },
    });
    expect(config.school?.checkin.on, isTrue);
    expect(config.school?.checkin.methods, CheckinMethods.qr);
    // Older servers: off.
    expect(
      AppConfig.fromJson({
        ...configJson(lms: null),
        'school': schoolConfigJson(),
      }).school?.checkin.on,
      isFalse,
    );
    expect(SchoolMe.fromJson(schoolMeJson(roles: ['staff'])).roles, [
      SchoolRole.staff,
    ]);
  });

  test('113.2 and 113.3 notifications open the child\'s attendance, the staff\'s news and leave', () {
    expect(
      pushTargetLocation({'type': 'school_checkin', 'student_id': '11'}),
      '/school/attendance?student=11',
    );
    expect(pushTargetLocation({'type': 'school_staff'}), Paths.staffNews);
    expect(pushTargetLocation({'type': 'school_leave'}), Paths.staffLeave);
  });

  group('113.2 checking in', () {
    testWidgets(
      'a student checks in with the gate\'s code from the School tab',
      (tester) async {
        usePhone(tester);
        final api = checkinApi();
        final app = checkinApp(api);
        await app.pump(tester);
        await go(app, tester, Paths.school);
        expect(find.byKey(const ValueKey('checkin-card')), findsOneWidget);
        expect(find.text('Not checked in yet'), findsOneWidget);
        await tapKey(tester, 'checkin-open');
        expect(find.text('Check in and out'), findsOneWidget);
        expect(find.text('07:30–14:00 · late from 08:00'), findsOneWidget);
        // Nothing typed: it asks for the code.
        await tapKey(tester, 'checkin-send');
        expect(api.checkins, isEmpty);
        await tester.enterText(
          find.byKey(const ValueKey('checkin-code')),
          '48 15 0x9',
        );
        await tapKey(tester, 'checkin-send');
        expect(api.checkins.single, (
          action: 'in',
          code: '481509',
          lat: null,
          lng: null,
        ));
        expect(find.text('Checked in at 07:40, on time.'), findsOneWidget);
        expect(find.text('In at 07:40'), findsWidgets);
        // The month: counts and a day the school corrected.
        expect(find.byKey(const ValueKey('checkin-month')), findsOneWidget);
        expect(
          find.textContaining('Corrected by the school: Came after the bell'),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'inside the area: the phone\'s location, read only when checking in',
      (tester) async {
        usePhone(tester);
        final api = checkinApi(methods: 'location', roles: ['teacher']);
        final locator = FakeLocator();
        final app = checkinApp(api, locator: locator);
        await app.pump(tester);
        await push(app, tester, Paths.checkin);
        expect(find.byKey(const ValueKey('checkin-code')), findsNothing);
        expect(locator.reads, 0);
        await tapKey(tester, 'checkin-send');
        expect(locator.reads, 1);
        expect(api.checkins.single, (
          action: 'in',
          code: null,
          lat: 30.0446,
          lng: 31.2358,
        ));
        // Checking out the same way.
        await tapKey(tester, 'checkin-send');
        expect(api.checkins.last.action, 'out');
        expect(find.text('Checked out at 14:10.'), findsOneWidget);
      },
    );

    testWidgets(
      'outside the area the school\'s message shows; location off says so',
      (tester) async {
        usePhone(tester);
        final api = checkinApi(methods: 'either')
          ..failures['checkIn'] = const ApiException(
            code: 'outside_area',
            message: "You're not at the school: check in when you're inside its area.",
            statusCode: 403,
          );
        final app = checkinApp(api);
        await app.pump(tester);
        await push(app, tester, Paths.checkin);
        await tapKey(tester, 'checkin-location');
        expect(
          find.text(
            "You're not at the school: check in when you're inside its area.",
          ),
          findsOneWidget,
        );
      },
    );

    testWidgets('location off says so', (tester) async {
      usePhone(tester);
      final off = checkinApp(
        checkinApi(methods: 'location'),
        locator: FakeLocator(const LocateResult.failed(LocateProblem.off)),
      );
      await off.pump(tester);
      await push(off, tester, Paths.checkin);
      await tapKey(tester, 'checkin-send');
      expect(
        find.text("Turn on your phone's location to check in."),
        findsOneWidget,
      );
    });

    testWidgets(
      'no card when the school doesn\'t take check-ins; a parent sees the child\'s days',
      (tester) async {
        usePhone(tester);
        final api = checkinApi(on: false);
        final app = checkinApp(api);
        await app.pump(tester);
        await go(app, tester, Paths.school);
        expect(find.byKey(const ValueKey('checkin-card')), findsNothing);
      },
    );

    testWidgets("a parent sees the child's days at the gate", (tester) async {
      usePhone(tester);
      final parentApi = checkinApi(roles: ['parent'])
        ..schoolMe = schoolMeJson();
      final parent = checkinApp(parentApi);
      await parent.pump(tester);
      await go(parent, tester, Paths.school);
      expect(find.byKey(const ValueKey('checkin-card')), findsNothing);
      await push(parent, tester, Paths.schoolPart('attendance', student: 11));
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('student-gate-days')),
        300,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('school-attendance')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(find.text('At the gate'), findsOneWidget);
      expect(parentApi.count('getStudentCheckins'), greaterThan(0));
    });
  });

  group('113.3 teachers and staff', () {
    testWidgets(
      'the Staff tab is for staff who don\'t teach, never for students or teachers',
      (tester) async {
        usePhone(tester);
        final staff = checkinApp(checkinApi(roles: ['staff']));
        await staff.pump(tester);
        expect(tabPaths(staff), [Paths.school, Paths.staff, Paths.account]);
      },
    );

    testWidgets('no Staff tab for students', (tester) async {
      usePhone(tester);
      final student = checkinApp(checkinApi());
      await student.pump(tester);
      expect(tabPaths(student), isNot(contains(Paths.staff)));
    });

    testWidgets('teachers keep the Classroom tab, not the Staff tab', (
      tester,
    ) async {
      usePhone(tester);
      final teacher = checkinApp(checkinApi(roles: ['teacher']));
      await teacher.pump(tester);
      expect(tabPaths(teacher), [Paths.school, Paths.classroom, Paths.account]);
    });

    testWidgets('staff see their work, check in, and ask for leave', (
      tester,
    ) async {
      usePhone(tester);
      final api = checkinApi(roles: ['staff']);
      final app = checkinApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.staff);
      expect(find.byKey(const ValueKey('checkin-card')), findsOneWidget);
      expect(find.text('Nurse · Clinic'), findsOneWidget);
      expect(find.text('First aid and the morning check.'), findsOneWidget);
      expect(find.textContaining('Hours: 09:00–17:00'), findsOneWidget);
      await tapKey(tester, 'staff-leave');
      expect(find.text('Flu'), findsOneWidget);
      expect(find.text('Waiting'), findsOneWidget);
      await tapKey(tester, 'leave-withdraw-71');
      expect(api.leaveWithdrawn, [71]);
      expect(find.text('Withdrawn'), findsOneWidget);
      await tapKey(tester, 'leave-ask');
      await tapKey(tester, 'leave-kind-annual');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('leave-note')),
          matching: find.byType(TextField),
        ),
        'Family wedding',
      );
      await tapKey(tester, 'leave-send');
      expect(api.leaveAsked.single.kind, LeaveKind.annual);
      expect(api.leaveAsked.single.note, 'Family wedding');
      expect(api.leaveAsked.single.startsOn, api.leaveAsked.single.endsOn);
      expect(find.text('Sent. The school answers in the app.'), findsOneWidget);
    });

    testWidgets(
      'a teacher checks in and asks for leave from the Classroom tab; staff news',
      (tester) async {
        usePhone(tester);
        final api = checkinApi(roles: ['teacher']);
        final app = checkinApp(api);
        await app.pump(tester);
        await go(app, tester, Paths.classroom);
        expect(find.byKey(const ValueKey('checkin-card')), findsOneWidget);
        await tester.scrollUntilVisible(
          find.byKey(const ValueKey('staff-news')),
          300,
          scrollable: find
              .descendant(
                of: find.byKey(const ValueKey('classroom')),
                matching: find.byType(Scrollable),
              )
              .first,
        );
        expect(find.byKey(const ValueKey('staff-leave')), findsOneWidget);
        await tapKey(tester, 'staff-news');
        expect(find.text('Staff meeting'), findsOneWidget);
      },
    );

    testWidgets('someone who isn\'t staff opening the Staff tab is told so', (
      tester,
    ) async {
      usePhone(tester);
      final app = checkinApp(checkinApi());
      await app.pump(tester);
      await go(app, tester, Paths.staff);
      expect(find.text("For the school's staff"), findsOneWidget);
    });
  });
}
