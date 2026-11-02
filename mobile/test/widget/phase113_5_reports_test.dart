import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase105_4_test.dart'
    show go, push, schoolApi, schoolApp, tapKey, usePhone;

/// The message above the bottom bar, gone before the next tap.
Future<void> dismissMessage(WidgetTester tester) async {
  ScaffoldMessenger.of(tester.element(find.byType(Scaffold).last))
      .removeCurrentSnackBar();
  await TestApp.settle(tester);
}

void main() {
  test('113.5 the syllabus, the reports and their notifications', () {
    final syllabus = ClassSyllabus.fromJson(classSyllabusJson());
    final maths = syllabus.subjects.single;
    expect(maths.status, SyllabusStatus.behind);
    expect(maths.plannedTopic, 'Adding fractions');
    expect(maths.units.single.topics.map((t) => (t.due, t.now)), [
      (true, false),
      (false, true),
      (false, false),
    ]);
    final report = TeacherReport.fromJson(
      teacherReportJson(
        status: 'returned',
        answers: {'f1': 4, 'f2': 'Good'},
        comments: [
          {
            'by': 'school',
            'name': 'Nile School',
            'text': 'Say which pages.',
            'at': '2026-10-13T09:00:00Z',
          },
        ],
      ),
    );
    expect(report.editable, isTrue);
    expect(report.answers, {'f1': 4, 'f2': 'Good'});
    expect(report.comments.single.fromSchool, isTrue);
    expect(
      ReportTemplate.fromJson(reportTemplateJson()).kind,
      ReportKind.student,
    );
    expect(
      pushTargetLocation({'type': 'school_report', 'report_id': '21'}),
      '/classroom/report/21',
    );
    expect(
      pushTargetLocation({
        'type': 'school_report_shared',
        'student_id': '11',
        'report_id': '21',
      }),
      '/school/reports?student=11',
    );
    final n = InboxNotification.fromJson({
      'id': 1,
      'title': 'Your report was sent back',
      'body': '',
      'type': 'school_report',
      'report_id': 21,
      'created_at': '2026-10-13T09:00:00Z',
      'read': false,
    });
    expect(n.type, NotificationType.schoolReport);
    expect(n.target['report_id'], 21);
  });

  group('113.5 Classroom: the syllabus', () {
    testWidgets('shows the class behind the plan, and marks a topic covered', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.classroomClass(3));
      await tapKey(tester, 'class-syllabus-open');
      expect(find.text('Behind the plan by 1 lesson'), findsOneWidget);
      expect(
        find.text('0 of 3 covered (0%) · The plan: 33% by today'),
        findsOneWidget,
      );
      expect(find.text('The plan now: Adding fractions'), findsOneWidget);
      await tapKey(tester, 'topic-41');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('topic-note')),
          matching: find.byType(TextField),
        ),
        'With paper folding.',
      );
      await tapKey(tester, 'topic-mark');
      final marked = api.topicsMarked.single;
      expect(
        (marked.classId, marked.topicId, marked.day, marked.note),
        (3, 41, '2026-10-12', 'With paper folding.'),
      );
      expect(find.text('On plan'), findsOneWidget);
    });
  });

  group('113.5 Classroom: reports to the school', () {
    testWidgets('a teacher starts a report on a student from a template', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.classroom);
      await tapKey(tester, 'classroom-reports');
      expect(find.text('End of term report'), findsOneWidget);
      await tapKey(tester, 'report-write');
      // Nothing chosen yet: asked for it.
      await tapKey(tester, 'report-start');
      expect(
        find.text(
          'Choose a template, a class and, for a report on a student, the student.',
        ),
        findsOneWidget,
      );
      await tapKey(tester, 'report-template');
      await tester.tap(find.text('End of term report').last);
      await TestApp.settle(tester);
      await tapKey(tester, 'report-class');
      await tester.tap(find.text('Grade 5 A').last);
      await TestApp.settle(tester);
      await tapKey(tester, 'report-student-3');
      await tester.tap(find.text('Omar Hassan').last);
      await TestApp.settle(tester);
      await tapKey(tester, 'report-start');
      final made = api.reportsMade.single;
      expect((made.templateId, made.studentId, made.classId), (5, 11, null));
      // The draft opens.
      expect(find.byKey(const ValueKey('teacher-report')), findsOneWidget);
    });

    testWidgets('fills in a draft and sends it; the required rating first', (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher']);
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.classroomReport(21));
      await tapKey(tester, 'report-send');
      expect(
        find.text('Fill in “Academic level” before sending.'),
        findsOneWidget,
      );
      expect(api.reportsSent, isEmpty);
      await dismissMessage(tester);
      await tapKey(tester, 'field-f1-4');
      await tapKey(tester, 'field-f2-Good');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('field-f3')),
          matching: find.byType(TextField),
        ),
        'Read 20 minutes at home.',
      );
      await tapKey(tester, 'report-save');
      expect(api.reportsSaved.single.answers, {
        'f1': 4,
        'f2': 'Good',
        'f3': 'Read 20 minutes at home.',
      });
      expect(find.text('Draft saved.'), findsOneWidget);
      await dismissMessage(tester);
      await tapKey(tester, 'report-send');
      expect(api.reportsSent.single.id, 21);
      // Sent: with the school, read-only.
      expect(
        find.text(
          'This report is with the school. You can change it if they send it back.',
        ),
        findsOneWidget,
      );
    });

    testWidgets("a report sent back shows the school's comment", (
      tester,
    ) async {
      usePhone(tester);
      final api = schoolApi(roles: ['teacher'])
        ..teacherReport = teacherReportJson(
          status: 'returned',
          answers: {'f1': 3},
          comments: [
            {
              'by': 'school',
              'name': 'Nile School',
              'text': 'Say which pages to read.',
              'at': '2026-10-13T09:00:00Z',
            },
          ],
        );
      final app = schoolApp(api);
      await app.pump(tester);
      await push(app, tester, Paths.classroomReport(21));
      expect(find.byKey(const ValueKey('report-returned')), findsOneWidget);
      expect(find.text('Say which pages to read.'), findsOneWidget);
      expect(find.byKey(const ValueKey('report-send')), findsOneWidget);
      // A report sent back isn't a draft: it can't be deleted.
      expect(find.byKey(const ValueKey('report-delete')), findsNothing);
    });
  });

  group('113.5 School: reports shared with the parents', () {
    testWidgets('a parent reads the reports the school shared', (tester) async {
      usePhone(tester);
      final api = schoolApi();
      final app = schoolApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.school);
      await tapKey(tester, 'school-reports');
      expect(find.text('End of term report'), findsOneWidget);
      expect(find.text('Read 20 minutes at home.'), findsOneWidget);
      expect(find.text('4 out of 5'), findsOneWidget);
    });

    testWidgets('a student has no reports entry', (tester) async {
      usePhone(tester);
      final app = schoolApp(schoolApi(roles: ['student']));
      await app.pump(tester);
      await go(app, tester, Paths.school);
      expect(find.byKey(const ValueKey('school-reports')), findsNothing);
    });
  });
}
