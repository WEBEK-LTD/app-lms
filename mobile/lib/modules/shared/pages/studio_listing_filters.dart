import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../store/widgets/shop_features.dart';

/// 212 The `listing_filters` element, reusable by every store look: the
/// shop's sizes (else its colours, else another choice) as chips, each
/// opening the shop filtered by it, and a Filters chip opening the shop.
/// Nothing when the shop has nothing to filter by (an older server, a
/// connected platform's lists); an app before it skips the element.
class StudioListingFilters extends ConsumerWidget {
  const StudioListingFilters({super.key, this.title, this.color});

  final String? title;
  final Color? color;

  static const _all = (category: null, search: null);

  /// Whether it shows: a store with something to filter by.
  static bool shows(WidgetRef ref) {
    if (ref.watch(appConfigProvider).store == null) return false;
    final filters = ref.watch(shopFiltersProvider(_all)).value;
    return filters != null && filters.choices.isNotEmpty;
  }

  Color? _swatch(String? hex) {
    if (hex == null || !RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(hex)) return null;
    return Color(int.parse('ff${hex.substring(1)}', radix: 16));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(shopFiltersProvider(_all)).value;
    final choice = filters?.choices.firstOrNull;
    if (choice == null) return const SizedBox.shrink();
    final p = context.palette;
    final ink = color ?? p.text;
    final heading = (title ?? '').trim();
    return Column(
      key: const ValueKey('studio-listing-filters'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            heading.isEmpty ? choice.name : heading,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: ink,
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              ActionChip(
                key: const ValueKey('listing-filters-open'),
                avatar: AppIcon(AppIcons.filters, size: 18, color: p.text),
                label: Text(context.l10n.filters),
                tooltip: context.l10n.filterOpen,
                onPressed: () =>
                    openLocation(context, '${Paths.shop}?sort=newest'),
              ),
              for (final v in choice.values.take(20)) ...[
                const SizedBox(width: 8),
                ActionChip(
                  key: ValueKey('listing-filter-${choice.param}-${v.value}'),
                  avatar: switch (_swatch(v.swatch)) {
                    final c? => DecoratedBox(
                      decoration: BoxDecoration(
                        color: c,
                        shape: BoxShape.circle,
                        border: Border.all(color: p.border),
                      ),
                      child: const SizedBox.square(dimension: 16),
                    ),
                    null => null,
                  },
                  label: Text(v.label),
                  onPressed: () => openLocation(
                    context,
                    Uri(
                      path: Paths.shop,
                      queryParameters: {
                        'sort': 'newest',
                        choice.param: v.value,
                      },
                    ).toString(),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
