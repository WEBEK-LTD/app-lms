import 'package:dio/dio.dart';

import 'api_exception.dart';
import 'json.dart';

/// The one HTTP client of the app: the Community API's base URL, the
/// member's token on every call, the app's language, and failures turned
/// into [ApiException]. Every feature's API (lib/features/*/data) talks
/// through it; nothing else makes HTTP calls.
///
/// Access tokens last 15 minutes. A call the server answers 401 asks
/// [renew] for new tokens once (one renewal at a time, however many calls
/// failed together) and is sent again.
class ApiClient {
  ApiClient({
    required String baseUrl,
    Dio? dio,
    this.token,
    this.language,
    this.renew,
  }) : _dio =
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

  /// Gets new tokens after a 401; true when it did.
  Future<bool> Function()? renew;
  Future<bool>? _renewing;

  Options _options() {
    final headers = <String, Object?>{};
    final t = token?.call();
    if (t != null && t.isNotEmpty) headers['authorization'] = 'Bearer $t';
    final l = language?.call();
    if (l != null) headers['accept-language'] = l;
    return Options(headers: headers);
  }

  Future<T> _run<T>(
    Future<Response<Object?>> Function(Options options) call,
    T Function(Object? body) read, {
    bool canRenew = true,
  }) async {
    final sentWith = token?.call();
    try {
      return read((await call(_options())).data);
    } on DioException catch (e) {
      final renewer = renew;
      if (canRenew &&
          renewer != null &&
          sentWith != null &&
          e.response?.statusCode == 401) {
        // Another call may have renewed the tokens meanwhile.
        final renewed =
            token?.call() != sentWith ||
            await (_renewing ??= renewer().whenComplete(
              () => _renewing = null,
            ));
        if (renewed) {
          try {
            return read((await call(_options())).data);
          } on DioException catch (again) {
            throw ApiException.fromDio(again);
          }
        }
      }
      throw ApiException.fromDio(e);
    }
  }

  static Json _body(Object? b) =>
      b == null || b == '' ? <String, dynamic>{} : asJson(b);

  Future<Json> get(String path, {Map<String, Object?>? query}) => _run(
    (o) => _dio.get<Object?>(path, queryParameters: _clean(query), options: o),
    asJson,
  );

  /// [renew] false: a call that must not renew the tokens (renewing them,
  /// signing out).
  Future<Json> post(String path, {Object? body, bool renew = true}) => _run(
    (o) => _dio.post<Object?>(
      path,
      data: body ?? const <String, Object?>{},
      options: o,
    ),
    _body,
    canRenew: renew,
  );

  Future<Json> patch(String path, {Object? body}) => _run(
    (o) => _dio.patch<Object?>(
      path,
      data: body ?? const <String, Object?>{},
      options: o,
    ),
    _body,
  );

  Future<Json> put(String path, {Object? body}) => _run(
    (o) => _dio.put<Object?>(
      path,
      data: body ?? const <String, Object?>{},
      options: o,
    ),
    _body,
  );

  Future<void> delete(String path, {Object? body}) =>
      _run((o) => _dio.delete<Object?>(path, data: body, options: o), (_) {});

  /// A DELETE whose answer is read (the contract's Relationship).
  Future<Json> deleteJson(String path, {Object? body}) =>
      _run((o) => _dio.delete<Object?>(path, data: body, options: o), _body);

  /// A file sent as `multipart/form-data` under [field].
  Future<Json> upload(
    String path, {
    String method = 'POST',
    required String field,
    required String filePath,
    Map<String, Object?> fields = const {},
  }) => _run((o) async {
    // A form is read once: each try builds its own.
    final form = FormData.fromMap({
      ...fields,
      field: await MultipartFile.fromFile(filePath),
    });
    return _dio.request<Object?>(
      path,
      data: form,
      options: o.copyWith(method: method),
    );
  }, asJson);

  /// `multipart/form-data` with several files (posts' photos, a message's
  /// photos, a story's video and poster): [files] as (field, path) pairs;
  /// a field repeated for an array.
  Future<Json> multipart(
    String path, {
    String method = 'POST',
    Map<String, Object?> fields = const {},
    List<(String, String)> files = const [],
  }) => _run((o) async {
    final form = FormData();
    for (final e in fields.entries) {
      if (e.value != null) form.fields.add(MapEntry(e.key, '${e.value}'));
    }
    for (final (field, file) in files) {
      form.files.add(MapEntry(field, await MultipartFile.fromFile(file)));
    }
    return _dio.request<Object?>(
      path,
      data: form,
      options: o.copyWith(method: method),
    );
  }, asJson);

  static Map<String, Object?>? _clean(Map<String, Object?>? query) =>
      query == null
      ? null
      : {
          for (final e in query.entries)
            if (e.value != null) e.key: e.value,
        };
}
