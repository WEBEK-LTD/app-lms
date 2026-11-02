import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../support/fixtures.dart';
import '../support/parent_fixtures.dart';
import 'phase105_4_test.dart'
    show go, push, schoolApi, schoolApp, tabPaths, tapKey, usePhone;

/// The child's day, the Parent tab's list (the children's switcher scrolls too).
final dayList = find
    .descendant(
      of: find.byKey(const ValueKey('parent-day')),
      matching: find.byType(Scrollable),
    )
    .first;

void main() {
  test('113.4 the parent area models read the contract', () {
    final me = ParentMe.fromJson(parentMeJson());
    expect(me.children.map((c) => (c.student.name, c.slipsWaiting)), [
      ('Omar Hassan', 1),
      ('Laila Hassan', 0),
    ]);
    expect(me.messages, isTrue);
    final day = ChildDay.fromJson(childDayJson());
    expect(day.checkin?.state, CheckinState.checkedIn);
    expect(day.lessons.single.subject, 'Mathematics');
    expect(day.homeworkDue, 1);
    expect(day.grades.single.score, 8.5);
    expect(day.pickupToday?.name, 'Karim Ali');
    expect(day.loans.single.title, 'The Little Prince');
    final slip = PermissionSlip.fromJson(permissionSlipJson());
    expect(slip.waiting, isTrue);
    expect(
      PermissionSlip.fromJson(permissionSlipJson(answer: 'yes')).waiting,
      isFalse,
    );
    expect(
      AbsenceExcuse.fromJson(absenceExcuseJson(status: 'accepted')).status,
      ExcuseStatus.accepted,
    );
    expect(
      ChildPickup.fromJson(childPickupJson()).people.single.relation,
      'Grandmother',
    );
  });

  test('113.4 a slip and an excuse open the parent\'s parts', () {
    expect(
      pushTargetLocation({'type': 'school_slip', 'slip_id': '61'}),
      '/parent/slips',
    );
    expect(
      pushTargetLocation({'type': 'school_excuse', 'student_id': '11'}),
      '/parent/excuses?student=11',
    );
  });

  group('113.4 the Parent tab', () {
    testWidgets('only parents have it; a teacher who is a parent has both', (
      tester,
    ) async {
      usePhone(tester);
      final parent = schoolApp(schoolApi());
      await parent.pump(tester);
      expect(tabPaths(parent), [Paths.school, Paths.parent, Paths.account]);

      final student = schoolApp(schoolApi(roles: ['student']));
      await student.pump(tester);
      expect(tabPaths(student), [Paths.school, Paths.account]);

      final teacher = schoolApp(schoolApi(roles: ['teacher']));
      await teacher.pump(tester);
      expect(tabPaths(teacher), [Paths.school, Paths.classroom, Paths.account]);

      final staff = schoolApp(schoolApi(roles: ['staff']));
      await staff.pump(tester);
      expect(tabPaths(staff), isNot(contains(Paths.parent)));

      final both = schoolApp(schoolApi(roles: ['parent', 'teacher']));
      await both.pump(tester);
      expect(tabPaths(both), [
        Paths.school,
        Paths.parent,
        Paths.classroom,
        Paths.account,
      ]);
    });

    testWidgets('the school\'s roles decide once they are read', (
      tester,
    ) async {
      usePhone(tester);
      // The account still says parent; the school no longer has them as one.
      final app = schoolApp(
        schoolApi(roles: ['parent', 'student'], schoolRoles: ['student'])
          ..schoolMe = {
            'name': 'Omar Hassan',
            'roles': ['student'],
            'students': [schoolStudentJson()],
          },
      );
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(tabPaths(app), [Paths.school, Paths.account]);
    });

    testWidgets('each child\'s day at a glance, one account for all', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.parent);
      expect(find.byKey(const ValueKey('parent-day')), findsOneWidget);
      expect(find.text('Omar Hassan'), findsWidgets);
      expect(find.text('Checked in'), findsOneWidget);
      expect(find.byKey(const ValueKey('parent-pickup-today')), findsOneWidget);
      expect(find.text('Picks up today: Karim Ali · Uncle'), findsOneWidget);
      expect(find.text('1 homework due'), findsOneWidget);
      expect(find.text('Mathematics · Quiz 1'), findsOneWidget);
      expect(find.text('8.5/10'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('parent-slips')),
        200,
        scrollable: dayList,
      );
      expect(find.text('1 to sign'), findsOneWidget);
      expect(find.text('Due: E£4,500.00'), findsOneWidget);
      // Messages with the teachers, as the school allows.
      expect(
        find.byKey(const ValueKey('school-messages-open')),
        findsOneWidget,
      );
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('parent-child')),
        -200,
        scrollable: dayList,
      );
      await tapKey(tester, 'student-12');
      expect(find.text('Laila Hassan'), findsWidgets);
      expect(api.count('getChildDay'), greaterThanOrEqualTo(2));
    });

    testWidgets('no messages entry when the school doesn\'t allow them', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi()..parentMe = parentMeJson(messages: false);
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.parent);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('parent-calendar')),
        200,
        scrollable: dayList,
      );
      expect(find.byKey(const ValueKey('school-messages-open')), findsNothing);
    });

    testWidgets('someone the school didn\'t add as a parent is told so', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi()
        ..failures['getParentMe'] = const ApiException(
          code: 'not_parent',
          message: "This account isn't one of the school's parents.",
          statusCode: 403,
        );
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.parent);
      expect(find.byKey(const ValueKey('parent-not-parent')), findsOneWidget);
    });

    testWidgets('a permission slip signed yes with the parent\'s name', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.parent);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('parent-slips')),
        200,
        scrollable: dayList,
      );
      await tapKey(tester, 'parent-slips');
      expect(find.text('Science museum trip'), findsOneWidget);
      expect(find.text('Fee: E£150, paid at the office'), findsOneWidget);
      expect(find.text('Not answered'), findsOneWidget);
      await tapKey(tester, 'slip-61-11-yes');
      expect(
        find.text('Omar Hassan may take part: Science museum trip.'),
        findsOneWidget,
      );
      await tapKey(tester, 'slip-sign');
      expect(api.slipAnswers.single, (
        slip: 61,
        student: 11,
        answer: SlipAnswer.yes,
        name: 'Hassan Ali',
      ));
      expect(find.text('Signed yes by Hassan Ali'), findsOneWidget);
      expect(find.byKey(const ValueKey('slip-61-11-yes')), findsOneWidget);
    });

    testWidgets('a closed slip can\'t be signed', (tester) async {
      usePhone(tester);
      final api = schoolApi()
        ..permissionSlips = [permissionSlipJson(open: false)];
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.parentSlips);
      expect(find.text('Closed'), findsOneWidget);
      expect(find.byKey(const ValueKey('slip-61-11-yes')), findsNothing);
    });

    testWidgets(
      'an absence excused with the reason, withdrawn while it waits',
      (tester) async {
        usePhone(tester);
        final api = schoolApi()
          ..absenceExcuses = [
            absenceExcuseJson(
              id: 80,
              status: 'declined',
              answer: 'Please bring a note.',
            ),
          ];
        final app = schoolApp(api);
        await app.pump(tester);
        await push(app, tester, Paths.parentPart('excuses', student: 11));
        expect(find.text('Not accepted'), findsOneWidget);
        expect(find.text('The school: Please bring a note.'), findsOneWidget);
        await tapKey(tester, 'excuse-new');
        await tapKey(tester, 'excuse-send');
        expect(api.excusesSent, isEmpty);
        await tester.enterText(
          find.descendant(
            of: find.byKey(const ValueKey('excuse-reason')),
            matching: find.byType(TextField),
          ),
          'A fever',
        );
        await tapKey(tester, 'excuse-send');
        expect(api.excusesSent.single.reason, 'A fever');
        expect(api.excusesSent.single.student, 11);
        expect(find.text('Waiting'), findsOneWidget);
        await tapKey(tester, 'excuse-withdraw-82');
        expect(api.excusesWithdrawn, [82]);
        expect(find.text('Withdrawn'), findsOneWidget);
      },
    );

    testWidgets('who picks the child up, and someone else for one day', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.parentPart('pickup', student: 11));
      expect(find.text('Mona Ali'), findsOneWidget);
      expect(find.text('Grandmother · +20 100 555 1212'), findsOneWidget);
      await tapKey(tester, 'pickup-add');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('pickup-name')),
          matching: find.byType(TextField),
        ),
        'Karim Ali',
      );
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('pickup-relation')),
          matching: find.byType(TextField),
        ),
        'Uncle',
      );
      await tapKey(tester, 'pickup-person-save');
      expect(api.pickupSaved.single.map((p) => (p.name, p.relation)), [
        ('Mona Ali', 'Grandmother'),
        ('Karim Ali', 'Uncle'),
      ]);
      expect(find.text('Karim Ali'), findsOneWidget);

      await tapKey(tester, 'pickup-remove-0');
      expect(api.pickupSaved.last.map((p) => p.name), ['Karim Ali']);

      await tapKey(tester, 'pickup-note-new');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('pickup-note-name')),
          matching: find.byType(TextField),
        ),
        'Sami Ali',
      );
      await tapKey(tester, 'pickup-note-send');
      expect(api.pickupNotes.single, (
        student: 11,
        date: null,
        name: 'Sami Ali',
      ));
      expect(
        find.byKey(const ValueKey('pickup-note-2026-11-02')),
        findsOneWidget,
      );
      await tapKey(tester, 'pickup-note-delete-2026-11-02');
      expect(
        find.byKey(const ValueKey('pickup-note-2026-11-02')),
        findsNothing,
      );
    });
  });

  group('113.4 the School tab without the parents\' parts', () {
    testWidgets('a student sees what a student needs, no fees or reports', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: ['student'])
        ..schoolMe = {
          'name': 'Omar Hassan',
          'roles': ['student'],
          'students': [schoolStudentJson()],
        };
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(find.byKey(const ValueKey('school-overview')), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('school-news')),
        200,
      );
      expect(find.byKey(const ValueKey('school-homework')), findsOneWidget);
      expect(find.byKey(const ValueKey('school-fees')), findsNothing);
      expect(find.byKey(const ValueKey('school-reports')), findsNothing);
      expect(find.byKey(const ValueKey('parent-slips')), findsNothing);
      expect(api.count('getStudentFees'), 0);
    });

    testWidgets('a parent\'s School tab sends them to the Parent tab', (
      tester,
    ) async {
      usePhone(tester);
      final app = schoolApp(schoolApi());
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(find.byKey(const ValueKey('school-for-parents')), findsOneWidget);
      expect(find.byKey(const ValueKey('student-switcher')), findsNothing);
      await tester.tap(find.text('Open the Parent tab'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('parent-day')), findsOneWidget);
    });

    testWidgets('a student who is also a parent sees their own school there', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: ['student', 'parent']);
      final app = schoolApp(api);
      await app.pump(tester);
      expect(tabPaths(app), [Paths.school, Paths.parent, Paths.account]);
      await go(app, tester, Paths.school);
      expect(find.byKey(const ValueKey('school-overview')), findsOneWidget);
      expect(find.byKey(const ValueKey('student-switcher')), findsNothing);
    });
  });
}
