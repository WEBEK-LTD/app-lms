import 'json.dart';
import 'school_models.dart';

/// 113.5 The syllabus and the teachers' reports to the school
/// (`ClassSyllabus`, `ReportTemplate`, `TeacherReport`, `SharedReport` in
/// docs/api/openapi.yaml).

enum SyllabusStatus { behind, onPlan, ahead }

/// A lesson or topic of the syllabus, and whether the class covered it.
class SyllabusTopic {
  const SyllabusTopic({
    required this.id,
    required this.title,
    required this.startsOn,
    required this.endsOn,
    this.due = false,
    this.now = false,
    this.coveredOn,
    this.note,
  });

  factory SyllabusTopic.fromJson(Json json) => SyllabusTopic(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    startsOn: reqString(json, 'starts_on'),
    endsOn: reqString(json, 'ends_on'),
    due: boolOr(json, 'due', false),
    now: boolOr(json, 'now', false),
    coveredOn: optString(json, 'covered_on'),
    note: optString(json, 'note'),
  );

  final int id;
  final String title;
  final String startsOn;
  final String endsOn;

  /// The plan says it is done by now.
  final bool due;

  /// Today is one of its planned days.
  final bool now;
  final String? coveredOn;
  final String? note;

  bool get covered => coveredOn != null;
}

class SyllabusUnit {
  const SyllabusUnit({
    required this.id,
    required this.title,
    this.topics = const [],
  });

  factory SyllabusUnit.fromJson(Json json) => SyllabusUnit(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    topics: listOf(json, 'topics', SyllabusTopic.fromJson),
  );

  final int id;
  final String title;
  final List<SyllabusTopic> topics;
}

/// A subject's syllabus for the class, and where the class is in it.
class SyllabusSubject {
  const SyllabusSubject({
    required this.subjectId,
    required this.subject,
    this.total = 0,
    this.covered = 0,
    this.due = 0,
    this.percent = 0,
    this.plannedPercent = 0,
    this.behindBy = 0,
    this.status = SyllabusStatus.onPlan,
    this.plannedTopic,
    this.units = const [],
  });

  factory SyllabusSubject.fromJson(Json json) => SyllabusSubject(
    subjectId: reqInt(json, 'subject_id'),
    subject: reqString(json, 'subject'),
    total: intOr(json, 'total', 0),
    covered: intOr(json, 'covered', 0),
    due: intOr(json, 'due', 0),
    percent: intOr(json, 'percent', 0),
    plannedPercent: intOr(json, 'planned_percent', 0),
    behindBy: intOr(json, 'behind_by', 0),
    status: enumFromSnake(
      SyllabusStatus.values,
      json['status'],
      SyllabusStatus.onPlan,
    ),
    plannedTopic: optObject(
      json,
      'planned_topic',
      (t) => reqString(t, 'title'),
    ),
    units: listOf(json, 'units', SyllabusUnit.fromJson),
  );

  final int subjectId;
  final String subject;
  final int total;
  final int covered;
  final int due;
  final int percent;
  final int plannedPercent;
  final int behindBy;
  final SyllabusStatus status;

  /// The topic the plan has for today, else the next one.
  final String? plannedTopic;
  final List<SyllabusUnit> units;
}

/// `GET /classroom/classes/{class_id}/syllabus`.
class ClassSyllabus {
  const ClassSyllabus({
    required this.classId,
    required this.className,
    required this.grade,
    required this.today,
    this.subjects = const [],
  });

  factory ClassSyllabus.fromJson(Json json) => ClassSyllabus(
    classId: reqInt(json, 'class_id'),
    className: reqString(json, 'class_name'),
    grade: optString(json, 'grade') ?? '',
    today: reqString(json, 'today'),
    subjects: listOf(json, 'subjects', SyllabusSubject.fromJson),
  );

  final int classId;
  final String className;
  final String grade;

  /// In the school's time zone.
  final String today;
  final List<SyllabusSubject> subjects;
}

// Reports

enum ReportKind { student, classroom }

enum ReportFieldType { text, choice, rating }

enum ReportStatus { draft, sent, returned, approved }

ReportKind _kind(Object? wire) =>
    wire == 'class' ? ReportKind.classroom : ReportKind.student;

class ReportField {
  const ReportField({
    required this.id,
    required this.label,
    this.type = ReportFieldType.text,
    this.options = const [],
    this.required = false,
  });

  factory ReportField.fromJson(Json json) => ReportField(
    id: reqString(json, 'id'),
    label: reqString(json, 'label'),
    type: enumFromSnake(
      ReportFieldType.values,
      json['type'],
      ReportFieldType.text,
    ),
    options: stringList(json, 'options'),
    required: boolOr(json, 'required', false),
  );

  final String id;
  final String label;
  final ReportFieldType type;
  final List<String> options;
  final bool required;
}

class ReportTemplate {
  const ReportTemplate({
    required this.id,
    required this.kind,
    required this.name,
    this.fields = const [],
  });

  factory ReportTemplate.fromJson(Json json) => ReportTemplate(
    id: reqInt(json, 'id'),
    kind: _kind(json['kind']),
    name: reqString(json, 'name'),
    fields: listOf(json, 'fields', ReportField.fromJson),
  );

  final int id;
  final ReportKind kind;
  final String name;
  final List<ReportField> fields;
}

/// The answers by field id: a rating is an int, the others text.
typedef ReportAnswers = Map<String, Object>;

ReportAnswers _answers(Object? raw) => {
  if (raw is Map)
    for (final MapEntry(:key, :value) in raw.entries)
      if (value is String || value is num)
        '$key': value is num ? value.toInt() : value as String,
};

class ReportComment {
  const ReportComment({
    required this.fromSchool,
    required this.name,
    required this.text,
    required this.at,
  });

  factory ReportComment.fromJson(Json json) => ReportComment(
    fromSchool: json['by'] == 'school',
    name: optString(json, 'name') ?? '',
    text: reqString(json, 'text'),
    at: reqDate(json, 'at'),
  );

  final bool fromSchool;
  final String name;
  final String text;
  final DateTime at;
}

/// The period a report covers.
class ReportRange {
  const ReportRange({required this.from, required this.to});

  factory ReportRange.fromJson(Json json) =>
      ReportRange(from: reqString(json, 'from'), to: reqString(json, 'to'));

  final String from;
  final String to;
}

/// One of the teacher's reports to the school (`TeacherReport`).
class TeacherReport {
  const TeacherReport({
    required this.id,
    required this.kind,
    required this.status,
    required this.templateName,
    required this.updatedAt,
    this.templateId,
    this.student,
    this.classId,
    this.className,
    this.subjectId,
    this.subject,
    this.period,
    this.fields = const [],
    this.answers = const {},
    this.comments = const [],
    this.read = false,
    this.shared = false,
    this.sentAt,
  });

  factory TeacherReport.fromJson(Json json) => TeacherReport(
    id: reqInt(json, 'id'),
    kind: _kind(json['kind']),
    status: enumFromSnake(
      ReportStatus.values,
      json['status'],
      ReportStatus.draft,
    ),
    templateId: optInt(json, 'template_id'),
    templateName: reqString(json, 'template_name'),
    student: optObject(json, 'student', SchoolStudent.fromJson),
    classId: optInt(json, 'class_id'),
    className: optString(json, 'class_name'),
    subjectId: optInt(json, 'subject_id'),
    subject: optString(json, 'subject'),
    period: optObject(json, 'period', ReportRange.fromJson),
    fields: listOf(json, 'fields', ReportField.fromJson),
    answers: _answers(json['answers']),
    comments: listOf(json, 'comments', ReportComment.fromJson),
    read: boolOr(json, 'read', false),
    shared: boolOr(json, 'shared', false),
    updatedAt: reqDate(json, 'updated_at'),
    sentAt: optDate(json, 'sent_at'),
  );

  final int id;
  final ReportKind kind;
  final ReportStatus status;
  final int? templateId;
  final String templateName;
  final SchoolStudent? student;
  final int? classId;
  final String? className;
  final int? subjectId;
  final String? subject;
  final ReportRange? period;
  final List<ReportField> fields;
  final ReportAnswers answers;
  final List<ReportComment> comments;

  /// The school opened it after it was sent.
  final bool read;

  /// The school shared it with the student's parents.
  final bool shared;
  final DateTime updatedAt;
  final DateTime? sentAt;

  /// A draft, or sent back: the teacher can change it and send it.
  bool get editable =>
      status == ReportStatus.draft || status == ReportStatus.returned;

  /// What it is about: the student, else the class.
  String get about => student?.name ?? className ?? '';
}

/// What the teacher writes: a new report, or a change to one.
class ReportInput {
  const ReportInput({
    this.templateId,
    this.studentId,
    this.classId,
    this.subjectId,
    this.answers = const {},
  });

  final int? templateId;
  final int? studentId;
  final int? classId;
  final int? subjectId;
  final ReportAnswers answers;

  Map<String, dynamic> toJson() => {
    'template_id': ?templateId,
    'student_id': ?studentId,
    'class_id': ?classId,
    'subject_id': subjectId,
    'answers': answers,
  };
}

/// A teacher's report the school shared with a student's parents.
class SharedReport {
  const SharedReport({
    required this.id,
    required this.title,
    required this.teacherName,
    required this.sharedAt,
    this.subject,
    this.period,
    this.fields = const [],
    this.answers = const {},
  });

  factory SharedReport.fromJson(Json json) => SharedReport(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    teacherName: optString(json, 'teacher_name') ?? '',
    subject: optString(json, 'subject'),
    period: optObject(json, 'period', ReportRange.fromJson),
    fields: listOf(json, 'fields', ReportField.fromJson),
    answers: _answers(json['answers']),
    sharedAt: reqDate(json, 'shared_at'),
  );

  final int id;
  final String title;
  final String teacherName;
  final String? subject;
  final ReportRange? period;
  final List<ReportField> fields;
  final ReportAnswers answers;
  final DateTime sharedAt;
}
