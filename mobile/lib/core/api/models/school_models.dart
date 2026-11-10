import 'checkin_models.dart';
import 'json.dart';

/// 105.4 Schools: `Config.school`, what a student and their parents see
/// (tag School) and the teachers' Classroom (tag Classroom) in
/// docs/api/openapi.yaml.

/// `Config.school`.
class SchoolConfig {
  const SchoolConfig({
    this.timezone = 'Africa/Cairo',
    this.currency = 'EGP',
    this.term,
    this.absenceAlerts = true,
    this.feesByCard = false,
    this.checkin = const CheckinConfig(),
    this.bus = false,
    this.library = false,
    this.tilesUrl,
    this.attribution,
    this.university = false,
    this.staffAppBundled = false,
  });

  factory SchoolConfig.fromJson(Json json) {
    final map = json['map'] is Map
        ? asJson(json['map'], 'map')
        : const <String, dynamic>{};
    return SchoolConfig(
      timezone: optString(json, 'timezone') ?? 'Africa/Cairo',
      currency: optString(json, 'currency') ?? 'EGP',
      term: optObject(json, 'term', SchoolTerm.fromJson),
      absenceAlerts: boolOr(json, 'absence_alerts', true),
      feesByCard: boolOr(json, 'fees_by_card', false),
      bus: boolOr(json, 'bus', false),
      library: boolOr(json, 'library', false),
      university: boolOr(json, 'university', false),
      staffAppBundled: json['staff_app'] == 'bundle',
      tilesUrl: optString(map, 'tiles_url'),
      attribution: optString(map, 'attribution'),
      checkin:
          optObject(json, 'checkin', CheckinConfig.fromJson) ??
          const CheckinConfig(),
    );
  }

  final String timezone;
  final String currency;
  final SchoolTerm? term;
  final bool absenceAlerts;

  /// Families can pay fees by card in the app.
  final bool feesByCard;

  /// 113.2 Checking in and out in the app; off from older servers.
  final CheckinConfig checkin;

  /// 113.10 The school has buses: the families' bus screen.
  final bool bus;

  /// 113.11 The school has a library: its books in the app.
  final bool library;

  /// 113.10 The platform's map tiles for the bus; null: the stops as a list.
  final String? tilesUrl;
  final String? attribution;

  /// 113.9 The school is a university: its screens instead of classes'.
  final bool university;

  /// 116 The teachers and staff work in the school's staff app
  /// (`staff_app` bundle): this app is for students and parents only.
  /// Older servers and `same`: their tabs here.
  final bool staffAppBundled;
}

class SchoolTerm {
  const SchoolTerm({
    required this.name,
    required this.startsOn,
    required this.endsOn,
  });

  factory SchoolTerm.fromJson(Json json) => SchoolTerm(
    name: reqString(json, 'name'),
    startsOn: reqString(json, 'starts_on'),
    endsOn: reqString(json, 'ends_on'),
  );

  final String name;
  final String startsOn;
  final String endsOn;
}

/// A student as the school lists them (`SchoolStudent`).
class SchoolStudent {
  const SchoolStudent({
    required this.id,
    required this.name,
    this.photoUrl,
    this.code,
    this.classId,
    this.className,
  });

  factory SchoolStudent.fromJson(Json json) => SchoolStudent(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    photoUrl: optString(json, 'photo_url'),
    code: optString(json, 'code'),
    classId: optInt(json, 'class_id'),
    className: optString(json, 'class_name'),
  );

  final int id;
  final String name;
  final String? photoUrl;
  final String? code;
  final int? classId;
  final String? className;
}

/// 113.3 `staff`: who works at the school and doesn't teach.
enum SchoolRole { student, parent, teacher, staff }

/// `GET /school/me`: who the signed-in person is at the school, and the
/// students they may see (themselves, or a parent's children).
class SchoolMe {
  const SchoolMe({
    required this.name,
    this.roles = const [],
    this.students = const [],
  });

  factory SchoolMe.fromJson(Json json) => SchoolMe(
    name: reqString(json, 'name'),
    roles: [
      for (final role in (json['roles'] as List?) ?? const [])
        ?enumOrNull(SchoolRole.values, role),
    ],
    students: listOf(json, 'students', SchoolStudent.fromJson),
  );

  final String name;
  final List<SchoolRole> roles;
  final List<SchoolStudent> students;

  bool get isStudent => roles.contains(SchoolRole.student);
}

/// A lesson in a week (`TimetableLesson`).
class SchoolLesson {
  const SchoolLesson({
    required this.id,
    required this.starts,
    required this.ends,
    required this.subject,
    required this.classId,
    required this.className,
    this.teacherName,
    this.room,
  });

  factory SchoolLesson.fromJson(Json json) => SchoolLesson(
    id: reqInt(json, 'id'),
    starts: reqString(json, 'starts'),
    ends: reqString(json, 'ends'),
    subject: reqString(json, 'subject'),
    classId: reqInt(json, 'class_id'),
    className: optString(json, 'class_name') ?? '',
    teacherName: optString(json, 'teacher_name'),
    room: optString(json, 'room'),
  );

  final int id;

  /// "08:00".
  final String starts;
  final String ends;
  final String subject;
  final int classId;
  final String className;
  final String? teacherName;
  final String? room;
}

/// A day of a week with lessons; 1 is Monday, 7 Sunday.
class SchoolDay {
  const SchoolDay({required this.weekday, this.lessons = const []});

  factory SchoolDay.fromJson(Json json) => SchoolDay(
    weekday: reqInt(json, 'weekday'),
    lessons: listOf(json, 'lessons', SchoolLesson.fromJson),
  );

  final int weekday;
  final List<SchoolLesson> lessons;
}

/// A week of lessons (`Timetable`): the days that have any, Monday first.
class SchoolTimetable {
  const SchoolTimetable({this.days = const []});

  factory SchoolTimetable.fromJson(Json json) =>
      SchoolTimetable(days: listOf(json, 'days', SchoolDay.fromJson));

  final List<SchoolDay> days;

  List<SchoolLesson> on(int weekday) =>
      days.where((d) => d.weekday == weekday).firstOrNull?.lessons ?? const [];
}

enum AttendanceStatus { present, absent, late, excused }

class AttendanceDay {
  const AttendanceDay({required this.date, required this.status, this.note});

  factory AttendanceDay.fromJson(Json json) => AttendanceDay(
    date: reqString(json, 'date'),
    status: enumFrom(
      AttendanceStatus.values,
      json['status'],
      AttendanceStatus.present,
    ),
    note: optString(json, 'note'),
  );

  final String date;
  final AttendanceStatus status;
  final String? note;
}

/// A student's attendance over a period (`StudentAttendance`): the days
/// marked, newest first, and how many of each.
class StudentAttendance {
  const StudentAttendance({
    required this.from,
    required this.to,
    this.counts = const {},
    this.days = const [],
  });

  factory StudentAttendance.fromJson(Json json) {
    final counts = asJson(
      json['counts'] ?? const <String, dynamic>{},
      'counts',
    );
    return StudentAttendance(
      from: reqString(json, 'from'),
      to: reqString(json, 'to'),
      counts: {
        for (final status in AttendanceStatus.values)
          status: intOr(counts, status.name, 0),
      },
      days: listOf(json, 'days', AttendanceDay.fromJson),
    );
  }

  final String from;
  final String to;
  final Map<AttendanceStatus, int> counts;
  final List<AttendanceDay> days;

  int count(AttendanceStatus status) => counts[status] ?? 0;
}

enum SchoolFileKind { image, pdf }

/// A file given with homework or handed in (`SchoolFile`).
class SchoolFile {
  const SchoolFile({required this.name, required this.url, required this.kind});

  factory SchoolFile.fromJson(Json json) => SchoolFile(
    name: reqString(json, 'name'),
    url: reqString(json, 'url'),
    kind: enumFrom(SchoolFileKind.values, json['kind'], SchoolFileKind.pdf),
  );

  final String name;
  final String url;
  final SchoolFileKind kind;
}

/// What a student handed in, and their teacher's mark (`HomeworkSubmission`).
class HomeworkSubmission {
  const HomeworkSubmission({
    this.text = '',
    this.file,
    this.submittedAt,
    this.late = false,
    this.mark,
    this.feedback,
  });

  factory HomeworkSubmission.fromJson(Json json) => HomeworkSubmission(
    text: optString(json, 'text') ?? '',
    file: optObject(json, 'file', SchoolFile.fromJson),
    submittedAt: optDate(json, 'submitted_at'),
    late: boolOr(json, 'late', false),
    mark: optString(json, 'mark'),
    feedback: optString(json, 'feedback'),
  );

  final String text;
  final SchoolFile? file;

  /// Null when the teacher marked it without anything handed in.
  final DateTime? submittedAt;
  final bool late;
  final String? mark;
  final String? feedback;

  bool get handedIn => submittedAt != null;
}

/// Homework as a student and their parents see it (`Homework`).
class Homework {
  const Homework({
    required this.id,
    required this.subject,
    required this.title,
    required this.dueOn,
    this.text = '',
    this.attachments = const [],
    this.teacherName,
    this.submission,
  });

  factory Homework.fromJson(Json json) => Homework(
    id: reqInt(json, 'id'),
    subject: optString(json, 'subject') ?? '',
    title: reqString(json, 'title'),
    text: optString(json, 'text') ?? '',
    dueOn: reqString(json, 'due_on'),
    attachments: listOf(json, 'attachments', SchoolFile.fromJson),
    teacherName: optString(json, 'teacher_name'),
    submission: optObject(json, 'submission', HomeworkSubmission.fromJson),
  );

  final int id;
  final String subject;
  final String title;
  final String text;

  /// "2026-10-14".
  final String dueOn;
  final List<SchoolFile> attachments;
  final String? teacherName;
  final HomeworkSubmission? submission;
}

enum HomeworkStatus { due, done }

enum AssessmentKind { exam, quiz, assignment }

/// An exam, a quiz or an assignment (`Assessment`).
class SchoolAssessment {
  const SchoolAssessment({
    required this.id,
    required this.classId,
    required this.title,
    required this.kind,
    required this.date,
    required this.maxScore,
    this.className = '',
    this.subject = '',
    this.scored = 0,
  });

  factory SchoolAssessment.fromJson(Json json) => SchoolAssessment(
    id: reqInt(json, 'id'),
    classId: reqInt(json, 'class_id'),
    className: optString(json, 'class_name') ?? '',
    subject: optString(json, 'subject') ?? '',
    kind: enumFrom(AssessmentKind.values, json['kind'], AssessmentKind.exam),
    title: reqString(json, 'title'),
    date: reqString(json, 'date'),
    maxScore: optDouble(json, 'max_score') ?? 0,
    scored: intOr(json, 'scored', 0),
  );

  final int id;
  final int classId;
  final String className;
  final String subject;
  final AssessmentKind kind;
  final String title;
  final String date;
  final double maxScore;

  /// How many of the class have a score.
  final int scored;
}

/// One of a student's scores.
class StudentScore {
  const StudentScore({
    required this.assessmentId,
    required this.title,
    required this.kind,
    required this.date,
    required this.score,
    required this.maxScore,
    this.note,
  });

  factory StudentScore.fromJson(Json json) => StudentScore(
    assessmentId: reqInt(json, 'assessment_id'),
    title: reqString(json, 'title'),
    kind: enumFrom(AssessmentKind.values, json['kind'], AssessmentKind.exam),
    date: reqString(json, 'date'),
    score: optDouble(json, 'score') ?? 0,
    maxScore: optDouble(json, 'max_score') ?? 0,
    note: optString(json, 'note'),
  );

  final int assessmentId;
  final String title;
  final AssessmentKind kind;
  final String date;
  final double score;
  final double maxScore;
  final String? note;
}

/// A subject's scores and its percentage over them.
class SubjectGrades {
  const SubjectGrades({
    required this.subject,
    this.percent,
    this.scores = const [],
  });

  factory SubjectGrades.fromJson(Json json) => SubjectGrades(
    subject: reqString(json, 'subject'),
    percent: optDouble(json, 'percent'),
    scores: listOf(json, 'scores', StudentScore.fromJson),
  );

  final String subject;
  final double? percent;
  final List<StudentScore> scores;
}

/// A student's grades (`StudentGrades`): by subject, and what is coming.
class StudentGrades {
  const StudentGrades({this.subjects = const [], this.upcoming = const []});

  factory StudentGrades.fromJson(Json json) => StudentGrades(
    subjects: listOf(json, 'subjects', SubjectGrades.fromJson),
    upcoming: listOf(json, 'upcoming', SchoolAssessment.fromJson),
  );

  final List<SubjectGrades> subjects;
  final List<SchoolAssessment> upcoming;
}

enum FeeStatus { due, paid }

/// An amount the school asks of a family (`SchoolFee`).
class SchoolFee {
  const SchoolFee({
    required this.id,
    required this.title,
    required this.amountFormatted,
    required this.status,
    this.dueOn,
    this.paidAt,
    this.paidByCard = false,
    this.receiptUrl,
  });

  factory SchoolFee.fromJson(Json json) => SchoolFee(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    amountFormatted: reqString(json, 'amount_formatted'),
    status: enumFrom(FeeStatus.values, json['status'], FeeStatus.due),
    dueOn: optString(json, 'due_on'),
    paidAt: optDate(json, 'paid_at'),
    paidByCard: json['paid_by'] == 'card',
    receiptUrl: optString(json, 'receipt_url'),
  );

  final int id;
  final String title;
  final String amountFormatted;
  final FeeStatus status;
  final String? dueOn;
  final DateTime? paidAt;
  final bool paidByCard;
  final String? receiptUrl;
}

/// A student's fees (`StudentFees`): what is due first, then what was paid.
class StudentFees {
  const StudentFees({
    required this.dueFormatted,
    this.canPay = false,
    this.items = const [],
  });

  factory StudentFees.fromJson(Json json) => StudentFees(
    dueFormatted: reqString(json, 'due_formatted'),
    canPay: boolOr(json, 'can_pay', false),
    items: listOf(json, 'items', SchoolFee.fromJson),
  );

  final String dueFormatted;

  /// The family can pay a due fee by card in the app.
  final bool canPay;
  final List<SchoolFee> items;
}

enum AnnouncementAudience { school, classroom, student }

/// The school's or a teacher's news (`SchoolAnnouncement`).
class SchoolAnnouncement {
  const SchoolAnnouncement({
    required this.id,
    required this.title,
    required this.body,
    required this.author,
    required this.createdAt,
    this.audience = AnnouncementAudience.school,
    this.className,
  });

  factory SchoolAnnouncement.fromJson(Json json) => SchoolAnnouncement(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    body: optString(json, 'body') ?? '',
    author: optString(json, 'author') ?? '',
    createdAt: reqDate(json, 'created_at'),
    audience: switch (json['audience']) {
      'class' => AnnouncementAudience.classroom,
      'student' => AnnouncementAudience.student,
      _ => AnnouncementAudience.school,
    },
    className: optString(json, 'class_name'),
  );

  final int id;
  final String title;
  final String body;
  final String author;
  final DateTime createdAt;
  final AnnouncementAudience audience;
  final String? className;
}

// The Classroom (teachers)

class ClassroomSubject {
  const ClassroomSubject({required this.id, required this.name});

  factory ClassroomSubject.fromJson(Json json) =>
      ClassroomSubject(id: reqInt(json, 'id'), name: reqString(json, 'name'));

  final int id;
  final String name;
}

/// A class the teacher teaches, with the subjects they teach in it.
class ClassroomClass {
  const ClassroomClass({
    required this.id,
    required this.name,
    this.studentCount = 0,
    this.subjects = const [],
    this.classTeacher = false,
  });

  factory ClassroomClass.fromJson(Json json) => ClassroomClass(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    studentCount: intOr(json, 'student_count', 0),
    subjects: listOf(json, 'subjects', ClassroomSubject.fromJson),
    classTeacher: boolOr(json, 'class_teacher', false),
  );

  final int id;
  final String name;
  final int studentCount;
  final List<ClassroomSubject> subjects;

  /// The teacher is this class's own teacher.
  final bool classTeacher;
}

/// `GET /classroom/me`: the teacher, their classes and today's lessons.
class ClassroomMe {
  const ClassroomMe({
    required this.name,
    this.photoUrl,
    this.classes = const [],
    this.today = const [],
  });

  factory ClassroomMe.fromJson(Json json) => ClassroomMe(
    name: reqString(json, 'name'),
    photoUrl: optString(json, 'photo_url'),
    classes: listOf(json, 'classes', ClassroomClass.fromJson),
    today: listOf(json, 'today', SchoolLesson.fromJson),
  );

  final String name;
  final String? photoUrl;
  final List<ClassroomClass> classes;
  final List<SchoolLesson> today;
}

class AttendanceMark {
  const AttendanceMark({required this.student, this.status, this.note});

  factory AttendanceMark.fromJson(Json json) => AttendanceMark(
    student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
    status: enumOrNull(AttendanceStatus.values, json['status']),
    note: optString(json, 'note'),
  );

  final SchoolStudent student;

  /// Null: not marked that day.
  final AttendanceStatus? status;
  final String? note;
}

/// A class's attendance on a day (`ClassAttendance`).
class ClassAttendance {
  const ClassAttendance({
    required this.classId,
    required this.date,
    this.students = const [],
    this.dayOff,
  });

  factory ClassAttendance.fromJson(Json json) => ClassAttendance(
    classId: reqInt(json, 'class_id'),
    date: reqString(json, 'date'),
    students: listOf(json, 'students', AttendanceMark.fromJson),
    dayOff: (json['day_off'] as Map?)?['title'] as String?,
  );

  final int classId;
  final String date;
  final List<AttendanceMark> students;

  /// 113.8 The holiday or break that day falls on (no school); null on a
  /// school day.
  final String? dayOff;

  bool get taken => students.any((s) => s.status != null);
}

/// Homework as the teacher who gave it sees it (`ClassroomHomework`).
class ClassroomHomework {
  const ClassroomHomework({
    required this.id,
    required this.classId,
    required this.className,
    required this.subject,
    required this.title,
    required this.dueOn,
    this.text = '',
    this.attachments = const [],
    this.students = 0,
    this.handedIn = 0,
    this.marked = 0,
  });

  factory ClassroomHomework.fromJson(Json json) => ClassroomHomework(
    id: reqInt(json, 'id'),
    classId: reqInt(json, 'class_id'),
    className: optString(json, 'class_name') ?? '',
    subject: optString(json, 'subject') ?? '',
    title: reqString(json, 'title'),
    text: optString(json, 'text') ?? '',
    dueOn: reqString(json, 'due_on'),
    attachments: listOf(json, 'attachments', SchoolFile.fromJson),
    students: intOr(json, 'students', 0),
    handedIn: intOr(json, 'handed_in', 0),
    marked: intOr(json, 'marked', 0),
  );

  final int id;
  final int classId;
  final String className;
  final String subject;
  final String title;
  final String text;
  final String dueOn;
  final List<SchoolFile> attachments;
  final int students;
  final int handedIn;
  final int marked;
}

class StudentWork {
  const StudentWork({required this.student, this.submission});

  factory StudentWork.fromJson(Json json) => StudentWork(
    student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
    submission: optObject(json, 'submission', HomeworkSubmission.fromJson),
  );

  final SchoolStudent student;
  final HomeworkSubmission? submission;
}

/// A homework's page for its teacher, with each student's work.
class ClassroomHomeworkDetail extends ClassroomHomework {
  const ClassroomHomeworkDetail({
    required super.id,
    required super.classId,
    required super.className,
    required super.subject,
    required super.title,
    required super.dueOn,
    super.text,
    super.attachments,
    super.students,
    super.handedIn,
    super.marked,
    this.work = const [],
  });

  factory ClassroomHomeworkDetail.fromJson(Json json) {
    final base = ClassroomHomework.fromJson(json);
    return ClassroomHomeworkDetail(
      id: base.id,
      classId: base.classId,
      className: base.className,
      subject: base.subject,
      title: base.title,
      text: base.text,
      dueOn: base.dueOn,
      attachments: base.attachments,
      students: base.students,
      handedIn: base.handedIn,
      marked: base.marked,
      work: listOf(json, 'submissions', StudentWork.fromJson),
    );
  }

  final List<StudentWork> work;
}

/// What a teacher gives a class.
class HomeworkInput {
  const HomeworkInput({
    required this.classId,
    required this.subjectId,
    required this.title,
    required this.dueOn,
    this.text = '',
    this.uploadIds = const [],
  });

  final int classId;
  final int subjectId;
  final String title;
  final String text;
  final String dueOn;
  final List<String> uploadIds;

  Json toJson() => {
    'class_id': classId,
    'subject_id': subjectId,
    'title': title,
    'text': text,
    'due_on': dueOn,
    if (uploadIds.isNotEmpty) 'upload_ids': uploadIds,
  };
}

/// A new exam, quiz or assignment.
class AssessmentInput {
  const AssessmentInput({
    required this.classId,
    required this.subjectId,
    required this.kind,
    required this.title,
    required this.date,
    required this.maxScore,
  });

  final int classId;
  final int subjectId;
  final AssessmentKind kind;
  final String title;
  final String date;
  final double maxScore;

  Json toJson() => {
    'class_id': classId,
    'subject_id': subjectId,
    'kind': kind.name,
    'title': title,
    'date': date,
    'max_score': maxScore,
  };
}

class StudentMark {
  const StudentMark({required this.student, this.score, this.note});

  factory StudentMark.fromJson(Json json) => StudentMark(
    student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
    score: optDouble(json, 'score'),
    note: optString(json, 'note'),
  );

  final SchoolStudent student;
  final double? score;
  final String? note;
}

/// An assessment's scores, one row per student of the class.
class AssessmentScores {
  const AssessmentScores({required this.assessment, this.students = const []});

  factory AssessmentScores.fromJson(Json json) => AssessmentScores(
    assessment: SchoolAssessment.fromJson(
      asJson(json['assessment'], 'assessment'),
    ),
    students: listOf(json, 'students', StudentMark.fromJson),
  );

  final SchoolAssessment assessment;
  final List<StudentMark> students;
}

/// 112.5 A report card's or gradebook's period: the term, or the days asked for.
class ReportPeriod {
  const ReportPeriod({required this.from, required this.to, this.term});

  factory ReportPeriod.fromJson(Json json) => ReportPeriod(
    from: reqString(json, 'from'),
    to: reqString(json, 'to'),
    term: optString(json, 'term'),
  );

  final String from;
  final String to;
  final String? term;
}

/// 112.5 Days present, absent, late and excused.
class AttendanceCounts {
  const AttendanceCounts({
    this.present = 0,
    this.absent = 0,
    this.late = 0,
    this.excused = 0,
  });

  factory AttendanceCounts.fromJson(Json json) => AttendanceCounts(
    present: intOr(json, 'present', 0),
    absent: intOr(json, 'absent', 0),
    late: intOr(json, 'late', 0),
    excused: intOr(json, 'excused', 0),
  );

  final int present;
  final int absent;
  final int late;
  final int excused;
}

class ReportSubject {
  const ReportSubject({
    required this.name,
    this.percent,
    this.scores = const [],
  });

  factory ReportSubject.fromJson(Json json) => ReportSubject(
    name: reqString(json, 'name'),
    percent: optDouble(json, 'percent'),
    scores: listOf(
      json,
      'scores',
      (s) => (
        title: reqString(s, 'title'),
        score: optDouble(s, 'score') ?? 0,
        maxScore: optDouble(s, 'max_score') ?? 0,
      ),
    ),
  );

  final String name;
  final double? percent;
  final List<({String title, double score, double maxScore})> scores;
}

/// 112.5 A student's report card (`ReportCard`).
class ReportCard {
  const ReportCard({
    required this.period,
    this.className,
    this.subjects = const [],
    this.overall,
    this.attendance = const AttendanceCounts(),
  });

  factory ReportCard.fromJson(Json json) => ReportCard(
    period: ReportPeriod.fromJson(asJson(json['period'], 'period')),
    className: optString(json, 'class_name'),
    subjects: listOf(json, 'subjects', ReportSubject.fromJson),
    overall: optDouble(json, 'overall'),
    attendance: AttendanceCounts.fromJson(
      asJson(json['attendance'], 'attendance'),
    ),
  );

  final ReportPeriod period;
  final String? className;
  final List<ReportSubject> subjects;
  final double? overall;
  final AttendanceCounts attendance;
}

/// 112.5 A class's gradebook for its teachers (`ClassGradebook`).
class ClassGradebook {
  const ClassGradebook({
    required this.period,
    required this.className,
    this.subjects = const [],
    this.students = const [],
  });

  factory ClassGradebook.fromJson(Json json) => ClassGradebook(
    period: ReportPeriod.fromJson(asJson(json['period'], 'period')),
    className: optString(json, 'class_name') ?? '',
    subjects: [
      for (final s in listOf(json, 'subjects', (s) => s)) reqString(s, 'name'),
    ],
    students: listOf(
      json,
      'students',
      (s) => (
        name: reqString(s, 'name'),
        percents: [
          for (final p in (s['percents'] as List? ?? const []))
            p is num ? p.toDouble() : null,
        ],
        overall: optDouble(s, 'overall'),
        attendance: AttendanceCounts.fromJson(
          asJson(s['attendance'], 'attendance'),
        ),
      ),
    ),
  );

  final ReportPeriod period;
  final String className;
  final List<String> subjects;
  final List<
    ({
      String name,
      List<double?> percents,
      double? overall,
      AttendanceCounts attendance,
    })
  >
  students;
}

// 113.6 Messages between teachers and families (the chat's `school` kind).

/// Whom teachers write to and hear from.
enum SchoolMessagesWith { none, parents, parentsStudents }

/// When messages can be sent, in the school's time zone (`SchoolMessageHours`).
class SchoolMessageHours {
  const SchoolMessageHours({
    required this.from,
    required this.to,
    required this.days,
  });

  factory SchoolMessageHours.fromJson(Json json) => SchoolMessageHours(
    from: reqString(json, 'from'),
    to: reqString(json, 'to'),
    days: [
      for (final d in (json['days'] as List?) ?? const [])
        if (d is num) d.toInt(),
    ],
  );

  /// "08:00".
  final String from;
  final String to;

  /// 1 Monday … 7 Sunday.
  final List<int> days;
}

/// Someone the person can write to (`SchoolContact`).
class SchoolContact {
  const SchoolContact({
    required this.personId,
    required this.role,
    required this.name,
    this.photoUrl,
    this.students = const [],
    this.classes = const [],
    this.subjects = const [],
    this.classTeacher = false,
    this.conversationId,
    this.canWrite = true,
  });

  factory SchoolContact.fromJson(Json json) => SchoolContact(
    personId: reqInt(json, 'person_id'),
    role: enumFrom(SchoolRole.values, json['role'], SchoolRole.teacher),
    name: reqString(json, 'name'),
    photoUrl: optString(json, 'photo_url'),
    students: stringList(json, 'students'),
    classes: stringList(json, 'classes'),
    subjects: stringList(json, 'subjects'),
    classTeacher: boolOr(json, 'class_teacher', false),
    conversationId: optString(json, 'conversation_id'),
    canWrite: boolOr(json, 'can_write', true),
  );

  final int personId;
  final SchoolRole role;
  final String name;
  final String? photoUrl;

  /// A parent's children the teacher teaches; to a parent, their children
  /// this teacher teaches.
  final List<String> students;
  final List<String> classes;
  final List<String> subjects;
  final bool classTeacher;
  final String? conversationId;

  /// False while only teachers write first and this one hasn't.
  final bool canWrite;
}

/// What the school allows and whom the person can write to (`SchoolMessages`).
class SchoolMessages {
  const SchoolMessages({
    required this.enabled,
    this.reach = SchoolMessagesWith.none,
    this.teacherFirst = true,
    this.hours,
    this.openNow = true,
    this.opensAt,
    this.attachments = false,
    this.adminReads = false,
    this.classMessages = false,
    this.classes = const [],
    this.officeConversationId,
    this.contacts = const [],
  });

  factory SchoolMessages.fromJson(Json json) => SchoolMessages(
    enabled: boolOr(json, 'enabled', false),
    reach: enumFromSnake(
      SchoolMessagesWith.values,
      json['with'],
      SchoolMessagesWith.none,
    ),
    teacherFirst: optString(json, 'started_by') != 'both',
    hours: optObject(json, 'hours', SchoolMessageHours.fromJson),
    openNow: boolOr(json, 'open_now', true),
    opensAt: optDate(json, 'opens_at'),
    attachments: boolOr(json, 'attachments', false),
    adminReads: boolOr(json, 'admin_reads', false),
    classMessages: boolOr(json, 'class_messages', false),
    classes: listOf(json, 'classes', ClassroomClassName.fromJson),
    officeConversationId: optString(json, 'office_conversation_id'),
    contacts: listOf(json, 'contacts', SchoolContact.fromJson),
  );

  final bool enabled;
  final SchoolMessagesWith reach;

  /// Only teachers write first; families answer.
  final bool teacherFirst;
  final SchoolMessageHours? hours;
  final bool openNow;
  final DateTime? opensAt;
  final bool attachments;

  /// The school's administration may read the conversations.
  final bool adminReads;

  /// This teacher may write to a whole class at once ([classes]).
  final bool classMessages;
  final List<ClassroomClassName> classes;

  /// The conversation with the school's administration, at any time.
  final String? officeConversationId;
  final List<SchoolContact> contacts;
}

/// A class a teacher can write to.
class ClassroomClassName {
  const ClassroomClassName({required this.id, required this.name});

  factory ClassroomClassName.fromJson(Json json) =>
      ClassroomClassName(id: reqInt(json, 'id'), name: reqString(json, 'name'));

  final int id;
  final String name;
}

/// Whom a teacher writes to in a class: its parents, its students or both.
enum ClassAudience { parents, students, families }
