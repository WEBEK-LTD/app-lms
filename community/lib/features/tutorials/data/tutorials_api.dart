import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/api/json.dart';
import '../../../core/providers.dart';
import '../../qa/data/qa_models.dart';
import 'tutorial_models.dart';

/// Area E: the official tutorials (`/tutorials`).
abstract class TutorialsApi {
  Future<List<SectionRef>> sections();

  Future<Paged<TutorialSummary>> tutorials({
    String? section,
    TutorialKind? kind,
    TutorialLevel? level,
    String? language,
    String? cursor,
  });

  /// By id or slug.
  Future<Tutorial> tutorial(String idOrSlug);

  Future<void> bookmark(String id, {required bool saved});

  Future<List<TutorialSummary>> search(String query);
}

class HttpTutorialsApi implements TutorialsApi {
  HttpTutorialsApi(this._client);

  final ApiClient _client;

  @override
  Future<List<SectionRef>> sections() async => listOf(
    await _client.get('/tutorials/sections'),
    'items',
    SectionRef.fromJson,
  );

  @override
  Future<Paged<TutorialSummary>> tutorials({
    String? section,
    TutorialKind? kind,
    TutorialLevel? level,
    String? language,
    String? cursor,
  }) async => Paged.fromJson(
    await _client.get(
      '/tutorials',
      query: {
        'section': section,
        'kind': kind?.name,
        'level': level?.name,
        'language': language,
        'cursor': cursor,
      },
    ),
    TutorialSummary.fromJson,
  );

  @override
  Future<Tutorial> tutorial(String idOrSlug) async =>
      Tutorial.fromJson(await _client.get('/tutorials/$idOrSlug'));

  @override
  Future<void> bookmark(String id, {required bool saved}) async {
    final path = '/tutorials/$id/bookmark';
    if (saved) {
      await _client.put(path);
    } else {
      await _client.delete(path);
    }
  }

  @override
  Future<List<TutorialSummary>> search(String query) async => listOf(
    await _client.get('/search', query: {'q': query, 'type': 'tutorials'}),
    'tutorials',
    TutorialSummary.fromJson,
  );
}

/// [TutorialsApi] in memory, for tests and the demo build: the design's
/// "New tutorial" and a few more, in English, Arabic and Turkish; all free.
class FakeTutorialsApi implements TutorialsApi {
  FakeTutorialsApi({DateTime? now}) : now = now ?? DateTime.now().toUtc();

  final DateTime now;
  final calls = <String>[];

  static const sectionList = [
    SectionRef(
      slug: 'getting-started',
      name: 'Getting started',
      icon: 'rocket_launch',
    ),
    SectionRef(slug: 'studio', name: 'Studio', icon: 'design_services'),
    SectionRef(slug: 'shops', name: 'Shops', icon: 'storefront'),
    SectionRef(slug: 'publishing', name: 'Publishing', icon: 'publish'),
  ];

  late final _items = <Tutorial>[
    _t(
      'tut-product-page',
      'Give every template its own product page',
      'Pages → Product → From template, in four minutes.',
      TutorialKind.video,
      TutorialLevel.beginner,
      'en',
      'studio',
      cover: 'asset:assets/images/bunny-knit.jpg',
      seconds: 504,
      days: 1,
      video: 'https://yallapp.com.tr/community/videos/product-page',
      body:
          'In this video:\n\n1. Open Pages in Studio.\n2. Pick Product.\n'
          '3. Choose “From template”.',
    ),
    _t(
      'tut-first-shop',
      'Your first shop, from sign-up to the stores',
      'Everything you need for a shop people can download.',
      TutorialKind.article,
      TutorialLevel.beginner,
      'en',
      'getting-started',
      cover: 'asset:assets/images/bath-set.jpg',
      minutes: 9,
      days: 3,
      body:
          'Start in Studio with a template that fits what you sell. Add your '
          'products, then your logo and colours.\n\nWhen it looks right, '
          'send it to the stores from Publish.',
    ),
    _t(
      'tut-arabic',
      'متجر بالعربية أولًا',
      'اجعل العربية لغة متجرك الأولى والإنجليزية الثانية.',
      TutorialKind.article,
      TutorialLevel.intermediate,
      'ar',
      'shops',
      cover: 'asset:assets/images/abaya-desert.jpg',
      minutes: 6,
      days: 5,
      body: 'افتح الإعدادات ثم اللغات، واختر العربية لغةً أولى.',
    ),
    _t(
      'tut-photos',
      'Ürün fotoğrafları 3:4',
      'Galeriyi dolduran fotoğraflar.',
      TutorialKind.video,
      TutorialLevel.beginner,
      'tr',
      'shops',
      cover: 'asset:assets/images/bed-bright.jpg',
      seconds: 312,
      days: 8,
      video: 'https://yallapp.com.tr/community/videos/photos-tr',
    ),
    _t(
      'tut-pro-launch',
      'Launching to thousands: the pro checklist',
      'A deep course for shops ready to grow.',
      TutorialKind.video,
      TutorialLevel.advanced,
      'en',
      'publishing',
      cover: 'asset:assets/images/beanie-girl.jpg',
      seconds: 2710,
      days: 10,
      video: 'https://yallapp.com.tr/community/videos/pro-launch',
      body: 'The checklist, step by step: store pages, photos, reviews.',
    ),
  ];

  Tutorial _t(
    String id,
    String title,
    String summary,
    TutorialKind kind,
    TutorialLevel level,
    String language,
    String section, {
    String? cover,
    int? seconds,
    int? minutes,
    required int days,
    String? video,
    String body = '',
  }) => Tutorial(
    summary: TutorialSummary(
      id: id,
      slug: id.substring(4),
      title: title,
      summary: summary,
      kind: kind,
      level: level,
      language: language,
      section: sectionList.firstWhere((s) => s.slug == section),
      coverUrl: cover,
      durationSeconds: seconds,
      durationMinutes: minutes,
      viewCount: 120 * (11 - days),
      publishedAt: now.subtract(Duration(days: days)),
    ),
    body: body,
    videoUrl: video,
  );

  @override
  Future<List<SectionRef>> sections() async => sectionList;

  @override
  Future<Paged<TutorialSummary>> tutorials({
    String? section,
    TutorialKind? kind,
    TutorialLevel? level,
    String? language,
    String? cursor,
  }) async {
    calls.add(
      'tutorials:${section ?? ''}:${kind?.name ?? ''}:${level?.name ?? ''}:${language ?? ''}',
    );
    return Paged([
      for (final t in _items)
        if ((section == null || t.summary.section.slug == section) &&
            (kind == null || t.summary.kind == kind) &&
            (level == null || t.summary.level == level) &&
            (language == null || t.summary.language == language))
          t.summary,
    ]);
  }

  @override
  Future<Tutorial> tutorial(String idOrSlug) async {
    calls.add('tutorial:$idOrSlug');
    return _items.firstWhere(
      (t) => t.id == idOrSlug || t.summary.slug == idOrSlug,
      orElse: () => throw const ApiException(code: 'not_found'),
    );
  }

  @override
  Future<void> bookmark(String id, {required bool saved}) async {
    calls.add('bookmark:$id:$saved');
    final i = _items.indexWhere((t) => t.id == id);
    final t = _items[i];
    _items[i] = Tutorial(
      summary: t.summary.copyWith(bookmarked: saved),
      body: t.body,
      videoUrl: t.videoUrl,
    );
  }

  @override
  Future<List<TutorialSummary>> search(String query) async {
    final q = query.toLowerCase();
    return [
      for (final t in _items)
        if (t.summary.title.toLowerCase().contains(q) ||
            t.summary.summary.toLowerCase().contains(q))
          t.summary,
    ];
  }

  List<TutorialSummary> get saved => [
    for (final t in _items)
      if (t.summary.bookmarked) t.summary,
  ];
}

final tutorialsApiProvider = Provider<TutorialsApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeTutorialsApi()
      : HttpTutorialsApi(ref.watch(apiClientProvider)),
);
