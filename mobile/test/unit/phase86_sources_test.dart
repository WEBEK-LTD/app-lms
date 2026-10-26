import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_links.dart';
import 'package:yallapp/core/services/analytics.dart';

/// 86.2 Where people come from: the store of an install, and the links and
/// QR codes that opened the app (docs/api/platform.yaml, AnalyticsEvent).
void main() {
  var now = DateTime.utc(2026, 10, 26, 9);
  late List<Map<String, Object?>> sent;

  Future<AnalyticsService> service({String? store}) async {
    SharedPreferences.setMockInitialValues({});
    sent = [];
    return AnalyticsService(
      preferences: await SharedPreferences.getInstance(),
      eventsUrl: 'https://yallapp.com.tr/api/v1/apps/app-1/events',
      key: 'k3y-for-the-tests-0123456789',
      platform: 'android',
      appVersion: '1.2.0',
      locale: () => 'ar',
      installStore: store,
      enabled: true,
      sender: (url, key, body) async {
        sent.add(body);
        return AnalyticsResponse(202);
      },
      clock: () => now,
    );
  }

  List<Map<String, Object?>> events() =>
      (sent.last['events']! as List).cast<Map<String, Object?>>();

  test('the first open says which store the app came from', () async {
    final analytics = await service(store: 'galaxy_store');
    analytics.start(lifecycle: false, every: null);
    await analytics.flush();
    expect(events().single, {
      'type': 'app_open',
      'at': '2026-10-26T09:00:00.000Z',
      'first_open': true,
      'store': 'galaxy_store',
    });
  });

  test('the phone\'s installer, as the contract names the stores', () {
    expect(
      installStoreOf('com.android.vending', DevicePlatform.android),
      'google_play',
    );
    expect(
      installStoreOf('com.sec.android.app.samsungapps', DevicePlatform.android),
      'galaxy_store',
    );
    expect(
      installStoreOf('com.huawei.appmarket', DevicePlatform.android),
      'appgallery',
    );
    expect(installStoreOf('com.apple', DevicePlatform.ios), 'app_store');
    expect(
      installStoreOf('com.apple.testflight', DevicePlatform.ios),
      'testflight',
    );
    expect(installStoreOf(null, DevicePlatform.android), 'other');
    expect(
      installStoreOf(
        'com.google.android.packageinstaller',
        DevicePlatform.android,
      ),
      'other',
    );
  });

  test(
    'a link or QR code that opened the app, with its campaign, counted once',
    () async {
      final analytics = await service();
      final qr = Uri.parse(
        'https://yallapp.com.tr/a/11111111-2222-4333-8444-555555555555/page/home?utm_medium=qr&utm_campaign=Menu-2026&utm_source=flyer',
      );
      analytics.linkOpened(qr);
      // The router asks again for the same link: still one.
      analytics.linkOpened(qr);
      now = now.add(const Duration(minutes: 1));
      analytics.linkOpened(
        Uri.parse(
          'https://academy.test/a/course/7?utm_campaign=summer%20sale&utm_source=instagram',
        ),
      );
      await analytics.flush();
      expect(events().map((e) => {...e}..remove('at')).toList(), [
        {
          'type': 'link_open',
          'source': 'qr',
          'campaign': 'menu-2026',
          'referrer': 'flyer',
        },
        // A campaign name the contract doesn't take isn't sent.
        {'type': 'link_open', 'source': 'link', 'referrer': 'instagram'},
      ]);
    },
  );

  test('only the app\'s own links count as opened from a link', () {
    const build = BuildConfigData(
      appType: AppType.lms,
      appName: 'Ada',
      shortName: 'Ada',
      siteUrl: 'https://academy.test/school',
      androidPackage: 'com.ada.academy',
      iosBundleId: 'com.ada.academy',
      versionName: '1.0.0',
      versionCode: 1,
      primaryColor: 0xFF0E0D24,
      splashColor: 0xFFF4EFE6,
      template: AppTemplate.classic,
      font: 'Bricolage Grotesque',
      siteLinkBaseUrl: 'https://academy.test/school/a',
    );
    expect(
      isAppLink(
        Uri.parse(
          'https://yallapp.com.tr/a/11111111-2222-4333-8444-555555555555/page/home',
        ),
        build,
      ),
      isTrue,
    );
    expect(isAppLink(Uri.parse('/a/course/7'), build), isTrue);
    expect(isAppLink(Uri.parse('/school/a/course/7'), build), isTrue);
    expect(isAppLink(Uri.parse('/course/7'), build), isFalse);
    expect(
      isAppLink(Uri.parse('https://academy.test/school/about'), build),
      isFalse,
    );
  });
}
