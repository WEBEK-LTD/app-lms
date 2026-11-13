import 'dart:math' as math;
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
    // 129 A texture over it, in the text's colour.
    if (s.pattern case final pattern?) {
      out = CustomPaint(
        key: ValueKey('premium-pattern-${pattern.name}'),
        foregroundPainter: PremiumPatternPainter(
          pattern: pattern,
          color: (dark ? Colors.white : const Color(0xFF0E0D24)).withValues(
            alpha: s.patternStrength,
          ),
          radius: radius,
        ),
        child: out,
      );
    }
    // 129 A ticket: its notches cut out, a dashed line between them, its
    // soft shadow following its shape.
    if (s.ticketAt case final at?) {
      final rtl = Directionality.of(context) == TextDirection.rtl;
      final clipper = PremiumTicketClipper(
        radius: radius,
        at: at,
        down: s.ticketDown,
        notch: s.notch,
        rtl: rtl,
      );
      return PhysicalShape(
        key: const ValueKey('premium-ticket'),
        clipper: clipper,
        clipBehavior: Clip.antiAlias,
        color: Colors.transparent,
        elevation: s.soft > 0 && !dark ? s.soft * 3.0 : 0,
        shadowColor: const Color(0x590E0D24),
        child: CustomPaint(
          foregroundPainter: _Perforation(
            at: at,
            down: s.ticketDown,
            notch: s.notch,
            rtl: rtl,
            color: (dark ? Colors.white : const Color(0xFF0E0D24)).withValues(
              alpha: 0.22,
            ),
          ),
          child: out,
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

/// 129 A ticket's shape: its rounded box with a round notch cut from each
/// edge at [at] percent along it (down it when [down]).
class PremiumTicketClipper extends CustomClipper<Path> {
  const PremiumTicketClipper({
    required this.radius,
    required this.at,
    required this.down,
    required this.notch,
    required this.rtl,
  });

  final BorderRadius radius;
  final double at;
  final bool down;
  final double notch;
  final bool rtl;

  @override
  Path getClip(Size size) {
    final box = Path()..addRRect(radius.toRRect(Offset.zero & size));
    final holes = Path();
    if (down) {
      final x = size.width * (rtl ? 100 - at : at) / 100;
      holes
        ..addOval(Rect.fromCircle(center: Offset(x, 0), radius: notch))
        ..addOval(
          Rect.fromCircle(center: Offset(x, size.height), radius: notch),
        );
    } else {
      final y = size.height * at / 100;
      holes
        ..addOval(Rect.fromCircle(center: Offset(0, y), radius: notch))
        ..addOval(
          Rect.fromCircle(center: Offset(size.width, y), radius: notch),
        );
    }
    return Path.combine(PathOperation.difference, box, holes);
  }

  @override
  bool shouldReclip(PremiumTicketClipper old) =>
      old.radius != radius ||
      old.at != at ||
      old.down != down ||
      old.notch != notch ||
      old.rtl != rtl;
}

/// The dashed line between a ticket's notches.
class _Perforation extends CustomPainter {
  _Perforation({
    required this.at,
    required this.down,
    required this.notch,
    required this.rtl,
    required this.color,
  });

  final double at;
  final bool down;
  final double notch;
  final bool rtl;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5;
    final Offset from;
    final Offset to;
    if (down) {
      final x = size.width * (rtl ? 100 - at : at) / 100;
      from = Offset(x, notch + 4);
      to = Offset(x, size.height - notch - 4);
    } else {
      final y = size.height * at / 100;
      from = Offset(notch + 4, y);
      to = Offset(size.width - notch - 4, y);
    }
    final length = (to - from).distance;
    final step = (to - from) / length;
    for (var d = 0.0; d < length; d += 9) {
      canvas.drawLine(
        from + step * d,
        from + step * (d + 5).clamp(0, length),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_Perforation old) =>
      old.at != at ||
      old.down != down ||
      old.notch != notch ||
      old.rtl != rtl ||
      old.color != color;
}

/// 129 A texture: fine grain, a dot grid, a square grid or diagonal
/// stripes, clipped to the layout's corners.
class PremiumPatternPainter extends CustomPainter {
  PremiumPatternPainter({
    required this.pattern,
    required this.color,
    required this.radius,
  });

  final StudioPattern pattern;
  final Color color;
  final BorderRadius radius;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.clipRRect(radius.toRRect(Offset.zero & size));
    final paint = Paint()..color = color;
    switch (pattern) {
      case StudioPattern.dots:
        final dots = Paint()..color = color.withValues(alpha: color.a * 2);
        for (var y = 6.0; y < size.height; y += 12) {
          for (var x = 6.0; x < size.width; x += 12) {
            canvas.drawCircle(Offset(x, y), 1, dots);
          }
        }
      case StudioPattern.grid:
        paint.strokeWidth = 1;
        for (var x = 0.0; x < size.width; x += 24) {
          canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
        }
        for (var y = 0.0; y < size.height; y += 24) {
          canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
        }
      case StudioPattern.stripes:
        paint
          ..strokeWidth = 1.5
          ..color = color.withValues(alpha: (color.a * 1.5).clamp(0, 1));
        for (var d = -size.height; d < size.width; d += 9) {
          canvas.drawLine(
            Offset(d, size.height),
            Offset(d + size.height, 0),
            paint,
          );
        }
      case StudioPattern.grain:
        // A fixed scatter of specks, the same on every phone.
        final random = math.Random(7);
        final specks = (size.width * size.height / 40).clamp(0, 30000).toInt();
        final grain = Paint()
          ..color = color.withValues(alpha: (color.a * 1.4).clamp(0, 1));
        for (var k = 0; k < specks; k++) {
          canvas.drawRect(
            Rect.fromLTWH(
              random.nextDouble() * size.width,
              random.nextDouble() * size.height,
              1,
              1,
            ),
            grain,
          );
        }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(PremiumPatternPainter old) =>
      old.pattern != pattern || old.color != color || old.radius != radius;
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
