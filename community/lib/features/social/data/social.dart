import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/community_api.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

/// Whether the member follows [id] (one way, no approval), wherever a
/// Follow shows: a post, a profile, a list. It starts from what the screen
/// knew ([seed]) and follows every tap at once, undoing it if the server
/// says no.
class FollowingController extends Notifier<bool> {
  FollowingController(this.id);

  final String id;

  @override
  bool build() => false;

  /// What a loaded profile says (without a call).
  void seed(bool following) => state = following;

  Future<void> toggle() async {
    final api = ref.read(communityApiProvider);
    final was = state;
    state = !was;
    try {
      if (was) {
        await api.unfollow(id);
      } else {
        await api.follow(id);
      }
    } on Object {
      state = was;
      rethrow;
    }
  }
}

final followingProvider =
    NotifierProvider.family<FollowingController, bool, String>(
      FollowingController.new,
    );

/// A member's profile, as the viewer sees it.
final profileProvider = FutureProvider.autoDispose.family<Profile, String>((
  ref,
  id,
) async {
  final profile = await ref.watch(communityApiProvider).member(id);
  ref.read(followingProvider(id).notifier).seed(profile.relationship.following);
  return profile;
});

/// The member's own friend requests.
final friendRequestsProvider = FutureProvider.autoDispose<List<FriendRequest>>(
  (ref) => ref.watch(communityApiProvider).friendRequests(),
);

enum MemberList { followers, following, friends, blocked }

/// A list of members a page at a time (the contract's cursors): the first
/// page on open, [more] at the foot. Each member's Follow starts from what
/// the list said.
class MemberListController extends AsyncNotifier<Page<MemberSummary>> {
  MemberListController(this.key);

  final (String, MemberList) key;

  Future<Page<MemberSummary>> _load(String? cursor) {
    final api = ref.read(communityApiProvider);
    final (id, list) = key;
    return switch (list) {
      MemberList.followers => api.followers(id, cursor: cursor),
      MemberList.following => api.following(id, cursor: cursor),
      MemberList.friends => api.friends(id, cursor: cursor),
      MemberList.blocked => api.blocked(cursor: cursor),
    };
  }

  void _seed(Iterable<MemberSummary> members) {
    for (final m in members) {
      final r = m.relationship;
      if (r != null) {
        ref.read(followingProvider(m.id).notifier).seed(r.following);
      }
    }
  }

  @override
  Future<Page<MemberSummary>> build() async {
    ref.watch(communityApiProvider);
    final page = await _load(null);
    _seed(page.items);
    return page;
  }

  bool _loading = false;

  /// The next page, added to the foot.
  Future<void> more() async {
    final now = state.value;
    final cursor = now?.nextCursor;
    if (now == null || cursor == null || _loading) return;
    _loading = true;
    try {
      final next = await _load(cursor);
      _seed(next.items);
      state = AsyncData(Page([...now.items, ...next.items], next.nextCursor));
    } finally {
      _loading = false;
    }
  }
}

final memberListProvider = AsyncNotifierProvider.autoDispose
    .family<MemberListController, Page<MemberSummary>, (String, MemberList)>(
      MemberListController.new,
    );

/// The members the member blocked.
final blockedProvider = memberListProvider(('', MemberList.blocked));
