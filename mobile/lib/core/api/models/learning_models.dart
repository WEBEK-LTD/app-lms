import 'catalog_models.dart';
import 'config_models.dart';
import 'json.dart';

class Topic {
  const Topic({required this.id, required this.title, required this.items});

  factory Topic.fromJson(Json json) => Topic(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    items: reqListOf(json, 'items', CurriculumItem.fromJson),
  );

  final int id;
  final String title;
  final List<CurriculumItem> items;
}

enum CurriculumItemType { lesson, quiz, assignment, live }

class CurriculumItem {
  const CurriculumItem({
    required this.id,
    required this.type,
    required this.title,
    required this.locked,
    required this.completed,
    this.durationMinutes,
    this.questionCount,
    this.preview = false,
  });

  factory CurriculumItem.fromJson(Json json) => CurriculumItem(
    id: reqInt(json, 'id'),
    type: enumFrom(
      CurriculumItemType.values,
      json['type'],
      CurriculumItemType.lesson,
    ),
    title: reqString(json, 'title'),
    durationMinutes: optInt(json, 'duration_minutes'),
    questionCount: optInt(json, 'question_count'),
    preview: boolOr(json, 'preview', false),
    locked: reqBool(json, 'locked'),
    completed: reqBool(json, 'completed'),
  );

  final int id;
  final CurriculumItemType type;
  final String title;
  final int? durationMinutes;
  final int? questionCount;
  final bool preview;
  final bool locked;
  final bool completed;

  /// 39 Lessons and quizzes open in the app; assignments and live classes open
  /// on the website (and never complete from the app).
  bool get opensInApp =>
      type == CurriculumItemType.lesson || type == CurriculumItemType.quiz;
}

/// 39 Where "Continue learning" goes on a course page: the first lesson or
/// quiz not completed yet, else the first one open, else null. Assignments
/// and live classes are skipped: they open on the website, so stopping at one
/// would keep the student from the lessons after it.
CurriculumItem? nextItemToOpen(List<Topic> topics) {
  final open = [
    for (final topic in topics)
      ...topic.items.where((item) => item.opensInApp && !item.locked),
  ];
  return open.where((item) => !item.completed).firstOrNull ?? open.firstOrNull;
}

enum RenderMode { native, webview }

class Lesson {
  const Lesson({
    required this.id,
    required this.courseId,
    required this.title,
    required this.renderMode,
    required this.completed,
    this.html,
    this.webviewUrl,
    this.embeds = const [],
    this.embedHeight,
    this.video,
    this.attachments = const [],
    this.positionSeconds = 0,
    this.previousId,
    this.nextId,
  });

  factory Lesson.fromJson(Json json) => Lesson(
    id: reqInt(json, 'id'),
    courseId: reqInt(json, 'course_id'),
    title: reqString(json, 'title'),
    renderMode: enumFrom(
      RenderMode.values,
      json['render_mode'],
      RenderMode.webview,
    ),
    html: optString(json, 'html'),
    webviewUrl: optString(json, 'webview_url'),
    embeds: listOf(json, 'embeds', Embed.fromJson),
    embedHeight: json['embed_height'] == null
        ? null
        : enumFromSnake(
            EmbedHeightMode.values,
            json['embed_height'],
            EmbedHeightMode.auto,
          ),
    video: optObject(json, 'video', Video.fromJson),
    attachments: listOf(json, 'attachments', Attachment.fromJson),
    completed: reqBool(json, 'completed'),
    positionSeconds: intOr(json, 'position_seconds', 0),
    previousId: optInt(json, 'previous_id'),
    nextId: optInt(json, 'next_id'),
  );

  final int id;
  final int courseId;
  final String title;
  final RenderMode renderMode;
  final String? html;
  final String? webviewUrl;
  final List<Embed> embeds;

  /// This lesson's override of the site's `content.embed_height`; null uses
  /// the site setting.
  final EmbedHeightMode? embedHeight;
  final Video? video;
  final List<Attachment> attachments;
  final bool completed;
  final int positionSeconds;
  final int? previousId;
  final int? nextId;

  /// The embed height rule for this lesson: its own override, else the
  /// site's setting.
  EmbedHeightMode embedHeightFor(ContentRules rules) =>
      embedHeight ?? rules.embedHeight;

  Lesson copyWith({bool? completed}) => Lesson(
    id: id,
    courseId: courseId,
    title: title,
    renderMode: renderMode,
    html: html,
    webviewUrl: webviewUrl,
    embeds: embeds,
    embedHeight: embedHeight,
    video: video,
    attachments: attachments,
    completed: completed ?? this.completed,
    positionSeconds: positionSeconds,
    previousId: previousId,
    nextId: nextId,
  );
}

enum EmbedProvider { youtube, vimeo, sameSite, other }

/// An iframe found in a lesson; `Lesson.html` references it by [placeholder].
class Embed {
  const Embed({
    required this.placeholder,
    required this.src,
    required this.provider,
    this.width,
    this.height,
    this.aspectRatio,
    this.allowFullscreen = true,
  });

  factory Embed.fromJson(Json json) => Embed(
    placeholder: reqString(json, 'placeholder'),
    src: reqString(json, 'src'),
    provider: enumFromSnake(
      EmbedProvider.values,
      json['provider'],
      EmbedProvider.other,
    ),
    width: optString(json, 'width'),
    height: optString(json, 'height'),
    aspectRatio: optDouble(json, 'aspect_ratio'),
    allowFullscreen: boolOr(json, 'allow_fullscreen', true),
  );

  final String placeholder;
  final String src;
  final EmbedProvider provider;

  /// As set in the lesson, for example "100%" or "640".
  final String? width;

  /// As set in the lesson, for example "900".
  final String? height;

  /// Width divided by height, when known.
  final double? aspectRatio;
  final bool allowFullscreen;
}

class Attachment {
  const Attachment({
    required this.name,
    required this.url,
    this.sizeBytes,
    this.mimeType,
  });

  factory Attachment.fromJson(Json json) => Attachment(
    name: reqString(json, 'name'),
    url: reqString(json, 'url'),
    sizeBytes: optInt(json, 'size_bytes'),
    mimeType: optString(json, 'mime_type'),
  );

  final String name;
  final String url;
  final int? sizeBytes;
  final String? mimeType;
}

class Progress {
  const Progress({
    required this.courseId,
    required this.completedItems,
    required this.totalItems,
    required this.percent,
    this.courseCompleted = false,
  });

  factory Progress.fromJson(Json json) => Progress(
    courseId: reqInt(json, 'course_id'),
    completedItems: reqInt(json, 'completed_items'),
    totalItems: reqInt(json, 'total_items'),
    percent: reqInt(json, 'percent').clamp(0, 100),
    courseCompleted: boolOr(json, 'course_completed', false),
  );

  final int courseId;
  final int completedItems;
  final int totalItems;
  final int percent;
  final bool courseCompleted;
}

class MyCourse {
  const MyCourse({
    required this.course,
    required this.progress,
    this.nextItem,
    this.certificateUrl,
  });

  factory MyCourse.fromJson(Json json) => MyCourse(
    course: CourseSummary.fromJson(asJson(json['course'], 'course')),
    progress: Progress.fromJson(asJson(json['progress'], 'progress')),
    nextItem: optObject(json, 'next_item', CurriculumItem.fromJson),
    certificateUrl: optString(json, 'certificate_url'),
  );

  final CourseSummary course;
  final Progress progress;
  final CurriculumItem? nextItem;
  final String? certificateUrl;
}

class Enrollment {
  const Enrollment({required this.courseId, required this.enrolledAt});

  factory Enrollment.fromJson(Json json) => Enrollment(
    courseId: reqInt(json, 'course_id'),
    enrolledAt: reqDate(json, 'enrolled_at'),
  );

  final int courseId;
  final DateTime enrolledAt;
}

class Certificate {
  const Certificate({
    required this.courseId,
    required this.courseTitle,
    required this.url,
    this.issuedAt,
  });

  factory Certificate.fromJson(Json json) => Certificate(
    courseId: reqInt(json, 'course_id'),
    courseTitle: reqString(json, 'course_title'),
    url: reqString(json, 'url'),
    issuedAt: optDate(json, 'issued_at'),
  );

  final int courseId;
  final String courseTitle;
  final String url;
  final DateTime? issuedAt;
}
