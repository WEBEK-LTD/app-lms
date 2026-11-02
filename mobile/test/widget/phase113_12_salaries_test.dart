import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/widgets/file_viewer.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 113.12 My payslips in the Staff tab and the teacher's Classroom tab: the
/// months with their net and whether the school recorded them paid, the
/// advances, a payslip's lines and payments, and its PDF.

FakeApi staffApi({List<String> roles = const ['staff']}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null, languages: languagesJson()),
      'school': schoolConfigJson(),
    },
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = schoolMeJson(roles: roles);
  return api;
}

TestApp staffApp(
  FakeApi api, {
  List<String>? opened,
  List<String>? fetched,
  String? language,
}) => TestApp(
  api: api,
  appType: AppType.school,
  signedIn: true,
  preferences: {'settings.language': ?language},
  overrides: [
    attachmentFetcherProvider.overrideWithValue((url) async {
      fetched?.add(url);
      return Uint8List.fromList([0x25, 0x50, 0x44, 0x46, 0x2d]);
    }),
    openExternalProvider.overrideWithValue((url) async {
      opened?.add(url);
      return true;
    }),
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

Future<void> tapKey(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester);
}

void main() {
  group('113.12 My payslips', () {
    testWidgets('staff open their payslips from the Staff tab: the months, '
        'the advances, a payslip and its PDF', (tester) async {
      usePhone(tester);
      final api = staffApi();
      final opened = <String>[];
      final fetched = <String>[];
      final app = staffApp(api, opened: opened, fetched: fetched);
      await app.pump(tester);
      await go(app, tester, Paths.staff);
      await tapKey(tester, 'staff-payslips');
      expect(api.calls, contains('listPayslips'));
      expect(
        find.text(
          'The school records salaries by hand: it pays in cash or by bank '
          'transfer and writes it down here.',
        ),
        findsOneWidget,
      );
      expect(find.text('October 2026'), findsOneWidget);
      expect(find.text('September 2026'), findsOneWidget);
      expect(find.text('Net E£9,500.00'), findsNWidgets(2));
      expect(find.text('Partly paid'), findsOneWidget);
      expect(find.text('Paid'), findsOneWidget);
      expect(
        find.text(
          'E£3,000.00 given on 5 Oct 2026 · E£1,000.00 a month · '
          'E£2,000.00 left',
        ),
        findsOneWidget,
      );

      await tapKey(tester, 'payslip-42');
      expect(find.text('Mona Adel'), findsOneWidget);
      expect(
        find.text('PS-2026-10-42 · Math teacher · Sciences'),
        findsOneWidget,
      );
      expect(find.text('Base salary'), findsOneWidget);
      expect(find.text('Transport'), findsOneWidget);
      expect(find.text('Exam supervision'), findsOneWidget);
      expect(find.text('Absences (2)'), findsOneWidget);
      expect(find.text('Advance taken back'), findsOneWidget);
      expect(find.text('−E£1,000.00'), findsNWidgets(2));
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('payslip-net')),
          matching: find.text('E£9,500.00'),
        ),
        findsOneWidget,
      );
      expect(
        find.text(
          '21 working days · 18 present · 2 absent · 4 late · 1 on leave',
        ),
        findsOneWidget,
      );
      expect(find.text('Cash, 30 Oct 2026'), findsOneWidget);
      expect(find.text('Left to pay'), findsOneWidget);
      expect(find.text('E£4,500.00'), findsOneWidget);

      // The PDF from a fresh link: in the app's viewer, or outside to keep.
      await tapKey(tester, 'payslip-pdf');
      expect(find.byType(FileViewerScreen), findsOneWidget);
      expect(fetched.single, contains('/payslips/42/pdf'));
      Navigator.of(
        tester.element(find.byType(FileViewerScreen)),
        rootNavigator: true,
      ).pop();
      await TestApp.settle(tester);
      await tapKey(tester, 'payslip-download');
      expect(opened.single, contains('/payslips/42/pdf'));
      expect(api.calls.where((c) => c == 'getPayslip').length, greaterThan(2));
    });

    testWidgets('a teacher finds My payslips in the Classroom tab', (
      tester,
    ) async {
      usePhone(tester);
      final api = staffApi(roles: ['teacher']);
      final app = staffApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.classroom);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('staff-payslips')),
        300,
        scrollable: find
            .descendant(
              of: find.byKey(const ValueKey('classroom')),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      await tapKey(tester, 'staff-payslips');
      expect(find.text('October 2026'), findsOneWidget);
    });

    testWidgets('no payslips yet, in Arabic', (tester) async {
      usePhone(tester);
      final api = staffApi()
        ..payslips = []
        ..salaryAdvances = [];
      final app = staffApp(api, language: 'ar');
      await app.pump(tester);
      await go(app, tester, Paths.staffPayslips);
      expect(
        find.text('لا قسائم بعد. تظهر هنا حين تعتمدها المدرسة نهائيًا.'),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('payslip-42')), findsNothing);
    });

    testWidgets("another person's payslip isn't found", (tester) async {
      usePhone(tester);
      final api = staffApi();
      final app = staffApp(api);
      await app.pump(tester);
      await go(app, tester, Paths.staffPayslip(99));
      expect(find.text('Payslip not found.'), findsOneWidget);
    });
  });
}
