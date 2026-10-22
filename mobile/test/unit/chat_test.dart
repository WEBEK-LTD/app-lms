import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_module.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/analytics.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/chat/chat_routes.dart';
import 'package:yallapp/modules/chat/data/chat_api.dart';
import 'package:yallapp/modules/chat/data/chat_media.dart';

import '../support/fake_chat_api.dart';
import '../support/fixtures.dart';

/// Answers like the hosted API's Chat routes and the media gate, and
/// records what the app sent.
class ChatServer implements HttpClientAdapter {
  final seen = <RequestOptions>[];
  final bodies = <Object?>[];
  String validToken = 'chat-token-0';
  int gateOffset = 0;

  /// Status codes the next gate chunks answer with, before succeeding.
  final gateRefusals = <int>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    seen.add(options);
    bodies.add(options.data);
    ResponseBody json(int status, Object? body, [Map<String, String>? h]) =>
        ResponseBody.fromString(
          body == null ? '' : jsonEncode(body),
          status,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
            for (final e in (h ?? const <String, String>{}).entries)
              e.key: [e.value],
          },
        );
    final uri = options.uri;
    if (uri.host == 'files.example') {
      if (options.method == 'GET') {
        return json(200, {'offset': gateOffset, 'length': 10});
      }
      if (gateRefusals.isNotEmpty) return json(gateRefusals.removeAt(0), {});
      var length = 0;
      if (requestStream != null) {
        await for (final part in requestStream) {
          length += part.length;
        }
      }
      gateOffset =
          int.parse(options.headers['Upload-Offset'] as String) + length;
      return json(
        200,
        {'offset': gateOffset},
        {'Upload-Offset': '$gateOffset'},
      );
    }
    if (options.headers['Authorization'] != 'Bearer $validToken') {
      return json(401, {'code': 'invalid_token', 'message': 'Sign in again.'});
    }
    final path = uri.path.replaceFirst('/api/app/app-1', '');
    return switch (path) {
      '/chat/unread' => json(200, {'unread_count': 3}),
      '/chat/conversations' => json(200, {
        'items': [
          {
            'id': businessConversation,
            'kind': 'direct',
            'title': 'Your Academy',
            'image_url': null,
            'last_message': chatMessageJson(id: 9, text: 'Hello'),
            'unread_count': 2,
            'can_send': true,
            'updated_at': '2026-10-20T09:00:00Z',
          },
        ],
        'unread_count': 2,
      }),
      '/chat/conversations/$businessConversation/messages' =>
        options.method == 'POST'
            ? json(
                201,
                chatMessageJson(
                  id: 10,
                  text: (options.data as Map)['text'] as String?,
                  sender: 'member',
                  memberId: meMember,
                  mine: true,
                  clientId: (options.data as Map)['client_id'] as String,
                ),
              )
            : json(200, {
                'items': [chatMessageJson(id: 9, text: 'Hello')],
                'has_more': false,
                'poll_after_seconds': 99,
              }),
      '/chat/uploads' => json(201, {
        'id': '5e1f0000-0000-4000-8000-000000000001',
        'kind': 'file',
        'upload_url': 'https://files.example/media/u?sig=1',
        'chunk_bytes': 4,
        'size': 10,
      }),
      _ => json(204, null),
    };
  }

  @override
  void close({bool force = false}) {}
}

Dio _dio(ChatServer server) {
  final dio = Dio(BaseOptions(baseUrl: 'https://yallapp.example/api/app/app-1'))
    ..httpClientAdapter = server;
  return dio;
}

void main() {
  group('Config.chat', () {
    test('reads the chat settings, and none without them', () {
      final config = AppConfig.fromJson({
        ...configJson(),
        'chat': chatConfigJson(session: 'site', groups: true),
      });
      expect(config.chat!.baseUrl, 'https://yallapp.example/api/app/app-1');
      expect(config.chat!.session, ChatSessionKind.site);
      expect(config.chat!.groups, isTrue);
      expect(AppConfig.fromJson(configJson()).chat, isNull);
      expect(
        AppConfig.fromJson({...configJson(), 'chat': chatConfigJson()})
            .chat!
            .session,
        ChatSessionKind.accessToken,
      );
    });

    test('a chat without a usable address is no chat', () {
      expect(
        AppConfig.fromJson({
          ...configJson(),
          'chat': {'base_url': 'not a url', 'session': 'site', 'groups': false},
        }).chat,
        isNull,
      );
      expect(
        AppConfig.fromJson({
          ...configJson(),
          'chat': {'session': 'site'},
        }).chat,
        isNull,
      );
    });
  });

  test('message IDs order as numbers', () {
    expect(ChatMessage.compareIds('9', '10'), lessThan(0));
    expect(ChatMessage.compareIds('100', '99'), greaterThan(0));
    expect(ChatMessage.compareIds('42', '42'), 0);
  });

  test('messages, attachments and conversations parse', () {
    final m = ChatMessage.fromJson(
      chatMessageJson(
        id: 7,
        text: null,
        attachment: {
          'kind': 'audio',
          'name': 'voice.m4a',
          'content_type': 'audio/mp4',
          'size_bytes': 1200,
          'duration_seconds': 3,
          'url': 'https://files.example/m/1/m4a',
          'url_expires_at': '2026-10-21T00:00:00Z',
        },
      ),
    );
    expect(m.attachment!.kind, ChatAttachmentKind.audio);
    expect(m.attachment!.durationSeconds, 3);
    expect(m.sender.isBusiness, isTrue);
    final deleted = ChatMessage.fromJson(
      chatMessageJson(id: 8, text: 'gone', deleted: true),
    );
    expect(deleted.deleted, isTrue);
    expect(deleted.text, isNull);
  });

  group('HttpChatApi', () {
    test(
      'calls the Chat routes with the contract\'s paths and bodies',
      () async {
        final server = ChatServer();
        final dio = _dio(server)
          ..options.headers['Authorization'] = 'Bearer chat-token-0';
        final api = HttpChatApi(
          dio: dio,
          gate: Dio()..httpClientAdapter = server,
        );
        expect(await api.unread(), 3);
        final list = await api.conversations();
        expect(list.items.single.lastMessage!.text, 'Hello');
        final page = await api.messages(businessConversation, after: '8');
        expect(page.pollAfterSeconds, 15, reason: 'kept within 3 to 15');
        expect(server.seen.last.uri.queryParameters['after'], '8');
        final sent = await api.send(
          businessConversation,
          clientId: 'client-12345678',
          text: 'Hi',
        );
        expect(sent.mine, isTrue);
        expect(server.bodies.last, {
          'client_id': 'client-12345678',
          'text': 'Hi',
        });
        await api.read(businessConversation, '10');
        expect(server.seen.last.uri.path, endsWith('/read'));
        expect(server.bodies.last, {'message_id': '10'});
        await api.report('10', ChatReportReason.abuse);
        expect(server.bodies.last, {'reason': 'abuse'});
        await api.block(otherMember, blocked: true);
        expect(server.seen.last.method, 'PUT');
        await api.block(otherMember, blocked: false);
        expect(server.seen.last.method, 'DELETE');
        await api.deleteMessage('10');
        expect(server.seen.last.method, 'DELETE');
        expect(server.seen.last.uri.path, endsWith('/chat/messages/10'));
      },
    );

    test('a WordPress app gets a token from its site, keeps it and asks '
        'again once after a 401', () async {
      final server = ChatServer();
      var starts = 0;
      final tokens = SiteChatTokens(() async {
        final token = 'chat-token-${starts++}';
        return ChatSession(
          token: token,
          expiresAt: DateTime.now().add(const Duration(hours: 1)),
          baseUrl: 'https://yallapp.example/api/app/app-1',
        );
      });
      final dio = _dio(server);
      dio.interceptors.add(SiteChatAuthInterceptor(dio, tokens));
      final api = HttpChatApi(dio: dio);
      expect(await api.unread(), 3);
      expect(await api.unread(), 3);
      expect(starts, 1, reason: 'the token is kept until it ends');
      // Yallapp stopped taking it (signed out elsewhere): one new token.
      server.validToken = 'chat-token-1';
      expect(await api.unread(), 3);
      expect(starts, 2);
      // A token that never works: the 401 comes through after one retry.
      server.validToken = 'nothing';
      await expectLater(
        api.unread(),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)),
      );
      expect(starts, 3);
    });

    test('a site token is asked again a minute before it ends', () async {
      var starts = 0;
      var now = DateTime.utc(2026, 10, 22, 12);
      final tokens = SiteChatTokens(
        () async => ChatSession(
          token: 't${starts++}',
          expiresAt: DateTime.utc(2026, 10, 22, 13),
          baseUrl: 'https://yallapp.example',
        ),
        now: () => now,
      );
      expect(await tokens.token(), 't0');
      now = DateTime.utc(2026, 10, 22, 12, 58, 30);
      expect(await tokens.token(), 't0');
      now = DateTime.utc(2026, 10, 22, 12, 59, 30);
      expect(await tokens.token(), 't1');
      // Two requests at once ask the site once.
      now = DateTime.utc(2026, 10, 22, 14);
      final both = await Future.wait([tokens.token(), tokens.token()]);
      expect(both, ['t2', 't2']);
      expect(starts, 3);
    });

    test(
      'files go to the media gate in chunks as POST with the offset',
      () async {
        final server = ChatServer();
        final dio = _dio(server)
          ..options.headers['Authorization'] = 'Bearer chat-token-0';
        final api = HttpChatApi(
          dio: dio,
          gate: Dio()..httpClientAdapter = server,
        );
        final progress = <double>[];
        final id = await uploadChatFile(
          api,
          MemoryChatFile('notes.pdf', 'application/pdf', List.filled(10, 7)),
          onProgress: progress.add,
        );
        expect(id, '5e1f0000-0000-4000-8000-000000000001');
        final chunks = server.seen.where((o) => o.uri.host == 'files.example');
        expect(chunks.map((o) => o.method).toSet(), {'POST'});
        expect(chunks.map((o) => o.uri.queryParameters['offset']), [
          '0',
          '4',
          '8',
        ]);
        expect(
          chunks.first.headers[Headers.contentTypeHeader],
          'application/octet-stream',
        );
        expect(progress.last, 1.0);
        expect(server.seen.last.uri.path, endsWith('/complete'));
        expect(server.bodies.first, {
          'name': 'notes.pdf',
          'size': 10,
          'type': 'application/pdf',
        });
      },
    );
  });

  group('uploadChatFile', () {
    test('a refused link is renewed and the upload carries on', () async {
      final api = _GateApi(failures: [ChatErrors.linkExpired]);
      final id = await uploadChatFile(
        api,
        MemoryChatFile('a.txt', 'text/plain', List.filled(9, 1)),
      );
      expect(id, 'u1');
      expect(api.gateCalls, contains('resume'));
      expect(api.offset, 9);
    });

    test('a missing part is sent again before finishing', () async {
      final api = _GateApi(incompleteOnce: true);
      await uploadChatFile(
        api,
        MemoryChatFile('a.txt', 'text/plain', List.filled(9, 1)),
      );
      expect(api.gateCalls.where((c) => c == 'complete'), hasLength(2));
    });

    test('a refusal that isn\'t the link stops the upload', () async {
      final api = _GateApi(
        failures: ['server_error', 'server_error', 'server_error'],
      );
      await expectLater(
        uploadChatFile(
          api,
          MemoryChatFile('a.txt', 'text/plain', List.filled(9, 1)),
        ),
        throwsA(isA<ApiException>()),
      );
    });
  });

  test('the chat takes pictures, videos, voice messages and documents', () {
    expect(chatTypeOf('photo.JPG'), 'image/jpeg');
    expect(chatTypeOf('clip.mov'), 'video/quicktime');
    expect(chatTypeOf('voice.m4a'), 'audio/mp4');
    expect(chatTypeOf('sheet.xlsx'), contains('spreadsheetml'));
    expect(chatTypeOf('x', 'application/pdf'), 'application/pdf');
    expect(chatTypeOf('setup.exe'), isNull);
    expect(chatTypeOf('picture.heic', 'image/heic'), isNull);
    expect(chatMaxBytes('image/png'), 20 * 1024 * 1024);
    expect(chatMaxBytes('video/mp4'), 200 * 1024 * 1024);
    expect(chatMaxBytes('audio/mp4'), 20 * 1024 * 1024);
    expect(chatMaxBytes('application/pdf'), 50 * 1024 * 1024);
  });

  test('a chat push opens the conversation', () {
    expect(
      pushTargetLocation({
        'type': 'chat',
        'conversation_id': businessConversation,
      }),
      Paths.chatConversation(businessConversation),
    );
    expect(pushTargetLocation({'type': 'chat'}), Paths.chat);
  });

  test('a conversation needs an account; the Chat tab asks to sign in', () {
    expect(Paths.requiresAuth(Paths.chatConversation('abc')), isTrue);
    expect(Paths.requiresAuth(Paths.chat), isFalse);
    expect(
      screenKindOf(Paths.chatConversation(groupConversation)),
      'chat_conversation',
    );
    expect(screenKindOf(Paths.chat), 'chat');
  });

  group('withChatTab', () {
    ShellTab tab(String location) => ShellTab(
      icon: const IconData(0),
      label: (_) => location,
      location: location,
    );
    final chat = AppConfig.fromJson({
      ...configJson(),
      'chat': chatConfigJson(),
    });
    final none = AppConfig.fromJson(configJson());

    test('goes before Account when there is room', () {
      final tabs = withChatTab([
        tab(Paths.home),
        tab(Paths.courses),
        tab(Paths.account),
      ], chat);
      expect(tabs.map((t) => t.location), [
        Paths.home,
        Paths.courses,
        Paths.chat,
        Paths.account,
      ]);
    });

    test('goes last without Account, and not at all when full or off', () {
      expect(
        withChatTab([tab(Paths.home), tab('/page/a')], chat).last.location,
        Paths.chat,
      );
      final five = [
        for (final p in ['/a', '/b', '/c', '/d', '/e']) tab(p),
      ];
      expect(withChatTab(five, chat), hasLength(5));
      expect(withChatTab([tab(Paths.home)], none), hasLength(1));
      expect(
        withChatTab([tab(Paths.home), tab(Paths.chat)], chat),
        hasLength(2),
      );
    });
  });
}

/// A chat API whose gate fails as told.
class _GateApi extends FakeChatApi {
  _GateApi({List<String> failures = const [], this.incompleteOnce = false})
    : _failures = [...failures];

  final List<String> _failures;
  bool incompleteOnce;
  int offset = 0;
  final gateCalls = <String>[];

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) async => ChatUpload(
    id: 'u1',
    kind: ChatAttachmentKind.file,
    uploadUrl: 'https://files.example/u?s=1',
    chunkBytes: 4,
    size: size,
  );

  @override
  Future<ChatUpload> resumeUpload(String uploadId) async {
    gateCalls.add('resume');
    return ChatUpload(
      id: uploadId,
      kind: ChatAttachmentKind.file,
      uploadUrl: 'https://files.example/u?s=2',
      chunkBytes: 4,
      size: 9,
    );
  }

  @override
  Future<int> uploadOffset(String uploadUrl) async => offset;

  @override
  Future<int> sendChunk(String uploadUrl, int at, List<int> bytes) async {
    if (_failures.isNotEmpty) {
      final code = _failures.removeAt(0);
      throw ApiException(code: code, message: code);
    }
    // The first chunk "arrives" without its last byte when asked.
    offset = at + bytes.length;
    return offset;
  }

  @override
  Future<void> completeUpload(String uploadId) async {
    gateCalls.add('complete');
    if (incompleteOnce) {
      incompleteOnce = false;
      offset = 5;
      throw const ApiException(code: ChatErrors.incomplete, message: 'part');
    }
  }
}
