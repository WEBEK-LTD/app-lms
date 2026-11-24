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
    this.locked = false,
  });

  /// A question of `GET /qa/questions` (area B's QuestionSummary).
  factory FeedItem.question(Json json) => FeedItem(
    id: str(json, 'id'),
    kind: FeedKind.question,
    title: str(json, 'title'),
    text: str(json, 'excerpt'),
    author: optObject(json, 'author') == null
        ? null
        : MemberSummary.fromJson(optObject(json, 'author')!),
    score: integer(json, 'score'),
    answers: integer(json, 'answer_count'),
    label: optObject(json, 'section') == null
        ? null
        : optStr(optObject(json, 'section')!, 'name'),
    at: optDate(json, 'created_at'),
  );

  /// An official tutorial of `GET /tutorials` (area B's TutorialSummary).
  factory FeedItem.tutorial(Json json) => FeedItem(
    id: str(json, 'slug', str(json, 'id')),
    kind: FeedKind.tutorial,
    title: str(json, 'title'),
    text: str(json, 'summary'),
    imageUrl: optStr(json, 'cover_url'),
    label: optObject(json, 'section') == null
        ? null
        : optStr(optObject(json, 'section')!, 'name'),
    locked: boolean(json, 'locked'),
    at: optDate(json, 'published_at'),
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

  /// Paid on the website and not unlocked for this member: shown with a
  /// lock, never a price.
  final bool locked;
}

abstract class HomeApi {
  Future<HomeFeed> feed();
}

/// Home from area B's lists (the contract has no feed of its own): the
/// newest official tutorial on top, then the newest tutorials and questions
/// together, newest first.
class HttpHomeApi implements HomeApi {
  HttpHomeApi(this.client);

  final ApiClient client;

  @override
  Future<HomeFeed> feed() async {
    final (tutorials, questions) = await (
      client.get('/tutorials', query: {'limit': 6}),
      client.get('/qa/questions', query: {'sort': 'newest', 'limit': 12}),
    ).wait;
    final t = listOf(tutorials, 'items', FeedItem.tutorial);
    final q = listOf(questions, 'items', FeedItem.question);
    final featured = t.isEmpty ? null : t.first;
    final items = [...t.skip(1), ...q]
      ..sort(
        (a, b) => (b.at ?? DateTime(2000)).compareTo(a.at ?? DateTime(2000)),
      );
    final week = DateTime.now().subtract(const Duration(days: 7));
    return HomeFeed(
      featured: featured,
      items: items.take(12).toList(),
      newTutorial: featured?.at?.isAfter(week) ?? false,
    );
  }
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
