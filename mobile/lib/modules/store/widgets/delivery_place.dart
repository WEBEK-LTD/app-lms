import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/data/delivery_providers.dart';
import 'gift_checkout.dart';

/// 131 Where an order goes, for the shop's shipping (`StoreConfig.shipping`),
/// in either checkout: the country among the shop's (when several), the city
/// (from the shop's list when it has one) and, when shipping is priced by
/// distance, the place pinned on the map ([DeliveryPinScreen]): the
/// recipient's door, which the phone's own position seldom is. The server
/// measures the distance from the shop to the pin.
class DeliveryPlaceFields extends ConsumerWidget {
  const DeliveryPlaceFields({
    super.key,
    required this.form,
    required this.shipping,
    required this.onChanged,
  });

  final GiftForm form;
  final StoreShippingRules shipping;
  final VoidCallback onChanged;

  /// Why the place isn't complete yet; null when it is.
  static String? problem(
    BuildContext context,
    GiftForm form,
    StoreShippingRules? shipping,
  ) {
    if (shipping == null) return null;
    final countries = shipping.countries;
    // A shop in one country: that one.
    final code =
        form.country ?? (countries.length == 1 ? countries.first.code : null);
    final country = countries.where((c) => c.code == code).firstOrNull;
    if (countries.isNotEmpty && country == null) {
      return context.l10n.deliveryNeedPlace;
    }
    if (country?.cities != null && form.city == null) {
      return context.l10n.deliveryNeedPlace;
    }
    if (shipping.needsLocation && form.pin == null) {
      return context.l10n.deliveryNeedPin;
    }
    return null;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final f = form;
    final lang = Localizations.localeOf(context).languageCode;
    final countries = shipping.countries;
    if (f.country == null && countries.length == 1) {
      f.country = countries.first.code;
    }
    final country = countries.where((c) => c.code == f.country).firstOrNull;
    final cities = country?.cities;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (countries.length > 1)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: DropdownButtonFormField<String>(
              key: const ValueKey('gift-country'),
              initialValue: f.country,
              decoration: InputDecoration(labelText: l10n.giftCountry),
              items: [
                for (final c in countries)
                  DropdownMenuItem(value: c.code, child: Text(c.nameIn(lang))),
              ],
              onChanged: (v) {
                f.country = v;
                f.city = null;
                onChanged();
              },
            ),
          ),
        if (cities != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: DropdownButtonFormField<String>(
              // A new field for another country's cities.
              key: ValueKey('gift-city-${f.country}'),
              initialValue: f.city,
              decoration: InputDecoration(labelText: l10n.city),
              items: [
                for (final c in cities)
                  DropdownMenuItem(value: c, child: Text(c)),
              ],
              onChanged: (v) {
                f.city = v;
                onChanged();
              },
            ),
          )
        else if (countries.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: TextField(
              key: const ValueKey('gift-recipient-city'),
              controller: f.recipientCity,
              maxLength: 60,
              textCapitalization: TextCapitalization.words,
              onChanged: (_) => onChanged(),
              decoration: InputDecoration(
                labelText: l10n.city,
                counterText: '',
              ),
            ),
          ),
        // Priced by distance: the place on the map.
        if (shipping.needsLocation)
          Material(
            color: f.pin == null
                ? p.surfaceMuted
                : p.accent.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              key: const ValueKey('gift-location'),
              borderRadius: BorderRadius.circular(14),
              onTap: () async {
                final at = await pickDeliveryPin(
                  context,
                  shipping: shipping,
                  start: f.pin,
                );
                if (at == null) return;
                f.pin = at;
                onChanged();
              },
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    AppIcon(
                      f.pin == null ? AppIcons.pinDrop : AppIcons.checkCircle,
                      size: 22,
                      color: f.pin == null ? p.textSecondary : p.accent,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        f.pin == null
                            ? l10n.deliveryPinChoose
                            : l10n.deliveryPinSet,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: p.text,
                        ),
                      ),
                    ),
                    if (f.pin != null)
                      Text(
                        l10n.deliveryPinChange,
                        style: TextStyle(fontSize: 13, color: p.accent),
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Opens the map for the place an order goes; the place pinned, or null.
/// Without the map's tiles, the phone's own position is the only way.
Future<({double lat, double lng})?> pickDeliveryPin(
  BuildContext context, {
  required StoreShippingRules shipping,
  ({double lat, double lng})? start,
}) async {
  if (shipping.mapTilesUrl == null) {
    return _myPosition(context, ProviderScope.containerOf(context));
  }
  return Navigator.of(context).push<({double lat, double lng})>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => DeliveryPinScreen(shipping: shipping, start: start),
    ),
  );
}

Future<({double lat, double lng})?> _myPosition(
  BuildContext context,
  ProviderContainer container,
) async {
  final l10n = context.l10n;
  final found = await container.read(locatorProvider).current();
  if (!context.mounted) return null;
  final at = found.position;
  if (at == null) {
    showMessage(context, switch (found.problem) {
      LocateProblem.off => l10n.locateOff,
      LocateProblem.denied => l10n.locateDenied,
      _ => l10n.locateFailed,
    });
    return null;
  }
  return (lat: at.lat, lng: at.lng);
}

/// The map to pin where an order goes: a pin in the middle that stays while
/// the map moves under it, the search by address when the map has one, and
/// the phone's own position as one choice among them.
class DeliveryPinScreen extends ConsumerStatefulWidget {
  const DeliveryPinScreen({super.key, required this.shipping, this.start});

  final StoreShippingRules shipping;
  final ({double lat, double lng})? start;

  @override
  ConsumerState<DeliveryPinScreen> createState() => _DeliveryPinScreenState();
}

class _DeliveryPinScreenState extends ConsumerState<DeliveryPinScreen> {
  final _controller = MapController();
  final _search = TextEditingController();
  TileLayer? _tiles;
  List<TaxiPlace>? _results;
  bool _busy = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _tiles = TileLayer(
      urlTemplate: widget.shipping.mapTilesUrl!,
      userAgentPackageName: ref
          .read(appEnvironmentProvider)
          .build
          .androidPackage,
      tileProvider: NetworkTileProvider(silenceExceptions: true),
    );
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _moveTo(double lat, double lng) {
    _controller.move(LatLng(lat, lng), 17);
    setState(() => _results = null);
  }

  void _typed(String q) {
    _debounce?.cancel();
    if (q.trim().length < 2) {
      setState(() => _results = null);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () => _find(q));
  }

  Future<void> _find(String q) async {
    final near = _controller.camera.center;
    setState(() => _busy = true);
    try {
      final found = await ref
          .read(yallappApiProvider)
          .searchTaxiPlaces(q.trim(), lat: near.latitude, lng: near.longitude);
      if (mounted) setState(() => _results = found);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _choose(TaxiPlace place) async {
    FocusScope.of(context).unfocus();
    if (place.lat != null && place.lng != null) {
      _moveTo(place.lat!, place.lng!);
      return;
    }
    // A Google place comes without its position: asked for once chosen.
    try {
      final full = await ref.read(yallappApiProvider).getTaxiPlace(place.id);
      if (!mounted) return;
      if (full.lat == null || full.lng == null) {
        showMessage(context, context.l10n.taxiPlaceFailed);
        return;
      }
      _moveTo(full.lat!, full.lng!);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    }
  }

  Future<void> _here() async {
    final at = await _myPosition(context, ProviderScope.containerOf(context));
    if (at != null && mounted) _moveTo(at.lat, at.lng);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final start = widget.start ?? widget.shipping.center;
    final results = _results;
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.mapPickTitle),
      ),
      body: Stack(
        children: [
          FlutterMap(
            key: const ValueKey('delivery-pin-map'),
            mapController: _controller,
            options: MapOptions(
              initialCenter: start == null
                  ? const LatLng(30.0444, 31.2357)
                  : LatLng(start.lat, start.lng),
              initialZoom: widget.start != null ? 17 : 13,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
            ),
            children: [?_tiles],
          ),
          // The map's credit, kept to one line.
          if (widget.shipping.mapAttribution != null)
            PositionedDirectional(
              start: 0,
              bottom: 0,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.sizeOf(context).width * 0.6,
                ),
                child: ColoredBox(
                  color: p.surface.withValues(alpha: 0.8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 3,
                    ),
                    child: Text(
                      widget.shipping.mapAttribution!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 11, color: p.textSecondary),
                    ),
                  ),
                ),
              ),
            ),
          // The pin stays in the middle; its point is the map's centre.
          IgnorePointer(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 40),
                child: AppIcon(
                  AppIcons.pinDrop,
                  key: const ValueKey('delivery-pin'),
                  size: 44,
                  color: p.primary,
                ),
              ),
            ),
          ),
          PositionedDirectional(
            top: 12,
            start: 16,
            end: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.shipping.mapSearch)
                  Material(
                    elevation: 3,
                    color: p.surface,
                    borderRadius: BorderRadius.circular(14),
                    child: TextField(
                      key: const ValueKey('delivery-pin-search'),
                      controller: _search,
                      textInputAction: TextInputAction.search,
                      onChanged: _typed,
                      onSubmitted: _find,
                      decoration: InputDecoration(
                        hintText: l10n.taxiSearchHint,
                        border: InputBorder.none,
                        filled: false,
                        prefixIcon: AppIcon(
                          AppIcons.search,
                          size: 20,
                          color: p.textSecondary,
                        ),
                        suffixIcon: _busy
                            ? const Padding(
                                padding: EdgeInsets.all(14),
                                child: SizedBox.square(
                                  dimension: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                              )
                            : null,
                      ),
                    ),
                  ),
                if (results != null) ...[
                  const SizedBox(height: 6),
                  Material(
                    elevation: 3,
                    color: p.surface,
                    borderRadius: BorderRadius.circular(14),
                    clipBehavior: Clip.antiAlias,
                    child: results.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              l10n.taxiSearchNone,
                              style: TextStyle(color: p.textSecondary),
                            ),
                          )
                        : ConstrainedBox(
                            constraints: const BoxConstraints(maxHeight: 280),
                            child: ListView(
                              shrinkWrap: true,
                              padding: EdgeInsets.zero,
                              children: [
                                for (final (i, place) in results.indexed)
                                  ListTile(
                                    key: ValueKey('delivery-pin-result-$i'),
                                    leading: AppIcon(
                                      AppIcons.location,
                                      size: 20,
                                      color: p.textSecondary,
                                    ),
                                    title: Text(place.name),
                                    subtitle: place.address == null
                                        ? null
                                        : Text(place.address!),
                                    onTap: () => _choose(place),
                                  ),
                              ],
                            ),
                          ),
                  ),
                ],
              ],
            ),
          ),
          PositionedDirectional(
            end: 16,
            bottom: 16,
            child: FloatingActionButton.extended(
              key: const ValueKey('delivery-pin-here'),
              heroTag: null,
              onPressed: _here,
              icon: const AppIcon(AppIcons.myLocation, size: 20),
              label: Text(l10n.rideMyLocation),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: FilledButton(
          key: const ValueKey('delivery-pin-confirm'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
          onPressed: () {
            final c = _controller.camera.center;
            Navigator.of(context).pop((lat: c.latitude, lng: c.longitude));
          },
          child: Text(l10n.mapPickConfirm),
        ),
      ),
    );
  }
}
