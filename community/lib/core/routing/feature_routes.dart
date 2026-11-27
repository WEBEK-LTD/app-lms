import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/session.dart';

import '../../features/academy/ui/academy_screens.dart';
import '../../features/badges/ui/verification_screen.dart';
import '../../features/challenges/ui/challenges_screens.dart';
import '../../features/events/ui/events_screens.dart';
import '../../features/jobs/ui/jobs_screens.dart';
import '../../features/leaderboard/ui/leaderboard_screen.dart';
import '../../features/messages/links.dart';
import '../../features/pros/ui/pros_screens.dart';
import '../../features/showcase/ui/showcase_screens.dart';
import '../../features/notifications/ui/notifications_screen.dart';
import '../../features/qa/state/questions_controller.dart';
import '../../features/qa/ui/ask_screen.dart';
import '../../features/qa/ui/question_screen.dart';
import '../../features/qa/ui/questions_screen.dart';
import '../../features/qa/ui/widgets/section_header.dart';
import '../../features/search/ui/saved_screen.dart';
import '../../features/search/ui/search_screen.dart';
import '../../features/shell/side_menu.dart';
import '../../features/tutorials/ui/tutorial_screen.dart';
import '../../features/tutorials/ui/tutorials_screen.dart';

/// Area E's screens in the app (lib/features/qa, tutorials, badges,
/// notifications; 232–234 showcase, academy, challenges, leaderboard, pros,
/// jobs and events): this file is E's. The shell (area D) links to them only
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

  // 232–234 Phase 2–4 sections (the side menu's, once they are live).
  static const showcase = '/showcase';
  static String showcaseItem(String id) =>
      '/showcase/${Uri.encodeComponent(id)}';

  /// The Academy: courses open or locked, never a price.
  static const academy = '/academy';
  static String course(String id) => '/academy/${Uri.encodeComponent(id)}';
  static String lesson(String course, String lesson) =>
      '/academy/${Uri.encodeComponent(course)}/${Uri.encodeComponent(lesson)}';

  static const challenges = '/challenges';
  static String challenge(String id) =>
      '/challenges/${Uri.encodeComponent(id)}';

  static const leaderboard = '/leaderboard';

  static const pros = '/pros';
  static String pro(String member) => '/pros/${Uri.encodeComponent(member)}';

  static const jobs = '/jobs';
  static String job(String id) => '/jobs/${Uri.encodeComponent(id)}';

  /// Events, live sessions among them.
  static const events = '/events';
  static String event(String id) => '/events/${Uri.encodeComponent(id)}';

  /// A message thread (area D's), as a hire request opens it.
  static String conversation(String id) => MessagesLinks.thread(id);
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
    builder: (context, state) => const SearchScreen(),
  ),
  GoRoute(
    path: FeatureLinks.saved,
    builder: (context, state) => const SavedScreen(),
  ),
  // 232–234
  GoRoute(
    path: FeatureLinks.showcase,
    builder: (context, state) => const ShowcaseScreen(),
  ),
  GoRoute(
    path: '/showcase/:id',
    builder: (context, state) =>
        ShowcaseItemScreen(id: state.pathParameters['id']!),
  ),
  GoRoute(
    path: FeatureLinks.academy,
    builder: (context, state) => const AcademyScreen(),
  ),
  GoRoute(
    path: '/academy/:course',
    builder: (context, state) =>
        CourseScreen(id: state.pathParameters['course']!),
  ),
  GoRoute(
    path: '/academy/:course/:lesson',
    builder: (context, state) => LessonScreen(
      course: state.pathParameters['course']!,
      lesson: state.pathParameters['lesson']!,
    ),
  ),
  GoRoute(
    path: FeatureLinks.challenges,
    builder: (context, state) => const ChallengesScreen(),
  ),
  GoRoute(
    path: '/challenges/:id',
    builder: (context, state) =>
        ChallengeScreen(id: state.pathParameters['id']!),
  ),
  GoRoute(
    path: FeatureLinks.leaderboard,
    builder: (context, state) => const LeaderboardScreen(),
  ),
  GoRoute(
    path: FeatureLinks.pros,
    builder: (context, state) => const ProsScreen(),
  ),
  GoRoute(
    path: '/pros/:member',
    builder: (context, state) =>
        ProScreen(member: state.pathParameters['member']!),
  ),
  GoRoute(
    path: FeatureLinks.jobs,
    builder: (context, state) => const JobsScreen(),
  ),
  GoRoute(
    path: '/jobs/:id',
    builder: (context, state) => JobScreen(id: state.pathParameters['id']!),
  ),
  GoRoute(
    path: FeatureLinks.events,
    builder: (context, state) => const EventsScreen(),
  ),
  GoRoute(
    path: '/events/:id',
    builder: (context, state) => EventScreen(id: state.pathParameters['id']!),
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
  (ref) =>
      ref.watch(notificationsProvider).value?.unreadCount ??
      // Until the list loads: the count that came with the member.
      ref.watch(meProvider)?.account?.unreadNotifications ??
      0,
);
final newQuestionsProvider = Provider<int>(
  (ref) => ref.watch(newQuestionsCountProvider),
);
