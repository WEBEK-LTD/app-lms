import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import 'chat_screen.dart';

final chatReportsProvider = FutureProvider.autoDispose
    .family<List<ChatReport>, bool>(
      (ref, open) => ref
          .watch(apiProvider)
          .chatReports(ref.watch(appIdProvider), open: open),
    );

/// 77 Messages people reported in the chat. The business keeps the message,
/// deletes it, or deletes it and stops its sender; every open report of the
/// same message closes.
class ChatReportsScreen extends ConsumerStatefulWidget {
  const ChatReportsScreen({super.key});

  @override
  ConsumerState<ChatReportsScreen> createState() => _ChatReportsScreenState();
}

class _ChatReportsScreenState extends ConsumerState<ChatReportsScreen> {
  bool _open = true;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final reports = ref.watch(chatReportsProvider(_open));
    return Scaffold(
      appBar: AppBar(title: Text(l10n.chatReports)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<bool>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: true, label: Text(l10n.chatReportsOpen)),
                  ButtonSegment(
                    value: false,
                    label: Text(l10n.chatReportsClosed),
                  ),
                ],
                selected: {_open},
                onSelectionChanged: (s) => setState(() => _open = s.first),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: pullToRefresh(
                context,
                () => ref.refresh(chatReportsProvider(_open).future),
              ),
              child: AsyncBody(
                value: reports,
                onRetry: () => ref.invalidate(chatReportsProvider(_open)),
                builder: (list) => list.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(
                            height: 400,
                            child: EmptyState(
                              icon: AppIcons.flag,
                              title: l10n.chatNoReports,
                              text: l10n.chatNoReportsText,
                            ),
                          ),
                        ],
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                        children: [
                          for (final r in list) _ReportCard(report: r),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportCard extends ConsumerStatefulWidget {
  const _ReportCard({required this.report});

  final ChatReport report;

  @override
  ConsumerState<_ReportCard> createState() => _ReportCardState();
}

class _ReportCardState extends ConsumerState<_ReportCard> {
  bool _busy = false;

  Future<void> _resolve(ChatReportAction action) async {
    final l10n = context.l10n;
    if (action != ChatReportAction.dismiss) {
      final ok = await confirm(
        context,
        title: action == ChatReportAction.blockSender
            ? l10n.chatDeleteAndBlock
            : l10n.chatDeleteMessage,
        text: action == ChatReportAction.blockSender
            ? l10n.chatBlockText(widget.report.message.senderName)
            : l10n.chatDeleteMessageText,
        action: l10n.delete,
        destructive: true,
      );
      if (!ok || !mounted) return;
    }
    setState(() => _busy = true);
    try {
      await ref
          .read(apiProvider)
          .resolveChatReport(ref.read(appIdProvider), widget.report.id, action);
      ref
        ..invalidate(chatReportsProvider)
        ..invalidate(chatInboxProvider);
      if (mounted) showMessage(context, l10n.saved);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final r = widget.report;
    final reason = switch (r.reason) {
      'spam' => l10n.chatReasonSpam,
      'abuse' => l10n.chatReasonAbuse,
      'inappropriate' => l10n.chatReasonInappropriate,
      _ => l10n.chatReasonOther,
    };
    final outcome = switch (r.outcome) {
      'dismissed' => l10n.chatOutcomeDismissed,
      'deleted' => l10n.chatOutcomeDeleted,
      'blocked' => l10n.chatOutcomeBlocked,
      _ => null,
    };
    final fromMember = !r.message.fromBusiness && r.message.memberId != null;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Panel(
        onTap: () =>
            context.push(Paths.chatConversation(r.message.conversationId)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              [r.message.senderName, ?r.conversationTitle].join(' · '),
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: 6),
            Text(chatPreview(l10n, r.message)),
            if (r.note != null) ...[
              const SizedBox(height: 6),
              Text(
                '“${r.note!}”',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              [
                l10n.chatReportBy(r.reporter.name, reason),
                context.ago(r.createdAt),
              ].join(' · '),
              style: theme.textTheme.labelSmall?.copyWith(
                color: context.yb.ink2,
              ),
            ),
            if (outcome != null) ...[
              const SizedBox(height: 8),
              StatusChip(outcome),
            ],
            if (r.open) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  OutlinedButton(
                    onPressed: _busy
                        ? null
                        : () => _resolve(ChatReportAction.dismiss),
                    child: Text(l10n.chatKeepMessage),
                  ),
                  OutlinedButton(
                    onPressed: _busy || r.message.deleted
                        ? null
                        : () => _resolve(ChatReportAction.deleteMessage),
                    child: Text(l10n.chatDeleteMessage),
                  ),
                  if (fromMember)
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: context.yb.danger,
                        foregroundColor: context.yb.onDanger,
                      ),
                      onPressed: _busy
                          ? null
                          : () => _resolve(ChatReportAction.blockSender),
                      child: Text(l10n.chatDeleteAndBlock),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
