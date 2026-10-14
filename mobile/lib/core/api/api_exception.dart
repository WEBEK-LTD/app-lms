import 'package:dio/dio.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderException;

import 'models/json.dart';
import '../l10n/l10n.dart';

/// An API failure with the contract's stable machine-readable `code`.
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.retryAfterSeconds,
    this.details,
  });

  /// Builds an exception from a Dio failure, reading the contract's `Error`
  /// body when there is one.
  factory ApiException.fromDio(DioException error) {
    final inner = error.error;
    if (inner is ApiException) return inner;
    final response = error.response;
    if (response == null) {
      return switch (error.type) {
        DioExceptionType.connectionTimeout ||
        DioExceptionType.sendTimeout ||
        DioExceptionType.receiveTimeout => ApiException(
          code: timeout,
          message: currentL10n.errorTimeout,
        ),
        DioExceptionType.cancel => ApiException(
          code: cancelled,
          message: currentL10n.errorCancelled,
        ),
        _ => ApiException(
          code: networkError,
          message: currentL10n.errorNetwork,
        ),
      };
    }
    return ApiException.fromResponse(response.statusCode, response.data);
  }

  factory ApiException.fromResponse(int? statusCode, Object? body) {
    if (body is Map) {
      final json = asJson(body);
      final code = optString(json, 'code');
      final message = optString(json, 'message');
      if (code != null) {
        return ApiException(
          code: code,
          message: (message == null || message.isEmpty)
              ? _fallbackMessage(statusCode)
              : message,
          statusCode: statusCode,
          retryAfterSeconds: optInt(json, 'retry_after_seconds'),
          details: json['details'] is Map ? asJson(json['details']) : null,
        );
      }
    }
    return ApiException(
      code: _fallbackCode(statusCode),
      message: _fallbackMessage(statusCode),
      statusCode: statusCode,
    );
  }

  static const networkError = 'network_error';
  static const timeout = 'timeout';
  static const cancelled = 'cancelled';
  static const invalidResponse = 'invalid_response';
  static const unauthorized = 'unauthorized';
  static const maintenance = 'maintenance';
  static const licenseInactive = 'license_inactive';
  static const updateRequired = 'update_required';
  static const watchRequirementNotMet = 'watch_requirement_not_met';
  static const deviceLimitReached = 'device_limit_reached';
  static const notEnrolled = 'not_enrolled';
  static const purchaseNotAllowed = 'purchase_not_allowed';
  static const cartChanged = 'cart_changed';

  final String code;
  final String message;
  final int? statusCode;
  final int? retryAfterSeconds;
  final Map<String, dynamic>? details;

  bool get isUnauthorized => statusCode == 401;
  bool get isOffline => code == networkError || code == timeout;

  static String _fallbackCode(int? status) => switch (status) {
    400 => 'bad_request',
    401 => unauthorized,
    403 => 'forbidden',
    404 => 'not_found',
    409 => 'conflict',
    429 => 'rate_limited',
    503 => 'unavailable',
    _ => 'server_error',
  };

  static String _fallbackMessage(int? status) => switch (status) {
    401 => currentL10n.error401,
    403 => currentL10n.error403,
    404 => currentL10n.error404,
    429 => currentL10n.error429,
    503 => currentL10n.error503,
    _ => currentL10n.errorGeneric,
  };

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}

/// The original error behind Riverpod's wrappers.
Object unwrapError(Object error) =>
    error is ProviderException ? unwrapError(error.exception) : error;

/// Turns any error into a message that is safe to show to the student.
String friendlyError(Object raw) {
  final error = unwrapError(raw);
  if (error is ApiException) return error.message;
  if (error is DioException) return ApiException.fromDio(error).message;
  return currentL10n.errorGeneric;
}

/// Riverpod retry policy: only transient network failures are retried, twice.
Duration? retryPolicy(int retryCount, Object error) {
  final e = unwrapError(error);
  if (e is ApiException && e.isOffline && retryCount < 2) {
    return Duration(milliseconds: 600 * (1 << retryCount));
  }
  return null;
}
