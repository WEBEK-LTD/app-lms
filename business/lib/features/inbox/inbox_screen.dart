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
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';

/// 59 Inbox: the conversations about the app's listings, newest message
/// first. (Course questions and reviews have no place in Yallapp's own
/// content yet, so the API doesn't list them.)
class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  String _status = 'open';
  int _version = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final appId = ref.watch(appIdProvider);
    final api = ref.watch(apiProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.inbox)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<String>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: 'open', label: Text(l10n.inboxOpen)),
                  ButtonSegment(value: 'closed', label: Text(l10n.inboxClosed)),
                ],
                selected: {_status},
                onSelectionChanged: (s) => setState(() => _status = s.first),
              ),
            ),
          ),
          Expanded(
            child: PagedList<Inquiry>(
              key: ValueKey('$appId-$_status-$_version'),
              load: (page) async => (await api.inquiries(
                appId,
                status: _status,
                page: page,
              )).page,
              empty: EmptyState(
                icon: AppIcons.inbox,
                title: l10n.noMessages,
                text: l10n.noMessagesText,
              ),
              itemBuilder: (context, i) => _InquiryTile(
                inquiry: i,
                onReturn: () => setState(() => _version++),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InquiryTile extends StatelessWidget {
  const _InquiryTile({required this.inquiry, required this.onReturn});

  final Inquiry inquiry;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final unread = inquiry.unread > 0;
    return Panel(
      onTap: () async {
        await context.push(Paths.inquiry(inquiry.id));
        onReturn();
      },
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: context.yb.muted,
            foregroundColor: context.yb.ink,
            child: Text(
              inquiry.person.isEmpty ? '?' : inquiry.person.characters.first,
            ),
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
                        inquiry.person,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: unread ? FontWeight.w800 : null,
                        ),
                      ),
                    ),
                    Text(
                      context.ago(inquiry.updatedAt),
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
                Text(inquiry.listingTitle, style: theme.textTheme.bodySmall),
                if (inquiry.lastMessage != null)
                  Text(
                    inquiry.lastMessage!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium,
                  ),
              ],
            ),
          ),
          if (unread) ...[
            const SizedBox(width: 8),
            Badge(
              backgroundColor: Brand.ember,
              textColor: Brand.midnight,
              label: Text('${inquiry.unread}'),
              child: const SizedBox.shrink(),
            ),
            Semantics(label: l10n.unreadCount(inquiry.unread)),
          ],
        ],
      ),
    );
  }
}
