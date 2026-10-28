import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/gate/switches.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_look.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'app_header.dart';
import 'page_blocks.dart';
import 'page_providers.dart';
import 'side_menu.dart';

/// A page built in the client dashboard (`GET /pages/{slug}`), as a tab or
/// opened on top of the tabs ([pushed]). Pull down to reload.
class PageScreen extends ConsumerWidget {
  const PageScreen({super.key, required this.slug, this.pushed = false});

  final String slug;

  /// Opened on top of the tabs: shows a back button.
  final bool pushed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(pageProvider(slug));
    Future<void> refresh() => ref.refresh(pageProvider(slug).future);
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: refresh,
        child: switch (page) {
          AsyncData(:final value) => AppPageView(page: value, pushed: pushed),
          AsyncError(:final error) => ListView(
            children: [
              if (pushed)
                SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 0),
                    child: Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: const AppBackButton(),
                    ),
                  ),
                ),
              SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.75,
                child: ErrorView(error: error, onRetry: refresh),
              ),
            ],
          ),
          _ => SkeletonList(
            layout: SkeletonLayout.media,
            count: 3,
            label: context.l10n.loadingPage,
          ),
        },
      ),
    );
  }
}

/// A loaded page: its title in the template's style, then its blocks. 99.3
/// On the page's background, with its header picture under the title.
class AppPageView extends ConsumerWidget {
  const AppPageView({super.key, required this.page, this.pushed = false});

  final AppPage page;
  final bool pushed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final template = ref.watch(appLookProvider).template;
    final style = PageStyle.of(template);
    final top = MediaQuery.paddingOf(context).top;
    // 83.3 Blocks' backgrounds and spacing, unless the team switched them off.
    final looks = switchOn(ref, 'block_looks')
        ? page.looks
        : const <String, BlockLook>{};
    final blocks = [
      for (final block in page.blocks)
        if (PageBlockView.shows(block, ref)) block,
    ];
    final header = _PageHeader(
      page: page,
      template: template,
      pushed: pushed,
      top: top,
    );
    final p = context.palette;
    final picture = page.headerImageUrl;
    final list = ListView(
      padding: EdgeInsets.zero,
      children: [
        header,
        if (picture != null)
          Padding(
            key: const ValueKey('page-header-image'),
            padding: EdgeInsets.fromLTRB(
              style.gutter,
              0,
              style.gutter,
              style.gap,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(
                context.shapes.r(style.bannerRadius),
              ),
              child: AspectRatio(
                aspectRatio: 16 / 7,
                child: AppNetworkImage(url: picture, seed: page.slug.hashCode),
              ),
            ),
          ),
        Padding(
          padding: EdgeInsets.fromLTRB(style.gutter, 0, style.gutter, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final (i, block) in blocks.indexed) ...[
                if (i > 0 &&
                    block is! SpacerBlock &&
                    blocks[i - 1] is! SpacerBlock)
                  SizedBox(
                    height: blockGap(
                      style.gap,
                      looks[blocks[i - 1].id],
                      looks[block.id],
                    ),
                  ),
                BlockLookBox(
                  look: looks[block.id],
                  gap: style.gap,
                  child: PageBlockView(
                    key: ValueKey('block-${block.id}'),
                    block: block,
                    pageSlug: page.slug,
                  ),
                ),
              ],
              if (blocks.isEmpty)
                MessageView(
                  compact: true,
                  icon: AppIcons.empty,
                  title: context.l10n.pageEmptyTitle,
                ),
            ],
          ),
        ),
      ],
    );
    final background = switch (page.background) {
      PageBackground.none => null,
      PageBackground.tint => p.primarySoft,
      PageBackground.surface => p.surface,
    };
    if (background == null) return list;
    return ColoredBox(
      key: ValueKey('page-background-${page.background.name}'),
      color: background,
      child: list,
    );
  }
}

class _PageHeader extends ConsumerWidget {
  const _PageHeader({
    required this.page,
    required this.template,
    required this.pushed,
    required this.top,
  });

  final AppPage page;
  final AppTemplate template;
  final bool pushed;
  final double top;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final style = PageStyle.of(template);
    final showTitle = page.showTitle && page.title.trim().isNotEmpty;
    // 101 The header chosen in the dashboard, on the pages in the bottom tabs.
    final chosen = pushed ? null : ref.watch(appLookProvider).header;
    final bold = template == AppTemplate.bold && (showTitle || chosen != null);
    final titleStyle = switch (template) {
      AppTemplate.classic => TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: p.text,
      ),
      AppTemplate.bold => TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: p.onPrimary,
      ),
      AppTemplate.minimal => TextStyle(
        fontSize: 34,
        fontWeight: FontWeight.w800,
        letterSpacing: -1,
        color: p.text,
      ),
    };
    // 82.5 A page in the bottom tabs opens the side menu where a pushed
    // page has its back button.
    final back = pushed
        ? AppBackButton(onDark: bold)
        : (sideMenuEntries(ref).isEmpty ? null : SideMenuButton(onDark: bold));
    final title = !showTitle
        ? null
        : Semantics(
            header: true,
            child: Text(
              page.title,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: titleStyle,
            ),
          );
    final Widget content = chosen != null
        ? ChosenHeader(
            header: chosen,
            title: showTitle ? page.title : null,
            titleStyle: titleStyle,
            onDark: bold,
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (back != null)
                Align(alignment: AlignmentDirectional.centerStart, child: back),
              if (back != null && title != null) const SizedBox(height: 14),
              ?title,
            ],
          );
    if (bold) {
      return Container(
        margin: const EdgeInsets.only(bottom: 22),
        decoration: BoxDecoration(
          color: p.primary,
          borderRadius: const BorderRadius.vertical(
            bottom: Radius.circular(28),
          ),
        ),
        padding: EdgeInsets.fromLTRB(
          style.gutter,
          top + (pushed ? 8 : 24),
          style.gutter,
          24,
        ),
        child: content,
      );
    }
    final empty = chosen == null && back == null && title == null;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        style.gutter,
        top + (pushed ? 8 : (template == AppTemplate.minimal ? 28 : 24)),
        style.gutter,
        empty ? 0 : style.gap,
      ),
      child: content,
    );
  }
}

/// 82.5 The space between two blocks: the larger of what each asks for
/// ([gap], the page's usual space, when neither has a look).
double blockGap(double gap, BlockLook? above, BlockLook? below) {
  double space(BlockLook? look) => switch (look?.spacing) {
    BlockSpacing.none => 0,
    BlockSpacing.small => gap / 2,
    BlockSpacing.large => gap * 2,
    BlockSpacing.medium || null => gap,
  };
  final a = space(above);
  final b = space(below);
  return a > b ? a : b;
}

/// 82.5 A block's background, within the app's brand: a light wash of the
/// main colour, the main or the second colour with light text, or the
/// colour of cards. 99.3 Its texts' size, and its look for the views inside
/// it ([BlockLookScope]).
class BlockLookBox extends ConsumerWidget {
  const BlockLookBox({
    super.key,
    required this.look,
    required this.gap,
    required this.child,
  });

  final BlockLook? look;
  final double gap;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final look = this.look;
    if (look == null) return child;
    final inner = BlockLookScope(
      look: look,
      child: _textSized(context, look.textSize, child),
    );
    if (look.background == BlockBackground.none) return inner;
    final p = context.palette;
    final hasSecondary = ref.watch(appLookProvider).secondary != null;
    final (Color background, Color? foreground) = switch (look.background) {
      BlockBackground.tint => (p.primarySoft, null),
      BlockBackground.primary => (p.primary, p.onPrimary),
      BlockBackground.secondary =>
        hasSecondary ? (p.accent, p.onAccent) : (p.primary, p.onPrimary),
      BlockBackground.surface || BlockBackground.none => (p.surface, null),
    };
    final inside = blockGap(gap, look, null).clamp(12.0, 48.0);
    return Container(
      key: ValueKey('look-${look.background.name}-${look.spacing.name}'),
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: inside),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(
          lookRadius(look, context.shapes, 16),
        ),
        border: look.background == BlockBackground.surface
            ? Border.all(color: p.border)
            : null,
      ),
      child: foreground == null
          ? inner
          : BlockForeground(color: foreground, child: inner),
    );
  }
}

/// 99.3 [child] with its text smaller or larger, on top of the size the
/// user chose on their phone.
Widget _textSized(BuildContext context, BlockTextSize size, Widget child) {
  final factor = switch (size) {
    BlockTextSize.small => 0.875,
    BlockTextSize.medium => 1.0,
    BlockTextSize.large => 1.2,
  };
  if (factor == 1.0) return child;
  final user = MediaQuery.textScalerOf(context).scale(14) / 14;
  final scaler = TextScaler.linear(user * factor);
  return MediaQuery(
    data: MediaQuery.of(context).copyWith(textScaler: scaler),
    child: child,
  );
}
