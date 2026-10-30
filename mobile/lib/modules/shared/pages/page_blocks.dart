import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_look.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_providers.dart';
import '../../lms/lesson/content/html_content.dart';
import '../../lms/lesson/embeds/embed_frame.dart';
import '../../lms/lesson/embeds/inline_embed.dart';
import '../../lms/lesson/video/hosted_video.dart';
import '../../lms/navigation.dart';
import '../../lms/widgets/course_cards.dart';
import 'content_blocks.dart';
import 'form_block.dart';
import 'page_actions.dart';

/// Spacing and type for pages in each template.
class PageStyle {
  const PageStyle({
    required this.template,
    required this.gutter,
    required this.gap,
    required this.headerSize,
    required this.headerWeight,
    required this.bannerRadius,
  });

  factory PageStyle.of(AppTemplate template) => switch (template) {
    AppTemplate.classic => const PageStyle(
      template: AppTemplate.classic,
      gutter: 20,
      gap: 24,
      headerSize: 18,
      headerWeight: FontWeight.w700,
      bannerRadius: 18,
    ),
    AppTemplate.bold => const PageStyle(
      template: AppTemplate.bold,
      gutter: 20,
      gap: 22,
      headerSize: 20,
      headerWeight: FontWeight.w800,
      bannerRadius: 22,
    ),
    AppTemplate.minimal => const PageStyle(
      template: AppTemplate.minimal,
      gutter: 24,
      gap: 22,
      headerSize: 17,
      headerWeight: FontWeight.w800,
      bannerRadius: 14,
    ),
  };

  final AppTemplate template;

  /// Space on both sides of the page.
  final double gutter;

  /// Space between blocks.
  final double gap;
  final double headerSize;
  final FontWeight headerWeight;
  final double bannerRadius;
}

/// 82.5 Light text for a block on the main or the second colour: its title
/// and its own text read in it; cards in it keep their colours.
class BlockForeground extends InheritedWidget {
  const BlockForeground({super.key, required this.color, required super.child});

  final Color color;

  /// [child] with its text in the block's light colour, when it has one.
  static Widget text(BuildContext context, Widget child) {
    final color = context
        .dependOnInheritedWidgetOfExactType<BlockForeground>()
        ?.color;
    if (color == null) return child;
    final theme = Theme.of(context);
    return Theme(
      data: theme.copyWith(
        extensions: [
          ...theme.extensions.values.where((e) => e is! AppPalette),
          context.palette.textOn(color),
        ],
      ),
      child: child,
    );
  }

  @override
  bool updateShouldNotify(BlockForeground oldWidget) =>
      color != oldWidget.color;
}

/// 99.3 A block's look for the views inside it: where its texts sit, its
/// corners and how its pictures fit. A block without a look has none.
class BlockLookScope extends InheritedWidget {
  const BlockLookScope({super.key, required this.look, required super.child});

  final BlockLook look;

  static BlockLook? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<BlockLookScope>()?.look;

  @override
  bool updateShouldNotify(BlockLookScope oldWidget) => look != oldWidget.look;
}

/// 99.3 The app's round corners, for a block whose look asks for them.
const _roundShapes = AppShapes(
  card: 0,
  button: 0,
  chip: 0,
  corners: CornerStyle.round,
);

/// 99.3 A radius from the designs for a block with [look]: as the app's
/// look has it, square for sharp corners, or as round corners have it.
double lookRadius(BlockLook? look, AppShapes shapes, double designed) {
  return switch (look?.corners) {
    BlockCorners.sharp => 0,
    BlockCorners.round => _roundShapes.r(designed),
    BlockCorners.app || null => shapes.r(designed),
  };
}

/// 99.3 [lookRadius] for the block around [context].
double blockRadius(BuildContext context, double designed) =>
    lookRadius(BlockLookScope.of(context), context.shapes, designed);

/// 99.3 How the pictures of the block around [context] fill their space.
BoxFit blockImageFit(BuildContext context) =>
    BlockLookScope.of(context)?.imageFit == BlockImageFit.contain
    ? BoxFit.contain
    : BoxFit.cover;

/// 99.3 Where the texts of the block around [context] sit: at the start
/// unless its look says otherwise.
BlockAlign blockAlign(BuildContext context) =>
    BlockLookScope.of(context)?.align ?? BlockAlign.start;

/// 99.3 A block's alignment for texts, columns and single widgets.
extension BlockAlignLayout on BlockAlign {
  TextAlign get textAlign => switch (this) {
    BlockAlign.start => TextAlign.start,
    BlockAlign.center => TextAlign.center,
    BlockAlign.end => TextAlign.end,
  };

  CrossAxisAlignment get crossAxis => switch (this) {
    BlockAlign.start => CrossAxisAlignment.start,
    BlockAlign.center => CrossAxisAlignment.center,
    BlockAlign.end => CrossAxisAlignment.end,
  };

  AlignmentDirectional get alignment => switch (this) {
    BlockAlign.start => AlignmentDirectional.centerStart,
    BlockAlign.center => AlignmentDirectional.center,
    BlockAlign.end => AlignmentDirectional.centerEnd,
  };
}

/// One block, drawn in the current template. Every block type in the
/// contract has a view; the page skips the ones [shows] rejects.
class PageBlockView extends ConsumerWidget {
  const PageBlockView({super.key, required this.block, required this.pageSlug});

  final PageBlock block;

  /// 99.4 The page the block is on (a form sends its answers with it).
  final String pageSlug;

  /// False for blocks with nothing to show in this app type (an empty list,
  /// a search for a source this app doesn't have, "continue learning"
  /// outside an Academy app).
  static bool shows(PageBlock block, WidgetRef ref) {
    final appType = ref.read(appEnvironmentProvider).build.appType;
    return switch (block) {
      ItemsBlock(:final items) => followableItems(items, appType).isNotEmpty,
      // 30 Categories this app type can't filter by (courses in a Store app).
      CategoriesBlock(:final categories, :final source) =>
        categories.isNotEmpty &&
            (source == null || categoryLocation(source, appType, 0) != null),
      SearchBlock(:final source) => searchLocation(source, appType) != null,
      ContinueLearningBlock() => appType == AppType.lms,
      TextBlock(:final html) => html.trim().isNotEmpty,
      // 33 A countdown that has ended without a text for after the end.
      final CountdownBlock b => countdownShows(
        b,
        ref.read(pageClockProvider)(),
      ),
      // 99.4 A form whose answers go to the chat, in an app without chat.
      FormBlock(:final sendTo) =>
        sendTo == FormSendTo.email || ref.read(chatConfigProvider) != null,
      _ => block.hasContent,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final style = PageStyle.of(ref.watch(appLookProvider).template);
    final title = block.title?.trim();
    final align = blockAlign(context);
    final Widget content = switch (block) {
      final BannerBlock b => _Banner(block: b, style: style),
      final TextBlock b => BlockForeground.text(
        context,
        HtmlContent(html: _alignedHtml(b.html, align), title: b.title ?? ''),
      ),
      final ImageBlock b => _Image(block: b, style: style),
      final VideoBlock b => _Video(block: b, style: style),
      final ButtonBlock b => _Button(block: b),
      final ItemsBlock b => _Items(block: b, style: style),
      final CategoriesBlock b => _Categories(block: b, style: style),
      final SearchBlock b => _Search(block: b, style: style),
      final ContinueLearningBlock b => _Continue(block: b, style: style),
      final EmbedBlock b => _Embed(block: b),
      final SpacerBlock b => SizedBox(
        height: switch (b.size) {
          SpacerSize.small => 12,
          SpacerSize.medium => 24,
          SpacerSize.large => 48,
        },
      ),
      // 33 Blocks whose content the owner writes (content_blocks.dart).
      final SliderBlock b => SliderView(block: b, style: style),
      final QuickLinksBlock b => QuickLinksView(block: b, style: style),
      final TestimonialsBlock b => TestimonialsView(block: b, style: style),
      final FaqBlock b => FaqView(block: b, style: style),
      final CountdownBlock b => CountdownView(block: b, style: style),
      final ContactBlock b => ContactView(block: b, style: style),
      final HoursBlock b => HoursView(block: b, style: style),
      final SocialBlock b => SocialView(block: b, style: style),
      final TeamBlock b => TeamView(block: b, style: style),
      final StatsBlock b => StatsView(block: b, style: style),
      final NoticeBlock b => NoticeView(block: b, style: style),
      // 99.4 Cards, photos, a place, a line and a short form.
      final CardsBlock b => CardsView(block: b, style: style),
      final GalleryBlock b => GalleryView(block: b, style: style),
      final MapBlock b => MapView(block: b, style: style),
      final DividerBlock b => DividerView(block: b),
      final FormBlock b => FormView(block: b, style: style, pageSlug: pageSlug),
    };
    // Lists carry their own header (with "See all"); banners show their
    // heading on the image.
    final ownHeader =
        block is ItemsBlock || block is BannerBlock || block is SpacerBlock;
    if (ownHeader || title == null || title.isEmpty) return content;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BlockForeground.text(
          context,
          DefaultTextStyle.merge(
            textAlign: align.textAlign,
            child: SectionHeader(
              title: title,
              size: style.headerSize,
              weight: style.headerWeight,
            ),
          ),
        ),
        const SizedBox(height: 12),
        content,
      ],
    );
  }
}

/// 99.3 [html] in a box that sets where its text sits.
String _alignedHtml(String html, BlockAlign align) {
  if (align == BlockAlign.start) return html;
  return '<div style="text-align: ${align.name}">$html</div>';
}

// ----------------------------------------------------------------- Banner

class _Banner extends ConsumerWidget {
  const _Banner({required this.block, required this.style});

  final BannerBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final heading = block.heading?.trim();
    final subheading = block.subheading?.trim();
    final align = blockAlign(context);
    final fit = blockImageFit(context);
    final hasText =
        (heading != null && heading.isNotEmpty) ||
        (subheading != null && subheading.isNotEmpty);
    final action = block.action;
    return Semantics(
      button: action != null,
      image: true,
      label: [
        heading,
        subheading,
      ].whereType<String>().where((t) => t.isNotEmpty).join(', '),
      excludeSemantics: true,
      child: Material(
        // 99.3 A whole picture sits on the page's background.
        color: fit == BoxFit.contain
            ? Colors.transparent
            : p.placeholderFor(block.id.hashCode),
        borderRadius: BorderRadius.circular(
          blockRadius(context, style.bannerRadius),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: action == null
              ? null
              : () => runPageAction(context, ref, action),
          child: AspectRatio(
            aspectRatio: hasText ? 16 / 9 : 16 / 7,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(
                  url: block.imageUrl,
                  seed: block.id.hashCode,
                  fit: fit,
                  clearPlaceholder: fit == BoxFit.contain,
                ),
                if (hasText)
                  Align(
                    alignment: AlignmentDirectional.bottomStart,
                    child: SizedBox(
                      width: double.infinity,
                      // 110 A shade fading in under the text keeps it
                      // readable on any image, with no hard edge.
                      child: TextScrim(
                        padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: align.crossAxis,
                          children: [
                            if (heading != null && heading.isNotEmpty)
                              Text(
                                heading,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                textAlign: align.textAlign,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: style.template == AppTemplate.bold
                                      ? 22
                                      : 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            if (subheading != null && subheading.isNotEmpty)
                              Text(
                                subheading,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: align.textAlign,
                                style: const TextStyle(
                                  color: Color(0xE6FFFFFF),
                                  fontSize: 14,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ------------------------------------------------------------------ Image

class _Image extends ConsumerWidget {
  const _Image({required this.block, required this.style});

  final ImageBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ratio = block.aspectRatio;
    final action = block.action;
    final fit = blockImageFit(context);
    final image = ClipRRect(
      borderRadius: BorderRadius.circular(
        blockRadius(context, style.bannerRadius - 4),
      ),
      child: AspectRatio(
        aspectRatio: (ratio != null && ratio > 0.25 && ratio < 5)
            ? ratio
            : 16 / 9,
        child: AppNetworkImage(
          url: block.imageUrl,
          seed: block.id.hashCode,
          semanticLabel: block.title,
          fit: fit,
          clearPlaceholder: fit == BoxFit.contain,
        ),
      ),
    );
    if (action == null) return image;
    return Semantics(
      button: true,
      child: GestureDetector(
        onTap: () => runPageAction(context, ref, action),
        child: image,
      ),
    );
  }
}

// ------------------------------------------------------------------ Video

/// YouTube, Vimeo and other video sites play inline like lesson embeds (40:
/// in the app's own player, see [InlineEmbed]); other links (MP4) play in
/// the in-app web view from a poster.
class _Video extends StatelessWidget {
  const _Video({required this.block, required this.style});

  final VideoBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final player = embeddableVideoUrl(block.url);
    final hosted = HostedVideo.parse(block.url);
    if (hosted != null) {
      final provider = switch (hosted.host) {
        VideoHost.youtube => EmbedProvider.youtube,
        VideoHost.vimeo => EmbedProvider.vimeo,
        _ => EmbedProvider.other,
      };
      return InlineEmbed(
        embed: Embed(
          placeholder: 'block-${block.id}',
          src: player,
          provider: provider,
        ),
        title: block.title ?? '',
        heightMode: EmbedHeightMode.auto,
      );
    }
    final l10n = context.l10n;
    return Semantics(
      button: true,
      label: l10n.playVideo,
      excludeSemantics: true,
      child: Material(
        color: p.primarySoft,
        borderRadius: BorderRadius.circular(
          blockRadius(context, style.bannerRadius - 4),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push(
            Paths.web,
            extra: WebPageArgs(url: block.url, title: block.title ?? ''),
          ),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (block.posterUrl != null)
                  AppNetworkImage(
                    url: block.posterUrl,
                    seed: block.id.hashCode,
                  ),
                Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      color: Color(0xA60E0D24),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: const AppIcon(
                      AppIcons.play,
                      size: 36,
                      color: Colors.white,
                      filled: true,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------- Button

class _Button extends ConsumerWidget {
  const _Button({required this.block});

  final ButtonBlock block;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final icon = block.icon == null ? null : symbolByName(block.icon);
    final look = BlockLookScope.of(context);
    void onPressed() => runPageAction(context, ref, block.action);
    return switch (block.style) {
      PageButtonStyle.filled => PrimaryButton(
        label: block.label,
        icon: icon,
        onPressed: onPressed,
      ),
      PageButtonStyle.outlined => SecondaryButton(
        label: block.label,
        icon: icon,
        onPressed: onPressed,
      ),
      // 99.3 Where the block's look puts it; in the middle without one.
      // 99.3 Centred as before, unless the look moves it to the end.
      PageButtonStyle.text => Align(
        alignment: look?.align == BlockAlign.end
            ? AlignmentDirectional.centerEnd
            : AlignmentDirectional.center,
        child: TextButton.icon(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: p.link,
            minimumSize: const Size(64, 44),
            // From the theme so the label keeps the app's font.
            textStyle: Theme.of(context).textTheme.labelMedium
                ?.copyWith(fontSize: 15),
          ),
          icon: icon == null ? null : AppIcon(icon, size: 18, color: p.link),
          label: Text(block.label, textAlign: TextAlign.center),
        ),
      ),
    };
  }
}

// ------------------------------------------------------------------ Items

class _Items extends ConsumerWidget {
  const _Items({required this.block, required this.style});

  final ItemsBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final title = block.title?.trim() ?? '';
    final seeAll = block.seeAll;
    void open(PageItem item) => runPageAction(context, ref, item.tapAction);
    final items = followableItems(
      block.items,
      ref.watch(appEnvironmentProvider).build.appType,
    );
    final Widget list = switch (block.layout) {
      ItemsLayout.carousel => _Carousel(items: items, onTap: open),
      ItemsLayout.grid => _Grid(items: items, onTap: open),
      ItemsLayout.list => _ItemList(
        items: items,
        onTap: open,
        minimal: style.template == AppTemplate.minimal,
      ),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (title.isNotEmpty || seeAll != null) ...[
          DefaultTextStyle.merge(
            textAlign: blockAlign(context).textAlign,
            child: SectionHeader(
              title: title,
              size: style.headerSize,
              weight: style.headerWeight,
              onSeeAll: seeAll == null
                  ? null
                  : () => runPageAction(context, ref, seeAll),
            ),
          ),
          const SizedBox(height: 12),
        ],
        list,
      ],
    );
  }
}

/// The image of an item card, with its badge and a filled heart when the
/// user saved it.
class _ItemImage extends StatelessWidget {
  const _ItemImage({
    required this.item,
    required this.radius,
    this.showBadge = true,
  });

  final PageItem item;
  final double radius;

  /// 38 False on a list row's small picture, which has no room for it (an
  /// empty white label): the row's text shows the badge instead.
  final bool showBadge;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final badge = showBadge ? item.badge?.trim() : null;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: Stack(
        fit: StackFit.expand,
        children: [
          AppNetworkImage(url: item.imageUrl, seed: item.id.hashCode),
          if (badge != null && badge.isNotEmpty)
            PositionedDirectional(
              top: 8,
              start: 8,
              end: 40,
              child: Align(
                alignment: AlignmentDirectional.topStart,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    badge,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                ),
              ),
            ),
          if (item.favorited)
            PositionedDirectional(
              top: 6,
              end: 6,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: p.surface,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: AppIcon(
                  AppIcons.favorite,
                  size: 16,
                  color: p.accent,
                  filled: true,
                  semanticLabel: context.l10n.savedItem,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Title, subtitle and price label. The price is display text only: no
/// purchase button, on any platform.
class _ItemText extends StatelessWidget {
  const _ItemText({
    required this.item,
    this.titleLines = 2,
    this.showBadge = false,
  });

  final PageItem item;
  final int titleLines;

  /// 38 The badge under the text (list rows, whose picture is too small).
  final bool showBadge;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final subtitle = item.subtitle?.trim();
    final price = item.priceLabel?.trim();
    final badge = showBadge ? item.badge?.trim() : null;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          item.title,
          maxLines: titleLines,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            height: 1.3,
            color: p.text,
          ),
        ),
        if (subtitle != null && subtitle.isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
        if (price != null && price.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            price,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
        ],
        if (badge != null && badge.isNotEmpty) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: p.accentSoft,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              badge,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

String _itemLabel(PageItem item) => [
  item.title,
  item.subtitle,
  item.priceLabel,
  item.badge,
].whereType<String>().where((t) => t.trim().isNotEmpty).join(', ');

class _Carousel extends StatelessWidget {
  const _Carousel({required this.items, required this.onTap});

  final List<PageItem> items;
  final ValueChanged<PageItem> onTap;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width >= 600 ? 240.0 : 220.0;
    final imageHeight = width * 0.62;
    // Room for two title lines, a subtitle and a price at any text size;
    // the image gives way if the text needs more.
    final height =
        imageHeight + MediaQuery.textScalerOf(context).scale(96) + 20;
    return SizedBox(
      height: height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final item = items[i];
          return SizedBox(
            width: width,
            child: AppCard(
              semanticLabel: _itemLabel(item),
              onTap: () => onTap(item),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: _ItemImage(item: item, radius: 0)),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                    child: ExcludeSemantics(child: _ItemText(item: item)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _Grid extends StatelessWidget {
  const _Grid({required this.items, required this.onTap});

  final List<PageItem> items;
  final ValueChanged<PageItem> onTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 12.0;
        final columns = constraints.maxWidth >= 900
            ? 4
            : (constraints.maxWidth >= 560 ? 3 : 2);
        final width =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final item in items)
              SizedBox(
                width: width,
                child: AppCard(
                  semanticLabel: _itemLabel(item),
                  onTap: () => onTap(item),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AspectRatio(
                        aspectRatio: 4 / 3,
                        child: _ItemImage(item: item, radius: 0),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                        child: ExcludeSemantics(child: _ItemText(item: item)),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _ItemList extends StatelessWidget {
  const _ItemList({
    required this.items,
    required this.onTap,
    required this.minimal,
  });

  final List<PageItem> items;
  final ValueChanged<PageItem> onTap;
  final bool minimal;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget row(PageItem item) => Padding(
      padding: EdgeInsets.all(minimal ? 0 : 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 76,
            height: 76,
            child: _ItemImage(
              item: item,
              radius: context.shapes.r(12),
              showBadge: false,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ExcludeSemantics(
              child: _ItemText(item: item, titleLines: 2, showBadge: true),
            ),
          ),
        ],
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, item) in items.indexed)
          if (minimal)
            Semantics(
              button: true,
              label: _itemLabel(item),
              child: InkWell(
                onTap: () => onTap(item),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: i < items.length - 1
                        ? Border(bottom: BorderSide(color: p.divider))
                        : null,
                  ),
                  child: row(item),
                ),
              ),
            )
          else
            Padding(
              padding: EdgeInsets.only(top: i == 0 ? 0 : 10),
              child: AppCard(
                semanticLabel: _itemLabel(item),
                onTap: () => onTap(item),
                child: row(item),
              ),
            ),
      ],
    );
  }
}

// ------------------------------------------------------------- Categories

class _Categories extends ConsumerWidget {
  const _Categories({required this.block, required this.style});

  final CategoriesBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final appType = ref.watch(appEnvironmentProvider).build.appType;
    VoidCallback? open(Category c) {
      final location = categoryLocation(block.source, appType, c.id);
      return location == null ? null : () => openLocation(context, location);
    }

    if (block.style == CategoriesStyle.chips) {
      return SizedBox(
        height: chipRowHeight(context),
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          // 110 Runs to the screen's edge, as the carousels do.
          clipBehavior: Clip.none,
          itemCount: block.categories.length,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (context, i) {
            final c = block.categories[i];
            return PillChip(
              label: c.name,
              selected: false,
              onTap: open(c) ?? () {},
            );
          },
        ),
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 10.0;
        final columns = constraints.maxWidth >= 560 ? 3 : 2;
        final width =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final (i, c) in block.categories.indexed)
              SizedBox(
                width: width,
                child: AppCard(
                  color: p.placeholderFor(i),
                  onTap: open(c),
                  semanticLabel: '${c.name}, ${l10n.itemCount(c.count)}',
                  padding: const EdgeInsets.all(14),
                  child: ExcludeSemantics(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: p.isDark ? p.text : BrandColors.midnight,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          l10n.itemCount(c.count),
                          style: TextStyle(
                            fontSize: 12,
                            color: p.isDark
                                ? p.textSecondary
                                : const Color(0xFF5E5B70),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

// ----------------------------------------------------------------- Search

class _Search extends ConsumerWidget {
  const _Search({required this.block, required this.style});

  final SearchBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final appType = ref.watch(appEnvironmentProvider).build.appType;
    final location = searchLocation(block.source, appType);
    final pill = style.template == AppTemplate.bold;
    return Semantics(
      button: true,
      label: block.placeholder,
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        shape: pill
            ? const StadiumBorder()
            : RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(context.shapes.r(14)),
                side: BorderSide(color: p.border),
              ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: location == null
              ? null
              : () => openLocation(context, location),
          child: SizedBox(
            height: 50,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: pill ? 18 : 16),
              child: Row(
                children: [
                  AppIcon(AppIcons.search, size: 20, color: p.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      block.placeholder,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 15, color: p.textSecondary),
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

// ------------------------------------------------------ Continue learning

class _Continue extends StatelessWidget {
  const _Continue({required this.block, required this.style});

  final ContinueLearningBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context) {
    void onTap() => continueCourse(context, block.course);
    return switch (style.template) {
      AppTemplate.classic => ContinueCardClassic(
        course: block.course,
        onTap: onTap,
      ),
      AppTemplate.bold => ContinueCardBold(course: block.course, onTap: onTap),
      AppTemplate.minimal => ContinueCardMinimal(
        course: block.course,
        onTap: onTap,
      ),
    };
  }
}

// ------------------------------------------------------------------ Embed

class _Embed extends ConsumerWidget {
  const _Embed({required this.block});

  final EmbedBlock block;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final site = Uri.tryParse(ref.watch(appEnvironmentProvider).siteUrl);
    final host = Uri.tryParse(block.url)?.host ?? '';
    final provider = host.contains('youtube') || host == 'youtu.be'
        ? EmbedProvider.youtube
        : host.contains('vimeo')
        ? EmbedProvider.vimeo
        : (site != null && host == site.host
              ? EmbedProvider.sameSite
              : EmbedProvider.other);
    final height = block.height;
    return InlineEmbed(
      embed: Embed(
        placeholder: 'block-${block.id}',
        src: block.url,
        provider: provider,
        height: height?.toString(),
      ),
      title: block.title ?? '',
      heightMode: height != null && height > 0
          ? EmbedHeightMode.asSet
          : EmbedHeightMode.auto,
    );
  }
}
