import 'dart:async';

import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/purchase/store_billing_api.dart';
import 'package:yallapp/core/purchase/store_client.dart';

/// 100 `Config.store_billing` as the hosted API sends it.
Map<String, dynamic> storeBillingJson({
  String session = 'access_token',
  String? termsUrl,
}) => {
  'base_url': 'https://yallapp.example/api/app/app-1',
  'session': session,
  'terms_url': termsUrl,
};

/// A paid course sold through the store (`purchase.action: store`).
Map<String, dynamic> storeCourseJson(
  Map<String, dynamic> course, {
  String productId = 'course_1',
}) => {
  ...course,
  'purchase': {'action': 'store', 'store_product_id': productId},
};

Map<String, dynamic> storeProductJson({
  String id = 'course_1',
  String type = 'one_time',
  String kind = 'course',
  int? courseId = 1,
  String? planId,
  String? period,
  String title = 'UI Design Fundamentals',
}) => {
  'product_id': id,
  'type': type,
  'kind': kind,
  'course_id': courseId,
  'plan_id': planId,
  'title': title,
  'period': period,
  'course_ids': <int>[],
};

/// The phone's store, in memory: tests deliver purchases with [deliver].
class FakeStoreClient implements StoreClient {
  FakeStoreClient({Map<String, String>? prices, this.available = true})
    : priceById = prices ?? {'course_1': '₺449,99'};

  bool available;
  Map<String, String> priceById;
  final bought = <String>[];
  final finished = <String>[];
  final _updates = StreamController<List<StoreTransaction>>.broadcast();

  /// What [unfinished] answers (transactions not finished yet are added by
  /// [transaction] when they need it).
  final pending = <String, StoreTransaction>{};
  List<StoreTransaction> ownedList = [];
  var ownedCalls = 0;

  /// A purchase as the store reports it; finishing it is recorded.
  StoreTransaction transaction(
    String productId, {
    StoreTransactionStatus status = StoreTransactionStatus.purchased,
    String? proof,
    bool needsFinish = true,
  }) {
    final token = proof ?? 'token-$productId';
    final t = StoreTransaction(
      productId: productId,
      status: status,
      proof: token,
      needsFinish: needsFinish,
      finish: () async {
        finished.add(token);
        pending.remove(token);
      },
    );
    if (needsFinish) pending[token] = t;
    return t;
  }

  void deliver(List<StoreTransaction> transactions) =>
      _updates.add(transactions);

  @override
  Future<bool> isAvailable() async => available;

  @override
  Future<Map<String, StorePrice>> prices(Set<String> productIds) async => {
    for (final id in productIds)
      if (priceById[id] case final price?)
        id: StorePrice(productId: id, price: price),
  };

  @override
  Future<bool> buy(String productId) async {
    bought.add(productId);
    return true;
  }

  @override
  Stream<List<StoreTransaction>> get updates => _updates.stream;

  @override
  Future<List<StoreTransaction>> unfinished() async => pending.values.toList();

  @override
  Future<List<StoreTransaction>> owned() async {
    ownedCalls++;
    return ownedList;
  }

  @override
  void dispose() {}
}

/// The Store billing endpoints, in memory.
class FakeStoreBillingApi implements StoreBillingApi {
  FakeStoreBillingApi({List<Map<String, dynamic>>? products})
    : productsJson = products ?? [storeProductJson()];

  List<Map<String, dynamic>> productsJson;

  /// What each `POST /billing/purchases` answers, in turn: a grant's JSON or
  /// an [ApiException]. Empty: an active grant for the product.
  final answers = <Object>[];
  final sent = <({String productId, String? token, String? signed})>[];
  final restores = <({List<String> tokens, List<String> signed})>[];
  List<Map<String, dynamic>> restoreGrants = [];

  @override
  Future<List<StoreProduct>> products() async => [
    for (final p in productsJson) StoreProduct.fromJson(p),
  ];

  @override
  Future<StoreGrant> sendPurchase({
    required String productId,
    String? purchaseToken,
    String? signedTransaction,
  }) async {
    sent.add((
      productId: productId,
      token: purchaseToken,
      signed: signedTransaction,
    ));
    final answer = answers.isEmpty ? null : answers.removeAt(0);
    if (answer is ApiException) throw answer;
    return StoreGrant.fromJson(
      answer as Map<String, dynamic>? ?? grantJson(productId: productId),
    );
  }

  @override
  Future<List<StoreGrant>> restore({
    List<String> purchaseTokens = const [],
    List<String> signedTransactions = const [],
  }) async {
    restores.add((tokens: purchaseTokens, signed: signedTransactions));
    return [for (final g in restoreGrants) StoreGrant.fromJson(g)];
  }
}

Map<String, dynamic> grantJson({
  String productId = 'course_1',
  String kind = 'course',
  String status = 'active',
  int? courseId = 1,
  String? planId,
}) => {
  'product_id': productId,
  'kind': kind,
  'course_id': courseId,
  'plan_id': planId,
  'status': status,
  'expires_at': null,
};

ApiException storeError(int status, String code) =>
    ApiException(code: code, message: '', statusCode: status);
