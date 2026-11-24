import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/providers.dart';
import 'fake_qa_api.dart';
import 'qa_models.dart';

/// Area E: the Q&A calls of the Community API (`/qa/*`, `/search`).
abstract class QaApi {
  Future<List<SectionRef>> sections();
  Future<List<Tag>> tags({String? query});

  Future<Paged<QuestionSummary>> questions({
    String? section,
    String? tag,
    QuestionFilter filter = QuestionFilter.all,
    QuestionSort sort = QuestionSort.active,
    String? cursor,
  });

  /// Questions like the title being typed, before asking.
  Future<List<QuestionSummary>> similar(String title);

  /// The question with its answers. [countView] false reads it without
  /// counting a view (after the member's own post).
  Future<Question> question(String id, {bool countView = true});

  Future<Question> ask({
    required String title,
    required String body,
    required String section,
    List<String> tags = const [],
    required String language,
  });

  Future<Answer> answer(String questionId, String body);

  /// 1 up, -1 down, 0 takes the vote back. Answers the score and the vote.
  Future<({int score, int myVote})> voteQuestion(String id, int value);
  Future<({int score, int myVote})> voteAnswer(String id, int value);

  /// Accepts (or, with [accept] false, un-accepts) an answer of the
  /// question; answers the question as it now stands.
  Future<Question> accept(
    String questionId,
    String answerId, {
    bool accept = true,
  });

  Future<List<Reply>> replies(String answerId);
  Future<Reply> reply(String answerId, String body);

  /// Saves (bookmarks) a question or takes it out of the saved list.
  Future<void> bookmark(String questionId, {required bool saved});

  Future<List<QuestionSummary>> searchQuestions(String query);
}

class HttpQaApi implements QaApi {
  HttpQaApi(this._client);

  final ApiClient _client;

  @override
  Future<List<SectionRef>> sections() async =>
      listOf(await _client.get('/qa/sections'), 'items', SectionRef.fromJson);

  @override
  Future<List<Tag>> tags({String? query}) async {
    final json = await _client.get('/qa/tags', query: {'q': query});
    return [for (final t in jsonList(json, 'items')) Tag.fromAny(t)];
  }

  @override
  Future<Paged<QuestionSummary>> questions({
    String? section,
    String? tag,
    QuestionFilter filter = QuestionFilter.all,
    QuestionSort sort = QuestionSort.active,
    String? cursor,
  }) async => Paged.fromJson(
    await _client.get(
      '/qa/questions',
      query: {
        'section': section,
        'tag': tag,
        'filter': filter.name,
        'sort': sort.name,
        'cursor': cursor,
      },
    ),
    QuestionSummary.fromJson,
  );

  @override
  Future<List<QuestionSummary>> similar(String title) async => listOf(
    await _client.get('/qa/questions/similar', query: {'title': title}),
    'items',
    QuestionSummary.fromJson,
  );

  @override
  Future<Question> question(String id, {bool countView = true}) async =>
      Question.fromJson(
        await _client.get(
          '/qa/questions/$id',
          query: countView ? null : {'view': 0},
        ),
      );

  @override
  Future<Question> ask({
    required String title,
    required String body,
    required String section,
    List<String> tags = const [],
    required String language,
  }) async => Question.fromJson(
    await _client.post(
      '/qa/questions',
      body: {
        'title': title,
        'body': body,
        'section': section,
        'tags': tags,
        'language': language,
      },
    ),
  );

  @override
  Future<Answer> answer(String questionId, String body) async =>
      Answer.fromJson(
        await _client.post(
          '/qa/questions/$questionId/answers',
          body: {'body': body},
        ),
      );

  ({int score, int myVote}) _voted(Json json) =>
      (score: integer(json, 'score'), myVote: integer(json, 'my_vote'));

  @override
  Future<({int score, int myVote})> voteQuestion(String id, int value) async =>
      _voted(
        await _client.put('/qa/questions/$id/vote', body: {'value': value}),
      );

  @override
  Future<({int score, int myVote})> voteAnswer(String id, int value) async =>
      _voted(await _client.put('/qa/answers/$id/vote', body: {'value': value}));

  @override
  Future<Question> accept(
    String questionId,
    String answerId, {
    bool accept = true,
  }) async {
    final path = '/qa/answers/$answerId/accept';
    if (accept) return Question.fromJson(await _client.put(path));
    // Un-accepting answers with the question too, but the client's DELETE
    // reads no body: read it again without counting a view.
    await _client.delete(path);
    return question(questionId, countView: false);
  }

  @override
  Future<List<Reply>> replies(String answerId) async => listOf(
    await _client.get('/qa/answers/$answerId/replies'),
    'items',
    Reply.fromJson,
  );

  @override
  Future<Reply> reply(String answerId, String body) async => Reply.fromJson(
    await _client.post('/qa/answers/$answerId/replies', body: {'body': body}),
  );

  @override
  Future<void> bookmark(String questionId, {required bool saved}) async {
    final path = '/qa/questions/$questionId/bookmark';
    if (saved) {
      await _client.put(path);
    } else {
      await _client.delete(path);
    }
  }

  @override
  Future<List<QuestionSummary>> searchQuestions(String query) async => listOf(
    await _client.get('/search', query: {'q': query, 'type': 'questions'}),
    'questions',
    QuestionSummary.fromJson,
  );
}

/// The app's Q&A API: the fake one in the demo build, else the server's.
/// Tests override it.
final qaApiProvider = Provider<QaApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeQaApi()
      : HttpQaApi(ref.watch(apiClientProvider)),
);
