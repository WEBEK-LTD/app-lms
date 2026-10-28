import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';

/// 104 A pin on the map: where the parcel starts, ends, or the courier is.
enum MapPinKind { pickup, dropoff, courier }

class MapPin {
  const MapPin(this.kind, this.lat, this.lng);

  final MapPinKind kind;
  final double lat;
  final double lng;
}

/// 104 The live map of a shipment, on the tiles Yallapp set
/// (`Config.delivery.map`): the pickup, the drop-off and the courier, all in
/// view. Only built when the company has live tracking and the tiles are set.
class DeliveryMap extends ConsumerWidget {
  const DeliveryMap({
    super.key,
    required this.config,
    required this.pins,
    this.height = 240,
  });

  final DeliveryConfig config;
  final List<MapPin> pins;
  final double height;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final tiles = config.tilesUrl;
    if (tiles == null || pins.isEmpty) return const SizedBox.shrink();
    final points = [for (final pin in pins) LatLng(pin.lat, pin.lng)];
    final package = ref.watch(appEnvironmentProvider).build.androidPackage;
    return ClipRRect(
      borderRadius: BorderRadius.circular(context.shapes.card),
      child: SizedBox(
        height: height,
        child: FlutterMap(
          // A new camera when the courier moves.
          key: ValueKey(
            points.map((x) => '${x.latitude},${x.longitude}').join('|'),
          ),
          options: MapOptions(
            initialCenter: points.first,
            initialZoom: 15,
            initialCameraFit: points.length > 1
                ? CameraFit.coordinates(
                    coordinates: points,
                    padding: const EdgeInsets.all(48),
                    maxZoom: 16,
                  )
                : null,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
            ),
          ),
          children: [
            TileLayer(urlTemplate: tiles, userAgentPackageName: package),
            MarkerLayer(
              markers: [
                for (final pin in pins)
                  Marker(
                    point: LatLng(pin.lat, pin.lng),
                    width: 40,
                    height: 40,
                    alignment: Alignment.topCenter,
                    child: _PinIcon(
                      kind: pin.kind,
                      color: pin.kind == MapPinKind.courier
                          ? p.primary
                          : p.text,
                    ),
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

class _PinIcon extends StatelessWidget {
  const _PinIcon({required this.kind, required this.color});

  final MapPinKind kind;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final icon = switch (kind) {
      MapPinKind.pickup => AppIcons.parcel,
      MapPinKind.dropoff => AppIcons.location,
      MapPinKind.courier => AppIcons.courier,
    };
    return DecoratedBox(
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
      child: Center(child: AppIcon(icon, size: 20, color: color)),
    );
  }
}

/// 104 Choosing a place by moving the map under a pin in the middle.
class MapPickerScreen extends ConsumerStatefulWidget {
  const MapPickerScreen({
    super.key,
    required this.config,
    this.start,
    required this.title,
    required this.confirmLabel,
  });

  final DeliveryConfig config;
  final ({double lat, double lng})? start;
  final String title;
  final String confirmLabel;

  @override
  ConsumerState<MapPickerScreen> createState() => _MapPickerScreenState();
}

class _MapPickerScreenState extends ConsumerState<MapPickerScreen> {
  final _controller = MapController();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final package = ref.watch(appEnvironmentProvider).build.androidPackage;
    final start = widget.start;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _controller,
            options: MapOptions(
              initialCenter: start == null
                  ? const LatLng(30.0444, 31.2357)
                  : LatLng(start.lat, start.lng),
              initialZoom: start == null ? 11 : 16,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: widget.config.tilesUrl!,
                userAgentPackageName: package,
              ),
              if (widget.config.attribution != null)
                SimpleAttributionWidget(
                  source: Text(widget.config.attribution!),
                  backgroundColor: p.surface.withValues(alpha: 0.8),
                ),
            ],
          ),
          IgnorePointer(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 40),
                child: AppIcon(AppIcons.pinDrop, size: 44, color: p.primary),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: FilledButton(
          key: const ValueKey('map-picker-confirm'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
          onPressed: () {
            final c = _controller.camera.center;
            Navigator.of(context).pop((lat: c.latitude, lng: c.longitude));
          },
          child: Text(widget.confirmLabel),
        ),
      ),
    );
  }
}
