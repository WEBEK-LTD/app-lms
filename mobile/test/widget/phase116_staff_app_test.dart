import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/lms/teachers/teachers_providers.dart';
import 'package:yallapp/modules/school/data/school_providers.dart';
import 'package:yallapp/modules/shared/staff_app.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 116 A school's or academy's teachers and staff work in the staff app of
/// the bundle: the main app is for students and parents only once the
/// school says so (`staff_app` bundle); with `same` (and from older
/// servers) their tabs stay in the main app.
FakeApi _school({
  required List<String> roles,
  String? staffApp,
  bool student = false,
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'school': {...schoolConfigJson(), 'staff_app': ?staffApp},
    },
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = {
    'name': 'Mona Adel',
    'roles': roles,
    'students': student ? [schoolStudentJson()] : <Object>[],
  };
  return api;
}

FakeApi _academy({required List<String> roles, String? staffApp}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'vertical': 'instructors',
      'instructors': {
        'applications': true,
        'timezone': 'Africa/Cairo',
        'staff_app': ?staffApp,
      },
    },
  );
  api.me = {...userJson(), 'roles': roles};
  return api;
}

TestApp _app(FakeApi api, AppType type, AppRole role) => TestApp(
  api: api,
  appType: type,
  signedIn: true,
  build: (b) => b.copyWith(role: role),
);

void _phone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

List<String?> _tabs(TestApp app) =>
    app.container.read(shellTabsProvider).map((t) => t.path).toList();

String _at(TestApp app) => app.container.read(appRouterProvider).state.uri.path;

void main() {
  test('116 the config says where the staff work', () {
    final bundle = AppConfig.fromJson({
      ...configJson(lms: null),
      'school': {...schoolConfigJson(), 'staff_app': 'bundle'},
      'instructors': {'applications': false, 'staff_app': 'bundle'},
    });
    expect(bundle.school?.staffAppBundled, isTrue);
    expect(bundle.instructors?.staffAppBundled, isTrue);
    // `same`, and older servers: the main app.
    final same = AppConfig.fromJson({
      ...configJson(lms: null),
      'school': {...schoolConfigJson(), 'staff_app': 'same'},
      'instructors': {'applications': false},
    });
    expect(same.school?.staffAppBundled, isFalse);
    expect(same.instructors?.staffAppBundled, isFalse);
  });

  group('116 a school', () {
    testWidgets('the staff app opens on a teacher\'s Classroom, with it and '
        'Account only', (tester) async {
      _phone(tester);
      final app = _app(
        _school(roles: ['teacher', 'parent'], staffApp: 'bundle'),
        AppType.school,
        AppRole.staff,
      );
      await app.pump(tester);
      expect(app.container.read(staffAppProvider), isTrue);
      expect(_tabs(app), [Paths.classroom, Paths.account]);
      expect(_at(app), Paths.classroom);
      // No parent's or student's tab in the staff app.
      expect(_tabs(app), isNot(contains(Paths.parent)));
      expect(_tabs(app), isNot(contains(Paths.school)));
    });

    testWidgets('a member of staff who doesn\'t teach gets the Staff tab, '
        'with the school\'s news', (tester) async {
      _phone(tester);
      final app = _app(
        _school(roles: ['staff'], staffApp: 'bundle'),
        AppType.school,
        AppRole.staff,
      );
      await app.pump(tester);
      expect(_tabs(app), [Paths.staff, Paths.account]);
      expect(_at(app), Paths.staff);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('staff-school-news')),
        200,
      );
      expect(find.byKey(const ValueKey('staff-school-news')), findsOneWidget);
    });

    testWidgets('someone who doesn\'t work there is told the staff app is '
        'for the staff', (tester) async {
      _phone(tester);
      final app = _app(
        _school(roles: ['parent'], staffApp: 'bundle'),
        AppType.school,
        AppRole.staff,
      );
      await app.pump(tester);
      expect(_tabs(app), [Paths.staff, Paths.account]);
      expect(
        find.text(
          'This app is for the school\'s teachers and staff. Students and '
          'parents use the school\'s main app.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('the main app is for students and parents once the staff '
        'app is in the bundle', (tester) async {
      _phone(tester);
      final app = _app(
        _school(roles: ['teacher', 'staff', 'parent'], staffApp: 'bundle'),
        AppType.school,
        AppRole.customer,
      );
      await app.pump(tester);
      expect(app.container.read(staffScreensHereProvider), isFalse);
      expect(app.container.read(isSchoolTeacherProvider), isFalse);
      expect(_tabs(app), isNot(contains(Paths.classroom)));
      expect(_tabs(app), isNot(contains(Paths.staff)));
      expect(_tabs(app), contains(Paths.parent));
    });

    testWidgets('a teacher with no child there is sent to the staff app', (
      tester,
    ) async {
      _phone(tester);
      final app = _app(
        _school(roles: ['teacher'], staffApp: 'bundle'),
        AppType.school,
        AppRole.customer,
      );
      await app.pump(tester);
      app.container.read(appRouterProvider).go(Paths.school);
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('school-in-staff-app')), findsOneWidget);
    });

    for (final staffApp in ['same', null]) {
      testWidgets('with the staff in the main app ($staffApp) their tabs stay '
          'there', (tester) async {
        _phone(tester);
        final app = _app(
          _school(roles: ['teacher', 'parent'], staffApp: staffApp),
          AppType.school,
          AppRole.customer,
        );
        await app.pump(tester);
        expect(_tabs(app), contains(Paths.classroom));
      });
    }
  });

  group('116 an academy with many teachers', () {
    testWidgets('the staff app is the Teacher tab and Account', (tester) async {
      _phone(tester);
      final app = _app(
        _academy(roles: ['teacher'], staffApp: 'bundle'),
        AppType.lms,
        AppRole.staff,
      );
      await app.pump(tester);
      expect(_tabs(app), [Paths.teacherDesk, Paths.account]);
      expect(_at(app), Paths.teacherDesk);
      expect(app.container.read(isTeacherProvider), isTrue);
    });

    testWidgets('the main app has no Teacher tab once the teachers have the '
        'staff app', (tester) async {
      _phone(tester);
      final bundled = _app(
        _academy(roles: ['teacher'], staffApp: 'bundle'),
        AppType.lms,
        AppRole.customer,
      );
      await bundled.pump(tester);
      expect(_tabs(bundled), isNot(contains(Paths.teacherDesk)));
    });

    testWidgets('with the teachers in the main app, its Teacher tab stays', (
      tester,
    ) async {
      _phone(tester);
      final same = _app(
        _academy(roles: ['teacher'], staffApp: 'same'),
        AppType.lms,
        AppRole.customer,
      );
      await same.pump(tester);
      expect(_tabs(same), contains(Paths.teacherDesk));
    });
  });
}
