import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart' show StoreShippingRules;
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/data/delivery_providers.dart' show LocateProblem;
import '../../delivery/data/my_address.dart' show addressAt, addressLine;
import '../../store/widgets/delivery_place.dart' show pickDeliveryPin;
import '../data/market_place.dart';
import '../data/market_providers.dart';

/// 177 Where the marketplace delivers, chosen by the customer: a pin on the
/// map (the store's pin screen, with its address search when the platform's
/// map has one), or the phone's position. Before, only the phone's
/// position set it, so a customer who refused it could only pick up. The
/// place is named by the map, kept on the phone (the address the next
/// order starts from), and the server measures the marketplace's and the
/// vendor's areas from it (115.19).
Future<void> chooseMarketPlace(BuildContext context, WidgetRef ref) async {
  final l10n = context.l10n;
  final p = context.palette;
  final choice = await showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (sheet) => SafeArea(
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                l10n.marketDeliverHere,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
            ListTile(
              leading: AppIcon(Symbols.pin_drop_rounded, color: p.primary),
              title: Text(l10n.deliveryPinChoose),
              onTap: () => Navigator.pop(sheet, 'pin'),
            ),
            ListTile(
              leading: AppIcon(Symbols.my_location_rounded, color: p.primary),
              title: Text(l10n.marketUseMyLocation),
              onTap: () => Navigator.pop(sheet, 'here'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    ),
  );
  if (choice == null || !context.mounted) return;
  if (choice == 'here') {
    await useMarketLocation(context, ref);
    return;
  }
  final config = ref.read(marketConfigProvider);
  final now = ref.read(marketPlaceProvider);
  final pin = await pickDeliveryPin(
    context,
    shipping: StoreShippingRules(
      countries: const [],
      needsLocation: true,
      mapTilesUrl: config?.tilesUrl,
      mapAttribution: config?.attribution,
      mapSearch: config?.search ?? false,
    ),
    start: now == null ? null : (lat: now.lat, lng: now.lng),
  );
  if (pin == null || !context.mounted) return;
  final named = await addressAt(ref, pin);
  await ref.read(marketPlaceProvider.notifier).set((
    address: named == null ? null : addressLine(named),
    lat: pin.lat,
    lng: pin.lng,
  ));
}

/// The phone's position as the place, or why it couldn't be read.
Future<void> useMarketLocation(BuildContext context, WidgetRef ref) async {
  final l10n = context.l10n;
  final problem = await ref.read(marketPlaceProvider.notifier).useMyLocation();
  if (problem == null || !context.mounted) return;
  showMessage(context, switch (problem) {
    LocateProblem.off => l10n.locateOff,
    LocateProblem.denied => l10n.locateDenied,
    _ => l10n.locateFailed,
  });
}
