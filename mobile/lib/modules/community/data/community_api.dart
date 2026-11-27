import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/json.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
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

enum FeedKind { post, question, showcase }

/// One entry of the feed (`FeedItem`): a post, a question or a showcase.
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
    final kind = switch (optString(json, 'kind')) {
      'question' => FeedKind.question,
      'showcase' => FeedKind.showcase,
      _ => FeedKind.post,
    };
    // Exactly the field named by `kind` is set.
    final item =
        optObject(json, kind.name, (j) => j) ?? const <String, dynamic>{};
    return FeedEntry(
      kind: kind,
      id: optString(json, 'id') ?? optString(item, 'id') ?? '',
      author: CommunityMember.fromJson(
        optObject(item, 'author', (j) => j) ??
            optObject(item, 'member', (j) => j) ??
            const {},
      ),
      title: optString(item, 'title'),
      text:
          optString(item, 'body') ??
          optString(item, 'excerpt') ??
          optString(item, 'description') ??
          '',
      count: kind == FeedKind.question
          ? intOr(item, 'answer_count', 0)
          : intOr(item, 'comment_count', 0),
      createdAt: optDate(json, 'created_at'),
    );
  }

  final FeedKind kind;
  final String id;
  final CommunityMember author;
  final String? title;
  final String text;

  /// A question's answers, a post's or a showcase's comments.
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
    this.requested = false,
  });

  factory CommunityGroup.fromJson(Json json) => CommunityGroup(
    id: optString(json, 'id') ?? '',
    name: optString(json, 'name') ?? '',
    description: optString(json, 'description') ?? '',
    memberCount: intOr(json, 'member_count', 0),
    private: optString(json, 'visibility') == 'private',
    joined: optObject(json, 'standing', (j) => optString(j, 'role')) != null,
    requested:
        optObject(json, 'standing', (j) => boolOr(j, 'requested', false)) ??
        false,
  );

  final String id;
  final String name;
  final String description;
  final int memberCount;
  final bool private;
  final bool joined;

  /// Asked to join a private group; waiting for its moderators.
  final bool requested;
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
  const CommunityMessage({required this.id, required this.body, this.author});

  factory CommunityMessage.fromJson(Json json) => CommunityMessage(
    id: optString(json, 'id') ?? '',
    body: optString(json, 'body') ?? '',
    author: optObject(json, 'author', CommunityMember.fromJson),
  );

  final String id;
  final String body;
  final CommunityMember? author;
}

/// 235 The app's own community: the Community API with this app as its
/// tenant (docs/api/community.yaml, /api/app/{app_id}/community/v1). Reading
/// needs no account; the member's own things use the community's token,
/// which the app's signed-in customer gets for their account.
class CommunityApi {
  const CommunityApi(this.api, this.token);

  final YallappApi api;

  /// The community token of the app's signed-in customer, or null.
  final Future<String?> Function() token;

  static const _base = '/community/v1';

  Future<Json> _get(String path, {Map<String, dynamic>? query}) async => asJson(
    await api.community(
      'GET',
      '$_base$path',
      query: query,
      bearer: await token(),
    ),
  );

  Future<Json> _send(String method, String path, {Object? body}) async {
    final bearer = await token();
    if (bearer == null) throw const CommunitySignedOut();
    return asJson(
      await api.community(method, '$_base$path', body: body, bearer: bearer) ??
          const <String, dynamic>{},
    );
  }

  static String _id(String id) => Uri.encodeComponent(id);

  Future<List<FeedEntry>> feed() async =>
      listOf(await _get('/feed'), 'items', FeedEntry.fromJson);

  Future<List<CommunityQuestion>> questions() async =>
      listOf(await _get('/qa/questions'), 'items', CommunityQuestion.fromJson);

  Future<CommunityQuestion> question(String id) async =>
      CommunityQuestion.fromJson(await _get('/qa/questions/${_id(id)}'));

  Future<void> answer(String questionId, String body) => _send(
    'POST',
    '/qa/questions/${_id(questionId)}/answers',
    body: {'body': body},
  );

  Future<List<CommunityGroup>> groups() async =>
      listOf(await _get('/groups'), 'items', CommunityGroup.fromJson);

  Future<void> join(String group) =>
      _send('PUT', '/groups/${_id(group)}/membership');

  Future<CommunityMember> me() async =>
      CommunityMember.fromJson(await _get('/me'));

  Future<List<CommunityConversation>> conversations() async => listOf(
    await _get('/messages/conversations'),
    'items',
    CommunityConversation.fromJson,
  );

  Future<List<CommunityMessage>> messages(String conversationId) async =>
      listOf(
        await _get('/messages/conversations/${_id(conversationId)}/messages'),
        'items',
        CommunityMessage.fromJson,
      );

  Future<void> send(String conversationId, String body) => _send(
    'POST',
    '/messages/conversations/${_id(conversationId)}/messages',
    body: {'body': body},
  );
}

/// A write needs the member's community token, and there is none.
class CommunitySignedOut implements Exception {
  const CommunitySignedOut();
}

/// The community token for the app's signed-in customer: their app session,
/// exchanged once per sign-in (POST /community/v1/auth/app), kept in memory
/// only. Null when signed out.
final communityTokenProvider = FutureProvider<String?>((ref) async {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isSignedIn) return null;
  final appToken = await ref.read(tokenManagerProvider).validAccessToken();
  if (appToken == null) return null;
  final session = asJson(
    await ref
        .read(yallappApiProvider)
        .community(
          'POST',
          '/community/v1/auth/app',
          body: {'access_token': appToken},
        ),
  );
  return optString(session, 'access_token');
});

final communityApiProvider = Provider<CommunityApi>(
  (ref) => CommunityApi(
    ref.watch(yallappApiProvider),
    () => ref.read(communityTokenProvider.future),
  ),
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
