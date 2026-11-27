import '../../features/groups/links.dart';
import '../../features/messages/links.dart';
import '../../features/posts/posts_state.dart';
import '../routing/feature_routes.dart';
import '../routing/paths.dart';

/// Where a tapped push opens, from its data: C's `{kind, notification_id,
/// link}` by its link first, else `{kind, id?, conversation_id?, post_id?,
/// group_id?, member_id?, question_id?}`. Area E adds its kinds
/// to [pushRoutes]; a kind without an entry opens by the ids it carries,
/// else the notifications list.
typedef PushRoute = String? Function(Map<String, dynamic> data);

String? _s(Map<String, dynamic> d, String k) {
  final v = d[k];
  return v is String && v.isNotEmpty ? v : null;
}

final Map<String, PushRoute> pushRoutes = {
  'message': (d) => _id(d, 'conversation_id', MessagesLinks.thread),
  'post_comment': (d) => _id(d, 'post_id', PostLinks.post),
  'post_like': (d) => _id(d, 'post_id', PostLinks.post),
  'comment_reply': (d) => _id(d, 'post_id', PostLinks.post),
  'group_request': (d) => _id(d, 'group_id', (id) => GroupLinks.members(id)),
  'group_joined': (d) => _id(d, 'group_id', GroupLinks.group),
  'follow': (d) => _id(d, 'member_id', Paths.member),
  'friend_request': (d) => Paths.friendRequests,
};

String? _id(Map<String, dynamic> d, String key, String Function(String) to) {
  final id = _s(d, key) ?? _s(d, 'id');
  return id == null ? null : to(id);
}

/// The site's path in a push's `link` (area C's payload) as the app's
/// screen: /u/{username}, /questions/{slug}, /posts/{id}, /groups/{slug},
/// /messages/{id}, /challenges/{id}, /events/{id}, /academy, /me…
String? routeForLink(String link) {
  final uri = Uri.tryParse(link);
  if (uri == null) return null;
  final s = uri.pathSegments.where((p) => p.isNotEmpty).toList();
  if (s.isEmpty) return null;
  final id = s.length > 1 ? Uri.decodeComponent(s[1]) : null;
  return switch (s.first) {
    // The API reads a member as an id, or `@` and the username.
    'u' when id != null => Paths.member(id.startsWith('@') ? id : '@$id'),
    'members' when id != null => Paths.member(id),
    'questions' || 'qa' when id != null => FeatureLinks.question(id),
    'posts' when id != null => PostLinks.post(id),
    'groups' when id != null =>
      s.length > 2 ? GroupLinks.members(id) : GroupLinks.group(id),
    'groups' => Paths.groups,
    'messages' when id != null => MessagesLinks.thread(id),
    'messages' => MessagesLinks.inbox,
    'challenges' when id != null => FeatureLinks.challenge(id),
    'challenges' => FeatureLinks.challenges,
    'events' when id != null => FeatureLinks.event(id),
    'events' => FeatureLinks.events,
    'showcase' when id != null => FeatureLinks.showcaseItem(id),
    'showcase' => FeatureLinks.showcase,
    'academy' when id != null => FeatureLinks.course(id),
    'academy' => FeatureLinks.academy,
    'pros' when id != null => FeatureLinks.pro(id),
    'jobs' when id != null => FeatureLinks.job(id),
    'me' => Paths.me,
    'notifications' => FeatureLinks.notifications,
    _ => null,
  };
}

String routeForPush(Map<String, dynamic> data) {
  if (_s(data, 'link') case final link?) {
    if (routeForLink(link) case final route?) return route;
  }
  final kind = _s(data, 'kind');
  final known = kind == null ? null : pushRoutes[kind]?.call(data);
  if (known != null) return known;
  for (final (key, to) in <(String, String Function(String))>[
    ('conversation_id', MessagesLinks.thread),
    ('post_id', PostLinks.post),
    ('question_id', FeatureLinks.question),
    ('group_id', GroupLinks.group),
    ('member_id', Paths.member),
  ]) {
    final id = _s(data, key);
    if (id != null) return to(id);
  }
  return FeatureLinks.notifications;
}
