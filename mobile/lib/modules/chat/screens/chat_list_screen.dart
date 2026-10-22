import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart'
    show SignInPrompt, TabHeader;
import '../data/chat_providers.dart';
import '../widgets/chat_widgets.dart';

/// 77 The Chat tab: the conversation with the business first, then the
/// groups of the courses the person is enrolled in (academies with course
/// groups). People never write to each other in private.
class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final chat = ref.watch(chatConfigProvider);
    final business = ref.watch(appConfigProvider).site.name;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.chatTitle),
            Expanded(
              child: chat == null
                  ? MessageView(
                      icon: AppIcons.chat,
                      title: l10n.chatUnavailable,
                    )
                  : signedIn
                  ? const _Conversations()
                  : SignInPrompt(
                      icon: AppIcons.chat,
                      title: l10n.chatSignInTitle(business),
                      message: l10n.chatSignInMessage,
                      from: Paths.chat,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Conversations extends ConsumerWidget {
  const _Conversations();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final state = ref.watch(chatConversationsProvider);
    // A push or coming back to the app changed the count: show what's new.
    ref.listen(chatUnreadProvider, (_, now) {
      final shown = ref.read(chatConversationsProvider).value?.unreadCount;
      if (shown != null && shown != now) {
        ref.invalidate(chatConversationsProvider);
      }
    });
    Future<void> refresh() => ref.refresh(chatConversationsProvider.future);
    final Widget body = switch (state) {
      AsyncValue(:final value?) when value.items.isNotEmpty =>
        ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          physics: const AlwaysScrollableScrollPhysics(),
          itemCount: value.items.length,
          separatorBuilder: (_, _) => Divider(height: 1, color: p.divider),
          itemBuilder: (context, i) =>
              _ConversationRow(conversation: value.items[i]),
        ),
      AsyncValue(:final value?) when value.items.isEmpty => ListView(
        children: [
          SizedBox(
            height: 400,
            child: MessageView(
              icon: AppIcons.chat,
              title: l10n.chatEmptyTitle,
              message: l10n.chatEmptyMessage,
            ),
          ),
        ],
      ),
      AsyncError(:final error) => ListView(
        children: [
          SizedBox(
            height: 400,
            child: ErrorView(
              error: error,
              onRetry: () => ref.invalidate(chatConversationsProvider),
            ),
          ),
        ],
      ),
      _ => SkeletonList(layout: SkeletonLayout.text, label: l10n.chatLoading),
    };
    return RefreshIndicator(onRefresh: refresh, child: body);
  }
}

class _ConversationRow extends ConsumerWidget {
  const _ConversationRow({required this.conversation});

  final ChatConversation conversation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final c = conversation;
    final unread = c.unreadCount;
    final preview = chatPreview(l10n, c);
    final when = c.lastMessage?.createdAt;
    return Semantics(
      button: true,
      label: [
        c.title,
        if (c.isGroup) l10n.chatCourseGroup,
        if (unread > 0) l10n.unreadMessages(unread),
        preview,
      ].join(', '),
      excludeSemantics: true,
      child: InkWell(
        onTap: () async {
          await context.push(Paths.chatConversation(c.id));
          // Read now: the list and the badge say so.
          ref.invalidate(chatConversationsProvider);
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            children: [
              ChatAvatar(conversation: c),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            c.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: unread > 0
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                              color: p.text,
                            ),
                          ),
                        ),
                        if (when != null) ...[
                          const SizedBox(width: 8),
                          Text(
                            chatTime(context, when),
                            style: TextStyle(
                              fontSize: 12,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (c.isGroup)
                      Text(
                        l10n.chatCourseGroup,
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            preview,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.4,
                              color: unread > 0 ? p.text : p.textSecondary,
                            ),
                          ),
                        ),
                        if (unread > 0) ...[
                          const SizedBox(width: 8),
                          Badge(
                            label: Text(unread > 99 ? '99+' : '$unread'),
                            backgroundColor: p.accent,
                            textColor: p.onAccent,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
