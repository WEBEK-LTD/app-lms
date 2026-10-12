import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/providers.dart';
import 'paged_controller.dart';

/// Signed-in state, so lists reload when the student signs in or out.
final _signedInProvider = Provider<bool>(
  (ref) => ref.watch(authControllerProvider.select((s) => s.isSignedIn)),
);

final homeSectionsProvider = FutureProvider.autoDispose<List<HomeSection>>((
  ref,
) {
  ref.watch(_signedInProvider);
  return ref.watch(yallappApiProvider).getHome();
});

final categoriesProvider = FutureProvider<List<Category>>(
  (ref) => ref.watch(yallappApiProvider).listCategories(),
);

final courseDetailProvider = FutureProvider.autoDispose
    .family<CourseDetail, int>((ref, id) {
      ref.watch(_signedInProvider);
      return ref.watch(yallappApiProvider).getCourse(id);
    });

final curriculumProvider = FutureProvider.autoDispose.family<List<Topic>, int>((
  ref,
  id,
) {
  ref.watch(_signedInProvider);
  return ref.watch(yallappApiProvider).getCurriculum(id);
});

final lessonProvider = FutureProvider.autoDispose.family<Lesson, int>(
  (ref, id) => ref.watch(yallappApiProvider).getLesson(id),
);

final quizProvider = FutureProvider.autoDispose.family<Quiz, int>(
  (ref, id) => ref.watch(yallappApiProvider).getQuiz(id),
);

final wishlistProvider = FutureProvider.autoDispose<List<CourseSummary>>(
  (ref) => ref.watch(yallappApiProvider).listWishlist(),
);

final certificatesProvider = FutureProvider.autoDispose<List<Certificate>>(
  (ref) => ref.watch(yallappApiProvider).listCertificates(),
);

final devicesProvider = FutureProvider.autoDispose<DeviceList>(
  (ref) => ref.watch(yallappApiProvider).listDevices(),
);

/// The course catalog for one search and filter combination.
class CoursesController extends PagedController<CourseSummary> {
  CoursesController(this.query);

  final CourseQuery query;

  @override
  PagedState<CourseSummary> build() {
    // Enrolled and wishlisted flags change when the student signs in.
    ref.watch(_signedInProvider);
    return super.build();
  }

  @override
  Future<Paged<CourseSummary>> fetch(int page) =>
      ref.read(yallappApiProvider).listCourses(query.copyWith(page: page));
}

final coursesProvider = NotifierProvider.autoDispose
    .family<CoursesController, PagedState<CourseSummary>, CourseQuery>(
      CoursesController.new,
    );

class MyCoursesController extends PagedController<MyCourse> {
  MyCoursesController(this.status);

  final MyCoursesStatus status;

  @override
  Future<Paged<MyCourse>> fetch(int page) =>
      ref.read(yallappApiProvider).listMyCourses(status: status, page: page);
}

final myCoursesProvider = NotifierProvider.autoDispose
    .family<MyCoursesController, PagedState<MyCourse>, MyCoursesStatus>(
      MyCoursesController.new,
    );

class QuizAttemptsController extends PagedController<AttemptResult> {
  @override
  Future<Paged<AttemptResult>> fetch(int page) =>
      ref.read(yallappApiProvider).listMyAttempts(page: page);
}

final quizAttemptsProvider =
    NotifierProvider.autoDispose<
      QuizAttemptsController,
      PagedState<AttemptResult>
    >(QuizAttemptsController.new);

/// Reloads everything that depends on a course's enrollment.
void invalidateCourse(WidgetRef ref, int courseId) {
  ref
    ..invalidate(courseDetailProvider(courseId))
    ..invalidate(curriculumProvider(courseId))
    ..invalidate(myCoursesProvider)
    ..invalidate(homeSectionsProvider);
}
