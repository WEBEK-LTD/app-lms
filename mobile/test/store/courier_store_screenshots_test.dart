// 104.8.6 Yallapp Courier's store screenshots, drawn from sample companies
// and jobs with the app's real fonts and icons, in English, Arabic and
// Turkish, at the sizes Google Play and the App Store ask for, each framed
// under its caption (poster.dart), as Yallapp Business's are
// (business/test/store).
//
// `flutter test` lays every screenshot out (nothing may overflow) without
// writing files. The release workflow writes the PNG files:
//
//   YC_SCREENSHOTS_DIR=/tmp/shots flutter test test/store
//
// → <dir>/<device>/<language>/<n>_<screen>.png, which
// build/scripts/business_store.py --app courier puts where fastlane wants
// them.
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/l10n/language.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/services/screen_security.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/core/widgets/buttons.dart' show SegmentedTabs;
import 'package:yallapp/modules/courier_hub/courier_hub_app.dart';
import 'package:yallapp/modules/courier_hub/data/courier_hub.dart';
import 'package:yallapp/modules/courier_hub/data/courier_hub_api.dart';

import '../screenshots/support/demo_api.dart';
import '../screenshots/support/map_tiles.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'poster.dart';

/// A phone or tablet: the screenshot's size in pixels, its pixel ratio and
/// its system bars (logical pixels).
class Device {
  const Device(
    this.name,
    this.pixels,
    this.pixelRatio,
    this.padding, {
    this.tablet = false,
  });

  final String name;
  final Size pixels;
  final double pixelRatio;
  final EdgeInsets padding;
  final bool tablet;

  Size get logical => pixels / pixelRatio;
}

/// The devices business_store.py sends: Google Play's phones (9:16) and
/// tablets (10:16), the App Store's 6.9" and 6.5" iPhones and 13" iPad.
const devices = [
  Device(
    'android-phone',
    Size(1080, 1920),
    2.5,
    EdgeInsets.only(top: 24, bottom: 16),
  ),
  Device(
    'android-tablet',
    Size(1600, 2560),
    2,
    EdgeInsets.only(top: 24, bottom: 16),
    tablet: true,
  ),
  Device('iphone', Size(1290, 2796), 3, EdgeInsets.only(top: 59, bottom: 34)),
  Device(
    'iphone-65',
    Size(1284, 2778),
    3,
    EdgeInsets.only(top: 47, bottom: 34),
  ),
  Device(
    'ipad',
    Size(2064, 2752),
    2,
    EdgeInsets.only(top: 24, bottom: 20),
    tablet: true,
  ),
];

const languages = ['en', 'ar', 'tr'];

/// Sample content in each language: the companies and the jobs' people,
/// places and cash. Not interface strings.
typedef Sample = ({
  List<String> companies,
  String service,
  String pickup,
  String dropoff,
  String sender,
  String recipient,
  String parcel,
  String notes,
  String courier,
  String Function(int amount) cash,
});

final Map<String, Sample> samples = {
  'en': (
    companies: ['Nile Express', 'Swift Parcels', 'Delta Couriers'],
    service: 'Same-day delivery',
    pickup: '12 Abbas El Akkad St, Nasr City',
    dropoff: '9 Road 233, Maadi',
    sender: 'Omar Said',
    recipient: 'Mona Adel',
    parcel: 'Documents',
    notes: 'Call before you come.',
    courier: 'Karim Hassan',
    cash: (amount) => 'E£$amount.00',
  ),
  'ar': (
    companies: ['النيل إكسبريس', 'سويفت للطرود', 'مناديب الدلتا'],
    service: 'توصيل في نفس اليوم',
    pickup: '١٢ شارع عباس العقاد، مدينة نصر',
    dropoff: '٩ شارع ٢٣٣، المعادي',
    sender: 'عمر سعيد',
    recipient: 'منى عادل',
    parcel: 'مستندات',
    notes: 'اتصل قبل الوصول.',
    courier: 'كريم حسن',
    cash: (amount) => '$amount ج.م.',
  ),
  'tr': (
    companies: ['Boğaz Kurye', 'Hızlı Paket', 'Anadolu Teslimat'],
    service: 'Aynı gün teslimat',
    pickup: 'Bağdat Cad. No: 12, Kadıköy',
    dropoff: 'Barbaros Bulvarı No: 9, Beşiktaş',
    sender: 'Emre Yılmaz',
    recipient: 'Zeynep Kaya',
    parcel: 'Evrak',
    notes: 'Gelmeden önce arayın.',
    courier: 'Mert Demir',
    cash: (amount) => '₺$amount,00',
  ),
};

Map<String, dynamic> _job(Sample s, int id, String status, {int cash = 62}) {
  final job = courierJobJson(id: id, status: status, mine: status != 'pending');
  return {
    ...job,
    'service': s.service,
    'pickup': {...job['pickup'] as Map<String, dynamic>, 'address': s.pickup},
    'dropoff': {
      ...job['dropoff'] as Map<String, dynamic>,
      'address': s.dropoff,
    },
    'sender': {...job['sender'] as Map<String, dynamic>, 'name': s.sender},
    'recipient': {
      ...job['recipient'] as Map<String, dynamic>,
      'name': s.recipient,
    },
    'package': {'size': 'small', 'description': s.parcel},
    'notes': s.notes,
    'collect_formatted': s.cash(cash),
    if (status == 'picked_up')
      'timeline': [
        {'status': 'pending', 'at': '2026-10-28T09:40:00.000Z', 'note': null},
        {'status': 'assigned', 'at': '2026-10-28T09:45:00.000Z', 'note': null},
        {'status': 'picked_up', 'at': '2026-10-28T10:05:00.000Z', 'note': null},
      ],
  };
}

/// Yallapp Courier's side: signed in, a courier of three companies.
class SampleHubApi implements CourierHubApi {
  SampleHubApi(this.companies, this.courier);

  final List<Map<String, dynamic>> companies;

  /// The courier's name, as the company's session gives it.
  final String courier;

  @override
  Future<OtpRequestResult> requestCode({String? phone, String? email}) =>
      throw UnimplementedError();

  @override
  Future<CourierHubSession> verifyCode({
    required String requestId,
    required String code,
    required DeviceInput device,
  }) => throw UnimplementedError();

  @override
  Future<Tokens> refreshTokens(String refreshToken) async => Tokens.fromJson({
    'access_token': 'hub-access',
    'refresh_token': 'hub-refresh',
    'expires_in': 900,
  });

  @override
  Future<void> signOut() async {}

  @override
  Future<void> deleteAccount() async {}

  @override
  Future<void> setPushToken(String? token, PushProvider provider) async {}

  @override
  Future<List<CourierCompany>> listCompanies() async => [
    for (final c in companies) CourierCompany.fromJson(c),
  ];

  @override
  Future<Session> openCompany(String appId, DeviceInput device) async =>
      Session.fromJson({
        'access_token': 'access-$appId',
        'refresh_token': 'refresh-$appId',
        'expires_in': 900,
        'user': {
          ...userJson(),
          'name': courier,
          'phone': '+905320000000',
          'roles': ['courier'],
        },
      });
}

class NoPush implements PushService {
  @override
  bool get isAvailable => false;

  @override
  PushProvider get provider => PushProvider.fcm;

  @override
  Future<void> init() async {}

  @override
  Future<String?> token() async => null;

  @override
  Stream<String> get tokenRefreshes => const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get openedMessages => const Stream.empty();

  @override
  Future<Map<String, dynamic>?> initialMessage() async => null;
}

/// The app as a courier sees it, in [lang].
class CourierPhone {
  CourierPhone(this.lang)
    : api = SampleHubApi([
        for (final (i, name) in samples[lang]!.companies.indexed)
          {
            'app_id': 'app-$i',
            'name': name,
            'logo_url': null,
            'primary_color': const ['#123A5C', '#1F8A70', '#7A3E9D'][i],
            'api_base_url': 'https://yallapp.test/api/app/app-$i',
            'on_duty': i == 0,
            'jobs_waiting': const [2, 1, 0][i],
            'paused': false,
          },
      ], samples[lang]!.courier);

  final String lang;
  final SampleHubApi api;
  late final ProviderContainer container;

  /// The company: Yallapp Studio's demo delivery company's config (on the
  /// plain fake API, so the courier keeps the sample's name).
  FakeApi companyApi() {
    final s = samples[lang]!;
    final api = FakeApi(config: DemoApi.delivery(courier: true).config);
    api.courier = {...api.courier, 'name': s.courier};
    api.me = {
      ...userJson(),
      'name': s.courier,
      'phone': '+905320000000',
      'roles': ['courier'],
    };
    api.config['delivery'] = {
      ...api.config['delivery'] as Map<String, dynamic>,
      'tracking': 'live',
      'map': {'tiles_url': demoTilesUrl, 'attribution': '© Yallapp'},
    };
    api.courierJobs = {
      'active': [_job(s, 1, 'picked_up'), _job(s, 3, 'assigned', cash: 0)],
      'available': [
        _job(s, 2, 'pending', cash: 85),
        _job(s, 4, 'pending', cash: 40),
      ],
      'done': [_job(s, 5, 'delivered')],
    };
    // A job with nothing to collect says so.
    api.courierJobs['active']![1]['collect_formatted'] = null;
    return api;
  }

  Future<void> pump(WidgetTester tester, Device device, Key frame) async {
    tester.view
      ..physicalSize = device.pixels
      ..devicePixelRatio = device.pixelRatio
      ..padding = FakeViewPadding(
        top: device.padding.top * device.pixelRatio,
        bottom: device.padding.bottom * device.pixelRatio,
      )
      ..viewPadding = FakeViewPadding(
        top: device.padding.top * device.pixelRatio,
        bottom: device.padding.bottom * device.pixelRatio,
      );
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final security = FakeScreenSecurity();
    final locales = [Locale(lang)];
    final stores = <String, MemoryTokenStore>{};
    final overrides = <Override>[
      sharedPreferencesProvider.overrideWithValue(prefs),
      appEnvironmentProvider.overrideWithValue(
        AppEnvironment(
          build: testBuild.copyWith(
            appName: 'Yallapp Courier',
            siteUrl: 'https://yallapp.test',
            appType: AppType.delivery,
            role: AppRole.courier,
            courierHub: true,
          ),
          platform: DevicePlatform.android,
          appVersion: '1.0.0',
          deviceId: 'device-1',
          deviceName: 'Phone',
        ),
      ),
      deviceLocalesProvider.overrideWithValue(locales),
      courierHubApiProvider.overrideWithValue(api),
      courierHubTokensProvider.overrideWithValue(
        TokenManager(
          store: MemoryTokenStore(
            StoredTokens(
              accessToken: 'hub-access',
              refreshToken: 'hub-refresh',
              expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
            ),
          ),
          refresh: api.refreshTokens,
        ),
      ),
      courierCompanyStoreProvider.overrideWithValue(
        (appId) => stores.putIfAbsent(appId, MemoryTokenStore.new),
      ),
      courierCompanyOverridesProvider.overrideWithValue((company) {
        final companyApi = this.companyApi();
        return [
          yallappApiProvider.overrideWithValue(companyApi),
          tokenManagerProvider.overrideWithValue(
            TokenManager(
              store: stores.putIfAbsent(company.appId, MemoryTokenStore.new),
              refresh: companyApi.refreshTokens,
            ),
          ),
          screenSecurityProvider.overrideWithValue(security),
          deviceLocalesProvider.overrideWithValue(locales),
        ];
      }),
      pushServiceProvider.overrideWithValue(NoPush()),
      screenSecurityProvider.overrideWithValue(security),
      ...courierHubRootOverrides,
    ];
    container = ProviderContainer(overrides: overrides, retry: (_, _) => null);
    addTearDown(container.dispose);
    await tester.pumpWidget(
      RepaintBoundary(
        key: frame,
        child: UncontrolledProviderScope(
          container: container,
          child: const YallappCourierApp(),
        ),
      ),
    );
    await settle(tester);
  }

  /// Opens the first company: its courier screen.
  Future<void> open(WidgetTester tester) async {
    await tester.tap(find.text(samples[lang]!.companies.first));
    await settle(tester);
  }

  GoRouter get router => (container.read(courierHubProvider) as HubOpen)
      .container
      .read(appRouterProvider);
}

Future<void> settle(WidgetTester tester) => TestApp.settle(tester, 30);

/// A screen of the listing and how to get there.
class Shot {
  const Shot(this.name, this.open);

  final String name;
  final Future<void> Function(WidgetTester tester, CourierPhone app) open;
}

final shots = [
  Shot('companies', (tester, app) async {}),
  Shot('jobs', (tester, app) async => app.open(tester)),
  Shot('job', (tester, app) async {
    await app.open(tester);
    app.router.push('/courier-job/1');
    await settle(tester);
  }),
  Shot('waiting', (tester, app) async {
    await app.open(tester);
    final tabs = find.descendant(
      of: find.byType(SegmentedTabs),
      matching: find.byType(Text),
    );
    await tester.tap(tabs.at(1));
    await settle(tester);
  }),
  Shot('account', (tester, app) async {
    await app.open(tester);
    app.router.go('/account');
    await settle(tester);
  }),
];

/// The fonts the app bundles, so the screenshots look like the phone.
Future<void> loadAppFonts() async {
  final manifest =
      json.decode(await rootBundle.loadString('FontManifest.json')) as List;
  for (final entry in manifest.cast<Map<String, dynamic>>()) {
    final loader = FontLoader(entry['family'] as String);
    for (final font in (entry['fonts'] as List).cast<Map<String, dynamic>>()) {
      loader.addFont(rootBundle.load(font['asset'] as String));
    }
    await loader.load();
  }
}

/// What [frame] shows, at the device's own size in pixels.
Future<ui.Image> capture(WidgetTester tester, Key frame, Device device) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(frame),
  );
  final image = (await tester.runAsync(
    () => boundary.toImage(pixelRatio: device.pixelRatio),
  ))!;
  expect(Size(image.width.toDouble(), image.height.toDouble()), device.pixels);
  return image;
}

void main() {
  final out = Platform.environment['YC_SCREENSHOTS_DIR'] ?? '';
  const frame = ValueKey('store-screenshot');

  setUpAll(() async {
    await loadAppFonts();
    // The map's tile cache asks for a folder: a temporary one.
    final cache = Directory.systemTemp.createTempSync('courier-shots');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('plugins.flutter.io/path_provider'),
          (call) async => cache.path,
        );
  });

  for (final device in devices) {
    for (final lang in languages) {
      for (final (index, shot) in shots.indexed) {
        testWidgets('${device.name} $lang ${shot.name}', (tester) async {
          // Real shadows, as on a phone (tests turn them off by default).
          debugDisableShadows = false;
          try {
            seedMapTiles(lat: 30.008, lng: 31.293);
            final app = CourierPhone(lang);
            await app.pump(tester, device, frame);
            await shot.open(tester, app);
            expect(tester.takeException(), isNull);
            final screen = await capture(tester, frame, device);
            try {
              await tester.pumpWidget(
                RepaintBoundary(
                  key: frame,
                  child: StorePoster(
                    screen: screen,
                    screenSize: device.logical,
                    bars: device.padding,
                    caption: captions[shot.name]![lang]!,
                    language: lang,
                    tablet: device.tablet,
                    dark: index.isEven,
                    darkScreen: false,
                  ),
                ),
              );
              await tester.pump();
              // Every caption fits in its two lines.
              for (final text in tester.widgetList<Text>(
                find.descendant(
                  of: find.byType(StorePoster),
                  matching: find.byType(Text),
                ),
              )) {
                final paragraph = tester.renderObject<RenderParagraph>(
                  find.byWidget(text),
                );
                expect(
                  paragraph.didExceedMaxLines,
                  isFalse,
                  reason: '${text.data} is too long for ${device.name}',
                );
              }
              if (out.isNotEmpty) {
                final poster = await capture(tester, frame, device);
                final file = File(
                  '$out/${device.name}/$lang/${index + 1}_${shot.name}.png',
                );
                await tester.runAsync(() async {
                  final png = await poster.toByteData(
                    format: ui.ImageByteFormat.png,
                  );
                  poster.dispose();
                  file.parent.createSync(recursive: true);
                  file.writeAsBytesSync(png!.buffer.asUint8List());
                });
              }
            } finally {
              screen.dispose();
            }
            // The app's timers (polling, animations) run out.
            await tester.pumpWidget(const SizedBox());
            await tester.pump(const Duration(minutes: 5));
          } finally {
            debugDisableShadows = true;
          }
        });
      }
    }
  }
}
