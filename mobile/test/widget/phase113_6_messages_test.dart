import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/chat/data/chat_media.dart';
import 'package:yallapp/modules/chat/data/chat_providers.dart';

import '../support/fake_api.dart';
import '../support/fake_chat_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase105_4_test.dart' show tapParent;

/// 113.6 Messages between a school's teachers and its families.

FakeApi messagesApi({
  List<String> roles = const ['parent'],
  Map<String, dynamic>? messages,
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'school': schoolConfigJson(),
      'chat': chatConfigJson(groups: false),
    },
  );
  api.me = {...userJson(), 'roles': roles};
  api.schoolMe = schoolMeJson(roles: roles);
  if (messages != null) api.schoolMessages = messages;
  return api;
}

ChatSchoolInfo schoolInfo({
  ChatSchoolNote? note,
  bool adminReads = false,
  bool attachments = false,
}) => ChatSchoolInfo(
  role: SchoolRole.teacher,
  students: const ['Omar Hassan'],
  classes: const ['Grade 5 A'],
  note: note,
  closed: note == ChatSchoolNote.closed,
  attachments: attachments,
  hours: const SchoolMessageHours(
    from: '08:00',
    to: '18:00',
    days: [1, 2, 3, 4, 7],
  ),
  opensAt: note == ChatSchoolNote.outsideHours
      ? DateTime.utc(2026, 10, 18, 5)
      : null,
  adminReads: adminReads,
);

Future<TestApp> pumpSchool(
  WidgetTester tester, {
  FakeApi? api,
  FakeChatApi? chat,
}) async {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
  final app = TestApp(
    api: api ?? messagesApi(),
    appType: AppType.school,
    signedIn: true,
    overrides: [
      chatApiProvider.overrideWithValue(
        chat ?? FakeChatApi(groups: false, school: schoolInfo()),
      ),
      chatPickerProvider.overrideWithValue(FakeChatPicker()),
    ],
  );
  await app.pump(tester);
  return app;
}

Future<void> push(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
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
  test('113.6 the messages and a school conversation read the contract', () {
    final parent = SchoolMessages.fromJson(schoolMessagesJson());
    expect(parent.enabled, isTrue);
    expect(parent.reach, SchoolMessagesWith.parentsStudents);
    expect(parent.teacherFirst, isTrue);
    expect(parent.hours?.days, [1, 2, 3, 4, 7]);
    expect(parent.contacts.map((c) => (c.name, c.role, c.canWrite)), [
      ('Mona Adel', SchoolRole.teacher, true),
      ('Karim Said', SchoolRole.teacher, false),
    ]);
    final teacher = SchoolMessages.fromJson(
      schoolMessagesJson(teacher: true, classMessages: true),
    );
    expect(teacher.classes.single.name, 'Grade 5 A');
    expect(teacher.contacts.map((c) => c.role), [
      SchoolRole.parent,
      SchoolRole.student,
    ]);
    final conversation = ChatConversation.fromJson({
      'id': schoolConversation,
      'kind': 'school',
      'title': 'Mona Adel',
      'image_url': null,
      'last_message': null,
      'unread_count': 0,
      'can_send': false,
      'updated_at': '2026-10-20T09:00:00Z',
      'school': {
        'role': 'teacher',
        'person_id': 5,
        'students': ['Omar Hassan'],
        'classes': ['Grade 5 A'],
        'note': 'outside_hours',
        'closed': false,
        'attachments': false,
        'hours': {
          'from': '08:00',
          'to': '18:00',
          'days': [1, 2],
        },
        'opens_at': '2026-10-18T05:00:00.000Z',
        'admin_reads': true,
      },
    });
    expect(conversation.isSchool, isTrue);
    expect(conversation.school?.note, ChatSchoolNote.outsideHours);
    expect(conversation.school?.adminReads, isTrue);
  });

  group('113.6 a parent', () {
    testWidgets('opens Messages from the Parent tab: the school, the '
        'privacy note, the hours and their children\'s teachers', (
      tester,
    ) async {
      final api = messagesApi();
      final app = await pumpSchool(tester, api: api);
      // 113.4 A parent's messages are in the Parent tab.
      await push(app, tester, Paths.parent);
      await tapParent(tester, 'school-messages-open');
      expect(find.text("The school's administration"), findsOneWidget);
      expect(
        find.text(
          'This conversation is private: the school reads it only if a '
          'message in it is reported.',
        ),
        findsOneWidget,
      );
      expect(
        find.textContaining('Messages can be sent on Mon, Tue, Wed, Thu, Sun'),
        findsOneWidget,
      );
      expect(find.text('Mona Adel'), findsOneWidget);
      expect(find.text('Mathematics · Omar Hassan'), findsOneWidget);
      expect(find.text('Class teacher · Laila Hassan'), findsOneWidget);

      // Karim hasn't written yet, and only teachers write first.
      await tapKey(tester, 'contact-teacher-6');
      expect(
        find.text('The teacher writes first; you can answer then.'),
        findsOneWidget,
      );
      expect(api.openedWith, isEmpty);

      // Mona's conversation opens in the chat, with the school's note.
      await tapKey(tester, 'contact-teacher-5');
      expect(find.text('Omar did well in mathematics today.'), findsOneWidget);
      expect(find.byKey(const ValueKey('chat-school-note')), findsOneWidget);
      expect(
        find.text('Omar Hassan · Grade 5 A'),
        findsOneWidget,
        reason: 'the children the teacher teaches',
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('starts a conversation when both sides may write first', (
      tester,
    ) async {
      final api = messagesApi(messages: schoolMessagesJson(startedBy: 'both'));
      final app = await pumpSchool(tester, api: api);
      await push(app, tester, Paths.schoolMessages);
      await tapKey(tester, 'contact-teacher-6');
      expect(api.openedWith, [6]);
      expect(find.text('Mona Adel'), findsWidgets);
    });

    testWidgets('sees that the school hasn\'t turned messages on', (
      tester,
    ) async {
      final app = await pumpSchool(
        tester,
        api: messagesApi(messages: schoolMessagesJson(enabled: false)),
      );
      await push(app, tester, Paths.schoolMessages);
      expect(
        find.text(
          "Your school hasn't turned on messages between teachers and families.",
        ),
        findsOneWidget,
      );
      // The school's administration is always there.
      expect(find.byKey(const ValueKey('school-office')), findsOneWidget);
    });
  });

  group('113.6 a school conversation', () {
    testWidgets('outside the hours says when one can write again', (
      tester,
    ) async {
      final chat = FakeChatApi(
        groups: false,
        school: schoolInfo(note: ChatSchoolNote.outsideHours),
      );
      final app = await pumpSchool(tester, chat: chat);
      await push(app, tester, Paths.chatConversation(schoolConversation));
      expect(find.byType(TextField), findsNothing);
      final note = tester.widget<Text>(
        find.byKey(const ValueKey('chat-cant-send')),
      );
      expect(note.data, contains('Messages can be sent on'));
      expect(note.data, contains('You can write again on'));
    });

    testWidgets('closed by the school, or waiting for the teacher', (
      tester,
    ) async {
      final chat = FakeChatApi(
        groups: false,
        school: schoolInfo(note: ChatSchoolNote.closed),
      );
      final app = await pumpSchool(tester, chat: chat);
      await push(app, tester, Paths.chatConversation(schoolConversation));
      expect(find.text('The school closed this conversation.'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
    });

    testWidgets('text only: no files and no voice messages; the privacy note '
        'when the school reads it; a message reported', (tester) async {
      final chat = FakeChatApi(
        groups: false,
        school: schoolInfo(adminReads: true),
      );
      final app = await pumpSchool(tester, chat: chat);
      await push(app, tester, Paths.chatConversation(schoolConversation));
      expect(find.byType(TextField), findsOneWidget);
      expect(find.byTooltip('Attach'), findsNothing);
      expect(find.bySemanticsLabel('Record a voice message'), findsNothing);
      expect(
        find.text("The school's administration can read this conversation."),
        findsOneWidget,
      );
      await tester.longPress(find.text('Omar did well in mathematics today.'));
      await TestApp.settle(tester);
      expect(find.textContaining('Block'), findsNothing);
      await tester.tap(find.text('Report'));
      await TestApp.settle(tester);
      await tester.tap(find.text('Abuse or harassment'));
      await TestApp.settle(tester);
      expect(chat.reports['3']?.name, 'abuse');
    });

    testWidgets('files allowed: the attach button is there', (tester) async {
      final chat = FakeChatApi(
        groups: false,
        school: schoolInfo(attachments: true),
      );
      final app = await pumpSchool(tester, chat: chat);
      await push(app, tester, Paths.chatConversation(schoolConversation));
      expect(find.byTooltip('Attach'), findsOneWidget);
    });
  });

  group('113.6 a teacher', () {
    testWidgets('opens Messages from the Classroom tab and writes to a whole '
        'class', (tester) async {
      final api = messagesApi(
        roles: ['teacher'],
        messages: schoolMessagesJson(teacher: true, classMessages: true),
      );
      final app = await pumpSchool(tester, api: api);
      await push(app, tester, Paths.classroom);
      await tapKey(tester, 'school-messages-open');
      expect(find.text('Parents and students'), findsWidgets);
      expect(find.text('Parent of Omar Hassan · Grade 5 A'), findsOneWidget);

      await tapKey(tester, 'school-write-class');
      expect(find.text('Write to Grade 5 A'), findsOneWidget);
      await tapKey(tester, 'class-message-send');
      expect(find.text('Write the message first.'), findsOneWidget);
      await tapKey(tester, 'class-message-to-families');
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('class-message-text')),
          matching: find.byType(TextField),
        ),
        'The trip is on Thursday.',
      );
      await tapKey(tester, 'class-message-send');
      final sent = api.classMessagesSent.single;
      expect(sent.classId, 3);
      expect(sent.to, ClassAudience.families);
      expect(sent.text, 'The trip is on Thursday.');
      expect(sent.clientId, startsWith('class-'));
      expect(
        find.text(
          "Sent to 2 people. 1 person hasn't signed in to the app yet.",
        ),
        findsOneWidget,
      );
    });

    testWidgets('writes to a parent of their class', (tester) async {
      final api = messagesApi(
        roles: ['teacher'],
        messages: schoolMessagesJson(teacher: true),
      );
      final app = await pumpSchool(tester, api: api);
      await push(app, tester, Paths.schoolMessages);
      expect(find.byKey(const ValueKey('school-write-class')), findsNothing);
      await tapKey(tester, 'contact-parent-21');
      expect(api.openedWith, [21]);
    });
  });
}
