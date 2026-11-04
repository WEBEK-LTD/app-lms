import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'market_models.dart';
import 'market_samples.dart';

/// 115 What the marketplace home's sections read. The samples until the
/// platform serves `GET /market/home` (the marketplace contract); tests
/// override it.
final marketHomeProvider = FutureProvider<MarketHome>(
  (ref) async => MarketSamples.home,
);

/// 115 A vendor's page, by id.
final marketVendorPageProvider =
    FutureProvider.family<MarketVendorPage, String>(
      (ref, id) async => MarketSamples.page(id),
    );
