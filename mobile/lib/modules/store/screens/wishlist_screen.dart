import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/l10n/l10n.dart';
import '../../shared/account/account_scaffold.dart';
import '../data/wishlist.dart';
import '../widgets/product_widgets.dart';
import '../widgets/quick_add.dart';

/// 212 The store's wishlist: the products the customer saved with a heart,
/// as the shop serves them now. A guest's are this phone's.
class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final products = ref.watch(wishlistProductsProvider);
    final synced = ref.watch(shopWishlistProvider.notifier).synced;
    final Widget body = products.when(
      loading: () =>
          SkeletonList(layout: SkeletonLayout.grid, label: l10n.wishlist),
      error: (e, _) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(wishlistProductsProvider),
      ),
      data: (items) => items.isEmpty
          ? MessageView(
              icon: AppIcons.favorite,
              title: l10n.wishlistEmptyTitle,
              message: l10n.wishlistEmptyMessage,
            )
          : LayoutBuilder(
              builder: (context, box) {
                const gap = 12.0;
                final columns = ((box.maxWidth - 40) / 220).ceil().clamp(2, 6);
                final rows = (items.length + columns - 1) ~/ columns;
                // Row by row, each row as tall as its fullest card (as the
                // shop's grid).
                return ListView.builder(
                  key: const ValueKey('wishlist-grid'),
                  padding: EdgeInsets.fromLTRB(20, 8, 20, endRoom(context, 20)),
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
                              child: row * columns + c < items.length
                                  ? ProductCard(
                                      product: items[row * columns + c],
                                      fill: true,
                                      quickAdd: quickAddShown(ref),
                                      onTap: () => context.push(
                                        Paths.product(
                                          items[row * columns + c].id,
                                        ),
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
    );
    return AccountScaffold(
      title: l10n.wishlist,
      scrollable: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!synced)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
              child: Text(
                l10n.wishlistOnPhone,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ),
          Expanded(child: body),
        ],
      ),
    );
  }
}
