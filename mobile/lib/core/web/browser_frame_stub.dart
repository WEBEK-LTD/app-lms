import 'package:flutter/widgets.dart';

import 'web_view.dart';

/// 40 Only the web build has browser frames; the phone apps use
/// [PlatformWebView].
class BrowserFrame extends StatelessWidget {
  const BrowserFrame({super.key, required this.request});

  final WebViewRequest request;

  @override
  Widget build(BuildContext context) => PlatformWebView(request: request);
}
