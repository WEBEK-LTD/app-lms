import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/push/push.dart';
import 'package:yallapp_community/core/push/routes.dart';
import 'package:yallapp_community/core/routing/feature_routes.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

// 232.6 Push: the token, a tapped push's screen, the per-kind switches.
void main() {
  test('a push opens by its kind, else by its ids, else the list', () {
    expect(
      routeForPush({'kind': 'message', 'conversation_id': 'c-1'}),
      '/messages/c-1',
    );
    expect(routeForPush({'kind': 'post_like', 'post_id': 'p-1'}), '/posts/p-1');
    expect(
      routeForPush({'kind': 'group_request', 'group_id': 'g-1'}),
      '/groups/g-1/members',
    );
    expect(
      routeForPush({'kind': 'group_joined', 'group_id': 'g-1'}),
      '/groups/g-1',
    );
    expect(
      routeForPush({'kind': 'something_new', 'question_id': 'q-1'}),
      FeatureLinks.question('q-1'),
    );
    expect(routeForPush({}), FeatureLinks.notifications);
    // Area C's payload: by its link.
    expect(
      routeForPush({
        'kind': 'answer',
        'notification_id': 'n-1',
        'link': '/questions/how-to#answer-9',
      }),
      FeatureLinks.question('how-to'),
    );
    expect(routeForPush({'link': '/u/nour'}), '/members/@nour');
    expect(routeForPush({'link': '/events/e-1'}), FeatureLinks.event('e-1'));
    expect(routeForPush({'link': '/academy'}), FeatureLinks.academy);
    expect(
      routeForPush({'kind': 'message', 'link': '/messages/c-1'}),
      '/messages/c-1',
    );
    expect(
      routeForPush({'link': '/groups/studio/requests'}),
      '/groups/studio/members',
    );
    expect(
      routeForPush({'link': '/jobs/j-1/applicants'}),
      FeatureLinks.job('j-1'),
    );
    expect(routeForPush({'link': '/pros/me'}), FeatureLinks.pros);
  });

  testWidgets('signed in, the token goes to the server, and again when it '
      'changes', (tester) async {
    final push = FakePushService(deviceToken: 'tok-1');
    final app = await TestApp.start(tester, push: push);
    expect(app.pushTokens, ['tok-1']);
    push.refresh('tok-2');
    await TestApp.settle(tester);
    expect(app.pushTokens, ['tok-1', 'tok-2']);
  });

  testWidgets('signed out, nothing is sent', (tester) async {
    final app = await TestApp.start(
      tester,
      signedIn: false,
      push: FakePushService(deviceToken: 'tok-1'),
    );
    expect(app.pushTokens, isEmpty);
  });

  testWidgets('a tapped message push opens its conversation', (tester) async {
    final push = FakePushService(deviceToken: 'tok-1');
    await TestApp.start(tester, push: push);
    push.tap({'kind': 'message', 'conversation_id': 'c-nour'});
    await TestApp.settle(tester);
    expect(key('msg-field'), findsOneWidget);
  });

  testWidgets('one arriving in the app shows, with Open', (tester) async {
    final push = FakePushService(deviceToken: 'tok-1');
    await TestApp.start(tester, push: push);
    push.deliver(
      const RemoteNotice(
        title: 'Nour El Hoda',
        body: 'Are you there?',
        data: {'kind': 'message', 'conversation_id': 'c-nour'},
      ),
    );
    await TestApp.settle(tester);
    expect(find.text('Nour El Hoda: Are you there?'), findsOneWidget);
    await tester.tap(find.text('Open'));
    await TestApp.settle(tester);
    expect(key('msg-field'), findsOneWidget);
  });

  testWidgets('Settings → Push notifications: each kind on or off', (
    tester,
  ) async {
    final app = await TestApp.start(tester);
    app.go('/settings');
    await TestApp.settle(tester);
    await tap(tester, 'settings-push');
    await tap(tester, 'push-post_like');
    expect(app.pushSettings.saved.single['post_like'], isFalse);
    expect(app.pushSettings.saved.single['message'], isTrue);
  });
}
