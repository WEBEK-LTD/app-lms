import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/api/yallapp_api.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/lists_screens.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'courses/course_detail_screen.dart';
import 'courses/course_questions.dart';
import 'courses/courses_screen.dart';
import 'home/home_screen.dart';
import 'lesson/lesson_screen.dart';
import 'my_courses/my_courses_screen.dart';
import 'quiz/quiz_screen.dart';

/// The Academy module: home, courses, my courses and the account as tabs,
/// and the course, lesson, quiz and question pages.
final lmsModule = AppModule(
  tabPaths: {Paths.home, Paths.courses, Paths.myCourses, Paths.account},
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
    BuiltInScreen.campaigns || BuiltInScreen.myDonations => null,
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

List<TabScreen> _screens() => [
  TabScreen(Paths.home, (state) => const HomeScreen()),
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
        GoRoute(
          path: 'quiz-results',
          parentNavigatorKey: rootNavigatorKey,
          pageBuilder: (context, state) =>
              appPage(state, const QuizResultsScreen()),
        ),
      ],
    ),
  ),
];

List<RouteBase> _pushedRoutes() => [
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
        id == null ? const NotFoundScreen() : LessonScreen(lessonId: id),
      );
    },
  ),
  GoRoute(
    path: '/quiz/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : QuizScreen(quizId: id),
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
