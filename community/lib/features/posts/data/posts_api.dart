import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/api/community_api.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';
import '../../home/data/home_api.dart';

// 232.1 and 232.2: posts, the home feed and stories, on the contract's
// `/feed`, `/posts`, `/comments`, `/stories` (docs/api/community.yaml).

/// A photo or a video (with its poster frame).
class Media {
  const Media({required this.kind, required this.url, this.posterUrl});

  factory Media.fromJson(Json json) => Media(
    kind: str(json, 'kind', 'photo') == 'video'
        ? MediaKind.video
        : MediaKind.photo,
    url: str(json, 'url'),
    posterUrl: optStr(json, 'poster_url'),
  );

  final MediaKind kind;
  final String url;
  final String? posterUrl;

  bool get isVideo => kind == MediaKind.video;

  /// What a still shows: the photo, or the video's poster.
  String get still => isVideo ? (posterUrl ?? url) : url;
}

enum MediaKind { photo, video }

/// A link's preview in a post.
class LinkPreview {
  const LinkPreview({
    required this.url,
    required this.title,
    this.description,
    this.imageUrl,
    this.siteName,
  });

  factory LinkPreview.fromJson(Json json) => LinkPreview(
    url: str(json, 'url'),
    title: str(json, 'title'),
    description: optStr(json, 'description'),
    imageUrl: optStr(json, 'image_url'),
    siteName: optStr(json, 'site_name'),
  );

  final String url;
  final String title;
  final String? description;
  final String? imageUrl;
  final String? siteName;

  String get host => siteName ?? (Uri.tryParse(url)?.host ?? url);
}

class Post {
  const Post({
    required this.id,
    required this.author,
    required this.body,
    this.media = const [],
    this.link,
    this.groupId,
    this.likeCount = 0,
    this.commentCount = 0,
    this.liked = false,
    this.saved = false,
    this.status = 'published',
    this.shareUrl = '',
    this.createdAt,
  });

  factory Post.fromJson(Json json) => Post(
    id: str(json, 'id'),
    author: MemberSummary.fromJson(optObject(json, 'author') ?? const {}),
    body: str(json, 'body'),
    media: listOf(json, 'media', Media.fromJson),
    link: optObject(json, 'link_preview') == null
        ? null
        : LinkPreview.fromJson(optObject(json, 'link_preview')!),
    groupId: optStr(json, 'group_id'),
    likeCount: integer(json, 'like_count'),
    commentCount: integer(json, 'comment_count'),
    liked: boolean(json, 'liked'),
    saved: boolean(json, 'saved'),
    status: str(json, 'status', 'published'),
    shareUrl: str(json, 'share_url'),
    createdAt: optDate(json, 'created_at'),
  );

  final String id;
  final MemberSummary author;
  final String body;
  final List<Media> media;
  final LinkPreview? link;
  final String? groupId;
  final int likeCount;
  final int commentCount;
  final bool liked;
  final bool saved;

  /// `pending`: held for review, seen by its author only.
  final String status;
  final String shareUrl;
  final DateTime? createdAt;

  bool get pending => status == 'pending';

  Post copyWith({
    int? likeCount,
    int? commentCount,
    bool? liked,
    bool? saved,
  }) => Post(
    id: id,
    author: author,
    body: body,
    media: media,
    link: link,
    groupId: groupId,
    likeCount: likeCount ?? this.likeCount,
    commentCount: commentCount ?? this.commentCount,
    liked: liked ?? this.liked,
    saved: saved ?? this.saved,
    status: status,
    shareUrl: shareUrl,
    createdAt: createdAt,
  );
}

/// One item of a feed: a post or a question (area E draws showcase items;
/// the app skips kinds it doesn't know).
class FeedEntry {
  const FeedEntry({required this.id, this.post, this.question});

  static FeedEntry? fromJson(Json json) {
    final id = str(json, 'id');
    return switch (str(json, 'kind')) {
      'post' when optObject(json, 'post') != null => FeedEntry(
        id: id,
        post: Post.fromJson(optObject(json, 'post')!),
      ),
      'question' when optObject(json, 'question') != null => FeedEntry(
        id: id,
        question: FeedItem.question(optObject(json, 'question')!),
      ),
      _ => null,
    };
  }

  final String id;
  final Post? post;
  final FeedItem? question;
}

enum FeedTab {
  forYou('for_you'),
  latest('latest'),
  following('following');

  const FeedTab(this.wire);
  final String wire;
}

class Comment {
  const Comment({
    required this.id,
    required this.author,
    required this.body,
    this.parentId,
    this.likeCount = 0,
    this.liked = false,
    this.replies = const [],
    this.status = 'published',
    this.createdAt,
  });

  factory Comment.fromJson(Json json) => Comment(
    id: str(json, 'id'),
    author: MemberSummary.fromJson(optObject(json, 'author') ?? const {}),
    body: str(json, 'body'),
    parentId: optStr(json, 'parent_id'),
    likeCount: integer(json, 'like_count'),
    liked: boolean(json, 'liked'),
    replies: listOf(json, 'replies', Comment.fromJson),
    status: str(json, 'status', 'published'),
    createdAt: optDate(json, 'created_at'),
  );

  final String id;
  final MemberSummary author;
  final String body;
  final String? parentId;
  final int likeCount;
  final bool liked;
  final List<Comment> replies;
  final String status;
  final DateTime? createdAt;
}

class Story {
  const Story({
    required this.id,
    required this.author,
    required this.media,
    this.viewCount = 0,
    this.seen = false,
    this.createdAt,
  });

  factory Story.fromJson(Json json) => Story(
    id: str(json, 'id'),
    author: MemberSummary.fromJson(optObject(json, 'author') ?? const {}),
    media: Media.fromJson(optObject(json, 'media') ?? const {}),
    viewCount: integer(json, 'view_count'),
    seen: boolean(json, 'seen'),
    createdAt: optDate(json, 'created_at'),
  );

  final String id;
  final MemberSummary author;
  final Media media;

  /// Shown to its author only.
  final int viewCount;
  final bool seen;
  final DateTime? createdAt;
}

/// A member's stories of the last 24 hours, oldest first.
class StoryRing {
  const StoryRing({
    required this.member,
    required this.stories,
    this.allSeen = false,
  });

  factory StoryRing.fromJson(Json json) => StoryRing(
    member: MemberSummary.fromJson(optObject(json, 'member') ?? const {}),
    stories: listOf(json, 'stories', Story.fromJson),
    allSeen: boolean(json, 'all_seen'),
  );

  final MemberSummary member;
  final List<Story> stories;
  final bool allSeen;
}

/// A new post: text, up to 10 photos or one video with its poster.
class PostDraft {
  const PostDraft({
    this.body = '',
    this.photos = const [],
    this.video,
    this.poster,
    this.groupId,
  });

  final String body;
  final List<String> photos;
  final String? video;
  final String? poster;
  final String? groupId;

  static const maxPhotos = 10;
}

abstract class PostsApi {
  Future<Page<FeedEntry>> feed(FeedTab tab, {String? cursor});
  Future<Page<FeedEntry>> groupFeed(String group, {String? cursor});
  Future<Page<FeedEntry>> memberPosts(String member, {String? cursor});
  Future<Page<FeedEntry>> saved({String? cursor});
  Future<Post> post(String id);
  Future<Post> create(PostDraft draft);
  Future<void> delete(String id);
  Future<LinkPreview?> linkPreview(String url);

  /// The count now and whether the member likes it.
  Future<(int, bool)> like(String postId, {required bool on});
  Future<void> save(String postId, {required bool on});

  Future<Page<Comment>> comments(String postId, {String? cursor});
  Future<Comment> comment(String postId, String body, {String? parentId});
  Future<void> deleteComment(String commentId);
  Future<(int, bool)> likeComment(String commentId, {required bool on});

  Future<List<StoryRing>> storyRings();
  Future<Story> addStory({String? photo, String? video, String? poster});
  Future<void> deleteStory(String id);
  Future<void> viewStory(String id);
  Future<Page<MemberSummary>> storyViewers(String id, {String? cursor});
}

class HttpPostsApi implements PostsApi {
  HttpPostsApi(this.client);

  final ApiClient client;

  static String _p(String id) => Uri.encodeComponent(id);

  Page<FeedEntry> _feed(Json json) => Page([
    for (final j in jsonList(json, 'items')) ?FeedEntry.fromJson(j),
  ], optStr(json, 'next_cursor'));

  @override
  Future<Page<FeedEntry>> feed(FeedTab tab, {String? cursor}) async => _feed(
    await client.get('/feed', query: {'tab': tab.wire, 'cursor': cursor}),
  );

  @override
  Future<Page<FeedEntry>> groupFeed(String group, {String? cursor}) async =>
      _feed(
        await client.get(
          '/groups/${_p(group)}/feed',
          query: {'cursor': cursor},
        ),
      );

  @override
  Future<Page<FeedEntry>> memberPosts(String member, {String? cursor}) async =>
      _feed(
        await client.get(
          '/members/${_p(member)}/posts',
          query: {'cursor': cursor},
        ),
      );

  @override
  Future<Page<FeedEntry>> saved({String? cursor}) async =>
      _feed(await client.get('/me/saved', query: {'cursor': cursor}));

  @override
  Future<Post> post(String id) async =>
      Post.fromJson(await client.get('/posts/${_p(id)}'));

  @override
  Future<Post> create(PostDraft d) async => Post.fromJson(
    await client.multipart(
      '/posts',
      fields: {'body': d.body, 'group_id': d.groupId},
      files: [
        for (final p in d.photos) ('photos', p),
        if (d.video != null) ('video', d.video!),
        if (d.poster != null) ('poster', d.poster!),
      ],
    ),
  );

  @override
  Future<void> delete(String id) => client.delete('/posts/${_p(id)}');

  @override
  Future<LinkPreview?> linkPreview(String url) async {
    try {
      return LinkPreview.fromJson(
        await client.post('/posts/link-preview', body: {'url': url}),
      );
    } on ApiException catch (e) {
      if (e.code == ApiException.notFound) return null;
      rethrow;
    }
  }

  (int, bool) _liked(Json j) => (integer(j, 'count'), boolean(j, 'mine'));

  @override
  Future<(int, bool)> like(String postId, {required bool on}) async => _liked(
    on
        ? await client.put('/posts/${_p(postId)}/like')
        : await client.deleteJson('/posts/${_p(postId)}/like'),
  );

  @override
  Future<void> save(String postId, {required bool on}) async => on
      ? await client.put('/posts/${_p(postId)}/save')
      : await client.delete('/posts/${_p(postId)}/save');

  @override
  Future<Page<Comment>> comments(String postId, {String? cursor}) async {
    final j = await client.get(
      '/posts/${_p(postId)}/comments',
      query: {'cursor': cursor},
    );
    return Page(listOf(j, 'items', Comment.fromJson), optStr(j, 'next_cursor'));
  }

  @override
  Future<Comment> comment(
    String postId,
    String body, {
    String? parentId,
  }) async => Comment.fromJson(
    await client.post(
      '/posts/${_p(postId)}/comments',
      body: {'body': body, 'parent_id': ?parentId},
    ),
  );

  @override
  Future<void> deleteComment(String commentId) =>
      client.delete('/comments/${_p(commentId)}');

  @override
  Future<(int, bool)> likeComment(String commentId, {required bool on}) async =>
      _liked(
        on
            ? await client.put('/comments/${_p(commentId)}/like')
            : await client.deleteJson('/comments/${_p(commentId)}/like'),
      );

  @override
  Future<List<StoryRing>> storyRings() async =>
      listOf(await client.get('/stories'), 'items', StoryRing.fromJson);

  @override
  Future<Story> addStory({
    String? photo,
    String? video,
    String? poster,
  }) async => Story.fromJson(
    await client.multipart(
      '/stories',
      files: [
        if (photo != null) ('photo', photo),
        if (video != null) ('video', video),
        if (poster != null) ('poster', poster),
      ],
    ),
  );

  @override
  Future<void> deleteStory(String id) => client.delete('/stories/${_p(id)}');

  @override
  Future<void> viewStory(String id) async =>
      client.post('/stories/${_p(id)}/view');

  @override
  Future<Page<MemberSummary>> storyViewers(String id, {String? cursor}) async {
    final j = await client.get(
      '/stories/${_p(id)}/viewers',
      query: {'cursor': cursor},
    );
    return Page(
      listOf(j, 'items', MemberSummary.fromJson),
      optStr(j, 'next_cursor'),
    );
  }
}

final postsApiProvider = Provider<PostsApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakePostsApi()
      : HttpPostsApi(ref.watch(apiClientProvider)),
);

/// In memory, for tests and the demo: the design's members.
class FakePostsApi implements PostsApi {
  FakePostsApi({DateTime? now}) : _now = now ?? DateTime.now();

  final DateTime _now;
  final calls = <String>[];

  static const mohamed = MemberSummary(
    id: 'm-mohamed',
    name: 'Mohamed Ali',
    username: 'mohamed',
    level: 'Pro',
  );
  static const nour = MemberSummary(
    id: 'm-nour',
    name: 'Nour El Hoda',
    username: 'nour',
    badge: BadgeKind.blue,
    level: 'Expert',
  );
  static const karim = MemberSummary(
    id: 'm-karim',
    name: 'Karim Samy',
    username: 'karim',
  );

  late final List<Post> _posts = [
    Post(
      id: 'p-runway',
      author: nour,
      body: 'Launched my store today with the Runway template 🎉',
      media: const [
        Media(
          kind: MediaKind.photo,
          url: 'asset:assets/images/abaya-desert.jpg',
        ),
      ],
      likeCount: 128,
      commentCount: 2,
      shareUrl: 'https://community.yallapp.com.tr/posts/p-runway',
      createdAt: _now.subtract(const Duration(hours: 2)),
    ),
    Post(
      id: 'p-links',
      author: karim,
      body: 'This guide on product photos helped me a lot.',
      link: const LinkPreview(
        url: 'https://yallapp.com.tr/blog/product-photos',
        title: 'Product photos that sell',
        description: 'Light, angles and the 3:4 frame.',
        siteName: 'yallapp.com.tr',
      ),
      likeCount: 14,
      shareUrl: 'https://community.yallapp.com.tr/posts/p-links',
      createdAt: _now.subtract(const Duration(hours: 5)),
    ),
  ];

  late final _question = FeedItem(
    id: 'q-product-page',
    kind: FeedKind.question,
    title: 'How do I give each template its own product page?',
    author: karim,
    text: 'Every template I sell shows the same product page.',
    score: 42,
    answers: 12,
    label: 'Studio',
    at: _now.subtract(const Duration(hours: 3)),
  );

  final Map<String, List<Comment>> _comments = {
    'p-runway': [
      const Comment(
        id: 'c-1',
        author: karim,
        body: 'Looks great! Which photos ratio did you use?',
        likeCount: 3,
        replies: [
          Comment(
            id: 'c-2',
            author: nour,
            body: '3:4, as the template suggests.',
            parentId: 'c-1',
          ),
        ],
      ),
    ],
  };

  late final List<StoryRing> _rings = [
    StoryRing(
      member: nour,
      stories: [
        Story(
          id: 's-nour-1',
          author: nour,
          media: const Media(
            kind: MediaKind.photo,
            url: 'asset:assets/images/bunny-knit.jpg',
          ),
          createdAt: _now.subtract(const Duration(hours: 1)),
        ),
      ],
    ),
    StoryRing(
      member: karim,
      stories: [
        Story(
          id: 's-karim-1',
          author: karim,
          media: const Media(
            kind: MediaKind.photo,
            url: 'asset:assets/images/bed-bright.jpg',
          ),
          createdAt: _now.subtract(const Duration(hours: 6)),
        ),
      ],
    ),
  ];

  final _saved = <String>{};
  var _n = 0;

  Post _find(String id) => _posts.firstWhere(
    (p) => p.id == id,
    orElse: () => throw const ApiException(code: ApiException.notFound),
  );

  void _put(Post p) {
    final i = _posts.indexWhere((x) => x.id == p.id);
    _posts[i] = p;
  }

  List<FeedEntry> get _entries {
    final items = [
      for (final p in _posts)
        if (p.groupId == null) FeedEntry(id: p.id, post: p),
      FeedEntry(id: _question.id, question: _question),
    ];
    items.sort(
      (a, b) => (b.post?.createdAt ?? b.question!.at!).compareTo(
        a.post?.createdAt ?? a.question!.at!,
      ),
    );
    return items;
  }

  @override
  Future<Page<FeedEntry>> feed(FeedTab tab, {String? cursor}) async {
    calls.add('feed:${tab.wire}');
    return Page(switch (tab) {
      // Following: the members the demo member follows (Nour).
      FeedTab.following => [
        for (final e in _entries)
          if (e.post?.author.id == nour.id) e,
      ],
      _ => _entries,
    });
  }

  @override
  Future<Page<FeedEntry>> groupFeed(String group, {String? cursor}) async =>
      Page([
        for (final p in _posts)
          if (p.groupId == group) FeedEntry(id: p.id, post: p),
      ]);

  @override
  Future<Page<FeedEntry>> memberPosts(String member, {String? cursor}) async =>
      Page([
        for (final p in _posts)
          if (p.author.id == member) FeedEntry(id: p.id, post: p),
      ]);

  @override
  Future<Page<FeedEntry>> saved({String? cursor}) async => Page([
    for (final p in _posts)
      if (_saved.contains(p.id)) FeedEntry(id: p.id, post: p),
  ]);

  @override
  Future<Post> post(String id) async => _find(id);

  @override
  Future<Post> create(PostDraft d) async {
    calls.add('create:${d.photos.length}:${d.video != null}');
    final p = Post(
      id: 'p-new-${_n++}',
      author: mohamed,
      body: d.body,
      media: [
        for (final f in d.photos) Media(kind: MediaKind.photo, url: f),
        if (d.video != null)
          Media(kind: MediaKind.video, url: d.video!, posterUrl: d.poster),
      ],
      groupId: d.groupId,
      shareUrl: 'https://community.yallapp.com.tr/posts/p-new',
      createdAt: DateTime.now(),
    );
    _posts.insert(0, p);
    return p;
  }

  @override
  Future<void> delete(String id) async {
    calls.add('delete:$id');
    _posts.removeWhere((p) => p.id == id);
  }

  @override
  Future<LinkPreview?> linkPreview(String url) async =>
      LinkPreview(url: url, title: 'A page', siteName: Uri.tryParse(url)?.host);

  @override
  Future<(int, bool)> like(String postId, {required bool on}) async {
    calls.add('${on ? 'like' : 'unlike'}:$postId');
    final p = _find(postId);
    final n = p.likeCount + (on == p.liked ? 0 : (on ? 1 : -1));
    _put(p.copyWith(likeCount: n, liked: on));
    return (n, on);
  }

  @override
  Future<void> save(String postId, {required bool on}) async {
    calls.add('${on ? 'save' : 'unsave'}:$postId');
    on ? _saved.add(postId) : _saved.remove(postId);
    _put(_find(postId).copyWith(saved: on));
  }

  @override
  Future<Page<Comment>> comments(String postId, {String? cursor}) async =>
      Page(List.of(_comments[postId] ?? const []));

  @override
  Future<Comment> comment(
    String postId,
    String body, {
    String? parentId,
  }) async {
    calls.add('comment:$postId:${parentId ?? ''}');
    final c = Comment(
      id: 'c-new-${_n++}',
      author: mohamed,
      body: body,
      parentId: parentId,
    );
    final list = _comments.putIfAbsent(postId, () => []);
    if (parentId == null) {
      list.add(c);
    } else {
      final i = list.indexWhere((x) => x.id == parentId);
      final parent = list[i];
      list[i] = Comment(
        id: parent.id,
        author: parent.author,
        body: parent.body,
        likeCount: parent.likeCount,
        liked: parent.liked,
        replies: [...parent.replies, c],
      );
    }
    final p = _find(postId);
    _put(p.copyWith(commentCount: p.commentCount + 1));
    return c;
  }

  @override
  Future<void> deleteComment(String commentId) async =>
      calls.add('deleteComment:$commentId');

  @override
  Future<(int, bool)> likeComment(String commentId, {required bool on}) async {
    calls.add('${on ? 'like' : 'unlike'}Comment:$commentId');
    return (on ? 1 : 0, on);
  }

  @override
  Future<List<StoryRing>> storyRings() async => List.of(_rings);

  @override
  Future<Story> addStory({String? photo, String? video, String? poster}) async {
    calls.add('story:${video != null ? 'video' : 'photo'}');
    final s = Story(
      id: 's-new-${_n++}',
      author: mohamed,
      media: video != null
          ? Media(kind: MediaKind.video, url: video, posterUrl: poster)
          : Media(kind: MediaKind.photo, url: photo ?? ''),
      createdAt: DateTime.now(),
    );
    final i = _rings.indexWhere((r) => r.member.id == mohamed.id);
    if (i < 0) {
      _rings.insert(0, StoryRing(member: mohamed, stories: [s], allSeen: true));
    } else {
      _rings[i] = StoryRing(
        member: mohamed,
        stories: [..._rings[i].stories, s],
        allSeen: true,
      );
    }
    return s;
  }

  @override
  Future<void> deleteStory(String id) async => calls.add('deleteStory:$id');

  @override
  Future<void> viewStory(String id) async => calls.add('view:$id');

  @override
  Future<Page<MemberSummary>> storyViewers(String id, {String? cursor}) async =>
      const Page([nour, karim]);
}
