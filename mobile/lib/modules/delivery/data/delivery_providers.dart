import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';

/// 104 How the delivery company works (`Config.delivery`); the defaults on
/// older servers. 105.1 In food delivery apps, its tracking and map from
/// `Config.food`, for the courier's screens.
final deliveryConfigProvider = Provider<DeliveryConfig>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady
      ? (gate.config.delivery ??
            gate.config.food?.mapConfig ??
            const DeliveryConfig())
      : const DeliveryConfig();
});

/// Whether this build shows the couriers' screens: the company's app when
/// its couriers work in it, and (104.6) its courier app always. 105.1 A
/// food delivery company's couriers too (105.1.6 or in its courier app).
final courierScreensHereProvider = Provider<bool>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  if (env.build.appType != AppType.delivery &&
      env.build.appType != AppType.food) {
    return false;
  }
  if (env.build.role == AppRole.courier) return true;
  return ref.watch(deliveryConfigProvider).courierApp == CourierApp.same;
});

/// 104.6 This build is the delivery (105.1.6 or food delivery) company's
/// courier app: the courier's screens and the account only.
final courierAppProvider = Provider<bool>((ref) {
  final build = ref.watch(appEnvironmentProvider).build;
  return (build.appType == AppType.delivery || build.appType == AppType.food) &&
      build.role == AppRole.courier;
});

/// The signed-in person is one of the company's couriers, and this build
/// shows the couriers' screens: the Courier tab is theirs only.
final isCourierProvider = Provider<bool>((ref) {
  final user = ref.watch(authControllerProvider).user;
  return (user?.isCourier ?? false) && ref.watch(courierScreensHereProvider);
});

final deliveryServicesProvider =
    FutureProvider.autoDispose<List<DeliveryService>>(
      (ref) => ref.contentApi.listDeliveryServices(),
    );

/// The signed-in customer's shipments, newest first.
class MyShipmentsController extends PagedController<Shipment> {
  @override
  Future<Paged<Shipment>> fetch(int page) =>
      ref.read(yallappApiProvider).listMyShipments(page: page);
}

final myShipmentsProvider =
    NotifierProvider.autoDispose<MyShipmentsController, PagedState<Shipment>>(
      MyShipmentsController.new,
    );

final shipmentProvider = FutureProvider.autoDispose.family<Shipment, int>(
  (ref, id) => ref.read(yallappApiProvider).getMyShipment(id),
);

final courierProfileProvider = FutureProvider.autoDispose<CourierProfile>(
  (ref) => ref.read(yallappApiProvider).getCourier(),
);

class _JobsController extends PagedController<CourierJob> {
  _JobsController(this.scope);

  final JobScope scope;

  @override
  Future<Paged<CourierJob>> fetch(int page) =>
      ref.read(yallappApiProvider).listCourierJobs(scope, page: page);
}

final activeJobsProvider =
    NotifierProvider.autoDispose<_JobsController, PagedState<CourierJob>>(
      () => _JobsController(JobScope.active),
    );
final availableJobsProvider =
    NotifierProvider.autoDispose<_JobsController, PagedState<CourierJob>>(
      () => _JobsController(JobScope.available),
    );
final doneJobsProvider =
    NotifierProvider.autoDispose<_JobsController, PagedState<CourierJob>>(
      () => _JobsController(JobScope.done),
    );

final courierJobProvider = FutureProvider.autoDispose.family<CourierJob, int>(
  (ref, id) => ref.read(yallappApiProvider).getCourierJob(id),
);

/// A place on Earth.
typedef LatLng2 = ({double lat, double lng, double? accuracy});

/// Why the phone's position couldn't be read.
enum LocateProblem { off, denied, failed }

class LocateResult {
  const LocateResult.found(LatLng2 this.position) : problem = null;
  const LocateResult.failed(LocateProblem this.problem) : position = null;

  final LatLng2? position;
  final LocateProblem? problem;
}

/// Reads the phone's position (asking for the permission while the app is
/// open; never in the background). Tests replace it.
abstract class Locator {
  Future<LocateResult> current();
}

class GeolocatorLocator implements Locator {
  const GeolocatorLocator();

  @override
  Future<LocateResult> current() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return const LocateResult.failed(LocateProblem.off);
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return const LocateResult.failed(LocateProblem.denied);
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
      return LocateResult.found((
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
      ));
    } catch (_) {
      return const LocateResult.failed(LocateProblem.failed);
    }
  }
}

final locatorProvider = Provider<Locator>((ref) => const GeolocatorLocator());

/// How often the courier's position is sent while a parcel is on the way.
const locationEvery = Duration(seconds: 20);

/// Sends the courier's position while a screen that has a parcel on the way
/// is open; stops with it. Nothing runs in the background.
class LocationSharer {
  LocationSharer(this._ref);

  final Ref _ref;
  Timer? _timer;
  bool _sending = false;

  bool get running => _timer != null;

  void start() {
    if (_timer != null) return;
    _send();
    _timer = Timer.periodic(locationEvery, (_) => _send());
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
        await _ref
            .read(yallappApiProvider)
            .sendCourierLocation(p.lat, p.lng, accuracy: p.accuracy);
      }
    } catch (_) {
      // The next one tries again.
    } finally {
      _sending = false;
    }
  }
}

final locationSharerProvider = Provider.autoDispose<LocationSharer>((ref) {
  final sharer = LocationSharer(ref);
  ref.onDispose(sharer.stop);
  return sharer;
});
