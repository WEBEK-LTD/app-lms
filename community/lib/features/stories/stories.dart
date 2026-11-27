import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/avatar.dart';
import '../../core/widgets/images.dart';
import '../../core/widgets/sym.dart';
import '../posts/data/posts_api.dart';
import '../posts/posts_state.dart';
import '../posts/ui/composer_screen.dart';

/// 232.2 Stories on Home: "Your story" first, then the members followed;
/// an orange ring while unseen, a grey one once seen.
class StoryRow extends ConsumerWidget {
  const StoryRow({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final me = ref.watch(meProvider)?.member;
    final rings = ref.watch(storyRingsProvider).value ?? const <StoryRing>[];
    final mine = [
      for (final r in rings)
        if (r.member.id == me?.id) r,
    ];
    final others = [
      for (final r in rings)
        if (r.member.id != me?.id) r,
    ];
    return SizedBox(
      height: 92,
      child: ListView(
        key: const ValueKey('story-row'),
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        children: [
          if (me != null)
            _Ring(
              key: const ValueKey('story-mine'),
              label: l.storyYours,
              id: me.id,
              name: me.name,
              url: me.avatarUrl,
              seen: true,
              add: mine.isEmpty,
              onTap: () => mine.isEmpty
                  ? addStory(context)
                  : openStories(context, mine, 0),
            ),
          for (final (i, r) in others.indexed)
            _Ring(
              key: ValueKey('story-${r.member.id}'),
              label: r.member.name.split(' ').first,
              id: r.member.id,
              name: r.member.name,
              url: r.member.avatarUrl,
              seen: r.allSeen,
              onTap: () => openStories(context, others, i),
            ),
        ],
      ),
    );
  }
}

class _Ring extends StatelessWidget {
  const _Ring({
    super.key,
    required this.label,
    required this.id,
    required this.name,
    required this.onTap,
    this.url,
    this.seen = false,
    this.add = false,
  });

  final String label;
  final String id;
  final String name;
  final String? url;
  final bool seen;
  final bool add;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width: 70,
          child: Column(
            children: [
              Stack(
                children: [
                  Container(
                    width: 62,
                    height: 62,
                    padding: const EdgeInsets.all(2.5),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: seen ? p.line : Brand.orange,
                    ),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: p.screen, width: 2.5),
                      ),
                      child: Avatar(id: id, name: name, url: url, size: 52),
                    ),
                  ),
                  if (add)
                    PositionedDirectional(
                      end: 0,
                      bottom: 0,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Brand.orange,
                          shape: BoxShape.circle,
                          border: Border.all(color: p.screen, width: 2),
                        ),
                        child: const Sym(
                          Symbols.add_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 5),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w500,
                  color: p.dark ? p.soft : const Color(0xFF3C3A50),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A photo, or a video with its poster, for 24 hours.
Future<void> addStory(BuildContext context) async {
  final l = context.l10n;
  final c = ProviderScope.containerOf(context);
  final kind = await showModalBottomSheet<String>(
    context: context,
    useRootNavigator: true,
    builder: (sheet) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            key: const ValueKey('story-add-photo'),
            leading: const Sym(Symbols.photo_camera_rounded),
            title: Text(l.storyAddPhoto),
            onTap: () => Navigator.pop(sheet, 'photo'),
          ),
          ListTile(
            key: const ValueKey('story-add-video'),
            leading: const Sym(Symbols.videocam_rounded),
            title: Text(l.storyAddVideo),
            onTap: () => Navigator.pop(sheet, 'video'),
          ),
        ],
      ),
    ),
  );
  if (kind == null) return;
  final picker = c.read(mediaPickerProvider);
  final api = c.read(postsApiProvider);
  try {
    if (kind == 'photo') {
      final photo = await picker.photo();
      if (photo == null) return;
      await api.addStory(photo: photo);
    } else {
      final video = await picker.video();
      if (video == null) return;
      final poster = await picker.photo();
      if (poster == null) return;
      await api.addStory(video: video, poster: poster);
    }
    c.invalidate(storyRingsProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l.storyAdded)));
    }
  } on Object {
    if (context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l.commonError)));
    }
  }
}

Future<void> openStories(
  BuildContext context,
  List<StoryRing> rings,
  int start,
) => Navigator.of(context, rootNavigator: true).push(
  PageRouteBuilder<void>(
    opaque: true,
    pageBuilder: (_, _, _) => StoryViewer(rings: rings, start: start),
  ),
);

/// One ring's stories after another, five seconds each; a tap on the
/// start side goes back, on the end side forward.
class StoryViewer extends ConsumerStatefulWidget {
  const StoryViewer({super.key, required this.rings, this.start = 0});

  final List<StoryRing> rings;
  final int start;

  static const each = Duration(seconds: 5);

  @override
  ConsumerState<StoryViewer> createState() => _StoryViewerState();
}

class _StoryViewerState extends ConsumerState<StoryViewer>
    with SingleTickerProviderStateMixin {
  late var _ring = widget.start;
  var _at = 0;
  late final _clock =
      AnimationController(vsync: this, duration: StoryViewer.each)
        ..addStatusListener((s) {
          if (s == AnimationStatus.completed) _step(1);
        });

  StoryRing get ring => widget.rings[_ring];
  Story get story => ring.stories[_at];

  @override
  void initState() {
    super.initState();
    _show();
  }

  @override
  void dispose() {
    _clock.dispose();
    super.dispose();
  }

  void _show() {
    _clock.forward(from: 0);
    final me = ref.read(meProvider)?.member.id;
    if (story.author.id != me) {
      unawaited(
        ref.read(postsApiProvider).viewStory(story.id).catchError((_) {}),
      );
    }
  }

  void _step(int by) {
    var at = _at + by;
    var r = _ring;
    if (at >= ring.stories.length) {
      r++;
      at = 0;
    } else if (at < 0) {
      r--;
      at = r >= 0 ? widget.rings[r].stories.length - 1 : 0;
    }
    if (r < 0 || r >= widget.rings.length) {
      ref.invalidate(storyRingsProvider);
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      _ring = r;
      _at = at;
    });
    _show();
  }

  Future<void> _viewers() async {
    _clock.stop();
    final viewers = await ref.read(postsApiProvider).storyViewers(story.id);
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: ListView(
          key: const ValueKey('story-viewers'),
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                context.l10n.storyViews(story.viewCount),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
            for (final m in viewers.items)
              ListTile(
                leading: Avatar(id: m.id, name: m.name, url: m.avatarUrl),
                title: Text(m.name),
              ),
          ],
        ),
      ),
    );
    _clock.forward();
  }

  Future<void> _delete() async {
    _clock.stop();
    await ref.read(postsApiProvider).deleteStory(story.id);
    ref.invalidate(storyRingsProvider);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final lang = ref.watch(languageProvider);
    final mine = ref.watch(meProvider)?.member.id == story.author.id;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Scaffold(
      key: const ValueKey('story-viewer'),
      backgroundColor: Brand.darkPaper,
      body: GestureDetector(
        onTapUp: (d) {
          final w = MediaQuery.sizeOf(context).width;
          final startSide = rtl
              ? d.localPosition.dx > w / 3 * 2
              : d.localPosition.dx < w / 3;
          _step(startSide ? -1 : 1);
        },
        onLongPressStart: (_) => _clock.stop(),
        onLongPressEnd: (_) => _clock.forward(),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image(image: imageOf(story.media.still), fit: BoxFit.contain),
            if (story.media.isVideo)
              Center(
                child: IconButton(
                  iconSize: 56,
                  onPressed: () => launchUrl(
                    Uri.parse(story.media.url),
                    mode: LaunchMode.externalApplication,
                  ),
                  icon: const Sym(
                    Symbols.play_circle_rounded,
                    fill: true,
                    color: Colors.white,
                  ),
                ),
              ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        for (var i = 0; i < ring.stories.length; i++)
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 2,
                              ),
                              child: AnimatedBuilder(
                                animation: _clock,
                                builder: (_, _) => LinearProgressIndicator(
                                  minHeight: 2.5,
                                  borderRadius: BorderRadius.circular(2),
                                  backgroundColor: const Color(0x52FFFFFF),
                                  color: Colors.white,
                                  value: i < _at
                                      ? 1
                                      : i == _at
                                      ? _clock.value
                                      : 0,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Avatar(
                          id: story.author.id,
                          name: story.author.name,
                          url: story.author.avatarUrl,
                          size: 32,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${story.author.name}  ${ago(story.createdAt, lang: lang)}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                        if (mine)
                          IconButton(
                            key: const ValueKey('story-delete'),
                            tooltip: l.postDelete,
                            onPressed: _delete,
                            icon: const Sym(
                              Symbols.delete_rounded,
                              color: Colors.white,
                            ),
                          ),
                        IconButton(
                          key: const ValueKey('story-close'),
                          tooltip: l.commonClose,
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Sym(
                            Symbols.close_rounded,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            if (mine)
              PositionedDirectional(
                start: 16,
                bottom: 24 + MediaQuery.paddingOf(context).bottom,
                child: TextButton.icon(
                  key: const ValueKey('story-views'),
                  onPressed: _viewers,
                  icon: const Sym(
                    Symbols.visibility_rounded,
                    color: Colors.white,
                  ),
                  label: Text(
                    l.storyViews(story.viewCount),
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
