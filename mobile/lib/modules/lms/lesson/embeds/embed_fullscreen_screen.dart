import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/providers.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/web/web_view.dart';
import '../../../../core/widgets/buttons.dart';
import '../video/hosted_video.dart';
import 'embed_frame.dart';
import '../../../../core/l10n/l10n.dart';

class EmbedFullscreenArgs {
  const EmbedFullscreenArgs({
    required this.embed,
    required this.title,
    this.frameable = true,
  });

  final Embed embed;
  final String title;

  /// False when the page refuses framing: it is then loaded as the page
  /// itself instead of inside a frame.
  final bool frameable;
}

const _allOrientations = [
  DeviceOrientation.portraitUp,
  DeviceOrientation.landscapeLeft,
  DeviceOrientation.landscapeRight,
];

/// An embed filling the screen, with rotation allowed (design: EmbedLesson,
/// full screen).
class EmbedFullscreenScreen extends ConsumerStatefulWidget {
  const EmbedFullscreenScreen({super.key, required this.args});

  final EmbedFullscreenArgs args;

  @override
  ConsumerState<EmbedFullscreenScreen> createState() =>
      _EmbedFullscreenScreenState();
}

class _EmbedFullscreenScreenState extends ConsumerState<EmbedFullscreenScreen> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations(_allOrientations);
  }

  @override
  void dispose() {
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    super.dispose();
  }

  void _rotate() {
    final landscape =
        MediaQuery.orientationOf(context) == Orientation.landscape;
    SystemChrome.setPreferredOrientations(
      landscape
          ? [DeviceOrientation.portraitUp]
          : [DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight],
    ).then((_) {
      // Let the student rotate freely again after the forced turn.
      Future<void>.delayed(const Duration(seconds: 1), () {
        if (mounted) SystemChrome.setPreferredOrientations(_allOrientations);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final site = ref.watch(appEnvironmentProvider).siteUrl;
    final embed = widget.args.embed;
    final builder = ref.watch(webViewBuilderProvider);
    final page = Uri.parse('$site/');
    // 40 A video site's player can't open the site.
    final video = HostedVideo.parse(embed.src) != null;
    final request = widget.args.frameable
        ? WebViewRequest(
            html: embedWrapperHtml(src: embed.src, measure: false),
            baseUrl: '$site/',
            allowNavigation: video
                ? (uri, mainFrame) =>
                      videoNavigationAllowed(uri, mainFrame, page: page)
                : null,
            debugLabel: 'fullscreen',
          )
        : WebViewRequest(
            url: Uri.parse(embed.src),
            headers: {'Referer': '$site/'},
            debugLabel: 'fullscreen',
          );
    return Scaffold(
      backgroundColor: p.surfaceMuted,
      body: Column(
        children: [
          Container(
            color: BrandColors.midnight,
            child: SafeArea(
              bottom: false,
              child: SizedBox(
                height: 64,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    children: [
                      SquareIconButton(
                        icon: AppIcons.close,
                        label: context.l10n.exitFullScreen,
                        background: const Color(0xFF24223F),
                        foreground: BrandColors.white,
                        bordered: false,
                        iconSize: 20,
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          widget.args.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: BrandColors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      SquareIconButton(
                        icon: AppIcons.rotate,
                        label: context.l10n.rotateScreen,
                        background: const Color(0xFF24223F),
                        foreground: BrandColors.white,
                        bordered: false,
                        iconSize: 20,
                        onPressed: _rotate,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Expanded(child: SafeArea(top: false, child: builder(request))),
        ],
      ),
    );
  }
}
