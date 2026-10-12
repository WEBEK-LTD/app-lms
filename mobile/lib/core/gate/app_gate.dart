import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../api/models/models.dart';
import '../providers.dart';

/// Where the app stands after `GET /config`.
sealed class GateState {
  const GateState();
}

class GateLoading extends GateState {
  const GateLoading();
}

class GateReady extends GateState {
  const GateReady(this.config);
  final AppConfig config;
}

class GateMaintenance extends GateState {
  const GateMaintenance(this.message);
  final String? message;
}

class GateUpdateRequired extends GateState {
  const GateUpdateRequired();
}

class GateLicenseInactive extends GateState {
  const GateLicenseInactive(this.message);
  final String? message;
}

class GateFailed extends GateState {
  const GateFailed(this.error);
  final Object error;
}

/// Decides the gate state from a `/config` response.
GateState gateStateForConfig(AppConfig config) {
  if (config.app.updateRequired) return const GateUpdateRequired();
  if (config.app.maintenance) {
    return GateMaintenance(config.app.maintenanceMessage);
  }
  return GateReady(config);
}

/// Decides the gate state from an error, or null if it isn't a stop code.
GateState? gateStateForError(ApiException error) => switch (error.code) {
  ApiException.maintenance => GateMaintenance(error.message),
  ApiException.licenseInactive => GateLicenseInactive(error.message),
  ApiException.updateRequired => const GateUpdateRequired(),
  _ => null,
};

final appGateProvider = NotifierProvider<AppGate, GateState>(AppGate.new);

/// Loads the runtime config on start and switches to a full-screen state
/// for maintenance, a forced update or an inactive license, whenever the
/// server reports one.
class AppGate extends Notifier<GateState> {
  @override
  GateState build() {
    Future.microtask(load);
    return const GateLoading();
  }

  Future<void> load() async {
    state = const GateLoading();
    try {
      final config = await ref.read(yallappApiProvider).getConfig();
      state = gateStateForConfig(config);
    } on ApiException catch (e) {
      state = gateStateForError(e) ?? GateFailed(e);
    } on Object catch (e) {
      state = GateFailed(e);
    }
  }

  /// Called by the HTTP layer when any response carries a stop code.
  void report(ApiException error) {
    final next = gateStateForError(error);
    if (next != null) state = next;
  }
}

/// The runtime config. Only read below the gate, where it is always ready.
final appConfigProvider = Provider<AppConfig>((ref) {
  final gate = ref.watch(appGateProvider);
  if (gate is GateReady) return gate.config;
  throw StateError('The app config is not loaded.');
});
