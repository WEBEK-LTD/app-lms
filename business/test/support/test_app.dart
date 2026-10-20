import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp_business/app.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/auth/token_store.dart';
import 'package:yallapp_business/core/config.dart';
import 'package:yallapp_business/core/providers.dart';
import 'package:yallapp_business/core/services/biometrics.dart';
import 'package:yallapp_business/core/services/chime.dart';
import 'package:yallapp_business/core/services/media_picker.dart';
import 'package:yallapp_business/core/services/push.dart';
import 'package:yallapp_business/core/services/screen_wake.dart';
import 'package:yallapp_business/features/events/camera_scanner.dart';
import 'package:yallapp_business/features/media/uploads.dart';
import 'package:yallapp_business/features/preview/preview_screen.dart';

/// 59 Runs Yallapp Business on the fake API, with every phone service faked.
class TestApp {
  TestApp({
    FakeOwnerApi? api,
    this.signedIn = true,
    this.appId = FakeOwnerApi.restaurantId,
    this.language = 'en',
    this.biometrics,
    this.biometricLock,
    this.push,
    this.preferences = const {},
    this.brightness,
  }) : api = api ?? FakeOwnerApi();

  final FakeOwnerApi api;
  final bool signedIn;
  final String? appId;
  final String language;
  final FakeBiometrics? biometrics;
  final bool? biometricLock;
  final FakePush? push;
  final Map<String, Object> preferences;

  /// 61 The phone's light or dark setting (null: the test default, light).
  final Brightness? brightness;

  final opened = <String>[];
  final chime = FakeChime();
  final wake = FakeWake();
  final picker = FakePicker();
  final scanner = FakeScanner();
  late ProviderContainer container;

  static final session = Session(
    accessToken: 'access-0',
    accessExpiresAt: DateTime.now().toUtc().add(const Duration(minutes: 15)),
    refreshToken: 'refresh-0',
    refreshExpiresAt: DateTime.now().toUtc().add(const Duration(days: 60)),
    deviceId: 'd0000000-0000-4000-8000-000000000001',
    accountState: AccountState.active,
  );

  List<Override> get overrides => [
    configProvider.overrideWithValue(
      const AppConfig(
        apiBaseUrl: 'https://yallapp.com.tr/api/owner/v1',
        websiteUrl: 'https://yallapp.com.tr',
      ),
    ),
    tokenStoreProvider.overrideWithValue(
      MemoryTokenStore(signedIn ? session : null),
    ),
    apiProvider.overrideWithValue(api),
    uploadTransportProvider.overrideWithValue(api.transport),
    biometricsProvider.overrideWithValue(
      biometrics ?? FakeBiometrics(isAvailable: false),
    ),
    pushServiceProvider.overrideWithValue(push ?? const NoPushService()),
    openExternalProvider.overrideWithValue((url) async {
      opened.add(url);
      return true;
    }),
    chimeProvider.overrideWithValue(chime),
    screenWakeProvider.overrideWithValue(wake),
    mediaPickerProvider.overrideWithValue(picker),
    cameraScannerProvider.overrideWithValue(() => scanner),
    webPageProvider.overrideWithValue(
      (url) => Container(key: ValueKey('web:$url'), color: Colors.grey),
    ),
    deviceInfoProvider.overrideWithValue(
      () async => const DeviceInfo(
        name: 'Pixel 8',
        platform: 'android',
        appVersion: '1.0.0',
      ),
    ),
    appVersionProvider.overrideWith((ref) async => '1.0.0 (1)'),
  ];

  Future<void> pump(
    WidgetTester tester, {
    Size size = const Size(400, 860),
  }) async {
    tester.view.physicalSize = size * 3;
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    if (brightness != null) {
      tester.platformDispatcher.platformBrightnessTestValue = brightness!;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
    }
    UploadController.retryDelay = Duration.zero;
    SharedPreferences.setMockInitialValues({
      'yb.language': language,
      'yb.selected_app': ?appId,
      'yb.biometric_lock': ?biometricLock,
      ...preferences,
    });
    final prefs = await SharedPreferences.getInstance();
    container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        ...overrides,
      ],
    );
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const BusinessApp(),
      ),
    );
    await settle(tester);
  }
}

/// Lets the fake API answer and the screens draw (spinners never settle,
/// so this pumps a fixed number of frames instead of pumpAndSettle).
Future<void> settle(WidgetTester tester, [int frames = 12]) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

/// Taps [finder] after scrolling it into view.
Future<void> tapOn(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder.first);
  await tester.pump();
  await tester.tap(finder.first);
  await settle(tester);
}

class FakeBiometrics implements Biometrics {
  FakeBiometrics({this.isAvailable = true, this.succeed = true});

  bool isAvailable;
  bool succeed;
  int prompts = 0;

  @override
  Future<bool> available() async => isAvailable;

  @override
  Future<bool> authenticate(String reason) async {
    prompts += 1;
    return succeed;
  }
}

/// 61 The screen kept on, as Kitchen mode asks.
class FakeWake implements ScreenWake {
  bool on = false;
  bool fail = false;
  int requests = 0;

  @override
  Future<void> keepOn() async {
    requests += 1;
    if (fail) throw StateError('No wake lock on this phone');
    on = true;
  }

  @override
  Future<void> release() async => on = false;
}

class FakeChime implements Chime {
  int plays = 0;

  @override
  Future<void> play() async => plays += 1;
}

class MemoryFile implements PickedFile {
  MemoryFile(this.name, this.type, int size) : bytes = List.filled(size, 7);

  final List<int> bytes;
  @override
  final String name;
  @override
  final String type;
  @override
  String get path => '/tmp/$name';
  @override
  int get size => bytes.length;
  @override
  Future<List<int>> read(int start, int end) async => bytes.sublist(start, end);
}

class FakePicker implements MediaPicker {
  PickedFile? next;
  final sources = <PickSource>[];

  @override
  Future<PickedFile?> pick(PickSource source) async {
    sources.add(source);
    return next;
  }

  @override
  Future<PickedFile?> reopen(
    String path,
    String name,
    int size,
    String type,
  ) async => next != null && next!.path == path ? next : null;
}

class FakeScanner implements CameraScanner {
  void Function(String code)? _onCode;
  @override
  final torch = ValueNotifier<bool?>(false);
  int torchToggles = 0;

  /// What the camera "sees".
  void see(String code) => _onCode?.call(code);

  @override
  Widget view(
    BuildContext context,
    void Function(String code) onCode,
    Widget Function(BuildContext) onDenied,
  ) {
    _onCode = onCode;
    return Container(key: const ValueKey('camera'), color: Colors.black);
  }

  @override
  Future<void> toggleTorch() async {
    torchToggles += 1;
    torch.value = !(torch.value ?? false);
  }

  @override
  void dispose() {}
}

class FakePush implements PushService {
  final openedController = StreamController<Map<String, dynamic>>.broadcast();
  final foregroundController = StreamController<RemoteNotice>.broadcast();
  final refreshes = StreamController<String>.broadcast();
  Map<String, dynamic>? launch;

  @override
  bool get available => true;
  @override
  Future<void> init() async {}
  @override
  Future<String?> token() async => 'fcm-token-1';
  @override
  Stream<String> get tokenRefreshes => refreshes.stream;
  @override
  Stream<Map<String, dynamic>> get opened => openedController.stream;
  @override
  Stream<RemoteNotice> get foreground => foregroundController.stream;
  @override
  Future<Map<String, dynamic>?> initial() async => launch;
}

/// The same app with its plan ended.
AppSummary expire(AppSummary a) => AppSummary(
  id: a.id,
  name: a.name,
  type: a.type,
  typeName: a.typeName,
  state: AccountState.expired,
  features: a.features,
  vertical: a.vertical,
  backend: a.backend,
);
