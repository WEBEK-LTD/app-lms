import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 206.5 (158.7) The staff's and second apps' own tabs end their lists
/// above what covers the foot of the screen, as the customers' screens do
/// since 158 (`endRoom`): the phone's bar (a home indicator, Android's
/// navigation bar) and a tab bar floating over the screens. On a phone with
/// a home indicator, every list that scrolls down on the teacher's
/// Classroom, the staff's tab, the teacher's desk and the vendor's desk and
/// stock leaves at least MediaQuery's bottom padding after its last row,
/// under the floating pill.
/// The owner's floating pill (128), which the screens go on under.
Map<String, dynamic> _floating() => {
  ...navigationJson(),
  'tab_bar': {'design': 'float', 'radius': 22, 'margin': 12},
};

void main() {
  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2
      ..padding = const FakeViewPadding(top: 47 * 2, bottom: 34 * 2)
      ..viewPadding = const FakeViewPadding(top: 47 * 2, bottom: 34 * 2);
    addTearDown(tester.view.reset);
  }

  /// The vertical lists on screen, each with the room it leaves after its
  /// end and what covers the foot of the screen there.
  List<({double end, double covered})> lists(WidgetTester tester) => [
    for (final element in find.byType(ListView).evaluate())
      if ((element.widget as ListView).scrollDirection == Axis.vertical &&
          (element.widget as ListView).padding != null)
        (
          end: (element.widget as ListView).padding!
              .resolve(Directionality.of(element))
              .bottom,
          covered: MediaQuery.paddingOf(element).bottom,
        ),
  ];

  void expectEndsAboveTheBar(WidgetTester tester, String screen) {
    final found = lists(tester);
    expect(found, isNotEmpty, reason: '$screen has a list');
    for (final list in found) {
      expect(
        list.end,
        greaterThanOrEqualTo(list.covered + 24),
        reason: '$screen: its end ${list.end} under ${list.covered}',
      );
    }
  }

  FakeApi school(List<String> roles) {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'school': {...schoolConfigJson(), 'staff_app': 'bundle'},
      },
    );
    api.me = {...userJson(), 'roles': roles};
    api.schoolMe = {'name': 'Mona Adel', 'roles': roles, 'students': []};
    api.navigation = _floating();
    return api;
  }

  FakeApi market() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': {
          'currency': 'EGP',
          'kinds': ['restaurant'],
          'payment': {'cash': true, 'card': true},
          'courier_app': 'bundle',
          'vendor_app': 'bundle',
        },
      },
    );
    api.me = {
      ...userJson(),
      'roles': ['vendor'],
    };
    api.vendorOrders['new'] = [
      {
        'id': 901,
        'reference': 'M-901',
        'status': 'placed',
        'fulfilment': 'delivery',
        'scheduled_for': null,
        'lines': [marketOrderLineJson()],
        'subtotal': {'amount': '265.00', 'formatted': 'EGP 265.00'},
        'customer': {'first_name': 'Mona'},
        'notes': null,
        'dropoff': null,
        'payment': {'method': 'cash', 'status': 'unpaid', 'collect': null},
        'prep_minutes': null,
        'ready_at': null,
        'courier': null,
        'created_at': '2026-11-04T12:00:00Z',
        'timeline': [
          {'status': 'placed', 'at': '2026-11-04T12:00:00Z'},
        ],
      },
    ];
    api.vendorProducts.add({
      'id': 5,
      'name': 'Mixed grill',
      'price': {'amount': '265.00', 'formatted': 'EGP 265.00'},
      'in_stock': true,
    });
    api.navigation = _floating();
    return api;
  }

  FakeApi academy() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'vertical': 'instructors',
        'instructors': {
          'applications': true,
          'timezone': 'Africa/Cairo',
          'staff_app': 'bundle',
        },
      },
    );
    api.me = {
      ...userJson(),
      'roles': ['teacher'],
    };
    api.navigation = _floating();
    return api;
  }

  Future<void> open(WidgetTester tester, TestApp app, String path) async {
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    app.container.read(appRouterProvider).go(path);
    await TestApp.settle(tester, 20);
  }

  testWidgets('a teacher\'s Classroom', (tester) async {
    phone(tester);
    final app = TestApp(
      api: school(['teacher']),
      appType: AppType.school,
      signedIn: true,
      build: (b) => b.copyWith(role: AppRole.staff),
    );
    await open(tester, app, Paths.classroom);
    expectEndsAboveTheBar(tester, 'Classroom');
  });

  testWidgets('the staff\'s tab', (tester) async {
    phone(tester);
    final app = TestApp(
      api: school(['staff']),
      appType: AppType.school,
      signedIn: true,
      build: (b) => b.copyWith(role: AppRole.staff),
    );
    await open(tester, app, Paths.staff);
    expectEndsAboveTheBar(tester, 'Staff');
  });

  for (final (name, path) in [
    ('the vendor\'s desk', Paths.vendorDesk),
    ('the vendor\'s stock', Paths.vendorStock),
  ]) {
    testWidgets(name, (tester) async {
      phone(tester);
      final app = TestApp(
        api: market(),
        appType: AppType.food,
        signedIn: true,
        build: (b) => b.copyWith(role: AppRole.vendor),
      );
      await open(tester, app, path);
      expectEndsAboveTheBar(tester, name);
    });
  }

  testWidgets('the teacher\'s desk', (tester) async {
    phone(tester);
    final app = TestApp(
      api: academy(),
      appType: AppType.lms,
      signedIn: true,
      build: (b) => b.copyWith(role: AppRole.staff),
    );
    await open(tester, app, Paths.teacherDesk);
    expectEndsAboveTheBar(tester, 'Teacher desk');
  });
}
