import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/widgets/common.dart';
import 'content_blocks.dart' show GalleryViewer;

/// 129.5 A gallery on a Studio page (`gallery`; Studio's canvas:
/// components/studio/premium-motion.tsx): its photos in masonry columns of
/// different heights, as a bento (a big tile beside two small ones, then a
/// wide one) or as a filmstrip of tall tiles that scrolls sideways, their
/// captions over them when the owner asked; a tap opens them full screen
/// ([GalleryViewer]: swipe through them, pinch to zoom, each with its
/// caption).
class StudioGallery extends StatelessWidget {
  const StudioGallery({super.key, required this.node});

  final StudioNode node;

  /// A masonry tile's shape (width over height) by its place, as Studio's
  /// canvas draws it (`MASONRY_RATIOS`).
  static const masonryRatios = [0.8, 1.15, 1.0, 0.75, 1.25, 0.9];

  @override
  Widget build(BuildContext context) {
    final images = node.images;
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
              AspectRatio(aspectRatio: 0.75, child: _tile(context, i)),
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
                    Expanded(flex: 2, child: _tile(context, start)),
                    if (left > 1) ...[
                      SizedBox(width: gap),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(child: _tile(context, start + 1)),
                            SizedBox(height: gap),
                            Expanded(
                              child: left > 2
                                  ? _tile(context, start + 2)
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
                ..add(SizedBox(height: cell, child: _tile(context, start + 3)));
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
                        child: _tile(context, i),
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

  /// One photo, its caption over its foot when asked; a tap opens them all.
  Widget _tile(BuildContext context, int i) {
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
            if (node.galleryCaptions && caption.isNotEmpty)
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
                      child: Text(
                        caption,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            Material(
              type: MaterialType.transparency,
              child: InkWell(
                key: ValueKey('studio-gallery-${node.id}-$i'),
                borderRadius: radius,
                onTap: () => GalleryViewer.open(context, node.images, i),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
