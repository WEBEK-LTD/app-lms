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

/// 50 The topic a course page opens at: the one holding [nextItemToOpen]
/// (where the student is), else the first.
int currentTopicIndex(List<Topic> topics) {
  final next = nextItemToOpen(topics);
  final index = next == null
      ? -1
      : topics.indexWhere((t) => t.items.any((i) => identical(i, next)));
  return index < 0 ? 0 : index;
}

/// 45 Whether an enrolled student finished the course: the server's
/// progress says so (`CourseDetail.progress.course_completed`); from an older
/// server without it, every lesson and quiz of the curriculum is complete.
bool courseFinished(CourseDetail course, List<Topic>? topics) {
  if (!course.enrolled) return false;
  final progress = course.progress;
  if (progress != null) return progress.courseCompleted;
  if (topics == null) return false;
  final items = [
    for (final topic in topics) ...topic.items.where((item) => item.opensInApp),
  ];
  return items.isNotEmpty && items.every((item) => item.completed);
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
    this.offline,
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
    offline: optObject(json, 'offline', LessonOffline.fromJson),
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

  /// 45 Whether the lesson can be saved for offline viewing; null (older
  /// servers, connected schools) means it can't.
  final LessonOffline? offline;

  /// The embed height rule for this lesson: its own override, else the
  /// site's setting.
  EmbedHeightMode embedHeightFor(ContentRules rules) =>
      embedHeight ?? rules.embedHeight;

  Lesson copyWith({bool? completed, int? positionSeconds}) => Lesson(
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
    positionSeconds: positionSeconds ?? this.positionSeconds,
    previousId: previousId,
    nextId: nextId,
    offline: offline,
  );
}

/// 45 Why a lesson can't be saved for offline viewing.
enum OfflineBlocker {
  /// The video plays from a video site (YouTube, Vimeo, Bunny Stream...).
  videoSite,

  /// The lesson shows a web page or embedded content.
  webPage,

  /// Downloads aren't on for this app.
  disabled,

  /// The server didn't say (an older server, a connected school).
  unknown,
}

/// 45 `Lesson.offline`.
class LessonOffline {
  const LessonOffline({required this.available, this.reason, this.sizeBytes});

  factory LessonOffline.fromJson(Json json) => LessonOffline(
    available: boolOr(json, 'available', false),
    reason: switch (json['reason']) {
      'video_site' => OfflineBlocker.videoSite,
      'web_page' => OfflineBlocker.webPage,
      'disabled' => OfflineBlocker.disabled,
      null => null,
      _ => OfflineBlocker.unknown,
    },
    sizeBytes: optInt(json, 'size_bytes'),
  );

  final bool available;
  final OfflineBlocker? reason;
  final int? sizeBytes;
}

enum DownloadFileKind { video, attachment, image }

/// 45 One file of a lesson saved for offline viewing.
class DownloadFile {
  const DownloadFile({
    required this.kind,
    required this.url,
    this.sourceUrl,
    this.name,
    this.sizeBytes,
    this.mimeType,
  });

  factory DownloadFile.fromJson(Json json) => DownloadFile(
    kind: enumFrom(
      DownloadFileKind.values,
      json['kind'],
      DownloadFileKind.attachment,
    ),
    url: reqString(json, 'url'),
    sourceUrl: optString(json, 'source_url'),
    name: optString(json, 'name'),
    sizeBytes: optInt(json, 'size_bytes'),
    mimeType: optString(json, 'mime_type'),
  );

  final DownloadFileKind kind;

  /// Where to download it: a short-lived link signed for the student.
  final String url;

  /// The address the lesson uses for it (an attachment's `url`, an image's
  /// `src`); null for the video.
  final String? sourceUrl;
  final String? name;
  final int? sizeBytes;
  final String? mimeType;
}

/// 45 `POST /lessons/{id}/download`.
class LessonDownload {
  const LessonDownload({
    required this.lessonId,
    required this.courseId,
    required this.files,
    required this.expiresAt,
    this.keepDays = 30,
  });

  factory LessonDownload.fromJson(Json json) => LessonDownload(
    lessonId: reqInt(json, 'lesson_id'),
    courseId: reqInt(json, 'course_id'),
    files: listOf(json, 'files', DownloadFile.fromJson),
    expiresAt: reqDate(json, 'expires_at'),
    keepDays: intOr(json, 'keep_days', 30),
  );

  final int lessonId;
  final int courseId;
  final List<DownloadFile> files;
  final DateTime expiresAt;
  final int keepDays;
}

/// 45 `POST /me/downloads/check`.
class DownloadCheck {
  const DownloadCheck({
    required this.allowed,
    required this.refused,
    required this.downloads,
    this.keepDays = 30,
  });

  factory DownloadCheck.fromJson(Json json) => DownloadCheck(
    allowed: [
      for (final id in (json['allowed'] as List?) ?? const [])
        if (id is int) id,
    ],
    refused: [
      for (final id in (json['refused'] as List?) ?? const [])
        if (id is int) id,
    ],
    downloads: boolOr(json, 'downloads', false),
    keepDays: intOr(json, 'keep_days', 30),
  );

  final List<int> allowed;
  final List<int> refused;
  final bool downloads;
  final int keepDays;
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
    this.completedAt,
  });

  factory Progress.fromJson(Json json) => Progress(
    courseId: reqInt(json, 'course_id'),
    completedItems: reqInt(json, 'completed_items'),
    totalItems: reqInt(json, 'total_items'),
    percent: reqInt(json, 'percent').clamp(0, 100),
    courseCompleted: boolOr(json, 'course_completed', false),
    completedAt: optDate(json, 'completed_at'),
  );

  final int courseId;
  final int completedItems;
  final int totalItems;
  final int percent;
  final bool courseCompleted;

  /// 45 When the course was completed, when known.
  final DateTime? completedAt;
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
