import 'package:dio/dio.dart';

import 'json.dart';

/// A Community API failure: the contract's `{code, message}` (the message is
/// safe to show and already in the member's language), or one of the app's
/// own codes for failures with no answer (offline, timeout).
class ApiException implements Exception {
  const ApiException({
    required this.code,
    this.message = '',
    this.statusCode,
    this.fieldErrors = const {},
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
    return ApiException.fromResponse(response.statusCode, response.data);
  }

  factory ApiException.fromResponse(int? statusCode, Object? body) {
    if (body is Map) {
      final json = asJson(body);
      // `{code, message}` or `{error: {code, message}}`.
      final inner = json['error'] is Map ? asJson(json['error']) : json;
      final code = optStr(inner, 'code');
      if (code != null) {
        final errors = inner['errors'] ?? inner['fields'];
        return ApiException(
          code: code,
          message: str(inner, 'message'),
          statusCode: statusCode,
          fieldErrors: errors is Map
              ? {for (final e in errors.entries) '${e.key}': '${e.value}'}
              : const {},
        );
      }
    }
    return ApiException(
      code: switch (statusCode) {
        400 || 422 => invalidRequest,
        401 => invalidToken,
        403 => notAllowed,
        404 => notFound,
        409 => conflict,
        429 => tooManyAttempts,
        _ => serverError,
      },
      statusCode: statusCode,
    );
  }

  final String code;
  final String message;
  final int? statusCode;
  final Map<String, String> fieldErrors;

  // The contract's codes the app acts on.
  static const invalidCredentials = 'invalid_credentials';
  static const emailTaken = 'email_taken';
  static const usernameTaken = 'username_taken';
  static const invalidToken = 'invalid_token';
  static const invalidRequest = 'invalid_request';
  static const notAllowed = 'not_allowed';
  static const notFound = 'not_found';
  static const tooManyAttempts = 'too_many_attempts';
  static const suspended = 'account_suspended';
  static const notConfigured = 'provider_not_configured';
  static const alreadyReported = 'already_reported';
  static const alreadyLinked = 'already_linked';
  static const notEligible = 'not_eligible';

  /// The app's own: the confirm page answered another request (a forged or
  /// stale state); the server's code for a bad code is `invalid_token`.
  static const stateMismatch = 'state_mismatch';

  /// A 409 the server gave no code for.
  static const conflict = 'conflict';

  // The app's own codes.
  static const network = 'network_error';
  static const timeout = 'timeout';
  static const cancelled = 'cancelled';
  static const serverError = 'server_error';

  /// Whether nothing answered: offline, a timeout.
  bool get offline => code == network || code == timeout;

  @override
  String toString() =>
      'ApiException($code${statusCode == null ? '' : ', $statusCode'}: $message)';
}
