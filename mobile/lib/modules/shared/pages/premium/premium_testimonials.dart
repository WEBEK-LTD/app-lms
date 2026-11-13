import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/providers.dart';
import '../../../../core/widgets/common.dart';
import 'premium_shared.dart';

/// 129.11 A course's or a product's approved reviews of 4 stars and up
/// with words, newest first, as quote cards; none on any failure (the
/// owner's quotes show instead).
final premiumReviewsProvider = FutureProvider.autoDispose
    .family<List<StudioEntry>, (String, int)>((ref, of) async {
      final api = ref.contentApi;
      try {
        final page = of.$1 == 'products'
            ? await api.listProductReviews(of.$2)
            : await api.listReviews(of.$2);
        return [
          for (final r in page.page.items)
            if (r.rating >= 4 && r.text.trim().isNotEmpty)
              StudioEntry(
                text: r.text.trim(),
                title: r.author.name,
                imageUrl: r.author.avatarUrl,
                value: r.rating.toDouble(),
              ),
        ].take(6).toList();
      } on Object {
        return const [];
      }
    });

/// 129.11 Quote cards: the stars drawn as icons, the quote, the person's
/// photo (else their initial), name and role; side by side to swipe, or
/// stacked under each other.
class PremiumTestimonials extends ConsumerWidget {
  const PremiumTestimonials({
    super.key,
    required this.node,
    required this.dark,
  });

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final premium = node.premium;
    final source = premium?.reviewsSource;
    final id = premium?.reviewsId;
    final real = source != null && id != null
        ? ref.watch(premiumReviewsProvider((source, id))).value ?? const []
        : const <StudioEntry>[];
    final entries = real.isNotEmpty ? real : node.entries;
    if (entries.isEmpty) return const SizedBox.shrink();
    final tones = PremiumTones.of(context, dark: dark);
    final radius = node.radius > 0 ? node.radius : 22.0;
    Widget card(StudioEntry e, {bool fill = false}) =>
        _QuoteCard(entry: e, tones: tones, radius: radius, fill: fill);
    if (premium?.stacked ?? false) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, e) in entries.indexed) ...[
            if (i > 0) SizedBox(height: node.gap > 0 ? node.gap : 12),
            card(e),
          ],
        ],
      );
    }
    return LayoutBuilder(
      builder: (context, box) {
        final width = box.maxWidth * 0.84;
        return SingleChildScrollView(
          key: ValueKey('premium-carousel-${node.id}'),
          scrollDirection: Axis.horizontal,
          clipBehavior: Clip.none,
          physics: const PageScrollPhysics(),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final (i, e) in entries.indexed) ...[
                  if (i > 0) SizedBox(width: node.gap > 0 ? node.gap : 12),
                  SizedBox(width: width, child: card(e, fill: true)),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _QuoteCard extends StatelessWidget {
  const _QuoteCard({
    required this.entry,
    required this.tones,
    required this.radius,
    this.fill = false,
  });

  final StudioEntry entry;
  final PremiumTones tones;
  final double radius;

  /// Side by side, as tall as the tallest: the person at the foot.
  final bool fill;

  @override
  Widget build(BuildContext context) {
    final stars = (entry.value ?? 5).round().clamp(0, 5);
    final name = entry.title ?? '';
    final photo = entry.imageUrl;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: tones.card,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: tones.edge),
        boxShadow: tones.shadow,
      ),
      child: Stack(
        children: [
          PositionedDirectional(
            top: -6,
            end: -4,
            child: Icon(
              Symbols.format_quote_rounded,
              size: 40,
              fill: 1,
              color: tones.brand.withValues(alpha: 0.16),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                label: context.l10n.studioPremiumStars(stars),
                child: ExcludeSemantics(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (var s = 0; s < 5; s++)
                        Icon(
                          Symbols.star_rounded,
                          size: 18,
                          fill: 1,
                          color: s < stars ? tones.gold : tones.track,
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                entry.text ?? '',
                style: TextStyle(
                  fontSize: 15,
                  height: 1.5,
                  fontWeight: FontWeight.w500,
                  color: tones.ink,
                ),
              ),
              const SizedBox(height: 14),
              if (fill) const Spacer(),
              Row(
                children: [
                  ClipOval(
                    child: SizedBox.square(
                      dimension: 42,
                      child: photo != null
                          ? AppNetworkImage(url: photo, seed: name.hashCode)
                          : ColoredBox(
                              color: tones.brand,
                              child: Center(
                                child: Text(
                                  name.trim().isEmpty
                                      ? '·'
                                      : name
                                            .trim()
                                            .characters
                                            .first
                                            .toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: tones.ink,
                          ),
                        ),
                        if ((entry.subtitle ?? '').isNotEmpty)
                          Text(
                            entry.subtitle!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 12, color: tones.muted),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
