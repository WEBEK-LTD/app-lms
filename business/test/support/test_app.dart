import 'dart:async';

import 'package:flutter/foundation.dart';
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
import 'package:yallapp_business/core/services/home_widget.dart';
import 'package:yallapp_business/core/services/live_activity.dart';
import 'package:yallapp_business/core/services/media_picker.dart';
import 'package:yallapp_business/core/services/privacy.dart';
import 'package:yallapp_business/core/services/push.dart';
import 'package:yallapp_business/core/services/ringtones.dart';
import 'package:yallapp_business/core/services/screen_wake.dart';
import 'package:yallapp_business/features/events/camera_scanner.dart';
import 'package:yallapp_business/features/launch/opening_screen.dart';
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
    this.opening = false,
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

  /// 125 The opening motion plays (off: the app opens straight on Today).
  final bool opening;

  final opened = <String>[];
  final privacy = FakePrivacy();
  final chime = FakeChime();
  final ringer = FakeRinger();
  final ringNative = FakeRingNative();
  final homeWidget = FakeHomeWidget();
  final live = FakeLiveActivities();
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
    privacyProvider.overrideWithValue(privacy),
    biometricsProvider.overrideWithValue(
      biometrics ?? FakeBiometrics(isAvailable: false),
    ),
    pushServiceProvider.overrideWithValue(push ?? const NoPushService()),
    openExternalProvider.overrideWithValue((url) async {
      opened.add(url);
      return true;
    }),
    chimeProvider.overrideWithValue(chime),
    ringerProvider.overrideWithValue(ringer),
    ringNativeProvider.overrideWithValue(ringNative),
    homeWidgetProvider.overrideWithValue(homeWidget),
    liveActivitiesProvider.overrideWithValue(live),
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
    openingMotionProvider.overrideWithValue(opening),
  ];

  /// [size] is in logical pixels. 65 The store screenshots give the
  /// phone's own [pixelRatio], its system bars as [padding] (logical) and
  /// [wrap] the app to capture it.
  Future<void> pump(
    WidgetTester tester, {
    Size size = const Size(400, 860),
    double pixelRatio = 3,
    EdgeInsets padding = EdgeInsets.zero,
    Widget Function(Widget app)? wrap,
    int frames = 12,
  }) async {
    tester.view.physicalSize = size * pixelRatio;
    tester.view.devicePixelRatio = pixelRatio;
    if (padding != EdgeInsets.zero) {
      final physical = FakeViewPadding(
        left: padding.left * pixelRatio,
        top: padding.top * pixelRatio,
        right: padding.right * pixelRatio,
        bottom: padding.bottom * pixelRatio,
      );
      tester.view.padding = physical;
      tester.view.viewPadding = physical;
    }
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
    final Widget root = UncontrolledProviderScope(
      container: container,
      child: const BusinessApp(),
    );
    await tester.pumpWidget(wrap == null ? root : wrap(root));
    // 125 frames: 0 looks at the first frame (the opening).
    if (frames > 0) await settle(tester, frames);
  }
}

/// Lets the fake API answer and the screens draw (spinners never settle,
/// so this pumps a fixed number of frames instead of pumpAndSettle).
Future<void> settle(WidgetTester tester, [int frames = 12]) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

/// 214 Scrolls Today down until [finder] is on screen: its cards (Pause
/// new orders, the New order card) can put the rest below the fold.
Future<void> seeOnToday(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isNotEmpty) return;
  await tester.scrollUntilVisible(
    finder,
    200,
    scrollable: find
        .descendant(
          of: find.byType(CustomScrollView),
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await tester.pump();
}

/// Taps [finder] after scrolling it into view.
Future<void> tapOn(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder.first);
  await tester.pump();
  await tester.tap(finder.first);
  await settle(tester);
}

class FakeBiometrics extends Biometrics {
  FakeBiometrics({
    this.isAvailable = true,
    this.succeed = true,
    this.supportOf,
    this.kindOf = BiometricKind.fingerprint,
    this.result,
  });

  /// A face or a fingerprint (or a PIN) to unlock with.
  bool isAvailable;

  /// The next unlocks succeed (else they don't match).
  bool succeed;

  /// 132 What the phone has; null: [isAvailable]'s biometric or unavailable.
  LockSupport? supportOf;
  BiometricKind kindOf;

  /// 132 How the next unlocks end, over [succeed] (locked out, cancelled…).
  UnlockResult? result;
  int prompts = 0;
  final pinOnly = <bool>[];

  @override
  Future<LockSupport> support() async =>
      supportOf ??
      (isAvailable ? LockSupport.biometric : LockSupport.unavailable);

  @override
  Future<BiometricKind> kind() async => kindOf;

  @override
  Future<UnlockResult> unlock(String reason, {bool pinOnly = false}) async {
    prompts += 1;
    this.pinOnly.add(pinOnly);
    return result ?? (succeed ? UnlockResult.success : UnlockResult.failed);
  }
}

/// 132 The app's privacy on this phone: hidden in the app switcher.
class FakePrivacy implements PrivacyGuard {
  final calls = <bool>[];

  bool get secure => calls.isNotEmpty && calls.last;

  @override
  Future<void> setSecure(bool on) async => calls.add(on);
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

/// 207 The in-app ringer: what it played and whether it rings on.
class FakeRinger implements Ringer {
  final played = <String>[];
  final rang = <(String, Duration)>[];
  final _ringing = ValueNotifier<bool>(false);
  int stops = 0;

  @override
  ValueListenable<bool> get ringing => _ringing;

  @override
  Future<void> play(String sound, {double volume = 1}) async =>
      played.add(sound);

  @override
  Future<void> ring(
    String sound, {
    required Duration max,
    double volume = 1,
  }) async {
    rang.add((sound, max));
    _ringing.value = true;
  }

  @override
  Future<void> stop() async {
    stops += 1;
    _ringing.value = false;
  }
}

/// 214 The home-screen widget: what it was told.
class FakeHomeWidget implements HomeWidget {
  final configured = <({String api, String? token, String lang})>[];
  int refreshes = 0;

  @override
  Future<void> configure({
    required String api,
    required String? token,
    required String lang,
  }) async => configured.add((api: api, token: token, lang: lang));

  @override
  Future<void> refresh() async => refreshes += 1;
}

/// 214 The iPhone's Live Activities: what it was told, and its tokens.
class FakeLiveActivities implements LiveActivities {
  LiveTokens? tokensNow = const LiveTokens(
    start: 'a1a1a1a1a1a1a1a1',
    orders: [
      LiveOrderToken(
        appId: 'app',
        kind: 'new_order',
        orderId: '1040',
        token: 'b2b2b2b2b2b2b2b2',
      ),
    ],
  );
  final started = <Map<String, Object?>>[];
  final changes = StreamController<void>.broadcast();

  @override
  Future<LiveTokens?> tokens() async => tokensNow;

  @override
  Future<void> start(Map<String, Object?> data) async => started.add(data);

  @override
  Stream<void> get changed => changes.stream;
}

/// 207 Android's side: what it was told.
class FakeRingNative implements RingNative {
  RingSettings? configured;
  Map<String, String> words = const {};
  int stops = 0;
  final tests = <SoundGroup>[];
  Map<String, dynamic>? launch;
  final _opened = StreamController<Map<String, dynamic>>.broadcast();

  void tap(Map<String, dynamic> data) => _opened.add(data);

  @override
  Future<void> configure(
    RingSettings settings,
    Map<String, String> words,
  ) async {
    configured = settings;
    this.words = words;
  }

  @override
  Future<void> stopRinging() async => stops += 1;

  @override
  Future<bool> testNotification(
    SoundGroup group,
    String title,
    String body,
  ) async {
    tests.add(group);
    return true;
  }

  @override
  Future<String?> timeZone() async => 'Europe/Istanbul';

  /// 214 The orders whose ongoing notification went.
  final done = <Map<String, String>>[];

  @override
  Future<void> orderDone(Map<String, String> data) async => done.add(data);

  int settingsOpened = 0;

  @override
  Future<void> openNotificationSettings() async => settingsOpened += 1;

  @override
  Future<Map<String, dynamic>?> initial() async {
    final data = launch;
    launch = null;
    return data;
  }

  @override
  Stream<Map<String, dynamic>> get opened => _opened.stream;
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

  /// 63 The phone refused the camera: the screen shows its message instead.
  bool denied = false;

  /// What the camera "sees".
  void see(String code) => _onCode?.call(code);

  @override
  Widget view(
    BuildContext context,
    void Function(String code) onCode,
    Widget Function(BuildContext) onDenied,
  ) {
    _onCode = onCode;
    if (denied) return onDenied(context);
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
