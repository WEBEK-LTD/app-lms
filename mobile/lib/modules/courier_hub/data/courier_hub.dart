import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/http_client.dart';
import '../../../core/api/models/models.dart';
import '../../../core/app_environment.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/auth/token_manager.dart';
import '../../../core/auth/token_store.dart';
import '../../../core/config/build_config.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/language.dart';
import '../../../core/providers.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/services/crash_reporter.dart';
import '../../../core/services/push_service.dart';
import '../../../core/storage/local_settings.dart';
import 'courier_hub_api.dart';

/// 104.8.4 Where Yallapp Courier keeps its own session.
final courierHubTokenStoreProvider = Provider<TokenStore>(
  (ref) => SecureTokenStore(null, courierHubTokensKey),
);

/// 104.8.4 Each company's session, kept apart from every other company's.
/// Tests keep them in memory.
final courierCompanyStoreProvider = Provider<TokenStore Function(String)>(
  (ref) =>
      (appId) => SecureTokenStore(null, courierCompanyTokensKey(appId)),
);

/// 104.8.4 More overrides for a company's screens (tests give each company
/// its own fake API).
final courierCompanyOverridesProvider =
    Provider<List<Override> Function(CourierCompany company)>(
      (ref) =>
          (_) => const [],
    );

class CourierHubBundle {
  const CourierHubBundle(this.api, this.tokens);
  final CourierHubApi api;
  final TokenManager tokens;
}

/// 104.8.4 The Courier API (the build's `api_base_url`) and Yallapp
/// Courier's own tokens, refreshed with its `/auth/refresh`.
final courierHubBundleProvider = Provider<CourierHubBundle>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  final baseUrl = apiUrlOf(env.build);
  String language() => ref.read(appLanguageProvider);
  final refreshDio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      contentType: Headers.jsonContentType,
    ),
  )..interceptors.add(LanguageInterceptor(language));
  late final HttpCourierHubApi api;
  final tokens = TokenManager(
    store: ref.watch(courierHubTokenStoreProvider),
    refresh: (refreshToken) => api.refreshTokens(refreshToken),
  );
  final dio = createHttpClient(
    baseUrl: baseUrl,
    tokens: tokens,
    language: language,
  );
  api = HttpCourierHubApi(dio: dio, refreshDio: refreshDio);
  ref.onDispose(() {
    dio.close();
    refreshDio.close();
    tokens.dispose();
  });
  return CourierHubBundle(api, tokens);
});

final courierHubApiProvider = Provider<CourierHubApi>(
  (ref) => ref.watch(courierHubBundleProvider).api,
);

final courierHubTokensProvider = Provider<TokenManager>(
  (ref) => ref.watch(courierHubBundleProvider).tokens,
);

/// 104.8.4 Yallapp Courier's languages are the app's own, whatever the
/// last company's `Config.languages` said.
class CourierHubLanguages extends RemoteLanguages {
  @override
  Languages? build() => null;
}

/// 104.8.4 What Yallapp Courier's root adds to the app's providers.
final courierHubRootOverrides = <Override>[
  remoteLanguagesProvider.overrideWith(CourierHubLanguages.new),
];

/// 104.8.4 Inside Yallapp Courier, the company the courier's screens are
/// on and the way back to Yallapp Courier (switch company, sign out of
/// everything). Null in every other build.
final courierHubLinkProvider = Provider<CourierHubLink?>((ref) => null);

class CourierHubLink {
  const CourierHubLink({
    required this.company,
    required this.companies,
    required this.switchCompany,
    required this.signOut,
  });

  final CourierCompany company;

  /// The person's companies when this one was opened.
  final List<CourierCompany> companies;
  final VoidCallback switchCompany;

  /// Ends Yallapp Courier and every company session on this phone.
  final Future<void> Function() signOut;

  bool get canSwitch => companies.length > 1;
}

/// 104.8.4 A company's pushes inside Yallapp Courier: the phone's push
/// service, with only the notifications Yallapp Courier hands it (those
/// with this company's `app_id`). The company's screens open them as in its
/// own courier app.
class CompanyPushService implements PushService {
  CompanyPushService(this._push, {this._initial, this._ready});

  final PushService _push;
  Map<String, dynamic>? _initial;

  /// Completes once the company's screens can open a notification.
  final Future<void> Function()? _ready;
  final _opened = StreamController<Map<String, dynamic>>.broadcast();

  /// A tapped notification for this company while its screens are open.
  void deliver(Map<String, dynamic> data) {
    if (!_opened.isClosed) _opened.add(data);
  }

  @override
  bool get isAvailable => _push.isAvailable;

  @override
  PushProvider get provider => _push.provider;

  @override
  Future<void> init() async {}

  @override
  Future<String?> token() => _push.token();

  @override
  Stream<String> get tokenRefreshes => _push.tokenRefreshes;

  @override
  Stream<Map<String, dynamic>> get openedMessages => _opened.stream;

  /// The notification that opened this company, once, when the company's
  /// screens are up (its router on its first screen).
  @override
  Future<Map<String, dynamic>?> initialMessage() async {
    final data = _initial;
    _initial = null;
    if (data != null) await _ready?.call();
    return data;
  }

  Future<void> close() => _opened.close();
}

/// The company a notification is for (`app_id` in its `data`), or null.
String? pushAppId(Map<String, dynamic> data) {
  final id = '${data['app_id'] ?? ''}'.trim();
  return id.isEmpty ? null : id;
}

/// 104.8.4 Where Yallapp Courier stands.
sealed class HubState {
  const HubState();
}

class HubChecking extends HubState {
  const HubChecking();
}

class HubSignedOut extends HubState {
  const HubSignedOut();
}

/// Signed in: the companies to pick from. [items] is null until the first
/// list; [notice] says why a company didn't open.
class HubCompanies extends HubState {
  const HubCompanies({
    this.items,
    this.loading = false,
    this.error,
    this.notice,
  });
  final List<CourierCompany>? items;
  final bool loading;
  final ApiException? error;
  final String? notice;
}

class HubOpening extends HubState {
  const HubOpening(this.company);
  final CourierCompany company;
}

/// A company's courier screens, in their own [container].
class HubOpen extends HubState {
  const HubOpen(this.company, this.container, this.push);
  final CourierCompany company;
  final ProviderContainer container;
  final CompanyPushService push;
}

final courierHubProvider = NotifierProvider<CourierHub, HubState>(
  CourierHub.new,
);

/// 104.8.4 Yallapp Courier: its sign-in, the companies, and each company's
/// courier screens in a container of their own, pointed at the company's
/// hosted API ([courierCompanyBuild]) with its tokens kept apart.
class CourierHub extends Notifier<HubState> {
  /// The company opened last, opened again at the next start.
  static const lastCompanyKey = 'courier_hub.company';

  /// The companies with a session on this phone, all ended at sign-out.
  static const sessionsKey = 'courier_hub.sessions';

  List<CourierCompany> _companies = const [];
  Map<String, dynamic>? _pendingPush;
  ProviderContainer? _container;
  CompanyPushService? _companyPush;
  int _opening = 0;

  CourierHubApi get _api => ref.read(courierHubApiProvider);
  TokenManager get _tokens => ref.read(courierHubTokensProvider);
  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  HubState build() {
    final subscriptions = <StreamSubscription<Object?>>[
      ref
          .watch(courierHubTokensProvider)
          .sessionExpired
          .listen((_) => unawaited(_endLocally())),
    ];
    final push = ref.watch(pushServiceProvider);
    if (push.isAvailable) {
      unawaited(
        push.initialMessage().then((data) {
          if (data != null) _onPush(data);
        }),
      );
      subscriptions
        ..add(push.openedMessages.listen(_onPush))
        ..add(push.tokenRefreshes.listen(_sendPushToken));
    }
    ref.onDispose(() {
      for (final s in subscriptions) {
        s.cancel();
      }
      _container?.dispose();
      unawaited(_companyPush?.close());
    });
    Future.microtask(_restore);
    return const HubChecking();
  }

  Future<void> _restore() async {
    if (!await _tokens.hasSession) {
      state = const HubSignedOut();
      return;
    }
    await _signedIn();
  }

  Future<void> _signedIn() async {
    unawaited(_registerPush());
    await loadCompanies(autoOpen: true);
  }

  Future<OtpRequestResult> requestCode({String? phone, String? email}) =>
      _api.requestCode(phone: phone, email: email);

  Future<void> verifyCode({
    required String requestId,
    required String code,
  }) async {
    final session = await _api.verifyCode(
      requestId: requestId,
      code: code,
      device: ref.read(appEnvironmentProvider).deviceInput,
    );
    await _tokens.save(session.tokens);
    await _signedIn();
  }

  /// `GET /companies`. [autoOpen] (at start and after signing in): the
  /// company a notification is for, else the one opened last, else the only
  /// one, opens at once.
  Future<void> loadCompanies({bool autoOpen = false, String? notice}) async {
    _opening++;
    final cached = _companies.isEmpty ? null : _companies;
    state = HubCompanies(items: cached, loading: true, notice: notice);
    final List<CourierCompany> items;
    try {
      items = await _api.listCompanies();
    } on ApiException catch (e) {
      // With the list from before on screen, the failure says why it's old.
      if (state is! HubSignedOut) {
        state = HubCompanies(
          items: cached,
          error: e,
          notice: notice ?? (cached == null ? null : e.message),
        );
      }
      return;
    }
    if (state is HubSignedOut) return;
    _companies = items;
    final pick = autoOpen ? _autoPick(items) : null;
    if (pick != null) return open(pick);
    state = HubCompanies(items: items, notice: notice);
  }

  CourierCompany? _autoPick(List<CourierCompany> items) {
    CourierCompany? find(String? id) => id == null
        ? null
        : items.where((c) => c.appId == id && !c.paused).firstOrNull;
    final push = _pendingPush;
    return find(push == null ? null : pushAppId(push)) ??
        find(_prefs.getString(lastCompanyKey)) ??
        (items.length == 1 && !items.single.paused ? items.single : null);
  }

  /// Opens [company]'s courier screens: its kept session, else a new one
  /// (`POST /companies/{app_id}/session`).
  Future<void> open(CourierCompany company) async {
    final l10n = currentL10n;
    if (company.paused) {
      state = HubCompanies(
        items: _companies,
        notice: l10n.hubPausedMessage(company.name),
      );
      return;
    }
    final attempt = ++_opening;
    _closeCompany();
    state = HubOpening(company);
    final env = ref.read(appEnvironmentProvider);
    final store = ref.read(courierCompanyStoreProvider)(company.appId);
    try {
      if (await store.read() == null) {
        final session = await _api.openCompany(company.appId, env.deviceInput);
        await store.write(
          StoredTokens(
            accessToken: session.tokens.accessToken,
            refreshToken: session.tokens.refreshToken,
            expiresAt: DateTime.now().toUtc().add(
              Duration(seconds: session.tokens.expiresIn),
            ),
          ),
        );
        await _remember(company.appId);
      }
    } on ApiException catch (e) {
      if (attempt != _opening || state is HubSignedOut) return;
      final notice = switch (e.code) {
        'not_courier' => l10n.hubPausedMessage(company.name),
        'not_found' => l10n.hubCompanyGone(company.name),
        _ => e.message,
      };
      if (e.isOffline) {
        state = HubCompanies(items: _companies, notice: notice);
        return;
      }
      return loadCompanies(notice: notice);
    }
    // The courier screens of the company before are off the screen first.
    await WidgetsBinding.instance.endOfFrame;
    if (attempt != _opening || state is HubSignedOut) return;
    await _keepApart(company.appId);
    final push = _pendingPush;
    final initial = push != null && pushAppId(push) == company.appId
        ? push
        : null;
    if (initial != null) _pendingPush = null;
    late final ProviderContainer container;
    final companyPush = CompanyPushService(
      ref.read(pushServiceProvider),
      initial: initial,
      ready: () => _routerReady(container),
    );
    container = ProviderContainer(
      retry: retryPolicy,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(_prefs),
        appEnvironmentProvider.overrideWithValue(
          _companyEnvironment(env, company),
        ),
        tokenStoreProvider.overrideWithValue(store),
        pushServiceProvider.overrideWithValue(companyPush),
        crashReporterProvider.overrideWithValue(
          ref.read(crashReporterProvider),
        ),
        courierHubLinkProvider.overrideWithValue(
          CourierHubLink(
            company: company,
            companies: _companies,
            switchCompany: switchCompany,
            signOut: signOut,
          ),
        ),
        ...ref.read(courierCompanyOverridesProvider)(company),
      ],
    );
    // The company ended the session (paused the courier, left Yallapp
    // Courier): back to the companies.
    container.listen<AuthState>(authControllerProvider, (_, next) {
      if (next is SignedOut) scheduleMicrotask(() => _companyEnded(company));
    });
    _container = container;
    _companyPush = companyPush;
    await _prefs.setString(lastCompanyKey, company.appId);
    state = HubOpen(company, container, companyPush);
  }

  /// Back to the companies; each company's session stays on the phone.
  void switchCompany() {
    unawaited(_prefs.remove(lastCompanyKey));
    unawaited(loadCompanies());
  }

  /// Signs out of Yallapp Courier on the server (best effort), which ends
  /// every company session it opened, and forgets them all here.
  Future<void> signOut() async {
    try {
      await _api.signOut();
    } on ApiException {
      // Offline or already ended: signed out here anyway.
    }
    await _endLocally();
  }

  Future<void> _endLocally() async {
    _opening++;
    _pendingPush = null;
    _closeCompany();
    state = const HubSignedOut();
    await _tokens.clear();
    final stores = ref.read(courierCompanyStoreProvider);
    final ids = {
      ...?_prefs.getStringList(sessionsKey),
      for (final c in _companies) c.appId,
    };
    for (final id in ids) {
      await stores(id).clear();
    }
    _companies = const [];
    await _prefs.remove(sessionsKey);
    await _prefs.remove(lastCompanyKey);
    await _forgetCompanyData();
  }

  Future<void> _companyEnded(CourierCompany company) async {
    final current = state;
    if (current is! HubOpen || current.company.appId != company.appId) return;
    _closeCompany();
    await ref.read(courierCompanyStoreProvider)(company.appId).clear();
    await _prefs.remove(lastCompanyKey);
    await loadCompanies(notice: currentL10n.hubSessionEnded(company.name));
  }

  /// The company's screens leave the screen in this frame; their providers
  /// go after it.
  void _closeCompany() {
    final container = _container;
    final push = _companyPush;
    _container = null;
    _companyPush = null;
    if (container == null) return;
    // The language or look picked in the company's Settings, for the list.
    ref.invalidate(localSettingsProvider);
    final binding = WidgetsBinding.instance;
    binding.addPostFrameCallback((_) {
      container.dispose();
      unawaited(push?.close());
    });
    binding.ensureVisualUpdate();
  }

  Future<void> _remember(String appId) async {
    final ids = {...?_prefs.getStringList(sessionsKey), appId};
    await _prefs.setStringList(sessionsKey, [...ids]);
  }

  /// What one company's screens keep on the phone (its strings, languages,
  /// contact and offline answers) is never shown in another's.
  Future<void> _keepApart(String appId) async {
    if (_prefs.getString(lastCompanyKey) == appId) return;
    await _forgetCompanyData();
  }

  Future<void> _forgetCompanyData() async {
    for (final key in _prefs.getKeys().toList()) {
      if (key.startsWith('l10n.pack.') ||
          key.startsWith('offline.') ||
          key == 'l10n.languages' ||
          key == 'gate.owner_contact') {
        await _prefs.remove(key);
      }
    }
  }

  Future<void> _registerPush() async {
    final push = ref.read(pushServiceProvider);
    if (!push.isAvailable) return;
    await _sendPushToken(await push.token());
  }

  /// `PUT /me/push-token` on the Courier API while signed in.
  Future<void> _sendPushToken(String? token) async {
    if (token == null || token.isEmpty || !await _tokens.hasSession) return;
    try {
      await _api.setPushToken(token, ref.read(pushServiceProvider).provider);
    } on ApiException {
      // Sent again at the next start or token change.
    }
  }

  /// A tapped notification: the company's screens open it when it is for
  /// the company on screen; else its company opens first, with it.
  void _onPush(Map<String, dynamic> data) {
    final appId = pushAppId(data);
    final current = state;
    if (current is HubOpen &&
        (appId == null || appId == current.company.appId)) {
      current.push.deliver(data);
      return;
    }
    if (appId == null) return;
    _pendingPush = data;
    // Signing in or starting: the company opens once the list is in.
    if (current is HubChecking || current is HubSignedOut) return;
    final company = _companies.where((c) => c.appId == appId).firstOrNull;
    unawaited(company != null ? open(company) : loadCompanies(autoOpen: true));
  }

  /// Until the company's router is on its first screen, so a notification's
  /// screen goes on top of it (with a way back), not in its place.
  static Future<void> _routerReady(ProviderContainer container) async {
    final delegate = container.read(appRouterProvider).routerDelegate;
    if (delegate.currentConfiguration.isNotEmpty) return;
    final done = Completer<void>();
    void check() {
      if (delegate.currentConfiguration.isNotEmpty && !done.isCompleted) {
        done.complete();
      }
    }

    delegate.addListener(check);
    await done.future.timeout(const Duration(seconds: 10), onTimeout: () {});
    delegate.removeListener(check);
  }

  AppEnvironment _companyEnvironment(
    AppEnvironment env,
    CourierCompany company,
  ) => AppEnvironment(
    build: courierCompanyBuild(
      env.build,
      appId: company.appId,
      name: company.name,
      apiBaseUrl: company.apiBaseUrl,
      logoUrl: company.logoUrl,
      primaryColor: company.primaryColor,
    ),
    platform: env.platform,
    appVersion: env.appVersion,
    deviceId: env.deviceId,
    deviceName: env.deviceName,
    osVersion: env.osVersion,
    installStore: env.installStore,
  );
}
