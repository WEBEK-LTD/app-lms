import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/l10n/l10n.dart';
import 'premium_shared.dart';

/// 129.14 Progress, filling once when it first shows (full at once on
/// phones that reduce motion): bars with their label and share, or rings
/// with the share inside and the label under; each in its own colour, else
/// the brand's (bars in its two colours).
class PremiumProgress extends StatelessWidget {
  const PremiumProgress({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final tones = PremiumTones.of(context, dark: dark);
    final rings = node.premium?.rings ?? false;
    final gap = node.gap > 0 ? node.gap : 12.0;
    final l10n = context.l10n;
    return PremiumReveal(
      builder: (context, t) {
        Widget labelled(StudioEntry e, Widget child) {
          final value = (e.value ?? 0).clamp(0, 100).round();
          return Semantics(
            label: l10n.studioPremiumProgress(e.title ?? '', value),
            child: ExcludeSemantics(child: child),
          );
        }

        if (rings) {
          return Wrap(
            alignment: WrapAlignment.spaceAround,
            spacing: gap,
            runSpacing: gap,
            children: [
              for (final (i, e) in node.entries.indexed)
                labelled(
                  e,
                  SizedBox(
                    width: 84,
                    child: Column(
                      children: [
                        SizedBox.square(
                          dimension: 76,
                          child: CustomPaint(
                            key: ValueKey('premium-ring-${node.id}-$i'),
                            painter: _Ring(
                              share: (e.value ?? 0).clamp(0, 100) / 100 * t,
                              color: colorOr(e.color, tones.brand),
                              track: tones.track,
                              rtl:
                                  Directionality.of(context) ==
                                  TextDirection.rtl,
                            ),
                            child: Center(
                              child: Text(
                                '${((e.value ?? 0).clamp(0, 100) * t).round()}%',
                                textDirection: TextDirection.ltr,
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w900,
                                  color: tones.ink,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
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
                    ),
                  ),
                ),
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final (i, e) in node.entries.indexed) ...[
              if (i > 0) SizedBox(height: gap),
              labelled(
                e,
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            e.title ?? '',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: tones.ink,
                            ),
                          ),
                        ),
                        Text(
                          '${(e.value ?? 0).clamp(0, 100).round()}%',
                          textDirection: TextDirection.ltr,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: tones.muted,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(5),
                      child: SizedBox(
                        height: 10,
                        child: ColoredBox(
                          color: tones.track,
                          child: Align(
                            alignment: AlignmentDirectional.centerStart,
                            child: FractionallySizedBox(
                              key: ValueKey('premium-bar-${node.id}-$i'),
                              widthFactor:
                                  (e.value ?? 0).clamp(0, 100) / 100 * t,
                              heightFactor: 1,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(5),
                                  color: e.color == null
                                      ? null
                                      : colorOr(e.color, tones.brand),
                                  gradient: e.color == null
                                      ? LinearGradient(
                                          begin:
                                              AlignmentDirectional.centerStart,
                                          end: AlignmentDirectional.centerEnd,
                                          colors: [tones.brand, tones.accent],
                                        )
                                      : null,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

/// A ring from the top, clockwise (counter-clockwise right to left).
class _Ring extends CustomPainter {
  _Ring({
    required this.share,
    required this.color,
    required this.track,
    required this.rtl,
  });

  final double share;
  final Color color;
  final Color track;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 8.0;
    final rect = Offset.zero & size;
    final arc = rect.deflate(stroke / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(arc, 0, 2 * math.pi, false, paint..color = track);
    if (share <= 0) return;
    final sweep = 2 * math.pi * share.clamp(0, 1);
    canvas.drawArc(
      arc,
      -math.pi / 2,
      rtl ? -sweep : sweep,
      false,
      paint..color = color,
    );
  }

  @override
  bool shouldRepaint(_Ring old) =>
      old.share != share ||
      old.color != color ||
      old.track != track ||
      old.rtl != rtl;
}
