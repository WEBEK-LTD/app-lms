import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/posts_api.dart';

/// What a post's buttons show, changed at once and put back on a failure.
typedef PostLive = ({
  String id,
  int likeCount,
  int commentCount,
  bool liked,
  bool saved,
});

extension PostLiveOf on Post {
  PostLive get live => (
    id: id,
    likeCount: likeCount,
    commentCount: commentCount,
    liked: liked,
    saved: saved,
  );
}

class PostController extends Notifier<PostLive> {
  PostController(this.seed);

  final PostLive seed;

  @override
  PostLive build() => seed;

  Future<void> toggleLike() async {
    final was = state;
    final on = !was.liked;
    state = (
      id: was.id,
      likeCount: was.likeCount + (on ? 1 : -1),
      commentCount: was.commentCount,
      liked: on,
      saved: was.saved,
    );
    try {
      final (n, mine) = await ref.read(postsApiProvider).like(was.id, on: on);
      state = (
        id: was.id,
        likeCount: n,
        commentCount: state.commentCount,
        liked: mine,
        saved: state.saved,
      );
    } on Object {
      state = was;
    }
  }

  Future<void> toggleSave() async {
    final was = state;
    state = (
      id: was.id,
      likeCount: was.likeCount,
      commentCount: was.commentCount,
      liked: was.liked,
      saved: !was.saved,
    );
    try {
      await ref.read(postsApiProvider).save(was.id, on: !was.saved);
    } on Object {
      state = was;
    }
  }

  void commented() => state = (
    id: state.id,
    likeCount: state.likeCount,
    commentCount: state.commentCount + 1,
    liked: state.liked,
    saved: state.saved,
  );
}

final _postState = NotifierProvider.autoDispose
    .family<PostController, PostLive, PostLive>(PostController.new);

/// Keyed by what the server last said, so a refreshed feed starts afresh.
NotifierProvider<PostController, PostLive> postStateProvider(Post post) =>
    _postState(post.live);

/// The home feed's tabs, the first page each.
final feedProvider = FutureProvider.autoDispose
    .family<List<FeedEntry>, FeedTab>(
      (ref, tab) async => (await ref.watch(postsApiProvider).feed(tab)).items,
    );

final postProvider = FutureProvider.autoDispose.family<Post, String>(
  (ref, id) => ref.watch(postsApiProvider).post(id),
);

final commentsProvider = FutureProvider.autoDispose
    .family<List<Comment>, String>(
      (ref, id) async => (await ref.watch(postsApiProvider).comments(id)).items,
    );

final storyRingsProvider = FutureProvider.autoDispose<List<StoryRing>>(
  (ref) => ref.watch(postsApiProvider).storyRings(),
);

abstract final class PostLinks {
  static String post(String id) => '/posts/$id';
  static const compose = '/posts/new';
  static const saved = '/me/saved';
}
