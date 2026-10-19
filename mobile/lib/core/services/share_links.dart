import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../gate/app_gate.dart';
import '../l10n/l10n.dart';
import '../providers.dart';
import '../routing/app_links.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/buttons.dart';

/// 46 What Share buttons put before `/<kind>/<id>`: `Config.links`, else the
/// build's own link base; null in development builds and the preview.
final shareBaseProvider = Provider<String?>((ref) {
  final gate = ref.watch(appGateProvider);
  final config = gate is GateReady ? gate.config : null;
  return shareBaseUrl(
    configBase: config?.shareBaseUrl,
    build: ref.watch(appEnvironmentProvider).build,
  );
});

/// The link to an item that opens it in the app (or on the web without it).
String? itemLink(WidgetRef ref, String kind, Object id) =>
    shareLink(ref.read(shareBaseProvider), kind, id);

/// What sharing an item sends: its name and its link, or its name and the
/// app's name when there is no link.
String shareMessage({
  required String title,
  required String? link,
  required String appName,
}) => link == null ? '$title\n$appName' : '$title\n$link';

/// Hands a text to the phone's share sheet. Replaced in tests.
final shareTextProvider = Provider<Future<void> Function(String text)>(
  (ref) =>
      (text) async => SharePlus.instance.share(ShareParams(text: text)),
);

/// A Share button for a course, product, service, listing or campaign:
/// shares its name and its link.
class ShareLinkButton extends ConsumerWidget {
  const ShareLinkButton({
    super.key,
    required this.kind,
    required this.id,
    required this.title,
    this.onImage = false,
    this.bordered = true,
    this.size = 44,
  });

  final String kind;
  final Object id;
  final String title;

  /// Over a picture: a round button on the surface colour.
  final bool onImage;

  /// A square button without its border (next to one on a picture).
  final bool bordered;
  final double size;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return SquareIconButton(
      icon: AppIcons.share,
      label: context.l10n.shareLink,
      size: size,
      iconSize: 21,
      radius: onImage ? size / 2 : 12,
      bordered: bordered && !onImage,
      background: onImage ? p.surface : null,
      onPressed: () {
        final gate = ref.read(appGateProvider);
        final appName = gate is GateReady
            ? gate.config.site.name
            : ref.read(appEnvironmentProvider).build.appName;
        ref.read(shareTextProvider)(
          shareMessage(
            title: title,
            link: itemLink(ref, kind, id),
            appName: appName,
          ),
        );
      },
    );
  }
}
