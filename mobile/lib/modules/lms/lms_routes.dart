import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/api/yallapp_api.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/services/screen_security.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/lists_screens.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'courses/course_detail_screen.dart';
import 'data/lms_providers.dart';
import 'courses/course_questions.dart';
import 'courses/courses_screen.dart';
import 'downloads/downloads_screen.dart';
import 'home/home_screen.dart';
import 'lesson/lesson_screen.dart';
import 'my_courses/my_courses_screen.dart';
import 'quiz/quiz_screen.dart';
import 'teachers/teach_apply_screen.dart';
import 'teachers/teacher_course_screen.dart';
import 'teachers/teacher_desk_screen.dart';
import 'teachers/teachers_screen.dart';

/// The Academy module: home, courses, my courses and the account as tabs,
/// and the course, lesson, quiz and question pages. 105.3 In academies with
/// many teachers, the teachers' pages, and for the teachers a Teacher tab
/// (added for them only, see `withTeacherTab`).
final lmsModule = AppModule(
  tabPaths: {
    Paths.home,
    Paths.courses,
    Paths.myCourses,
    Paths.teacherDesk,
    Paths.account,
  },
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.courses => Paths.courses,
    BuiltInScreen.myCourses => Paths.myCourses,
    BuiltInScreen.search => '${Paths.courses}?focus=1',
    BuiltInScreen.favorites =>
      (config?.features.wishlist ?? false)
          ? Paths.myCoursesTab('wishlist')
          : null,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.orders =>
      (config?.features.orders ?? false) ? Paths.orders : null,
    BuiltInScreen.messages ||
    BuiltInScreen.cart ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks => null,
    BuiltInScreen.classes || BuiltInScreen.memberships => null,
    BuiltInScreen.events || BuiltInScreen.tickets => null,
    BuiltInScreen.sendParcel ||
    BuiltInScreen.shipments ||
    BuiltInScreen.courier ||
    BuiltInScreen.restaurants ||
    BuiltInScreen.ride ||
    BuiltInScreen.myRides ||
    BuiltInScreen.driver ||
    BuiltInScreen.foodOrders ||
    BuiltInScreen.restaurant ||
    BuiltInScreen.campaigns ||
    BuiltInScreen.myDonations => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.home,
    label: (c) => c.l10n.tabHome,
    location: Paths.home,
  ),
  ShellTab(
    icon: AppIcons.courses,
    label: (c) => c.l10n.tabCourses,
    location: Paths.courses,
  ),
  ShellTab(
    icon: AppIcons.myCourses,
    label: (c) => c.l10n.tabMyCourses,
    location: Paths.myCourses,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
];

/// 105.3 The Teacher tab, for the academy's teachers only.
final teacherTab = ShellTab(
  icon: AppIcons.teacher,
  label: (c) => c.l10n.tabTeacher,
  location: Paths.teacherDesk,
);

List<TabScreen> _screens() => [
  TabScreen(Paths.home, (state) => const HomeScreen()),
  TabScreen(Paths.teacherDesk, (state) => const TeacherDeskScreen()),
  TabScreen(Paths.courses, (state) {
    final q = state.uri.queryParameters;
    return CoursesScreen(
      key: const ValueKey('courses'),
      initialCategory: int.tryParse(q['category'] ?? ''),
      initialSearch: q['q'],
      initialOrder: switch (q['sort']) {
        'popular' => CourseOrder.popular,
        'title' => CourseOrder.title,
        'newest' => CourseOrder.newest,
        _ => null,
      },
      focusSearch: q['focus'] == '1',
    );
  }),
  TabScreen(
    Paths.myCourses,
    (state) => MyCoursesScreen(
      key: const ValueKey('my-courses'),
      initialTab: myCoursesTabFrom(state.uri.queryParameters['tab']),
    ),
  ),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(
      extra: [
        GoRoute(
          path: 'certificates',
          parentNavigatorKey: rootNavigatorKey,
          pageBuilder: (context, state) =>
              appPage(state, const CertificatesScreen()),
        ),
        // 90.3 Memberships on the website.
        GoRoute(
          path: 'memberships',
          parentNavigatorKey: rootNavigatorKey,
          pageBuilder: (context, state) =>
              appPage(state, const SubscriptionsScreen()),
        ),
        GoRoute(
          path: 'quiz-results',
          parentNavigatorKey: rootNavigatorKey,
          pageBuilder: (context, state) =>
              appPage(state, const QuizResultsScreen()),
        ),
        // 45 Lessons saved for offline viewing.
        GoRoute(
          path: 'downloads',
          parentNavigatorKey: rootNavigatorKey,
          pageBuilder: (context, state) =>
              appPage(state, const DownloadsScreen()),
        ),
      ],
    ),
  ),
];

List<RouteBase> _pushedRoutes() => [
  // 105.3 The academy's teachers, applying to teach, a teacher's course.
  GoRoute(
    path: Paths.teachers,
    pageBuilder: (context, state) => appPage(state, const TeachersScreen()),
  ),
  GoRoute(
    path: '/teachers/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : TeacherScreen(teacherId: id),
      );
    },
  ),
  GoRoute(
    path: Paths.teachApply,
    pageBuilder: (context, state) => appPage(state, const TeachApplyScreen()),
  ),
  GoRoute(
    path: Paths.newTeacherCourse,
    pageBuilder: (context, state) =>
        appPage(state, const TeacherCourseScreen()),
  ),
  GoRoute(
    path: '/teacher-course/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : TeacherCourseScreen(courseId: id),
      );
    },
  ),
  GoRoute(
    path: '/course/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : CourseDetailScreen(courseId: id),
      );
    },
  ),
  GoRoute(
    path: '/lesson/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        // 53 Course content: protected when the owner protects it.
        id == null
            ? const NotFoundScreen()
            : ProtectedContent(
                // 62 Screenshots are counted with the lesson.
                item: ProtectedItem.lesson(
                  id,
                  title: (ref) => ref.read(lessonProvider(id)).value?.title,
                ),
                child: LessonScreen(lessonId: id),
              ),
      );
    },
  ),
  GoRoute(
    path: '/quiz/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null
            ? const NotFoundScreen()
            : ProtectedContent(child: QuizScreen(quizId: id)),
        fullscreen: true,
      );
    },
  ),
  GoRoute(
    path: '/question/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : QuestionScreen(questionId: id),
      );
    },
  ),
];
