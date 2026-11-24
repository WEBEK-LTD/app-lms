import '../../../core/api/api_exception.dart';
import '../../../core/api/models.dart';
import 'qa_api.dart';
import 'qa_models.dart';

/// [QaApi] in memory: the widget tests drive it, and the demo build runs on
/// it. Its first question is the approved design's ("How do I give each
/// template its own product page?", Karim Samy, answered by the Yallapp Team
/// and Nour El Hoda), with the shell's members (FakeCommunityApi).
class FakeQaApi implements QaApi {
  FakeQaApi({DateTime? now}) : now = now ?? DateTime.now().toUtc() {
    _seed();
  }

  final DateTime now;
  final calls = <String>[];
  static const meId = 'm-mohamed';

  static const mohamed = Author(
    member: MemberSummary(
      id: meId,
      name: 'Mohamed Ali',
      username: 'mohamed',
      level: 'Pro',
      badge: BadgeKind.blue,
    ),
    rank: MemberRank.pro,
  );
  static const karim = Author(
    member: MemberSummary(id: 'm-karim', name: 'Karim Samy', username: 'karim'),
    rank: MemberRank.member,
  );
  static const nour = Author(
    member: MemberSummary(
      id: 'm-nour',
      name: 'Nour El Hoda',
      username: 'nour',
      level: 'Expert',
      badge: BadgeKind.blue,
    ),
    rank: MemberRank.expert,
  );
  static const team = Author(
    member: MemberSummary(
      id: 'm-team',
      name: 'Yallapp Team',
      username: 'yallapp',
      team: true,
    ),
    rank: MemberRank.pro,
  );

  static const sectionList = [
    SectionRef(slug: 'studio', name: 'Studio', icon: 'design_services'),
    SectionRef(slug: 'shops', name: 'Shops', icon: 'storefront'),
    SectionRef(slug: 'publishing', name: 'Publishing', icon: 'rocket_launch'),
    SectionRef(slug: 'payments', name: 'Getting paid', icon: 'account_balance'),
  ];

  final _tags = <Tag>[
    const Tag(slug: 'product-page', name: 'Product page', count: 42),
    const Tag(slug: 'templates', name: 'Templates', count: 38),
    const Tag(slug: 'arabic', name: 'Arabic', count: 21),
    const Tag(slug: 'photos', name: 'Photos', count: 17),
    const Tag(slug: 'app-store', name: 'App Store', count: 12),
  ];

  final _questions = <String, Question>{};
  final _order = <String>[];
  final _replies = <String, List<Reply>>{};
  var _next = 0;

  String _id(String prefix) => '$prefix-${++_next}';

  Tag _tag(String slug) =>
      _tags.firstWhere((t) => t.slug == slug, orElse: () => Tag.fromAny(slug));

  SectionRef _section(String slug) => sectionList.firstWhere(
    (s) => s.slug == slug,
    orElse: () => sectionList.first,
  );

  void _put(Question q) {
    _questions[q.id] = q;
    _order.remove(q.id);
    _order.insert(0, q.id);
  }

  void _seed() {
    final threeHours = now.subtract(const Duration(hours: 3));
    final official = Answer(
      id: 'a-official',
      questionId: 'q-product-page',
      body:
          'In Studio open Pages → Product and pick “From template”. Each '
          'template ships its own page and switches automatically.',
      author: team,
      official: true,
      accepted: true,
      score: 42,
      // The design's viewer voted it up (the orange arrow).
      myVote: 1,
      replyCount: 5,
      createdAt: now.subtract(const Duration(hours: 2)),
    );
    final fromNour = Answer(
      id: 'a-nour',
      questionId: 'q-product-page',
      body: 'Also keep product photos at 3:4 so the gallery fills the screen.',
      author: nour,
      score: 17,
      createdAt: now.subtract(const Duration(hours: 1)),
    );
    final others = [
      Answer(
        id: 'a-3',
        questionId: 'q-product-page',
        body: 'You can also preview it on your phone from the Preview button.',
        author: mohamed,
        score: 6,
        createdAt: now.subtract(const Duration(minutes: 50)),
      ),
      Answer(
        id: 'a-4',
        questionId: 'q-product-page',
        body: 'It works for every look that has a product page of its own.',
        author: karim,
        score: 2,
        createdAt: now.subtract(const Duration(minutes: 20)),
      ),
    ];
    _replies['a-official'] = [
      for (var i = 0; i < 5; i++)
        Reply(
          id: 'r-$i',
          body: [
            'Worked for me, thanks!',
            'Does it keep my own changes to the page?',
            'Yes, your changes stay on top of the template.',
            'Perfect, that is what I needed.',
            'Great answer.',
          ][i],
          author: i.isEven ? karim : nour,
          createdAt: now.subtract(Duration(minutes: 100 - i * 15)),
        ),
    ];
    _put(
      Question(
        summary: QuestionSummary(
          id: 'q-product-page',
          title: 'How do I give each template its own product page?',
          excerpt:
              'Every template I sell shows the same product page. Can each '
              'one have its own?',
          author: karim,
          section: _section('studio'),
          tags: [_tag('product-page')],
          score: 12,
          answerCount: 4,
          viewCount: 284,
          accepted: true,
          hasOfficialAnswer: true,
          createdAt: threeHours,
          lastActivityAt: now.subtract(const Duration(minutes: 20)),
        ),
        body:
            'Every template I sell shows the same product page. Can each one '
            'have its own, so a crochet shop and a furniture shop look '
            'different when a customer opens a product?',
        answers: [official, fromNour, ...others],
      ),
    );
    final more = [
      (
        id: 'q-arabic',
        title: 'Can my shop be Arabic first and English second?',
        section: 'shops',
        tags: ['arabic'],
        author: nour,
        score: 3,
        answers: 2,
        views: 96,
        accepted: true,
        official: false,
        age: const Duration(hours: 6),
      ),
      (
        id: 'q-photos',
        title: 'What size should product photos be for the gallery?',
        section: 'studio',
        tags: ['photos', 'product-page'],
        author: mohamed,
        score: 8,
        answers: 1,
        views: 412,
        accepted: false,
        official: false,
        age: const Duration(days: 1),
      ),
      (
        id: 'q-review',
        title: 'How long does the App Store review take for a new shop?',
        section: 'publishing',
        tags: ['app-store'],
        author: karim,
        score: 1,
        answers: 0,
        views: 37,
        accepted: false,
        official: false,
        age: const Duration(minutes: 40),
      ),
    ];
    for (final m in more.reversed) {
      final section = _section(m.section);
      _put(
        Question(
          summary: QuestionSummary(
            id: m.id,
            title: m.title,
            excerpt: 'Asked in ${section.name}.',
            author: m.author,
            section: section,
            tags: [for (final t in m.tags) _tag(t)],
            score: m.score,
            answerCount: m.answers,
            viewCount: m.views,
            accepted: m.accepted,
            hasOfficialAnswer: m.official,
            createdAt: now.subtract(m.age),
          ),
          body: '${m.title} I looked in the help pages but found nothing.',
          // The demo member asked it: they may accept its answer.
          canAccept: m.author.member.id == meId,
          canEdit: m.author.member.id == meId,
          answers: [
            if (m.id == 'q-photos')
              Answer(
                id: 'a-photos-nour',
                questionId: m.id,
                body: '3:4, at least 1200 pixels wide, on a plain background.',
                author: nour,
                score: 4,
                createdAt: now.subtract(const Duration(hours: 20)),
              ),
          ],
        ),
      );
    }
    // The design's question first.
    _order
      ..remove('q-product-page')
      ..insert(0, 'q-product-page');
  }

  Question _get(String id) {
    final q = _questions[id];
    if (q == null) throw const ApiException(code: 'not_found');
    return q;
  }

  @override
  Future<List<SectionRef>> sections() async => sectionList;

  @override
  Future<List<Tag>> tags({String? query}) async => [
    for (final t in _tags)
      if (query == null || t.name.toLowerCase().contains(query.toLowerCase()))
        t,
  ];

  @override
  Future<Paged<QuestionSummary>> questions({
    String? section,
    String? tag,
    QuestionFilter filter = QuestionFilter.all,
    QuestionSort sort = QuestionSort.active,
    String? cursor,
  }) async {
    calls.add('questions:${filter.name}:${section ?? ''}');
    var list = [
      for (final id in _order)
        if (_questions[id]!.summary.status != ContentStatus.removed)
          _questions[id]!.summary,
    ];
    if (section != null) {
      list = [
        for (final q in list)
          if (q.section.slug == section) q,
      ];
    }
    if (tag != null) {
      list = [
        for (final q in list)
          if (q.tags.any((t) => t.slug == tag)) q,
      ];
    }
    list = switch (filter) {
      QuestionFilter.unanswered => [
        for (final q in list)
          if (q.answerCount == 0) q,
      ],
      QuestionFilter.answered => [
        for (final q in list)
          if (q.answerCount > 0) q,
      ],
      QuestionFilter.official => [
        for (final q in list)
          if (q.hasOfficialAnswer) q,
      ],
      _ => list,
    };
    if (sort == QuestionSort.votes) {
      list.sort((a, b) => b.score.compareTo(a.score));
    } else if (sort == QuestionSort.newest) {
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    }
    return Paged(list);
  }

  @override
  Future<List<QuestionSummary>> similar(String title) async {
    final words = {
      for (final w in title.toLowerCase().split(RegExp(r'\W+')))
        if (w.length > 3) w,
    };
    if (words.isEmpty) return const [];
    return [
      for (final id in _order)
        if (words.any(_questions[id]!.summary.title.toLowerCase().contains))
          _questions[id]!.summary,
    ].take(5).toList();
  }

  @override
  Future<Question> question(String id, {bool countView = true}) async {
    calls.add('question:$id');
    return _get(id);
  }

  @override
  Future<Question> ask({
    required String title,
    required String body,
    required String section,
    List<String> tags = const [],
    required String language,
  }) async {
    calls.add('ask:$title');
    if (title.trim().length < 10 || body.trim().length < 20) {
      throw const ApiException(code: 'invalid_request');
    }
    final q = Question(
      summary: QuestionSummary(
        id: _id('q'),
        title: title.trim(),
        excerpt: body.trim(),
        author: mohamed,
        section: _section(section),
        tags: [for (final t in tags) _tag(t)],
        createdAt: now,
        // A new member's first posts wait for a moderator; the demo member
        // is not new.
        status: ContentStatus.published,
      ),
      body: body.trim(),
      canAccept: true,
      canEdit: true,
    );
    _put(q);
    return q;
  }

  @override
  Future<Answer> answer(String questionId, String body) async {
    calls.add('answer:$questionId');
    if (body.trim().length < 10) {
      throw const ApiException(code: 'invalid_request');
    }
    final q = _get(questionId);
    final a = Answer(
      id: _id('a'),
      questionId: questionId,
      body: body.trim(),
      author: mohamed,
      createdAt: now,
    );
    _questions[questionId] = q.copyWith(answers: [...q.answers, a]);
    return a;
  }

  @override
  Future<({int score, int myVote})> voteQuestion(String id, int value) async {
    calls.add('voteQuestion:$id:$value');
    final q = _get(id);
    final score = q.summary.score - q.myVote + value;
    _questions[id] = q.copyWith(myVote: value, score: score);
    return (score: score, myVote: value);
  }

  @override
  Future<({int score, int myVote})> voteAnswer(String id, int value) async {
    calls.add('voteAnswer:$id:$value');
    for (final q in _questions.values) {
      final i = q.answers.indexWhere((a) => a.id == id);
      if (i < 0) continue;
      final a = q.answers[i];
      if (a.author.member.id == meId) {
        throw const ApiException(code: 'not_allowed');
      }
      final updated = a.copyWith(
        score: a.score - a.myVote + value,
        myVote: value,
      );
      _questions[q.id] = q.copyWith(answers: [...q.answers]..[i] = updated);
      return (score: updated.score, myVote: value);
    }
    throw const ApiException(code: 'not_found');
  }

  @override
  Future<Question> accept(
    String questionId,
    String answerId, {
    bool accept = true,
  }) async {
    calls.add('accept:$answerId:$accept');
    final q = _get(questionId);
    if (!q.canAccept) throw const ApiException(code: 'not_allowed');
    final answers = [
      for (final a in q.answers)
        a.copyWith(accepted: accept ? a.id == answerId : false),
    ];
    final updated = q.copyWith(answers: answers);
    _questions[questionId] = updated;
    return updated;
  }

  @override
  Future<List<Reply>> replies(String answerId) async =>
      List.of(_replies[answerId] ?? const []);

  @override
  Future<Reply> reply(String answerId, String body) async {
    calls.add('reply:$answerId');
    final r = Reply(
      id: _id('r'),
      body: body.trim(),
      author: mohamed,
      createdAt: now,
    );
    (_replies[answerId] ??= []).add(r);
    for (final q in _questions.values) {
      final i = q.answers.indexWhere((a) => a.id == answerId);
      if (i < 0) continue;
      final a = q.answers[i];
      _questions[q.id] = q.copyWith(
        answers: [...q.answers]..[i] = a.copyWith(replyCount: a.replyCount + 1),
      );
    }
    return r;
  }

  @override
  Future<void> bookmark(String questionId, {required bool saved}) async {
    calls.add('bookmark:$questionId:$saved');
    _questions[questionId] = _get(questionId).copyWith(bookmarked: saved);
  }

  @override
  Future<List<QuestionSummary>> searchQuestions(String query) async {
    final q = query.toLowerCase();
    return [
      for (final id in _order)
        if (_questions[id]!.summary.title.toLowerCase().contains(q))
          _questions[id]!.summary,
    ];
  }

  /// The saved questions (the Saved page).
  List<QuestionSummary> get saved => [
    for (final id in _order)
      if (_questions[id]!.summary.bookmarked) _questions[id]!.summary,
  ];
}
