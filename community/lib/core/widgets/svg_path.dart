import 'dart:ui';

/// Reads an SVG path's `d` (M, L, H, V, C, S, Z, absolute or relative) into
/// a [Path]: enough for the marks the design draws (Apple's, Google's "G").
Path svgPath(String d) {
  final path = Path();
  final tokens = RegExp(r'[MmLlHhVvCcSsZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?')
      .allMatches(d)
      .map((m) => m.group(0)!)
      .toList();
  var i = 0;
  var x = 0.0, y = 0.0, startX = 0.0, startY = 0.0;
  double? lastCx, lastCy;
  String? cmd;
  bool isCmd(String t) => RegExp(r'^[A-Za-z]$').hasMatch(t);
  double n() => double.parse(tokens[i++]);
  while (i < tokens.length) {
    if (isCmd(tokens[i])) cmd = tokens[i++];
    final c = cmd!;
    final rel = c == c.toLowerCase();
    switch (c.toUpperCase()) {
      case 'M':
        final nx = n(), ny = n();
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        startX = x;
        startY = y;
        path.moveTo(x, y);
        // Following pairs are lines.
        cmd = rel ? 'l' : 'L';
        lastCx = null;
      case 'L':
        final nx = n(), ny = n();
        x = rel ? x + nx : nx;
        y = rel ? y + ny : ny;
        path.lineTo(x, y);
        lastCx = null;
      case 'H':
        final nx = n();
        x = rel ? x + nx : nx;
        path.lineTo(x, y);
        lastCx = null;
      case 'V':
        final ny = n();
        y = rel ? y + ny : ny;
        path.lineTo(x, y);
        lastCx = null;
      case 'C':
        final x1 = n(), y1 = n(), x2 = n(), y2 = n(), ex = n(), ey = n();
        final ax1 = rel ? x + x1 : x1, ay1 = rel ? y + y1 : y1;
        final ax2 = rel ? x + x2 : x2, ay2 = rel ? y + y2 : y2;
        final axe = rel ? x + ex : ex, aye = rel ? y + ey : ey;
        path.cubicTo(ax1, ay1, ax2, ay2, axe, aye);
        lastCx = ax2;
        lastCy = ay2;
        x = axe;
        y = aye;
      case 'S':
        final x2 = n(), y2 = n(), ex = n(), ey = n();
        final ax1 = lastCx == null ? x : 2 * x - lastCx;
        final ay1 = lastCy == null || lastCx == null ? y : 2 * y - lastCy;
        final ax2 = rel ? x + x2 : x2, ay2 = rel ? y + y2 : y2;
        final axe = rel ? x + ex : ex, aye = rel ? y + ey : ey;
        path.cubicTo(ax1, ay1, ax2, ay2, axe, aye);
        lastCx = ax2;
        lastCy = ay2;
        x = axe;
        y = aye;
      case 'Z':
        path.close();
        x = startX;
        y = startY;
        lastCx = null;
        cmd = null;
      default:
        i++;
    }
    if (cmd == null && i < tokens.length && !isCmd(tokens[i])) i++;
  }
  return path;
}
