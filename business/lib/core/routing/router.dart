import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/account_state_screen.dart';
import '../../features/account/apps_screen.dart';
import '../../features/appointments/appointments_screen.dart';
import '../../features/appointments/reschedule_screen.dart';
import '../../features/auth/lock_screen.dart';
import '../../features/auth/sign_in_screen.dart';
import '../../features/builds/builds_screen.dart';
import '../../features/catalog/add_lesson_screen.dart';
import '../../features/catalog/catalog_screen.dart';
import '../../features/donations/donations_screen.dart';
import '../../features/events/events_screen.dart';
import '../../features/events/scanner_screen.dart';
import '../../features/inbox/inbox_screen.dart';
import '../../features/inbox/inquiry_screen.dart';
import '../../features/inbox/question_screen.dart';
import '../../features/members/member_scanner_screen.dart';
import '../../features/members/members_screen.dart';
import '../../features/media/media_screen.dart';
import '../../features/team/team_screen.dart';
import '../../features/more/devices_screen.dart';
import '../../features/more/appearance_screen.dart';
import '../../features/more/language_screen.dart';
import '../../features/more/more_screen.dart';
import '../../features/more/plan_screen.dart';
import '../../features/more/push_settings_screen.dart';
import '../../features/notify/notify_screen.dart';
import '../../features/orders/kitchen_screen.dart';
import '../../features/orders/order_screen.dart';
import '../../features/orders/orders_screen.dart';
import '../../features/preview/preview_screen.dart';
import '../../features/shell/home_shell.dart';
import '../../features/stats/stats_screen.dart';
import '../../features/today/today_screen.dart';
import '../../features/today/updates_screen.dart';
import '../../features/users/users_screen.dart';
import '../../app.dart' show SplashScreen;
import '../api/models.dart';
import '../session.dart';
import 'paths.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

/// 59 Where a push asked to go while the app was locked or signed out.
class PendingLocation extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? location) => state = location;
}

final pendingLocationProvider = NotifierProvider<PendingLocation, String?>(
  PendingLocation.new,
);

const _gates = {
  Paths.splash,
  Paths.signIn,
  Paths.lock,
  Paths.account,
  Paths.apps,
};

/// The redirect: the screen the session allows, or null to stay.
String? gateFor(Ref ref, String location) {
  final session = ref.read(sessionProvider);
  final path = Uri.parse(location).path;
  switch (session) {
    case SessionLoading():
      return path == Paths.splash ? null : Paths.splash;
    case SignedOut():
      return path == Paths.signIn ? null : Paths.signIn;
    case Locked():
      return path == Paths.lock ? null : Paths.lock;
    case Unreachable():
      return path == Paths.account ? null : Paths.account;
    case SignedIn(:final me):
      if (me.state.blocked || me.apps.isEmpty) {
        return path == Paths.account ? null : Paths.account;
      }
      final app = ref.read(currentAppProvider);
      if (app == null) return path == Paths.apps ? null : Paths.apps;
      if (path == Paths.apps) return null;
      if (_gates.contains(path)) {
        final pending = ref.read(pendingLocationProvider);
        if (pending != null) {
          ref.read(pendingLocationProvider.notifier).set(null);
          return pending;
        }
        return Paths.today;
      }
      return null;
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  ref.listen(sessionProvider, (_, _) => refresh.value++);
  ref.listen(currentAppProvider, (previous, next) {
    if (previous?.id != next?.id) refresh.value++;
  });
  ref.onDispose(refresh.dispose);

  GoRoute full(String path, Widget Function(GoRouterState s) build) => GoRoute(
    path: path,
    parentNavigatorKey: rootNavigatorKey,
    builder: (context, state) => build(state),
  );

  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: Paths.splash,
    refreshListenable: refresh,
    redirect: (context, state) => gateFor(ref, state.uri.toString()),
    routes: [
      GoRoute(path: Paths.splash, builder: (_, _) => const SplashScreen()),
      GoRoute(path: Paths.signIn, builder: (_, _) => const SignInScreen()),
      GoRoute(path: Paths.lock, builder: (_, _) => const LockScreen()),
      GoRoute(
        path: Paths.account,
        builder: (_, _) => const AccountStateScreen(),
      ),
      GoRoute(path: Paths.apps, builder: (_, _) => const AppsScreen()),
      ShellRoute(
        builder: (context, state, child) =>
            HomeShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(path: Paths.today, builder: (_, _) => const TodayScreen()),
          GoRoute(
            path: Paths.orders,
            builder: (_, s) =>
                OrdersScreen(initialStatus: s.uri.queryParameters['status']),
            routes: [
              GoRoute(
                path: ':id',
                parentNavigatorKey: rootNavigatorKey,
                builder: (_, s) =>
                    OrderScreen(orderId: int.parse(s.pathParameters['id']!)),
              ),
            ],
          ),
          GoRoute(
            path: Paths.appointments,
            builder: (_, _) => const AppointmentsScreen(),
            routes: [
              // 61 Change time.
              GoRoute(
                path: ':id/move',
                parentNavigatorKey: rootNavigatorKey,
                builder: (_, s) => RescheduleScreen(
                  appointmentId: int.parse(s.pathParameters['id']!),
                  appointment: s.extra is Appointment
                      ? s.extra! as Appointment
                      : null,
                ),
              ),
            ],
          ),
          GoRoute(path: Paths.events, builder: (_, _) => const EventsScreen()),
          GoRoute(
            path: Paths.donations,
            builder: (_, _) => const DonationsScreen(),
          ),
          GoRoute(
            path: Paths.catalog,
            builder: (_, _) => const CatalogScreen(),
          ),
          GoRoute(
            path: Paths.inbox,
            builder: (_, s) =>
                InboxScreen(initialTab: s.uri.queryParameters['tab']),
            routes: [
              // 63 A student's question in a course.
              GoRoute(
                path: 'questions/:id',
                parentNavigatorKey: rootNavigatorKey,
                builder: (_, s) => QuestionScreen(
                  questionId: int.parse(s.pathParameters['id']!),
                ),
              ),
              GoRoute(
                path: ':id',
                parentNavigatorKey: rootNavigatorKey,
                builder: (_, s) => InquiryScreen(
                  inquiryId: int.parse(s.pathParameters['id']!),
                ),
              ),
            ],
          ),
          GoRoute(path: Paths.stats, builder: (_, _) => const StatsScreen()),
          GoRoute(path: Paths.more, builder: (_, _) => const MoreScreen()),
        ],
      ),
      full(Paths.updates, (_) => const UpdatesScreen()),
      full(Paths.kitchen, (_) => const KitchenScreen()),
      full(
        '/scan',
        (s) => ScannerScreen(
          eventId: int.tryParse(s.uri.queryParameters['event'] ?? ''),
        ),
      ),
      full(
        '/lesson',
        (s) => AddLessonScreen(
          courseId: int.parse(s.uri.queryParameters['course'] ?? '0'),
          topicId: int.parse(s.uri.queryParameters['topic'] ?? '0'),
        ),
      ),
      // 63 A gym's door and its members.
      full(Paths.memberScan, (_) => const MemberScannerScreen()),
      full(Paths.members, (_) => const MembersScreen()),
      full(Paths.media, (_) => const MediaScreen()),
      full(Paths.users, (_) => const UsersScreen()),
      full(Paths.notify, (_) => const NotifyScreen()),
      full(Paths.preview, (_) => const PreviewScreen()),
      full(Paths.builds, (_) => const BuildsScreen()),
      full(Paths.plan, (_) => const PlanScreen()),
      full(Paths.language, (_) => const LanguageScreen()),
      full(Paths.appearance, (_) => const AppearanceScreen()),
      full(Paths.notifications, (_) => const PushSettingsScreen()),
      full(Paths.devices, (_) => const DevicesScreen()),
      full(Paths.team, (_) => const TeamScreen()),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
