import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../services/external_links.dart';
import 'media_permission.dart';

/// What a web view should show and report.
@immutable
class WebViewRequest {
  const WebViewRequest({
    this.url,
    this.html,
    this.baseUrl,
    this.headers = const {},
    this.onHeight,
    this.onMainFrameError,
    this.onPageFinished,
    this.onUrlChange,
    this.openLinksOutside = false,
    this.transparent = false,
    this.scrollable = true,
    this.interactive = true,
    this.channels = const {},
    this.onCreated,
    this.allowNavigation,
    this.browserFrame = false,
    this.debugLabel,
    this.injectCss,
    this.pageHost,
    this.onMediaRequest,
  }) : assert(url != null || html != null);

  /// Loaded as the top-level page.
  final Uri? url;

  /// Loaded with [baseUrl] as its origin (used for iframe wrappers).
  final String? html;
  final String? baseUrl;
  final Map<String, String> headers;

  /// Content height in logical pixels, reported by the page through the
  /// `YallappHeight` JavaScript channel.
  final ValueChanged<double>? onHeight;
  final VoidCallback? onMainFrameError;
  final VoidCallback? onPageFinished;

  /// Every page the web view moves to (for example the order received page
  /// after a checkout).
  final ValueChanged<Uri>? onUrlChange;

  /// Top-level navigations away from the loaded page open in the browser.
  final bool openLinksOutside;
  final bool transparent;

  /// False for inline embeds that are sized to their content: vertical drags
  /// then scroll the lesson instead of the web view.
  final bool scrollable;

  /// 40 False when the app draws its own controls over the page: touches
  /// never reach the page.
  final bool interactive;

  /// 40 JavaScript channels the page posts text to (`Name.postMessage(text)`),
  /// besides `YallappHeight`.
  final Map<String, ValueChanged<String>> channels;

  /// 40 Called once the page can be sent text (see [WebViewHandle]).
  final ValueChanged<WebViewHandle>? onCreated;

  /// 40 Decides every navigation, in the page and in its frames, instead of
  /// [openLinksOutside]: refused ones open nowhere.
  final NavigationPolicy? allowNavigation;

  /// 40 The page also works in a frame in a browser, so the app preview (the
  /// web build) shows it instead of its "installed app only" note.
  final bool browserFrame;
  final String? debugLabel;

  /// 122 Style rules the page gets as it loads and once it has (a site's
  /// own header and footer hidden in a web page tab).
  final String? injectCss;

  /// 124.9 With [openLinksOutside], the host whose pages also stay in the
  /// app: the page's own when [url] is a one-time sign-in link on the
  /// site's address that lands on it (`www.` either way).
  final String? pageHost;

  /// 124.9 The page may have the camera and microphone when it asks, once
  /// the person allows them; without it, or for anything else, the page's
  /// request is refused (see [mediaToAsk]).
  final MediaRequestHandler? onMediaRequest;
}

/// 40 Whether a web view may load [uri], in the page itself ([mainFrame]) or
/// in one of its frames.
typedef NavigationPolicy = bool Function(Uri uri, bool mainFrame);

/// 40 Sends text to the page in a web view, which receives it in
/// `window.yallappReceive(text)` (or, in a browser frame, as a `message`
/// event whose data is `{yallappMessage: text}`).
abstract interface class WebViewHandle {
  Future<void> postToPage(String message);
}

typedef WebViewBuilder = Widget Function(WebViewRequest request);

/// Builds web views. Tests override it with a placeholder because platform
/// web views don't exist in widget tests.
final webViewBuilderProvider = Provider<WebViewBuilder>(
  (ref) =>
      (request) => PlatformWebView(request: request),
);

/// A `webview_flutter` web view configured for lesson content.
class PlatformWebView extends StatefulWidget {
  const PlatformWebView({super.key, required this.request});

  final WebViewRequest request;

  @override
  State<PlatformWebView> createState() => _PlatformWebViewState();
}

class _PlatformWebViewState extends State<PlatformWebView>
    implements WebViewHandle {
  late final WebViewController _controller;
  String? _initialHost;

  @override
  void initState() {
    super.initState();
    final params = WebViewPlatform.instance is WebKitWebViewPlatform
        ? WebKitWebViewControllerCreationParams(
            allowsInlineMediaPlayback: true,
            mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
          )
        : const PlatformWebViewControllerCreationParams();
    _controller =
        WebViewController.fromPlatformCreationParams(
            params,
            onPermissionRequest: widget.request.onMediaRequest == null
                ? null
                : _onPermissionRequest,
          )
          ..setJavaScriptMode(JavaScriptMode.unrestricted)
          ..setNavigationDelegate(
            NavigationDelegate(
              onNavigationRequest: _onNavigation,
              onPageStarted: (_) => _injectCss(),
              onPageFinished: (_) {
                _injectCss();
                widget.request.onPageFinished?.call();
              },
              onUrlChange: (change) {
                final uri = Uri.tryParse(change.url ?? '');
                if (uri != null) widget.request.onUrlChange?.call(uri);
              },
              onWebResourceError: (error) {
                if (error.isForMainFrame ?? true) {
                  widget.request.onMainFrameError?.call();
                }
              },
            ),
          )
          ..addJavaScriptChannel(
            'YallappHeight',
            onMessageReceived: (message) {
              final value = double.tryParse(message.message);
              if (value != null && value > 0) {
                widget.request.onHeight?.call(value);
              }
            },
          );
    for (final name in widget.request.channels.keys) {
      _controller.addJavaScriptChannel(
        name,
        onMessageReceived: (message) =>
            widget.request.channels[name]?.call(message.message),
      );
    }
    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      // 40 The app's own play button starts the video from the page's code.
      unawaited(platform.setMediaPlaybackRequiresUserGesture(false));
    }
    if (widget.request.transparent) {
      _controller.setBackgroundColor(const Color(0x00000000));
    }
    _load();
    widget.request.onCreated?.call(this);
  }

  /// 122 Adds [WebViewRequest.injectCss] to the page, once (again after
  /// the page replaced its head).
  void _injectCss() {
    final css = widget.request.injectCss;
    if (css == null || css.isEmpty) return;
    unawaited(
      _controller
          .runJavaScript(
            '(function(){var s=document.getElementById("yallapp-css");'
            'if(!s){s=document.createElement("style");s.id="yallapp-css";'
            '(document.head||document.documentElement).appendChild(s);}'
            's.textContent=${jsonEncode(css)};})();',
          )
          .catchError((_) {}),
    );
  }

  /// 124.9 The camera and microphone, only for this page while it is open,
  /// and only once the person allowed them; anything else is refused.
  Future<void> _onPermissionRequest(WebViewPermissionRequest request) async {
    final handler = widget.request.onMediaRequest;
    final ask = mediaToAsk(request.types, pageOpen: mounted);
    if (handler == null || ask == null) {
      await request.deny();
      return;
    }
    var granted = false;
    try {
      granted = await handler(camera: ask.camera, microphone: ask.microphone);
    } catch (_) {}
    if (granted && mounted) {
      await request.grant();
    } else {
      await request.deny();
    }
  }

  @override
  Future<void> postToPage(String message) => _controller.runJavaScript(
    'window.yallappReceive && window.yallappReceive(${jsonEncode(message)});',
  );

  @override
  void didUpdateWidget(PlatformWebView old) {
    super.didUpdateWidget(old);
    if (old.request.url != widget.request.url ||
        old.request.html != widget.request.html) {
      _load();
    }
  }

  void _load() {
    final r = widget.request;
    if (r.html != null) {
      _initialHost = Uri.tryParse(r.baseUrl ?? '')?.host;
      unawaited(_controller.loadHtmlString(r.html!, baseUrl: r.baseUrl));
    } else {
      _initialHost = r.url!.host;
      unawaited(_controller.loadRequest(r.url!, headers: r.headers));
    }
  }

  FutureOr<NavigationDecision> _onNavigation(NavigationRequest request) {
    final policy = widget.request.allowNavigation;
    if (policy != null) {
      final uri = Uri.tryParse(request.url);
      return uri != null && policy(uri, request.isMainFrame)
          ? NavigationDecision.navigate
          : NavigationDecision.prevent;
    }
    if (!widget.request.openLinksOutside || !request.isMainFrame) {
      return NavigationDecision.navigate;
    }
    final uri = Uri.tryParse(request.url);
    if (uri == null || uri.scheme == 'about' || uri.scheme == 'data') {
      return NavigationDecision.navigate;
    }
    if ((uri.host == _initialHost || uri.host == widget.request.pageHost) &&
        widget.request.html == null) {
      return NavigationDecision.navigate;
    }
    unawaited(openExternal(request.url));
    return NavigationDecision.prevent;
  }

  @override
  Widget build(BuildContext context) {
    final interactive = widget.request.interactive;
    return IgnorePointer(
      ignoring: !interactive,
      child: WebViewWidget(
        controller: _controller,
        gestureRecognizers: interactive && widget.request.scrollable
            ? {
                Factory<VerticalDragGestureRecognizer>(
                  VerticalDragGestureRecognizer.new,
                ),
              }
            : const {},
      ),
    );
  }
}

/// 124.9 Forgets what the app's web views keep (the website's sign-in
/// among it), when the student signs out of the app.
Future<void> clearWebSessions() async {
  if (kIsWeb || WebViewPlatform.instance == null) return;
  try {
    await WebViewCookieManager().clearCookies();
  } catch (_) {
    // Nothing to forget.
  }
}

/// Escapes text for use inside an HTML attribute.
String htmlAttr(String value) =>
    const HtmlEscape(HtmlEscapeMode.attribute).convert(value);
