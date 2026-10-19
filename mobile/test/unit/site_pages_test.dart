import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_links.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../../tool/src/build_config_tool.dart';

/// 48 The site's own pages that open the app: the answers of
/// `GET /links/resolve` and the screens they open, which incoming addresses
/// are the site's pages, and what the build config makes of the site's paths.

BuildConfigData build(
  AppType type, {
  String? site = 'https://academy.example.com/a',
  List<String> paths = const ['/courses/', '/product/'],
}) => BuildConfigData(
  appType: type,
  appName: 'Ada',
  shortName: 'Ada',
  siteUrl: 'https://academy.example.com',
  androidPackage: 'com.ada.academy',
  iosBundleId: 'com.ada.academy',
  versionName: '1.0.0',
  versionCode: 1,
  primaryColor: 0xFF0E0D24,
  splashColor: 0xFFF4EFE6,
  template: AppTemplate.classic,
  font: 'Bricolage Grotesque',
  siteLinkBaseUrl: site,
  sitePaths: paths,
);

AppType typeOf(String wire) => AppType.values.firstWhere((t) => t.wire == wire);

void main() {
  final shared = jsonDecode(
    File('../docs/api/app-links.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  test('the resolved kinds are docs/api/app-links.json\'s', () {
    final rows = {
      for (final row in shared['resolved_kinds'] as List)
        (row as Map)['kind']: (
          route: row['route'],
          types: {for (final t in row['app_types'] as List) typeOf('$t')},
        ),
    };
    expect(rows.keys, resolvedKinds.keys);
    for (final MapEntry(:key, :value) in resolvedKinds.entries) {
      expect(value.route, rows[key]!.route, reason: key);
      expect(value.types, rows[key]!.types, reason: key);
    }
  });

  test('an answer opens its screen, anything else the in-app browser', () {
    expect(resolvedRoute('course', '12', AppType.lms), '/course/12');
    expect(resolvedRoute('lesson', '108', AppType.lms), '/lesson/108');
    expect(resolvedRoute('product', '3', AppType.store), '/product/3');
    expect(
      resolvedRoute('product_category', '7', AppType.store),
      '/shop?category=7',
    );
    expect(resolvedRoute('article', '431', AppType.news), '/article/431');
    expect(resolvedRoute('bookings', null, AppType.booking), Paths.services);
    expect(resolvedRoute('service', '4', AppType.booking), '/service/4');
    // No kind, another app type's kind, an unknown kind, a bad id: null.
    expect(resolvedRoute(null, null, AppType.lms), isNull);
    expect(resolvedRoute('product', '3', AppType.lms), isNull);
    expect(resolvedRoute('quiz', '3', AppType.lms), isNull);
    expect(resolvedRoute('course', 'intro', AppType.lms), isNull);
    expect(resolvedRoute('course', null, AppType.lms), isNull);
  });

  test('iOS: any address on the site\'s host is one of its pages', () {
    final b = build(AppType.lms);
    const page = 'https://academy.example.com/courses/intro/';
    expect(sitePageUrl(Uri.parse(page), b), page);
    expect(
      sitePageUrl(Uri.parse('https://Academy.example.com/2026/10/x/'), b),
      'https://academy.example.com/2026/10/x/',
    );
    expect(
      sitePageUrl(Uri.parse('https://elsewhere.example.com/courses/x/'), b),
      isNull,
    );
    expect(
      linkLocation(Uri.parse(page), b),
      Paths.openSitePage(page),
      reason: 'the router asks the site',
    );
    // /a/ links keep their own table.
    expect(
      linkLocation(Uri.parse('https://academy.example.com/a/course/12'), b),
      '/course/12',
    );
  });

  test('Android: a path under the site\'s paths that is not an app screen', () {
    final b = build(AppType.store);
    expect(
      sitePageUrl(Uri.parse('/product/blue-shirt/'), b),
      'https://academy.example.com/product/blue-shirt/',
    );
    expect(
      sitePageUrl(Uri.parse('/courses/intro/lessons/one/?ref=mail'), b),
      'https://academy.example.com/courses/intro/lessons/one/?ref=mail',
    );
    // The app's own screens, even under the same folder.
    for (final screen in [
      '/product/12',
      '/product/12/reviews',
      '/courses',
      '/home',
      '/article/news-1',
      '/open?url=x',
    ]) {
      expect(sitePageUrl(Uri.parse(screen), b), isNull, reason: screen);
      expect(linkLocation(Uri.parse(screen), b), isNull, reason: screen);
    }
    // A path the site didn't report, and builds without a site.
    expect(sitePageUrl(Uri.parse('/about-us/'), b), isNull);
    expect(
      sitePageUrl(Uri.parse('/courses/intro/'), build(AppType.lms, site: null)),
      isNull,
    );
    expect(
      sitePageUrl(Uri.parse('/courses/intro/'), build(AppType.lms, paths: [])),
      isNull,
    );
  });

  group('build config', () {
    Map<String, dynamic> config(Map<String, dynamic> links) => {
      'schema_version': 1,
      'app_type': 'lms',
      'app_name': 'Ada Academy',
      'short_name': 'Ada',
      'site_url': 'https://academy.example.com',
      'android_package': 'com.ada.academy',
      'ios_bundle_id': 'com.ada.academy',
      'version_name': '1.0.0',
      'version_code': 3,
      'branding': {
        'primary_color': '#0E0D24',
        'splash_color': '#F4EFE6',
        'template': 'classic',
        'font': 'Bricolage Grotesque',
      },
      'links': links,
    };
    const appId = '00000000-0000-0000-0000-000000000000';
    final links = {
      'app_id': appId,
      'yallapp_base_url': 'https://yallapp.com.tr/a/$appId',
      'site_base_url': 'https://academy.example.com/a',
      'site_paths': ['/courses/', '/lesson/'],
      'crash_report_url': 'https://yallapp.com.tr/api/app/$appId/crashes',
    };

    test('checks the site\'s paths', () {
      expect(validateBuildConfig(config(links)).isValid, isTrue);
      for (final bad in [
        ['courses'],
        ['/a b/'],
        ['/x/../'],
        'not a list',
        [for (var i = 0; i < 21; i++) '/p$i/'],
      ]) {
        expect(
          validateBuildConfig(config({...links, 'site_paths': bad})).isValid,
          isFalse,
          reason: '$bad',
        );
      }
      final withoutSite = {...links}..remove('site_base_url');
      expect(validateBuildConfig(config(withoutSite)).isValid, isFalse);
    });

    test('an intent filter per path on the site\'s host', () {
      final manifest = renderAndroidLinksManifest(config(links))!;
      expect(
        RegExp('android:autoVerify="true"').allMatches(manifest),
        hasLength(4),
      );
      for (final path in ['/a/', '/courses/', '/lesson/']) {
        expect(
          manifest,
          contains(
            'android:host="academy.example.com" android:pathPrefix="$path"',
          ),
        );
      }
    });

    test('the Dart config knows the paths', () {
      expect(
        renderDartConfig(config(links)),
        contains("sitePaths: ['/courses/', '/lesson/'],"),
      );
      final none = {...links}..remove('site_paths');
      expect(renderDartConfig(config(none)), contains('sitePaths: [],'));
    });
  });
}
