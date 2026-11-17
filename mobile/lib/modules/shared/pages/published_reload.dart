import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import 'page_providers.dart';

/// How long after the last look the app looks again when it comes back.
const publishedCheckGap = Duration(seconds: 30);

/// What the owner published while the app was in the background shows when
/// it comes back to the screen, without starting it again: the app asks for
/// the tabs and pages (`GET /pages`, a 304 while nothing changed), and only a
/// new published version reloads the config, the tabs and the pages on
/// screen, quietly (the screen stays, and keeps what it shows if the reload
/// fails). The draft preview follows each save instead (draft_reload.dart).
final publishedReloadProvider = Provider<void>((ref) {
  final preview = ref.watch(appEnvironmentProvider).preview;
  if (preview != null && preview.draft) return;
  DateTime? checked;
  var busy = false;
  Future<void> check() async {
    final gate = ref.read(appGateProvider);
    if (gate is! GateReady || busy) return;
    final now = DateTime.now();
    final last = checked;
    if (last != null && now.difference(last) < publishedCheckGap) return;
    checked = now;
    busy = true;
    try {
      final latest = await ref.read(yallappApiProvider).getPages();
      final shown = gate.navigation?.version;
      final published = latest != null && latest.usable ? latest.version : null;
      if (published == shown) return;
      await ref.read(appGateProvider.notifier).load(quiet: true);
      ref.invalidate(pageProvider);
    } on Object {
      // Not reachable now: what's on screen stays; the next return asks again.
      checked = null;
    } finally {
      busy = false;
    }
  }

  final lifecycle = AppLifecycleListener(onResume: () => unawaited(check()));
  ref.onDispose(lifecycle.dispose);
});
