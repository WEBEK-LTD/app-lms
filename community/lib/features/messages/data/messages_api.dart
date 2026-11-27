import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/community_api.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

// 232.4 Messages, on the contract's `/messages` (docs/api/community.yaml).

class ReplyRef {
  const ReplyRef({
    required this.id,
    required this.authorName,
    required this.excerpt,
  });

  factory ReplyRef.fromJson(Json json) => ReplyRef(
    id: str(json, 'id'),
    authorName: str(json, 'author_name'),
    excerpt: str(json, 'excerpt'),
  );

  final String id;
  final String authorName;
  final String excerpt;
}

class Message {
  const Message({
    required this.id,
    required this.conversationId,
    required this.author,
    required this.body,
    this.photos = const [],
    this.replyTo,
    this.deleted = false,
    this.createdAt,
  });

  factory Message.fromJson(Json json) => Message(
    id: str(json, 'id'),
    conversationId: str(json, 'conversation_id'),
    author: MemberSummary.fromJson(optObject(json, 'author') ?? const {}),
    body: str(json, 'body'),
    photos: strings(json, 'photos'),
    replyTo: optObject(json, 'reply_to') == null
        ? null
        : ReplyRef.fromJson(optObject(json, 'reply_to')!),
    deleted: boolean(json, 'deleted'),
    createdAt: optDate(json, 'created_at'),
  );

  final String id;
  final String conversationId;
  final MemberSummary author;
  final String body;
  final List<String> photos;
  final ReplyRef? replyTo;
  final bool deleted;
  final DateTime? createdAt;
}

enum ConversationKind { direct, group, hire }

class Conversation {
  const Conversation({
    required this.id,
    required this.kind,
    required this.members,
    this.title,
    this.lastMessage,
    this.unread = 0,
    this.muted = false,
    this.blocked = false,
    this.readBy = const {},
    this.updatedAt,
  });

  factory Conversation.fromJson(Json json) => Conversation(
    id: str(json, 'id'),
    kind: switch (str(json, 'kind')) {
      'group' => ConversationKind.group,
      'hire' => ConversationKind.hire,
      _ => ConversationKind.direct,
    },
    title: optStr(json, 'title'),
    members: listOf(json, 'members', MemberSummary.fromJson),
    lastMessage: optObject(json, 'last_message') == null
        ? null
        : Message.fromJson(optObject(json, 'last_message')!),
    unread: integer(json, 'unread'),
    muted: boolean(json, 'muted'),
    blocked: boolean(json, 'blocked'),
    readBy: {
      for (final e in (optObject(json, 'read_by') ?? const {}).entries)
        if (e.value is String) e.key: e.value as String,
    },
    updatedAt: optDate(json, 'updated_at'),
  );

  final String id;
  final ConversationKind kind;
  final String? title;
  final List<MemberSummary> members;
  final Message? lastMessage;
  final int unread;
  final bool muted;

  /// A one-to-one conversation with a block either side: read-only.
  final bool blocked;

  /// Member id → the last message id they read.
  final Map<String, String> readBy;
  final DateTime? updatedAt;

  bool get isGroup => kind == ConversationKind.group;

  /// Everyone but [me].
  List<MemberSummary> others(String? me) => [
    for (final m in members)
      if (m.id != me) m,
  ];

  /// Its own title, or the others' names.
  String name(String? me) {
    if (title != null && title!.isNotEmpty) return title!;
    final o = others(me);
    return o.isEmpty ? '' : o.map((m) => m.name).join(', ');
  }

  static const maxPeople = 10;
}

abstract class MessagesApi {
  Future<Page<Conversation>> conversations({String? cursor});
  Future<int> unread();
  Future<Conversation> conversation(String id);

  /// One other member: their one-to-one (existing or new); 2–9: a group.
  Future<Conversation> start(List<String> memberIds, {String? title});
  Future<Conversation> update(String id, {String? title, bool? muted});
  Future<Conversation> addMembers(String id, List<String> memberIds);
  Future<void> leave(String id);

  /// Newest first; with [after], only the newer ones, oldest first.
  Future<Page<Message>> messages(String id, {String? cursor, String? after});
  Future<Message> send(
    String id,
    String body, {
    List<String> photos = const [],
    String? replyToId,
  });
  Future<void> deleteMessage(String id, String messageId);
  Future<void> read(String id, {String? messageId});
  Future<void> report(String id, ReportReason reason, {String note = ''});
}

class HttpMessagesApi implements MessagesApi {
  HttpMessagesApi(this.client);

  final ApiClient client;

  static String _c(String id) =>
      '/messages/conversations/${Uri.encodeComponent(id)}';

  @override
  Future<Page<Conversation>> conversations({String? cursor}) async {
    final j = await client.get(
      '/messages/conversations',
      query: {'cursor': cursor},
    );
    return Page(
      listOf(j, 'items', Conversation.fromJson),
      optStr(j, 'next_cursor'),
    );
  }

  @override
  Future<int> unread() async =>
      integer(await client.get('/messages/unread'), 'conversations');

  @override
  Future<Conversation> conversation(String id) async =>
      Conversation.fromJson(await client.get(_c(id)));

  @override
  Future<Conversation> start(List<String> memberIds, {String? title}) async =>
      Conversation.fromJson(
        await client.post(
          '/messages/conversations',
          body: {'member_ids': memberIds, 'title': ?title},
        ),
      );

  @override
  Future<Conversation> update(String id, {String? title, bool? muted}) async =>
      Conversation.fromJson(
        await client.patch(_c(id), body: {'title': ?title, 'muted': ?muted}),
      );

  @override
  Future<Conversation> addMembers(String id, List<String> memberIds) async =>
      Conversation.fromJson(
        await client.post('${_c(id)}/members', body: {'member_ids': memberIds}),
      );

  @override
  Future<void> leave(String id) => client.delete('${_c(id)}/members/me');

  @override
  Future<Page<Message>> messages(
    String id, {
    String? cursor,
    String? after,
  }) async {
    final j = await client.get(
      '${_c(id)}/messages',
      query: {'cursor': cursor, 'after': after},
    );
    return Page(listOf(j, 'items', Message.fromJson), optStr(j, 'next_cursor'));
  }

  @override
  Future<Message> send(
    String id,
    String body, {
    List<String> photos = const [],
    String? replyToId,
  }) async => Message.fromJson(
    photos.isEmpty
        ? await client.post(
            '${_c(id)}/messages',
            body: {'body': body, 'reply_to_id': ?replyToId},
          )
        : await client.multipart(
            '${_c(id)}/messages',
            fields: {'body': body, 'reply_to_id': replyToId},
            files: [for (final p in photos) ('photos', p)],
          ),
  );

  @override
  Future<void> deleteMessage(String id, String messageId) =>
      client.delete('${_c(id)}/messages/${Uri.encodeComponent(messageId)}');

  @override
  Future<void> read(String id, {String? messageId}) async =>
      client.post('${_c(id)}/read', body: {'message_id': ?messageId});

  @override
  Future<void> report(
    String id,
    ReportReason reason, {
    String note = '',
  }) async => client.post(
    '${_c(id)}/report',
    body: {'reason': reason.wire, if (note.isNotEmpty) 'note': note},
  );
}

final messagesApiProvider = Provider<MessagesApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeMessagesApi()
      : HttpMessagesApi(ref.watch(apiClientProvider)),
);

/// In memory, for tests and the demo.
class FakeMessagesApi implements MessagesApi {
  FakeMessagesApi({DateTime? now}) : _now = now ?? DateTime.now();

  final DateTime _now;
  final calls = <String>[];
  var _n = 0;

  static const me = MemberSummary(
    id: 'm-mohamed',
    name: 'Mohamed Ali',
    username: 'mohamed',
  );
  static const nour = MemberSummary(
    id: 'm-nour',
    name: 'Nour El Hoda',
    username: 'nour',
    badge: BadgeKind.blue,
  );
  static const karim = MemberSummary(
    id: 'm-karim',
    name: 'Karim Samy',
    username: 'karim',
  );

  late final Map<String, List<Message>> _messages = {
    'c-nour': [
      Message(
        id: 'x-1',
        conversationId: 'c-nour',
        author: nour,
        body: 'Hi! Loved your Runway store.',
        createdAt: _now.subtract(const Duration(minutes: 40)),
      ),
      Message(
        id: 'x-2',
        conversationId: 'c-nour',
        author: me,
        body: 'Thank you! It took a weekend.',
        createdAt: _now.subtract(const Duration(minutes: 35)),
      ),
      Message(
        id: 'x-3',
        conversationId: 'c-nour',
        author: nour,
        body: 'Which photo ratio did you use?',
        createdAt: _now.subtract(const Duration(minutes: 5)),
      ),
    ],
    'c-team': [
      Message(
        id: 'x-4',
        conversationId: 'c-team',
        author: karim,
        body: 'Shall we meet on Thursday?',
        createdAt: _now.subtract(const Duration(hours: 3)),
      ),
    ],
  };

  late final List<Conversation> _conversations = [
    Conversation(
      id: 'c-nour',
      kind: ConversationKind.direct,
      members: const [me, nour],
      unread: 1,
      readBy: const {'m-nour': 'x-2', 'm-mohamed': 'x-2'},
    ),
    Conversation(
      id: 'c-team',
      kind: ConversationKind.group,
      title: 'Studio makers',
      members: const [me, nour, karim],
      readBy: const {'m-mohamed': 'x-4'},
    ),
  ];

  /// What a poll brings next (a test's incoming message).
  void incoming(String id, Message m) => _messages[id]!.add(m);

  Conversation _with(
    Conversation c, {
    String? title,
    bool? muted,
    int? unread,
    List<MemberSummary>? members,
  }) => Conversation(
    id: c.id,
    kind: c.kind,
    title: title ?? c.title,
    members: members ?? c.members,
    lastMessage: _messages[c.id]?.lastOrNull,
    unread: unread ?? c.unread,
    muted: muted ?? c.muted,
    blocked: c.blocked,
    readBy: c.readBy,
    updatedAt: _messages[c.id]?.lastOrNull?.createdAt,
  );

  Conversation _find(String id) => _conversations.firstWhere((c) => c.id == id);

  void _put(Conversation c) =>
      _conversations[_conversations.indexWhere((x) => x.id == c.id)] = c;

  @override
  Future<Page<Conversation>> conversations({String? cursor}) async =>
      Page([for (final c in _conversations) _with(c)]);

  @override
  Future<int> unread() async =>
      _conversations.where((c) => c.unread > 0).length;

  @override
  Future<Conversation> conversation(String id) async => _with(_find(id));

  @override
  Future<Conversation> start(List<String> memberIds, {String? title}) async {
    calls.add('start:${memberIds.join(',')}');
    if (memberIds.length == 1) {
      for (final c in _conversations) {
        if (!c.isGroup && c.others(me.id).single.id == memberIds.single) {
          return _with(c);
        }
      }
    }
    final c = Conversation(
      id: 'c-new-${_n++}',
      kind: memberIds.length == 1
          ? ConversationKind.direct
          : ConversationKind.group,
      title: title,
      members: [
        me,
        for (final id in memberIds)
          MemberSummary(id: id, name: id, username: id),
      ],
    );
    _conversations.insert(0, c);
    _messages[c.id] = [];
    return c;
  }

  @override
  Future<Conversation> update(String id, {String? title, bool? muted}) async {
    calls.add('update:$id:${title ?? ''}:${muted ?? ''}');
    final c = _with(_find(id), title: title, muted: muted);
    _put(c);
    return c;
  }

  @override
  Future<Conversation> addMembers(String id, List<String> memberIds) async {
    calls.add('add:$id:${memberIds.join(',')}');
    return _with(_find(id));
  }

  @override
  Future<void> leave(String id) async {
    calls.add('leave:$id');
    _conversations.removeWhere((c) => c.id == id);
  }

  @override
  Future<Page<Message>> messages(
    String id, {
    String? cursor,
    String? after,
  }) async {
    final all = _messages[id] ?? const <Message>[];
    if (after != null) {
      final i = all.indexWhere((m) => m.id == after);
      return Page(all.sublist(i + 1));
    }
    return Page(all.reversed.toList());
  }

  @override
  Future<Message> send(
    String id,
    String body, {
    List<String> photos = const [],
    String? replyToId,
  }) async {
    calls.add('send:$id:${photos.length}:${replyToId ?? ''}');
    final list = _messages[id]!;
    final to = replyToId == null
        ? null
        : list.firstWhere((m) => m.id == replyToId);
    final m = Message(
      id: 'x-new-${_n++}',
      conversationId: id,
      author: me,
      body: body,
      photos: photos,
      replyTo: to == null
          ? null
          : ReplyRef(id: to.id, authorName: to.author.name, excerpt: to.body),
      createdAt: DateTime.now(),
    );
    list.add(m);
    return m;
  }

  @override
  Future<void> deleteMessage(String id, String messageId) async {
    calls.add('delete:$messageId');
    final list = _messages[id]!;
    final i = list.indexWhere((m) => m.id == messageId);
    final m = list[i];
    list[i] = Message(
      id: m.id,
      conversationId: id,
      author: m.author,
      body: '',
      deleted: true,
      createdAt: m.createdAt,
    );
  }

  @override
  Future<void> read(String id, {String? messageId}) async {
    calls.add('read:$id');
    _put(_with(_find(id), unread: 0));
  }

  @override
  Future<void> report(
    String id,
    ReportReason reason, {
    String note = '',
  }) async => calls.add('report:$id:${reason.wire}');
}
