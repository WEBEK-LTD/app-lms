import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';

/// 105.3 How the academy works with its teachers (`Config.instructors`):
/// null when it has none (any other academy).
final instructorsConfigProvider = Provider<InstructorsConfig?>((ref) {
  if (ref.watch(appEnvironmentProvider).build.appType != AppType.lms) {
    return null;
  }
  final gate = ref.watch(appGateProvider);
  return gate is GateReady ? gate.config.instructors : null;
});

/// The academy has many teachers: its teachers' pages show.
final teachersOnProvider = Provider<bool>(
  (ref) => ref.watch(instructorsConfigProvider) != null,
);

/// The signed-in person is one of the academy's teachers: the Teacher tab
/// is theirs only.
final isTeacherProvider = Provider<bool>((ref) {
  final user = ref.watch(authControllerProvider).user;
  return (user?.isTeacher ?? false) && ref.watch(teachersOnProvider);
});

/// What the teachers' list shows: a search and a subject.
typedef TeacherQuery = ({String search, String? subject});

/// The academy's teachers for one search and subject, featured first. The
/// subjects to filter by come with each page.
class TeachersController extends PagedController<TeacherSummary> {
  TeachersController(this.query);

  final TeacherQuery query;

  /// Every subject the academy's teachers teach.
  List<String> subjects = const [];

  @override
  Future<Paged<TeacherSummary>> fetch(int page) async {
    final found = await ref
        .read(yallappApiProvider)
        .listTeachers(
          search: query.search.isEmpty ? null : query.search,
          subject: query.subject,
          page: page,
        );
    if (page == 1) subjects = found.subjects;
    return Paged(
      items: found.items,
      meta: PageMeta(
        page: found.page,
        perPage: found.items.length,
        total: found.items.length,
        totalPages: found.totalPages,
      ),
    );
  }
}

final teachersProvider = NotifierProvider.autoDispose
    .family<TeachersController, PagedState<TeacherSummary>, TeacherQuery>(
      TeachersController.new,
    );

/// A teacher's page: about them, their courses, and whether the student
/// follows them.
final teacherProvider = FutureProvider.autoDispose.family<TeacherDetail, int>((
  ref,
  id,
) {
  ref.watch(authControllerProvider.select((s) => s.isSignedIn));
  return ref.contentApi.getTeacher(id);
});

/// What the students say about a teacher.
class TeacherReviewsController extends PagedController<TeacherReview> {
  TeacherReviewsController(this.teacherId);

  final int teacherId;

  @override
  Future<Paged<TeacherReview>> fetch(int page) =>
      ref.read(yallappApiProvider).listTeacherReviews(teacherId, page: page);
}

final teacherReviewsProvider = NotifierProvider.autoDispose
    .family<TeacherReviewsController, PagedState<TeacherReview>, int>(
      TeacherReviewsController.new,
    );

/// The signed-in person's application to teach; null when they never
/// applied.
final teacherApplicationProvider =
    FutureProvider.autoDispose<TeacherApplication?>(
      (ref) => ref.read(yallappApiProvider).getTeacherApplication(),
    );

/// The teacher's own profile and share.
final teacherMeProvider = FutureProvider.autoDispose<TeacherProfile>(
  (ref) => ref.read(yallappApiProvider).getTeacherMe(),
);

/// The teacher's courses, with the academy's categories and currency.
final teacherCoursesProvider = FutureProvider.autoDispose<TeacherCourses>(
  (ref) => ref.read(yallappApiProvider).listTeacherCourses(),
);

/// One of the teacher's courses, with its sections and lessons.
final teacherCourseProvider = FutureProvider.autoDispose
    .family<TeacherCourse, int>(
      (ref, id) => ref.read(yallappApiProvider).getTeacherCourse(id),
    );

/// The questions students asked on the teacher's courses, waiting first.
class TeacherQuestionsController extends PagedController<TeacherQuestion> {
  @override
  Future<Paged<TeacherQuestion>> fetch(int page) =>
      ref.read(yallappApiProvider).listTeacherQuestions(page: page);
}

final teacherQuestionsProvider =
    NotifierProvider.autoDispose<
      TeacherQuestionsController,
      PagedState<TeacherQuestion>
    >(TeacherQuestionsController.new);

/// What the teacher's courses sold over a period, and their share.
final teacherEarningsProvider = FutureProvider.autoDispose
    .family<TeacherEarnings, TeacherPeriod>(
      (ref, period) => ref.read(yallappApiProvider).getTeacherEarnings(period),
    );
