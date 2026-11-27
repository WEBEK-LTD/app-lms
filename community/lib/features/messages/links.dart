import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/l10n.dart';
import 'data/messages_api.dart';

/// Messages' routes, for area E too (a pro's "Message", a hire request).
abstract final class MessagesLinks {
  static const inbox = '/messages';
  static const start = '/messages/new';
  static String thread(String id) => '/messages/${Uri.encodeComponent(id)}';
}

/// How often the inbox badge and an open thread ask for news (push brings
/// them sooner). Zero: never (tests).
final messagePollProvider = Provider<({Duration inbox, Duration thread})>(
  (ref) =>
      (inbox: const Duration(seconds: 45), thread: const Duration(seconds: 5)),
);

/// The conversations with unread messages: the header's badge.
final unreadMessagesProvider = FutureProvider.autoDispose<int>((ref) async {
  final every = ref.watch(messagePollProvider).inbox;
  if (every > Duration.zero) {
    final t = Timer(every, ref.invalidateSelf);
    ref.onDispose(t.cancel);
  }
  try {
    return await ref.watch(messagesApiProvider).unread();
  } on ApiException {
    return 0;
  }
});

final conversationsProvider = FutureProvider.autoDispose<List<Conversation>>(
  (ref) async => (await ref.watch(messagesApiProvider).conversations()).items,
);

/// Opens [memberId]'s one-to-one conversation (the existing one, or a new
/// one). [hireRequestId]: area E's hire request it comes from.
Future<void> openConversationWith(
  BuildContext context,
  WidgetRef ref,
  String memberId, {
  String? hireRequestId,
}) async {
  try {
    final c = await ref.read(messagesApiProvider).start([memberId]);
    ref.invalidate(conversationsProvider);
    if (context.mounted) await context.push(MessagesLinks.thread(c.id));
  } on ApiException catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.code == ApiException.notAllowed
                ? context.l10n.msgNotAllowed
                : context.l10n.commonError,
          ),
        ),
      );
    }
  }
}
