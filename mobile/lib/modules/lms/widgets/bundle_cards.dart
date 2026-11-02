import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';

/// 113.1 A bundle's price, and what its courses cost on their own (struck
/// through, "Instead of ₺1,350").
class BundlePriceRow extends StatelessWidget {
  const BundlePriceRow({super.key, required this.bundle, this.size = 15});

  final Bundle bundle;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final compare = bundle.compareAt?.label ?? '';
    return Wrap(
      spacing: 8,
      runSpacing: 2,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        PriceLabel(bundle.price, size: size),
        if (compare.isNotEmpty)
          Text(
            compare,
            key: ValueKey('bundle-compare-${bundle.id}'),
            semanticsLabel: context.l10n.bundleInsteadOf(compare),
            style: TextStyle(
              fontSize: size - 2,
              color: p.textSecondary,
              decoration: TextDecoration.lineThrough,
            ),
          ),
      ],
    );
  }
}

/// 113.1 A bundle's card: its picture, title, how many courses and the
/// price against the courses' total; opens the bundle's page.
class BundleCard extends StatelessWidget {
  const BundleCard({super.key, required this.bundle, this.width});

  final Bundle bundle;

  /// In a row, a fixed width; in a list, the list's.
  final double? width;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final card = AppCard(
      key: ValueKey('bundle-${bundle.id}'),
      onTap: () => context.push(Paths.bundle(bundle.id)),
      semanticLabel: [
        bundle.title,
        l10n.bundleCourseCount(bundle.courseCount),
        bundle.price.label,
        if (bundle.compareAt != null)
          l10n.bundleInsteadOf(bundle.compareAt!.label),
      ].join(', '),
      padding: const EdgeInsets.all(10),
      child: ExcludeSemantics(
        child: Row(
          children: [
            AppNetworkImage(
              url: bundle.imageUrl,
              seed: bundle.id,
              width: 72,
              height: 72,
              radius: context.shapes.r(12),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bundle.title,
                    // In a row, one line so the cards keep one height.
                    maxLines: width == null ? 2 : 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      height: 1.35,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      AppIcon(
                        AppIcons.bundle,
                        size: 14,
                        color: p.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          l10n.bundleCourseCount(bundle.courseCount),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  BundlePriceRow(bundle: bundle, size: 14),
                ],
              ),
            ),
          ],
        ),
      ),
    );
    return width == null ? card : SizedBox(width: width, child: card);
  }
}

/// 113.1 The courses list's row of the academy's bundles; nothing when it
/// has none (or they can't be read).
class BundlesRow extends ConsumerWidget {
  const BundlesRow({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bundles = ref.watch(bundlesProvider).value ?? const <Bundle>[];
    if (bundles.isEmpty) return const SizedBox.shrink();
    final width = (MediaQuery.sizeOf(context).width - 40) * 0.82;
    return Column(
      key: const ValueKey('bundles-row'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: context.l10n.bundles, size: 17),
        const SizedBox(height: 10),
        SizedBox(
          height: MediaQuery.textScalerOf(context).scale(100),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: bundles.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) => BundleCard(
              bundle: bundles[i],
              width: bundles.length == 1
                  ? MediaQuery.sizeOf(context).width - 40
                  : width,
            ),
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}
