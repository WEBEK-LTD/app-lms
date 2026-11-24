import '../../../core/api/json.dart';
import '../../../core/api/models.dart';

/// Area E: the Q&A's shapes as the Community API sends them
/// (docs/api/community.yaml, `/qa/*`), read leniently: a missing field takes
/// its empty value, a new one is ignored.

/// Where a post stands: shown, waiting for a moderator (a new member's first
/// two posts, a held link), or taken down.
enum ContentStatus {
  published,
  pending,
  removed;

  static ContentStatus parse(String? value) => switch (value) {
    'pending' => pending,
    'removed' || 'hidden' => removed,
    _ => published,
  };
}

/// A section of the Q&A ("Studio") or of the tutorials.
class SectionRef {
  const SectionRef({required this.slug, required this.name, this.icon});

  factory SectionRef.fromJson(Json json) => SectionRef(
    slug: str(json, 'slug'),
    name: str(json, 'name'),
    icon: optStr(json, 'icon'),
  );

  final String slug;
  final String name;

  /// A Material Symbols Rounded name.
  final String? icon;
}

/// A tag ("Product page").
class Tag {
  const Tag({required this.slug, required this.name, this.count = 0});

  /// A tag is an object ({slug, name}); an older payload sends its slug only.
  factory Tag.fromAny(Object? value) {
    if (value is Map) {
      final json = asJson(value);
      return Tag(
        slug: str(json, 'slug'),
        name: str(json, 'name', str(json, 'slug')),
        count: integer(json, 'count', integer(json, 'question_count')),
      );
    }
    final slug = '${value ?? ''}';
    return Tag(slug: slug, name: slug);
  }

  final String slug;
  final String name;
  final int count;
}

List<Tag> _tags(Json json) {
  final value = json['tags'];
  if (value is! List) return const [];
  return [for (final item in value) Tag.fromAny(item)];
}

/// A member as shown beside what they wrote, with their rank ("Expert").
class Author {
  const Author({required this.member, this.rank});

  factory Author.fromJson(Json json) => Author(
    member: MemberSummary.fromJson(json),
    rank: MemberRank.parse(optStr(json, 'rank') ?? optStr(json, 'level')),
  );

  final MemberSummary member;
  final MemberRank? rank;
}

/// A member's standing in points.
enum MemberRank {
  newcomer,
  member,
  contributor,
  expert,
  pro;

  static MemberRank? parse(String? value) => switch (value?.toLowerCase()) {
    'newcomer' => newcomer,
    'member' => member,
    'contributor' => contributor,
    'expert' => expert,
    'pro' => pro,
    _ => null,
  };
}

class QuestionSummary {
  const QuestionSummary({
    required this.id,
    required this.title,
    required this.author,
    required this.section,
    required this.createdAt,
    this.excerpt = '',
    this.tags = const [],
    this.score = 0,
    this.answerCount = 0,
    this.viewCount = 0,
    this.accepted = false,
    this.hasOfficialAnswer = false,
    this.bookmarked = false,
    this.status = ContentStatus.published,
    this.lastActivityAt,
  });

  factory QuestionSummary.fromJson(Json json) => QuestionSummary(
    id: str(json, 'id'),
    title: str(json, 'title'),
    excerpt: str(json, 'excerpt'),
    author: Author.fromJson(optObject(json, 'author') ?? const {}),
    section: SectionRef.fromJson(optObject(json, 'section') ?? const {}),
    tags: _tags(json),
    score: integer(json, 'score'),
    answerCount: integer(json, 'answer_count'),
    viewCount: integer(json, 'view_count', integer(json, 'views')),
    accepted:
        boolean(json, 'accepted') ||
        boolean(json, 'has_accepted') ||
        optStr(json, 'accepted_answer_id') != null,
    hasOfficialAnswer: boolean(json, 'has_official_answer'),
    bookmarked: boolean(json, 'bookmarked'),
    status: ContentStatus.parse(optStr(json, 'status')),
    createdAt: date(json, 'created_at'),
    lastActivityAt: optDate(json, 'last_activity_at'),
  );

  final String id;
  final String title;
  final String excerpt;
  final Author author;
  final SectionRef section;
  final List<Tag> tags;
  final int score;
  final int answerCount;
  final int viewCount;
  final bool accepted;
  final bool hasOfficialAnswer;
  final bool bookmarked;
  final ContentStatus status;
  final DateTime createdAt;
  final DateTime? lastActivityAt;

  QuestionSummary copyWith({int? score, int? answerCount, bool? bookmarked}) =>
      QuestionSummary(
        id: id,
        title: title,
        excerpt: excerpt,
        author: author,
        section: section,
        tags: tags,
        score: score ?? this.score,
        answerCount: answerCount ?? this.answerCount,
        viewCount: viewCount,
        accepted: accepted,
        hasOfficialAnswer: hasOfficialAnswer,
        bookmarked: bookmarked ?? this.bookmarked,
        status: status,
        createdAt: createdAt,
        lastActivityAt: lastActivityAt,
      );
}

/// A reply under an answer.
class Reply {
  const Reply({
    required this.id,
    required this.body,
    required this.author,
    required this.createdAt,
    this.status = ContentStatus.published,
  });

  factory Reply.fromJson(Json json) => Reply(
    id: str(json, 'id'),
    body: str(json, 'body'),
    author: Author.fromJson(optObject(json, 'author') ?? const {}),
    createdAt: date(json, 'created_at'),
    status: ContentStatus.parse(optStr(json, 'status')),
  );

  final String id;
  final String body;
  final Author author;
  final DateTime createdAt;
  final ContentStatus status;
}

class Answer {
  const Answer({
    required this.id,
    required this.questionId,
    required this.body,
    required this.author,
    required this.createdAt,
    this.official = false,
    this.accepted = false,
    this.score = 0,
    this.myVote = 0,
    this.replyCount = 0,
    this.replies = const [],
    this.status = ContentStatus.published,
  });

  factory Answer.fromJson(Json json) => Answer(
    id: str(json, 'id'),
    questionId: str(json, 'question_id'),
    body: str(json, 'body'),
    author: Author.fromJson(optObject(json, 'author') ?? const {}),
    official: boolean(json, 'official'),
    accepted: boolean(json, 'accepted'),
    score: integer(json, 'score'),
    myVote: _vote(json),
    replyCount: integer(json, 'reply_count'),
    replies: listOf(json, 'replies', Reply.fromJson),
    status: ContentStatus.parse(optStr(json, 'status')),
    createdAt: date(json, 'created_at'),
  );

  final String id;
  final String questionId;
  final String body;
  final Author author;

  /// From Yallapp's team: "Yallapp Team · Official".
  final bool official;
  final bool accepted;
  final int score;

  /// The viewer's vote: 1, -1 or 0.
  final int myVote;
  final int replyCount;

  /// The newest replies, newest last.
  final List<Reply> replies;
  final ContentStatus status;
  final DateTime createdAt;

  Answer copyWith({
    bool? accepted,
    int? score,
    int? myVote,
    int? replyCount,
    List<Reply>? replies,
  }) => Answer(
    id: id,
    questionId: questionId,
    body: body,
    author: author,
    official: official,
    accepted: accepted ?? this.accepted,
    score: score ?? this.score,
    myVote: myVote ?? this.myVote,
    replyCount: replyCount ?? this.replyCount,
    replies: replies ?? this.replies,
    status: status,
    createdAt: createdAt,
  );
}

int _vote(Json json) {
  final v = integer(json, 'my_vote');
  return v > 0 ? 1 : (v < 0 ? -1 : 0);
}

/// A question with its answers: the accepted one first, then official ones,
/// then by score.
class Question {
  const Question({
    required this.summary,
    required this.body,
    this.myVote = 0,
    this.canAccept = false,
    this.canEdit = false,
    this.answers = const [],
  });

  factory Question.fromJson(Json json) => Question(
    summary: QuestionSummary.fromJson(json),
    body: str(json, 'body'),
    myVote: _vote(json),
    canAccept: boolean(json, 'can_accept') || boolean(json, 'mine'),
    canEdit: boolean(json, 'can_edit') || boolean(json, 'mine'),
    answers: listOf(json, 'answers', Answer.fromJson),
  );

  final QuestionSummary summary;
  final String body;
  final int myVote;

  /// The viewer asked it: they may accept an answer.
  final bool canAccept;
  final bool canEdit;
  final List<Answer> answers;

  String get id => summary.id;

  Question copyWith({
    List<Answer>? answers,
    int? myVote,
    int? score,
    bool? bookmarked,
  }) => Question(
    summary: summary.copyWith(
      score: score,
      bookmarked: bookmarked,
      answerCount: answers?.length,
    ),
    body: body,
    myVote: myVote ?? this.myVote,
    canAccept: canAccept,
    canEdit: canEdit,
    answers: answers ?? this.answers,
  );
}

/// A page of a list and where the next one starts (null at the end).
class Page<T> {
  const Page(this.items, [this.next]);

  factory Page.fromJson(Json json, T Function(Json) parse) => Page(
    listOf(json, 'items', parse),
    optStr(json, 'next_cursor') ?? optStr(json, 'next'),
  );

  final List<T> items;
  final String? next;
}

/// The Q&A list's filters (`filter`) and orders (`sort`).
enum QuestionFilter { all, unanswered, answered, official, following }

enum QuestionSort { active, newest, votes }
