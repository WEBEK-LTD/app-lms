import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config.dart';

import '../../tool/src/build_config_tool.dart';

Map<String, dynamic> example() =>
    jsonDecode(File('config/example.json').readAsStringSync())
        as Map<String, dynamic>;

void main() {
  test('config/example.json is valid', () {
    final result = validateBuildConfig(example());
    expect(result.errors, isEmpty);
  });

  test('reports missing fields, bad patterns and unknown keys', () {
    final c = example()
      ..remove('app_name')
      ..['site_url'] = 'http://insecure.test'
      ..['android_package'] = 'Com.Bad'
      ..['ios_bundle_id'] = 'nodot'
      ..['version_name'] = '1.0'
      ..['version_code'] = 0
      ..['short_name'] = 'A name that is far too long'
      ..['extra'] = true;
    (c['branding'] as Map<String, dynamic>)
      ..['primary_color'] = 'navy'
      ..['template'] = 'fancy'
      ..['font'] = 'Comic Sans';
    final errors = validateBuildConfig(c).errors.join('\n');
    for (final fragment in [
      'Missing required field "app_name"',
      '"site_url" must be an https://',
      '"android_package"',
      '"ios_bundle_id"',
      '"version_name"',
      '"version_code"',
      '"short_name" must have at most 12',
      'Unknown field "extra"',
      '"branding.primary_color"',
      '"branding.template"',
      '"branding.font"',
    ]) {
      expect(errors, contains(fragment));
    }
  });

  test('rejects Java keywords in the Android package', () {
    final c = example()..['android_package'] = 'com.class.app';
    expect(validateBuildConfig(c).isValid, isFalse);
  });

  test('app types: Academy, Store, Bookings, Real estate, News & blog, Events & tickets and Charity & donations', () {
    expect(
      validateBuildConfig(example()..['app_type'] = 'store').isValid,
      isTrue,
    );
    expect(
      validateBuildConfig(example()..['app_type'] = 'salon').errors.join(),
      contains(
        '"app_type" must be one of lms, store, booking, real_estate, news, events, donations, delivery.',
      ),
    );
    expect(
      renderDartConfig(example()..['app_type'] = 'store'),
      contains('appType: AppType.store,'),
    );
    expect(
      validateBuildConfig(example()..['app_type'] = 'real_estate').isValid,
      isTrue,
    );
    expect(
      renderDartConfig(example()..['app_type'] = 'real_estate'),
      contains('appType: AppType.realEstate,'),
    );
    expect(
      renderDartConfig(example()..['app_type'] = 'news'),
      contains('appType: AppType.news,'),
    );
    expect(
      renderDartConfig(example()..['app_type'] = 'events'),
      contains('appType: AppType.events,'),
    );
    // 29 Charity & donations apps, with their vertical.
    final charity = example()
      ..['app_type'] = 'donations'
      ..['vertical'] = 'charity';
    expect(validateBuildConfig(charity).isValid, isTrue);
    expect(
      renderDartConfig(charity),
      allOf(
        contains('appType: AppType.donations,'),
        contains('vertical: AppVertical.charity,'),
      ),
    );
  });

  test('an API address for sites without WordPress', () {
    expect(
      validateBuildConfig(
        example()..['api_base_url'] = 'https://api.shop.test/yallapp/v1/',
      ).isValid,
      isTrue,
    );
    expect(
      validateBuildConfig(example()..['api_base_url'] = 'http://api.shop.test')
          .errors
          .join(),
      contains('"api_base_url" must be an https:// URL'),
    );
    final dart = renderDartConfig(
      example()..['api_base_url'] = 'https://api.shop.test/yallapp/v1/',
    );
    expect(dart, contains("apiBaseUrl: 'https://api.shop.test/yallapp/v1',"));
    expect(renderDartConfig(example()), contains('apiBaseUrl: null,'));
  });

  test('34 Yallapp\'s sign-in address for an app on its own API', () {
    final config = example()
      ..['api_base_url'] = 'https://api.shop.test/yallapp/v1'
      ..['auth_base_url'] = 'https://yallapp.com.tr/api/app/abc/';
    expect(validateBuildConfig(config).isValid, isTrue);
    expect(
      renderDartConfig(config),
      contains("authBaseUrl: 'https://yallapp.com.tr/api/app/abc',"),
    );
    expect(renderDartConfig(example()), contains('authBaseUrl: null,'));
    expect(
      validateBuildConfig(example()..['auth_base_url'] = 'http://x.test').errors
          .join(),
      contains('"auth_base_url" must be an https:// URL'),
    );
  });

  test('renders the Dart constants', () {
    final dart = renderDartConfig(example());
    expect(dart, contains('appType: AppType.lms,'));
    expect(dart, contains("siteUrl: 'https://your-academy.com',"));
    expect(dart, contains('primaryColor: 0xFF0E0D24,'));
    expect(dart, contains('template: AppTemplate.classic,'));
    expect(dart, contains('firebaseAndroid: null,'));
  });

  test('the committed generated file matches config/example.json', () {
    expect(
      File('lib/generated/build_config.g.dart').readAsStringSync(),
      renderDartConfig(example()),
    );
  });

  test('escapes names for Android and iOS', () {
    expect(escapeAndroidString("Sara's & Co"), r"Sara\'s &amp; Co");
    expect(escapeAndroidString('@home'), r'\@home');
    expect(escapeXcconfig('A//B'), r'A/$()/B');
    // 69 A line break never starts another build setting.
    expect(escapeXcconfig('A\nCC=/x\r\tB'), 'A CC=/x  B');
    expect(
      renderIosXcconfig(example()..['short_name'] = 'A\nCC=/x'),
      isNot(contains('\nCC=')),
    );
    final c = example()..['short_name'] = "Ali's";
    expect(
      renderAndroidResources(c),
      contains(r'''<string name="app_name">Ali\'s</string>'''),
    );
    expect(
      renderIosXcconfig(c),
      contains('YALLAPP_BUNDLE_ID = com.youracademy.app'),
    );
    expect(
      renderAndroidProperties(c),
      contains('applicationId=com.youracademy.app'),
    );
  });

  test('updates the pubspec version idempotently', () {
    const pubspec = 'name: yallapp\nversion: 0.0.1+1\n\nenvironment:\n';
    final c = example()
      ..['version_name'] = '2.3.4'
      ..['version_code'] = 17;
    final once = updatePubspecVersion(pubspec, c);
    expect(once, contains('version: 2.3.4+17'));
    expect(updatePubspecVersion(once, c), once);
  });

  test('parses Firebase config files', () {
    final android = parseGoogleServicesJson(
      jsonEncode({
        'project_info': {
          'project_number': '123',
          'project_id': 'academy',
          'storage_bucket': 'academy.appspot.com',
        },
        'client': [
          {
            'client_info': {
              'mobilesdk_app_id': '1:123:android:abc',
              'android_client_info': {'package_name': 'com.youracademy.app'},
            },
            'api_key': [
              {'current_key': 'AIza-test'},
            ],
          },
        ],
      }),
      'com.youracademy.app',
    );
    expect(android.appId, '1:123:android:abc');
    expect(android.apiKey, 'AIza-test');

    final ios = parseGoogleServiceInfoPlist('''
<plist><dict>
<key>API_KEY</key><string>AIza-ios</string>
<key>GCM_SENDER_ID</key><string>123</string>
<key>GOOGLE_APP_ID</key><string>1:123:ios:def</string>
<key>PROJECT_ID</key><string>academy</string>
<key>BUNDLE_ID</key><string>com.youracademy.app</string>
</dict></plist>''');
    expect(ios.appId, '1:123:ios:def');
    expect(ios.iosBundleId, 'com.youracademy.app');
  });

  test('site URL helpers', () {
    expect(normalizeSiteUrl('https://a.test///'), 'https://a.test');
    expect(apiBaseUrl('https://a.test/'), 'https://a.test/wp-json/yallapp/v1');
    const build = BuildConfigData(
      appName: 'A',
      shortName: 'A',
      siteUrl: 'https://a.test',
      androidPackage: 'com.a.app',
      iosBundleId: 'com.a.app',
      versionName: '1.0.0',
      versionCode: 1,
      primaryColor: 0xFF000000,
      splashColor: 0xFFFFFFFF,
      template: AppTemplate.classic,
      font: 'Outfit',
    );
    expect(apiUrlOf(build), 'https://a.test/wp-json/yallapp/v1');
    expect(
      apiUrlOf(
        const BuildConfigData(
          appName: 'A',
          shortName: 'A',
          siteUrl: 'https://a.test',
          apiBaseUrl: 'https://api.a.test/v1/',
          androidPackage: 'com.a.app',
          iosBundleId: 'com.a.app',
          versionName: '1.0.0',
          versionCode: 1,
          primaryColor: 0xFF000000,
          splashColor: 0xFFFFFFFF,
          template: AppTemplate.classic,
          font: 'Outfit',
        ),
      ),
      'https://api.a.test/v1',
    );
    expect(
      apiUrlOf(
        build.copyWith(siteUrl: 'https://b.test', clearApiBaseUrl: true),
      ),
      'https://b.test/wp-json/yallapp/v1',
    );
  });
}
