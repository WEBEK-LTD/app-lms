import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/http_client.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/models/json.dart';
import '../../../core/l10n/l10n.dart';

/// The steps of a file sent in chunks through the media gate: chat files,
/// and 105.3 a teacher's lesson videos and PDFs.
abstract class ChunkedUploads {
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  });
  Future<ChatUpload> resumeUpload(String uploadId);
  Future<void> completeUpload(String uploadId);

  /// The media gate: how much of an upload has arrived.
  Future<int> uploadOffset(String uploadUrl);

  /// The media gate: sends [bytes] at [offset]; the offset reached.
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes);
}

/// 77 The app's chat on Yallapp's hosted API (`Config.chat.base_url`, the
/// Chat tag of docs/api/openapi.yaml), whatever runs the rest of the app.
abstract class ChatApi implements ChunkedUploads {
  Future<ChatConversations> conversations();

  /// The unread count for the tab's badge (cheap).
  Future<int> unread();

  /// Oldest first with [after], newest first with [before] (or neither).
  Future<ChatMessagesPage> messages(
    String conversationId, {
    String? after,
    String? before,
    int limit = 50,
  });

  /// [clientId] makes it safe to send again after a network error.
  Future<ChatMessage> send(
    String conversationId, {
    required String clientId,
    String? text,
    String? uploadId,
  });

  Future<void> read(String conversationId, String messageId);
  Future<List<ChatMember>> members(String conversationId);
  Future<void> deleteMessage(String messageId);
  Future<void> report(String messageId, ChatReportReason reason);
  Future<void> block(String memberId, {required bool blocked});
}

/// Error codes of the Chat endpoints.
abstract final class ChatErrors {
  static const notAvailable = 'chat_not_available';
  static const blocked = 'chat_blocked';
  static const storageFull = 'storage_full';
  static const tooBig = 'too_big';
  static const incomplete = 'incomplete';

  /// The media gate refused a chunk (403 or 410: ask for a fresh link).
  static const linkExpired = 'upload_link_expired';
}

/// A chat token from the WordPress site (`POST /chat/session`): kept until a
/// minute before it ends, asked again after a 401. One request at a time.
class SiteChatTokens {
  SiteChatTokens(this._start, {DateTime Function()? now})
    : _now = now ?? DateTime.now;

  final Future<ChatSession> Function() _start;
  final DateTime Function() _now;
  ChatSession? _session;
  Future<ChatSession>? _pending;

  Future<String> token() async {
    final session = _session;
    if (session != null &&
        _now().isBefore(
          session.expiresAt.subtract(const Duration(minutes: 1)),
        )) {
      return session.token;
    }
    return (await _fetch()).token;
  }

  /// After a 401 with [failed]: a new token, unless another request already
  /// got one.
  Future<String> renew(String failed) async {
    final session = _session;
    if (session != null && session.token != failed) return session.token;
    _session = null;
    return (await _fetch()).token;
  }

  Future<ChatSession> _fetch() {
    final pending = _pending ??= _start().then((session) {
      _session = session;
      return session;
    });
    return pending.whenComplete(() => _pending = null);
  }
}

const _retriedKey = 'yallapp.chat.retried';

/// Sends the site's chat token and asks for a new one once on a 401.
class SiteChatAuthInterceptor extends Interceptor {
  SiteChatAuthInterceptor(this._dio, this._tokens);

  final Dio _dio;
  final SiteChatTokens _tokens;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    try {
      options.headers['Authorization'] = 'Bearer ${await _tokens.token()}';
      handler.next(options);
    } on ApiException catch (e) {
      handler.reject(DioException(requestOptions: options, error: e));
    } on DioException catch (e) {
      handler.reject(e);
    }
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final request = err.requestOptions;
    final header = request.headers['Authorization'];
    if (err.response?.statusCode != 401 ||
        header is! String ||
        request.extra[_retriedKey] == true) {
      return handler.next(err);
    }
    try {
      final token = await _tokens.renew(header.replaceFirst('Bearer ', ''));
      final retry = request.copyWith(
        headers: {...request.headers, 'Authorization': 'Bearer $token'},
        extra: {...request.extra, _retriedKey: true},
      );
      handler.resolve(await _dio.fetch<dynamic>(retry));
    } on DioException catch (e) {
      handler.next(e);
    } on ApiException catch (e) {
      handler.next(DioException(requestOptions: request, error: e));
    }
  }
}

class HttpChatApi implements ChatApi {
  HttpChatApi({required this._dio, Dio? gate})
    : _gate =
          gate ??
          Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 20),
              sendTimeout: const Duration(minutes: 5),
              receiveTimeout: const Duration(minutes: 2),
            ),
          );

  final Dio _dio;
  final Dio _gate;

  static final _required = authOptions(AuthMode.required);

  Future<T> _call<T>(
    Future<Response<dynamic>> Function() send,
    T Function(dynamic data) parse,
  ) async {
    final Response<dynamic> response;
    try {
      response = await send();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
    try {
      return parse(response.data);
    } on FormatException catch (e) {
      throw ApiException(
        code: ApiException.invalidResponse,
        message: e.message,
        statusCode: response.statusCode,
      );
    }
  }

  Future<T> _get<T>(
    String path,
    T Function(Json json) parse, {
    Map<String, dynamic>? query,
  }) => _call(
    () => _dio.get<dynamic>(path, queryParameters: query, options: _required),
    (data) => parse(asJson(data)),
  );

  Future<T> _send<T>(
    String method,
    String path,
    T Function(dynamic data) parse, {
    Object? body,
  }) => _call(
    () => _dio.request<dynamic>(
      path,
      data: body,
      options: _required.copyWith(method: method),
    ),
    parse,
  );

  static void _ignore(dynamic _) {}
  static String _id(String id) => Uri.encodeComponent(id);

  @override
  Future<ChatConversations> conversations() =>
      _get('/chat/conversations', ChatConversations.fromJson);

  @override
  Future<int> unread() =>
      _get('/chat/unread', (json) => intOr(json, 'unread_count', 0));

  @override
  Future<ChatMessagesPage> messages(
    String conversationId, {
    String? after,
    String? before,
    int limit = 50,
  }) => _get(
    '/chat/conversations/${_id(conversationId)}/messages',
    ChatMessagesPage.fromJson,
    query: {'after': ?after, 'before': ?before, 'limit': limit},
  );

  @override
  Future<ChatMessage> send(
    String conversationId, {
    required String clientId,
    String? text,
    String? uploadId,
  }) => _send(
    'POST',
    '/chat/conversations/${_id(conversationId)}/messages',
    (data) => ChatMessage.fromJson(asJson(data)),
    body: {
      'client_id': clientId,
      if (text != null && text.isNotEmpty) 'text': text,
      'upload_id': ?uploadId,
    },
  );

  @override
  Future<void> read(String conversationId, String messageId) => _send(
    'POST',
    '/chat/conversations/${_id(conversationId)}/read',
    _ignore,
    body: {'message_id': messageId},
  );

  @override
  Future<List<ChatMember>> members(String conversationId) => _get(
    '/chat/conversations/${_id(conversationId)}/members',
    (json) => listOf(json, 'items', ChatMember.fromJson),
  );

  @override
  Future<void> deleteMessage(String messageId) =>
      _send('DELETE', '/chat/messages/${_id(messageId)}', _ignore);

  @override
  Future<void> report(String messageId, ChatReportReason reason) => _send(
    'POST',
    '/chat/messages/${_id(messageId)}/report',
    _ignore,
    body: {'reason': reason.name},
  );

  @override
  Future<void> block(String memberId, {required bool blocked}) => _send(
    blocked ? 'PUT' : 'DELETE',
    '/chat/members/${_id(memberId)}/block',
    _ignore,
  );

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => _send(
    'POST',
    '/chat/uploads',
    (data) => ChatUpload.fromJson(asJson(data)),
    body: {
      'name': name,
      'size': size,
      'type': type,
      'duration_seconds': ?durationSeconds,
    },
  );

  @override
  Future<ChatUpload> resumeUpload(String uploadId) => _send(
    'POST',
    '/chat/uploads/${_id(uploadId)}/resume',
    (data) => ChatUpload.fromJson(asJson(data)),
  );

  @override
  Future<void> completeUpload(String uploadId) =>
      _send('POST', '/chat/uploads/${_id(uploadId)}/complete', _ignore);

  late final MediaGate _gateClient = MediaGate(_gate);

  /// The link with the chunk's offset.
  static String chunkUrl(String uploadUrl, int offset) =>
      MediaGate.chunkUrl(uploadUrl, offset);

  @override
  Future<int> uploadOffset(String uploadUrl) =>
      _gateClient.uploadOffset(uploadUrl);

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) =>
      _gateClient.sendChunk(uploadUrl, offset, bytes);
}

/// The media gate's side of an upload: how much arrived, and sending a
/// chunk (for the chat and 105.3 a teacher's lesson files alike).
class MediaGate {
  MediaGate(this._gate);

  /// A client for the gate with long send and receive times.
  factory MediaGate.standalone() => MediaGate(
    Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 20),
        sendTimeout: const Duration(minutes: 5),
        receiveTimeout: const Duration(minutes: 2),
      ),
    ),
  );

  final Dio _gate;

  /// The gate's offset: the `Upload-Offset` header, else `{"offset": n}`.
  static int? _offsetOf(Response<dynamic>? response) {
    final header = int.tryParse(
      response?.headers.value('upload-offset')?.trim() ?? '',
    );
    if (header != null) return header;
    var data = response?.data;
    if (data is String && data.trim().startsWith('{')) {
      try {
        data = jsonDecode(data);
      } on FormatException {
        return null;
      }
    }
    final value = data is Map ? data['offset'] : null;
    return value is int && value >= 0 ? value : null;
  }

  static ApiException _gateError(DioException e) {
    final status = e.response?.statusCode;
    if (status == 403 || status == 410) {
      return ApiException(
        code: ChatErrors.linkExpired,
        message: currentL10n.chatUploadExpired,
        statusCode: status,
      );
    }
    return ApiException.fromDio(e);
  }

  /// The link with the chunk's offset (not signed: the gate reads it when a
  /// proxy dropped the header).
  static String chunkUrl(String uploadUrl, int offset) {
    final uri = Uri.parse(uploadUrl);
    return uri
        .replace(queryParameters: {...uri.queryParameters, 'offset': '$offset'})
        .toString();
  }

  Future<int> uploadOffset(String uploadUrl) async {
    try {
      return _offsetOf(await _gate.get<dynamic>(uploadUrl)) ?? 0;
    } on DioException catch (e) {
      throw _gateError(e);
    }
  }

  /// 64b Each chunk as a `POST` with `application/octet-stream` and the
  /// offset in `Upload-Offset` and the query, as Yallapp Business sends it:
  /// server firewalls refuse `PUT`, and proxies may drop unknown headers.
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) async {
    final Response<dynamic> response;
    try {
      response = await _gate.post<dynamic>(
        chunkUrl(uploadUrl, offset),
        data: Stream.value(bytes),
        options: Options(
          headers: {
            'Upload-Offset': '$offset',
            Headers.contentTypeHeader: 'application/octet-stream',
            Headers.contentLengthHeader: bytes.length,
          },
        ),
      );
    } on DioException catch (e) {
      // 409: an earlier chunk did arrive; carry on from the gate's offset.
      final at = _offsetOf(e.response);
      if (e.response?.statusCode == 409 && at != null) return at;
      throw _gateError(e);
    }
    final at = _offsetOf(response);
    if (at == null) {
      throw ApiException(
        code: ApiException.invalidResponse,
        message: currentL10n.chatUploadRefused,
        statusCode: response.statusCode,
      );
    }
    return at;
  }
}

/// Something to send in the chat: read in chunks, so a long video never
/// sits in memory.
abstract class ChatFile {
  String get name;
  int get size;
  String get type;

  /// A voice message's length.
  int? get durationSeconds => null;
  Future<List<int>> read(int start, int end);
}

/// Sends [file] to the media gate and finishes the upload: the upload's ID
/// for the message. A refused link is renewed (`resume`) and a missing part
/// is sent again, a few times before giving up.
Future<String> uploadChatFile(
  ChunkedUploads api,
  ChatFile file, {
  void Function(double progress)? onProgress,
  bool Function()? cancelled,
}) async {
  var upload = await api.startUpload(
    name: file.name,
    size: file.size,
    type: file.type,
    durationSeconds: file.durationSeconds,
  );
  var offset = 0;
  var failures = 0;
  final chunk = upload.chunkBytes > 0 ? upload.chunkBytes : 5 * 1024 * 1024;
  while (true) {
    while (offset < file.size) {
      if (cancelled?.call() ?? false) {
        throw ApiException(
          code: ApiException.cancelled,
          message: currentL10n.errorCancelled,
        );
      }
      final end = offset + chunk > file.size ? file.size : offset + chunk;
      try {
        final bytes = await file.read(offset, end);
        final reached = await api.sendChunk(upload.uploadUrl, offset, bytes);
        offset = reached.clamp(0, file.size);
        failures = 0;
      } on ApiException catch (e) {
        if (++failures > 3) rethrow;
        if (e.code == ChatErrors.linkExpired) {
          upload = await api.resumeUpload(upload.id);
          offset = await api.uploadOffset(upload.uploadUrl);
        } else if (e.isOffline) {
          await Future<void>.delayed(Duration(seconds: failures * 2));
          offset = await api.uploadOffset(upload.uploadUrl);
        } else {
          rethrow;
        }
      }
      onProgress?.call(file.size == 0 ? 1 : offset / file.size);
    }
    try {
      await api.completeUpload(upload.id);
      return upload.id;
    } on ApiException catch (e) {
      // Part of the file is missing: send it again from the gate's offset.
      if (e.code != ChatErrors.incomplete || ++failures > 3) rethrow;
      offset = await api.uploadOffset(upload.uploadUrl);
    }
  }
}
