import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/providers.dart';
import '../../delivery/data/delivery_providers.dart' show locatorProvider;
import '../../shared/staff_app.dart';

/// 113.10 The school bus (a family's view, the crew's trips) and 113.11 the
/// library (its books, a book, the loans and holds of whoever the person
/// follows).

/// The signed-in person drives or supervises one of the school's buses:
/// their Bus duty screens. False in other apps.
final isBusCrewProvider = Provider<bool>((ref) {
  if (ref.watch(appEnvironmentProvider).build.appType != AppType.school) {
    return false;
  }
  // 116 The crew's screens are the staff's: in the staff app when the
  // school has one.
  return (ref.watch(authControllerProvider).user?.isBusCrew ?? false) &&
      ref.watch(staffScreensHereProvider);
});

final studentBusProvider = FutureProvider.autoDispose
    .family<List<StudentBusTrip>, int>(
      (ref, id) => ref.read(yallappApiProvider).getStudentBus(id),
    );

final busCrewRoutesProvider = FutureProvider.autoDispose<List<BusCrewRoute>>(
  (ref) => ref.read(yallappApiProvider).listBusCrewRoutes(),
);

final busRunProvider = FutureProvider.autoDispose.family<BusRun, int>(
  (ref, id) => ref.read(yallappApiProvider).getBusRun(id),
);

/// How often a family's bus screen and the crew's trip ask again.
const busRefreshEvery = Duration(seconds: 15);

/// How often the driver's phone sends the bus's position.
const busLocationEvery = Duration(seconds: 15);

/// Sends the bus's position while the driver's trip screen is open; stops
/// with it. Nothing runs in the background (as 104's couriers).
class BusLocationSharer {
  BusLocationSharer(this._ref);

  final Ref _ref;
  Timer? _timer;
  bool _sending = false;
  int? _run;

  /// The last position sent, for the driver's own map.
  final position = ValueNotifier<({double lat, double lng})?>(null);

  /// The phone's position couldn't be read (location off or not allowed).
  final failed = ValueNotifier<bool>(false);

  bool get running => _timer != null;

  void start(int runId) {
    if (_timer != null && _run == runId) return;
    stop();
    _run = runId;
    _send();
    _timer = Timer.periodic(busLocationEvery, (_) => _send());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _send() async {
    final run = _run;
    if (_sending || run == null) return;
    _sending = true;
    try {
      final found = await _ref.read(locatorProvider).current();
      final p = found.position;
      failed.value = p == null;
      if (p != null) {
        position.value = (lat: p.lat, lng: p.lng);
        await _ref
            .read(yallappApiProvider)
            .sendBusLocation(run, p.lat, p.lng, accuracy: p.accuracy);
      }
    } catch (_) {
      // The next one tries again.
    } finally {
      _sending = false;
    }
  }
}

final busLocationSharerProvider = Provider.autoDispose<BusLocationSharer>((
  ref,
) {
  final sharer = BusLocationSharer(ref);
  ref.onDispose(() {
    sharer.stop();
    sharer.position.dispose();
    sharer.failed.dispose();
  });
  return sharer;
});

// The library

/// What the library's list shows: the words searched and the category.
typedef LibraryQuery = ({String query, String category});

final libraryBooksProvider = FutureProvider.autoDispose
    .family<LibraryBookPage, LibraryQuery>(
      (ref, q) => ref
          .read(yallappApiProvider)
          .listLibraryBooks(query: q.query, category: q.category),
    );

final libraryBookProvider = FutureProvider.autoDispose
    .family<LibraryBookDetail, int>(
      (ref, id) => ref.read(yallappApiProvider).getLibraryBook(id),
    );

/// The loans and holds of everyone the person follows (null), or of one of them.
final libraryLoansProvider = FutureProvider.autoDispose
    .family<LibraryLoans, int?>(
      (ref, person) =>
          ref.read(yallappApiProvider).listLibraryLoans(personId: person),
    );
