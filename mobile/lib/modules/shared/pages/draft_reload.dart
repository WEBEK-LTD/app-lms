import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/gate/app_gate.dart';
import '../../../core/preview/draft_updates.dart';
import '../../../core/providers.dart';
import 'page_providers.dart';

/// 82.1 What tells the app preview that the Pages & look draft was saved:
/// the editor around it (lib/core/preview/draft_updates.dart). Tests give
/// their own.
final draftSavedProvider = Provider<Stream<void>>((ref) {
  final preview = ref.watch(appEnvironmentProvider).preview;
  if (preview == null || !preview.draft) return const Stream.empty();
  return draftSavedMessages(Uri.parse(preview.platformUrl).origin);
});

/// 82.1 The app preview inside the Pages & look editor shows the draft as it
/// changes: each save reloads the tabs and pages in place (a quiet reload:
/// the screen stays, and keeps what it shows if the reload fails), a few
/// saves close together once.
final draftReloadProvider = Provider<void>((ref) {
  Timer? timer;
  final subscription = ref.watch(draftSavedProvider).listen((_) {
    timer?.cancel();
    timer = Timer(const Duration(milliseconds: 150), () {
      ref.read(appGateProvider.notifier).load(quiet: true);
      ref.invalidate(pageProvider);
    });
  });
  ref.onDispose(() {
    timer?.cancel();
    subscription.cancel();
  });
});
