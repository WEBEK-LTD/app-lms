import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../delivery/data/delivery_providers.dart' show locatorProvider;

/// 105.2 How the ride company works (`Config.rides`); the defaults on older
/// servers.
final ridesConfigProvider = Provider<RidesConfig>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady
      ? (gate.config.rides ?? const RidesConfig())
      : const RidesConfig();
});

/// Whether this build shows the drivers' screens: the company's app when its
/// drivers work in it, and its drivers' app always.
final driverScreensHereProvider = Provider<bool>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  if (env.build.appType != AppType.rides) return false;
  if (env.build.role == AppRole.driver) return true;
  return ref.watch(ridesConfigProvider).driverApp == DriverApp.same;
});

/// This build is the ride company's drivers' app: the driver's screens and
/// the account only.
final driverAppProvider = Provider<bool>((ref) {
  final build = ref.watch(appEnvironmentProvider).build;
  return build.appType == AppType.rides && build.role == AppRole.driver;
});

/// The signed-in person is one of the company's drivers, and this build
/// shows the drivers' screens: the Driver tab is theirs only.
final isDriverProvider = Provider<bool>((ref) {
  final user = ref.watch(authControllerProvider).user;
  return (user?.isDriver ?? false) && ref.watch(driverScreensHereProvider);
});

/// The signed-in rider's rides, newest first.
class MyRidesController extends PagedController<Ride> {
  @override
  Future<Paged<Ride>> fetch(int page) =>
      ref.read(yallappApiProvider).listMyRides(page: page);
}

final myRidesProvider =
    NotifierProvider.autoDispose<MyRidesController, PagedState<Ride>>(
      MyRidesController.new,
    );

/// The rider's ride that isn't over (scheduled ones too), if any: the Ride
/// tab leads to it.
final activeRideProvider = FutureProvider.autoDispose<Ride?>((ref) async {
  if (!ref.watch(authControllerProvider).isSignedIn) return null;
  final page = await ref.read(yallappApiProvider).listMyRides(active: true);
  for (final ride in page.items) {
    if (ride.status != RideStatus.scheduled) return ride;
  }
  return null;
});

final rideProvider = FutureProvider.autoDispose.family<Ride, int>(
  (ref, id) => ref.read(yallappApiProvider).getMyRide(id),
);

final driverProfileProvider = FutureProvider.autoDispose<DriverProfile>(
  (ref) => ref.read(yallappApiProvider).getDriver(),
);

/// The ride offered to the driver now, if any.
final driverOfferProvider = FutureProvider.autoDispose<DriverRide?>((
  ref,
) async {
  final offers = await ref.read(yallappApiProvider).listDriverOffers();
  return offers.isEmpty ? null : offers.first;
});

class _DriverRidesController extends PagedController<DriverRide> {
  _DriverRidesController(this.scope);

  final DriverRideScope scope;

  @override
  Future<Paged<DriverRide>> fetch(int page) =>
      ref.read(yallappApiProvider).listDriverRides(scope, page: page);
}

final activeDriverRidesProvider =
    NotifierProvider.autoDispose<
      _DriverRidesController,
      PagedState<DriverRide>
    >(() => _DriverRidesController(DriverRideScope.active));
final doneDriverRidesProvider =
    NotifierProvider.autoDispose<
      _DriverRidesController,
      PagedState<DriverRide>
    >(() => _DriverRidesController(DriverRideScope.done));

final driverRideProvider = FutureProvider.autoDispose.family<DriverRide, int>(
  (ref, id) => ref.read(yallappApiProvider).getDriverRide(id),
);

final driverEarningsProvider = FutureProvider.autoDispose
    .family<DriverEarnings, EarningsPeriod>(
      (ref, period) => ref.read(yallappApiProvider).getDriverEarnings(period),
    );

/// How often an online driver's position is sent.
const driverLocationEvery = Duration(seconds: 8);

/// How often an online, free driver asks for an offer.
const driverOfferEvery = Duration(seconds: 3);

/// Sends the driver's position while they are online and a driver's screen
/// is open; stops with it. Nothing runs in the background.
class DriverLocationSharer {
  DriverLocationSharer(this._ref);

  final Ref _ref;
  Timer? _timer;
  bool _sending = false;

  bool get running => _timer != null;

  /// 105.9 Told each position too (a taxi app writes it to its live
  /// database).
  void Function(double lat, double lng)? onPosition;

  void start() {
    if (_timer != null) return;
    _send();
    _timer = Timer.periodic(driverLocationEvery, (_) => _send());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _send() async {
    if (_sending) return;
    _sending = true;
    try {
      final found = await _ref.read(locatorProvider).current();
      final p = found.position;
      if (p != null) {
        onPosition?.call(p.lat, p.lng);
        await _ref
            .read(yallappApiProvider)
            .sendDriverLocation(p.lat, p.lng, accuracy: p.accuracy);
      }
    } catch (_) {
      // The next one tries again.
    } finally {
      _sending = false;
    }
  }
}

final driverLocationSharerProvider = Provider.autoDispose<DriverLocationSharer>(
  (ref) {
    final sharer = DriverLocationSharer(ref);
    ref.onDispose(sharer.stop);
    return sharer;
  },
);
