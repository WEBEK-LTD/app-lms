import 'package:dio/dio.dart';

import '../api/api_exception.dart';
import '../api/models/json.dart';
import '../api/models/models.dart';

/// 100 The Store billing endpoints on Yallapp's hosted API
/// (`Config.store_billing.base_url`, docs/api/openapi.yaml), whatever runs
/// the rest of the app.
abstract class StoreBillingApi {
  /// What the app sells through the store on this platform (public).
  Future<List<StoreProduct>> products();

  /// Sends a purchase the store made. Throws [ApiException]:
  /// `invalid_receipt` (400), `purchase_in_use` (409), `store_unavailable`
  /// (503) and the network errors.
  Future<StoreGrant> sendPurchase({
    required String productId,
    String? purchaseToken,
    String? signedTransaction,
  });

  /// "Restore purchases": the grants still active for this account.
  Future<List<StoreGrant>> restore({
    List<String> purchaseTokens = const [],
    List<String> signedTransactions = const [],
  });
}

/// Error codes of the Store billing endpoints.
abstract final class StoreBillingErrors {
  static const invalidReceipt = 'invalid_receipt';
  static const purchaseInUse = 'purchase_in_use';
  static const storeUnavailable = 'store_unavailable';
  static const featureDisabled = 'feature_disabled';
}

class HttpStoreBillingApi implements StoreBillingApi {
  HttpStoreBillingApi({
    required this._public,
    required this._signedIn,
    required this._platform,
  });

  /// Without a token: `GET /billing/products`.
  final Dio _public;

  /// With the person's token (the app's own, or the site's billing token).
  final Dio? _signedIn;
  final DevicePlatform _platform;

  Map<String, dynamic> get _query => {'platform': _platform.name};

  Dio get _account =>
      _signedIn ??
      (throw const ApiException(
        code: ApiException.unauthorized,
        message: '',
        statusCode: 401,
      ));

  Future<T> _call<T>(
    Future<Response<dynamic>> Function() send,
    T Function(Json json) parse,
  ) async {
    final Response<dynamic> response;
    try {
      response = await send();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
    try {
      return parse(asJson(response.data));
    } on FormatException catch (e) {
      throw ApiException(
        code: ApiException.invalidResponse,
        message: e.message,
        statusCode: response.statusCode,
      );
    }
  }

  @override
  Future<List<StoreProduct>> products() => _call(
    () => _public.get<dynamic>('/billing/products', queryParameters: _query),
    (json) => listOf(json, 'items', StoreProduct.fromJson),
  );

  @override
  Future<StoreGrant> sendPurchase({
    required String productId,
    String? purchaseToken,
    String? signedTransaction,
  }) => _call(
    () => _account.post<dynamic>(
      '/billing/purchases',
      queryParameters: _query,
      data: {
        'product_id': productId,
        'purchase_token': ?purchaseToken,
        'signed_transaction': ?signedTransaction,
      },
    ),
    StoreGrant.fromJson,
  );

  @override
  Future<List<StoreGrant>> restore({
    List<String> purchaseTokens = const [],
    List<String> signedTransactions = const [],
  }) => _call(
    () => _account.post<dynamic>(
      '/billing/purchases/restore',
      queryParameters: _query,
      data: {
        // At most 100 of each (the contract).
        if (purchaseTokens.isNotEmpty)
          'purchase_tokens': purchaseTokens.take(100).toList(),
        if (signedTransactions.isNotEmpty)
          'signed_transactions': signedTransactions.take(100).toList(),
      },
    ),
    (json) => listOf(json, 'items', StoreGrant.fromJson),
  );
}
