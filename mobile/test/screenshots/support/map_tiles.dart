import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
// The tile layer's own image key: the tiles below are found under it.
// ignore: implementation_imports
import 'package:flutter_map/src/layer/tile_layer/tile_provider/network/image_provider/image_provider.dart';
// The key's client (flutter_map's own dependency); never used here.
// ignore: depend_on_referenced_packages
import 'package:http/http.dart' as http;

/// 110.5 A street map for the live taxi screenshots, drawn here because the
/// screenshots are made offline: a calm grid of streets with wider avenues,
/// a few parks, and a river with its bridges, painted for every tile the
/// map may ask for around a place and put in the image cache under the
/// tile's address before the map asks for it. Nothing is a real map.

/// The tiles' address in the demo config.
const demoTilesUrl = 'https://tiles.demo.yallapp.test/{z}/{x}/{y}.png';

const _tile = 256.0;
final _client = http.Client();
final _drawn = <String, ui.Image>{};

/// Normalised Web Mercator: 0 to 1 across the world.
double _u(double lng) => (lng + 180) / 360;
double _v(double lat) {
  final r = lat * math.pi / 180;
  return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2;
}

/// A street every 1/2^17 of the world (about 60 m at Cairo); every fourth an avenue.
const _street = 1 / 131072;

/// The river, north to south, a little east of Zamalek.
final _riverU = _u(31.2305);
final _riverHalf = 0.0019 / 360;

/// Bridges cross the river on every fourth avenue (about a kilometre apart).
bool _bridge(int row) => row % 16 == 0;

/// A park on about one block in twelve.
bool _park(int col, int row) => ((col * 73856093) ^ (row * 19349663)) % 12 == 0;

/// Puts the tiles around (lat, lng) for zooms 10 to 17 in the image cache
/// (the map opens at 11 before it knows where the rider is).
void seedMapTiles({double lat = 30.0452, double lng = 31.2330}) {
  final cache = PaintingBinding.instance.imageCache
    ..maximumSizeBytes = 1 << 30
    ..maximumSize = 4000;
  for (var z = 10; z <= 17; z++) {
    final n = 1 << z;
    final cx = (_u(lng) * n).floor();
    final cy = (_v(lat) * n).floor();
    for (var x = cx - 4; x <= cx + 4; x++) {
      for (var y = cy - 5; y <= cy + 5; y++) {
        final url = demoTilesUrl
            .replaceAll('{z}', '$z')
            .replaceAll('{x}', '$x')
            .replaceAll('{y}', '$y');
        final image = _drawn[url] ??= _draw(z, x, y);
        cache.putIfAbsent(
          NetworkTileImageProvider(
            url: url,
            fallbackUrl: null,
            headers: const {},
            httpClient: _client,
            abortTrigger: null,
            silenceExceptions: true,
            attemptDecodeOfHttpErrorResponses: true,
            cachingProvider: null,
          ),
          () => OneFrameImageStreamCompleter(
            SynchronousFuture(ImageInfo(image: image.clone())),
          ),
        );
      }
    }
  }
}

ui.Image _draw(int z, int x, int y) {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  final world = _tile * (1 << z);
  final left = x * _tile, top = y * _tile;
  double px(double u) => u * world - left;
  canvas.drawRect(
    const Rect.fromLTWH(0, 0, _tile, _tile),
    Paint()..color = const Color(0xFFF2EFE9),
  );
  final step = _street * world;
  final firstCol = (left / step).floor() - 1;
  final lastCol = ((left + _tile) / step).ceil() + 1;
  final firstRow = (top / step).floor() - 1;
  final lastRow = ((top + _tile) / step).ceil() + 1;
  // Parks, then the streets around them.
  final park = Paint()..color = const Color(0xFFD3E8C6);
  for (var col = firstCol; col <= lastCol; col++) {
    for (var row = firstRow; row <= lastRow; row++) {
      if (!_park(col, row)) continue;
      canvas.drawRect(
        Rect.fromLTWH(col * step - left, row * step - top, step, step),
        park,
      );
    }
  }
  final scale = (step / 64).clamp(0.25, 2.0);
  void street(bool across, int index, bool avenue) {
    if (!avenue && step < 22) return;
    final at = index * step - (across ? top : left);
    final width = (avenue ? 9.0 : 5.0) * scale;
    final casing = Paint()
      ..color = avenue ? const Color(0xFFE3C98A) : const Color(0xFFDAD5CB)
      ..strokeWidth = width + 2 * scale;
    final fill = Paint()
      ..color = avenue ? const Color(0xFFFCE7A8) : const Color(0xFFFFFFFF)
      ..strokeWidth = width;
    for (final paint in [casing, fill]) {
      canvas.drawLine(
        across ? Offset(0, at) : Offset(at, 0),
        across ? Offset(_tile, at) : Offset(at, _tile),
        paint,
      );
    }
  }

  for (var col = firstCol; col <= lastCol; col++) {
    street(false, col, col % 4 == 0);
  }
  for (var row = firstRow; row <= lastRow; row++) {
    street(true, row, row % 4 == 0);
  }
  // The river over the streets, with its bridges over it.
  final river = Paint()..color = const Color(0xFFAAD3DF);
  final path = Path();
  const points = 24;
  for (var i = 0; i <= points; i++) {
    final yy = -8 + (_tile + 16) * i / points;
    final v = (yy + top) / world;
    final bend = math.sin(v * 2400) * _riverHalf * 0.8;
    final xx = px(_riverU + bend - _riverHalf);
    i == 0 ? path.moveTo(xx, yy) : path.lineTo(xx, yy);
  }
  for (var i = points; i >= 0; i--) {
    final yy = -8 + (_tile + 16) * i / points;
    final v = (yy + top) / world;
    final bend = math.sin(v * 2400) * _riverHalf * 0.8;
    path.lineTo(px(_riverU + bend + _riverHalf), yy);
  }
  path.close();
  canvas.drawPath(path, river);
  final reach = _riverHalf * 3;
  for (var row = firstRow; row <= lastRow; row++) {
    if (!_bridge(row)) continue;
    final yy = row * step - top;
    final width = 9.0 * scale;
    for (final (color, w) in [
      (const Color(0xFFBDB6A8), width + 3 * scale),
      (const Color(0xFFFCE7A8), width),
    ]) {
      canvas.drawLine(
        Offset(px(_riverU - reach), yy),
        Offset(px(_riverU + reach), yy),
        Paint()
          ..color = color
          ..strokeWidth = w,
      );
    }
  }
  return recorder.endRecording().toImageSync(_tile.toInt(), _tile.toInt());
}
