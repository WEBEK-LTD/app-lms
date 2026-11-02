import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';

/// 113.5 The syllabus of a teacher's classes, their reports to the school,
/// and the reports the school shared with a student's parents.

final classSyllabusProvider = FutureProvider.autoDispose
    .family<ClassSyllabus, int>(
      (ref, id) => ref.read(yallappApiProvider).getClassSyllabus(id),
    );

final reportTemplatesProvider =
    FutureProvider.autoDispose<List<ReportTemplate>>(
      (ref) => ref.read(yallappApiProvider).listReportTemplates(),
    );

final classStudentsProvider = FutureProvider.autoDispose
    .family<List<SchoolStudent>, int>(
      (ref, id) => ref.read(yallappApiProvider).listClassStudents(id),
    );

/// The teacher's reports in one status, the last changed first.
class TeacherReportsController extends PagedController<TeacherReport> {
  TeacherReportsController(this.status);

  final ReportStatus status;

  @override
  Future<Paged<TeacherReport>> fetch(int page) => ref
      .read(yallappApiProvider)
      .listTeacherReports(status: status, page: page);
}

final teacherReportsProvider = NotifierProvider.autoDispose
    .family<TeacherReportsController, PagedState<TeacherReport>, ReportStatus>(
      TeacherReportsController.new,
    );

final teacherReportProvider = FutureProvider.autoDispose
    .family<TeacherReport, int>(
      (ref, id) => ref.read(yallappApiProvider).getTeacherReport(id),
    );

/// The reports the school shared with the student's parents.
final sharedReportsProvider = FutureProvider.autoDispose
    .family<List<SharedReport>, int>(
      (ref, id) => ref.read(yallappApiProvider).listSharedReports(id),
    );
