import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';

import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/buttons.dart';
import 'web_view.dart';
import '../l10n/l10n.dart';

class WebPageArgs {
  const WebPageArgs({
    required this.url,
    required this.title,
    this.headers = const {},
    this.completesOn,
    this.look,
  });

  final String url;
  final String title;

  /// 122 The owner's choices for a web page in the app: the site's header
  /// and footer hidden, its links kept in the app.
  final WebPageLook? look;
  final Map<String, String> headers;

  /// When a page the web view reaches matches, the screen closes with
  /// `true` (for example the shop's order received page).
  final bool Function(Uri url)? completesOn;
}

/// A page of the website shown in the app (for example the checkout).
///
/// Pops with `true` when closed after reaching a page that matches
/// [WebPageArgs.completesOn], and `false` otherwise.
class WebPageScreen extends ConsumerStatefulWidget {
  const WebPageScreen({super.key, required this.args});

  final WebPageArgs args;

  @override
  ConsumerState<WebPageScreen> createState() => _WebPageScreenState();
}

class _WebPageScreenState extends ConsumerState<WebPageScreen> {
  bool _completed = false;
  late final WebViewRequest _request = WebViewRequest(
    url: Uri.parse(widget.args.url),
    headers: widget.args.headers,
    onUrlChange: _onUrl,
    debugLabel: 'page',
    injectCss: widget.args.look?.css,
    openLinksOutside:
        widget.args.look != null && !widget.args.look!.linksInside,
  );

  void _onUrl(Uri url) {
    final test = widget.args.completesOn;
    if (!_completed && test != null && test(url) && mounted) {
      setState(() => _completed = true);
    }
  }

  void _close() => Navigator.of(context).pop(_completed);

  @override
  Widget build(BuildContext context) {
    final args = widget.args;
    final p = context.palette;
    final builder = ref.watch(webViewBuilderProvider);
    return PopScope<bool>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _close();
      },
      child: Scaffold(
        backgroundColor: p.surface,
        body: SafeArea(
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: p.divider)),
                ),
                child: Row(
                  children: [
                    SquareIconButton(
                      icon: AppIcons.close,
                      label: _completed
                          ? context.l10n.done
                          : context.l10n.close,
                      onPressed: _close,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        args.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(child: builder(_request)),
            ],
          ),
        ),
      ),
    );
  }
}
