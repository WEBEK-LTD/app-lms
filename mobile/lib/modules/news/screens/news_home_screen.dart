import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/news_providers.dart';
import '../widgets/article_widgets.dart';

/// The News & blog app's Home before the owner publishes pages: the top
/// stories as a carousel, the sections, the latest articles and a row per
/// section (`GET /news/home`).
class NewsHomeScreen extends ConsumerWidget {
  const NewsHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final home = ref.watch(newsHomeProvider);
    Future<void> refresh() => ref.refresh(newsHomeProvider.future);
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: refresh,
        edgeOffset: MediaQuery.paddingOf(context).top,
        child: switch (home) {
          // 110 Nothing scrolls under the status bar.
          AsyncData(:final value) => StatusBarBackdrop(
            color: context.palette.background,
            child: _Home(home: value),
          ),
          AsyncError(:final error) => ListView(
            children: [
              SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.8,
                child: ErrorView(error: error, onRetry: refresh),
              ),
            ],
          ),
          _ => SkeletonHome(label: context.l10n.loadingArticles),
        },
      ),
    );
  }
}

class _Home extends ConsumerWidget {
  const _Home({required this.home});

  final NewsHome home;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final site = ref.watch(appConfigProvider).site.name;
    final width = MediaQuery.sizeOf(context).width;
    final cardWidth = (width - 52).clamp(240.0, 420.0);
    return ListView(
      padding: EdgeInsets.only(
        top: MediaQuery.paddingOf(context).top,
        bottom: 24,
      ),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
          child: Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    site,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                ),
              ),
              SquareIconButton(
                icon: AppIcons.search,
                label: l10n.newsSearchHint,
                onPressed: () =>
                    context.go(Paths.articlesFiltered(focus: true)),
              ),
            ],
          ),
        ),
        if (home.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 48),
            child: MessageView(
              icon: AppIcons.newspaper,
              title: l10n.noArticlesTitle,
              message: l10n.noArticlesMessage,
              compact: true,
            ),
          ),
        if (home.featured.isNotEmpty) ...[
          const Padding(padding: EdgeInsets.only(top: 12)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SectionHeader(title: l10n.newsTopStories),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: ArticleCard.heightFor(context, cardWidth),
            child: ListView.separated(
              key: const ValueKey('news-top-stories'),
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: home.featured.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) => Align(
                alignment: AlignmentDirectional.topStart,
                child: ArticleCard(article: home.featured[i], width: cardWidth),
              ),
            ),
          ),
        ],
        if (home.rails.isNotEmpty) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: chipRowHeight(context),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: home.rails.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final c = home.rails[i].category;
                return PillChip(
                  label: c.name,
                  selected: false,
                  onTap: () =>
                      context.go(Paths.articlesFiltered(category: c.id)),
                );
              },
            ),
          ),
        ],
        if (home.latest.isNotEmpty) ...[
          Padding(
            // 110 The app's usual space between sections: the chips and the
            // "See all" button already have room around them.
            padding: EdgeInsets.fromLTRB(
              20,
              home.rails.isNotEmpty ? 8 : 20,
              20,
              10,
            ),
            child: SectionHeader(
              title: l10n.newsLatest,
              onSeeAll: () => context.go(Paths.articles),
            ),
          ),
          for (final a in home.latest.take(6))
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
              child: ArticleTile(article: a),
            ),
        ],
        for (final rail in home.rails)
          if (rail.articles.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
              child: SectionHeader(
                title: rail.category.name,
                onSeeAll: () => context.go(
                  Paths.articlesFiltered(category: rail.category.id),
                ),
              ),
            ),
            SizedBox(
              height: ArticleCard.heightFor(context, 220),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: rail.articles.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => Align(
                  alignment: AlignmentDirectional.topStart,
                  child: ArticleCard(article: rail.articles[i], width: 220),
                ),
              ),
            ),
          ],
      ],
    );
  }
}
