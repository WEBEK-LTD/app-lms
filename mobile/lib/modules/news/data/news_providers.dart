import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/storage/local_settings.dart';

/// How articles show (`Config.news`); the defaults on older servers.
final newsConfigProvider = Provider<NewsConfig>(
  (ref) => ref.watch(appConfigProvider).news ?? const NewsConfig(),
);

final newsHomeProvider = FutureProvider.autoDispose<NewsHome>(
  (ref) => ref.contentApi.getNewsHome(),
);

final newsCategoriesProvider = FutureProvider<List<NewsCategory>>(
  (ref) => ref.contentApi.listNewsCategories(),
);

/// Articles for one search and section, page by page.
class ArticlesController extends PagedController<ArticleSummary> {
  ArticlesController(this.query);

  final ArticleQuery query;

  @override
  Future<Paged<ArticleSummary>> fetch(int page) =>
      ref.read(yallappApiProvider).listArticles(query.copyWith(page: page));
}

final articlesProvider = NotifierProvider.autoDispose
    .family<ArticlesController, PagedState<ArticleSummary>, ArticleQuery>(
      ArticlesController.new,
    );

final articleProvider = FutureProvider.autoDispose.family<Article, String>(
  (ref, id) => ref.contentApi.getArticle(id),
);

/// Articles the reader saved, newest saved first. Kept on this device only
/// (no account needed), with what lists show, so they open from Saved
/// without a connection to the list.
final bookmarksProvider =
    NotifierProvider<BookmarksController, List<ArticleSummary>>(
      BookmarksController.new,
    );

class BookmarksController extends Notifier<List<ArticleSummary>> {
  static const storageKey = 'news.bookmarks';

  /// The most articles kept; older ones go first.
  static const limit = 200;

  @override
  List<ArticleSummary> build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(storageKey);
    if (raw == null) return const [];
    try {
      final list = jsonDecode(raw);
      if (list is! List) return const [];
      return [
        for (final item in list)
          if (item is Map) ArticleSummary.fromJson(asJsonMap(item)),
      ];
    } on Object {
      // A damaged list is forgotten rather than breaking the tab.
      return const [];
    }
  }

  bool isSaved(String id) => state.any((a) => a.id == id);

  /// Saves [article], or removes it when it's saved. Returns whether it is
  /// saved now.
  bool toggle(ArticleSummary article) {
    final saved = isSaved(article.id);
    final next = saved
        ? [
            for (final a in state)
              if (a.id != article.id) a,
          ]
        : [_summaryOf(article), ...state].take(limit).toList();
    state = next;
    ref
        .read(sharedPreferencesProvider)
        .setString(storageKey, jsonEncode([for (final a in next) a.toJson()]));
    return !saved;
  }

  /// Only the summary is kept, never an article's body.
  static ArticleSummary _summaryOf(ArticleSummary a) => ArticleSummary(
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    author: a.author,
    publishedAt: a.publishedAt,
    imageUrl: a.imageUrl,
    categories: a.categories,
    url: a.url,
    featured: a.featured,
  );
}

/// A decoded JSON object as the models read it.
Map<String, dynamic> asJsonMap(Map<dynamic, dynamic> value) =>
    value.map((k, v) => MapEntry('$k', v));
