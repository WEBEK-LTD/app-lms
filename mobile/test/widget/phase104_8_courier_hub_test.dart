import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/l10n/language.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/services/screen_security.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/courier_hub/courier_hub_app.dart';
import 'package:yallapp/modules/courier_hub/data/courier_hub.dart';
import 'package:yallapp/modules/courier_hub/data/courier_hub_api.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 104.8.4 Yallapp Courier: its sign-in, the companies, each company's
/// courier screens on its own hosted API with its session kept apart,
/// switching company, pushes opening the right company, signing out of all.

class _HubApi implements CourierHubApi {
  _HubApi(this.companies);

  List<Map<String, dynamic>> companies;
  final calls = <String>[];
  final codeRequests = <({String? phone, String? email})>[];
  final opened = <String>[];
  final pushTokens = <String?>[];
  final paused = <String>{};
  DeviceInput? device;

  int count(String name) => calls.where((c) => c == name).length;

  @override
  Future<OtpRequestResult> requestCode({String? phone, String? email}) async {
    calls.add('requestCode');
    codeRequests.add((phone: phone, email: email));
    return courierOtpRequest({'request_id': 'req-1', 'expires_in': 600});
  }

  @override
  Future<CourierHubSession> verifyCode({
    required String requestId,
    required String code,
    required DeviceInput device,
  }) async {
    calls.add('verifyCode');
    this.device = device;
    if (code != '123456') {
      throw const ApiException(
        code: 'invalid_code',
        message: 'That code is not right.',
        statusCode: 400,
      );
    }
    return CourierHubSession.fromJson({
      'access_token': 'hub-access',
      'refresh_token': 'hub-refresh',
      'expires_in': 900,
      'account': {'id': 'acc-1', 'phone': '+905321234567', 'email': null},
    });
  }

  @override
  Future<Tokens> refreshTokens(String refreshToken) async {
    calls.add('refreshTokens');
    return Tokens.fromJson({
      'access_token': 'hub-access-2',
      'refresh_token': 'hub-refresh-2',
      'expires_in': 900,
    });
  }

  @override
  Future<void> signOut() async => calls.add('signOut');

  @override
  Future<void> setPushToken(String? token, PushProvider provider) async {
    calls.add('setPushToken');
    pushTokens.add(token);
  }

  @override
  Future<List<CourierCompany>> listCompanies() async {
    calls.add('listCompanies');
    return [for (final c in companies) CourierCompany.fromJson(c)];
  }

  @override
  Future<Session> openCompany(String appId, DeviceInput device) async {
    calls.add('openCompany');
    if (paused.contains(appId)) {
      throw const ApiException(
        code: 'not_courier',
        message: 'Paused.',
        statusCode: 403,
      );
    }
    opened.add(appId);
    return Session.fromJson({
      'access_token': 'access-$appId',
      'refresh_token': 'refresh-$appId',
      'expires_in': 900,
      'user': {
        ...userJson(),
        'roles': ['courier'],
      },
    });
  }
}

Map<String, dynamic> _company(String id, String name) => {
  'app_id': id,
  'name': name,
  'logo_url': null,
  'primary_color': '#1F8A70',
  'api_base_url': 'https://yallapp.test/api/app/$id',
  'on_duty': true,
  'jobs_waiting': 2,
  'paused': false,
};

final _swift = _company('app-swift', 'Swift Parcels');
final _nile = _company('app-nile', 'Nile Express');

class _Push implements PushService {
  final opened = StreamController<Map<String, dynamic>>.broadcast();
  Map<String, dynamic>? initial;

  @override
  bool get isAvailable => true;

  @override
  PushProvider get provider => PushProvider.fcm;

  @override
  Future<void> init() async {}

  @override
  Future<String?> token() async => 'fcm-courier';

  @override
  Stream<String> get tokenRefreshes => const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get openedMessages => opened.stream;

  @override
  Future<Map<String, dynamic>?> initialMessage() async {
    final data = initial;
    initial = null;
    return data;
  }
}

class _Hub {
  _Hub({List<Map<String, dynamic>>? companies, this.signedIn = true})
    : api = _HubApi(companies ?? [_swift]);

  final _HubApi api;
  final bool signedIn;
  final push = _Push();
  late final MemoryTokenStore tokens;
  final stores = <String, MemoryTokenStore>{};
  final companyApis = <String, FakeApi>{};
  late final ProviderContainer container;

  FakeApi companyApi(String appId) => companyApis.putIfAbsent(appId, () {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'site': {
          ...configJson()['site'] as Map<String, dynamic>,
          'name': appId,
        },
        'delivery': deliveryConfigJson(courierApp: 'yallapp_courier'),
      },
    );
    api.me = {
      ...userJson(),
      'roles': ['courier'],
    };
    api.courierJobs = {
      'active': [courierJobJson(id: 7)],
      'available': const [],
      'done': const [],
    };
    return api;
  });

  MemoryTokenStore store(String appId) =>
      stores.putIfAbsent(appId, MemoryTokenStore.new);

  Future<void> pump(WidgetTester tester) async {
    final view = tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(view.reset);
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    tokens = MemoryTokenStore(
      signedIn
          ? StoredTokens(
              accessToken: 'hub-access',
              refreshToken: 'hub-refresh',
              expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
            )
          : null,
    );
    final security = FakeScreenSecurity();
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
          deviceName: 'Test phone',
        ),
      ),
      deviceLocalesProvider.overrideWithValue(const [Locale('en', 'TR')]),
      courierHubApiProvider.overrideWithValue(api),
      courierHubTokensProvider.overrideWithValue(
        TokenManager(store: tokens, refresh: api.refreshTokens),
      ),
      courierCompanyStoreProvider.overrideWithValue(store),
      courierCompanyOverridesProvider.overrideWithValue((company) {
        final companyApi = this.companyApi(company.appId);
        return [
          yallappApiProvider.overrideWithValue(companyApi),
          tokenManagerProvider.overrideWithValue(
            TokenManager(
              store: store(company.appId),
              refresh: companyApi.refreshTokens,
            ),
          ),
          screenSecurityProvider.overrideWithValue(security),
          deviceLocalesProvider.overrideWithValue(const [Locale('en', 'TR')]),
        ];
      }),
      pushServiceProvider.overrideWithValue(push),
      screenSecurityProvider.overrideWithValue(security),
      ...courierHubRootOverrides,
    ];
    container = ProviderContainer(overrides: overrides, retry: (_, _) => null);
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const YallappCourierApp(),
      ),
    );
    await TestApp.settle(tester, 20);
  }

  HubState get state => container.read(courierHubProvider);

  /// Where the open company's screens are.
  String get location =>
      (state as HubOpen).container.read(appRouterProvider).state.uri.path;

  String? get openCompany {
    final s = state;
    return s is HubOpen ? s.company.appId : null;
  }
}

Future<void> _settle(WidgetTester tester) => TestApp.settle(tester, 20);

void main() {
  testWidgets('signs in to Yallapp Courier with a code to the number', (
    tester,
  ) async {
    final hub = _Hub(companies: [_swift, _nile], signedIn: false);
    await hub.pump(tester);
    expect(find.text('Welcome'), findsOneWidget);
    expect(
      find.text(
        'Sign in with the mobile number or email address the company you '
        'deliver for added.',
      ),
      findsOneWidget,
    );
    await tester.enterText(find.byType(TextField), '0532 123 45 67');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await _settle(tester);
    // The country of the phone, with the trunk 0 left out.
    expect(hub.api.codeRequests.single.phone, '+905321234567');
    expect(find.text('Enter verification code'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '111111');
    await _settle(tester);
    expect(find.text('That code is not right.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '123456');
    await _settle(tester);
    expect(hub.api.device?.id, 'device-1');
    expect((await hub.tokens.read())?.accessToken, 'hub-access');
    // Several companies: the list, nothing opened yet.
    expect(find.text('Your companies'), findsOneWidget);
    expect(find.text('Enter verification code'), findsNothing);
    expect(hub.openCompany, isNull);
    // The device's push token goes to the Courier API.
    expect(hub.api.pushTokens, ['fcm-courier']);
  });

  testWidgets('signs in by email too', (tester) async {
    final hub = _Hub(signedIn: false);
    await hub.pump(tester);
    await tester.tap(find.text('Email'));
    await tester.pump();
    await tester.enterText(
      find.byKey(const ValueKey('hub-email')),
      'karim@example.com',
    );
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await _settle(tester);
    expect(hub.api.codeRequests.single, (
      phone: null,
      email: 'karim@example.com',
    ));
  });

  testWidgets('no companies: says to ask the company to add the number', (
    tester,
  ) async {
    final hub = _Hub(companies: []);
    await hub.pump(tester);
    expect(find.byKey(const ValueKey('hub-no-companies')), findsOneWidget);
    expect(find.text('No companies yet'), findsOneWidget);
    expect(find.textContaining('Ask the company you deliver for'), findsOne);
    hub.api.companies = [_swift];
    await tester.tap(find.text('Check again'));
    await _settle(tester);
    expect(hub.api.count('listCompanies'), 2);
    expect(find.byKey(const ValueKey('hub-company-app-swift')), findsOneWidget);
  });

  testWidgets('one company opens at once, on its own hosted API', (
    tester,
  ) async {
    final hub = _Hub();
    await hub.pump(tester);
    expect(hub.openCompany, 'app-swift');
    expect(hub.api.opened, ['app-swift']);
    // Its session is its own, kept apart from Yallapp Courier's.
    expect(
      (await hub.store('app-swift').read())?.accessToken,
      'access-app-swift',
    );
    expect((await hub.tokens.read())?.accessToken, 'hub-access');
    final open = hub.state as HubOpen;
    final build = open.container.read(appEnvironmentProvider).build;
    expect(build.apiBaseUrl, 'https://yallapp.test/api/app/app-swift');
    expect(build.appId, 'app-swift');
    expect(build.role, AppRole.courier);
    expect(build.courierHub, isFalse);
    // The company's courier screens, with its name at the top.
    expect(find.byKey(const ValueKey('hub-company-bar')), findsOneWidget);
    expect(find.text('Swift Parcels'), findsOneWidget);
    expect(find.text('Courier'), findsWidgets);
    expect(hub.companyApi('app-swift').count('getCourier'), greaterThan(0));
    // Only one company: nothing to switch to on the bar.
    expect(find.byKey(const ValueKey('hub-switch-company')), findsNothing);
  });

  testWidgets('several companies: the list, and the one picked opens', (
    tester,
  ) async {
    final hub = _Hub(companies: [_swift, _nile]);
    await hub.pump(tester);
    expect(hub.openCompany, isNull);
    expect(find.text('Swift Parcels'), findsOneWidget);
    expect(find.text('Nile Express'), findsOneWidget);
    expect(find.text('On duty · 2 jobs waiting'), findsNWidgets(2));
    await tester.tap(find.text('Nile Express'));
    await _settle(tester);
    expect(hub.openCompany, 'app-nile');
    expect(find.text('Nile Express'), findsOneWidget);
    expect(hub.companyApi('app-nile').count('getMe'), greaterThan(0));
    expect(hub.companyApis.containsKey('app-swift'), isFalse);
  });

  testWidgets('a paused courier sees why the company does not open', (
    tester,
  ) async {
    final hub = _Hub(
      companies: [
        {..._swift, 'paused': true},
        _nile,
      ],
    );
    await hub.pump(tester);
    expect(find.text('Paused by the company'), findsOneWidget);
    await tester.tap(find.text('Swift Parcels'));
    await _settle(tester);
    expect(hub.openCompany, isNull);
    expect(hub.api.count('openCompany'), 0);
    expect(find.byKey(const ValueKey('hub-notice')), findsOneWidget);
    expect(find.textContaining('has paused you as a courier'), findsOneWidget);
  });

  testWidgets('switching company from Account keeps each company\'s session', (
    tester,
  ) async {
    final hub = _Hub(companies: [_swift, _nile]);
    await hub.pump(tester);
    await tester.tap(find.text('Swift Parcels'));
    await _settle(tester);
    expect(hub.openCompany, 'app-swift');

    await tester.tap(find.text('Account'));
    await _settle(tester);
    expect(find.byKey(const ValueKey('account-hub-company')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('account-hub-switch')));
    await _settle(tester);
    expect(hub.openCompany, isNull);
    expect(find.text('Your companies'), findsOneWidget);

    await tester.tap(find.text('Nile Express'));
    await _settle(tester);
    expect(hub.openCompany, 'app-nile');
    // From the bar this time.
    await tester.tap(find.byKey(const ValueKey('hub-switch-company')));
    await _settle(tester);
    await tester.tap(find.text('Swift Parcels'));
    await _settle(tester);
    expect(hub.openCompany, 'app-swift');
    // Swift's session was kept: asked for once.
    expect(hub.api.opened, ['app-swift', 'app-nile']);
    expect(
      (await hub.store('app-nile').read())?.accessToken,
      'access-app-nile',
    );
  });

  testWidgets('a push opens its company\'s job', (tester) async {
    final hub = _Hub(companies: [_swift, _nile]);
    await hub.pump(tester);
    await tester.tap(find.text('Swift Parcels'));
    await _settle(tester);
    expect(hub.openCompany, 'app-swift');

    // For another company: that one opens, on the job.
    hub.push.opened.add({
      'type': 'courier_job',
      'shipment_id': '7',
      'app_id': 'app-nile',
    });
    await _settle(tester);
    expect(hub.openCompany, 'app-nile');
    expect(hub.location, '/courier-job/7');
    expect(hub.companyApi('app-nile').count('getCourierJob'), 1);

    // For the company on screen: its job opens there.
    final router = (hub.state as HubOpen).container.read(appRouterProvider);
    router.pop();
    await _settle(tester);
    hub.push.opened.add({
      'type': 'courier_job',
      'shipment_id': '7',
      'app_id': 'app-nile',
    });
    await _settle(tester);
    expect(hub.openCompany, 'app-nile');
    expect(hub.location, '/courier-job/7');
    expect(hub.companyApi('app-nile').count('getCourierJob'), 2);
    expect(hub.companyApi('app-swift').count('getCourierJob'), 0);
  });

  testWidgets('a push that started the app opens its company', (tester) async {
    final hub = _Hub(companies: [_swift, _nile]);
    hub.push.initial = {
      'type': 'courier_job',
      'shipment_id': '7',
      'app_id': 'app-nile',
    };
    await hub.pump(tester);
    expect(hub.openCompany, 'app-nile');
    expect(hub.location, '/courier-job/7');
    // On top of the courier's screen, with a way back to it.
    final router = (hub.state as HubOpen).container.read(appRouterProvider);
    expect(router.canPop(), isTrue);
    expect(hub.companyApi('app-nile').count('getCourierJob'), 1);
  });

  testWidgets('signing out ends Yallapp Courier and every company', (
    tester,
  ) async {
    final hub = _Hub(companies: [_swift, _nile]);
    await hub.pump(tester);
    await tester.tap(find.text('Swift Parcels'));
    await _settle(tester);
    await tester.tap(find.byKey(const ValueKey('hub-switch-company')));
    await _settle(tester);
    await tester.tap(find.text('Nile Express'));
    await _settle(tester);

    await tester.tap(find.text('Account'));
    await _settle(tester);
    await tester.scrollUntilVisible(find.text('Log out'), 200);
    await tester.tap(find.text('Log out'));
    await _settle(tester);
    expect(
      find.text(
        'You\'ll be signed out of Yallapp Courier and every company on this '
        'phone.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Log out').last);
    await _settle(tester);
    expect(hub.api.count('signOut'), 1);
    expect(hub.state, isA<HubSignedOut>());
    expect(await hub.tokens.read(), isNull);
    expect(await hub.store('app-swift').read(), isNull);
    expect(await hub.store('app-nile').read(), isNull);
    // The company's own sign-out was not used: Yallapp Courier's ends it.
    expect(hub.companyApi('app-nile').count('logout'), 0);
    expect(find.text('Welcome'), findsOneWidget);
  });

  testWidgets('a company that ends the session sends the courier back', (
    tester,
  ) async {
    final hub = _Hub(companies: [_swift, _nile]);
    await hub.pump(tester);
    await tester.tap(find.text('Swift Parcels'));
    await _settle(tester);
    final open = hub.state as HubOpen;
    hub.companyApi('app-swift').failures['getMe'] = const ApiException(
      code: 'invalid_token',
      message: 'Signed out.',
      statusCode: 401,
    );
    await open.container.read(authControllerProvider.notifier).reloadUser();
    await _settle(tester);
    expect(hub.openCompany, isNull);
    expect(
      find.textContaining('Your session at Swift Parcels ended'),
      findsOne,
    );
    expect(await hub.store('app-swift').read(), isNull);
  });
}
