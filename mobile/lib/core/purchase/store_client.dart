import 'dart:async';

/// 100 What a store's purchase flow says about a purchase.
enum StoreTransactionStatus {
  /// Paid (Android `purchased`, iOS a verified transaction).
  purchased,

  /// Google Play still waits for the payment (cash, some cards).
  pending,

  /// From the person's purchases, on "Restore purchases".
  restored,

  /// The person closed the store's sheet.
  canceled,

  /// The store couldn't make the purchase.
  error,
}

/// One purchase from Google Play Billing or StoreKit, as the app sends it to
/// Yallapp (`StorePurchase`): the Google purchase token or the App Store's
/// signed transaction (JWS) in [proof].
class StoreTransaction {
  StoreTransaction({
    required this.productId,
    required this.status,
    required this.proof,
    this.needsFinish = false,
    String? id,
    this._finish,
  }) : id = id ?? proof;

  final String productId;
  final StoreTransactionStatus status;

  /// Android: the purchase token. iOS: the transaction's JWS. Empty for a
  /// cancelled or failed purchase.
  final String proof;

  /// Whether the store waits for the app to finish (Android: acknowledge)
  /// the transaction.
  final bool needsFinish;

  /// The same purchase delivered again has the same [id].
  final String id;
  final Future<void> Function()? _finish;

  /// Finishes the transaction with the store: only once Yallapp gave the
  /// access (or said the purchase can never be used).
  Future<void> finish() async => _finish?.call();

  bool get hasProof => proof.isNotEmpty;
}

/// A product's price in the store, in the person's currency, as the store
/// writes it ("₺449,99", "$9.99").
class StorePrice {
  const StorePrice({required this.productId, required this.price});

  final String productId;
  final String price;
}

/// The store on this phone: Google Play Billing on Android, StoreKit 2 on
/// iOS ([InAppStoreClient]); tests use a fake.
abstract class StoreClient {
  /// Whether the store can take payments here (false on phones without
  /// Google Play, with purchases turned off, and in the app preview).
  Future<bool> isAvailable();

  /// The store's prices for [productIds]; products the store doesn't know
  /// (not approved yet, stopped) are left out.
  Future<Map<String, StorePrice>> prices(Set<String> productIds);

  /// Starts the store's purchase sheet. The result arrives on [updates].
  /// False when the store couldn't start it.
  Future<bool> buy(String productId);

  /// Purchases as the store reports them: new ones, and again ones the app
  /// didn't finish.
  Stream<List<StoreTransaction>> get updates;

  /// Purchases the store still waits for the app to finish, to send again.
  Future<List<StoreTransaction>> unfinished();

  /// Every purchase the store has for the person, for "Restore purchases":
  /// Android's owned purchases, iOS's current entitlements.
  Future<List<StoreTransaction>> owned();

  void dispose() {}
}

/// 17 The app preview on the web: no store. Products show without a price,
/// and buying says it works in the installed app.
class PreviewStoreClient implements StoreClient {
  @override
  Future<bool> isAvailable() async => true;

  @override
  Future<Map<String, StorePrice>> prices(Set<String> productIds) async =>
      const {};

  @override
  Future<bool> buy(String productId) async => false;

  @override
  Stream<List<StoreTransaction>> get updates => const Stream.empty();

  @override
  Future<List<StoreTransaction>> unfinished() async => const [];

  @override
  Future<List<StoreTransaction>> owned() async => const [];

  @override
  void dispose() {}
}
