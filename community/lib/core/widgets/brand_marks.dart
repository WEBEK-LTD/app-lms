import 'package:flutter/widgets.dart';

import 'svg_path.dart';

/// Apple's mark (the path the approved design draws, 24 × 24, black).
class AppleMark extends StatelessWidget {
  const AppleMark({
    super.key,
    this.size = 20,
    this.color = const Color(0xFF000000),
  });

  final double size;
  final Color color;

  static final _path = svgPath(
    'M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z',
  );

  @override
  Widget build(BuildContext context) => SizedBox(
    width: size,
    height: size,
    child: CustomPaint(painter: _MarkPainter([(_path, color)], 24)),
  );
}

/// Google's "G" in its four colours (48 × 48).
class GoogleMark extends StatelessWidget {
  const GoogleMark({super.key, this.size = 20});

  final double size;

  static final _paths = [
    (
      svgPath(
        'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z',
      ),
      const Color(0xFFEA4335),
    ),
    (
      svgPath(
        'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z',
      ),
      const Color(0xFF4285F4),
    ),
    (
      svgPath(
        'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z',
      ),
      const Color(0xFFFBBC05),
    ),
    (
      svgPath(
        'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z',
      ),
      const Color(0xFF34A853),
    ),
  ];

  @override
  Widget build(BuildContext context) => SizedBox(
    width: size,
    height: size,
    child: CustomPaint(painter: _MarkPainter(_paths, 48)),
  );
}

/// Yallapp's mark (brand/icon/yallapp-icon-dark-rounded.svg): the cream
/// "y" and the Ember dot on Midnight, its corners at 22.5%.
class YallappMark extends StatelessWidget {
  const YallappMark({super.key, this.size = 22});

  final double size;

  static final _y = svgPath(
    'M224.0 153.0Q190.0 153.0 153.5 146.5Q117.0 140.0 83.0 125.5Q49.0 111.0 22.0 89.0L63.0 -30.0Q95.0 6.0 137.5 20.5Q180.0 35.0 219.0 35.0Q276.0 35.0 311.0 11.0Q346.0 -13.0 362.5 -56.0Q379.0 -99.0 379.0 -156.0L384.0 -262.0H375.0Q370.0 -187.0 347.0 -140.5Q324.0 -94.0 287.5 -73.0Q251.0 -52.0 204.0 -52.0Q146.0 -52.0 108.5 -81.5Q71.0 -111.0 53.0 -168.0Q35.0 -225.0 35.0 -306.0V-522.0H161.0V-336.0Q161.0 -247.0 182.5 -205.0Q204.0 -163.0 252.0 -163.0Q278.0 -163.0 298.5 -176.0Q319.0 -189.0 333.5 -214.5Q348.0 -240.0 355.5 -279.0Q363.0 -318.0 363.0 -369.0V-522.0H489.0V-152.0Q489.0 -109.0 481.0 -65.0Q473.0 -21.0 454.5 18.0Q436.0 57.0 406.0 87.5Q376.0 118.0 331.0 135.5Q286.0 153.0 224.0 153.0Z',
  );
  static final _dot = svgPath(
    'M576.0 12.0Q535.0 12.0 514.5 -6.0Q494.0 -24.0 494.0 -61.0Q494.0 -98.0 514.5 -116.0Q535.0 -134.0 576.0 -134.0Q617.0 -134.0 638.0 -116.0Q659.0 -98.0 659.0 -61.0Q659.0 12.0 576.0 12.0Z',
  );

  @override
  Widget build(BuildContext context) => SizedBox(
    width: size,
    height: size,
    child: CustomPaint(painter: _YallappPainter()),
  );
}

class _YallappPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 1024);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(0, 0, 1024, 1024),
        const Radius.circular(230.4),
      ),
      Paint()..color = const Color(0xFF0E0D24),
    );
    canvas.translate(191.738, 685.534);
    canvas.scale(0.940563);
    canvas.drawPath(YallappMark._y, Paint()..color = const Color(0xFFF4EFE6));
    canvas.drawPath(YallappMark._dot, Paint()..color = const Color(0xFFFF5A1F));
  }

  @override
  bool shouldRepaint(_YallappPainter old) => false;
}

class _MarkPainter extends CustomPainter {
  _MarkPainter(this.paths, this.box);

  final List<(Path, Color)> paths;
  final double box;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / box);
    for (final (path, color) in paths) {
      canvas.drawPath(path, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(_MarkPainter old) => false;
}
