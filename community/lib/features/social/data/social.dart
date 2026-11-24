import 'package:flutter_riverpod/flutter_riverpod.dart';

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

enum MemberList { followers, following, friends }

final memberListProvider = FutureProvider.autoDispose
    .family<List<MemberSummary>, (String, MemberList)>((ref, key) {
      final api = ref.watch(communityApiProvider);
      return switch (key.$2) {
        MemberList.followers => api.followers(key.$1),
        MemberList.following => api.following(key.$1),
        MemberList.friends => api.friends(key.$1),
      };
    });

final blockedProvider = FutureProvider.autoDispose<List<MemberSummary>>(
  (ref) => ref.watch(communityApiProvider).blocked(),
);
