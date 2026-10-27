import 'dart:async';

import 'package:flutter/services.dart' show PlatformException;
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';

import 'store_client.dart';

/// 100 The phone's store through the official `in_app_purchase` plugin:
/// Google Play Billing on Android, StoreKit 2 on iOS (the plugin's default).
/// Made once per app run, so the purchase stream is listened to from the
/// start: StoreKit hands unfinished transactions over again right after the
/// app starts listening.
class InAppStoreClient implements StoreClient {
  InAppStoreClient({required this.android, InAppPurchase? store})
    : _store = store ?? InAppPurchase.instance {
    _subscription = _store.purchaseStream.listen(
      _onPurchases,
      onError: (Object _) {},
    );
  }

  final bool android;
  final InAppPurchase _store;
  late final StreamSubscription<List<PurchaseDetails>> _subscription;
  final _updates = StreamController<List<StoreTransaction>>.broadcast();

  /// Purchases the store handed over that aren't finished yet, by id.
  final _unfinished = <String, StoreTransaction>{};

  /// The store's own product details, kept for buying.
  final _details = <String, ProductDetails>{};

  /// iOS: "Restore purchases" answers on the purchase stream.
  Completer<List<StoreTransaction>>? _restoring;

  @override
  Stream<List<StoreTransaction>> get updates => _updates.stream;

  @override
  Future<bool> isAvailable() async {
    try {
      return await _store.isAvailable();
    } on Object {
      return false;
    }
  }

  @override
  Future<Map<String, StorePrice>> prices(Set<String> productIds) async {
    if (productIds.isEmpty) return const {};
    final response = await _store.queryProductDetails(productIds);
    final chosen = <String, ProductDetails>{};
    for (final details in response.productDetails) {
      final current = chosen[details.id];
      // Google lists a subscription once per base plan and offer: the base
      // plan (no offer) is the price it renews at.
      if (current == null || (_isBasePlan(details) && !_isBasePlan(current))) {
        chosen[details.id] = details;
      }
    }
    _details.addAll(chosen);
    return {
      for (final MapEntry(:key, :value) in chosen.entries)
        key: StorePrice(productId: key, price: value.price),
    };
  }

  static bool _isBasePlan(ProductDetails details) {
    if (details is! GooglePlayProductDetails) return true;
    final index = details.subscriptionIndex;
    final offers = details.productDetails.subscriptionOfferDetails;
    if (index == null || offers == null) return true;
    return offers[index].offerId == null;
  }

  @override
  Future<bool> buy(String productId) async {
    try {
      var details = _details[productId];
      if (details == null) {
        await prices({productId});
        details = _details[productId];
      }
      if (details == null) return false;
      // Courses are bought once and memberships are subscriptions: both
      // are "non-consumable" for the plugin.
      return await _store.buyNonConsumable(
        purchaseParam: PurchaseParam(productDetails: details),
      );
    } on PlatformException {
      return false;
    }
  }

  @override
  Future<List<StoreTransaction>> unfinished() async {
    if (android) {
      for (final purchase in await _pastPurchases()) {
        final transaction = _wrap(purchase);
        if (transaction.needsFinish &&
            transaction.status != StoreTransactionStatus.error) {
          _unfinished[transaction.id] = transaction;
        }
      }
    }
    return _unfinished.values.toList();
  }

  @override
  Future<List<StoreTransaction>> owned() async {
    if (android) {
      return [
        for (final purchase in await _pastPurchases())
          if (purchase.verificationData.serverVerificationData.isNotEmpty)
            _wrap(purchase, restored: true),
      ];
    }
    // StoreKit 2 sends Transaction.currentEntitlements on the purchase
    // stream, all at once.
    final restoring = _restoring ??= Completer<List<StoreTransaction>>();
    try {
      await _store.restorePurchases();
    } on PlatformException {
      // Unverified transactions are left out; the verified ones still come.
    }
    try {
      return await restoring.future.timeout(const Duration(seconds: 20));
    } on TimeoutException {
      return const [];
    } finally {
      if (identical(_restoring, restoring)) _restoring = null;
    }
  }

  Future<List<PurchaseDetails>> _pastPurchases() async {
    final addition = _store
        .getPlatformAddition<InAppPurchaseAndroidPlatformAddition>();
    final response = await addition.queryPastPurchases();
    return response.pastPurchases;
  }

  void _onPurchases(List<PurchaseDetails> purchases) {
    final restoring = _restoring;
    if (restoring != null &&
        !restoring.isCompleted &&
        purchases.every((p) => p.status == PurchaseStatus.restored)) {
      restoring.complete([
        for (final purchase in purchases)
          if (purchase.verificationData.serverVerificationData.isNotEmpty)
            _wrap(purchase, restored: true),
      ]);
      return;
    }
    final transactions = [for (final purchase in purchases) _wrap(purchase)];
    for (final transaction in transactions) {
      if (transaction.needsFinish) _unfinished[transaction.id] = transaction;
    }
    if (transactions.isNotEmpty) _updates.add(transactions);
  }

  StoreTransaction _wrap(PurchaseDetails purchase, {bool restored = false}) {
    final proof = purchase.verificationData.serverVerificationData;
    // Android: the purchase token. iOS: the transaction's ID.
    final id = android || purchase.purchaseID == null
        ? (proof.isEmpty ? purchase.productID : proof)
        : purchase.purchaseID!;
    return StoreTransaction(
      productId: purchase.productID,
      status: restored
          ? StoreTransactionStatus.restored
          : switch (purchase.status) {
              PurchaseStatus.purchased => StoreTransactionStatus.purchased,
              PurchaseStatus.pending => StoreTransactionStatus.pending,
              PurchaseStatus.restored => StoreTransactionStatus.restored,
              PurchaseStatus.canceled => StoreTransactionStatus.canceled,
              PurchaseStatus.error => StoreTransactionStatus.error,
            },
      proof: proof,
      id: id,
      needsFinish: purchase.pendingCompletePurchase,
      finish: () async {
        if (purchase.pendingCompletePurchase) {
          await _store.completePurchase(purchase);
        }
        _unfinished.remove(id);
      },
    );
  }

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    unawaited(_updates.close());
  }
}
