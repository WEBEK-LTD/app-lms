import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/auth/session.dart';
import '../../../core/format.dart';
import '../../../core/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/avatar.dart';
import '../../../core/widgets/badge_mark.dart';
import '../../../core/widgets/images.dart';
import '../../../core/widgets/sym.dart';
import '../../social/report_sheet.dart';
import '../data/posts_api.dart';
import '../posts_state.dart';

/// A post (232.1) in a feed or on its own page: the author, the words, the
/// photos (swiped) or the video's poster, the link's preview, and like,
/// comment, save, share and the more menu (report; delete for its author).
class PostCard extends ConsumerWidget {
  const PostCard({super.key, required this.post, this.open = true});

  final Post post;

  /// Whether a tap opens the post's page (false on that page).
  final bool open;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final lang = ref.watch(languageProvider);
    final live = ref.watch(postStateProvider(post));
    final mine = ref.watch(meProvider)?.member.id == post.author.id;
    final a = post.author;
    return GestureDetector(
      key: ValueKey('post-${post.id}'),
      onTap: open ? () => context.push(PostLinks.post(post.id)) : null,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: p.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: p.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(14, 12, 4, 8),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => context.push(Paths.member(a.id)),
                    child: Avatar(
                      id: a.id,
                      name: a.name,
                      url: a.avatarUrl,
                      size: 36,
                      team: a.team,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                a.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: p.ink,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            BadgeMark(a.badge),
                          ],
                        ),
                        Text(
                          [
                            ago(post.createdAt, lang: lang),
                            if (post.pending) l.postPending,
                          ].where((s) => s.isNotEmpty).join(' · '),
                          style: TextStyle(color: p.muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    key: ValueKey('post-more-${post.id}'),
                    tooltip: l.postMore,
                    icon: Sym(Symbols.more_horiz_rounded, color: p.muted),
                    onPressed: () => _more(context, ref, mine),
                  ),
                ],
              ),
            ),
            if (post.body.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
                child: Text(
                  post.body,
                  maxLines: open ? 6 : null,
                  overflow: open ? TextOverflow.ellipsis : null,
                  style: TextStyle(fontSize: 14.5, height: 1.5, color: p.ink),
                ),
              ),
            if (post.media.isNotEmpty) PostMedia(media: post.media),
            if (post.link case final link?) LinkCard(link: link),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 2, 6, 4),
              child: Row(
                children: [
                  _Action(
                    key: ValueKey('post-like-${post.id}'),
                    icon: Symbols.favorite_rounded,
                    on: live.liked,
                    onColor: Brand.orange,
                    label: count(live.likeCount),
                    tooltip: l.postLike,
                    onTap: () =>
                        ref.read(postStateProvider(post).notifier).toggleLike(),
                  ),
                  _Action(
                    key: ValueKey('post-comments-${post.id}'),
                    icon: Symbols.chat_bubble_rounded,
                    label: count(live.commentCount),
                    tooltip: l.postComments,
                    onTap: () => context.push(PostLinks.post(post.id)),
                  ),
                  const Spacer(),
                  _Action(
                    key: ValueKey('post-share-${post.id}'),
                    icon: Symbols.ios_share_rounded,
                    tooltip: l.postShare,
                    onTap: () => sharePost(context, post),
                  ),
                  _Action(
                    key: ValueKey('post-save-${post.id}'),
                    icon: Symbols.bookmark_rounded,
                    on: live.saved,
                    onColor: Brand.orange,
                    tooltip: l.postSave,
                    onTap: () =>
                        ref.read(postStateProvider(post).notifier).toggleSave(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _more(BuildContext context, WidgetRef ref, bool mine) async {
    final l = context.l10n;
    final choice = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (mine)
              ListTile(
                key: const ValueKey('post-delete'),
                leading: const Sym(Symbols.delete_rounded),
                title: Text(l.postDelete),
                onTap: () => Navigator.pop(sheet, 'delete'),
              ),
            if (!mine)
              ListTile(
                key: const ValueKey('post-report'),
                leading: const Sym(Symbols.flag_rounded),
                title: Text(l.postReport),
                onTap: () => Navigator.pop(sheet, 'report'),
              ),
          ],
        ),
      ),
    );
    if (!context.mounted) return;
    switch (choice) {
      case 'report':
        await showReportSheet(context, targetType: 'post', targetId: post.id);
      case 'delete':
        final sure = await showDialog<bool>(
          context: context,
          builder: (d) => AlertDialog(
            content: Text(l.postDeleteConfirm),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(d, false),
                child: Text(l.commonCancel),
              ),
              TextButton(
                key: const ValueKey('post-delete-yes'),
                onPressed: () => Navigator.pop(d, true),
                child: Text(l.postDelete),
              ),
            ],
          ),
        );
        if (sure != true) return;
        await ref.read(postsApiProvider).delete(post.id);
        ref.invalidate(feedProvider);
        if (context.mounted && !open) context.pop();
    }
  }
}

/// Copies the post's link (the website opens it for anyone).
Future<void> sharePost(BuildContext context, Post post) async {
  await Clipboard.setData(ClipboardData(text: post.shareUrl));
  if (context.mounted) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(context.l10n.postLinkCopied)));
  }
}

class _Action extends StatelessWidget {
  const _Action({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.label,
    this.on = false,
    this.onColor,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final String? label;
  final bool on;
  final Color? onColor;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = on ? (onColor ?? p.ink) : p.muted;
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Sym(icon, size: 21, fill: on, color: color),
              if (label != null) ...[
                const SizedBox(width: 5),
                Text(
                  label!,
                  style: TextStyle(
                    color: color,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
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

/// The photos, swiped, with a "2/5" counter; a video shows its poster and
/// plays in the system's player.
class PostMedia extends StatefulWidget {
  const PostMedia({super.key, required this.media});

  final List<Media> media;

  @override
  State<PostMedia> createState() => _PostMediaState();
}

class _PostMediaState extends State<PostMedia> {
  var _at = 0;

  @override
  Widget build(BuildContext context) {
    final media = widget.media;
    return AspectRatio(
      aspectRatio: 4 / 3,
      child: Stack(
        children: [
          PageView.builder(
            itemCount: media.length,
            onPageChanged: (i) => setState(() => _at = i),
            itemBuilder: (context, i) {
              final m = media[i];
              return GestureDetector(
                onTap: m.isVideo
                    ? () => launchUrl(
                        Uri.parse(m.url),
                        mode: LaunchMode.externalApplication,
                      )
                    : null,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ColoredBox(
                      color: Brand.darkNavy,
                      child: Image(image: imageOf(m.still), fit: BoxFit.cover),
                    ),
                    if (m.isVideo)
                      const Center(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: Color(0xB30E0D24),
                            shape: BoxShape.circle,
                          ),
                          child: Padding(
                            padding: EdgeInsets.all(12),
                            child: Sym(
                              Symbols.play_arrow_rounded,
                              size: 34,
                              fill: true,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
          if (media.length > 1)
            PositionedDirectional(
              top: 10,
              end: 10,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xB30E0D24),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  child: Text(
                    '${_at + 1}/${media.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class LinkCard extends StatelessWidget {
  const LinkCard({super.key, required this.link, this.onRemove});

  final LinkPreview link;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return GestureDetector(
      onTap: () =>
          launchUrl(Uri.parse(link.url), mode: LaunchMode.externalApplication),
      child: Container(
        margin: const EdgeInsets.fromLTRB(14, 2, 14, 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: p.dark ? Brand.darkSoft : Brand.lightSoft,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: p.line),
        ),
        child: Row(
          children: [
            if (link.imageUrl case final img?)
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 10),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image(
                    image: imageOf(img),
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 10),
                child: Sym(Symbols.link_rounded, color: p.muted),
              ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    link.host,
                    maxLines: 1,
                    style: TextStyle(color: p.muted, fontSize: 11.5),
                  ),
                  Text(
                    link.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: p.ink,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            if (onRemove != null)
              IconButton(
                onPressed: onRemove,
                icon: Sym(Symbols.close_rounded, size: 18, color: p.muted),
              ),
          ],
        ),
      ),
    );
  }
}
