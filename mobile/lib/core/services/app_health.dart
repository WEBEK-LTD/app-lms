import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../gate/app_gate.dart';
import '../routing/app_router.dart';
import '../storage/local_settings.dart';
import 'crash_reporter.dart';
import 'review_prompt.dart';

/// 46 Once the app's config is loaded: crash reports go out when the owner
/// and the user allow them, with the screen they happened on, and this run
/// counts towards the rating prompt's rules. Watched once at the app root.
final appHealthProvider = Provider<void>((ref) {
  final gate = ref.watch(appGateProvider);
  final ready = gate is GateReady;
  final userAllows = ref.watch(
    localSettingsProvider.select((s) => s.crashReports),
  );
  final reporter = ref.watch(crashReporterProvider);
  if (reporter != null) {
    final ownerAllows = ready && gate.config.app.crashReports;
    reporter
      ..allowed = (() => ownerAllows && userAllows)
      ..screen = () {
        try {
          return ref
              .read(appRouterProvider)
              .routerDelegate
              .currentConfiguration
              .fullPath;
        } on Object {
          return null;
        }
      };
    if (ownerAllows && userAllows) unawaited(reporter.flush());
  }
  if (ready) ref.read(reviewPrompterProvider).recordSessionOnce();
});
