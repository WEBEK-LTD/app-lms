import 'catalog_models.dart';
import 'community_models.dart';
import 'json.dart';

/// 105.3 Academies with many teachers: `Config.instructors`, the academy's
/// teachers as students see them, applying to teach, and the teacher's own
/// courses, questions and earnings (tags Teachers and Teacher in
/// docs/api/openapi.yaml).

/// `Config.instructors`.
class InstructorsConfig {
  const InstructorsConfig({
    this.applications = false,
    this.timezone = 'Africa/Cairo',
  });

  factory InstructorsConfig.fromJson(Json json) => InstructorsConfig(
    applications: boolOr(json, 'applications', false),
    timezone: optString(json, 'timezone') ?? 'Africa/Cairo',
  );

  /// People may apply to teach from the app.
  final bool applications;
  final String timezone;
}

/// A teacher in lists (`TeacherSummary`).
class TeacherSummary {
  const TeacherSummary({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.headline,
    this.subjects = const [],
    this.rating,
    this.ratingCount = 0,
    this.courseCount = 0,
    this.featured = false,
  });

  factory TeacherSummary.fromJson(Json json) => TeacherSummary(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    avatarUrl: optString(json, 'avatar_url'),
    headline: optString(json, 'headline'),
    subjects: stringList(json, 'subjects'),
    rating: optDouble(json, 'rating'),
    ratingCount: intOr(json, 'rating_count', 0),
    courseCount: intOr(json, 'course_count', 0),
    featured: boolOr(json, 'featured', false),
  );

  final int id;
  final String name;
  final String? avatarUrl;
  final String? headline;
  final List<String> subjects;
  final double? rating;
  final int ratingCount;
  final int courseCount;
  final bool featured;
}

/// `GET /teachers`: a page of teachers and every subject to filter by.
class TeacherPage {
  const TeacherPage({
    required this.items,
    this.subjects = const [],
    this.page = 1,
    this.totalPages = 1,
  });

  factory TeacherPage.fromJson(Json json) => TeacherPage(
    items: listOf(json, 'items', TeacherSummary.fromJson),
    subjects: stringList(json, 'subjects'),
    page: intOr(json, 'page', 1),
    totalPages: intOr(json, 'total_pages', 1),
  );

  final List<TeacherSummary> items;
  final List<String> subjects;
  final int page;
  final int totalPages;
}

/// A student's review of a teacher (`TeacherReview`).
class TeacherReview {
  const TeacherReview({
    required this.id,
    required this.rating,
    required this.text,
    required this.author,
    required this.createdAt,
    this.mine = false,
    this.hidden = false,
  });

  factory TeacherReview.fromJson(Json json) => TeacherReview(
    id: reqInt(json, 'id'),
    rating: reqInt(json, 'rating'),
    text: optString(json, 'text') ?? '',
    author: Person.fromJson(asJson(json['author'], 'author')),
    createdAt: reqDate(json, 'created_at'),
    mine: boolOr(json, 'mine', false),
    hidden: boolOr(json, 'hidden', false),
  );

  final int id;
  final int rating;
  final String text;
  final Person author;
  final DateTime createdAt;
  final bool mine;
  final bool hidden;
}

/// A teacher's page (`TeacherDetail`).
class TeacherDetail extends TeacherSummary {
  const TeacherDetail({
    required super.id,
    required super.name,
    super.avatarUrl,
    super.headline,
    super.subjects,
    super.rating,
    super.ratingCount,
    super.courseCount,
    super.featured,
    this.bio = '',
    this.studentCount = 0,
    this.followerCount = 0,
    this.following = false,
    this.canReview = false,
    this.myReview,
    this.courses = const [],
  });

  factory TeacherDetail.fromJson(Json json) {
    final s = TeacherSummary.fromJson(json);
    return TeacherDetail(
      id: s.id,
      name: s.name,
      avatarUrl: s.avatarUrl,
      headline: s.headline,
      subjects: s.subjects,
      rating: s.rating,
      ratingCount: s.ratingCount,
      courseCount: s.courseCount,
      featured: s.featured,
      bio: optString(json, 'bio') ?? '',
      studentCount: intOr(json, 'student_count', 0),
      followerCount: intOr(json, 'follower_count', 0),
      following: boolOr(json, 'following', false),
      canReview: boolOr(json, 'can_review', false),
      myReview: optObject(json, 'my_review', TeacherReview.fromJson),
      courses: listOf(json, 'courses', CourseSummary.fromJson),
    );
  }

  final String bio;
  final int studentCount;
  final int followerCount;
  final bool following;
  final bool canReview;
  final TeacherReview? myReview;
  final List<CourseSummary> courses;
}

enum ApplicationStatus { pending, approved, declined }

/// The signed-in person's application to teach (`TeacherApplication`).
class TeacherApplication {
  const TeacherApplication({
    required this.status,
    required this.name,
    this.bio = '',
    this.subjects = const [],
    this.note,
    required this.createdAt,
  });

  factory TeacherApplication.fromJson(Json json) => TeacherApplication(
    status: enumFrom(
      ApplicationStatus.values,
      json['status'],
      ApplicationStatus.pending,
    ),
    name: reqString(json, 'name'),
    bio: optString(json, 'bio') ?? '',
    subjects: stringList(json, 'subjects'),
    note: optString(json, 'note'),
    createdAt: reqDate(json, 'created_at'),
  );

  final ApplicationStatus status;
  final String name;
  final String bio;
  final List<String> subjects;

  /// The academy's note when it declined.
  final String? note;
  final DateTime createdAt;
}

/// The signed-in teacher (`TeacherProfile`).
class TeacherProfile {
  const TeacherProfile({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.bio = '',
    this.subjects = const [],
    this.sharePercent = 0,
    this.rating,
    this.ratingCount = 0,
    this.followerCount = 0,
    this.studentCount = 0,
  });

  factory TeacherProfile.fromJson(Json json) => TeacherProfile(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    avatarUrl: optString(json, 'avatar_url'),
    bio: optString(json, 'bio') ?? '',
    subjects: stringList(json, 'subjects'),
    sharePercent: optDouble(json, 'share_percent') ?? 0,
    rating: optDouble(json, 'rating'),
    ratingCount: intOr(json, 'rating_count', 0),
    followerCount: intOr(json, 'follower_count', 0),
    studentCount: intOr(json, 'student_count', 0),
  );

  final int id;
  final String name;
  final String? avatarUrl;
  final String bio;
  final List<String> subjects;
  final double sharePercent;
  final double? rating;
  final int ratingCount;
  final int followerCount;
  final int studentCount;
}

/// Where a teacher's course is.
enum CourseStage { draft, inReview, returned, published, hidden }

enum CourseLevel { beginner, intermediate, advanced }

enum TeacherLessonKind { video, pdf, text }

class TeacherLesson {
  const TeacherLesson({
    required this.id,
    required this.title,
    this.kind = TeacherLessonKind.text,
    this.durationMinutes,
    this.preview = false,
  });

  factory TeacherLesson.fromJson(Json json) => TeacherLesson(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    kind: enumFrom(
      TeacherLessonKind.values,
      json['kind'],
      TeacherLessonKind.text,
    ),
    durationMinutes: optInt(json, 'duration_minutes'),
    preview: boolOr(json, 'preview', false),
  );

  final int id;
  final String title;
  final TeacherLessonKind kind;
  final int? durationMinutes;
  final bool preview;
}

class TeacherSection {
  const TeacherSection({
    required this.id,
    required this.title,
    this.lessons = const [],
  });

  factory TeacherSection.fromJson(Json json) => TeacherSection(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    lessons: listOf(json, 'lessons', TeacherLesson.fromJson),
  );

  final int id;
  final String title;
  final List<TeacherLesson> lessons;
}

/// One of the teacher's courses, at any stage (`TeacherCourse`).
class TeacherCourse {
  const TeacherCourse({
    required this.id,
    required this.title,
    this.description = '',
    this.price = '0.00',
    this.priceFormatted = '',
    this.level,
    this.categoryId,
    this.stage = CourseStage.draft,
    this.reviewNote,
    this.studentCount = 0,
    this.lessonCount = 0,
    this.sections = const [],
  });

  factory TeacherCourse.fromJson(Json json) => TeacherCourse(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    description: optString(json, 'description') ?? '',
    price: optString(json, 'price') ?? '0.00',
    priceFormatted: optString(json, 'price_formatted') ?? '',
    level: json['level'] == null
        ? null
        : enumFrom(CourseLevel.values, json['level'], CourseLevel.beginner),
    categoryId: optInt(json, 'category_id'),
    stage: enumFromSnake(CourseStage.values, json['stage'], CourseStage.draft),
    reviewNote: optString(json, 'review_note'),
    studentCount: intOr(json, 'student_count', 0),
    lessonCount: intOr(json, 'lesson_count', 0),
    sections: listOf(json, 'sections', TeacherSection.fromJson),
  );

  final int id;
  final String title;
  final String description;
  final String price;
  final String priceFormatted;
  final CourseLevel? level;
  final int? categoryId;
  final CourseStage stage;
  final String? reviewNote;
  final int studentCount;
  final int lessonCount;
  final List<TeacherSection> sections;

  /// The teacher may change its details and remove its lessons.
  bool get editable =>
      stage == CourseStage.draft || stage == CourseStage.returned;

  /// The teacher may add sections and lessons: anything but in review.
  bool get growable => stage != CourseStage.inReview;

  bool get free => (double.tryParse(price) ?? 0) == 0;
}

/// `GET /teacher/courses`.
class TeacherCourses {
  const TeacherCourses({
    required this.items,
    this.categories = const [],
    this.currency = '',
  });

  factory TeacherCourses.fromJson(Json json) => TeacherCourses(
    items: listOf(json, 'items', TeacherCourse.fromJson),
    categories: listOf(json, 'categories', Category.fromJson),
    currency: optString(json, 'currency') ?? '',
  );

  final List<TeacherCourse> items;
  final List<Category> categories;
  final String currency;
}

/// What a teacher sends to start or change a course.
class TeacherCourseInput {
  const TeacherCourseInput({
    required this.title,
    this.description = '',
    this.price = '0',
    this.level,
    this.categoryId,
  });

  final String title;
  final String description;
  final String price;
  final CourseLevel? level;
  final int? categoryId;

  Json toJson() => {
    'title': title.trim(),
    'description': description.trim(),
    'price': price.trim().isEmpty ? '0' : price.trim(),
    'level': level?.name,
    'category_id': categoryId,
  };
}

/// What a teacher sends to add a lesson.
class TeacherLessonInput {
  const TeacherLessonInput({
    required this.sectionId,
    required this.title,
    this.text = '',
    this.videoUrl,
    this.uploadId,
    this.durationMinutes,
    this.preview = false,
  });

  final int sectionId;
  final String title;
  final String text;
  final String? videoUrl;
  final String? uploadId;
  final int? durationMinutes;
  final bool preview;

  Json toJson() => {
    'section_id': sectionId,
    'title': title.trim(),
    'text': text.trim(),
    'video_url': videoUrl,
    'upload_id': uploadId,
    'duration_minutes': durationMinutes,
    'preview': preview,
  };
}

/// A student's question in one of the teacher's courses (`TeacherQuestion`).
class TeacherQuestion {
  const TeacherQuestion({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.text,
    required this.studentName,
    this.answered = false,
    this.answerCount = 0,
    required this.updatedAt,
  });

  factory TeacherQuestion.fromJson(Json json) => TeacherQuestion(
    id: reqInt(json, 'id'),
    courseId: reqInt(json, 'course_id'),
    courseTitle: optString(json, 'course_title') ?? '',
    text: reqString(json, 'text'),
    studentName: optString(json, 'student_name') ?? '',
    answered: boolOr(json, 'answered', false),
    answerCount: intOr(json, 'answer_count', 0),
    updatedAt: reqDate(json, 'updated_at'),
  );

  final int id;
  final int courseId;
  final String courseTitle;
  final String text;
  final String studentName;
  final bool answered;
  final int answerCount;
  final DateTime updatedAt;
}

enum TeacherPeriod { month, lastMonth, year }

class CourseEarnings {
  const CourseEarnings({
    required this.id,
    required this.title,
    this.sales = 0,
    this.earnedFormatted = '',
  });

  factory CourseEarnings.fromJson(Json json) => CourseEarnings(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    sales: intOr(json, 'sales', 0),
    earnedFormatted: optString(json, 'earned_formatted') ?? '',
  );

  final int id;
  final String title;
  final int sales;
  final String earnedFormatted;
}

/// `GET /teacher/earnings`.
class TeacherEarnings {
  const TeacherEarnings({
    required this.period,
    this.from,
    this.to,
    this.sales = 0,
    this.salesFormatted = '',
    this.refundsFormatted = '',
    this.sharePercent = 0,
    this.earnedFormatted = '',
    this.courses = const [],
  });

  factory TeacherEarnings.fromJson(Json json) => TeacherEarnings(
    period: enumFromSnake(
      TeacherPeriod.values,
      json['period'],
      TeacherPeriod.month,
    ),
    from: optDate(json, 'from'),
    to: optDate(json, 'to'),
    sales: intOr(json, 'sales', 0),
    salesFormatted: optString(json, 'sales_formatted') ?? '',
    refundsFormatted: optString(json, 'refunds_formatted') ?? '',
    sharePercent: optDouble(json, 'share_percent') ?? 0,
    earnedFormatted: optString(json, 'earned_formatted') ?? '',
    courses: listOf(json, 'courses', CourseEarnings.fromJson),
  );

  final TeacherPeriod period;
  final DateTime? from;
  final DateTime? to;
  final int sales;
  final String salesFormatted;
  final String refundsFormatted;
  final double sharePercent;
  final String earnedFormatted;
  final List<CourseEarnings> courses;
}
