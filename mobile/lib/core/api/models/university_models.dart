import 'json.dart';
import 'school_models.dart';

/// 113.9 Universities (docs/api/openapi.yaml, the University tag): a
/// student's program, registration, timetable, results, transcript and
/// study plan; a lecturer's sections, grades and advisees.

class UniTerm {
  const UniTerm({
    required this.id,
    required this.name,
    this.academicYear = '',
    this.startsOn = '',
    this.endsOn = '',
    this.registrationOpens = '',
    this.registrationCloses = '',
    this.dropUntil = '',
  });

  factory UniTerm.fromJson(Json json) => UniTerm(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    academicYear: optString(json, 'academic_year') ?? '',
    startsOn: optString(json, 'starts_on') ?? '',
    endsOn: optString(json, 'ends_on') ?? '',
    registrationOpens: optString(json, 'registration_opens') ?? '',
    registrationCloses: optString(json, 'registration_closes') ?? '',
    dropUntil: optString(json, 'drop_until') ?? '',
  );

  final int id;
  final String name;
  final String academicYear;
  final String startsOn;
  final String endsOn;
  final String registrationOpens;
  final String registrationCloses;
  final String dropUntil;
}

class UniProgram {
  const UniProgram({
    required this.id,
    required this.name,
    this.code,
    this.degree = '',
    this.department,
    this.faculty,
    this.creditsRequired = 0,
    this.years = 0,
    this.minTermCredits = 0,
    this.maxTermCredits = 0,
  });

  factory UniProgram.fromJson(Json json) => UniProgram(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    code: optString(json, 'code'),
    degree: optString(json, 'degree') ?? '',
    department: optString(json, 'department'),
    faculty: optString(json, 'faculty'),
    creditsRequired: optDouble(json, 'credits_required') ?? 0,
    years: intOr(json, 'years', 0),
    minTermCredits: optDouble(json, 'min_term_credits') ?? 0,
    maxTermCredits: optDouble(json, 'max_term_credits') ?? 0,
  );

  final int id;
  final String name;
  final String? code;
  final String degree;
  final String? department;
  final String? faculty;
  final double creditsRequired;
  final int years;
  final double minTermCredits;
  final double maxTermCredits;

  /// "BSc Computer Science".
  String get title => degree.isEmpty ? name : '$degree $name';
}

class UniCourse {
  const UniCourse({
    required this.id,
    required this.code,
    required this.title,
    this.credits = 0,
    this.prerequisites = const [],
  });

  factory UniCourse.fromJson(Json json) => UniCourse(
    id: reqInt(json, 'id'),
    code: reqString(json, 'code'),
    title: reqString(json, 'title'),
    credits: optDouble(json, 'credits') ?? 0,
    prerequisites: stringList(json, 'prerequisites'),
  );

  final int id;
  final String code;
  final String title;
  final double credits;
  final List<String> prerequisites;
}

class UniMeeting {
  const UniMeeting({
    required this.weekday,
    required this.starts,
    required this.ends,
    this.room,
  });

  factory UniMeeting.fromJson(Json json) => UniMeeting(
    weekday: reqInt(json, 'weekday'),
    starts: reqString(json, 'starts'),
    ends: reqString(json, 'ends'),
    room: optString(json, 'room'),
  );

  /// 1 Monday … 7 Sunday.
  final int weekday;
  final String starts;
  final String ends;
  final String? room;
}

/// A section of a course in a term; offered ones say whether it can be added.
class UniSection {
  const UniSection({
    required this.id,
    required this.code,
    required this.course,
    this.lecturerName,
    this.seats = 0,
    this.seatsLeft,
    this.meetings = const [],
    this.canAdd = false,
    this.waitlist = false,
    this.problems = const [],
    this.students = 0,
    this.resultsPublished = false,
  });

  factory UniSection.fromJson(Json json) => UniSection(
    id: reqInt(json, 'id'),
    code: reqString(json, 'code'),
    course: UniCourse.fromJson(asJson(json['course'], 'course')),
    lecturerName: optString(json, 'lecturer_name'),
    seats: intOr(json, 'seats', 0),
    seatsLeft: optInt(json, 'seats_left'),
    meetings: listOf(json, 'meetings', UniMeeting.fromJson),
    canAdd: boolOr(json, 'can_add', false),
    waitlist: boolOr(json, 'waitlist', false),
    problems: [
      for (final p in listOf(json, 'problems', (p) => p))
        reqString(p, 'message'),
    ],
    students: intOr(json, 'students', 0),
    resultsPublished: boolOr(json, 'results_published', false),
  );

  final int id;
  final String code;
  final UniCourse course;
  final String? lecturerName;
  final int seats;
  final int? seatsLeft;
  final List<UniMeeting> meetings;
  final bool canAdd;

  /// Full: adding it joins its waiting list.
  final bool waitlist;

  /// Why it can't be added, in the API's words.
  final List<String> problems;

  /// A lecturer's: the students holding a seat.
  final int students;
  final bool resultsPublished;

  /// "CS201-01".
  String get label => '${course.code}-$code';
}

enum UniEnrolmentStatus { pending, enrolled, waitlisted }

enum UniRegistrationStatus { draft, submitted, approved, returned }

enum UniPhase { before, open, drop, closed }

/// A section the student holds this term.
class UniHeldSection {
  const UniHeldSection({
    required this.id,
    required this.status,
    required this.section,
    this.canDrop = false,
  });

  factory UniHeldSection.fromJson(Json json) => UniHeldSection(
    id: reqInt(json, 'id'),
    status: enumFrom(
      UniEnrolmentStatus.values,
      json['status'],
      UniEnrolmentStatus.pending,
    ),
    section: UniSection.fromJson(asJson(json['section'], 'section')),
    canDrop: boolOr(json, 'can_drop', false),
  );

  final int id;
  final UniEnrolmentStatus status;
  final UniSection section;
  final bool canDrop;
}

typedef UniCredits = ({double taken, double min, double max});

UniCredits _credits(Json json) => (
  taken: optDouble(json, 'taken') ?? 0,
  min: optDouble(json, 'min') ?? 0,
  max: optDouble(json, 'max') ?? 0,
);

/// `UniversityStudent`: the student's program, advisor and standing.
class UniversityStudent {
  const UniversityStudent({
    required this.student,
    this.program,
    this.advisorName,
    this.startYear,
    this.gpa,
    this.creditsEarned = 0,
    this.currentTerm,
    this.registrationTerm,
    this.registrationStatus = UniRegistrationStatus.draft,
    this.registrationPhase = UniPhase.closed,
  });

  factory UniversityStudent.fromJson(Json json) {
    final registration = json['registration'];
    final reg = registration is Map ? asJson(registration) : null;
    return UniversityStudent(
      student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
      program: optObject(json, 'program', UniProgram.fromJson),
      advisorName: json['advisor'] is Map
          ? optString(asJson(json['advisor']), 'name')
          : null,
      startYear: optString(json, 'start_year'),
      gpa: optDouble(json, 'gpa'),
      creditsEarned: optDouble(json, 'credits_earned') ?? 0,
      currentTerm: optObject(json, 'current_term', UniTerm.fromJson),
      registrationTerm: reg == null
          ? null
          : UniTerm.fromJson(asJson(reg['term'], 'term')),
      registrationStatus: reg == null
          ? UniRegistrationStatus.draft
          : enumFrom(
              UniRegistrationStatus.values,
              reg['status'],
              UniRegistrationStatus.draft,
            ),
      registrationPhase: reg == null
          ? UniPhase.closed
          : enumFrom(UniPhase.values, reg['phase'], UniPhase.closed),
    );
  }

  final SchoolStudent student;
  final UniProgram? program;
  final String? advisorName;
  final String? startYear;
  final double? gpa;
  final double creditsEarned;
  final UniTerm? currentTerm;
  final UniTerm? registrationTerm;
  final UniRegistrationStatus registrationStatus;
  final UniPhase registrationPhase;
}

/// `UniRegistration`: the student's sections this term and those offered.
class UniRegistration {
  const UniRegistration({
    required this.term,
    this.terms = const [],
    this.status = UniRegistrationStatus.draft,
    this.note,
    this.phase = UniPhase.closed,
    this.canAdd = false,
    this.canDrop = false,
    this.canSubmit = false,
    this.credits = (taken: 0, min: 0, max: 0),
    this.mine = const [],
    this.offered = const [],
  });

  factory UniRegistration.fromJson(Json json) => UniRegistration(
    term: UniTerm.fromJson(asJson(json['term'], 'term')),
    terms: listOf(json, 'terms', UniTerm.fromJson),
    status: enumFrom(
      UniRegistrationStatus.values,
      json['status'],
      UniRegistrationStatus.draft,
    ),
    note: optString(json, 'note'),
    phase: enumFrom(UniPhase.values, json['phase'], UniPhase.closed),
    canAdd: boolOr(json, 'can_add', false),
    canDrop: boolOr(json, 'can_drop', false),
    canSubmit: boolOr(json, 'can_submit', false),
    credits: _credits(asJson(json['credits'], 'credits')),
    mine: listOf(json, 'mine', UniHeldSection.fromJson),
    offered: listOf(json, 'offered', UniSection.fromJson),
  );

  final UniTerm term;
  final List<UniTerm> terms;
  final UniRegistrationStatus status;
  final String? note;
  final UniPhase phase;
  final bool canAdd;
  final bool canDrop;
  final bool canSubmit;
  final UniCredits credits;
  final List<UniHeldSection> mine;
  final List<UniSection> offered;
}

class UniLecture {
  const UniLecture({
    required this.sectionId,
    required this.courseCode,
    required this.courseTitle,
    required this.sectionCode,
    required this.starts,
    required this.ends,
    this.room,
    this.lecturerName,
    this.status = UniEnrolmentStatus.enrolled,
  });

  factory UniLecture.fromJson(Json json) => UniLecture(
    sectionId: reqInt(json, 'section_id'),
    courseCode: reqString(json, 'course_code'),
    courseTitle: reqString(json, 'course_title'),
    sectionCode: reqString(json, 'section_code'),
    starts: reqString(json, 'starts'),
    ends: reqString(json, 'ends'),
    room: optString(json, 'room'),
    lecturerName: optString(json, 'lecturer_name'),
    status: enumFrom(
      UniEnrolmentStatus.values,
      json['status'],
      UniEnrolmentStatus.enrolled,
    ),
  );

  final int sectionId;
  final String courseCode;
  final String courseTitle;
  final String sectionCode;
  final String starts;
  final String ends;
  final String? room;
  final String? lecturerName;
  final UniEnrolmentStatus status;
}

/// `UniTimetable`: the student's week of lectures.
class UniTimetable {
  const UniTimetable({this.term, this.days = const []});

  factory UniTimetable.fromJson(Json json) => UniTimetable(
    term: optObject(json, 'term', UniTerm.fromJson),
    days: listOf(
      json,
      'days',
      (d) => (
        weekday: reqInt(d, 'weekday'),
        lectures: listOf(d, 'lectures', UniLecture.fromJson),
      ),
    ),
  );

  final UniTerm? term;
  final List<({int weekday, List<UniLecture> lectures})> days;

  List<UniLecture> on(int weekday) =>
      days.where((d) => d.weekday == weekday).firstOrNull?.lectures ?? const [];
}

class UniCourseResult {
  const UniCourseResult({
    required this.courseCode,
    required this.title,
    required this.credits,
    required this.grade,
    this.points,
    this.passed = false,
  });

  factory UniCourseResult.fromJson(Json json) => UniCourseResult(
    courseCode: reqString(json, 'course_code'),
    title: reqString(json, 'title'),
    credits: optDouble(json, 'credits') ?? 0,
    grade: reqString(json, 'grade'),
    points: optDouble(json, 'points'),
    passed: boolOr(json, 'passed', false),
  );

  final String courseCode;
  final String title;
  final double credits;
  final String grade;
  final double? points;
  final bool passed;
}

class UniTermResult {
  const UniTermResult({
    required this.term,
    this.gpa,
    this.credits = 0,
    this.courses = const [],
  });

  factory UniTermResult.fromJson(Json json) => UniTermResult(
    term: UniTerm.fromJson(asJson(json['term'], 'term')),
    gpa: optDouble(json, 'gpa'),
    credits: optDouble(json, 'credits') ?? 0,
    courses: listOf(json, 'courses', UniCourseResult.fromJson),
  );

  final UniTerm term;
  final double? gpa;
  final double credits;
  final List<UniCourseResult> courses;
}

/// `UniResults` (and `UniTranscript`, with its program and PDF).
class UniResults {
  const UniResults({
    this.gpa,
    this.creditsEarned = 0,
    this.creditsRequired,
    this.terms = const [],
    this.program,
    this.pdfUrl,
  });

  factory UniResults.fromJson(Json json) => UniResults(
    gpa: optDouble(json, 'gpa'),
    creditsEarned: optDouble(json, 'credits_earned') ?? 0,
    creditsRequired: optDouble(json, 'credits_required'),
    terms: listOf(json, 'terms', UniTermResult.fromJson),
    program: optObject(json, 'program', UniProgram.fromJson),
    pdfUrl: optString(json, 'pdf_url'),
  );

  final double? gpa;
  final double creditsEarned;
  final double? creditsRequired;

  /// The latest first.
  final List<UniTermResult> terms;
  final UniProgram? program;
  final String? pdfUrl;
}

enum UniPlanStatus { done, inProgress, left }

class UniPlanCourse {
  const UniPlanCourse({
    required this.courseCode,
    required this.title,
    this.credits = 0,
    this.required = true,
    this.status = UniPlanStatus.left,
    this.grade,
  });

  factory UniPlanCourse.fromJson(Json json) => UniPlanCourse(
    courseCode: reqString(json, 'course_code'),
    title: reqString(json, 'title'),
    credits: optDouble(json, 'credits') ?? 0,
    required: boolOr(json, 'required', true),
    status: enumFromSnake(
      UniPlanStatus.values,
      json['status'],
      UniPlanStatus.left,
    ),
    grade: optString(json, 'grade'),
  );

  final String courseCode;
  final String title;
  final double credits;
  final bool required;
  final UniPlanStatus status;
  final String? grade;
}

/// `UniStudyPlan`: the program's courses, done, in progress and left.
class UniStudyPlan {
  const UniStudyPlan({this.program, this.credits, this.years = const []});

  factory UniStudyPlan.fromJson(Json json) {
    final c = json['credits'];
    return UniStudyPlan(
      program: optObject(json, 'program', UniProgram.fromJson),
      credits: c is Map
          ? (
              required: optDouble(asJson(c), 'required') ?? 0,
              done: optDouble(asJson(c), 'done') ?? 0,
              inProgress: optDouble(asJson(c), 'in_progress') ?? 0,
              left: optDouble(asJson(c), 'left') ?? 0,
            )
          : null,
      years: listOf(
        json,
        'years',
        (y) => (
          year: reqInt(y, 'year'),
          courses: listOf(y, 'courses', UniPlanCourse.fromJson),
        ),
      ),
    );
  }

  final UniProgram? program;
  final ({double required, double done, double inProgress, double left})?
  credits;
  final List<({int year, List<UniPlanCourse> courses})> years;
}

/// `LecturerHome`: a lecturer's sections in a term and their advisees.
class LecturerHome {
  const LecturerHome({
    required this.name,
    this.term,
    this.terms = const [],
    this.sections = const [],
    this.adviseeCount = 0,
    this.adviseesWaiting = 0,
  });

  factory LecturerHome.fromJson(Json json) {
    final advisees = json['advisees'] is Map
        ? asJson(json['advisees'])
        : const <String, dynamic>{};
    return LecturerHome(
      name: optString(json, 'name') ?? '',
      term: optObject(json, 'term', UniTerm.fromJson),
      terms: listOf(json, 'terms', UniTerm.fromJson),
      sections: listOf(json, 'sections', UniSection.fromJson),
      adviseeCount: intOr(advisees, 'count', 0),
      adviseesWaiting: intOr(advisees, 'waiting', 0),
    );
  }

  final String name;
  final UniTerm? term;
  final List<UniTerm> terms;
  final List<UniSection> sections;
  final int adviseeCount;
  final int adviseesWaiting;
}

class UniGradeStep {
  const UniGradeStep({
    required this.letter,
    required this.points,
    this.minPercent,
  });

  factory UniGradeStep.fromJson(Json json) => UniGradeStep(
    letter: reqString(json, 'letter'),
    points: optDouble(json, 'points') ?? 0,
    minPercent: optDouble(json, 'min_percent'),
  );

  final String letter;
  final double points;
  final double? minPercent;
}

/// `UniSectionDetail`: one of the lecturer's sections with its grades.
class UniSectionDetail {
  const UniSectionDetail({
    required this.section,
    required this.term,
    this.resultsPublishedAt,
    this.scale = const [],
    this.students = const [],
  });

  factory UniSectionDetail.fromJson(Json json) => UniSectionDetail(
    section: UniSection.fromJson(asJson(json['section'], 'section')),
    term: UniTerm.fromJson(asJson(json['term'], 'term')),
    resultsPublishedAt: optString(json, 'results_published_at'),
    scale: listOf(json, 'scale', UniGradeStep.fromJson),
    students: listOf(
      json,
      'students',
      (s) => (
        student: SchoolStudent.fromJson(asJson(s['student'], 'student')),
        enrolled: s['status'] == 'enrolled',
        grade: optString(s, 'grade'),
        mark: optDouble(s, 'mark'),
      ),
    ),
  );

  final UniSection section;
  final UniTerm term;
  final String? resultsPublishedAt;
  final List<UniGradeStep> scale;
  final List<
    ({SchoolStudent student, bool enrolled, String? grade, double? mark})
  >
  students;
}

/// `UniSectionAttendance`: a lecture's marks.
class UniSectionAttendance {
  const UniSectionAttendance({
    required this.sectionId,
    required this.date,
    this.students = const [],
  });

  factory UniSectionAttendance.fromJson(Json json) => UniSectionAttendance(
    sectionId: reqInt(json, 'section_id'),
    date: reqString(json, 'date'),
    students: listOf(
      json,
      'students',
      (s) => (
        student: SchoolStudent.fromJson(asJson(s['student'], 'student')),
        status: enumOrNull(AttendanceStatus.values, s['status']),
      ),
    ),
  );

  final int sectionId;
  final String date;
  final List<({SchoolStudent student, AttendanceStatus? status})> students;
}

/// `AdviseeList`.
class AdviseeList {
  const AdviseeList({this.term, this.items = const []});

  factory AdviseeList.fromJson(Json json) => AdviseeList(
    term: optObject(json, 'term', UniTerm.fromJson),
    items: listOf(
      json,
      'items',
      (i) => (
        student: SchoolStudent.fromJson(asJson(i['student'], 'student')),
        programName: optString(i, 'program_name'),
        status: enumFrom(
          UniRegistrationStatus.values,
          i['status'],
          UniRegistrationStatus.draft,
        ),
        credits: optDouble(i, 'credits') ?? 0,
      ),
    ),
  );

  final UniTerm? term;
  final List<
    ({
      SchoolStudent student,
      String? programName,
      UniRegistrationStatus status,
      double credits,
    })
  >
  items;
}

/// `AdviseeDetail`: an advisee's registration for the advisor's answer.
class AdviseeDetail {
  const AdviseeDetail({
    required this.student,
    required this.term,
    this.program,
    this.gpa,
    this.status = UniRegistrationStatus.draft,
    this.note,
    this.credits = (taken: 0, min: 0, max: 0),
    this.sections = const [],
    this.canDecide = false,
  });

  factory AdviseeDetail.fromJson(Json json) => AdviseeDetail(
    student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
    term: UniTerm.fromJson(asJson(json['term'], 'term')),
    program: optObject(json, 'program', UniProgram.fromJson),
    gpa: optDouble(json, 'gpa'),
    status: enumFrom(
      UniRegistrationStatus.values,
      json['status'],
      UniRegistrationStatus.draft,
    ),
    note: optString(json, 'note'),
    credits: _credits(asJson(json['credits'], 'credits')),
    sections: listOf(json, 'sections', UniHeldSection.fromJson),
    canDecide: boolOr(json, 'can_decide', false),
  );

  final SchoolStudent student;
  final UniTerm term;
  final UniProgram? program;
  final double? gpa;
  final UniRegistrationStatus status;
  final String? note;
  final UniCredits credits;
  final List<UniHeldSection> sections;
  final bool canDecide;
}
