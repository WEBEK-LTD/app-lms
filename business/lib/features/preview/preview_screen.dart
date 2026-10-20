import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

class _Draft extends Notifier<bool> {
  @override
  bool build() => false;
  void set(bool value) => state = value;
}

final previewDraftProvider = NotifierProvider<_Draft, bool>(_Draft.new);

final previewProvider = FutureProvider.autoDispose<Preview>(
  (ref) => ref
      .watch(apiProvider)
      .preview(
        ref.watch(appIdProvider),
        draft: ref.watch(previewDraftProvider),
      ),
);

/// Draws a web page; the tests replace it.
typedef WebPageBuilder = Widget Function(String url);

final webPageProvider = Provider<WebPageBuilder>(
  (ref) =>
      (url) => _WebPage(url: url),
);

/// 59 Try the app: the dashboard's "Preview your app", in the app (the
/// app's web build with a preview token, valid an hour).
class PreviewScreen extends ConsumerWidget {
  const PreviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final preview = ref.watch(previewProvider);
    final draft = ref.watch(previewDraftProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.previewApp),
        actions: [
          IconButton(
            tooltip: l10n.openInBrowser,
            onPressed: preview.value == null
                ? null
                : () => openLink(context, ref, preview.value!.url),
            icon: const Icon(AppIcons.web),
          ),
          IconButton(
            tooltip: l10n.refresh,
            onPressed: () => ref.invalidate(previewProvider),
            icon: const Icon(AppIcons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          if (app.hosted)
            SwitchListTile(
              value: draft,
              onChanged: (v) => ref.read(previewDraftProvider.notifier).set(v),
              title: Text(l10n.previewDraft),
              subtitle: Text(l10n.previewDraftHelp),
            ),
          Expanded(
            child: AsyncBody(
              value: preview,
              onRetry: () => ref.invalidate(previewProvider),
              builder: (p) => ref.watch(webPageProvider)(p.url),
            ),
          ),
        ],
      ),
    );
  }
}

class _WebPage extends StatefulWidget {
  const _WebPage({required this.url});

  final String url;

  @override
  State<_WebPage> createState() => _WebPageState();
}

class _WebPageState extends State<_WebPage> {
  late final WebViewController _controller = WebViewController()
    ..setJavaScriptMode(JavaScriptMode.unrestricted)
    ..loadRequest(Uri.parse(widget.url));

  @override
  void didUpdateWidget(_WebPage old) {
    super.didUpdateWidget(old);
    if (old.url != widget.url) _controller.loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) => WebViewWidget(controller: _controller);
}
