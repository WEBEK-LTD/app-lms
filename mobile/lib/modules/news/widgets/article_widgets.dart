import '../../../core/services/analytics_providers.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/news_providers.dart';
import '../../../core/services/share_links.dart';

/// "Ayla Demir · 13 Oct 2026", as the owner's settings allow.
String articleMeta(BuildContext context, ArticleSummary a, NewsConfig config) {
  return [
    if (config.showAuthor && a.author != null && a.author!.trim().isNotEmpty)
      a.author!.trim(),
    if (config.showDates && a.publishedAt != null) shortDate(a.publishedAt!),
  ].join(' · ');
}

/// A stable placeholder colour for an article without a picture.
int articleSeed(String id) => id.codeUnits.fold(0, (sum, c) => sum + c);

/// Shares an article: its title and its page on the website (or the app's
/// name when it has none). Replaced in tests.
final shareArticleProvider = Provider<Future<void> Function(String text)>(
  (ref) =>
      (text) async => SharePlus.instance.share(ShareParams(text: text)),
);

/// What sharing [article] sends: 46 the link that opens it in the app when
/// there is one, else its page on the website, else the app's name.
String shareText(ArticleSummary article, String appName, {String? link}) {
  final url = link ?? article.url;
  return url == null || url.isEmpty
      ? '${article.title}\n$appName'
      : '${article.title}\n$url';
}

/// A big card with the picture on top: top stories.
class ArticleCard extends ConsumerWidget {
  const ArticleCard({
    super.key,
    required this.article,
    this.width,
    this.titleLines = 2,
  });

  final ArticleSummary article;
  final double? width;
  final int titleLines;

  /// How tall a card of [width] is at most, for rows of cards.
  static double heightFor(BuildContext context, double width) =>
      width * 9 / 16 + 30 + MediaQuery.textScalerOf(context).scale(104);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final config = ref.watch(newsConfigProvider);
    final meta = articleMeta(context, article, config);
    final section = article.categories.isEmpty
        ? null
        : article.categories.first.name;
    return SizedBox(
      width: width,
      child: AppCard(
        radius: context.shapes.card,
        semanticLabel: [
          article.title,
          meta,
        ].where((s) => s.isNotEmpty).join(', '),
        onTap: () => context.push(Paths.article(article.id)),
        child: ExcludeSemantics(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              AspectRatio(
                aspectRatio: 16 / 9,
                child: AppNetworkImage(
                  url: article.imageUrl,
                  seed: articleSeed(article.id),
                  placeholderIcon: AppIcons.newspaper,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (section != null) ...[
                      Text(
                        section.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                          color: p.link,
                        ),
                      ),
                      const SizedBox(height: 4),
                    ],
                    Text(
                      article.title,
                      maxLines: titleLines,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 17,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    if (meta.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        meta,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A row in a list: the title and summary next to a small picture.
class ArticleTile extends ConsumerWidget {
  const ArticleTile({super.key, required this.article});

  final ArticleSummary article;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final config = ref.watch(newsConfigProvider);
    final meta = articleMeta(context, article, config);
    final section = article.categories.isEmpty
        ? null
        : article.categories.first.name;
    return AppCard(
      radius: context.shapes.card,
      semanticLabel: [
        article.title,
        meta,
      ].where((s) => s.isNotEmpty).join(', '),
      onTap: () => context.push(Paths.article(article.id)),
      padding: const EdgeInsets.all(12),
      child: ExcludeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (section != null)
                    Text(
                      section,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: p.link,
                      ),
                    ),
                  Text(
                    article.title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      height: 1.3,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  if (meta.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      meta,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: p.textSecondary),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 12),
            AppNetworkImage(
              url: article.imageUrl,
              seed: articleSeed(article.id),
              width: 92,
              height: 72,
              radius: 10,
              placeholderIcon: AppIcons.newspaper,
            ),
          ],
        ),
      ),
    );
  }
}

/// Saves the article on this device, or removes it.
class BookmarkButton extends ConsumerWidget {
  const BookmarkButton({
    super.key,
    required this.article,
    this.size = 44,
    this.onImage = false,
  });

  final ArticleSummary article;
  final double size;

  /// Drawn over a picture: a round button on the surface colour.
  final bool onImage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final saved = ref.watch(
      bookmarksProvider.select((list) => list.any((a) => a.id == article.id)),
    );
    return Semantics(
      toggled: saved,
      child: SquareIconButton(
        icon: AppIcons.bookmark,
        label: saved ? l10n.articleUnsave : l10n.articleSave,
        filled: saved,
        size: size,
        iconSize: 21,
        radius: onImage ? size / 2 : 12,
        bordered: !onImage,
        background: onImage ? p.surface : null,
        foreground: saved ? p.link : p.text,
        onPressed: () {
          final now = ref.read(bookmarksProvider.notifier).toggle(article);
          if (!now) return;
          ScaffoldMessenger.maybeOf(context)
            ?..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text(l10n.articleSavedMessage)));
        },
      ),
    );
  }
}

/// Shares the article.
class ShareButton extends ConsumerWidget {
  const ShareButton({
    super.key,
    required this.article,
    this.size = 44,
    this.onImage = false,
  });

  final ArticleSummary article;
  final double size;
  final bool onImage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return SquareIconButton(
      icon: AppIcons.share,
      label: context.l10n.articleShare,
      size: size,
      iconSize: 21,
      radius: onImage ? size / 2 : 12,
      bordered: !onImage,
      background: onImage ? p.surface : null,
      foreground: p.text,
      onPressed: () {
        ref
            .read(analyticsProvider)
            .item(
              'share',
              kind: 'article',
              id: article.id,
              title: article.title,
            );
        ref.read(shareArticleProvider)(
          shareText(
            article,
            ref.read(appConfigProvider).site.name,
            link: itemLink(ref, 'article', article.id),
          ),
        );
      },
    );
  }
}

/// The search box of the Latest tab.
class ArticleSearchField extends StatelessWidget {
  const ArticleSearchField({
    super.key,
    required this.controller,
    required this.onChanged,
    this.autofocus = false,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return TextField(
      controller: controller,
      autofocus: autofocus,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: context.l10n.newsSearchHint,
        prefixIcon: AppIcon(AppIcons.search, color: p.textSecondary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(context.shapes.button),
        ),
      ),
    );
  }
}
