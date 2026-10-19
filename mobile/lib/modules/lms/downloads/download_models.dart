import 'package:flutter/foundation.dart';

import '../../../core/api/models/models.dart';

/// 45 Where a lesson saved for offline viewing stands.
enum SavedStatus { queued, downloading, paused, done, failed }

/// One file of a saved lesson, encrypted in the app's own storage under
/// [name].
@immutable
class SavedFile {
  const SavedFile({
    required this.name,
    required this.kind,
    required this.bytes,
    this.sourceUrl,
    this.fileName,
    this.mimeType,
  });

  factory SavedFile.fromJson(Map<String, dynamic> json) => SavedFile(
    name: json['name'] as String,
    kind: DownloadFileKind.values.firstWhere(
      (k) => k.name == json['kind'],
      orElse: () => DownloadFileKind.attachment,
    ),
    bytes: (json['bytes'] as num?)?.toInt() ?? 0,
    sourceUrl: json['source_url'] as String?,
    fileName: json['file_name'] as String?,
    mimeType: json['mime_type'] as String?,
  );

  final String name;
  final DownloadFileKind kind;

  /// Plain size in bytes.
  final int bytes;

  /// The address the lesson uses for it; null for the video.
  final String? sourceUrl;
  final String? fileName;
  final String? mimeType;

  Map<String, dynamic> toJson() => {
    'name': name,
    'kind': kind.name,
    'bytes': bytes,
    'source_url': sourceUrl,
    'file_name': fileName,
    'mime_type': mimeType,
  };
}

/// A lesson saved, or being saved, for offline viewing.
@immutable
class SavedLesson {
  const SavedLesson({
    required this.lessonId,
    required this.courseId,
    required this.title,
    required this.status,
    this.progress = 0,
    this.files = const [],
    this.savedAt,
    this.error,
  });

  factory SavedLesson.fromJson(Map<String, dynamic> json) => SavedLesson(
    lessonId: (json['lesson_id'] as num).toInt(),
    courseId: (json['course_id'] as num).toInt(),
    title: json['title'] as String? ?? '',
    status: SavedStatus.values.firstWhere(
      (s) => s.name == json['status'],
      orElse: () => SavedStatus.queued,
    ),
    progress: (json['progress'] as num?)?.toDouble() ?? 0,
    files: [
      for (final f in (json['files'] as List?) ?? const [])
        SavedFile.fromJson(Map<String, dynamic>.from(f as Map)),
    ],
    savedAt: DateTime.tryParse(json['saved_at'] as String? ?? ''),
    error: json['error'] as String?,
  );

  final int lessonId;
  final int courseId;
  final String title;
  final SavedStatus status;

  /// 0 to 1 while downloading.
  final double progress;
  final List<SavedFile> files;
  final DateTime? savedAt;

  /// Why the last try failed, in words for the student.
  final String? error;

  bool get done => status == SavedStatus.done;
  bool get active =>
      status == SavedStatus.queued || status == SavedStatus.downloading;
  int get bytes => files.fold(0, (sum, f) => sum + f.bytes);

  SavedFile? get video =>
      files.where((f) => f.kind == DownloadFileKind.video).firstOrNull;

  SavedLesson copyWith({
    SavedStatus? status,
    double? progress,
    List<SavedFile>? files,
    DateTime? savedAt,
    String? error,
    bool clearError = false,
    String? title,
  }) => SavedLesson(
    lessonId: lessonId,
    courseId: courseId,
    title: title ?? this.title,
    status: status ?? this.status,
    progress: progress ?? this.progress,
    files: files ?? this.files,
    savedAt: savedAt ?? this.savedAt,
    error: clearError ? null : (error ?? this.error),
  );

  Map<String, dynamic> toJson() => {
    'lesson_id': lessonId,
    'course_id': courseId,
    'title': title,
    'status': status.name,
    'progress': progress,
    'files': [for (final f in files) f.toJson()],
    'saved_at': savedAt?.toUtc().toIso8601String(),
    'error': error,
  };
}

/// A course with saved lessons.
@immutable
class SavedCourse {
  const SavedCourse({
    required this.courseId,
    required this.title,
    this.imageUrl,
  });

  factory SavedCourse.fromJson(Map<String, dynamic> json) => SavedCourse(
    courseId: (json['course_id'] as num).toInt(),
    title: json['title'] as String? ?? '',
    imageUrl: json['image_url'] as String?,
  );

  final int courseId;
  final String title;
  final String? imageUrl;

  Map<String, dynamic> toJson() => {
    'course_id': courseId,
    'title': title,
    'image_url': imageUrl,
  };
}

/// Everything saved on this phone, kept as `index.json` next to the files.
@immutable
class DownloadIndex {
  const DownloadIndex({
    this.courses = const {},
    this.lessons = const {},
    this.order = const [],
    this.checkedAt,
    this.keepDays = defaultKeepDays,
    this.wifiOnly = true,
  });

  factory DownloadIndex.fromJson(Map<String, dynamic> json) {
    final lessons = <int, SavedLesson>{
      for (final l in (json['lessons'] as List?) ?? const [])
        for (final lesson in [
          SavedLesson.fromJson(Map<String, dynamic>.from(l as Map)),
        ])
          lesson.lessonId: lesson,
    };
    return DownloadIndex(
      courses: {
        for (final c in (json['courses'] as List?) ?? const [])
          for (final course in [
            SavedCourse.fromJson(Map<String, dynamic>.from(c as Map)),
          ])
            course.courseId: course,
      },
      lessons: lessons,
      order: [
        for (final id in (json['order'] as List?) ?? const [])
          if (id is int && lessons.containsKey(id)) id,
      ],
      checkedAt: DateTime.tryParse(json['checked_at'] as String? ?? ''),
      keepDays: (json['keep_days'] as num?)?.toInt() ?? defaultKeepDays,
      wifiOnly: json['wifi_only'] as bool? ?? true,
    );
  }

  static const defaultKeepDays = 30;

  final Map<int, SavedCourse> courses;
  final Map<int, SavedLesson> lessons;

  /// Lessons in the order they were asked for (the download queue's order).
  final List<int> order;

  /// When the server last said the student may keep them.
  final DateTime? checkedAt;
  final int keepDays;

  /// Download only on Wi-Fi.
  final bool wifiOnly;

  bool get isEmpty => lessons.isEmpty;
  int get bytes => lessons.values.fold(0, (sum, l) => sum + l.bytes);

  List<SavedLesson> lessonsOf(int courseId) => [
    for (final id in order)
      if (lessons[id]?.courseId == courseId) lessons[id]!,
  ];

  int bytesOf(int courseId) =>
      lessonsOf(courseId).fold(0, (sum, l) => sum + l.bytes);

  /// No access check for longer than [keepDays]: the lessons go.
  bool expired(DateTime now) =>
      checkedAt != null &&
      now.difference(checkedAt!) > Duration(days: keepDays);

  /// Days left before the lessons need a check.
  int daysLeft(DateTime now) {
    final checked = checkedAt;
    if (checked == null) return keepDays;
    final left = keepDays - now.difference(checked).inHours / 24;
    return left <= 0 ? 0 : left.ceil();
  }

  DownloadIndex copyWith({
    Map<int, SavedCourse>? courses,
    Map<int, SavedLesson>? lessons,
    List<int>? order,
    DateTime? checkedAt,
    int? keepDays,
    bool? wifiOnly,
  }) => DownloadIndex(
    courses: courses ?? this.courses,
    lessons: lessons ?? this.lessons,
    order: order ?? this.order,
    checkedAt: checkedAt ?? this.checkedAt,
    keepDays: keepDays ?? this.keepDays,
    wifiOnly: wifiOnly ?? this.wifiOnly,
  );

  /// With [lesson] added or replaced.
  DownloadIndex withLesson(SavedLesson lesson) => copyWith(
    lessons: {...lessons, lesson.lessonId: lesson},
    order: order.contains(lesson.lessonId)
        ? order
        : [...order, lesson.lessonId],
  );

  /// Without these lessons, and without courses left with none.
  DownloadIndex without(Iterable<int> lessonIds) {
    final gone = lessonIds.toSet();
    final left = {
      for (final e in lessons.entries)
        if (!gone.contains(e.key)) e.key: e.value,
    };
    final used = {for (final l in left.values) l.courseId};
    return copyWith(
      lessons: left,
      order: [
        for (final id in order)
          if (!gone.contains(id)) id,
      ],
      courses: {
        for (final e in courses.entries)
          if (used.contains(e.key)) e.key: e.value,
      },
    );
  }

  Map<String, dynamic> toJson() => {
    'courses': [for (final c in courses.values) c.toJson()],
    'lessons': [for (final l in lessons.values) l.toJson()],
    'order': order,
    'checked_at': checkedAt?.toUtc().toIso8601String(),
    'keep_days': keepDays,
    'wifi_only': wifiOnly,
  };
}
