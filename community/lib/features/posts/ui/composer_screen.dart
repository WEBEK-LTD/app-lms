import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/images.dart';
import '../../../core/widgets/sym.dart';
import '../data/posts_api.dart';
import '../posts_state.dart';
import 'post_card.dart';

/// Picks files: the device's gallery, or a test's choice.
abstract class MediaPicker {
  Future<List<String>> photos(int max);
  Future<String?> photo();
  Future<String?> video();
}

class _GalleryPicker implements MediaPicker {
  final _p = ImagePicker();

  @override
  Future<List<String>> photos(int max) async => [
    for (final f in await _p.pickMultiImage(limit: max, imageQuality: 85))
      f.path,
  ];

  @override
  Future<String?> photo() async =>
      (await _p.pickImage(source: ImageSource.gallery, imageQuality: 85))?.path;

  @override
  Future<String?> video() async => (await _p.pickVideo(
    source: ImageSource.gallery,
    maxDuration: const Duration(seconds: 60),
  ))?.path;
}

final mediaPickerProvider = Provider<MediaPicker>((ref) => _GalleryPicker());

final _urlIn = RegExp(r'https?://[^\s]+');

/// Write a post: words, up to 10 photos or one video with its poster, and a
/// preview of the first link. [groupId]: a group's post.
class ComposerScreen extends ConsumerStatefulWidget {
  const ComposerScreen({super.key, this.groupId});

  final String? groupId;

  @override
  ConsumerState<ComposerScreen> createState() => _ComposerScreenState();
}

class _ComposerScreenState extends ConsumerState<ComposerScreen> {
  final _text = TextEditingController();
  var _photos = <String>[];
  String? _video;
  String? _poster;
  LinkPreview? _link;
  String? _linkFor;
  String? _dropped;
  var _sending = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _text.addListener(_onText);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _text.dispose();
    super.dispose();
  }

  void _onText() {
    setState(() {});
    final url = _urlIn.firstMatch(_text.text)?.group(0);
    if (url == _linkFor || url == _dropped) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), () async {
      _linkFor = url;
      final preview = url == null
          ? null
          : await ref
                .read(postsApiProvider)
                .linkPreview(url)
                .catchError((Object _) => null);
      if (mounted && _linkFor == url) setState(() => _link = preview);
    });
  }

  bool get _ready =>
      !_sending &&
      (_text.text.trim().isNotEmpty || _photos.isNotEmpty || _video != null) &&
      (_video == null || _poster != null);

  Future<void> _addPhotos() async {
    final left = PostDraft.maxPhotos - _photos.length;
    if (left <= 0) return;
    final picked = await ref.read(mediaPickerProvider).photos(left);
    setState(() => _photos = [..._photos, ...picked.take(left)]);
  }

  Future<void> _addVideo() async {
    final picker = ref.read(mediaPickerProvider);
    final video = await picker.video();
    if (video == null) return;
    setState(() => _video = video);
    final poster = await picker.photo();
    if (mounted) setState(() => _poster = poster);
  }

  Future<void> _post() async {
    setState(() => _sending = true);
    try {
      await ref
          .read(postsApiProvider)
          .create(
            PostDraft(
              body: _text.text.trim(),
              photos: _photos,
              video: _video,
              poster: _poster,
              groupId: widget.groupId,
            ),
          );
      ref.invalidate(feedProvider);
      if (mounted) context.pop(true);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.message.isEmpty ? context.l10n.commonError : e.message,
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final hasMedia = _photos.isNotEmpty || _video != null;
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(l.postNew),
        actions: [
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 12),
            child: FilledButton(
              key: const ValueKey('composer-post'),
              style: FilledButton.styleFrom(
                backgroundColor: Brand.orange,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: _ready ? _post : null,
              child: Text(l.postPublish),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            key: const ValueKey('composer-text'),
            controller: _text,
            autofocus: true,
            minLines: 4,
            maxLines: 12,
            maxLength: 5000,
            style: TextStyle(color: p.ink, fontSize: 16, height: 1.5),
            decoration: InputDecoration(
              hintText: l.postHint,
              border: InputBorder.none,
              counterText: '',
            ),
          ),
          if (_link case final link? when !hasMedia)
            LinkCard(
              link: link,
              onRemove: () => setState(() {
                _dropped = link.url;
                _link = null;
              }),
            ),
          if (_photos.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final (i, f) in _photos.indexed)
                  _Thumb(
                    key: ValueKey('composer-photo-$i'),
                    file: f,
                    onRemove: () =>
                        setState(() => _photos = [..._photos]..removeAt(i)),
                  ),
              ],
            ),
          if (_video != null)
            Row(
              children: [
                _Thumb(
                  file: _poster,
                  icon: Symbols.movie_rounded,
                  onRemove: () => setState(() => _video = _poster = null),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _poster == null
                      ? TextButton(
                          onPressed: () async {
                            final poster = await ref
                                .read(mediaPickerProvider)
                                .photo();
                            setState(() => _poster = poster);
                          },
                          child: Text(l.postPickPoster),
                        )
                      : Text(
                          l.postVideoReady,
                          style: TextStyle(color: p.muted),
                        ),
                ),
              ],
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              OutlinedButton.icon(
                key: const ValueKey('composer-photos'),
                onPressed:
                    _video == null && _photos.length < PostDraft.maxPhotos
                    ? _addPhotos
                    : null,
                icon: const Sym(Symbols.photo_library_rounded, size: 20),
                label: Text(l.postPhotos(_photos.length, PostDraft.maxPhotos)),
                style: _outlined(p),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                key: const ValueKey('composer-video'),
                onPressed: _photos.isEmpty && _video == null ? _addVideo : null,
                icon: const Sym(Symbols.videocam_rounded, size: 20),
                label: Text(l.postVideo),
                style: _outlined(p),
              ),
            ],
          ),
        ],
      ),
    );
  }

  ButtonStyle _outlined(CommunityPalette p) => OutlinedButton.styleFrom(
    foregroundColor: p.ink,
    side: BorderSide(color: p.line),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
  );
}

class _Thumb extends StatelessWidget {
  const _Thumb({super.key, this.file, this.icon, required this.onRemove});

  final String? file;
  final IconData? icon;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 96,
    height: 96,
    child: Stack(
      children: [
        Positioned.fill(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: ColoredBox(
              color: Brand.darkNavy,
              child: file == null
                  ? Center(child: Sym(icon!, color: Colors.white))
                  : Image(image: imageOf(file!), fit: BoxFit.cover),
            ),
          ),
        ),
        PositionedDirectional(
          top: 4,
          end: 4,
          child: GestureDetector(
            onTap: onRemove,
            child: const DecoratedBox(
              decoration: BoxDecoration(
                color: Color(0xB30E0D24),
                shape: BoxShape.circle,
              ),
              child: Padding(
                padding: EdgeInsets.all(3),
                child: Sym(
                  Symbols.close_rounded,
                  size: 16,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
