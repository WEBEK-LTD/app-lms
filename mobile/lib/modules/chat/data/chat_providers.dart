import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/http_client.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/language.dart';
import '../../../core/providers.dart';
import 'chat_api.dart';

/// 77 `Config.chat`: null when the app has no chat.
final chatConfigProvider = Provider<ChatConfig?>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady ? gate.config.chat : null;
});

/// The chat client for the signed-in person, or null without chat or
/// signed out. A new one for each person, so a site's chat token is never
/// kept past signing out.
final chatApiProvider = Provider<ChatApi?>((ref) {
  final chat = ref.watch(chatConfigProvider);
  final signedIn = ref.watch(
    authControllerProvider.select((s) => s.isSignedIn),
  );
  if (chat == null || !signedIn) return null;
  final env = ref.watch(appEnvironmentProvider);
  String language() => ref.read(appLanguageProvider);
  final Dio dio;
  if (chat.session == ChatSessionKind.site) {
    // A WordPress app: a chat token from the site, then Yallapp with it.
    final api = ref.watch(yallappApiProvider);
    dio = Dio(
      BaseOptions(
        baseUrl: chat.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        responseType: ResponseType.json,
        contentType: Headers.jsonContentType,
        headers: {Headers.acceptHeader: Headers.jsonContentType},
      ),
    );
    dio.interceptors
      ..add(LanguageInterceptor(language))
      ..add(SiteChatAuthInterceptor(dio, SiteChatTokens(api.startChatSession)));
  } else {
    // The hosted API and Yallapp sign-in: the app's own access token.
    dio = createHttpClient(
      baseUrl: chat.baseUrl,
      tokens: ref.watch(tokenManagerProvider),
      language: language,
    );
  }
  // 17 The preview tells Yallapp who it is.
  final previewToken = env.preview?.apiToken;
  if (previewToken != null) {
    dio.options.headers['X-Yallapp-Preview'] = previewToken;
  }
  final client = HttpChatApi(dio: dio);
  ref.onDispose(dio.close);
  return client;
});

/// Unread messages in every conversation, for the Chat tab's badge: asked
/// when the app opens and comes back to the front, and kept up to date by
/// the chat's screens.
final chatUnreadProvider = NotifierProvider<ChatUnread, int>(ChatUnread.new);

class ChatUnread extends Notifier<int> {
  @override
  int build() {
    final api = ref.watch(chatApiProvider);
    if (api == null) return 0;
    final listener = AppLifecycleListener(onResume: refresh);
    ref.onDispose(listener.dispose);
    Future.microtask(refresh);
    return 0;
  }

  Future<void> refresh() async {
    final api = ref.read(chatApiProvider);
    if (api == null) return;
    try {
      final count = await api.unread();
      if (ref.mounted) state = count;
    } on Object {
      // The badge waits for the next try.
    }
  }

  void set(int count) => state = count < 0 ? 0 : count;
}

/// The person's conversations: the business first, then course groups.
final chatConversationsProvider = FutureProvider.autoDispose<ChatConversations>(
  (ref) async {
    final api = ref.watch(chatApiProvider);
    if (api == null) {
      return const ChatConversations(items: [], unreadCount: 0);
    }
    final list = await api.conversations();
    ref.read(chatUnreadProvider.notifier).set(list.unreadCount);
    return list;
  },
);
