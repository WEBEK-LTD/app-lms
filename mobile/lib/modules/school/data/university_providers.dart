import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import 'school_providers.dart';

/// 113.9 A school in university mode: whether it is one, and each
/// university screen's data, for students (and parents) and lecturers.

/// `Config.school.university`.
final isUniversityProvider = Provider<bool>(
  (ref) => ref.watch(schoolConfigProvider)?.university ?? false,
);

final universityStudentProvider = FutureProvider.autoDispose
    .family<UniversityStudent, int>(
      (ref, id) => ref.read(yallappApiProvider).getUniversityStudent(id),
    );

final uniRegistrationProvider = FutureProvider.autoDispose
    .family<UniRegistration, ({int student, int? term})>(
      (ref, q) => ref
          .read(yallappApiProvider)
          .getUniRegistration(q.student, termId: q.term),
    );

final uniTimetableProvider = FutureProvider.autoDispose
    .family<UniTimetable, int>(
      (ref, id) => ref.read(yallappApiProvider).getUniTimetable(id),
    );

final uniResultsProvider = FutureProvider.autoDispose.family<UniResults, int>(
  (ref, id) => ref.read(yallappApiProvider).getUniResults(id),
);

final uniTranscriptProvider = FutureProvider.autoDispose
    .family<UniResults, int>(
      (ref, id) => ref.read(yallappApiProvider).getUniTranscript(id),
    );

final uniPlanProvider = FutureProvider.autoDispose.family<UniStudyPlan, int>(
  (ref, id) => ref.read(yallappApiProvider).getUniStudyPlan(id),
);

// Lecturers and advisors

final lecturerHomeProvider = FutureProvider.autoDispose<LecturerHome>(
  (ref) => ref.read(yallappApiProvider).getLecturerHome(),
);

final lecturerSectionProvider = FutureProvider.autoDispose
    .family<UniSectionDetail, int>(
      (ref, id) => ref.read(yallappApiProvider).getLecturerSection(id),
    );

final sectionAttendanceProvider = FutureProvider.autoDispose
    .family<UniSectionAttendance, ({int section, String? date})>(
      (ref, q) => ref
          .read(yallappApiProvider)
          .getSectionAttendance(q.section, date: q.date),
    );

final adviseesProvider = FutureProvider.autoDispose<AdviseeList>(
  (ref) => ref.read(yallappApiProvider).listAdvisees(),
);

final adviseeProvider = FutureProvider.autoDispose.family<AdviseeDetail, int>(
  (ref, id) => ref.read(yallappApiProvider).getAdvisee(id),
);

/// 3 → "3", 3.5 → "3.5".
String creditsText(double value) => value == value.roundToDouble()
    ? value.toStringAsFixed(0)
    : value.toStringAsFixed(1);

/// 3.5 → "3.50"; none: "—".
String gpaText(double? value) => value == null ? '—' : value.toStringAsFixed(2);
