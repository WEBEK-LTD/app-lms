import 'bus_library_models.dart';
import 'checkin_models.dart';
import 'json.dart';
import 'school_life_models.dart';
import 'school_models.dart';

/// 113.4 The parent's area (docs/api/openapi.yaml, the Parent tag): the
/// parent's children, each child's day at a glance, permission slips to
/// sign, excuses for an absence and who picks the child up.

/// A child in `ParentMe.children`, with the slips not answered yet.
class ParentChild {
  const ParentChild({required this.student, this.slipsWaiting = 0});

  factory ParentChild.fromJson(Json json) => ParentChild(
    student: SchoolStudent.fromJson(json),
    slipsWaiting: intOr(json, 'slips_waiting', 0),
  );

  final SchoolStudent student;
  final int slipsWaiting;

  int get id => student.id;
}

/// `GET /parent/me`.
class ParentMe {
  const ParentMe({
    required this.name,
    this.children = const [],
    this.messages = false,
    this.slipsWaiting = 0,
  });

  factory ParentMe.fromJson(Json json) => ParentMe(
    name: reqString(json, 'name'),
    children: listOf(json, 'children', ParentChild.fromJson),
    messages: boolOr(json, 'messages', false),
    slipsWaiting: intOr(json, 'slips_waiting', 0),
  );

  final String name;
  final List<ParentChild> children;

  /// The school lets parents write to their children's teachers (113.6).
  final bool messages;
  final int slipsWaiting;
}

/// One of the latest scores on a child's day.
class DayGrade {
  const DayGrade({
    required this.subject,
    required this.title,
    required this.score,
    required this.maxScore,
    required this.date,
  });

  factory DayGrade.fromJson(Json json) => DayGrade(
    subject: optString(json, 'subject') ?? '',
    title: reqString(json, 'title'),
    score: optDouble(json, 'score') ?? 0,
    maxScore: optDouble(json, 'max_score') ?? 0,
    date: reqString(json, 'date'),
  );

  final String subject;
  final String title;
  final double score;
  final double maxScore;
  final String date;
}

/// A library book out now, on a child's day.
class DayLoan {
  const DayLoan({
    required this.id,
    required this.title,
    required this.dueOn,
    this.overdue = false,
  });

  factory DayLoan.fromJson(Json json) => DayLoan(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    dueOn: reqString(json, 'due_on'),
    overdue: boolOr(json, 'overdue', false),
  );

  final int id;
  final String title;
  final String dueOn;
  final bool overdue;
}

/// `GET /parent/children/{id}/day`: the child's day at a glance.
class ChildDay {
  const ChildDay({
    required this.date,
    required this.student,
    this.dayOff,
    this.checkin,
    this.lessons = const [],
    this.homeworkDue = 0,
    this.homework = const [],
    this.grades = const [],
    this.points = 0,
    this.latestBehaviour,
    this.bus = const [],
    this.loans = const [],
    this.reports = 0,
    this.feesDue = 0,
    this.feesDueFormatted = '',
    this.slipsWaiting = 0,
    this.excuse,
    this.pickupPeople = 0,
    this.pickupToday,
    this.events = const [],
    this.exams = const [],
  });

  factory ChildDay.fromJson(Json json) {
    final homework = optObject(json, 'homework', (j) => j) ?? const {};
    final behaviour = optObject(json, 'behaviour', (j) => j) ?? const {};
    final reports = optObject(json, 'reports', (j) => j) ?? const {};
    final fees = optObject(json, 'fees', (j) => j) ?? const {};
    final pickup = optObject(json, 'pickup', (j) => j) ?? const {};
    final off = optObject(json, 'day_off', (j) => j);
    return ChildDay(
      date: reqString(json, 'date'),
      student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
      dayOff: off == null ? null : optString(off, 'title'),
      checkin: optObject(json, 'checkin', CheckinDay.fromJson),
      lessons: listOf(json, 'lessons', SchoolLesson.fromJson),
      homeworkDue: intOr(homework, 'due_count', 0),
      homework: listOf(homework, 'items', Homework.fromJson),
      grades: listOf(json, 'grades', DayGrade.fromJson),
      points: intOr(behaviour, 'points', 0),
      latestBehaviour: optObject(behaviour, 'latest', BehaviourNote.fromJson),
      bus: listOf(json, 'bus', StudentBusTrip.fromJson),
      loans: listOf(json, 'loans', DayLoan.fromJson),
      reports: intOr(reports, 'count', 0),
      feesDue: intOr(fees, 'due_count', 0),
      feesDueFormatted: optString(fees, 'due_formatted') ?? '',
      slipsWaiting: intOr(json, 'slips_waiting', 0),
      excuse: optObject(json, 'excuse', AbsenceExcuse.fromJson),
      pickupPeople: intOr(pickup, 'people', 0),
      pickupToday: optObject(pickup, 'today', PickupNote.fromJson),
      events: listOf(json, 'events', SchoolEvent.fromJson),
      exams: listOf(json, 'exams', SchoolExam.fromJson),
    );
  }

  final String date;
  final SchoolStudent student;

  /// 113.8 Today's holiday or break.
  final String? dayOff;

  /// 113.2 Today at the gate; null when the school doesn't take check-ins.
  final CheckinDay? checkin;
  final List<SchoolLesson> lessons;
  final int homeworkDue;
  final List<Homework> homework;
  final List<DayGrade> grades;
  final int points;
  final BehaviourNote? latestBehaviour;
  final List<StudentBusTrip> bus;
  final List<DayLoan> loans;
  final int reports;
  final int feesDue;
  final String feesDueFormatted;
  final int slipsWaiting;
  final AbsenceExcuse? excuse;
  final int pickupPeople;
  final PickupNote? pickupToday;
  final List<SchoolEvent> events;
  final List<SchoolExam> exams;
}

enum SlipAnswer { yes, no }

/// A child of the parent's that a slip is for, and the answer given.
class SlipChild {
  const SlipChild({
    required this.studentId,
    required this.studentName,
    this.answer,
    this.signedName,
    this.answeredAt,
  });

  factory SlipChild.fromJson(Json json) => SlipChild(
    studentId: reqInt(json, 'student_id'),
    studentName: reqString(json, 'student_name'),
    answer: enumOrNull(SlipAnswer.values, json['answer']),
    signedName: optString(json, 'signed_name'),
    answeredAt: optDate(json, 'answered_at'),
  );

  final int studentId;
  final String studentName;
  final SlipAnswer? answer;
  final String? signedName;
  final DateTime? answeredAt;
}

/// `PermissionSlip`.
class PermissionSlip {
  const PermissionSlip({
    required this.id,
    required this.title,
    required this.dueOn,
    this.details,
    this.feeNote,
    this.forName,
    this.open = true,
    this.children = const [],
  });

  factory PermissionSlip.fromJson(Json json) => PermissionSlip(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    dueOn: reqString(json, 'due_on'),
    details: optString(json, 'details'),
    feeNote: optString(json, 'fee_note'),
    forName: optString(json, 'for_name'),
    open: boolOr(json, 'open', true),
    children: listOf(json, 'children', SlipChild.fromJson),
  );

  final int id;
  final String title;
  final String dueOn;
  final String? details;

  /// A note of a fee ("E£150, paid at the office"); the slip takes no payment.
  final String? feeNote;
  final String? forName;
  final bool open;
  final List<SlipChild> children;

  bool get waiting => open && children.any((c) => c.answer == null);
}

enum ExcuseStatus { pending, accepted, declined, cancelled }

/// `AbsenceExcuse`.
class AbsenceExcuse {
  const AbsenceExcuse({
    required this.id,
    required this.studentId,
    required this.startsOn,
    required this.endsOn,
    required this.days,
    required this.reason,
    this.file,
    this.status = ExcuseStatus.pending,
    this.answer,
    this.answeredAt,
  });

  factory AbsenceExcuse.fromJson(Json json) => AbsenceExcuse(
    id: reqInt(json, 'id'),
    studentId: reqInt(json, 'student_id'),
    startsOn: reqString(json, 'starts_on'),
    endsOn: reqString(json, 'ends_on'),
    days: intOr(json, 'days', 1),
    reason: reqString(json, 'reason'),
    file: optObject(json, 'file', SchoolFile.fromJson),
    status: enumFrom(
      ExcuseStatus.values,
      json['status'],
      ExcuseStatus.pending,
    ),
    answer: optString(json, 'answer'),
    answeredAt: optDate(json, 'answered_at'),
  );

  final int id;
  final int studentId;
  final String startsOn;
  final String endsOn;
  final int days;
  final String reason;
  final SchoolFile? file;
  final ExcuseStatus status;

  /// The school's note with its answer.
  final String? answer;
  final DateTime? answeredAt;
}

/// Someone who may pick a child up (`PickupPerson`).
class PickupPerson {
  const PickupPerson({
    required this.name,
    this.relation,
    this.phone,
    this.photo,
    this.photoId,
  });

  factory PickupPerson.fromJson(Json json) => PickupPerson(
    name: reqString(json, 'name'),
    relation: optString(json, 'relation'),
    phone: optString(json, 'phone'),
    photo: optObject(json, 'photo', SchoolFile.fromJson),
    photoId: optString(json, 'photo_id'),
  );

  final String name;
  final String? relation;
  final String? phone;
  final SchoolFile? photo;

  /// The photo's id, sent again to keep it on the list.
  final String? photoId;

  PickupPersonInput toInput() => PickupPersonInput(
    name: name,
    relation: relation,
    phone: phone,
    photoId: photoId,
  );
}

/// "Today X picks up" (`PickupNote`).
class PickupNote {
  const PickupNote({
    required this.date,
    required this.name,
    this.relation,
    this.phone,
    this.note,
    this.writtenBy,
  });

  factory PickupNote.fromJson(Json json) => PickupNote(
    date: reqString(json, 'date'),
    name: reqString(json, 'name'),
    relation: optString(json, 'relation'),
    phone: optString(json, 'phone'),
    note: optString(json, 'note'),
    writtenBy: optString(json, 'written_by'),
  );

  final String date;
  final String name;
  final String? relation;
  final String? phone;
  final String? note;
  final String? writtenBy;
}

/// `GET /parent/children/{id}/pickup`.
class ChildPickup {
  const ChildPickup({
    required this.student,
    this.people = const [],
    this.today,
    this.notes = const [],
  });

  factory ChildPickup.fromJson(Json json) => ChildPickup(
    student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
    people: listOf(json, 'people', PickupPerson.fromJson),
    today: optObject(json, 'today', PickupNote.fromJson),
    notes: listOf(json, 'notes', PickupNote.fromJson),
  );

  final SchoolStudent student;
  final List<PickupPerson> people;
  final PickupNote? today;
  final List<PickupNote> notes;
}

/// A person on the pick-up list as the app sends it: a photo already on
/// the list keeps its id ([photoId], the media file's).
class PickupPersonInput {
  const PickupPersonInput({
    required this.name,
    this.relation,
    this.phone,
    this.photoId,
  });

  final String name;
  final String? relation;
  final String? phone;
  final String? photoId;

  Json toJson() => {
    'name': name,
    'relation': relation,
    'phone': phone,
    'photo_id': photoId,
  };
}
