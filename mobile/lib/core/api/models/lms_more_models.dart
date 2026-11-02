import 'catalog_models.dart';
import 'json.dart';

/// 113.7 More of a real LMS: prerequisites and learning paths, points and
/// badges with the courses' leaderboards, rubrics, timed exams, and the
/// student's own notes and bookmarks (`LearningPath`, `Achievements`,
/// `Leaderboard`, `RubricCriterion`, `RubricResult`, `Quiz.exam`,
/// `LessonNote`).

/// A course to finish before enrolling in another (`CourseDetail.prerequisites`).
class Prerequisite {
  const Prerequisite({
    required this.id,
    required this.title,
    required this.completed,
  });

  factory Prerequisite.fromJson(Json json) => Prerequisite(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    completed: boolOr(json, 'completed', false),
  );

  final int id;
  final String title;
  final bool completed;
}

class PathCourse {
  const PathCourse({
    required this.course,
    required this.completed,
    required this.percent,
    required this.locked,
    this.afterCourseId,
  });

  factory PathCourse.fromJson(Json json) => PathCourse(
    course: CourseSummary.fromJson(asJson(json['course'], 'course')),
    completed: boolOr(json, 'completed', false),
    percent: intOr(json, 'percent', 0).clamp(0, 100),
    locked: boolOr(json, 'locked', false),
    afterCourseId: optInt(json, 'after_course_id'),
  );

  final CourseSummary course;
  final bool completed;
  final int percent;

  /// The student can't enrol yet: the course before it isn't finished.
  final bool locked;
  final int? afterCourseId;
}

class LearningPath {
  const LearningPath({
    required this.id,
    required this.title,
    required this.courses,
    this.description = '',
    this.inOrder = false,
    this.completedCount = 0,
    this.percent = 0,
  });

  factory LearningPath.fromJson(Json json) => LearningPath(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    description: optString(json, 'description') ?? '',
    inOrder: boolOr(json, 'in_order', false),
    completedCount: intOr(json, 'completed_count', 0),
    percent: intOr(json, 'percent', 0).clamp(0, 100),
    courses: listOf(json, 'courses', PathCourse.fromJson),
  );

  final int id;
  final String title;
  final String description;
  final bool inOrder;
  final int completedCount;
  final int percent;
  final List<PathCourse> courses;
}

/// The badges the server knows; one it adds later shows as [unknown].
enum BadgeKind {
  firstLesson,
  firstQuiz,
  perfectQuiz,
  firstAssignment,
  streak7,
  courseCompleted,
  pathCompleted,
  points500,
  unknown,
}

BadgeKind _badgeKind(Object? id) => switch (id) {
  'first_lesson' => BadgeKind.firstLesson,
  'first_quiz' => BadgeKind.firstQuiz,
  'perfect_quiz' => BadgeKind.perfectQuiz,
  'first_assignment' => BadgeKind.firstAssignment,
  'streak_7' => BadgeKind.streak7,
  'course_completed' => BadgeKind.courseCompleted,
  'path_completed' => BadgeKind.pathCompleted,
  'points_500' => BadgeKind.points500,
  _ => BadgeKind.unknown,
};

class EarnedBadge {
  const EarnedBadge({
    required this.kind,
    required this.icon,
    required this.earned,
    this.earnedAt,
  });

  factory EarnedBadge.fromJson(Json json) => EarnedBadge(
    kind: _badgeKind(json['id']),
    icon: optString(json, 'icon') ?? '',
    earned: boolOr(json, 'earned', false),
    earnedAt: optDate(json, 'earned_at'),
  );

  final BadgeKind kind;

  /// A Material Symbols name (`symbolByName`).
  final String icon;
  final bool earned;
  final DateTime? earnedAt;
}

class Achievements {
  const Achievements({
    required this.points,
    required this.streakDays,
    required this.bestStreak,
    required this.badges,
    this.courses = const [],
  });

  factory Achievements.fromJson(Json json) => Achievements(
    points: intOr(json, 'points', 0),
    streakDays: intOr(json, 'streak_days', 0),
    bestStreak: intOr(json, 'best_streak', 0),
    badges: listOf(
      json,
      'badges',
      EarnedBadge.fromJson,
    ).where((b) => b.kind != BadgeKind.unknown).toList(),
    courses: listOf(
      json,
      'courses',
      (c) => (
        courseId: reqInt(c, 'course_id'),
        title: reqString(c, 'course_title'),
        points: intOr(c, 'points', 0),
      ),
    ),
  );

  final int points;
  final int streakDays;
  final int bestStreak;
  final List<EarnedBadge> badges;
  final List<({int courseId, String title, int points})> courses;
}

class LeaderRow {
  const LeaderRow({
    required this.rank,
    required this.name,
    required this.points,
    this.me = false,
  });

  factory LeaderRow.fromJson(Json json) => LeaderRow(
    rank: reqInt(json, 'rank'),
    name: reqString(json, 'name'),
    points: intOr(json, 'points', 0),
    me: boolOr(json, 'me', false),
  );

  final int rank;

  /// The first name and the last name's initial.
  final String name;
  final int points;
  final bool me;
}

class Leaderboard {
  const Leaderboard({
    required this.courseId,
    required this.cohort,
    required this.items,
    this.totalStudents = 0,
    this.myRank,
    this.myPoints,
    this.cohortName,
  });

  factory Leaderboard.fromJson(Json json) => Leaderboard(
    courseId: reqInt(json, 'course_id'),
    cohort: json['scope'] == 'cohort',
    cohortName: json['cohort'] is Map
        ? optString(asJson(json['cohort']), 'name')
        : null,
    totalStudents: intOr(json, 'total_students', 0),
    myRank: optInt(json, 'my_rank'),
    myPoints: optInt(json, 'my_points'),
    items: listOf(json, 'items', LeaderRow.fromJson),
  );

  final int courseId;

  /// The student's cohort's board, not the whole course's.
  final bool cohort;
  final String? cohortName;
  final int totalStudents;
  final int? myRank;
  final int? myPoints;
  final List<LeaderRow> items;
}

class RubricLevel {
  const RubricLevel({
    required this.id,
    required this.label,
    required this.points,
  });

  factory RubricLevel.fromJson(Json json) => RubricLevel(
    id: reqInt(json, 'id'),
    label: reqString(json, 'label'),
    points: intOr(json, 'points', 0),
  );

  final int id;
  final String label;
  final int points;
}

class RubricCriterion {
  const RubricCriterion({
    required this.id,
    required this.title,
    required this.levels,
  });

  factory RubricCriterion.fromJson(Json json) => RubricCriterion(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    levels: listOf(json, 'levels', RubricLevel.fromJson),
  );

  final int id;
  final String title;
  final List<RubricLevel> levels;

  int get maxPoints => levels.fold(0, (m, l) => l.points > m ? l.points : m);
}

/// A rubric criterion with the level the teacher chose.
class RubricResult {
  const RubricResult({
    required this.criterionId,
    required this.title,
    required this.points,
    required this.maxPoints,
    this.levelId,
    this.levelLabel,
  });

  factory RubricResult.fromJson(Json json) => RubricResult(
    criterionId: reqInt(json, 'criterion_id'),
    title: reqString(json, 'title'),
    levelId: optInt(json, 'level_id'),
    levelLabel: optString(json, 'level_label'),
    points: intOr(json, 'points', 0),
    maxPoints: intOr(json, 'max_points', 0),
  );

  final int criterionId;
  final String title;
  final int? levelId;
  final String? levelLabel;
  final int points;
  final int maxPoints;
}

enum ExamStatus { upcoming, open, closed }

/// `Quiz.exam`: a timed exam's window and the attempt going on.
class ExamInfo {
  const ExamInfo({
    required this.status,
    this.opensAt,
    this.closesAt,
    this.resultsAfterClose = false,
    this.inProgress = false,
  });

  factory ExamInfo.fromJson(Json json) => ExamInfo(
    opensAt: optDate(json, 'opens_at'),
    closesAt: optDate(json, 'closes_at'),
    status: enumFrom(ExamStatus.values, json['status'], ExamStatus.open),
    resultsAfterClose: boolOr(json, 'results_after_close', false),
    inProgress: json['in_progress'] is Map,
  );

  final DateTime? opensAt;
  final DateTime? closesAt;
  final ExamStatus status;
  final bool resultsAfterClose;

  /// The student has an attempt going on (starting gives it back).
  final bool inProgress;
}

class LessonNote {
  const LessonNote({
    required this.id,
    required this.lessonId,
    required this.text,
    required this.createdAt,
    this.lessonTitle = '',
    this.positionSeconds,
  });

  factory LessonNote.fromJson(Json json) => LessonNote(
    id: reqInt(json, 'id'),
    lessonId: reqInt(json, 'lesson_id'),
    lessonTitle: optString(json, 'lesson_title') ?? '',
    text: reqString(json, 'text'),
    positionSeconds: optInt(json, 'position_seconds'),
    createdAt: reqDate(json, 'created_at'),
  );

  final int id;
  final int lessonId;
  final String lessonTitle;
  final String text;

  /// Where the video was when it was written.
  final int? positionSeconds;
  final DateTime createdAt;
}

/// `GET /lessons/{id}/notes`.
class LessonNotes {
  const LessonNotes({required this.items, this.bookmarked = false});

  factory LessonNotes.fromJson(Json json) => LessonNotes(
    bookmarked: boolOr(json, 'bookmarked', false),
    items: listOf(json, 'items', LessonNote.fromJson),
  );

  final bool bookmarked;
  final List<LessonNote> items;
}

/// `GET /courses/{id}/notes`: the student's notes and bookmarks in a course.
class CourseNotes {
  const CourseNotes({required this.items, required this.bookmarks});

  factory CourseNotes.fromJson(Json json) => CourseNotes(
    items: listOf(json, 'items', LessonNote.fromJson),
    bookmarks: listOf(
      json,
      'bookmarks',
      (b) => (
        lessonId: reqInt(b, 'lesson_id'),
        title: optString(b, 'lesson_title') ?? '',
      ),
    ),
  );

  final List<LessonNote> items;
  final List<({int lessonId, String title})> bookmarks;
}
