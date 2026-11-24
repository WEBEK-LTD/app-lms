import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/providers.dart';

import '../data/qa_api.dart';
import '../data/qa_models.dart';

/// What the Q&A list shows: a filter, an order, maybe a section or a tag.
class QuestionsQuery {
  const QuestionsQuery({
    this.filter = QuestionFilter.all,
    this.sort = QuestionSort.active,
    this.section,
    this.tag,
  });

  final QuestionFilter filter;
  final QuestionSort sort;
  final String? section;
  final String? tag;

  QuestionsQuery copyWith({
    QuestionFilter? filter,
    QuestionSort? sort,
    String? Function()? section,
    String? Function()? tag,
  }) => QuestionsQuery(
    filter: filter ?? this.filter,
    sort: sort ?? this.sort,
    section: section == null ? this.section : section(),
    tag: tag == null ? this.tag : tag(),
  );

  @override
  bool operator ==(Object other) =>
      other is QuestionsQuery &&
      other.filter == filter &&
      other.sort == sort &&
      other.section == section &&
      other.tag == tag;

  @override
  int get hashCode => Object.hash(filter, sort, section, tag);
}

/// The query the Q&A tab is on.
class QuestionsQueryController extends Notifier<QuestionsQuery> {
  @override
  QuestionsQuery build() => const QuestionsQuery();

  void set(QuestionsQuery query) => state = query;
}

final questionsQueryProvider =
    NotifierProvider<QuestionsQueryController, QuestionsQuery>(
      QuestionsQueryController.new,
    );

/// The questions for a query, a page at a time.
class QuestionsController extends AsyncNotifier<Paged<QuestionSummary>> {
  QuestionsController(this.query);

  final QuestionsQuery query;

  Future<Paged<QuestionSummary>> _page([String? cursor]) => ref
      .read(qaApiProvider)
      .questions(
        filter: query.filter,
        sort: query.sort,
        section: query.section,
        tag: query.tag,
        cursor: cursor,
      );

  @override
  Future<Paged<QuestionSummary>> build() => _page();

  var _loading = false;

  /// The next page, added under the ones shown.
  Future<void> more() async {
    final now = state.value;
    if (now == null || now.next == null || _loading) return;
    _loading = true;
    try {
      final next = await _page(now.next);
      state = AsyncData(Paged([...now.items, ...next.items], next.next));
    } finally {
      _loading = false;
    }
  }
}

final questionsProvider =
    AsyncNotifierProvider.family<
      QuestionsController,
      Paged<QuestionSummary>,
      QuestionsQuery
    >(QuestionsController.new);

/// The Q&A sections, for the chips and the ask form.
final qaSectionsProvider = FutureProvider<List<SectionRef>>(
  (ref) => ref.watch(qaApiProvider).sections(),
);

/// When the member last looked at the Q&A tab (kept on the phone).
class QaLastSeen extends Notifier<DateTime?> {
  static const _key = 'community.qa.last_seen';

  @override
  DateTime? build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(_key);
    return raw == null ? null : DateTime.tryParse(raw);
  }

  void seen([DateTime? at]) {
    final now = (at ?? DateTime.now()).toUtc();
    ref.read(sharedPreferencesProvider).setString(_key, now.toIso8601String());
    state = now;
  }
}

final qaLastSeenProvider = NotifierProvider<QaLastSeen, DateTime?>(
  QaLastSeen.new,
);

/// The questions asked since the member last looked (the Q&A tab's dot and
/// the menu's number); none before they first look.
final newQuestionsCountProvider = Provider<int>((ref) {
  if (ref.watch(meProvider) == null) return 0;
  final seen = ref.watch(qaLastSeenProvider);
  if (seen == null) return 0;
  final page = ref.watch(questionsProvider(const QuestionsQuery())).value;
  if (page == null) return 0;
  return page.items.where((q) => q.createdAt.isAfter(seen)).length;
});
