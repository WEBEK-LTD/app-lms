import 'course_work_models.dart';
import 'json.dart';
import 'learning_models.dart';
import 'lms_more_models.dart';
import '../../l10n/l10n.dart';

class Quiz {
  const Quiz({
    required this.id,
    required this.courseId,
    required this.title,
    required this.questionCount,
    required this.attemptsUsed,
    this.attemptsAllowed,
    this.timeLimitSeconds,
    this.passPercent,
    this.lastResult,
    this.exam,
  });

  factory Quiz.fromJson(Json json) => Quiz(
    id: reqInt(json, 'id'),
    courseId: reqInt(json, 'course_id'),
    title: reqString(json, 'title'),
    questionCount: reqInt(json, 'question_count'),
    timeLimitSeconds: optInt(json, 'time_limit_seconds'),
    passPercent: optInt(json, 'pass_percent'),
    attemptsAllowed: optInt(json, 'attempts_allowed'),
    attemptsUsed: reqInt(json, 'attempts_used'),
    lastResult: optObject(json, 'last_result', AttemptResult.fromJson),
    exam: optObject(json, 'exam', ExamInfo.fromJson),
  );

  final int id;
  final int courseId;
  final String title;
  final int questionCount;
  final int? timeLimitSeconds;
  final int? passPercent;

  /// Null means unlimited.
  final int? attemptsAllowed;
  final int attemptsUsed;
  final AttemptResult? lastResult;

  /// 113.7 A timed exam's window; null for a quiz.
  final ExamInfo? exam;

  /// 113.7 An exam starts while it's open (an attempt in progress goes on).
  bool get canStart =>
      (exam?.inProgress ?? false) ||
      ((exam == null || exam!.status == ExamStatus.open) &&
          (attemptsAllowed == null || attemptsUsed < attemptsAllowed!));
}

class Attempt {
  const Attempt({
    required this.id,
    required this.quizId,
    required this.startedAt,
    required this.questions,
    this.endsAt,
  });

  factory Attempt.fromJson(Json json) => Attempt(
    id: reqInt(json, 'id'),
    quizId: reqInt(json, 'quiz_id'),
    startedAt: reqDate(json, 'started_at'),
    endsAt: optDate(json, 'ends_at'),
    questions: reqListOf(json, 'questions', Question.fromJson),
  );

  final int id;
  final int quizId;
  final DateTime startedAt;
  final DateTime? endsAt;
  final List<Question> questions;
}

enum QuestionType {
  singleChoice,
  multipleChoice,
  trueFalse,
  shortAnswer,
  openEnded,
  fillInBlank,
  ordering,
  matching,
  imageAnswer,
  other,
}

class QuestionOption {
  const QuestionOption({required this.id, required this.label, this.imageUrl});

  factory QuestionOption.fromJson(Json json) => QuestionOption(
    id: reqString(json, 'id'),
    label: reqString(json, 'label'),
    imageUrl: optString(json, 'image_url'),
  );

  final String id;
  final String label;
  final String? imageUrl;
}

class Question {
  const Question({
    required this.id,
    required this.type,
    required this.title,
    required this.renderMode,
    this.descriptionHtml,
    this.webviewUrl,
    this.options = const [],
    this.points,
  });

  factory Question.fromJson(Json json) => Question(
    id: reqInt(json, 'id'),
    type: enumFromSnake(QuestionType.values, json['type'], QuestionType.other),
    title: reqString(json, 'title'),
    descriptionHtml: optString(json, 'description_html'),
    renderMode: enumFrom(
      RenderMode.values,
      json['render_mode'],
      RenderMode.webview,
    ),
    webviewUrl: optString(json, 'webview_url'),
    options: listOf(json, 'options', QuestionOption.fromJson),
    points: optDouble(json, 'points'),
  );

  final int id;
  final QuestionType type;
  final String title;
  final String? descriptionHtml;
  final RenderMode renderMode;
  final String? webviewUrl;
  final List<QuestionOption> options;
  final double? points;

  /// The app answers these natively; everything else uses [webviewUrl].
  bool get isNative =>
      renderMode == RenderMode.native &&
      (type == QuestionType.singleChoice ||
          type == QuestionType.multipleChoice ||
          type == QuestionType.trueFalse ||
          // 112.5 A short written answer.
          type == QuestionType.shortAnswer);

  String get typeLabel => switch (type) {
    QuestionType.singleChoice => currentL10n.questionSingleChoice,
    QuestionType.multipleChoice => currentL10n.questionMultipleChoice,
    QuestionType.trueFalse => currentL10n.questionTrueFalse,
    QuestionType.shortAnswer => currentL10n.questionShortAnswer,
    QuestionType.openEnded => currentL10n.questionOpenEnded,
    QuestionType.fillInBlank => currentL10n.questionFillInBlank,
    QuestionType.ordering => currentL10n.questionOrdering,
    QuestionType.matching => currentL10n.questionMatching,
    QuestionType.imageAnswer => currentL10n.questionImageAnswer,
    QuestionType.other => currentL10n.questionOther,
  };
}

class AnswerInput {
  const AnswerInput({
    required this.questionId,
    this.optionIds,
    this.text,
    this.order,
    this.pairs,
  });

  final int questionId;
  final List<String>? optionIds;
  final String? text;
  final List<String>? order;
  final Map<String, String>? pairs;

  Json toJson() => {
    'question_id': questionId,
    if (optionIds != null) 'option_ids': optionIds,
    if (text != null) 'text': text,
    if (order != null) 'order': order,
    if (pairs != null) 'pairs': pairs,
  };
}

/// 113.7 `awaitingResults`: an exam's results show once it closes.
enum AttemptStatus { passed, failed, pendingReview, awaitingResults }

class AttemptResult {
  const AttemptResult({
    required this.attemptId,
    required this.quizId,
    required this.status,
    this.quizTitle,
    this.scorePercent,
    this.finishedAt,
    this.review = const [],
    this.resultsAt,
  });

  factory AttemptResult.fromJson(Json json) => AttemptResult(
    attemptId: reqInt(json, 'attempt_id'),
    quizId: reqInt(json, 'quiz_id'),
    quizTitle: optString(json, 'quiz_title'),
    status: enumFromSnake(
      AttemptStatus.values,
      json['status'],
      AttemptStatus.pendingReview,
    ),
    scorePercent: optDouble(json, 'score_percent'),
    finishedAt: optDate(json, 'finished_at'),
    review: listOf(json, 'review', QuestionReview.fromJson),
    resultsAt: optDate(json, 'results_at'),
  );

  final int attemptId;
  final int quizId;
  final String? quizTitle;
  final AttemptStatus status;
  final double? scorePercent;
  final DateTime? finishedAt;

  /// 112.5 Each question with the student's answer and the right one, when
  /// the quiz shows them.
  final List<QuestionReview> review;

  /// 113.7 With [AttemptStatus.awaitingResults], when the exam closes.
  final DateTime? resultsAt;

  String get statusLabel => switch (status) {
    AttemptStatus.passed => currentL10n.attemptPassed,
    AttemptStatus.failed => currentL10n.attemptFailed,
    AttemptStatus.pendingReview => currentL10n.attemptPendingReview,
    AttemptStatus.awaitingResults => currentL10n.attemptAwaitingResults,
  };
}
