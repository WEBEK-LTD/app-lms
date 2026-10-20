import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'fitness_test.dart' show gymApi, openGym;

/// Roadmap 63: a gym member's code at the door (shown offline too), and the
/// business's reply under a course review or a review it hid.
void main() {
  Map<String, dynamic> withCode(Map<String, dynamic> m) => {
    ...m,
    'member_code': {
      'code': 'Q4MZ7KP2XH9D',
      'qr_payload': 'YM1.${m['id']}.Q4MZ7KP2XH9D',
    },
  };

  testWidgets('a gym member shows their code at the door, also offline', (
    tester,
  ) async {
    final api = gymApi()
      ..memberships = [
        withCode(
          membershipJson(
            name: 'Monthly unlimited',
            period: 'month',
            creditsLeft: null,
            endsAt: '2026-12-01T09:00:00Z',
          ),
        ),
        // An ended one has no code to show.
        withCode(membershipJson(id: 6, status: 'expired')),
      ];
    final app = await openGym(tester, api: api);
    app.container.read(appRouterProvider).go('/memberships');
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('member-qr')), findsOneWidget);
    expect(find.text('Q4MZ-7KP2-XH9D'), findsOneWidget);
    expect(find.text('Show this at the door'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) =>
            w is Semantics &&
            w.properties.label ==
                'QR code of your Monthly unlimited membership',
      ),
      findsOneWidget,
    );

    // No connection: the code kept on the phone still shows.
    api.failures['listMyMemberships'] = const ApiException(
      code: ApiException.networkError,
      message: 'offline',
    );
    app.container.read(appRouterProvider).go('/classes');
    await TestApp.settle(tester);
    app.container.read(appRouterProvider).go('/memberships');
    await TestApp.settle(tester);
    expect(find.text('Q4MZ-7KP2-XH9D'), findsOneWidget);
  });

  testWidgets('apps that are not gyms show no code', (tester) async {
    final api = gymApi()..memberships = [membershipJson()];
    final app = await openGym(tester, api: api);
    app.container.read(appRouterProvider).go('/memberships');
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('member-qr')), findsNothing);
  });

  testWidgets('a review shows the academy\'s reply, and a hidden one says so', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final mine = {
      ...reviewJson(id: 9, rating: 2, mine: true, status: 'hidden'),
      'reply': null,
    };
    final api = FakeApi(
      config: configJson(),
      course: courseDetailJson(action: 'continue', enrolled: true),
    );
    api.reviews = {
      ...reviewPageJson(mine: mine),
      ...pageJson([
        {
          ...reviewJson(),
          'reply': {
            'text': 'Thank you, Ayse!',
            'created_at': '2026-10-03T10:00:00Z',
          },
        },
      ]),
    };
    final app = TestApp(signedIn: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/course/1');
    await TestApp.settle(tester);
    await tester.tap(find.text('Reviews'));
    await TestApp.settle(tester);
    expect(find.text('Reply from the academy'), findsOneWidget);
    expect(find.text('Thank you, Ayse!'), findsOneWidget);
    expect(
      find.text('Hidden by the academy. Only you can see it.'),
      findsOneWidget,
    );
  });

  test('member codes and replies read the contract; kept memberships too', () {
    final m = Membership.fromJson(withCode(membershipJson()));
    expect(m.memberCode?.grouped, 'Q4MZ-7KP2-XH9D');
    expect(m.memberCode?.qrPayload, 'YM1.5.Q4MZ7KP2XH9D');
    final again = Membership.fromJson(m.toJson());
    expect(again.memberCode?.code, 'Q4MZ7KP2XH9D');
    expect(again.creditsLeft, 4);
    expect(Membership.fromJson(membershipJson()).memberCode, isNull);
    final review = Review.fromJson({
      ...reviewJson(status: 'hidden', mine: true),
      'reply': {'text': 'Thanks', 'created_at': '2026-10-03T10:00:00Z'},
    });
    expect(review.status, ReviewStatus.hidden);
    expect(review.reply?.text, 'Thanks');
  });
}
