import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/routing/paths.dart';
import 'package:yallapp_community/features/messages/data/messages_api.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

// 232.4 Messages.
void main() {
  testWidgets('the header opens the inbox; a thread shows its messages and '
      'marks them read', (tester) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'header-messages');
    expect(key('conversation-c-nour'), findsOneWidget);
    expect(key('conversation-c-team'), findsOneWidget);
    expect(find.text('Studio makers'), findsOneWidget);

    await tap(tester, 'conversation-c-nour');
    expect(key('msg-x-1'), findsOneWidget);
    expect(key('msg-x-3'), findsOneWidget);
    expect(app.messages.calls, contains('read:c-nour'));
  });

  testWidgets('send text, photos and a reply', (tester) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'header-messages');
    await tap(tester, 'conversation-c-nour');

    await tester.enterText(key('msg-field'), '3:4');
    await tap(tester, 'msg-send');
    expect(find.text('3:4'), findsOneWidget);
    expect(app.messages.calls, contains('send:c-nour:0:'));

    await tester.longPress(key('msg-x-3'));
    await TestApp.settle(tester);
    await tap(tester, 'msg-reply');
    expect(find.text('Replying to Nour El Hoda'), findsOneWidget);
    await tap(tester, 'msg-photos');
    expect(key('msg-photo-1'), findsOneWidget);
    await tester.enterText(key('msg-field'), 'Like these');
    await tap(tester, 'msg-send');
    expect(app.messages.calls, contains('send:c-nour:2:x-3'));
  });

  testWidgets('delete my message; report, mute and leave', (tester) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'header-messages');
    await tap(tester, 'conversation-c-team');
    await tester.enterText(key('msg-field'), 'Yes');
    await tap(tester, 'msg-send');
    final mine = app.messages.calls.length;
    expect(mine, greaterThan(0));
    await tester.longPress(find.text('Yes'));
    await TestApp.settle(tester);
    await tap(tester, 'msg-delete');
    expect(find.text('Message deleted'), findsOneWidget);

    await tap(tester, 'msg-menu');
    await tap(tester, 'msg-mute');
    expect(app.messages.calls, contains('update:c-team::true'));

    await tap(tester, 'msg-menu');
    await tap(tester, 'msg-report');
    await tap(tester, 'report-spam');
    await tap(tester, 'report-send');
    expect(app.messages.calls, contains('report:c-team:spam'));

    await tap(tester, 'msg-menu');
    await tap(tester, 'msg-leave');
    expect(app.messages.calls, contains('leave:c-team'));
    expect(key('conversation-c-team'), findsNothing);
  });

  testWidgets('a poll brings new messages in', (tester) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'header-messages');
    await tap(tester, 'conversation-c-nour');
    app.messages.incoming(
      'c-nour',
      const Message(
        id: 'x-9',
        conversationId: 'c-nour',
        author: FakeMessagesApi.nour,
        body: 'Are you there?',
      ),
    );
    // Pull-free: the thread's poll asks with `after`; tests poll by hand.
    expect(
      (await app.messages.messages('c-nour', after: 'x-3')).items.single.id,
      'x-9',
    );
  });

  testWidgets('Message on a profile opens the one-to-one conversation', (
    tester,
  ) async {
    final app = await TestApp.start(tester);
    app.go(Paths.member('m-nour'));
    await TestApp.settle(tester);
    await tap(tester, 'profile-message');
    expect(app.messages.calls, contains('start:m-nour'));
    expect(key('msg-x-1'), findsOneWidget);
  });

  testWidgets('new message: pick two people and name the group', (
    tester,
  ) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'header-messages');
    await tap(tester, 'msg-new');
    await tap(tester, 'msg-pick-m-nour');
    await tap(tester, 'msg-pick-m-karim');
    await tester.enterText(key('msg-title'), 'Makers');
    await tap(tester, 'msg-start');
    expect(app.messages.calls, contains('start:m-nour,m-karim'));
    expect(key('msg-field'), findsOneWidget);
  });
}
