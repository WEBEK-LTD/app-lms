import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/routing/app_links.dart';
import '../../../core/routing/paths.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/common.dart';

/// 48 One of the site's own pages opened the app (its permalink, not a
/// `<base>/<kind>/<id>` link): the app asks the site what it is
/// (`GET /links/resolve`) and opens that screen. Anything else (no kind, a
/// kind this app type lacks, an error, an older plugin) opens the address in
/// the in-app browser, a web view, which never hands an address back to the
/// phone, so a link never loops.
class LinkOpenScreen extends ConsumerStatefulWidget {
  const LinkOpenScreen({super.key, required this.url});

  final String url;

  @override
  ConsumerState<LinkOpenScreen> createState() => _LinkOpenScreenState();
}

/// The last address sent to the in-app browser, and when. The same address
/// arriving again within [_repeatWindow] goes straight to the browser
/// without asking (a second guard against loops).
({String url, DateTime at})? _lastToBrowser;
const _repeatWindow = Duration(seconds: 10);

/// For tests.
void forgetLastLinkOpened() => _lastToBrowser = null;

class _LinkOpenScreenState extends ConsumerState<LinkOpenScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _open());
  }

  Future<void> _open() async {
    final uri = Uri.tryParse(widget.url);
    final build = ref.read(appEnvironmentProvider).build;
    final last = _lastToBrowser;
    final repeated =
        last != null &&
        last.url == widget.url &&
        DateTime.now().difference(last.at) < _repeatWindow;
    String? route;
    if (uri != null &&
        (uri.scheme == 'https' || uri.scheme == 'http') &&
        !repeated) {
      try {
        final answer = await ref
            .read(yallappApiProvider)
            .resolveLink(widget.url);
        route = resolvedRoute(answer.kind, answer.id, build.appType);
      } catch (_) {
        route = null;
      }
    }
    if (!mounted) return;
    final router = GoRouter.of(context);
    if (route != null) {
      router.go(route);
      return;
    }
    router.go(Paths.home);
    if (uri == null || (uri.scheme != 'https' && uri.scheme != 'http')) return;
    _lastToBrowser = (url: widget.url, at: DateTime.now());
    router.push(
      Paths.web,
      extra: WebPageArgs(url: widget.url, title: uri.host),
    );
  }

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: SafeArea(child: LoadingView()));
}
