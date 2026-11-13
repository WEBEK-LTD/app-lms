import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/app_theme.dart' show codeFontFamily;
import '../../../../core/theme/symbol_names.dart';
import 'premium_shared.dart';

/// 129.15 Steps: a dot for each on a line, its date, title and text; the
/// steps up to the active one filled in the brand's colour, the active one
/// ringed; down the page (its dates in a column at the start with `times`,
/// the active step a card with its chip and its bar with `card`), across it,
/// or as a trip's legs with a bar over each (`bars`). Dates in a monospaced
/// font with `mono`.
class PremiumTimeline extends StatelessWidget {
  const PremiumTimeline({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final tones = PremiumTones.of(context, dark: dark);
    final o = node.premium ?? const StudioPremium();
    final entries = node.entries;
    final active = entries.indexWhere((e) => e.highlight);
    bool done(int i) => active >= 0 && i <= active;
    final l10n = context.l10n;
    final mono = o.mono ? codeFontFamily : null;

    String said(int i) => i == active
        ? '${l10n.studioPremiumStep(i + 1, entries.length)}, ${l10n.studioPremiumCurrentStep}'
        : l10n.studioPremiumStep(i + 1, entries.length);

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

    TextStyle date(int i, {double size = 12}) => TextStyle(
      fontSize: size,
      fontWeight: FontWeight.w600,
      fontFamily: mono,
      color: i == active ? tones.brand : tones.muted,
    );

    Widget words(int i, StudioEntry e, {bool across = false}) {
      final card = o.activeCard && i == active && !across;
      final chip = e.label ?? '';
      return Semantics(
        label: said(i),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!o.times && (e.subtitle ?? '').isNotEmpty)
              Text(e.subtitle!, style: date(i, size: across ? 11 : 12)),
            if (card && chip.isNotEmpty) ...[
              const SizedBox(height: 2),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: tones.brand.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    chip,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                      color: tones.brand,
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 2),
            Text(
              e.title ?? '',
              style: TextStyle(
                fontSize: card ? 18 : (across ? 14 : 15),
                fontWeight: FontWeight.w800,
                color: tones.ink,
              ),
            ),
            if (card && e.value != null) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  key: ValueKey('premium-step-bar-${node.id}'),
                  value: (e.value!.clamp(0, 100)) / 100,
                  minHeight: 5,
                  color: tones.brand,
                  backgroundColor: tones.track,
                ),
              ),
              const SizedBox(height: 4),
            ],
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
    }

    if (o.bars) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (i, e) in entries.indexed) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(
              child: Semantics(
                label: said(i),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      key: ValueKey('premium-leg-${node.id}-$i'),
                      height: 4,
                      decoration: BoxDecoration(
                        color: done(i)
                            ? tones.brand.withValues(
                                alpha: i == active ? 1 : 0.55,
                              )
                            : tones.track,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (e.icon != null) ...[
                          Icon(
                            symbolByName(e.icon),
                            size: 16,
                            color: done(i) ? tones.brand : tones.muted,
                          ),
                          const SizedBox(width: 5),
                        ],
                        Expanded(
                          child: Text(
                            e.title ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: tones.ink,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if ((e.subtitle ?? '').isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        e.subtitle!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontFamily: mono,
                          color: tones.muted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      );
    }

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
                if (o.times)
                  SizedBox(
                    width: 52,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(e.subtitle ?? '', style: date(i, size: 13)),
                    ),
                  ),
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
                const SizedBox(width: 12),
                Expanded(
                  child: o.activeCard && i == active
                      ? Container(
                          key: ValueKey('premium-step-card-${node.id}'),
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: tones.card,
                            borderRadius: BorderRadius.circular(
                              node.radius > 0 ? node.radius : 20,
                            ),
                            border: Border.all(color: tones.edge),
                            boxShadow: tones.shadow,
                          ),
                          child: words(i, e),
                        )
                      : Padding(
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
