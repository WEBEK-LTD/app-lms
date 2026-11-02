import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';

/// 113.8 The school's calendar, the exams' timetable and behaviour: each
/// screen's data.

/// The calendar from `from` to `to`: one student's, or (no student) what
/// the person sees (a teacher's classes and the staff's).
final schoolCalendarProvider = FutureProvider.autoDispose
    .family<SchoolCalendar, ({String from, String to, int? student})>(
      (ref, q) => ref
          .read(yallappApiProvider)
          .getSchoolCalendar(from: q.from, to: q.to, studentId: q.student),
    );

/// A student's exams, or (no student) the teacher's classes'.
final schoolExamsProvider = FutureProvider.autoDispose.family<ExamLists, int?>(
  (ref, student) => student == null
      ? ref.read(yallappApiProvider).listClassroomExams()
      : ref.read(yallappApiProvider).getStudentExams(student),
);

final studentBehaviourProvider = FutureProvider.autoDispose
    .family<StudentBehaviour, int>(
      (ref, id) => ref.read(yallappApiProvider).getStudentBehaviour(id),
    );

final behaviourCategoriesProvider =
    FutureProvider.autoDispose<List<BehaviourCategory>>(
      (ref) => ref.read(yallappApiProvider).listBehaviourCategories(),
    );

final classBehaviourProvider = FutureProvider.autoDispose
    .family<ClassBehaviour, int>(
      (ref, id) => ref.read(yallappApiProvider).getClassBehaviour(id),
    );
