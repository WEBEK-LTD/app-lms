import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';

/// 112.6 The place at a position, named by the app's map
/// (`GET /maps/address`), for "My location"; null when the map names none
/// or doesn't answer, and the field stays as it is.
Future<TaxiPlace?> addressAt(
  WidgetRef ref,
  ({double lat, double lng}) at,
) async {
  try {
    return await ref.read(yallappApiProvider).getMapAddress(at.lat, at.lng);
  } on ApiException {
    return null;
  }
}

/// 112.6 The words a delivery address field shows for [place]: its address,
/// else its name.
String addressLine(TaxiPlace place) {
  final address = place.address?.trim() ?? '';
  return address.isNotEmpty ? address : place.name;
}
