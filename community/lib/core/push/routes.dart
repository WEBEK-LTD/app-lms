import '../../features/groups/links.dart';
import '../../features/messages/links.dart';
import '../../features/posts/posts_state.dart';
import '../routing/feature_routes.dart';
import '../routing/paths.dart';

/// Where a tapped push opens, from its data: `{kind, id?, conversation_id?,
/// post_id?, group_id?, member_id?, question_id?}`. Area E adds its kinds
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
  'group_accepted': (d) => _id(d, 'group_id', GroupLinks.group),
  'follow': (d) => _id(d, 'member_id', Paths.member),
  'friend_request': (d) => Paths.friendRequests,
};

String? _id(Map<String, dynamic> d, String key, String Function(String) to) {
  final id = _s(d, key) ?? _s(d, 'id');
  return id == null ? null : to(id);
}

String routeForPush(Map<String, dynamic> data) {
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
