import 'dart:async';

import 'package:flutter/widgets.dart';
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

/// 1.2 In the app preview inside the Pages & look editor, what tells the
/// editor that a block was pressed (page slug, block ID), so it opens that
/// block's settings; null everywhere else. Tests give their own.
final blockTappedProvider = Provider<void Function(String page, String block)?>(
  (ref) {
    final preview = ref.watch(appEnvironmentProvider).preview;
    if (preview == null || !preview.draft) return null;
    final origin = Uri.parse(preview.platformUrl).origin;
    return (page, block) => postBlockTapped(origin, page, block);
  },
);

/// 1.2 Reports a press on [child] (not a scroll or a drag) to
/// [blockTappedProvider], without taking it: buttons and links in the block
/// still work. Nothing is added outside the editor's preview.
class BlockTapReporter extends ConsumerStatefulWidget {
  const BlockTapReporter({
    super.key,
    required this.pageSlug,
    required this.blockId,
    required this.child,
  });

  final String pageSlug;
  final String blockId;
  final Widget child;

  @override
  ConsumerState<BlockTapReporter> createState() => _BlockTapReporterState();
}

class _BlockTapReporterState extends ConsumerState<BlockTapReporter> {
  Offset? _down;
  DateTime? _at;

  @override
  Widget build(BuildContext context) {
    final report = ref.watch(blockTappedProvider);
    if (report == null) return widget.child;
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (event) {
        _down = event.position;
        _at = DateTime.now();
      },
      onPointerCancel: (_) => _down = null,
      onPointerUp: (event) {
        final down = _down;
        final at = _at;
        _down = null;
        if (down == null || at == null) return;
        final still = (event.position - down).distance < 12;
        final quick =
            DateTime.now().difference(at) < const Duration(milliseconds: 600);
        if (still && quick) report(widget.pageSlug, widget.blockId);
      },
      child: widget.child,
    );
  }
}
