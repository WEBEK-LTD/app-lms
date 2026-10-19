import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_links.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../../tool/src/build_config_tool.dart';

/// 46 Links that open the app: the table of docs/api/app-links.json, both
/// ways, and what the build config makes of it.

const appId = '00000000-0000-0000-0000-000000000000';

BuildConfigData build(AppType type, {String? site, String? id = appId}) =>
    BuildConfigData(
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
      appId: id,
      linkBaseUrl: id == null ? null : 'https://yallapp.com.tr/a/$id',
      siteLinkBaseUrl: site,
    );

AppType typeOf(String wire) => AppType.values.firstWhere((t) => t.wire == wire);

void main() {
  final shared = jsonDecode(
    File('../docs/api/app-links.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  test('the table is docs/api/app-links.json', () {
    final kinds = {
      for (final row in shared['kinds'] as List)
        (row as Map)['kind']: (
          route: row['route'],
          id: row['id'],
          types: {for (final t in row['app_types'] as List) typeOf('$t')},
        ),
    };
    expect(kinds.keys, linkKinds.keys);
    for (final MapEntry(:key, :value) in linkKinds.entries) {
      expect(value.route, kinds[key]!.route, reason: key);
      expect(value.id, kinds[key]!.id, reason: key);
      expect(value.types, kinds[key]!.types, reason: key);
    }
    final patterns = shared['id_patterns'] as Map<String, dynamic>;
    for (final MapEntry(:key, :value) in patterns.entries) {
      expect(linkIdPatterns[key]!.pattern, value, reason: key);
    }
  });

  test('every example link opens its screen; other addresses are no link', () {
    for (final example in shared['examples'] as List) {
      final link = Uri.parse(example['link'] as String);
      final site = link.host == 'yallapp.com.tr'
          ? null
          : 'https://${link.host}/a';
      final location = linkLocation(
        link,
        build(typeOf(example['app_type'] as String), site: site),
      );
      final route = example['route'] as String?;
      final isLink = link.path.startsWith('/a/');
      // 48 Another page of the site: the app asks the site what it is.
      expect(
        location,
        route ?? (isLink ? Paths.home : Paths.openSitePage('$link')),
        reason: example['link'] as String,
      );
    }
  });

  test('both ways: a shared link opens the screen it was made for', () {
    for (final MapEntry(key: kind, value: rule) in linkKinds.entries) {
      final id = switch (rule.id) {
        'number' => '42',
        'text' => 'summer_news-1',
        _ => 'offers',
      };
      final type = rule.types.first;
      final config = build(type, site: 'https://academy.example.com/a');
      for (final base in [
        'https://yallapp.com.tr/a/$appId',
        'https://academy.example.com/a',
      ]) {
        final link = shareLink(base, kind, id)!;
        // Android hands the router the path, iOS the whole address.
        for (final location in [
          Uri.parse(link),
          Uri.parse(Uri.parse(link).path),
        ]) {
          expect(
            linkLocation(location, config),
            rule.route.replaceFirst('{id}', id),
            reason: '$link ($location)',
          );
        }
      }
    }
  });

  test('a site in a folder, another app, and what is not a link', () {
    final lms = build(AppType.lms, site: 'https://example.com/learn/a');
    expect(linkLocation(Uri.parse('/learn/a/course/7'), lms), '/course/7');
    expect(linkLocation(Uri.parse('/a/course/7'), lms), '/course/7');
    expect(
      linkLocation(
        Uri.parse('/a/11111111-1111-1111-1111-111111111111/course/7'),
        lms,
      ),
      Paths.home,
    );
    expect(linkLocation(Uri.parse('/a/course/7/x'), lms), Paths.home);
    expect(linkLocation(Uri.parse('/course/7'), lms), isNull);
    expect(linkLocation(Uri.parse('/page/a'), lms), isNull);
    expect(linkLocation(Uri.parse('/home'), lms), isNull);
    // Before Phase 46 builds don't know their app ID: any app's link maps.
    expect(
      linkLocation(
        Uri.parse('/a/$appId/course/7'),
        build(AppType.lms, id: null),
      ),
      '/course/7',
    );
  });

  test('Share uses Config.links, then the site, then Yallapp\'s domain', () {
    final b = build(AppType.lms, site: 'https://academy.example.com/a');
    expect(
      shareBaseUrl(configBase: 'https://cdn.example.com/a/', build: b),
      'https://cdn.example.com/a',
    );
    expect(shareBaseUrl(build: b), 'https://academy.example.com/a');
    expect(
      shareBaseUrl(build: build(AppType.lms)),
      'https://yallapp.com.tr/a/$appId',
    );
    expect(shareBaseUrl(build: build(AppType.lms, id: null)), isNull);
    expect(shareLink(null, 'course', 1), isNull);
    expect(
      shareLink('https://yallapp.com.tr/a/$appId', 'article', 'a b'),
      'https://yallapp.com.tr/a/$appId/article/a%20b',
    );
  });

  test('a notification with a link opens it through the same table', () {
    expect(
      pushTargetLocation({
        'type': 'announcement',
        'link': 'https://academy.example.com/a/course/7',
      }),
      '/a/course/7',
    );
    expect(
      pushTargetLocation({'type': 'announcement', 'course_id': 3, 'link': 'x'}),
      '/course/3',
    );
    expect(
      pushTargetLocation({'type': 'announcement', 'link': 'http://x/a/c/1'}),
      Paths.home,
    );
  });

  group('build config', () {
    Map<String, dynamic> config({Map<String, dynamic>? links}) => {
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
      'links': ?links,
    };
    final links = {
      'app_id': appId,
      'yallapp_base_url': 'https://yallapp.com.tr/a/$appId',
      'site_base_url': 'https://academy.example.com/learn/a',
      'crash_report_url': 'https://yallapp.com.tr/api/app/$appId/crashes',
    };

    test('checks links', () {
      expect(validateBuildConfig(config(links: links)).isValid, isTrue);
      expect(validateBuildConfig(config()).isValid, isTrue);
      final bad = validateBuildConfig(
        config(
          links: {
            ...links,
            'yallapp_base_url': 'http://yallapp.com.tr/a/x',
            'extra': 1,
          },
        ),
      );
      expect(bad.errors, hasLength(2));
      expect(
        validateBuildConfig(config(links: {'app_id': appId})).errors,
        hasLength(2),
      );
    });

    test('an App Links intent filter per host, verified, for its path', () {
      final manifest = renderAndroidLinksManifest(config(links: links))!;
      expect(
        RegExp('android:autoVerify="true"').allMatches(manifest),
        hasLength(2),
      );
      expect(
        manifest,
        contains(
          'android:host="yallapp.com.tr" android:pathPrefix="/a/$appId/"',
        ),
      );
      expect(
        manifest,
        contains(
          'android:host="academy.example.com" android:pathPrefix="/learn/a/"',
        ),
      );
      expect(manifest, contains('flutter_deeplinking_enabled'));
      expect(manifest, contains('com.yallapp.app.MainActivity'));
      expect(renderAndroidLinksManifest(config()), isNull);
    });

    test('the Dart config knows the links and where crash reports go', () {
      final dart = renderDartConfig(config(links: links));
      expect(dart, contains("appId: '$appId'"));
      expect(dart, contains("linkBaseUrl: 'https://yallapp.com.tr/a/$appId'"));
      expect(
        dart,
        contains("siteLinkBaseUrl: 'https://academy.example.com/learn/a'"),
      );
      expect(dart, contains('/crashes'));
      expect(renderDartConfig(config()), contains('crashReportUrl: null'));
    });
  });
}
