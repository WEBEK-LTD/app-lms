import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/services/push.dart';
import 'package:yallapp_business/features/chat/chat_conversation_screen.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 77 The app's chat in Yallapp Business: the Chat tab, a conversation and
/// replies (with a Media file), deleting, stopping a person, keeping,
/// reports, the switches, pushes, and who sees it.

Finder tab(String label) => find.widgetWithText(NavigationDestination, label);

/// The academy with chat, as an app whose plan has it.
FakeOwnerApi academyWithChat() {
  final api = FakeOwnerApi();
  final i = api.apps.indexWhere((a) => a.id == FakeOwnerApi.academyId);
  final a = api.apps[i];
  api.apps[i] = AppSummary(
    id: a.id,
    name: a.name,
    type: a.type,
    typeName: a.typeName,
    backend: a.backend,
    state: a.state,
    plan: a.plan,
    features: const AppFeatures(
      orders: true,
      courses: true,
      questions: true,
      reviews: true,
      chat: true,
      appUsers: true,
      notifications: true,
      media: true,
      analytics: true,
      preview: true,
      builds: true,
    ),
  );
  return api;
}

void main() {
  testWidgets('the Chat tab lists who wrote, unread first in bold', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    expect(tab('Chat'), findsOneWidget);
    expect(tab('Stats'), findsOneWidget);
    await tapOn(tester, tab('Chat'));
    expect(find.text('Ayşe Yılmaz'), findsOneWidget);
    expect(find.text('Mehmet Kaya'), findsOneWidget);
    expect(find.text('Please, under Ayşe.'), findsOneWidget);
    expect(
      find.descendant(of: find.byType(Badge), matching: find.text('1')),
      findsOneWidget,
    );
    await tester.enterText(find.byType(TextField), 'mehmet');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await settle(tester);
    expect(find.text('Ayşe Yılmaz'), findsNothing);
    expect(find.text('Mehmet Kaya'), findsOneWidget);
  });

  testWidgets('an academy with chat: Stats moves to More, groups filter', (
    tester,
  ) async {
    final app = TestApp(api: academyWithChat(), appId: FakeOwnerApi.academyId);
    await app.pump(tester);
    expect(tab('Chat'), findsOneWidget);
    expect(tab('Inbox'), findsOneWidget);
    expect(tab('Stats'), findsNothing);
    expect(find.byType(NavigationDestination), findsNWidgets(5));
    await go(tester, app, '/more');
    expect(find.text('Stats'), findsOneWidget);
    await go(tester, app, '/chat');
    expect(find.text('Course groups'), findsOneWidget);
  });

  testWidgets('a conversation is read, answered as the business, and new '
      'messages come by themselves', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await go(tester, app, '/chat');
    await tapOn(tester, find.text('Ayşe Yılmaz'));
    expect(find.text('Do you have a table for six tonight?'), findsOneWidget);
    expect(find.textContaining('Sent by Owner'), findsOneWidget);
    expect(app.api.calls, contains('readChat'));

    await tester.enterText(find.byType(TextField), 'See you at 8!');
    await tapOn(tester, find.byTooltip('Send'));
    expect(find.text('See you at 8!'), findsOneWidget);
    expect(app.api.calls.where((c) => c == 'sendChatMessage'), hasLength(1));

    app.api.chatArrives(FakeOwnerApi.chatAyse, 'Thank you!');
    await tester.pump(const Duration(seconds: 4));
    await settle(tester);
    expect(find.text('Thank you!'), findsOneWidget);
    expect(app.api.calls, contains('chatMessages:after'));
  });

  testWidgets('a reply with a file from Media', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/chat/${FakeOwnerApi.chatMehmet}');
    await tapOn(tester, find.byTooltip('Attach from Media'));
    expect(find.text('Choose a file'), findsOneWidget);
    await tapOn(tester, find.text('menu-cover.jpg'));
    expect(find.byTooltip('Remove file'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Here is our menu.');
    await tapOn(tester, find.byTooltip('Send'));
    final sent = app.api.chatMessagesOf[FakeOwnerApi.chatMehmet]!.last;
    expect(sent.attachment?.name, 'menu-cover.jpg');
    expect(sent.text, 'Here is our menu.');
    expect(find.text('menu-cover.jpg'), findsOneWidget);
  });

  testWidgets('a message that couldn\'t go is sent again with its client_id', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/chat/${FakeOwnerApi.chatMehmet}');
    app.api.failOn['sendChatMessage'] = const ApiException(
      code: ApiException.network,
    );
    await tester.enterText(find.byType(TextField), 'Yes, it is vegan.');
    await tapOn(tester, find.byTooltip('Send'));
    expect(find.text('Not sent. Tap to try again.'), findsOneWidget);
    await tapOn(tester, find.text('Not sent. Tap to try again.'));
    expect(find.text('Not sent. Tap to try again.'), findsNothing);
    final sent = app.api.chatMessagesOf[FakeOwnerApi.chatMehmet]!.where(
      (m) => m.fromBusiness,
    );
    expect(sent, hasLength(1));
    expect(sent.single.clientId, startsWith('yb-'));
  });

  testWidgets('deleting a message, stopping a person, keeping, clearing', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/chat/${FakeOwnerApi.chatAyse}');
    await tester.longPress(find.text('Please, under Ayşe.'));
    await settle(tester);
    await tapOn(tester, find.text('Delete message'));
    expect(
      find.text("It's deleted for everyone, with its file."),
      findsOneWidget,
    );
    await tapOn(tester, find.widgetWithText(FilledButton, 'Delete'));
    expect(find.text('Message deleted'), findsOneWidget);
    expect(find.text('Please, under Ayşe.'), findsNothing);

    await tapOn(tester, find.byTooltip('More'));
    await tapOn(tester, find.text('Stop from sending'));
    expect(find.textContaining("can't send messages until"), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Stop from sending'));
    expect(app.api.chatBlocked, contains(FakeOwnerApi.ayseMember));
    expect(find.textContaining("Can't send"), findsOneWidget);

    await tapOn(tester, find.byTooltip('More'));
    await tapOn(tester, find.text('Keep another year'));
    expect(find.textContaining('Kept until'), findsWidgets);

    await tapOn(tester, find.byTooltip('More'));
    await tapOn(tester, find.text('Delete all messages'));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Delete'));
    expect(app.api.chatMessagesOf[FakeOwnerApi.chatAyse], isEmpty);
    expect(find.text('No messages yet'), findsOneWidget);
  });

  testWidgets('reports: waiting on the list, delete and stop the sender', (
    tester,
  ) async {
    final app = TestApp();
    final message = app.api.chatMessagesOf[FakeOwnerApi.chatAyse]!.first;
    app.api.chatReported(
      FakeOwnerApi.restaurantId,
      FakeOwnerApi.chatAyse,
      message.id,
    );
    await app.pump(tester);
    await go(tester, app, '/chat');
    expect(find.text('1 report waiting'), findsOneWidget);
    await tapOn(tester, find.text('Open'));
    expect(find.text('Do you have a table for six tonight?'), findsOneWidget);
    expect(
      find.textContaining('Reported by Mehmet Kaya · Abuse or harassment'),
      findsOneWidget,
    );
    await tapOn(tester, find.text('Delete and stop the sender'));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Delete'));
    expect(app.api.calls, contains('resolveChatReport:block_sender'));
    expect(app.api.chatBlocked, contains(FakeOwnerApi.ayseMember));
    expect(find.text('No reports'), findsOneWidget);
    await tapOn(tester, find.text('Dealt with'));
    expect(find.text('Deleted, sender stopped'), findsOneWidget);
  });

  testWidgets('the switches: owners change them', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await go(tester, app, '/chat');
    await tapOn(tester, find.byTooltip('Chat settings'));
    expect(find.text('Chat in the app'), findsOneWidget);
    expect(find.text('Course groups'), findsNothing);
    await tapOn(tester, find.widgetWithText(SwitchListTile, 'Chat in the app'));
    expect(app.api.calls, contains('updateChatSettings'));
    expect(app.api.chatSettingsOf[FakeOwnerApi.restaurantId]?.enabled, isFalse);
  });

  testWidgets('staff without the Chat area have no Chat tab', (tester) async {
    final api = FakeOwnerApi()..joinAs(TeamRole.staff, areas: ['orders']);
    final app = TestApp(api: api);
    await app.pump(tester);
    expect(tab('Chat'), findsNothing);
  });

  testWidgets('Arabic: the tab and the reply box', (tester) async {
    final app = TestApp(language: 'ar');
    await app.pump(tester);
    expect(tab('المحادثات'), findsOneWidget);
    await push(tester, app, '/chat/${FakeOwnerApi.chatMehmet}');
    expect(find.text('ردّ باسم Bab Al Sham'), findsOneWidget);
  });

  test('a chat push opens its conversation', () {
    final target = pushTarget({
      'type': 'owner',
      'kind': 'new_chat_message',
      'app_id': FakeOwnerApi.restaurantId,
      'conversation_id': FakeOwnerApi.chatAyse,
    });
    expect(target.location, '/chat/${FakeOwnerApi.chatAyse}');
    expect(pushTarget({'kind': 'new_chat_message'}).location, '/chat');
    expect(PushKind.parse('new_chat_message'), PushKind.newChatMessage);
  });

  test('client IDs are new each time and the contract\'s length', () {
    final a = newChatClientId();
    final b = newChatClientId();
    expect(a, isNot(b));
    expect(a.length, inInclusiveRange(8, 64));
  });
}
