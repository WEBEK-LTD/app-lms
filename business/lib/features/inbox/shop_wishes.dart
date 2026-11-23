import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 212 Who waits for a product to be back in stock (each is told once it's
/// back), and what customers saved to their wishlists.
class ShopWishesScreen extends ConsumerStatefulWidget {
  const ShopWishesScreen({super.key});

  @override
  ConsumerState<ShopWishesScreen> createState() => _ShopWishesScreenState();
}

class _ShopWishesScreenState extends ConsumerState<ShopWishesScreen> {
  late Future<ShopWishes> _load = _fetch();

  Future<ShopWishes> _fetch() =>
      ref.read(apiProvider).shopWishes(ref.read(appIdProvider));

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    Widget row(ShopWish w, String count) => ListTile(
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: w.imageUrl == null
            ? Container(
                width: 44,
                height: 44,
                color: context.yb.muted,
                child: const Icon(AppIcons.image),
              )
            : Image.network(
                w.imageUrl!,
                width: 44,
                height: 44,
                fit: BoxFit.cover,
                excludeFromSemantics: true,
                errorBuilder: (_, _, _) =>
                    Container(width: 44, height: 44, color: context.yb.muted),
              ),
      ),
      title: Text(w.name.isEmpty ? l10n.productNoLongerSold : w.name),
      subtitle: w.variationId == null
          ? null
          : Text(l10n.variationNumber(w.variationId!)),
      trailing: Text(count, style: theme.textTheme.labelLarge),
    );
    return Scaffold(
      appBar: AppBar(title: Text(l10n.shopWishes)),
      body: FutureBuilder<ShopWishes>(
        future: _load,
        builder: (context, snap) {
          if (snap.hasError) {
            return ErrorState(
              error: snap.error!,
              onRetry: () => setState(() => _load = _fetch()),
            );
          }
          final data = snap.data;
          if (data == null) {
            return const Center(child: CircularProgressIndicator());
          }
          return RefreshIndicator(
            onRefresh: () async {
              final next = _fetch();
              setState(() => _load = next);
              await next;
            },
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                ListTile(
                  leading: const Icon(AppIcons.bell),
                  title: Text(
                    l10n.shopWaiting,
                    style: theme.textTheme.titleMedium,
                  ),
                  subtitle: Text(l10n.shopWaitingHint),
                ),
                if (data.waiting.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(l10n.shopWaitingNone),
                  )
                else
                  for (final w in data.waiting)
                    row(w, l10n.shopWaitingCount(w.count)),
                const Divider(height: 24),
                ListTile(
                  leading: const Icon(AppIcons.favorite),
                  title: Text(
                    l10n.shopSaved,
                    style: theme.textTheme.titleMedium,
                  ),
                ),
                if (data.saved.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(l10n.shopSavedNone),
                  )
                else
                  for (final w in data.saved)
                    row(w, l10n.shopSavedCount(w.count)),
              ],
            ),
          );
        },
      ),
    );
  }
}
