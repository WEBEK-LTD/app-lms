import 'json.dart';
import 'learning_models.dart';

/// `Config.news`: how articles show, for News & blog apps (roadmap 23).
class NewsConfig {
  const NewsConfig({
    this.showAuthor = true,
    this.showDates = true,
    this.breakingNewsPush = false,
  });

  factory NewsConfig.fromJson(Json json) => NewsConfig(
    showAuthor: boolOr(json, 'show_author', true),
    showDates: boolOr(json, 'show_dates', true),
    breakingNewsPush: boolOr(json, 'breaking_news_push', false),
  );

  final bool showAuthor;
  final bool showDates;

  /// Whether new articles are pushed: Settings offers the news switch.
  final bool breakingNewsPush;
}

/// A section of articles (`NewsCategory`). IDs are strings: a feed's
/// sections have no numbers of their own.
class NewsCategory {
  const NewsCategory({required this.id, required this.name, this.count = 0});

  factory NewsCategory.fromJson(Json json) => NewsCategory(
    id: '${json['id']}',
    name: reqString(json, 'name'),
    count: intOr(json, 'count', 0),
  );

  final String id;
  final String name;
  final int count;

  Json toJson() => {'id': id, 'name': name};
}

/// An article in a list (`ArticleSummary`). Saved articles keep this on the
/// device, so [toJson] writes the same shape.
class ArticleSummary {
  const ArticleSummary({
    required this.id,
    required this.title,
    this.excerpt,
    this.author,
    this.publishedAt,
    this.imageUrl,
    this.categories = const [],
    this.url,
    this.featured = false,
  });

  factory ArticleSummary.fromJson(Json json) => ArticleSummary(
    id: '${json['id']}',
    title: reqString(json, 'title'),
    excerpt: optString(json, 'excerpt'),
    author: optString(json, 'author'),
    publishedAt: optDate(json, 'published_at'),
    imageUrl: optString(json, 'image_url'),
    categories: listOf(json, 'categories', NewsCategory.fromJson),
    url: optString(json, 'url'),
    featured: boolOr(json, 'featured', false),
  );

  final String id;
  final String title;
  final String? excerpt;
  final String? author;
  final DateTime? publishedAt;
  final String? imageUrl;
  final List<NewsCategory> categories;

  /// The article on the website, for sharing.
  final String? url;
  final bool featured;

  Json toJson() => {
    'id': id,
    'title': title,
    'excerpt': excerpt,
    'author': author,
    'published_at': publishedAt?.toUtc().toIso8601String(),
    'image_url': imageUrl,
    'categories': [for (final c in categories) c.toJson()],
    'url': url,
    'featured': featured,
  };
}

/// An article with its body, processed like a lesson's (`Article`).
class Article extends ArticleSummary {
  const Article({
    required super.id,
    required super.title,
    super.excerpt,
    super.author,
    super.publishedAt,
    super.imageUrl,
    super.categories,
    super.url,
    super.featured,
    this.renderMode = RenderMode.native,
    this.html,
    this.webviewUrl,
    this.embeds = const [],
  });

  factory Article.fromJson(Json json) {
    final summary = ArticleSummary.fromJson(json);
    return Article(
      id: summary.id,
      title: summary.title,
      excerpt: summary.excerpt,
      author: summary.author,
      publishedAt: summary.publishedAt,
      imageUrl: summary.imageUrl,
      categories: summary.categories,
      url: summary.url,
      featured: summary.featured,
      renderMode: enumFrom(
        RenderMode.values,
        json['render_mode'],
        RenderMode.native,
      ),
      html: optString(json, 'html'),
      webviewUrl: optString(json, 'webview_url'),
      embeds: listOf(json, 'embeds', Embed.fromJson),
    );
  }

  final RenderMode renderMode;
  final String? html;
  final String? webviewUrl;
  final List<Embed> embeds;
}

/// `GET /news/home`.
class NewsHome {
  const NewsHome({
    this.featured = const [],
    this.latest = const [],
    this.rails = const [],
  });

  factory NewsHome.fromJson(Json json) => NewsHome(
    featured: listOf(json, 'featured', ArticleSummary.fromJson),
    latest: listOf(json, 'latest', ArticleSummary.fromJson),
    rails: listOf(json, 'rails', NewsRail.fromJson),
  );

  final List<ArticleSummary> featured;
  final List<ArticleSummary> latest;
  final List<NewsRail> rails;

  bool get isEmpty => featured.isEmpty && latest.isEmpty && rails.isEmpty;
}

/// A section's newest articles on the home screen.
class NewsRail {
  const NewsRail({required this.category, this.articles = const []});

  factory NewsRail.fromJson(Json json) => NewsRail(
    category: NewsCategory.fromJson(asJson(json['category'], 'category')),
    articles: listOf(json, 'articles', ArticleSummary.fromJson),
  );

  final NewsCategory category;
  final List<ArticleSummary> articles;
}
