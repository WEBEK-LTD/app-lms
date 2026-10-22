import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/chat/data/chat_media.dart';
import 'package:yallapp/modules/chat/data/chat_providers.dart';

import '../support/fake_api.dart';
import '../support/fake_chat_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'events_test.dart' show usePhone;

/// 77 The chat in the app: the Chat tab with the business's conversation and
/// course groups, messages every few seconds, text, files and voice
/// messages, reporting, blocking and deleting.

FakeApi chatApp({Map<String, dynamic>? navigation}) =>
    FakeApi(config: {...configJson(), 'chat': chatConfigJson()})
      ..navigation = navigation;

Future<TestApp> pumpChat(
  WidgetTester tester, {
  FakeChatApi? chat,
  FakeApi? api,
  bool signedIn = true,
  bool guest = false,
  FakeChatPicker? picker,
  FakeVoiceRecorder? recorder,
  Map<String, Object> preferences = const {},
}) async {
  usePhone(tester);
  final app = TestApp(
    api: api ?? chatApp(),
    signedIn: signedIn,
    guest: guest,
    preferences: preferences,
    overrides: [
      chatApiProvider.overrideWithValue(
        signedIn ? (chat ?? FakeChatApi()) : null,
      ),
      chatPickerProvider.overrideWithValue(picker ?? FakeChatPicker()),
      voiceRecorderProvider.overrideWithValue(
        () => recorder ?? FakeVoiceRecorder(),
      ),
    ],
  );
  await app.pump(tester);
  return app;
}

Future<void> open(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
  await TestApp.settle(tester);
}

Finder navTab(String label) => find.descendant(
  of: find.bySemanticsLabel(RegExp('Main navigation')),
  matching: find.text(label),
);

void main() {
  testWidgets('the Chat tab sits before Account with the unread count and '
      'lists the business, then course groups', (tester) async {
    final chat = FakeChatApi();
    await pumpChat(tester, chat: chat);
    final labels = tester
        .widgetList<Text>(navTab('Chat'))
        .map((t) => t.data)
        .toList();
    expect(labels, ['Chat']);
    final chatX = tester.getCenter(navTab('Chat')).dx;
    expect(chatX, lessThan(tester.getCenter(navTab('Account')).dx));
    expect(chatX, greaterThan(tester.getCenter(navTab('My courses')).dx));
    expect(find.bySemanticsLabel('Chat, 1'), findsOneWidget);

    await tester.tap(navTab('Chat'));
    await TestApp.settle(tester);
    expect(find.text('Your Academy'), findsWidgets);
    expect(find.text('Welcome! Ask us anything.'), findsOneWidget);
    expect(find.text('Arabic for Beginners'), findsOneWidget);
    expect(find.text('Course group'), findsOneWidget);
    expect(
      find.text('Deniz Kaya: Has anyone finished lesson 3?'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('apps without chat have no Chat tab', (tester) async {
    usePhone(tester);
    await TestApp(signedIn: true).pump(tester);
    expect(navTab('Chat'), findsNothing);
  });

  testWidgets('guests see a sign-in prompt on the Chat tab', (tester) async {
    await pumpChat(tester, signedIn: false, guest: true);
    await tester.tap(navTab('Chat'));
    await TestApp.settle(tester);
    expect(find.text('Chat with Your Academy'), findsOneWidget);
    expect(find.text('Sign in'), findsWidgets);
  });

  testWidgets('a conversation is marked read, sends, and gets answers every '
      'few seconds', (tester) async {
    final chat = FakeChatApi();
    final app = await pumpChat(tester, chat: chat);
    await open(app, tester, Paths.chatConversation(businessConversation));
    expect(find.text('Welcome! Ask us anything.'), findsOneWidget);
    expect(chat.reads[businessConversation], '1');
    expect(app.container.read(chatUnreadProvider), 0);

    await tester.enterText(find.byType(TextField), 'Is the course online?');
    await TestApp.settle(tester, 2);
    await tester.tap(find.bySemanticsLabel('Send'));
    await TestApp.settle(tester);
    expect(find.text('Is the course online?'), findsOneWidget);
    expect(chat.sentClientIds, hasLength(1));
    expect(find.byType(TextField), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      isEmpty,
    );

    chat.arrive(businessConversation, 'Yes, every lesson is online.');
    await tester.pump(const Duration(seconds: 4));
    await TestApp.settle(tester);
    expect(find.text('Yes, every lesson is online.'), findsOneWidget);
    expect(chat.count('messages-after'), greaterThan(0));
    expect(
      chat.reads[businessConversation],
      chat.threads[businessConversation]!.last.id,
    );
  });

  testWidgets('a message that couldn\'t go is sent again with the same '
      'client_id', (tester) async {
    final chat = FakeChatApi()
      ..failures['send'] = const ApiException(
        code: ApiException.networkError,
        message: 'Offline',
      );
    final app = await pumpChat(tester, chat: chat);
    await open(app, tester, Paths.chatConversation(businessConversation));
    await tester.enterText(find.byType(TextField), 'Hello');
    await TestApp.settle(tester, 2);
    await tester.tap(find.bySemanticsLabel('Send'));
    await TestApp.settle(tester);
    expect(find.text('Not sent. Tap to try again.'), findsOneWidget);
    await tester.tap(find.text('Not sent. Tap to try again.'));
    await TestApp.settle(tester);
    expect(find.text('Not sent. Tap to try again.'), findsNothing);
    expect(chat.count('send'), 2);
    expect(chat.sentClientIds, hasLength(1));
    expect(find.text('Hello'), findsOneWidget);
  });

  testWidgets('in a group: names, reporting and blocking a member', (
    tester,
  ) async {
    final chat = FakeChatApi();
    final app = await pumpChat(tester, chat: chat);
    await open(app, tester, Paths.chatConversation(groupConversation));
    expect(find.text('Arabic for Beginners'), findsOneWidget);
    expect(find.text('Course group · 12 members'), findsOneWidget);
    expect(find.text('Deniz Kaya'), findsOneWidget);

    await tester.longPress(find.text('Has anyone finished lesson 3?'));
    await TestApp.settle(tester);
    await tester.tap(find.text('Report'));
    await TestApp.settle(tester);
    expect(find.text('Why are you reporting this message?'), findsOneWidget);
    await tester.tap(find.text('Abuse or harassment'));
    await TestApp.settle(tester);
    expect(chat.reports['2']?.name, 'abuse');
    expect(
      find.text('Thanks. Your Academy will look into it.'),
      findsOneWidget,
    );

    await tester.longPress(find.text('Has anyone finished lesson 3?'));
    await TestApp.settle(tester);
    await tester.tap(find.text('Block Deniz Kaya'));
    await TestApp.settle(tester);
    expect(find.text('Block Deniz Kaya?'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Block'));
    await TestApp.settle(tester);
    expect(chat.blocked, {otherMember});
    expect(find.text('Has anyone finished lesson 3?'), findsNothing);
  });

  testWidgets('the members list never offers to block the business', (
    tester,
  ) async {
    final chat = FakeChatApi();
    final app = await pumpChat(tester, chat: chat);
    await open(app, tester, Paths.chatConversation(groupConversation));
    await tester.tap(find.byTooltip('Members'));
    await TestApp.settle(tester);
    expect(find.text('Members'), findsWidgets);
    final business = find.ancestor(
      of: find.text('Your Academy').last,
      matching: find.byType(ListTile),
    );
    expect(
      find.descendant(of: business, matching: find.text('Block')),
      findsNothing,
    );
    final deniz = find.ancestor(
      of: find.text('Deniz Kaya').last,
      matching: find.byType(ListTile),
    );
    await tester.tap(find.descendant(of: deniz, matching: find.text('Block')));
    await TestApp.settle(tester);
    await tester.tap(find.widgetWithText(TextButton, 'Block').last);
    await TestApp.settle(tester);
    expect(chat.blocked, {otherMember});
  });

  testWidgets('one\'s own message can be deleted for everyone', (tester) async {
    final chat = FakeChatApi();
    final app = await pumpChat(tester, chat: chat);
    await open(app, tester, Paths.chatConversation(businessConversation));
    await tester.enterText(find.byType(TextField), 'Wrong chat, sorry');
    await TestApp.settle(tester, 2);
    await tester.tap(find.bySemanticsLabel('Send'));
    await TestApp.settle(tester);
    await tester.longPress(find.text('Wrong chat, sorry'));
    await TestApp.settle(tester);
    expect(find.text('Report'), findsNothing);
    await tester.tap(find.text('Delete message'));
    await TestApp.settle(tester);
    expect(find.text('Delete this message for everyone?'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Delete'));
    await TestApp.settle(tester);
    expect(chat.count('delete'), 1);
    expect(find.text('This message was deleted.'), findsOneWidget);
    expect(find.text('Wrong chat, sorry'), findsNothing);
  });

  testWidgets('someone the business blocked can read but not send', (
    tester,
  ) async {
    final app = await pumpChat(tester, chat: FakeChatApi(canSend: false));
    await open(app, tester, Paths.chatConversation(businessConversation));
    expect(find.text('Welcome! Ask us anything.'), findsOneWidget);
    expect(
      find.text("You can read this chat, but you can't send messages in it."),
      findsOneWidget,
    );
    expect(find.byType(TextField), findsNothing);
  });

  testWidgets('a voice message is recorded, sent in chunks and plays here', (
    tester,
  ) async {
    final chat = FakeChatApi();
    final recorder = FakeVoiceRecorder();
    final app = await pumpChat(tester, chat: chat, recorder: recorder);
    await open(app, tester, Paths.chatConversation(businessConversation));
    await tester.tap(find.bySemanticsLabel('Record a voice message'));
    await TestApp.settle(tester);
    expect(recorder.recording, isTrue);
    expect(find.textContaining('Recording 00:0'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Send voice message'));
    await TestApp.settle(tester);
    expect(chat.count('startUpload'), 1);
    expect(chat.chunks, [4, 4, 2]);
    expect(chat.count('completeUpload'), 1);
    expect(chat.count('send'), 1);
    expect(find.byTooltip('Play voice message'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    expect(recorder.disposed, isTrue);
  });

  testWidgets('without the microphone, the app says how to allow it', (
    tester,
  ) async {
    final app = await pumpChat(
      tester,
      recorder: FakeVoiceRecorder(allowed: false),
    );
    await open(app, tester, Paths.chatConversation(businessConversation));
    await tester.tap(find.bySemanticsLabel('Record a voice message'));
    await TestApp.settle(tester);
    expect(
      find.text(
        "Allow the microphone in your phone's settings to record voice "
        'messages.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('files: sent when the chat takes them, refused when not', (
    tester,
  ) async {
    final chat = FakeChatApi();
    final picker = FakeChatPicker()
      ..next = ChatPicked(
        MemoryChatFile('notes.pdf', 'application/pdf', List.filled(6, 1)),
      );
    final app = await pumpChat(tester, chat: chat, picker: picker);
    await open(app, tester, Paths.chatConversation(businessConversation));
    await tester.tap(find.byTooltip('Attach'));
    await TestApp.settle(tester);
    expect(find.text('Photo or video'), findsOneWidget);
    expect(find.text('Take a photo'), findsOneWidget);
    expect(find.text('Record a video'), findsOneWidget);
    await tester.tap(find.text('File'));
    await TestApp.settle(tester);
    expect(picker.asked, [ChatPickSource.file]);
    expect(chat.count('completeUpload'), 1);
    expect(chat.count('send'), 1);

    picker.next = const ChatPickUnsupported();
    await tester.tap(find.byTooltip('Attach'));
    await TestApp.settle(tester);
    await tester.tap(find.text('Photo or video'));
    await TestApp.settle(tester);
    expect(
      find.textContaining("This kind of file can't be sent."),
      findsOneWidget,
    );
    // The message goes away before the next file.
    ScaffoldMessenger.of(tester.element(find.byType(TextField)))
        .removeCurrentSnackBar();
    await TestApp.settle(tester);

    // A video over 200 MB never starts uploading.
    picker.next = ChatPicked(_BigFile());
    await tester.tap(find.byTooltip('Attach'));
    await TestApp.settle(tester);
    await tester.tap(find.text('Record a video'));
    await TestApp.settle(tester);
    expect(find.text('This file is too big to send.'), findsOneWidget);
    expect(chat.count('startUpload'), 1);
  });

  testWidgets('when the tabs are full, Chat is in Account with its count', (
    tester,
  ) async {
    final api = chatApp(
      navigation: navigationJson(
        tabs: [
          navTabJson('t1', 'Courses', 'menu_book', {
            'type': 'screen',
            'screen': 'courses',
          }),
          navTabJson('t2', 'Mine', 'play_circle', {
            'type': 'screen',
            'screen': 'my_courses',
          }),
          navTabJson('t3', 'Alerts', 'notifications', {
            'type': 'screen',
            'screen': 'notifications',
          }),
          navTabJson('t4', 'Prefs', 'tune', {
            'type': 'screen',
            'screen': 'settings',
          }),
          navTabJson('t5', 'Me', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      ),
    );
    final app = await pumpChat(tester, api: api);
    expect(navTab('Chat'), findsNothing);
    app.container.read(appRouterProvider).go(Paths.account);
    await TestApp.settle(tester);
    final row = find.byKey(const ValueKey('account-chat'));
    await tester.scrollUntilVisible(row, 200);
    expect(find.descendant(of: row, matching: find.text('1')), findsOneWidget);
    await tester.tap(row);
    await TestApp.settle(tester);
    expect(find.text('Arabic for Beginners'), findsOneWidget);
  });

  testWidgets('Arabic: the tab and the conversation read right to left', (
    tester,
  ) async {
    final app = await pumpChat(
      tester,
      api: FakeApi(
        config: {
          ...configJson(languages: languagesJson()),
          'chat': chatConfigJson(),
        },
      ),
      preferences: const {'settings.language': 'ar'},
    );
    expect(find.text('المحادثة'), findsOneWidget);
    await open(app, tester, Paths.chatConversation(businessConversation));
    final bubble = tester.getCenter(find.text('Welcome! Ask us anything.'));
    // Someone else's message starts on the right.
    expect(bubble.dx, greaterThan(390 / 2));
    expect(tester.takeException(), isNull);
  });
}

class _BigFile extends MemoryChatFile {
  _BigFile() : super('long.mp4', 'video/mp4', const []);

  @override
  int get size => 300 * 1024 * 1024;
}
