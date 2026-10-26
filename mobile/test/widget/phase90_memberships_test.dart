import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 90.3 Memberships and subscriptions on the website: a course that comes
/// with a membership says which, never sells it on iPhone, and the account
/// lists the student's.
void main() {
  Map<String, dynamic> membershipsConfig() {
    final config = configJson();
    (config['features'] as Map<String, dynamic>)['memberships'] = true;
    return config;
  }

  Future<TestApp> openCourse(
    WidgetTester tester, {
    required DevicePlatform platform,
    required bool hasAccess,
  }) async {
    final app = TestApp(
      platform: platform,
      signedIn: true,
      api: FakeApi(
        config: membershipsConfig(),
        course: {
          ...courseDetailJson(action: hasAccess ? 'enroll_free' : 'none'),
          'membership': {
            'has_access': hasAccess,
            'plans': ['Gold', 'Annual'],
          },
          'website_url': 'https://your-academy.com/courses/ui-design/',
        },
      ),
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);
    return app;
  }

  testWidgets('without the plan: which plans, and the website on Android', (
    tester,
  ) async {
    await openCourse(
      tester,
      platform: DevicePlatform.android,
      hasAccess: false,
    );
    expect(find.text('For members'), findsOneWidget);
    expect(
      find.text(
        'This course comes with a membership on our website: Gold, Annual.',
      ),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('cta-memberships-website')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('cta-checkout')), findsNothing);
    expect(find.byKey(const ValueKey('cta-enroll-free')), findsNothing);
  });

  testWidgets('on iPhone it only says so: no link to where it is sold', (
    tester,
  ) async {
    await openCourse(tester, platform: DevicePlatform.ios, hasAccess: false);
    expect(find.text('For members'), findsOneWidget);
    expect(find.byKey(const ValueKey('cta-memberships-website')), findsNothing);
  });

  testWidgets('with the plan the course is joined as usual', (tester) async {
    await openCourse(tester, platform: DevicePlatform.ios, hasAccess: true);
    expect(find.text('For members'), findsNothing);
    expect(find.byKey(const ValueKey('cta-membership')), findsNothing);
  });

  testWidgets('Account › My memberships lists them, managed on the website', (
    tester,
  ) async {
    final api = FakeApi(config: membershipsConfig())
      ..subscriptions = [
        {
          'id': 'pmpro-2',
          'source': 'paid_memberships_pro',
          'name': 'Gold',
          'status': 'active',
          'started_at': '2026-09-01T10:00:00Z',
          'ends_at': null,
          'renews_at': '2026-11-01T10:00:00Z',
          'course_count': null,
        },
        {
          'id': 'ld-group-40',
          'source': 'learndash_group',
          'name': 'Class of 2026',
          'status': 'active',
          'started_at': null,
          'ends_at': null,
          'renews_at': null,
          'course_count': 3,
        },
        {
          'id': 'wcs-81',
          'source': 'woocommerce_subscriptions',
          'name': 'Academy monthly',
          'status': 'pending_cancel',
          'started_at': '2026-09-01T10:00:00Z',
          'ends_at': '2026-11-01T10:00:00Z',
          'renews_at': null,
          'course_count': null,
        },
      ];
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/account');
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('account-memberships')));
    await TestApp.settle(tester);
    expect(find.text('My memberships'), findsWidgets);
    expect(find.text('Gold'), findsOneWidget);
    expect(find.textContaining('Renews on'), findsOneWidget);
    expect(find.text('Active · 3 courses'), findsOneWidget);
    expect(find.textContaining('Cancelled · Ends on'), findsOneWidget);
    expect(
      find.text('Memberships are managed on our website.'),
      findsOneWidget,
    );
  });

  testWidgets('without memberships on the site, no menu item', (tester) async {
    final app = TestApp(signedIn: true, api: FakeApi());
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/account');
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('account-memberships')), findsNothing);
  });
}
