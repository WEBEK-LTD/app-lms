import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

/// What Home shows: the featured card on top, the shortcuts' state, and the
/// community's newest questions and tutorials drawn as the design's posts.
class HomeFeed {
  const HomeFeed({
    this.featured,
    this.items = const [],
    this.newTutorial = false,
    this.news = false,
  });

  factory HomeFeed.fromJson(Json json) => HomeFeed(
    featured: optObject(json, 'featured') == null
        ? null
        : FeedItem.fromJson(optObject(json, 'featured')!),
    items: listOf(json, 'items', FeedItem.fromJson),
    newTutorial: boolean(json, 'new_tutorial'),
    news: boolean(json, 'news'),
  );

  final FeedItem? featured;
  final List<FeedItem> items;

  /// Whether the "New tutorial" and "What's new" rings are unseen.
  final bool newTutorial;
  final bool news;
}

enum FeedKind { question, tutorial, announcement }

class FeedItem {
  const FeedItem({
    required this.id,
    required this.kind,
    required this.title,
    this.text = '',
    this.imageUrl,
    this.author,
    this.score = 0,
    this.answers = 0,
    this.label,
    this.endsAt,
    this.at,
  });

  factory FeedItem.fromJson(Json json) => FeedItem(
    id: str(json, 'id'),
    kind: switch (str(json, 'type', str(json, 'kind'))) {
      'tutorial' => FeedKind.tutorial,
      'announcement' => FeedKind.announcement,
      _ => FeedKind.question,
    },
    title: str(json, 'title'),
    text: str(json, 'excerpt', str(json, 'text')),
    imageUrl: optStr(json, 'image_url') ?? optStr(json, 'cover_url'),
    author: optObject(json, 'author') == null
        ? null
        : MemberSummary.fromJson(optObject(json, 'author')!),
    score: integer(json, 'score', integer(json, 'votes')),
    answers: integer(json, 'answers'),
    label: optStr(json, 'label') ?? optStr(json, 'section'),
    endsAt: optDate(json, 'ends_at'),
    at: optDate(json, 'created_at'),
  );

  final String id;
  final FeedKind kind;
  final String title;
  final String text;
  final String? imageUrl;
  final MemberSummary? author;

  /// A question's votes, a tutorial's likes.
  final int score;
  final int answers;

  /// Its section ("Studio", "November challenge · 214 entries").
  final String? label;

  /// When it ends (a challenge's countdown).
  final DateTime? endsAt;
  final DateTime? at;
}

abstract class HomeApi {
  Future<HomeFeed> feed();
}

class HttpHomeApi implements HomeApi {
  HttpHomeApi(this.client);

  final ApiClient client;

  @override
  Future<HomeFeed> feed() async =>
      HomeFeed.fromJson(await client.get('/feed', query: {'limit': 20}));
}

/// The approved design's Home, in memory (tests and the demo).
class FakeHomeApi implements HomeApi {
  FakeHomeApi({HomeFeed? feed}) : _feed = feed ?? sample;

  final HomeFeed _feed;

  static final sample = HomeFeed(
    newTutorial: true,
    news: false,
    featured: FeedItem(
      id: 't-winter',
      kind: FeedKind.announcement,
      title: 'Coziest winter store ❄️',
      label: 'November challenge · 214 entries',
      imageUrl: 'asset:assets/images/beanie-girl.jpg',
      endsAt: DateTime.now().add(
        const Duration(days: 4, hours: 11, minutes: 32, seconds: 30),
      ),
    ),
    items: [
      FeedItem(
        id: 'p-runway',
        at: DateTime.now().subtract(const Duration(hours: 2)),
        kind: FeedKind.tutorial,
        title: 'Launched my store today with the Runway template 🎉',
        imageUrl: 'asset:assets/images/abaya-desert.jpg',
        author: const MemberSummary(
          id: 'm-nour',
          name: 'Nour El Hoda',
          username: 'nour',
          badge: BadgeKind.blue,
          level: 'Expert',
        ),
        score: 128,
        label: 'Lujain · Build one like it',
      ),
      FeedItem(
        id: 'q-product-page',
        at: DateTime.now().subtract(const Duration(hours: 3)),
        kind: FeedKind.question,
        title: 'How do I give each template its own product page?',
        author: const MemberSummary(
          id: 'm-karim',
          name: 'Karim Samy',
          username: 'karim',
        ),
        score: 42,
        answers: 4,
        label: 'Studio',
      ),
    ],
  );

  @override
  Future<HomeFeed> feed() async => _feed;
}

final homeApiProvider = Provider<HomeApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeHomeApi()
      : HttpHomeApi(ref.watch(apiClientProvider)),
);

final homeFeedProvider = FutureProvider.autoDispose<HomeFeed>(
  (ref) => ref.watch(homeApiProvider).feed(),
);
