import 'catalog_models.dart' show PageMeta;
import 'json.dart';
import 'school_models.dart' show SchoolStudent;

/// 113.8 Schools: the calendar (`SchoolCalendar`), the exams' timetable
/// (`SchoolExam`) and behaviour (`BehaviourNote`) in docs/api/openapi.yaml.

enum SchoolEventKind { event, holiday, exam }

/// A day or days on the school's calendar (`SchoolEvent`).
class SchoolEvent {
  const SchoolEvent({
    required this.id,
    required this.kind,
    required this.title,
    required this.startsOn,
    required this.endsOn,
    this.notes,
    this.allDay = true,
    this.starts,
    this.ends,
    this.place,
    this.audience = 'school',
    this.forName,
  });

  factory SchoolEvent.fromJson(Json json) => SchoolEvent(
    id: reqInt(json, 'id'),
    kind:
        enumOrNull(SchoolEventKind.values, json['kind']) ??
        SchoolEventKind.event,
    title: reqString(json, 'title'),
    notes: optString(json, 'notes'),
    startsOn: reqString(json, 'starts_on'),
    endsOn: optString(json, 'ends_on') ?? reqString(json, 'starts_on'),
    allDay: boolOr(json, 'all_day', true),
    starts: optString(json, 'starts'),
    ends: optString(json, 'ends'),
    place: optString(json, 'place'),
    audience: optString(json, 'audience') ?? 'school',
    forName: optString(json, 'for_name'),
  );

  final int id;
  final SchoolEventKind kind;
  final String title;
  final String? notes;

  /// YYYY-MM-DD; [endsOn] the same day for one day.
  final String startsOn;
  final String endsOn;
  final bool allDay;

  /// "09:00", when not all day.
  final String? starts;
  final String? ends;
  final String? place;

  /// school, grade, class or staff.
  final String audience;

  /// The grade's or the class's name.
  final String? forName;

  /// A holiday or a break: no school.
  bool get isDayOff => kind == SchoolEventKind.holiday;

  bool on(String day) =>
      startsOn.compareTo(day) <= 0 && endsOn.compareTo(day) >= 0;
}

/// An exam of the timetable (`SchoolExam`).
class SchoolExam {
  const SchoolExam({
    required this.id,
    required this.subject,
    required this.date,
    required this.starts,
    required this.ends,
    required this.durationMinutes,
    this.classId,
    this.className,
    this.grade,
    this.room,
    this.notes,
    this.published = true,
  });

  factory SchoolExam.fromJson(Json json) => SchoolExam(
    id: reqInt(json, 'id'),
    subject: reqString(json, 'subject'),
    classId: optInt(json, 'class_id'),
    className: optString(json, 'class_name'),
    grade: optString(json, 'grade'),
    date: reqString(json, 'date'),
    starts: reqString(json, 'starts'),
    ends: optString(json, 'ends') ?? reqString(json, 'starts'),
    durationMinutes: intOr(json, 'duration_minutes', 0),
    room: optString(json, 'room'),
    notes: optString(json, 'notes'),
    published: boolOr(json, 'published', true),
  );

  final int id;
  final String subject;
  final int? classId;
  final String? className;
  final String? grade;
  final String date;
  final String starts;
  final String ends;
  final int durationMinutes;
  final String? room;

  /// What it covers and what to bring.
  final String? notes;
  final bool published;

  /// The class's name, else the grade's.
  String? get forName => className ?? grade;
}

/// `GET /school/calendar`.
class SchoolCalendar {
  const SchoolCalendar({
    required this.from,
    required this.to,
    this.events = const [],
    this.exams = const [],
  });

  factory SchoolCalendar.fromJson(Json json) => SchoolCalendar(
    from: reqString(json, 'from'),
    to: reqString(json, 'to'),
    events: listOf(json, 'events', SchoolEvent.fromJson),
    exams: listOf(json, 'exams', SchoolExam.fromJson),
  );

  final String from;
  final String to;
  final List<SchoolEvent> events;
  final List<SchoolExam> exams;
}

/// The exams coming and done (`ExamLists`).
class ExamLists {
  const ExamLists({this.upcoming = const [], this.past = const []});

  factory ExamLists.fromJson(Json json) => ExamLists(
    upcoming: listOf(json, 'upcoming', SchoolExam.fromJson),
    past: listOf(json, 'past', SchoolExam.fromJson),
  );

  final List<SchoolExam> upcoming;
  final List<SchoolExam> past;
}

enum BehaviourKind { positive, negative }

/// One of the school's categories (`BehaviourCategory`).
class BehaviourCategory {
  const BehaviourCategory({
    required this.id,
    required this.name,
    required this.kind,
    required this.points,
  });

  factory BehaviourCategory.fromJson(Json json) => BehaviourCategory(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    kind:
        enumOrNull(BehaviourKind.values, json['kind']) ??
        BehaviourKind.positive,
    points: intOr(json, 'points', 0),
  );

  final int id;
  final String name;
  final BehaviourKind kind;

  /// Negative for a negative category.
  final int points;
}

/// A merit or a note (`BehaviourNote`).
class BehaviourNote {
  const BehaviourNote({
    required this.id,
    required this.studentId,
    required this.kind,
    required this.category,
    required this.points,
    required this.createdAt,
    this.studentName = '',
    this.className,
    this.note,
    this.teacherName,
  });

  factory BehaviourNote.fromJson(Json json) => BehaviourNote(
    id: reqInt(json, 'id'),
    studentId: reqInt(json, 'student_id'),
    studentName: optString(json, 'student_name') ?? '',
    className: optString(json, 'class_name'),
    kind:
        enumOrNull(BehaviourKind.values, json['kind']) ??
        BehaviourKind.positive,
    category: reqString(json, 'category'),
    points: intOr(json, 'points', 0),
    note: optString(json, 'note'),
    teacherName: optString(json, 'teacher_name'),
    createdAt: reqDate(json, 'created_at'),
  );

  final int id;
  final int studentId;
  final String studentName;
  final String? className;
  final BehaviourKind kind;
  final String category;
  final int points;
  final String? note;

  /// Null: written by the school.
  final String? teacherName;
  final DateTime createdAt;
}

/// A record's points total and counts (`BehaviourTotals`).
class BehaviourTotals {
  const BehaviourTotals({
    this.points = 0,
    this.positiveCount = 0,
    this.negativeCount = 0,
  });

  factory BehaviourTotals.fromJson(Json json) => BehaviourTotals(
    points: intOr(json, 'points', 0),
    positiveCount: intOr(json, 'positive_count', 0),
    negativeCount: intOr(json, 'negative_count', 0),
  );

  final int points;
  final int positiveCount;
  final int negativeCount;
}

/// `GET /school/students/{id}/behaviour`: a page of the record, with its totals.
class StudentBehaviour {
  const StudentBehaviour({
    required this.totals,
    required this.items,
    required this.meta,
  });

  factory StudentBehaviour.fromJson(Json json) => StudentBehaviour(
    totals: BehaviourTotals.fromJson(json),
    items: listOf(json, 'items', BehaviourNote.fromJson),
    meta: PageMeta.fromJson(json),
  );

  final BehaviourTotals totals;
  final List<BehaviourNote> items;
  final PageMeta meta;
}

/// A student's points in a class's view.
class StudentPoints {
  const StudentPoints({required this.student, required this.totals});

  factory StudentPoints.fromJson(Json json) => StudentPoints(
    student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
    totals: BehaviourTotals.fromJson(json),
  );

  final SchoolStudent student;
  final BehaviourTotals totals;
}

/// `GET /classroom/classes/{id}/behaviour` (`ClassBehaviour`).
class ClassBehaviour {
  const ClassBehaviour({
    required this.classId,
    required this.className,
    this.students = const [],
    this.recent = const [],
  });

  factory ClassBehaviour.fromJson(Json json) => ClassBehaviour(
    classId: reqInt(json, 'class_id'),
    className: optString(json, 'class_name') ?? '',
    students: listOf(json, 'students', StudentPoints.fromJson),
    recent: listOf(json, 'recent', BehaviourNote.fromJson),
  );

  final int classId;
  final String className;
  final List<StudentPoints> students;
  final List<BehaviourNote> recent;
}
