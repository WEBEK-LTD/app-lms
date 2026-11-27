import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

/// 232.3 (area E) Showcase: apps members built (`/showcase`).
class ShowcaseSummary {
  const ShowcaseSummary({
    required this.id,
    required this.title,
    required this.author,
    this.coverUrl,
    this.madeWithYallapp = false,
    this.likeCount = 0,
  });

  factory ShowcaseSummary.fromJson(Json json) => ShowcaseSummary(
    id: str(json, 'id'),
    title: str(json, 'title'),
    author: MemberSummary.fromJson(optObject(json, 'author') ?? const {}),
    coverUrl: optStr(json, 'cover_url'),
    madeWithYallapp: boolean(json, 'made_with_yallapp'),
    likeCount: integer(json, 'like_count'),
  );

  final String id;
  final String title;
  final MemberSummary author;
  final String? coverUrl;
  final bool madeWithYallapp;
  final int likeCount;
}

class ShowcaseItem {
  const ShowcaseItem({
    required this.summary,
    this.description = '',
    this.pictures = const [],
    this.appStoreUrl,
    this.playStoreUrl,
    this.websiteUrl,
    this.commentCount = 0,
    this.liked = false,
  });

  factory ShowcaseItem.fromJson(Json json) {
    final pictures = strings(json, 'pictures');
    return ShowcaseItem(
      summary: ShowcaseSummary.fromJson({
        ...json,
        'cover_url': ?(pictures.isEmpty ? null : pictures.first),
      }),
      description: str(json, 'description'),
      pictures: pictures,
      appStoreUrl: optStr(json, 'app_store_url'),
      playStoreUrl: optStr(json, 'play_store_url'),
      websiteUrl: optStr(json, 'website_url'),
      commentCount: integer(json, 'comment_count'),
      liked: boolean(json, 'liked'),
    );
  }

  final ShowcaseSummary summary;
  final String description;
  final List<String> pictures;
  final String? appStoreUrl;
  final String? playStoreUrl;
  final String? websiteUrl;
  final int commentCount;
  final bool liked;

  ShowcaseItem liking(bool on) => ShowcaseItem(
    summary: ShowcaseSummary(
      id: summary.id,
      title: summary.title,
      author: summary.author,
      coverUrl: summary.coverUrl,
      madeWithYallapp: summary.madeWithYallapp,
      likeCount: summary.likeCount + (on == liked ? 0 : (on ? 1 : -1)),
    ),
    description: description,
    pictures: pictures,
    appStoreUrl: appStoreUrl,
    playStoreUrl: playStoreUrl,
    websiteUrl: websiteUrl,
    commentCount: commentCount,
    liked: on,
  );
}

enum ShowcaseSort { newest, mostLiked }

abstract class ShowcaseApi {
  Future<List<ShowcaseSummary>> gallery({
    String? type,
    ShowcaseSort sort = ShowcaseSort.newest,
    String? member,
  });
  Future<ShowcaseItem> item(String id);
  Future<void> like(String id, {required bool on});
}

class HttpShowcaseApi implements ShowcaseApi {
  HttpShowcaseApi(this._client);

  final ApiClient _client;

  @override
  Future<List<ShowcaseSummary>> gallery({
    String? type,
    ShowcaseSort sort = ShowcaseSort.newest,
    String? member,
  }) async => listOf(
    await _client.get(
      '/showcase',
      query: {
        'type': type,
        'sort': sort == ShowcaseSort.mostLiked ? 'most_liked' : 'newest',
        'member': member,
      },
    ),
    'items',
    ShowcaseSummary.fromJson,
  );

  @override
  Future<ShowcaseItem> item(String id) async => ShowcaseItem.fromJson(
    await _client.get('/showcase/${Uri.encodeComponent(id)}'),
  );

  @override
  Future<void> like(String id, {required bool on}) async {
    final path = '/showcase/${Uri.encodeComponent(id)}/like';
    on ? await _client.put(path) : await _client.deleteJson(path);
  }
}

Json _member(String id, String name) => {
  'id': id,
  'username': name.toLowerCase(),
  'display_name': name,
};

/// The demo's and the tests' gallery.
class FakeShowcaseApi implements ShowcaseApi {
  final calls = <String>[];

  static final items = <Json>[
    {
      'id': 'sc-bakery',
      'title': 'Simit House',
      'description': 'Our bakery app: order ahead and pick up warm.',
      'app_type': 'store',
      'pictures': <String>[],
      'play_store_url': 'https://play.google.com/store/apps/details?id=example',
      'author': _member('m-ayse', 'Ayse'),
      'made_with_yallapp': true,
      'like_count': 42,
      'comment_count': 5,
      'liked': false,
    },
    {
      'id': 'sc-quran',
      'title': 'Noor Academy',
      'description': 'Courses in Arabic for children.',
      'app_type': 'academy',
      'pictures': <String>[],
      'website_url': 'https://example.com',
      'author': _member('m-omar', 'Omar'),
      'made_with_yallapp': false,
      'like_count': 17,
      'comment_count': 1,
      'liked': true,
    },
  ];

  @override
  Future<List<ShowcaseSummary>> gallery({
    String? type,
    ShowcaseSort sort = ShowcaseSort.newest,
    String? member,
  }) async {
    calls.add('gallery:${type ?? ''}:${sort.name}');
    final list = [
      for (final j in items)
        if (type == null || j['app_type'] == type) ShowcaseSummary.fromJson(j),
    ];
    if (sort == ShowcaseSort.mostLiked) {
      list.sort((a, b) => b.likeCount.compareTo(a.likeCount));
    }
    return list;
  }

  @override
  Future<ShowcaseItem> item(String id) async =>
      ShowcaseItem.fromJson(items.firstWhere((j) => j['id'] == id));

  @override
  Future<void> like(String id, {required bool on}) async =>
      calls.add('like:$id:$on');
}

final showcaseApiProvider = Provider<ShowcaseApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeShowcaseApi()
      : HttpShowcaseApi(ref.watch(apiClientProvider)),
);
