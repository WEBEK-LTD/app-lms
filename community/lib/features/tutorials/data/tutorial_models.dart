import '../../../core/api/json.dart';
import '../../qa/data/qa_models.dart';

/// Area E: the official tutorials as the Community API sends them
/// (`/tutorials`), read leniently. Every tutorial is free, always (the
/// owner's decision): none is ever locked.

enum TutorialKind {
  article,
  video;

  static TutorialKind parse(String? value) =>
      value == 'video' ? video : article;
}

enum TutorialLevel {
  beginner,
  intermediate,
  advanced;

  static TutorialLevel parse(String? value) => switch (value) {
    'intermediate' => intermediate,
    'advanced' => advanced,
    _ => beginner,
  };
}

class TutorialSummary {
  const TutorialSummary({
    required this.id,
    required this.slug,
    required this.title,
    required this.kind,
    required this.level,
    required this.language,
    required this.section,
    required this.publishedAt,
    this.summary = '',
    this.coverUrl,
    this.durationSeconds,
    this.durationMinutes,
    this.official = true,
    this.tags = const [],
    this.viewCount = 0,
    this.bookmarked = false,
    this.author,
  });

  factory TutorialSummary.fromJson(Json json) {
    final seconds =
        optInt(json, 'duration_seconds') ?? optInt(json, 'duration_sec');
    final minutes = optInt(json, 'duration_minutes');
    return TutorialSummary(
      id: str(json, 'id'),
      slug: str(json, 'slug'),
      title: str(json, 'title'),
      summary: str(json, 'summary'),
      kind: TutorialKind.parse(optStr(json, 'kind')),
      level: TutorialLevel.parse(optStr(json, 'level')),
      language: str(json, 'language', 'en'),
      section: SectionRef.fromJson(optObject(json, 'section') ?? const {}),
      coverUrl: optStr(json, 'cover_url'),
      durationSeconds: seconds,
      durationMinutes: minutes,
      official: boolean(json, 'official', true),
      tags: [
        for (final t
            in (json['tags'] is List ? json['tags'] as List : const []))
          Tag.fromAny(t),
      ],
      viewCount: integer(json, 'view_count', integer(json, 'views')),
      bookmarked: boolean(json, 'bookmarked'),
      publishedAt: optDate(json, 'published_at') ?? date(json, 'created_at'),
      author: optObject(json, 'author') == null
          ? null
          : Author.fromJson(optObject(json, 'author')!),
    );
  }

  final String id;
  final String slug;
  final String title;
  final String summary;
  final TutorialKind kind;
  final TutorialLevel level;

  /// The language it is written or spoken in (en, ar, tr).
  final String language;
  final SectionRef section;
  final String? coverUrl;

  /// A video's length.
  final int? durationSeconds;

  /// An article's reading time.
  final int? durationMinutes;
  final bool official;
  final List<Tag> tags;
  final int viewCount;
  final bool bookmarked;
  final DateTime publishedAt;
  final Author? author;

  TutorialSummary copyWith({bool? bookmarked}) => TutorialSummary(
    id: id,
    slug: slug,
    title: title,
    summary: summary,
    kind: kind,
    level: level,
    language: language,
    section: section,
    coverUrl: coverUrl,
    durationSeconds: durationSeconds,
    durationMinutes: durationMinutes,
    official: official,
    tags: tags,
    viewCount: viewCount,
    bookmarked: bookmarked ?? this.bookmarked,
    publishedAt: publishedAt,
    author: author,
  );
}

class Tutorial {
  const Tutorial({required this.summary, this.body = '', this.videoUrl});

  factory Tutorial.fromJson(Json json) => Tutorial(
    summary: TutorialSummary.fromJson(json),
    body: str(json, 'body'),
    videoUrl: optStr(json, 'video_url'),
  );

  final TutorialSummary summary;

  /// An article's text (Markdown) or a video's notes.
  final String body;

  /// A video's address; null for an article.
  final String? videoUrl;

  String get id => summary.id;
}
