import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';

import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/buttons.dart';
import 'media_permission.dart';
import 'site_sign_in.dart';
import 'web_view.dart';
import '../l10n/l10n.dart';

class WebPageArgs {
  const WebPageArgs({
    required this.url,
    required this.title,
    this.headers = const {},
    this.completesOn,
    this.look,
    this.ownerPage = false,
  });

  final String url;
  final String title;

  /// 122 The owner's choices for a web page in the app: the site's header
  /// and footer hidden, its links kept in the app.
  final WebPageLook? look;

  /// 124.9 A page the owner put in the app (a tab's, a button's or a
  /// banner's link): on the app's WordPress site it opens with the student
  /// signed in there, and it may have the camera and microphone when it
  /// asks and the student allows them.
  final bool ownerPage;
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
  late final Uri _page = Uri.parse(widget.args.url);
  WebViewRequest? _request;

  @override
  void initState() {
    super.initState();
    if (!widget.args.ownerPage) {
      _request = _requestFor(_page);
      return;
    }
    // 124.9 The site's own page opens signed in, by a one-time link.
    final look = widget.args.look;
    unawaited(
      siteSignedInPage(
        ref.read,
        _page,
        appView: look != null && look.hideHeader && look.hideFooter,
      ).then((url) {
        if (mounted) setState(() => _request = _requestFor(url));
      }),
    );
  }

  WebViewRequest _requestFor(Uri url) => WebViewRequest(
    url: url,
    headers: widget.args.headers,
    onUrlChange: _onUrl,
    debugLabel: 'page',
    injectCss: widget.args.look?.css,
    openLinksOutside:
        widget.args.look != null && !widget.args.look!.linksInside,
    pageHost: url == _page ? null : _page.host,
    onMediaRequest: widget.args.ownerPage
        ? pageMediaRequests(context, ref)
        : null,
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
              Expanded(
                child: _request == null
                    ? Center(
                        child: CircularProgressIndicator(
                          key: const ValueKey('web-page-signing-in'),
                          color: p.primary,
                        ),
                      )
                    : builder(_request!),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
