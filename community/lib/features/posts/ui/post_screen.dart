import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/session.dart';
import '../../../core/format.dart';
import '../../../core/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/sym.dart';
import '../../social/report_sheet.dart';
import '../data/posts_api.dart';
import '../posts_state.dart';
import 'post_card.dart';

/// A post's page: the post, its comments with one level of replies, and the
/// box to comment or reply.
class PostScreen extends ConsumerStatefulWidget {
  const PostScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<PostScreen> createState() => _PostScreenState();
}

class _PostScreenState extends ConsumerState<PostScreen> {
  final _text = TextEditingController();
  final _focus = FocusNode();
  Comment? _replyTo;
  var _sending = false;

  @override
  void dispose() {
    _text.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _send(Post post) async {
    final body = _text.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(postsApiProvider)
          .comment(post.id, body, parentId: _replyTo?.id);
      ref.read(postStateProvider(post).notifier).commented();
      _text.clear();
      setState(() => _replyTo = null);
      ref.invalidate(commentsProvider(post.id));
    } on Object {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(context.l10n.commonError)));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final post = ref.watch(postProvider(widget.id));
    final comments = ref.watch(commentsProvider(widget.id));
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(l.postTitle),
      ),
      body: switch (post) {
        AsyncData(value: final post) => Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.only(top: 4, bottom: 16),
                children: [
                  PostCard(post: post, open: false),
                  ...switch (comments) {
                    AsyncData(:final value) => [
                      if (value.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(
                            l.postNoComments,
                            textAlign: TextAlign.center,
                            style: TextStyle(color: p.muted),
                          ),
                        ),
                      for (final c in value) ...[
                        _CommentTile(
                          comment: c,
                          onReply: () {
                            setState(() => _replyTo = c);
                            _focus.requestFocus();
                          },
                        ),
                        for (final r in c.replies)
                          _CommentTile(comment: r, reply: true),
                      ],
                    ],
                    AsyncError() => [Center(child: Text(l.commonError))],
                    _ => [
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(
                          child: CircularProgressIndicator(color: Brand.orange),
                        ),
                      ),
                    ],
                  },
                ],
              ),
            ),
            _CommentBox(
              controller: _text,
              focus: _focus,
              replyTo: _replyTo,
              sending: _sending,
              onCancelReply: () => setState(() => _replyTo = null),
              onSend: () => _send(post),
            ),
          ],
        ),
        AsyncError() => Center(child: Text(l.commonError)),
        _ => const Center(
          child: CircularProgressIndicator(color: Brand.orange),
        ),
      },
    );
  }
}

class _CommentTile extends ConsumerStatefulWidget {
  const _CommentTile({required this.comment, this.reply = false, this.onReply});

  final Comment comment;
  final bool reply;
  final VoidCallback? onReply;

  @override
  ConsumerState<_CommentTile> createState() => _CommentTileState();
}

class _CommentTileState extends ConsumerState<_CommentTile> {
  late var _liked = widget.comment.liked;
  late var _likes = widget.comment.likeCount;

  Future<void> _like() async {
    final was = (_liked, _likes);
    setState(() {
      _liked = !_liked;
      _likes += _liked ? 1 : -1;
    });
    try {
      await ref
          .read(postsApiProvider)
          .likeComment(widget.comment.id, on: _liked);
    } on Object {
      setState(() {
        _liked = was.$1;
        _likes = was.$2;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final c = widget.comment;
    final lang = ref.watch(languageProvider);
    final mine = ref.watch(meProvider)?.member.id == c.author.id;
    return Padding(
      key: ValueKey('comment-${c.id}'),
      padding: EdgeInsetsDirectional.fromSTEB(widget.reply ? 62 : 16, 6, 8, 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => context.push(Paths.member(c.author.id)),
            child: Avatar(
              id: c.author.id,
              name: c.author.name,
              url: c.author.avatarUrl,
              size: widget.reply ? 28 : 34,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 9),
                  decoration: BoxDecoration(
                    color: p.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: p.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c.author.name,
                        style: TextStyle(
                          color: p.ink,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        c.body,
                        style: TextStyle(
                          color: p.ink,
                          fontSize: 14,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    Text(
                      ago(c.createdAt, lang: lang),
                      style: TextStyle(color: p.muted, fontSize: 12),
                    ),
                    _Small(
                      key: ValueKey('comment-like-${c.id}'),
                      label: _likes > 0
                          ? '${l.postLike} · $_likes'
                          : l.postLike,
                      on: _liked,
                      onTap: _like,
                    ),
                    if (widget.onReply != null)
                      _Small(
                        key: ValueKey('comment-reply-${c.id}'),
                        label: l.postReply,
                        onTap: widget.onReply!,
                      ),
                    _Small(
                      label: mine ? l.postDelete : l.postReport,
                      onTap: () async {
                        if (mine) {
                          await ref.read(postsApiProvider).deleteComment(c.id);
                          ref.invalidate(commentsProvider);
                        } else {
                          await showReportSheet(
                            context,
                            targetType: 'comment',
                            targetId: c.id,
                          );
                        }
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Small extends StatelessWidget {
  const _Small({
    super.key,
    required this.label,
    required this.onTap,
    this.on = false,
  });

  final String label;
  final VoidCallback onTap;
  final bool on;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(8),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Text(
        label,
        style: TextStyle(
          color: on ? Brand.orange : context.palette.muted,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
  );
}

class _CommentBox extends StatelessWidget {
  const _CommentBox({
    required this.controller,
    required this.focus,
    required this.replyTo,
    required this.sending,
    required this.onCancelReply,
    required this.onSend,
  });

  final TextEditingController controller;
  final FocusNode focus;
  final Comment? replyTo;
  final bool sending;
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
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      key: const ValueKey('comment-field'),
                      controller: controller,
                      focusNode: focus,
                      minLines: 1,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: l.postCommentHint,
                        isDense: true,
                        filled: true,
                        fillColor: p.screen,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: p.line),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: p.line),
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    key: const ValueKey('comment-send'),
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
