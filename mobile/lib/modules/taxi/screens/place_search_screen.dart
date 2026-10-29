import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/data/delivery_providers.dart'
    show LocateProblem, locatorProvider;
import '../../delivery/widgets/delivery_map.dart' show MapPickerScreen;
import '../data/taxi_providers.dart';
import '../widgets/taxi_map.dart';

/// 105.9 A place the rider chose: its name and where it is.
typedef TaxiChoice = ({String name, String? address, double lat, double lng});

/// 105.9 "Where to?": the company's place search (`GET /taxi/places`, near
/// the rider), a Google place asked for its position once chosen, all in
/// one search session; the phone's position (where from) and the map too.
class TaxiPlaceSearchScreen extends ConsumerStatefulWidget {
  const TaxiPlaceSearchScreen({
    super.key,
    required this.title,
    required this.map,
    this.near,
    this.myLocation = false,
  });

  final String title;
  final TaxiMap map;
  final TaxiSpot? near;

  /// Offers the phone's position first.
  final bool myLocation;

  @override
  ConsumerState<TaxiPlaceSearchScreen> createState() =>
      _TaxiPlaceSearchScreenState();
}

/// One search session's token: the searches and the place chosen are billed
/// as one by Google.
String _sessionToken() {
  final random = math.Random.secure();
  return List.generate(
    16,
    (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();
}

class _TaxiPlaceSearchScreenState extends ConsumerState<TaxiPlaceSearchScreen> {
  final _query = TextEditingController();
  final _session = _sessionToken();
  Timer? _debounce;
  List<TaxiPlace> _places = const [];
  String? _error;
  bool _searching = false;
  bool _choosing = false;
  int _generation = 0;

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _changed(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _search);
  }

  Future<void> _search() async {
    final text = _query.text.trim();
    final generation = ++_generation;
    if (text.length < 2) {
      setState(() {
        _places = const [];
        _error = null;
      });
      return;
    }
    setState(() => _searching = true);
    try {
      final places = await ref
          .read(yallappApiProvider)
          .searchTaxiPlaces(
            text,
            lat: widget.near?.lat,
            lng: widget.near?.lng,
            session: _session,
          );
      if (!mounted || generation != _generation) return;
      setState(() {
        _places = places;
        _error = null;
      });
    } on ApiException catch (e) {
      if (!mounted || generation != _generation) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _searching = false);
      }
    }
  }

  Future<void> _choose(TaxiPlace place) async {
    if (place.located) {
      Navigator.of(context).pop<TaxiChoice>((
        name: place.name,
        address: place.address,
        lat: place.lat!,
        lng: place.lng!,
      ));
      return;
    }
    setState(() => _choosing = true);
    try {
      final found = await ref
          .read(yallappApiProvider)
          .getTaxiPlace(place.id, session: _session);
      if (!mounted) return;
      if (!found.located) {
        showMessage(context, context.l10n.taxiPlaceFailed);
        return;
      }
      Navigator.of(context).pop<TaxiChoice>((
        name: found.name,
        address: found.address ?? place.address,
        lat: found.lat!,
        lng: found.lng!,
      ));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _choosing = false);
    }
  }

  Future<void> _here() async {
    final l10n = context.l10n;
    final found = await ref.read(locatorProvider).current();
    if (!mounted) return;
    final p = found.position;
    if (p == null) {
      showMessage(context, switch (found.problem) {
        LocateProblem.off => l10n.locateOff,
        LocateProblem.denied => l10n.locateDenied,
        _ => l10n.locateFailed,
      });
      return;
    }
    Navigator.of(context).pop<TaxiChoice>((
      name: l10n.rideMyLocation,
      address: null,
      lat: p.lat,
      lng: p.lng,
    ));
  }

  Future<void> _onMap() async {
    final l10n = context.l10n;
    final at = await Navigator.of(context).push<({double lat, double lng})>(
      MaterialPageRoute(
        builder: (_) => MapPickerScreen(
          config: taxiPickerConfig(widget.map),
          start: widget.near,
          title: l10n.mapPickTitle,
          confirmLabel: l10n.mapPickConfirm,
        ),
      ),
    );
    if (at == null || !mounted) return;
    Navigator.of(context).pop<TaxiChoice>((
      name: l10n.taxiOnMap,
      address: null,
      lat: at.lat,
      lng: at.lng,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    Widget row({
      required String key,
      required IconData icon,
      required String title,
      String? subtitle,
      required VoidCallback? onTap,
    }) => ListTile(
      key: ValueKey(key),
      leading: AppIcon(icon, size: 24, color: p.textSecondary),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: p.text,
        ),
      ),
      subtitle: subtitle == null
          ? null
          : Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
      onTap: _choosing ? null : onTap,
    );
    final text = _query.text.trim();
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: TextField(
              key: const ValueKey('taxi-search-field'),
              controller: _query,
              autofocus: true,
              textInputAction: TextInputAction.search,
              onChanged: _changed,
              onSubmitted: (_) {
                _debounce?.cancel();
                _search();
              },
              decoration: InputDecoration(
                hintText: l10n.taxiSearchHint,
                prefixIcon: AppIcon(AppIcons.search, size: 22),
              ),
            ),
          ),
          if (_searching || _choosing) const LinearProgressIndicator(),
          Expanded(
            child: ListView(
              key: const ValueKey('taxi-search-results'),
              children: [
                if (widget.myLocation)
                  row(
                    key: 'taxi-search-here',
                    icon: AppIcons.myLocation,
                    title: l10n.rideMyLocation,
                    onTap: _here,
                  ),
                row(
                  key: 'taxi-search-map',
                  icon: AppIcons.map,
                  title: l10n.taxiChooseOnMap,
                  onTap: _onMap,
                ),
                const Divider(height: 1),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      _error!,
                      style: TextStyle(fontSize: 14, color: p.danger),
                    ),
                  )
                else if (_places.isEmpty && text.length >= 2 && !_searching)
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      l10n.taxiSearchNone,
                      key: const ValueKey('taxi-search-none'),
                      style: TextStyle(fontSize: 14, color: p.textSecondary),
                    ),
                  ),
                for (final place in _places)
                  row(
                    key: 'taxi-place-${place.id}',
                    icon: AppIcons.location,
                    title: place.name,
                    subtitle: place.address,
                    onTap: () => _choose(place),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
