import 'json.dart';
import 'learning_models.dart';
import 'lms_more_models.dart';
import 'school_models.dart';

/// 112.5 Assignments and live classes of courses managed in Yallapp
/// (`Assignment`, `AssignmentSubmission`, `LiveSession`), and a quiz's
/// answers shown after an attempt (`AttemptResult.review`).

enum SubmissionStatus { submitted, graded, returned }

class AssignmentSubmission {
  const AssignmentSubmission({
    required this.id,
    required this.status,
    required this.maxPoints,
    required this.submittedAt,
    this.text = '',
    this.file,
    this.score,
    this.passed,
    this.feedback,
    this.gradedAt,
    this.late = false,
    this.attempt = 1,
    this.rubricResult = const [],
  });

  factory AssignmentSubmission.fromJson(Json json) => AssignmentSubmission(
    id: reqInt(json, 'id'),
    text: optString(json, 'text') ?? '',
    file: optObject(json, 'file', SchoolFile.fromJson),
    status: enumFrom(
      SubmissionStatus.values,
      json['status'],
      SubmissionStatus.submitted,
    ),
    score: optInt(json, 'score'),
    maxPoints: reqInt(json, 'max_points'),
    passed: json['passed'] is bool ? json['passed'] as bool : null,
    feedback: optString(json, 'feedback'),
    submittedAt: reqDate(json, 'submitted_at'),
    gradedAt: optDate(json, 'graded_at'),
    late: boolOr(json, 'late', false),
    attempt: intOr(json, 'attempt', 1),
    rubricResult: listOf(json, 'rubric_result', RubricResult.fromJson),
  );

  final int id;
  final String text;
  final SchoolFile? file;
  final SubmissionStatus status;
  final int? score;
  final int maxPoints;
  final bool? passed;

  /// 113.7 Which try it is, and each rubric criterion's level once graded.
  final int attempt;
  final List<RubricResult> rubricResult;
  final String? feedback;
  final DateTime submittedAt;
  final DateTime? gradedAt;
  final bool late;
}

class Assignment {
  const Assignment({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.title,
    required this.instructionsHtml,
    required this.maxPoints,
    this.dueAt,
    this.passPoints,
    this.attachments = const [],
    this.acceptsFiles = false,
    this.canSubmit = true,
    this.submission,
    this.rubric = const [],
    this.attemptsAllowed = 1,
    this.attemptsUsed = 0,
  });

  factory Assignment.fromJson(Json json) => Assignment(
    id: reqInt(json, 'id'),
    courseId: reqInt(json, 'course_id'),
    courseTitle: optString(json, 'course_title') ?? '',
    title: reqString(json, 'title'),
    instructionsHtml: optString(json, 'instructions_html') ?? '',
    dueAt: optDate(json, 'due_at'),
    maxPoints: reqInt(json, 'max_points'),
    passPoints: optInt(json, 'pass_points'),
    attachments: listOf(json, 'attachments', Attachment.fromJson),
    acceptsFiles: boolOr(json, 'accepts_files', false),
    canSubmit: boolOr(json, 'can_submit', true),
    submission: optObject(json, 'submission', AssignmentSubmission.fromJson),
    rubric: listOf(json, 'rubric', RubricCriterion.fromJson),
    attemptsAllowed: intOr(json, 'attempts_allowed', 1),
    attemptsUsed: intOr(json, 'attempts_used', 0),
  );

  final int id;
  final int courseId;
  final String courseTitle;
  final String title;
  final String instructionsHtml;
  final DateTime? dueAt;
  final int maxPoints;
  final int? passPoints;
  final List<Attachment> attachments;
  final bool acceptsFiles;
  final bool canSubmit;
  final AssignmentSubmission? submission;

  /// 113.7 The rubric it's graded with, and the tries it allows.
  final List<RubricCriterion> rubric;
  final int attemptsAllowed;
  final int attemptsUsed;
}

enum LiveStatus { upcoming, live, ended }

class LiveSession {
  const LiveSession({
    required this.id,
    required this.courseId,
    required this.courseTitle,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    required this.durationMinutes,
    required this.status,
    this.notes = '',
    this.joinUrl,
    this.recordingUrl,
  });

  factory LiveSession.fromJson(Json json) => LiveSession(
    id: reqInt(json, 'id'),
    courseId: reqInt(json, 'course_id'),
    courseTitle: optString(json, 'course_title') ?? '',
    title: reqString(json, 'title'),
    startsAt: reqDate(json, 'starts_at'),
    endsAt: reqDate(json, 'ends_at'),
    durationMinutes: reqInt(json, 'duration_minutes'),
    notes: optString(json, 'notes') ?? '',
    status: enumFrom(LiveStatus.values, json['status'], LiveStatus.upcoming),
    joinUrl: optString(json, 'join_url'),
    recordingUrl: optString(json, 'recording_url'),
  );

  final int id;
  final int courseId;
  final String courseTitle;
  final String title;
  final DateTime startsAt;
  final DateTime endsAt;
  final int durationMinutes;
  final String notes;
  final LiveStatus status;
  final String? joinUrl;
  final String? recordingUrl;
}

/// One question of a quiz's review: the student's answer and the right one.
class QuestionReview {
  const QuestionReview({
    required this.questionId,
    required this.title,
    required this.correct,
    this.shortAnswer = false,
    this.options = const {},
    this.chosen = const [],
    this.right = const [],
    this.text,
    this.accepted = const [],
  });

  factory QuestionReview.fromJson(Json json) => QuestionReview(
    questionId: reqInt(json, 'question_id'),
    title: reqString(json, 'title'),
    correct: reqBool(json, 'correct'),
    shortAnswer: json['type'] == 'short_answer',
    options: {
      for (final o in listOf(json, 'options', (o) => o))
        reqString(o, 'id'): reqString(o, 'label'),
    },
    chosen: stringList(json, 'chosen_option_ids'),
    right: stringList(json, 'right_option_ids'),
    text: optString(json, 'text'),
    accepted: stringList(json, 'accepted_answers'),
  );

  final int questionId;
  final String title;
  final bool correct;
  final bool shortAnswer;

  /// The options' labels by ID.
  final Map<String, String> options;
  final List<String> chosen;
  final List<String> right;
  final String? text;
  final List<String> accepted;

  /// What the student answered, as words; empty when nothing.
  String get given => shortAnswer
      ? (text ?? '').trim()
      : [for (final id in chosen) options[id] ?? id].join(', ');

  /// The right answer, as words.
  String get rightAnswer => shortAnswer
      ? accepted.join(' / ')
      : [for (final id in right) options[id] ?? id].join(', ');
}

/// 112.5 An assignment handed in on one of a teacher's courses
/// (`TeacherSubmission`).
class TeacherSubmission {
  const TeacherSubmission({
    required this.id,
    required this.courseTitle,
    required this.assignmentTitle,
    required this.studentName,
    required this.status,
    required this.maxPoints,
    required this.submittedAt,
    this.text = '',
    this.file,
    this.score,
    this.feedback,
    this.late = false,
    this.rubric = const [],
    this.rubricResult = const [],
    this.attempt = 1,
    this.attemptsAllowed = 1,
  });

  factory TeacherSubmission.fromJson(Json json) => TeacherSubmission(
    id: reqInt(json, 'id'),
    courseTitle: optString(json, 'course_title') ?? '',
    assignmentTitle: reqString(json, 'assignment_title'),
    studentName: optString(json, 'student_name') ?? '',
    text: optString(json, 'text') ?? '',
    file: optObject(json, 'file', SchoolFile.fromJson),
    status: enumFrom(
      SubmissionStatus.values,
      json['status'],
      SubmissionStatus.submitted,
    ),
    score: optInt(json, 'score'),
    maxPoints: reqInt(json, 'max_points'),
    feedback: optString(json, 'feedback'),
    submittedAt: reqDate(json, 'submitted_at'),
    late: boolOr(json, 'late', false),
    rubric: listOf(json, 'rubric', RubricCriterion.fromJson),
    rubricResult: listOf(json, 'rubric_result', RubricResult.fromJson),
    attempt: intOr(json, 'attempt', 1),
    attemptsAllowed: intOr(json, 'attempts_allowed', 1),
  );

  final int id;
  final String courseTitle;
  final String assignmentTitle;
  final String studentName;
  final String text;
  final SchoolFile? file;
  final SubmissionStatus status;
  final int? score;
  final int maxPoints;
  final String? feedback;
  final DateTime submittedAt;
  final bool late;

  /// 113.7 The rubric to grade with, the levels chosen, which try it is.
  final List<RubricCriterion> rubric;
  final List<RubricResult> rubricResult;
  final int attempt;
  final int attemptsAllowed;
}
