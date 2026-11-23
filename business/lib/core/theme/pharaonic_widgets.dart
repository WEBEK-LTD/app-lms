import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'pharaonic_art.dart';
import 'theme.dart';

/// 215 The Pharaonic theme's ground, behind every screen: night lapis with
/// a fine mineral grain, a calm band of sky, a whisper of stars in the
/// header band only and gentle edges (dark); papyrus washed for contrast,
/// with quiet inscription columns down its edges (light).
class PharaonicBackdrop extends StatelessWidget {
  const PharaonicBackdrop({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return child;
    final c = context.yb;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.background,
        image: o.dark
            ? null
            : const DecorationImage(
                image: AssetImage('assets/images/pharaonic/papyrus.jpg'),
                repeat: ImageRepeat.repeat,
                scale: 1,
                alignment: Alignment.topLeft,
              ),
      ),
      child: CustomPaint(
        painter: _GroundPainter(o, c.background),
        child: child,
      ),
    );
  }
}

class _GroundPainter extends CustomPainter {
  _GroundPainter(this.o, this.background);

  final YbOrnaments o;
  final Color background;

  static ui.Picture? _grain;

  /// The grain's tile, drawn once: 900 fine dots in 200 × 200.
  static ui.Picture get grain => _grain ??= () {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()..color = const Color(0x2EFFFFFF);
    for (final p in grainPoints(200, 900)) {
      canvas.drawRect(Rect.fromLTWH(p.dx, p.dy, 0.8, 0.8), paint);
    }
    return recorder.endRecording();
  }();

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    if (o.dark) {
      // The glow behind the header.
      canvas.drawRect(
        rect,
        Paint()
          ..shader = RadialGradient(
            center: const Alignment(0, -1.1),
            radius: 1.1,
            colors: [o.glow, o.glow.withValues(alpha: 0)],
          ).createShader(rect),
      );
      // A calm band of sky across the upper half.
      canvas.drawRect(
        rect,
        Paint()
          ..shader = LinearGradient(
            begin: const Alignment(-1, -1),
            end: const Alignment(0.4, 1),
            colors: [
              o.skyBand.withValues(alpha: 0),
              o.skyBand,
              o.skyBand.withValues(alpha: 0),
            ],
            stops: const [0.05, 0.22, 0.5],
          ).createShader(rect),
      );
      // Mineral grain.
      canvas.save();
      canvas.clipRect(rect);
      for (var y = 0.0; y < size.height; y += 200) {
        for (var x = 0.0; x < size.width; x += 200) {
          canvas.save();
          canvas.translate(x, y);
          canvas.drawPicture(grain);
          canvas.restore();
        }
      }
      canvas.restore();
      // The stars' whisper: small, sparse, in the header band only.
      final band = size.height * 0.22;
      final star = Paint();
      for (var y = 0.0; y < band; y += 120) {
        for (var x = 0.0; x < size.width; x += 120) {
          for (final (dx, dy, s) in const [
            (26.0, 34.0, 0.5),
            (88.0, 92.0, 0.44),
          ]) {
            final py = y + dy;
            if (py > band) continue;
            final fade = py < band * 0.4
                ? 1.0
                : 1 - (py - band * 0.4) / (band * 0.6);
            star.color = const Color(0xFFE8C877)
                .withValues(alpha: o.starOpacity * fade);
            canvas.save();
            canvas.translate(x + dx, py);
            canvas.scale(s);
            canvas.drawPath(PharaonicArt.star, star);
            canvas.restore();
          }
        }
      }
    } else {
      // Papyrus, washed so text keeps its contrast; warmer at the top.
      canvas.drawRect(rect, Paint()..color = o.papyrusWash);
      canvas.drawRect(
        rect,
        Paint()
          ..shader = RadialGradient(
            center: const Alignment(0, -1.1),
            radius: 1,
            colors: [o.glow, o.glow.withValues(alpha: 0)],
          ).createShader(rect),
      );
      // Inscription columns down both edges.
      final relief = Paint()
        ..color = o.relief.withValues(alpha: o.reliefOpacity)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.3;
      const scale = 15 / 26;
      for (final x in [0.0, size.width - 15]) {
        for (var y = 0.0; y < size.height; y += 120 * scale) {
          canvas.save();
          canvas.translate(x, y);
          canvas.scale(scale);
          canvas.drawPath(PharaonicArt.relief, relief);
          canvas.restore();
        }
      }
    }
    // Gentle edges.
    canvas.drawRect(
      rect,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(0, -0.2),
          radius: 1.05,
          colors: [o.vignette.withValues(alpha: 0), o.vignette],
          stops: const [0.6, 1],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(_GroundPainter old) =>
      old.o != o || old.background != background;
}

/// 215 Every route in the Pharaonic theme stands on its ground (the
/// platform's own transition, unchanged).
class PharaonicPageTransitions extends PageTransitionsBuilder {
  const PharaonicPageTransitions(this.inner);

  final PageTransitionsBuilder inner;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) => inner.buildTransitions(
    route,
    context,
    animation,
    secondaryAnimation,
    PharaonicBackdrop(child: child),
  );
}

void _emboss(Canvas canvas, Path path, YbOrnaments o, {Paint? stroke}) {
  Paint base() => stroke == null
      ? Paint()
      : (Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke.strokeWidth
          ..strokeCap = stroke.strokeCap);
  canvas.drawPath(path.shift(const Offset(0, 1)), base()..color = o.embossDark);
  canvas.drawPath(
    path.shift(const Offset(0, -0.5)),
    base()..color = o.embossLight,
  );
}

Paint _metal(YbOrnaments o, Rect bounds) =>
    Paint()..shader = o.metalGradient.createShader(bounds);

/// 215 The kheker frieze: bound reeds in gold over a hairline, across the
/// top of every screen with an app bar.
class KhekerPainter extends CustomPainter {
  const KhekerPainter(this.o);

  final YbOrnaments o;

  @override
  void paint(Canvas canvas, Size size) {
    const unit = Size(11, 18.9); // 14 × 24 at 0.79
    final count = (size.width / unit.width).floor();
    final step = size.width / count;
    final band = Rect.fromLTWH(0, 0, size.width, unit.height);
    final metal = _metal(o, band);
    for (var k = 0; k < count; k++) {
      canvas.save();
      canvas.translate(k * step + (step - unit.width) / 2, 0);
      canvas.scale(unit.width / PharaonicArt.khekerSize.width);
      _emboss(canvas, PharaonicArt.kheker, o);
      canvas.restore();
    }
    canvas.save();
    canvas.clipRect(band);
    for (var k = 0; k < count; k++) {
      canvas.save();
      canvas.translate(k * step + (step - unit.width) / 2, 0);
      canvas.scale(unit.width / PharaonicArt.khekerSize.width);
      canvas.drawPath(PharaonicArt.kheker, metal);
      canvas.restore();
    }
    canvas.restore();
    final line = Rect.fromLTWH(0, unit.height + 2, size.width, 1);
    canvas.drawRect(line, Paint()..shader = o.hairline.createShader(line));
  }

  @override
  bool shouldRepaint(KhekerPainter old) => old.o != o;
}

/// 215 The app bar's shape in the Pharaonic theme: a plain rectangle that
/// carries the kheker frieze along its top.
class KhekerAppBarBorder extends ShapeBorder {
  const KhekerAppBarBorder(this.o);

  final YbOrnaments o;

  /// The frieze's height; the app bar is this much taller.
  static const height = 24.0;

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      Path()..addRect(rect);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) =>
      Path()..addRect(rect);

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    canvas.save();
    canvas.translate(rect.left, rect.top + 2);
    KhekerPainter(o).paint(canvas, Size(rect.width, height));
    canvas.restore();
  }

  @override
  ShapeBorder scale(double t) => this;
}

/// 215 A stadium whose edge is a metallic gold hairline (the active tab).
class MetalStadiumBorder extends OutlinedBorder {
  const MetalStadiumBorder(this.o, {super.side});

  final YbOrnaments o;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      getOuterPath(rect.deflate(1), textDirection: textDirection);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) => Path()
    ..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(rect.height / 2)));

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(0.5),
      Radius.circular(rect.height / 2),
    );
    canvas.drawRRect(
      rrect,
      _metal(o, rect)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
  }

  @override
  MetalStadiumBorder copyWith({BorderSide? side}) => this;

  @override
  ShapeBorder scale(double t) => this;
}

/// 215 The painted cavetto cornice over Today and the welcome screen: gold
/// flutes over a bound torus, a hairline below.
class Cornice extends StatelessWidget {
  const Cornice({super.key});

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return const SizedBox.shrink();
    return SizedBox(
      height: 24,
      width: double.infinity,
      child: CustomPaint(painter: _CornicePainter(o)),
    );
  }
}

class _CornicePainter extends CustomPainter {
  _CornicePainter(this.o);

  final YbOrnaments o;

  @override
  void paint(Canvas canvas, Size size) {
    const unit = Size(8, 14.7); // 12 × 22 at 2/3
    final count = (size.width / unit.width).floor();
    final step = size.width / count;
    final band = Rect.fromLTWH(0, 3, size.width, unit.height);
    final metal = _metal(o, band);
    final shape = Path();
    for (var k = 0; k < count; k++) {
      final m = Matrix4.identity()
        ..translateByDouble(k * step + (step - unit.width) / 2, 3, 0, 1)
        ..scaleByDouble(unit.width / 12, unit.width / 12, 1, 1);
      shape
        ..addPath(PharaonicArt.flute.transform(m.storage), Offset.zero)
        ..addPath(PharaonicArt.torus.transform(m.storage), Offset.zero);
    }
    _emboss(canvas, shape, o);
    canvas.drawPath(shape, metal);
    final line = Rect.fromLTWH(0, 20, size.width, 1);
    canvas.drawRect(line, Paint()..shader = o.hairline.createShader(line));
  }

  @override
  bool shouldRepaint(_CornicePainter old) => old.o != o;
}

/// 215 A cartouche around the shop's name or an order's number: a double
/// gold oval with its tie bar at the end of the reading direction.
class Cartouche extends StatelessWidget {
  const Cartouche({super.key, required this.child, this.fill});

  final Widget child;
  final Color? fill;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return child;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return CustomPaint(
      painter: _CartouchePainter(o, rtl, fill),
      child: Padding(
        padding: EdgeInsetsDirectional.fromSTEB(20, 6, 26, 6),
        child: child,
      ),
    );
  }
}

class _CartouchePainter extends CustomPainter {
  _CartouchePainter(this.o, this.rtl, this.fill);

  final YbOrnaments o;
  final bool rtl;
  final Color? fill;

  @override
  void paint(Canvas canvas, Size size) {
    const bar = 8.0;
    final oval = rtl
        ? Rect.fromLTRB(bar, 0.6, size.width - 0.6, size.height - 0.6)
        : Rect.fromLTRB(0.6, 0.6, size.width - bar, size.height - 0.6);
    final r = Radius.circular(oval.height / 2);
    if (fill != null) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(oval, r),
        Paint()..color = fill!,
      );
    }
    final metal = _metal(o, Offset.zero & size)..style = PaintingStyle.stroke;
    canvas.drawRRect(
      RRect.fromRectAndRadius(oval, r),
      metal..strokeWidth = 1.2,
    );
    final inner = oval.deflate(3.6);
    canvas.drawRRect(
      RRect.fromRectAndRadius(inner, Radius.circular(inner.height / 2)),
      _metal(o, Offset.zero & size)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.6,
    );
    final bx = rtl ? 2.5 : size.width - 2.5;
    final ex = rtl ? oval.left + 2 : oval.right - 2;
    final line = _metal(o, Offset.zero & size)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(bx, size.height * 0.2),
      Offset(bx, size.height * 0.8),
      line..strokeWidth = 1.8,
    );
    line.strokeWidth = 0.6;
    canvas.drawLine(
      Offset(bx, size.height * 0.4),
      Offset(ex, size.height * 0.4),
      line,
    );
    canvas.drawLine(
      Offset(bx, size.height * 0.6),
      Offset(ex, size.height * 0.6),
      line,
    );
  }

  @override
  bool shouldRepaint(_CartouchePainter old) =>
      old.o != o || old.rtl != rtl || old.fill != fill;
}

/// 215 The winged sun with its two uraei, in metallic gold.
class WingedSun extends StatelessWidget {
  const WingedSun({super.key, this.width = 240});

  final double width;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments ?? YbOrnaments.darkSet;
    return SizedBox(
      width: width,
      height: width * 64 / 240,
      child: CustomPaint(painter: _SunPainter(o)),
    );
  }
}

class _SunPainter extends CustomPainter {
  _SunPainter(this.o);

  final YbOrnaments o;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 240);
    const box = Rect.fromLTWH(0, 0, 240, 64);
    final metal = _metal(o, box);
    // The wings, with their feathers cut out.
    canvas.saveLayer(box, Paint());
    canvas.drawPath(PharaonicArt.wingTiers, metal);
    canvas.drawPath(
      PharaonicArt.wingCuts,
      Paint()
        ..blendMode = BlendMode.clear
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.1
        ..strokeCap = StrokeCap.round,
    );
    canvas.restore();
    // The disc and its ring.
    canvas.drawCircle(const Offset(120, 30), 12.5, metal);
    canvas.drawCircle(
      const Offset(120, 30),
      8.5,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = const Color(0x591A1406),
    );
    // The uraei.
    canvas.drawPath(PharaonicArt.uraeusHoods, metal);
    canvas.drawPath(
      PharaonicArt.uraeusTails,
      _metal(o, box)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SunPainter old) => old.o != o;
}

/// 215 The temple pylon behind the welcome screen's mark, fading down.
class Pylon extends StatelessWidget {
  const Pylon({super.key, this.width = 300});

  final double width;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return const SizedBox.shrink();
    return SizedBox(
      width: width,
      height: width * 150 / 300,
      child: CustomPaint(painter: _PylonPainter(o)),
    );
  }
}

class _PylonPainter extends CustomPainter {
  _PylonPainter(this.o);

  final YbOrnaments o;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    canvas.scale(size.width / 300);
    const box = Rect.fromLTWH(0, 0, 300, 150);
    canvas.drawPath(
      PharaonicArt.pylon,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [o.pylon, o.pylon, o.pylon.withValues(alpha: 0)],
          stops: const [0, 0.35, 1],
        ).createShader(box),
    );
    canvas.drawPath(
      PharaonicArt.pylonLines,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = o.metal[1].withValues(alpha: 0.13),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_PylonPainter old) => old.o != o;
}

/// 215 A bound papyrus column down an edge of the welcome screen.
class PapyrusColumn extends StatelessWidget {
  const PapyrusColumn({super.key, this.width = 12});

  final double width;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return const SizedBox.shrink();
    return SizedBox(
      width: width,
      child: CustomPaint(painter: _ColumnPainter(o)),
    );
  }
}

class _ColumnPainter extends CustomPainter {
  _ColumnPainter(this.o);

  final YbOrnaments o;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 18;
    final paint = _metal(o, Offset.zero & size)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.saveLayer(
      Offset.zero & size,
      Paint()..color = Color.fromRGBO(0, 0, 0, o.columnOpacity),
    );
    for (var y = 0.0; y < size.height; y += 64 * scale) {
      canvas.save();
      canvas.translate(0, y);
      canvas.scale(scale);
      canvas.drawPath(PharaonicArt.columnStems, paint..strokeWidth = 1.2);
      canvas.drawPath(PharaonicArt.columnTies, paint..strokeWidth = 1.4);
      canvas.restore();
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ColumnPainter old) => old.o != o;
}

/// 215 The lotus-and-bud border (the welcome screen's divider).
class LotusBorder extends StatelessWidget {
  const LotusBorder({super.key, this.width = 200});

  final double width;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return const SizedBox.shrink();
    return SizedBox(
      width: width,
      height: 16,
      child: CustomPaint(painter: _LotusPainter(o)),
    );
  }
}

class _LotusPainter extends CustomPainter {
  _LotusPainter(this.o);

  final YbOrnaments o;

  @override
  void paint(Canvas canvas, Size size) {
    final count = (size.width / 40).floor();
    final scale = size.width / (count * 40);
    final metal = _metal(o, Offset.zero & size);
    for (var k = 0; k < count; k++) {
      canvas.save();
      canvas.translate(k * 40 * scale, 0);
      canvas.scale(scale, 1);
      canvas.drawPath(PharaonicArt.lotusFills, metal);
      canvas.drawPath(
        PharaonicArt.lotusLines,
        _metal(o, Offset.zero & size)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_LotusPainter old) => old.o != o;
}

enum Motif { ankh, djed, wedjat }

/// 215 An ornamental motif in embossed metallic gold. Decoration only:
/// excluded from semantics, never an action.
class MotifMark extends StatelessWidget {
  const MotifMark(this.motif, {super.key, this.size = 16});

  final Motif motif;
  final double size;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return const SizedBox.shrink();
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: size,
        child: CustomPaint(painter: _MotifPainter(o, motif)),
      ),
    );
  }
}

class _MotifPainter extends CustomPainter {
  _MotifPainter(this.o, this.motif);

  final YbOrnaments o;
  final Motif motif;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 24);
    const box = Rect.fromLTWH(0, 0, 24, 24);
    final metal = _metal(o, box);
    switch (motif) {
      case Motif.ankh:
        _emboss(canvas, PharaonicArt.ankh, o);
        canvas.drawPath(PharaonicArt.ankh, metal);
      case Motif.djed:
        _emboss(canvas, PharaonicArt.djed, o);
        canvas.drawPath(PharaonicArt.djed, metal);
      case Motif.wedjat:
        canvas.drawPath(
          PharaonicArt.wedjatLines,
          metal
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.6
            ..strokeCap = StrokeCap.round,
        );
        canvas.drawPath(PharaonicArt.wedjatPupil, _metal(o, box));
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_MotifPainter old) => old.o != o || old.motif != motif;
}

/// 215 A gold hairline with a small motif in the middle, between sections.
class PharaonicRule extends StatelessWidget {
  const PharaonicRule({super.key, this.motif = Motif.ankh});

  final Motif motif;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return const SizedBox.shrink();
    Widget line(bool start) => Expanded(
      child: Container(
        height: 1,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: start
                ? AlignmentDirectional.centerStart
                : AlignmentDirectional.centerEnd,
            end: start
                ? AlignmentDirectional.centerEnd
                : AlignmentDirectional.centerStart,
            colors: [o.goldLine.withValues(alpha: 0), o.goldLine],
          ),
        ),
      ),
    );
    return Row(
      children: [
        line(true),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: MotifMark(motif, size: 14),
        ),
        line(false),
      ],
    );
  }
}

/// 215 The hero card of a screen: a metallic gold hairline border, gold
/// corner pieces, and (the new order) a faience-tile top edge.
class GiltCard extends StatelessWidget {
  const GiltCard({super.key, required this.child, this.tiles = false});

  final Widget child;
  final bool tiles;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    final c = context.yb;
    if (o == null) return Card(child: child);
    return CustomPaint(
      foregroundPainter: _GiltPainter(o, tiles),
      child: Container(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: o.dark ? const Color(0x73000000) : const Color(0x1F4A3814),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: child,
      ),
    );
  }
}

class _GiltPainter extends CustomPainter {
  _GiltPainter(this.o, this.tiles);

  final YbOrnaments o;
  final bool tiles;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(0.5),
      const Radius.circular(18),
    );
    canvas.drawRRect(
      rrect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: o.metal,
          stops: o.metalStops,
        ).createShader(rect),
    );
    var top = 6.0;
    if (tiles) {
      // Faience tiles along the top edge, glazed.
      canvas.save();
      canvas.clipRRect(
        RRect.fromRectAndRadius(rect.deflate(1), const Radius.circular(17)),
      );
      const h = 6.0;
      var x = 1.0;
      var k = 0;
      while (x < size.width) {
        canvas.drawRect(
          Rect.fromLTWH(x, 1, 13, h),
          Paint()..color = o.tiles[k % o.tiles.length],
        );
        x += 14;
        k++;
      }
      canvas.drawRect(
        Rect.fromLTWH(0, 1, size.width, h),
        Paint()
          ..shader = const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x59FFFFFF), Color(0x00FFFFFF), Color(0x40000000)],
            stops: [0, 0.6, 1],
          ).createShader(Rect.fromLTWH(0, 1, size.width, h)),
      );
      canvas.restore();
      top = 12;
    }
    // The corner pieces.
    final corner = _metal(o, rect)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const s = 16 / 22;
    for (final (x, y, fx, fy) in [
      (6.0, top, 1.0, 1.0),
      (size.width - 6, top, -1.0, 1.0),
      (6.0, size.height - 6, 1.0, -1.0),
      (size.width - 6, size.height - 6, -1.0, -1.0),
    ]) {
      canvas.save();
      canvas.translate(x, y);
      canvas.scale(fx * s, fy * s);
      canvas.drawPath(PharaonicArt.cornerOuter, corner..strokeWidth = 1.1);
      canvas.drawPath(PharaonicArt.cornerInner, corner..strokeWidth = 0.6);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_GiltPainter old) => old.o != o || old.tiles != tiles;
}

/// 215 A soft light that sweeps across [child] every 4.5 seconds (1.6 s
/// across, then a rest) while [active]; still when the system asks for
/// less motion.
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child, this.active = true});

  final Widget child;
  final bool active;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 4500),
  );

  bool get _moving =>
      widget.active && !(MediaQuery.maybeDisableAnimationsOf(context) ?? false);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(Shimmer old) {
    super.didUpdateWidget(old);
    _sync();
  }

  void _sync() {
    if (_moving && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!_moving && _controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Whether the light is moving (tests).
  @visibleForTesting
  bool get moving => _controller.isAnimating;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null || !_moving) return widget.child;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return AnimatedBuilder(
      animation: _controller,
      child: widget.child,
      builder: (context, child) {
        // The sweep takes the first 1.6 s of each 4.5 s.
        final t = (_controller.value * 4.5 / 1.6).clamp(0.0, 1.0);
        if (t >= 1) return child!;
        final p = Curves.easeInOut.transform(t);
        final x = rtl ? 1.4 - 2.8 * p : -1.4 + 2.8 * p;
        return Stack(
          children: [
            child!,
            Positioned.fill(
              child: IgnorePointer(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment(x - 0.4, -0.3),
                        end: Alignment(x + 0.4, 0.3),
                        colors: o.dark
                            ? const [
                                Color(0x00FFECB4),
                                Color(0x21FFF4D2),
                                Color(0x00FFECB4),
                              ]
                            : const [
                                Color(0x00FFFFFF),
                                Color(0x59FFFFFF),
                                Color(0x00FFFFFF),
                              ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// 215 The refined empty state's medallion: a double gold ring with fine
/// rays and an embossed ankh.
class Medallion extends StatelessWidget {
  const Medallion({super.key, this.size = 132});

  final double size;

  @override
  Widget build(BuildContext context) {
    final o = context.ornaments;
    if (o == null) return const SizedBox.shrink();
    return SizedBox.square(
      dimension: size + 44,
      child: CustomPaint(
        painter: _MedallionPainter(o, context.yb),
        child: Center(child: MotifMark(Motif.ankh, size: size * 0.42)),
      ),
    );
  }
}

class _MedallionPainter extends CustomPainter {
  _MedallionPainter(this.o, this.c);

  final YbOrnaments o;
  final YbColors c;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final r = size.width / 2 - 22;
    final rect = Rect.fromCircle(center: center, radius: r);
    canvas.drawCircle(
      center,
      r,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(0, -0.25),
          colors: [c.muted, c.surface],
        ).createShader(rect),
    );
    canvas.drawCircle(
      center,
      r,
      _metal(o, rect)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    canvas.drawCircle(
      center,
      r - 7,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.75
        ..color = o.goldLine,
    );
    final ray = _metal(o, rect.inflate(22))
      ..strokeWidth = 1.2
      ..strokeCap = StrokeCap.round;
    for (var k = 0; k < 24; k++) {
      final a = k * math.pi / 12;
      final d = Offset(math.cos(a), math.sin(a));
      canvas.drawLine(
        center + d * (r + 8),
        center + d * (r + (k.isEven ? 17 : 13)),
        ray..color = ray.color.withValues(alpha: 0.5),
      );
    }
  }

  @override
  bool shouldRepaint(_MedallionPainter old) => old.o != o || old.c != c;
}
