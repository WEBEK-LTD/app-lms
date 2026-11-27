import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' as intl;
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/images.dart';
import '../../../core/widgets/sym.dart';
import '../../posts/ui/composer_screen.dart';
import '../../social/report_sheet.dart';
import '../data/messages_api.dart';
import '../links.dart';

/// One conversation: its messages (newest at the bottom), polled while
/// open; text, up to 4 photos and a reply to one message; read marks.
class ThreadPage extends ConsumerStatefulWidget {
  const ThreadPage({super.key, required this.id});

  final String id;

  static const maxPhotos = 4;

  @override
  ConsumerState<ThreadPage> createState() => _ThreadPageState();
}

class _ThreadPageState extends ConsumerState<ThreadPage> {
  final _text = TextEditingController();
  Conversation? _c;

  /// Oldest first.
  var _messages = <Message>[];
  String? _older;
  var _photos = <String>[];
  Message? _replyTo;
  var _sending = false;
  Object? _error;
  Timer? _poll;

  MessagesApi get _api => ref.read(messagesApiProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _poll?.cancel();
    _text.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final c = await _api.conversation(widget.id);
      final page = await _api.messages(widget.id);
      if (!mounted) return;
      setState(() {
        _c = c;
        _messages = page.items.reversed.toList();
        _older = page.nextCursor;
      });
      _markRead();
      final every = ref.read(messagePollProvider).thread;
      if (every > Duration.zero) {
        _poll = Timer.periodic(every, (_) => _fetchNew());
      }
    } on Object catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _fetchNew() async {
    final last = _messages.lastOrNull?.id;
    try {
      final page = await _api.messages(widget.id, after: last);
      if (!mounted || page.items.isEmpty) return;
      setState(() => _messages = [..._messages, ...page.items]);
      _markRead();
    } on Object {
      // The next poll tries again.
    }
  }

  Future<void> _loadOlder() async {
    final cursor = _older;
    if (cursor == null) return;
    _older = null;
    final page = await _api.messages(widget.id, cursor: cursor);
    if (!mounted) return;
    setState(() {
      _messages = [...page.items.reversed, ..._messages];
      _older = page.nextCursor;
    });
  }

  void _markRead() {
    final last = _messages.lastOrNull;
    if (last != null) {
      unawaited(_api.read(widget.id, messageId: last.id).catchError((_) {}));
    }
  }

  Future<void> _send() async {
    final body = _text.text.trim();
    if ((body.isEmpty && _photos.isEmpty) || _sending) return;
    setState(() => _sending = true);
    try {
      final m = await _api.send(
        widget.id,
        body,
        photos: _photos,
        replyToId: _replyTo?.id,
      );
      _text.clear();
      setState(() {
        _messages = [..._messages, m];
        _photos = [];
        _replyTo = null;
      });
    } on ApiException catch (e) {
      if (mounted) {
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
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickPhotos() async {
    final left = ThreadPage.maxPhotos - _photos.length;
    if (left <= 0) return;
    final picked = await ref.read(mediaPickerProvider).photos(left);
    setState(() => _photos = [..._photos, ...picked.take(left)]);
  }

  Future<void> _onMessage(Message m, bool mine) async {
    if (m.deleted) return;
    final l = context.l10n;
    final choice = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              key: const ValueKey('msg-reply'),
              leading: const Sym(Symbols.reply_rounded),
              title: Text(l.postReply),
              onTap: () => Navigator.pop(sheet, 'reply'),
            ),
            if (mine)
              ListTile(
                key: const ValueKey('msg-delete'),
                leading: const Sym(Symbols.delete_rounded),
                title: Text(l.postDelete),
                onTap: () => Navigator.pop(sheet, 'delete'),
              ),
          ],
        ),
      ),
    );
    switch (choice) {
      case 'reply':
        setState(() => _replyTo = m);
      case 'delete':
        await _api.deleteMessage(widget.id, m.id);
        setState(
          () => _messages = [
            for (final x in _messages)
              x.id == m.id
                  ? Message(
                      id: x.id,
                      conversationId: x.conversationId,
                      author: x.author,
                      body: '',
                      deleted: true,
                      createdAt: x.createdAt,
                    )
                  : x,
          ],
        );
    }
  }

  Future<void> _menu() async {
    final c = _c;
    if (c == null) return;
    final l = context.l10n;
    final choice = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              key: const ValueKey('msg-mute'),
              leading: Sym(
                c.muted
                    ? Symbols.notifications_rounded
                    : Symbols.notifications_off_rounded,
              ),
              title: Text(c.muted ? l.msgUnmute : l.msgMute),
              onTap: () => Navigator.pop(sheet, 'mute'),
            ),
            if (c.isGroup)
              ListTile(
                key: const ValueKey('msg-rename'),
                leading: const Sym(Symbols.edit_rounded),
                title: Text(l.msgRename),
                onTap: () => Navigator.pop(sheet, 'rename'),
              ),
            ListTile(
              key: const ValueKey('msg-report'),
              leading: const Sym(Symbols.flag_rounded),
              title: Text(l.msgReport),
              onTap: () => Navigator.pop(sheet, 'report'),
            ),
            ListTile(
              key: const ValueKey('msg-leave'),
              leading: const Sym(Symbols.logout_rounded),
              title: Text(c.isGroup ? l.msgLeave : l.msgHide),
              onTap: () => Navigator.pop(sheet, 'leave'),
            ),
          ],
        ),
      ),
    );
    if (!mounted) return;
    switch (choice) {
      case 'mute':
        final u = await _api.update(c.id, muted: !c.muted);
        setState(() => _c = u);
      case 'rename':
        final title = await _ask(l.msgRename, c.title ?? '');
        if (title == null || title.isEmpty) return;
        final u = await _api.update(c.id, title: title);
        setState(() => _c = u);
      case 'report':
        await showReportSheet(
          context,
          targetType: 'conversation',
          targetId: c.id,
          send: (reason, note) => _api.report(c.id, reason, note: note),
        );
      case 'leave':
        await _api.leave(c.id);
        ref.invalidate(conversationsProvider);
        if (mounted) context.pop();
    }
  }

  Future<String?> _ask(String title, String value) {
    final t = TextEditingController(text: value);
    return showDialog<String>(
      context: context,
      builder: (d) => AlertDialog(
        title: Text(title),
        content: TextField(
          key: const ValueKey('msg-rename-field'),
          controller: t,
          maxLength: 80,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(d),
            child: Text(context.l10n.commonCancel),
          ),
          TextButton(
            key: const ValueKey('msg-rename-save'),
            onPressed: () => Navigator.pop(d, t.text.trim()),
            child: Text(context.l10n.commonSave),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final me = ref.watch(meProvider)?.member.id;
    final c = _c;
    final others = c?.others(me) ?? const [];
    // The newest message of mine every other member has read.
    String? seenId;
    if (c != null && others.isNotEmpty) {
      final reads = [for (final o in others) c.readBy[o.id]];
      for (final m in _messages.reversed) {
        if (m.author.id != me) continue;
        final i = _messages.indexOf(m);
        final everyone = reads.every((r) {
          if (r == null) return false;
          final ri = _messages.indexWhere((x) => x.id == r);
          return ri >= i;
        });
        if (everyone) seenId = m.id;
        break;
      }
    }
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: GestureDetector(
          onTap: c != null && !c.isGroup && others.isNotEmpty
              ? () => context.push(Paths.member(others.first.id))
              : null,
          child: Text(
            c?.name(me) ?? '',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        actions: [
          IconButton(
            key: const ValueKey('msg-menu'),
            tooltip: l.postMore,
            onPressed: _menu,
            icon: const Sym(Symbols.more_vert_rounded),
          ),
        ],
      ),
      body: _error != null
          ? Center(child: Text(l.commonError))
          : c == null
          ? const Center(child: CircularProgressIndicator(color: Brand.orange))
          : Column(
              children: [
                Expanded(
                  child: NotificationListener<ScrollNotification>(
                    onNotification: (n) {
                      if (n.metrics.extentAfter < 200) _loadOlder();
                      return false;
                    },
                    child: ListView.builder(
                      key: const ValueKey('msg-list'),
                      reverse: true,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      itemCount: _messages.length,
                      itemBuilder: (context, i) {
                        final m = _messages[_messages.length - 1 - i];
                        final mine = m.author.id == me;
                        return _Bubble(
                          message: m,
                          mine: mine,
                          showName: c.isGroup && !mine,
                          seen: m.id == seenId,
                          onLongPress: () => _onMessage(m, mine),
                        );
                      },
                    ),
                  ),
                ),
                if (c.blocked)
                  Container(
                    key: const ValueKey('msg-blocked'),
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    color: p.card,
                    child: SafeArea(
                      top: false,
                      child: Text(
                        l.msgBlocked,
                        textAlign: TextAlign.center,
                        style: TextStyle(color: p.muted),
                      ),
                    ),
                  )
                else
                  _Composer(
                    controller: _text,
                    photos: _photos,
                    replyTo: _replyTo,
                    sending: _sending,
                    onPhotos: _pickPhotos,
                    onRemovePhoto: (i) =>
                        setState(() => _photos = [..._photos]..removeAt(i)),
                    onCancelReply: () => setState(() => _replyTo = null),
                    onSend: _send,
                  ),
              ],
            ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    required this.message,
    required this.mine,
    required this.showName,
    required this.seen,
    required this.onLongPress,
  });

  final Message message;
  final bool mine;
  final bool showName;
  final bool seen;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final m = message;
    final fg = mine ? Colors.white : p.ink;
    final time = m.createdAt == null
        ? ''
        : intl.DateFormat.Hm().format(m.createdAt!.toLocal());
    return Align(
      alignment: mine
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: GestureDetector(
        key: ValueKey('msg-${m.id}'),
        onLongPress: onLongPress,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * .76,
          ),
          margin: const EdgeInsets.symmetric(vertical: 3),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
          decoration: BoxDecoration(
            color: mine ? Brand.orange : p.card,
            borderRadius: BorderRadius.circular(12),
            border: mine ? null : Border.all(color: p.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showName)
                Text(
                  m.author.name,
                  style: const TextStyle(
                    color: Brand.orange,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              if (m.replyTo case final r?)
                Container(
                  margin: const EdgeInsets.only(bottom: 6, top: 2),
                  padding: const EdgeInsetsDirectional.fromSTEB(8, 4, 8, 4),
                  decoration: BoxDecoration(
                    color: mine ? const Color(0x33FFFFFF) : p.screen,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${r.authorName}: ${r.excerpt}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: fg, fontSize: 12.5),
                  ),
                ),
              if (m.photos.isNotEmpty && !m.deleted)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      for (final ph in m.photos)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image(
                            image: imageOf(ph),
                            width: m.photos.length == 1 ? 200 : 96,
                            height: m.photos.length == 1 ? 150 : 96,
                            fit: BoxFit.cover,
                          ),
                        ),
                    ],
                  ),
                ),
              if (m.deleted)
                Text(
                  l.msgDeleted,
                  style: TextStyle(
                    color: fg.withValues(alpha: .7),
                    fontStyle: FontStyle.italic,
                    fontSize: 14,
                  ),
                )
              else if (m.body.isNotEmpty)
                Text(
                  m.body,
                  style: TextStyle(color: fg, fontSize: 14.5, height: 1.4),
                ),
              const SizedBox(height: 2),
              Text(
                seen ? '$time · ${l.msgSeen}' : time,
                key: seen ? const ValueKey('msg-seen') : null,
                style: TextStyle(
                  color: fg.withValues(alpha: .7),
                  fontSize: 10.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.photos,
    required this.replyTo,
    required this.sending,
    required this.onPhotos,
    required this.onRemovePhoto,
    required this.onCancelReply,
    required this.onSend,
  });

  final TextEditingController controller;
  final List<String> photos;
  final Message? replyTo;
  final bool sending;
  final VoidCallback onPhotos;
  final ValueChanged<int> onRemovePhoto;
  final VoidCallback onCancelReply;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    return Container(
      decoration: BoxDecoration(
        color: p.card,
        border: Border(top: BorderSide(color: p.line)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (replyTo case final r?)
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(16, 6, 4, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        l.postReplyingTo(r.author.name),
                        style: TextStyle(color: p.muted, fontSize: 12.5),
                      ),
                    ),
                    IconButton(
                      onPressed: onCancelReply,
                      icon: Sym(
                        Symbols.close_rounded,
                        size: 18,
                        color: p.muted,
                      ),
                    ),
                  ],
                ),
              ),
            if (photos.isNotEmpty)
              SizedBox(
                height: 64,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                  children: [
                    for (final (i, f) in photos.indexed)
                      Padding(
                        padding: const EdgeInsetsDirectional.only(end: 6),
                        child: GestureDetector(
                          onTap: () => onRemovePhoto(i),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image(
                              key: ValueKey('msg-photo-$i'),
                              image: imageOf(f),
                              width: 56,
                              height: 56,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 8, 8),
              child: Row(
                children: [
                  IconButton(
                    key: const ValueKey('msg-photos'),
                    tooltip: l.msgPhoto,
                    onPressed: photos.length < ThreadPage.maxPhotos
                        ? onPhotos
                        : null,
                    icon: Sym(Symbols.photo_library_rounded, color: p.muted),
                  ),
                  Expanded(
                    child: TextField(
                      key: const ValueKey('msg-field'),
                      controller: controller,
                      minLines: 1,
                      maxLines: 5,
                      maxLength: 4000,
                      decoration: InputDecoration(
                        hintText: l.msgHint,
                        counterText: '',
                        isDense: true,
                        filled: true,
                        fillColor: p.screen,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: p.line),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    key: const ValueKey('msg-send'),
                    tooltip: l.postSend,
                    onPressed: sending ? null : onSend,
                    icon: const Sym(
                      Symbols.send_rounded,
                      fill: true,
                      color: Brand.orange,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
