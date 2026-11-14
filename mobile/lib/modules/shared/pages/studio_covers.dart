import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/common.dart';
import '../../taxi/data/taxi_providers.dart';
import 'studio_live.dart';
// 129.21–129.24 The map's premium looks.
import 'studio_map_looks.dart';
import 'studio_motion.dart';
import 'studio_page.dart';
import 'studio_scrim.dart';

/// 128 The cover layouts of a Studio page (platform/web/src/lib/pages/
/// types.ts `STUDIO_COVER_TYPES`; Studio's canvas: components/studio/
/// covers.tsx): a photo with a colour over it (`photo_hero`) or a drawn
/// map with its markers and the person's dot (`map_header`), what they
/// hold laid out over them in a column, and their last element hanging
/// over the cover's foot when `overlap` is set (a card, a bottom sheet).
/// The first element of a page without a header reaches under the status
/// bar ([topInset]), its elements below it.
class StudioCoverView extends ConsumerWidget {
  const StudioCoverView({
    super.key,
    required this.node,
    required this.scope,
    this.topInset = 0,
  });

  final StudioNode node;
  final StudioScope scope;
  final double topInset;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kids = [
      for (final child in node.children)
        if (StudioNodeView.shows(child, ref)) child,
    ];
    // 128.10 Its own last element hangs over its foot, when this person
    // sees it; else none does (not the one before it).
    final last = node.children.lastOrNull;
    final hang =
        node.overlap > 0 && last != null && StudioNodeView.shows(last, ref)
        ? last
        : null;
    final front = hang == null ? kids : kids.sublist(0, kids.length - 1);
    final map = node.type == StudioNodeType.mapHeader;
    // 128.10 What it holds may be see-through on it (a frosted button).
    final inside = scope.insideCover();
    final height = (node.height?.fixed ?? (map ? 320 : 180)) + topInset;
    final pad = node.padding ?? const StudioSides();
    final radius = _radius(node);
    final background = parseHexColor(
      scope.dark ? (node.darkBackground ?? node.background) : node.background,
    );
    final over = StudioNode(
      id: '${node.id}-over',
      type: StudioNodeType.column,
      children: front,
      gap: node.gap,
      align: node.align,
      cross: node.cross,
      height: StudioSize.fixed(
        math.max(0, height - topInset - pad.top - pad.bottom),
      ),
    );
    Widget cover = Stack(
      fit: StackFit.expand,
      children: [
        if (map && (node.mapDrawing?.premium ?? false))
          // 129.21–129.24 One of the premium looks, or pins, words or a
          // route on the map: drawn on their own.
          StudioMapLooks(
            node: node,
            dark: scope.dark,
            land: parseHexColor(
              scope.dark ? node.darkBackground : node.background,
            ),
          )
        else if (map)
          // 128.10 Its land: the element's background by day, its
          // `dark_background` by night (missing, the dark map's own).
          _DrawnMap(
            node: node,
            dark: scope.dark,
            land: parseHexColor(
              scope.dark ? node.darkBackground : node.background,
            ),
          )
        else ...[
          ColoredBox(color: background ?? const Color(0xFF1F2A37)),
          if (node.imageUrl case final url?)
            // 129.1 Growing slowly in a slider's open slide (Ken Burns).
            StudioKenBurns.wrap(
              context,
              AppNetworkImage(url: url, seed: node.id.hashCode),
            ),
          // The shade any picture can have (studio_scrim.dart).
          if (node.scrim case final scrim?)
            DecoratedBox(
              key: ValueKey('studio-scrim-${node.id}'),
              decoration: BoxDecoration(gradient: studioScrimGradient(scrim)),
            ),
        ],
        if (front.isNotEmpty)
          Padding(
            padding: EdgeInsetsDirectional.only(
              top: pad.top + topInset,
              end: pad.end,
              bottom: pad.bottom,
              start: pad.start,
            ),
            child: StudioNodeView(node: over, scope: inside, parent: node),
          ),
      ],
    );
    cover = SizedBox(
      key: ValueKey('studio-cover-${node.id}'),
      height: height,
      child: ClipRRect(borderRadius: radius, child: cover),
    );
    if (hang == null) return cover;
    return Stack(
      children: [
        Positioned(top: 0, left: 0, right: 0, height: height, child: cover),
        // 128.10 The cover whole even under an element shorter than how
        // far it hangs.
        SizedBox(height: height),
        Padding(
          padding: EdgeInsets.only(top: math.max(0, height - node.overlap)),
          child: StudioNodeView(node: hang, scope: inside, parent: node),
        ),
      ],
    );
  }

  static BorderRadiusGeometry _radius(StudioNode node) {
    final c = node.corners;
    if (c == null) return BorderRadius.circular(node.radius);
    return BorderRadiusDirectional.only(
      topStart: Radius.circular(c.topStart),
      topEnd: Radius.circular(c.topEnd),
      bottomEnd: Radius.circular(c.bottomEnd),
      bottomStart: Radius.circular(c.bottomStart),
    );
  }
}

/// The drawn map's colours by day and by night.
const _light = (
  land: Color(0xFFECE8DF),
  water: Color(0xFFBCD7E2),
  road: Color(0xFFFFFFFF),
  park: Color(0xFFD7E4CB),
);
const _dark = (
  land: Color(0xFF151B2B),
  water: Color(0xFF1F3550),
  road: Color(0xFF262E44),
  park: Color(0xFF1B2A26),
);

/// The person's dot sits a little under the middle, as on the boards.
const _meY = 0.56;

/// The map, its markers (the free taxis near the person, live, when the
/// element asks and the app is a taxi app) and the person's dot.
class _DrawnMap extends ConsumerWidget {
  const _DrawnMap({required this.node, required this.dark, this.land});

  final StudioNode node;
  final bool dark;
  final Color? land;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final drawing = node.mapDrawing ?? const StudioMapDrawing();
    final accent = parseHexColor(drawing.accent) ?? const Color(0xFFF5B700);
    final chip = parseHexColor(drawing.chip) ?? const Color(0xFF1C2541);
    final icon = symbolByName(drawing.icon ?? 'local_taxi');
    final live = drawing.live && ref.watch(taxiConfigProvider) != null;
    final near = live ? ref.watch(studioNearbyTaxisProvider) : null;
    return LayoutBuilder(
      builder: (context, box) {
        final w = box.maxWidth, h = box.maxHeight;
        // Where each marker is, in pixels from the start and the top.
        final spots = <Offset>[];
        if (!live) {
          for (final m in drawing.markers) {
            spots.add(Offset(m.x / 100 * w, m.y / 100 * h));
          }
        } else if (near != null) {
          // About 1.5 km around the person across most of the map's width.
          final scale = w * 0.42 / 1.5;
          final cos = math.cos(near.at.lat * math.pi / 180);
          for (final t in near.taxis.take(12)) {
            final dx = (t.lng - near.at.lng) * 111.32 * cos * scale;
            final dy = (near.at.lat - t.lat) * 110.57 * scale;
            spots.add(
              Offset(
                (w / 2 + dx).clamp(24, w - 24),
                (h * _meY + dy).clamp(72, h - 24),
              ),
            );
          }
        }
        // East is to the right on a map in every language.
        final rtl = Directionality.of(context) == TextDirection.rtl;
        return Stack(
          key: ValueKey('studio-map-${node.id}'),
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _MapPainter(colors: dark ? _dark : _light, land: land),
              ),
            ),
            for (final (i, at) in spots.indexed)
              Positioned(
                key: ValueKey('studio-map-marker-$i'),
                left: (rtl && !live ? w - at.dx : at.dx) - 17,
                top: at.dy - 17,
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: chip,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: accent, width: 2),
                  ),
                  child: Icon(icon, size: 18, color: accent),
                ),
              ),
            if (drawing.me)
              Positioned(
                left: w / 2 - 28,
                top: h * _meY - 28,
                child: Container(
                  key: const ValueKey('studio-map-me'),
                  width: 56,
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.28),
                    shape: BoxShape.circle,
                  ),
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: accent,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 4),
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

/// A river, four roads and two parks in a 375 × 470 frame that covers the
/// element, as Studio's canvas draws them.
class _MapPainter extends CustomPainter {
  const _MapPainter({required this.colors, this.land});

  final ({Color land, Color water, Color road, Color park}) colors;
  final Color? land;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = land ?? colors.land);
    final s = math.max(size.width / 375, size.height / 470);
    canvas
      ..save()
      ..clipRect(Offset.zero & size)
      ..translate((size.width - 375 * s) / 2, (size.height - 470 * s) / 2)
      ..scale(s);
    void rect(Rect r, Color color, {double turn = 0, double round = 0}) {
      canvas.save();
      if (turn != 0) {
        canvas
          ..translate(r.center.dx, r.center.dy)
          ..rotate(turn * math.pi / 180)
          ..translate(-r.center.dx, -r.center.dy);
      }
      canvas.drawRRect(
        RRect.fromRectAndRadius(r, Radius.circular(round)),
        Paint()..color = color,
      );
      canvas.restore();
    }

    rect(const Rect.fromLTWH(150, -40, 70, 560), colors.water, turn: 18);
    rect(const Rect.fromLTWH(-20, 120, 420, 12), colors.road, turn: -8);
    rect(const Rect.fromLTWH(-20, 300, 420, 12), colors.road, turn: 6);
    rect(const Rect.fromLTWH(70, -20, 10, 520), colors.road);
    rect(const Rect.fromLTWH(290, -20, 10, 520), colors.road);
    rect(const Rect.fromLTWH(40, 190, 80, 70), colors.park, round: 12);
    rect(const Rect.fromLTWH(240, 30, 90, 60), colors.park, round: 12);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_MapPainter old) =>
      old.colors != colors || old.land != land;
}
