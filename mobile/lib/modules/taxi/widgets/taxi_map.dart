import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/taxi_providers.dart';

/// 105.9 Where a ride starts or ends on the taxi map.
enum TaxiPinKind { from, to }

class TaxiPin {
  const TaxiPin(this.kind, this.lat, this.lng, {this.label});

  final TaxiPinKind kind;
  final double lat;
  final double lng;

  /// "From: …" or "To: …" above the pin.
  final String? label;
}

/// 105.9 The live taxi map, full screen behind a taxi app's ride screens:
/// the company's tiles, the free taxis turned the way they drive, a car
/// followed or driven, the person's own dot, where from and to, the route
/// and the driver's way to the pickup (dotted). The camera fits [focus]
/// whenever it changes, inside [padding] (the bars and the sheet over it).
class TaxiMapView extends ConsumerStatefulWidget {
  const TaxiMapView({
    super.key,
    required this.map,
    this.focus = const [],
    this.me,
    this.taxis = const [],
    this.car,
    this.pins = const [],
    this.route = const [],
    this.approach = const [],
    this.padding = EdgeInsets.zero,
  });

  final TaxiMap map;
  final List<TaxiSpot> focus;
  final TaxiSpot? me;
  final List<NearbyTaxi> taxis;
  final NearbyTaxi? car;
  final List<TaxiPin> pins;
  final List<TaxiSpot> route;
  final List<TaxiSpot> approach;
  final EdgeInsets padding;

  @override
  ConsumerState<TaxiMapView> createState() => _TaxiMapViewState();
}

/// Where the map opens with nothing to show yet.
const _anywhere = LatLng(30.0444, 31.2357);

LatLng _at(TaxiSpot s) => LatLng(s.lat, s.lng);

class _TaxiMapViewState extends ConsumerState<TaxiMapView> {
  final _controller = MapController();
  late final TileLayer _tiles;
  bool _ready = false;
  double _height = 0;
  double _width = 0;

  @override
  void initState() {
    super.initState();
    // One tile layer for the map's life: the taxis move many times a minute.
    _tiles = TileLayer(
      urlTemplate: widget.map.tilesUrl,
      userAgentPackageName: ref
          .read(appEnvironmentProvider)
          .build
          .androidPackage,
      tileProvider: NetworkTileProvider(silenceExceptions: true),
    );
  }

  @override
  void didUpdateWidget(TaxiMapView old) {
    super.didUpdateWidget(old);
    if (!_same(old.focus, widget.focus)) _fit();
  }

  static bool _same(List<TaxiSpot> a, List<TaxiSpot> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  /// The room around what the camera fits: what the bars and the sheet
  /// cover, kept to a part of the map so a tall sheet can't zoom it out to
  /// the whole world.
  EdgeInsets get _room {
    final h = _height;
    // About half a pin's label each side, so "From:" and "To:" show whole.
    final side = math.min(100.0, _width * 0.3);
    return EdgeInsets.fromLTRB(
      side,
      math.min(widget.padding.top, h * 0.2) + 32,
      side,
      math.min(widget.padding.bottom, h * 0.45) + 32,
    );
  }

  void _fit() {
    final points = widget.focus.map(_at).toList();
    if (!_ready || points.isEmpty) return;
    if (points.length == 1 || points.toSet().length == 1) {
      _controller.move(points.first, 15);
    } else {
      _controller.fitCamera(
        CameraFit.coordinates(coordinates: points, padding: _room, maxZoom: 16),
      );
    }
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      _height = constraints.maxHeight;
      _width = constraints.maxWidth;
      return _map(context);
    },
  );

  Widget _map(BuildContext context) {
    final p = context.palette;
    final focus = widget.focus.map(_at).toList();
    final car = widget.car;
    final me = widget.me;
    return Stack(
      children: [
        FlutterMap(
          key: const ValueKey('taxi-map'),
          mapController: _controller,
          options: MapOptions(
            initialCenter: focus.isNotEmpty
                ? focus.first
                : (me != null ? _at(me) : _anywhere),
            initialZoom: focus.isEmpty && me == null ? 11 : 15,
            initialCameraFit: focus.toSet().length > 1
                ? CameraFit.coordinates(
                    coordinates: focus,
                    padding: _room,
                    maxZoom: 16,
                  )
                : null,
            onMapReady: () => _ready = true,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
            ),
          ),
          children: [
            _tiles,
            if (widget.route.length > 1 || widget.approach.length > 1)
              PolylineLayer(
                key: const ValueKey('taxi-lines'),
                polylines: [
                  if (widget.route.length > 1)
                    Polyline(
                      points: widget.route.map(_at).toList(),
                      color: p.primary,
                      strokeWidth: 5,
                    ),
                  if (widget.approach.length > 1)
                    Polyline(
                      points: widget.approach.map(_at).toList(),
                      color: p.text,
                      strokeWidth: 4,
                      pattern: const StrokePattern.dotted(),
                    ),
                ],
              ),
            MarkerLayer(
              markers: [
                for (final taxi in widget.taxis)
                  if (taxi.driverKey != car?.driverKey)
                    Marker(
                      point: LatLng(taxi.lat, taxi.lng),
                      width: 36,
                      height: 36,
                      child: _CarMarker(
                        key: ValueKey('taxi-taxi-${taxi.driverKey}'),
                        heading: taxi.heading,
                      ),
                    ),
                for (final pin in widget.pins)
                  Marker(
                    point: LatLng(pin.lat, pin.lng),
                    width: 200,
                    height: 64,
                    alignment: Alignment.topCenter,
                    child: _PlacePin(
                      key: ValueKey('taxi-pin-${pin.kind.name}'),
                      pin: pin,
                    ),
                  ),
                if (me != null)
                  Marker(
                    point: _at(me),
                    width: 28,
                    height: 28,
                    child: const _MeDot(key: ValueKey('taxi-me')),
                  ),
                if (car != null)
                  Marker(
                    point: LatLng(car.lat, car.lng),
                    width: 46,
                    height: 46,
                    child: _CarMarker(
                      key: const ValueKey('taxi-car'),
                      heading: car.heading,
                      followed: true,
                    ),
                  ),
              ],
            ),
          ],
        ),
        if (widget.map.attribution != null)
          PositionedDirectional(
            end: 8,
            bottom: widget.padding.bottom + 4,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: p.surface.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                child: Text(
                  widget.map.attribution!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 10, color: p.textSecondary),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// A taxi, turned the way it drives; the followed or driven one larger, on
/// the brand colour.
class _CarMarker extends StatelessWidget {
  const _CarMarker({super.key, this.heading, this.followed = false});

  final double? heading;
  final bool followed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Transform.rotate(
      angle: (heading ?? 0) * math.pi / 180,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: followed ? p.primary : p.surface,
          shape: BoxShape.circle,
          border: Border.all(color: followed ? p.surface : p.border, width: 2),
          boxShadow: const [
            BoxShadow(
              color: Color(0x33000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Center(
          child: AppIcon(
            followed ? AppIcons.car : AppIcons.ride,
            size: followed ? 26 : 20,
            color: followed ? p.onPrimary : p.text,
            filled: true,
          ),
        ),
      ),
    );
  }
}

/// Where the person is.
class _MeDot extends StatelessWidget {
  const _MeDot({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      label: context.l10n.rideMyLocation,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: p.link.withValues(alpha: 0.2),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              color: p.link,
              shape: BoxShape.circle,
              border: Border.all(color: p.surface, width: 3),
            ),
          ),
        ),
      ),
    );
  }
}

/// Where from or to, with its words above.
class _PlacePin extends StatelessWidget {
  const _PlacePin({super.key, required this.pin});

  final TaxiPin pin;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final from = pin.kind == TaxiPinKind.from;
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (pin.label != null)
          Flexible(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: p.surface,
                borderRadius: BorderRadius.circular(10),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x22000000),
                    blurRadius: 6,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Text(
                  pin.label!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ),
          ),
        const SizedBox(height: 4),
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: from ? p.surface : p.text,
            shape: from ? BoxShape.circle : BoxShape.rectangle,
            border: Border.all(color: p.text, width: 4),
          ),
        ),
      ],
    );
  }
}

/// 105.9 The sheet over the map holding a screen's content: [child] scrolls
/// with the sheet's own controller; the handle on top drags it too.
class TaxiSheet extends StatelessWidget {
  const TaxiSheet({
    super.key,
    required this.controller,
    required this.child,
    this.minSize = 0.2,
    this.maxSize = 0.92,
  });

  final DraggableScrollableController controller;
  final Widget child;
  final double minSize;
  final double maxSize;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final height = MediaQuery.sizeOf(context).height;
    return Material(
      color: p.background,
      elevation: 12,
      shadowColor: const Color(0x55000000),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(child: child),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 22,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onVerticalDragUpdate: (d) {
                if (!controller.isAttached || height == 0) return;
                final size = controller.size - (d.primaryDelta ?? 0) / height;
                controller.jumpTo(size.clamp(minSize, maxSize));
              },
              child: Center(
                child: Container(
                  width: 40,
                  height: 5,
                  decoration: BoxDecoration(
                    color: p.border,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 105.9 A small pill over the map ("Live", "Arriving in 4 min").
class TaxiChip extends StatelessWidget {
  const TaxiChip({
    super.key,
    required this.label,
    this.icon,
    this.strong = false,
  });

  final String label;
  final IconData? icon;

  /// On the brand colour.
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = strong ? p.onPrimary : p.text;
    return Material(
      color: strong ? p.primary : p.surface,
      elevation: 3,
      shadowColor: const Color(0x44000000),
      shape: const StadiumBorder(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              AppIcon(icon!, size: 18, color: fg),
              const SizedBox(width: 6),
            ],
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: fg,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 105.9 The app's logo, or its name, in a pill over the map.
class TaxiAppChip extends ConsumerWidget {
  const TaxiAppChip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final build = ref.watch(appEnvironmentProvider).build;
    final gate = ref.watch(appGateProvider);
    final config = gate is GateReady ? gate.config : null;
    final logo =
        config?.appearance?.logoUrl ??
        config?.branding.logoUrl ??
        build.logoUrl;
    return Material(
      key: const ValueKey('taxi-app-chip'),
      color: p.surface,
      elevation: 3,
      shadowColor: const Color(0x44000000),
      shape: const StadiumBorder(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: logo != null
            ? ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 140, maxHeight: 28),
                child: AppNetworkImage(
                  url: logo,
                  height: 28,
                  fit: BoxFit.contain,
                  semanticLabel: build.appName,
                  clearPlaceholder: true,
                ),
              )
            : Text(
                build.appName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
      ),
    );
  }
}

/// 105.9 The picker config for the company's taxi map (choosing a place on
/// the map when search is off or a place isn't found).
DeliveryConfig taxiPickerConfig(TaxiMap map) => DeliveryConfig(
  pricing: DeliveryPricing.distance,
  tracking: DeliveryTracking.live,
  tilesUrl: map.tilesUrl,
  attribution: map.attribution,
);
