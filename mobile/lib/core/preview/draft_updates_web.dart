import 'dart:async';
import 'dart:js_interop';

import 'package:web/web.dart' as web;

/// 82.1 "The draft was saved", from the dashboard's Pages & look editor the
/// preview runs in: `{yallappPreview: "draft-saved"}` posted by the page
/// that holds this frame, from the platform's own origin. Anything else is
/// ignored.
Stream<void> draftSavedMessages(String platformOrigin) {
  late final StreamController<void> controller;
  late final JSFunction listener;
  void handle(web.MessageEvent event) {
    if (event.origin != platformOrigin) return;
    final parent = web.window.parent;
    if (parent == null || !event.source.strictEquals(parent).toDart) return;
    final data = event.data.dartify();
    if (data is Map && data['yallappPreview'] == 'draft-saved') {
      controller.add(null);
    }
  }

  listener = handle.toJS;
  controller = StreamController<void>(
    onListen: () => web.window.addEventListener('message', listener),
    onCancel: () => web.window.removeEventListener('message', listener),
  );
  return controller.stream;
}

/// 1.2 A block pressed in the app preview inside the Pages & look editor:
/// `{yallappPreview: "block-tapped", page, block}` to the page that holds
/// this frame, at the platform's own origin only, so the editor opens it.
void postBlockTapped(String platformOrigin, String page, String block) {
  final parent = web.window.parent;
  if (parent == null || parent.strictEquals(web.window).toDart) return;
  parent.postMessage(
    {'yallappPreview': 'block-tapped', 'page': page, 'block': block}.jsify(),
    platformOrigin.toJS,
  );
}
