import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/real_estate_providers.dart';
import '../widgets/listing_widgets.dart';

/// "12 Oct, 14:05" in the app's language and the device's time zone.
String messageTime(BuildContext context, DateTime time) {
  final locale = Localizations.localeOf(context).languageCode;
  return DateFormat.MMMd(locale).add_Hm().format(time.toLocal());
}

/// The user's conversations with the office, with unread counts.
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabMessages),
            Expanded(
              child: signedIn
                  ? const _Conversations()
                  : SignInPrompt(
                      icon: AppIcons.chat,
                      title: l10n.messagesSignInTitle,
                      message: l10n.messagesSignInMessage,
                      from: Paths.messages,
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
    final state = ref.watch(inquiriesProvider);
    final controller = ref.read(inquiriesProvider.notifier);
    final error = state.error;
    Future<void> refresh() async {
      ref.invalidate(unreadMessagesProvider);
      await controller.refresh();
    }

    final Widget body;
    if (state.isInitialLoading) {
      body = LoadingView(label: l10n.loadingMessages);
    } else if (error != null && state.items.isEmpty) {
      body = ListView(
        children: [
          SizedBox(
            height: 400,
            child: ErrorView(error: error, onRetry: controller.retry),
          ),
        ],
      );
    } else if (state.items.isEmpty) {
      body = ListView(
        children: [
          SizedBox(
            height: 400,
            child: MessageView(
              icon: AppIcons.chat,
              title: l10n.noMessagesTitle,
              message: l10n.noMessagesMessage,
            ),
          ),
        ],
      );
    } else {
      final items = state.items;
      body = NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 400) controller.loadMore();
          return false;
        },
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          physics: const AlwaysScrollableScrollPhysics(),
          itemCount: items.length,
          separatorBuilder: (_, _) => Divider(height: 1, color: p.divider),
          itemBuilder: (context, i) => _ConversationRow(inquiry: items[i]),
        ),
      );
    }
    return RefreshIndicator(onRefresh: refresh, child: body);
  }
}

class _ConversationRow extends StatelessWidget {
  const _ConversationRow({required this.inquiry});

  final Inquiry inquiry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final latest = inquiry.latest;
    final unread = inquiry.unread;
    final preview = latest == null
        ? ''
        : (latest.from == MessageSender.user
              ? l10n.messageFromYou(latest.text)
              : latest.text);
    return Semantics(
      button: true,
      label: [
        inquiry.listing.title,
        if (unread > 0) l10n.unreadMessages(unread),
        preview,
      ].join(', '),
      excludeSemantics: true,
      child: InkWell(
        onTap: () => context.push(Paths.conversation(inquiry.id)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppNetworkImage(
                url: inquiry.listing.imageUrl,
                seed: inquiry.listing.id,
                width: 56,
                height: 56,
                radius: context.shapes.r(12),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            inquiry.listing.title,
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
                        const SizedBox(width: 8),
                        Text(
                          messageTime(context, inquiry.updatedAt),
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
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
                            textColor: Colors.white,
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

/// One conversation with the office. Opening it marks the office's messages
/// as read.
class ConversationScreen extends ConsumerStatefulWidget {
  const ConversationScreen({super.key, required this.inquiryId});

  final int inquiryId;

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  final _text = TextEditingController();
  Inquiry? _latest;
  bool _sending = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _text.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final inquiry = await ref
          .read(yallappApiProvider)
          .replyToInquiry(widget.inquiryId, text);
      if (!mounted) return;
      _text.clear();
      setState(() {
        _latest = inquiry;
        _sending = false;
      });
      ref.invalidate(inquiriesProvider);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      showMessage(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final loaded = ref.watch(inquiryProvider(widget.inquiryId));
    // Opening the conversation marks it read: refresh the list and badge.
    ref.listen(inquiryProvider(widget.inquiryId), (_, next) {
      if (next is AsyncData) {
        ref
          ..invalidate(inquiriesProvider)
          ..invalidate(unreadMessagesProvider);
      }
    });
    final inquiry = _latest ?? loaded.value;
    return Scaffold(
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: p.divider)),
              ),
              child: Row(
                children: [
                  const AppBackButton(),
                  const SizedBox(width: 12),
                  Expanded(
                    child: inquiry == null
                        ? const SizedBox.shrink()
                        : Semantics(
                            header: true,
                            child: InkWell(
                              onTap: () => context.push(
                                Paths.listing(inquiry.listing.id),
                              ),
                              child: Text(
                                inquiry.listing.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: p.text,
                                ),
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: switch ((inquiry, loaded)) {
              (final Inquiry i, _) => _Messages(inquiry: i),
              (_, AsyncError(:final error)) => ErrorView(
                error: error,
                onRetry: () =>
                    ref.invalidate(inquiryProvider(widget.inquiryId)),
              ),
              _ => LoadingView(label: l10n.loadingMessages),
            },
          ),
          if (inquiry != null)
            inquiry.status == InquiryStatus.closed
                ? BottomActionBar(
                    child: Text(
                      l10n.conversationClosed,
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: p.textSecondary),
                    ),
                  )
                : BottomActionBar(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _text,
                            minLines: 1,
                            maxLines: 4,
                            maxLength: 2000,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: InputDecoration(
                              hintText: l10n.writeMessage,
                              counterText: '',
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SquareIconButton(
                          icon: ListingIcons.send,
                          label: l10n.send,
                          size: 50,
                          radius: context.shapes.button,
                          background: p.primary,
                          foreground: p.onPrimary,
                          bordered: false,
                          onPressed: _sending ? null : _send,
                        ),
                      ],
                    ),
                  ),
        ],
      ),
    );
  }
}

class _Messages extends StatelessWidget {
  const _Messages({required this.inquiry});

  final Inquiry inquiry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final messages = inquiry.messages.reversed.toList();
    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      itemCount: messages.length,
      itemBuilder: (context, i) {
        final m = messages[i];
        final mine = m.from == MessageSender.user;
        return Align(
          alignment: mine
              ? AlignmentDirectional.centerEnd
              : AlignmentDirectional.centerStart,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * 0.78,
            ),
            child: Semantics(
              label: mine
                  ? l10n.messageFromYou(m.text)
                  : l10n.messageFromOffice(m.text),
              excludeSemantics: true,
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 4),
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
                decoration: BoxDecoration(
                  color: mine ? p.primary : p.surface,
                  border: mine ? null : Border.all(color: p.border),
                  borderRadius: BorderRadiusDirectional.only(
                    topStart: const Radius.circular(16),
                    topEnd: const Radius.circular(16),
                    bottomStart: Radius.circular(mine ? 16 : 4),
                    bottomEnd: Radius.circular(mine ? 4 : 16),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m.text,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.4,
                        color: mine ? p.onPrimary : p.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      messageTime(context, m.createdAt),
                      style: TextStyle(
                        fontSize: 11,
                        color: mine
                            ? p.onPrimary.withValues(alpha: 0.75)
                            : p.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
