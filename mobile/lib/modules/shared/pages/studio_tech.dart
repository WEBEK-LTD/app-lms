import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/bidi.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../store/screens/pc_builder_screen.dart' show PcBuilderCard;
import '../../store/widgets/tech_widgets.dart';
import '../../store/widgets/trade_in.dart';

/// 211 The electronics, mobiles and computers shops' Studio elements
/// (`StudioTech`): a product's specs, two or three products compared, the
/// shop by a spec's values, trade-in and Build your PC. Each shows nothing
/// until it has something (its products served, the shop's trade-in or
/// Build your PC set up); an app before them skips them.

/// Whether a tech element has something to show.
bool studioTechShows(StudioNode node, WidgetRef ref) {
  final served = node.techServed;
  final store = ref.watch(appConfigProvider).store;
  return switch (node.type) {
    StudioNodeType.specTable =>
      served != null &&
          served.products.isNotEmpty &&
          served.products.first.specs.isNotEmpty,
    StudioNodeType.compare => served != null && served.products.length >= 2,
    StudioNodeType.specFilter =>
      served?.spec != null && served!.spec!.values.isNotEmpty,
    StudioNodeType.tradeIn => store?.tradeIn != null,
    StudioNodeType.pcBuilder => store?.pcBuilder != null,
    _ => false,
  };
}

/// A heading over a tech element (its own words), when it has some.
Widget? _heading(String? title, Color ink) {
  final t = title?.trim() ?? '';
  if (t.isEmpty) return null;
  return Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Semantics(
      header: true,
      child: Text(
        t,
        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ink),
      ),
    ),
  );
}

class StudioTechView extends ConsumerWidget {
  const StudioTechView({
    super.key,
    required this.node,
    required this.title,
    this.color,
  });

  final StudioNode node;
  final String? title;
  final Color? color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final ink = color ?? p.text;
    final accent = parseHexColor(node.tech.accent);
    final served = node.techServed;
    final store = ref.watch(appConfigProvider).store;
    switch (node.type) {
      case StudioNodeType.specTable:
        final product = served?.products.firstOrNull;
        if (product == null) return const SizedBox.shrink();
        return Column(
          key: const ValueKey('studio-spec-table'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ?_heading(title ?? context.l10n.specsTitle, ink),
            SpecsTable(
              specs: product.specs,
              rows: node.tech.rows,
              color: color,
            ),
          ],
        );
      case StudioNodeType.compare:
        final products = served?.products.take(3).toList() ?? const [];
        if (products.length < 2) return const SizedBox.shrink();
        return Column(
          key: const ValueKey('studio-compare'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ?_heading(title, ink),
            CompareTable(
              products: products,
              accent: accent,
              color: color,
              onOpen: (id) => context.push(Paths.product(id)),
            ),
          ],
        );
      case StudioNodeType.specFilter:
        final spec = served?.spec;
        if (spec == null || spec.values.isEmpty) {
          return const SizedBox.shrink();
        }
        final tint = accent ?? p.primary;
        return Column(
          key: const ValueKey('studio-spec-filter'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ?_heading((title ?? '').trim().isEmpty ? spec.label : title, ink),
            // 211 One row that slides, at most `rows` values (8 by default).
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final v in spec.values.take(node.tech.rows ?? 8))
                    ActionChip(
                      key: ValueKey('spec-filter-${v.value}'),
                      onPressed: () =>
                          context.push(Paths.specProducts(spec.key, v.value)),
                      shape: const StadiumBorder(),
                      side: BorderSide(color: p.border),
                      backgroundColor: p.surface,
                      // 227 The value in its own direction and the count in
                      // a badge of its own, so in Arabic "16 GB DDR5" reads
                      // whole, then its count ("GB DDR5 3 16" before).
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            isolate(v.value),
                            key: ValueKey('spec-filter-value-${v.value}'),
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                          if (v.count > 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              key: ValueKey('spec-filter-count-${v.value}'),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 1,
                              ),
                              decoration: BoxDecoration(
                                color: tint.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${v.count}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: tint,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                ].expand((w) => [w, const SizedBox(width: 8)]).toList(),
              ),
            ),
          ],
        );
      case StudioNodeType.tradeIn:
        final rules = store?.tradeIn;
        if (rules == null) return const SizedBox.shrink();
        return node.tech.look == StudioTradeInLook.full
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ?_heading(title, ink),
                  TradeInEstimator(rules: rules, accent: accent),
                ],
              )
            : TradeInCard(rules: rules, accent: accent, title: title);
      case StudioNodeType.pcBuilder:
        final rules = store?.pcBuilder;
        if (rules == null) return const SizedBox.shrink();
        return PcBuilderCard(rules: rules, title: title, accent: accent);
      default:
        return const SizedBox.shrink();
    }
  }
}
