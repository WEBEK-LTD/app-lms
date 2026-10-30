import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../auth/token_manager.dart';
import 'api_exception.dart';
import 'offline_cache.dart';

/// Whether a request sends the student's access token.
enum AuthMode {
  /// Public endpoint (`security: []`): never send a token.
  none,

  /// Works signed in or out (`security: [{}, bearerAuth]`).
  optional,

  /// Needs a signed-in student.
  required,
}

const _authKey = 'yallapp.auth';
const _retriedKey = 'yallapp.retried';

Options authOptions(AuthMode mode, [Options? options]) => (options ?? Options())
    .copyWith(extra: {...?options?.extra, _authKey: mode});

/// Called when any response carries one of the app-wide stop codes
/// (`maintenance`, `license_inactive`, `account_suspended`,
/// `update_required`).
typedef GateErrorCallback = void Function(ApiException error);

/// Builds the Dio instance for the Yallapp API (see `apiUrlOf`).
Dio createHttpClient({
  required String baseUrl,
  required TokenManager tokens,
  GateErrorCallback? onGateError,
  HttpClientAdapter? adapter,
  String Function()? language,
  OfflineCache? offline,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      responseType: ResponseType.json,
      contentType: Headers.jsonContentType,
      headers: {Headers.acceptHeader: Headers.jsonContentType},
    ),
  );
  if (adapter != null) dio.httpClientAdapter = adapter;
  if (language != null) dio.interceptors.add(LanguageInterceptor(language));
  dio.interceptors.add(AuthInterceptor(dio: dio, tokens: tokens));
  if (offline != null) dio.interceptors.add(OfflineCacheInterceptor(offline));
  if (onGateError != null) dio.interceptors.add(GateInterceptor(onGateError));
  return dio;
}

/// Sends the language the user picked as `Accept-Language`, so texts the
/// client wrote come back translated when they can.
class LanguageInterceptor extends Interceptor {
  LanguageInterceptor(this._language);

  final String Function() _language;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['Accept-Language'] = _language();
    handler.next(options);
  }
}

/// Adds the bearer token and, on a 401, refreshes once and retries.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({required this._dio, required this._tokens});

  final Dio _dio;
  final TokenManager _tokens;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final mode = options.extra[_authKey] as AuthMode? ?? AuthMode.required;
    if (mode == AuthMode.none || options.headers.containsKey('Authorization')) {
      return handler.next(options);
    }
    try {
      final token = await _tokens.validAccessToken();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    } on ApiException catch (e) {
      handler.reject(DioException(requestOptions: options, error: e));
    }
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final request = err.requestOptions;
    final header = request.headers['Authorization'];
    final retried = request.extra[_retriedKey] == true;
    if (err.response?.statusCode != 401 || header is! String || retried) {
      return handler.next(err);
    }
    final failedToken = header.replaceFirst('Bearer ', '');
    try {
      final newToken = await _tokens.refresh(failedAccessToken: failedToken);
      if (newToken == null) return handler.next(err);
      final retry = request.copyWith(
        headers: {...request.headers, 'Authorization': 'Bearer $newToken'},
        extra: {...request.extra, _retriedKey: true},
      );
      final response = await _dio.fetch<dynamic>(retry);
      handler.resolve(response);
    } on DioException catch (e) {
      handler.next(e);
    } on ApiException catch (e) {
      handler.next(DioException(requestOptions: request, error: e));
    }
  }
}

/// Reports app-wide stop codes so the app can switch to a full-screen state.
class GateInterceptor extends Interceptor {
  GateInterceptor(this._onGateError);

  final GateErrorCallback _onGateError;

  static const _codes = {
    ApiException.maintenance,
    ApiException.licenseInactive,
    ApiException.accountSuspended,
    ApiException.updateRequired,
  };

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final response = err.response;
    if (response != null) {
      final error = ApiException.fromResponse(
        response.statusCode,
        response.data,
      );
      if (_codes.contains(error.code)) _onGateError(error);
    }
    handler.next(err);
  }
}

/// 17 The app preview writes each failed request to the browser's console:
/// its address, what failed and the status, if any. The app's screen says
/// only that something went wrong; the console says what, for the owner
/// and for us.
class FailureLogInterceptor extends Interceptor {
  FailureLogInterceptor([void Function(String message)? log])
    : _log = log ?? debugPrint;

  final void Function(String message) _log;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _log(describeFailure(err));
    handler.next(err);
  }
}

/// One line about a failed request, without its headers or body (they can
/// hold a token).
String describeFailure(DioException err) {
  final options = err.requestOptions;
  final uri = options.uri;
  final address = '${uri.scheme}://${uri.authority}${uri.path}';
  final status = err.response?.statusCode;
  final inner = err.error;
  final reason = inner == null
      ? (err.message ?? '')
      : '${inner.runtimeType}: ${inner is FormatException ? inner.message : inner}';
  final short = reason.length > 300 ? '${reason.substring(0, 300)}…' : reason;
  return 'Yallapp preview: ${options.method} $address failed '
      '(${err.type.name}${status == null ? ', no response' : ', HTTP $status'})'
      '${short.isEmpty ? '' : ': $short'}';
}
