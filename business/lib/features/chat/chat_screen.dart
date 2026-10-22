import 'dart:async';

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
import '../../l10n/app_localizations.dart';

/// 77 What a message says in a list: its text, or the kind of file.
String chatPreview(AppLocalizations l10n, ChatMessage m) {
  if (m.deleted) return l10n.chatDeleted;
  final text = m.text?.trim() ?? '';
  final said = text.isNotEmpty
      ? text
      : switch (m.attachment?.kind) {
          'image' => l10n.chatPhoto,
          'video' => l10n.chatVideo,
          'audio' => l10n.chatVoice,
          _ => l10n.chatFile,
        };
  return m.fromBusiness ? l10n.chatYou(said) : said;
}

typedef ChatFilter = ({bool unread, bool groups, String query});

final chatInboxProvider = FutureProvider.autoDispose
    .family<ChatInbox, ChatFilter>(
      (ref, filter) => ref
          .watch(apiProvider)
          .chatConversations(
            ref.watch(appIdProvider),
            unread: filter.unread,
            kind: filter.groups ? 'group' : null,
            query: filter.query,
          ),
    );

/// 77 The Chat tab: everyone who wrote to the business and, in an academy
/// with course groups, each course's group, most recent first. What waits
/// is on top: reports, and messages about to be deleted after a year.
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  String _show = 'all';
  String _query = '';
  Timer? _poll;
  final _search = TextEditingController();

  ChatFilter get _filter =>
      (unread: _show == 'unread', groups: _show == 'groups', query: _query);

  @override
  void initState() {
    super.initState();
    // New conversations and messages while the list is open.
    _poll = Timer.periodic(const Duration(seconds: 20), (_) {
      if (mounted) ref.invalidate(chatInboxProvider(_filter));
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _keepAll() async {
    try {
      await ref.read(apiProvider).keepExpiringChats(ref.read(appIdProvider));
      ref.invalidate(chatInboxProvider);
      if (mounted) showMessage(context, context.l10n.chatKept);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    final inbox = ref.watch(chatInboxProvider(_filter));
    final academy = app?.type == 'lms';
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.chat),
        actions: [
          IconButton(
            tooltip: l10n.chatReports,
            icon: const Icon(AppIcons.flag),
            onPressed: () => context.push(Paths.chatReports),
          ),
          IconButton(
            tooltip: l10n.chatSettings,
            icon: const Icon(AppIcons.chatSettings),
            onPressed: () => showChatSettings(context),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: l10n.chatSearch,
                prefixIcon: const Icon(AppIcons.search),
              ),
              onSubmitted: (q) => setState(() => _query = q.trim()),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<String>(
                showSelectedIcon: false,
                segments: [
                  for (final (value, label) in [
                    ('all', l10n.chatAll),
                    ('unread', l10n.chatUnread),
                    if (academy) ('groups', l10n.chatGroups),
                  ])
                    ButtonSegment(
                      value: value,
                      label: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(label, maxLines: 1, softWrap: false),
                      ),
                    ),
                ],
                selected: {_show},
                onSelectionChanged: (s) => setState(() => _show = s.first),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: pullToRefresh(
                context,
                () => ref.refresh(chatInboxProvider(_filter).future),
              ),
              child: AsyncBody(
                value: inbox,
                onRetry: () => ref.invalidate(chatInboxProvider(_filter)),
                builder: (inbox) => ListView(
                  padding: const EdgeInsets.only(bottom: 24),
                  children: [
                    if (inbox.openReports > 0)
                      _Notice(
                        icon: AppIcons.flag,
                        text: l10n.chatReportsWaiting(inbox.openReports),
                        action: l10n.open,
                        onTap: () => context.push(Paths.chatReports),
                      ),
                    if (inbox.expiring > 0 && inbox.deleteOn != null)
                      _Notice(
                        icon: AppIcons.keep,
                        text: l10n.chatExpiring(context.day(inbox.deleteOn!)),
                        action: l10n.chatKeepYear,
                        onTap: _keepAll,
                      ),
                    if (inbox.items.isEmpty)
                      SizedBox(
                        height: 360,
                        child: _query.isNotEmpty || _show != 'all'
                            ? EmptyState(
                                icon: AppIcons.chat,
                                title: l10n.chatNoMatches,
                              )
                            : EmptyState(
                                icon: AppIcons.chat,
                                title: l10n.chatEmpty,
                                text: l10n.chatEmptyText,
                              ),
                      )
                    else
                      for (final t in inbox.items) _ThreadTile(thread: t),
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

class _Notice extends StatelessWidget {
  const _Notice({
    required this.icon,
    required this.text,
    required this.action,
    required this.onTap,
  });

  final IconData icon;
  final String text;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
    child: Panel(
      color: context.yb.warningBg,
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
      child: Row(
        children: [
          Icon(icon, color: context.yb.warning),
          const SizedBox(width: 12),
          Expanded(child: Text(text)),
          TextButton(onPressed: onTap, child: Text(action)),
        ],
      ),
    ),
  );
}

class _ThreadTile extends ConsumerWidget {
  const _ThreadTile({required this.thread});

  final ChatThread thread;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final t = thread;
    final last = t.lastMessage;
    final unread = t.unreadCount > 0;
    final subtitle = [
      if (t.group) l10n.chatCourseGroup,
      if (t.person?.blocked ?? false) l10n.chatBlocked,
      if (last != null) chatPreview(l10n, last),
    ].join(' · ');
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: context.yb.line,
        foregroundColor: context.yb.ink,
        child: t.group
            ? const Icon(AppIcons.group)
            : Text(
                t.title.trim().isEmpty
                    ? '?'
                    : t.title.trim().characters.first.toUpperCase(),
              ),
      ),
      title: Text(
        t.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: unread ? const TextStyle(fontWeight: FontWeight.w700) : null,
      ),
      subtitle: Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            context.ago(t.updatedAt),
            style: Theme.of(context).textTheme.labelSmall,
          ),
          if (unread) ...[
            const SizedBox(height: 4),
            Badge(label: Text('${t.unreadCount}')),
          ],
        ],
      ),
      onTap: () async {
        await context.push(Paths.chatConversation(t.id));
        ref.invalidate(chatInboxProvider);
      },
    );
  }
}

/// On or off, and an academy's course groups. Owners and managers change
/// them (`settings`); others see them.
Future<void> showChatSettings(BuildContext context) =>
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => const _ChatSettingsSheet(),
    );

final chatSettingsProvider = FutureProvider.autoDispose<ChatSettings>(
  (ref) => ref.watch(apiProvider).chatSettings(ref.watch(appIdProvider)),
);

class _ChatSettingsSheet extends ConsumerStatefulWidget {
  const _ChatSettingsSheet();

  @override
  ConsumerState<_ChatSettingsSheet> createState() => _ChatSettingsSheetState();
}

class _ChatSettingsSheetState extends ConsumerState<_ChatSettingsSheet> {
  bool _saving = false;

  Future<void> _save({bool? enabled, bool? courseGroups}) async {
    setState(() => _saving = true);
    try {
      await ref
          .read(apiProvider)
          .updateChatSettings(
            ref.read(appIdProvider),
            enabled: enabled,
            courseGroups: courseGroups,
          );
      ref.invalidate(chatSettingsProvider);
      // The tab follows the switch (`features.chat`).
      await ref.read(sessionProvider.notifier).refreshMe();
      if (mounted) showMessage(context, context.l10n.saved);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final canChange = ref.watch(currentAppProvider)?.access.settings ?? false;
    final settings = ref.watch(chatSettingsProvider);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: AsyncBody(
          value: settings,
          onRetry: () => ref.invalidate(chatSettingsProvider),
          builder: (s) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Text(
                  l10n.chatSettings,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              if (!s.available)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(l10n.chatNoPlan),
                )
              else ...[
                SwitchListTile(
                  title: Text(l10n.chatOn),
                  subtitle: Text(l10n.chatOnHelp),
                  value: s.enabled,
                  onChanged: !canChange || _saving
                      ? null
                      : (on) => _save(enabled: on),
                ),
                if (s.courseGroups != null)
                  SwitchListTile(
                    title: Text(l10n.chatGroups),
                    subtitle: Text(l10n.chatGroupsHelp),
                    value: s.courseGroups!,
                    onChanged: !canChange || _saving
                        ? null
                        : (on) => _save(courseGroups: on),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
