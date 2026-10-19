import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/build_config.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import 'download_manager.dart';
import 'progress_queue.dart';

/// 45 Each time an Academy app starts online with a student signed in: sends
/// the progress made offline, then checks whether the student may keep the
/// lessons saved on the phone. Signing out deletes both: they belong to the
/// student. Watched once at the app root.
final learningSyncProvider = Provider<void>((ref) {
  if (ref.watch(appEnvironmentProvider).build.appType != AppType.lms) return;
  final auth = ref.watch(authControllerProvider);
  if (auth is AuthChecking) return;
  final queue = ref.read(progressQueueProvider);
  final downloads = ref.read(downloadManagerProvider.notifier);
  if (auth is SignedOut) {
    unawaited(() async {
      await queue.clear();
      await downloads.ready;
      if (!ref.read(downloadManagerProvider).index.isEmpty) {
        await downloads.deleteAll();
      }
    }());
    return;
  }
  final gate = ref.watch(appGateProvider);
  if (gate is! GateReady) return;
  final downloadsOn = gate.config.features.downloads;
  final api = ref.read(yallappApiProvider);
  Timer? retry;
  var disposed = false;
  ref.onDispose(() {
    disposed = true;
    retry?.cancel();
  });
  unawaited(() async {
    await queue.flush(api);
    await downloads.verify(downloadsOn: downloadsOn);
    // Progress still waiting (no connection yet) goes out as soon as the
    // connection is back: tried every minute until it's sent.
    if (disposed || queue.isEmpty) return;
    retry = Timer.periodic(const Duration(minutes: 1), (timer) async {
      await queue.flush(api);
      if (queue.isEmpty) timer.cancel();
    });
  }());
});
