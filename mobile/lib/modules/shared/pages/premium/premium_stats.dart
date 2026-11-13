import 'package:flutter/material.dart';
import 'package:intl/intl.dart' show NumberFormat;

import '../../../../core/api/models/models.dart';
import '../../../../core/theme/symbol_names.dart';
import 'premium_shared.dart';

/// 129.13 A number as a stat shows it: grouped, with at most one decimal.
String premiumNumber(double value) {
  final format = NumberFormat.decimalPattern('en_US')
    ..maximumFractionDigits = 1;
  return format.format(value);
}

/// 129.13 Big numbers with their labels, counting up once when they first
/// show (their final values at once on phones that reduce motion): an icon
/// over each when it has one, thin lines between them, or each in a card.
class PremiumStats extends StatelessWidget {
  const PremiumStats({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final tones = PremiumTones.of(context, dark: dark);
    final cards = node.premium?.cards ?? false;
    final dividers = node.premium?.dividers ?? false;
    final entries = node.entries;
    return PremiumReveal(
      builder: (context, t) => IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final (i, e) in entries.indexed) ...[
              if (i > 0 && cards) SizedBox(width: node.gap > 0 ? node.gap : 10),
              if (i > 0 && !cards && dividers)
                VerticalDivider(width: 1, thickness: 1, color: tones.edge),
              Expanded(child: _stat(e, tones, t, cards)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _stat(StudioEntry e, PremiumTones tones, double t, bool cards) {
    final tone = colorOr(e.color, e.highlight ? tones.accent : tones.brand);
    final value = e.value ?? 0;
    final shown = premiumNumber(
      value == value.roundToDouble()
          ? (value * t).roundToDouble()
          : (value * t * 10).round() / 10,
    );
    final full = '${e.prefix ?? ''}${premiumNumber(value)}${e.suffix ?? ''}';
    final body = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (e.icon != null) ...[
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: tone.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(symbolByName(e.icon), size: 20, fill: 1, color: tone),
          ),
          const SizedBox(height: 8),
        ],
        Semantics(
          label: full,
          child: ExcludeSemantics(
            child: Text(
              '${e.prefix ?? ''}$shown${e.suffix ?? ''}',
              key: ValueKey(
                'premium-stat-${node.id}-${node.entries.indexOf(e)}',
              ),
              textDirection: TextDirection.ltr,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
                color: e.highlight ? tone : tones.ink,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
              maxLines: 1,
              softWrap: false,
              textAlign: TextAlign.center,
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          e.title ?? '',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: tones.muted,
          ),
        ),
      ],
    );
    if (!cards) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: body,
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
      decoration: BoxDecoration(
        color: tones.card,
        borderRadius: BorderRadius.circular(node.radius > 0 ? node.radius : 18),
        border: Border.all(color: tones.edge),
        boxShadow: tones.shadow,
      ),
      child: body,
    );
  }
}
