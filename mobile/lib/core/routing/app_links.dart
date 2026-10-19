/// 46 Links that open the app (Android App Links, iOS Universal Links).
///
/// The one table of `docs/api/app-links.json` (the platform and the plugin
/// follow it too; `app_links_test.dart` keeps this copy identical): a link is
/// `<base>/<kind>/<id>`, where `<base>` is `https://yallapp.com.tr/a/<app_id>`
/// on Yallapp's link domain or `<site>/a` on a WordPress site. The phone hands
/// an opened link to the router (Flutter's deep linking), whose redirect maps
/// it here; Share buttons make links the same way.
library;

import '../config/build_config_data.dart';
import 'paths.dart';

/// One row of the table: where the kind opens and the shape of its id.
typedef LinkKindRule = ({String route, String id, Set<AppType> types});

const _allTypes = {...AppType.values};

const linkKinds = <String, LinkKindRule>{
  'course': (route: '/course/{id}', id: 'number', types: {AppType.lms}),
  'product': (route: '/product/{id}', id: 'number', types: {AppType.store}),
  'service': (route: '/service/{id}', id: 'number', types: {AppType.booking}),
  'listing': (
    route: '/listing/{id}',
    id: 'number',
    types: {AppType.realEstate},
  ),
  'article': (route: '/article/{id}', id: 'text', types: {AppType.news}),
  'event': (route: '/event/{id}', id: 'number', types: {AppType.events}),
  'campaign': (
    route: '/campaign/{id}',
    id: 'number',
    types: {AppType.donations},
  ),
  'page': (route: '/page/{id}', id: 'slug', types: _allTypes),
};

final linkIdPatterns = <String, RegExp>{
  'number': RegExp(r'^[1-9][0-9]{0,17}$'),
  'text': RegExp(r'^[A-Za-z0-9_-]{1,64}$'),
  'slug': RegExp(r'^[a-z0-9-]{1,64}$'),
};

final _appIdPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
);

/// The screen a kind and id open in this app type, or null when it has no
/// such screen or the id doesn't match.
String? routeForKind(String kind, String id, AppType appType) {
  final rule = linkKinds[kind];
  if (rule == null || !rule.types.contains(appType)) return null;
  if (!linkIdPatterns[rule.id]!.hasMatch(id)) return null;
  return rule.route.replaceFirst('{id}', Uri.encodeComponent(id));
}

/// Where the router sends a location that is a link: its screen, or the home
/// page for a link it can't open. Null when [location] isn't a link (a
/// screen of the app). [location] is a path (Android) or a whole address
/// (iOS hands the router the link as it is).
///
/// A link is `/a/<app_id>/<kind>/<id>` (Yallapp's link domain; another
/// app's ID opens the home page) or `<site path>/a/<kind>/<id>`.
String? linkLocation(Uri location, BuildConfigData build) {
  final segments = location.pathSegments.where((s) => s.isNotEmpty).toList();
  final sitePath = _sitePathSegments(build);
  // The site's own path first (a WordPress site in a folder), then `a`.
  var start = 0;
  if (sitePath.isNotEmpty &&
      segments.length > sitePath.length &&
      _startsWith(segments, sitePath) &&
      segments[sitePath.length] == 'a') {
    start = sitePath.length;
  }
  if (segments.length <= start || segments[start] != 'a') return null;
  final rest = segments.sublist(start + 1);
  if (rest.length == 3 && _appIdPattern.hasMatch(rest[0])) {
    final own = build.appId;
    if (own != null && own != rest[0]) return Paths.home;
    return routeForKind(rest[1], rest[2], build.appType) ?? Paths.home;
  }
  if (rest.length == 2) {
    return routeForKind(rest[0], rest[1], build.appType) ?? Paths.home;
  }
  return Paths.home;
}

List<String> _sitePathSegments(BuildConfigData build) {
  final base = build.siteLinkBaseUrl;
  if (base == null) return const [];
  final segments = Uri.parse(base).pathSegments.where((s) => s.isNotEmpty);
  // `<site path>/a`: everything before the last `a`.
  final list = segments.toList();
  return list.isEmpty ? const [] : list.sublist(0, list.length - 1);
}

bool _startsWith(List<String> list, List<String> prefix) {
  for (var i = 0; i < prefix.length; i++) {
    if (list[i] != prefix[i]) return false;
  }
  return true;
}

/// The base Share buttons use: `Config.links`, else this build's own (a
/// WordPress site's, then Yallapp's link domain). Null in development builds
/// and the preview, which then share the item's name only.
String? shareBaseUrl({String? configBase, required BuildConfigData build}) {
  final base = configBase ?? build.siteLinkBaseUrl ?? build.linkBaseUrl;
  if (base == null || base.isEmpty) return null;
  return base.replaceAll(RegExp(r'/+$'), '');
}

/// A shared link, `<base>/<kind>/<id>`, or null without a base.
String? shareLink(String? base, String kind, Object id) =>
    base == null ? null : '$base/$kind/${Uri.encodeComponent('$id')}';
