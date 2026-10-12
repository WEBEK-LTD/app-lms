import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/buttons.dart';
import 'web_view.dart';

class WebPageArgs {
  const WebPageArgs({
    required this.url,
    required this.title,
    this.headers = const {},
  });

  final String url;
  final String title;
  final Map<String, String> headers;
}

/// A page of the website shown in the app (for example the checkout).
class WebPageScreen extends ConsumerWidget {
  const WebPageScreen({super.key, required this.args});

  final WebPageArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final builder = ref.watch(webViewBuilderProvider);
    return Scaffold(
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
                    label: 'Close',
                    onPressed: () => Navigator.of(context).maybePop(),
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
              child: builder(
                WebViewRequest(
                  url: Uri.parse(args.url),
                  headers: args.headers,
                  debugLabel: 'page',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
