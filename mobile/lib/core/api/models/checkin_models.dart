import 'json.dart';
import 'school_models.dart';

/// 113.2 Checking in and out at the school (tag Check-in) and 113.3 the
/// school's teachers and staff (tag Staff) in docs/api/openapi.yaml.

/// How people check in: the gate's code, inside the school's area, either
/// one, or both at once.
enum CheckinMethods {
  qr,
  location,
  either,
  both;

  bool get usesCode => this != location;
  bool get usesPlace => this != qr;
}

/// `Config.school.checkin`.
class CheckinConfig {
  const CheckinConfig({this.on = false, this.methods = CheckinMethods.either});

  factory CheckinConfig.fromJson(Json json) => CheckinConfig(
    on: boolOr(json, 'on', false),
    methods: enumFrom(
      CheckinMethods.values,
      json['methods'],
      CheckinMethods.either,
    ),
  );

  final bool on;
  final CheckinMethods methods;
}

/// A day's times: it starts, late from, it ends, leaving early before.
class CheckinTimes {
  const CheckinTimes({
    required this.starts,
    required this.lateFrom,
    required this.ends,
    required this.earlyBefore,
  });

  factory CheckinTimes.fromJson(Json json) => CheckinTimes(
    starts: reqString(json, 'starts'),
    lateFrom: reqString(json, 'late_from'),
    ends: reqString(json, 'ends'),
    earlyBefore: reqString(json, 'early_before'),
  );

  final String starts;
  final String lateFrom;
  final String ends;
  final String earlyBefore;
}

/// Where a day stands at the gate.
enum CheckinState {
  notYet('not_yet'),
  checkedIn('in'),
  left('left'),
  absent('absent'),
  excused('excused'),
  leave('leave'),
  off('off');

  const CheckinState(this.wire);

  final String wire;

  static CheckinState from(Object? wire) => values.firstWhere(
    (s) => s.wire == wire,
    orElse: () => CheckinState.notYet,
  );
}

enum CheckinMethod { qr, location, office }

/// A correction by the school's office, kept on the day.
class CheckinCorrection {
  const CheckinCorrection({
    required this.at,
    required this.reason,
    required this.change,
  });

  factory CheckinCorrection.fromJson(Json json) => CheckinCorrection(
    at: reqDate(json, 'at'),
    reason: reqString(json, 'reason'),
    change: reqString(json, 'change'),
  );

  final DateTime at;
  final String reason;
  final String change;
}

/// A day at the gate (`CheckinDay`); times are the school's, `HH:MM`.
class CheckinDay {
  const CheckinDay({
    required this.date,
    this.state = CheckinState.notYet,
    this.inTime,
    this.inMethod,
    this.outTime,
    this.outMethod,
    this.late = false,
    this.leftEarly = false,
    this.corrections = const [],
  });

  factory CheckinDay.fromJson(Json json) => CheckinDay(
    date: reqString(json, 'date'),
    state: CheckinState.from(json['state']),
    inTime: optString(json, 'in_time'),
    inMethod: enumOrNull(CheckinMethod.values, json['in_method']),
    outTime: optString(json, 'out_time'),
    outMethod: enumOrNull(CheckinMethod.values, json['out_method']),
    late: boolOr(json, 'late', false),
    leftEarly: boolOr(json, 'left_early', false),
    corrections: listOf(json, 'corrections', CheckinCorrection.fromJson),
  );

  final String date;
  final CheckinState state;
  final String? inTime;
  final CheckinMethod? inMethod;
  final String? outTime;
  final CheckinMethod? outMethod;
  final bool late;
  final bool leftEarly;
  final List<CheckinCorrection> corrections;

  bool get isIn => inTime != null;
  bool get isOut => outTime != null;
}

/// The school's place, for the location method.
class CheckinPlace {
  const CheckinPlace({
    required this.lat,
    required this.lng,
    required this.radiusM,
  });

  factory CheckinPlace.fromJson(Json json) => CheckinPlace(
    lat: optDouble(json, 'lat') ?? 0,
    lng: optDouble(json, 'lng') ?? 0,
    radiusM: intOr(json, 'radius_m', 0),
  );

  final double lat;
  final double lng;
  final int radiusM;
}

/// `GET /school/checkin`: today for the signed-in person.
class CheckinToday {
  const CheckinToday({
    required this.on,
    required this.methods,
    this.place,
    required this.role,
    required this.date,
    required this.schoolDay,
    required this.times,
    required this.today,
  });

  factory CheckinToday.fromJson(Json json) => CheckinToday(
    on: boolOr(json, 'on', false),
    methods: enumFrom(
      CheckinMethods.values,
      json['methods'],
      CheckinMethods.either,
    ),
    place: optObject(json, 'place', CheckinPlace.fromJson),
    role: enumFrom(SchoolRole.values, json['role'], SchoolRole.student),
    date: reqString(json, 'date'),
    schoolDay: boolOr(json, 'school_day', true),
    times: CheckinTimes.fromJson(asJson(json['times'], 'times')),
    today: CheckinDay.fromJson(asJson(json['today'], 'today')),
  );

  final bool on;
  final CheckinMethods methods;
  final CheckinPlace? place;
  final SchoolRole role;
  final String date;
  final bool schoolDay;
  final CheckinTimes times;
  final CheckinDay today;
}

enum CheckinOutcome { onTime, late, out, leftEarly }

/// `POST /school/checkin`.
class CheckinResult {
  const CheckinResult({
    required this.result,
    required this.time,
    required this.day,
  });

  factory CheckinResult.fromJson(Json json) => CheckinResult(
    result: enumFromSnake(
      CheckinOutcome.values,
      json['result'],
      CheckinOutcome.onTime,
    ),
    time: reqString(json, 'time'),
    day: CheckinDay.fromJson(asJson(json['day'], 'day')),
  );

  final CheckinOutcome result;
  final String time;
  final CheckinDay day;
}

/// A month at the gate: the counts to today and each day, newest first.
class CheckinMonth {
  const CheckinMonth({
    required this.month,
    required this.times,
    this.days = const [],
    this.counts = const {},
  });

  factory CheckinMonth.fromJson(Json json) {
    final counts = asJson(json['counts'], 'counts');
    return CheckinMonth(
      month: reqString(json, 'month'),
      times: CheckinTimes.fromJson(asJson(json['times'], 'times')),
      days: listOf(json, 'days', CheckinDay.fromJson),
      counts: {
        for (final key in [
          'days',
          'present',
          'late',
          'left_early',
          'absent',
          'excused',
          'leave',
        ])
          key: intOr(counts, key, 0),
      },
    );
  }

  final String month;
  final CheckinTimes times;
  final List<CheckinDay> days;
  final Map<String, int> counts;

  int count(String key) => counts[key] ?? 0;
}

// 113.3 Teachers and staff

/// Their own working days and hours.
class WorkHours {
  const WorkHours({
    required this.days,
    required this.starts,
    required this.ends,
  });

  factory WorkHours.fromJson(Json json) => WorkHours(
    days: [
      for (final d in (json['days'] as List?) ?? const [])
        if (d is num) d.toInt(),
    ],
    starts: reqString(json, 'starts'),
    ends: reqString(json, 'ends'),
  );

  final List<int> days;
  final String starts;
  final String ends;
}

/// `GET /staff/me`.
class StaffMe {
  const StaffMe({
    required this.name,
    this.photoUrl,
    this.isTeacher = false,
    this.jobTitle,
    this.department,
    this.workHours,
    this.days = const [],
    required this.times,
    this.duties,
    required this.timetable,
  });

  factory StaffMe.fromJson(Json json) => StaffMe(
    name: reqString(json, 'name'),
    photoUrl: optString(json, 'photo_url'),
    isTeacher: json['role'] == 'teacher',
    jobTitle: optString(json, 'job_title'),
    department: optString(json, 'department'),
    workHours: optObject(json, 'work_hours', WorkHours.fromJson),
    days: [
      for (final d in (json['days'] as List?) ?? const [])
        if (d is num) d.toInt(),
    ],
    times: CheckinTimes.fromJson(asJson(json['times'], 'times')),
    duties: optString(json, 'duties'),
    timetable: SchoolTimetable.fromJson(asJson(json['timetable'], 'timetable')),
  );

  final String name;
  final String? photoUrl;
  final bool isTeacher;
  final String? jobTitle;
  final String? department;
  final WorkHours? workHours;

  /// The days they work, 1 Monday … 7 Sunday.
  final List<int> days;
  final CheckinTimes times;
  final String? duties;
  final SchoolTimetable timetable;
}

enum LeaveKind { sick, annual, other }

enum LeaveStatus { pending, approved, refused, cancelled }

/// A leave request (`LeaveRequest`).
class LeaveRequest {
  const LeaveRequest({
    required this.id,
    required this.kind,
    required this.startsOn,
    required this.endsOn,
    required this.days,
    this.note,
    this.file,
    this.status = LeaveStatus.pending,
    this.answer,
    this.answeredAt,
    required this.createdAt,
  });

  factory LeaveRequest.fromJson(Json json) => LeaveRequest(
    id: reqInt(json, 'id'),
    kind: enumFrom(LeaveKind.values, json['kind'], LeaveKind.other),
    startsOn: reqString(json, 'starts_on'),
    endsOn: reqString(json, 'ends_on'),
    days: intOr(json, 'days', 1),
    note: optString(json, 'note'),
    file: optObject(json, 'file', SchoolFile.fromJson),
    status: enumFrom(LeaveStatus.values, json['status'], LeaveStatus.pending),
    answer: optString(json, 'answer'),
    answeredAt: optDate(json, 'answered_at'),
    createdAt: reqDate(json, 'created_at'),
  );

  final int id;
  final LeaveKind kind;
  final String startsOn;
  final String endsOn;
  final int days;
  final String? note;
  final SchoolFile? file;
  final LeaveStatus status;
  final String? answer;
  final DateTime? answeredAt;
  final DateTime createdAt;
}

/// What a leave request sends (`POST /staff/leave`).
class LeaveInput {
  const LeaveInput({
    required this.kind,
    required this.startsOn,
    required this.endsOn,
    this.note,
    this.uploadId,
  });

  final LeaveKind kind;
  final String startsOn;
  final String endsOn;
  final String? note;
  final String? uploadId;

  Json toJson() => {
    'kind': kind.name,
    'starts_on': startsOn,
    'ends_on': endsOn,
    'note': ?note,
    'upload_id': ?uploadId,
  };
}
