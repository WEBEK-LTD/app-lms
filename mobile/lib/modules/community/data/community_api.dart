import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/json.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/providers.dart';

/// 235 A member as the community shows them.
class CommunityMember {
  const CommunityMember({
    required this.id,
    required this.name,
    required this.username,
    this.avatarUrl,
    this.headline,
  });

  factory CommunityMember.fromJson(Json json) => CommunityMember(
    id: optString(json, 'id') ?? '',
    name: optString(json, 'display_name') ?? optString(json, 'name') ?? '',
    username: optString(json, 'username') ?? '',
    avatarUrl: optString(json, 'avatar_url'),
    headline: optString(json, 'headline'),
  );

  final String id;
  final String name;
  final String username;
  final String? avatarUrl;
  final String? headline;
}

enum FeedKind { post, question }

/// One entry of the feed: a post or a question.
class FeedEntry {
  const FeedEntry({
    required this.kind,
    required this.id,
    required this.author,
    required this.text,
    this.title,
    this.count = 0,
    this.createdAt,
  });

  factory FeedEntry.fromJson(Json json) {
    final kind = optString(json, 'kind') == 'question'
        ? FeedKind.question
        : FeedKind.post;
    return FeedEntry(
      kind: kind,
      id: optString(json, 'id') ?? '',
      author: CommunityMember.fromJson(
        optObject(json, 'author', (j) => j) ?? const {},
      ),
      title: optString(json, 'title'),
      text: optString(json, 'body') ?? optString(json, 'excerpt') ?? '',
      count: kind == FeedKind.question
          ? intOr(json, 'answer_count', 0)
          : intOr(json, 'comment_count', 0),
      createdAt: optDate(json, 'created_at'),
    );
  }

  final FeedKind kind;
  final String id;
  final CommunityMember author;
  final String? title;
  final String text;

  /// A question's answers, a post's comments.
  final int count;
  final DateTime? createdAt;
}

class CommunityAnswer {
  const CommunityAnswer({
    required this.id,
    required this.author,
    required this.body,
    this.accepted = false,
  });

  factory CommunityAnswer.fromJson(Json json) => CommunityAnswer(
    id: optString(json, 'id') ?? '',
    author: CommunityMember.fromJson(
      optObject(json, 'author', (j) => j) ?? const {},
    ),
    body: optString(json, 'body') ?? '',
    accepted: boolOr(json, 'accepted', false),
  );

  final String id;
  final CommunityMember author;
  final String body;
  final bool accepted;
}

class CommunityQuestion {
  const CommunityQuestion({
    required this.id,
    required this.title,
    required this.author,
    this.body = '',
    this.answerCount = 0,
    this.answers = const [],
  });

  factory CommunityQuestion.fromJson(Json json) => CommunityQuestion(
    id: optString(json, 'id') ?? '',
    title: optString(json, 'title') ?? '',
    author: CommunityMember.fromJson(
      optObject(json, 'author', (j) => j) ?? const {},
    ),
    body: optString(json, 'body') ?? optString(json, 'excerpt') ?? '',
    answerCount: intOr(json, 'answer_count', 0),
    answers: listOf(json, 'answers', CommunityAnswer.fromJson),
  );

  final String id;
  final String title;
  final CommunityMember author;
  final String body;
  final int answerCount;
  final List<CommunityAnswer> answers;
}

class CommunityGroup {
  const CommunityGroup({
    required this.id,
    required this.name,
    this.description = '',
    this.memberCount = 0,
    this.private = false,
    this.joined = false,
  });

  factory CommunityGroup.fromJson(Json json) => CommunityGroup(
    id: optString(json, 'id') ?? '',
    name: optString(json, 'name') ?? '',
    description: optString(json, 'description') ?? '',
    memberCount: intOr(json, 'member_count', 0),
    private: optString(json, 'visibility') == 'private',
    joined: boolOr(json, 'joined', false) || boolOr(json, 'is_member', false),
  );

  final String id;
  final String name;
  final String description;
  final int memberCount;
  final bool private;
  final bool joined;
}

class CommunityConversation {
  const CommunityConversation({
    required this.id,
    required this.title,
    this.lastMessage = '',
    this.unread = false,
  });

  factory CommunityConversation.fromJson(Json json) {
    final members = listOf(json, 'members', CommunityMember.fromJson);
    return CommunityConversation(
      id: optString(json, 'id') ?? '',
      title:
          optString(json, 'title') ??
          members.map((m) => m.name).where((n) => n.isNotEmpty).join(', '),
      lastMessage:
          optObject(json, 'last_message', (j) => optString(j, 'body') ?? '') ??
          '',
      unread:
          intOr(json, 'unread_count', 0) > 0 || boolOr(json, 'unread', false),
    );
  }

  final String id;
  final String title;
  final String lastMessage;
  final bool unread;
}

class CommunityMessage {
  const CommunityMessage({
    required this.id,
    required this.body,
    required this.mine,
    this.author,
  });

  factory CommunityMessage.fromJson(Json json) => CommunityMessage(
    id: optString(json, 'id') ?? '',
    body: optString(json, 'body') ?? '',
    mine: boolOr(json, 'mine', false),
    author: optObject(json, 'author', CommunityMember.fromJson),
  );

  final String id;
  final String body;
  final bool mine;
  final CommunityMember? author;
}

/// 235 The community endpoints of the hosted API (`/community/...`): the
/// community engine's own paths, with this app as the tenant. Everything
/// goes through [YallappApi.community], so sign-in, refresh and errors are
/// the app's usual ones; the members are the app's customers.
class CommunityApi {
  const CommunityApi(this.api);

  final YallappApi api;

  Future<Json> _get(
    String path, {
    Map<String, dynamic>? query,
    bool me = false,
  }) async =>
      asJson(await api.community('GET', path, query: query, signedIn: me));

  Future<Json> _send(String method, String path, {Object? body}) async =>
      asJson(
        await api.community(method, path, body: body, signedIn: true) ??
            const <String, dynamic>{},
      );

  Future<List<FeedEntry>> feed() async =>
      listOf(await _get('/community/feed'), 'items', FeedEntry.fromJson);

  Future<List<CommunityQuestion>> questions() async => listOf(
    await _get('/community/qa/questions'),
    'items',
    CommunityQuestion.fromJson,
  );

  Future<CommunityQuestion> question(String id) async =>
      CommunityQuestion.fromJson(
        await _get('/community/qa/questions/${Uri.encodeComponent(id)}'),
      );

  Future<void> answer(String questionId, String body) => _send(
    'POST',
    '/community/qa/questions/${Uri.encodeComponent(questionId)}/answers',
    body: {'body': body},
  );

  Future<List<CommunityGroup>> groups() async =>
      listOf(await _get('/community/groups'), 'items', CommunityGroup.fromJson);

  Future<void> join(String groupId) =>
      _send('POST', '/community/groups/${Uri.encodeComponent(groupId)}/join');

  Future<CommunityMember> me() async =>
      CommunityMember.fromJson(await _get('/community/me', me: true));

  Future<List<CommunityConversation>> conversations() async => listOf(
    await _get('/community/conversations', me: true),
    'items',
    CommunityConversation.fromJson,
  );

  Future<List<CommunityMessage>> messages(
    String conversationId,
  ) async => listOf(
    await _get(
      '/community/conversations/${Uri.encodeComponent(conversationId)}/messages',
      me: true,
    ),
    'items',
    CommunityMessage.fromJson,
  );

  Future<void> send(String conversationId, String body) => _send(
    'POST',
    '/community/conversations/${Uri.encodeComponent(conversationId)}/messages',
    body: {'body': body},
  );
}

final communityApiProvider = Provider<CommunityApi>(
  (ref) => CommunityApi(ref.watch(yallappApiProvider)),
);

final communityFeedProvider = FutureProvider.autoDispose<List<FeedEntry>>(
  (ref) => ref.watch(communityApiProvider).feed(),
);

final communityQuestionsProvider =
    FutureProvider.autoDispose<List<CommunityQuestion>>(
      (ref) => ref.watch(communityApiProvider).questions(),
    );

final communityQuestionProvider = FutureProvider.autoDispose
    .family<CommunityQuestion, String>(
      (ref, id) => ref.watch(communityApiProvider).question(id),
    );

final communityGroupsProvider =
    FutureProvider.autoDispose<List<CommunityGroup>>(
      (ref) => ref.watch(communityApiProvider).groups(),
    );

final communityMeProvider = FutureProvider.autoDispose<CommunityMember>(
  (ref) => ref.watch(communityApiProvider).me(),
);

final communityConversationsProvider =
    FutureProvider.autoDispose<List<CommunityConversation>>(
      (ref) => ref.watch(communityApiProvider).conversations(),
    );

final communityMessagesProvider = FutureProvider.autoDispose
    .family<List<CommunityMessage>, String>(
      (ref, id) => ref.watch(communityApiProvider).messages(id),
    );
