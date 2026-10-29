import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../chat/data/chat_api.dart';

/// 105.4 Schools: who the signed-in person is at the school, the student a
/// parent is looking at, and each screen's data.

/// `Config.school`; null in other apps.
final schoolConfigProvider = Provider<SchoolConfig?>((ref) {
  if (ref.watch(appEnvironmentProvider).build.appType != AppType.school) {
    return null;
  }
  final gate = ref.watch(appGateProvider);
  return gate is GateReady ? gate.config.school : null;
});

/// The signed-in person is one of the school's teachers: the Classroom tab
/// is theirs only. Null: not a school app.
final isSchoolTeacherProvider = Provider<bool?>((ref) {
  if (ref.watch(appEnvironmentProvider).build.appType != AppType.school) {
    return null;
  }
  return ref.watch(authControllerProvider).user?.isTeacher ?? false;
});

/// The person and the students they see; refetched when they sign in or out.
final schoolMeProvider = FutureProvider.autoDispose<SchoolMe>((ref) {
  ref.watch(authControllerProvider.select((s) => s.user?.id));
  return ref.read(yallappApiProvider).getSchoolMe();
});

/// The student a parent chose (their first one until they choose).
class ChosenStudent extends Notifier<int?> {
  @override
  int? build() => null;

  void choose(int id) => state = id;
}

final chosenStudentProvider = NotifierProvider<ChosenStudent, int?>(
  ChosenStudent.new,
);

/// The student the screens show: [wanted] (from a notification) when it is
/// one of theirs, else the chosen one, else the first.
SchoolStudent? studentOf(SchoolMe me, int? chosen, {int? wanted}) {
  for (final id in [wanted, chosen]) {
    final found = me.students.where((s) => s.id == id).firstOrNull;
    if (found != null) return found;
  }
  return me.students.firstOrNull;
}

final studentTimetableProvider = FutureProvider.autoDispose
    .family<SchoolTimetable, int>(
      (ref, id) => ref.read(yallappApiProvider).getStudentTimetable(id),
    );

final studentAttendanceProvider = FutureProvider.autoDispose
    .family<StudentAttendance, int>(
      (ref, id) => ref.read(yallappApiProvider).getStudentAttendance(id),
    );

final studentGradesProvider = FutureProvider.autoDispose
    .family<StudentGrades, int>(
      (ref, id) => ref.read(yallappApiProvider).getStudentGrades(id),
    );

final studentFeesProvider = FutureProvider.autoDispose.family<StudentFees, int>(
  (ref, id) => ref.read(yallappApiProvider).getStudentFees(id),
);

/// A student's homework, still due or done.
class HomeworkController extends PagedController<Homework> {
  HomeworkController(this.query);

  final ({int student, HomeworkStatus status}) query;

  @override
  Future<Paged<Homework>> fetch(int page) => ref
      .read(yallappApiProvider)
      .listStudentHomework(query.student, status: query.status, page: page);
}

final studentHomeworkProvider = NotifierProvider.autoDispose
    .family<
      HomeworkController,
      PagedState<Homework>,
      ({int student, HomeworkStatus status})
    >(HomeworkController.new);

/// The school's news for the person, newest first.
class SchoolNewsController extends PagedController<SchoolAnnouncement> {
  @override
  Future<Paged<SchoolAnnouncement>> fetch(int page) =>
      ref.read(yallappApiProvider).listSchoolAnnouncements(page: page);
}

final schoolNewsProvider =
    NotifierProvider.autoDispose<
      SchoolNewsController,
      PagedState<SchoolAnnouncement>
    >(SchoolNewsController.new);

// The Classroom

final classroomMeProvider = FutureProvider.autoDispose<ClassroomMe>(
  (ref) => ref.read(yallappApiProvider).getClassroomMe(),
);

final classAttendanceProvider = FutureProvider.autoDispose
    .family<ClassAttendance, ({int classId, String? date})>(
      (ref, q) => ref
          .read(yallappApiProvider)
          .getClassAttendance(q.classId, date: q.date),
    );

/// A class's homework, newest first.
class ClassHomeworkController extends PagedController<ClassroomHomework> {
  ClassHomeworkController(this.classId);

  final int classId;

  @override
  Future<Paged<ClassroomHomework>> fetch(int page) => ref
      .read(yallappApiProvider)
      .listClassroomHomework(classId: classId, page: page);
}

final classHomeworkProvider = NotifierProvider.autoDispose
    .family<ClassHomeworkController, PagedState<ClassroomHomework>, int>(
      ClassHomeworkController.new,
    );

final classroomHomeworkProvider = FutureProvider.autoDispose
    .family<ClassroomHomeworkDetail, int>(
      (ref, id) => ref.read(yallappApiProvider).getClassroomHomework(id),
    );

/// A class's exams, quizzes and assignments: coming first.
class ClassAssessmentsController extends PagedController<SchoolAssessment> {
  ClassAssessmentsController(this.classId);

  final int classId;

  @override
  Future<Paged<SchoolAssessment>> fetch(int page) => ref
      .read(yallappApiProvider)
      .listClassroomAssessments(classId: classId, page: page);
}

final classAssessmentsProvider = NotifierProvider.autoDispose
    .family<ClassAssessmentsController, PagedState<SchoolAssessment>, int>(
      ClassAssessmentsController.new,
    );

final assessmentScoresProvider = FutureProvider.autoDispose
    .family<AssessmentScores, int>(
      (ref, id) => ref.read(yallappApiProvider).getAssessmentScores(id),
    );

// Files for homework

/// What homework takes: photos and PDFs.
const homeworkFileTypes = <String, String>{
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'pdf': 'application/pdf',
};

/// The largest homework file: photos 20 MB, PDFs 200 MB.
int homeworkMaxBytes(String type) =>
    type == 'application/pdf' ? 200 * 1024 * 1024 : 20 * 1024 * 1024;

/// Whether a picked file is one homework takes.
bool homeworkFileOk(ChatFile file) =>
    homeworkFileTypes.containsValue(file.type);

/// Files sent for homework: started on the API (`/school/uploads`), sent in
/// chunks to the media gate, as chat files are.
class SchoolUploads implements ChunkedUploads {
  SchoolUploads(this._api, this._gate);

  final YallappApi _api;
  final MediaGate _gate;

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => _api.startSchoolUpload(name: name, size: size, type: type);

  @override
  Future<ChatUpload> resumeUpload(String uploadId) =>
      _api.resumeSchoolUpload(uploadId);

  @override
  Future<void> completeUpload(String uploadId) =>
      _api.completeSchoolUpload(uploadId);

  @override
  Future<int> uploadOffset(String uploadUrl) => _gate.uploadOffset(uploadUrl);

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) =>
      _gate.sendChunk(uploadUrl, offset, bytes);
}

final schoolUploadsProvider = Provider<ChunkedUploads>(
  (ref) => SchoolUploads(ref.watch(yallappApiProvider), MediaGate.standalone()),
);
