import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/config.dart';
import 'package:yallapp_business/core/services/hms_push.dart';
import 'package:yallapp_business/core/services/push.dart';

import '../../tool/hms_config.dart';

/// 65 A phone with the given push services, without Huawei's SDK.
class FakeHmsBridge extends HmsPushBridge {
  FakeHmsBridge({this.googlePlay = false, this.huawei = true});

  final bool googlePlay;
  final bool huawei;
  final asked = <String>[];

  @override
  Future<PushAvailability> availability() async {
    asked.add('availability');
    return (googlePlay: googlePlay, huawei: huawei);
  }
}

const _config = AppConfig(
  apiBaseUrl: 'https://yallapp.com.tr/api/owner/v1',
  websiteUrl: 'https://yallapp.com.tr',
);

const _firebase = FirebaseConfig(
  projectId: 'yallapp-business',
  senderId: '1',
  apiKey: 'key',
  appId: '1:1:android:1',
);

AppConfig _with({FirebaseConfig? firebase, String? hms, bool demo = false}) =>
    AppConfig(
      apiBaseUrl: _config.apiBaseUrl,
      websiteUrl: _config.websiteUrl,
      demo: demo,
      firebase: firebase,
      hmsAppId: hms,
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('choosePushProvider', () {
    PushProvider? choose({
      bool android = true,
      bool hasFirebase = true,
      bool hasHuawei = true,
      bool googlePlay = false,
      bool huawei = true,
    }) => choosePushProvider(
      android: android,
      hasFirebase: hasFirebase,
      hasHuawei: hasHuawei,
      availability: (googlePlay: googlePlay, huawei: huawei),
    );

    test('Huawei Push Kit on a Huawei phone without Google Play', () {
      expect(choose(), PushProvider.hms);
      expect(choose(hasFirebase: false), PushProvider.hms);
    });

    test('Firebase whenever the phone has Google Play, as before', () {
      expect(choose(googlePlay: true), PushProvider.fcm);
      expect(choose(googlePlay: true, huawei: false), PushProvider.fcm);
      expect(choose(googlePlay: true, hasFirebase: false), isNull);
    });

    test('Firebase (or none) when the build or the phone has no Huawei', () {
      expect(choose(hasHuawei: false), PushProvider.fcm);
      expect(choose(huawei: false), PushProvider.fcm);
      expect(choose(hasHuawei: false, hasFirebase: false), isNull);
      expect(choose(android: false), PushProvider.fcm);
    });
  });

  group('choosePushService', () {
    test('Push Kit on a Huawei phone when the build has its app ID', () async {
      final bridge = FakeHmsBridge();
      final push = await choosePushService(
        _with(firebase: _firebase, hms: '100000001'),
        android: true,
        bridge: bridge,
      );
      expect(push, isA<HmsPushService>());
      expect(push.provider, PushProvider.hms);
    });

    test('Firebase exactly as before on Google phones', () async {
      final push = await choosePushService(
        _with(firebase: _firebase, hms: '100000001'),
        android: true,
        bridge: FakeHmsBridge(googlePlay: true),
      );
      expect(push, isA<FirebasePushService>());
      expect(push.provider, PushProvider.fcm);
    });

    test('without the Huawei app ID the phone is not even asked', () async {
      final bridge = FakeHmsBridge();
      final push = await choosePushService(
        _with(firebase: _firebase),
        android: true,
        bridge: bridge,
      );
      expect(push, isA<FirebasePushService>());
      expect(bridge.asked, isEmpty);
      expect(
        await choosePushService(_config, android: true, bridge: bridge),
        isA<NoPushService>(),
      );
      expect(bridge.asked, isEmpty);
    });

    test('iPhones and the demo never ask Huawei', () async {
      final bridge = FakeHmsBridge();
      expect(
        await choosePushService(
          _with(firebase: _firebase, hms: '100000001'),
          android: false,
          bridge: bridge,
        ),
        isA<FirebasePushService>(),
      );
      expect(
        await choosePushService(
          _with(firebase: _firebase, hms: '100000001', demo: true),
          android: true,
          bridge: bridge,
        ),
        isA<NoPushService>(),
      );
      expect(bridge.asked, isEmpty);
    });

    test('a build with Huawei only: off on Google phones', () async {
      final push = await choosePushService(
        _with(hms: '100000001'),
        android: true,
        bridge: FakeHmsBridge(googlePlay: true),
      );
      expect(push, isA<NoPushService>());
      expect(push.available, isFalse);
    });
  });

  group('HmsPushBridge over the channel', () {
    const bridge = HmsPushBridge();
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    final calls = <MethodCall>[];

    void answer(Object? Function(MethodCall call) handler) {
      messenger.setMockMethodCallHandler(bridge.channel, (call) async {
        calls.add(call);
        return handler(call);
      });
    }

    setUp(calls.clear);
    tearDown(() {
      messenger.setMockMethodCallHandler(bridge.channel, null);
      messenger.setMockStreamHandler(bridge.eventChannel, null);
    });

    test(
      'a build without Huawei push answers Google Play, no Huawei',
      () async {
        // No handler: the channel isn't in the build (MissingPluginException).
        expect(await bridge.availability(), (googlePlay: true, huawei: false));
        expect(await bridge.token('100000001'), isNull);
        expect(await bridge.initialMessage(), isNull);
      },
    );

    test('reads the phone and the token', () async {
      answer(
        (call) => switch (call.method) {
          'availability' => {'googlePlay': false, 'huawei': true},
          'token' => 'hms-token-1',
          _ => null,
        },
      );
      expect(await bridge.availability(), (googlePlay: false, huawei: true));
      expect(await bridge.token('100000001'), 'hms-token-1');
      expect(calls.last.arguments, {'appId': '100000001'});
    });

    test('an empty token or an error is no token', () async {
      answer((call) => '');
      expect(await bridge.token('100000001'), isNull);
      answer((call) => throw PlatformException(code: 'hms'));
      expect(await bridge.token('100000001'), isNull);
      expect(await bridge.availability(), (googlePlay: true, huawei: false));
    });

    test('the push that launched the app, only when it is ours', () async {
      answer(
        (call) => {
          'data': jsonEncode({
            'type': 'owner',
            'kind': 'new_order',
            'order_id': 1042,
          }),
          '_hms_extra': 'x',
          'android.intent.extra': 'y',
        },
      );
      expect(await bridge.initialMessage(), {
        'type': 'owner',
        'kind': 'new_order',
        'order_id': '1042',
      });
      answer((call) => {'profile': 'work'});
      expect(await bridge.initialMessage(), isNull);
    });

    test('new tokens and tapped pushes come as events', () async {
      answer((call) => {'googlePlay': false, 'huawei': true});
      messenger.setMockStreamHandler(
        bridge.eventChannel,
        MockStreamHandler.inline(
          onListen: (arguments, events) {
            events.success({'type': 'token', 'token': 'hms-token-2'});
            events.success({
              'type': 'opened',
              'data': {'profile': 'work'},
            });
            events.success({
              'type': 'opened',
              'data': {'kind': 'new_booking', 'type': 'owner'},
            });
          },
        ),
      );
      final push = HmsPushService(bridge, '100000001');
      await push.init();
      expect(push.available, isTrue);
      expect(await push.tokenRefreshes.first, 'hms-token-2');
      // The tap without our data is left out.
      expect(await push.opened.take(1).toList(), [
        {'kind': 'new_booking', 'type': 'owner'},
      ]);
    });

    test('off when the phone has no Huawei services', () async {
      answer((call) => {'googlePlay': false, 'huawei': false});
      final push = HmsPushService(bridge, '100000001');
      await push.init();
      expect(push.available, isFalse);
      expect(await push.token(), isNull);
      expect(await push.initial(), isNull);
      expect(calls.map((c) => c.method), ['availability']);
    });
  });

  test('messageData keeps a plain value that only looks like JSON', () {
    expect(HmsPushBridge.messageData({'data': '{not json', 'kind': 1}), {
      'data': '{not json',
      'kind': '1',
    });
  });

  test('the Huawei app ID from the build is digits or nothing', () {
    expect(AppConfig.hmsAppIdFrom(' 100000001 '), '100000001');
    expect(AppConfig.hmsAppIdFrom(''), isNull);
    expect(AppConfig.hmsAppIdFrom('abc'), isNull);
  });

  group('tool/hms_config.dart', () {
    final example = jsonEncode({
      'client': {
        'app_id': '100000001',
        'package_name': 'tr.com.yallapp.business',
        'api_key': 'EXAMPLE-NOT-A-REAL-VALUE',
      },
      'app_info': {
        'app_id': '100000001',
        'package_name': 'tr.com.yallapp.business',
      },
    });

    test('off without values', () {
      expect(hmsFiles(), isNull);
      expect(hmsFiles(appId: ' ', agconnect: '\n'), isNull);
    });

    test('the app ID alone writes a file with it and the package', () {
      final files = hmsFiles(appId: '100000001')!;
      expect(files.appId, '100000001');
      final json = jsonDecode(files.agconnect) as Map<String, dynamic>;
      expect(json['app_info'], {
        'app_id': '100000001',
        'package_name': 'tr.com.yallapp.business',
      });
      expect((json['client'] as Map)['app_id'], '100000001');
    });

    test('the whole file is kept, its app ID used', () {
      final files = hmsFiles(agconnect: example)!;
      expect(files.appId, '100000001');
      expect(files.agconnect, '$example\n');
      expect(
        hmsFiles(appId: '100000001', agconnect: example)!.appId,
        '100000001',
      );
    });

    test('values that do not fit stop the build', () {
      expect(() => hmsFiles(appId: 'abc'), throwsFormatException);
      expect(() => hmsFiles(agconnect: 'not json'), throwsFormatException);
      expect(() => hmsFiles(agconnect: '[]'), throwsFormatException);
      expect(
        () => hmsFiles(agconnect: '{"client": {}}'),
        throwsFormatException,
      );
      expect(
        () => hmsFiles(appId: '100000002', agconnect: example),
        throwsFormatException,
      );
      expect(
        () => hmsFiles(
          agconnect: example.replaceAll(
            'tr.com.yallapp.business',
            'com.youracademy.app',
          ),
        ),
        throwsFormatException,
      );
    });
  });
}
