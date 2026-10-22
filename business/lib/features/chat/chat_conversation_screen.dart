import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import 'chat_screen.dart';

/// A `client_id` for a reply: sending it again never sends it twice.
String newChatClientId([Random? random]) {
  final rng = random ?? Random.secure();
  return 'yb-${List.generate(24, (_) => rng.nextInt(36).toRadixString(36)).join()}';
}

/// One conversation of the app's chat, from the inbox.
final chatThreadProvider = FutureProvider.autoDispose
    .family<ChatThread, String>((ref, id) async {
      final inbox = await ref
          .watch(apiProvider)
          .chatConversations(ref.watch(appIdProvider));
      final thread = inbox.items.where((t) => t.id == id).firstOrNull;
      if (thread == null) {
        throw const ApiException(code: ApiException.notFound, statusCode: 404);
      }
      return thread;
    });

/// A reply on its way.
class _Outgoing {
  _Outgoing({required this.clientId, this.text, this.file});

  final String clientId;
  final String? text;
  final MediaFile? file;
  bool failed = false;
}

/// 77 A conversation: a person's with the business, or a course's group.
/// New messages come every few seconds while it's open; opening it marks it
/// read. The business answers as itself (the team sees who wrote), with
/// text and a file from the Media library; it deletes any message, stops a
/// person from sending, keeps the conversation past the year, or deletes
/// all of it.
class ChatConversationScreen extends ConsumerStatefulWidget {
  const ChatConversationScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ChatConversationScreen> createState() =>
      _ChatConversationScreenState();
}

class _ChatConversationScreenState
    extends ConsumerState<ChatConversationScreen> {
  final _reply = TextEditingController();
  final _messages = <ChatMessage>[];
  final _outgoing = <_Outgoing>[];
  late final AppLifecycleListener _lifecycle;
  Object? _error;
  bool _loaded = false;
  bool _hasMore = false;
  bool _loadingOlder = false;
  bool _visible = true;
  MediaFile? _file;
  Timer? _poll;
  String? _readUpTo;

  String get _id => widget.conversationId;
  String get _appId => ref.read(appIdProvider);

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(
      onResume: () {
        _visible = true;
        _schedule(0);
      },
      onHide: () {
        _visible = false;
        _poll?.cancel();
      },
    );
    unawaited(_load());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _lifecycle.dispose();
    _reply.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final page = await ref.read(apiProvider).chatMessages(_appId, _id);
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(page.items.reversed);
        _hasMore = page.hasMore;
        _loaded = true;
      });
      unawaited(_markRead());
      _schedule(page.pollAfterSeconds);
    } on Object catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  void _schedule(int seconds) {
    _poll?.cancel();
    if (!_loaded || !_visible || !mounted) return;
    _poll = Timer(Duration(seconds: seconds), _fetchNew);
  }

  Future<void> _fetchNew() async {
    if (!mounted) return;
    var wait = 15;
    try {
      final last = _messages.lastOrNull?.id;
      final page = await ref
          .read(apiProvider)
          .chatMessages(_appId, _id, after: last);
      wait = page.pollAfterSeconds;
      if (!mounted) return;
      final fresh = last == null ? page.items.reversed : page.items;
      if (fresh.isNotEmpty) {
        setState(() => _add(fresh));
        unawaited(_markRead());
      }
    } on Object {
      // Tried again later.
    }
    _schedule(wait);
  }

  void _add(Iterable<ChatMessage> messages) {
    for (final m in messages) {
      _outgoing.removeWhere((o) => o.clientId == m.clientId);
      final at = _messages.indexWhere((x) => x.id == m.id);
      if (at >= 0) {
        _messages[at] = m;
      } else {
        _messages.add(m);
      }
    }
    _messages.sort((a, b) => ChatMessage.compareIds(a.id, b.id));
  }

  Future<void> _markRead() async {
    final last = _messages.lastOrNull;
    if (last == null) return;
    final upTo = _readUpTo;
    if (upTo != null && ChatMessage.compareIds(last.id, upTo) <= 0) return;
    _readUpTo = last.id;
    try {
      await ref.read(apiProvider).readChat(_appId, _id, last.id);
    } on Object {
      // Marked read the next time.
    }
  }

  Future<void> _loadOlder() async {
    final first = _messages.firstOrNull;
    if (first == null || !_hasMore || _loadingOlder) return;
    setState(() => _loadingOlder = true);
    try {
      final page = await ref
          .read(apiProvider)
          .chatMessages(_appId, _id, before: first.id);
      if (!mounted) return;
      setState(() {
        _add(page.items);
        _hasMore = page.hasMore;
      });
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _loadingOlder = false);
    }
  }

  void _send() {
    final text = _reply.text.trim();
    final file = _file;
    if (text.isEmpty && file == null) return;
    _reply.clear();
    final out = _Outgoing(
      clientId: newChatClientId(),
      text: text.isEmpty ? null : text,
      file: file,
    );
    setState(() {
      _file = null;
      _outgoing.add(out);
    });
    unawaited(_deliver(out));
  }

  Future<void> _deliver(_Outgoing out) async {
    setState(() => out.failed = false);
    try {
      final message = await ref
          .read(apiProvider)
          .sendChatMessage(
            _appId,
            _id,
            clientId: out.clientId,
            text: out.text,
            mediaId: out.file?.id,
          );
      if (!mounted) return;
      setState(() {
        _outgoing.remove(out);
        _add([message]);
      });
      _readUpTo = message.id;
      _schedule(3);
    } on Object catch (e) {
      if (!mounted) return;
      setState(() => out.failed = true);
      if (e is ApiException && !e.isOffline) showError(context, e);
    }
  }

  Future<void> _pickFile() async {
    final file = await showModalBottomSheet<MediaFile>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => const _MediaPicker(),
    );
    if (file != null && mounted) setState(() => _file = file);
  }

  Future<void> _messageActions(ChatMessage m, ChatThread? thread) async {
    final l10n = context.l10n;
    final memberId = m.memberId;
    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(AppIcons.delete, color: context.yb.danger),
              title: Text(l10n.chatDeleteMessage),
              onTap: () => Navigator.pop(context, 'delete'),
            ),
            if (!m.fromBusiness && memberId != null)
              ListTile(
                leading: const Icon(AppIcons.block),
                title: Text(l10n.chatBlock),
                onTap: () => Navigator.pop(context, 'block'),
              ),
          ],
        ),
      ),
    );
    if (!mounted) return;
    switch (action) {
      case 'delete':
        final ok = await confirm(
          context,
          title: l10n.chatDeleteMessage,
          text: l10n.chatDeleteMessageText,
          action: l10n.delete,
          destructive: true,
        );
        if (!ok || !mounted) return;
        try {
          await ref.read(apiProvider).deleteChatMessage(_appId, m.id);
          if (!mounted) return;
          setState(() {
            final at = _messages.indexWhere((x) => x.id == m.id);
            if (at >= 0) _messages[at] = _messages[at].asDeleted();
          });
        } on Object catch (e) {
          if (mounted) showError(context, e);
        }
      case 'block':
        await _block(memberId!, m.senderName, blocked: true);
    }
  }

  Future<void> _block(
    String memberId,
    String name, {
    required bool blocked,
  }) async {
    final l10n = context.l10n;
    if (blocked) {
      final ok = await confirm(
        context,
        title: l10n.chatBlock,
        text: l10n.chatBlockText(name),
        action: l10n.chatBlock,
        destructive: true,
      );
      if (!ok || !mounted) return;
    }
    try {
      await ref
          .read(apiProvider)
          .blockChatMember(_appId, memberId, blocked: blocked);
      ref.invalidate(chatThreadProvider(_id));
      ref.invalidate(chatInboxProvider);
      if (mounted) showMessage(context, l10n.saved);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _menu(String action, ChatThread thread) async {
    final l10n = context.l10n;
    final api = ref.read(apiProvider);
    try {
      switch (action) {
        case 'keep':
          final kept = await api.keepChat(_appId, _id);
          ref.invalidate(chatThreadProvider(_id));
          if (mounted && kept.keepUntil != null) {
            showMessage(
              context,
              l10n.chatKeptUntil(context.day(kept.keepUntil!)),
            );
          }
        case 'block' || 'unblock':
          final person = thread.person!;
          await _block(person.id, person.name, blocked: action == 'block');
        case 'clear':
          final ok = await confirm(
            context,
            title: l10n.chatClear,
            text: l10n.chatClearText,
            action: l10n.delete,
            destructive: true,
          );
          if (!ok) return;
          await api.clearChat(_appId, _id);
          ref.invalidate(chatInboxProvider);
          if (mounted) setState(_messages.clear);
      }
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final thread = ref.watch(chatThreadProvider(_id)).value;
    final business = ref.watch(currentAppProvider)?.name ?? '';
    final person = thread?.person;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(thread?.title ?? l10n.chat, overflow: TextOverflow.ellipsis),
            if (thread != null &&
                (thread.group ||
                    (person?.blocked ?? false) ||
                    thread.expiresOn != null))
              Text(
                [
                  if (thread.group && thread.memberCount != null)
                    l10n.chatMembers(thread.memberCount!)
                  else if (thread.group)
                    l10n.chatCourseGroup,
                  if (person?.blocked ?? false) l10n.chatBlocked,
                  if (thread.keepUntil != null)
                    l10n.chatKeptUntil(context.day(thread.keepUntil!))
                  else if (thread.expiresOn != null)
                    l10n.chatExpiresOn(context.day(thread.expiresOn!)),
                ].join(' · '),
                style: Theme.of(context).textTheme.labelSmall,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        actions: [
          if (thread != null)
            PopupMenuButton<String>(
              tooltip: l10n.more,
              icon: const Icon(AppIcons.options),
              onSelected: (action) => _menu(action, thread),
              itemBuilder: (_) => [
                PopupMenuItem(value: 'keep', child: Text(l10n.chatKeepYear)),
                if (person != null)
                  PopupMenuItem(
                    value: person.blocked ? 'unblock' : 'block',
                    child: Text(
                      person.blocked ? l10n.chatUnblock : l10n.chatBlock,
                    ),
                  ),
                PopupMenuItem(value: 'clear', child: Text(l10n.chatClear)),
              ],
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(child: _body(context, thread)),
          if (_loaded) _composer(context, business),
        ],
      ),
    );
  }

  Widget _body(BuildContext context, ChatThread? thread) {
    final l10n = context.l10n;
    final error = _error;
    if (error != null) return ErrorState(error: error, onRetry: _load);
    if (!_loaded) return const LoadingState();
    if (_messages.isEmpty && _outgoing.isEmpty) {
      return EmptyState(icon: AppIcons.chat, title: l10n.chatNoMessages);
    }
    final group = thread?.group ?? false;
    final newest = [..._outgoing.reversed];
    final messages = _messages.reversed.toList();
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        if (n.metrics.extentAfter < 300) unawaited(_loadOlder());
        return false;
      },
      child: ListView.builder(
        reverse: true,
        padding: const EdgeInsets.all(16),
        itemCount: newest.length + messages.length + (_hasMore ? 1 : 0),
        itemBuilder: (context, i) {
          if (i < newest.length) {
            final out = newest[i];
            return _OutgoingBubble(
              key: ValueKey(out.clientId),
              out: out,
              onRetry: () => unawaited(_deliver(out)),
            );
          }
          final index = i - newest.length;
          if (index >= messages.length) {
            return Center(
              child: TextButton(
                onPressed: _loadingOlder ? null : _loadOlder,
                child: Text(l10n.chatOlder),
              ),
            );
          }
          final m = messages[index];
          return _Bubble(
            key: ValueKey(m.id),
            message: m,
            showName: group && !m.fromBusiness,
            onLongPress: m.deleted
                ? null
                : () => unawaited(_messageActions(m, thread)),
          );
        },
      ),
    );
  }

  Widget _composer(BuildContext context, String business) {
    final l10n = context.l10n;
    final file = _file;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (file != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 0, 8),
                child: Row(
                  children: [
                    Icon(_kindIcon(file.kind), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(file.name, overflow: TextOverflow.ellipsis),
                    ),
                    IconButton(
                      tooltip: l10n.chatRemoveFile,
                      icon: const Icon(AppIcons.close),
                      onPressed: () => setState(() => _file = null),
                    ),
                  ],
                ),
              ),
            Row(
              children: [
                IconButton(
                  tooltip: l10n.chatAttachMedia,
                  icon: const Icon(AppIcons.attach),
                  onPressed: _pickFile,
                ),
                Expanded(
                  child: TextField(
                    controller: _reply,
                    minLines: 1,
                    maxLines: 5,
                    maxLength: 4000,
                    textInputAction: TextInputAction.newline,
                    decoration: InputDecoration(
                      hintText: l10n.chatReplyHint(business),
                      counterText: '',
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  tooltip: l10n.send,
                  onPressed: _send,
                  icon: const DirectionalIcon(AppIcons.send),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

IconData _kindIcon(String kind) => switch (kind) {
  'image' => AppIcons.image,
  'video' => AppIcons.video,
  'audio' => AppIcons.audio,
  'pdf' => AppIcons.pdf,
  _ => AppIcons.file,
};

class _Bubble extends ConsumerWidget {
  const _Bubble({
    super.key,
    required this.message,
    required this.showName,
    this.onLongPress,
  });

  final ChatMessage message;
  final bool showName;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final m = message;
    final mine = m.fromBusiness;
    final theme = Theme.of(context);
    final fg = mine ? context.yb.onInk : context.yb.ink;
    final soft = mine
        ? context.yb.onInk.withValues(alpha: 0.8)
        : context.yb.ink2;
    final a = m.attachment;
    final text = m.text?.trim() ?? '';
    return Align(
      alignment: mine
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: GestureDetector(
        onLongPress: onLongPress,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.8,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: mine ? context.yb.ink : context.yb.surface,
            borderRadius: BorderRadius.circular(18),
            border: m.reported
                ? Border.all(color: context.yb.warning, width: 2)
                : (mine ? null : Border.all(color: context.yb.line)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showName)
                Text(
                  m.senderName,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: fg,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              if (m.deleted)
                Text(
                  l10n.chatDeleted,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: soft,
                    fontStyle: FontStyle.italic,
                  ),
                )
              else ...[
                if (a != null)
                  InkWell(
                    onTap: () => openLink(context, ref, a.url),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_kindIcon(a.kind), color: fg),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              a.name,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: fg,
                                decoration: TextDecoration.underline,
                                decorationColor: fg,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (text.isNotEmpty)
                  Text(
                    text,
                    style: theme.textTheme.bodyMedium?.copyWith(color: fg),
                  ),
              ],
              const SizedBox(height: 4),
              Text(
                [
                  context.dateTime(m.createdAt),
                  if (mine && m.teamMember != null)
                    l10n.chatSentBy(m.teamMember!),
                  if (m.reported) l10n.chatReported,
                ].join(' · '),
                style: theme.textTheme.labelSmall?.copyWith(color: soft),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OutgoingBubble extends StatelessWidget {
  const _OutgoingBubble({super.key, required this.out, required this.onRetry});

  final _Outgoing out;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final what = [?out.file?.name, ?out.text].join('\n');
    return Align(
      alignment: AlignmentDirectional.centerEnd,
      child: GestureDetector(
        onTap: out.failed ? onRetry : null,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.8,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: out.failed
                ? context.yb.surface
                : context.yb.ink.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(18),
            border: out.failed ? Border.all(color: context.yb.danger) : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                what,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: out.failed ? context.yb.ink : context.yb.onInk,
                ),
              ),
              if (out.failed) ...[
                const SizedBox(height: 4),
                Text(
                  l10n.chatNotSent,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: context.yb.danger,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// A file from the app's Media library for the reply.
class _MediaPicker extends ConsumerWidget {
  const _MediaPicker();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final media = ref.watch(_mediaProvider);
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.7,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(
                l10n.chatChooseFile,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            Flexible(
              child: AsyncBody(
                value: media,
                onRetry: () => ref.invalidate(_mediaProvider),
                builder: (list) {
                  final ready = [
                    for (final f in list.items)
                      if (f.ready) f,
                  ];
                  if (ready.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(l10n.chatNoMediaFiles),
                    );
                  }
                  return ListView(
                    shrinkWrap: true,
                    children: [
                      for (final f in ready)
                        ListTile(
                          leading: Icon(_kindIcon(f.kind)),
                          title: Text(f.name, overflow: TextOverflow.ellipsis),
                          onTap: () => Navigator.pop(context, f),
                        ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final _mediaProvider = FutureProvider.autoDispose<MediaList>(
  (ref) => ref.watch(apiProvider).media(ref.watch(appIdProvider)),
);
