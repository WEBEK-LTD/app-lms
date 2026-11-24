import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/api/fake_community_api.dart';
import 'package:yallapp_community/core/api/models.dart';
import 'package:yallapp_community/core/routing/paths.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

void main() {
  testWidgets('follow is one way, at once', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.member('m-nour'));
    await TestApp.settle(tester);
    expect(key('profile-m-nour'), findsOneWidget);
    await tap(tester, 'profile-follow');
    expect(api.calls, contains('follow:m-nour'));
    expect(find.text('Following'), findsWidgets);
    await tap(tester, 'profile-follow');
    expect(api.calls, contains('unfollow:m-nour'));
  });

  testWidgets('friends: ask, and the request is shown as sent', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.member('m-nour'));
    await TestApp.settle(tester);
    await tap(tester, 'profile-friend');
    expect(api.calls, contains('friend:m-nour'));
    expect(find.text('Requested'), findsOneWidget);
  });

  testWidgets('friends: accepting a request from the requests list', (
    tester,
  ) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.friendRequests);
    await TestApp.settle(tester);
    await tap(tester, 'request-accept-fr-1');
    expect(api.calls, contains('accept:fr-1'));
    expect(key('request-accept-fr-1'), findsNothing);
  });

  testWidgets('report a member, with a reason', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.member('m-karim'));
    await TestApp.settle(tester);
    await tap(tester, 'profile-more');
    await tap(tester, 'profile-report');
    expect(key('report-sheet'), findsOneWidget);
    await tap(tester, 'report-spam');
    await tap(tester, 'report-send');
    expect(api.reports, ['member:m-karim:spam']);
  });

  testWidgets('block a member, then unblock', (tester) async {
    final api = FakeCommunityApi();
    final app = await TestApp.start(tester, api: api);
    app.go(Paths.member('m-karim'));
    await TestApp.settle(tester);
    await tap(tester, 'profile-more');
    await tap(tester, 'profile-block');
    await tap(tester, 'block-confirm');
    expect(api.calls, contains('block:m-karim'));
    expect(key('profile-unblock'), findsOneWidget);
    await tap(tester, 'profile-unblock');
    expect(api.calls, contains('unblock:m-karim'));
  });

  testWidgets('own profile: every badge listed, the highest by the name', (
    tester,
  ) async {
    final app = await TestApp.start(tester);
    app.go(Paths.me);
    await TestApp.settle(tester);
    expect(key('badge-blue'), findsOneWidget);
    expect(key('profile-edit'), findsOneWidget);
    // Two apps: no Gold form yet.
    expect(key('profile-apply-gold'), findsNothing);
  });

  testWidgets('the Gold Apply shows at 5 apps', (tester) async {
    final app = await TestApp.start(
      tester,
      api: FakeCommunityApi(
        apps: [
          for (var i = 0; i < 5; i++) LinkedApp(id: 'a$i', name: 'App $i'),
        ],
      ),
    );
    app.go(Paths.me);
    await TestApp.settle(tester);
    await tester.scrollUntilVisible(
      key('profile-apply-gold'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(key('profile-apply-gold'), findsOneWidget);
  });

  testWidgets('followers list opens a member', (tester) async {
    final app = await TestApp.start(tester);
    app.go(Paths.followers(FakeCommunityApi.meId));
    await TestApp.settle(tester);
    expect(key('member-m-nour'), findsOneWidget);
    await tester.tap(key('member-m-nour'));
    await TestApp.settle(tester);
    expect(key('profile-m-nour'), findsOneWidget);
  });
}
