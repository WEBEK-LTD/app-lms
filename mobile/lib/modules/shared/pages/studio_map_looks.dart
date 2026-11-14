import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/common.dart';
import '../../rides/data/rides_providers.dart';
import '../../taxi/data/taxi_providers.dart';
import 'studio_live.dart';

/// 129.21–129.24 The drawn map's premium looks (platform/web/src/lib/
/// studio/map-looks.ts has the same numbers; Studio's canvas draws them in
/// components/studio/map-looks.tsx): a living map, a horizon in
/// perspective, two inks and a radar lens; labelled pins, words on the map,
/// the person's dot where it is put, and a route done solid and dashed
/// ahead with its vehicle. No map tiles: every look is drawn. Live taxis
/// are the free ones near the person, and a live route the person's own
/// ride or shipment on its way (no route when there is none). The sweep,
/// the pulse and a moving vehicle stand still with reduced motion.
class StudioMapLooks extends ConsumerStatefulWidget {
  const StudioMapLooks({
    super.key,
    required this.node,
    required this.dark,
    this.land,
  });

  final StudioNode node;
  final bool dark;
  final Color? land;

  @override
  ConsumerState<StudioMapLooks> createState() => _StudioMapLooksState();
}

/// One turn of the lens's sweep, and of a vehicle driving the rest of its
/// way.
const _turn = Duration(milliseconds: 8000);
const _pulse = Duration(milliseconds: 1600);

/// Which way each marker heads, by its place in the list.
const _headings = <double>[
  12,
  -80,
  4,
  92,
  -6,
  -82,
  -84,
  30,
  170,
  -100,
  60,
  -30,
];

class _StudioMapLooksState extends ConsumerState<StudioMapLooks>
    with TickerProviderStateMixin {
  AnimationController? _turning;
  AnimationController? _pulsing;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(StudioMapLooks old) {
    super.didUpdateWidget(old);
    _sync();
  }

  /// The sweep and a moving vehicle turn, and the halos breathe, unless
  /// the person asked for less motion.
  void _sync() {
    final still = MediaQuery.disableAnimationsOf(context);
    final drawing = widget.node.mapDrawing ?? const StudioMapDrawing();
    final turns =
        !still &&
        (drawing.style == StudioMapStyle.lens ||
            (drawing.route?.moving ?? false));
    if (turns && _turning == null) {
      _turning = AnimationController(vsync: this, duration: _turn)..repeat();
    } else if (!turns && _turning != null) {
      _turning!.dispose();
      _turning = null;
    }
    if (!still && _pulsing == null) {
      _pulsing = AnimationController(vsync: this, duration: _pulse)
        ..repeat(reverse: true);
    } else if (still && _pulsing != null) {
      _pulsing!.dispose();
      _pulsing = null;
    }
  }

  @override
  void dispose() {
    _turning?.dispose();
    _pulsing?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final dark = widget.dark;
    final drawing = node.mapDrawing ?? const StudioMapDrawing();
    final l10n = context.l10n;
    final accent = parseHexColor(drawing.accent) ?? const Color(0xFFF5B700);
    final chip = parseHexColor(drawing.chip) ?? const Color(0xFF1C2541);
    final style = drawing.style;
    final p = _palette(style, dark, accent, chip, widget.land);
    final route = drawing.route;
    final ink =
        parseHexColor(
          dark ? (route?.darkColor ?? route?.color) : route?.color,
        ) ??
        accent;
    final sign = drawing.sign ?? l10n.studioMapSign;
    final look = drawing.markerLook;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final taxis = drawing.live && ref.watch(taxiConfigProvider) != null;
    final near = taxis ? ref.watch(studioNearbyTaxisProvider) : null;
    final ride = route?.live == StudioMapRouteLive.ride
        ? ref.watch(activeRideProvider).value
        : null;
    final shipment = route?.live == StudioMapRouteLive.shipment
        ? ref.watch(activeShipmentProvider).value
        : null;
    final pulse = _pulsing == null
        ? const AlwaysStoppedAnimation<double>(0.5)
        : CurvedAnimation(parent: _pulsing!, curve: Curves.easeInOut);
    final turn = _turning ?? const AlwaysStoppedAnimation<double>(0);
    final vehicleIcon = symbolByName(
      route?.icon ?? drawing.icon ?? 'local_taxi',
    );
    final drives = route != null && route.moving && route.live == null;

    return LayoutBuilder(
      builder: (context, box) {
        final w = box.maxWidth, h = box.maxHeight;
        final lens = style == StudioMapStyle.lens ? _lensBox(w, h) : null;
        final area = lens ?? Rect.fromLTWH(0, 0, w, h);
        // A spot from the start and the top, in pixels.
        Offset px(StudioPlace at) => Offset(
          area.left + (rtl ? 100 - at.x : at.x) / 100 * area.width,
          area.top + at.y / 100 * area.height,
        );
        double depthAt(double y) => style == StudioMapStyle.horizon
            ? _horizonDepth(y * 375 / w, h * 375 / w).clamp(0.4, 1.0)
            : 1.0;
        final me = px(
          style == StudioMapStyle.lens
              ? const StudioPlace(50, 50)
              : drawing.meAt ?? const StudioPlace(50, 56),
        );

        // The markers: the free taxis near the person, live, or the
        // element's own.
        final spots = <Offset>[];
        if (!taxis) {
          for (final m in drawing.markers) {
            spots.add(px(m));
          }
        } else if (near != null) {
          // About 1.5 km around the person.
          final scale = (lens == null ? w * 0.42 : lens.width * 0.46) / 1.5;
          final cos = math.cos(near.at.lat * math.pi / 180);
          for (final t in near.taxis.take(12)) {
            final dx = (t.lng - near.at.lng) * 111.32 * cos * scale;
            final dy = (near.at.lat - t.lat) * 110.57 * scale;
            var at = me + Offset(dx, dy);
            if (lens != null) {
              final c = lens.center;
              final off = at - c;
              final most = lens.width / 2 - 16;
              if (off.distance > most) at = c + off / off.distance * most;
            } else {
              at = Offset(at.dx.clamp(24, w - 24), at.dy.clamp(72, h - 24));
            }
            spots.add(at);
          }
        }

        // The route: the element's own, or the person's ride or shipment.
        _Route? line;
        if (route != null) {
          if (route.live == null) {
            line = _Route(
              points: [for (final at in route.points) px(at)],
              at: route.at / 100,
              from: route.fromLabel,
              to: route.toLabel,
              eta: route.eta,
              photo: node.imageUrl,
            );
          } else {
            line = _liveRoute(
              context,
              ride: ride,
              shipment: shipment,
              // 130.7 Where the element's own route is drawn (the owner's
              // points), when it has two or more; else the map's middle.
              area: lens == null
                  ? (route.points.length >= 2
                        ? _routeArea([for (final at in route.points) px(at)])
                        : Rect.fromLTRB(w * 0.16, h * 0.22, w * 0.84, h * 0.72))
                  : Rect.fromCenter(
                      center: lens.center,
                      width: lens.width * 0.6,
                      height: lens.height * 0.6,
                    ),
              fallbackPhoto: node.imageUrl,
            );
          }
        }

        final labelColor = p.label;
        final children = <Widget>[
          if (lens == null)
            Positioned.fill(
              child: CustomPaint(
                painter: _GroundPainter(
                  style: style,
                  p: p,
                  rtl: rtl,
                  accent: accent,
                ),
              ),
            ),
          if (style == StudioMapStyle.natural)
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(-0.1, -0.16),
                    radius:
                        math.sqrt(
                          math.pow(0.55 * w, 2) + math.pow(0.58 * h, 2),
                        ) /
                        math.min(w, h),
                    colors: [p.edge.withValues(alpha: 0), p.edge],
                    stops: const [0.55, 1],
                  ),
                ),
              ),
            ),
          if (style == StudioMapStyle.horizon)
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      p.edge,
                      p.edge.withValues(alpha: 0.94),
                      p.edge.withValues(alpha: 0),
                    ],
                    stops: const [0, 0.24, 0.6],
                  ),
                ),
              ),
            ),
          if (style == StudioMapStyle.twoInk)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 16,
              child: CustomPaint(
                painter: _CheckerPainter(first: accent, second: chip),
              ),
            ),
          if (lens != null)
            Positioned.fromRect(
              rect: lens,
              child: _Lens(
                p: p,
                dark: dark,
                accent: accent,
                chip: chip,
                rtl: rtl,
                turn: turn,
              ),
            ),
          for (final (i, l) in drawing.labels.indexed)
            _label(
              key: ValueKey('studio-map-label-$i'),
              at: px(l.at),
              text: l.text,
              rtl: rtl,
              style: TextStyle(
                fontSize: style == StudioMapStyle.horizon
                    ? (11 + 11 * ((depthAt(px(l.at).dy) - 0.4) / 0.6))
                          .roundToDouble()
                    : 10,
                fontWeight: style == StudioMapStyle.lens
                    ? FontWeight.w700
                    : FontWeight.w800,
                letterSpacing: rtl
                    ? 0
                    : (style == StudioMapStyle.lens ? 3.0 : 2.4),
                color: labelColor,
                height: 1,
              ),
            ),
          if (lens != null)
            for (final (r, n) in const [(50.0, 1), (98.0, 3), (146.0, 5)])
              _centered(
                at: Offset(
                  lens.center.dx,
                  lens.center.dy - r / 320 * lens.width,
                ),
                child: Container(
                  height: 18,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: dark ? chip : Colors.white,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Text(
                    l10n.studioMapMinutes(n),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: dark ? accent : chip,
                      height: 1,
                    ),
                  ),
                ),
              ),
          if (line != null)
            ..._routeParts(
              line,
              style: style,
              dark: dark,
              ink: ink,
              accent: accent,
              chip: chip,
              p: p,
              rtl: rtl,
              me: drawing.me ? me : null,
              icon: vehicleIcon,
              sign: sign,
              depthAt: depthAt,
              pulse: pulse,
              drive: drives ? _turning : null,
              size: Size(w, h),
            ),
          for (final (i, at) in spots.indexed)
            _marker(
              key: ValueKey('studio-map-marker-$i'),
              at: at,
              i: i,
              look: look,
              drawing: drawing,
              dark: dark,
              accent: accent,
              chip: chip,
              p: p,
              sign: sign,
              depth: depthAt(at.dy),
            ),
          if (drawing.me)
            ..._me(
              me,
              style: style,
              dark: dark,
              ink: ink,
              accent: accent,
              chip: chip,
              p: p,
              pulse: pulse,
            ),
          for (final (i, pin) in drawing.places.indexed)
            if (style == StudioMapStyle.horizon)
              ..._standing(
                at: px(pin.at),
                stem: 24,
                bg: p.glass,
                fg: p.ink,
                dot: p.pin,
                text: pin.label,
                depth: depthAt(px(pin.at).dy),
              )
            else
              _place(
                key: ValueKey('studio-map-place-$i'),
                at: px(pin.at),
                pin: pin,
                p: p,
                dark: dark,
                rtl: rtl,
              ),
        ];
        return Stack(
          key: ValueKey('studio-map-${node.id}'),
          clipBehavior: Clip.hardEdge,
          children: children,
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Colours.

class _Palette {
  const _Palette({
    required this.land,
    required this.water,
    required this.park,
    required this.road,
    required this.casing,
    required this.major,
    required this.majorCasing,
    required this.label,
    required this.glass,
    required this.glassEdge,
    required this.ink,
    required this.pin,
    required this.pinInk,
    required this.edge,
  });

  final Color land, water, park, road, casing, major, majorCasing, label;
  final Color glass, glassEdge, ink, pin, pinInk, edge;
}

Color _mix(Color a, Color b, double t) => Color.lerp(a, b, t)!;

_Palette _palette(
  StudioMapStyle? style,
  bool dark,
  Color accent,
  Color chip,
  Color? land,
) {
  const white = Color(0xFFFFFFFF);
  switch (style) {
    case StudioMapStyle.natural:
      return dark
          ? _Palette(
              land: land ?? const Color(0xFF0C1716),
              water: const Color(0xFF05242A),
              park: const Color(0xFF0E2620),
              road: const Color(0xFF182A28),
              casing: const Color(0xFF0C1716),
              major: const Color(0xFF21433E),
              majorCasing: const Color(0xFF0A1312),
              label: const Color(0xFF86A39E),
              glass: const Color.fromRGBO(10, 24, 23, 0.66),
              glassEdge: const Color.fromRGBO(160, 230, 220, 0.14),
              ink: const Color(0xFFE9F5F3),
              pin: const Color(0xFF5FD3C2),
              pinInk: const Color(0xFF04201D),
              edge: const Color.fromRGBO(3, 8, 8, 0.6),
            )
          : _Palette(
              land: land ?? const Color(0xFFEDF0EA),
              water: const Color(0xFFB5D9D2),
              park: const Color(0xFFCFE3CF),
              road: white,
              casing: const Color(0xFFD5DDD6),
              major: white,
              majorCasing: const Color(0xFFC6D1CA),
              label: const Color(0xFF4A5E5A),
              glass: const Color.fromRGBO(255, 255, 255, 0.74),
              glassEdge: const Color.fromRGBO(255, 255, 255, 0.95),
              ink: const Color(0xFF0B2422),
              pin: const Color(0xFF0B2422),
              pinInk: white,
              edge: const Color.fromRGBO(206, 219, 213, 0.55),
            );
    case StudioMapStyle.horizon:
      return dark
          ? _Palette(
              land: land ?? const Color(0xFF0B1A19),
              water: const Color(0xFF04262B),
              park: const Color(0xFF0D2A23),
              road: const Color(0xFF163230),
              casing: const Color(0xFF0B1A19),
              major: const Color(0xFF1F4C46),
              majorCasing: const Color(0xFF081413),
              label: const Color(0xFF7A9A95),
              glass: const Color(0xFFE9F5F3),
              glassEdge: const Color(0xFFE9F5F3),
              ink: const Color(0xFF04201D),
              pin: const Color(0xFF0F766C),
              pinInk: const Color(0xFF04201D),
              edge: land ?? const Color(0xFF061110),
            )
          : _Palette(
              land: land ?? const Color(0xFFE7EBE3),
              water: const Color(0xFFB7D9D2),
              park: const Color(0xFFCFE2CC),
              road: white,
              casing: const Color(0xFFD3DAD1),
              major: white,
              majorCasing: const Color(0xFFC3CDC4),
              label: const Color(0xFF56645F),
              glass: const Color(0xFF0B2422),
              glassEdge: const Color(0xFF0B2422),
              ink: white,
              pin: const Color(0xFF5FD3C2),
              pinInk: white,
              edge: land ?? const Color(0xFFF1EFE9),
            );
    case StudioMapStyle.twoInk:
      // Day: the tile's ink on the accent; night: the accent on a deeper
      // tile.
      final ground =
          land ?? (dark ? _mix(chip, const Color(0xFF000000), 0.35) : accent);
      final ink = dark ? accent : chip;
      return _Palette(
        land: ground,
        water: dark ? _mix(ground, accent, 0.33) : ink,
        park: dark ? _mix(ground, accent, 0.47) : ink,
        road: dark ? _mix(ground, accent, 0.47) : ink,
        casing: ink,
        major: ink,
        majorCasing: ink,
        label: ink,
        glass: dark ? accent : chip,
        glassEdge: dark ? accent : chip,
        ink: dark ? chip : white,
        pin: dark ? chip : accent,
        pinInk: dark ? accent : chip,
        edge: chip,
      );
    case StudioMapStyle.lens:
      return dark
          ? _Palette(
              land: land ?? const Color(0xFF10172B),
              water: const Color(0xFF0C1F3A),
              park: const Color(0xFF122223),
              road: const Color(0xFF1D2742),
              casing: const Color(0xFF1D2742),
              major: const Color(0xFF2A3760),
              majorCasing: const Color(0xFF2A3760),
              label: const Color(0xFF8D96B0),
              glass: const Color.fromRGBO(16, 23, 43, 0.8),
              glassEdge: const Color.fromRGBO(255, 255, 255, 0.12),
              ink: const Color(0xFFF1F2F7),
              pin: accent,
              pinInk: chip,
              edge: const Color(0xFF0A0F1E),
            )
          : _Palette(
              land: land ?? const Color(0xFFEBEDF2),
              water: const Color(0xFFD3DCEA),
              park: const Color(0xFFDDE6D6),
              road: const Color(0xFFD2D7E2),
              casing: const Color(0xFFD2D7E2),
              major: const Color(0xFFB3BBCD),
              majorCasing: const Color(0xFFB3BBCD),
              label: const Color(0xFF4A5268),
              glass: const Color.fromRGBO(255, 255, 255, 0.86),
              glassEdge: white,
              ink: const Color(0xFF141B2E),
              pin: chip,
              pinInk: accent,
              edge: const Color(0xFF1C2541),
            );
    case null:
      // The plain map's own colours (studio_covers.dart).
      return dark
          ? _Palette(
              land: land ?? const Color(0xFF151B2B),
              water: const Color(0xFF1F3550),
              park: const Color(0xFF1B2A26),
              road: const Color(0xFF262E44),
              casing: const Color(0xFF262E44),
              major: const Color(0xFF262E44),
              majorCasing: const Color(0xFF262E44),
              label: const Color(0xFF8C93A8),
              glass: const Color.fromRGBO(16, 23, 43, 0.8),
              glassEdge: const Color.fromRGBO(255, 255, 255, 0.12),
              ink: const Color(0xFFF1F2F7),
              pin: accent,
              pinInk: chip,
              edge: const Color(0xFF151B2B),
            )
          : _Palette(
              land: land ?? const Color(0xFFECE8DF),
              water: const Color(0xFFBCD7E2),
              park: const Color(0xFFD7E4CB),
              road: white,
              casing: white,
              major: white,
              majorCasing: white,
              label: const Color(0xFF6B6A60),
              glass: const Color.fromRGBO(255, 255, 255, 0.86),
              glassEdge: white,
              ink: const Color(0xFF141B2E),
              pin: chip,
              pinInk: accent,
              edge: const Color(0xFFECE8DF),
            );
  }
}

// ---------------------------------------------------------------------------
// Geometry (as lib/studio/map-looks.ts).

const _naturalWater =
    'M 30 0 C 60 246 20 517 70 739 C 100 862 120 936 140 1000 L 330 1000 '
    'C 300 887 268 788 262 690 C 254 517 250 246 232 0 Z';
const _naturalIsland =
    'M 96 111 C 150 74 205 135 214 271 C 222 406 226 567 200 690 '
    'C 180 751 120 739 104 640 C 86 517 70 369 72 246 C 74 172 80 129 96 111 Z';
const _naturalParks = <List<double>>[
  [96, 409, 56, 96, 18],
  [292, 207, 66, 57, 14],
  [128, 579, 58, 49, 14],
];
const _naturalStreets = [
  'M 150 118 C 156 271 160 493 160 722',
  'M 92 185 L 206 204',
  'M 88 308 L 214 293',
  'M 100 640 L 204 616',
  'M 292 0 L 300 1000',
  'M 340 0 L 344 1000',
  'M 254 185 L 375 172',
  'M 256 291 L 375 278',
  'M 262 443 L 375 433',
  'M 266 616 L 375 606',
  'M 14 0 L 20 1000',
];
const _naturalAvenues = [
  'M 0 392 L 375 347',
  'M 0 557 L 375 493',
  'M 40 825 L 375 751',
];

const _inkWater =
    'M 0 0 L 84 0 C 100 268 66 558 96 759 C 108 848 112 915 118 1000 '
    'L 0 1000 Z';
const _inkShore = 'M 84 0 C 100 268 66 558 96 759 C 108 848 112 915 118 1000';
const _inkParks = <List<double>>[
  [148, 129, 64, 98, 10],
  [262, 670, 44, 143, 10],
];
const _inkStreets = [
  'M 236 527 L 375 335',
  'M 236 527 L 375 737',
  'M 236 527 L 236 0',
  'M 236 527 L 236 1000',
  'M 236 527 L 104 393',
  'M 236 527 L 120 737',
  'M 100 205 L 375 188',
  'M 112 866 L 375 848',
  'M 150 0 L 168 1000',
  'M 280 0 L 280 268',
];
const _inkAvenues = [
  'M 98 0 C 114 268 80 558 110 759 C 122 848 126 915 132 1000',
  'M 326 0 L 330 1000',
];

const _lensRiver =
    'M 0 214 C 70 196 120 236 170 276 C 200 300 220 312 236 320 L 168 320 '
    'C 130 290 80 252 0 250 Z';
const _lensStreets = [
  'M 0 40 L 320 70',
  'M 0 120 L 320 132',
  'M 0 180 L 320 176',
  'M 60 0 L 40 320',
  'M 120 0 L 112 210',
  'M 200 0 L 214 300',
  'M 268 0 L 290 320',
  'M 30 300 L 300 230',
];
const _lensAvenues = [
  'M 0 196 C 70 178 124 214 178 254 C 210 278 236 296 262 320',
  'M 150 0 L 168 160 L 176 320',
];

const _horizonWater =
    'M 160 0 C 240 320 120 640 200 1000 L 340 1000 C 260 640 380 320 300 0 Z';
const _horizonIsland =
    'M 214 250 C 262 300 280 420 252 540 C 232 604 202 566 198 480 '
    'C 192 400 192 300 214 250 Z';
const _horizonParks = <List<double>>[
  [680, 290, 96, 110, 22],
  [470, 590, 120, 84, 20],
  [40, 380, 80, 120, 20],
];
const _horizonStreets = [
  'M 450 0 L 450 1000',
  'M 630 0 L 630 1000',
  'M 810 0 L 810 1000',
  'M 350 120 L 900 120',
  'M 350 260 L 900 260',
  'M 340 560 L 900 560',
  'M 340 700 L 900 700',
  'M 340 820 L 900 820',
  'M 350 960 L 900 960',
  'M 60 0 L 70 1000',
  'M 0 240 L 170 250',
  'M 0 660 L 150 650',
];
const _horizonAvenues = [
  'M 322 0 C 402 320 282 640 362 1000',
  'M 0 470 L 900 430',
  'M 0 790 L 900 742',
];
const _tilt = 58 * math.pi / 180;
const _distance = 600.0;

/// A path's points: M and L take one, C three (control, control, end).
List<(String, List<Offset>)> _ops(String d) {
  final t = d.split(RegExp(r'[\s,]+')).where((s) => s.isNotEmpty).toList();
  final out = <(String, List<Offset>)>[];
  var i = 0;
  Offset at(int k) => Offset(double.parse(t[k]), double.parse(t[k + 1]));
  while (i < t.length) {
    final op = t[i++];
    switch (op) {
      case 'M' || 'L':
        out.add((op, [at(i)]));
        i += 2;
      case 'C':
        out.add((op, [at(i), at(i + 2), at(i + 4)]));
        i += 6;
      default:
        out.add(('Z', const []));
    }
  }
  return out;
}

/// A path in thousandths of the frame's height, for a frame [height] high.
Path _fit(String d, double height) {
  Offset y(Offset o) => Offset(o.dx, o.dy * height / 1000);
  final path = Path();
  for (final (op, pts) in _ops(d)) {
    switch (op) {
      case 'M':
        path.moveTo(y(pts[0]).dx, y(pts[0]).dy);
      case 'L':
        path.lineTo(y(pts[0]).dx, y(pts[0]).dy);
      case 'C':
        final a = y(pts[0]), b = y(pts[1]), c = y(pts[2]);
        path.cubicTo(a.dx, a.dy, b.dx, b.dy, c.dx, c.dy);
      default:
        path.close();
    }
  }
  return path;
}

/// The points along a path, each curve in 16 steps, one list per M.
List<List<Offset>> _sample(String d) {
  final out = <List<Offset>>[];
  var line = <Offset>[];
  for (final (op, pts) in _ops(d)) {
    if (op == 'M') {
      if (line.isNotEmpty) out.add(line);
      line = [pts[0]];
    } else if (op == 'L') {
      line.add(pts[0]);
    } else if (op == 'C') {
      final p0 = line.isEmpty ? Offset.zero : line.last;
      for (var k = 1; k <= 16; k++) {
        final t = k / 16, u = 1 - t;
        line.add(
          p0 * (u * u * u) +
              pts[0] * (3 * u * u * t) +
              pts[1] * (3 * u * t * t) +
              pts[2] * (t * t * t),
        );
      }
    }
  }
  if (line.isNotEmpty) out.add(line);
  return out;
}

List<Offset> _roundedRect(List<double> r) {
  final [x, y, w, h, rad] = r;
  final out = <Offset>[];
  for (final (cx, cy, from) in [
    (x + w - rad, y + rad, -90.0),
    (x + w - rad, y + h - rad, 0.0),
    (x + rad, y + h - rad, 90.0),
    (x + rad, y + rad, 180.0),
  ]) {
    for (var k = 0; k <= 4; k++) {
      final a = (from + k * 90 / 4) * math.pi / 180;
      out.add(Offset(cx + rad * math.cos(a), cy + rad * math.sin(a)));
    }
  }
  return out;
}

/// A line [width] wide along [points], as the outline of a band.
List<Offset> _band(List<Offset> points, double width) {
  final half = width / 2;
  final left = <Offset>[], right = <Offset>[];
  for (var i = 0; i < points.length; i++) {
    final a = points[math.max(0, i - 1)];
    final b = points[math.min(points.length - 1, i + 1)];
    final d = b - a;
    final len = d.distance == 0 ? 1.0 : d.distance;
    final n = Offset(-d.dy / len, d.dx / len) * half;
    left.add(points[i] + n);
    right.add(points[i] - n);
  }
  return [...left, ...right.reversed];
}

/// 129.22 Where a point of the horizon's plane (900 × 1000) is seen in a
/// frame 375 wide and [height] high.
Offset _horizonPoint(Offset uv, double height) {
  final dx = uv.dx - 450;
  final dy = uv.dy - 1000;
  final z = dy * math.sin(_tilt);
  final f = _distance / (_distance - z);
  return Offset(187.5 + dx * f, (height + dy * math.cos(_tilt)) * f);
}

/// 129.22 How near a spot [y] down the frame is on the plane (1 at its
/// foot).
double _horizonDepth(double y, double height) {
  final dy =
      _distance *
      (y - height) /
      (_distance * math.cos(_tilt) + y * math.sin(_tilt));
  return _distance / (_distance - dy * math.sin(_tilt));
}

/// 129.23 The lens's box: as wide as fits, at the element's foot.
Rect _lensBox(double w, double h) {
  final size = math.max(120.0, math.min(w - 48, h - 20));
  return Rect.fromLTWH((w - size) / 2, h - 10 - size, size, size);
}

/// A line through [points] with its corners rounded.
Path _roundedLine(List<Offset> points, {double radius = 18}) {
  final path = Path();
  if (points.length < 2) return path;
  path.moveTo(points.first.dx, points.first.dy);
  for (var i = 1; i < points.length - 1; i++) {
    final prev = points[i - 1], at = points[i], next = points[i + 1];
    final a = (at - prev).distance, b = (next - at).distance;
    final r = math.min(radius, math.min(a / 2, b / 2));
    final s = a == 0 ? at : at + (prev - at) / a * r;
    final e = b == 0 ? at : at + (next - at) / b * r;
    path
      ..lineTo(s.dx, s.dy)
      ..quadraticBezierTo(at.dx, at.dy, e.dx, e.dy);
  }
  path.lineTo(points.last.dx, points.last.dy);
  return path;
}

/// The point [share] (0 to 1) of the way along [points], its heading in
/// degrees and the segment it is on.
({Offset at, double heading, int index}) _along(
  List<Offset> points,
  double share,
) {
  final lens = [
    for (var i = 1; i < points.length; i++)
      (points[i] - points[i - 1]).distance,
  ];
  final total = lens.fold<double>(0, (a, b) => a + b);
  var left = share.clamp(0.0, 1.0) * total;
  for (var i = 0; i < lens.length; i++) {
    final a = points[i], b = points[i + 1];
    if (left <= lens[i] || i == lens.length - 1) {
      final t = lens[i] == 0 ? 0.0 : math.min(1.0, left / lens[i]);
      final d = b - a;
      return (
        at: a + d * t,
        heading: math.atan2(d.dy, d.dx) * 180 / math.pi,
        index: i,
      );
    }
    left -= lens[i];
  }
  return (at: points.last, heading: 0, index: math.max(0, points.length - 2));
}

/// A dashed copy of [path]: [on] drawn, [off] left out, from its start.
Path _dashed(Path path, double on, double off) {
  final out = Path();
  for (final metric in path.computeMetrics()) {
    var d = 0.0;
    while (d < metric.length) {
      out.addPath(
        metric.extractPath(d, math.min(d + on, metric.length)),
        Offset.zero,
      );
      d += on + off;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The ground.

class _GroundPainter extends CustomPainter {
  const _GroundPainter({
    required this.style,
    required this.p,
    required this.rtl,
    required this.accent,
  });

  final StudioMapStyle? style;
  final _Palette p;
  final bool rtl;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    if (style == null) {
      _plain(canvas, size);
      canvas.restore();
      return;
    }
    final s = size.width / 375;
    final height = size.height / s;
    canvas.scale(s);
    if (rtl) {
      canvas
        ..translate(375, 0)
        ..scale(-1, 1);
    }
    final fill = Paint();
    canvas.drawRect(Rect.fromLTWH(0, 0, 375, height), fill..color = p.land);
    switch (style!) {
      case StudioMapStyle.natural:
        _natural(canvas, height);
      case StudioMapStyle.twoInk:
        _twoInk(canvas, height);
      case StudioMapStyle.horizon:
        _horizon(canvas, height);
      case StudioMapStyle.lens:
        break;
    }
    canvas.restore();
  }

  Paint _stroke(Color color, double width) => Paint()
    ..color = color
    ..style = PaintingStyle.stroke
    ..strokeWidth = width
    ..strokeCap = StrokeCap.round;

  void _strokes(Canvas c, List<String> list, double h, Color color, double w) {
    for (final d in list) {
      c.drawPath(_fit(d, h), _stroke(color, w));
    }
  }

  RRect _park(List<double> r, double h) => RRect.fromRectAndRadius(
    Rect.fromLTWH(r[0], r[1] * h / 1000, r[2], r[3] * h / 1000),
    Radius.circular(r[4]),
  );

  void _natural(Canvas c, double h) {
    c
      ..drawPath(_fit(_naturalWater, h), Paint()..color = p.water)
      ..drawPath(_fit(_naturalIsland, h), Paint()..color = p.land);
    for (final r in _naturalParks) {
      c.drawRRect(_park(r, h), Paint()..color = p.park);
    }
    _strokes(c, _naturalStreets, h, p.casing, 7);
    _strokes(c, _naturalStreets, h, p.road, 5);
    _strokes(c, _naturalAvenues, h, p.majorCasing, 13);
    _strokes(c, _naturalAvenues, h, p.major, 9);
  }

  /// Dots 5 apart, in the parks' ink, inside [clip].
  void _dots(Canvas c, Path clip, Rect bounds) {
    c
      ..save()
      ..clipPath(clip);
    final dot = Paint()..color = p.park;
    for (var x = (bounds.left / 5).floor() * 5.0; x < bounds.right; x += 5) {
      for (var y = (bounds.top / 5).floor() * 5.0; y < bounds.bottom; y += 5) {
        c.drawCircle(Offset(x + 2.5, y + 2.5), 1.05, dot);
      }
    }
    c.restore();
  }

  void _twoInk(Canvas c, double h) {
    // Hatched water: stripes 1.6 wide every 6, at 45°.
    final water = _fit(_inkWater, h);
    c
      ..save()
      ..clipPath(water);
    final stripe = Paint()
      ..color = p.water
      ..strokeWidth = 1.6;
    for (var k = 0; k < 200; k++) {
      final v = (0.8 + 6 * k) * math.sqrt2;
      if (v - h > 400) break;
      c.drawLine(Offset(v, 0), Offset(v - h - 20, h + 20), stripe);
    }
    c.restore();
    c.drawPath(_fit(_inkShore, h), _stroke(p.road, 1.5));
    for (final r in _inkParks) {
      final rr = _park(r, h);
      _dots(c, Path()..addRRect(rr), rr.outerRect);
    }
    _strokes(c, _inkStreets, h, p.road, 2.2);
    _strokes(c, _inkAvenues, h, p.major, 6);
    final at = Offset(236, 527 * h / 1000);
    c
      ..drawCircle(at, 28, Paint()..color = p.land)
      ..drawCircle(at, 28, _stroke(p.major, 5));
    final inner = Rect.fromCircle(center: at, radius: 14);
    _dots(c, Path()..addOval(inner), inner);
  }

  void _horizon(Canvas c, double h) {
    c.drawRect(Rect.fromLTWH(0, 0, 375, h), Paint()..color = p.edge);
    void poly(List<Offset> pts, Color color) {
      final path = Path()
        ..addPolygon([for (final q in pts) _horizonPoint(q, h)], true);
      c.drawPath(path, Paint()..color = color);
    }

    poly(const [
      Offset(0, 0),
      Offset(900, 0),
      Offset(900, 1000),
      Offset(0, 1000),
    ], p.land);
    for (final pts in _sample(_horizonWater)) {
      poly(pts, p.water);
    }
    for (final pts in _sample(_horizonIsland)) {
      poly(pts, p.land);
    }
    for (final r in _horizonParks) {
      poly(_roundedRect(r), p.park);
    }
    void lines(List<String> list, Color color, double width) {
      for (final d in list) {
        for (final pts in _sample(d)) {
          poly(_band(pts, width), color);
        }
      }
    }

    lines(_horizonStreets, p.casing, 12);
    lines(_horizonStreets, p.road, 8);
    lines(_horizonAvenues, p.majorCasing, 22);
    lines(_horizonAvenues, p.major, 15);
  }

  /// 128's plain map, as studio_covers.dart draws it.
  void _plain(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = p.land);
    final s = math.max(size.width / 375, size.height / 470);
    canvas
      ..translate((size.width - 375 * s) / 2, (size.height - 470 * s) / 2)
      ..scale(s);
    if (rtl) {
      canvas
        ..translate(375, 0)
        ..scale(-1, 1);
    }
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

    rect(const Rect.fromLTWH(150, -40, 70, 560), p.water, turn: 18);
    rect(const Rect.fromLTWH(-20, 120, 420, 12), p.road, turn: -8);
    rect(const Rect.fromLTWH(-20, 300, 420, 12), p.road, turn: 6);
    rect(const Rect.fromLTWH(70, -20, 10, 520), p.road);
    rect(const Rect.fromLTWH(290, -20, 10, 520), p.road);
    rect(const Rect.fromLTWH(40, 190, 80, 70), p.park, round: 12);
    rect(const Rect.fromLTWH(240, 30, 90, 60), p.park, round: 12);
  }

  @override
  bool shouldRepaint(_GroundPainter old) =>
      old.style != style ||
      old.rtl != rtl ||
      old.p.land != p.land ||
      old.p.water != p.water ||
      old.accent != accent;
}

/// 129.23 The checker band at a two-ink map's foot: squares of 8.
class _CheckerPainter extends CustomPainter {
  const _CheckerPainter({required this.first, required this.second});

  final Color first, second;

  @override
  void paint(Canvas canvas, Size size) {
    final a = Paint()..color = first, b = Paint()..color = second;
    for (var col = 0; col * 8.0 < size.width; col++) {
      for (var row = 0; row * 8.0 < size.height; row++) {
        canvas.drawRect(
          Rect.fromLTWH(col * 8.0, row * 8.0, 8, 8),
          (col + row).isEven ? a : b,
        );
      }
    }
  }

  @override
  bool shouldRepaint(_CheckerPainter old) =>
      old.first != first || old.second != second;
}

// ---------------------------------------------------------------------------
// The lens.

class _Lens extends StatelessWidget {
  const _Lens({
    required this.p,
    required this.dark,
    required this.accent,
    required this.chip,
    required this.rtl,
    required this.turn,
  });

  final _Palette p;
  final bool dark;
  final Color accent, chip;
  final bool rtl;
  final Animation<double> turn;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) {
        final size = box.maxWidth;
        return DecoratedBox(
          key: const ValueKey('studio-map-lens'),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: dark
                ? [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.18),
                      spreadRadius: 1,
                    ),
                    BoxShadow(
                      color: accent.withValues(alpha: 0.04),
                      spreadRadius: 10,
                    ),
                    BoxShadow(
                      color: accent.withValues(alpha: 0.1),
                      blurRadius: 60,
                    ),
                  ]
                : [
                    BoxShadow(
                      color: chip.withValues(alpha: 0.1),
                      spreadRadius: 1,
                    ),
                    BoxShadow(
                      color: chip.withValues(alpha: 0.04),
                      spreadRadius: 10,
                    ),
                    BoxShadow(
                      color: chip.withValues(alpha: 0.16),
                      blurRadius: 48,
                      offset: const Offset(0, 24),
                    ),
                  ],
          ),
          child: ClipOval(
            child: Stack(
              fit: StackFit.expand,
              children: [
                CustomPaint(
                  painter: _LensPainter(p: p, rtl: rtl),
                ),
                AnimatedBuilder(
                  animation: turn,
                  builder: (context, child) => Transform.rotate(
                    angle: turn.value * 2 * math.pi,
                    child: child,
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: SweepGradient(
                            colors: [
                              accent.withValues(alpha: 0),
                              accent.withValues(alpha: 0),
                              accent.withValues(alpha: dark ? 0.26 : 0.34),
                            ],
                            stops: const [0, 290 / 360, 1],
                            // CSS's conic gradient starts at the top; this
                            // one at the right.
                            transform: const GradientRotation(
                              (50 - 90) * math.pi / 180,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: size / 2 - 1,
                        top: size / 2 - 146 / 320 * size,
                        width: 2,
                        height: 146 / 320 * size,
                        child: Transform.rotate(
                          angle: 50 * math.pi / 180,
                          alignment: Alignment.bottomCenter,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [
                                  accent.withValues(alpha: 0.9),
                                  accent.withValues(alpha: 0),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                CustomPaint(
                  painter: _RingsPainter(
                    color: dark
                        ? accent.withValues(alpha: 0.34)
                        : chip.withValues(alpha: 0.32),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _LensPainter extends CustomPainter {
  const _LensPainter({required this.p, required this.rtl});

  final _Palette p;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 320;
    canvas
      ..save()
      ..scale(s);
    if (rtl) {
      canvas
        ..translate(320, 0)
        ..scale(-1, 1);
    }
    canvas
      ..drawRect(const Rect.fromLTWH(0, 0, 320, 320), Paint()..color = p.land)
      // The river and the park are in a 320 square (y as it is, not in
      // thousandths): fit to 1000 keeps them.
      ..drawPath(_fit(_lensRiver, 1000), Paint()..color = p.water)
      ..drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(212, 60, 64, 46),
          const Radius.circular(12),
        ),
        Paint()..color = p.park,
      );
    Paint stroke(Color c, double w) => Paint()
      ..color = c
      ..style = PaintingStyle.stroke
      ..strokeWidth = w
      ..strokeCap = StrokeCap.round;
    for (final d in _lensStreets) {
      canvas.drawPath(_fit(d, 1000), stroke(p.road, 2));
    }
    for (final d in _lensAvenues) {
      canvas.drawPath(_fit(d, 1000), stroke(p.major, 5));
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_LensPainter old) =>
      old.p.land != p.land || old.rtl != rtl;
}

/// The lens's dashed 1, 3 and 5 minute rings.
class _RingsPainter extends CustomPainter {
  const _RingsPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 320;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (final r in const [50.0, 98.0, 146.0]) {
      final ring = Path()
        ..addOval(
          Rect.fromCircle(center: size.center(Offset.zero), radius: r * s),
        );
      canvas.drawPath(_dashed(ring, 4 * s, 4 * s), paint);
    }
  }

  @override
  bool shouldRepaint(_RingsPainter old) => old.color != color;
}

// ---------------------------------------------------------------------------
// What is on the map.

Widget _centered({required Offset at, required Widget child, Key? key}) =>
    Positioned(
      key: key,
      left: at.dx,
      top: at.dy,
      child: FractionalTranslation(
        translation: const Offset(-0.5, -0.5),
        child: child,
      ),
    );

/// Words with their start at [at] (their end, right to left).
Widget _label({
  required Offset at,
  required String text,
  required bool rtl,
  required TextStyle style,
  Key? key,
}) => Positioned(
  key: key,
  left: at.dx,
  top: at.dy,
  child: FractionalTranslation(
    translation: Offset(rtl ? -1 : 0, -0.5),
    child: Text(text.toUpperCase(), maxLines: 1, softWrap: false, style: style),
  ),
);

Positioned _round(
  Offset at,
  double d, {
  Color? color,
  BoxBorder? border,
  List<BoxShadow>? shadow,
  Widget? child,
}) => Positioned(
  left: at.dx - d / 2,
  top: at.dy - d / 2,
  width: d,
  height: d,
  child: Container(
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: color,
      shape: BoxShape.circle,
      border: border,
      boxShadow: shadow,
    ),
    child: child,
  ),
);

/// The outer halo's breath: a little bigger and fainter, and back (still
/// with reduced motion).
Widget _breathing(Animation<double> pulse, Positioned halo) {
  if (pulse is AlwaysStoppedAnimation) return halo;
  return Positioned(
    left: halo.left,
    top: halo.top,
    width: halo.width,
    height: halo.height,
    child: AnimatedBuilder(
      animation: pulse,
      child: halo.child,
      builder: (context, child) => Opacity(
        opacity: 1 - 0.6 * pulse.value,
        child: Transform.scale(scale: 0.85 + 0.3 * pulse.value, child: child),
      ),
    ),
  );
}

Widget _marker({
  required Offset at,
  required int i,
  required StudioMapMarker look,
  required StudioMapDrawing drawing,
  required bool dark,
  required Color accent,
  required Color chip,
  required _Palette p,
  required String sign,
  required double depth,
  Key? key,
}) {
  final heading = _headings[i % _headings.length] * math.pi / 180;
  final icon = symbolByName(drawing.icon ?? 'local_taxi');
  Widget placed(double w, double h, Widget child) => Positioned(
    key: key,
    left: at.dx - w / 2,
    top: at.dy - h / 2,
    width: w,
    height: h,
    child: child,
  );
  switch (look) {
    case StudioMapMarker.car:
      final body = dark ? _mix(chip, Colors.white, 0.8) : chip;
      final glass = dark ? chip : _mix(chip, Colors.white, 0.65);
      Widget car = Transform.rotate(
        angle: heading,
        child: Container(
          decoration: BoxDecoration(
            color: body,
            borderRadius: BorderRadius.circular(6),
            boxShadow: const [
              BoxShadow(
                color: Color(0x40000000),
                blurRadius: 6,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: Stack(
            children: [
              Positioned(
                left: 3,
                right: 3,
                top: 5,
                height: 6,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: glass,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Positioned(
                left: 3,
                right: 3,
                bottom: 4,
                height: 3,
                child: Opacity(
                  opacity: 0.7,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: glass,
                      borderRadius: BorderRadius.circular(1),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
      // On the horizon a car lies on the tilted ground.
      if (drawing.style == StudioMapStyle.horizon) {
        car = Transform(
          alignment: Alignment.center,
          transform: Matrix4.diagonal3Values(depth, depth * 0.55, 1),
          child: car,
        );
      }
      return placed(15, 27, car);
    case StudioMapMarker.sign:
      return placed(
        34,
        20,
        Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: dark ? accent : chip,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(9),
              bottom: Radius.circular(4),
            ),
            boxShadow: [
              BoxShadow(
                color: dark
                    ? const Color(0x73000000)
                    : chip.withValues(alpha: 0.25),
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Text(
            sign,
            maxLines: 1,
            overflow: TextOverflow.clip,
            softWrap: false,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: dark ? chip : accent,
              height: 1,
            ),
          ),
        ),
      );
    case StudioMapMarker.token:
      return Positioned(
        key: key,
        left: at.dx - 34,
        top: at.dy - 13,
        width: 47,
        height: 26,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // The trail behind it, which way it heads.
            Positioned(
              left: 0,
              top: 11,
              width: 34,
              height: 4,
              child: Transform.rotate(
                angle: heading,
                alignment: Alignment.centerRight,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(2),
                    gradient: LinearGradient(
                      colors: [
                        accent.withValues(alpha: 0),
                        accent.withValues(alpha: 0.75),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 21,
              top: 0,
              width: 26,
              height: 26,
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                  border: Border.all(color: p.edge, width: 2),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x38000000),
                      blurRadius: 10,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Icon(icon, size: 14, color: chip, fill: 1),
              ),
            ),
          ],
        ),
      );
    case StudioMapMarker.tile:
      return placed(
        34,
        34,
        Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: chip,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: accent, width: 2),
          ),
          child: Icon(icon, size: 18, color: accent, fill: 1),
        ),
      );
  }
}

/// The person's own dot in the style's look.
List<Widget> _me(
  Offset at, {
  required StudioMapStyle? style,
  required bool dark,
  required Color ink,
  required Color accent,
  required Color chip,
  required _Palette p,
  required Animation<double> pulse,
}) {
  Positioned oval(double w, double h, Color color) => Positioned(
    left: at.dx - w / 2,
    top: at.dy - h / 2,
    width: w,
    height: h,
    child: DecoratedBox(
      decoration: ShapeDecoration(color: color, shape: const OvalBorder()),
    ),
  );
  final shadow = [
    const BoxShadow(
      color: Color(0x40000000),
      blurRadius: 10,
      offset: Offset(0, 4),
    ),
  ];
  final parts = switch (style) {
    StudioMapStyle.natural => [
      _breathing(pulse, _round(at, 80, color: ink.withValues(alpha: 0.14))),
      _round(at, 44, color: ink.withValues(alpha: 0.14)),
      _round(
        at,
        22,
        color: ink,
        border: Border.all(
          color: dark ? const Color(0xFF04201D) : Colors.white,
          width: 4,
        ),
        shadow: shadow,
      ),
    ],
    StudioMapStyle.horizon => [
      _breathing(pulse, oval(110, 36, ink.withValues(alpha: 0.16))),
      oval(54, 18, ink.withValues(alpha: 0.16)),
      oval(16, 10, ink),
    ],
    StudioMapStyle.twoInk => [
      _round(
        at,
        64,
        border: Border.all(color: p.major.withValues(alpha: 0.35), width: 2),
      ),
      _round(
        at,
        32,
        color: dark ? const Color(0xFFF1F2F7) : Colors.white,
        border: Border.all(color: dark ? accent : chip, width: 6),
        shadow: shadow,
      ),
    ],
    StudioMapStyle.lens => [
      _breathing(
        pulse,
        _round(
          at,
          36,
          color: dark
              ? accent.withValues(alpha: 0.2)
              : chip.withValues(alpha: 0.16),
        ),
      ),
      _round(
        at,
        20,
        color: dark ? const Color(0xFFF1F2F7) : chip,
        border: Border.all(color: dark ? accent : Colors.white, width: 4),
      ),
    ],
    null => [
      _round(at, 56, color: accent.withValues(alpha: 0.28)),
      _round(
        at,
        24,
        color: accent,
        border: Border.all(color: Colors.white, width: 4),
      ),
    ],
  };
  return [
    Positioned.fill(
      key: const ValueKey('studio-map-me'),
      child: IgnorePointer(child: Stack(children: parts)),
    ),
  ];
}

/// A labelled pin: a glass pill with a disc and its words.
Widget _place({
  required Offset at,
  required StudioMapPin pin,
  required _Palette p,
  required bool dark,
  required bool rtl,
  Key? key,
}) => Positioned(
  key: key,
  left: rtl ? at.dx + 17 : at.dx - 17,
  top: at.dy - 17,
  child: FractionalTranslation(
    translation: Offset(rtl ? -1 : 0, 0),
    child: Container(
      height: 34,
      padding: const EdgeInsetsDirectional.only(start: 4, end: 12),
      decoration: BoxDecoration(
        color: p.glass,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: p.glassEdge),
        boxShadow: [
          BoxShadow(
            color: dark ? const Color(0x80000000) : const Color(0x290B2422),
            blurRadius: dark ? 40 : 34,
            offset: Offset(0, dark ? 16 : 14),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: p.pin, shape: BoxShape.circle),
            child: Icon(
              symbolByName(pin.icon ?? 'place'),
              size: 16,
              color: p.pinInk,
              fill: 1,
            ),
          ),
          const SizedBox(width: 7),
          Text(
            pin.label,
            maxLines: 1,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: p.ink,
              height: 1.2,
            ),
          ),
        ],
      ),
    ),
  ),
);

/// 129.22 A pin standing on the horizon: a chip on a stem over its shadow,
/// its foot at [at].
List<Widget> _standing({
  required Offset at,
  required double stem,
  required Color bg,
  required Color fg,
  Color? dot,
  IconData? icon,
  required String text,
  required double depth,
}) => [
  Positioned(
    left: at.dx - 18 * depth,
    top: at.dy - 7 * depth,
    width: 36 * depth,
    height: 14 * depth,
    child: DecoratedBox(
      decoration: ShapeDecoration(
        color: bg.withValues(alpha: 0.4),
        shape: const OvalBorder(),
      ),
    ),
  ),
  Positioned(
    left: at.dx - 1,
    top: at.dy - stem,
    width: 2,
    height: stem,
    child: ColoredBox(color: bg),
  ),
  Positioned(
    left: at.dx,
    top: at.dy - stem,
    child: FractionalTranslation(
      translation: const Offset(-0.5, -1),
      child: Container(
        height: 32,
        padding: EdgeInsetsDirectional.only(
          start: icon != null ? 8 : 12,
          end: icon != null ? 11 : 12,
        ),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(
              color: Color(0x38000000),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null)
              Icon(icon, size: 17, color: fg, fill: 1)
            else if (dot != null)
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
              ),
            if (text.isNotEmpty) ...[
              const SizedBox(width: 6),
              Text(
                text,
                maxLines: 1,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: fg,
                  height: 1.2,
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  ),
];

/// A chip of words with its middle bottom at [at].
Widget _chip(Offset at, String text, bool dark) => Positioned(
  left: at.dx,
  top: at.dy,
  child: FractionalTranslation(
    translation: const Offset(-0.5, -1),
    child: Container(
      height: 26,
      constraints: const BoxConstraints(maxWidth: 170),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: dark ? const Color(0xFF15243A) : Colors.white,
        borderRadius: BorderRadius.circular(13),
        boxShadow: [
          BoxShadow(
            color: dark ? const Color(0x99000000) : const Color(0x4D0D1B2A),
            blurRadius: 16,
            spreadRadius: -6,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: dark ? const Color(0xFFEAF1F8) : const Color(0xFF0D1B2A),
                height: 1.2,
              ),
            ),
          ),
        ],
      ),
    ),
  ),
);

/// A route in pixels: its points, where the vehicle is (0 to 1), its chips
/// and the photo of who drives it.
class _Route {
  const _Route({
    required this.points,
    required this.at,
    this.from,
    this.to,
    this.eta,
    this.photo,
  });

  final List<Offset> points;
  final double at;
  final String? from, to, eta, photo;
}

String _short(String address) => address.split(',').first.trim();

/// 130.7 The room a live route is fitted into: around the element's own
/// route's points, at least 96 across and 72 high.
Rect _routeArea(List<Offset> points) {
  final xs = points.map((p) => p.dx), ys = points.map((p) => p.dy);
  final box = Rect.fromLTRB(
    xs.reduce(math.min),
    ys.reduce(math.min),
    xs.reduce(math.max),
    ys.reduce(math.max),
  );
  return Rect.fromCenter(
    center: box.center,
    width: math.max(96, box.width),
    height: math.max(72, box.height),
  );
}

/// 129.24 The person's ride or shipment on its way, fitted into [area]:
/// the driver to the pickup, then the pickup to the drop-off, or the
/// pickup to the drop-off with the courier where the last position says.
_Route? _liveRoute(
  BuildContext context, {
  required Ride? ride,
  required Shipment? shipment,
  required Rect area,
  String? fallbackPhoto,
}) {
  final l10n = context.l10n;
  String first(String name) => name.trim().split(RegExp(r'\s+')).first;
  final places = <({double lat, double lng})>[];
  var vehicle = -1;
  String? from, to, eta, photo;
  if (ride != null) {
    final pickup = ride.pickup, dropoff = ride.dropoff;
    final driver = ride.driverLocation;
    final name = ride.driver == null ? null : first(ride.driver!.name);
    photo = ride.driver?.photoUrl;
    switch (ride.status) {
      case RideStatus.accepted || RideStatus.arrived:
        if (!pickup.located) return null;
        if (driver != null) {
          places.add((lat: driver.lat, lng: driver.lng));
          vehicle = 0;
        }
        places.add((lat: pickup.lat!, lng: pickup.lng!));
        if (vehicle < 0) vehicle = places.length - 1;
        to = l10n.studioMapPickup;
        final minutes = ride.pickupMinutes;
        eta = name == null
            ? (minutes == null ? null : l10n.studioMapMinutes(minutes))
            : (minutes == null ? name : l10n.studioMapEta(name, minutes));
      case RideStatus.inProgress:
        if (!pickup.located || !dropoff.located) return null;
        places.add((lat: pickup.lat!, lng: pickup.lng!));
        if (driver != null) places.add((lat: driver.lat, lng: driver.lng));
        places.add((lat: dropoff.lat!, lng: dropoff.lng!));
        vehicle = driver != null ? 1 : 0;
        from = _short(pickup.address);
        to = _short(dropoff.address);
        eta = name;
      default:
        return null;
    }
  } else if (shipment != null) {
    final pickup = shipment.pickup, dropoff = shipment.dropoff;
    if (!pickup.located || !dropoff.located) return null;
    final courier = shipment.courierPosition;
    places.add((lat: pickup.lat!, lng: pickup.lng!));
    if (courier != null) places.add((lat: courier.lat, lng: courier.lng));
    places.add((lat: dropoff.lat!, lng: dropoff.lng!));
    vehicle = courier != null ? 1 : 0;
    from = _short(pickup.address);
    final name = shipment.courierName;
    eta = name == null || name.isEmpty ? null : first(name);
  } else {
    return null;
  }
  if (places.isEmpty) return null;
  // Kilometres east and south of the places' middle, fitted into the area
  // (at least 0.8 km across, so close places don't fill the map).
  final lat0 = places.map((p) => p.lat).reduce((a, b) => a + b) / places.length;
  final lng0 = places.map((p) => p.lng).reduce((a, b) => a + b) / places.length;
  final cos = math.cos(lat0 * math.pi / 180);
  final km = [
    for (final p in places)
      Offset((p.lng - lng0) * 111.32 * cos, (lat0 - p.lat) * 110.57),
  ];
  final xs = km.map((o) => o.dx), ys = km.map((o) => o.dy);
  final spanX = math.max(0.8, xs.reduce(math.max) - xs.reduce(math.min));
  final spanY = math.max(0.8, ys.reduce(math.max) - ys.reduce(math.min));
  final scale = math.min(area.width / spanX, area.height / spanY);
  final mid = Offset(
    (xs.reduce(math.max) + xs.reduce(math.min)) / 2,
    (ys.reduce(math.max) + ys.reduce(math.min)) / 2,
  );
  final points = [for (final o in km) area.center + (o - mid) * scale];
  if (points.length == 1) points.add(points.first);
  // Where the vehicle is, as a share of the way.
  var done = 0.0, total = 0.0;
  for (var i = 1; i < points.length; i++) {
    final d = (points[i] - points[i - 1]).distance;
    total += d;
    if (i <= vehicle) done += d;
  }
  return _Route(
    points: points,
    at: total == 0 ? 0 : done / total,
    from: from,
    to: to,
    eta: eta,
    photo: photo ?? fallbackPhoto,
  );
}

/// The route: done solid, the rest dashed (on a living map and the
/// horizon, solid with a dotted middle), its ends, chips and vehicle.
List<Widget> _routeParts(
  _Route line, {
  required StudioMapStyle? style,
  required bool dark,
  required Color ink,
  required Color accent,
  required Color chip,
  required _Palette p,
  required bool rtl,
  required Offset? me,
  required IconData icon,
  required String sign,
  required double Function(double y) depthAt,
  required Animation<double> pulse,
  required Animation<double>? drive,
  required Size size,
}) {
  final start = line.points.first, end = line.points.last;
  final meEnd = me != null && (end - me).distance < 12;
  final horizon = style == StudioMapStyle.horizon;
  Widget moving(Widget Function(double share) build) => drive == null
      ? build(line.at)
      : AnimatedBuilder(
          animation: drive,
          builder: (context, _) =>
              build(math.min(1, line.at + (1 - line.at) * drive.value)),
        );
  return [
    Positioned.fill(
      child: moving(
        (share) => CustomPaint(
          key: const ValueKey('studio-map-route'),
          painter: _RoutePainter(
            points: line.points,
            share: share,
            ink: ink,
            dotted: style == StudioMapStyle.natural || horizon,
            dark: dark,
          ),
        ),
      ),
    ),
    if (!horizon)
      _round(
        start,
        24,
        color: ink,
        shadow: [
          BoxShadow(
            color: dark
                ? const Color.fromRGBO(8, 17, 28, 0.9)
                : const Color.fromRGBO(255, 255, 255, 0.9),
            spreadRadius: 4,
          ),
        ],
        child: Container(
          width: 8,
          height: 8,
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
          ),
        ),
      ),
    if (!meEnd && !horizon)
      Positioned(
        key: const ValueKey('studio-map-end'),
        left: end.dx - 20,
        top: end.dy - 38,
        width: 40,
        height: 40,
        child: Icon(
          symbolByName('location_on'),
          size: 40,
          color: accent,
          fill: 1,
          shadows: const [
            Shadow(
              color: Color(0x4D000000),
              blurRadius: 8,
              offset: Offset(0, 6),
            ),
          ],
        ),
      ),
    if (line.from case final from? when from.isNotEmpty)
      if (horizon)
        ..._standing(
          at: start,
          stem: 28,
          bg: p.glass,
          fg: p.ink,
          dot: p.pin,
          text: from,
          depth: depthAt(start.dy),
        )
      else
        _chip(start - const Offset(0, 18), from, dark),
    if (line.to case final to? when to.isNotEmpty)
      if (horizon)
        ..._standing(
          at: end,
          stem: 28,
          bg: p.glass,
          fg: p.ink,
          dot: p.pin,
          text: to,
          depth: depthAt(end.dy),
        )
      else
        _chip(end - Offset(0, meEnd ? 22 : 44), to, dark),
    Positioned.fill(
      key: const ValueKey('studio-map-vehicle'),
      child: moving((share) {
        final at = _along(line.points, share);
        return Stack(
          clipBehavior: Clip.none,
          children: _vehicle(
            at.at,
            heading: at.heading,
            style: style,
            dark: dark,
            accent: accent,
            chip: chip,
            ink: ink,
            p: p,
            icon: icon,
            photo: line.photo,
            eta: line.eta,
            rtl: rtl,
            sign: sign,
            depth: depthAt(at.at.dy),
            pulse: pulse,
          ),
        );
      }),
    ),
  ];
}

List<Widget> _vehicle(
  Offset at, {
  required double heading,
  required StudioMapStyle? style,
  required bool dark,
  required Color accent,
  required Color chip,
  required Color ink,
  required _Palette p,
  required IconData icon,
  required String? photo,
  required String? eta,
  required bool rtl,
  required String sign,
  required double depth,
  required Animation<double> pulse,
}) {
  if (style == StudioMapStyle.horizon) {
    return _standing(
      at: at,
      stem: 40,
      bg: accent,
      fg: _mix(accent, Colors.black, 0.8),
      icon: icon,
      text: eta ?? '',
      depth: depth,
    );
  }
  final body = switch (style) {
    StudioMapStyle.natural => [
      _breathing(pulse, _round(at, 48, color: accent.withValues(alpha: 0.26))),
      Positioned(
        left: at.dx - 9.5,
        top: at.dy - 16.5,
        width: 19,
        height: 33,
        child: Transform.rotate(
          angle: (heading + 90) * math.pi / 180,
          child: Container(
            decoration: BoxDecoration(
              color: accent,
              borderRadius: BorderRadius.circular(7),
              boxShadow: const [
                BoxShadow(color: Colors.white, spreadRadius: 2),
                BoxShadow(
                  color: Color(0x4D000000),
                  blurRadius: 14,
                  offset: Offset(0, 6),
                ),
              ],
            ),
            child: Align(
              alignment: Alignment.topCenter,
              child: Container(
                margin: const EdgeInsets.fromLTRB(3, 6, 3, 0),
                height: 7,
                decoration: BoxDecoration(
                  color: _mix(accent, Colors.black, 0.62),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
        ),
      ),
    ],
    StudioMapStyle.twoInk => [
      _breathing(
        pulse,
        Positioned(
          left: at.dx - 33,
          top: at.dy - 25,
          width: 66,
          height: 50,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: p.major.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(20),
            ),
          ),
        ),
      ),
      Positioned(
        left: at.dx - 21,
        top: at.dy - 12,
        width: 42,
        height: 24,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: dark ? accent : chip,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(11),
              bottom: Radius.circular(5),
            ),
            boxShadow: [
              BoxShadow(color: dark ? accent : chip, spreadRadius: 4),
              BoxShadow(color: p.land, spreadRadius: 2),
            ],
          ),
          child: Text(
            sign,
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.clip,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
              color: dark ? chip : accent,
              height: 1,
            ),
          ),
        ),
      ),
    ],
    _ => [
      _breathing(pulse, _round(at, 84, color: ink.withValues(alpha: 0.14))),
      _round(at, 56, color: ink.withValues(alpha: 0.14)),
      _round(
        at,
        40,
        color: accent,
        border: Border.all(color: Colors.white, width: 3),
        shadow: const [
          BoxShadow(
            color: Color(0x59000000),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
        child: photo != null
            ? ClipOval(
                child: AppNetworkImage(url: photo, width: 34, height: 34),
              )
            : Icon(icon, size: 20, color: chip, fill: 1),
      ),
    ],
  };
  return [
    ...body,
    if (eta != null && eta.isNotEmpty)
      Positioned(
        left: style == StudioMapStyle.twoInk
            ? at.dx
            : (rtl ? at.dx + 30 : at.dx - 30),
        top: style == StudioMapStyle.twoInk ? at.dy - 20 : at.dy,
        child: FractionalTranslation(
          translation: style == StudioMapStyle.twoInk
              ? const Offset(-0.5, -1)
              : Offset(rtl ? 0 : -1, -0.5),
          child: Container(
            key: const ValueKey('studio-map-eta'),
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: dark ? const Color(0xFFF2F6FA) : const Color(0xFF0D1B2A),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: accent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  eta,
                  maxLines: 1,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: dark ? const Color(0xFF0D1B2A) : Colors.white,
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
  ];
}

class _RoutePainter extends CustomPainter {
  const _RoutePainter({
    required this.points,
    required this.share,
    required this.ink,
    required this.dotted,
    required this.dark,
  });

  final List<Offset> points;
  final double share;
  final Color ink;
  final bool dotted;
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final cut = _along(points, share);
    final done = _roundedLine([...points.sublist(0, cut.index + 1), cut.at]);
    final ahead = _roundedLine([cut.at, ...points.sublist(cut.index + 1)]);
    Paint line(Color c, double w) => Paint()
      ..color = c
      ..style = PaintingStyle.stroke
      ..strokeWidth = w
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas
      ..drawPath(done, line(ink.withValues(alpha: 0.22), 16))
      ..drawPath(done, line(ink, 5));
    if (dotted) {
      canvas
        ..drawPath(ahead, line(ink.withValues(alpha: 0.22), 16))
        ..drawPath(ahead, line(ink, 5))
        ..drawPath(
          _dashed(ahead, 2, 6),
          line(
            dark
                ? const Color.fromRGBO(4, 32, 29, 0.9)
                : const Color.fromRGBO(255, 255, 255, 0.9),
            1.5,
          ),
        );
    } else {
      canvas.drawPath(
        _dashed(ahead, 10, 7),
        line(ink.withValues(alpha: 0.8), 5)..strokeCap = StrokeCap.butt,
      );
    }
  }

  @override
  bool shouldRepaint(_RoutePainter old) =>
      old.share != share ||
      old.ink != ink ||
      old.dark != dark ||
      old.points.length != points.length ||
      !_same(old.points, points);

  static bool _same(List<Offset> a, List<Offset> b) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
