import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/theme/palette.dart';

/// 129.18 A layout's premium card style around what it holds: soft shadows
/// outside, frosted glass blurring what is behind it (white by day, dark
/// by night, as strong as `tint`), a border in two colours and a glow
/// inside its edge.
class PremiumSurface extends StatelessWidget {
  const PremiumSurface({
    super.key,
    required this.surface,
    required this.radius,
    required this.dark,
    required this.child,
  });

  final StudioSurface surface;
  final BorderRadius radius;
  final bool dark;
  final Widget child;

  static const _soft = [
    <BoxShadow>[],
    [BoxShadow(color: Color(0x0F0E0D24), blurRadius: 12, offset: Offset(0, 4))],
    [
      BoxShadow(
        color: Color(0x1A0E0D24),
        blurRadius: 28,
        offset: Offset(0, 10),
      ),
    ],
    [
      BoxShadow(
        color: Color(0x240E0D24),
        blurRadius: 48,
        offset: Offset(0, 18),
      ),
    ],
  ];

  @override
  Widget build(BuildContext context) {
    final s = surface;
    var out = child;
    final from = parseHexColor(s.borderFrom);
    final to = parseHexColor(s.borderTo);
    final glow = parseHexColor(s.glow);
    if (from != null && to != null || glow != null) {
      out = CustomPaint(
        foregroundPainter: _Edge(
          radius: radius,
          from: from,
          to: to,
          width: s.borderWidth,
          glow: glow,
          textDirection: Directionality.of(context),
        ),
        child: out,
      );
    }
    if (s.glass case final blur?) {
      out = ClipRRect(
        key: const ValueKey('premium-glass'),
        borderRadius: radius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur / 2, sigmaY: blur / 2),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: dark
                  ? const Color(0xFF12101E)
                        .withValues(alpha: (s.tint + 0.25).clamp(0, 0.95))
                  : Colors.white.withValues(alpha: s.tint),
              borderRadius: radius,
            ),
            child: out,
          ),
        ),
      );
    }
    if (s.soft > 0 && !dark) {
      out = DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: radius,
          boxShadow: _soft[s.soft],
        ),
        child: out,
      );
    }
    return out;
  }
}

/// The border in two colours, and a glow just inside it.
class _Edge extends CustomPainter {
  _Edge({
    required this.radius,
    required this.from,
    required this.to,
    required this.width,
    required this.glow,
    required this.textDirection,
  });

  final BorderRadius radius;
  final Color? from;
  final Color? to;
  final double width;
  final Color? glow;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final outer = radius.toRRect(rect);
    if (glow case final g?) {
      canvas.save();
      canvas.clipRRect(outer);
      canvas.drawRRect(
        outer,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 14
          ..color = g.withValues(alpha: 0.32)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 11),
      );
      canvas.drawRRect(
        outer.deflate(0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = g.withValues(alpha: 0.35),
      );
      canvas.restore();
    }
    if (from != null && to != null) {
      canvas.drawRRect(
        outer.deflate(width / 2),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = width
          ..shader = LinearGradient(
            begin: AlignmentDirectional.topStart,
            end: AlignmentDirectional.bottomEnd,
            colors: [from!, to!],
          ).createShader(rect, textDirection: textDirection),
      );
    }
  }

  @override
  bool shouldRepaint(_Edge old) =>
      old.radius != radius ||
      old.from != from ||
      old.to != to ||
      old.width != width ||
      old.glow != glow ||
      old.textDirection != textDirection;
}
