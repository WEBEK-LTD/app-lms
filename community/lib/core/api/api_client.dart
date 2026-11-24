import 'package:dio/dio.dart';

import 'api_exception.dart';
import 'json.dart';

/// The one HTTP client of the app: the Community API's base URL, the
/// member's token on every call, the app's language, and failures turned
/// into [ApiException]. Every feature's API (lib/features/*/data) talks
/// through it; nothing else makes HTTP calls.
class ApiClient {
  ApiClient({required String baseUrl, Dio? dio, this.token, this.language})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 30),
              headers: {'accept': 'application/json'},
            ),
          );

  final Dio _dio;

  /// The member's access token, read on every call (null when signed out).
  String? Function()? token;

  /// The app's language (`en`, `ar`, `tr`), sent as `accept-language`.
  String Function()? language;

  Options _options([Options? options]) {
    final headers = <String, Object?>{...?options?.headers};
    final t = token?.call();
    if (t != null && t.isNotEmpty) headers['authorization'] = 'Bearer $t';
    final l = language?.call();
    if (l != null) headers['accept-language'] = l;
    return (options ?? Options()).copyWith(headers: headers);
  }

  Future<T> _run<T>(
    Future<Response<Object?>> Function() call,
    T Function(Object? body) read,
  ) async {
    try {
      final response = await call();
      return read(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Json> get(String path, {Map<String, Object?>? query}) => _run(
    () => _dio.get<Object?>(
      path,
      queryParameters: _clean(query),
      options: _options(),
    ),
    asJson,
  );

  Future<Json> post(String path, {Object? body}) => _run(
    () => _dio.post<Object?>(
      path,
      data: body ?? const <String, Object?>{},
      options: _options(),
    ),
    (b) => b == null || b == '' ? <String, dynamic>{} : asJson(b),
  );

  Future<Json> patch(String path, {Object? body}) => _run(
    () => _dio.patch<Object?>(
      path,
      data: body ?? const <String, Object?>{},
      options: _options(),
    ),
    (b) => b == null || b == '' ? <String, dynamic>{} : asJson(b),
  );

  Future<Json> put(String path, {Object? body}) => _run(
    () => _dio.put<Object?>(
      path,
      data: body ?? const <String, Object?>{},
      options: _options(),
    ),
    (b) => b == null || b == '' ? <String, dynamic>{} : asJson(b),
  );

  Future<void> delete(String path, {Object? body}) => _run(
    () => _dio.delete<Object?>(path, data: body, options: _options()),
    (_) {},
  );

  /// A file sent as `multipart/form-data` under [field].
  Future<Json> upload(
    String path, {
    required String field,
    required String filePath,
    Map<String, Object?> fields = const {},
  }) async {
    final form = FormData.fromMap({
      ...fields,
      field: await MultipartFile.fromFile(filePath),
    });
    return _run(
      () => _dio.post<Object?>(path, data: form, options: _options()),
      asJson,
    );
  }

  static Map<String, Object?>? _clean(Map<String, Object?>? query) =>
      query == null
      ? null
      : {
          for (final e in query.entries)
            if (e.value != null) e.key: e.value,
        };
}
