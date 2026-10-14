import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/yallapp_api.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/news_providers.dart';
import '../widgets/article_widgets.dart';

/// The Latest tab: every article, newest first, by section and search.
class ArticlesScreen extends ConsumerStatefulWidget {
  const ArticlesScreen({
    super.key,
    this.initialCategory,
    this.focusSearch = false,
  });

  final String? initialCategory;
  final bool focusSearch;

  @override
  ConsumerState<ArticlesScreen> createState() => _ArticlesScreenState();
}

class _ArticlesScreenState extends ConsumerState<ArticlesScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  late ArticleQuery _query = ArticleQuery(category: widget.initialCategory);

  @override
  void didUpdateWidget(ArticlesScreen old) {
    super.didUpdateWidget(old);
    if (old.initialCategory != widget.initialCategory) {
      _query = ArticleQuery(
        search: _query.search,
        category: widget.initialCategory,
      );
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _searchChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(
        () => _query = ArticleQuery(
          search: text.trim(),
          category: _query.category,
        ),
      );
    });
  }

  void _category(String? id) => setState(
    () => _query = ArticleQuery(search: _query.search, category: id),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final categories = ref.watch(newsCategoriesProvider).value ?? const [];
    final state = ref.watch(articlesProvider(_query));
    final notifier = ref.read(articlesProvider(_query).notifier);
    final filtered = _query.search.isNotEmpty || _query.category != null;

    final Widget list;
    if (state.isInitialLoading) {
      list = SkeletonList(
        layout: SkeletonLayout.media,
        label: l10n.loadingArticles,
      );
    } else if (state.error != null && state.items.isEmpty) {
      list = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      list = MessageView(
        icon: filtered ? AppIcons.search : AppIcons.newspaper,
        title: filtered ? l10n.noArticlesFoundTitle : l10n.noArticlesTitle,
        message: filtered
            ? l10n.noArticlesFoundMessage
            : l10n.noArticlesMessage,
      );
    } else {
      list = RefreshIndicator(
        onRefresh: notifier.refresh,
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 300 && state.hasMore) {
              notifier.loadMore();
            }
            return false;
          },
          child: ListView.separated(
            key: const ValueKey('articles-list'),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            itemCount: state.items.length + (state.hasMore ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              if (i >= state.items.length) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              return ArticleTile(article: state.items[i]);
            },
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabLatest),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: ArticleSearchField(
                controller: _search,
                onChanged: _searchChanged,
                autofocus: widget.focusSearch,
              ),
            ),
            if (categories.isNotEmpty)
              SizedBox(
                height: chipRowHeight(context),
                child: ListView(
                  key: const ValueKey('news-sections'),
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    PillChip(
                      label: l10n.newsAll,
                      selected: _query.category == null,
                      onTap: () => _category(null),
                    ),
                    for (final c in categories) ...[
                      const SizedBox(width: 8),
                      PillChip(
                        label: c.name,
                        selected: _query.category == c.id,
                        onTap: () => _category(c.id),
                      ),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: 4),
            Expanded(child: list),
          ],
        ),
      ),
    );
  }
}
