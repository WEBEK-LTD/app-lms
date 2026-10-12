import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../services/external_links.dart';

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
    this.debugLabel,
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
  final String? debugLabel;
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

class _PlatformWebViewState extends State<PlatformWebView> {
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
    _controller = WebViewController.fromPlatformCreationParams(params)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: _onNavigation,
          onPageFinished: (_) => widget.request.onPageFinished?.call(),
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
          if (value != null && value > 0) widget.request.onHeight?.call(value);
        },
      );
    if (widget.request.transparent) {
      _controller.setBackgroundColor(const Color(0x00000000));
    }
    _load();
  }

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
    if (!widget.request.openLinksOutside || !request.isMainFrame) {
      return NavigationDecision.navigate;
    }
    final uri = Uri.tryParse(request.url);
    if (uri == null || uri.scheme == 'about' || uri.scheme == 'data') {
      return NavigationDecision.navigate;
    }
    if (uri.host == _initialHost && widget.request.html == null) {
      return NavigationDecision.navigate;
    }
    unawaited(openExternal(request.url));
    return NavigationDecision.prevent;
  }

  @override
  Widget build(BuildContext context) => WebViewWidget(
    controller: _controller,
    gestureRecognizers: widget.request.scrollable
        ? {
            Factory<VerticalDragGestureRecognizer>(
              VerticalDragGestureRecognizer.new,
            ),
          }
        : const {},
  );
}

/// Escapes text for use inside an HTML attribute.
String htmlAttr(String value) =>
    const HtmlEscape(HtmlEscapeMode.attribute).convert(value);
