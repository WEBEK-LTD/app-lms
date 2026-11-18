import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/gate/app_gate.dart';
import '../../lms/data/lms_providers.dart';
import '../../store/data/store_providers.dart';
import 'page_providers.dart';

/// What tells the app it is back on screen (from another app, the home
/// screen or the lock screen). Tests give their own.
final appResumedProvider = Provider<Stream<void>>((ref) {
  final resumed = StreamController<void>.broadcast();
  final listener = AppLifecycleListener(onResume: () => resumed.add(null));
  ref.onDispose(() {
    listener.dispose();
    resumed.close();
  });
  return resumed.stream;
});

/// The time, for [resumeReloadProvider]'s wait. Tests give their own.
final resumeClockProvider = Provider<DateTime Function()>(
  (ref) => DateTime.now,
);

/// How long the app waits after it last asked before asking again on resume.
const resumeReloadGap = Duration(seconds: 20);

/// What the owner publishes reaches an app that stays open: back on screen
/// (at most once every [resumeReloadGap]), the app asks for its config
/// (colours, fonts, Studio › Screens, the store's settings, its languages)
/// and its tabs and pages again, in place. Nothing on screen changes when
/// nothing did; the pages on screen are asked again when the pages changed,
/// and the courses' home and 157 the shop's categories every time (the
/// owner adds and renames them in the dashboard). A paused, failed or
/// closed-for-maintenance app tries again.
final resumeReloadProvider = Provider<void>((ref) {
  final now = ref.watch(resumeClockProvider);
  var last = now();
  final subscription = ref.watch(appResumedProvider).listen((_) async {
    final at = now();
    if (at.difference(last) < resumeReloadGap) return;
    final gate = ref.read(appGateProvider);
    if (gate is GateLoading || gate is GateUpdateRequired) return;
    last = at;
    final notifier = ref.read(appGateProvider.notifier);
    if (gate is! GateReady) {
      await notifier.load();
      return;
    }
    await notifier.load(quiet: true);
    if (!ref.mounted) return;
    final after = ref.read(appGateProvider);
    if (after is GateReady && !identical(after.navigation, gate.navigation)) {
      ref.invalidate(pageProvider);
    }
    ref.invalidate(homeSectionsProvider);
    ref.invalidate(productCategoriesProvider);
  });
  ref.onDispose(subscription.cancel);
});
