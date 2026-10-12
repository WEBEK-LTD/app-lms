import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/yallapp_api.dart';
import '../../core/routing/paths.dart';
import '../shared/account/lists_screens.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'courses/course_detail_screen.dart';
import 'courses/course_questions.dart';
import 'courses/courses_screen.dart';
import 'home/home_screen.dart';
import 'lesson/embeds/embed_fullscreen_screen.dart';
import 'lesson/lesson_screen.dart';
import 'my_courses/my_courses_screen.dart';
import 'quiz/quiz_screen.dart';

/// The Academy module's routes: sign-in, the four tabs and the pushed
/// screens.
List<RouteBase> lmsRoutes() => [
  signInRoute(),
  StatefulShellRoute.indexedStack(
    pageBuilder: (context, state, shell) =>
        appPage(state, MainShell(shell: shell)),
    branches: [
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.home,
            pageBuilder: (context, state) => appPage(state, const HomeScreen()),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.courses,
            pageBuilder: (context, state) {
              final q = state.uri.queryParameters;
              return appPage(
                state,
                CoursesScreen(
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
                ),
              );
            },
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.myCourses,
            pageBuilder: (context, state) => appPage(
              state,
              MyCoursesScreen(
                key: const ValueKey('my-courses'),
                initialTab: myCoursesTabFrom(state.uri.queryParameters['tab']),
              ),
            ),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.account,
            pageBuilder: (context, state) =>
                appPage(state, const ProfileScreen()),
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
        ],
      ),
    ],
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
  GoRoute(
    path: Paths.embed,
    pageBuilder: (context, state) {
      final args = state.extra;
      return appPage(
        state,
        args is EmbedFullscreenArgs
            ? EmbedFullscreenScreen(args: args)
            : const NotFoundScreen(),
        fullscreen: true,
      );
    },
  ),
  ...sharedPageRoutes(),
];
