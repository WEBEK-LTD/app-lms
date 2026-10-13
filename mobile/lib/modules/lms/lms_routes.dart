import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/yallapp_api.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_look.dart';
import '../../core/web/web_page_screen.dart';
import '../../core/widgets/app_nav_bar.dart';
import '../../core/widgets/common.dart';
import 'account/edit_profile_screen.dart';
import 'account/lists_screens.dart';
import 'account/profile_screen.dart';
import 'account/settings_screen.dart';
import 'auth/otp_screen.dart';
import 'auth/sign_in_screen.dart';
import 'auth/signup_screen.dart';
import 'courses/course_detail_screen.dart';
import 'courses/courses_screen.dart';
import 'home/home_screen.dart';
import 'lesson/embeds/embed_fullscreen_screen.dart';
import 'lesson/lesson_screen.dart';
import 'my_courses/my_courses_screen.dart';
import 'quiz/quiz_screen.dart';

Page<void> _page(
  GoRouterState state,
  Widget child, {
  bool fullscreen = false,
}) => MaterialPage<void>(
  key: state.pageKey,
  fullscreenDialog: fullscreen,
  child: child,
);

int? _intParam(GoRouterState state, String name) =>
    int.tryParse(state.pathParameters[name] ?? '');

/// The Academy module's routes: sign-in, the four tabs and the pushed
/// screens.
List<RouteBase> lmsRoutes() => [
  GoRoute(
    path: Paths.signIn,
    pageBuilder: (context, state) =>
        _page(state, SignInScreen(from: state.uri.queryParameters['from'])),
    routes: [
      GoRoute(
        path: 'code',
        pageBuilder: (context, state) {
          final args = state.extra;
          return _page(
            state,
            args is OtpArgs
                ? OtpScreen(args: args, from: state.uri.queryParameters['from'])
                : SignInScreen(from: state.uri.queryParameters['from']),
          );
        },
      ),
      GoRoute(
        path: 'details',
        pageBuilder: (context, state) {
          final args = state.extra;
          return _page(
            state,
            args is SignupArgs
                ? SignupScreen(args: args)
                : SignInScreen(from: state.uri.queryParameters['from']),
          );
        },
      ),
    ],
  ),
  StatefulShellRoute.indexedStack(
    pageBuilder: (context, state, shell) =>
        _page(state, MainShell(shell: shell)),
    branches: [
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.home,
            pageBuilder: (context, state) => _page(state, const HomeScreen()),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.courses,
            pageBuilder: (context, state) {
              final q = state.uri.queryParameters;
              return _page(
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
            pageBuilder: (context, state) => _page(
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
                _page(state, const ProfileScreen()),
            routes: [
              GoRoute(
                path: 'edit',
                parentNavigatorKey: _rootKey,
                pageBuilder: (context, state) =>
                    _page(state, const EditProfileScreen()),
              ),
              GoRoute(
                path: 'settings',
                parentNavigatorKey: _rootKey,
                pageBuilder: (context, state) =>
                    _page(state, const SettingsScreen()),
                routes: [
                  GoRoute(
                    path: 'devices',
                    parentNavigatorKey: _rootKey,
                    pageBuilder: (context, state) =>
                        _page(state, const DevicesScreen()),
                  ),
                ],
              ),
              GoRoute(
                path: 'certificates',
                parentNavigatorKey: _rootKey,
                pageBuilder: (context, state) =>
                    _page(state, const CertificatesScreen()),
              ),
              GoRoute(
                path: 'quiz-results',
                parentNavigatorKey: _rootKey,
                pageBuilder: (context, state) =>
                    _page(state, const QuizResultsScreen()),
              ),
            ],
          ),
        ],
      ),
    ],
  ),
  GoRoute(
    path: '/course/:id',
    pageBuilder: (context, state) {
      final id = _intParam(state, 'id');
      return _page(
        state,
        id == null
            ? const LmsNotFoundScreen()
            : CourseDetailScreen(courseId: id),
      );
    },
  ),
  GoRoute(
    path: '/lesson/:id',
    pageBuilder: (context, state) {
      final id = _intParam(state, 'id');
      return _page(
        state,
        id == null ? const LmsNotFoundScreen() : LessonScreen(lessonId: id),
      );
    },
  ),
  GoRoute(
    path: '/quiz/:id',
    pageBuilder: (context, state) {
      final id = _intParam(state, 'id');
      return _page(
        state,
        id == null ? const LmsNotFoundScreen() : QuizScreen(quizId: id),
        fullscreen: true,
      );
    },
  ),
  GoRoute(
    path: Paths.embed,
    pageBuilder: (context, state) {
      final args = state.extra;
      return _page(
        state,
        args is EmbedFullscreenArgs
            ? EmbedFullscreenScreen(args: args)
            : const LmsNotFoundScreen(),
        fullscreen: true,
      );
    },
  ),
  GoRoute(
    path: Paths.web,
    pageBuilder: (context, state) {
      final args = state.extra;
      return _page(
        state,
        args is WebPageArgs
            ? WebPageScreen(args: args)
            : const LmsNotFoundScreen(),
        fullscreen: true,
      );
    },
  ),
];

/// The root navigator, so account sub-pages cover the bottom navigation.
final GlobalKey<NavigatorState> _rootKey = GlobalKey<NavigatorState>(
  debugLabel: 'root',
);

GlobalKey<NavigatorState> get rootNavigatorKey => _rootKey;

/// The four main tabs with the template's bottom navigation.
class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final template = ref.watch(appLookProvider).template;
    return Scaffold(
      body: shell,
      bottomNavigationBar: AppNavBar(
        template: template,
        currentIndex: shell.currentIndex,
        onSelected: (i) =>
            shell.goBranch(i, initialLocation: i == shell.currentIndex),
      ),
    );
  }
}

class LmsNotFoundScreen extends StatelessWidget {
  const LmsNotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: MessageView(
        icon: AppIcons.error,
        title: "This page doesn't exist",
        actionLabel: 'Go home',
        onAction: () => context.go(Paths.home),
      ),
    ),
  );
}
