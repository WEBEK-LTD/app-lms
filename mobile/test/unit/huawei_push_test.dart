import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/services/push_service.dart';

import '../../tool/src/build_config_tool.dart';

/// Keeps each request and answers 204.
class _Server implements HttpClientAdapter {
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString('', 204);
  }

  @override
  void close({bool force = false}) {}
}

const _firebase = FirebaseOptionsData(
  apiKey: 'key',
  appId: '1:1:android:1',
  messagingSenderId: '1',
  projectId: 'academy',
);

BuildConfigData _build({String? huaweiAppId, bool firebase = true}) =>
    BuildConfigData(
      appName: 'Academy',
      shortName: 'Academy',
      siteUrl: 'https://academy.test',
      androidPackage: 'com.academy.app',
      iosBundleId: 'com.academy.app',
      versionName: '1.0.0',
      versionCode: 1,
      primaryColor: 0xFF0E0D24,
      splashColor: 0xFFF4EFE6,
      template: AppTemplate.classic,
      font: 'Bricolage Grotesque',
      firebaseAndroid: firebase ? _firebase : null,
      huaweiAppId: huaweiAppId,
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('yallapp/hms_push');
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  /// The native side, as the Huawei build has it.
  void nativeAnswers(Map<String, Object?> answers, [List<MethodCall>? calls]) {
    messenger.setMockMethodCallHandler(channel, (call) async {
      calls?.add(call);
      return answers[call.method];
    });
  }

  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  // 36 Which service a phone's push goes through.
  group('choosePushProvider', () {
    PushProvider? choose({
      DevicePlatform platform = DevicePlatform.android,
      bool firebase = true,
      bool huawei = true,
      bool googlePlay = false,
      bool hms = true,
    }) => choosePushProvider(
      platform: platform,
      hasFirebase: firebase,
      hasHuawei: huawei,
      availability: (googlePlay: googlePlay, huawei: hms),
    );

    test('Huawei phones without Google Play use Push Kit', () {
      expect(choose(), PushProvider.hms);
      // Even when the build has no Firebase for Android.
      expect(choose(firebase: false), PushProvider.hms);
    });

    test('phones with Google Play keep Firebase', () {
      expect(choose(googlePlay: true), PushProvider.fcm);
      // A Huawei phone that has Google Play too.
      expect(choose(googlePlay: true, hms: true), PushProvider.fcm);
    });

    test('a build without Huawei push never uses it', () {
      expect(choose(huawei: false), PushProvider.fcm);
      expect(choose(huawei: false, firebase: false), isNull);
    });

    test('a phone with neither service has no push from Huawei', () {
      expect(choose(hms: false), PushProvider.fcm);
      expect(choose(hms: false, firebase: false), isNull);
    });

    test('iPhones always use Firebase', () {
      expect(choose(platform: DevicePlatform.ios), PushProvider.fcm);
      expect(choose(platform: DevicePlatform.ios, firebase: false), isNull);
    });
  });

  group('choosePushService', () {
    test('a build without Huawei push never asks the phone', () async {
      final calls = <MethodCall>[];
      nativeAnswers({}, calls);
      final push = await choosePushService(_build(), DevicePlatform.android);
      expect(push, isA<FirebasePushService>());
      expect(push.provider, PushProvider.fcm);
      expect(calls, isEmpty);
    });

    test('a Huawei phone without Google Play gets Push Kit', () async {
      nativeAnswers({
        'availability': {'googlePlay': false, 'huawei': true},
      });
      final push = await choosePushService(
        _build(huaweiAppId: '104123456'),
        DevicePlatform.android,
      );
      expect(push, isA<HmsPushService>());
      expect(push.provider, PushProvider.hms);
    });

    test('a phone with Google Play keeps Firebase', () async {
      nativeAnswers({
        'availability': {'googlePlay': true, 'huawei': true},
      });
      final push = await choosePushService(
        _build(huaweiAppId: '104123456'),
        DevicePlatform.android,
      );
      expect(push.provider, PushProvider.fcm);
    });

    test('without the native side (no Huawei SDK) Firebase stays', () async {
      // No handler: MissingPluginException, as in a build without the file.
      final push = await choosePushService(
        _build(huaweiAppId: '104123456'),
        DevicePlatform.android,
      );
      expect(push.provider, PushProvider.fcm);
      expect(await const HmsPushBridge().availability(), (
        googlePlay: true,
        huawei: false,
      ));
    });
  });

  group('HmsPushService', () {
    test('asks Push Kit for a token with the app ID', () async {
      final calls = <MethodCall>[];
      nativeAnswers({
        'availability': {'googlePlay': false, 'huawei': true},
        'token': 'hms-token-1',
      }, calls);
      final push = HmsPushService(const HmsPushBridge(), '104123456');
      await push.init();
      expect(push.isAvailable, isTrue);
      expect(await push.token(), 'hms-token-1');
      expect(calls.last.method, 'token');
      expect(calls.last.arguments, {'appId': '104123456'});
    });

    test('an empty token (older EMUI) waits for the event', () async {
      nativeAnswers({
        'availability': {'googlePlay': false, 'huawei': true},
        'token': '',
      });
      final push = HmsPushService(const HmsPushBridge(), '104123456');
      await push.init();
      expect(await push.token(), isNull);
    });

    test('opens the notification that launched the app', () async {
      nativeAnswers({
        'availability': {'googlePlay': false, 'huawei': true},
        'initialMessage': {
          'type': 'new_lesson',
          'lesson_id': '12',
          '_push_msgid': 'x',
        },
      });
      final push = HmsPushService(const HmsPushBridge(), '104123456');
      await push.init();
      expect(await push.initialMessage(), {
        'type': 'new_lesson',
        'lesson_id': '12',
      });
    });

    test('a launch without a notification of ours opens nothing', () async {
      nativeAnswers({
        'availability': {'googlePlay': false, 'huawei': true},
        'initialMessage': {'route': '/'},
      });
      final push = HmsPushService(const HmsPushBridge(), '104123456');
      await push.init();
      expect(await push.initialMessage(), isNull);
    });
  });

  test('Push Kit data in one JSON string reads like FCM data', () {
    expect(
      HmsPushBridge.messageData({
        'data': jsonEncode({'type': 'event', 'event_id': 7}),
        'android.intent.extra': 'x',
      }),
      {'type': 'event', 'event_id': '7'},
    );
  });

  // 36 PUT /me/push-token says where the token is from.
  group('token registration', () {
    late _Server server;

    HttpYallappApi api() => HttpYallappApi(
      dio: createHttpClient(
        baseUrl: 'https://x.test/wp-json/yallapp/v1',
        tokens: TokenManager(
          store: MemoryTokenStore(null),
          refresh: (_) async => throw UnimplementedError(),
        ),
        adapter: server,
      ),
      refreshDio: Dio(),
      platform: DevicePlatform.android,
      appVersion: '1.0.0',
    );

    setUp(() => server = _Server());

    test('Firebase tokens say fcm', () async {
      await api().setPushToken('fcm-1', const NotificationPreferences());
      final request = server.requests.single;
      expect(request.method, 'PUT');
      expect(request.path, endsWith('/me/push-token'));
      expect((request.data as Map)['token'], 'fcm-1');
      expect((request.data as Map)['provider'], 'fcm');
    });

    test('Push Kit tokens say hms', () async {
      await api().setPushToken(
        'hms-1',
        const NotificationPreferences(),
        provider: PushProvider.hms,
      );
      final body = server.requests.single.data as Map;
      expect(body['token'], 'hms-1');
      expect(body['provider'], 'hms');
      expect(body['preferences'], isA<Map<String, dynamic>>());
    });
  });

  group('agconnect-services.json in the build config', () {
    final sample = File('config/example-agconnect-services.json')
        .readAsStringSync();

    test('gives the app ID for the right package', () {
      expect(
        parseAgconnectServicesAppId(sample, 'com.youracademy.app'),
        '100000001',
      );
    });

    test('refuses a file for another app', () {
      expect(
        () => parseAgconnectServicesAppId(sample, 'com.other.app'),
        throwsFormatException,
      );
      expect(
        () => parseAgconnectServicesAppId('{}', 'com.youracademy.app'),
        throwsFormatException,
      );
    });

    test('validates the huawei section and renders the app ID', () {
      final config = jsonDecode(
        File('config/example.json').readAsStringSync(),
      ) as Map<String, dynamic>;
      config['huawei'] = {
        'agconnect_config_url': 'https://yallapp.test/api/v1/assets/a',
      };
      expect(validateBuildConfig(config).errors, isEmpty);
      expect(
        renderDartConfig(config, huaweiAppId: '100000001'),
        contains("huaweiAppId: '100000001',"),
      );
      expect(renderDartConfig(config), contains('huaweiAppId: null,'));

      config['huawei'] = {'agconnect_config_url': 'not a url', 'extra': 1};
      expect(
        validateBuildConfig(config).errors,
        containsAll([
          '"huawei.agconnect_config_url" must be an absolute URL.',
          'Unknown field "huawei.extra".',
        ]),
      );
    });
  });
}
