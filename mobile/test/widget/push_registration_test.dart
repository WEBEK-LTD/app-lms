import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// A push service with a token ready.
class _Push implements PushService {
  _Push(this.provider, this._token);

  @override
  final PushProvider provider;
  final String _token;

  @override
  bool get isAvailable => true;

  @override
  Future<void> init() async {}

  @override
  Future<String?> token() async => _token;

  @override
  Stream<String> get tokenRefreshes => const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get openedMessages => const Stream.empty();

  @override
  Future<Map<String, dynamic>?> initialMessage() async => null;
}

/// 136.21 A Firebase push service on an iPhone, with its APNs token too.
class _ApplePush extends _Push implements ApnsTokenSource {
  _ApplePush(String fcm, this._apns, {this.apple = true})
    : super(PushProvider.fcm, fcm);

  final String? _apns;
  final bool apple;

  @override
  bool get hasApnsToken => apple;

  @override
  Future<String?> apnsToken() async => _apns;
}

FakeApi _apnsServer({required bool apns}) {
  final api = FakeApi();
  (api.config['features'] as Map<String, dynamic>)['apns'] = apns;
  return api;
}

void main() {
  // 36 The signed-in app registers its token with where it is from.
  testWidgets('a Huawei phone registers its Push Kit token as hms', (
    tester,
  ) async {
    final app = TestApp(
      signedIn: true,
      overrides: [
        pushServiceProvider.overrideWithValue(_Push(PushProvider.hms, 'hms-1')),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, [(token: 'hms-1', provider: PushProvider.hms)]);
  });

  testWidgets('other phones register their Firebase token as fcm', (
    tester,
  ) async {
    final app = TestApp(
      signedIn: true,
      overrides: [
        pushServiceProvider.overrideWithValue(_Push(PushProvider.fcm, 'fcm-1')),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, [(token: 'fcm-1', provider: PushProvider.fcm)]);
    // 85.1 With the language the app shows.
    expect(app.api.pushLanguages, ['en']);
    // 112.3 And the build's role: the customers' app.
    expect(app.api.pushRoles, [AppRole.customer]);
  });

  // 112.3 The couriers' and drivers' pushes go to their own app.
  testWidgets('a courier app registers its token as the courier app\'s', (
    tester,
  ) async {
    final app = TestApp(
      appType: AppType.delivery,
      signedIn: true,
      build: (b) => b.copyWith(role: AppRole.courier),
      overrides: [
        pushServiceProvider.overrideWithValue(_Push(PushProvider.fcm, 'fcm-2')),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, [(token: 'fcm-2', provider: PushProvider.fcm)]);
    expect(app.api.pushRoles, [AppRole.courier]);
  });

  // 136.21 iPhones of apps whose server sends straight to Apple.
  testWidgets('an iPhone registers its APNs token as apns when the server '
      'sends iPhone pushes straight to Apple', (tester) async {
    final app = TestApp(
      signedIn: true,
      platform: DevicePlatform.ios,
      api: _apnsServer(apns: true),
      overrides: [
        pushServiceProvider.overrideWithValue(_ApplePush('fcm-3', 'ab' * 32)),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, [
      (token: 'ab' * 32, provider: PushProvider.apns),
    ]);
  });

  testWidgets('an iPhone keeps its Firebase token when the server does not '
      'send to Apple (older servers, own Firebase)', (tester) async {
    final app = TestApp(
      signedIn: true,
      platform: DevicePlatform.ios,
      api: _apnsServer(apns: false),
      overrides: [
        pushServiceProvider.overrideWithValue(_ApplePush('fcm-4', 'ab' * 32)),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, [(token: 'fcm-4', provider: PushProvider.fcm)]);
  });

  testWidgets('an Android phone keeps its Firebase token in such an app', (
    tester,
  ) async {
    final app = TestApp(
      signedIn: true,
      api: _apnsServer(apns: true),
      overrides: [
        pushServiceProvider.overrideWithValue(
          _ApplePush('fcm-5', 'ab' * 32, apple: false),
        ),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, [(token: 'fcm-5', provider: PushProvider.fcm)]);
  });

  testWidgets('an iPhone without its APNs token yet registers nothing', (
    tester,
  ) async {
    final app = TestApp(
      signedIn: true,
      platform: DevicePlatform.ios,
      api: _apnsServer(apns: true),
      overrides: [
        pushServiceProvider.overrideWithValue(_ApplePush('fcm-6', null)),
      ],
    );
    await app.pump(tester);
    expect(app.api.pushTokens, isEmpty);
  });

  test('APNs tokens are hex, sent in lower case', () {
    expect(apnsTokenOrNull('AB' * 32), 'ab' * 32);
    expect(apnsTokenOrNull(' ${'0f' * 32} '), '0f' * 32);
    expect(apnsTokenOrNull('fcm:token'), isNull);
    expect(apnsTokenOrNull('ab'), isNull);
    expect(apnsTokenOrNull(null), isNull);
  });

  test('the config says when iPhones send their APNs token', () {
    final features = configJson()['features'] as Map<String, dynamic>;
    expect(SiteFeatures.fromJson(features).apns, isFalse);
    expect(SiteFeatures.fromJson({...features, 'apns': true}).apns, isTrue);
  });
}
