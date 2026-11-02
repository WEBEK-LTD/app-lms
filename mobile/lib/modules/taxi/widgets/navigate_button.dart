import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';

/// 112 The navigation apps a driver or courier may drive with.
enum NavigationApp { google, apple, waze }

/// Driving directions to a place in [app]; each opens the app when the
/// phone has it, else its website.
String navigationUrl(
  NavigationApp app,
  double lat,
  double lng,
) => switch (app) {
  NavigationApp.google =>
    'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving',
  NavigationApp.apple => 'https://maps.apple.com/?daddr=$lat,$lng&dirflg=d',
  NavigationApp.waze => 'https://waze.com/ul?ll=$lat,$lng&navigate=yes',
};

/// 112 "Navigate": asks which app to drive with (Google Maps, Apple Maps on
/// iPhone, Waze), then opens it with the way to [lat], [lng].
class NavigateButton extends ConsumerWidget {
  const NavigateButton({
    super.key,
    required this.lat,
    required this.lng,
    this.label,
  });

  final double lat;
  final double lng;

  /// "Navigate to pickup"; "Navigate" without it.
  final String? label;

  Future<void> _choose(BuildContext context, WidgetRef ref) async {
    final l10n = context.l10n;
    final ios = ref.read(appEnvironmentProvider).isIos;
    final app = await showModalBottomSheet<NavigationApp>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
              child: Text(
                l10n.navigateWith,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: context.palette.text,
                ),
              ),
            ),
            for (final (app, name) in [
              (NavigationApp.google, 'Google Maps'),
              if (ios) (NavigationApp.apple, 'Apple Maps'),
              (NavigationApp.waze, 'Waze'),
            ])
              ListTile(
                key: ValueKey('navigate-${app.name}'),
                leading: const AppIcon(AppIcons.navigate),
                title: Text(name),
                onTap: () => Navigator.of(context).pop(app),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (app == null) return;
    await ref.read(openExternalProvider)(navigationUrl(app, lat, lng));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => PrimaryButton(
    label: label ?? context.l10n.navigateButton,
    icon: AppIcons.navigate,
    onPressed: () => _choose(context, ref),
  );
}
