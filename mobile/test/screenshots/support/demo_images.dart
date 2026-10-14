import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:material_symbols_icons/symbols.dart';

/// Pictures for the demo content. The screenshots are made offline, so
/// instead of photos every image is a calm two-tone tile with a Material
/// Symbol (or, for homes, a flat drawing of a building), painted here and
/// put in the image cache under its URL before the app asks for it.
class DemoArt {
  const DemoArt(this.from, this.to, this.icon, {this.scene = DemoScene.icon});

  const DemoArt.building(this.from, this.to, {this.icon})
    : scene = DemoScene.building;

  const DemoArt.villa(this.from, this.to, {this.icon})
    : scene = DemoScene.villa;

  final Color from;
  final Color to;
  final IconData? icon;
  final DemoScene scene;
}

enum DemoScene { icon, building, villa }

const _host = 'https://demo.yallapp.test/img';

/// The URL the demo content uses for the picture called [name].
String demoImage(String name) {
  assert(demoArt.containsKey(name), 'No demo picture called $name');
  return '$_host/$name.png';
}

const demoArt = <String, DemoArt>{
  // Academy.
  'course-arabic': DemoArt(
    Color(0xFFF3D9B1),
    Color(0xFFD99A4E),
    Symbols.edit_note_rounded,
  ),
  'course-photo': DemoArt(
    Color(0xFFBFD7EA),
    Color(0xFF4A78A8),
    Symbols.photo_camera_rounded,
  ),
  'course-excel': DemoArt(
    Color(0xFFCBE6D3),
    Color(0xFF2F8A5B),
    Symbols.table_chart_rounded,
  ),
  'course-ux': DemoArt(
    Color(0xFFE2D9F3),
    Color(0xFF7457B8),
    Symbols.design_services_rounded,
  ),
  'course-english': DemoArt(
    Color(0xFFF7D6D0),
    Color(0xFFC8553D),
    Symbols.record_voice_over_rounded,
  ),
  'course-marketing': DemoArt(
    Color(0xFFFCE9B8),
    Color(0xFFD69E1E),
    Symbols.campaign_rounded,
  ),
  'course-python': DemoArt(
    Color(0xFFCFE3F0),
    Color(0xFF2B6A8F),
    Symbols.terminal_rounded,
  ),
  'banner-academy': DemoArt(
    Color(0xFF2B2950),
    Color(0xFF0E0D24),
    Symbols.school_rounded,
  ),
  // Store (a flower and gift shop).
  'product-roses': DemoArt(
    Color(0xFFF6D3D6),
    Color(0xFFC44A5A),
    Symbols.local_florist_rounded,
  ),
  'product-orchid': DemoArt(
    Color(0xFFEBDDF2),
    Color(0xFF9A5DB5),
    Symbols.spa_rounded,
  ),
  'product-coffee': DemoArt(
    Color(0xFFEBD9C6),
    Color(0xFF8A5A3B),
    Symbols.coffee_rounded,
  ),
  'product-delight': DemoArt(
    Color(0xFFF8E1E7),
    Color(0xFFD9708C),
    Symbols.cake_rounded,
  ),
  'product-candle': DemoArt(
    Color(0xFFFBEBCB),
    Color(0xFFCC8A2E),
    Symbols.candle_rounded,
  ),
  'product-tulips': DemoArt(
    Color(0xFFFAD9C8),
    Color(0xFFE0673A),
    Symbols.filter_vintage_rounded,
  ),
  'product-gift': DemoArt(
    Color(0xFFD5E8E0),
    Color(0xFF2F7D64),
    Symbols.redeem_rounded,
  ),
  'product-tea': DemoArt(
    Color(0xFFDDE8C9),
    Color(0xFF6A8A35),
    Symbols.emoji_food_beverage_rounded,
  ),
  'category-flowers': DemoArt(
    Color(0xFFF6D3D6),
    Color(0xFFC44A5A),
    Symbols.local_florist_rounded,
  ),
  'category-gifts': DemoArt(
    Color(0xFFD5E8E0),
    Color(0xFF2F7D64),
    Symbols.redeem_rounded,
  ),
  'category-sweets': DemoArt(
    Color(0xFFF8E1E7),
    Color(0xFFD9708C),
    Symbols.cake_rounded,
  ),
  'category-home': DemoArt(
    Color(0xFFFBEBCB),
    Color(0xFFCC8A2E),
    Symbols.candle_rounded,
  ),
  'banner-store': DemoArt(
    Color(0xFFF3C6B8),
    Color(0xFFB8432F),
    Symbols.local_florist_rounded,
  ),
  // Bookings (a hair and beauty studio).
  'service-cut': DemoArt(
    Color(0xFFD9E7E1),
    Color(0xFF2E6E5A),
    Symbols.content_cut_rounded,
  ),
  'service-colour': DemoArt(
    Color(0xFFF1DCE6),
    Color(0xFFA34D7A),
    Symbols.palette_rounded,
  ),
  'service-massage': DemoArt(
    Color(0xFFE6E0D3),
    Color(0xFF8C7650),
    Symbols.spa_rounded,
  ),
  'service-nails': DemoArt(
    Color(0xFFF7DCD5),
    Color(0xFFC9644E),
    Symbols.back_hand_rounded,
  ),
  'service-facial': DemoArt(
    Color(0xFFDDE6F2),
    Color(0xFF52709C),
    Symbols.face_rounded,
  ),
  'service-brows': DemoArt(
    Color(0xFFEDE3D3),
    Color(0xFF9C7B4C),
    Symbols.visibility_rounded,
  ),
  // Real estate.
  'home-nile': DemoArt.building(Color(0xFFBFD9EE), Color(0xFFE9C79A)),
  'home-duplex': DemoArt.villa(Color(0xFFCFE5D6), Color(0xFFEBD8B8)),
  'home-villa': DemoArt.villa(Color(0xFFF3D7BE), Color(0xFFC7DCEB)),
  'home-studio': DemoArt.building(Color(0xFFE6DDF0), Color(0xFFF1D2B6)),
  'home-penthouse': DemoArt.building(Color(0xFFF6D5B8), Color(0xFFB9CFE6)),
  'home-living': DemoArt(
    Color(0xFFEFE2CF),
    Color(0xFFB98A57),
    Symbols.chair_rounded,
  ),
  'home-kitchen': DemoArt(
    Color(0xFFDDE7EA),
    Color(0xFF5D8794),
    Symbols.countertops_rounded,
  ),
  'home-bedroom': DemoArt(
    Color(0xFFE6E0EF),
    Color(0xFF7A68A6),
    Symbols.bed_rounded,
  ),
};

/// Paints every demo picture and stores it in the image cache under its
/// URL, so `Image.network` finds it at once. Call in each test: the cache
/// is cleared between tests.
void seedDemoImages() {
  final cache = PaintingBinding.instance.imageCache
    ..maximumSizeBytes = 1 << 30
    ..maximumSize = 2000;
  for (final entry in demoArt.entries) {
    final key = NetworkImage(demoImage(entry.key));
    cache.putIfAbsent(
      key,
      () => OneFrameImageStreamCompleter(
        SynchronousFuture(ImageInfo(image: _paint(entry.value))),
      ),
    );
  }
}

const _width = 960.0;
const _height = 720.0;

ui.Image _paint(DemoArt art) {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  const size = Size(_width, _height);
  switch (art.scene) {
    case DemoScene.icon:
      _paintIconTile(canvas, size, art);
    case DemoScene.building:
      _paintBuilding(canvas, size, art);
    case DemoScene.villa:
      _paintVilla(canvas, size, art);
  }
  return recorder.endRecording().toImageSync(_width.toInt(), _height.toInt());
}

void _paintIconTile(Canvas canvas, Size size, DemoArt art) {
  final rect = Offset.zero & size;
  canvas.drawRect(
    rect,
    Paint()
      ..shader = ui.Gradient.linear(
        Offset.zero,
        Offset(size.width, size.height),
        [art.from, Color.lerp(art.from, art.to, 0.55)!],
      ),
  );
  // Two large soft discs give the tile some depth.
  canvas
    ..drawCircle(
      Offset(size.width * 0.86, size.height * 0.12),
      size.height * 0.52,
      Paint()..color = const Color(0xFFFFFFFF).withValues(alpha: 0.16),
    )
    ..drawCircle(
      Offset(size.width * 0.08, size.height * 1.02),
      size.height * 0.42,
      Paint()..color = art.to.withValues(alpha: 0.18),
    );
  final icon = art.icon;
  if (icon != null) {
    _drawGlyph(
      canvas,
      icon,
      size.height * 0.42,
      Offset(size.width / 2, size.height / 2),
      const Color(0xFFFFFFFF).withValues(alpha: 0.92),
    );
  }
}

void _drawGlyph(
  Canvas canvas,
  IconData icon,
  double fontSize,
  Offset center,
  Color color,
) {
  final builder =
      ui.ParagraphBuilder(
          ui.ParagraphStyle(
            fontFamily: 'packages/${icon.fontPackage}/${icon.fontFamily}',
            fontSize: fontSize,
          ),
        )
        ..pushStyle(
          ui.TextStyle(
            color: color,
            fontFamily: 'packages/${icon.fontPackage}/${icon.fontFamily}',
            fontSize: fontSize,
            fontVariations: const [
              ui.FontVariation('FILL', 1),
              ui.FontVariation('wght', 400),
              ui.FontVariation('opsz', 48),
            ],
          ),
        )
        ..addText(String.fromCharCode(icon.codePoint));
  final paragraph = builder.build()
    ..layout(ui.ParagraphConstraints(width: fontSize * 2));
  canvas.drawParagraph(
    paragraph,
    center - Offset(paragraph.longestLine / 2, paragraph.height / 2),
  );
}

/// A sky, a tall building with rows of windows and a palm or two.
void _paintBuilding(Canvas canvas, Size size, DemoArt art) {
  final rect = Offset.zero & size;
  canvas.drawRect(
    rect,
    Paint()
      ..shader = ui.Gradient.linear(Offset.zero, Offset(0, size.height), [
        art.from,
        art.to,
      ]),
  );
  canvas.drawCircle(
    Offset(size.width * 0.8, size.height * 0.22),
    size.height * 0.09,
    Paint()..color = const Color(0xFFFFF4DE).withValues(alpha: 0.9),
  );
  final ground = size.height * 0.84;
  // Background towers.
  final far = Paint()..color = const Color(0xFF9AA8BC).withValues(alpha: 0.55);
  canvas
    ..drawRect(Rect.fromLTRB(40, ground - 300, 190, ground), far)
    ..drawRect(Rect.fromLTRB(700, ground - 360, 860, ground), far)
    ..drawRect(Rect.fromLTRB(820, ground - 240, 940, ground), far);
  // The main building.
  final body = Rect.fromLTRB(280, ground - 470, 640, ground);
  canvas.drawRRect(
    RRect.fromRectAndCorners(
      body,
      topLeft: const Radius.circular(10),
      topRight: const Radius.circular(10),
    ),
    Paint()..color = const Color(0xFFF7F1E8),
  );
  canvas.drawRect(
    Rect.fromLTRB(body.right - 70, body.top, body.right, body.bottom),
    Paint()..color = const Color(0xFFE7DED0),
  );
  final glass = Paint()..color = const Color(0xFF7E9DBA);
  final balcony = Paint()..color = const Color(0xFFCDBFA9);
  for (var row = 0; row < 7; row++) {
    final top = body.top + 34 + row * 62.0;
    for (var col = 0; col < 3; col++) {
      final left = body.left + 30 + col * 88.0;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(left, top, 58, 36),
          const Radius.circular(4),
        ),
        glass,
      );
    }
    canvas.drawRect(
      Rect.fromLTWH(body.left + 18, top + 38, body.width - 36, 6),
      balcony,
    );
  }
  canvas.drawRRect(
    RRect.fromRectAndRadius(
      Rect.fromLTWH(body.center.dx - 40, ground - 70, 80, 70),
      const Radius.circular(6),
    ),
    Paint()..color = const Color(0xFF5E6B7C),
  );
  _ground(canvas, size, ground);
  _palm(canvas, Offset(200, ground), 1);
  _palm(canvas, Offset(760, ground), 0.8);
}

/// A low house with a flat roof, big windows and a garden.
void _paintVilla(Canvas canvas, Size size, DemoArt art) {
  final rect = Offset.zero & size;
  canvas.drawRect(
    rect,
    Paint()
      ..shader = ui.Gradient.linear(Offset.zero, Offset(0, size.height), [
        art.from,
        art.to,
      ]),
  );
  canvas.drawCircle(
    Offset(size.width * 0.18, size.height * 0.2),
    size.height * 0.08,
    Paint()..color = const Color(0xFFFFF4DE).withValues(alpha: 0.9),
  );
  final ground = size.height * 0.82;
  final wall = Paint()..color = const Color(0xFFFBF7F0);
  final shade = Paint()..color = const Color(0xFFE9E0D2);
  final glass = Paint()..color = const Color(0xFF6F8FA8);
  // Ground floor and the upper floor set back.
  canvas
    ..drawRect(Rect.fromLTRB(170, ground - 190, 800, ground), wall)
    ..drawRect(Rect.fromLTRB(300, ground - 330, 700, ground - 190), wall)
    ..drawRect(Rect.fromLTRB(150, ground - 206, 820, ground - 190), shade)
    ..drawRect(Rect.fromLTRB(282, ground - 346, 718, ground - 330), shade)
    ..drawRect(Rect.fromLTRB(220, ground - 150, 470, ground - 30), glass)
    ..drawRect(Rect.fromLTRB(520, ground - 150, 600, ground), glass)
    ..drawRect(Rect.fromLTRB(650, ground - 150, 760, ground - 60), glass)
    ..drawRect(Rect.fromLTRB(340, ground - 300, 520, ground - 216), glass)
    ..drawRect(Rect.fromLTRB(560, ground - 300, 660, ground - 216), glass);
  for (var x = 240.0; x < 470; x += 62) {
    canvas.drawRect(
      Rect.fromLTWH(x, ground - 150, 4, 120),
      Paint()..color = const Color(0xFFFBF7F0),
    );
  }
  _ground(canvas, size, ground);
  final hedge = Paint()..color = const Color(0xFF6E9A6A);
  for (var x = 120.0; x < 860; x += 70) {
    canvas.drawCircle(Offset(x, ground + 6), 30, hedge);
  }
  _palm(canvas, Offset(860, ground), 1.1);
}

void _ground(Canvas canvas, Size size, double top) {
  canvas.drawRect(
    Rect.fromLTRB(0, top, size.width, size.height),
    Paint()..color = const Color(0xFF8DB27F),
  );
  canvas.drawRect(
    Rect.fromLTRB(0, top + 40, size.width, size.height),
    Paint()..color = const Color(0xFFD9CDB8),
  );
}

void _palm(Canvas canvas, Offset base, double scale) {
  final trunk = Paint()
    ..color = const Color(0xFF8A6A4A)
    ..strokeWidth = 14 * scale
    ..strokeCap = StrokeCap.round;
  final top = base.translate(10 * scale, -260 * scale);
  canvas.drawLine(base, top, trunk);
  final leaf = Paint()..color = const Color(0xFF4F8A55);
  for (var i = 0; i < 6; i++) {
    final angle = -math.pi / 2 + (i - 2.5) * 0.55;
    canvas.save();
    canvas.translate(top.dx, top.dy);
    canvas.rotate(angle + math.pi / 2);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(0, -60 * scale),
        width: 34 * scale,
        height: 130 * scale,
      ),
      leaf,
    );
    canvas.restore();
  }
}
