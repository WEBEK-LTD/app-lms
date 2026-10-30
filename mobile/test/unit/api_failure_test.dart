import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';

/// Answers every request the same way, or fails to connect.
class FixedServer implements HttpClientAdapter {
  FixedServer({this.status = 200, this.body = '{}', this.contentType});

  final int status;
  final String body;
  final String? contentType;
  bool offline = false;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (offline) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'offline',
      );
    }
    return ResponseBody.fromString(
      body,
      status,
      headers: {
        Headers.contentTypeHeader: [contentType ?? Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

/// Throws while handling every answer, as a broken interceptor would.
class BrokenInterceptor extends Interceptor {
  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler h) {
    throw TypeError();
  }
}

Dio client(FixedServer server, {List<String>? log}) {
  final dio = createHttpClient(
    baseUrl: 'https://yallapp.test/api/app/1',
    tokens: TokenManager(
      store: MemoryTokenStore(null),
      refresh: (_) async => throw const ApiException(code: 'x', message: 'x'),
    ),
    adapter: server,
  );
  if (log != null) dio.interceptors.add(FailureLogInterceptor(log.add));
  return dio;
}

Future<ApiException> failure(Dio dio) async {
  try {
    await dio.get<dynamic>(
      '/config',
      queryParameters: {'platform': 'android'},
      options: authOptions(AuthMode.none),
    );
  } on DioException catch (e) {
    return ApiException.fromDio(e);
  }
  fail('The request should have failed.');
}

void main() {
  // 17 The preview of a hosted app said "We couldn't connect" whatever
  // failed: only a request that got no answer is a connection problem.
  test('no answer at all is a connection problem', () async {
    final server = FixedServer()..offline = true;
    final error = await failure(client(server));
    expect(error.code, ApiException.networkError);
    expect(error.isOffline, isTrue);
  });

  test('an error page that says it is JSON but is not, is an answer the app '
      "couldn't read, not a connection problem", () async {
    final error = await failure(
      client(
        FixedServer(status: 502, body: '<html><h1>Bad gateway</h1></html>'),
      ),
    );
    expect(error.code, ApiException.invalidResponse);
    expect(error.isOffline, isFalse);
    expect(error.message, isNot(contains('connect')));
  });

  test(
    'an answer cut off in the middle is one the app couldn\'t read',
    () async {
      final error = await failure(
        client(FixedServer(body: '{"site": {"name": "Lale Fl')),
      );
      expect(error.code, ApiException.invalidResponse);
    },
  );

  test(
    'a fault in the app\'s own request handling is not the connection',
    () async {
      final dio = client(FixedServer());
      dio.interceptors.add(BrokenInterceptor());
      final error = await failure(dio);
      expect(error.code, ApiException.appError);
      expect(error.isOffline, isFalse);
    },
  );

  test('an error with a JSON body keeps its code', () async {
    final error = await failure(
      client(
        FixedServer(
          status: 500,
          body: '{"code": "server_error", "message": "Something went wrong."}',
        ),
      ),
    );
    expect(error.code, 'server_error');
    expect(error.statusCode, 500);
  });

  test(
    'the preview writes what failed to the console, without the query',
    () async {
      final log = <String>[];
      final server = FixedServer()..offline = true;
      await failure(client(server, log: log));
      expect(log, hasLength(1));
      expect(
        log.single,
        startsWith(
          'Yallapp preview: GET https://yallapp.test/api/app/1/config failed '
          '(connectionError, no response): The connection errored: offline',
        ),
      );

      log.clear();
      await failure(
        client(FixedServer(status: 502, body: '<html></html>'), log: log),
      );
      expect(
        log.single,
        startsWith(
          'Yallapp preview: GET https://yallapp.test/api/app/1/config failed '
          '(unknown, no response): FormatException: ',
        ),
      );
    },
  );
}
