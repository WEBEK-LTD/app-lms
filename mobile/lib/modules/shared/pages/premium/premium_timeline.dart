import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/symbol_names.dart';
import 'premium_shared.dart';

/// 129.15 Steps: a dot for each on a line, its date, title and text; the
/// steps up to the active one filled in the brand's colour, the active one
/// ringed; down the page, or across it.
class PremiumTimeline extends StatelessWidget {
  const PremiumTimeline({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final tones = PremiumTones.of(context, dark: dark);
    final entries = node.entries;
    final active = entries.indexWhere((e) => e.highlight);
    bool done(int i) => active >= 0 && i <= active;
    final l10n = context.l10n;

    Widget dot(int i, String? icon) => Container(
      key: ValueKey('premium-step-${node.id}-$i'),
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        color: done(i) ? tones.brand : tones.card,
        shape: BoxShape.circle,
        border: done(i) ? null : Border.all(color: tones.track, width: 2),
        boxShadow: i == active
            ? [
                BoxShadow(
                  color: tones.brand.withValues(alpha: 0.18),
                  spreadRadius: 6,
                ),
              ]
            : null,
      ),
      child: done(i)
          ? Icon(
              i == active
                  ? (icon == null
                        ? Symbols.radio_button_checked_rounded
                        : symbolByName(icon))
                  : Symbols.check_rounded,
              size: 16,
              color: Colors.white,
            )
          : icon == null
          ? null
          : Icon(symbolByName(icon), size: 14, color: tones.muted),
    );

    Widget words(int i, StudioEntry e, {bool across = false}) => Semantics(
      label: i == active
          ? '${l10n.studioPremiumStep(i + 1, entries.length)}, ${l10n.studioPremiumCurrentStep}'
          : l10n.studioPremiumStep(i + 1, entries.length),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if ((e.subtitle ?? '').isNotEmpty)
            Text(
              e.subtitle!,
              style: TextStyle(
                fontSize: across ? 11 : 12,
                fontWeight: FontWeight.w600,
                color: i == active ? tones.brand : tones.muted,
              ),
            ),
          const SizedBox(height: 2),
          Text(
            e.title ?? '',
            style: TextStyle(
              fontSize: across ? 14 : 15,
              fontWeight: FontWeight.w800,
              color: tones.ink,
            ),
          ),
          if ((e.text ?? '').isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(
              e.text!,
              style: TextStyle(
                fontSize: across ? 12 : 13,
                height: 1.45,
                color: tones.muted,
              ),
            ),
          ],
        ],
      ),
    );

    if (node.premium?.horizontal ?? false) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (i, e) in entries.indexed)
                SizedBox(
                  width: 128,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          dot(i, e.icon),
                          if (i < entries.length - 1)
                            Expanded(
                              child: Container(
                                height: 2,
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                                color: done(i + 1) ? tones.brand : tones.track,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsetsDirectional.only(end: 10),
                        child: words(i, e, across: true),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, e) in entries.indexed)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Column(
                  children: [
                    dot(i, e.icon),
                    if (i < entries.length - 1)
                      Expanded(
                        child: Container(
                          width: 2,
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          constraints: const BoxConstraints(minHeight: 18),
                          color: done(i + 1) ? tones.brand : tones.track,
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 18, top: 2),
                    child: words(i, e),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
