import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

/// 215 The Pharaonic theme's artwork, as paths in the units of their
/// original drawings (design-refs/business-pharaonic/svg): the kheker reed,
/// the cornice's flute, the lotus border, a star, the winged sun with its
/// uraei, the pylon, the papyrus column, a corner piece and the ankh, djed
/// and Eye of Horus. All drawn for this app; none is a real word.
abstract final class PharaonicArt {
  static final kheker = _union(const [
    'M7 1.2C9.6 1.2 10.6 3.4 9.6 5.4L9 6.4H5L4.4 5.4C3.4 3.4 4.4 1.2 7 1.2Z',
    'M5 7.6H9L8.4 10.2H5.6Z',
    'M5.6 11.4H8.4L9.4 15.4L8.4 16.6H5.6L4.6 15.4Z',
    'M5.8 17.8H8.2L10.6 22.8H3.4Z',
  ]);
  static const khekerSize = Size(14, 24);

  static final flute = svgPath('M1 2Q6 0 11 2L10.4 14Q6 15.4 1.6 14Z');
  static final torus = svgPath('M0 16.4H12V21.6H0Z');
  static const fluteSize = Size(12, 22);

  /// The lotus-and-bud border: strokes, then fills.
  static final lotusLines = svgPath(
    'M0 15.3H40M10 13.2V10.6M30 13.2V9.4'
    'M0 13.2Q5 10.4 10 13.2Q15 10.4 20 13.2Q25 10.4 30 13.2Q35 10.4 40 13.2',
  );
  static final lotusFills = _union(const [
    'M10 10.6C8.7 8.4 8.8 5 10 2.2C11.2 5 11.3 8.4 10 10.6Z',
    'M9.3 10.8C6.8 10.4 5 8.2 4.6 5.2C7.2 6 8.8 8 9.3 10.8Z',
    'M10.7 10.8C13.2 10.4 15 8.2 15.4 5.2C12.8 6 11.2 8 10.7 10.8Z',
    'M30 9.6C28.2 8.6 27.6 6.4 30 3.6C32.4 6.4 31.8 8.6 30 9.6Z',
  ])..addOval(Rect.fromCircle(center: const Offset(20, 9.4), radius: 1));
  static const lotusSize = Size(40, 16);

  /// A five-pointed star of radius 5 around the origin.
  static final star = svgPath(
    'M0-5L1.18-1.62L4.76-1.55L1.9.62L2.94 4.05L0 2L-2.94 4.05L-1.9.62'
    'L-4.76-1.55L-1.18-1.62Z',
  );

  // The winged sun (240 × 64): three tiers of feathers each side, cut by
  // fine lines; a disc with a ring; two uraei below it.
  static const sunSize = Size(240, 64);
  static final wingTiers = _mirrored(const [
    'M134 21C166 12 202 7 238 9C206 16 170 22 134 29Z',
    'M134 31C167 24 199 20 229 20C201 27 169 33 134 39Z',
    'M134 41C163 36 189 33 213 33C189 40 163 44 134 48Z',
  ]);
  static final wingCuts = _mirrored(const [
    'M146 18L148 28M158 15L161 26M170 13L173 24M182 11L185 22M194 10L197 20'
        'M206 9L208 17M218 9L219 14M150 28L152 37M163 25L165 34M176 23L178 31'
        'M189 21L191 29M202 21L203 26M152 39L153 46M166 37L167 44M180 35L181 41'
        'M194 34L194 38',
  ]);
  static final uraeusHoods =
      _mirrored(const [
        'M113 42.4C115.4 42.4 116.4 45 115.8 47.6C115.4 49.6 114.2 50.8 113 50.8'
            'C111.8 50.8 110.6 49.6 110.2 47.6C109.6 45 110.6 42.4 113 42.4Z',
      ])..addPath(
        Path()
          ..addOval(
            Rect.fromCircle(center: const Offset(113, 41.2), radius: 1.5),
          )
          ..addOval(
            Rect.fromCircle(center: const Offset(127, 41.2), radius: 1.5),
          ),
        Offset.zero,
      );
  static final uraeusTails = _mirrored(const [
    'M113 50.4C109.6 51.4 108 54.6 109.6 57.2C111 59.4 114.4 59.2 115 56.8',
  ]);

  // The pylon (300 × 170): two battered towers with cornices, the gateway.
  static const pylonSize = Size(300, 170);
  static final pylon = _union(const [
    'M18 34H122L129 170H11Z',
    'M14 22Q70 30 126 22V34H14Z',
    'M178 34H282L289 170H171Z',
    'M174 22Q230 30 286 22V34H174Z',
    'M126 66H174V170H126Z',
    'M122 54Q150 60 178 54V66H122Z',
  ]);
  static final pylonLines = svgPath(
    'M14 34H126M174 34H286M122 66H178M16.5 37L11.5 168M123.5 37L128.5 168'
    'M176.5 37L171.5 168M283.5 37L288.5 168M138 170V96H162V170',
  );

  /// The papyrus column's repeat (18 × 64): four stems, three ties.
  static const columnSize = Size(18, 64);
  static final columnStems = svgPath(
    'M3 0V44M7 0V44M11 0V44M15 0V44M3 54V64M7 54V64M11 54V64M15 54V64',
  );
  static final columnTies = svgPath('M1.5 46H16.5M1.5 49H16.5M1.5 52H16.5');

  /// The light theme's inscription column (26 × 120): ruled lines and
  /// abstract carved marks.
  static const reliefSize = Size(26, 120);
  static final relief =
      svgPath(
          'M1 0V120M25 0V120M7 10A6 6 0 0 1 19 10ZM6 38H20M9 42H17'
          'M7 54L10 50L13 54L16 50L19 54M8 80H18V90M9 102C9 95 17 95 17 102M13 104V112',
        )
        ..addOval(
          Rect.fromCenter(center: const Offset(13, 24), width: 6, height: 12),
        )
        ..addOval(Rect.fromCircle(center: const Offset(13, 68), radius: 4.5));

  /// A card's corner piece (22 × 22, the top-left one).
  static final cornerOuter = svgPath('M1.5 15V5.5Q1.5 1.5 5.5 1.5H15');
  static final cornerInner = svgPath('M5 11V7.2Q5 5 7.2 5H11');

  // Motifs (24 × 24): decoration only, never an action.
  static final ankh = svgPath(
    'M12 1.2C15 1.2 16.9 3.8 16.9 6.9C16.9 9 15.9 10.6 14.8 11.6H19.4'
    'Q20.6 11.6 20.6 12.8Q20.6 14.2 19.4 14.2H13.7L14.6 22.8H9.4L10.3 14.2'
    'H4.6Q3.4 14.2 3.4 12.8Q3.4 11.6 4.6 11.6H9.2C8.1 10.6 7.1 9 7.1 6.9'
    'C7.1 3.8 9 1.2 12 1.2Z'
    'M12 3.6C10.6 3.6 9.6 5 9.6 6.9C9.6 8.8 10.6 10.4 12 11'
    'C13.4 10.4 14.4 8.8 14.4 6.9C14.4 5 13.4 3.6 12 3.6Z',
  )..fillType = PathFillType.evenOdd;
  static final djed = _union(const [
    'M9.2 1H14.8V2.6H9.2Z',
    'M5 3.4H19V5.1H5Z',
    'M5 6H19V7.7H5Z',
    'M5 8.6H19V10.3H5Z',
    'M5 11.2H19V12.9H5Z',
    'M9.4 13.6H14.6L15.2 21.2H8.8Z',
    'M6.6 21.4H17.4V23.2H6.6Z',
  ]);
  static final wedjatLines = svgPath(
    'M2.6 6.4Q11 2.6 21.4 5.6M3.4 11.2Q11.5 5.2 19.8 10.6Q11.5 15.4 3.4 11.2Z'
    'M19.8 10.6H22.6M9.6 13.8L8.8 20.6'
    'M13.2 14Q15.4 19.4 19.2 19Q21.4 18.6 20.6 16.6Q19.8 15.4 18.4 16.4',
  );
  static final wedjatPupil = Path()
    ..addOval(Rect.fromCircle(center: const Offset(11.8, 10.4), radius: 2.5));
}

Path _union(List<String> parts) {
  final path = Path();
  for (final d in parts) {
    path.addPath(svgPath(d), Offset.zero);
  }
  return path;
}

/// [parts] and their mirror image across the 240-unit sun's middle.
Path _mirrored(List<String> parts) {
  final path = _union(parts);
  final mirror = Float64List.fromList([
    -1, 0, 0, 0, //
    0, 1, 0, 0, //
    0, 0, 1, 0, //
    240, 0, 0, 1, //
  ]);
  return Path()
    ..addPath(path, Offset.zero)
    ..addPath(path.transform(mirror), Offset.zero);
}

/// An SVG path's `d` as a [Path]: M, L, H, V, C, Q, A (circular arcs only)
/// and Z, absolute or relative.
Path svgPath(String d) {
  final path = Path();
  final tokens = RegExp(r'[MmLlHhVvCcQqAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?')
      .allMatches(d)
      .map((m) => m.group(0)!)
      .toList();
  var i = 0;
  var cmd = 'M';
  var x = 0.0, y = 0.0, sx = 0.0, sy = 0.0;
  double n() => double.parse(tokens[i++]);
  bool isCmd(String t) => RegExp(r'^[A-Za-z]$').hasMatch(t);
  while (i < tokens.length) {
    if (isCmd(tokens[i])) cmd = tokens[i++];
    final rel = cmd == cmd.toLowerCase();
    final ox = rel ? x : 0.0, oy = rel ? y : 0.0;
    switch (cmd.toUpperCase()) {
      case 'M':
        x = ox + n();
        y = oy + n();
        path.moveTo(x, y);
        sx = x;
        sy = y;
        cmd = rel ? 'l' : 'L';
      case 'L':
        x = ox + n();
        y = oy + n();
        path.lineTo(x, y);
      case 'H':
        x = (rel ? x : 0) + n();
        path.lineTo(x, y);
      case 'V':
        y = (rel ? y : 0) + n();
        path.lineTo(x, y);
      case 'C':
        final x1 = ox + n(), y1 = oy + n(), x2 = ox + n(), y2 = oy + n();
        x = ox + n();
        y = oy + n();
        path.cubicTo(x1, y1, x2, y2, x, y);
      case 'Q':
        final x1 = ox + n(), y1 = oy + n();
        x = ox + n();
        y = oy + n();
        path.quadraticBezierTo(x1, y1, x, y);
      case 'A':
        final r = n();
        n(); // ry: circular arcs only
        n(); // rotation
        final large = n() != 0;
        final sweep = n() != 0;
        x = ox + n();
        y = oy + n();
        path.arcToPoint(
          Offset(x, y),
          radius: Radius.circular(r),
          largeArc: large,
          clockwise: sweep,
        );
      case 'Z':
        path.close();
        x = sx;
        y = sy;
    }
  }
  return path;
}

/// A seeded scatter of points for the lapis' mineral grain, in a
/// [size] square tile.
List<Offset> grainPoints(double size, int count, {int seed = 11}) {
  final random = math.Random(seed);
  return [
    for (var k = 0; k < count; k++)
      Offset(random.nextDouble() * size, random.nextDouble() * size),
  ];
}
