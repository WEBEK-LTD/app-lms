import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/email_pages.dart';
import '../../features/home/home_page.dart';
import '../../features/opening/opening_page.dart';
import '../../features/posts/posts_state.dart';
import '../../features/posts/ui/composer_screen.dart';
import '../../features/posts/ui/post_screen.dart';
import '../../features/posts/ui/saved_page.dart';
import '../../features/profile/edit_profile_page.dart';
import '../../features/profile/profile_page.dart';
import '../../features/settings/settings_page.dart';
import '../../features/shell/shell.dart';
import '../../features/social/data/social.dart';
import '../../features/social/member_list_page.dart';
import '../../features/welcome/welcome_page.dart';
import '../auth/session.dart';
import '../widgets/coming_soon.dart';
import 'feature_routes.dart';
import 'paths.dart';

/// Refreshes the router when the session changes.
class _SessionListenable extends ChangeNotifier {
  _SessionListenable(Ref ref) {
    ref.listen(sessionProvider, (_, _) => notifyListeners());
    ref.listen(openingDoneProvider, (_, _) => notifyListeners());
  }
}

final rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _SessionListenable(ref);
  ref.onDispose(refresh.dispose);
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: Paths.home,
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = ref.read(sessionProvider);
      final here = state.matchedLocation;
      // The opening plays while the session is restored, and to its end.
      if (session is AuthRestoring || !ref.read(openingDoneProvider)) {
        return here == '/restoring'
            ? null
            : '/restoring?from=${Uri.encodeComponent(state.uri.toString())}';
      }
      final public = Paths.public.contains(here);
      if (session is SignedOut && !public) return Paths.welcome;
      if (session is SignedInState && (public || here == '/restoring')) {
        final from = state.uri.queryParameters['from'];
        return here == '/restoring' &&
                from != null &&
                !Paths.public.contains(Uri.parse(from).path)
            ? from
            : Paths.home;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/restoring',
        builder: (context, state) => const OpeningPage(),
      ),
      GoRoute(
        path: Paths.welcome,
        builder: (context, state) => const WelcomePage(),
      ),
      GoRoute(
        path: Paths.signUp,
        builder: (context, state) =>
            const EmailAuthPage(mode: EmailMode.signUp),
      ),
      GoRoute(
        path: Paths.logIn,
        builder: (context, state) => const EmailAuthPage(mode: EmailMode.logIn),
      ),
      GoRoute(
        path: Paths.forgot,
        builder: (context, state) =>
            const EmailAuthPage(mode: EmailMode.forgot),
      ),
      // Under the floating tab bar.
      ShellRoute(
        builder: (context, state, child) =>
            ShellScaffold(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            path: Paths.home,
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: Paths.groups,
            builder: (context, state) => const ComingSoonPage(title: 'Groups'),
          ),
          GoRoute(
            path: Paths.me,
            builder: (context, state) => const ProfilePage(),
          ),
          GoRoute(
            path: Paths.friendRequests,
            builder: (context, state) => const FriendRequestsPage(),
          ),
          GoRoute(
            path: '/members/:id',
            builder: (context, state) =>
                ProfilePage(id: state.pathParameters['id']),
          ),
          GoRoute(
            path: '/members/:id/followers',
            builder: (context, state) => MemberListPage(
              id: state.pathParameters['id']!,
              list: MemberList.followers,
            ),
          ),
          GoRoute(
            path: '/members/:id/following',
            builder: (context, state) => MemberListPage(
              id: state.pathParameters['id']!,
              list: MemberList.following,
            ),
          ),
          GoRoute(
            path: '/members/:id/friends',
            builder: (context, state) => MemberListPage(
              id: state.pathParameters['id']!,
              list: MemberList.friends,
            ),
          ),
          ...featureTabRoutes(),
        ],
      ),
      // Over it.
      GoRoute(
        path: Paths.editProfile,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const EditProfilePage(),
      ),
      GoRoute(
        path: Paths.settings,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: Paths.blocked,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const BlockedPage(),
      ),
      GoRoute(
        path: PostLinks.compose,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) =>
            ComposerScreen(groupId: state.uri.queryParameters['group']),
      ),
      GoRoute(
        path: '/posts/:id',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) =>
            PostScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: PostLinks.saved,
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => const SavedPostsPage(),
      ),
      ...featureRoutes(),
    ],
  );
});
