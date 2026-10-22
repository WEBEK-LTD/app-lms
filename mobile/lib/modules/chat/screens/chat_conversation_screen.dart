import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/services/analytics.dart' show randomUuid;
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/chat_api.dart';
import '../data/chat_media.dart';
import '../data/chat_providers.dart';
import '../widgets/chat_widgets.dart';

/// A message on its way: text, a file, or both. Kept with its `client_id`,
/// so sending it again after a network error never sends it twice.
class _Outgoing {
  _Outgoing({required this.clientId, this.text, this.file});

  final String clientId;
  final String? text;
  final ChatFile? file;
  String? uploadId;
  double progress = 0;
  bool failed = false;
}

/// 77 One conversation: the business's, or a course's group. New messages
/// come every `poll_after_seconds` while it's open (a push brings them
/// otherwise); opening it marks it read.
class ChatConversationScreen extends ConsumerStatefulWidget {
  const ChatConversationScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ChatConversationScreen> createState() =>
      _ChatConversationScreenState();
}

class _ChatConversationScreenState
    extends ConsumerState<ChatConversationScreen> {
  final _text = TextEditingController();
  final _messages = <ChatMessage>[];
  final _outgoing = <_Outgoing>[];
  late final AppLifecycleListener _lifecycle;
  ChatConversation? _conversation;
  Object? _error;
  bool _loaded = false;
  bool _hasMore = false;
  bool _loadingOlder = false;
  bool _canSend = true;
  bool _visible = true;
  Timer? _poll;
  String? _readUpTo;

  /// The person's own member ID, known from their own messages.
  String? _me;

  VoiceRecorder? _recorder;
  DateTime? _recordingSince;
  Timer? _recordingTicker;

  String get _id => widget.conversationId;
  ChatApi? get _api => ref.read(chatApiProvider);

  @override
  void initState() {
    super.initState();
    _text.addListener(_onText);
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
    _recordingTicker?.cancel();
    _lifecycle.dispose();
    _text
      ..removeListener(_onText)
      ..dispose();
    final recorder = _recorder;
    if (recorder != null) {
      if (_recordingSince != null) unawaited(recorder.cancel());
      recorder.dispose();
    }
    super.dispose();
  }

  String _lastText = '';
  void _onText() {
    // The send button and the microphone swap when the box empties or fills.
    final empty = _text.text.trim().isEmpty;
    if (empty != _lastText.trim().isEmpty) setState(() {});
    _lastText = _text.text;
  }

  Future<void> _load() async {
    final api = _api;
    if (api == null) {
      setState(() => _error = _unavailable());
      return;
    }
    setState(() => _error = null);
    try {
      var list = await ref.read(chatConversationsProvider.future);
      var conversation = list.items.where((c) => c.id == _id).firstOrNull;
      if (conversation == null) {
        // A conversation the list doesn't have yet (a push, a new group).
        list = await api.conversations();
        conversation = list.items.where((c) => c.id == _id).firstOrNull;
      }
      if (conversation == null) {
        throw ApiException(
          code: 'not_found',
          message: currentL10n.error404,
          statusCode: 404,
        );
      }
      final page = await api.messages(_id);
      if (!mounted) return;
      setState(() {
        _conversation = conversation;
        _canSend = conversation!.canSend;
        _messages
          ..clear()
          ..addAll(page.items.reversed);
        _hasMore = page.hasMore;
        _loaded = true;
        _learnMe(page.items);
      });
      unawaited(_markRead());
      _schedule(page.pollAfterSeconds);
    } on Object catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  ApiException _unavailable() => ApiException(
    code: ChatErrors.notAvailable,
    message: currentL10n.chatUnavailable,
    statusCode: 403,
  );

  void _learnMe(Iterable<ChatMessage> messages) {
    for (final m in messages) {
      if (m.mine && m.sender.memberId != null) _me = m.sender.memberId;
    }
  }

  /// The next look for new messages in [seconds].
  void _schedule(int seconds) {
    _poll?.cancel();
    if (!_loaded || !_visible || !mounted) return;
    _poll = Timer(Duration(seconds: seconds), _fetchNew);
  }

  Future<void> _fetchNew() async {
    final api = _api;
    if (api == null || !mounted) return;
    var wait = 15;
    try {
      final last = _messages.lastOrNull?.id;
      final page = last == null
          ? await api.messages(_id)
          : await api.messages(_id, after: last);
      wait = page.pollAfterSeconds;
      if (!mounted) return;
      final fresh = last == null ? page.items.reversed : page.items;
      if (fresh.isNotEmpty) {
        setState(() => _add(fresh));
        unawaited(_markRead());
      }
    } on ApiException catch (e) {
      if (e.code == ChatErrors.notAvailable && mounted) {
        setState(() => _canSend = false);
      }
    } on Object {
      // Tried again later.
    }
    _schedule(wait);
  }

  /// Adds messages in order, without duplicates; a message that was on its
  /// way is replaced by the one sent.
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
    _learnMe(messages);
  }

  Future<void> _markRead() async {
    final api = _api;
    final last = _messages.lastOrNull;
    if (api == null || last == null) return;
    final upTo = _readUpTo;
    if (upTo != null && ChatMessage.compareIds(last.id, upTo) <= 0) return;
    _readUpTo = last.id;
    try {
      await api.read(_id, last.id);
      await ref.read(chatUnreadProvider.notifier).refresh();
    } on Object {
      // Marked read the next time.
    }
  }

  Future<void> _loadOlder() async {
    final api = _api;
    final first = _messages.firstOrNull;
    if (api == null || first == null || !_hasMore || _loadingOlder) return;
    setState(() => _loadingOlder = true);
    try {
      final page = await api.messages(_id, before: first.id);
      if (!mounted) return;
      setState(() {
        _add(page.items);
        _hasMore = page.hasMore;
      });
    } on Object catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
    } finally {
      if (mounted) setState(() => _loadingOlder = false);
    }
  }

  void _sendText() {
    final text = _text.text.trim();
    if (text.isEmpty) return;
    _text.clear();
    _queue(_Outgoing(clientId: randomUuid(), text: text));
  }

  void _sendFile(ChatFile file) {
    if (file.size > chatMaxBytes(file.type)) {
      showMessage(context, context.l10n.chatTooBig);
      return;
    }
    _queue(_Outgoing(clientId: randomUuid(), file: file));
  }

  void _queue(_Outgoing out) {
    setState(() => _outgoing.add(out));
    unawaited(_deliver(out));
  }

  Future<void> _deliver(_Outgoing out) async {
    final api = _api;
    if (api == null) return;
    setState(() => out.failed = false);
    try {
      final file = out.file;
      if (file != null && out.uploadId == null) {
        out.uploadId = await uploadChatFile(
          api,
          file,
          onProgress: (progress) {
            if (mounted) setState(() => out.progress = progress);
          },
          cancelled: () => !mounted,
        );
      }
      final message = await api.send(
        _id,
        clientId: out.clientId,
        text: out.text,
        uploadId: out.uploadId,
      );
      if (!mounted) return;
      setState(() {
        _outgoing.remove(out);
        _add([message]);
      });
      // Answers often come soon after.
      _schedule(3);
    } on ApiException catch (e) {
      if (!mounted) return;
      final l10n = context.l10n;
      final String? refusal = switch (e.code) {
        ChatErrors.blocked => l10n.chatCantSend,
        ChatErrors.notAvailable => l10n.chatUnavailable,
        ChatErrors.tooBig => l10n.chatTooBig,
        ChatErrors.storageFull => l10n.chatStorageFull,
        'invalid_request' when out.file != null && out.uploadId == null =>
          l10n.chatFileType,
        _ => null,
      };
      setState(() {
        if (e.code == ChatErrors.blocked || e.code == ChatErrors.notAvailable) {
          _canSend = false;
        }
        if (refusal != null && e.code != ChatErrors.blocked) {
          // It will never go: the text goes back in the box.
          _outgoing.remove(out);
          if (out.text != null && _text.text.isEmpty) _text.text = out.text!;
        } else {
          out.failed = true;
        }
      });
      showMessage(context, refusal ?? e.message);
    } on Object {
      if (mounted) setState(() => out.failed = true);
    }
  }

  Future<void> _attach() async {
    final l10n = context.l10n;
    final source = await showModalBottomSheet<ChatPickSource>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final (source, icon, label) in [
              (ChatPickSource.gallery, AppIcons.gallery, l10n.chatGallery),
              (ChatPickSource.camera, AppIcons.photo, l10n.chatTakePhoto),
              (ChatPickSource.video, AppIcons.video, l10n.chatRecordVideo),
              (ChatPickSource.file, AppIcons.file, l10n.chatChooseFile),
            ])
              ListTile(
                leading: AppIcon(icon),
                title: Text(label),
                onTap: () => Navigator.of(context).pop(source),
              ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    try {
      final picked = await ref.read(chatPickerProvider).pick(source);
      if (!mounted || picked == null) return;
      switch (picked) {
        case ChatPicked(:final file):
          _sendFile(file);
        case ChatPickUnsupported():
          showMessage(context, l10n.chatFileType);
      }
    } on Object catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
    }
  }

  Future<void> _startRecording() async {
    final recorder = _recorder ?? ref.read(voiceRecorderProvider)();
    _recorder = recorder;
    bool started;
    try {
      started = await recorder.start();
    } on Object {
      started = false;
    }
    if (!mounted) return;
    if (!started) {
      showMessage(context, context.l10n.chatMicDenied);
      return;
    }
    setState(() => _recordingSince = DateTime.now());
    _recordingTicker = Timer.periodic(
      const Duration(seconds: 1),
      (_) => setState(() {}),
    );
  }

  Future<void> _stopRecording({required bool send}) async {
    final recorder = _recorder;
    _recordingTicker?.cancel();
    setState(() => _recordingSince = null);
    if (recorder == null) return;
    try {
      if (!send) return await recorder.cancel();
      final file = await recorder.stop();
      if (file != null && mounted) _sendFile(file);
    } on Object catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
    }
  }

  Future<void> _actions(ChatMessage m) async {
    final l10n = context.l10n;
    final group = _conversation?.isGroup ?? false;
    final memberId = m.sender.memberId;
    final canBlock =
        group &&
        !m.mine &&
        !m.sender.isBusiness &&
        memberId != null &&
        memberId != _me;
    final action = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (m.mine)
              ListTile(
                leading: const AppIcon(AppIcons.delete),
                title: Text(l10n.chatDeleteMessage),
                onTap: () => Navigator.of(context).pop('delete'),
              )
            else
              ListTile(
                leading: const AppIcon(AppIcons.flag),
                title: Text(l10n.chatReport),
                onTap: () => Navigator.of(context).pop('report'),
              ),
            if (canBlock)
              ListTile(
                leading: const AppIcon(AppIcons.unavailable),
                title: Text(l10n.chatBlockPerson(m.sender.name)),
                onTap: () => Navigator.of(context).pop('block'),
              ),
          ],
        ),
      ),
    );
    if (!mounted) return;
    switch (action) {
      case 'delete':
        await _delete(m);
      case 'report':
        await _report(m);
      case 'block':
        await _block(memberId!, m.sender.name, blocked: true);
    }
  }

  Future<void> _delete(ChatMessage m) async {
    final l10n = context.l10n;
    final ok = await confirmAction(
      context,
      title: l10n.chatDeleteMessage,
      message: l10n.chatDeleteConfirm,
      confirmLabel: l10n.delete,
      destructive: true,
    );
    if (!ok || !mounted) return;
    try {
      await _api?.deleteMessage(m.id);
      if (!mounted) return;
      setState(() {
        final at = _messages.indexWhere((x) => x.id == m.id);
        if (at >= 0) {
          _messages[at] = ChatMessage(
            id: m.id,
            conversationId: m.conversationId,
            clientId: m.clientId,
            sender: m.sender,
            mine: m.mine,
            deleted: true,
            createdAt: m.createdAt,
          );
        }
      });
    } on Object catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
    }
  }

  Future<void> _report(ChatMessage m) async {
    final l10n = context.l10n;
    final reason = await showModalBottomSheet<ChatReportReason>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                l10n.chatReportTitle,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            for (final (reason, label) in [
              (ChatReportReason.spam, l10n.chatReportSpam),
              (ChatReportReason.abuse, l10n.chatReportAbuse),
              (ChatReportReason.inappropriate, l10n.chatReportInappropriate),
              (ChatReportReason.other, l10n.chatReportOther),
            ])
              ListTile(
                title: Text(label),
                onTap: () => Navigator.of(context).pop(reason),
              ),
          ],
        ),
      ),
    );
    if (reason == null || !mounted) return;
    try {
      await _api?.report(m.id, reason);
      if (mounted) {
        showMessage(
          context,
          l10n.chatReported(ref.read(appConfigProvider).site.name),
        );
      }
    } on Object catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
    }
  }

  /// Blocking hides the member's messages from this person in every group.
  Future<bool> _block(
    String memberId,
    String name, {
    required bool blocked,
  }) async {
    final l10n = context.l10n;
    if (blocked) {
      final ok = await confirmAction(
        context,
        title: l10n.chatBlockTitle(name),
        message: l10n.chatBlockMessage(name),
        confirmLabel: l10n.chatBlock,
        destructive: true,
      );
      if (!ok || !mounted) return false;
    }
    try {
      await _api?.block(memberId, blocked: blocked);
      if (!mounted) return true;
      if (blocked) {
        setState(
          () => _messages.removeWhere((m) => m.sender.memberId == memberId),
        );
      } else {
        // Their messages come back.
        unawaited(_load());
      }
      return true;
    } on Object catch (e) {
      if (mounted) showMessage(context, friendlyError(e));
      return false;
    }
  }

  Future<void> _showMembers() async {
    final api = _api;
    if (api == null) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _MembersSheet(
        load: () => api.members(_id),
        me: _me,
        onBlock: (member, blocked) =>
            _block(member.id, member.name, blocked: blocked),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final conversation = _conversation;
    return Scaffold(
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 10),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: p.divider)),
              ),
              child: Row(
                children: [
                  const AppBackButton(),
                  const SizedBox(width: 12),
                  if (conversation != null) ...[
                    ChatAvatar(conversation: conversation, size: 36),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: conversation == null
                        ? const SizedBox.shrink()
                        : Semantics(
                            header: true,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  conversation.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: p.text,
                                  ),
                                ),
                                if (conversation.isGroup)
                                  Text(
                                    conversation.memberCount == null
                                        ? l10n.chatCourseGroup
                                        : '${l10n.chatCourseGroup} · '
                                              '${l10n.chatMemberCount(conversation.memberCount!)}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: p.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                  ),
                  if (conversation?.isGroup ?? false)
                    IconButton(
                      tooltip: l10n.chatMembers,
                      onPressed: _showMembers,
                      icon: AppIcon(AppIcons.group, color: p.text),
                    ),
                ],
              ),
            ),
          ),
          Expanded(child: _body(context)),
          if (_loaded) _composer(context),
        ],
      ),
    );
  }

  Widget _body(BuildContext context) {
    final l10n = context.l10n;
    final error = _error;
    if (error != null) return ErrorView(error: error, onRetry: _load);
    if (!_loaded) return LoadingView(label: l10n.chatLoadingMessages);
    if (_messages.isEmpty && _outgoing.isEmpty) {
      return MessageView(
        icon: AppIcons.chat,
        title: l10n.chatNoMessagesTitle,
        message: l10n.chatNoMessagesMessage,
      );
    }
    final group = _conversation?.isGroup ?? false;
    final newest = [..._outgoing.reversed];
    final messages = _messages.reversed.toList();
    final count = newest.length + messages.length + (_hasMore ? 1 : 0);
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        if (n.metrics.extentAfter < 300) unawaited(_loadOlder());
        return false;
      },
      child: ListView.builder(
        reverse: true,
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
        itemCount: count,
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
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Center(
                child: _loadingOlder
                    ? const SizedBox.square(
                        dimension: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : TextButton(
                        onPressed: _loadOlder,
                        child: Text(l10n.chatOlder),
                      ),
              ),
            );
          }
          final m = messages[index];
          return ChatBubble(
            key: ValueKey(m.id),
            message: m,
            showSender: group,
            onLongPress: m.deleted ? null : () => unawaited(_actions(m)),
          );
        },
      ),
    );
  }

  Widget _composer(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    if (!_canSend) {
      return BottomActionBar(
        child: Text(
          l10n.chatCantSend,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: p.textSecondary),
        ),
      );
    }
    final since = _recordingSince;
    if (since != null) {
      return BottomActionBar(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        child: Row(
          children: [
            IconButton(
              tooltip: l10n.cancel,
              onPressed: () => _stopRecording(send: false),
              icon: AppIcon(AppIcons.delete, color: p.danger),
            ),
            const SizedBox(width: 8),
            AppIcon(AppIcons.mic, color: p.danger, filled: true),
            const SizedBox(width: 8),
            Expanded(
              child: Semantics(
                liveRegion: true,
                child: Text(
                  l10n.chatRecording(
                    formatClock(DateTime.now().difference(since)),
                  ),
                  style: TextStyle(fontSize: 15, color: p.text),
                ),
              ),
            ),
            SquareIconButton(
              icon: AppIcons.send,
              label: l10n.chatStopAndSend,
              size: 50,
              radius: context.shapes.button,
              background: p.primary,
              foreground: p.onPrimary,
              bordered: false,
              onPressed: () => _stopRecording(send: true),
            ),
          ],
        ),
      );
    }
    final typed = _text.text.trim().isNotEmpty;
    return BottomActionBar(
      padding: const EdgeInsets.fromLTRB(8, 10, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          IconButton(
            tooltip: l10n.chatAttach,
            onPressed: _attach,
            icon: AppIcon(AppIcons.attachment, color: p.text),
          ),
          Expanded(
            child: TextField(
              controller: _text,
              minLines: 1,
              maxLines: 5,
              maxLength: 4000,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: l10n.writeMessage,
                counterText: '',
              ),
            ),
          ),
          const SizedBox(width: 8),
          SquareIconButton(
            icon: typed ? AppIcons.send : AppIcons.mic,
            label: typed ? l10n.send : l10n.chatRecord,
            size: 50,
            radius: context.shapes.button,
            background: p.primary,
            foreground: p.onPrimary,
            bordered: false,
            onPressed: typed ? _sendText : _startRecording,
          ),
        ],
      ),
    );
  }
}

/// A message on its way: its text or file, how much of the file went, or
/// "Not sent. Tap to try again."
class _OutgoingBubble extends StatelessWidget {
  const _OutgoingBubble({super.key, required this.out, required this.onRetry});

  final _Outgoing out;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final file = out.file;
    final String what = out.text?.isNotEmpty ?? false
        ? out.text!
        : switch (file == null ? null : chatKindOf(file.type)) {
            ChatAttachmentKind.image => l10n.chatPhoto,
            ChatAttachmentKind.video => l10n.chatVideo,
            ChatAttachmentKind.audio => l10n.chatVoice,
            _ => file?.name ?? '',
          };
    final status = out.failed
        ? l10n.chatNotSent
        : (file != null && out.uploadId == null
              ? l10n.chatUploading((out.progress * 100).round())
              : l10n.chatSending);
    return Align(
      alignment: AlignmentDirectional.centerEnd,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.8,
        ),
        child: Semantics(
          button: out.failed,
          label: '${l10n.messageFromYou(what)}, $status',
          excludeSemantics: true,
          child: GestureDetector(
            onTap: out.failed ? onRetry : null,
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 3),
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
              decoration: BoxDecoration(
                color: out.failed
                    ? p.surface
                    : p.primary.withValues(alpha: 0.7),
                border: out.failed ? Border.all(color: p.danger) : null,
                borderRadius: const BorderRadiusDirectional.only(
                  topStart: Radius.circular(16),
                  topEnd: Radius.circular(16),
                  bottomStart: Radius.circular(16),
                  bottomEnd: Radius.circular(4),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (file != null)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AppIcon(switch (chatKindOf(file.type)) {
                          ChatAttachmentKind.image => AppIcons.image,
                          ChatAttachmentKind.video => AppIcons.video,
                          ChatAttachmentKind.audio => AppIcons.mic,
                          ChatAttachmentKind.file => AppIcons.file,
                        }, color: out.failed ? p.text : p.onPrimary),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            file.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 14,
                              color: out.failed ? p.text : p.onPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  if (out.text?.isNotEmpty ?? false)
                    Text(
                      out.text!,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.4,
                        color: out.failed ? p.text : p.onPrimary,
                      ),
                    ),
                  if (file != null && !out.failed && out.uploadId == null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: LinearProgressIndicator(
                        value: out.progress,
                        minHeight: 3,
                        color: p.onPrimary,
                        backgroundColor: p.onPrimary.withValues(alpha: 0.3),
                      ),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    status,
                    style: TextStyle(
                      fontSize: 11,
                      color: out.failed
                          ? p.danger
                          : p.onPrimary.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A group's members: names and pictures only, the business first. Each
/// person can be blocked (for the one asking only), never the business.
class _MembersSheet extends StatefulWidget {
  const _MembersSheet({
    required this.load,
    required this.me,
    required this.onBlock,
  });

  final Future<List<ChatMember>> Function() load;
  final String? me;
  final Future<bool> Function(ChatMember member, bool blocked) onBlock;

  @override
  State<_MembersSheet> createState() => _MembersSheetState();
}

class _MembersSheetState extends State<_MembersSheet> {
  List<ChatMember>? _members;
  Object? _error;
  final _blocked = <String, bool>{};

  @override
  void initState() {
    super.initState();
    unawaited(_fetch());
  }

  Future<void> _fetch() async {
    try {
      final members = await widget.load();
      if (mounted) setState(() => _members = members);
    } on Object catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final members = _members;
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
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                l10n.chatMembers,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
            ),
            Flexible(
              child: switch ((members, _error)) {
                (_, final Object error) => SizedBox(
                  height: 240,
                  child: ErrorView(error: error),
                ),
                (null, _) => const SizedBox(
                  height: 160,
                  child: Center(child: CircularProgressIndicator()),
                ),
                (final List<ChatMember> list, _) => ListView.builder(
                  shrinkWrap: true,
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final m = list[i];
                    final blocked = _blocked[m.id] ?? m.blocked;
                    final canBlock = !m.business && m.id != widget.me;
                    return ListTile(
                      leading: InitialsAvatar(
                        name: m.name,
                        imageUrl: m.imageUrl,
                        size: 40,
                      ),
                      title: Text(m.name),
                      subtitle: blocked ? Text(l10n.chatBlocked) : null,
                      trailing: canBlock
                          ? TextButton(
                              onPressed: () async {
                                final done = await widget.onBlock(m, !blocked);
                                if (done && mounted) {
                                  setState(() => _blocked[m.id] = !blocked);
                                }
                              },
                              child: Text(
                                blocked ? l10n.chatUnblock : l10n.chatBlock,
                              ),
                            )
                          : null,
                    );
                  },
                ),
              },
            ),
          ],
        ),
      ),
    );
  }
}
