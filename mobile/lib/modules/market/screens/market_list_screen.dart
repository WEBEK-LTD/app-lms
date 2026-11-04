import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/market_api_models.dart' as api;
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/market_models.dart';
import '../data/market_place.dart';
import '../data/market_providers.dart';
import '../widgets/market_sections.dart' show MarketVendorRow;

typedef MarketListFilter = ({String? kind, String? category, bool offers});

/// 115 The vendors of a kind, a cuisine or a department, or with offers,
/// near the customer's place.
final marketListProvider = FutureProvider.autoDispose
    .family<List<MarketVendor>, MarketListFilter>((ref, filter) async {
      final config = ref.watch(marketConfigProvider);
      final place = ref.watch(marketPlaceProvider);
      final page = await ref.contentApi.listMarketVendors(
        api.MarketVendorQuery(
          perPage: 40,
          kind: api.VendorKind.values
              .where((k) => k.name == filter.kind)
              .firstOrNull,
          category: filter.category,
          offers: filter.offers,
          lat: place?.lat,
          lng: place?.lng,
        ),
      );
      return [for (final v in page.items) marketVendorFrom(v, config)];
    });

class MarketListScreen extends ConsumerWidget {
  const MarketListScreen({super.key, required this.filter, this.title});

  final MarketListFilter filter;
  final String? title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final list = ref.watch(marketListProvider(filter));
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(title ?? l10n.marketPlaces(list.value?.length ?? 0)),
      ),
      body: list.when(
        loading: () => const SkeletonList(),
        error: (e, _) => MessageView(
          icon: Symbols.error,
          title: title ?? '',
          message: '$e',
          actionLabel: l10n.marketBrowse,
          onAction: () => ref.invalidate(marketListProvider(filter)),
        ),
        data: (vendors) => vendors.isEmpty
            ? MessageView(
                icon: Symbols.storefront,
                title: l10n.marketListEmptyTitle,
                message: l10n.marketListEmptyMessage,
                actionLabel: l10n.marketBrowse,
                onAction: () => context.go(Paths.home),
              )
            : ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 12),
                itemCount: vendors.length,
                separatorBuilder: (_, _) => const SizedBox(height: 4),
                itemBuilder: (_, i) => MarketVendorRow(vendor: vendors[i]),
              ),
      ),
    );
  }
}
