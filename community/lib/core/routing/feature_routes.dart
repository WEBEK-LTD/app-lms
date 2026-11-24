import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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

/// The tab roots of E's tabs (Q&A, Learn), under the shell's tab bar.
List<RouteBase> featureTabRoutes() => [
  GoRoute(
    path: FeatureLinks.qa,
    builder: (context, state) => const ComingSoonPage(title: 'Q&A'),
  ),
  GoRoute(
    path: FeatureLinks.learn,
    builder: (context, state) => const ComingSoonPage(title: 'Learn'),
  ),
];

/// E's other screens, pushed over the shell.
List<RouteBase> featureRoutes() => [
  GoRoute(
    path: '/qa/:id',
    builder: (context, state) => const ComingSoonPage(title: 'Q&A'),
  ),
  GoRoute(
    path: FeatureLinks.ask,
    builder: (context, state) => const ComingSoonPage(title: 'Ask'),
  ),
  GoRoute(
    path: '/learn/:id',
    builder: (context, state) => const ComingSoonPage(title: 'Learn'),
  ),
  GoRoute(
    path: FeatureLinks.notifications,
    builder: (context, state) => const ComingSoonPage(title: 'Notifications'),
  ),
  GoRoute(
    path: FeatureLinks.search,
    builder: (context, state) => const ComingSoonPage(title: 'Search'),
  ),
  GoRoute(
    path: FeatureLinks.saved,
    builder: (context, state) => const ComingSoonPage(title: 'Saved'),
  ),
  GoRoute(
    path: FeatureLinks.verify,
    builder: (context, state) => const ComingSoonPage(title: 'Verify'),
  ),
];

/// The counts E's features show on the shell: the bell's number (unread
/// notifications) and the Q&A tab's dot and menu badge (new questions since
/// the member last looked). Zero until E fills them in.
final unreadNotificationsProvider = Provider<int>((ref) => 0);
final newQuestionsProvider = Provider<int>((ref) => 0);
