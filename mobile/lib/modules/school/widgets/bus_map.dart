import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';

/// 113.10 The bus on the platform's map (`SchoolConfig.map`, as 104's live
/// map): the trip's stops (those reached ticked, the child's own marked) and
/// the bus, all in view. Built only when the tiles are set; without them
/// the screens list the stops.
class BusMap extends ConsumerWidget {
  const BusMap({
    super.key,
    required this.config,
    required this.stops,
    this.bus,
    this.mine,
    this.height = 240,
  });

  final SchoolConfig config;
  final List<BusStop> stops;
  final ({double lat, double lng})? bus;

  /// The child's stop.
  final int? mine;
  final double height;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final tiles = config.tilesUrl;
    final at = bus;
    final points = [
      for (final s in stops) LatLng(s.lat, s.lng),
      if (at != null) LatLng(at.lat, at.lng),
    ];
    if (tiles == null || points.isEmpty) return const SizedBox.shrink();
    final package = ref.watch(appEnvironmentProvider).build.androidPackage;
    return ClipRRect(
      borderRadius: BorderRadius.circular(context.shapes.card),
      child: SizedBox(
        key: const ValueKey('bus-map'),
        height: height,
        child: FlutterMap(
          // A new camera when the bus moves.
          key: ValueKey(
            points.map((x) => '${x.latitude},${x.longitude}').join('|'),
          ),
          options: MapOptions(
            initialCenter: points.last,
            initialZoom: 15,
            initialCameraFit: points.length > 1
                ? CameraFit.coordinates(
                    coordinates: points,
                    padding: const EdgeInsets.all(40),
                    maxZoom: 16,
                  )
                : null,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
            ),
          ),
          children: [
            TileLayer(urlTemplate: tiles, userAgentPackageName: package),
            if (stops.length > 1)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: [for (final s in stops) LatLng(s.lat, s.lng)],
                    strokeWidth: 3,
                    color: p.textSecondary.withValues(alpha: 0.6),
                  ),
                ],
              ),
            MarkerLayer(
              markers: [
                for (final s in stops)
                  Marker(
                    point: LatLng(s.lat, s.lng),
                    width: s.id == mine ? 36 : 26,
                    height: s.id == mine ? 36 : 26,
                    child: _Pin(
                      icon: s.id == mine
                          ? AppIcons.pinDrop
                          : s.passed
                          ? AppIcons.check
                          : AppIcons.location,
                      color: s.id == mine
                          ? p.primary
                          : s.passed
                          ? p.success
                          : p.text,
                      size: s.id == mine ? 20 : 14,
                    ),
                  ),
                if (at != null)
                  Marker(
                    point: LatLng(at.lat, at.lng),
                    width: 42,
                    height: 42,
                    child: _Pin(icon: AppIcons.bus, color: p.primary, size: 22),
                  ),
              ],
            ),
            if (config.attribution != null)
              SimpleAttributionWidget(
                source: Text(config.attribution!),
                backgroundColor: p.surface.withValues(alpha: 0.8),
              ),
          ],
        ),
      ),
    );
  }
}

class _Pin extends StatelessWidget {
  const _Pin({required this.icon, required this.color, required this.size});

  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: context.palette.surface,
      shape: BoxShape.circle,
      border: Border.all(color: color, width: 2),
      boxShadow: const [
        BoxShadow(
          color: Color(0x33000000),
          blurRadius: 6,
          offset: Offset(0, 2),
        ),
      ],
    ),
    child: Center(
      child: AppIcon(icon, size: size, color: color),
    ),
  );
}

/// The trip's stops as a list, in order: those reached ticked, the child's own marked.
class BusStopList extends StatelessWidget {
  const BusStopList({super.key, required this.stops, this.mine});

  final List<BusStop> stops;
  final int? mine;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      children: [
        for (final s in stops)
          Padding(
            key: ValueKey('bus-stop-${s.id}'),
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                AppIcon(
                  s.passed ? AppIcons.checkCircle : AppIcons.location,
                  size: 20,
                  color: s.passed
                      ? p.success
                      : s.id == mine
                      ? p.primary
                      : p.textSecondary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    s.name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: s.id == mine
                          ? FontWeight.w700
                          : FontWeight.w400,
                      color: p.text,
                    ),
                  ),
                ),
                if (s.time != null)
                  Text(
                    s.time!,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
