import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/services/share_links.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 112.5, round 2: the certificate's PDF and sharing it, the question bank,
/// cohorts, grading in the Teacher tab, report cards and the live classes'
/// calendar.

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

void main() {
  testWidgets('112.5 a certificate: its PDF opens and its link is shared', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final shared = <String>[];
    const url = 'https://yallapp.test/a/app/certificate/1-10-abc';
    final api = FakeApi()
      ..certificates = [
        {
          'course_id': 10,
          'course_title': 'Turkish for Beginners',
          'url': url,
          'pdf_url': '$url/pdf?lang=en',
          'issued_at': '2026-10-20T10:00:00Z',
        },
      ];
    final app = TestApp(
      signedIn: true,
      appType: AppType.lms,
      api: api,
      overrides: [
        openExternalProvider.overrideWithValue((u) async {
          opened.add(u);
          return true;
        }),
        shareTextProvider.overrideWithValue((text) async => shared.add(text)),
      ],
    );
    await app.pump(tester);
    await push(app, tester, Paths.certificates);
    expect(find.text('Turkish for Beginners'), findsOneWidget);
    await tapKey(tester, 'certificate-pdf-10');
    expect(opened, ['$url/pdf?lang=en']);
    await tapKey(tester, 'certificate-share-10');
    expect(shared, ['My certificate for Turkish for Beginners: $url']);
  });

  testWidgets('112.5 a course page shows the student\'s cohort', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(
      course: {
        ...courseDetailJson(enrolled: true),
        'cohort': {
          'id': 30,
          'name': 'October group',
          'starts_at': '2026-10-20T00:00:00Z',
        },
      },
    );
    final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.course(1));
    expect(find.textContaining('October group · starts'), findsOneWidget);
  });

  testWidgets('112.5 a teacher grades an assignment in the Teacher tab', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'vertical': 'instructors',
        'instructors': {'applications': true, 'timezone': 'Africa/Cairo'},
      },
    );
    api.me = {
      ...userJson(),
      'roles': ['teacher'],
    };
    api.teacherSubmissions = [
      {
        'id': 7,
        'course_id': 10,
        'course_title': 'Turkish for Beginners',
        'assignment_id': 16,
        'assignment_title': 'Introduce yourself',
        'student_name': 'Deniz Aksoy',
        'text': 'Merhaba, ben Deniz.',
        'file': null,
        'status': 'submitted',
        'score': null,
        'max_points': 20,
        'passed': null,
        'feedback': null,
        'submitted_at': '2026-10-12T15:00:00Z',
        'graded_at': null,
        'late': false,
      },
    ];
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go(Paths.teacherDesk);
    await TestApp.settle(tester);
    await tester.tap(find.text('Grading'));
    await TestApp.settle(tester);
    expect(find.text('Deniz Aksoy'), findsOneWidget);
    await tapKey(tester, 'teacher-submission-7');
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('grade-score')),
        matching: find.byType(TextFormField),
      ),
      '25',
    );
    await tapKey(tester, 'grade-save');
    expect(api.graded, isEmpty);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('grade-score')),
        matching: find.byType(TextFormField),
      ),
      '18',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('grade-note')),
        matching: find.byType(TextFormField),
      ),
      'Güzel!',
    );
    await tapKey(tester, 'grade-save');
    expect(api.graded.single, (
      id: 7,
      sendBack: false,
      score: 18,
      feedback: 'Güzel!',
    ));
    expect(find.text('Nothing to grade. Well done!'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  FakeApi schoolApi(List<String> roles) {
    final api = FakeApi(
      config: {...configJson(lms: null), 'school': schoolConfigJson()},
    );
    api.me = {...userJson(), 'roles': roles};
    api.schoolMe = schoolMeJson(roles: roles);
    return api;
  }

  testWidgets('112.5 a parent opens the term\'s report card', (tester) async {
    usePhone(tester);
    final api = schoolApi(['parent']);
    final app = TestApp(api: api, appType: AppType.school, signedIn: true);
    await app.pump(tester);
    await push(app, tester, Paths.schoolPart('grades', student: 11));
    await tapKey(tester, 'open-report-card');
    expect(find.text('Mathematics'), findsOneWidget);
    expect(find.text('85%'), findsNWidgets(2));
    expect(find.text('Midterm · 17/20'), findsOneWidget);
    expect(
      find.text('Attendance: 40 present, 1 absent, 2 late, 0 excused.'),
      findsOneWidget,
    );
    expect(api.count('getStudentReportCard'), 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('112.5 a teacher opens the class\'s gradebook', (tester) async {
    usePhone(tester);
    final api = schoolApi(['teacher']);
    final app = TestApp(api: api, appType: AppType.school, signedIn: true);
    await app.pump(tester);
    await push(app, tester, '${Paths.classroomClass(1)}/gradebook');
    expect(find.text('Omar Hassan'), findsOneWidget);
    expect(find.text('85%'), findsNWidgets(2));
    expect(find.text('—'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('112.5 live classes on a month\'s calendar', (tester) async {
    usePhone(tester);
    final api = FakeApi();
    final app = TestApp(signedIn: true, appType: AppType.lms, api: api);
    await app.pump(tester);
    await push(app, tester, Paths.liveClasses);
    await tester.tap(find.text('Calendar'));
    await TestApp.settle(tester);
    // The month of the first class coming, its day chosen.
    expect(find.text('October 2026'), findsOneWidget);
    expect(find.byKey(const ValueKey('live-17')), findsOneWidget);
    await tapKey(tester, 'calendar-day-21');
    expect(find.text('No live class on this day.'), findsOneWidget);
    await tapKey(tester, 'calendar-next');
    expect(find.text('November 2026'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('112.5 a coupon before a paid course\'s checkout', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(
      course: {
        ...courseDetailJson(),
        'purchase': {'action': 'checkout', 'coupons': true},
      },
    );
    final app = TestApp(
      platform: DevicePlatform.android,
      signedIn: true,
      guest: true,
      api: api,
    );
    await app.pump(tester);
    await push(app, tester, Paths.course(1));
    await tapKey(tester, 'cta-checkout');
    expect(find.text('Have a coupon?'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('coupon-code')), 'nope');
    await tapKey(tester, 'coupon-apply');
    expect(find.text("This coupon doesn't exist."), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('coupon-code')),
      'welcome10',
    );
    await tapKey(tester, 'coupon-apply');
    expect(find.text('₺45.00 off: you pay ₺405.00.'), findsOneWidget);
    await tapKey(tester, 'coupon-continue');
    expect(api.checkoutCoupons, ['WELCOME10']);
  });
}
