import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/badges/ui/verification_screen.dart';
import '../../features/notifications/ui/notifications_screen.dart';
import '../../features/qa/state/questions_controller.dart';
import '../../features/qa/ui/ask_screen.dart';
import '../../features/qa/ui/question_screen.dart';
import '../../features/qa/ui/questions_screen.dart';
import '../../features/qa/ui/widgets/section_header.dart';
import '../../features/shell/side_menu.dart';
import '../../features/tutorials/ui/tutorial_screen.dart';
import '../../features/tutorials/ui/tutorials_screen.dart';
import '../widgets/coming_soon.dart';

/// Area E's screens in the app (lib/features/qa, tutorials, badges,
/// notifications): this file is E's. The shell (area D) links to them only
/// through [FeatureLinks], and the router adds [featureTabRoutes] (drawn with
/// the floating tab bar) and [featureRoutes] (pushed over it).
///
/// Until E's screens land, each is a "Coming soon" page.
abstract final class FeatureLinks {
  /// The Q&A tab.
  static const qa = '/qa';
  static String question(String id) => '/qa/$id';

  /// Ask a question (the create sheet's first line).
  static const ask = '/ask';

  /// The Learn tab: official tutorials.
  static const learn = '/learn';
  static String tutorial(String id) => '/learn/$id';

  /// The header's bell.
  static const notifications = '/notifications';

  /// The header's search (questions, tutorials).
  static const search = '/search';

  /// The menu's bookmark: saved questions and tutorials.
  static const saved = '/saved';

  /// The Gold badge's verification form.
  static const verify = '/verify';
}

/// E's screens under the shell's floating tab bar: the tab roots (Q&A,
/// Learn) and what opens from them (a question, a tutorial, notifications,
/// search, saved), as the approved question screen keeps the bar.
List<RouteBase> featureTabRoutes() => [
  GoRoute(
    path: FeatureLinks.qa,
    builder: (context, state) =>
        const QuestionsScreen(header: SectionHeader(section: MenuSection.qa)),
  ),
  GoRoute(
    path: '/qa/:id',
    builder: (context, state) =>
        QuestionScreen(id: state.pathParameters['id']!),
  ),
  GoRoute(
    path: FeatureLinks.learn,
    builder: (context, state) => const TutorialsScreen(
      header: SectionHeader(section: MenuSection.tutorials),
    ),
  ),
  GoRoute(
    path: '/learn/:id',
    builder: (context, state) =>
        TutorialScreen(id: state.pathParameters['id']!),
  ),
  GoRoute(
    path: FeatureLinks.notifications,
    builder: (context, state) => const NotificationsScreen(),
  ),
  GoRoute(
    path: FeatureLinks.search,
    builder: (context, state) => const ComingSoonPage(title: 'Search'),
  ),
  GoRoute(
    path: FeatureLinks.saved,
    builder: (context, state) => const ComingSoonPage(title: 'Saved'),
  ),
];

/// E's full-screen forms, over the tab bar (asking, the verification form).
List<RouteBase> featureRoutes() => [
  GoRoute(
    path: FeatureLinks.ask,
    builder: (context, state) => const AskScreen(),
  ),
  GoRoute(
    path: FeatureLinks.verify,
    builder: (context, state) => const VerificationScreen(),
  ),
];

/// The counts E's features show on the shell: the bell's number (unread
/// notifications) and the Q&A tab's dot and menu badge (new questions since
/// the member last looked). Zero until E fills them in.
final unreadNotificationsProvider = Provider<int>(
  (ref) => ref.watch(notificationsProvider).value?.unreadCount ?? 0,
);
final newQuestionsProvider = Provider<int>(
  (ref) => ref.watch(newQuestionsCountProvider),
);
