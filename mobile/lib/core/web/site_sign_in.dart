import 'package:flutter_riverpod/misc.dart' show ProviderListenable;

import '../auth/auth_controller.dart';
import '../config/build_config.dart';
import '../providers.dart';

/// 124.9 Whether [build] is a WordPress app: its API is the Yallapp plugin
/// on its site (no `api_base_url`, so not the hosted API or a custom one).
bool isWordPressBuild(BuildConfigData build) =>
    (build.apiBaseUrl?.trim() ?? '').isEmpty &&
    (build.authBaseUrl?.trim() ?? '').isEmpty;

/// 124.9 Whether [page] is on the website at [siteUrl]: the same host, with
/// or without `www.`, on the same port, over https or the site's own scheme,
/// with no user name or password. The plugin checks the same.
bool isSitePage(Uri page, String siteUrl) {
  final site = Uri.tryParse(siteUrl);
  if (site == null || site.host.isEmpty || page.host.isEmpty) return false;
  if (page.userInfo.isNotEmpty) return false;
  if (page.scheme != 'https' && page.scheme != site.scheme) return false;
  if (!(page.scheme == 'https' || page.scheme == 'http')) return false;
  String bare(String host) {
    final h = host.toLowerCase();
    return h.startsWith('www.') ? h.substring(4) : h;
  }

  if (bare(page.host) != bare(site.host)) return false;
  // Uri gives the scheme's default port when none is written.
  final explicit = page.hasPort && page.port != _defaultPort(page.scheme);
  final siteExplicit = site.hasPort && site.port != _defaultPort(site.scheme);
  if (explicit != siteExplicit) return false;
  return !explicit || page.port == site.port;
}

int _defaultPort(String scheme) => scheme == 'https' ? 443 : 80;

/// 124.9 What a web page or tab of the app loads for [page]: on the app's
/// WordPress site with the student signed in, a one-time link that signs
/// them in there and lands on [page] (`POST /auth/web-link`); [appView],
/// the app hides the site's header and footer on it. Otherwise, and when
/// asking fails, [page] itself. [read] is a widget's or provider's `ref.read`.
Future<Uri> siteSignedInPage(
  T Function<T>(ProviderListenable<T> provider) read,
  Uri page, {
  bool appView = false,
}) async {
  final env = read(appEnvironmentProvider);
  final build = env.build;
  if (env.isPreview ||
      !isWordPressBuild(build) ||
      !read(authControllerProvider).isSignedIn ||
      !isSitePage(page, build.siteUrl) ||
      page.queryParameters.containsKey('yallapp_link')) {
    return page;
  }
  try {
    final link = await read(yallappApiProvider)
        .createWebLink(page.toString(), appView: appView)
        .timeout(const Duration(seconds: 10));
    final uri = Uri.tryParse(link.url);
    return uri != null && isSitePage(uri, build.siteUrl) ? uri : page;
  } catch (_) {
    return page;
  }
}
