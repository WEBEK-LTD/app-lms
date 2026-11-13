import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/symbol_names.dart';
import '../../../../core/widgets/common.dart';
import 'premium_shared.dart';

/// 129.14 Progress, filling once when it first shows (full at once on
/// phones that reduce motion): bars with their label and share; rings of
/// `progress.size` and `stroke`, with tick marks around them and a knob at
/// their end, holding the entry's photo (its `subtitle` a chip over the
/// photo's foot), its icon or the share, the label under; or rows of short
/// segments, as many filled as the share. Each in its own colour or
/// gradient, else the brand's (bars in its two colours).
class PremiumProgress extends StatelessWidget {
  const PremiumProgress({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final tones = PremiumTones.of(context, dark: dark);
    final o = node.premium ?? const StudioPremium();
    final gap = node.gap > 0 ? node.gap : 12.0;
    final l10n = context.l10n;
    List<Color> colours(StudioEntry e) {
      final g = e.gradient;
      if (g != null) {
        return [colorOr(g.from, tones.brand), colorOr(g.to, tones.accent)];
      }
      if (e.color != null) {
        final c = colorOr(e.color, tones.brand);
        return [c, c];
      }
      return [tones.brand, tones.accent];
    }

    return PremiumReveal(
      builder: (context, t) {
        Widget labelled(StudioEntry e, Widget child) {
          final value = (e.value ?? 0).clamp(0, 100).round();
          return Semantics(
            label: l10n.studioPremiumProgress(e.title ?? '', value),
            child: ExcludeSemantics(child: child),
          );
        }

        double share(StudioEntry e) => (e.value ?? 0).clamp(0, 100) / 100;
        if (o.rings) {
          return Wrap(
            alignment: WrapAlignment.spaceAround,
            spacing: gap,
            runSpacing: gap,
            children: [
              for (final (i, e) in node.entries.indexed)
                labelled(e, _ring(context, i, e, share(e) * t, tones, o)),
            ],
          );
        }
        if (o.segments) {
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
                      if ((e.title ?? '').isNotEmpty) ...[
                        Text(
                          e.title!,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: tones.ink,
                          ),
                        ),
                        const SizedBox(height: 6),
                      ],
                      Row(
                        key: ValueKey('premium-segments-${node.id}-$i'),
                        children: [
                          for (var k = 0; k < o.segmentCount; k++) ...[
                            if (k > 0) const SizedBox(width: 4),
                            Expanded(
                              child: _Fill(
                                share: (share(e) * t * o.segmentCount - k)
                                    .clamp(0, 1)
                                    .toDouble(),
                                height: o.stroke ?? 4,
                                track: tones.track,
                                colours: colours(e),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
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
                    _Fill(
                      key: ValueKey('premium-bar-${node.id}-$i'),
                      share: share(e) * t,
                      height: o.stroke ?? 10,
                      track: tones.track,
                      colours: colours(e),
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

  Widget _ring(
    BuildContext context,
    int i,
    StudioEntry e,
    double share,
    PremiumTones tones,
    StudioPremium o,
  ) {
    final size = o.ringSize;
    final stroke = o.stroke ?? 8;
    final gap = o.ticks > 0 ? 10.0 : 0.0;
    final inner = size / 2 - stroke - gap - 6;
    final colours = e.gradient != null
        ? [
            colorOr(e.gradient!.from, tones.brand),
            colorOr(e.gradient!.to, tones.accent),
          ]
        : [colorOr(e.color, tones.brand), colorOr(e.color, tones.brand)];
    final photo = e.imageUrl;
    final chip = e.subtitle ?? '';
    return SizedBox(
      width: math.max(84, size),
      child: Column(
        children: [
          SizedBox.square(
            dimension: size,
            child: Stack(
              alignment: Alignment.center,
              children: [
                if (photo != null)
                  ClipOval(
                    child: SizedBox.square(
                      dimension: inner * 2,
                      child: AppNetworkImage(url: photo, seed: i),
                    ),
                  ),
                Positioned.fill(
                  child: CustomPaint(
                    key: ValueKey('premium-ring-${node.id}-$i'),
                    painter: PremiumRingPainter(
                      share: share,
                      colours: colours,
                      track: tones.track,
                      stroke: stroke,
                      ticks: o.ticks,
                      tick: tones.muted.withValues(alpha: 0.5),
                      knob: o.knob ? tones.card : null,
                      rtl: Directionality.of(context) == TextDirection.rtl,
                    ),
                  ),
                ),
                if (photo == null)
                  e.icon != null
                      ? Icon(
                          symbolByName(e.icon),
                          size: math.max(16, size * 0.34),
                          color: colours.first,
                        )
                      : Text(
                          '${(share * 100).round()}%',
                          textDirection: TextDirection.ltr,
                          style: TextStyle(
                            fontSize: math.max(13, size * 0.22),
                            fontWeight: FontWeight.w900,
                            color: tones.ink,
                          ),
                        ),
                if (photo != null && chip.isNotEmpty)
                  Positioned(
                    bottom: stroke + gap + 10,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 6,
                          ),
                          color: const Color(0x9E0E0D24),
                          child: Text(
                            chip,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if ((e.title ?? '').isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              e.title!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: tones.muted,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// A bar filled from the start by [share], in one colour or two.
class _Fill extends StatelessWidget {
  const _Fill({
    super.key,
    required this.share,
    required this.height,
    required this.track,
    required this.colours,
  });

  final double share;
  final double height;
  final Color track;
  final List<Color> colours;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(height / 2),
    child: SizedBox(
      height: height,
      child: ColoredBox(
        color: track,
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: FractionallySizedBox(
            widthFactor: share.clamp(0, 1),
            heightFactor: 1,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(height / 2),
                gradient: LinearGradient(
                  begin: AlignmentDirectional.centerStart,
                  end: AlignmentDirectional.centerEnd,
                  colors: colours,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/// 129.14 A ring from the top, clockwise (counter-clockwise right to left):
/// its tick marks around it, its track, its fill in one colour or two and a
/// knob at its end.
class PremiumRingPainter extends CustomPainter {
  PremiumRingPainter({
    required this.share,
    required this.colours,
    required this.track,
    required this.stroke,
    this.ticks = 0,
    this.tick = const Color(0x66888888),
    this.knob,
    this.rtl = false,
  });

  final double share;
  final List<Color> colours;
  final Color track;
  final double stroke;
  final int ticks;
  final Color tick;

  /// The knob's colour inside its ring; null, none.
  final Color? knob;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final gap = ticks > 0 ? 10.0 : 0.0;
    final r = size.shortestSide / 2 - stroke / 2 - gap;
    final ticker = Paint()
      ..color = tick
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;
    for (var k = 0; k < ticks; k++) {
      final a = k / ticks * 2 * math.pi - math.pi / 2;
      final r1 = size.shortestSide / 2 - 2;
      final dir = Offset(math.cos(a), math.sin(a));
      canvas.drawLine(c + dir * r1, c + dir * (r1 - 4), ticker);
    }
    final rect = Rect.fromCircle(center: c, radius: r);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, 0, 2 * math.pi, false, paint..color = track);
    final s = share.clamp(0, 1).toDouble();
    if (s <= 0) return;
    final sweep = 2 * math.pi * s * (rtl ? -1 : 1);
    paint
      ..color = colours.first
      ..shader = SweepGradient(
        colors: [colours.first, colours.last],
        transform: const GradientRotation(-math.pi / 2),
      ).createShader(rect);
    canvas.drawArc(rect, -math.pi / 2, sweep, false, paint);
    final fill = knob;
    if (fill != null) {
      final a = -math.pi / 2 + sweep;
      final at = c + Offset(math.cos(a), math.sin(a)) * r;
      canvas.drawCircle(at, stroke * 0.9 + 2, Paint()..color = fill);
      canvas.drawCircle(
        at,
        stroke * 0.9 + 2,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..color = colours.last,
      );
    }
  }

  @override
  bool shouldRepaint(PremiumRingPainter old) =>
      old.share != share ||
      old.colours != colours ||
      old.track != track ||
      old.stroke != stroke ||
      old.ticks != ticks ||
      old.knob != knob ||
      old.rtl != rtl;
}
