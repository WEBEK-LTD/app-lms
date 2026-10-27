import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../modules/chat/data/chat_api.dart';
import '../api/api_exception.dart';
import '../api/http_client.dart';
import '../api/models/models.dart';
import '../auth/auth_controller.dart';
import '../gate/app_gate.dart';
import '../l10n/language.dart';
import '../providers.dart';
import 'in_app_store_client.dart';
import 'store_billing_api.dart';
import 'store_client.dart';

/// 100 `Config.store_billing`: null when the app doesn't sell courses and
/// memberships in the app.
final storeBillingConfigProvider = Provider<StoreBillingConfig?>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady ? gate.config.storeBilling : null;
});

/// The phone's store, made once when the app sells in the app: the plugin
/// on a phone, [PreviewStoreClient] in the app preview, none elsewhere on
/// the web.
final storeClientProvider = Provider<StoreClient?>((ref) {
  final sells = ref.watch(
    storeBillingConfigProvider.select((config) => config != null),
  );
  if (!sells) return null;
  final env = ref.watch(appEnvironmentProvider);
  if (env.isPreview) return PreviewStoreClient();
  if (kIsWeb) return null;
  final client = InAppStoreClient(android: env.isAndroid);
  ref.onDispose(client.dispose);
  return client;
});

/// The Store billing endpoints: products for anyone, purchases and restore
/// for the signed-in person (with the app's token, or the WordPress site's
/// billing token as the chat does).
final storeBillingApiProvider = Provider<StoreBillingApi?>((ref) {
  final config = ref.watch(storeBillingConfigProvider);
  if (config == null) return null;
  final signedIn = ref.watch(
    authControllerProvider.select((s) => s.isSignedIn),
  );
  final env = ref.watch(appEnvironmentProvider);
  String language() => ref.read(appLanguageProvider);
  Dio plain() {
    final dio = Dio(
      BaseOptions(
        baseUrl: config.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        responseType: ResponseType.json,
        contentType: Headers.jsonContentType,
        headers: {Headers.acceptHeader: Headers.jsonContentType},
      ),
    );
    dio.interceptors.add(LanguageInterceptor(language));
    return dio;
  }

  final public = plain();
  Dio? account;
  if (signedIn) {
    if (config.session == ChatSessionKind.site) {
      // A WordPress app: a billing token from the site, then Yallapp with it.
      final api = ref.watch(yallappApiProvider);
      final dio = plain();
      dio.interceptors.add(
        SiteChatAuthInterceptor(dio, SiteChatTokens(api.startBillingSession)),
      );
      account = dio;
    } else {
      account = createHttpClient(
        baseUrl: config.baseUrl,
        tokens: ref.watch(tokenManagerProvider),
        language: language,
      );
    }
  }
  // 17 The preview tells Yallapp who it is.
  final previewToken = env.preview?.apiToken;
  for (final dio in [public, ?account]) {
    if (previewToken != null) {
      dio.options.headers['X-Yallapp-Preview'] = previewToken;
    }
  }
  ref.onDispose(() {
    public.close();
    account?.close();
  });
  return HttpStoreBillingApi(
    public: public,
    signedIn: account,
    platform: env.platform,
  );
});

/// A product the app sells, with the store's price in the person's
/// currency (never the site's). [price] is null only in the app preview.
class StoreOffer {
  const StoreOffer({required this.product, this.price});

  final StoreProduct product;
  final String? price;

  String get productId => product.productId;
}

/// What the app sells through the store on this platform and the store's
/// price of each; products the store doesn't offer (yet) are left out.
final storeOffersProvider = FutureProvider<Map<String, StoreOffer>>((
  ref,
) async {
  final api = ref.watch(storeBillingApiProvider);
  final client = ref.watch(storeClientProvider);
  if (api == null || client == null) return const {};
  if (!await client.isAvailable()) return const {};
  final products = await api.products();
  if (client is PreviewStoreClient) {
    return {for (final p in products) p.productId: StoreOffer(product: p)};
  }
  final prices = await client.prices({for (final p in products) p.productId});
  return {
    for (final p in products)
      if (prices[p.productId] case final price?)
        p.productId: StoreOffer(product: p, price: price.price),
  };
});

/// What a purchase or "Restore purchases" came to, for the person.
enum StoreOutcomeKind {
  /// Access given ([StoreOutcome.grant]).
  granted,

  /// Google waits for the payment: nothing yet.
  pending,

  /// Paid, but not confirmed with Yallapp yet: sent again later.
  retryLater,

  /// Not a valid purchase (400 `invalid_receipt`).
  invalid,

  /// The purchase gives access to another account (409 `purchase_in_use`).
  inUse,

  /// The purchase ended or was refunded.
  ended,

  /// The store or Yallapp said no ([StoreOutcome.message] when known).
  failed,

  /// The store can't take payments on this phone.
  unavailable,

  /// The app preview never buys.
  preview,

  /// "Restore purchases" found grants ([StoreOutcome.grants]).
  restored,

  /// "Restore purchases" found nothing for this account.
  nothingRestored,
}

class StoreOutcome {
  const StoreOutcome(
    this.kind, {
    required this.serial,
    this.grant,
    this.grants = const [],
    this.message,
  });

  final StoreOutcomeKind kind;

  /// Tells two equal outcomes in a row apart.
  final int serial;
  final StoreGrant? grant;
  final List<StoreGrant> grants;
  final String? message;
}

@immutable
class StoreBillingState {
  const StoreBillingState({this.buying, this.restoring = false, this.outcome});

  /// The product being bought or confirmed now.
  final String? buying;
  final bool restoring;

  /// The latest outcome, shown once by [StoreBillingMessages].
  final StoreOutcome? outcome;

  StoreBillingState copyWith({
    Object? buying = _keep,
    bool? restoring,
    StoreOutcome? outcome,
  }) => StoreBillingState(
    buying: buying == _keep ? this.buying : buying as String?,
    restoring: restoring ?? this.restoring,
    outcome: outcome ?? this.outcome,
  );

  static const _keep = Object();
}

/// 100 Buying through the store: sends each purchase the store reports to
/// Yallapp (`POST /billing/purchases`) and finishes it with the store only
/// once Yallapp gave the access (or said it can never be used). A purchase
/// that couldn't be confirmed (503 `store_unavailable`, no network) stays
/// unfinished and is sent again: a little later, when the app comes back to
/// the front, at the next start, and when the store delivers it again.
/// Watched once at the app root.
final storeBillingProvider =
    NotifierProvider<StoreBillingController, StoreBillingState>(
      StoreBillingController.new,
    );

class StoreBillingController extends Notifier<StoreBillingState> {
  StoreClient? _client;
  StoreBillingApi? _api;
  final _sending = <String>{};
  Timer? _retry;
  var _retries = 0;
  var _serial = 0;

  /// Waits between tries of purchases Yallapp couldn't confirm yet.
  static const retryDelays = [
    Duration(minutes: 1),
    Duration(minutes: 5),
    Duration(minutes: 15),
    Duration(minutes: 30),
  ];

  @override
  StoreBillingState build() {
    final client = _client = ref.watch(storeClientProvider);
    final signedIn = ref.watch(
      authControllerProvider.select((s) => s.isSignedIn),
    );
    _api = ref.watch(storeBillingApiProvider);
    _sending.clear();
    if (client == null || _api == null) return const StoreBillingState();
    final subscription = client.updates.listen(
      (transactions) => transactions.forEach(_handle),
    );
    final lifecycle = AppLifecycleListener(onResume: resendUnfinished);
    ref.onDispose(() {
      subscription.cancel();
      lifecycle.dispose();
      _retry?.cancel();
      _retry = null;
    });
    // Purchases left unfinished by an earlier run (or before signing in).
    if (signedIn) Future.microtask(resendUnfinished);
    return const StoreBillingState();
  }

  bool get _signedIn => ref.read(authControllerProvider).isSignedIn;
  bool get _android => ref.read(appEnvironmentProvider).isAndroid;

  void _emit(
    StoreOutcomeKind kind, {
    StoreGrant? grant,
    List<StoreGrant> grants = const [],
    String? message,
  }) {
    if (!ref.mounted) return;
    state = state.copyWith(
      outcome: StoreOutcome(
        kind,
        serial: ++_serial,
        grant: grant,
        grants: grants,
        message: message,
      ),
    );
  }

  void _setBuying(String? productId) {
    if (ref.mounted) state = state.copyWith(buying: productId);
  }

  /// Starts the store's purchase sheet for [offer]; the purchase comes back
  /// on the store's updates.
  Future<void> buy(StoreOffer offer) async {
    final client = _client;
    if (client == null || state.buying != null) return;
    if (client is PreviewStoreClient) return _emit(StoreOutcomeKind.preview);
    _setBuying(offer.productId);
    var started = false;
    try {
      if (!await client.isAvailable()) {
        return _emit(StoreOutcomeKind.unavailable);
      }
      started = await client.buy(offer.productId);
      if (!started) _emit(StoreOutcomeKind.failed);
    } on Object {
      _emit(StoreOutcomeKind.failed);
    } finally {
      // Still busy while the purchase is being confirmed with Yallapp.
      if (!_sending.any((id) => id.startsWith('${offer.productId}\n')) &&
          state.buying == offer.productId) {
        _setBuying(null);
      }
    }
  }

  /// Sends again the purchases the store still waits for the app to finish.
  Future<void> resendUnfinished() async {
    final client = _client;
    if (client == null || _api == null || !_signedIn) return;
    final List<StoreTransaction> unfinished;
    try {
      unfinished = await client.unfinished();
    } on Object {
      return;
    }
    await Future.wait([
      for (final transaction in unfinished) _handle(transaction, quiet: true),
    ]);
  }

  /// Handles one purchase from the store. [quiet]: sent again in the
  /// background, so only a final answer is told.
  Future<void> _handle(
    StoreTransaction transaction, {
    bool quiet = false,
  }) async {
    final api = _api;
    switch (transaction.status) {
      case StoreTransactionStatus.canceled:
        if (transaction.needsFinish) await _finish(transaction);
        if (state.buying == transaction.productId) _setBuying(null);
        return;
      case StoreTransactionStatus.error:
        if (transaction.needsFinish) await _finish(transaction);
        if (state.buying == transaction.productId) _setBuying(null);
        if (!quiet) _emit(StoreOutcomeKind.failed);
        return;
      case StoreTransactionStatus.pending:
      case StoreTransactionStatus.purchased:
      case StoreTransactionStatus.restored:
        break;
    }
    if (!transaction.hasProof) {
      // iOS "Ask to Buy" waits for a parent: nothing to send yet.
      if (transaction.status == StoreTransactionStatus.pending) {
        if (state.buying == transaction.productId) _setBuying(null);
        _emit(StoreOutcomeKind.pending);
      }
      return;
    }
    // Signed out: kept for when the person signs in.
    if (api == null || !_signedIn) return;
    final key = '${transaction.productId}\n${transaction.id}';
    if (!_sending.add(key)) return;
    if (!quiet || state.buying == transaction.productId) {
      _setBuying(transaction.productId);
    }
    try {
      final grant = await api.sendPurchase(
        productId: transaction.productId,
        purchaseToken: _android ? transaction.proof : null,
        signedTransaction: _android ? null : transaction.proof,
      );
      _retries = 0;
      switch (grant.status) {
        case StoreGrantStatus.active:
          await _finish(transaction);
          _emit(StoreOutcomeKind.granted, grant: grant);
        case StoreGrantStatus.pending:
          // Google tells Yallapp when the payment completes.
          if (!quiet) _emit(StoreOutcomeKind.pending, grant: grant);
        case StoreGrantStatus.expired:
        case StoreGrantStatus.revoked:
          await _finish(transaction);
          if (!quiet) _emit(StoreOutcomeKind.ended, grant: grant);
      }
    } on ApiException catch (e) {
      if (e.code == StoreBillingErrors.invalidReceipt) {
        // It will never be valid: the store stops sending it.
        await _finish(transaction);
        _emit(StoreOutcomeKind.invalid);
      } else if (e.code == StoreBillingErrors.purchaseInUse ||
          e.statusCode == 409) {
        // Another account of this app has it already (and it's recorded
        // and acknowledged there): nothing left to send.
        await _finish(transaction);
        _emit(StoreOutcomeKind.inUse);
      } else if (_temporary(e)) {
        _scheduleRetry();
        if (!quiet) _emit(StoreOutcomeKind.retryLater);
      } else if (!quiet) {
        _emit(StoreOutcomeKind.failed, message: e.message);
      }
    } finally {
      _sending.remove(key);
      if (state.buying == transaction.productId) _setBuying(null);
    }
  }

  static bool _temporary(ApiException e) =>
      e.isOffline ||
      e.code == StoreBillingErrors.storeUnavailable ||
      e.statusCode == null ||
      e.statusCode == 401 ||
      e.statusCode == 429 ||
      e.statusCode! >= 500;

  Future<void> _finish(StoreTransaction transaction) async {
    try {
      await transaction.finish();
    } on Object {
      // The store hands it over again; Yallapp answers the same grant.
    }
  }

  void _scheduleRetry() {
    if (_retry?.isActive ?? false) return;
    final delay = retryDelays[_retries.clamp(0, retryDelays.length - 1)];
    _retries++;
    _retry = Timer(delay, () {
      _retry = null;
      resendUnfinished();
    });
  }

  /// "Restore purchases": every purchase the store has for the person goes
  /// to Yallapp, which answers the grants still active for this account.
  Future<void> restore() async {
    final client = _client;
    final api = _api;
    if (client == null || api == null || state.restoring) return;
    if (client is PreviewStoreClient) return _emit(StoreOutcomeKind.preview);
    state = state.copyWith(restoring: true);
    try {
      final owned = [
        for (final transaction in await client.owned())
          if (transaction.hasProof) transaction.proof,
      ];
      if (owned.isEmpty) return _emit(StoreOutcomeKind.nothingRestored);
      final grants = await api.restore(
        purchaseTokens: _android ? owned : const [],
        signedTransactions: _android ? const [] : owned,
      );
      final active = [
        for (final grant in grants)
          if (grant.isActive) grant,
      ];
      _emit(
        active.isEmpty
            ? StoreOutcomeKind.nothingRestored
            : StoreOutcomeKind.restored,
        grants: active,
      );
    } on ApiException catch (e) {
      _emit(StoreOutcomeKind.failed, message: e.message);
    } on Object {
      _emit(StoreOutcomeKind.failed);
    } finally {
      if (ref.mounted) state = state.copyWith(restoring: false);
    }
    unawaited(resendUnfinished());
  }
}
