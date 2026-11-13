import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/widgets/common.dart';
import 'content_blocks.dart' show GalleryViewer;
import 'page_actions.dart';

/// 129.5 A caption: its first line bold, the others under it.
class _Lines extends StatelessWidget {
  const _Lines({required this.caption});

  final String caption;

  @override
  Widget build(BuildContext context) {
    final lines = caption.split('\n');
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (j, line) in lines.indexed)
          Text(
            line,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Colors.white.withValues(alpha: j == 0 ? 1 : 0.9),
              fontSize: j == 0 ? 13 : 11,
              fontWeight: j == 0 ? FontWeight.w800 : FontWeight.w500,
            ),
          ),
      ],
    );
  }
}

/// 129.5 A caption in a frosted pill.
class _Pill extends StatelessWidget {
  const _Pill({required this.caption});

  final String caption;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(16),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
      child: ColoredBox(
        color: const Color(0x800E0D24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          child: _Lines(caption: caption),
        ),
      ),
    ),
  );
}

/// 129.5 A gallery on a Studio page (`gallery`; Studio's canvas:
/// components/studio/premium-motion.tsx): its photos in masonry columns of
/// different heights, as a bento (a big tile beside two small ones, then a
/// wide one) or as a filmstrip of tall tiles that scrolls sideways, their
/// captions over them when the owner asked; a tap opens them full screen
/// ([GalleryViewer]: swipe through them, pinch to zoom, each with its
/// caption).
class StudioGallery extends ConsumerWidget {
  const StudioGallery({super.key, required this.node});

  final StudioNode node;

  /// A masonry tile's shape (width over height) by its place, as Studio's
  /// canvas draws it (`MASONRY_RATIOS`).
  static const masonryRatios = [0.8, 1.15, 1.0, 0.75, 1.25, 0.9];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final images = node.images;
    Widget tile(BuildContext context, int i) => _photo(context, ref, i);
    final gap = node.gap;
    return switch (node.galleryLayout) {
      StudioGalleryLayout.filmstrip => SizedBox(
        height: node.height?.fixed ?? 220,
        child: ListView.separated(
          key: ValueKey('studio-gallery-${node.id}'),
          scrollDirection: Axis.horizontal,
          physics: const PageScrollPhysics(parent: BouncingScrollPhysics()),
          itemCount: images.length,
          separatorBuilder: (_, _) => SizedBox(width: gap),
          itemBuilder: (context, i) =>
              AspectRatio(aspectRatio: 0.75, child: tile(context, i)),
        ),
      ),
      StudioGalleryLayout.bento => LayoutBuilder(
        key: ValueKey('studio-gallery-${node.id}'),
        builder: (context, constraints) {
          // Each four: a big tile over two rows beside two small ones, then
          // a wide one; the small tiles are square.
          final cell = (constraints.maxWidth - gap * 2) / 3;
          final rows = <Widget>[];
          for (var start = 0; start < images.length; start += 4) {
            final left = images.length - start;
            if (rows.isNotEmpty) rows.add(SizedBox(height: gap));
            rows.add(
              SizedBox(
                height: cell * 2 + gap,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(flex: 2, child: tile(context, start)),
                    if (left > 1) ...[
                      SizedBox(width: gap),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(child: tile(context, start + 1)),
                            SizedBox(height: gap),
                            Expanded(
                              child: left > 2
                                  ? tile(context, start + 2)
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
            if (left > 3) {
              rows
                ..add(SizedBox(height: gap))
                ..add(SizedBox(height: cell, child: tile(context, start + 3)));
            }
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: rows,
          );
        },
      ),
      StudioGalleryLayout.masonry => Row(
        key: ValueKey('studio-gallery-${node.id}'),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var c = 0; c < node.galleryColumns; c++) ...[
            if (c > 0) SizedBox(width: gap),
            Expanded(
              child: Column(
                children: [
                  for (var i = c; i < images.length; i += node.galleryColumns)
                    Padding(
                      padding: EdgeInsets.only(
                        bottom: i + node.galleryColumns < images.length
                            ? gap
                            : 0,
                      ),
                      child: AspectRatio(
                        aspectRatio: masonryRatios[i % masonryRatios.length],
                        child: tile(context, i),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    };
  }

  /// One photo, its caption over its foot when asked; a tap opens them all
  /// (or its link).
  Widget _photo(BuildContext context, WidgetRef ref, int i) {
    final image = node.images[i];
    final caption = image.caption?.trim() ?? '';
    final radius = BorderRadius.circular(node.galleryRadius);
    return Semantics(
      button: true,
      label: [
        context.l10n.photoOf(i + 1, node.images.length),
        caption,
      ].where((t) => t.isNotEmpty).join(', '),
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          fit: StackFit.expand,
          children: [
            AppNetworkImage(url: image.imageUrl, seed: node.id.hashCode + i),
            if (node.galleryCaptions && caption.isNotEmpty && node.captionPill)
              PositionedDirectional(
                start: 10,
                bottom: 10,
                end: 10,
                child: Align(
                  alignment: AlignmentDirectional.bottomStart,
                  child: ExcludeSemantics(child: _Pill(caption: caption)),
                ),
              )
            else if (node.galleryCaptions && caption.isNotEmpty)
              PositionedDirectional(
                start: 0,
                end: 0,
                bottom: 0,
                child: ExcludeSemantics(
                  child: DecoratedBox(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0x00000000), Color(0x99000000)],
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                        10,
                        18,
                        10,
                        8,
                      ),
                      child: _Lines(caption: caption),
                    ),
                  ),
                ),
              ),
            Material(
              type: MaterialType.transparency,
              child: InkWell(
                key: ValueKey('studio-gallery-${node.id}-$i'),
                borderRadius: radius,
                // 129.5 A photo with a link opens it; the others, the viewer.
                onTap: image.action != null && canOpenAction(ref, image.action!)
                    ? () => runPageAction(context, ref, image.action)
                    : () => GalleryViewer.open(context, node.images, i),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
