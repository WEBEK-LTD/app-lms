import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/format/money.dart';
import '../../../../core/l10n/l10n.dart';
import '../page_actions.dart';
import 'premium_shared.dart';

/// 129.12 A plan's price as the shop's prices are written ("₺1,250"), the
/// cents only when there are some.
String premiumPrice(int cents, String currency) {
  final text = formatMoney(cents, currency);
  return cents % 100 == 0 ? text.replaceFirst('.00', '') : text;
}

/// 129.12 Plan cards: the name, the price with its period, the features
/// with a check each, a button, and the most popular plan in the brand's
/// gradient with its chip; a monthly / yearly switch over them. A plan
/// whose price isn't set shows none (never a made-up one).
class PremiumPricing extends ConsumerStatefulWidget {
  const PremiumPricing({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  ConsumerState<PremiumPricing> createState() => _PremiumPricingState();
}

class _PremiumPricingState extends ConsumerState<PremiumPricing> {
  bool _yearly = false;

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final premium = node.premium;
    final tones = PremiumTones.of(context, dark: widget.dark);
    final l10n = context.l10n;
    final switchable = premium?.yearly ?? false;
    final yearly = switchable && _yearly;
    final gap = node.gap > 0 ? node.gap : 12.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (switchable) ...[
          Center(
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: tones.track,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final (on, label) in [
                    (false, l10n.studioPremiumMonthly),
                    (true, l10n.studioPremiumYearly),
                  ])
                    Semantics(
                      button: true,
                      selected: yearly == on,
                      child: GestureDetector(
                        key: ValueKey(
                          'premium-period-${on ? 'year' : 'month'}',
                        ),
                        onTap: () => setState(() => _yearly = on),
                        child: AnimatedContainer(
                          duration: MediaQuery.disableAnimationsOf(context)
                              ? Duration.zero
                              : const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 7,
                          ),
                          decoration: BoxDecoration(
                            color: yearly == on ? tones.card : null,
                            borderRadius: BorderRadius.circular(999),
                            boxShadow: yearly == on ? tones.shadow : null,
                          ),
                          child: Text(
                            label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: yearly == on ? tones.ink : tones.muted,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          SizedBox(height: gap),
        ],
        for (final (i, plan) in node.entries.indexed) ...[
          if (i > 0) SizedBox(height: gap),
          _Plan(
            plan: plan,
            yearly: yearly,
            currency: premium?.currency ?? 'TRY',
            radius: node.radius > 0 ? node.radius : 22,
            tones: tones,
          ),
        ],
      ],
    );
  }
}

class _Plan extends ConsumerWidget {
  const _Plan({
    required this.plan,
    required this.yearly,
    required this.currency,
    required this.radius,
    required this.tones,
  });

  final StudioEntry plan;
  final bool yearly;
  final String currency;
  final double radius;
  final PremiumTones tones;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final hot = plan.highlight;
    final ink = hot ? Colors.white : tones.ink;
    final cents = yearly ? plan.priceYearly : plan.price;
    final features = (plan.text ?? '')
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty);
    final label = plan.label ?? '';
    final action = plan.action;
    return Container(
      key: hot ? const ValueKey('premium-plan-popular') : null,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: hot
            ? LinearGradient(
                begin: AlignmentDirectional.topStart,
                end: AlignmentDirectional.bottomEnd,
                colors: [tones.brand, tones.accent],
              )
            : null,
        color: hot ? null : tones.card,
        borderRadius: BorderRadius.circular(radius),
        border: hot ? null : Border.all(color: tones.edge),
        boxShadow: hot
            ? [
                BoxShadow(
                  color: tones.brand.withValues(alpha: 0.32),
                  blurRadius: 36,
                  offset: const Offset(0, 16),
                ),
              ]
            : tones.shadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  plan.title ?? '',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: ink,
                  ),
                ),
              ),
              if (hot)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.22),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    l10n.studioPremiumPopular,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
          if (cents != null) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(
                      premiumPrice(cents, currency),
                      textDirection: TextDirection.ltr,
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                        color: ink,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                    yearly
                        ? l10n.studioPremiumPerYear
                        : l10n.studioPremiumPerMonth,
                    style: TextStyle(
                      fontSize: 13,
                      color: ink.withValues(alpha: 0.75),
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          for (final f in features)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Symbols.check_circle_rounded,
                    size: 18,
                    fill: 1,
                    color: hot ? Colors.white : tones.brand,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(f, style: TextStyle(fontSize: 14, color: ink)),
                  ),
                ],
              ),
            ),
          if (label.isNotEmpty) ...[
            const SizedBox(height: 4),
            SizedBox(
              height: 44,
              child: FilledButton(
                onPressed: action != null && canOpenAction(ref, action)
                    ? () => runPageAction(context, ref, action)
                    : null,
                style: FilledButton.styleFrom(
                  backgroundColor: hot ? Colors.white : tones.brand,
                  foregroundColor: hot ? tones.brand : Colors.white,
                  disabledBackgroundColor: hot ? Colors.white : tones.brand,
                  disabledForegroundColor: hot ? tones.brand : Colors.white,
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
