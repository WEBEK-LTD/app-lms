import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';
import '../../market/data/market_providers.dart';

/// 115 This build is the marketplace's vendor app (`role` vendor): the
/// vendor's screens and the account only.
final vendorAppProvider = Provider<bool>((ref) {
  final build = ref.watch(appEnvironmentProvider).build;
  return build.appType == AppType.food && build.role == AppRole.vendor;
});

/// The signed-in person works for one of the marketplace's vendors, and
/// this build shows the vendors' screens: the vendor app, or the customers'
/// app when the owner keeps the vendors in it (`MarketConfig.vendor_app`
/// same).
final isVendorProvider = Provider<bool>((ref) {
  final user = ref.watch(authControllerProvider).user;
  if (!(user?.roles.contains('vendor') ?? false)) return false;
  if (ref.watch(vendorAppProvider)) return true;
  final market = ref.watch(marketConfigProvider);
  return market != null && !market.vendorAppBundled;
});

final vendorDeskProvider = FutureProvider.autoDispose<VendorDesk>(
  (ref) => ref.watch(yallappApiProvider).getVendorDesk(),
);

class VendorOrdersController extends PagedController<VendorOrder> {
  VendorOrdersController(this.scope);

  final VendorOrderScope scope;

  @override
  Future<Paged<VendorOrder>> fetch(int page) =>
      ref.read(yallappApiProvider).listVendorOrders(scope, page: page);
}

final vendorOrdersProvider = NotifierProvider.autoDispose
    .family<VendorOrdersController, PagedState<VendorOrder>, VendorOrderScope>(
      VendorOrdersController.new,
    );

final vendorOrderProvider = FutureProvider.autoDispose.family<VendorOrder, int>(
  (ref, id) => ref.watch(yallappApiProvider).getVendorOrder(id),
);

/// 115.16 A month's statement (`YYYY-MM`, this month when null).
final vendorStatementProvider = FutureProvider.autoDispose
    .family<VendorStatement, String?>(
      (ref, month) =>
          ref.watch(yallappApiProvider).getVendorStatement(month: month),
    );

/// 115.16 The complaints the app's support shared with the vendor.
final vendorComplaintsProvider =
    FutureProvider.autoDispose<List<VendorComplaint>>(
      (ref) => ref.watch(yallappApiProvider).listVendorComplaints(),
    );

/// Reloads every list and the desk after an order changed.
void reloadVendor(WidgetRef ref, [int? orderId]) {
  for (final s in VendorOrderScope.values) {
    ref.invalidate(vendorOrdersProvider(s));
  }
  ref.invalidate(vendorDeskProvider);
  if (orderId != null) ref.invalidate(vendorOrderProvider(orderId));
}

/// The sound and the buzz of a new order, played while the orders are on
/// screen.
Future<void> newOrderAlert() async {
  await SystemSound.play(SystemSoundType.alert);
  await HapticFeedback.heavyImpact();
}
