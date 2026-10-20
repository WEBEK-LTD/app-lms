import 'package:dio/dio.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderException;

import 'json.dart';

/// 59 An Owner API failure: the contract's `{code, message}` (the message is
/// safe to show and already in the person's language), or one of the app's
/// own codes for failures with no answer (offline, timeout).
class ApiException implements Exception {
  const ApiException({
    required this.code,
    this.message = '',
    this.statusCode,
    this.fieldErrors = const {},
    this.retryAfterSeconds,
  });

  factory ApiException.fromDio(DioException error) {
    final inner = error.error;
    if (inner is ApiException) return inner;
    final response = error.response;
    if (response == null) {
      return switch (error.type) {
        DioExceptionType.connectionTimeout ||
        DioExceptionType.sendTimeout ||
        DioExceptionType.receiveTimeout => const ApiException(code: timeout),
        DioExceptionType.cancel => const ApiException(code: cancelled),
        _ => const ApiException(code: network),
      };
    }
    return ApiException.fromResponse(
      response.statusCode,
      response.data,
      retryAfterHeader: response.headers.value('retry-after'),
    );
  }

  /// 64b What the media gate (or something in front of it) answered an
  /// upload, for the owner: refused (a firewall, an expired or foreign
  /// link), its storage unavailable, or a chunk too big.
  factory ApiException.fromGate(int? status) => ApiException(
    code: switch (status) {
      503 => uploadStorage,
      413 => uploadTooBig,
      403 || 405 || 406 || 410 || 501 => uploadRefused,
      final s? when s >= 200 && s < 300 => uploadRefused,
      _ => serverError,
    },
    statusCode: status,
  );

  factory ApiException.fromResponse(
    int? statusCode,
    Object? body, {
    String? retryAfterHeader,
  }) {
    final header = int.tryParse(retryAfterHeader ?? '');
    if (body is Map) {
      final json = asJson(body);
      final code = optStr(json, 'code');
      if (code != null) {
        final errors = json['errors'];
        return ApiException(
          code: code,
          message: str(json, 'message'),
          statusCode: statusCode,
          fieldErrors: errors is Map
              ? {for (final e in errors.entries) '${e.key}': '${e.value}'}
              : const {},
          retryAfterSeconds: optInt(json, 'retry_after_seconds') ?? header,
        );
      }
    }
    return ApiException(
      code: switch (statusCode) {
        400 => invalidRequest,
        401 => invalidToken,
        403 => 'forbidden',
        404 => notFound,
        409 => 'conflict',
        429 => rateLimited,
        503 => 'unavailable',
        _ => serverError,
      },
      statusCode: statusCode,
      retryAfterSeconds: header,
    );
  }

  // The contract's codes the app acts on.
  static const invalidCredentials = 'invalid_credentials';
  static const useWebsite = 'use_website';
  static const invalidToken = 'invalid_token';
  static const accountPending = 'account_pending';
  static const accountSuspended = 'account_suspended';
  static const notFound = 'not_found';
  static const notAvailable = 'not_available';
  static const invalidRequest = 'invalid_request';
  static const planNotActive = 'plan_not_active';
  static const storageFull = 'storage_full';
  static const tooBig = 'too_big';
  static const incomplete = 'incomplete';
  static const rateLimited = 'rate_limited';

  /// 60 The person's role on the team doesn't allow it ("Ask the owner").
  static const notAllowed = 'not_allowed';

  // The app's own codes.
  static const network = 'network_error';

  /// 64b The media gate, or a firewall in front of it, refused an upload
  /// (`statusCode` says how); its storage isn't available (503); a chunk
  /// was too big for the server (413).
  static const uploadRefused = 'upload_refused';
  static const uploadStorage = 'upload_storage';
  static const uploadTooBig = 'upload_too_big';
  static const timeout = 'timeout';
  static const cancelled = 'cancelled';
  static const serverError = 'server_error';

  final String code;

  /// From the server, in the person's language; empty when there was none.
  final String message;
  final int? statusCode;

  /// Per field, the dashboard form's message.
  final Map<String, String> fieldErrors;
  final int? retryAfterSeconds;

  bool get isOffline => code == network || code == timeout;
  bool get isUnauthorized => statusCode == 401;
  bool get isNotAllowed => code == notAllowed;
  bool get accountNotActive =>
      code == accountPending || code == accountSuspended;

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}

/// The error behind Riverpod's wrapper.
Object unwrapError(Object error) =>
    error is ProviderException ? unwrapError(error.exception) : error;

/// Retries only network failures, twice.
Duration? retryPolicy(int retryCount, Object error) {
  final e = unwrapError(error);
  if (e is ApiException && e.isOffline && retryCount < 2) {
    return Duration(milliseconds: 800 * (1 << retryCount));
  }
  return null;
}
