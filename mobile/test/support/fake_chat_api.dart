import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/chat/data/chat_api.dart';
import 'package:yallapp/modules/chat/data/chat_media.dart';

/// 77 `Config.chat` for the fixtures' config.
Map<String, dynamic> chatConfigJson({
  String session = 'access_token',
  bool groups = true,
}) => {
  'base_url': 'https://yallapp.example/api/app/app-1',
  'session': session,
  'groups': groups,
};

const businessConversation = 'c0a8e0f2-0000-4000-8000-000000000001';
const groupConversation = 'c0a8e0f2-0000-4000-8000-000000000002';
const meMember = '0f9a0000-0000-4000-8000-0000000000aa';
const otherMember = '0f9a0000-0000-4000-8000-0000000000bb';

Map<String, dynamic> chatMessageJson({
  required int id,
  String conversation = businessConversation,
  String? text,
  String sender = 'business',
  String? memberId,
  String name = 'Your Academy',
  bool mine = false,
  Map<String, dynamic>? attachment,
  bool deleted = false,
  String? clientId,
  DateTime? at,
}) => {
  'id': '$id',
  'conversation_id': conversation,
  'client_id': clientId,
  'sender': {
    'kind': sender,
    'member_id': memberId,
    'name': name,
    'image_url': null,
  },
  'mine': mine,
  'text': deleted ? null : text,
  'attachment': deleted ? null : attachment,
  'deleted': deleted,
  'created_at': (at ?? DateTime.utc(2026, 10, 20, 9, id % 60))
      .toIso8601String(),
};

/// An in-memory chat: the business's conversation and one course group.
class FakeChatApi implements ChatApi {
  FakeChatApi({this.groups = true, this.canSend = true}) {
    threads[businessConversation] = [
      ChatMessage.fromJson(
        chatMessageJson(id: 1, text: 'Welcome! Ask us anything.'),
      ),
    ];
    threads[groupConversation] = [
      ChatMessage.fromJson(
        chatMessageJson(
          id: 2,
          conversation: groupConversation,
          sender: 'member',
          memberId: otherMember,
          name: 'Deniz Kaya',
          text: 'Has anyone finished lesson 3?',
        ),
      ),
    ];
  }

  final bool groups;
  bool canSend;
  int unreadCount = 1;
  int pollAfter = 5;
  int _next = 100;
  final calls = <String>[];
  final failures = <String, ApiException>{};
  final threads = <String, List<ChatMessage>>{};
  final reads = <String, String>{};
  final reports = <String, ChatReportReason>{};
  final blocked = <String>{};
  final chunks = <int>[];
  final sentClientIds = <String>[];

  Future<T> _answer<T>(String name, T Function() value) async {
    calls.add(name);
    final failure = failures.remove(name);
    if (failure != null) throw failure;
    return value();
  }

  int count(String name) => calls.where((c) => c == name).length;

  /// A message from someone else arrives.
  ChatMessage arrive(String conversation, String text, {String? member}) {
    final m = ChatMessage.fromJson(
      chatMessageJson(
        id: _next++,
        conversation: conversation,
        text: text,
        sender: member == null ? 'business' : 'member',
        memberId: member,
        name: member == null ? 'Your Academy' : 'Deniz Kaya',
      ),
    );
    threads[conversation]!.add(m);
    unreadCount++;
    return m;
  }

  ChatConversation _conversation(String id) {
    final list = threads[id]!.where(
      (m) => !blocked.contains(m.sender.memberId),
    );
    final group = id == groupConversation;
    return ChatConversation(
      id: id,
      kind: group ? ChatConversationKind.group : ChatConversationKind.direct,
      title: group ? 'Arabic for Beginners' : 'Your Academy',
      memberCount: group ? 12 : null,
      courseId: group ? '7' : null,
      lastMessage: list.lastOrNull,
      unreadCount: group ? 0 : unreadCount,
      canSend: canSend,
      updatedAt: DateTime.utc(2026, 10, 20),
    );
  }

  @override
  Future<ChatConversations> conversations() => _answer(
    'conversations',
    () => ChatConversations(
      items: [
        _conversation(businessConversation),
        if (groups) _conversation(groupConversation),
      ],
      unreadCount: unreadCount,
    ),
  );

  @override
  Future<int> unread() => _answer('unread', () => unreadCount);

  @override
  Future<ChatMessagesPage> messages(
    String conversationId, {
    String? after,
    String? before,
    int limit = 50,
  }) => _answer(after == null ? 'messages' : 'messages-after', () {
    final all = threads[conversationId]!
        .where((m) => !blocked.contains(m.sender.memberId))
        .toList();
    final List<ChatMessage> items;
    if (after != null) {
      items = all
          .where((m) => ChatMessage.compareIds(m.id, after) > 0)
          .toList();
    } else {
      final older = before == null
          ? all
          : all.where((m) => ChatMessage.compareIds(m.id, before) < 0).toList();
      items = older.reversed.take(limit).toList();
    }
    return ChatMessagesPage(
      items: items,
      hasMore: false,
      pollAfterSeconds: pollAfter,
    );
  });

  @override
  Future<ChatMessage> send(
    String conversationId, {
    required String clientId,
    String? text,
    String? uploadId,
  }) => _answer('send', () {
    if (!canSend) {
      throw const ApiException(
        code: ChatErrors.blocked,
        message: 'Blocked',
        statusCode: 403,
      );
    }
    sentClientIds.add(clientId);
    final m = ChatMessage.fromJson(
      chatMessageJson(
        id: _next++,
        conversation: conversationId,
        text: text,
        sender: 'member',
        memberId: meMember,
        name: 'Ayşe Demir',
        mine: true,
        clientId: clientId,
        attachment: uploadId == null
            ? null
            : {
                'kind': 'audio',
                'name': 'voice.m4a',
                'content_type': 'audio/mp4',
                'size_bytes': 12000,
                'duration_seconds': 4,
                'url': 'https://files.example/m/$uploadId/m4a',
                'url_expires_at': '2026-10-21T00:00:00Z',
              },
      ),
    );
    threads[conversationId]!.add(m);
    return m;
  });

  @override
  Future<void> read(String conversationId, String messageId) =>
      _answer('read', () {
        reads[conversationId] = messageId;
        unreadCount = 0;
      });

  @override
  Future<List<ChatMember>> members(String conversationId) => _answer(
    'members',
    () => [
      const ChatMember(
        id: 'app-1',
        name: 'Your Academy',
        business: true,
        blocked: false,
      ),
      const ChatMember(
        id: meMember,
        name: 'Ayşe Demir',
        business: false,
        blocked: false,
      ),
      ChatMember(
        id: otherMember,
        name: 'Deniz Kaya',
        business: false,
        blocked: blocked.contains(otherMember),
      ),
    ],
  );

  @override
  Future<void> deleteMessage(String messageId) => _answer('delete', () {
    for (final list in threads.values) {
      final at = list.indexWhere((m) => m.id == messageId);
      if (at >= 0) {
        final m = list[at];
        list[at] = ChatMessage(
          id: m.id,
          conversationId: m.conversationId,
          sender: m.sender,
          mine: m.mine,
          deleted: true,
          createdAt: m.createdAt,
        );
      }
    }
  });

  @override
  Future<void> report(String messageId, ChatReportReason reason) =>
      _answer('report', () => reports[messageId] = reason);

  @override
  Future<void> block(String memberId, {required bool blocked}) => _answer(
    blocked ? 'block' : 'unblock',
    () => blocked ? this.blocked.add(memberId) : this.blocked.remove(memberId),
  );

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => _answer(
    'startUpload',
    () => ChatUpload(
      id: '5e1f0000-0000-4000-8000-000000000001',
      kind: chatKindOf(type),
      uploadUrl: 'https://files.example/media/u?sig=1',
      chunkBytes: 4,
      size: size,
    ),
  );

  @override
  Future<ChatUpload> resumeUpload(String uploadId) => _answer(
    'resumeUpload',
    () => ChatUpload(
      id: uploadId,
      kind: ChatAttachmentKind.file,
      uploadUrl: 'https://files.example/media/u?sig=2',
      chunkBytes: 4,
      size: 0,
    ),
  );

  @override
  Future<void> completeUpload(String uploadId) =>
      _answer('completeUpload', () {});

  @override
  Future<int> uploadOffset(String uploadUrl) =>
      _answer('uploadOffset', () => chunks.fold(0, (a, b) => a + b));

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) =>
      _answer('sendChunk', () {
        chunks.add(bytes.length);
        return offset + bytes.length;
      });
}

/// A file made in memory.
class MemoryChatFile extends ChatFile {
  MemoryChatFile(this.name, this.type, this.bytes, {this.durationSeconds});

  @override
  final String name;
  @override
  final String type;
  final List<int> bytes;
  @override
  final int? durationSeconds;

  @override
  int get size => bytes.length;

  @override
  Future<List<int>> read(int start, int end) async => bytes.sublist(start, end);
}

class FakeChatPicker implements ChatPicker {
  ChatPick? next;
  final asked = <ChatPickSource>[];

  @override
  Future<ChatPick?> pick(ChatPickSource source) async {
    asked.add(source);
    return next;
  }
}

class FakeVoiceRecorder implements VoiceRecorder {
  FakeVoiceRecorder({this.allowed = true});

  bool allowed;
  bool recording = false;
  bool disposed = false;

  @override
  Future<bool> start() async => recording = allowed;

  @override
  Future<ChatFile?> stop() async {
    recording = false;
    return MemoryChatFile(
      'voice-1.m4a',
      'audio/mp4',
      List.filled(10, 1),
      durationSeconds: 4,
    );
  }

  @override
  Future<void> cancel() async => recording = false;

  @override
  void dispose() => disposed = true;
}
