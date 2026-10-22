import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/file_viewer.dart';
import '../../lms/downloads/download_widgets.dart' show formatBytes;
import '../../lms/lesson/video/video_screen.dart';

/// 77 "14:05" today, "12 Oct, 14:05" before, in the device's time zone.
String chatTime(BuildContext context, DateTime time, {DateTime? now}) {
  final locale = Localizations.localeOf(context).languageCode;
  final local = time.toLocal();
  final today = (now ?? DateTime.now()).toLocal();
  final sameDay =
      local.year == today.year &&
      local.month == today.month &&
      local.day == today.day;
  return sameDay
      ? DateFormat.Hm(locale).format(local)
      : DateFormat.MMMd(locale).add_Hm().format(local);
}

/// What a message says in a list or a notification: its text, or the kind
/// of file it carries.
String chatMessageText(AppLocalizations l10n, ChatMessage m) {
  if (m.deleted) return l10n.chatDeleted;
  final text = m.text?.trim() ?? '';
  if (text.isNotEmpty) return text;
  return switch (m.attachment?.kind) {
    ChatAttachmentKind.image => l10n.chatPhoto,
    ChatAttachmentKind.video => l10n.chatVideo,
    ChatAttachmentKind.audio => l10n.chatVoice,
    ChatAttachmentKind.file => l10n.chatFile,
    null => '',
  };
}

/// The last message under a conversation's name: "You: …" for one's own,
/// the sender's name in a group.
String chatPreview(AppLocalizations l10n, ChatConversation c) {
  final m = c.lastMessage;
  if (m == null) {
    return c.isGroup && c.memberCount != null
        ? l10n.chatMemberCount(c.memberCount!)
        : l10n.chatStart;
  }
  final text = chatMessageText(l10n, m);
  if (m.mine) return l10n.messageFromYou(text);
  if (c.isGroup) return l10n.chatMessageFrom(m.sender.name, text);
  return text;
}

/// One message: one's own at the end, others' at the start with their name
/// in a group. A long press opens what can be done with it.
class ChatBubble extends StatelessWidget {
  const ChatBubble({
    super.key,
    required this.message,
    required this.showSender,
    this.onLongPress,
  });

  final ChatMessage message;
  final bool showSender;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final m = message;
    final mine = m.mine;
    final fg = mine ? p.onPrimary : p.text;
    final text = m.text?.trim() ?? '';
    final said = chatMessageText(l10n, m);
    return Align(
      alignment: mine
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.8,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Semantics(
            label: [
              mine ? l10n.messageFromYou(said) : '${m.sender.name}: $said',
              chatTime(context, m.createdAt),
            ].join(', '),
            onLongPressHint: onLongPress == null ? null : l10n.chatMore,
            child: GestureDetector(
              onLongPress: onLongPress,
              child: Container(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
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
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (showSender && !mine)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: ExcludeSemantics(
                          child: Text(
                            m.sender.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: m.sender.isBusiness ? p.link : p.accent,
                            ),
                          ),
                        ),
                      ),
                    if (m.deleted)
                      ExcludeSemantics(
                        child: Text(
                          l10n.chatDeleted,
                          style: TextStyle(
                            fontSize: 14,
                            fontStyle: FontStyle.italic,
                            color: fg.withValues(alpha: 0.75),
                          ),
                        ),
                      )
                    else ...[
                      if (m.attachment != null)
                        Padding(
                          padding: EdgeInsets.only(
                            top: 2,
                            bottom: text.isEmpty ? 2 : 6,
                          ),
                          child: ChatAttachmentView(
                            attachment: m.attachment!,
                            mine: mine,
                          ),
                        ),
                      if (text.isNotEmpty)
                        ExcludeSemantics(
                          child: Text(
                            text,
                            style: TextStyle(
                              fontSize: 15,
                              height: 1.4,
                              color: fg,
                            ),
                          ),
                        ),
                    ],
                    const SizedBox(height: 2),
                    ExcludeSemantics(
                      child: Text(
                        chatTime(context, m.createdAt),
                        style: TextStyle(
                          fontSize: 11,
                          color: mine
                              ? p.onPrimary.withValues(alpha: 0.75)
                              : p.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A picture (opens full size), a video (opens the player), a voice message
/// (plays here) or a file (opens in the app's viewer, or another app).
class ChatAttachmentView extends ConsumerWidget {
  const ChatAttachmentView({
    super.key,
    required this.attachment,
    required this.mine,
  });

  final ChatAttachment attachment;
  final bool mine;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final a = attachment;
    final fg = mine ? p.onPrimary : p.text;
    switch (a.kind) {
      case ChatAttachmentKind.image:
        return Semantics(
          button: true,
          label: l10n.chatPhoto,
          child: GestureDetector(
            onTap: () => openInViewer(
              context,
              name: a.name,
              mimeType: a.contentType,
              load: () => ref.read(attachmentFetcherProvider)(a.url),
            ),
            child: AppNetworkImage(
              url: a.url,
              width: 220,
              height: 220,
              radius: 12,
              fit: BoxFit.cover,
            ),
          ),
        );
      case ChatAttachmentKind.video:
        return Semantics(
          button: true,
          label: l10n.playVideo,
          excludeSemantics: true,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute<void>(
                builder: (_) => VideoScreen(url: a.url, title: a.name),
              ),
            ),
            child: Container(
              width: 220,
              height: 130,
              decoration: BoxDecoration(
                color: BrandColors.midnight,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: const AppIcon(
                AppIcons.playCircle,
                size: 48,
                color: BrandColors.white,
                filled: true,
              ),
            ),
          ),
        );
      case ChatAttachmentKind.audio:
        return VoiceMessagePlayer(
          url: a.url,
          durationSeconds: a.durationSeconds,
          color: fg,
        );
      case ChatAttachmentKind.file:
        return Semantics(
          button: true,
          label: l10n.chatOpenFile(a.name),
          excludeSemantics: true,
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () {
              final kind = viewerKindOf(a.name, a.contentType);
              if (kind == ViewerKind.other) {
                unawaited(openExternal(a.url));
              } else {
                unawaited(
                  openInViewer(
                    context,
                    name: a.name,
                    mimeType: a.contentType,
                    load: () => ref.read(attachmentFetcherProvider)(a.url),
                  ),
                );
              }
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcon(AppIcons.file, size: 28, color: fg),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          a.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: fg,
                            decoration: TextDecoration.underline,
                            decorationColor: fg,
                          ),
                        ),
                        if (a.sizeBytes > 0)
                          Text(
                            formatBytes(a.sizeBytes),
                            style: TextStyle(
                              fontSize: 12,
                              color: fg.withValues(alpha: 0.75),
                            ),
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
}

/// A voice message: play and pause, how far it got and how long it is.
class VoiceMessagePlayer extends StatefulWidget {
  const VoiceMessagePlayer({
    super.key,
    required this.url,
    required this.color,
    this.durationSeconds,
  });

  final String url;
  final Color color;
  final int? durationSeconds;

  @override
  State<VoiceMessagePlayer> createState() => _VoiceMessagePlayerState();
}

class _VoiceMessagePlayerState extends State<VoiceMessagePlayer> {
  AudioPlayer? _player;
  final _subscriptions = <StreamSubscription<Object?>>[];
  bool _playing = false;
  Duration _position = Duration.zero;
  Duration? _duration;

  @override
  void dispose() {
    for (final s in _subscriptions) {
      unawaited(s.cancel());
    }
    unawaited(_player?.dispose());
    super.dispose();
  }

  AudioPlayer _ready() {
    final existing = _player;
    if (existing != null) return existing;
    final player = AudioPlayer();
    _subscriptions.addAll([
      player.onPlayerStateChanged.listen((state) {
        if (mounted) setState(() => _playing = state == PlayerState.playing);
      }),
      player.onPositionChanged.listen((position) {
        if (mounted) setState(() => _position = position);
      }),
      player.onDurationChanged.listen((duration) {
        if (mounted) setState(() => _duration = duration);
      }),
      player.onPlayerComplete.listen((_) {
        if (mounted) setState(() => _position = Duration.zero);
      }),
    ]);
    return _player = player;
  }

  Future<void> _toggle() async {
    final player = _ready();
    try {
      if (_playing) {
        await player.pause();
      } else if (player.source == null) {
        await player.play(UrlSource(widget.url));
      } else {
        await player.resume();
      }
    } on Object {
      if (mounted) setState(() => _playing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final total =
        _duration ??
        (widget.durationSeconds == null
            ? null
            : Duration(seconds: widget.durationSeconds!));
    final progress = total == null || total.inMilliseconds == 0
        ? 0.0
        : (_position.inMilliseconds / total.inMilliseconds).clamp(0.0, 1.0);
    return SizedBox(
      width: 220,
      child: Row(
        children: [
          IconButton(
            onPressed: _toggle,
            tooltip: _playing ? l10n.chatPauseVoice : l10n.chatPlayVoice,
            icon: AppIcon(
              _playing ? AppIcons.pause : AppIcons.play,
              size: 30,
              color: widget.color,
              filled: true,
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 4,
                color: widget.color,
                backgroundColor: widget.color.withValues(alpha: 0.25),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            formatClock(
              _playing || _position > Duration.zero
                  ? _position
                  : (total ?? Duration.zero),
            ),
            style: TextStyle(fontSize: 12, color: widget.color),
          ),
        ],
      ),
    );
  }
}

/// A conversation's picture: the business's or course's, else its initials
/// (a group's icon for a group without one).
class ChatAvatar extends StatelessWidget {
  const ChatAvatar({super.key, required this.conversation, this.size = 48});

  final ChatConversation conversation;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final c = conversation;
    final image = c.imageUrl;
    if (image != null && image.isNotEmpty) {
      return AppNetworkImage(
        url: image,
        width: size,
        height: size,
        radius: size / 2,
      );
    }
    if (c.isGroup) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: p.accentSoft, shape: BoxShape.circle),
        alignment: Alignment.center,
        child: AppIcon(AppIcons.group, size: size * 0.5, color: p.text),
      );
    }
    return InitialsAvatar(name: c.title, size: size);
  }
}
