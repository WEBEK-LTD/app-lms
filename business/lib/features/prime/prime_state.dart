import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/theme.dart';

/// 125 What a Prime app's owner chose on this phone: its look and whether
/// Today has the Prime header. Kept per app, like Settings › Appearance.
class PrimeLookController extends Notifier<PrimeLook> {
  @override
  PrimeLook build() {
    final appId = ref.watch(appIdProvider);
    return PrimeLook.parse(ref.watch(settingsProvider).primeLook(appId));
  }

  void set(PrimeLook look) {
    state = look;
    ref.read(settingsProvider).setPrimeLook(ref.read(appIdProvider), look.name);
  }
}

final primeLookProvider = NotifierProvider<PrimeLookController, PrimeLook>(
  PrimeLookController.new,
);

/// The look in use: the chosen one on a Prime app, else Classic.
final activeLookProvider = Provider<PrimeLook>((ref) {
  final app = ref.watch(currentAppProvider);
  if (app == null || !app.features.prime) return PrimeLook.classic;
  return ref.watch(primeLookProvider);
});

class PrimeHeaderController extends Notifier<bool> {
  @override
  bool build() =>
      ref.watch(settingsProvider).primeHeader(ref.watch(appIdProvider));

  void set(bool on) {
    state = on;
    ref.read(settingsProvider).setPrimeHeader(ref.read(appIdProvider), on);
  }
}

final primeHeaderProvider = NotifierProvider<PrimeHeaderController, bool>(
  PrimeHeaderController.new,
);
