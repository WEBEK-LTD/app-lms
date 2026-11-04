import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/storage/local_settings.dart'
    show sharedPreferencesProvider;
import '../../delivery/data/delivery_providers.dart'
    show LocateProblem, locatorProvider;
import '../../delivery/data/my_address.dart' show addressLine;

/// 115 Where the marketplace delivers: the customer's address and its
/// position, so vendors come with their delivery time and fee. Kept on the
/// phone between launches.
typedef MarketPlace = ({String? address, double lat, double lng});

const _key = 'market_place';

class MarketPlaceController extends Notifier<MarketPlace?> {
  @override
  MarketPlace? build() {
    final raw = ref.read(sharedPreferencesProvider).getString(_key);
    if (raw == null) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return (
        address: json['address'] as String?,
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> set(MarketPlace place) async {
    state = place;
    await ref
        .read(sharedPreferencesProvider)
        .setString(
          _key,
          jsonEncode({
            'address': place.address,
            'lat': place.lat,
            'lng': place.lng,
          }),
        );
  }

  /// The phone's position and, when the map names it, its address. Null
  /// when it worked; else why it didn't.
  Future<LocateProblem?> useMyLocation() async {
    final found = await ref.read(locatorProvider).current();
    final p = found.position;
    if (p == null) return found.problem ?? LocateProblem.failed;
    String? address;
    try {
      final named = await ref
          .read(yallappApiProvider)
          .getMapAddress(p.lat, p.lng);
      address = addressLine(named);
    } on ApiException {
      address = null;
    }
    await set((address: address, lat: p.lat, lng: p.lng));
    return null;
  }
}

final marketPlaceProvider =
    NotifierProvider<MarketPlaceController, MarketPlace?>(
      MarketPlaceController.new,
    );
