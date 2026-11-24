import 'package:flutter/widgets.dart';

/// The Community logo (design/logo.svg on wip-community-design), drawn: an
/// orange tile, a cream speech bubble, and in it three joined dots, the
/// last one orange. Distinct from the Yallapp icon.
class CommunityLogo extends StatelessWidget {
  const CommunityLogo({super.key, this.size = 34, this.radius});

  final double size;

  /// Its corners; missing, the logo's own (24 of 100).
  final double? radius;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: size,
    height: size,
    child: CustomPaint(painter: _LogoPainter(radius: radius)),
  );
}

class _LogoPainter extends CustomPainter {
  _LogoPainter({this.radius});

  final double? radius;

  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 100;
    canvas.save();
    canvas.scale(k);
    const rect = Rect.fromLTWH(0, 0, 100, 100);
    final r = radius == null ? 24.0 : radius! / k;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(r)),
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFF8A3D), Color(0xFFFF4A1A)],
        ).createShader(rect),
    );
    // The bubble (the SVG's path, absolute).
    final bubble = Path()
      ..moveTo(50, 20)
      ..cubicTo(32.3, 20, 18, 32.1, 18, 47.5)
      ..cubicTo(18, 55.8, 22.2, 63.2, 28.9, 68.2)
      ..lineTo(26, 80.5)
      ..lineTo(40.3, 74.3)
      ..cubicTo(43.4, 75.1, 46.6, 75.5, 50, 75.5)
      ..cubicTo(67.7, 75.5, 82, 63.4, 82, 48)
      ..cubicTo(82, 32.6, 67.7, 20, 50, 20)
      ..close();
    canvas.drawPath(bubble, Paint()..color = const Color(0xFFFFF8F0));
    final ink = Paint()
      ..color = const Color(0xFF0E0D24)
      ..strokeWidth = 4.2
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(37, 38), const Offset(50, 50), ink);
    canvas.drawLine(const Offset(63, 38), const Offset(50, 50), ink);
    canvas.drawLine(const Offset(50, 50), const Offset(50, 62), ink);
    canvas.drawCircle(
      const Offset(37, 38),
      5.6,
      Paint()..color = const Color(0xFF0E0D24),
    );
    canvas.drawCircle(
      const Offset(63, 38),
      5.6,
      Paint()..color = const Color(0xFF0E0D24),
    );
    canvas.drawCircle(
      const Offset(50, 62),
      5.6,
      Paint()..color = const Color(0xFFFF5A1F),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_LogoPainter old) => old.radius != radius;
}
