import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/gate/app_gate.dart';
import '../../../../core/providers.dart';
import '../../../../core/routing/paths.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/web/web_view.dart';
import '../../../../core/widgets/buttons.dart';
import '../video/embed_player.dart';
import '../video/hosted_video.dart';
import 'embed_frame.dart';
import 'embed_fullscreen_screen.dart';
import 'embed_sizing.dart';
import '../../../../core/l10n/l10n.dart';

/// Height taken by the lesson screen's own bars (header and footer), used to
/// work out the visible area an embed may fill.
class LessonChrome extends InheritedWidget {
  const LessonChrome({super.key, required this.height, required super.child});

  final double height;

  static double of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<LessonChrome>()?.height ?? 0;

  @override
  bool updateShouldNotify(LessonChrome old) => old.height != height;
}

/// An iframe from the lesson, shown inline at the size chosen by
/// [computeEmbedSize], with an optional full-screen button (design:
/// EmbedLesson).
///
/// 40 A YouTube, Vimeo or Bunny Stream video plays in the app's own player
/// instead ([BrandlessVideo]); another video site's player can't open the
/// site, and neither shows where the video is hosted.
class InlineEmbed extends ConsumerStatefulWidget {
  const InlineEmbed({
    super.key,
    required this.embed,
    required this.title,
    this.heightMode,
  });

  final Embed embed;

  /// The lesson's `embed_height` override; null uses the site setting.
  final EmbedHeightMode? heightMode;

  /// The lesson title, shown in the full-screen view.
  final String title;

  @override
  ConsumerState<InlineEmbed> createState() => _InlineEmbedState();
}

class _InlineEmbedState extends ConsumerState<InlineEmbed> {
  double? _measured;
  double? _reported;
  bool? _frameable;
  bool _failed = false;
  Size? _lastScreen;

  /// 40 The video site and video, when the frame is one.
  late final HostedVideo? _hosted = HostedVideo.parse(widget.embed.src);

  Embed get _embed {
    final hosted = _hosted;
    if (hosted == null || hosted.ownControls) return widget.embed;
    return Embed(
      placeholder: widget.embed.placeholder,
      src: hosted.playerUrl().toString(),
      provider: widget.embed.provider,
      width: widget.embed.width,
      height: widget.embed.height,
      aspectRatio: widget.embed.aspectRatio ?? 16 / 9,
      allowFullscreen: widget.embed.allowFullscreen,
    );
  }

  @override
  void initState() {
    super.initState();
    if (knownFrameable(_embed) || _hosted != null) {
      _frameable = true;
    } else {
      final uri = Uri.tryParse(_embed.src);
      if (uri == null || !uri.hasScheme) {
        _frameable = false;
      } else {
        unawaited(
          ref.read(framingCheckProvider)(uri).then((allowed) {
            if (mounted) setState(() => _frameable = allowed);
          }),
        );
      }
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Rotation or a new window size changes the content's height: measure
    // again by clearing the old values (the page reports fresh ones).
    final screen = MediaQuery.sizeOf(context);
    if (_lastScreen != null && _lastScreen!.width != screen.width) {
      _measured = null;
      _reported = null;
    }
    _lastScreen = screen;
  }

  void _onHeight(double height) {
    if (!mounted) return;
    setState(() {
      if (_embed.provider == EmbedProvider.sameSite) {
        _measured = height;
      } else {
        _reported = height;
      }
    });
  }

  void _openFullScreen() => context.push(
    Paths.embed,
    extra: EmbedFullscreenArgs(
      embed: _embed,
      title: widget.title,
      frameable: _frameable ?? true,
    ),
  );

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final config = ref.watch(appConfigProvider);
    final media = MediaQuery.of(context);
    final viewport = visibleViewportHeight(
      screenHeight: media.size.height,
      topPadding: media.padding.top,
      bottomPadding: media.padding.bottom,
      keyboardInset: media.viewInsets.bottom,
      chrome: LessonChrome.of(context),
    );
    final hosted = _hosted;
    if (hosted != null && hosted.ownControls) {
      return Semantics(
        container: true,
        explicitChildNodes: true,
        label: context.l10n.video,
        child: Container(
          key: ValueKey('embed-${_embed.placeholder}'),
          margin: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(16),
          ),
          clipBehavior: Clip.antiAlias,
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: BrandlessVideo(video: hosted),
          ),
        ),
      );
    }
    // 40 A video site's name never shows.
    final host = hosted != null ? '' : (Uri.tryParse(_embed.src)?.host ?? '');

    if (_frameable == false || _failed) {
      return _OpenCard(host: host, onOpen: _openFullScreen);
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final size = computeEmbedSize(
          embed: _embed,
          // The frame's 1 px border sits inside the content width.
          contentWidth: constraints.maxWidth - 2,
          viewportHeight: viewport,
          mode: widget.heightMode ?? config.content.embedHeight,
          measuredHeight: _measured,
          reportedHeight: _reported,
        );
        final showFullscreen =
            config.content.embedFullscreenButton && _embed.allowFullscreen;
        final site = ref.watch(appEnvironmentProvider).siteUrl;
        final page = Uri.parse('$site/');
        final frame = _frameable == null
            ? Center(
                child: CircularProgressIndicator(
                  semanticsLabel: context.l10n.loadingEmbed,
                ),
              )
            : ref.watch(webViewBuilderProvider)(
                WebViewRequest(
                  html: embedWrapperHtml(
                    src: _embed.src,
                    measure: _embed.provider == EmbedProvider.sameSite,
                  ),
                  baseUrl: '$site/',
                  onHeight: _onHeight,
                  onMainFrameError: () {
                    if (mounted) setState(() => _failed = true);
                  },
                  openLinksOutside: hosted == null,
                  allowNavigation: hosted == null
                      ? null
                      : (uri, mainFrame) =>
                            videoNavigationAllowed(uri, mainFrame, page: page),
                  transparent: true,
                  scrollable: !size.sizedToContent,
                  debugLabel: _embed.placeholder,
                ),
              );
        return Semantics(
          container: true,
          explicitChildNodes: true,
          label: hosted != null
              ? context.l10n.video
              : context.l10n.embedFrom(host),
          child: Container(
            key: ValueKey('embed-${_embed.placeholder}'),
            margin: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: p.surfaceMuted,
              border: Border.all(color: p.inputBorder),
              borderRadius: BorderRadius.circular(16),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                Stack(
                  children: [
                    SizedBox(
                      key: const ValueKey('embed-frame'),
                      width: size.width,
                      height: size.height,
                      child: frame,
                    ),
                    if (showFullscreen)
                      PositionedDirectional(
                        top: 8,
                        end: 8,
                        child: SquareIconButton(
                          icon: AppIcons.fullscreen,
                          label: context.l10n.openFullScreen,
                          iconSize: 18,
                          radius: 10,
                          onPressed: _openFullScreen,
                        ),
                      ),
                  ],
                ),
                if (hosted == null)
                  _Caption(host: host, provider: _embed.provider),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Caption extends StatelessWidget {
  const _Caption({required this.host, required this.provider});

  final String host;
  final EmbedProvider provider;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final kind = switch (provider) {
      EmbedProvider.youtube || EmbedProvider.vimeo => context.l10n.video,
      _ => context.l10n.interactive,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border(top: BorderSide(color: p.border)),
      ),
      child: ExcludeSemantics(
        child: Row(
          children: [
            AppIcon(AppIcons.web, size: 14, color: p.textSecondary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                host,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12, color: p.textSecondary),
              ),
            ),
            Text(kind, style: TextStyle(fontSize: 12, color: p.textSecondary)),
          ],
        ),
      ),
    );
  }
}

/// Shown instead of the frame when the page refuses to be framed.
class _OpenCard extends StatelessWidget {
  const _OpenCard({required this.host, required this.onOpen});

  final String host;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      key: const ValueKey('embed-open-card'),
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: p.surfaceMuted,
        border: Border.all(color: p.inputBorder),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: p.accentSoft,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: AppIcon(AppIcons.code, size: 20, color: p.text),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  host.isEmpty ? context.l10n.embeddedContent : host,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  context.l10n.opensFullScreen,
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: onOpen,
            style: FilledButton.styleFrom(
              minimumSize: const Size(64, 44),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(context.l10n.open),
          ),
        ],
      ),
    );
  }
}
