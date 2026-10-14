import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../api/models/models.dart';
import '../api/offline_cache.dart';
import '../api/yallapp_api.dart';
import 'owner_contact.dart';
import '../l10n/language.dart';
import '../providers.dart';

/// Where the app stands after `GET /config`.
sealed class GateState {
  const GateState();
}

class GateLoading extends GateState {
  const GateLoading();
}

class GateReady extends GateState {
  const GateReady(this.config, {this.navigation});
  final AppConfig config;

  /// The tabs and pages from `/pages`; null keeps the built-in tabs and
  /// `/home`.
  final Navigation? navigation;
}

class GateMaintenance extends GateState {
  const GateMaintenance(this.message);
  final String? message;
}

class GateUpdateRequired extends GateState {
  const GateUpdateRequired();
}

/// The app is paused (step 13.5): its owner's plan isn't active
/// (`license_inactive`) or their account is suspended (`account_suspended`).
/// The owner can bring it back; [contact] says how to reach them.
class GatePaused extends GateState {
  const GatePaused(this.message, {this.contact, this.suspended = false});
  final String? message;
  final OwnerContact? contact;
  final bool suspended;
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
  ApiException.licenseInactive ||
  ApiException.accountSuspended => GatePaused(
    error.message,
    contact: error.contact,
    suspended: error.code == ApiException.accountSuspended,
  ),
  ApiException.updateRequired => const GateUpdateRequired(),
  _ => null,
};

final appGateProvider = NotifierProvider<AppGate, GateState>(AppGate.new);

/// Loads the runtime config on start and switches to a full-screen state
/// for maintenance, a forced update or a paused app, whenever the server
/// reports one.
class AppGate extends Notifier<GateState> {
  @override
  GateState build() {
    Future.microtask(load);
    return const GateLoading();
  }

  /// Loads `/config`, then `/pages`. A [quiet] reload (after a language
  /// change) keeps the app on screen and keeps the current state if the
  /// reload fails.
  Future<void> load({bool quiet = false}) async {
    final previous = state;
    if (!quiet) state = const GateLoading();
    try {
      final api = ref.read(yallappApiProvider);
      final config = await api.getConfig();
      ref.read(remoteLanguagesProvider.notifier).update(config.languages);
      await _remember(config);
      final next = gateStateForConfig(config);
      if (next is! GateReady) {
        state = next;
        return;
      }
      final keep = previous is GateReady ? previous.navigation : null;
      state = GateReady(
        config,
        navigation: await _navigation(api, quiet ? keep : null),
      );
    } on ApiException catch (e) {
      final stop = gateStateForError(e);
      if (stop != null) {
        state = stop;
      } else if (!quiet || previous is! GateReady) {
        state = GateFailed(e);
      }
    } on Object catch (e) {
      if (!quiet || previous is! GateReady) state = GateFailed(e);
    }
  }

  /// Keeps what the app needs when it can't reach the server later: how to
  /// reach the owner (13.5), and whether offline mode is on (13.1).
  Future<void> _remember(AppConfig config) async {
    await OwnerContactStore.save(ref, config.site.contact);
    try {
      await ref.read(offlineCacheProvider).setEnabled(config.features.offline);
    } on Object {
      // No preferences (some tests): offline mode stays off.
    }
  }

  /// Pages are optional: any failure other than a stop code keeps the
  /// built-in tabs (or [fallback], the tabs already on screen).
  Future<Navigation?> _navigation(YallappApi api, Navigation? fallback) async {
    try {
      final navigation = await api.getPages();
      return (navigation != null && navigation.usable) ? navigation : null;
    } on ApiException catch (e) {
      if (gateStateForError(e) != null) rethrow;
      return fallback;
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

/// The published tabs and pages, or null for the built-in ones.
final navigationProvider = Provider<Navigation?>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady ? gate.navigation : null;
});
