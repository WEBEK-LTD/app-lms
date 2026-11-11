import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/gate/app_gate.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_view.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';

/// 122 A bottom tab that shows a web page in the app (`NavTab.target` of
/// type `url`, opened in the app): the tab's name over the page, no address
/// bar and the link never shown; the site's own header and footer hidden
/// when the owner chose (`Action.web`), and its links kept in the app.
class WebTabScreen extends ConsumerStatefulWidget {
  const WebTabScreen({super.key, required this.tabId});

  final String tabId;

  @override
  ConsumerState<WebTabScreen> createState() => _WebTabScreenState();
}

class _WebTabScreenState extends ConsumerState<WebTabScreen> {
  var _loading = true;
  var _failed = false;

  /// A new key loads the page again.
  var _load = 0;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final navigation = ref.watch(navigationProvider);
    final tab = [
      ...?navigation?.tabs,
      ...?navigation?.more,
      ...?navigation?.menu,
    ].where((t) => t.id == widget.tabId).firstOrNull;
    final target = tab?.target;
    final url = target?.url == null ? null : Uri.tryParse(target!.url!);
    final builder = ref.watch(webViewBuilderProvider);
    final look = target?.web;
    return Scaffold(
      backgroundColor: p.surface,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(
                        tab?.label ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                    ),
                  ),
                  SquareIconButton(
                    key: const ValueKey('web-tab-reload'),
                    icon: AppIcons.refresh,
                    label: MaterialLocalizations.of(context)
                        .refreshIndicatorSemanticLabel,
                    onPressed: () => setState(() {
                      _load += 1;
                      _loading = true;
                      _failed = false;
                    }),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 2,
              child: _loading
                  ? LinearProgressIndicator(
                      key: const ValueKey('web-tab-loading'),
                      minHeight: 2,
                      color: p.primary,
                      backgroundColor: p.divider,
                    )
                  : null,
            ),
            Expanded(
              child: url == null || _failed
                  ? ErrorView(
                      error: const FormatException('page'),
                      onRetry: () => setState(() {
                        _load += 1;
                        _failed = false;
                        _loading = true;
                      }),
                    )
                  : KeyedSubtree(
                      key: ValueKey('web-tab-${widget.tabId}-$_load'),
                      child: builder(
                        WebViewRequest(
                          url: url,
                          // Only the site's own pages stay, unless every link should.
                          openLinksOutside: !(look?.linksInside ?? false),
                          injectCss: look?.css,
                          onPageFinished: () {
                            if (mounted) setState(() => _loading = false);
                          },
                          onMainFrameError: () {
                            if (mounted) setState(() => _failed = true);
                          },
                          debugLabel: 'web-tab',
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
