import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_look.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'page_blocks.dart';
import 'page_providers.dart';

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
          _ => LoadingView(label: context.l10n.loadingPage),
        },
      ),
    );
  }
}

/// A loaded page: its title in the template's style, then its blocks.
class AppPageView extends ConsumerWidget {
  const AppPageView({super.key, required this.page, this.pushed = false});

  final AppPage page;
  final bool pushed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final template = ref.watch(appLookProvider).template;
    final style = PageStyle.of(template);
    final top = MediaQuery.paddingOf(context).top;
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
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        header,
        Padding(
          padding: EdgeInsets.fromLTRB(style.gutter, 0, style.gutter, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final (i, block) in blocks.indexed) ...[
                if (i > 0 &&
                    block is! SpacerBlock &&
                    blocks[i - 1] is! SpacerBlock)
                  SizedBox(height: style.gap),
                PageBlockView(key: ValueKey('block-${block.id}'), block: block),
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
  }
}

class _PageHeader extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final p = context.palette;
    final style = PageStyle.of(template);
    final showTitle = page.showTitle && page.title.trim().isNotEmpty;
    final bold = template == AppTemplate.bold && showTitle;
    final back = pushed ? AppBackButton(onDark: bold) : null;
    final title = !showTitle
        ? null
        : Semantics(
            header: true,
            child: Text(
              page.title,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: switch (template) {
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
              },
            ),
          );
    final content = Column(
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
    final empty = back == null && title == null;
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
