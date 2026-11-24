import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';
import '../../qa/data/fake_qa_api.dart';
import '../../qa/data/qa_api.dart';
import '../../qa/data/qa_models.dart';
import '../../tutorials/data/tutorial_models.dart';
import '../../tutorials/data/tutorials_api.dart';

/// Area E: the header's search (`/search`) and the Saved page
/// (`/qa/saved`), across questions, tutorials and members.

class SearchResults {
  const SearchResults({
    this.questions = const [],
    this.tutorials = const [],
    this.members = const [],
    this.tags = const [],
  });

  factory SearchResults.fromJson(Json json) => SearchResults(
    questions: listOf(json, 'questions', QuestionSummary.fromJson),
    tutorials: listOf(json, 'tutorials', TutorialSummary.fromJson),
    members: listOf(json, 'members', MemberSummary.fromJson),
    tags: [for (final t in jsonList(json, 'tags')) Tag.fromAny(t)],
  );

  final List<QuestionSummary> questions;
  final List<TutorialSummary> tutorials;
  final List<MemberSummary> members;
  final List<Tag> tags;

  bool get isEmpty =>
      questions.isEmpty && tutorials.isEmpty && members.isEmpty && tags.isEmpty;
}

abstract class SearchApi {
  Future<SearchResults> search(String query);

  /// What the member saved: questions and tutorials.
  Future<SearchResults> saved();
}

class HttpSearchApi implements SearchApi {
  HttpSearchApi(this._client);

  final ApiClient _client;

  @override
  Future<SearchResults> search(String query) async => SearchResults.fromJson(
    await _client.get('/search', query: {'q': query, 'type': 'all'}),
  );

  @override
  Future<SearchResults> saved() async =>
      SearchResults.fromJson(await _client.get('/qa/saved'));
}

/// [SearchApi] over the fake Q&A and tutorials (tests, the demo).
class FakeSearchApi implements SearchApi {
  FakeSearchApi({FakeQaApi? qa, FakeTutorialsApi? tutorials})
    : qa = qa ?? FakeQaApi(),
      tutorials = tutorials ?? FakeTutorialsApi();

  final FakeQaApi qa;
  final FakeTutorialsApi tutorials;
  final calls = <String>[];

  static const _members = [
    MemberSummary(
      id: 'm-nour',
      name: 'Nour El Hoda',
      username: 'nour',
      badge: BadgeKind.blue,
      level: 'Expert',
    ),
    MemberSummary(id: 'm-karim', name: 'Karim Samy', username: 'karim'),
  ];

  @override
  Future<SearchResults> search(String query) async {
    calls.add('search:$query');
    final q = query.toLowerCase();
    return SearchResults(
      questions: await qa.searchQuestions(query),
      tutorials: await tutorials.search(query),
      members: [
        for (final m in _members)
          if (m.name.toLowerCase().contains(q) || m.username.contains(q)) m,
      ],
      tags: await qa.tags(query: query),
    );
  }

  @override
  Future<SearchResults> saved() async {
    calls.add('saved');
    return SearchResults(questions: qa.saved, tutorials: tutorials.saved);
  }
}

final searchApiProvider = Provider<SearchApi>((ref) {
  if (!ref.watch(configProvider).demo) {
    return HttpSearchApi(ref.watch(apiClientProvider));
  }
  // The demo's search and Saved read the same fakes the screens write to.
  final qa = ref.watch(qaApiProvider);
  final tutorials = ref.watch(tutorialsApiProvider);
  return FakeSearchApi(
    qa: qa is FakeQaApi ? qa : null,
    tutorials: tutorials is FakeTutorialsApi ? tutorials : null,
  );
});
