import 'dart:js_interop';
import 'dart:ui_web' as ui_web;

import 'package:flutter/widgets.dart';
import 'package:web/web.dart' as web;

import 'web_view.dart';

/// 40 A web view in the app preview (the web build): the page in a frame.
///
/// - The page's JavaScript channels arrive as `message` events from the
///   frame, `{yallappChannel, message}`; [postToPage] posts
///   `{yallappMessage}` to it.
/// - The frame is sandboxed without popups or top-level navigation, so
///   nothing in it (or in its own frames) can open another page or tab.
/// - Pages with the app's own controls on top ([WebViewRequest.interactive]
///   false) don't take touches: they go to the app.
class BrowserFrame extends StatefulWidget {
  const BrowserFrame({super.key, required this.request});

  final WebViewRequest request;

  @override
  State<BrowserFrame> createState() => _BrowserFrameState();
}

class _BrowserFrameState extends State<BrowserFrame> implements WebViewHandle {
  static var _count = 0;
  final String _viewType = 'yallapp-browser-frame-${_count++}';
  late final web.HTMLIFrameElement _frame;
  late final JSFunction _onMessage = _handle.toJS;

  @override
  void initState() {
    super.initState();
    final r = widget.request;
    _frame = web.HTMLIFrameElement()
      ..allow = 'autoplay; encrypted-media; fullscreen'
      ..setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-presentation',
      )
      ..setAttribute('data-yallapp-frame', r.debugLabel ?? '');
    _frame.style
      ..setProperty('border', '0')
      ..setProperty('width', '100%')
      ..setProperty('height', '100%')
      ..setProperty('pointer-events', r.interactive ? 'auto' : 'none');
    final html = r.html;
    if (html != null) {
      _frame.srcdoc = html.toJS;
    } else {
      _frame.src = r.url.toString();
    }
    ui_web.platformViewRegistry.registerViewFactory(
      _viewType,
      (int _) => _frame,
    );
    web.window.addEventListener('message', _onMessage);
    r.onCreated?.call(this);
  }

  void _handle(web.MessageEvent event) {
    final window = _frame.contentWindow;
    if (window == null || !event.source.strictEquals(window).toDart) return;
    final data = event.data.dartify();
    if (data is! Map) return;
    final channel = data['yallappChannel'];
    final message = data['message'];
    if (channel is String && message is String) {
      widget.request.channels[channel]?.call(message);
    }
  }

  @override
  Future<void> postToPage(String message) async {
    _frame.contentWindow?.postMessage(
      {'yallappMessage': message}.jsify(),
      '*'.toJS,
    );
  }

  @override
  void dispose() {
    web.window.removeEventListener('message', _onMessage);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: _viewType);
}
