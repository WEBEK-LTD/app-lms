import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
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

/// The student's notifications, newest first.
class NotificationsController extends PagedController<InboxNotification> {
  @override
  Future<Paged<InboxNotification>> fetch(int page) => ref
      .read(yallappApiProvider)
      .listNotifications(page: page)
      .then((result) => result.page);
}

final notificationsProvider =
    NotifierProvider.autoDispose<
      NotificationsController,
      PagedState<InboxNotification>
    >(NotificationsController.new);

/// Unread notifications for the bell's badge. 0 when signed out or offline:
/// the badge is a hint, never an error.
final unreadNotificationsProvider = FutureProvider.autoDispose<int>((
  ref,
) async {
  if (!ref.watch(_signedInProvider)) return 0;
  try {
    final result = await ref
        .read(yallappApiProvider)
        .listNotifications(perPage: 1);
    return result.unreadCount;
  } on ApiException {
    return 0;
  }
});

class OrdersController extends PagedController<Order> {
  @override
  Future<Paged<Order>> fetch(int page) =>
      ref.read(yallappApiProvider).listOrders(page: page);
}

final ordersProvider =
    NotifierProvider.autoDispose<OrdersController, PagedState<Order>>(
      OrdersController.new,
    );

/// A course's reviews: the rating summary and the student's own review come
/// with the first page; later pages add reviews.
class CourseReviewsState {
  const CourseReviewsState({
    this.head,
    this.items = const [],
    this.page = 0,
    this.totalPages = 1,
    this.loading = false,
    this.error,
  });

  final ReviewPage? head;
  final List<Review> items;
  final int page;
  final int totalPages;
  final bool loading;
  final Object? error;

  bool get hasMore => page < totalPages;
}

class CourseReviewsController extends Notifier<CourseReviewsState> {
  CourseReviewsController(this.courseId);

  final int courseId;

  @override
  CourseReviewsState build() {
    ref.watch(_signedInProvider);
    Future.microtask(refresh);
    return const CourseReviewsState(loading: true);
  }

  Future<void> refresh() async {
    state = const CourseReviewsState(loading: true);
    await _load(1);
  }

  Future<void> loadMore() async {
    if (state.loading || !state.hasMore) return;
    state = CourseReviewsState(
      head: state.head,
      items: state.items,
      page: state.page,
      totalPages: state.totalPages,
      loading: true,
    );
    await _load(state.page + 1);
  }

  Future<void> _load(int page) async {
    try {
      final result = await ref
          .read(yallappApiProvider)
          .listReviews(courseId, page: page);
      if (!ref.mounted) return;
      state = CourseReviewsState(
        head: page == 1 ? result : state.head,
        items: [if (page > 1) ...state.items, ...result.page.items],
        page: result.page.meta.page,
        totalPages: result.page.meta.totalPages,
      );
    } on Object catch (e) {
      if (!ref.mounted) return;
      state = CourseReviewsState(
        head: state.head,
        items: state.items,
        page: state.page,
        totalPages: state.totalPages,
        error: e,
      );
    }
  }
}

final courseReviewsProvider = NotifierProvider.autoDispose
    .family<CourseReviewsController, CourseReviewsState, int>(
      CourseReviewsController.new,
    );

class CourseQuestionsController extends PagedController<CourseQuestion> {
  CourseQuestionsController(this.courseId);

  final int courseId;

  @override
  Future<Paged<CourseQuestion>> fetch(int page) =>
      ref.read(yallappApiProvider).listQuestions(courseId, page: page);
}

final courseQuestionsProvider = NotifierProvider.autoDispose
    .family<CourseQuestionsController, PagedState<CourseQuestion>, int>(
      CourseQuestionsController.new,
    );

final questionThreadProvider = FutureProvider.autoDispose
    .family<QuestionThread, int>(
      (ref, id) => ref.watch(yallappApiProvider).getQuestion(id),
    );
