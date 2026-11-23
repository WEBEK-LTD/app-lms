import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/store_providers.dart';
import '../widgets/product_widgets.dart';
import '../widgets/quick_add.dart';
import '../widgets/tech_widgets.dart';

/// 211 The products in the compare list (kept on the phone, at most
/// three), side by side spec by spec; each can be opened or taken out.
class CompareScreen extends ConsumerWidget {
  const CompareScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final ids = ref.watch(compareListProvider);
    final details = [for (final id in ids) ref.watch(productProvider(id))];
    final failed = details.whereType<AsyncError<ProductDetail>>().firstOrNull;
    final loading = details.any((d) => d is AsyncLoading);
    final products = [
      for (final d in details)
        if (d case AsyncData(:final value)) techProductOf(value),
    ];
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: const AppBarBackButton(),
        title: Text(context.l10n.compareTitle),
      ),
      body: ids.length < 2
          ? MessageView(
              icon: AppIcons.compare,
              title: context.l10n.compareTitle,
              message: context.l10n.compareEmpty,
              actionLabel: ids.isEmpty ? null : context.l10n.compareRemove,
              onAction: ids.isEmpty
                  ? null
                  : () => ref
                        .read(compareListProvider.notifier)
                        .remove(ids.first),
            )
          : failed != null
          ? ErrorView(
              error: failed.error,
              onRetry: () {
                for (final id in ids) {
                  ref.invalidate(productProvider(id));
                }
              },
            )
          : loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 32),
              children: [
                CompareTable(
                  products: products,
                  onOpen: (id) => context.push(Paths.product(id)),
                  onRemove: (id) =>
                      ref.read(compareListProvider.notifier).remove(id),
                ),
              ],
            ),
    );
  }
}

/// 211 The shop filtered by a spec's value (a `spec_filter` chip): a grid
/// of its products, titled by the value.
final specProductsProvider = FutureProvider.autoDispose
    .family<List<ProductSummary>, (String, String)>((ref, filter) async {
      final page = await ref
          .watch(yallappApiProvider)
          .listProducts(
            ProductQuery(perPage: 50, spec: filter.$1, specValue: filter.$2),
          );
      return page.items;
    });

class SpecProductsScreen extends ConsumerWidget {
  const SpecProductsScreen({
    super.key,
    required this.spec,
    required this.value,
  });

  final String spec;
  final String value;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final products = ref.watch(specProductsProvider((spec, value)));
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(leading: const AppBarBackButton(), title: Text(value)),
      body: switch (products) {
        AsyncData(:final value) when value.isEmpty => MessageView(
          icon: AppIcons.search,
          title: context.l10n.specFilterEmpty,
        ),
        AsyncData(:final value) => LayoutBuilder(
          builder: (context, box) {
            const gap = 12.0;
            final columns = ((box.maxWidth - 40) / 220).ceil().clamp(2, 6);
            final rows = (value.length + columns - 1) ~/ columns;
            return ListView.builder(
              key: const ValueKey('spec-products'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              itemCount: rows,
              itemBuilder: (context, row) => Padding(
                padding: EdgeInsets.only(top: row == 0 ? 0 : gap),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (var c = 0; c < columns; c++) ...[
                        if (c > 0) const SizedBox(width: gap),
                        Expanded(
                          child: row * columns + c < value.length
                              ? ProductCard(
                                  product: value[row * columns + c],
                                  fill: true,
                                  quickAdd: quickAddShown(ref),
                                  onTap: () => context.push(
                                    Paths.product(value[row * columns + c].id),
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(specProductsProvider((spec, value))),
        ),
        _ => const SkeletonList(),
      },
    );
  }
}
