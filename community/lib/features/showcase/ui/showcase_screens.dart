import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/images.dart';
import '../../../core/widgets/sym.dart';
import '../../qa/ui/content_direction.dart';
import '../data/showcase_api.dart';
import 'flat_kit.dart';

/// The gallery's filter: an app type (null: all) and the order.
final showcaseFilterProvider =
    NotifierProvider<_Filter, ({String? type, ShowcaseSort sort})>(_Filter.new);

class _Filter extends Notifier<({String? type, ShowcaseSort sort})> {
  @override
  ({String? type, ShowcaseSort sort}) build() =>
      (type: null, sort: ShowcaseSort.newest);

  void set({String? type, required ShowcaseSort sort}) =>
      state = (type: type, sort: sort);
}

final showcaseGalleryProvider =
    FutureProvider.autoDispose<List<ShowcaseSummary>>((ref) {
      final f = ref.watch(showcaseFilterProvider);
      return ref.watch(showcaseApiProvider).gallery(type: f.type, sort: f.sort);
    });

final showcaseItemProvider = FutureProvider.autoDispose
    .family<ShowcaseItem, String>(
      (ref, id) => ref.watch(showcaseApiProvider).item(id),
    );

/// 232.3 The gallery: apps members built, by type, newest or most liked.
class ShowcaseScreen extends ConsumerWidget {
  const ShowcaseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final f = ref.watch(showcaseFilterProvider);
    final types = <(String?, String)>[
      (null, l.showcaseAll),
      ('store', l.showcaseTypeStore),
      ('academy', l.showcaseTypeAcademy),
      ('booking', l.showcaseTypeBooking),
    ];
    return FlatPage(
      title: l.showcaseTitle,
      body: Column(
        children: [
          FlatChoices<String?>(
            values: [for (final t in types) t.$1],
            label: (v) => types.firstWhere((t) => t.$1 == v).$2,
            selected: f.type,
            onSelected: (v) => ref
                .read(showcaseFilterProvider.notifier)
                .set(type: v, sort: f.sort),
          ),
          const SizedBox(height: 8),
          FlatChoices<ShowcaseSort>(
            values: ShowcaseSort.values,
            label: (v) => v == ShowcaseSort.newest
                ? l.showcaseNewest
                : l.showcaseMostLiked,
            selected: f.sort,
            onSelected: (v) => ref
                .read(showcaseFilterProvider.notifier)
                .set(type: f.type, sort: v),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FlatAsyncList<ShowcaseSummary>(
              value: ref.watch(showcaseGalleryProvider),
              onRetry: () => ref.refresh(showcaseGalleryProvider.future),
              empty: l.showcaseEmpty,
              item: (s) => ShowcaseCard(item: s),
            ),
          ),
        ],
      ),
    );
  }
}

/// A showcase item in a list (the gallery, a pro's portfolio, an entry).
class ShowcaseCard extends StatelessWidget {
  const ShowcaseCard({super.key, required this.item});

  final ShowcaseSummary item;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    return FlatCard(
      padding: EdgeInsets.zero,
      semanticLabel: item.title,
      onTap: () => context.push(FeatureLinks.showcaseItem(item.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: ColoredBox(
              color: p.soft,
              child: item.coverUrl == null
                  ? Center(
                      child: Sym(
                        Symbols.apps_rounded,
                        size: 40,
                        color: p.muted,
                      ),
                    )
                  : Image(image: imageOf(item.coverUrl!), fit: BoxFit.cover),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FlatHeading(item.title),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      item.author.name,
                      style: TextStyle(fontSize: 12.5, color: p.muted),
                    ),
                    if (item.madeWithYallapp)
                      FlatTag(
                        l.showcaseMadeWith,
                        icon: Symbols.verified_rounded,
                        accent: true,
                      ),
                    FlatTag(
                      l.showcaseLikes(item.likeCount),
                      icon: Symbols.favorite_rounded,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One item: its pictures, description, store links and Like.
class ShowcaseItemScreen extends ConsumerStatefulWidget {
  const ShowcaseItemScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<ShowcaseItemScreen> createState() => _ShowcaseItemState();
}

class _ShowcaseItemState extends ConsumerState<ShowcaseItemScreen> {
  ShowcaseItem? _local;

  Future<void> _like(ShowcaseItem item) async {
    final on = !item.liked;
    setState(() => _local = item.liking(on));
    try {
      await ref.read(showcaseApiProvider).like(item.summary.id, on: on);
    } catch (e) {
      if (mounted) {
        setState(() => _local = item);
        showFailure(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final value = ref.watch(showcaseItemProvider(widget.id));
    final item = _local ?? value.value;
    return FlatPage(
      title: item?.summary.title ?? l.showcaseTitle,
      body: item == null
          ? (value.hasError
                ? Center(
                    child: TextButton(
                      onPressed: () =>
                          ref.invalidate(showcaseItemProvider(widget.id)),
                      child: Text(l.commonRetry),
                    ),
                  )
                : const Center(child: CircularProgressIndicator()))
          : ListView(
              padding: EdgeInsets.fromLTRB(
                16,
                4,
                16,
                120 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                if (item.pictures.isNotEmpty)
                  SizedBox(
                    height: 220,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: item.pictures.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (_, i) => ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image(
                          image: imageOf(item.pictures[i]),
                          fit: BoxFit.cover,
                          width: 300,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if (item.summary.madeWithYallapp)
                      FlatTag(
                        l.showcaseMadeWith,
                        icon: Symbols.verified_rounded,
                        accent: true,
                      ),
                    FlatTag(
                      item.summary.author.name,
                      icon: Symbols.person_rounded,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (item.description.isNotEmpty)
                  Text(
                    item.description,
                    textDirection: contentDirection(item.description),
                    style: TextStyle(fontSize: 15, height: 1.6, color: p.ink),
                  ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FlatButton(
                      label: item.liked
                          ? '${l.showcaseLiked} · ${item.summary.likeCount}'
                          : '${l.showcaseLike} · ${item.summary.likeCount}',
                      icon: Symbols.favorite_rounded,
                      outlined: item.liked,
                      onPressed: () => _like(item),
                    ),
                    for (final (url, label, icon) in [
                      (
                        item.appStoreUrl,
                        l.showcaseAppStore,
                        Symbols.phone_iphone_rounded,
                      ),
                      (
                        item.playStoreUrl,
                        l.showcasePlay,
                        Symbols.android_rounded,
                      ),
                      (
                        item.websiteUrl,
                        l.showcaseWebsite,
                        Symbols.language_rounded,
                      ),
                    ])
                      if (url != null)
                        FlatButton(
                          label: label,
                          icon: icon,
                          outlined: true,
                          onPressed: () => openLink(context, ref, url),
                        ),
                  ],
                ),
              ],
            ),
    );
  }
}
