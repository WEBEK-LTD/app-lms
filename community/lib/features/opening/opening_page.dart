import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/logo.dart';

/// Whether the opening's motion has played (the router waits for it, as
/// for the session, before the welcome screen or Home).
class OpeningDone extends Notifier<bool> {
  @override
  bool build() => false;

  void done() => state = true;
}

final openingDoneProvider = NotifierProvider<OpeningDone, bool>(
  OpeningDone.new,
);

/// The opening screen (design/opening.html): deep navy with a soft orange
/// glow. One orange dot (0.0s) becomes three joined members while the
/// bubble draws around them (0.6s), then settles into the logo with
/// "yallapp. COMMUNITY", its line, and a bar that fills while the app
/// loads (1.2s).
class OpeningPage extends ConsumerStatefulWidget {
  const OpeningPage({super.key, this.at});

  /// Draws one moment (0 to 1) and stays there: the screenshots' frames.
  final double? at;

  static const duration = Duration(milliseconds: 1200);

  @override
  ConsumerState<OpeningPage> createState() => _OpeningPageState();
}

class _OpeningPageState extends ConsumerState<OpeningPage>
    with SingleTickerProviderStateMixin {
  late final _motion = AnimationController(
    vsync: this,
    duration: OpeningPage.duration,
    value: widget.at ?? 0,
  );

  bool _started = false;

  void _done() {
    if (mounted) ref.read(openingDoneProvider.notifier).done();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started || widget.at != null) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      // Reduced motion: the final frame, still, for the same time.
      _motion.value = 1;
      Future<void>.delayed(OpeningPage.duration, _done);
    } else {
      _motion.forward().whenComplete(_done);
    }
  }

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _motion,
    // A route of its own, outside any Scaffold: its Material gives the
    // words the app's type.
    builder: (context, _) => Material(
      type: MaterialType.transparency,
      child: _Frame(t: _motion.value),
    ),
  );
}

double _span(double t, double from, double to) =>
    ((t - from) / (to - from)).clamp(0.0, 1.0);

class _Frame extends StatelessWidget {
  const _Frame({required this.t});

  final double t;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final settle = Curves.easeOutCubic.transform(_span(t, .72, .95));
    final words = Curves.easeOutCubic.transform(_span(t, .82, 1));
    final bar = _span(t, .78, 1);
    return ColoredBox(
      color: const Color(0xFF0B0A22),
      child: LayoutBuilder(
        builder: (context, box) {
          // The design's phone is 390 × 844: centred on taller screens.
          final dy = (box.maxHeight - 844) / 2;
          final dx = (box.maxWidth - 390) / 2;
          return Stack(
            children: [
              const Positioned.fill(child: _Sky()),
              Positioned.fill(
                child: CustomPaint(
                  painter: _MotionPainter(t: t, offset: Offset(dx, dy)),
                ),
              ),
              // 1.2s: the logo, its halos, the words.
              Positioned(
                left: 0,
                right: 0,
                top: 340 + dy - 64,
                child: Opacity(
                  opacity: settle,
                  child: Transform.scale(
                    scale: .9 + .1 * settle,
                    child: SizedBox(
                      height: 240,
                      child: Stack(
                        alignment: Alignment.topCenter,
                        clipBehavior: Clip.none,
                        children: [
                          _halo(240, 0x1AFF8A3D, 0),
                          _halo(180, 0x38FF8A3D, 30),
                          Positioned(
                            top: 64,
                            child: Container(
                              width: 112,
                              height: 112,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(27),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x73FF5A1F),
                                    blurRadius: 40,
                                    offset: Offset(0, 18),
                                  ),
                                ],
                              ),
                              child: const CommunityLogo(size: 112),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: 340 + dy + 112 + 34 - 10 * (1 - words),
                child: Opacity(
                  opacity: words,
                  child: Column(
                    children: [
                      // The brand's word: "yallapp." in every language.
                      Directionality(
                        textDirection: TextDirection.ltr,
                        child: Row(
                          key: const ValueKey('opening-word'),
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text.rich(
                              const TextSpan(
                                text: 'yallapp',
                                children: [
                                  TextSpan(
                                    text: '.',
                                    style: TextStyle(color: Color(0xFFFF5A1F)),
                                  ),
                                ],
                              ),
                              style: const TextStyle(
                                fontFamily: Fonts.brand,
                                fontWeight: FontWeight.w600,
                                fontSize: 38,
                                letterSpacing: -.6,
                                color: Color(0xFFF4EFE6),
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Text(
                              'COMMUNITY',
                              style: TextStyle(
                                fontFamily: Fonts.brand,
                                fontWeight: FontWeight.w500,
                                fontSize: 15,
                                letterSpacing: 5,
                                color: Color(0xFFFF9A5C),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        l.openingTag,
                        style: const TextStyle(
                          fontSize: 14,
                          letterSpacing: .3,
                          color: Color(0x8CF4EFE6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // The bar that fills while the app loads.
              Positioned(
                left: 0,
                right: 0,
                bottom: 70,
                child: Center(
                  child: Opacity(
                    opacity: _span(t, .7, .85),
                    child: Container(
                      width: 120,
                      height: 3,
                      alignment: AlignmentDirectional.centerStart,
                      decoration: BoxDecoration(
                        color: const Color(0x1AFFFFFF),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      child: FractionallySizedBox(
                        widthFactor: .68 * bar,
                        heightFactor: 1,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(2),
                            gradient: const LinearGradient(
                              colors: [Color(0xFFFF8A3D), Color(0xFFFF4A1A)],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _halo(double size, int color, double top) => Positioned(
    top: top,
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Color(color)),
      ),
    ),
  );
}

/// The navy sky: its glows and a fine grain, drawn once.
class _Sky extends StatelessWidget {
  const _Sky();

  @override
  Widget build(BuildContext context) =>
      RepaintBoundary(child: CustomPaint(painter: _SkyPainter()));
}

class _SkyPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final r = Offset.zero & size;
    canvas.drawRect(
      r,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF121133), Color(0xFF0B0A22), Color(0xFF06061A)],
          stops: [0, .55, 1],
        ).createShader(r),
    );
    void glow(Offset c, double w, double h, Color color, double stop) {
      canvas.save();
      canvas.translate(c.dx, c.dy);
      canvas.scale(1, h / w);
      canvas.drawCircle(
        Offset.zero,
        w,
        Paint()
          ..shader = RadialGradient(
            colors: [color, color.withValues(alpha: 0)],
            stops: [0, stop],
          ).createShader(Rect.fromCircle(center: Offset.zero, radius: w)),
      );
      canvas.restore();
    }

    // radial-gradient(120% 60% at 50% 18%, #1E1B4B, transparent 60%) …
    glow(
      Offset(size.width * .5, size.height * .18),
      size.width * 1.2,
      size.height * .6,
      const Color(0xFF1E1B4B),
      .6,
    );
    glow(
      Offset(size.width * .5, size.height * .52),
      size.width * .7,
      size.height * .4,
      const Color(0x33FF5A1F),
      .7,
    );
    glow(
      Offset(size.width * .85, size.height * .85),
      size.width * .6,
      size.height * .35,
      const Color(0x296B5BFF),
      .7,
    );
    // The grain: faint white specks, the same every time.
    final random = math.Random(3);
    final specks = <Offset>[
      for (var i = 0; i < 7000; i++)
        Offset(
          random.nextDouble() * size.width,
          random.nextDouble() * size.height,
        ),
    ];
    canvas.drawPoints(
      PointMode.points,
      specks,
      Paint()
        ..color = const Color(0x12FFFFFF)
        ..strokeWidth = 1,
    );
  }

  @override
  bool shouldRepaint(_SkyPainter old) => false;
}

/// The dot, the three members and the bubble drawing around them, and the
/// faint member network behind the final frame.
class _MotionPainter extends CustomPainter {
  _MotionPainter({required this.t, required this.offset});

  final double t;
  final Offset offset;

  static const cream = Color(0xFFF4EFE6);
  static const orange = Color(0xFFFF5A1F);

  // The bubble of 0.6s (opening.html), at the phone's points.
  static final _bubble = Path()
    ..moveTo(195, 318)
    ..cubicTo(147, 318, 109, 351, 109, 392)
    ..cubicTo(109, 414, 120, 434, 138, 447)
    ..lineTo(130, 480)
    ..lineTo(169, 463)
    ..cubicTo(177, 465, 186, 466, 195, 466)
    ..cubicTo(243, 466, 281, 433, 281, 392)
    ..cubicTo(281, 351, 243, 318, 195, 318)
    ..close();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.translate(offset.dx, offset.dy);

    // 0.0s: one orange dot in the middle, glowing.
    final dot = 1 - _span(t, .2, .4);
    if (dot > 0) {
      const c = Offset(195, 421);
      canvas.drawCircle(
        c,
        11 + 60,
        Paint()
          ..shader = RadialGradient(
            colors: [
              orange.withValues(alpha: .45 * dot),
              orange.withValues(alpha: 0),
            ],
          ).createShader(Rect.fromCircle(center: c, radius: 71)),
      );
      canvas.drawCircle(
        c,
        21,
        Paint()..color = orange.withValues(alpha: .15 * dot),
      );
      canvas.drawCircle(c, 11, Paint()..color = orange.withValues(alpha: dot));
    }

    // 0.6s: three members, joined; the bubble draws around them. They
    // fade as the logo settles.
    final spread = Curves.easeOutCubic.transform(_span(t, .2, .5));
    final members = (spread > 0 ? 1.0 : 0.0) * (1 - _span(t, .72, .88));
    if (members > 0) {
      Offset from(Offset to) =>
          Offset.lerp(const Offset(195, 421), to, spread)!;
      final a = from(const Offset(153, 372));
      final b = from(const Offset(237, 372));
      final hub = from(const Offset(195, 410));
      final c = from(const Offset(195, 440));
      final line = Paint()
        ..color = const Color(0xFFFF8A3D).withValues(alpha: .35 * members)
        ..strokeWidth = 1.4
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(a, hub, line);
      canvas.drawLine(b, hub, line);
      canvas.drawLine(hub, c, line);
      final fill = Paint()..color = cream.withValues(alpha: members);
      canvas.drawCircle(a, 8, fill);
      canvas.drawCircle(b, 8, fill);
      canvas.drawCircle(
        c,
        9 + 14,
        Paint()
          ..shader = RadialGradient(
            colors: [
              orange.withValues(alpha: .6 * members),
              orange.withValues(alpha: 0),
            ],
          ).createShader(Rect.fromCircle(center: c, radius: 23)),
      );
      canvas.drawCircle(
        c,
        9,
        Paint()..color = orange.withValues(alpha: members),
      );

      // The outline, drawn to 330 of its length by 0.6s.
      final drawn = 330 * _span(t, .3, .5);
      for (final m in _bubble.computeMetrics()) {
        canvas.drawPath(
          m.extractPath(0, math.min(drawn, m.length)),
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2
            ..color = cream.withValues(alpha: .5 * members),
        );
      }
    }

    // 1.2s: the faint network behind.
    final net = .55 * _span(t, .75, 1);
    if (net > 0) {
      final line = Paint()
        ..color = cream.withValues(alpha: .08 * net)
        ..strokeWidth = 1;
      const lines = [
        [40.0, 150.0, 120.0, 210.0],
        [120.0, 210.0, 210.0, 160.0],
        [210.0, 160.0, 330.0, 230.0],
        [330.0, 230.0, 360.0, 120.0],
        [30.0, 640.0, 110.0, 700.0],
        [110.0, 700.0, 250.0, 660.0],
        [250.0, 660.0, 350.0, 730.0],
        [250.0, 660.0, 300.0, 590.0],
      ];
      for (final l in lines) {
        canvas.drawLine(Offset(l[0], l[1]), Offset(l[2], l[3]), line);
      }
      final point = Paint()..color = cream.withValues(alpha: .22 * net);
      const points = [
        [40.0, 150.0, 2.5],
        [120.0, 210.0, 3.0],
        [210.0, 160.0, 2.0],
        [330.0, 230.0, 3.0],
        [360.0, 120.0, 2.0],
        [30.0, 640.0, 2.0],
        [110.0, 700.0, 3.0],
        [350.0, 730.0, 2.5],
        [300.0, 590.0, 2.0],
      ];
      for (final p in points) {
        canvas.drawCircle(Offset(p[0], p[1]), p[2], point);
      }
      canvas.drawCircle(
        const Offset(250, 660),
        3.5,
        Paint()..color = orange.withValues(alpha: .7 * net),
      );
      canvas.drawCircle(
        const Offset(210, 160),
        3,
        Paint()..color = orange.withValues(alpha: .6 * net),
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_MotionPainter old) => old.t != t || old.offset != offset;
}
