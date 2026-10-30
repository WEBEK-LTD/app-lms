import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_view.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/lesson/content/html_content.dart';
import '../data/news_providers.dart';
import '../widgets/article_widgets.dart';

/// An article: its picture, section, title, author and date, and its body
/// rendered like a lesson (native HTML with embeds, or the article's page
/// in a web view), with Save and Share.
class ArticleScreen extends ConsumerWidget {
  const ArticleScreen({super.key, required this.articleId});

  final String articleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final article = ref.watch(articleProvider(articleId));
    Future<void> refresh() => ref.refresh(articleProvider(articleId).future);
    return Scaffold(
      body: switch (article) {
        AsyncData(:final value) => _ArticleBody(
          article: value,
          onRefresh: refresh,
        ),
        AsyncError(:final error) => SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsetsDirectional.fromSTEB(16, 8, 16, 0),
                child: AppBackButton(),
              ),
              Expanded(
                child: ErrorView(error: error, onRetry: refresh),
              ),
            ],
          ),
        ),
        _ => SkeletonDetail(label: context.l10n.loadingArticles),
      },
    );
  }
}

class _ArticleBody extends ConsumerWidget {
  const _ArticleBody({required this.article, required this.onRefresh});

  final Article article;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(newsConfigProvider);
    final top = MediaQuery.paddingOf(context).top;
    final author = config.showAuthor ? article.author?.trim() : null;
    final meta = [
      if (author != null && author.isNotEmpty) l10n.articleBy(author),
      if (config.showDates && article.publishedAt != null)
        shortDate(article.publishedAt!),
    ].join(' · ');
    final webview =
        article.renderMode == RenderMode.webview && article.webviewUrl != null;

    final header = Padding(
      padding: readablePadding(context, top: 18, bottom: webview ? 12 : 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (article.categories.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                for (final c in article.categories)
                  InkWell(
                    onTap: () =>
                        context.go(Paths.articlesFiltered(category: c.id)),
                    child: Text(
                      c.name.toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: p.link,
                      ),
                    ),
                  ),
              ],
            ),
          const SizedBox(height: 6),
          // 110 In the direction of the article's text.
          ContentTitle(
            title: article.title,
            html: article.html ?? article.excerpt ?? '',
            style: TextStyle(
              fontSize: 24,
              height: 1.25,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          if (meta.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(meta, style: TextStyle(fontSize: 13, color: p.textSecondary)),
          ],
        ],
      ),
    );

    final actions = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        BookmarkButton(article: article, onImage: article.imageUrl != null),
        const SizedBox(width: 8),
        ShareButton(article: article, onImage: article.imageUrl != null),
      ],
    );

    final Widget picture = article.imageUrl == null
        ? SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [const AppBackButton(), const Spacer(), actions],
              ),
            ),
          )
        : AspectRatio(
            aspectRatio: MediaQuery.sizeOf(context).width >= 600
                ? 21 / 9
                : 16 / 10,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(
                  url: article.imageUrl,
                  seed: articleSeed(article.id),
                  placeholderIcon: AppIcons.newspaper,
                ),
                const HeroScrim(),
                PositionedDirectional(
                  top: top + 8,
                  start: 16,
                  child: const AppBackButton(),
                ),
                PositionedDirectional(top: top + 8, end: 16, child: actions),
              ],
            ),
          );

    if (webview) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          picture,
          header,
          Expanded(
            child: ref.watch(webViewBuilderProvider)(
              WebViewRequest(
                url: Uri.parse(article.webviewUrl!),
                debugLabel: 'article',
              ),
            ),
          ),
        ],
      );
    }

    final html = article.html ?? '';
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        key: const ValueKey('article'),
        padding: EdgeInsets.zero,
        children: [
          picture,
          header,
          Padding(
            padding: readablePadding(context, top: 16, bottom: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (html.trim().isNotEmpty)
                  HtmlContent(
                    html: html,
                    embeds: article.embeds,
                    title: article.title,
                  )
                else if (article.excerpt != null)
                  Text(
                    article.excerpt!,
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.5,
                      color: p.textBody,
                    ),
                  ),
                if (article.url != null) ...[
                  const SizedBox(height: 24),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton.icon(
                      onPressed: () => openExternal(article.url!),
                      icon: AppIcon(
                        AppIcons.openInNew,
                        size: 18,
                        color: p.link,
                      ),
                      label: Text(l10n.articleOpenOnSite),
                      style: TextButton.styleFrom(foregroundColor: p.link),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
